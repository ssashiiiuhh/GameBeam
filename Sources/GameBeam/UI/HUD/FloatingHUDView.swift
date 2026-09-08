import SwiftUI

public struct FloatingHUDView: View {
    @ObservedObject var autoPin = AutoPinManager.shared
    @ObservedObject var memoryStore = MemoryStore.shared
    @ObservedObject var sportsService = SportsService.shared
    
    @State private var isHovering = false
    
    public var onClose: () -> Void
    public var onOpenPicker: () -> Void
    
    public init(onClose: @escaping () -> Void, onOpenPicker: @escaping () -> Void) {
        self.onClose = onClose
        self.onOpenPicker = onOpenPicker
    }
    
    private var currentMatch: Match? {
        autoPin.activePinnedMatch ?? memoryStore.memory.lastPinnedMatchSnapshot
    }
    
    private var currentTheme: GlassTheme {
        GlassTheme.from(memoryStore.memory.theme)
    }
    
    public var body: some View {
        SharedGlassContainer {
            Group {
                if let match = currentMatch {
                    matchContentView(match: match)
                } else {
                    emptyPlaceholderView
                }
            }
            .frame(width: 348, height: 92)
            .trueLiquidGlass(cornerRadius: 24, theme: currentTheme)
            .animation(.easeInOut(duration: 0.25), value: memoryStore.memory.theme)
            .padding(18)
            .onHover { hovering in
                withAnimation(.easeInOut(duration: 0.16)) {
                    self.isHovering = hovering
                }
            }
        }
    }
    
