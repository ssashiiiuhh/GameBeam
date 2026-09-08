// homepage_helpers.js - Pure presentation, grouping, and calculation helpers for LiveScore Homepage
// Facilitates clean architecture and modular unit testing

export const LEAGUE_ORDER = [
  { id: 'mlb', name: 'Major League Baseball', emoji: '⚾', match: m => m.sport === 'baseball' },
  { id: 'nfl', name: 'National Football League', emoji: '🏈', match: m => m.sport === 'football' },
  { id: 'nba', name: 'National Basketball Association', emoji: '🏀', match: m => m.sport === 'basketball' }
];

/**
 * Group matches by league according to priority order
 * @param {Array} matches
 * @returns {Array} grouped leagues with matches
 */
export function groupMatchesByLeague(matches = []) {
  const groups = [];
  for (const l of LEAGUE_ORDER) {
    const inLeague = matches.filter(l.match);
    if (inLeague.length > 0) {
      // Sort matches: live first, then upcoming by start time ascending, then completed descending
      inLeague.sort((a, b) => {
        const stageOrder = { in_progress: 1, intermission: 2, scheduled: 3, completed: 4, postponed: 5 };
        const orderA = stageOrder[a.statusStage] || 99;
        const orderB = stageOrder[b.statusStage] || 99;
        if (orderA !== orderB) return orderA - orderB;
        const timeA = new Date(a.scheduledStartTime).getTime() || 0;
        const timeB = new Date(b.scheduledStartTime).getTime() || 0;
        if (a.statusStage === 'completed') return timeB - timeA;
        return timeA - timeB;
      });
      groups.push({
        id: l.id,
        name: l.name,
        emoji: l.emoji,
        matches: inLeague
      });
    }
  }

  // Any matches not caught by standard league configurations
  const groupedIds = new Set(groups.flatMap(g => g.matches.map(m => m.id)));
  const others = matches.filter(m => !groupedIds.has(m.id));
  if (others.length > 0) {
    groups.push({ id: 'other', name: 'Other Sports', emoji: '🏆', matches: others });
  }

  return groups;
}

/**
 * Calculate dynamic badge counts for sport filter pills (MLB, NFL, NBA, Favs)
 * @param {Array} matches
 * @param {Function} isFavFn
 * @returns {Object} counts per filter category
 */
export function calculateSportCounts(matches = [], isFavFn = () => false) {
  return {
    all: matches.length,
    mlb: matches.filter(m => m.sport === 'baseball').length,
    nfl: matches.filter(m => m.sport === 'football').length,
    nba: matches.filter(m => m.sport === 'basketball').length,
    favs: matches.filter(isFavFn).length
  };
}

/**
 * Determine if a match is considered "today" for filter tabs
 * @param {Object} m
 * @param {Date} now
 * @returns {boolean}
 */
export function isMatchForToday(m, now = new Date()) {
  return isMatchForDateScope(m, 'today', now);
}

/**
 * Determine if a match belongs to a specific date scope tab
 * @param {Object} m
 * @param {string} scope ('yesterday' | 'today' | 'tomorrow' | 'upcoming' | 'this-week' | 'all')
 * @param {Date} now
 * @returns {boolean}
 */
