// sports_service.js - Unified Real Sports API Service for LiveScore macOS
// Strictly real data from ESPN and MLB Stats API. Zero mock data.

import { normalizeScoreboard } from './normalizers/index.js';

export function getScoreboardDateRange(daysBack = 1, daysAhead = 10) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - daysBack);
  const end = new Date(now);
  end.setDate(now.getDate() + daysAhead);

  const formatIso = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatEspn = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };

  return {
    mlbStartDate: formatIso(start),
    mlbEndDate: formatIso(end),
    espnDates: `${formatEspn(start)}-${formatEspn(end)}`
  };
}

export function buildSportEndpoints() {
  const { mlbStartDate, mlbEndDate, espnDates } = getScoreboardDateRange(1, 10);

  return [
    { 
      key: 'nfl', 
      sport: 'football', 
      name: 'NFL', 
      url: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${espnDates}&limit=100`,
      fallbackUrl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
    },
    { 
      key: 'nba', 
      sport: 'basketball', 
      name: 'NBA', 
      url: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${espnDates}&limit=100`,
      fallbackUrl: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'
    },
    { 
      key: 'mlb', 
      sport: 'baseball', 
      name: 'MLB', 
      url: `https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=${mlbStartDate}&endDate=${mlbEndDate}&hydrate=team,linescore`,
      fallbackUrl: 'https://statsapi.mlb.com/api/v1/schedule?sportId=1'
    },
    { 
      key: 'f1', 
      sport: 'motorsport', 
      name: 'F1', 
      url: 'https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard' 
    },
    { 
      key: 'epl', 
      sport: 'soccer', 
      name: 'Premier League', 
      url: `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${espnDates}&limit=100`,
      fallbackUrl: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard'
    },
    { 
      key: 'ucl', 
      sport: 'soccer', 
      name: 'Champions League', 
      url: `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=${espnDates}&limit=100`,
      fallbackUrl: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard'
    }
  ];
}

export const SPORT_ENDPOINTS = buildSportEndpoints();

export const PRIMARY_LEAGUES = ['mlb', 'nfl', 'nba'];

const CACHE_STORAGE_KEY = 'livescore_cached_real_matches';

