use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryRecord {
    pub id: String,
    pub file_name: String,
    pub file_size: u64,
    pub direction: String, // "sent" | "received"
    pub timestamp: i64,
    pub status: String, // "completed" | "failed" | "cancelled"
    pub saved_path: Option<String>,
}

pub struct HistoryManager;

impl HistoryManager {
    fn get_history_file_path() -> PathBuf {
        let base = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("LocalDrop");
        let _ = fs::create_dir_all(&base);
        base.join("history.json")
    }

    pub fn load_history() -> Vec<HistoryRecord> {
        let path = Self::get_history_file_path();
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(records) = serde_json::from_str::<Vec<HistoryRecord>>(&content) {
                    return records;
                }
            }
        }
        Vec::new()
    }

    pub fn add_record(record: HistoryRecord) {
        let mut history = Self::load_history();
        history.insert(0, record);
        if history.len() > 200 {
            history.truncate(200);
        }
        let path = Self::get_history_file_path();
        if let Ok(json) = serde_json::to_string_pretty(&history) {
            let _ = fs::write(path, json);
        }
    }

    pub fn clear_history() {
        let path = Self::get_history_file_path();
        let _ = fs::remove_file(path);
    }
}
