import SwiftUI

public struct MatchCardView: View {
    public let match: Match
    @ObservedObject var memoryStore = MemoryStore.shared
    
    public var onPin: () -> Void
    
    private var isPinned: Bool {
        memoryStore.memory.pinnedMatchId == match.id
    }
    
    private var isFavoured: Bool {
        memoryStore.isMatchFavoured(match: match)
    }
    
    public var body: some View {
        HStack(spacing: 12) {
            // Sport & Status Indicator
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    Image(systemName: match.sport.systemIcon)
                        .font(.system(size: 9))
                        .foregroundColor(.cyan)
                    
                    Text(match.competitionName)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.cyan.opacity(0.9))
                }
                
                HStack(spacing: 4) {
                    if match.isLive {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 5, height: 5)
                    }
                    Text(match.statusDisplay)
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundColor(match.isLive ? .red : .white.opacity(0.6))
                        .lineLimit(1)
                }
            }
            .frame(width: 80, alignment: .leading)
            
            // Teams & Scores
            VStack(spacing: 5) {
                // Away Team
                HStack(spacing: 6) {
                    teamLogo(url: match.awayTeam.logoUrl)
                    Text(match.awayTeam.name)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    if isTeamFav(match.awayTeam) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 8))
                            .foregroundColor(.yellow)
                    }
                    
                    Spacer()
                    
                    Text("\(match.awayTeam.score ?? 0)")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                }
                
                // Home Team
                HStack(spacing: 6) {
                    teamLogo(url: match.homeTeam.logoUrl)
                    Text(match.homeTeam.name)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    if isTeamFav(match.homeTeam) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 8))
                            .foregroundColor(.yellow)
                    }
                    
                    Spacer()
                    
                    Text("\(match.homeTeam.score ?? 0)")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                }
            }
            
            // Action Pin Button
            Button(action: onPin) {
                ZStack {
                    Circle()
                        .fill(isPinned ? Color.cyan : Color.white.opacity(0.12))
                        .frame(width: 28, height: 28)
                    
                    Image(systemName: isPinned ? "pin.fill" : "pin")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(isPinned ? .black : .white.opacity(0.85))
                }
            }
            .buttonStyle(.plain)
            .help(isPinned ? "Pinned to Desktop HUD" : "Pin to Desktop HUD")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.white.opacity(isPinned ? 0.10 : 0.04))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(isPinned ? Color.cyan.opacity(0.5) : Color.white.opacity(0.08), lineWidth: 1)
        )
    }
    
    private func isTeamFav(_ team: Team) -> Bool {
        let key = "\(match.sport.category):\(team.id)"
        return memoryStore.isFavourite(teamFavKey: key)
    }
    
    @ViewBuilder
    private func teamLogo(url: String) -> some View {
        ZStack {
            Circle()
                .fill(Color.white.opacity(0.12))
                .frame(width: 20, height: 20)
            
            if let u = URL(string: url), !url.isEmpty {
                AsyncImage(url: u) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 15, height: 15)
                    default:
                        Circle()
                            .fill(Color.white.opacity(0.10))
                            .frame(width: 15, height: 15)
                    }
                }
            }
        }
    }
}
