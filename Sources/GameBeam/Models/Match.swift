import Foundation

public enum MatchStatus: String, Codable, Sendable {
    case scheduled = "scheduled"
    case inProgress = "in_progress"
    case intermission = "intermission"
    case completed = "completed"
    case postponed = "postponed"
    
    public var isLive: Bool {
        self == .inProgress || self == .intermission
    }
    
    public var isFinal: Bool {
        self == .completed
    }
}

public struct BaseRunners: Codable, Sendable, Hashable {
    public var first: Bool
    public var second: Bool
    public var third: Bool
    
    public init(first: Bool = false, second: Bool = false, third: Bool = false) {
        self.first = first
        self.second = second
        self.third = third
    }
}

public struct BaseballDetails: Codable, Sendable, Hashable {
    public var inning: Int
    public var half: String // "top" or "bottom"
    public var outs: Int
    public var balls: Int
    public var strikes: Int
    public var baseRunners: BaseRunners
    
    public init(
        inning: Int = 1,
        half: String = "top",
        outs: Int = 0,
        balls: Int = 0,
        strikes: Int = 0,
        baseRunners: BaseRunners = .init()
    ) {
        self.inning = inning
        self.half = half
        self.outs = outs
        self.balls = balls
        self.strikes = strikes
        self.baseRunners = baseRunners
    }
}

public struct BasketballDetails: Codable, Sendable, Hashable {
    public var quarter: Int
    public var clockDisplay: String
    public var isOvertime: Bool
    
    public init(quarter: Int = 1, clockDisplay: String = "00:00", isOvertime: Bool = false) {
        self.quarter = quarter
        self.clockDisplay = clockDisplay
        self.isOvertime = isOvertime
    }
}

public struct FootballDetails: Codable, Sendable, Hashable {
    public var quarter: Int
    public var clockDisplay: String
    public var possessionTeamId: String?
    public var downDistanceText: String?
    public var isRedZone: Bool
    
    public init(
        quarter: Int = 1,
        clockDisplay: String = "00:00",
        possessionTeamId: String? = nil,
        downDistanceText: String? = nil,
        isRedZone: Bool = false
    ) {
        self.quarter = quarter
        self.clockDisplay = clockDisplay
        self.possessionTeamId = possessionTeamId
        self.downDistanceText = downDistanceText
        self.isRedZone = isRedZone
    }
}

public enum SportSpecificDetails: Codable, Sendable, Hashable {
    case baseball(BaseballDetails)
    case basketball(BasketballDetails)
    case football(FootballDetails)
    case none
    
    enum CodingKeys: String, CodingKey {
        case type
        case baseball
        case basketball
        case football
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decodeIfPresent(String.self, forKey: .type) ?? ""
        switch type {
        case "baseball":
            let details = try container.decode(BaseballDetails.self, forKey: .baseball)
            self = .baseball(details)
        case "basketball":
            let details = try container.decode(BasketballDetails.self, forKey: .basketball)
            self = .basketball(details)
        case "football":
            let details = try container.decode(FootballDetails.self, forKey: .football)
            self = .football(details)
        default:
            self = .none
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .baseball(let details):
            try container.encode("baseball", forKey: .type)
            try container.encode(details, forKey: .baseball)
        case .basketball(let details):
            try container.encode("basketball", forKey: .type)
            try container.encode(details, forKey: .basketball)
        case .football(let details):
            try container.encode("football", forKey: .type)
            try container.encode(details, forKey: .football)
        case .none:
            try container.encode("none", forKey: .type)
        }
    }
}

public struct Match: Codable, Identifiable, Hashable, Sendable {
    public let id: String
    public let provider: String
    public let sport: Sport
    public let competitionId: String
    public let competitionName: String
    public var scheduledStartTime: String
    public var statusStage: MatchStatus
    public var statusDisplay: String
    public var homeTeam: Team
    public var awayTeam: Team
    public var sportDetails: SportSpecificDetails
    public var lastUpdated: Double
    
    public var isLive: Bool {
        statusStage.isLive
    }
    
    public var isFinal: Bool {
        statusStage.isFinal
    }
    
    public var scoreText: String {
        let awayScore = awayTeam.score ?? 0
        let homeScore = homeTeam.score ?? 0
        return "\(awayTeam.abbreviation) \(awayScore) - \(homeScore) \(homeTeam.abbreviation)"
    }
    
    public var shortSummary: String {
        let awayScore = awayTeam.score ?? 0
        let homeScore = homeTeam.score ?? 0
        return "\(awayTeam.abbreviation) \(awayScore), \(homeTeam.abbreviation) \(homeScore) (\(statusDisplay))"
    }
    
    public var formattedStartTime: String {
        if isLive {
            return statusDisplay
        }
        guard let date = DateFormatterCache.parseISO8601(scheduledStartTime) else {
            return statusDisplay
        }
        let cal = Calendar.current
        if cal.isDateInToday(date) {
            return DateFormatterCache.timeOnly.string(from: date)
        } else if cal.isDateInTomorrow(date) {
            return "Tomorrow \(DateFormatterCache.timeOnly.string(from: date))"
        } else if cal.isDateInYesterday(date) {
            return "Yesterday \(DateFormatterCache.timeOnly.string(from: date))"
        } else {
            return DateFormatterCache.monthDayTime.string(from: date)
        }
    }
    
    public init(
        id: String,
        provider: String,
        sport: Sport,
        competitionId: String,
        competitionName: String,
        scheduledStartTime: String,
        statusStage: MatchStatus,
        statusDisplay: String,
        homeTeam: Team,
        awayTeam: Team,
        sportDetails: SportSpecificDetails = .none,
        lastUpdated: Double = Date().timeIntervalSince1970
    ) {
        self.id = id
        self.provider = provider
        self.sport = sport
        self.competitionId = competitionId
        self.competitionName = competitionName
        self.scheduledStartTime = scheduledStartTime
        self.statusStage = statusStage
        self.statusDisplay = statusDisplay
        self.homeTeam = homeTeam
        self.awayTeam = awayTeam
        self.sportDetails = sportDetails
        self.lastUpdated = lastUpdated
    }
}

public enum DateFormatterCache: Sendable {
    private static let isoFractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    
    private static let isoStandard: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
    
    public static let timeOnly: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()
    
    public static let monthDayTime: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, h:mm a"
        return f
    }()
    
    public static func parseISO8601(_ string: String) -> Date? {
        isoFractional.date(from: string) ?? isoStandard.date(from: string)
    }
}
