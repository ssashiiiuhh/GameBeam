// src-tauri/src/commands/sports_commands.rs - IPC commands for sports data fetching

use tauri::State;
use serde_json::Value;
use crate::app_state::AppState;

#[tauri::command]
pub async fn fetch_sport_data(
    sport_key: Option<String>,
    key: Option<String>,
    url: String,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let k = sport_key.or(key).unwrap_or_default();
    if k == "mlb" || url.contains("statsapi.mlb.com") {
        state.mlb.fetch(&url, &state.governor).await
    } else {
        state.espn.fetch(&url, &state.governor).await
    }
}
