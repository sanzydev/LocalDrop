<p align="center">
  <img src="public/app-icon.svg" width="128" height="128" alt="LocalDrop Logo" />
</p>

<h1 align="center">LocalDrop</h1>

<p align="center">
  A local network file transfer application designed to send and receive files between PCs and mobile devices directly over Wi-Fi without cloud dependencies, accounts, or third-party servers.
</p>

## Overview

LocalDrop operates using a desktop host application built on Tauri and Rust combined with a local web interface built with React, TypeScript, and Material Design 3. When running on a PC, LocalDrop serves a lightweight HTTP server and WebSocket hub over the local area network (LAN). Devices on the same Wi-Fi network can connect via their web browser to exchange files bidirectionally.

## Key Features

- **Bi-directional Local Transfer**: Transfer files from PC to mobile and from mobile to PC without uploading to the internet.
- **Direct Stream Pipeline**: Uses 64 KB chunked streaming to transfer files of arbitrary size with minimal memory footprint.
- **Bulk Transfer & Archive**: Select multiple files to download individually or package on-the-fly into an uncompressed ZIP stream.
- **Real-Time Transfer Metrics**: Displays active transfer speeds, elapsed and remaining time (ETA), and percentage progress via WebSocket events.
- **Queue Management**: Supports simultaneous transfers with pause, cancellation, and retry capabilities.
- **Conflict Resolution**: Intercepts duplicate file arrivals with Replace, Keep Both (incremental renaming), or Cancel actions.
- **Session Security**: Enforces cryptographic pairing tokens and restricts network access strictly to RFC1918 private subnets.
- **Material Design 3 Interface**: Adaptive layout with full support for Light/Dark modes, multiple color palettes, and responsive mobile viewports.

## Security Architecture

1. **Pairing Token Authentication**: Every session generates a random 32-character hexadecimal token. Sensitive API endpoints (`/api/files`, `/api/download/*`, `/api/upload`, and `/ws`) reject requests lacking a valid token with HTTP 401 Unauthorized.
2. **Private Subnet Enforcement**: Incoming connections are verified against private IPv4 subnet definitions (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, and loopback). Requests originating outside local subnets are immediately dropped.
3. **Transient Resource Cleanup**: Temporary ZIP archives and buffer segments are managed by an automated garbage collector that purges expired resources upon completion or connection drop.

## Requirements

- **Node.js**: v18.0.0 or higher
- **Rust**: 1.75.0 or higher
- **Operating System**: Windows 10/11, macOS 11+, or Linux

## Getting Started

### 1. Installation

```bash
git clone https://github.com/sanzydev/LocalDrop.git
cd LocalDrop
npm install
```

### 2. Development

```bash
# Start Vite development server with Tauri desktop window
npm run tauri dev
```

### 3. Production Build

```bash
# Compile web assets and generate native executable installer
npm run tauri build
```

## Testing

```bash
# Run frontend unit tests
npm test

# Run backend Rust test suite
cd src-tauri
cargo test
```

## Network Configuration Note

If mobile devices are unable to access the local server port (default: 3000):
- Verify that both the PC and the mobile device are connected to the same Wi-Fi network and AP isolation is disabled on the router.
- Ensure that the local firewall (e.g., Windows Defender Firewall) permits incoming TCP traffic on the configured port.

## Author

Developed by [Sanzy Dev](https://github.com/sanzydev).

## License

This project is licensed under the MIT License.
