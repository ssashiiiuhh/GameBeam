// teams_data.js - Official directory of MLB, NFL, and NBA teams
// Provides names, abbreviations, IDs, and CDN logo URLs for team selection and auto-pinning

export const MLB_TEAMS = [
  { id: '109', abbrev: 'AZ', name: 'Arizona Diamondbacks', shortName: 'D-backs', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/ari.png' },
  { id: '144', abbrev: 'ATL', name: 'Atlanta Braves', shortName: 'Braves', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png' },
  { id: '110', abbrev: 'BAL', name: 'Baltimore Orioles', shortName: 'Orioles', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bal.png' },
  { id: '111', abbrev: 'BOS', name: 'Boston Red Sox', shortName: 'Red Sox', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png' },
  { id: '112', abbrev: 'CHC', name: 'Chicago Cubs', shortName: 'Cubs', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/chc.png' },
  { id: '145', abbrev: 'CWS', name: 'Chicago White Sox', shortName: 'White Sox', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/chw.png' },
  { id: '113', abbrev: 'CIN', name: 'Cincinnati Reds', shortName: 'Reds', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/cin.png' },
  { id: '114', abbrev: 'CLE', name: 'Cleveland Guardians', shortName: 'Guardians', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/cle.png' },
  { id: '115', abbrev: 'COL', name: 'Colorado Rockies', shortName: 'Rockies', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/col.png' },
  { id: '116', abbrev: 'DET', name: 'Detroit Tigers', shortName: 'Tigers', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/det.png' },
  { id: '117', abbrev: 'HOU', name: 'Houston Astros', shortName: 'Astros', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/hou.png' },
  { id: '118', abbrev: 'KC', name: 'Kansas City Royals', shortName: 'Royals', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/kc.png' },
  { id: '108', abbrev: 'LAA', name: 'Los Angeles Angels', shortName: 'Angels', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/laa.png' },
  { id: '119', abbrev: 'LAD', name: 'Los Angeles Dodgers', shortName: 'Dodgers', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png' },
  { id: '146', abbrev: 'MIA', name: 'Miami Marlins', shortName: 'Marlins', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/mia.png' },
  { id: '158', abbrev: 'MIL', name: 'Milwaukee Brewers', shortName: 'Brewers', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/mil.png' },
  { id: '142', abbrev: 'MIN', name: 'Minnesota Twins', shortName: 'Twins', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/min.png' },
  { id: '121', abbrev: 'NYM', name: 'New York Mets', shortName: 'Mets', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nym.png' },
  { id: '147', abbrev: 'NYY', name: 'New York Yankees', shortName: 'Yankees', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png' },
  { id: '133', abbrev: 'OAK', name: 'Oakland Athletics', shortName: 'Athletics', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/oak.png' },
  { id: '143', abbrev: 'PHI', name: 'Philadelphia Phillies', shortName: 'Phillies', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/phi.png' },
  { id: '134', abbrev: 'PIT', name: 'Pittsburgh Pirates', shortName: 'Pirates', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/pit.png' },
  { id: '135', abbrev: 'SD', name: 'San Diego Padres', shortName: 'Padres', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sd.png' },
  { id: '137', abbrev: 'SF', name: 'San Francisco Giants', shortName: 'Giants', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sf.png' },
  { id: '136', abbrev: 'SEA', name: 'Seattle Mariners', shortName: 'Mariners', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sea.png' },
  { id: '138', abbrev: 'STL', name: 'St. Louis Cardinals', shortName: 'Cardinals', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/stl.png' },
  { id: '139', abbrev: 'TB', name: 'Tampa Bay Rays', shortName: 'Rays', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tb.png' },
  { id: '140', abbrev: 'TEX', name: 'Texas Rangers', shortName: 'Rangers', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tex.png' },
  { id: '141', abbrev: 'TOR', name: 'Toronto Blue Jays', shortName: 'Blue Jays', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tor.png' },
  { id: '120', abbrev: 'WSH', name: 'Washington Nationals', shortName: 'Nationals', sport: 'baseball', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/wsh.png' }
];

export const NFL_TEAMS = [
  { id: '22', abbrev: 'ARI', name: 'Arizona Cardinals', shortName: 'Cardinals', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png' },
  { id: '1', abbrev: 'ATL', name: 'Atlanta Falcons', shortName: 'Falcons', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png' },
  { id: '33', abbrev: 'BAL', name: 'Baltimore Ravens', shortName: 'Ravens', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png' },
  { id: '2', abbrev: 'BUF', name: 'Buffalo Bills', shortName: 'Bills', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png' },
  { id: '29', abbrev: 'CAR', name: 'Carolina Panthers', shortName: 'Panthers', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png' },
  { id: '3', abbrev: 'CHI', name: 'Chicago Bears', shortName: 'Bears', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png' },
  { id: '4', abbrev: 'CIN', name: 'Cincinnati Bengals', shortName: 'Bengals', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png' },
  { id: '5', abbrev: 'CLE', name: 'Cleveland Browns', shortName: 'Browns', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png' },
  { id: '6', abbrev: 'DAL', name: 'Dallas Cowboys', shortName: 'Cowboys', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png' },
  { id: '7', abbrev: 'DEN', name: 'Denver Broncos', shortName: 'Broncos', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png' },
  { id: '8', abbrev: 'DET', name: 'Detroit Lions', shortName: 'Lions', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png' },
  { id: '9', abbrev: 'GB', name: 'Green Bay Packers', shortName: 'Packers', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png' },
  { id: '34', abbrev: 'HOU', name: 'Houston Texans', shortName: 'Texans', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png' },
  { id: '11', abbrev: 'IND', name: 'Indianapolis Colts', shortName: 'Colts', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png' },
  { id: '30', abbrev: 'JAX', name: 'Jacksonville Jaguars', shortName: 'Jaguars', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png' },
  { id: '12', abbrev: 'KC', name: 'Kansas City Chiefs', shortName: 'Chiefs', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png' },
  { id: '13', abbrev: 'LV', name: 'Las Vegas Raiders', shortName: 'Raiders', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png' },
  { id: '24', abbrev: 'LAC', name: 'Los Angeles Chargers', shortName: 'Chargers', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png' },
  { id: '14', abbrev: 'LAR', name: 'Los Angeles Rams', shortName: 'Rams', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png' },
  { id: '15', abbrev: 'MIA', name: 'Miami Dolphins', shortName: 'Dolphins', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png' },
  { id: '16', abbrev: 'MIN', name: 'Minnesota Vikings', shortName: 'Vikings', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png' },
  { id: '17', abbrev: 'NE', name: 'New England Patriots', shortName: 'Patriots', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png' },
  { id: '18', abbrev: 'NO', name: 'New Orleans Saints', shortName: 'Saints', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png' },
  { id: '19', abbrev: 'NYG', name: 'New York Giants', shortName: 'Giants', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png' },
  { id: '20', abbrev: 'NYJ', name: 'New York Jets', shortName: 'Jets', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png' },
  { id: '21', abbrev: 'PHI', name: 'Philadelphia Eagles', shortName: 'Eagles', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png' },
  { id: '23', abbrev: 'PIT', name: 'Pittsburgh Steelers', shortName: 'Steelers', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png' },
  { id: '25', abbrev: 'SF', name: 'San Francisco 49ers', shortName: '49ers', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png' },
  { id: '26', abbrev: 'SEA', name: 'Seattle Seahawks', shortName: 'Seahawks', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png' },
  { id: '27', abbrev: 'TB', name: 'Tampa Bay Buccaneers', shortName: 'Buccaneers', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png' },
  { id: '10', abbrev: 'TEN', name: 'Tennessee Titans', shortName: 'Titans', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png' },
  { id: '28', abbrev: 'WSH', name: 'Washington Commanders', shortName: 'Commanders', sport: 'football', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png' }
];

export const NBA_TEAMS = [
  { id: '1', abbrev: 'ATL', name: 'Atlanta Hawks', shortName: 'Hawks', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/atl.png' },
  { id: '2', abbrev: 'BOS', name: 'Boston Celtics', shortName: 'Celtics', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png' },
  { id: '17', abbrev: 'BKN', name: 'Brooklyn Nets', shortName: 'Nets', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bkn.png' },
  { id: '30', abbrev: 'CHA', name: 'Charlotte Hornets', shortName: 'Hornets', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/cha.png' },
  { id: '4', abbrev: 'CHI', name: 'Chicago Bulls', shortName: 'Bulls', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/chi.png' },
  { id: '5', abbrev: 'CLE', name: 'Cleveland Cavaliers', shortName: 'Cavaliers', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/cle.png' },
  { id: '6', abbrev: 'DAL', name: 'Dallas Mavericks', shortName: 'Mavericks', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/dal.png' },
  { id: '7', abbrev: 'DEN', name: 'Denver Nuggets', shortName: 'Nuggets', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/den.png' },
  { id: '8', abbrev: 'DET', name: 'Detroit Pistons', shortName: 'Pistons', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/det.png' },
  { id: '9', abbrev: 'GSW', name: 'Golden State Warriors', shortName: 'Warriors', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/gs.png' },
  { id: '10', abbrev: 'HOU', name: 'Houston Rockets', shortName: 'Rockets', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/hou.png' },
  { id: '11', abbrev: 'IND', name: 'Indiana Pacers', shortName: 'Pacers', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ind.png' },
  { id: '12', abbrev: 'LAC', name: 'LA Clippers', shortName: 'Clippers', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lac.png' },
  { id: '13', abbrev: 'LAL', name: 'Los Angeles Lakers', shortName: 'Lakers', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png' },
  { id: '29', abbrev: 'MEM', name: 'Memphis Grizzlies', shortName: 'Grizzlies', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mem.png' },
  { id: '14', abbrev: 'MIA', name: 'Miami Heat', shortName: 'Heat', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png' },
  { id: '15', abbrev: 'MIL', name: 'Milwaukee Bucks', shortName: 'Bucks', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png' },
  { id: '16', abbrev: 'MIN', name: 'Minnesota Timberwolves', shortName: 'Timberwolves', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/min.png' },
  { id: '3', abbrev: 'NOP', name: 'New Orleans Pelicans', shortName: 'Pelicans', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/no.png' },
  { id: '18', abbrev: 'NYK', name: 'New York Knicks', shortName: 'Knicks', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ny.png' },
  { id: '25', abbrev: 'OKC', name: 'Oklahoma City Thunder', shortName: 'Thunder', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/okc.png' },
  { id: '19', abbrev: 'ORL', name: 'Orlando Magic', shortName: 'Magic', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/orl.png' },
  { id: '20', abbrev: 'PHI', name: 'Philadelphia 76ers', shortName: '76ers', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phi.png' },
  { id: '21', abbrev: 'PHX', name: 'Phoenix Suns', shortName: 'Suns', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png' },
  { id: '22', abbrev: 'POR', name: 'Portland Trail Blazers', shortName: 'Trail Blazers', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/por.png' },
  { id: '23', abbrev: 'SAC', name: 'Sacramento Kings', shortName: 'Kings', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png' },
  { id: '24', abbrev: 'SAS', name: 'San Antonio Spurs', shortName: 'Spurs', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sa.png' },
  { id: '28', abbrev: 'TOR', name: 'Toronto Raptors', shortName: 'Raptors', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/tor.png' },
  { id: '26', abbrev: 'UTA', name: 'Utah Jazz', shortName: 'Jazz', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/uta.png' },
  { id: '27', abbrev: 'WAS', name: 'Washington Wizards', shortName: 'Wizards', sport: 'basketball', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/wsh.png' }
];

export const ALL_TEAMS = [...MLB_TEAMS, ...NFL_TEAMS, ...NBA_TEAMS];

/**
 * Find a team by its ID, abbreviation, or name
 */
export function findTeam(query, sport = null) {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();
  const pool = sport ? ALL_TEAMS.filter(t => t.sport === sport) : ALL_TEAMS;

  return pool.find(t => 
    t.id === String(query) ||
    t.abbrev.toLowerCase() === q ||
    t.name.toLowerCase() === q ||
    t.shortName.toLowerCase() === q ||
    t.name.toLowerCase().includes(q)
  ) || null;
}
