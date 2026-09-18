use serde::Serialize;
use std::path::PathBuf;
use tauri::State;

use crate::filesystem::storage::{HistoryManager, HistoryRecord};
use crate::server::routes::AppState;
use crate::settings::config::AppSettings;
use crate::transfer::manager::SharedFileItem;

#[derive(Debug, Serialize)]
pub struct DesktopServerInfo {
    pub device_name: String,
    pub ip_address: String,
    pub port: u16,
    pub pairing_token: String,
    pub url: String,
    pub connected_devices: usize,
}

#[tauri::command]
pub async fn get_server_info(state: State<'_, AppState>) -> Result<DesktopServerInfo, String> {
    let settings = state.settings.read().await;
    let token = state.pairing_token.read().await.clone();
    let url = format!("http://{}:{}/?token={}", state.ip_address, settings.port, token);
    let connected_devices = state.broadcaster.client_count().await;

    Ok(DesktopServerInfo {
        device_name: settings.device_name.clone(),
        ip_address: state.ip_address.clone(),
        port: settings.port,
        pairing_token: token,
        url,
        connected_devices,
    })
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let s = state.settings.read().await;
    Ok(s.clone())
}

#[tauri::command]
pub async fn update_settings(
    new_settings: AppSettings,
    state: State<'_, AppState>,
) -> Result<AppSettings, String> {
    new_settings.save()?;
    let mut s = state.settings.write().await;
    *s = new_settings.clone();
    Ok(new_settings)
}

#[tauri::command]
pub async fn pick_files_to_share(state: State<'_, AppState>) -> Result<Vec<SharedFileItem>, String> {
    let files = rfd::AsyncFileDialog::new()
        .set_title("Select Files to Share")
        .pick_files()
        .await;

    let mut added = Vec::new();
    if let Some(handles) = files {
        for handle in handles {
            let path = handle.path().to_path_buf();
            if let Ok(item) = state.transfer_manager.add_shared_file(path).await {
                added.push(item);
            }
        }
    }

    let all_files = state.transfer_manager.get_shared_files().await;
    state
        .broadcaster
        .broadcast("files_updated", serde_json::json!({ "files": all_files }))
        .await;

    Ok(added)
}

#[tauri::command]
pub async fn add_file_path_to_share(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<SharedFileItem, String> {
    let path = PathBuf::from(file_path);
    let item = state.transfer_manager.add_shared_file(path).await?;
    let all_files = state.transfer_manager.get_shared_files().await;
    state
        .broadcaster
        .broadcast("files_updated", serde_json::json!({ "files": all_files }))
        .await;
    Ok(item)
}

#[tauri::command]
pub async fn pick_download_folder(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let folder = rfd::AsyncFileDialog::new()
        .set_title("Select Download Folder")
        .pick_folder()
        .await;

    if let Some(handle) = folder {
        let path_str = handle.path().to_string_lossy().to_string();
        let mut s = state.settings.write().await;
        s.download_dir = path_str.clone();
        let _ = s.save();
        Ok(Some(path_str))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn remove_shared_file(
    file_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.transfer_manager.remove_shared_file(&file_id).await;
    let all_files = state.transfer_manager.get_shared_files().await;
    state
        .broadcaster
        .broadcast("files_updated", serde_json::json!({ "files": all_files }))
        .await;
    Ok(())
}

#[tauri::command]
pub async fn clear_shared_files(state: State<'_, AppState>) -> Result<(), String> {
    state.transfer_manager.clear_shared_files().await;
    state
        .broadcaster
        .broadcast("files_updated", serde_json::json!({ "files": Vec::<SharedFileItem>::new() }))
        .await;
    Ok(())
}

#[tauri::command]
pub async fn get_shared_files(state: State<'_, AppState>) -> Result<Vec<SharedFileItem>, String> {
    Ok(state.transfer_manager.get_shared_files().await)
}

#[tauri::command]
pub fn get_transfer_history() -> Result<Vec<HistoryRecord>, String> {
    Ok(HistoryManager::load_history())
}

#[tauri::command]
pub fn clear_transfer_history() -> Result<(), String> {
    HistoryManager::clear_history();
    Ok(())
}

#[tauri::command]
pub async fn cancel_transfer(
    transfer_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.transfer_manager.cancel_transfer(&transfer_id).await;
    Ok(())
}

#[tauri::command]
pub async fn open_download_folder(state: State<'_, AppState>) -> Result<(), String> {
    let path_str = {
        let s = state.settings.read().await;
        s.download_dir.clone()
    };
    let path = PathBuf::from(path_str);
    if path.exists() {
        let _ = open::that(path);
    }
    Ok(())
}
