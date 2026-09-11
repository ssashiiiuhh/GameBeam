import SwiftUI

public struct PickerView: View {
    @ObservedObject var sportsService = SportsService.shared
    @ObservedObject var memoryStore = MemoryStore.shared
    @ObservedObject var autoPin = AutoPinManager.shared
    
    @State private var searchText: String = ""
    @State private var showingSettings: Bool = false
    
    public var onClose: () -> Void
    
    public init(onClose: @escaping () -> Void = {}) {
        self.onClose = onClose
    }
    
    private var displayedMatches: [Match] {
        sportsService.filterMatches(
            sportFilter: memoryStore.memory.selectedSport,
            dateTab: memoryStore.memory.selectedDateTab,
            searchQuery: searchText,
            memoryStore: memoryStore
        )
    }
    
    private var liveMatchesCount: Int {
        sportsService.allMatches.filter { $0.isLive }.count
    }
    
    private func relativeTimeString(from date: Date) -> String {
        let diff = max(0, Int(Date().timeIntervalSince(date)))
        if diff < 15 {
            return "Updated just now"
        } else if diff < 60 {
            return "Updated \(diff)s ago"
        } else if diff < 3600 {
            return "Updated \(diff / 60)m ago"
        } else {
            return "Updated \(diff / 3600)h ago"
        }
    }
    
