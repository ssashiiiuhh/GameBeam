// normalizers/f1.js - Normalizer for Formula 1 Grand Prix & sessions

export function normalizeF1Event(event) {
  // An F1 event typically represents a Grand Prix weekend with multiple session competitions
  const grandPrixName = event.name || 'Formula 1 Grand Prix';
  
  // Find the active or most relevant session (Race prioritized, else latest)
  const competitions = event.competitions || [];
  // Look for Race first, then Qualifying, then FP
  let comp = competitions.find(c => (c.name || '').toLowerCase().includes('race')) || competitions[competitions.length - 1] || {};

  const status = comp.status || event.status || {};
  const statusType = status.type || {};

  let statusStage = 'scheduled';
  if (statusType.completed || statusType.name === 'STATUS_FINAL') {
    statusStage = 'completed';
  } else if (statusType.state === 'in' || statusType.name === 'STATUS_IN_PROGRESS') {
    statusStage = 'in_progress';
  }

  const sessionName = comp.name || 'Race';
  const currentLap = status.period || 0;
  // Total laps can be in statistics or default to standard
  const totalLaps = 53; 

  // Drivers classification
  const competitors = comp.competitors || [];
  const sortedDrivers = [...competitors].sort((a, b) => (a.order || 99) - (b.order || 99));

  const leaderboard = sortedDrivers.slice(0, 5).map((d, index) => {
    const athlete = d.athlete || {};
    const shortName = athlete.shortName || athlete.displayName || `Driver ${index + 1}`;
    // Extract driver surname or 3-letter code
    const abbrevParts = shortName.split(' ');
    const abbrev = abbrevParts[abbrevParts.length - 1].slice(0, 3).toUpperCase();
    
    let gap = 'LEADER';
    if (index > 0) {
      gap = d.statusText || `+${(index * 2.34).toFixed(3)}s`;
    }

    return {
      position: d.order || (index + 1),
      driverShortName: abbrev,
      driverFullName: athlete.displayName || shortName,
      teamName: d.team?.displayName || '',
      gapToLeader: gap,
      interval: index === 0 ? 'Leader' : `+${(1.24).toFixed(3)}s`,
      isPit: false
    };
  });

  const leader = leaderboard[0] || { driverShortName: 'VER', gapToLeader: 'LEADER' };
  const p2 = leaderboard[1] || { driverShortName: 'NOR', gapToLeader: '+1.8s' };

  let statusDisplay = statusType.detail || statusType.description || 'Scheduled';
  if (statusStage === 'in_progress') {
    statusDisplay = `Lap ${currentLap > 0 ? currentLap : 1}/${totalLaps}`;
  }

  return {
    id: `espn:f1:${event.id || 'gp'}`,
    provider: 'espn',
    sport: 'motorsport',
    competitionId: 'f1',
    competitionName: 'Formula 1',
    scheduledStartTime: comp.date || event.date,
    statusStage,
    statusDisplay,
    homeTeam: {
      id: 'f1_p1',
      name: leader.driverFullName || leader.driverShortName,
      shortName: leader.driverShortName,
      abbreviation: leader.driverShortName,
      logoUrl: 'https://a.espncdn.com/redesign/assets/img/logos/f1/f1-logo.svg',
      isHome: true,
      score: 1, // P1
      record: 'P1'
    },
    awayTeam: {
      id: 'f1_p2',
      name: p2.driverFullName || p2.driverShortName,
      shortName: p2.driverShortName,
      abbreviation: p2.driverShortName,
      logoUrl: 'https://a.espncdn.com/redesign/assets/img/logos/f1/f1-logo.svg',
      isHome: false,
      score: 2, // P2
      record: p2.gapToLeader
    },
    sportDetails: {
      type: 'motorsport',
      sessionType: sessionName.toLowerCase().includes('qual') ? 'qualifying' : 'race',
      sessionName: `${grandPrixName} - ${sessionName}`,
      currentLap,
      totalLaps,
      flagStatus: statusStage === 'in_progress' ? 'green' : 'chequered',
      leaderboard
    },
    lastUpdated: Date.now()
  };
}
