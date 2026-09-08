import Foundation
import Combine

public final class AutoPinManager: ObservableObject, @unchecked Sendable {
    public static let shared = AutoPinManager()
    
    private var cancellables = Set<AnyCancellable>()
    private let sportsService = SportsService.shared
    private let memoryStore = MemoryStore.shared
    
    @Published public private(set) var activePinnedMatch: Match?
    @Published public private(set) var latestFinishedFavMatch: Match?
    public let onAutoHideTriggered = PassthroughSubject<Void, Never>()
    
    private var manuallyUnpinnedMatchIds = Set<String>()
    private var lastObservedMatchStatus: [String: MatchStatus] = [:]
    private var isManuallyPinned: Bool = false
    
    public init() {
        // Observe matches and memory updates
        Publishers.CombineLatest(sportsService.$allMatches, memoryStore.$memory)
            .sink { [weak self] matches, memory in
                self?.evaluateAutoPin(matches: matches, memory: memory)
            }
            .store(in: &cancellables)
    }
    
    public func userDidUnpinMatch(id: String?) {
        if let id = id {
            manuallyUnpinnedMatchIds.insert(id)
        }
        isManuallyPinned = false
        activePinnedMatch = nil
        memoryStore.unpinMatch()
    }
    
    public func userDidPinMatch(_ match: Match) {
        manuallyUnpinnedMatchIds.remove(match.id)
        isManuallyPinned = true
        activePinnedMatch = match
        lastObservedMatchStatus[match.id] = match.statusStage
        memoryStore.pinMatch(match)
    }
    
    private func evaluateAutoPin(matches: [Match], memory: AppMemory) {
        defer {
            for m in matches {
                lastObservedMatchStatus[m.id] = m.statusStage
            }
        }
        
        // 1. If user explicitly pinned a match ID, look for it first
        if let pinnedId = memory.pinnedMatchId {
            if let found = matches.first(where: { $0.id == pinnedId }) {
                let wasLive = lastObservedMatchStatus[found.id]?.isLive ?? false
                
                // Only auto-hide if this match was actively live during this session and just transitioned to completed,
                // and the user did not explicitly choose to manually pin it.
                if wasLive && found.isFinal && memory.autoHideOnFinal && !isManuallyPinned {
                    latestFinishedFavMatch = found
                    activePinnedMatch = nil
                    memoryStore.unpinMatch()
                    onAutoHideTriggered.send()
                    return
                }
                activePinnedMatch = found
                return
            } else if let snapshot = memory.lastPinnedMatchSnapshot {
                activePinnedMatch = snapshot
                return
            }
        }
        
        // 2. If autoPinFavourites is enabled, look for favorite teams
        guard memory.autoPinFavourites else {
            activePinnedMatch = nil
            return
        }
        
        let favKeys = Set(memory.favourites.teams)
        guard !favKeys.isEmpty else {
            activePinnedMatch = nil
            return
        }
        
        let favMatches = matches.filter { match in
            guard !manuallyUnpinnedMatchIds.contains(match.id) else { return false }
            let homeKey = "\(match.sport.category):\(match.homeTeam.id)"
            let awayKey = "\(match.sport.category):\(match.awayTeam.id)"
            return favKeys.contains(homeKey) || favKeys.contains(awayKey)
        }
        
        // Find live game first
        if let live = favMatches.first(where: { $0.isLive }) {
            isManuallyPinned = false
            activePinnedMatch = live
            memoryStore.pinMatch(live)
            return
        }
        
        // Record any recent final game
        if let recentFinal = favMatches.first(where: { $0.isFinal }) {
            latestFinishedFavMatch = recentFinal
        }
        
        // If the auto-pinned game was live and now final, hide the HUD
        if let current = activePinnedMatch, current.isFinal, memory.autoHideOnFinal, !isManuallyPinned {
            let wasLive = lastObservedMatchStatus[current.id]?.isLive ?? false
            if wasLive {
                latestFinishedFavMatch = current
                activePinnedMatch = nil
                memoryStore.unpinMatch()
                onAutoHideTriggered.send()
                return
            }
        }
        
        // Otherwise, pin next upcoming game today if none pinned
        if activePinnedMatch == nil, let upcoming = favMatches.first(where: { !$0.isFinal }) {
            isManuallyPinned = false
            activePinnedMatch = upcoming
            memoryStore.pinMatch(upcoming)
        }
    }
}
