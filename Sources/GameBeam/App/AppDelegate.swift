import AppKit
import SwiftUI

public final class AppDelegate: NSObject, NSApplicationDelegate {
    public func applicationDidFinishLaunching(_ notification: Notification) {
        // Prevent app from quitting when all windows are closed
        NSApp.setActivationPolicy(.accessory)
        
        // 1. Setup Menu Bar
        let menuBar = MenuBarController.shared
        menuBar.setup()
        
        menuBar.onToggleHUD = {
            FloatingHUDWindowController.shared.toggleHUD()
        }
        
        menuBar.onOpenPicker = {
            PickerWindowController.shared.showPicker()
        }
        
        // 2. Start Sports Service Poller
        SportsService.shared.startPolling()
        
        // 3. Show HUD if there is a pinned match
        let mem = MemoryStore.shared.memory
        if mem.pinnedMatchId != nil || mem.lastPinnedMatchSnapshot != nil {
            FloatingHUDWindowController.shared.showHUD()
        }
        
        // 4. Also open Match Center initially so user sees the interface
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            PickerWindowController.shared.showPicker()
        }
    }
    
    public func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return false
    }
}
