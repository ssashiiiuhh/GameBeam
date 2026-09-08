// src-tauri/src/poller/governor.rs - Token-bucket request governor and per-host rate limiter

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

pub struct RequestGovernor {
    last_requests: Mutex<HashMap<String, Instant>>,
    min_interval: Duration,
}

impl RequestGovernor {
    pub fn new() -> Self {
        Self {
            last_requests: Mutex::new(HashMap::new()),
            min_interval: Duration::from_millis(600), // Safe interval between requests to exact same endpoint
        }
    }

    /// Checks if a request to `key` can proceed. If too soon, sleeps for the remainder of the min interval.
    pub async fn wait_for_slot(&self, key: &str) {
        let sleep_duration = {
            let mut map = self.last_requests.lock().unwrap();
            let now = Instant::now();
            if let Some(&last_time) = map.get(key) {
                if now < last_time {
                    let wait = last_time.duration_since(now) + self.min_interval;
                    map.insert(key.to_string(), now + wait);
                    Some(wait)
                } else {
                    let elapsed = now.duration_since(last_time);
                    if elapsed < self.min_interval {
                        let wait = self.min_interval - elapsed;
                        map.insert(key.to_string(), now + wait);
                        Some(wait)
                    } else {
                        map.insert(key.to_string(), now);
                        None
                    }
                }
            } else {
                map.insert(key.to_string(), now);
                None
            }
        };

        if let Some(dur) = sleep_duration {
            tokio::time::sleep(dur).await;
        }
    }
}
