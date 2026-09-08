import Foundation
import Combine

public final class MemoryStore: ObservableObject, @unchecked Sendable {
    public static let shared = MemoryStore()
    
    @Published public var memory: AppMemory
    private let fileURL: URL
    private let queue = DispatchQueue(label: "com.gamebeam.memorystore", qos: .utility)
    
    public init() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dir = appSupport.appendingPathComponent("com.gamebeam.macos", isDirectory: true)
        
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        self.fileURL = dir.appendingPathComponent("gamebeam_memory.json")
        
        if FileManager.default.fileExists(atPath: fileURL.path),
           let data = try? Data(contentsOf: fileURL),
           let decoded = try? JSONDecoder().decode(AppMemory.self, from: data) {
            self.memory = decoded
        } else {
            self.memory = AppMemory()
        }
    }
    
    public func save() {
        let snapshot = self.memory
        let targetURL = self.fileURL
        queue.async {
            do {
                let encoder = JSONEncoder()
                encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
                let data = try encoder.encode(snapshot)
                try data.write(to: targetURL, options: .atomic)
            } catch {
                print("[MemoryStore] Failed to save memory: \(error)")
            }
        }
    }
    
    // MARK: - Favourites
    public func isFavourite(teamFavKey: String) -> Bool {
        memory.favourites.teams.contains(teamFavKey)
    }
    
    public func toggleFavourite(team: DirectoryTeam) {
        let key = team.favKey
        if let idx = memory.favourites.teams.firstIndex(of: key) {
            memory.favourites.teams.remove(at: idx)
        } else {
            memory.favourites.teams.append(key)
        }
        save()
    }
    
    public func isMatchFavoured(match: Match) -> Bool {
        let homeKey = "\(match.sport.category):\(match.homeTeam.id)"
        let awayKey = "\(match.sport.category):\(match.awayTeam.id)"
        return isFavourite(teamFavKey: homeKey) || isFavourite(teamFavKey: awayKey)
    }
    
    // MARK: - Pinning
    public func pinMatch(_ match: Match) {
        memory.pinnedMatchId = match.id
        memory.lastPinnedMatchSnapshot = match
        save()
    }
    
    public func unpinMatch() {
        memory.pinnedMatchId = nil
        memory.lastPinnedMatchSnapshot = nil
        save()
    }
    
    // MARK: - Filter State
    public func setSelectedSport(_ sport: String) {
        memory.selectedSport = sport
        save()
    }
    
    public func setSelectedDateTab(_ tab: String) {
        memory.selectedDateTab = tab
        save()
    }
    
    public func addRecentSearch(_ query: String) {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return }
        var list = memory.recentSearches.filter { $0.lowercased() != q.lowercased() }
        list.insert(q, at: 0)
        if list.count > 8 { list = Array(list.prefix(8)) }
        memory.recentSearches = list
        save()
    }
    
    public func updateOverlayPosition(x: Double, y: Double) {
        memory.overlayPosition.lastX = x
        memory.overlayPosition.lastY = y
        save()
    }
    
    // MARK: - Menu Bar Display
    public func setShowMenuBarScores(_ show: Bool) {
        memory.showMenuBarScores = show
        save()
    }
    
    public func setMenuBarIconOnly(_ iconOnly: Bool) {
        memory.menuBarIconOnly = iconOnly
        save()
    }
}
