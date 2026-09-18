use std::net::IpAddr;
use uuid::Uuid;

pub fn generate_pairing_token() -> String {
    Uuid::new_v4().simple().to_string()
}

pub fn is_private_or_local_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(ipv4) => {
            if ipv4.is_loopback() {
                return true;
            }
            let octets = ipv4.octets();
            if octets[0] == 10 {
                return true;
            }
            if octets[0] == 172 && (16..=31).contains(&octets[1]) {
                return true;
            }
            if octets[0] == 192 && octets[1] == 168 {
                return true;
            }
            if octets[0] == 169 && octets[1] == 254 {
                return true;
            }
            false
        }
        IpAddr::V6(ipv6) => ipv6.is_loopback(),
    }
}
pub fn validate_token(active_token: &str, provided_token: Option<&str>) -> bool {
    if let Some(token) = provided_token {
        token.trim() == active_token.trim()
    } else {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::Ipv4Addr;

    #[test]
    fn test_private_ip_detection() {
        assert!(is_private_or_local_ip(&IpAddr::V4(Ipv4Addr::new(
            127, 0, 0, 1
        ))));
        assert!(is_private_or_local_ip(&IpAddr::V4(Ipv4Addr::new(
            192, 168, 1, 50
        ))));
        assert!(is_private_or_local_ip(&IpAddr::V4(Ipv4Addr::new(
            10, 0, 0, 2
        ))));
        assert!(is_private_or_local_ip(&IpAddr::V4(Ipv4Addr::new(
            172, 20, 0, 1
        ))));
        assert!(!is_private_or_local_ip(&IpAddr::V4(Ipv4Addr::new(
            8, 8, 8, 8
        ))));
    }

    #[test]
    fn test_token_validation() {
        let token = generate_pairing_token();
        assert!(validate_token(&token, Some(&token)));
        assert!(!validate_token(&token, Some("invalid_token")));
        assert!(!validate_token(&token, None));
    }
}
