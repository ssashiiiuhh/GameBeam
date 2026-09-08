// normalizers/nba.js - Normalizer for NBA events (ESPN schema)

export function normalizeNbaEvent(event) {
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
  }

  const quarter = status.period || 1;
  const isOvertime = quarter > 4;
  const clockDisplay = status.displayClock || '00:00';
  
  let statusDisplay = statusType.shortDetail || statusType.detail || clockDisplay;
  if (statusStage === 'in_progress') {
    const periodPrefix = isOvertime ? `OT${quarter > 5 ? quarter - 4 : ''}` : `Q${quarter}`;
    statusDisplay = `${periodPrefix} ${clockDisplay}`;
  } else if (statusStage === 'intermission') {
    statusDisplay = 'Halftime';
  }

  return {
    id: `espn:nba:${event.id}`,
    provider: 'espn',
    sport: 'basketball',
    competitionId: 'nba',
    competitionName: 'NBA',
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
      type: 'basketball',
      quarter,
      clockDisplay,
      isOvertime
    },
    lastUpdated: Date.now()
  };
}