    @ViewBuilder
    private func matchContentView(match: Match) -> some View {
        VStack(spacing: 6) {
            // Top Status & Controls Header
            HStack(alignment: .center) {
                // League pill
                leaguePill(match: match)
                
                Spacer()
                
                if isHovering {
                    // Quick Action Droplets on Hover
                    HStack(spacing: 6) {
                        glassDropletButton(systemName: "square.grid.2x2", help: "Open Match Center", action: onOpenPicker)
                        glassDropletButton(systemName: "arrow.right.arrow.left", help: "Cycle Matches", action: cyclePinnedMatch)
                        glassDropletButton(systemName: "xmark", help: "Hide HUD", action: onClose)
                    }
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
                } else {
                    // Status Pill
                    statusPill(match: match)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            
            // Main Match Body: Teams & Scores
            HStack(alignment: .center, spacing: 10) {
                // Away Team
                HStack(spacing: 8) {
                    teamBadge(url: match.awayTeam.logoUrl, abbrev: match.awayTeam.abbreviation)
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text(match.awayTeam.abbreviation)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.6), radius: 3, y: 1)
                        if let rec = match.awayTeam.record {
                            Text(rec)
                                .font(.system(size: 8, weight: .medium, design: .monospaced))
                                .foregroundColor(.white.opacity(0.55))
                                .shadow(color: .black.opacity(0.5), radius: 2, y: 1)
                        }
                    }
                    .frame(width: 36, alignment: .leading)
                    
                    Text("\(match.awayTeam.score ?? 0)")
                        .font(.system(size: 22, weight: .heavy, design: .rounded))
                        .foregroundColor(scoreColor(isWinner: (match.awayTeam.score ?? 0) > (match.homeTeam.score ?? 0), isFinal: match.isFinal))
                        .shadow(color: .black.opacity(0.6), radius: 3, y: 1)
                        .frame(width: 24, alignment: .trailing)
                }
                
                Spacer(minLength: 0)
                
                // Center Telemetry / Separator
                centerTelemetryView(match: match)
                    .frame(width: 80)
                
                Spacer(minLength: 0)
                
                // Home Team
                HStack(spacing: 8) {
                    Text("\(match.homeTeam.score ?? 0)")
                        .font(.system(size: 22, weight: .heavy, design: .rounded))
                        .foregroundColor(scoreColor(isWinner: (match.homeTeam.score ?? 0) > (match.awayTeam.score ?? 0), isFinal: match.isFinal))
                        .shadow(color: .black.opacity(0.6), radius: 3, y: 1)
                        .frame(width: 24, alignment: .leading)
                    
                    VStack(alignment: .trailing, spacing: 1) {
                        Text(match.homeTeam.abbreviation)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.6), radius: 3, y: 1)
                        if let rec = match.homeTeam.record {
                            Text(rec)
                                .font(.system(size: 8, weight: .medium, design: .monospaced))
                                .foregroundColor(.white.opacity(0.55))
                                .shadow(color: .black.opacity(0.5), radius: 2, y: 1)
                        }
                    }
                    .frame(width: 36, alignment: .trailing)
                    
                    teamBadge(url: match.homeTeam.logoUrl, abbrev: match.homeTeam.abbreviation)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }
    }
    
    @ViewBuilder
    private func centerTelemetryView(match: Match) -> some View {
        if match.isLive {
            VStack(spacing: 2) {
                switch match.sportDetails {
                case .baseball(let b):
                    // Inning with Directional Arrow: e.g. "▲ Top 9th" or "▼ Bot 7th"
                    HStack(spacing: 3) {
                        Image(systemName: b.half == "top" ? "arrowtriangle.up.fill" : "arrowtriangle.down.fill")
                            .font(.system(size: 7, weight: .heavy))
                            .foregroundColor(b.half == "top" ? Color.yellow : Color.orange)
                        Text("\(b.half == "top" ? "Top" : "Bot") \(ordinalInning(b.inning))")
                            .font(.system(size: 11, weight: .heavy, design: .rounded))
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.6), radius: 2, y: 1)
                    }
                    
                    // Diamond runners & Count & Outs: e.g. "3-2 · 2 Outs" or "3-1 · 0 Out"
                    HStack(spacing: 4) {
                        baseDiamonds(b.baseRunners)
                        Text("\(b.balls)-\(b.strikes) · \(b.outs) \(b.outs == 1 ? "Out" : "Outs")")
                            .font(.system(size: 8.5, weight: .bold, design: .monospaced))
                            .foregroundColor(.white.opacity(0.9))
                            .shadow(color: .black.opacity(0.6), radius: 2, y: 1)
                    }
                    
                case .football(let f):
                    // Quarter & Game Clock: e.g. "Q3  08:42" or "OT  03:15"
                    HStack(spacing: 5) {
                        Text(f.quarter > 4 ? "OT" : "Q\(f.quarter)")
                            .font(.system(size: 11, weight: .heavy, design: .rounded))
                            .foregroundColor(.cyan)
                        Text(f.clockDisplay)
                            .font(.system(size: 11, weight: .heavy, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    .shadow(color: .black.opacity(0.6), radius: 2, y: 1)
                    
                    // Down & Distance: e.g. "3rd & 4"
                    if let dd = f.downDistanceText, !dd.isEmpty {
                        Text(dd)
                            .font(.system(size: 8.5, weight: .bold, design: .monospaced))
                            .foregroundColor(f.isRedZone ? Color(red: 1.0, green: 0.3, blue: 0.3) : .white.opacity(0.85))
                            .shadow(color: .black.opacity(0.6), radius: 2, y: 1)
                    } else {
                        HStack(spacing: 3) {
                            Circle().fill(Color.red).frame(width: 4, height: 4)
                            Text("LIVE")
                                .font(.system(size: 8, weight: .heavy, design: .rounded))
                                .foregroundColor(.red)
                        }
                    }
                    
                case .basketball(let bb):
                    // Quarter & Game Clock: e.g. "Q4  02:15" or "OT  01:20"
                    HStack(spacing: 5) {
                        Text(bb.isOvertime ? "OT" : "Q\(bb.quarter)")
                            .font(.system(size: 11, weight: .heavy, design: .rounded))
                            .foregroundColor(.orange)
                        Text(bb.clockDisplay)
                            .font(.system(size: 11, weight: .heavy, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    .shadow(color: .black.opacity(0.6), radius: 2, y: 1)
                    
                    HStack(spacing: 3) {
                        Circle().fill(Color.red).frame(width: 4, height: 4)
                        Text("LIVE")
                            .font(.system(size: 8, weight: .heavy, design: .rounded))
                            .foregroundColor(.white.opacity(0.8))
                    }
                    .shadow(color: .black.opacity(0.6), radius: 2, y: 1)
                    
                case .none:
                    Text(match.statusDisplay)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.white)
                }
            }
        } else if match.isFinal {
            VStack(spacing: 2) {
                Text("FINAL")
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .foregroundColor(.white.opacity(0.80))
                    .shadow(color: .black.opacity(0.5), radius: 2, y: 1)
                Text(match.competitionName)
                    .font(.system(size: 8.5, weight: .bold, design: .rounded))
                    .foregroundColor(.white.opacity(0.40))
            }
        } else {
            // Scheduled: Clean divider with start time
            VStack(spacing: 2) {
                Text("VS")
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .foregroundColor(.white.opacity(0.85))
                    .shadow(color: .black.opacity(0.5), radius: 2, y: 1)
                Text(match.formattedStartTime)
                    .font(.system(size: 8.5, weight: .semibold, design: .monospaced))
                    .foregroundColor(.cyan.opacity(0.90))
                    .shadow(color: .black.opacity(0.5), radius: 2, y: 1)
            }
        }
    }
    
    @ViewBuilder
    private func baseDiamonds(_ runners: BaseRunners) -> some View {
        ZStack {
            // 2nd base
            Rectangle()
                .fill(runners.second ? Color.yellow : Color.white.opacity(0.25))
                .frame(width: 4.5, height: 4.5)
                .rotationEffect(.degrees(45))
                .offset(x: 0, y: -4)
            // 3rd base
            Rectangle()
                .fill(runners.third ? Color.yellow : Color.white.opacity(0.25))
                .frame(width: 4.5, height: 4.5)
                .rotationEffect(.degrees(45))
                .offset(x: -4, y: 0)
            // 1st base
            Rectangle()
                .fill(runners.first ? Color.yellow : Color.white.opacity(0.25))
                .frame(width: 4.5, height: 4.5)
                .rotationEffect(.degrees(45))
                .offset(x: 4, y: 0)
        }
        .frame(width: 14, height: 12)
    }
    
    private func ordinalInning(_ inning: Int) -> String {
        switch inning {
        case 1: return "1st"
        case 2: return "2nd"
        case 3: return "3rd"
        default: return "\(inning)th"
        }
    }
    
    // MARK: - Glass Controls & Pills
    @ViewBuilder
    private func leaguePill(match: Match) -> some View {
        HStack(spacing: 4) {
            Image(systemName: match.sport.systemIcon)
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(.white)
            Text(match.competitionName)
                .font(.system(size: 10, weight: .heavy, design: .rounded))
                .foregroundColor(.white.opacity(0.95))
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 2.5)
        .background(Color.white.opacity(0.14))
        .clipShape(Capsule())
        .overlay(
            Capsule().strokeBorder(currentTheme == .clear ? Color.white.opacity(0.25) : currentTheme.accentColor.opacity(0.40), lineWidth: 0.8)
        )
    }
    
    @ViewBuilder
    private func statusPill(match: Match) -> some View {
        HStack(spacing: 5) {
            Circle()
                .fill(statusColor(match: match))
                .frame(width: 5, height: 5)
                .shadow(color: statusColor(match: match).opacity(0.9), radius: 3)
            
            Text(statusPillText(match: match))
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundColor(match.isLive ? Color(red: 1.0, green: 0.35, blue: 0.35) : .white.opacity(0.85))
                .shadow(color: .black.opacity(0.5), radius: 2, y: 1)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 2.5)
        .background(Color.black.opacity(0.35))
        .clipShape(Capsule())
        .overlay(
            Capsule().strokeBorder(Color.white.opacity(0.20), lineWidth: 0.8)
        )
        .transition(.opacity)
    }
    
    @ViewBuilder
    private func glassDropletButton(systemName: String, help: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 8.5, weight: .heavy))
                .foregroundColor(.white)
                .frame(width: 20, height: 20)
                .background(Color.white.opacity(0.18))
                .clipShape(Circle())
                .overlay(Circle().strokeBorder(Color.white.opacity(0.32), lineWidth: 0.8))
        }
        .buttonStyle(.plain)
        .help(help)
    }

    @ViewBuilder
    private func teamBadge(url: String, abbrev: String) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 9, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.18),
                            Color.white.opacity(0.06)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 9, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                stops: [
                                    .init(color: currentTheme == .clear ? Color.white.opacity(0.70) : currentTheme.accentColor.opacity(0.75), location: 0.0),
                                    .init(color: .white.opacity(0.15), location: 0.5),
                                    .init(color: currentTheme == .clear ? Color.white.opacity(0.30) : currentTheme.accentColor.opacity(0.35), location: 1.0)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 0.9
                        )
                )
                .frame(width: 30, height: 30)
                .shadow(color: Color.black.opacity(0.30), radius: 4, x: 0, y: 2)
            
            if let u = URL(string: url), !url.isEmpty {
                AsyncImage(url: u) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 22, height: 22)
                    case .failure(_):
                        Text(abbrev.prefix(3))
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .foregroundColor(.white.opacity(0.9))
                    case .empty:
                        Text(abbrev.prefix(3))
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .foregroundColor(.white.opacity(0.7))
                    @unknown default:
                        Text(abbrev.prefix(3))
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
            } else {
                Text(abbrev.prefix(3))
                    .font(.system(size: 9, weight: .black, design: .rounded))
                    .foregroundColor(.white.opacity(0.9))
            }
        }
    }
    
    @ViewBuilder
    private var emptyPlaceholderView: some View {
        HStack(spacing: 10) {
            Image(systemName: "sparkles")
                .foregroundColor(.white)
                .font(.system(size: 16))
            VStack(alignment: .leading, spacing: 2) {
                Text("No Match Pinned")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                Text("Click to select a game")
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.65))
            }
            Spacer()
            Button(action: onOpenPicker) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.white)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
    }
    
    private func statusColor(match: Match) -> Color {
        if match.isLive {
            return Color(red: 1.0, green: 0.28, blue: 0.28)
        } else if match.isFinal {
            return Color.white.opacity(0.4)
        } else {
            return Color.orange.opacity(0.9)
        }
    }
    
    private func statusPillText(match: Match) -> String {
        if match.isLive {
            let lower = match.statusDisplay.lowercased()
            if lower.contains("half") {
                return "HALF"
            } else if lower.contains("delay") {
                return "DELAY"
            } else if lower.contains("intermission") || lower.contains("end of") {
                return "BREAK"
            } else {
                return "LIVE"
            }
        } else if match.isFinal {
            return "FINAL"
        } else {
            return match.formattedStartTime
        }
    }
    
    private func scoreColor(isWinner: Bool, isFinal: Bool) -> Color {
        if isFinal {
            return isWinner ? .white : .white.opacity(0.4)
        }
        return .white
    }
    
    private func cyclePinnedMatch() {
        let matches = sportsService.allMatches
        guard !matches.isEmpty else { return }
        
        if let current = currentMatch, let idx = matches.firstIndex(where: { $0.id == current.id }) {
            let next = matches[(idx + 1) % matches.count]
            AutoPinManager.shared.userDidPinMatch(next)
        } else if let first = matches.first {
            AutoPinManager.shared.userDidPinMatch(first)
        }
    }
}
