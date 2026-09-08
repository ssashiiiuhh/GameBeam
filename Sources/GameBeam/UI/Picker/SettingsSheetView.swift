import SwiftUI

public struct SettingsSheetView: View {
    @ObservedObject var memoryStore = MemoryStore.shared
    @Environment(\.dismiss) var dismiss
    
    @State private var teamSearchText = ""
    @State private var selectedSportTab: Sport = .mlb
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Preferences & Teams")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Button("Done") {
                    dismiss()
                }
                .keyboardShortcut(.defaultAction)
                .buttonStyle(.borderedProminent)
                .tint(.cyan)
            }
            .padding(18)
            .background(Color.white.opacity(0.04))
            
            Divider()
                .background(Color.white.opacity(0.1))
            
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Automation Options
                    VStack(alignment: .leading, spacing: 12) {
                        Text("AUTOMATION")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.cyan)
                        
                        Toggle("Auto-Pin Favourite Teams when Live", isOn: $memoryStore.memory.autoPinFavourites)
                            .onChange(of: memoryStore.memory.autoPinFavourites) {
                                memoryStore.save()
                            }
                            .foregroundColor(.white)
                        
                        Toggle("Auto-Hide Floating HUD when Game Ends", isOn: $memoryStore.memory.autoHideOnFinal)
                            .onChange(of: memoryStore.memory.autoHideOnFinal) {
                                memoryStore.save()
                            }
                            .foregroundColor(.white)
                    }
                    .padding(14)
                    .background(Color.white.opacity(0.04))
                    .cornerRadius(12)
                    
                    // Menu Bar Options
                    VStack(alignment: .leading, spacing: 12) {
                        Text("MENU BAR")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.cyan)
                        
                        Toggle("Show Live Scores in Menu Bar", isOn: $memoryStore.memory.showMenuBarScores)
                            .onChange(of: memoryStore.memory.showMenuBarScores) {
                                memoryStore.save()
                            }
                            .foregroundColor(.white)
                        
                        Toggle("Sport Icon Only (Compact)", isOn: $memoryStore.memory.menuBarIconOnly)
                            .onChange(of: memoryStore.memory.menuBarIconOnly) {
                                memoryStore.save()
                            }
                            .foregroundColor(.white)
                        
                        Text("Dynamic sport emoji (⚾ MLB, 🏈 NFL, 🏀 NBA) updates automatically based on the pinned match or selected league.")
                            .font(.system(size: 10.5))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    .padding(14)
                    .background(Color.white.opacity(0.04))
                    .cornerRadius(12)
                    
                    // Theme Selector
                    VStack(alignment: .leading, spacing: 10) {
                        Text("LIQUID GLASS THEME")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.cyan)
                        
                        HStack(spacing: 8) {
                            ForEach(GlassTheme.allCases) { theme in
                                ThemeButton(
                                    theme: theme,
                                    isSelected: GlassTheme.from(memoryStore.memory.theme) == theme
                                ) {
                                    memoryStore.memory.theme = theme.rawValue
                                    memoryStore.save()
                                }
                            }
                        }
                    }
                    .padding(14)
                    .background(Color.white.opacity(0.04))
                    .cornerRadius(12)
                    
                    // Favourite Teams Selector
                    VStack(alignment: .leading, spacing: 12) {
                        Text("FAVOURITE TEAMS")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.cyan)
                        
                        // Sport Segment
                        Picker("Sport", selection: $selectedSportTab) {
                            ForEach(Sport.allCases) { sport in
                                Text(sport.displayName).tag(sport)
                            }
                        }
                        .pickerStyle(.segmented)
                        
                        // Search bar
                        HStack {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(.white.opacity(0.5))
                            TextField("Search team name...", text: $teamSearchText)
                                .textFieldStyle(.plain)
                                .foregroundColor(.white)
                        }
                        .padding(8)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(8)
                        
                        // Team list
                        let filtered = TeamDirectory.search(query: teamSearchText, sport: selectedSportTab)
                        VStack(spacing: 4) {
                            ForEach(filtered) { team in
                                let isFav = memoryStore.isFavourite(teamFavKey: team.favKey)
                                HStack {
                                    if let url = URL(string: team.logo) {
                                        AsyncImage(url: url) { img in
                                            img.resizable().aspectRatio(contentMode: .fit)
                                        } placeholder: {
                                            Circle().fill(Color.white.opacity(0.1))
                                        }
                                        .frame(width: 20, height: 20)
                                    }
                                    
                                    Text(team.name)
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.white)
                                    
                                    Spacer()
                                    
                                    Button(action: {
                                        memoryStore.toggleFavourite(team: team)
                                    }) {
                                        Image(systemName: isFav ? "star.fill" : "star")
                                            .foregroundColor(isFav ? .yellow : .white.opacity(0.3))
                                            .font(.system(size: 14))
                                    }
                                    .buttonStyle(.plain)
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(isFav ? Color.yellow.opacity(0.08) : Color.clear)
                                .cornerRadius(6)
                            }
                        }
                    }
                    .padding(14)
                    .background(Color.white.opacity(0.04))
                    .cornerRadius(12)
                }
                .padding(18)
            }
        }
        .frame(width: 420, height: 560)
        .background(
            ZStack {
                VisualEffectView(material: .hudWindow, blendingMode: .behindWindow)
                Color.black.opacity(0.65)
            }
        )
    }
}

private struct ThemeButton: View {
    let theme: GlassTheme
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 5) {
                    Circle()
                        .fill(theme == .clear ? Color.white : theme.accentColor)
                        .frame(width: 8, height: 8)
                        .shadow(color: (theme == .clear ? Color.white : theme.accentColor).opacity(0.6), radius: 3)
                    
                    Text(theme.title)
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    Spacer(minLength: 0)
                    
                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(theme == .clear ? Color.white : theme.accentColor)
                            .font(.system(size: 11))
                    }
                }
                
                Text(theme.subtitle)
                    .font(.system(size: 8.5))
                    .foregroundColor(.white.opacity(0.60))
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(9)
            .frame(maxWidth: .infinity, minHeight: 52, alignment: .topLeading)
            .background(Color.white.opacity(isSelected ? 0.12 : 0.04))
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(
                        isSelected
                            ? (theme == .clear ? Color.white.opacity(0.85) : theme.accentColor.opacity(0.85))
                            : Color.white.opacity(0.10),
                        lineWidth: isSelected ? 1.25 : 0.8
                    )
            )
        }
        .buttonStyle(.plain)
    }
}
