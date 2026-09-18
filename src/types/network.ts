import { TransferStatus } from './transfer';

export interface ServerInfo {
  deviceName: string;
  ipAddress: string;
  port: number;
  pairingToken: string;
  activeTransfers: number;
  totalSharedFiles: number;
  connectedDevices?: number;
  url: string;
}

export interface PublicStatus {
  deviceName: string;
  ipAddress: string;
  port: number;
  requiresAuth: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type WsMessageType =
  | 'init'
  | 'peer_connected'
  | 'peer_disconnected'
  | 'devices_count'
  | 'files_updated'
  | 'transfer_progress'
  | 'transfer_completed'
  | 'transfer_error'
  | 'cancel_transfer'
  | 'ping'
  | 'pong';

export interface WsEvent<T = any> {
  type: WsMessageType | string;
  payload: T;
}

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  payload: T;
}

export interface TransferProgressPayload {
  fileId: string;
  progress: number;
  transferredBytes: number;
  totalBytes: number;
  speed: number;
  eta: number;
  status: TransferStatus;
}
