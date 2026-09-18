import { useState, useEffect, useCallback, useRef } from 'react';
import { SharedFile, TransferFile, FileConflict } from '../types/transfer';
import { isTauri, tauriApi } from '../services/tauriBridge';
import { apiClient } from '../services/api';
import { wsService } from '../services/websocket';
import { TransferProgressPayload } from '../types/network';

export function useTransfer() {
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [transferQueue, setTransferQueue] = useState<TransferFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [conflict, setConflict] = useState<FileConflict | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const transferQueueRef = useRef(transferQueue);
  transferQueueRef.current = transferQueue;

  const refreshSharedFiles = useCallback(async () => {
    try {
      if (isTauri()) {
        const files = await tauriApi.getSharedFiles();
        setSharedFiles(files);
      } else {
        const files = await apiClient.getSharedFiles();
        setSharedFiles(files);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const unsubFiles = wsService.on<{ files: SharedFile[] }>('files_updated', (payload) => {
      if (payload?.files) {
        setSharedFiles(payload.files);
      }
    });

    const unsubProgress = wsService.on<TransferProgressPayload>('transfer_progress', (payload) => {
      const p = payload as any;
      const fileId = p.fileId || p.file_id || '';
      const transferId = p.transferId || p.transfer_id || '';
      const fileName = p.fileName || p.file_name || fileId;
      const totalBytes = p.totalBytes ?? p.total_bytes ?? 0;
      const transferredBytes = p.transferredBytes ?? p.transferred_bytes ?? 0;
      const progress = Math.round(p.progress ?? 0);
      const speed = p.speed ?? 0;
      const eta = p.eta ?? 0;
      const status = p.status || 'transferring';

      setTransferQueue((prev) => {
        const index = prev.findIndex(
          (item) => (fileId && item.id === fileId) || (transferId && item.id === transferId) || item.name === fileName
        );
        if (index >= 0) {
          return prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  status,
                  progress: progress > 0 ? progress : item.progress,
                  transferredBytes: transferredBytes > 0 ? transferredBytes : item.transferredBytes,
                  speed: speed > 0 ? speed : item.speed,
                  eta: eta > 0 ? eta : item.eta,
                  size: totalBytes > 0 ? totalBytes : item.size,
                }
              : item
          );
        } else {
          const newItem: TransferFile = {
            id: transferId || fileId || `recv_${Date.now()}`,
            name: fileName,
            size: totalBytes,
            type: 'application/octet-stream',
            status,
            progress,
            transferredBytes,
            speed,
            eta,
          };
          return [newItem, ...prev];
        }
      });
    });

    const unsubComplete = wsService.on<{ transferId?: string; fileName?: string; size?: number }>('transfer_completed', (payload) => {
      const p = payload as any;
      const transferId = p.transferId || p.transfer_id || '';
      const fileName = p.fileName || p.file_name || '';
      const size = p.size || 0;

      setTransferQueue((prev) => {
        const index = prev.findIndex(
          (item) => (transferId && item.id === transferId) || (fileName && item.name === fileName)
        );
        if (index >= 0) {
          return prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  status: 'completed',
                  progress: 100,
                  speed: 0,
                  eta: 0,
                  transferredBytes: size > 0 ? size : item.size,
                }
              : item
          );
        } else {
          const newItem: TransferFile = {
            id: transferId || `comp_${Date.now()}`,
            name: fileName,
            size,
            type: 'application/octet-stream',
            status: 'completed',
            progress: 100,
            transferredBytes: size,
            speed: 0,
            eta: 0,
          };
          return [newItem, ...prev];
        }
      });
      refreshSharedFiles();
    });

    return () => {
      unsubFiles();
      unsubProgress();
      unsubComplete();
    };
  }, [refreshSharedFiles]);

  const toggleSelectFile = useCallback((fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const selectAllFiles = useCallback(() => {
    setSelectedFileIds(new Set(sharedFiles.map((f) => f.id)));
  }, [sharedFiles]);

  const clearSelection = useCallback(() => {
    setSelectedFileIds(new Set());
  }, []);

  const addFiles = useCallback(
    async (filesOrList?: FileList | File[]) => {
      setIsProcessing(true);
      try {
        if (isTauri() && !filesOrList) {
          const added = await tauriApi.pickFilesToShare();
          if (added.length > 0) {
            await refreshSharedFiles();
          }
        } else if (filesOrList && filesOrList.length > 0) {
          const fileArray = Array.from(filesOrList);

          const newQueueItems: TransferFile[] = fileArray.map((file) => ({
            id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            lastModified: file.lastModified,
            status: 'queued',
            progress: 0,
            transferredBytes: 0,
            speed: 0,
            eta: 0,
            blob: file,
          }));

          setTransferQueue((prev) => [...newQueueItems, ...prev]);

          for (const item of newQueueItems) {
            if (!item.blob) continue;

            setTransferQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, status: 'transferring' } : q))
            );

            let lastTime = Date.now();
            let lastLoaded = 0;

            try {
              await apiClient.uploadFile(item.blob, (loaded, total) => {
                const now = Date.now();
                const deltaSec = (now - lastTime) / 1000;
                let speed = 0;
                let eta = 0;

                if (deltaSec >= 0.2) {
                  speed = (loaded - lastLoaded) / deltaSec;
                  const remaining = total - loaded;
                  eta = speed > 0 ? remaining / speed : 0;
                  lastTime = now;
                  lastLoaded = loaded;
                }

                setTransferQueue((prev) =>
                  prev.map((q) =>
                    q.id === item.id
                      ? {
                          ...q,
                          transferredBytes: loaded,
                          progress: Math.round((loaded / total) * 100),
                          speed: speed > 0 ? speed : q.speed,
                          eta: eta > 0 ? eta : q.eta,
                        }
                      : q
                  )
                );
              });

              setTransferQueue((prev) =>
                prev.map((q) =>
                  q.id === item.id
                    ? { ...q, status: 'completed', progress: 100, transferredBytes: item.size, speed: 0, eta: 0 }
                    : q
                )
              );
            } catch (err: any) {
              setTransferQueue((prev) =>
                prev.map((q) =>
                  q.id === item.id ? { ...q, status: 'failed', error: err.message || 'Upload failed' } : q
                )
              );
            }
          }

          await refreshSharedFiles();
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [refreshSharedFiles]
  );

  const removeSharedFile = useCallback(
    async (fileId: string) => {
      if (isTauri()) {
        await tauriApi.removeSharedFile(fileId);
        await refreshSharedFiles();
      }
      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    },
    [refreshSharedFiles]
  );

  const downloadSingleFile = useCallback((fileId: string, fileName: string) => {
    const downloadUrl = apiClient.getDownloadUrl(fileId);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const downloadSelectedFiles = useCallback(async () => {
    const ids = Array.from(selectedFileIds);
    if (ids.length === 0) return;

    if (ids.length === 1) {
      const file = sharedFiles.find((f) => f.id === ids[0]);
      if (file) {
        downloadSingleFile(file.id, file.name);
        return;
      }
    }

    setIsProcessing(true);
    try {
      const blob = await apiClient.downloadZip(ids);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `localdrop_bundle_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFileIds, sharedFiles, downloadSingleFile]);

  const cancelTransfer = useCallback(async (transferId: string) => {
    try {
      if (isTauri()) {
        await tauriApi.cancelTransfer(transferId);
      } else {
        await apiClient.cancelTransfer(transferId);
      }
    } catch {}

    setTransferQueue((prev) =>
      prev.map((item) => (item.id === transferId ? { ...item, status: 'cancelled', speed: 0, eta: 0 } : item))
    );
  }, []);

  const retryTransfer = useCallback(
    async (transferId: string) => {
      const item = transferQueue.find((q) => q.id === transferId);
      if (!item || !item.blob) return;

      setTransferQueue((prev) =>
        prev.map((q) => (q.id === transferId ? { ...q, status: 'queued', progress: 0, error: undefined } : q))
      );

      await addFiles([item.blob]);
    },
    [transferQueue, addFiles]
  );

  const removeFromQueue = useCallback((transferId: string) => {
    setTransferQueue((prev) => prev.filter((item) => item.id !== transferId));
  }, []);

  const activeTransfers = transferQueue.filter((q) => q.status === 'transferring' || q.status === 'queued');
  const totalBytes = activeTransfers.reduce((acc, cur) => acc + cur.size, 0);
  const transferredBytes = activeTransfers.reduce((acc, cur) => acc + cur.transferredBytes, 0);
  const totalSpeed = activeTransfers.reduce((acc, cur) => acc + (cur.speed || 0), 0);
  const overallPercentage = totalBytes > 0 ? Math.round((transferredBytes / totalBytes) * 100) : 0;

  return {
    sharedFiles,
    transferQueue,
    selectedFileIds,
    conflict,
    isProcessing,
    overallProgress: {
      activeCount: activeTransfers.length,
      totalBytes,
      transferredBytes,
      speed: totalSpeed,
      percentage: overallPercentage,
    },
    refreshSharedFiles,
    addFiles,
    removeSharedFile,
    downloadSingleFile,
    downloadSelectedFiles,
    cancelTransfer,
    retryTransfer,
    removeFromQueue,
    toggleSelectFile,
    selectAllFiles,
    clearSelection,
    setConflict,
  };
}
