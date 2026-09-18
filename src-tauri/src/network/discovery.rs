use std::net::SocketAddr;

/// Trait defining the LAN discovery provider (mDNS or UDP broadcast)
pub trait DiscoveryService: Send + Sync {
    fn start_advertising(&self, service_name: &str, port: u16) -> Result<(), String>;
    fn stop_advertising(&self) -> Result<(), String>;
    fn discover_peers(&self) -> Result<Vec<DiscoveredPeer>, String>;
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DiscoveredPeer {
    pub device_name: String,
    pub address: SocketAddr,
    pub service_type: String,
}

/// Default placeholder discovery service ready to be wired into mdns-sd or UDP broadcast
pub struct LocalDropDiscovery;

impl DiscoveryService for LocalDropDiscovery {
    fn start_advertising(&self, _service_name: &str, _port: u16) -> Result<(), String> {
        // Prepared hook for mDNS registration (e.g. "_localdrop._tcp.local")
        Ok(())
    }

    fn stop_advertising(&self) -> Result<(), String> {
        Ok(())
    }

    fn discover_peers(&self) -> Result<Vec<DiscoveredPeer>, String> {
        Ok(Vec::new())
    }
}
