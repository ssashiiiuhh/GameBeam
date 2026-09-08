# ⚡ GameBeam

A **100% native macOS live sports widget** featuring a **sculpted liquid glass HUD**, dynamic menu bar presence, Sofascore-style Match Center, and smart adaptive polling across **MLB**, **NFL**, and **NBA**.

---

## ✨ Features

- **Pure Native Liquid Glass HUD**:
  - Built with SwiftUI & AppKit utilizing the macOS Tahoe `.clear` glass engine.
  - Double-walled meniscus rim with 1.5pt specular highlights and 1.0pt inset refraction shelf.
  - Subtle prismatic dispersion (crown glass $n \approx 1.52$) and diagonal caustic light sweeps.
  - Multi-space floating window (`NSPanel`) that stays non-activating (never steals keyboard focus).
  - Remembers exact window coordinates across restarts.
- **Dynamic Menu Bar Presence**:
  - Sport-adaptive emojis (`⚾` MLB, `🏈` NFL, `🏀` NBA) update automatically based on pinned matches or active leagues.
  - Anti-spoiler mode: Toggle off scores to display matchup only (`⚾ COL vs NYY`) or compact icon only (`⚾`).
  - Dropdown menu for instant HUD toggle (`⌘H`), Match Center (`⌘O`), and score refresh (`⌘R`).
- **Sofascore-Style Match Center**:
  - Date navigation (`Yesterday`, `Today`, `Tomorrow`, `Upcoming`).
  - Search across all teams and leagues.
  - Spotlight hero card for top live match with 1-click pinning.
  - Preferences sheet to manage favourite teams and themes.
- **Three Native Glass Themes**:
  - **Clear**: Pure transparency with white specular rim.
  - **Smoked**: Deep obsidian substrate with silver specular rim.
  - **Midnight**: Dark sapphire space tint with neon cyan edge caustics.
- **Smart Adaptive Per-League Polling**:
  - 15s polling during live matches.
  - 30s to 2m during pre-game.
  - Complete dormancy (3 hours) during off-days or offseason for zero network waste.

---

## 🛠️ Build & Run

### Prerequisites
- macOS 14.0+ (macOS Tahoe 26+ recommended for native `.glassEffect`)
- Xcode 15+ / Swift 5.10+

### Quickstart

```bash
# Run test suite
swift test

# Build and package the release application
./Scripts/package_app.sh release

# Open the packaged app
open build/GameBeam.app
```

---

## 🧪 Testing

Run the automated test suite covering ESPN decoding, MLB Stats API parsing, memory persistence, adaptive polling schedules, and menu bar options:

```bash
swift test
```

---

## 📄 License

MIT License.
