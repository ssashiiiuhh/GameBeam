import AppKit
import SwiftUI
import Combine

public final class FloatingHUDPanel: NSPanel {
    public override var canBecomeKey: Bool { false }
    public override var canBecomeMain: Bool { false }
    public override var hidesOnDeactivate: Bool {
        get { false }
        set { }
    }
}

public final class FloatingHUDWindowController: NSWindowController, NSWindowDelegate {
    public static let shared = FloatingHUDWindowController()
    
    public let panelWidth: CGFloat = 384
    public let panelHeight: CGFloat = 128
    
    private var cancellables = Set<AnyCancellable>()
    private var savePositionWorkItem: DispatchWorkItem?
    
    public init() {
        let panel = FloatingHUDPanel(
            contentRect: NSRect(x: 100, y: 100, width: panelWidth, height: panelHeight),
            styleMask: [.borderless, .nonactivatingPanel, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle, .fullScreenAuxiliary]
        panel.isMovableByWindowBackground = true
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = false
        panel.isReleasedWhenClosed = false
        panel.hidesOnDeactivate = false
        
        super.init(window: panel)
        panel.delegate = self
        
        setupViews(panel: panel)
        restorePosition()
        setupAutoHideObserver()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupViews(panel: FloatingHUDPanel) {
        let hudView = FloatingHUDView(
            onClose: { [weak self] in
                self?.hideHUD()
            },
            onOpenPicker: {
                PickerWindowController.shared.showPicker()
            }
        )
        let hostingView = NSHostingView(rootView: hudView)
        hostingView.frame = NSRect(x: 0, y: 0, width: panelWidth, height: panelHeight)
        panel.contentView = hostingView
    }
    
    private func setupAutoHideObserver() {
        AutoPinManager.shared.onAutoHideTriggered
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in
                self?.hideHUD()
            }
            .store(in: &cancellables)
    }
    
    public func showHUD() {
        guard let window = window else { return }
        if !window.isVisible {
            restorePosition()
        }
        window.orderFrontRegardless()
    }
    
    public func hideHUD() {
        window?.orderOut(nil)
    }
    
    public func toggleHUD() {
        if window?.isVisible == true {
            hideHUD()
        } else {
            showHUD()
        }
    }
    
    private func restorePosition() {
        guard let window = window, let screen = NSScreen.main else { return }
        
        let screenRect = screen.visibleFrame
        let defaultX = screenRect.maxX - panelWidth - 24
        let defaultY = screenRect.maxY - panelHeight - 16
        let defaultOrigin = NSPoint(x: defaultX, y: defaultY)
        
        let pos = MemoryStore.shared.memory.overlayPosition
        if let x = pos.lastX, let y = pos.lastY {
            let candidateRect = NSRect(x: x, y: y, width: panelWidth, height: panelHeight)
            let isVisibleOnAnyScreen = NSScreen.screens.contains { s in
                s.visibleFrame.intersects(candidateRect)
            }
            if isVisibleOnAnyScreen {
                window.setFrameOrigin(NSPoint(x: x, y: y))
            } else {
                window.setFrameOrigin(defaultOrigin)
            }
        } else {
            window.setFrameOrigin(defaultOrigin)
        }
    }
    
    public func windowDidMove(_ notification: Notification) {
        guard let window = window else { return }
        let origin = window.frame.origin
        
        savePositionWorkItem?.cancel()
        let item = DispatchWorkItem {
            MemoryStore.shared.updateOverlayPosition(x: origin.x, y: origin.y)
        }
        savePositionWorkItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4, execute: item)
    }
}
