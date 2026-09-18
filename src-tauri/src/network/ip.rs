use local_ip_address::list_afinet_netifas;
use std::net::{IpAddr, Ipv4Addr};

pub fn get_local_lan_ip() -> Option<Ipv4Addr> {
    if let Ok(interfaces) = list_afinet_netifas() {
        for (name, ip) in &interfaces {
            if let IpAddr::V4(ipv4) = ip {
                if !ipv4.is_loopback() && !ipv4.is_link_local() {
                    let octets = ipv4.octets();
                    if octets[0] == 192 && octets[1] == 168 {
                        let name_lower = name.to_lowercase();
                        if !name_lower.contains("vethernet")
                            && !name_lower.contains("docker")
                            && !name_lower.contains("virtual")
                            && !name_lower.contains("vmware")
                        {
                            return Some(*ipv4);
                        }
                    }
                }
            }
        }

        for (name, ip) in &interfaces {
            if let IpAddr::V4(ipv4) = ip {
                if !ipv4.is_loopback() && !ipv4.is_link_local() {
                    let octets = ipv4.octets();
                    let is_private = (octets[0] == 10)
                        || (octets[0] == 172 && (16..=31).contains(&octets[1]))
                        || (octets[0] == 192 && octets[1] == 168);

                    let name_lower = name.to_lowercase();
                    if is_private
                        && !name_lower.contains("vethernet")
                        && !name_lower.contains("docker")
                        && !name_lower.contains("virtual")
                        && !name_lower.contains("vmware")
                    {
                        return Some(*ipv4);
                    }
                }
            }
        }

        for (_name, ip) in &interfaces {
            if let IpAddr::V4(ipv4) = ip {
                if !ipv4.is_loopback() && !ipv4.is_link_local() {
                    return Some(*ipv4);
                }
            }
        }
    }
    if let Ok(IpAddr::V4(ipv4)) = local_ip_address::local_ip() {
        if !ipv4.is_loopback() {
            return Some(ipv4);
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_print_local_ip() {
        let ip = get_local_lan_ip();
        println!("Detected LAN IP: {:?}", ip);
        assert!(ip.is_some());
    }
}
