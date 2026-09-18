export interface AppSettings {
  deviceName: string;
  port: number;
  downloadDir: string;
  maxConcurrentTransfers: number;
  askBeforeReplace: boolean;
  keepHistory: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  deviceName: 'LocalDrop-PC',
  port: 3000,
  downloadDir: '',
  maxConcurrentTransfers: 3,
  askBeforeReplace: true,
  keepHistory: true,
};
