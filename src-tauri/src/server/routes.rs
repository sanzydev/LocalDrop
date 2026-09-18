use axum::{
    body::Body,
    extract::{
        ws::{WebSocket, WebSocketUpgrade},
        Multipart, Path, Query, State,
    },
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::sync::RwLock;
use tokio_util::io::ReaderStream;
use tower_http::cors::{Any, CorsLayer};

use crate::filesystem::conflict::{resolve_destination_path, ConflictStrategy};
use crate::filesystem::storage::{HistoryManager, HistoryRecord};
use crate::filesystem::temp::TempManager;
use crate::security::token::validate_token;
use crate::server::ws::WsBroadcaster;
use crate::settings::config::AppSettings;
use crate::transfer::manager::{SharedFileItem, TransferManager};
use crate::transfer::zip::create_zip_archive;

#[derive(Clone)]
pub struct AppState {
    pub settings: Arc<RwLock<AppSettings>>,
    pub transfer_manager: Arc<TransferManager>,
    pub temp_manager: Arc<TempManager>,
    pub broadcaster: Arc<WsBroadcaster>,
    pub pairing_token: Arc<RwLock<String>>,
    pub ip_address: String,
    pub dist_dir: PathBuf,
}

#[derive(Debug, Deserialize, Default)]
#[serde(default)]
pub struct AuthQuery {
    pub token: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfoResponse {
    pub device_name: String,
    pub ip_address: String,
    pub port: u16,
    pub pairing_token: String,
    pub active_transfers: usize,
    pub connected_devices: usize,
    pub total_shared_files: usize,
    pub url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicStatusResponse {
    pub device_name: String,
    pub ip_address: String,
    pub port: u16,
    pub requires_auth: bool,
}

#[derive(Debug, Deserialize)]
pub struct BulkDownloadRequest {
    pub file_ids: Vec<String>,
}

pub fn create_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/api/status", get(get_public_status))
        .route("/api/dev-token", get(get_dev_token))
        .route("/api/info", get(get_server_info))
        .route("/api/files", get(get_shared_files_list))
        .route("/api/upload", post(handle_streaming_upload))
        .route("/api/download/{id}", get(handle_download_file))
        .route("/api/download-zip", post(handle_bulk_download_zip))
        .route("/api/cancel/{id}", post(handle_cancel_transfer))
        .route("/ws", get(ws_endpoint))
        .fallback(static_file_handler)
        .layer(cors)
        .with_state(state)
}

async fn get_dev_token(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> (StatusCode, String) {
    if let Some(host) = headers.get(header::HOST) {
        if let Ok(host_str) = host.to_str() {
            if host_str.starts_with("localhost") || host_str.starts_with("127.0.0.1") {
                let token = state.pairing_token.read().await.clone();
                return (StatusCode::OK, token);
            }
        }
    }
    (StatusCode::FORBIDDEN, "Forbidden: Local host only".to_string())
}

async fn check_auth(state: &AppState, headers: &HeaderMap, query: &AuthQuery) -> bool {
    let current_token = state.pairing_token.read().await.clone();

    // 1. Check Query parameter
    if let Some(ref t) = query.token {
        if !t.is_empty() && validate_token(&current_token, Some(t)) {
            return true;
        }
    }

    // 2. Check Authorization header: Bearer <token>
    if let Some(auth_header) = headers.get(header::AUTHORIZATION) {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                if validate_token(&current_token, Some(token)) {
                    return true;
                }
            }
        }
    }

    // 3. Check X-Pairing-Token header
    if let Some(token_header) = headers.get("x-pairing-token") {
        if let Ok(token_str) = token_header.to_str() {
            if validate_token(&current_token, Some(token_str)) {
                return true;
            }
        }
    }

    false
}

async fn get_public_status(
    State(state): State<AppState>,
) -> Json<PublicStatusResponse> {
    let settings = state.settings.read().await;
    Json(PublicStatusResponse {
        device_name: settings.device_name.clone(),
        ip_address: state.ip_address.clone(),
        port: settings.port,
        requires_auth: true,
    })
}

async fn get_server_info(
    State(state): State<AppState>,
    Query(query): Query<AuthQuery>,
    headers: HeaderMap,
) -> Result<Json<ServerInfoResponse>, StatusCode> {
    // Strictly require matching pairing token
    if !check_auth(&state, &headers, &query).await {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let settings = state.settings.read().await;
    let token = state.pairing_token.read().await.clone();
    let shared_files = state.transfer_manager.get_shared_files().await;
    let client_count = state.broadcaster.client_count().await;

    let info = ServerInfoResponse {
        device_name: settings.device_name.clone(),
        ip_address: state.ip_address.clone(),
        port: settings.port,
        pairing_token: token.clone(),
        active_transfers: client_count,
        connected_devices: client_count,
        total_shared_files: shared_files.len(),
        url: format!("http://{}:{}/?token={}", state.ip_address, settings.port, token),
    };

    Ok(Json(info))
}

async fn get_shared_files_list(
    State(state): State<AppState>,
    Query(query): Query<AuthQuery>,
    headers: HeaderMap,
) -> Result<Json<Vec<SharedFileItem>>, StatusCode> {
    if !check_auth(&state, &headers, &query).await {
        return Err(StatusCode::UNAUTHORIZED);
    }
    let files = state.transfer_manager.get_shared_files().await;
    Ok(Json(files))
}

async fn handle_streaming_upload(
    State(state): State<AppState>,
    Query(query): Query<AuthQuery>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if !check_auth(&state, &headers, &query).await {
        return Err((StatusCode::UNAUTHORIZED, "Invalid pairing token".to_string()));
    }

    let download_dir = {
        let settings = state.settings.read().await;
        PathBuf::from(&settings.download_dir)
    };
    let _ = tokio::fs::create_dir_all(&download_dir).await;

    let mut uploaded_files = Vec::new();

    while let Ok(Some(mut field)) = multipart.next_field().await {
        let original_file_name = field
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| format!("file_{}.bin", uuid::Uuid::new_v4()));

        // Create temporary file path
        let (temp_id, temp_path) = state.temp_manager.create_temp_path(None);
        let mut temp_file = File::create(&temp_path)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let (transfer_id, cancel_flag) = state
            .transfer_manager
            .create_transfer(&temp_id, &original_file_name, 0)
            .await;

        let mut total_transferred: u64 = 0;
        let mut is_cancelled = false;

        while let Ok(Some(chunk)) = field.chunk().await {
            if cancel_flag.load(Ordering::Relaxed) {
                is_cancelled = true;
                break;
            }

            if let Err(e) = temp_file.write_all(&chunk).await {
                let _ = tokio::fs::remove_file(&temp_path).await;
                state.transfer_manager.fail_transfer(&transfer_id, &e.to_string()).await;
                return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
            }

            total_transferred += chunk.len() as u64;

            if let Some(progress) = state
                .transfer_manager
                .update_progress(&transfer_id, total_transferred)
                .await
            {
                state.broadcaster.broadcast("transfer_progress", progress).await;
            }
        }

        if is_cancelled {
            let _ = tokio::fs::remove_file(&temp_path).await;
            state.transfer_manager.cancel_transfer(&transfer_id).await;
            continue;
        }

        // Flush file
        let _ = temp_file.flush().await;
        drop(temp_file);

        // Resolve conflict & move file into download_dir
        let dest_path = resolve_destination_path(
            &download_dir,
            &original_file_name,
            ConflictStrategy::KeepBoth,
        )
        .unwrap_or_else(|| download_dir.join(&original_file_name));

        if let Err(e) = tokio::fs::rename(&temp_path, &dest_path).await {
            // If rename fails across volumes, copy and delete
            if tokio::fs::copy(&temp_path, &dest_path).await.is_ok() {
                let _ = tokio::fs::remove_file(&temp_path).await;
            } else {
                let _ = tokio::fs::remove_file(&temp_path).await;
                state.transfer_manager.fail_transfer(&transfer_id, &e.to_string()).await;
                return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
            }
        }

        state.transfer_manager.complete_transfer(&transfer_id).await;

        let final_name = dest_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(&original_file_name)
            .to_string();

        // Record history
        HistoryManager::add_record(HistoryRecord {
            id: uuid::Uuid::new_v4().to_string(),
            file_name: final_name.clone(),
            file_size: total_transferred,
            direction: "received".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            status: "completed".to_string(),
            saved_path: Some(dest_path.to_string_lossy().to_string()),
        });

        state
            .broadcaster
            .broadcast(
                "transfer_completed",
                serde_json::json!({
                    "transferId": transfer_id,
                    "fileName": final_name,
                    "size": total_transferred,
                }),
            )
            .await;

        uploaded_files.push(final_name);
    }

    Ok((StatusCode::OK, Json(uploaded_files)))
}

async fn handle_download_file(
    State(state): State<AppState>,
    Path(file_id): Path<String>,
    Query(query): Query<AuthQuery>,
    headers: HeaderMap,
) -> Result<Response, StatusCode> {
    if !check_auth(&state, &headers, &query).await {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let shared_file = match state.transfer_manager.get_shared_file_by_id(&file_id).await {
        Some(f) => f,
        None => return Err(StatusCode::NOT_FOUND),
    };

    if !shared_file.path.exists() {
        return Err(StatusCode::NOT_FOUND);
    }

    let file = File::open(&shared_file.path)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    // Encode filename safely for Content-Disposition
    let disposition = format!(
        "attachment; filename=\"{}\"",
        shared_file.name.replace('"', "\\\"")
    );

    let mut response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, &shared_file.mime_type)
        .header(header::CONTENT_DISPOSITION, disposition)
        .header(header::CONTENT_LENGTH, shared_file.size.to_string())
        .body(body)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Record history
    HistoryManager::add_record(HistoryRecord {
        id: uuid::Uuid::new_v4().to_string(),
        file_name: shared_file.name.clone(),
        file_size: shared_file.size,
        direction: "sent".to_string(),
        timestamp: chrono::Utc::now().timestamp_millis(),
        status: "completed".to_string(),
        saved_path: Some(shared_file.path.to_string_lossy().to_string()),
    });

    response.headers_mut().insert(
        header::ACCESS_CONTROL_EXPOSE_HEADERS,
        "Content-Disposition, Content-Length".parse().unwrap(),
    );

    Ok(response)
}

async fn handle_bulk_download_zip(
    State(state): State<AppState>,
    Query(query): Query<AuthQuery>,
    headers: HeaderMap,
    Json(payload): Json<BulkDownloadRequest>,
) -> Result<Response, (StatusCode, String)> {
    if !check_auth(&state, &headers, &query).await {
        return Err((StatusCode::UNAUTHORIZED, "Invalid pairing token".to_string()));
    }

    if payload.file_ids.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "No files selected".to_string()));
    }

    let mut files_to_zip = Vec::new();
    for id in &payload.file_ids {
        if let Some(shared_file) = state.transfer_manager.get_shared_file_by_id(id).await {
            files_to_zip.push((shared_file.name.clone(), shared_file.path.clone()));
        }
    }

    if files_to_zip.is_empty() {
        return Err((StatusCode::NOT_FOUND, "Selected files not found".to_string()));
    }

    let (_zip_id, temp_zip_path) = state.temp_manager.create_temp_path(Some("zip"));

    // Build ZIP archive
    if let Err(e) = create_zip_archive(&files_to_zip, &temp_zip_path) {
        let _ = tokio::fs::remove_file(&temp_zip_path).await;
        return Err((StatusCode::INTERNAL_SERVER_ERROR, e));
    }

    let zip_metadata = tokio::fs::metadata(&temp_zip_path)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let file = File::open(&temp_zip_path)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    let zip_name = format!("localdrop_{}.zip", chrono::Utc::now().format("%Y%m%d_%H%M%S"));
    let disposition = format!("attachment; filename=\"{}\"", zip_name);

    // Spawn background task to clean up temp ZIP after some time
    let cleanup_path = temp_zip_path.clone();
    tokio::spawn(async move {
        // Wait 10 minutes or until finished
        tokio::time::sleep(tokio::time::Duration::from_secs(600)).await;
        let _ = tokio::fs::remove_file(cleanup_path).await;
    });

    let mut response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/zip")
        .header(header::CONTENT_DISPOSITION, disposition)
        .header(header::CONTENT_LENGTH, zip_metadata.len().to_string())
        .body(body)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    response.headers_mut().insert(
        header::ACCESS_CONTROL_EXPOSE_HEADERS,
        "Content-Disposition, Content-Length".parse().unwrap(),
    );

    Ok(response)
}

