// normalizers/soccer.js - Normalizer for Premier League & UEFA Champions League (ESPN Soccer schema)

export function normalizeSoccerEvent(event, competitionId = 'epl') {
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
  } else if (statusType.name === 'STATUS_HALFTIME') {
    statusStage = 'intermission';
  } else if (statusType.name === 'STATUS_POSTPONED') {
    statusStage = 'postponed';
  }

  const clockMinutes = status.clock || 0;
  const displayClock = status.displayClock || `${clockMinutes}'`;
  
  let half = '1H';
  if (statusType.name === 'STATUS_HALFTIME') {
    half = 'HT';
  } else if (status.period === 2) {
    half = '2H';
  } else if (status.period > 2) {
    half = 'ET';
  } else if (statusType.completed) {
    half = 'FT';
  }

  let statusDisplay = statusType.shortDetail || statusType.detail || displayClock;
  if (statusStage === 'in_progress') {
    statusDisplay = displayClock;
  } else if (statusStage === 'intermission') {
    statusDisplay = 'HT';
  } else if (statusStage === 'completed') {
    statusDisplay = 'FT';
  }

  // Cards extraction if available
  const redCards = {
    home: parseInt(home.redCards || 0, 10),
    away: parseInt(away.redCards || 0, 10)
  };

  const competitionName = competitionId === 'ucl' ? 'Champions League' : 'Premier League';

  return {
    id: `espn:${competitionId}:${event.id}`,
    provider: 'espn',
    sport: 'soccer',
    competitionId,
    competitionName,
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
      type: 'soccer',
      half,
      matchMinute: clockMinutes,
      redCards,
      isVarReview: false
    },
    lastUpdated: Date.now()
  };
}
