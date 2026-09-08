# Swift Native Migration Plan

## Goal
Migrate GameBeam from a Tauri 2 (Rust + WebKit) architecture to a 100% native macOS Swift application (SwiftUI + AppKit) for a featherlight memory footprint (~20MB), flawless multi-space floating HUD behavior (`NSPanel`), and native macOS Liquid Glass rendering.

## Tasks
- [x] Task 1: **Project Scaffolding & Build Pipeline** → Setup `Package.swift` (macOS 14+), `Sources/GameBeam/`, and `Scripts/package_app.sh`. → *Verify: `swift build` compiles cleanly and builds a basic macOS app bundle.*
- [x] Task 2: **Data Models & Decoders** → Define `Sport`, `Team`, `Match`, `MatchStatus`, and ESPN/MLB JSON models with `Codable`. → *Verify: `swift test` validates parsing of real ESPN MLB/NFL/NBA and MLB Stats API responses.*
- [x] Task 3: **Sports Service & Networking** → Build `SportsService` using Swift modern concurrency (`async/await`, `URLSession`) for fetching schedule/scores across MLB, NFL, and NBA. → *Verify: CLI test fetches live/upcoming matches and logs normalized scoreboards.*
- [x] Task 4: **Persistent App Memory Store** → Implement `MemoryStore` reading/writing `gamebeam_memory.json` in `~/Library/Application Support/com.gamebeam.macos/` to persist favourites, active sport/date filters, and window coordinates. → *Verify: Memory loads existing saved preferences from disk and saves updates.*
- [x] Task 5: **Menu Bar Controller (`NSStatusItem`) & Auto-Pin Manager** → Implement native menu bar status item displaying live scores/results when HUD is hidden, and `AutoPinManager` that automatically monitors favorite team games. → *Verify: Status bar displays favourite scores and menu dropdown works.*
- [x] Task 6: **Floating HUD Window (`NSPanel` + SwiftUI Liquid Glass)** → Create a non-activating, transparent `NSPanel` (`canJoinAllSpaces`) hosting a SwiftUI Liquid Glass score capsule with specular borders and optical score chambers. → *Verify: HUD floats across all macOS Mission Control spaces and can be dragged without stealing window focus.*
- [x] Task 7: **Liquid Glass Match Picker Window (SwiftUI)** → Build the Sofascore-style homepage window featuring search, sport pills, date selector, spotlight hero card, and interactive match cards with pin toggles. → *Verify: User can browse games by sport/date, search teams, and toggle favourites/pins.*
- [x] Task 8: **Bundle Packaging, Verification & Deployment** → Assemble final `GameBeam.app` with `Info.plist` (LSUIElement / background agent), install to `/Applications/GameBeam.app`, and run memory/performance audit. → *Verify: App launches instantly, uses under 25MB RAM, and passes all user flows.*

## Done When
- [x] GameBeam runs as a pure native macOS app with zero WebKit helper processes.
- [x] Memory footprint drops from ~120MB+ down to < 25MB.
- [x] Floating HUD stays visible across all virtual desktop spaces without stealing active focus.
- [x] Menu bar item updates dynamically with favourite team scores.
- [x] Favourite teams, filters, and HUD positions persist cleanly across app restarts.
