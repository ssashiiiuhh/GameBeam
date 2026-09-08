// tests/auto_pin.test.js - Unit tests for Auto-Pinning & Auto-Dismiss Lifecycle

import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateAutoPinLifecycle, getMatchPriorityScore, isMatchFavourite, getMenuBarTitle } from '../frontend/js/auto_pin_manager.js';
import { MLB_TEAMS, NFL_TEAMS, NBA_TEAMS, ALL_TEAMS, findTeam } from '../frontend/js/teams_data.js';

test('Teams Directory: MLB, NFL, and NBA rosters are complete and well-formed', () => {
  assert.equal(MLB_TEAMS.length, 30, 'MLB should have 30 teams');
  assert.equal(NFL_TEAMS.length, 32, 'NFL should have 32 teams');
  assert.equal(NBA_TEAMS.length, 30, 'NBA should have 30 teams');
  assert.equal(ALL_TEAMS.length, 92, 'Total roster across 3 sports should be 92 teams');

  for (const team of ALL_TEAMS) {
    assert.ok(team.id, `Team ${team.name} must have an ID`);
    assert.ok(team.abbrev, `Team ${team.name} must have an abbreviation`);
    assert.ok(team.name, `Team must have a full name`);
    assert.ok(team.sport, `Team ${team.name} must have a sport defined`);
    assert.ok(team.logo.startsWith('http'), `Team ${team.name} logo URL must be valid HTTP(S)`);
  }

  // Test findTeam helper
  const chiefs = findTeam('Chiefs', 'football');
  assert.ok(chiefs);
  assert.equal(chiefs.id, '12');
  assert.equal(chiefs.abbrev, 'KC');

  const dodgers = findTeam('LAD', 'baseball');
  assert.ok(dodgers);
  assert.equal(dodgers.name, 'Los Angeles Dodgers');

  const lakers = findTeam('lakers', 'basketball');
  assert.ok(lakers);
  assert.equal(lakers.abbrev, 'LAL');
});

test('AutoPinManager: isMatchFavourite identifies favourite matches correctly', () => {
  const isFavFn = (teamOrId, sport) => {
    if (!teamOrId) return false;
    const id = typeof teamOrId === 'object' ? teamOrId.id : String(teamOrId);
    return id === '12' || id === '119'; // Chiefs or Dodgers
  };

  const match1 = {
    sport: 'football',
    homeTeam: { id: '12', name: 'Kansas City Chiefs' },
    awayTeam: { id: '33', name: 'Baltimore Ravens' }
  };
  assert.equal(isMatchFavourite(match1, isFavFn), true);

  const match2 = {
    sport: 'baseball',
    homeTeam: { id: '137', name: 'SF Giants' },
    awayTeam: { id: '119', name: 'Los Angeles Dodgers' }
  };
  assert.equal(isMatchFavourite(match2, isFavFn), true);

  const match3 = {
    sport: 'basketball',
    homeTeam: { id: '13', name: 'LA Lakers' },
    awayTeam: { id: '9', name: 'GS Warriors' }
  };
  assert.equal(isMatchFavourite(match3, isFavFn), false);
});

test('AutoPinManager: evaluates excitement priority score for tie-breaking', () => {
  // Game A: Blowout game early in 1st quarter
  const gameA = {
    sport: 'football',
    statusStage: 'in_progress',
    homeTeam: { score: 28 },
    awayTeam: { score: 0 },
    sportDetails: { quarter: 1 }
  };

  // Game B: 1-point game in 4th quarter with RedZone action
  const gameB = {
    sport: 'football',
    statusStage: 'in_progress',
    homeTeam: { score: 24 },
    awayTeam: { score: 23 },
    sportDetails: { quarter: 4, isRedZone: true }
  };

  const scoreA = getMatchPriorityScore(gameA);
  const scoreB = getMatchPriorityScore(gameB);

  assert.ok(scoreB > scoreA, 'Close 4th quarter red zone game should have higher priority score');
});

test('AutoPinManager: automatically pins live favourite match when available', () => {
  const matches = [
    {
      id: 'mlb:101',
      sport: 'baseball',
      statusStage: 'scheduled',
      homeTeam: { id: '119', name: 'Dodgers' },
      awayTeam: { id: '137', name: 'Giants' }
    },
    {
      id: 'nfl:202',
      sport: 'football',
      statusStage: 'in_progress',
      homeTeam: { id: '12', name: 'Chiefs', score: 14 },
      awayTeam: { id: '33', name: 'Ravens', score: 10 },
      sportDetails: { quarter: 2 }
    },
    {
      id: 'nba:303',
      sport: 'basketball',
      statusStage: 'in_progress',
      homeTeam: { id: '18', name: 'Knicks', score: 88 },
      awayTeam: { id: '2', name: 'Celtics', score: 82 }
    }
  ];

  const settings = {
    autoPinFavourites: true,
    autoHideOnFinal: true,
    pinnedMatchId: null
  };

  const isFavFn = (teamOrId) => {
    const id = typeof teamOrId === 'object' ? teamOrId.id : String(teamOrId);
    return id === '12' || id === '119'; // Chiefs & Dodgers are favourites
  };

  const result = evaluateAutoPinLifecycle(matches, settings, isFavFn);

  assert.ok(result.matchToPin, 'Should find a match to pin');
  assert.equal(result.matchToPin.id, 'nfl:202', 'Chiefs live game should be auto-pinned');
  assert.equal(result.shouldShowHUD, true);
  assert.equal(result.shouldHideHUD, false);
});

