use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub device_name: String,
    pub port: u16,
    pub download_dir: String,
    pub max_concurrent_transfers: usize,
    pub ask_before_replace: bool,
    pub keep_history: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        let default_download = dirs::download_dir()
            .map(|p| p.join("LocalDrop"))
            .unwrap_or_else(|| PathBuf::from("./downloads"))
            .to_string_lossy()
            .to_string();

        let host_name = hostname_fallback();

        Self {
            device_name: host_name,
            port: 3000,
            download_dir: default_download,
            max_concurrent_transfers: 3,
            ask_before_replace: true,
            keep_history: true,
        }
    }
}

fn hostname_fallback() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "LocalDrop-PC".to_string())
}

impl AppSettings {
    fn get_config_path() -> PathBuf {
        let base = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("LocalDrop");
        let _ = fs::create_dir_all(&base);
        base.join("settings.json")
    }

    pub fn load() -> Self {
        let path = Self::get_config_path();
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(settings) = serde_json::from_str::<AppSettings>(&content) {
                    return settings;
                }
            }
        }
        let default = Self::default();
        let _ = default.save();
        default
    }

    pub fn save(&self) -> Result<(), String> {
        let path = Self::get_config_path();
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(path, json).map_err(|e| e.to_string())
    }
}
