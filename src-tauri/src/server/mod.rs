pub mod routes;
pub mod ws;

use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{oneshot, RwLock};

use crate::filesystem::temp::TempManager;
use crate::network::ip::get_local_lan_ip;
use crate::security::token::generate_pairing_token;
use crate::server::routes::{create_router, AppState};
use crate::server::ws::WsBroadcaster;
use crate::settings::config::AppSettings;
use crate::transfer::manager::TransferManager;

pub struct LocalServer {
    shutdown_tx: Option<oneshot::Sender<()>>,
    pub app_state: AppState,
}

impl LocalServer {
    pub async fn start(
        settings: Arc<RwLock<AppSettings>>,
        transfer_manager: Arc<TransferManager>,
        temp_manager: Arc<TempManager>,
        broadcaster: Arc<WsBroadcaster>,
        dist_dir: PathBuf,
    ) -> Result<Self, String> {
        let port = {
            let s = settings.read().await;
            s.port
        };

        let ip = get_local_lan_ip()
            .map(|ip| ip.to_string())
            .unwrap_or_else(|| "127.0.0.1".to_string());

        let token_val = generate_pairing_token();
        let temp_token_path = std::env::temp_dir().join("localdrop_session_token.txt");
        let _ = std::fs::write(&temp_token_path, &token_val);
        println!("LocalDrop Active Pairing Token: {}", token_val);
        let pairing_token = Arc::new(RwLock::new(token_val));

        let app_state = AppState {
            settings: settings.clone(),
            transfer_manager,
            temp_manager,
            broadcaster,
            pairing_token,
            ip_address: ip,
            dist_dir,
        };

        let router = create_router(app_state.clone());

        let mut actual_port = port;
        let mut listener_opt = None;

        for p in port..(port + 20) {
            let addr = SocketAddr::from(([0, 0, 0, 0], p));
            match tokio::net::TcpListener::bind(addr).await {
                Ok(l) => {
                    actual_port = p;
                    listener_opt = Some(l);
                    break;
                }
                Err(e) => {
                    eprintln!("Port {} busy or unavailable ({}), trying next...", p, e);
                }
            }
        }

        let listener = listener_opt.ok_or_else(|| {
            format!("Failed to bind any port between {} and {}", port, port + 20)
        })?;

        if actual_port != port {
            println!("Port {} was busy, bound to port {} instead", port, actual_port);
            let mut s = settings.write().await;
            s.port = actual_port;
        }

        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

        tokio::spawn(async move {
            println!("LocalDrop HTTP server listening on http://0.0.0.0:{}", actual_port);
            let server = axum::serve(listener, router).with_graceful_shutdown(async move {
                match shutdown_rx.await {
                    Ok(()) => {
                        println!("LocalDrop server shutting down gracefully");
                    }
                    Err(_) => {
                        // Sender dropped; keep server alive indefinitely
                        std::future::pending::<()>().await;
                    }
                }
            });
            if let Err(e) = server.await {
                eprintln!("LocalDrop server error: {}", e);
            }
        });

        Ok(Self {
            shutdown_tx: Some(shutdown_tx),
            app_state,
        })
    }

    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}
