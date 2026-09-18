use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SharedFileItem {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub mime_type: String,
    #[serde(skip_serializing)]
    pub path: PathBuf,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferProgressInfo {
    pub transfer_id: String,
    pub file_id: String,
    pub file_name: String,
    pub total_bytes: u64,
    pub transferred_bytes: u64,
    pub progress: f32,
    pub speed: f64,
    pub eta: u64,
    pub status: String,
    pub error: Option<String>,
}

pub struct ActiveTransfer {
    pub id: String,
    pub file_id: String,
    pub file_name: String,
    pub total_bytes: u64,
    pub transferred_bytes: u64,
    pub start_time: Instant,
    pub last_sample_time: Instant,
    pub last_sample_bytes: u64,
    pub speed: f64,
    pub eta: u64,
    pub status: String,
    pub error: Option<String>,
    pub is_cancelled: Arc<AtomicBool>,
}

pub struct TransferManager {
    shared_files: RwLock<HashMap<String, SharedFileItem>>,
    active_transfers: RwLock<HashMap<String, ActiveTransfer>>,
}

impl TransferManager {
    pub fn new() -> Self {
        Self {
            shared_files: RwLock::new(HashMap::new()),
            active_transfers: RwLock::new(HashMap::new()),
        }
    }

    pub async fn add_shared_file(&self, path: PathBuf) -> Result<SharedFileItem, String> {
        if !path.exists() {
            return Err("File does not exist".to_string());
        }

        let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
        if metadata.is_dir() {
            return Err("Directories are not supported directly".to_string());
        }

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unnamed_file")
            .to_string();

        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        let mime = mime_guess::from_ext(ext).first_or_octet_stream().to_string();

        let item = SharedFileItem {
            id: Uuid::new_v4().to_string(),
            name,
            size: metadata.len(),
            mime_type: mime,
            path,
            created_at: chrono::Utc::now().timestamp_millis(),
        };

        let mut lock = self.shared_files.write().await;
        lock.insert(item.id.clone(), item.clone());
        Ok(item)
    }

    pub async fn remove_shared_file(&self, id: &str) -> Option<SharedFileItem> {
        let mut lock = self.shared_files.write().await;
        lock.remove(id)
    }

    pub async fn clear_shared_files(&self) {
        let mut lock = self.shared_files.write().await;
        lock.clear();
    }

    pub async fn get_shared_files(&self) -> Vec<SharedFileItem> {
        let lock = self.shared_files.read().await;
        lock.values().cloned().collect()
    }

    pub async fn get_shared_file_by_id(&self, id: &str) -> Option<SharedFileItem> {
        let lock = self.shared_files.read().await;
        lock.get(id).cloned()
    }

    pub async fn create_transfer(
        &self,
        file_id: &str,
        file_name: &str,
        total_bytes: u64,
    ) -> (String, Arc<AtomicBool>) {
        let transfer_id = Uuid::new_v4().to_string();
        let cancel_flag = Arc::new(AtomicBool::new(false));
        let now = Instant::now();

        let transfer = ActiveTransfer {
            id: transfer_id.clone(),
            file_id: file_id.to_string(),
            file_name: file_name.to_string(),
            total_bytes,
            transferred_bytes: 0,
            start_time: now,
            last_sample_time: now,
            last_sample_bytes: 0,
            speed: 0.0,
            eta: 0,
            status: "transferring".to_string(),
            error: None,
            is_cancelled: cancel_flag.clone(),
        };

        let mut lock = self.active_transfers.write().await;
        lock.insert(transfer_id.clone(), transfer);

        (transfer_id, cancel_flag)
    }

    pub async fn update_progress(
        &self,
        transfer_id: &str,
        transferred_bytes: u64,
    ) -> Option<TransferProgressInfo> {
        let mut lock = self.active_transfers.write().await;
        let transfer = lock.get_mut(transfer_id)?;

        let now = Instant::now();
        let sample_duration = (now - transfer.last_sample_time).as_secs_f64();

        if sample_duration >= 0.25 {
            let bytes_delta = transferred_bytes.saturating_sub(transfer.last_sample_bytes);
            let instant_speed = bytes_delta as f64 / sample_duration;
            transfer.speed = if transfer.speed == 0.0 {
                instant_speed
            } else {
                transfer.speed * 0.7 + instant_speed * 0.3
            };

            let remaining_bytes = transfer.total_bytes.saturating_sub(transferred_bytes);
            transfer.eta = if transfer.speed > 0.0 {
                (remaining_bytes as f64 / transfer.speed) as u64
            } else {
                0
            };

            transfer.last_sample_time = now;
            transfer.last_sample_bytes = transferred_bytes;
        }

        transfer.transferred_bytes = transferred_bytes;
        let progress = if transfer.total_bytes > 0 {
            ((transferred_bytes as f64 / transfer.total_bytes as f64) * 100.0).min(100.0) as f32
        } else {
            0.0
        };

        Some(TransferProgressInfo {
            transfer_id: transfer.id.clone(),
            file_id: transfer.file_id.clone(),
            file_name: transfer.file_name.clone(),
            total_bytes: transfer.total_bytes,
            transferred_bytes,
            progress,
            speed: transfer.speed,
            eta: transfer.eta,
            status: transfer.status.clone(),
            error: transfer.error.clone(),
        })
    }

    pub async fn cancel_transfer(&self, transfer_id: &str) {
        let mut lock = self.active_transfers.write().await;
        if let Some(t) = lock.get_mut(transfer_id) {
            t.is_cancelled.store(true, Ordering::SeqCst);
            t.status = "cancelled".to_string();
        }
    }

    pub async fn complete_transfer(&self, transfer_id: &str) {
        let mut lock = self.active_transfers.write().await;
        if let Some(t) = lock.get_mut(transfer_id) {
            t.status = "completed".to_string();
            t.transferred_bytes = t.total_bytes;
        }
    }

    pub async fn fail_transfer(&self, transfer_id: &str, error: &str) {
        let mut lock = self.active_transfers.write().await;
        if let Some(t) = lock.get_mut(transfer_id) {
            t.status = "failed".to_string();
            t.error = Some(error.to_string());
        }
    }

    pub async fn remove_transfer(&self, transfer_id: &str) {
        let mut lock = self.active_transfers.write().await;
        lock.remove(transfer_id);
    }
}