async fn handle_cancel_transfer(
    State(state): State<AppState>,
    Path(transfer_id): Path<String>,
) -> impl IntoResponse {
    state.transfer_manager.cancel_transfer(&transfer_id).await;
    (StatusCode::OK, Json(serde_json::json!({ "success": true })))
}

async fn ws_endpoint(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
    Query(query): Query<AuthQuery>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if !check_auth(&state, &headers, &query).await {
        return StatusCode::UNAUTHORIZED.into_response();
    }

    let broadcaster = state.broadcaster.clone();
    ws.on_upgrade(move |socket: WebSocket| {
        broadcaster.handle_socket(socket, "client".to_string())
    })
}

async fn static_file_handler(
    State(state): State<AppState>,
    uri: axum::http::Uri,
) -> impl IntoResponse {
    let path_str = uri.path().trim_start_matches('/');
    let target_path = if path_str.is_empty() {
        state.dist_dir.join("index.html")
    } else {
        let candidate = state.dist_dir.join(path_str);
        if candidate.exists() && candidate.is_file() {
            candidate
        } else {
            // SPA fallback to index.html
            state.dist_dir.join("index.html")
        }
    };

    if target_path.exists() {
        if let Ok(content) = tokio::fs::read(&target_path).await {
            let mime = mime_guess::from_path(&target_path)
                .first_or_octet_stream()
                .to_string();
            return (
                StatusCode::OK,
                [(header::CONTENT_TYPE, mime)],
                content,
            )
                .into_response();
        }
    }

    // Minimal fallback web client if dist hasn't been built yet
    let fallback_html = r#"<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>LocalDrop</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px;">
  <h2>LocalDrop Server is Running</h2>
  <p>Please build frontend assets (npm run build) to serve the full web interface.</p>
</body>
</html>"#;

    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/html; charset=utf-8".to_string())],
        fallback_html.as_bytes().to_vec(),
    )
        .into_response()
}
