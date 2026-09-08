// src-tauri/src/commands/window_commands.rs - IPC commands for window and tray manipulation

use tauri::{AppHandle, Manager, State};
use crate::app_state::AppState;

#[tauri::command]
pub async fn toggle_click_through(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("overlay") {
        let mut is_ct = state.is_click_through.lock().unwrap();
        *is_ct = !*is_ct;
        window
            .set_ignore_cursor_events(*is_ct)
            .map_err(|e| format!("Failed to set ignore cursor events: {}", e))?;
        Ok(*is_ct)
    } else {
        Err("Overlay window not found".to_string())
    }
}

#[tauri::command]
pub async fn update_tray_score(app: AppHandle, title: String) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("gamebeam-tray").or_else(|| app.tray_by_id("livescore-tray")) {
        let _ = tray.set_title(Some(&title));
    }
    Ok(())
}

#[tauri::command]
pub async fn show_overlay_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("overlay") {
        window.show().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn hide_overlay_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("overlay") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn hide_picker_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn show_picker_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        let _ = window.set_focus();
    }
    Ok(())
}