test('AutoPinManager: auto-dismisses HUD when pinned match finishes and no other favourites are live', () => {
  const matches = [
    {
      id: 'nfl:202',
      sport: 'football',
      statusStage: 'completed',
      homeTeam: { id: '12', name: 'Chiefs', score: 27 },
      awayTeam: { id: '33', name: 'Ravens', score: 20 }
    },
    {
      id: 'mlb:101',
      sport: 'baseball',
      statusStage: 'scheduled',
      homeTeam: { id: '119', name: 'Dodgers' },
      awayTeam: { id: '137', name: 'Giants' }
    }
  ];

  const settings = {
    autoPinFavourites: true,
    autoHideOnFinal: true,
    pinnedMatchId: 'nfl:202'
  };

  const isFavFn = (teamOrId) => {
    const id = typeof teamOrId === 'object' ? teamOrId.id : String(teamOrId);
    return id === '12';
  };

  const result = evaluateAutoPinLifecycle(matches, settings, isFavFn);

  assert.equal(result.matchToPin, null, 'No live match to pin');
  assert.equal(result.shouldHideHUD, true, 'HUD should automatically dismiss because pinned match is FINAL');
  assert.equal(result.isCurrentPinnedCompleted, true);
});

test('AutoPinManager: transitions to another live favourite match when pinned game finishes', () => {
  const matches = [
    {
      id: 'nfl:202',
      sport: 'football',
      statusStage: 'completed',
      homeTeam: { id: '12', name: 'Chiefs', score: 27 },
      awayTeam: { id: '33', name: 'Ravens', score: 20 }
    },
    {
      id: 'nba:404',
      sport: 'basketball',
      statusStage: 'in_progress',
      homeTeam: { id: '13', name: 'Lakers', score: 95 },
      awayTeam: { id: '9', name: 'Warriors', score: 92 },
      sportDetails: { quarter: 4 }
    }
  ];

  const settings = {
    autoPinFavourites: true,
    autoHideOnFinal: true,
    pinnedMatchId: 'nfl:202' // Chiefs game just finished
  };

  const isFavFn = (teamOrId) => {
    const id = typeof teamOrId === 'object' ? teamOrId.id : String(teamOrId);
    return id === '12' || id === '13'; // Chiefs and Lakers are favourites
  };

  const result = evaluateAutoPinLifecycle(matches, settings, isFavFn);

  assert.ok(result.matchToPin, 'Should transition to another live favourite');
  assert.equal(result.matchToPin.id, 'nba:404', 'Should switch to the live Lakers game');
  assert.equal(result.shouldShowHUD, true);
  assert.equal(result.shouldHideHUD, false);
});

test('AutoPinManager: does not auto-pin or auto-hide if disabled in settings', () => {
  const matches = [
    {
      id: 'nfl:202',
      sport: 'football',
      statusStage: 'in_progress',
      homeTeam: { id: '12', name: 'Chiefs', score: 14 },
      awayTeam: { id: '33', name: 'Ravens', score: 10 }
    }
  ];

  const settings = {
    autoPinFavourites: false, // User turned off auto-pin
    autoHideOnFinal: false,
    pinnedMatchId: null
  };

  const isFavFn = () => true;

  const result = evaluateAutoPinLifecycle(matches, settings, isFavFn);

  assert.equal(result.matchToPin, null);
  assert.equal(result.shouldShowHUD, false);
  assert.equal(result.shouldHideHUD, false);
});

