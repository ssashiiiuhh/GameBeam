import Foundation

public struct Team: Codable, Identifiable, Hashable, Sendable {
    public let id: String
    public var name: String
    public var shortName: String
    public var abbreviation: String
    public var logoUrl: String
    public var isHome: Bool?
    public var score: Int?
    public var record: String?
    
    public init(
        id: String,
        name: String,
        shortName: String,
        abbreviation: String,
        logoUrl: String,
        isHome: Bool? = nil,
        score: Int? = nil,
        record: String? = nil
    ) {
        self.id = id
        self.name = name
        self.shortName = shortName
        self.abbreviation = abbreviation
        self.logoUrl = logoUrl
        self.isHome = isHome
        self.score = score
        self.record = record
    }
}

public struct DirectoryTeam: Identifiable, Hashable, Sendable {
    public let id: String
    public let abbrev: String
    public let name: String
    public let shortName: String
    public let sport: Sport
    public let logo: String
    
    public var favKey: String {
        "\(sport.category):\(id)"
    }
}

public enum TeamDirectory {
    public static let mlbTeams: [DirectoryTeam] = [
        .init(id: "109", abbrev: "AZ", name: "Arizona Diamondbacks", shortName: "D-backs", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/ari.png"),
        .init(id: "144", abbrev: "ATL", name: "Atlanta Braves", shortName: "Braves", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/atl.png"),
        .init(id: "110", abbrev: "BAL", name: "Baltimore Orioles", shortName: "Orioles", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/bal.png"),
        .init(id: "111", abbrev: "BOS", name: "Boston Red Sox", shortName: "Red Sox", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/bos.png"),
        .init(id: "112", abbrev: "CHC", name: "Chicago Cubs", shortName: "Cubs", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/chc.png"),
        .init(id: "145", abbrev: "CWS", name: "Chicago White Sox", shortName: "White Sox", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/chw.png"),
        .init(id: "113", abbrev: "CIN", name: "Cincinnati Reds", shortName: "Reds", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/cin.png"),
        .init(id: "114", abbrev: "CLE", name: "Cleveland Guardians", shortName: "Guardians", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/cle.png"),
        .init(id: "115", abbrev: "COL", name: "Colorado Rockies", shortName: "Rockies", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/col.png"),
        .init(id: "116", abbrev: "DET", name: "Detroit Tigers", shortName: "Tigers", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/det.png"),
        .init(id: "117", abbrev: "HOU", name: "Houston Astros", shortName: "Astros", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/hou.png"),
        .init(id: "118", abbrev: "KC", name: "Kansas City Royals", shortName: "Royals", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/kc.png"),
        .init(id: "108", abbrev: "LAA", name: "Los Angeles Angels", shortName: "Angels", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/laa.png"),
        .init(id: "119", abbrev: "LAD", name: "Los Angeles Dodgers", shortName: "Dodgers", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/lad.png"),
        .init(id: "146", abbrev: "MIA", name: "Miami Marlins", shortName: "Marlins", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/mia.png"),
        .init(id: "158", abbrev: "MIL", name: "Milwaukee Brewers", shortName: "Brewers", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/mil.png"),
        .init(id: "142", abbrev: "MIN", name: "Minnesota Twins", shortName: "Twins", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/min.png"),
        .init(id: "121", abbrev: "NYM", name: "New York Mets", shortName: "Mets", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/nym.png"),
        .init(id: "147", abbrev: "NYY", name: "New York Yankees", shortName: "Yankees", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png"),
        .init(id: "133", abbrev: "OAK", name: "Oakland Athletics", shortName: "Athletics", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/oak.png"),
        .init(id: "143", abbrev: "PHI", name: "Philadelphia Phillies", shortName: "Phillies", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/phi.png"),
        .init(id: "134", abbrev: "PIT", name: "Pittsburgh Pirates", shortName: "Pirates", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/pit.png"),
        .init(id: "135", abbrev: "SD", name: "San Diego Padres", shortName: "Padres", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/sd.png"),
        .init(id: "137", abbrev: "SF", name: "San Francisco Giants", shortName: "Giants", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/sf.png"),
        .init(id: "136", abbrev: "SEA", name: "Seattle Mariners", shortName: "Mariners", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/sea.png"),
        .init(id: "138", abbrev: "STL", name: "St. Louis Cardinals", shortName: "Cardinals", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/stl.png"),
        .init(id: "139", abbrev: "TB", name: "Tampa Bay Rays", shortName: "Rays", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/tb.png"),
        .init(id: "140", abbrev: "TEX", name: "Texas Rangers", shortName: "Rangers", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/tex.png"),
        .init(id: "141", abbrev: "TOR", name: "Toronto Blue Jays", shortName: "Blue Jays", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/tor.png"),
        .init(id: "120", abbrev: "WSH", name: "Washington Nationals", shortName: "Nationals", sport: .mlb, logo: "https://a.espncdn.com/i/teamlogos/mlb/500/wsh.png")
    ]
    
    public static let nflTeams: [DirectoryTeam] = [
        .init(id: "22", abbrev: "ARI", name: "Arizona Cardinals", shortName: "Cardinals", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ari.png"),
        .init(id: "1", abbrev: "ATL", name: "Atlanta Falcons", shortName: "Falcons", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/atl.png"),
        .init(id: "33", abbrev: "BAL", name: "Baltimore Ravens", shortName: "Ravens", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png"),
        .init(id: "2", abbrev: "BUF", name: "Buffalo Bills", shortName: "Bills", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png"),
        .init(id: "29", abbrev: "CAR", name: "Carolina Panthers", shortName: "Panthers", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/car.png"),
        .init(id: "3", abbrev: "CHI", name: "Chicago Bears", shortName: "Bears", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png"),
        .init(id: "4", abbrev: "CIN", name: "Cincinnati Bengals", shortName: "Bengals", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png"),
        .init(id: "5", abbrev: "CLE", name: "Cleveland Browns", shortName: "Browns", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/cle.png"),
        .init(id: "6", abbrev: "DAL", name: "Dallas Cowboys", shortName: "Cowboys", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png"),
        .init(id: "7", abbrev: "DEN", name: "Denver Broncos", shortName: "Broncos", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/den.png"),
        .init(id: "8", abbrev: "DET", name: "Detroit Lions", shortName: "Lions", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/det.png"),
        .init(id: "9", abbrev: "GB", name: "Green Bay Packers", shortName: "Packers", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png"),
        .init(id: "34", abbrev: "HOU", name: "Houston Texans", shortName: "Texans", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/hou.png"),
        .init(id: "11", abbrev: "IND", name: "Indianapolis Colts", shortName: "Colts", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ind.png"),
        .init(id: "30", abbrev: "JAX", name: "Jacksonville Jaguars", shortName: "Jaguars", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png"),
        .init(id: "12", abbrev: "KC", name: "Kansas City Chiefs", shortName: "Chiefs", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png"),
        .init(id: "13", abbrev: "LV", name: "Las Vegas Raiders", shortName: "Raiders", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lv.png"),
        .init(id: "24", abbrev: "LAC", name: "Los Angeles Chargers", shortName: "Chargers", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lac.png"),
        .init(id: "14", abbrev: "LAR", name: "Los Angeles Rams", shortName: "Rams", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png"),
        .init(id: "15", abbrev: "MIA", name: "Miami Dolphins", shortName: "Dolphins", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/mia.png"),
        .init(id: "16", abbrev: "MIN", name: "Minnesota Vikings", shortName: "Vikings", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/min.png"),
        .init(id: "17", abbrev: "NE", name: "New England Patriots", shortName: "Patriots", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png"),
        .init(id: "18", abbrev: "NO", name: "New Orleans Saints", shortName: "Saints", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/no.png"),
        .init(id: "19", abbrev: "NYG", name: "New York Giants", shortName: "Giants", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png"),
        .init(id: "20", abbrev: "NYJ", name: "New York Jets", shortName: "Jets", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png"),
        .init(id: "21", abbrev: "PHI", name: "Philadelphia Eagles", shortName: "Eagles", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png"),
        .init(id: "23", abbrev: "PIT", name: "Pittsburgh Steelers", shortName: "Steelers", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png"),
        .init(id: "25", abbrev: "SF", name: "San Francisco 49ers", shortName: "49ers", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png"),
        .init(id: "26", abbrev: "SEA", name: "Seattle Seahawks", shortName: "Seahawks", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png"),
        .init(id: "27", abbrev: "TB", name: "Tampa Bay Buccaneers", shortName: "Buccaneers", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/tb.png"),
        .init(id: "10", abbrev: "TEN", name: "Tennessee Titans", shortName: "Titans", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ten.png"),
        .init(id: "28", abbrev: "WSH", name: "Washington Commanders", shortName: "Commanders", sport: .nfl, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png")
    ]
    
    public static let nbaTeams: [DirectoryTeam] = [
        .init(id: "1", abbrev: "ATL", name: "Atlanta Hawks", shortName: "Hawks", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/atl.png"),
        .init(id: "2", abbrev: "BOS", name: "Boston Celtics", shortName: "Celtics", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/bos.png"),
        .init(id: "17", abbrev: "BKN", name: "Brooklyn Nets", shortName: "Nets", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/bkn.png"),
        .init(id: "30", abbrev: "CHA", name: "Charlotte Hornets", shortName: "Hornets", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/cha.png"),
        .init(id: "4", abbrev: "CHI", name: "Chicago Bulls", shortName: "Bulls", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/chi.png"),
        .init(id: "5", abbrev: "CLE", name: "Cleveland Cavaliers", shortName: "Cavaliers", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/cle.png"),
        .init(id: "6", abbrev: "DAL", name: "Dallas Mavericks", shortName: "Mavericks", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/dal.png"),
        .init(id: "7", abbrev: "DEN", name: "Denver Nuggets", shortName: "Nuggets", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/den.png"),
        .init(id: "8", abbrev: "DET", name: "Detroit Pistons", shortName: "Pistons", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/det.png"),
        .init(id: "9", abbrev: "GSW", name: "Golden State Warriors", shortName: "Warriors", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/gs.png"),
        .init(id: "10", abbrev: "HOU", name: "Houston Rockets", shortName: "Rockets", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/hou.png"),
        .init(id: "11", abbrev: "IND", name: "Indiana Pacers", shortName: "Pacers", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/ind.png"),
        .init(id: "12", abbrev: "LAC", name: "LA Clippers", shortName: "Clippers", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/lac.png"),
        .init(id: "13", abbrev: "LAL", name: "Los Angeles Lakers", shortName: "Lakers", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/lal.png"),
        .init(id: "29", abbrev: "MEM", name: "Memphis Grizzlies", shortName: "Grizzlies", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/mem.png"),
        .init(id: "14", abbrev: "MIA", name: "Miami Heat", shortName: "Heat", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/mia.png"),
        .init(id: "15", abbrev: "MIL", name: "Milwaukee Bucks", shortName: "Bucks", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/mil.png"),
        .init(id: "16", abbrev: "MIN", name: "Minnesota Timberwolves", shortName: "Timberwolves", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/min.png"),
        .init(id: "3", abbrev: "NOP", name: "New Orleans Pelicans", shortName: "Pelicans", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/no.png"),
        .init(id: "18", abbrev: "NYK", name: "New York Knicks", shortName: "Knicks", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/ny.png"),
        .init(id: "25", abbrev: "OKC", name: "Oklahoma City Thunder", shortName: "Thunder", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/okc.png"),
        .init(id: "19", abbrev: "ORL", name: "Orlando Magic", shortName: "Magic", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/orl.png"),
        .init(id: "20", abbrev: "PHI", name: "Philadelphia 76ers", shortName: "76ers", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/phi.png"),
        .init(id: "21", abbrev: "PHX", name: "Phoenix Suns", shortName: "Suns", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/phx.png"),
        .init(id: "22", abbrev: "POR", name: "Portland Trail Blazers", shortName: "Trail Blazers", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/por.png"),
        .init(id: "23", abbrev: "SAC", name: "Sacramento Kings", shortName: "Kings", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/sac.png"),
        .init(id: "24", abbrev: "SAS", name: "San Antonio Spurs", shortName: "Spurs", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/sa.png"),
        .init(id: "28", abbrev: "TOR", name: "Toronto Raptors", shortName: "Raptors", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/tor.png"),
        .init(id: "26", abbrev: "UTA", name: "Utah Jazz", shortName: "Jazz", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/uta.png"),
        .init(id: "27", abbrev: "WAS", name: "Washington Wizards", shortName: "Wizards", sport: .nba, logo: "https://a.espncdn.com/i/teamlogos/nba/500/wsh.png")
    ]
    
    public static var allTeams: [DirectoryTeam] {
        mlbTeams + nflTeams + nbaTeams
    }
    
    public static func findTeam(id: String?, sport: Sport? = nil) -> DirectoryTeam? {
        guard let id = id, !id.isEmpty else { return nil }
        let pool = sport == nil ? allTeams : allTeams.filter { $0.sport == sport }
        return pool.first { $0.id == id || $0.favKey == id }
    }
    
    public static func search(query: String, sport: Sport? = nil) -> [DirectoryTeam] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let pool = sport == nil ? allTeams : allTeams.filter { $0.sport == sport }
        if q.isEmpty { return pool }
        return pool.filter {
            $0.name.lowercased().contains(q) ||
            $0.shortName.lowercased().contains(q) ||
            $0.abbrev.lowercased().contains(q)
        }
    }
}