class SportsService {
  constructor() {
    this.cachedMatches = [];
    this.lastFetchTime = 0;
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      if (typeof localStorage === 'undefined' || typeof localStorage?.getItem !== 'function') return;
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Exclude any legacy mock matches if lingering in storage
          this.cachedMatches = parsed.filter(m => !m.id?.includes('live:ars_che') && !m.id?.includes('live:kc_buf'));
        }
      }
    } catch (e) {
      console.warn('[SportsService] Error loading cached matches:', e);
    }
  }

  saveToStorage() {
    try {
      if (typeof localStorage === 'undefined' || typeof localStorage?.setItem !== 'function') return;
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(this.cachedMatches));
    } catch (e) {
      console.warn('[SportsService] Error saving cached matches:', e);
    }
  }

  getCachedMatches() {
    return this.cachedMatches;
  }

  async fetchEndpointData(key, url, fallbackUrl = null) {
    if (typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
      try {
        const data = await window.__TAURI__.core.invoke('fetch_sport_data', { key, sport_key: key, url });
        if (data) return data;
      } catch (err) {
        console.warn(`[SportsService] Rust fetch_sport_data failed for ${key}, trying fallback:`, err);
        if (fallbackUrl) {
          try {
            const fallbackData = await window.__TAURI__.core.invoke('fetch_sport_data', { key, sport_key: key, url: fallbackUrl });
            if (fallbackData) return fallbackData;
          } catch (fbErr) {
            console.warn(`[SportsService] Rust fallback failed for ${key}:`, fbErr);
          }
        }
      }
    }
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      if (fallbackUrl) {
        try {
          const fbRes = await fetch(fallbackUrl);
          if (fbRes.ok) return await fbRes.json();
        } catch (ignored) {}
      }
      throw e;
    }
    if (fallbackUrl) {
      const fbRes = await fetch(fallbackUrl);
      if (fbRes.ok) return await fbRes.json();
    }
    throw new Error(`HTTP fetch failed for ${url}`);
  }

  async fetchAllLiveMatches(activeLeagues = PRIMARY_LEAGUES) {
    const currentEndpoints = buildSportEndpoints();
    const endpointsToFetch = activeLeagues
      ? currentEndpoints.filter(ep => activeLeagues.includes(ep.key))
      : currentEndpoints;

    const resultsBySport = await Promise.allSettled(
      endpointsToFetch.map(async ({ key, url, fallbackUrl }) => {
        try {
          const raw = await this.fetchEndpointData(key, url, fallbackUrl);
          const normalized = normalizeScoreboard(raw, key);
          return normalized || [];
        } catch (err) {
          console.warn(`[SportsService] Failed fetching ${key}:`, err);
          return [];
        }
      })
    );

    const merged = [];
    const seenIds = new Set();

    for (const res of resultsBySport) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        for (const match of res.value) {
          if (match && match.id && !seenIds.has(match.id)) {
            // Guard against any mock fixtures
            if (match.id.includes('live:ars_che') || match.id.includes('live:kc_buf')) continue;
            seenIds.add(match.id);
            merged.push(match);
          }
        }
      }
    }

    // Sort: in_progress first, then intermission, then completed (most recent first), then scheduled
    merged.sort((a, b) => {
      const order = { 'in_progress': 0, 'intermission': 1, 'completed': 2, 'scheduled': 3, 'postponed': 4 };
      const scoreA = order[a.statusStage] ?? 3;
      const scoreB = order[b.statusStage] ?? 3;
      if (scoreA !== scoreB) return scoreA - scoreB;
      const timeA = new Date(a.scheduledStartTime).getTime() || 0;
      const timeB = new Date(b.scheduledStartTime).getTime() || 0;
      if (scoreA === 2) {
        return timeB - timeA; // Recent completed first
      }
      return timeA - timeB; // Upcoming in order
    });

    if (merged.length > 0) {
      this.cachedMatches = merged;
      this.lastFetchTime = Date.now();
      this.saveToStorage();
    }

    return this.cachedMatches;
  }

  getEndpointForMatch(matchId) {
    if (!matchId) return SPORT_ENDPOINTS[0];
    if (matchId.startsWith('mlb:')) return SPORT_ENDPOINTS.find(e => e.key === 'mlb');
    if (matchId.includes(':nfl:')) return SPORT_ENDPOINTS.find(e => e.key === 'nfl');
    if (matchId.includes(':nba:')) return SPORT_ENDPOINTS.find(e => e.key === 'nba');
    if (matchId.includes(':f1:')) return SPORT_ENDPOINTS.find(e => e.key === 'f1');
    if (matchId.includes(':ucl:')) return SPORT_ENDPOINTS.find(e => e.key === 'ucl');
    if (matchId.includes(':epl:')) return SPORT_ENDPOINTS.find(e => e.key === 'epl');
    return SPORT_ENDPOINTS.find(e => e.key === 'epl');
  }

  async fetchMatchById(matchId) {
    if (!matchId) return null;
    const ep = this.getEndpointForMatch(matchId);
    if (!ep) return null;

    try {
      const raw = await this.fetchEndpointData(ep.key, ep.url);
      const matches = normalizeScoreboard(raw, ep.key);
      const found = matches.find(m => m.id === matchId);
      if (found) {
        // Update in cache
        const idx = this.cachedMatches.findIndex(m => m.id === matchId);
        if (idx >= 0) {
          this.cachedMatches[idx] = found;
        } else {
          this.cachedMatches.unshift(found);
        }
        this.saveToStorage();
        return found;
      }
    } catch (err) {
      console.warn(`[SportsService] Error fetching single match ${matchId}:`, err);
    }

    // Fallback to cached version if exists
    return this.cachedMatches.find(m => m.id === matchId) || null;
  }

  getBestMatchToPin(matches = null) {
    const list = matches || this.cachedMatches;
    if (!list || list.length === 0) return null;

    // 1. Live game in progress
    const live = list.find(m => m.statusStage === 'in_progress');
    if (live) return live;

    // 2. Halftime / intermission
    const intermission = list.find(m => m.statusStage === 'intermission');
    if (intermission) return intermission;

    // 3. Recently completed game with real scores
    const completed = list.find(m => m.statusStage === 'completed');
    if (completed) return completed;

    // 4. First scheduled game
    return list[0];
  }

  formatTrayTitle(match) {
    if (!match) return 'GameBeam';
    if (match.sport === 'motorsport') {
      const details = match.sportDetails || {};
      const session = details.sessionName || 'Grand Prix';
      return `🏎️ F1: ${session}`;
    }

    const away = match.awayTeam?.abbreviation || match.awayTeam?.shortName || 'AWY';
    const home = match.homeTeam?.abbreviation || match.homeTeam?.shortName || 'HOM';
    const awayScore = match.awayTeam?.score ?? 0;
    const homeScore = match.homeTeam?.score ?? 0;
    const emoji = this.getSportEmoji(match.sport);

    if (match.statusStage === 'in_progress') {
      const clock = match.statusDisplay || 'LIVE';
      return `${emoji} ${away} ${awayScore} - ${homeScore} ${home} (${clock})`;
    }
    if (match.statusStage === 'intermission') {
      return `${emoji} ${away} ${awayScore} - ${homeScore} ${home} (HT)`;
    }
    if (match.statusStage === 'completed') {
      return `${emoji} ${away} ${awayScore} - ${homeScore} ${home} (Final)`;
    }
    return `${emoji} ${away} vs ${home}`;
  }

  getSportEmoji(sport) {
    switch (sport) {
      case 'football': return '🏈';
      case 'basketball': return '🏀';
      case 'baseball': return '⚾';
      case 'motorsport': return '🏎️';
      case 'soccer': return '⚽';
      default: return '🏆';
    }
  }
}

export const sportsService = new SportsService();
