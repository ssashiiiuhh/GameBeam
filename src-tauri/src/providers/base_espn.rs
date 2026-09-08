// src-tauri/src/providers/base_espn.rs - Shared ESPN HTTP provider engine

use reqwest::Client;
use serde_json::Value;
use std::time::Duration;
use crate::poller::RequestGovernor;

pub struct BaseEspnProvider {
    client: Client,
}

impl BaseEspnProvider {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(12))
            .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
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
            .map_err(|e| format!("Network request failed: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("HTTP error {}: {}", res.status().as_u16(), res.status()));
        }

        let json = res.json::<Value>()
            .await
            .map_err(|e| format!("JSON deserialization failed: {}", e))?;

        Ok(json)
    }
}
