import XCTest
@testable import GameBeam

final class GameBeamTests: XCTestCase {
    
    func testAppMemoryDeserialization() throws {
        let memoryPath = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/com.gamebeam.macos/gamebeam_memory.json")
        
        if FileManager.default.fileExists(atPath: memoryPath.path) {
            let data = try Data(contentsOf: memoryPath)
            let decoder = JSONDecoder()
            let memory = try decoder.decode(AppMemory.self, from: data)
            XCTAssertFalse(memory.favourites.teams.isEmpty, "Favourite teams should not be empty")
            print("Successfully decoded memory with \(memory.favourites.teams.count) favourite teams: \(memory.favourites.teams)")
        } else {
            print("No memory file yet at \(memoryPath.path)")
        }
    }
    
    func testTeamDirectory() {
        let yankees = TeamDirectory.findTeam(id: "147", sport: .mlb)
        XCTAssertNotNil(yankees)
        XCTAssertEqual(yankees?.abbrev, "NYY")
        
        let heat = TeamDirectory.findTeam(id: "14", sport: .nba)
        XCTAssertNotNil(heat)
        XCTAssertEqual(heat?.abbrev, "MIA")
        
        let chiefs = TeamDirectory.findTeam(id: "12", sport: .nfl)
        XCTAssertNotNil(chiefs)
        XCTAssertEqual(chiefs?.abbrev, "KC")
        
        let searchResults = TeamDirectory.search(query: "Yankees")
        XCTAssertEqual(searchResults.first?.abbrev, "NYY")
    }
    
    func testESPNDecoding() throws {
        let json = """
        {
            "events": [
                {
                    "id": "401585601",
                    "date": "2024-03-24T23:30Z",
                    "status": {
                        "period": 4,
                        "displayClock": "02:15",
                        "type": {
                            "state": "in",
                            "completed": false,
                            "shortDetail": "Q4 02:15",
                            "name": "STATUS_IN_PROGRESS"
                        }
                    },
                    "competitions": [
                        {
                            "competitors": [
                                {
                                    "id": "14",
                                    "homeAway": "home",
                                    "score": "104",
                                    "team": {
                                        "id": "14",
                                        "displayName": "Miami Heat",
                                        "name": "Heat",
                                        "abbreviation": "MIA"
                                    }
                                },
                                {
                                    "id": "2",
                                    "homeAway": "away",
                                    "score": "98",
                                    "team": {
                                        "id": "2",
                                        "displayName": "Boston Celtics",
                                        "name": "Celtics",
                                        "abbreviation": "BOS"
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        """.data(using: .utf8)!
        
        let response = try JSONDecoder().decode(ESPNScoreboardResponse.self, from: json)
        guard let event = response.events?.first else {
            XCTFail("Event not found")
            return
        }
        
        let match = ESPNNormalizer.normalize(event: event, sport: .nba)
        XCTAssertEqual(match.homeTeam.abbreviation, "MIA")
        XCTAssertEqual(match.awayTeam.abbreviation, "BOS")
        XCTAssertEqual(match.homeTeam.score, 104)
        XCTAssertEqual(match.awayTeam.score, 98)
        XCTAssertTrue(match.isLive)
        XCTAssertEqual(match.scoreText, "BOS 98 - 104 MIA")
    }
    
    func testMLBDTO() throws {
        let json = """
        {
            "dates": [
                {
                    "date": "2024-03-24",
                    "games": [
                        {
                            "gamePk": 748532,
                            "gameDate": "2024-03-24T17:05:00Z",
                            "status": {
                                "abstractGameState": "Live",
                                "detailedState": "In Progress",
                                "statusCode": "I"
                            },
                            "teams": {
                                "away": {
                                    "score": 4,
                                    "team": { "id": 147, "name": "New York Yankees", "abbreviation": "NYY" },
                                    "leagueRecord": { "wins": 10, "losses": 5 }
                                },
                                "home": {
                                    "score": 2,
                                    "team": { "id": 111, "name": "Boston Red Sox", "abbreviation": "BOS" },
                                    "leagueRecord": { "wins": 8, "losses": 7 }
                                }
                            },
                            "linescore": {
                                "currentInning": 7,
                                "isTopInning": true,
                                "outs": 2,
                                "balls": 3,
                                "strikes": 1,
                                "offense": { "first": true }
                            }
                        }
                    ]
                }
            ]
        }
        """.data(using: .utf8)!
        
        let response = try JSONDecoder().decode(MLBResponseDTO.self, from: json)
        guard let game = response.dates?.first?.games?.first else {
            XCTFail("Game not found")
            return
        }
        
        let match = MLBNormalizer.normalize(game: game)
        XCTAssertEqual(match.homeTeam.abbreviation, "BOS")
        XCTAssertEqual(match.awayTeam.abbreviation, "NYY")
        XCTAssertEqual(match.homeTeam.score, 2)
        XCTAssertEqual(match.awayTeam.score, 4)
        XCTAssertTrue(match.isLive)
        XCTAssertEqual(match.statusDisplay, "Top 7")
    }
}

