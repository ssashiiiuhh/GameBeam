import Foundation

public enum Sport: String, CaseIterable, Codable, Identifiable, Sendable {
    case mlb = "mlb"
    case nfl = "nfl"
    case nba = "nba"
    
    public var id: String { rawValue }
    
    public var displayName: String {
        switch self {
        case .mlb: return "MLB"
        case .nfl: return "NFL"
        case .nba: return "NBA"
        }
    }
    
    public var category: String {
        switch self {
        case .mlb: return "baseball"
        case .nfl: return "football"
        case .nba: return "basketball"
        }
    }
    
    public var systemIcon: String {
        switch self {
        case .mlb: return "baseball.fill"
        case .nfl: return "football.fill"
        case .nba: return "basketball.fill"
        }
    }
    
    public var emoji: String {
        switch self {
        case .mlb: return "⚾"
        case .nfl: return "🏈"
        case .nba: return "🏀"
        }
    }
}
