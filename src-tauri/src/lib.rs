// src-tauri/src/lib.rs - Main entrypoint for LiveScore Tauri 2 core

pub mod app_state;
pub mod commands;
pub mod poller;
pub mod providers;
pub mod tray;
pub mod window_manager;

use app_state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState::new())
        .setup(|app| {
            // macOS Accessory Mode: menu bar utility without Dock clutter
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Initialize Menu Bar Tray Icon
            if let Err(e) = tray::setup_tray(app.handle()) {
                eprintln!("[Tray] Error setting up system tray: {}", e);
            }

            // Configure Overlay Window
            if let Some(overlay) = app.get_webview_window("overlay") {
                window_manager::configure_overlay_window(&overlay);
            }

            // Configure Match Picker Window
            if let Some(main) = app.get_webview_window("main") {
                window_manager::configure_picker_window(&main);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::fetch_sport_data,
            commands::toggle_click_through,
            commands::update_tray_score,
            commands::show_overlay_window,
            commands::hide_overlay_window,
            commands::hide_picker_window,
            commands::show_picker_window,
            commands::get_app_memory,
            commands::save_app_memory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running GameBeam application");
}