extension GameBeamTests {
    func testLiveSportsFetching() async throws {
        let service = SportsService()
        await service.fetchMatches()
        
        print("Fetched \(service.allMatches.count) total matches across MLB, NFL, NBA.")
        XCTAssertGreaterThan(service.allMatches.count, 0, "Should fetch at least 1 match across the leagues")
        
        if let first = service.allMatches.first {
            print("Sample match: \(first.shortSummary) [\(first.competitionName)]")
            XCTAssertFalse(first.id.isEmpty)
            XCTAssertFalse(first.homeTeam.name.isEmpty)
            XCTAssertFalse(first.awayTeam.name.isEmpty)
        }
    }
    
    func testAdaptiveLeagueScheduling() {
        let service = SportsService()
        
        // 1. Live game in progress -> must poll every 15s
        let liveMatch = Match(
            id: "m1", provider: "test", sport: .mlb, competitionId: "mlb", competitionName: "MLB",
            scheduledStartTime: ISO8601DateFormatter().string(from: Date()),
            statusStage: .inProgress, statusDisplay: "Top 3",
            homeTeam: Team(id: "1", name: "Home", shortName: "H", abbreviation: "H", logoUrl: "", isHome: true, score: 2),
            awayTeam: Team(id: "2", name: "Away", shortName: "A", abbreviation: "A", logoUrl: "", isHome: false, score: 1),
            sportDetails: .none, lastUpdated: 0
        )
        let liveDelay = service.calculateNextFetchDelay(for: .mlb, matches: [liveMatch])
        XCTAssertEqual(liveDelay, 15.0, "Live match must poll every 15 seconds")
        
        // 2. Off-day / no games today -> sleep for 3 hours (10,800s)
        let futureMatch = Match(
            id: "m2", provider: "test", sport: .nfl, competitionId: "nfl", competitionName: "NFL",
            scheduledStartTime: ISO8601DateFormatter().string(from: Date().addingTimeInterval(86400 * 3)),
            statusStage: .scheduled, statusDisplay: "Scheduled",
            homeTeam: Team(id: "1", name: "Home", shortName: "H", abbreviation: "H", logoUrl: "", isHome: true, score: 0),
            awayTeam: Team(id: "2", name: "Away", shortName: "A", abbreviation: "A", logoUrl: "", isHome: false, score: 0),
            sportDetails: .none, lastUpdated: 0
        )
        let offDayDelay = service.calculateNextFetchDelay(for: .nfl, matches: [futureMatch])
        XCTAssertEqual(offDayDelay, 10800.0, "Off-day or no games today must sleep for 3 hours")
        
        // 3. Game starting in 2 minutes -> poll every 35 seconds (30-45s)
        let imminentMatch = Match(
            id: "m3", provider: "test", sport: .nba, competitionId: "nba", competitionName: "NBA",
            scheduledStartTime: ISO8601DateFormatter().string(from: Date().addingTimeInterval(120)),
            statusStage: .scheduled, statusDisplay: "Scheduled",
            homeTeam: Team(id: "1", name: "Home", shortName: "H", abbreviation: "H", logoUrl: "", isHome: true, score: nil),
            awayTeam: Team(id: "2", name: "Away", shortName: "A", abbreviation: "A", logoUrl: "", isHome: false, score: nil),
            sportDetails: .none, lastUpdated: 0
        )
        let imminentDelay = service.calculateNextFetchDelay(for: .nba, matches: [imminentMatch])
        XCTAssertEqual(imminentDelay, 35.0, "Game starting in 2 minutes must poll every 35 seconds")
        
        // 4. Game scheduled 5 minutes ago that hasn't transitioned to live yet -> must NOT sleep 3 hours, must poll in 35s!
        let startingNowMatch = Match(
            id: "m4", provider: "test", sport: .mlb, competitionId: "mlb", competitionName: "MLB",
            scheduledStartTime: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-300)),
            statusStage: .scheduled, statusDisplay: "Scheduled",
            homeTeam: Team(id: "1", name: "Home", shortName: "H", abbreviation: "H", logoUrl: "", isHome: true, score: nil),
            awayTeam: Team(id: "2", name: "Away", shortName: "A", abbreviation: "A", logoUrl: "", isHome: false, score: nil),
            sportDetails: .none, lastUpdated: 0
        )
        let startingNowDelay = service.calculateNextFetchDelay(for: .mlb, matches: [startingNowMatch])
        XCTAssertEqual(startingNowDelay, 35.0, "Game scheduled 5 mins ago must poll in 35s to catch live start")
    }
    
    func testMLBMidAndEndInningNormalization() throws {
        let jsonMid = """
        {
            "dates": [{
                "date": "2024-03-24",
                "games": [{
                    "gamePk": 748533,
                    "gameDate": "2024-03-24T17:05:00Z",
                    "status": { "abstractGameState": "Live", "detailedState": "In Progress", "statusCode": "I" },
                    "teams": {
                        "away": { "score": 3, "team": { "id": 147, "name": "New York Yankees", "abbreviation": "NYY" } },
                        "home": { "score": 1, "team": { "id": 111, "name": "Boston Red Sox", "abbreviation": "BOS" } }
                    },
                    "linescore": {
                        "currentInning": 5,
                        "isTopInning": false,
                        "inningState": "Middle",
                        "outs": 3
                    }
                }]
            }]
        }
        """.data(using: .utf8)!
        
        let response = try JSONDecoder().decode(MLBResponseDTO.self, from: jsonMid)
        let match = MLBNormalizer.normalize(game: response.dates!.first!.games!.first!)
        XCTAssertEqual(match.statusDisplay, "Mid 5")
    }
    
    func testManualUnpinDoesNotAutoRepin() {
        let manager = AutoPinManager.shared
        let testMatch = Match(
            id: "baseball:test_pin", provider: "test", sport: .mlb, competitionId: "mlb", competitionName: "MLB",
            scheduledStartTime: ISO8601DateFormatter().string(from: Date()),
            statusStage: .inProgress, statusDisplay: "Top 1",
            homeTeam: Team(id: "147", name: "Yankees", shortName: "NYY", abbreviation: "NYY", logoUrl: "", isHome: true, score: 0),
            awayTeam: Team(id: "111", name: "Red Sox", shortName: "BOS", abbreviation: "BOS", logoUrl: "", isHome: false, score: 0),
            sportDetails: .none, lastUpdated: 0
        )
        
        // Pin match
        manager.userDidPinMatch(testMatch)
        XCTAssertEqual(manager.activePinnedMatch?.id, testMatch.id)
        
        // Explicitly unpin
        manager.userDidUnpinMatch(id: testMatch.id)
        XCTAssertNil(manager.activePinnedMatch)
        XCTAssertNil(MemoryStore.shared.memory.pinnedMatchId)
        XCTAssertNil(MemoryStore.shared.memory.lastPinnedMatchSnapshot)
    }
    
    func testGlassThemeResolution() {
        // Native themes
        XCTAssertEqual(GlassTheme.from("clear"), .clear)
        XCTAssertEqual(GlassTheme.from("smoked"), .smoked)
        XCTAssertEqual(GlassTheme.from("midnight"), .midnight)
        
        // Legacy theme migration
        XCTAssertEqual(GlassTheme.from("frostbolt"), .clear)
        XCTAssertEqual(GlassTheme.from("regrowth"), .clear)
        XCTAssertEqual(GlassTheme.from("unknown"), .clear)
        
        // Check case count
        XCTAssertEqual(GlassTheme.allCases.count, 3)
        
        // Check properties
        XCTAssertEqual(GlassTheme.clear.title, "Clear")
        XCTAssertEqual(GlassTheme.smoked.title, "Smoked")
        XCTAssertEqual(GlassTheme.midnight.title, "Midnight")
    }
    
    func testMenuBarSportEmojiAndScoreOptions() {
        // 1. Sport emoji verification
        XCTAssertEqual(Sport.mlb.emoji, "⚾")
        XCTAssertEqual(Sport.nfl.emoji, "🏈")
        XCTAssertEqual(Sport.nba.emoji, "🏀")
        
        let menuBar = MenuBarController.shared
        
        // 2. Dynamic sport emoji resolution
        let mlbMatch = Match(
            id: "baseball:test_1", provider: "test", sport: .mlb, competitionId: "mlb", competitionName: "MLB",
            scheduledStartTime: "2024-03-24T23:30Z", statusStage: .inProgress, statusDisplay: "Top 7",
            homeTeam: Team(id: "147", name: "Yankees", shortName: "NYY", abbreviation: "NYY", logoUrl: "", isHome: true, score: 2),
            awayTeam: Team(id: "111", name: "Red Sox", shortName: "BOS", abbreviation: "BOS", logoUrl: "", isHome: false, score: 4),
            sportDetails: .none, lastUpdated: 0
        )
        
        let nflMatch = Match(
            id: "football:test_2", provider: "test", sport: .nfl, competitionId: "nfl", competitionName: "NFL",
            scheduledStartTime: "2024-03-24T23:30Z", statusStage: .inProgress, statusDisplay: "Q3 08:42",
            homeTeam: Team(id: "12", name: "Chiefs", shortName: "KC", abbreviation: "KC", logoUrl: "", isHome: true, score: 21),
            awayTeam: Team(id: "33", name: "Ravens", shortName: "BAL", abbreviation: "BAL", logoUrl: "", isHome: false, score: 17),
            sportDetails: .none, lastUpdated: 0
        )
        
        var mem = AppMemory(showMenuBarScores: true, menuBarIconOnly: false)
        XCTAssertEqual(menuBar.currentSportEmoji(active: mlbMatch, finished: nil, memory: mem), "⚾")
        XCTAssertEqual(menuBar.currentSportEmoji(active: nflMatch, finished: nil, memory: mem), "🏈")
        
        // When no active match, check selected sport fallback
        mem.selectedSport = "nba"
        XCTAssertEqual(menuBar.currentSportEmoji(active: nil, finished: nil, memory: mem), "🏀")
        
        // 3. Score display toggle verification
        mem.showMenuBarScores = false
        XCTAssertFalse(mem.showMenuBarScores)
        
        mem.menuBarIconOnly = true
        XCTAssertTrue(mem.menuBarIconOnly)
    }
}
