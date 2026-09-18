import { invoke } from '@tauri-apps/api/core';
import { AppSettings } from '../types/settings';
import { SharedFile, TransferHistoryItem } from '../types/transfer';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

export interface DesktopServerInfo {
  device_name: string;
  ip_address: string;
  port: number;
  pairing_token: string;
  url: string;
  connected_devices: number;
}

export const tauriApi = {
  async getServerInfo(): Promise<DesktopServerInfo> {
    return await invoke<DesktopServerInfo>('get_server_info');
  },

  async getSettings(): Promise<AppSettings> {
    return await invoke<AppSettings>('get_settings');
  },

  async updateSettings(settings: AppSettings): Promise<AppSettings> {
    return await invoke<AppSettings>('update_settings', { newSettings: settings });
  },

  async pickFilesToShare(): Promise<SharedFile[]> {
    return await invoke<SharedFile[]>('pick_files_to_share');
  },

  async addFilePathToShare(filePath: string): Promise<SharedFile> {
    return await invoke<SharedFile>('add_file_path_to_share', { filePath });
  },

  async pickDownloadFolder(): Promise<string | null> {
    return await invoke<string | null>('pick_download_folder');
  },

  async removeSharedFile(fileId: string): Promise<void> {
    return await invoke<void>('remove_shared_file', { fileId });
  },

  async clearSharedFiles(): Promise<void> {
    return await invoke<void>('clear_shared_files');
  },

  async getSharedFiles(): Promise<SharedFile[]> {
    return await invoke<SharedFile[]>('get_shared_files');
  },

  async getTransferHistory(): Promise<TransferHistoryItem[]> {
    const raw = await invoke<Array<{
      id: string;
      file_name: string;
      file_size: number;
      direction: 'sent' | 'received';
      timestamp: number;
      status: 'completed' | 'failed' | 'cancelled';
      saved_path?: string;
    }>>('get_transfer_history');

    return raw.map(item => ({
      id: item.id,
      fileName: item.file_name,
      fileSize: item.file_size,
      direction: item.direction,
      timestamp: item.timestamp,
      status: item.status,
      savedPath: item.saved_path,
    }));
  },

  async clearTransferHistory(): Promise<void> {
    return await invoke<void>('clear_transfer_history');
  },

  async cancelTransfer(transferId: string): Promise<void> {
    return await invoke<void>('cancel_transfer', { transferId });
  },

  async openDownloadFolder(): Promise<void> {
    return await invoke<void>('open_download_folder');
  },

  async openUrl(url: string): Promise<void> {
    if (isTauri()) {
      try {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(url);
        return;
      } catch {}
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  },
};
