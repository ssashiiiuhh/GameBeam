// auto_pin_manager.js - Intelligent lifecycle manager for auto-pinning favourite teams
// Evaluates live matches across MLB, NFL, NBA and coordinates desktop HUD auto-pin and auto-dismiss.

import { sportsService } from './sports_service.js';

/**
 * Calculate match excitement score for priority selection when multiple favourite games are live.
 * Closer score and later in the game = higher priority.
 */
export function getMatchPriorityScore(match) {
  if (!match) return 0;
  let score = 100;

  const isLive = match.statusStage === 'in_progress';
  const isIntermission = match.statusStage === 'intermission';
  if (!isLive && !isIntermission) return 0;

  // Closeness of score (0-50 pts)
  const homeScore = match.homeTeam?.score ?? 0;
  const awayScore = match.awayTeam?.score ?? 0;
  const diff = Math.abs(homeScore - awayScore);
  const closenessBonus = Math.max(0, 50 - diff * 4);
  score += closenessBonus;

  // Sport-specific progress bonus (0-30 pts)
  const details = match.sportDetails || {};
  if (match.sport === 'football') {
    const q = details.quarter || 1;
    score += q * 7;
    if (details.isRedZone) score += 15;
  } else if (match.sport === 'baseball') {
    const inn = details.inning || 1;
    score += inn * 3;
    if (details.baseRunners?.first || details.baseRunners?.second || details.baseRunners?.third) {
      score += 10;
    }
  } else if (match.sport === 'basketball') {
    const q = details.quarter || 1;
    score += q * 7;
    if (details.isOvertime) score += 25;
  }

  return score;
}

/**
 * Check if a match involves at least one favourite team
 */
export function isMatchFavourite(match, isFavouriteFn) {
  if (!match || typeof isFavouriteFn !== 'function') return false;
  return Boolean(
    isFavouriteFn(match.homeTeam, match.sport) ||
    isFavouriteFn(match.awayTeam, match.sport) ||
    (match.homeTeam?.id && isFavouriteFn(match.homeTeam.id, match.sport)) ||
    (match.awayTeam?.id && isFavouriteFn(match.awayTeam.id, match.sport))
  );
}

/**
 * Evaluate auto-pin lifecycle state
 * @param {Array} matches - Normalized match objects
 * @param {Object} settings - App store settings { autoPinFavourites, autoHideOnFinal, pinnedMatchId, favourites }
 * @param {Function} isFavouriteTeamFn - Predicate (teamOrId, sport) => boolean
 * @returns {Object} { matchToPin, shouldShowHUD, shouldHideHUD, liveFavouriteMatches, activeFavouriteMatches, isCurrentPinnedCompleted }
 */