export function isMatchForDateScope(m, scope = 'today', now = new Date()) {
  if (scope === 'all') return true;

  const matchTime = new Date(m.scheduledStartTime).getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
  const startOfTomorrow = endOfToday + 1;
  const endOfTomorrow = startOfTomorrow + 24 * 60 * 60 * 1000 - 1;
  const endOfWeek = startOfToday + 7 * 24 * 60 * 60 * 1000;
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  // Live games always belong in 'today', 'upcoming', and 'this-week'
  if (m.statusStage === 'in_progress' || m.statusStage === 'intermission') {
    return scope === 'today' || scope === 'upcoming' || scope === 'this-week';
  }

  if (!matchTime || isNaN(matchTime)) {
    return scope === 'today' || scope === 'upcoming' || scope === 'all';
  }

  // Hours difference from now (positive = future, negative = past)
  const diffHours = (matchTime - now.getTime()) / (1000 * 60 * 60);

  // Check same calendar day in local or UTC
  const matchDate = new Date(m.scheduledStartTime);
  const isSameDayLocal = matchDate.toDateString() === now.toDateString();
  const isSameDayUtc = matchDate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  const isToday = isSameDayLocal || isSameDayUtc || (matchTime >= startOfToday && matchTime <= endOfToday) || (diffHours >= -14 && diffHours <= 16);

  if (scope === 'today') {
    return isToday;
  }

  if (scope === 'tomorrow') {
    if (isToday) return false;
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrowLocal = matchDate.toDateString() === tomorrow.toDateString();
    const isTomorrowUtc = matchDate.toISOString().slice(0, 10) === tomorrow.toISOString().slice(0, 10);
    return isTomorrowLocal || isTomorrowUtc || (matchTime >= startOfTomorrow && matchTime <= endOfTomorrow) || (diffHours > 16 && diffHours <= 40);
  }

  if (scope === 'upcoming') {
    // All scheduled/future matches (or matches started less than 2 hours ago)
    return m.statusStage === 'scheduled' || diffHours > -2;
  }

  if (scope === 'this-week') {
    return (matchTime >= startOfToday - 4 * 3600 * 1000) && (matchTime <= endOfWeek);
  }

  if (scope === 'yesterday') {
    if (isToday) return false;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterdayLocal = matchDate.toDateString() === yesterday.toDateString();
    const isYesterdayUtc = matchDate.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10);
    return isYesterdayLocal || isYesterdayUtc || (matchTime >= startOfYesterday && matchTime < startOfToday) || (diffHours >= -40 && diffHours < -14);
  }

  return true;
}

/**
 * Format live telemetry situation text for a match card or drawer
 * @param {Object} match
 * @returns {string}
 */
export function getCardSituation(match) {
  if (!match) return '';
  const details = match.sportDetails || {};
  switch (match.sport) {
    case 'football':
      return details.downDistanceText || (details.possession ? `Possession: ${details.possession}` : 'NFL Football');
    case 'baseball':
      return `${details.outs ?? 0} Out${details.outs === 1 ? '' : 's'} · ${details.half === 'top' ? 'Top' : 'Bot'} ${details.inning || 1}`;
    case 'basketball':
      return details.quarter ? `Quarter ${details.quarter}` : (details.isOvertime ? 'Overtime' : 'NBA Basketball');
    case 'soccer':
      if (details.redCards?.home || details.redCards?.away) {
        const parts = [];
        if (details.redCards.away) parts.push(`Away ${details.redCards.away}`);
        if (details.redCards.home) parts.push(`Home ${details.redCards.home}`);
        return `🔴 Red Card: ${parts.join(', ')}`;
      }
      return match.competitionName || 'Soccer';
    case 'motorsport':
      if (details.safetyCarStatus) {
        return `⚠️ ${details.safetyCarStatus} · Lap ${details.lapCurrent || 1}/${details.lapTotal || 57}`;
      }
      return details.sessionName ? `${details.sessionName} · Lap ${details.lapCurrent || 1}/${details.lapTotal || 57}` : 'Formula 1';
    default:
      return match.competitionName || 'Live';
  }
}

/**
 * Render bases diamond HTML indicator
 * @param {Object} runners
 * @returns {string}
 */
export function renderBasesDiamond(runners = {}) {
  return `
    <span class="bases-diamond" title="Bases: 1B ${runners.first ? '●' : '○'}, 2B ${runners.second ? '●' : '○'}, 3B ${runners.third ? '●' : '○'}">
      <span class="base-dot ${runners.second ? 'occupied' : ''}"></span>
      <span class="base-dot ${runners.third ? 'occupied' : ''}"></span>
      <span class="base-dot ${runners.first ? 'occupied' : ''}"></span>
      <span class="base-dot"></span>
    </span>
  `.trim();
}

/**
 * Render outs dots HTML indicator
 * @param {number} outs
 * @returns {string}
 */
export function renderOutsDots(outs = 0) {
  return `
    <span class="outs-indicator" title="${outs} Out${outs === 1 ? '' : 's'}">
      <span class="out-pip ${outs >= 1 ? 'filled' : ''}"></span>
      <span class="out-pip ${outs >= 2 ? 'filled' : ''}"></span>
      <span class="out-pip ${outs >= 3 ? 'filled' : ''}"></span>
    </span>
  `.trim();
}

/**
 * Get sport emoji by sport category string
 * @param {string} sport
 * @returns {string}
 */
export function getSportEmoji(sport) {
  switch (sport) {
    case 'football': return '🏈';
    case 'basketball': return '🏀';
    case 'baseball': return '⚾';
    case 'motorsport': return '🏎️';
    case 'soccer': return '⚽';
    default: return '🏆';
  }
}