    private var spotlightMatch: Match? {
        // Priority 1: Currently pinned match
        if let pinnedId = memoryStore.memory.pinnedMatchId,
           let m = sportsService.allMatches.first(where: { $0.id == pinnedId }) {
            return m
        }
        // Priority 2: Any live match for a favourite team
        if let liveFav = sportsService.allMatches.first(where: { $0.isLive && memoryStore.isMatchFavoured(match: $0) }) {
            return liveFav
        }
        // Priority 3: Any live match
        if let live = sportsService.allMatches.first(where: { $0.isLive }) {
            return live
        }
        return displayedMatches.first
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header Bar
            headerBar
                .padding(.horizontal, 16)
                .padding(.top, 14)
                .padding(.bottom, 10)
            
            // Search Bar Capsule
            searchBarCapsule
                .padding(.horizontal, 16)
                .padding(.bottom, 10)
            
            // Sport Filter Pills
            sportFilterPills
                .padding(.horizontal, 16)
                .padding(.bottom, 10)
            
            // Date Tabs
            dateTabsRow
                .padding(.horizontal, 16)
                .padding(.bottom, liveMatchesCount > 0 && memoryStore.memory.selectedDateTab != "today" ? 6 : 12)
            
            // Prominent banner if games are live but user is on another tab
            if liveMatchesCount > 0 && memoryStore.memory.selectedDateTab != "today" {
                liveBanner
                    .padding(.horizontal, 16)
                    .padding(.bottom, 10)
            }
            
            Divider()
                .background(Color.white.opacity(0.08))
            
            // Scrollable Match List
            ScrollView {
                VStack(spacing: 12) {
                    // Spotlight Hero Card (if live/featured)
                    if let hero = spotlightMatch {
                        spotlightHeroSection(match: hero)
                    }
                    
                    // Match Feed Header
                    HStack {
                        Text("SCHEDULE & SCORES")
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .foregroundColor(.white.opacity(0.5))
                        
                        Spacer()
                        
                        Text("\(displayedMatches.count) matches")
                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                            .foregroundColor(.cyan.opacity(0.8))
                    }
                    .padding(.top, 6)
                    
                    // Match Cards
                    if displayedMatches.isEmpty {
                        emptyMatchesView
                    } else {
                        LazyVStack(spacing: 8) {
                            ForEach(displayedMatches) { match in
                                MatchCardView(match: match) {
                                    togglePin(match: match)
                                }
                            }
                        }
                    }
                }
                .padding(16)
            }
        }
        .frame(width: 440, height: 640)
        .liquidGlassCapsule(cornerRadius: 22, theme: memoryStore.memory.theme)
        .padding(18)
        .sheet(isPresented: $showingSettings) {
            SettingsSheetView()
        }
    }
    
    // MARK: - Header
    private var headerBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "bolt.fill")
                .foregroundColor(.cyan)
                .font(.system(size: 14))
            
            Text("GameBeam")
                .font(.system(size: 15, weight: .heavy, design: .rounded))
                .foregroundColor(.white)
            
            if sportsService.isLoading {
                ProgressView()
                    .scaleEffect(0.6)
                    .frame(width: 14, height: 14)
            }
            
            Spacer()
            
            if let last = sportsService.lastFetchDate {
                Text(relativeTimeString(from: last))
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.40))
                    .padding(.trailing, 2)
            }
            
            Button(action: { sportsService.fetchAllSports(force: true) }) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white.opacity(0.85))
                    .rotationEffect(.degrees(sportsService.isLoading ? 360 : 0))
                    .animation(sportsService.isLoading ? Animation.linear(duration: 0.85).repeatForever(autoreverses: false) : .default, value: sportsService.isLoading)
                    .frame(width: 24, height: 24)
                    .background(Color.white.opacity(0.1))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .help("Refresh Scores Now")
            
            Button(action: { showingSettings = true }) {
                Image(systemName: "gearshape")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white.opacity(0.8))
                    .frame(width: 24, height: 24)
                    .background(Color.white.opacity(0.1))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .help("Preferences & Teams")
            
            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundColor(.white.opacity(0.8))
                    .frame(width: 24, height: 24)
                    .background(Color.white.opacity(0.1))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .help("Close")
        }
    }
    
    // MARK: - Search
    private var searchBarCapsule: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.white.opacity(0.5))
                .font(.system(size: 12))
            
            TextField("Search teams, leagues, matchups...", text: $searchText)
                .textFieldStyle(.plain)
                .font(.system(size: 12))
                .foregroundColor(.white)
            
            if !searchText.isEmpty {
                Button(action: { searchText = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.white.opacity(0.5))
                        .font(.system(size: 11))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(Color.white.opacity(0.06))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
    
    // MARK: - Sport Pills
    private var sportFilterPills: some View {
        HStack(spacing: 8) {
            sportPill(id: "favs", label: "★ My Teams")
            sportPill(id: "all", label: "All")
            sportPill(id: "mlb", label: "MLB")
            sportPill(id: "nfl", label: "NFL")
            sportPill(id: "nba", label: "NBA")
        }
    }
    
    private func sportPill(id: String, label: String) -> some View {
        let isSelected = memoryStore.memory.selectedSport == id
        return Button(action: {
            memoryStore.setSelectedSport(id)
        }) {
            Text(label)
                .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                .foregroundColor(isSelected ? .black : .white.opacity(0.85))
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(isSelected ? Color.cyan : Color.white.opacity(0.07))
                .cornerRadius(14)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(isSelected ? Color.cyan : Color.white.opacity(0.12), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - Date Tabs
    private var dateTabsRow: some View {
        HStack(spacing: 6) {
            dateTabButton(id: "yesterday", label: "Yesterday")
            dateTabButton(id: "today", label: "Today")
            dateTabButton(id: "tomorrow", label: "Tomorrow")
            dateTabButton(id: "upcoming", label: "Upcoming")
        }
    }
    
    private func dateTabButton(id: String, label: String) -> some View {
        let isSelected = memoryStore.memory.selectedDateTab == id
        let isTodayWithLive = (id == "today" && liveMatchesCount > 0)
        
        return Button(action: {
            memoryStore.setSelectedDateTab(id)
        }) {
            HStack(spacing: 4) {
                if isTodayWithLive {
                    Circle()
                        .fill(Color.red)
                        .frame(width: 5, height: 5)
                }
                Text(isTodayWithLive ? "\(label) (\(liveMatchesCount))" : label)
                    .font(.system(size: 10, weight: isSelected ? .bold : .medium))
            }
            .foregroundColor(isSelected ? (isTodayWithLive ? .white : .cyan) : (isTodayWithLive ? .white : .white.opacity(0.6)))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 5)
            .background(isSelected ? (isTodayWithLive ? Color.red.opacity(0.4) : Color.cyan.opacity(0.12)) : (isTodayWithLive ? Color.red.opacity(0.12) : Color.clear))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(isSelected ? (isTodayWithLive ? Color.red.opacity(0.6) : Color.cyan.opacity(0.3)) : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
    
    private var liveBanner: some View {
        Button(action: {
            memoryStore.setSelectedDateTab("today")
        }) {
            HStack(spacing: 6) {
                Circle()
                    .fill(Color.red)
                    .frame(width: 6, height: 6)
                Text("\(liveMatchesCount) match\(liveMatchesCount > 1 ? "es are" : " is") LIVE right now in Today")
                    .font(.system(size: 10.5, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("Switch to Today →")
                    .font(.system(size: 10.5, weight: .bold))
                    .foregroundColor(.cyan)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.red.opacity(0.18))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(Color.red.opacity(0.40), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - Spotlight Hero
    private func spotlightHeroSection(match: Match) -> some View {
        let isPinned = memoryStore.memory.pinnedMatchId == match.id
        
        return VStack(spacing: 10) {
            HStack {
                HStack(spacing: 4) {
                    Circle()
                        .fill(match.isLive ? Color.red : Color.cyan)
                        .frame(width: 6, height: 6)
                    Text(match.isLive ? "LIVE SPOTLIGHT" : "FEATURED MATCH")
                        .font(.system(size: 9, weight: .heavy, design: .rounded))
                        .foregroundColor(match.isLive ? .red : .cyan)
                }
                
                Spacer()
                
                Text(match.competitionName)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white.opacity(0.6))
            }
            
            HStack(spacing: 16) {
                // Away
                VStack(spacing: 4) {
                    teamLogoBig(url: match.awayTeam.logoUrl)
                    Text(match.awayTeam.shortName)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text("\(match.awayTeam.score ?? 0)")
                        .font(.system(size: 24, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity)
                
                // Center Status
                VStack(spacing: 4) {
                    Text(match.statusDisplay)
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(match.isLive ? .red : .white.opacity(0.85))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.black.opacity(0.4))
                        .cornerRadius(6)
                    
                    Button(action: {
                        togglePin(match: match)
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: isPinned ? "pin.slash.fill" : "pin.fill")
                                .font(.system(size: 9))
                            Text(isPinned ? "HUD Pinned" : "Pin to HUD")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .foregroundColor(isPinned ? .black : .white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(isPinned ? Color.cyan : Color.white.opacity(0.15))
                        .cornerRadius(12)
                    }
                    .buttonStyle(.plain)
                }
                
                // Home
                VStack(spacing: 4) {
                    teamLogoBig(url: match.homeTeam.logoUrl)
                    Text(match.homeTeam.shortName)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text("\(match.homeTeam.score ?? 0)")
                        .font(.system(size: 24, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cyan.opacity(0.08))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color.cyan.opacity(0.3), lineWidth: 1)
        )
    }
    
    @ViewBuilder
    private func teamLogoBig(url: String) -> some View {
        if let u = URL(string: url), !url.isEmpty {
            AsyncImage(url: u) { phase in
                switch phase {
                case .success(let img):
                    img.resizable().aspectRatio(contentMode: .fit)
                        .frame(width: 32, height: 32)
                default:
                    Circle().fill(Color.white.opacity(0.15)).frame(width: 32, height: 32)
                }
            }
        } else {
            Circle().fill(Color.white.opacity(0.15)).frame(width: 32, height: 32)
        }
    }
    
    @ViewBuilder
    private var emptyMatchesView: some View {
        VStack(spacing: 8) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 28))
                .foregroundColor(.white.opacity(0.3))
            Text("No Matches Found")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white.opacity(0.8))
            Text("Try switching the sport filter or selecting 'Upcoming'")
                .font(.system(size: 11))
                .foregroundColor(.white.opacity(0.5))
        }
        .padding(.vertical, 40)
    }
    
    private func togglePin(match: Match) {
        if memoryStore.memory.pinnedMatchId == match.id {
            AutoPinManager.shared.userDidUnpinMatch(id: match.id)
        } else {
            AutoPinManager.shared.userDidPinMatch(match)
            FloatingHUDWindowController.shared.showHUD()
        }
    }
}
