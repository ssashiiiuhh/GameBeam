// src-tauri/src/app_state.rs - Thread-safe application state container

use std::sync::Mutex;
use crate::poller::RequestGovernor;
use crate::providers::{BaseEspnProvider, MlbStatsProvider};

pub struct AppState {
    pub governor: RequestGovernor,
    pub espn: BaseEspnProvider,
    pub mlb: MlbStatsProvider,
    pub pinned_match: Mutex<Option<String>>,
    pub is_click_through: Mutex<bool>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            governor: RequestGovernor::new(),
            espn: BaseEspnProvider::new(),
            mlb: MlbStatsProvider::new(),
            pinned_match: Mutex::new(None),
            is_click_through: Mutex::new(false),
        }
    }
}
