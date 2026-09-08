import AppKit
import Combine

public final class MenuBarController: NSObject, @unchecked Sendable {
    public static let shared = MenuBarController()
    
    private var statusItem: NSStatusItem?
    private var cancellables = Set<AnyCancellable>()
    
    public var onToggleHUD: (() -> Void)?
    public var onOpenPicker: (() -> Void)?
    
    public override init() {
        super.init()
    }
    
    public func setup() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        
        if let button = statusItem?.button {
            button.target = self
            button.action = #selector(statusItemClicked)
            button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }
        
        updateMenuBarTitle(
            active: AutoPinManager.shared.activePinnedMatch,
            finished: AutoPinManager.shared.latestFinishedFavMatch,
            memory: MemoryStore.shared.memory
        )
        observeUpdates()
    }
    
    private func observeUpdates() {
        Publishers.CombineLatest3(
            AutoPinManager.shared.$activePinnedMatch,
            AutoPinManager.shared.$latestFinishedFavMatch,
            MemoryStore.shared.$memory
        )
        .receive(on: DispatchQueue.main)
        .sink { [weak self] active, finished, memory in
            self?.updateMenuBarTitle(active: active, finished: finished, memory: memory)
        }
        .store(in: &cancellables)
    }
    
    public func currentSportEmoji(active: Match?, finished: Match?, memory: AppMemory) -> String {
        if let live = active {
            return live.sport.emoji
        }
        if let done = finished {
            return done.sport.emoji
        }
        if let snap = memory.lastPinnedMatchSnapshot {
            return snap.sport.emoji
        }
        if memory.selectedSport != "all", let sp = Sport(rawValue: memory.selectedSport) {
            return sp.emoji
        }
        for favKey in memory.favourites.teams {
            if favKey.hasPrefix("baseball") { return Sport.mlb.emoji }
            if favKey.hasPrefix("football") { return Sport.nfl.emoji }
            if favKey.hasPrefix("basketball") { return Sport.nba.emoji }
        }
        if let firstMatch = SportsService.shared.allMatches.first {
            return firstMatch.sport.emoji
        }
        return Sport.mlb.emoji
    }
    
    public func updateMenuBarTitle(active: Match?, finished: Match?, memory: AppMemory) {
        guard let button = statusItem?.button else { return }
        
        let emoji = currentSportEmoji(active: active, finished: finished, memory: memory)
        let showScores = memory.showMenuBarScores
        let iconOnly = memory.menuBarIconOnly
        
        if iconOnly {
            button.title = emoji
            rebuildMenu()
            return
        }
        
        if let live = active {
            if live.isLive {
                if showScores {
                    button.title = "\(emoji) \(live.awayTeam.abbreviation) \(live.awayTeam.score ?? 0)-\(live.homeTeam.score ?? 0) \(live.homeTeam.abbreviation)"
                } else {
                    button.title = "\(emoji) \(live.awayTeam.abbreviation) vs \(live.homeTeam.abbreviation)"
                }
            } else {
                button.title = "\(emoji) \(live.awayTeam.abbreviation) vs \(live.homeTeam.abbreviation)"
            }
        } else if let done = finished {
            if showScores {
                button.title = "\(emoji) \(done.awayTeam.abbreviation) \(done.awayTeam.score ?? 0)-\(done.homeTeam.score ?? 0) \(done.homeTeam.abbreviation) (F)"
            } else {
                button.title = "\(emoji) \(done.awayTeam.abbreviation) vs \(done.homeTeam.abbreviation) (F)"
            }
        } else {
            button.title = "\(emoji) GameBeam"
        }
        
        rebuildMenu()
    }
    
    public func rebuildMenu() {
        let menu = NSMenu()
        
        let titleItem = NSMenuItem(title: "GameBeam Live Sports", action: nil, keyEquivalent: "")
        titleItem.isEnabled = false
        menu.addItem(titleItem)
        
        if let active = AutoPinManager.shared.activePinnedMatch {
            let activeItem = NSMenuItem(title: "Pinned: \(active.shortSummary)", action: nil, keyEquivalent: "")
            activeItem.isEnabled = false
            menu.addItem(activeItem)
        } else if let finished = AutoPinManager.shared.latestFinishedFavMatch {
            let finItem = NSMenuItem(title: "Final: \(finished.shortSummary)", action: nil, keyEquivalent: "")
            finItem.isEnabled = false
            menu.addItem(finItem)
        }
        
        menu.addItem(NSMenuItem.separator())
        
        let toggleHudItem = NSMenuItem(title: "Toggle Floating HUD", action: #selector(toggleHUDClicked), keyEquivalent: "h")
        toggleHudItem.target = self
        menu.addItem(toggleHudItem)
        
        let openPickerItem = NSMenuItem(title: "Open Match Center", action: #selector(openPickerClicked), keyEquivalent: "o")
        openPickerItem.target = self
        menu.addItem(openPickerItem)
        
        menu.addItem(NSMenuItem.separator())
        
        // Menu Bar Display Options
        let showScoresItem = NSMenuItem(title: "Show Scores in Menu Bar", action: #selector(toggleShowScoresClicked), keyEquivalent: "")
        showScoresItem.target = self
        showScoresItem.state = MemoryStore.shared.memory.showMenuBarScores ? .on : .off
        menu.addItem(showScoresItem)
        
        let iconOnlyItem = NSMenuItem(title: "Icon Only in Menu Bar", action: #selector(toggleIconOnlyClicked), keyEquivalent: "")
        iconOnlyItem.target = self
        iconOnlyItem.state = MemoryStore.shared.memory.menuBarIconOnly ? .on : .off
        menu.addItem(iconOnlyItem)
        
        menu.addItem(NSMenuItem.separator())
        
        let refreshItem = NSMenuItem(title: "Refresh Scores Now", action: #selector(refreshScoresClicked), keyEquivalent: "r")
        refreshItem.target = self
        menu.addItem(refreshItem)
        
        menu.addItem(NSMenuItem.separator())
        
        let quitItem = NSMenuItem(title: "Quit GameBeam", action: #selector(quitClicked), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)
        
        statusItem?.menu = menu
    }
    
    @objc private func statusItemClicked() {
        // Handled via menu by default
    }
    
    @objc private func toggleHUDClicked() {
        onToggleHUD?()
    }
    
    @objc private func openPickerClicked() {
        onOpenPicker?()
    }
    
    @objc private func toggleShowScoresClicked() {
        let current = MemoryStore.shared.memory.showMenuBarScores
        MemoryStore.shared.setShowMenuBarScores(!current)
    }
    
    @objc private func toggleIconOnlyClicked() {
        let current = MemoryStore.shared.memory.menuBarIconOnly
        MemoryStore.shared.setMenuBarIconOnly(!current)
    }
    
    @objc private func refreshScoresClicked() {
        SportsService.shared.fetchAllSports()
    }
    
    @objc private func quitClicked() {
        NSApplication.shared.terminate(nil)
    }
}
