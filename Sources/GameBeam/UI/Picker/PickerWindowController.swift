import AppKit
import SwiftUI

public final class KeyBorderlessWindow: NSWindow {
    public override var canBecomeKey: Bool { true }
    public override var canBecomeMain: Bool { true }
}

public final class PickerWindowController: NSWindowController, NSWindowDelegate {
    public static let shared = PickerWindowController()
    
    private let pickerWidth: CGFloat = 476
    private let pickerHeight: CGFloat = 676
    
    public init() {
        let window = KeyBorderlessWindow(
            contentRect: NSRect(x: 200, y: 200, width: pickerWidth, height: pickerHeight),
            styleMask: [.borderless, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        
        window.isMovableByWindowBackground = true
        window.backgroundColor = .clear
        window.isOpaque = false
        window.hasShadow = false
        window.isReleasedWhenClosed = false
        window.level = .normal
        
        super.init(window: window)
        window.delegate = self
        
        let pickerView = PickerView(
            onClose: { [weak self] in
                self?.hidePicker()
            }
        )
        
        let hostingView = NSHostingView(rootView: pickerView)
        hostingView.frame = NSRect(x: 0, y: 0, width: pickerWidth, height: pickerHeight)
        window.contentView = hostingView
        
        window.center()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    public func showPicker() {
        guard let window = window else { return }
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApplication.shared.activate(ignoringOtherApps: true)
    }
    
    public func hidePicker() {
        window?.orderOut(nil)
    }
    
    public func togglePicker() {
        if window?.isVisible == true {
            hidePicker()
        } else {
            showPicker()
        }
    }
}
