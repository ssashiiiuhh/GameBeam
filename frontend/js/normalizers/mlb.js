// normalizers/mlb.js - Normalizer for MLB events (Official MLB StatsAPI & ESPN fallback)

export function normalizeMlbEvent(event) {
  // Check if this is an official MLB StatsAPI payload (game object with gamePk)
  if (event.gamePk) {
    return normalizeOfficialMlbStats(event);
  }
  // Otherwise parse as ESPN MLB payload
  return normalizeEspnMlb(event);
}

const MLB_TEAM_ABBRS = {
  '108': 'LAA', '109': 'ARI', '110': 'BAL', '111': 'BOS', '112': 'CHC',
  '113': 'CIN', '114': 'CLE', '115': 'COL', '116': 'DET', '117': 'HOU',
  '118': 'KC',  '119': 'LAD', '120': 'WSH', '121': 'NYM', '133': 'ATH',
  '134': 'PIT', '135': 'SD',  '136': 'SEA', '137': 'SF',  '138': 'STL',
  '139': 'TB',  '140': 'TEX', '141': 'TOR', '142': 'MIN', '143': 'PHI',
  '144': 'ATL', '145': 'CWS', '146': 'MIA', '147': 'NYY', '158': 'MIL'
};

function getMlbAbbr(team, id) {
  if (team?.abbreviation) return team.abbreviation;
  if (team?.teamCode) return team.teamCode.toUpperCase();
  if (id && MLB_TEAM_ABBRS[id]) return MLB_TEAM_ABBRS[id];
  const words = (team?.name || '').split(' ');
  const last = words[words.length - 1] || 'MLB';
  return last.slice(0, 3).toUpperCase();
}

function getMlbShortName(team) {
  if (team?.teamName) return team.teamName;
  const words = (team?.name || '').split(' ');
  return words[words.length - 1] || team?.name || 'MLB';
}

function normalizeOfficialMlbStats(game) {
  const status = game.status || {};
  const detailedState = status.detailedState || status.abstractGameState || 'Scheduled';
  
  let statusStage = 'scheduled';
  if (detailedState === 'Final' || detailedState === 'Game Over' || status.statusCode === 'F') {
    statusStage = 'completed';
  } else if (status.abstractGameState === 'Live' || detailedState === 'In Progress') {
    statusStage = 'in_progress';
  } else if (detailedState === 'Postponed') {
    statusStage = 'postponed';
  }

  const linescore = game.linescore || {};
  const currentInning = linescore.currentInning || 1;
  const isTop = linescore.isTopInning !== false;
  const half = isTop ? 'top' : 'bottom';
  const inningState = linescore.inningState || (isTop ? 'Top' : 'Bot');
  const outs = linescore.outs || 0;
  const balls = linescore.balls || 0;
  const strikes = linescore.strikes || 0;

  const offense = linescore.offense || {};
  const baseRunners = {
    first: Boolean(offense.first),
    second: Boolean(offense.second),
    third: Boolean(offense.third)
  };

  const home = game.teams?.home || {};
  const away = game.teams?.away || {};

  const homeScore = home.score ?? linescore.teams?.home?.runs ?? 0;
  const awayScore = away.score ?? linescore.teams?.away?.runs ?? 0;

  let statusDisplay = detailedState;
  if (statusStage === 'in_progress') {
    statusDisplay = `${inningState} ${currentInning} · ${outs} Out${outs === 1 ? '' : 's'}`;
  }

  const homeId = String(home.team?.id || '');
  const awayId = String(away.team?.id || '');

  const homeAbbr = getMlbAbbr(home.team, homeId);
  const awayAbbr = getMlbAbbr(away.team, awayId);
  const homeShort = getMlbShortName(home.team);
  const awayShort = getMlbShortName(away.team);

  return {
    id: `mlb:${game.gamePk}`,
    provider: 'mlb_stats',
    sport: 'baseball',
    competitionId: 'mlb',
    competitionName: 'MLB',
    scheduledStartTime: game.gameDate,
    statusStage,
    statusDisplay,
    homeTeam: {
      id: homeId,
      name: home.team?.name || 'Home',
      shortName: homeShort,
      abbreviation: homeAbbr,
      logoUrl: `https://www.mlbstatic.com/team-logos/${homeId}.svg`,
      isHome: true,
      score: parseInt(homeScore, 10),
      record: home.leagueRecord ? `${home.leagueRecord.wins}-${home.leagueRecord.losses}` : ''
    },
    awayTeam: {
      id: awayId,
      name: away.team?.name || 'Away',
      shortName: awayShort,
      abbreviation: awayAbbr,
      logoUrl: `https://www.mlbstatic.com/team-logos/${awayId}.svg`,
      isHome: false,
      score: parseInt(awayScore, 10),
      record: away.leagueRecord ? `${away.leagueRecord.wins}-${away.leagueRecord.losses}` : ''
    },
    sportDetails: {
      type: 'baseball',
      inning: currentInning,
      half,
      outs,
      balls,
      strikes,
      baseRunners,
      hits: {
        home: linescore.teams?.home?.hits || 0,
        away: linescore.teams?.away?.hits || 0
      },
      errors: {
        home: linescore.teams?.home?.errors || 0,
        away: linescore.teams?.away?.errors || 0
      }
    },
    lastUpdated: Date.now()
  };
}

