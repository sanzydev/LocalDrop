pub mod commands;
pub mod filesystem;
pub mod network;
pub mod security;
pub mod server;
pub mod settings;
pub mod transfer;

use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::filesystem::temp::TempManager;
use crate::server::ws::WsBroadcaster;
use crate::server::LocalServer;
use crate::settings::config::AppSettings;
use crate::transfer::manager::TransferManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let rt = tokio::runtime::Runtime::new().expect("Failed to initialize Tokio runtime");

    let settings = Arc::new(RwLock::new(AppSettings::load()));
    let transfer_manager = Arc::new(TransferManager::new());
    let temp_manager = Arc::new(TempManager::new());
    let broadcaster = Arc::new(WsBroadcaster::new());

    let dist_dir = if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        PathBuf::from(manifest_dir).join("../dist")
    } else {
        PathBuf::from("./dist")
    };

    let server_instance = rt.block_on(async {
        LocalServer::start(
            settings.clone(),
            transfer_manager.clone(),
            temp_manager.clone(),
            broadcaster.clone(),
            dist_dir,
        )
        .await
        .expect("Failed to start local LocalDrop HTTP server")
    });

    let app_state = server_instance.app_state.clone();

    Box::leak(Box::new(rt));
    std::mem::forget(server_instance);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    let icon_bytes = include_bytes!("../icons/128x128.png");
                    if let Ok(icon) = tauri::image::Image::from_bytes(icon_bytes) {
                        let _ = window.set_icon(icon);
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_server_info,
            commands::get_settings,
            commands::update_settings,
            commands::pick_files_to_share,
            commands::add_file_path_to_share,
            commands::pick_download_folder,
            commands::remove_shared_file,
            commands::clear_shared_files,
            commands::get_shared_files,
            commands::get_transfer_history,
            commands::clear_transfer_history,
            commands::cancel_transfer,
            commands::open_download_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
