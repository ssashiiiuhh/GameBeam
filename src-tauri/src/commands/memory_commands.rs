// src-tauri/src/commands/memory_commands.rs - Native persistent memory state for GameBeam

use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use serde_json::{json, Value};

fn get_memory_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app_data_dir: {}", e))?;
    
    if !app_data.exists() {
        let _ = fs::create_dir_all(&app_data);
    }
    Ok(app_data.join("gamebeam_memory.json"))
}

#[tauri::command]
pub async fn get_app_memory(app: AppHandle) -> Result<Value, String> {
    let file_path = get_memory_file_path(&app)?;
    if file_path.exists() {
        match fs::read_to_string(&file_path) {
            Ok(content) => {
                if let Ok(val) = serde_json::from_str::<Value>(&content) {
                    return Ok(val);
                }
            }
            Err(e) => {
                eprintln!("[Memory] Error reading memory file {:?}: {}", file_path, e);
            }
        }
    }
    Ok(json!({}))
}

#[tauri::command]
pub async fn save_app_memory(app: AppHandle, memory: Value) -> Result<(), String> {
    let file_path = get_memory_file_path(&app)?;
    let content = serde_json::to_string_pretty(&memory)
        .map_err(|e| format!("Failed serializing memory: {}", e))?;
    
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed writing memory to {:?}: {}", file_path, e))?;

    // Broadcast memory update event to all active windows
    let _ = app.emit("gamebeam://memory-updated", &memory);
    Ok(())
}
