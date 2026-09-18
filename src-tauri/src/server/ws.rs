use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsEvent<T = serde_json::Value> {
    pub r#type: String,
    pub payload: T,
}

pub struct WsBroadcaster {
    clients: Arc<RwLock<HashMap<String, mpsc::UnboundedSender<Message>>>>,
}

impl WsBroadcaster {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn client_count(&self) -> usize {
        let lock = self.clients.read().await;
        lock.len()
    }

    pub async fn broadcast<T: Serialize>(&self, event_type: &str, payload: T) {
        if let Ok(value) = serde_json::to_value(payload) {
            let event = WsEvent {
                r#type: event_type.to_string(),
                payload: value,
            };
            if let Ok(text) = serde_json::to_string(&event) {
                let msg = Message::Text(text.into());
                let lock = self.clients.read().await;
                for tx in lock.values() {
                    let _ = tx.send(msg.clone());
                }
            }
        }
    }

    pub async fn handle_socket(
        self: Arc<Self>,
        socket: WebSocket,
        _client_type: String,
    ) {
        let (mut sender, mut receiver) = socket.split();
        let (tx, mut rx) = mpsc::unbounded_channel::<Message>();
        let client_id = Uuid::new_v4().to_string();

        let connected_count = {
            let mut lock = self.clients.write().await;
            lock.insert(client_id.clone(), tx);
            lock.len()
        };

        // Notify that a peer connected and broadcast updated count
        self.broadcast(
            "peer_connected",
            serde_json::json!({
                "clientId": client_id,
                "connectedCount": connected_count
            }),
        )
        .await;

        self.broadcast(
            "devices_count",
            serde_json::json!({ "connectedCount": connected_count }),
        )
        .await;

        // Task to send messages from channel to websocket client
        let send_task = tokio::spawn(async move {
            while let Some(msg) = rx.recv().await {
                if sender.send(msg).await.is_err() {
                    break;
                }
            }
        });

        // Task to read incoming messages from websocket client
        let broadcaster = self.clone();
        let cid = client_id.clone();
        let recv_task = tokio::spawn(async move {
            while let Some(Ok(msg)) = receiver.next().await {
                if let Message::Text(text) = msg {
                    if let Ok(event) = serde_json::from_str::<WsEvent>(&text) {
                        if event.r#type == "ping" {
                            broadcaster.broadcast("pong", serde_json::json!({})).await;
                        }
                    }
                }
            }
        });

        // Wait for connection to close
        tokio::select! {
            _ = send_task => {},
            _ = recv_task => {},
        }

        // Cleanup client
        let remaining_count = {
            let mut lock = self.clients.write().await;
            lock.remove(&client_id);
            lock.len()
        };

        self.broadcast(
            "peer_disconnected",
            serde_json::json!({
                "clientId": cid,
                "connectedCount": remaining_count
            }),
        )
        .await;

        self.broadcast(
            "devices_count",
            serde_json::json!({ "connectedCount": remaining_count }),
        )
        .await;
    }
}
