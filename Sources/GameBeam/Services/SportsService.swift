import Foundation
import Combine

public final class SportsService: ObservableObject, @unchecked Sendable {
    public static let shared = SportsService()
    
    @Published public private(set) var allMatches: [Match] = []
    @Published public private(set) var isLoading: Bool = false
    @Published public private(set) var lastFetchDate: Date?
    
    private var pollTimer: AnyCancellable?
    private let urlSession: URLSession
    
    // Per-sport cache & dynamic scheduling
    private var matchesBySport: [Sport: [Match]] = [:]
    private var nextFetchTime: [Sport: Date] = [:]
    
    public init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 12
        config.timeoutIntervalForResource = 30
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        self.urlSession = URLSession(configuration: config)
    }
    
    public func startPolling() {
        // Initial fetch: discover schedule across all sports
        fetchAllSports(force: true)
        
        // Dynamic adaptive ticker: checks every 5 seconds if any sport is due
        pollTimer = Timer.publish(every: 5, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.fetchAllSports(force: false)
            }
    }
    
    public func stopPolling() {
        pollTimer?.cancel()
        pollTimer = nil
    }
    
    public func fetchAllSports(force: Bool = true) {
        Task {
            await fetchMatches(force: force)
        }
    }
    
    public func fetchMatches(force: Bool = false) async {
        let now = Date()
        let sportsToCheck: [Sport] = [.mlb, .nfl, .nba]
        
        // 1. Identify which sports are actually due to ping upstream
        let sportsToFetch: [Sport] = await MainActor.run {
            var list: [Sport] = []
            for sport in sportsToCheck {
                if force {
                    list.append(sport)
                } else if let next = nextFetchTime[sport] {
                    if now >= next.addingTimeInterval(-0.5) {
                        list.append(sport)
                    }
                } else {
                    // Not yet fetched once
                    list.append(sport)
                }
            }
            return list
        }
        
        // 2. If NO sports are due (e.g. no games on today for sleeping leagues), don't ping any API!
        guard !sportsToFetch.isEmpty else {
            return
        }
        
        await MainActor.run {
            self.isLoading = true
        }
        
        let (mlbStart, mlbEnd, espnDates) = calculateDateRange()
        
        // 3. Fetch ONLY the due sports in parallel
        var fetchedResults: [(Sport, [Match])] = []
        await withTaskGroup(of: (Sport, [Match]).self) { group in
            for sport in sportsToFetch {
                group.addTask {
                    switch sport {
                    case .mlb:
                        let matches = await self.fetchMLB(startDate: mlbStart, endDate: mlbEnd)
                        return (.mlb, matches)
                    case .nfl:
                        let matches = await self.fetchESPN(sport: .nfl, dates: espnDates)
                        return (.nfl, matches)
                    case .nba:
                        let matches = await self.fetchESPN(sport: .nba, dates: espnDates)
                        return (.nba, matches)
                    }
                }
            }
            
            for await result in group {
                fetchedResults.append(result)
            }
        }
        
        // 4. Update cache and schedule next pings on MainActor
        let finalResults = fetchedResults
        await MainActor.run {
            self.applyFetchedResults(finalResults)
        }
    }
    
    @MainActor
    private func applyFetchedResults(_ fetchedResults: [(Sport, [Match])]) {
        for (sport, matches) in fetchedResults {
            if !matches.isEmpty || self.matchesBySport[sport] == nil {
                self.matchesBySport[sport] = matches
            }
            let currentSportMatches = self.matchesBySport[sport] ?? []
            let delay = self.calculateNextFetchDelay(for: sport, matches: currentSportMatches)
            self.nextFetchTime[sport] = Date().addingTimeInterval(delay)
            
            #if DEBUG
            let liveCount = currentSportMatches.filter { $0.isLive }.count
            print("[SportsService] \(sport.rawValue.uppercased()): \(currentSportMatches.count) matches (\(liveCount) live). Next ping in \(Int(delay))s")
            #endif
        }
        
        var combined: [Match] = []
        for (_, list) in self.matchesBySport {
            combined.append(contentsOf: list)
        }
        
        // Sort: Live matches first, then upcoming by start time, then completed
        combined.sort { a, b in
            if a.isLive != b.isLive {
                return a.isLive && !b.isLive
            }
            if a.statusStage != b.statusStage {
                if a.statusStage == .inProgress { return true }
                if b.statusStage == .inProgress { return false }
                if a.statusStage == .scheduled && b.statusStage == .completed { return true }
                if a.statusStage == .completed && b.statusStage == .scheduled { return false }
            }
            return a.scheduledStartTime < b.scheduledStartTime
        }
        
        self.allMatches = combined
        self.isLoading = false
        self.lastFetchDate = Date()
    }
    
    /// Determines how soon this specific sport needs to be re-pinged
    public func calculateNextFetchDelay(for sport: Sport, matches: [Match]) -> TimeInterval {
        let now = Date()
        let cal = Calendar.current
        
        // 1. If any match is LIVE: high-frequency real-time updates every 15 seconds
        if matches.contains(where: { $0.isLive }) {
            return 15.0
        }
        
        // 2. Check for games scheduled to have started recently (within last 45 mins)
        // that have not yet been flipped to 'inProgress' by upstream API
        let recentlyScheduledGames = matches.filter { m in
            guard m.statusStage == .scheduled,
                  let d = DateFormatterCache.parseISO8601(m.scheduledStartTime) else { return false }
            let elapsed = now.timeIntervalSince(d)
            return elapsed >= 0 && elapsed <= 2700 // Scheduled in last 45 minutes
        }
        if !recentlyScheduledGames.isEmpty {
            // Game is starting now / recently started: poll every 35 seconds to catch live transition
            return 35.0
        }
        
        // 3. Inspect upcoming games for this league
        var upcomingDates: [Date] = []
        for m in matches where m.statusStage == .scheduled {
            if let d = DateFormatterCache.parseISO8601(m.scheduledStartTime) {
                if d > now {
                    upcomingDates.append(d)
                }
            }
        }
        
        guard let nextGameDate = upcomingDates.min() else {
            // 4. No upcoming matches scheduled at all (offseason, or all games completed)
            // Completely sleep for 3 hours - DO NOT ping API on fast loop!
            return 3 * 3600.0
        }
        
        let secondsUntil = nextGameDate.timeIntervalSince(now)
        
        if secondsUntil <= 300 {
            // Game starting within 5 minutes: poll every 35 seconds to capture game tip-off/first pitch
            return 35.0
        } else if secondsUntil <= 1800 {
            // Pre-game within 30 minutes: poll every 2 minutes
            return 120.0
        } else if cal.isDateInToday(nextGameDate) {
            // Later today: wake up 15 minutes before the game, check at most every 30 mins
            return min(max(secondsUntil - 900, 120), 1800)
        } else {
            // No more games today (next game is tomorrow or later)
            // Sleep for 3 hours
            return 3 * 3600.0
        }
    }
    
    public func nextFetchDate(for sport: Sport) -> Date? {
        nextFetchTime[sport]
    }
    
    private func fetchMLB(startDate: String, endDate: String) async -> [Match] {
        let urlStr = "https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=\(startDate)&endDate=\(endDate)&hydrate=team,linescore"
        guard let url = URL(string: urlStr) else { return [] }
        
        do {
            let (data, response) = try await urlSession.data(from: url)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return [] }
            let dto = try JSONDecoder().decode(MLBResponseDTO.self, from: data)
            
            var matches: [Match] = []
            for d in dto.dates ?? [] {
                for g in d.games ?? [] {
                    matches.append(MLBNormalizer.normalize(game: g))
                }
            }
            return matches
        } catch {
            print("[SportsService] MLB fetch error: \(error)")
            return []
        }
    }
    
    private func fetchESPN(sport: Sport, dates: String) async -> [Match] {
        let leaguePath = sport == .nfl ? "football/nfl" : "basketball/nba"
        let urlStr = "https://site.api.espn.com/apis/site/v2/sports/\(leaguePath)/scoreboard?dates=\(dates)&limit=100"
        guard let url = URL(string: urlStr) else { return [] }
        
        do {
            let (data, response) = try await urlSession.data(from: url)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return [] }
            let dto = try JSONDecoder().decode(ESPNScoreboardResponse.self, from: data)
            
            var matches: [Match] = []
            for ev in dto.events ?? [] {
                matches.append(ESPNNormalizer.normalize(event: ev, sport: sport))
            }
            return matches
        } catch {
            print("[SportsService] ESPN \(sport.rawValue) fetch error: \(error)")
            return []
        }
    }
    
    private func calculateDateRange() -> (mlbStart: String, mlbEnd: String, espnDates: String) {
        let now = Date()
        let cal = Calendar.current
        let start = cal.date(byAdding: .day, value: -1, to: now) ?? now
        let end = cal.date(byAdding: .day, value: 10, to: now) ?? now
        
        let isoFormatter = DateFormatter()
        isoFormatter.dateFormat = "yyyy-MM-dd"
        isoFormatter.timeZone = TimeZone.current
        
        let espnFormatter = DateFormatter()
        espnFormatter.dateFormat = "yyyyMMdd"
        espnFormatter.timeZone = TimeZone.current
        
        return (
            mlbStart: isoFormatter.string(from: start),
            mlbEnd: isoFormatter.string(from: end),
            espnDates: "\(espnFormatter.string(from: start))-\(espnFormatter.string(from: end))"
        )
    }
    
    // MARK: - Filtering
    public func filterMatches(
        sportFilter: String,
        dateTab: String,
        searchQuery: String,
        memoryStore: MemoryStore = .shared
    ) -> [Match] {
        var list = allMatches
        
        // 1. Sport filter
        if sportFilter == "favs" {
            list = list.filter { memoryStore.isMatchFavoured(match: $0) }
        } else if let s = Sport(rawValue: sportFilter) {
            list = list.filter { $0.sport == s }
        }
        
        // 2. Date tab filter
        let cal = Calendar.current
        let today = Date()
        
        list = list.filter { match in
            guard let matchDate = DateFormatterCache.parseISO8601(match.scheduledStartTime) else {
                return true
            }
            
            switch dateTab {
            case "yesterday":
                guard let yesterday = cal.date(byAdding: .day, value: -1, to: today) else { return false }
                return cal.isDate(matchDate, inSameDayAs: yesterday)
            case "today":
                return cal.isDateInToday(matchDate) || match.isLive
            case "tomorrow":
                guard let tomorrow = cal.date(byAdding: .day, value: 1, to: today) else { return false }
                return cal.isDate(matchDate, inSameDayAs: tomorrow)
            case "upcoming":
                return matchDate >= cal.startOfDay(for: today)
            default:
                return true
            }
        }
        
        // 3. Search query
        let q = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !q.isEmpty {
            list = list.filter {
                $0.homeTeam.name.lowercased().contains(q) ||
                $0.homeTeam.abbreviation.lowercased().contains(q) ||
                $0.awayTeam.name.lowercased().contains(q) ||
                $0.awayTeam.abbreviation.lowercased().contains(q) ||
                $0.competitionName.lowercased().contains(q)
            }
        }
        
        return list
    }
}
