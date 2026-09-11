import Foundation

public struct Favourites: Codable, Sendable {
    public var teams: [String]
    public var drivers: [String]
    
    public init(teams: [String] = [], drivers: [String] = []) {
        self.teams = teams
        self.drivers = drivers
    }
}

public struct OverlayPosition: Codable, Sendable {
    public var anchor: String
    public var offsetX: Double
    public var offsetY: Double
    public var lastX: Double?
    public var lastY: Double?
    
    public init(
        anchor: String = "top-right",
        offsetX: Double = 20,
        offsetY: Double = 48,
        lastX: Double? = nil,
        lastY: Double? = nil
    ) {
        self.anchor = anchor
        self.offsetX = offsetX
        self.offsetY = offsetY
        self.lastX = lastX
        self.lastY = lastY
    }
}

public struct AppMemory: Codable, Sendable {
    public var theme: String
    public var pinnedMatchId: String?
    public var favourites: Favourites
    public var autoPinFavourites: Bool
    public var autoHideOnFinal: Bool
    public var selectedSport: String
    public var selectedDateTab: String
    public var recentSearches: [String]
    public var lastPinnedMatchSnapshot: Match?
    public var overlayPosition: OverlayPosition
    public var clickThrough: Bool
    public var showMenuBarScores: Bool
    public var menuBarIconOnly: Bool
    public var lastActiveDate: String?
    
    public init(
        theme: String = "clear",
        pinnedMatchId: String? = nil,
        favourites: Favourites = .init(),
        autoPinFavourites: Bool = true,
        autoHideOnFinal: Bool = true,
        selectedSport: String = "all",
        selectedDateTab: String = "today",
        recentSearches: [String] = [],
        lastPinnedMatchSnapshot: Match? = nil,
        overlayPosition: OverlayPosition = .init(),
        clickThrough: Bool = false,
        showMenuBarScores: Bool = true,
        menuBarIconOnly: Bool = false,
        lastActiveDate: String? = nil
    ) {
        self.theme = theme
        self.pinnedMatchId = pinnedMatchId
        self.favourites = favourites
        self.autoPinFavourites = autoPinFavourites
        self.autoHideOnFinal = autoHideOnFinal
        self.selectedSport = selectedSport
        self.selectedDateTab = selectedDateTab
        self.recentSearches = recentSearches
        self.lastPinnedMatchSnapshot = lastPinnedMatchSnapshot
        self.overlayPosition = overlayPosition
        self.clickThrough = clickThrough
        self.showMenuBarScores = showMenuBarScores
        self.menuBarIconOnly = menuBarIconOnly
        self.lastActiveDate = lastActiveDate
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.theme = try container.decodeIfPresent(String.self, forKey: .theme) ?? "clear"
        self.pinnedMatchId = try container.decodeIfPresent(String.self, forKey: .pinnedMatchId)
        self.favourites = try container.decodeIfPresent(Favourites.self, forKey: .favourites) ?? .init()
        self.autoPinFavourites = try container.decodeIfPresent(Bool.self, forKey: .autoPinFavourites) ?? true
        self.autoHideOnFinal = try container.decodeIfPresent(Bool.self, forKey: .autoHideOnFinal) ?? true
        self.selectedSport = try container.decodeIfPresent(String.self, forKey: .selectedSport) ?? "all"
        self.selectedDateTab = try container.decodeIfPresent(String.self, forKey: .selectedDateTab) ?? "today"
        self.recentSearches = try container.decodeIfPresent([String].self, forKey: .recentSearches) ?? []
        self.lastPinnedMatchSnapshot = try container.decodeIfPresent(Match.self, forKey: .lastPinnedMatchSnapshot)
        self.overlayPosition = try container.decodeIfPresent(OverlayPosition.self, forKey: .overlayPosition) ?? .init()
        self.clickThrough = try container.decodeIfPresent(Bool.self, forKey: .clickThrough) ?? false
        self.showMenuBarScores = try container.decodeIfPresent(Bool.self, forKey: .showMenuBarScores) ?? true
        self.menuBarIconOnly = try container.decodeIfPresent(Bool.self, forKey: .menuBarIconOnly) ?? false
        self.lastActiveDate = try container.decodeIfPresent(String.self, forKey: .lastActiveDate)
    }
}