export function evaluateAutoPinLifecycle(matches = [], settings = {}, isFavouriteTeamFn = () => false) {
  const autoPinEnabled = settings.autoPinFavourites !== false;
  const autoHideEnabled = settings.autoHideOnFinal !== false;
  const currentPinnedId = settings.pinnedMatchId || null;

  // Filter favourite matches
  const favouriteMatches = matches.filter(m => isMatchFavourite(m, isFavouriteTeamFn));

  const activeFavouriteMatches = favouriteMatches.filter(m => 
    m.statusStage === 'in_progress' || m.statusStage === 'intermission'
  );

  const completedFavouriteMatches = favouriteMatches.filter(m => 
    m.statusStage === 'completed'
  );

  const currentPinnedMatch = matches.find(m => m.id === currentPinnedId) || null;
  const isCurrentPinnedCompleted = currentPinnedMatch ? currentPinnedMatch.statusStage === 'completed' : false;
  const isCurrentPinnedActive = currentPinnedMatch ? (currentPinnedMatch.statusStage === 'in_progress' || currentPinnedMatch.statusStage === 'intermission') : false;

  // Case 1: Auto-pin disabled
  if (!autoPinEnabled) {
    return {
      matchToPin: null,
      shouldShowHUD: false,
      shouldHideHUD: autoHideEnabled && isCurrentPinnedCompleted,
      favouriteMatches,
      activeFavouriteMatches,
      isCurrentPinnedCompleted
    };
  }

  // Case 2: There are active favourite matches
  if (activeFavouriteMatches.length > 0) {
    // If the currently pinned match is already one of the active favourite matches, KEEP it to avoid churn!
    const pinnedIsActiveFav = activeFavouriteMatches.find(m => m.id === currentPinnedId);
    if (pinnedIsActiveFav && isCurrentPinnedActive) {
      return {
        matchToPin: pinnedIsActiveFav,
        shouldShowHUD: true,
        shouldHideHUD: false,
        favouriteMatches,
        activeFavouriteMatches,
        isCurrentPinnedCompleted: false
      };
    }

    // Otherwise, pick the highest priority active favourite game
    const sorted = [...activeFavouriteMatches].sort((a, b) => 
      getMatchPriorityScore(b) - getMatchPriorityScore(a)
    );
    const bestMatch = sorted[0];

    return {
      matchToPin: bestMatch,
      shouldShowHUD: true,
      shouldHideHUD: false,
      favouriteMatches,
      activeFavouriteMatches,
      isCurrentPinnedCompleted: false
    };
  }

  // Case 3: No active favourite matches right now
  // If a pinned match exists and is completed (e.g. final score reached)
  if (currentPinnedMatch && isCurrentPinnedCompleted) {
    return {
      matchToPin: null,
      shouldShowHUD: false,
      shouldHideHUD: autoHideEnabled,
      favouriteMatches,
      activeFavouriteMatches: [],
      isCurrentPinnedCompleted: true
    };
  }

  // If no match is pinned and no favourites are live
  return {
    matchToPin: null,
    shouldShowHUD: false,
    shouldHideHUD: false,
    favouriteMatches,
    activeFavouriteMatches: [],
    isCurrentPinnedCompleted
  };
}

/**
 * Determine the macOS menu bar title adhering to user rule:
 * Only have favourite teams scores show up in the menubar once the game is over and the floating disappears.
 * @param {Object} options
 * @param {Array} options.matches - list of matches
 * @param {boolean} options.isOverlayVisible - whether the floating HUD is currently visible
 * @param {Function} options.isFavouriteTeamFn - (teamOrId, sport) => boolean
 * @param {Object} options.specificMatch - optional specific completed match
 * @returns {string} Menubar title string
 */
export function getMenuBarTitle({ matches = [], isOverlayVisible = false, isFavouriteTeamFn = () => false, specificMatch = null }) {
  // 1. If floating HUD is currently visible on desktop, menubar stays clean
  if (isOverlayVisible) {
    return 'GameBeam';
  }

  // 2. If a specific match was just completed and dismissed, check if it was a favourite
  if (specificMatch && specificMatch.statusStage === 'completed') {
    if (isMatchFavourite(specificMatch, isFavouriteTeamFn)) {
      return sportsService.formatTrayTitle(specificMatch);
    }
  }

  // 3. Otherwise check matches for the most recently completed favourite team game
  const completedFav = matches.find(m => 
    m.statusStage === 'completed' && isMatchFavourite(m, isFavouriteTeamFn)
  );

  if (completedFav) {
    return sportsService.formatTrayTitle(completedFav);
  }

  // 4. Default title when no favourite team game is completed
  return 'GameBeam';
}

/**
 * Sync menubar score to Tauri native menu bar tray
 */
export async function updateMenuBarScore(options = {}) {
  const title = getMenuBarTitle(options);
  if (typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
    try {
      await window.__TAURI__.core.invoke('update_tray_score', { title });
    } catch (e) {
      console.warn('[AutoPinManager] update_tray_score failed:', e);
    }
  }
  return title;
}

