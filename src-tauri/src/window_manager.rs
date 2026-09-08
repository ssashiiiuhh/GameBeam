// src-tauri/src/window_manager.rs - Native window management and macOS configuration

use tauri::WebviewWindow;

pub fn configure_overlay_window(window: &WebviewWindow) {
    let _ = window.set_always_on_top(true);
    let _ = window.set_shadow(false);
    if let Ok(Some(monitor)) = window.current_monitor() {
        let screen_size = monitor.size();
        let scale_factor = monitor.scale_factor();
        let logical_width = screen_size.width as f64 / scale_factor;
        let x = logical_width - 320.0 - 24.0;
        let y = 44.0;
        let _ = window.set_position(tauri::LogicalPosition::new(x, y));
    }
}

pub fn configure_picker_window(window: &WebviewWindow) {
    let _ = window.set_always_on_top(true);
    if let Ok(Some(monitor)) = window.current_monitor() {
        let screen_size = monitor.size();
        let scale_factor = monitor.scale_factor();
        let logical_width = screen_size.width as f64 / scale_factor;
        let logical_height = screen_size.height as f64 / scale_factor;
        let x = (logical_width - 440.0) / 2.0;
        let y = (logical_height - 640.0) / 2.0;
        let _ = window.set_position(tauri::LogicalPosition::new(x, y));
    }
}
