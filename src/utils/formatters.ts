export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const clampedIndex = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, clampedIndex)).toFixed(dm))} ${sizes[clampedIndex]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0 B/s';
  return `${formatBytes(bytesPerSec, 1)}/s`;
}

export function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '--';
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = Math.round(seconds % 60);
  if (minutes < 60) {
    return `${minutes}m ${remainingSecs}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateFileName(name: string, maxLength = 28): string {
  if (name.length <= maxLength) return name;

  const dotIndex = name.lastIndexOf('.');
  const ext = dotIndex > 0 ? name.substring(dotIndex) : '';
  const base = dotIndex > 0 ? name.substring(0, dotIndex) : name;

  const keepStart = Math.max(4, Math.floor((maxLength - ext.length - 3) * 0.6));
  const keepEnd = Math.max(2, maxLength - ext.length - 3 - keepStart);

  return `${base.substring(0, keepStart)}...${base.substring(base.length - keepEnd)}${ext}`;
}