function normalizeEspnMlb(event) {
  const comp = event.competitions?.[0] || {};
  const competitors = comp.competitors || [];
  
  const home = competitors.find(c => c.homeAway === 'home') || {};
  const away = competitors.find(c => c.homeAway === 'away') || {};
  
  const status = event.status || comp.status || {};
  const statusType = status.type || {};
  
  let statusStage = 'scheduled';
  if (statusType.completed) {
    statusStage = 'completed';
  } else if (statusType.state === 'in') {
    statusStage = 'in_progress';
  }

  const inning = status.period || 1;
  const half = (status.type?.detail || '').toLowerCase().includes('top') ? 'top' : 'bottom';
  const situation = comp.situation || {};
  const outs = situation.outs || 0;
  const balls = situation.balls || 0;
  const strikes = situation.strikes || 0;

  const baseRunners = {
    first: Boolean(situation.onFirst),
    second: Boolean(situation.onSecond),
    third: Boolean(situation.onThird)
  };

  let statusDisplay = statusType.shortDetail || statusType.detail || 'MLB Game';
  if (statusStage === 'in_progress') {
    statusDisplay = `${half === 'top' ? 'Top' : 'Bot'} ${inning} · ${outs} Out${outs === 1 ? '' : 's'}`;
  }

  return {
    id: `espn:mlb:${event.id}`,
    provider: 'espn',
    sport: 'baseball',
    competitionId: 'mlb',
    competitionName: 'MLB',
    scheduledStartTime: event.date,
    statusStage,
    statusDisplay,
    homeTeam: {
      id: String(home.id || home.team?.id || ''),
      name: home.team?.displayName || home.team?.name || 'Home',
      shortName: home.team?.name || 'Home',
      abbreviation: home.team?.abbreviation || 'HOM',
      logoUrl: home.team?.logo || '',
      isHome: true,
      score: parseInt(home.score || 0, 10),
      record: home.records?.[0]?.summary || ''
    },
    awayTeam: {
      id: String(away.id || away.team?.id || ''),
      name: away.team?.displayName || away.team?.name || 'Away',
      shortName: away.team?.name || 'Away',
      abbreviation: away.team?.abbreviation || 'AWY',
      logoUrl: away.team?.logo || '',
      isHome: false,
      score: parseInt(away.score || 0, 10),
      record: away.records?.[0]?.summary || ''
    },
    sportDetails: {
      type: 'baseball',
      inning,
      half,
      outs,
      balls,
      strikes,
      baseRunners,
      hits: { home: 0, away: 0 },
      errors: { home: 0, away: 0 }
    },
    lastUpdated: Date.now()
  };
}
