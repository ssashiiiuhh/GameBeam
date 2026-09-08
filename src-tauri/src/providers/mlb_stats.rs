// src-tauri/src/providers/mlb_stats.rs - Official MLB Stats API provider

use reqwest::Client;
use serde_json::Value;
use std::time::Duration;
use crate::poller::RequestGovernor;

pub struct MlbStatsProvider {
    client: Client,
}

impl MlbStatsProvider {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(12))
            .user_agent("GameBeam-macOS/1.0 (Official MLB Stats Client)")
            .build()
            .unwrap_or_else(|_| Client::new());

        Self { client }
    }

    pub async fn fetch(&self, url: &str, governor: &RequestGovernor) -> Result<Value, String> {
        // Enforce rate limiting per endpoint
        governor.wait_for_slot(url).await;

        let res = self.client
            .get(url)
            .send()
            .await
            .map_err(|e| format!("MLB Stats network request failed: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("MLB Stats HTTP error {}: {}", res.status().as_u16(), res.status()));
        }

        let json = res.json::<Value>()
            .await
            .map_err(|e| format!("MLB Stats JSON deserialization failed: {}", e))?;

        Ok(json)
    }
}