test('AppStore: Favourite teams and auto-pin settings management', async () => {
  const { appStore } = await import('../frontend/js/store.js');

  // Test settings toggles
  appStore.setAutoPinFavourites(true);
  assert.equal(appStore.isAutoPinFavouritesEnabled(), true);
  appStore.setAutoPinFavourites(false);
  assert.equal(appStore.isAutoPinFavouritesEnabled(), false);
  appStore.setAutoPinFavourites(true);

  appStore.setAutoHideOnFinal(true);
  assert.equal(appStore.isAutoHideOnFinalEnabled(), true);
  appStore.setAutoHideOnFinal(false);
  assert.equal(appStore.isAutoHideOnFinalEnabled(), false);
  appStore.setAutoHideOnFinal(true);

  // Clear favourites for test
  appStore.data.favourites.teams = [];

  // Toggle a team object
  const dodgers = { id: '119', abbrev: 'LAD', name: 'Los Angeles Dodgers', sport: 'baseball' };
  appStore.toggleFavouriteTeam(dodgers);

  assert.equal(appStore.isFavouriteTeam('baseball:119'), true);
  assert.equal(appStore.isFavouriteTeam('119'), true);
  assert.equal(appStore.isFavouriteTeam(dodgers), true);
  assert.equal(appStore.isFavouriteTeam({ id: '119', sport: 'baseball' }), true);
  assert.equal(appStore.isFavouriteTeam('LAD'), true);
  assert.equal(appStore.isFavouriteTeam('33'), false);

  // Toggle to remove
  appStore.toggleFavouriteTeam(dodgers);
  assert.equal(appStore.isFavouriteTeam('119'), false);
  assert.equal(appStore.isFavouriteTeam(dodgers), false);

  // Test sport & date tab memory state
  appStore.setSelectedSport('nfl');
  assert.equal(appStore.getSelectedSport(), 'nfl');
  appStore.setSelectedDateTab('upcoming');
  assert.equal(appStore.getSelectedDateTab(), 'upcoming');

  // Test search history memory
  appStore.clearRecentSearches();
  assert.deepEqual(appStore.getRecentSearches(), []);
  appStore.addRecentSearch('Chiefs');
  appStore.addRecentSearch('Lakers');
  appStore.addRecentSearch('Chiefs'); // Deduplication & move to top
  assert.deepEqual(appStore.getRecentSearches(), ['Chiefs', 'Lakers']);

  // Test match snapshot memory
  appStore.setPinnedMatchId('nfl:202', { id: 'nfl:202', sport: 'football', homeScore: 21, awayScore: 17 });
  assert.equal(appStore.getPinnedMatchId(), 'nfl:202');
  assert.equal(appStore.getLastPinnedMatchSnapshot()?.homeScore, 21);
  appStore.setPinnedMatchId(null);
  assert.equal(appStore.getLastPinnedMatchSnapshot(), null);
});

test('MenuBarTitle: Menu bar only shows scores for favourite teams when HUD is closed and game is over', () => {
  const dodgersFinal = {
    id: 'mlb:101',
    sport: 'baseball',
    statusStage: 'completed',
    homeTeam: { id: '119', abbreviation: 'LAD', name: 'Los Angeles Dodgers', score: 5 },
    awayTeam: { id: '137', abbreviation: 'SF', name: 'San Francisco Giants', score: 3 }
  };

  const giantsFinal = {
    id: 'mlb:102',
    sport: 'baseball',
    statusStage: 'completed',
    homeTeam: { id: '137', abbreviation: 'SF', name: 'San Francisco Giants', score: 4 },
    awayTeam: { id: '135', abbreviation: 'SD', name: 'San Diego Padres', score: 2 }
  };

  const isFavFn = (teamOrId) => {
    const id = typeof teamOrId === 'object' ? teamOrId.id : String(teamOrId);
    return id === '119'; // Only Dodgers is favourite
  };

  // 1. While floating HUD is visible on desktop, menubar stays clean "GameBeam"
  const titleWhileFloating = getMenuBarTitle({
    matches: [dodgersFinal],
    isOverlayVisible: true,
    isFavouriteTeamFn: isFavFn
  });
  assert.equal(titleWhileFloating, 'GameBeam', 'Menubar must stay GameBeam while overlay HUD is visible');

  // 2. When overlay is hidden and favourite team match finishes, menubar shows final score
  const titleFavFinished = getMenuBarTitle({
    matches: [dodgersFinal],
    isOverlayVisible: false,
    isFavouriteTeamFn: isFavFn,
    specificMatch: dodgersFinal
  });
  assert.equal(titleFavFinished, '⚾ SF 3 - 5 LAD (Final)', 'Menubar must show favourite team completed score once HUD disappears');

  // 3. When overlay is hidden but the completed match is NOT a favourite, menubar title remains GameBeam
  const titleNonFavFinished = getMenuBarTitle({
    matches: [giantsFinal],
    isOverlayVisible: false,
    isFavouriteTeamFn: isFavFn,
    specificMatch: giantsFinal
  });
  assert.equal(titleNonFavFinished, 'GameBeam', 'Menubar must NOT show scores for non-favourite teams');

  // 4. In-progress favourite match while HUD is hidden still does NOT show in menubar until game is over
  const lakersLive = {
    id: 'nba:201',
    sport: 'basketball',
    statusStage: 'in_progress',
    homeTeam: { id: '119', abbreviation: 'LAD', score: 80 },
    awayTeam: { id: '18', abbreviation: 'NYK', score: 78 }
  };
  const titleLiveGame = getMenuBarTitle({
    matches: [lakersLive],
    isOverlayVisible: false,
    isFavouriteTeamFn: isFavFn
  });
  assert.equal(titleLiveGame, 'GameBeam', 'Live games do not show up in menubar; only completed games after HUD disappears');
});

