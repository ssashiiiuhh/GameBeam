import Foundation

public struct MLBResponseDTO: Decodable, Sendable {
    public let dates: [MLBDatesDTO]?
}

public struct MLBDatesDTO: Decodable, Sendable {
    public let date: String?
    public let games: [MLBGameDTO]?
}

public struct MLBGameDTO: Decodable, Sendable {
    public let gamePk: Int
    public let gameDate: String?
    public let status: MLBStatusDTO?
    public let teams: MLBTeamsDTO?
    public let linescore: MLBLinescoreDTO?
}

public struct MLBStatusDTO: Decodable, Sendable {
    public let abstractGameState: String?
    public let detailedState: String?
    public let statusCode: String?
}

public struct MLBTeamsDTO: Decodable, Sendable {
    public let home: MLBTeamContainerDTO?
    public let away: MLBTeamContainerDTO?
}

public struct MLBTeamContainerDTO: Decodable, Sendable {
    public let score: Int?
    public let team: MLBTeamDTO?
    public let leagueRecord: MLBRecordDTO?
}

public struct MLBTeamDTO: Decodable, Sendable {
    public let id: Int?
    public let name: String?
    public let abbreviation: String?
    public let teamName: String?
}

public struct MLBRecordDTO: Decodable, Sendable {
    public let wins: Int?
    public let losses: Int?
}

public struct MLBLinescoreDTO: Decodable, Sendable {
    public let currentInning: Int?
    public let isTopInning: Bool?
    public let inningState: String?
    public let outs: Int?
    public let balls: Int?
    public let strikes: Int?
    public let offense: MLBLinescoreOffenseDTO?
}

public struct MLBLinescoreOffenseDTO: Decodable, Sendable {
    public let first: MLBPlayerOrBool?
    public let second: MLBPlayerOrBool?
    public let third: MLBPlayerOrBool?
}

// In MLB Stats API, runners can be objects or booleans or null
public struct MLBPlayerOrBool: Decodable, Sendable {
    public let occupied: Bool
    
    public init(from decoder: Decoder) throws {
        if let boolVal = try? decoder.singleValueContainer().decode(Bool.self) {
            self.occupied = boolVal
            return
        }
        if let _ = try? decoder.container(keyedBy: DynamicCodingKey.self) {
            self.occupied = true
            return
        }
        self.occupied = false
    }
}

private struct DynamicCodingKey: CodingKey {
    var stringValue: String
    var intValue: Int?
    init?(stringValue: String) { self.stringValue = stringValue }
    init?(intValue: Int) { self.intValue = intValue; self.stringValue = "\(intValue)" }
}

public enum MLBNormalizer {
    public static func normalize(game: MLBGameDTO) -> Match {
        let status = game.status
        let detailedState = status?.detailedState ?? status?.abstractGameState ?? "Scheduled"
        let statusCode = status?.statusCode ?? ""
        
        var statusStage: MatchStatus = .scheduled
        if detailedState == "Final" || detailedState == "Game Over" || statusCode == "F" {
            statusStage = .completed
        } else if status?.abstractGameState == "Live" || detailedState == "In Progress" || statusCode == "I" {
            statusStage = .inProgress
        } else if detailedState == "Postponed" {
            statusStage = .postponed
        }
        
        let linescore = game.linescore
        let currentInning = linescore?.currentInning ?? 1
        let isTop = linescore?.isTopInning ?? true
        let inningState = linescore?.inningState?.lowercased() ?? ""
        
        let half: String
        let halfLabel: String
        if inningState == "middle" || inningState == "mid" {
            half = "mid"
            halfLabel = "Mid"
        } else if inningState == "end" {
            half = "end"
            halfLabel = "End"
        } else if isTop {
            half = "top"
            halfLabel = "Top"
        } else {
            half = "bottom"
            halfLabel = "Bot"
        }
        
        let outs = linescore?.outs ?? 0
        let balls = linescore?.balls ?? 0
        let strikes = linescore?.strikes ?? 0
        
        var statusDisplay = detailedState
        if statusStage == .inProgress {
            statusDisplay = "\(halfLabel) \(currentInning)"
        }
        
        let homeId = "\(game.teams?.home?.team?.id ?? 0)"
        let awayId = "\(game.teams?.away?.team?.id ?? 0)"
        
        let homeDirectory = TeamDirectory.findTeam(id: homeId, sport: .mlb)
        let awayDirectory = TeamDirectory.findTeam(id: awayId, sport: .mlb)
        
        var homeRecord: String? = nil
        if let w = game.teams?.home?.leagueRecord?.wins, let l = game.teams?.home?.leagueRecord?.losses {
            homeRecord = "\(w)-\(l)"
        }
        
        var awayRecord: String? = nil
        if let w = game.teams?.away?.leagueRecord?.wins, let l = game.teams?.away?.leagueRecord?.losses {
            awayRecord = "\(w)-\(l)"
        }
        
        let homeScore = statusStage == .scheduled ? nil : (game.teams?.home?.score ?? 0)
        let awayScore = statusStage == .scheduled ? nil : (game.teams?.away?.score ?? 0)
        
        let homeTeam = Team(
            id: homeId,
            name: game.teams?.home?.team?.name ?? homeDirectory?.name ?? "Home",
            shortName: game.teams?.home?.team?.teamName ?? homeDirectory?.shortName ?? "Home",
            abbreviation: game.teams?.home?.team?.abbreviation ?? homeDirectory?.abbrev ?? "HOM",
            logoUrl: homeDirectory?.logo ?? "https://a.espncdn.com/i/teamlogos/mlb/500/\(homeDirectory?.abbrev.lowercased() ?? "mlb").png",
            isHome: true,
            score: homeScore,
            record: homeRecord
        )
        
        let awayTeam = Team(
            id: awayId,
            name: game.teams?.away?.team?.name ?? awayDirectory?.name ?? "Away",
            shortName: game.teams?.away?.team?.teamName ?? awayDirectory?.shortName ?? "Away",
            abbreviation: game.teams?.away?.team?.abbreviation ?? awayDirectory?.abbrev ?? "AWY",
            logoUrl: awayDirectory?.logo ?? "https://a.espncdn.com/i/teamlogos/mlb/500/\(awayDirectory?.abbrev.lowercased() ?? "mlb").png",
            isHome: false,
            score: awayScore,
            record: awayRecord
        )
        
        let baseRunners = BaseRunners(
            first: linescore?.offense?.first?.occupied ?? false,
            second: linescore?.offense?.second?.occupied ?? false,
            third: linescore?.offense?.third?.occupied ?? false
        )
        
        let baseballDetails = BaseballDetails(
            inning: currentInning,
            half: half,
            outs: outs,
            balls: balls,
            strikes: strikes,
            baseRunners: baseRunners
        )
        
        return Match(
            id: "mlb:\(game.gamePk)",
            provider: "mlb",
            sport: .mlb,
            competitionId: "mlb",
            competitionName: "MLB",
            scheduledStartTime: game.gameDate ?? ISO8601DateFormatter().string(from: Date()),
            statusStage: statusStage,
            statusDisplay: statusDisplay,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            sportDetails: .baseball(baseballDetails),
            lastUpdated: Date().timeIntervalSince1970
        )
    }
}
