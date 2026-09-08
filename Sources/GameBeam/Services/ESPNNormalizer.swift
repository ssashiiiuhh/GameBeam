import Foundation

public struct ESPNEventDTO: Decodable, Sendable {
    public let id: String
    public let date: String?
    public let status: ESPNStatusDTO?
    public let competitions: [ESPNCompetitionDTO]?
}

public struct ESPNStatusDTO: Decodable, Sendable {
    public let period: Int?
    public let displayClock: String?
    public let type: ESPNStatusTypeDTO?
}

public struct ESPNStatusTypeDTO: Decodable, Sendable {
    public let state: String?
    public let completed: Bool?
    public let name: String?
    public let shortDetail: String?
    public let detail: String?
}

public struct ESPNCompetitionDTO: Decodable, Sendable {
    public let competitors: [ESPNCompetitorDTO]?
    public let situation: ESPNSituationDTO?
    public let status: ESPNStatusDTO?
}

public struct ESPNSituationDTO: Decodable, Sendable {
    public let possession: String?
    public let downDistanceText: String?
    public let possessionText: String?
    public let isRedZone: Bool?
}

public struct ESPNCompetitorDTO: Decodable, Sendable {
    public let id: String?
    public let homeAway: String?
    public let score: String?
    public let team: ESPNTeamDTO?
    public let records: [ESPNRecordDTO]?
}

public struct ESPNTeamDTO: Decodable, Sendable {
    public let id: String?
    public let displayName: String?
    public let name: String?
    public let abbreviation: String?
    public let logo: String?
}

public struct ESPNRecordDTO: Decodable, Sendable {
    public let summary: String?
}

public struct ESPNScoreboardResponse: Decodable, Sendable {
    public let events: [ESPNEventDTO]?
}

public enum ESPNNormalizer {
    public static func normalize(event: ESPNEventDTO, sport: Sport) -> Match {
        let comp = event.competitions?.first
        let competitors = comp?.competitors ?? []
        
        let homeDTO = competitors.first(where: { $0.homeAway == "home" })
        let awayDTO = competitors.first(where: { $0.homeAway == "away" })
        
        let status = event.status ?? comp?.status
        let statusType = status?.type
        
        var statusStage: MatchStatus = .scheduled
        if statusType?.completed == true {
            statusStage = .completed
        } else if statusType?.state == "in" {
            statusStage = .inProgress
        } else if statusType?.name == "STATUS_HALFTIME" {
            statusStage = .intermission
        }
        
        let period = status?.period ?? 1
        let clock = status?.displayClock ?? "00:00"
        
        var statusDisplay = statusType?.shortDetail ?? statusType?.detail ?? clock
        if statusStage == .inProgress {
            if sport == .nba {
                let isOvertime = period > 4
                let periodPrefix = isOvertime ? "OT\(period > 5 ? "\(period - 4)" : "")" : "Q\(period)"
                statusDisplay = "\(periodPrefix) \(clock)"
            } else if sport == .nfl {
                statusDisplay = "Q\(period) \(clock)"
            }
        } else if statusStage == .intermission {
            statusDisplay = "Halftime"
        }
        
        let homeId = homeDTO?.team?.id ?? homeDTO?.id ?? ""
        let awayId = awayDTO?.team?.id ?? awayDTO?.id ?? ""
        
        let homeDirectory = TeamDirectory.findTeam(id: homeId, sport: sport)
        let awayDirectory = TeamDirectory.findTeam(id: awayId, sport: sport)
        
        let homeScore = statusStage == .scheduled ? nil : Int(homeDTO?.score ?? "0")
        let awayScore = statusStage == .scheduled ? nil : Int(awayDTO?.score ?? "0")
        
        let homeTeam = Team(
            id: homeId,
            name: homeDTO?.team?.displayName ?? homeDirectory?.name ?? "Home",
            shortName: homeDTO?.team?.name ?? homeDirectory?.shortName ?? "Home",
            abbreviation: homeDTO?.team?.abbreviation ?? homeDirectory?.abbrev ?? "HOM",
            logoUrl: homeDTO?.team?.logo ?? homeDirectory?.logo ?? "",
            isHome: true,
            score: homeScore,
            record: homeDTO?.records?.first?.summary
        )
        
        let awayTeam = Team(
            id: awayId,
            name: awayDTO?.team?.displayName ?? awayDirectory?.name ?? "Away",
            shortName: awayDTO?.team?.name ?? awayDirectory?.shortName ?? "Away",
            abbreviation: awayDTO?.team?.abbreviation ?? awayDirectory?.abbrev ?? "AWY",
            logoUrl: awayDTO?.team?.logo ?? awayDirectory?.logo ?? "",
            isHome: false,
            score: awayScore,
            record: awayDTO?.records?.first?.summary
        )
        
        var details: SportSpecificDetails = .none
        if sport == .nba {
            details = .basketball(BasketballDetails(
                quarter: period,
                clockDisplay: clock,
                isOvertime: period > 4
            ))
        } else if sport == .nfl {
            let sit = comp?.situation
            details = .football(FootballDetails(
                quarter: period,
                clockDisplay: clock,
                possessionTeamId: sit?.possession,
                downDistanceText: sit?.downDistanceText ?? sit?.possessionText,
                isRedZone: sit?.isRedZone ?? false
            ))
        }
        
        return Match(
            id: "espn:\(sport.rawValue):\(event.id)",
            provider: "espn",
            sport: sport,
            competitionId: sport.rawValue,
            competitionName: sport.displayName,
            scheduledStartTime: event.date ?? ISO8601DateFormatter().string(from: Date()),
            statusStage: statusStage,
            statusDisplay: statusDisplay,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            sportDetails: details,
            lastUpdated: Date().timeIntervalSince1970
        )
    }
}
