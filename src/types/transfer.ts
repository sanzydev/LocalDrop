export type TransferStatus = 'queued' | 'transferring' | 'completed' | 'failed' | 'cancelled';

export type TransferDirection = 'send' | 'receive';

export interface TransferFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  status: TransferStatus;
  progress: number;
  transferredBytes: number;
  speed: number;
  eta: number;
  error?: string;
  blob?: File;
  path?: string;
}

export interface SharedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  path?: string;
  createdAt: number;
}

export interface TransferHistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  direction: 'sent' | 'received';
  timestamp: number;
  status: 'completed' | 'failed' | 'cancelled';
  savedPath?: string;
}

export type ConflictAction = 'replace' | 'keep_both' | 'cancel';

export interface FileConflict {
  id: string;
  fileName: string;
  fileSize: number;
  existingPath: string;
}
