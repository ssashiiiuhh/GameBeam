// src-tauri/src/tray.rs - macOS Menu Bar Tray controller for LiveScore

use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let toggle_picker = MenuItem::with_id(app, "toggle_picker", "Show / Hide Match Picker", true, None::<&str>)?;
    let toggle_overlay = MenuItem::with_id(app, "toggle_overlay", "Toggle Score Overlay", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit GameBeam", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[
        &toggle_picker,
        &toggle_overlay,
        &quit,
    ])?;

    let mut builder = TrayIconBuilder::with_id("gamebeam-tray")
        .tooltip("GameBeam macOS")
        .title("GameBeam")
        .menu(&menu)
        .show_menu_on_left_click(false);

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "toggle_picker" => {
                    if let Some(win) = app.get_webview_window("main") {
                        if win.is_visible().unwrap_or(false) {
                            let _ = win.hide();
                        } else {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                }
                "toggle_overlay" => {
                    if let Some(win) = app.get_webview_window("overlay") {
                        if win.is_visible().unwrap_or(false) {
                            let _ = win.hide();
                        } else {
                            let _ = win.show();
                        }
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { .. } = event {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    if win.is_visible().unwrap_or(false) {
                        let _ = win.hide();
                    } else {
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
