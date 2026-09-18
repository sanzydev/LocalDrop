import { useState, useEffect, useCallback } from 'react';
import {
  QrCode,
  Settings,
  History,
  FolderOpen,
  Send,
  Download,
  Copy,
  Check,
  Smartphone,
  Laptop,
  Users,
  Lock,
  KeyRound,
  ShieldAlert,
  Palette,
} from 'lucide-react';

import { TopAppBar } from './components/ui/TopAppBar';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Snackbar } from './components/ui/Snackbar';
import { DropZone } from './components/transfer/DropZone';
import { FileList } from './components/transfer/FileList';
import { TransferProgressCard } from './components/transfer/TransferProgressCard';
import { BulkActionBar } from './components/transfer/BulkActionBar';
import { PairingModal } from './components/transfer/PairingModal';
import { SettingsDialog } from './components/settings/SettingsDialog';
import { HistoryDialog } from './components/history/HistoryDialog';
import { ConflictDialog } from './components/transfer/ConflictDialog';
import { ThemePickerDialog } from './components/theme/ThemePickerDialog';

import { useTransfer } from './hooks/useTransfer';
import { useResponsive } from './hooks/useResponsive';
import { useDragDrop } from './hooks/useDragDrop';

import { isTauri, tauriApi } from './services/tauriBridge';
import { apiClient } from './services/api';
import { wsService } from './services/websocket';
import { ServerInfo, PublicStatus } from './types/network';
import { QRCodeSVG } from 'qrcode.react';

import './App.css';

export function App() {
  const { isMobile } = useResponsive();

  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<number>(0);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [activeTab, setActiveTab] = useState<'available' | 'queue'>('available');

  const [authRequired, setAuthRequired] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [publicStatus, setPublicStatus] = useState<PublicStatus | null>(null);

  const [pairingOpen, setPairingOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [revealUrl, setRevealUrl] = useState(false);

  const {
    sharedFiles,
    transferQueue,
    selectedFileIds,
    conflict,
    isProcessing,
    overallProgress,
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
  } = useTransfer();

  const handleFilesDropped = useCallback(
    (files: File[]) => {
      addFiles(files);
      setSnackbarMessage(`Added ${files.length} ${files.length === 1 ? 'file' : 'files'} to transfer`);
    },
    [addFiles]
  );

  const { isDragging, dragProps } = useDragDrop(handleFilesDropped);

  useEffect(() => {
    let isMounted = true;
    let retryTimer: any = null;

    async function init(overrideToken?: string) {
      try {
        if (isTauri()) {
          const info = await tauriApi.getServerInfo();
          if (isMounted) {
            setServerInfo({
              deviceName: info.device_name,
              ipAddress: info.ip_address,
              port: info.port,
              pairingToken: info.pairing_token,
              activeTransfers: 0,
              totalSharedFiles: 0,
              url: info.url,
              connectedDevices: info.connected_devices,
            });
            setConnectedDevices(info.connected_devices || 0);
            apiClient.setBaseUrl(`http://localhost:${info.port}`);
            apiClient.setToken(info.pairing_token);
            wsService.connect(`http://localhost:${info.port}`, info.pairing_token);
            setConnectionState('connected');
            setAuthRequired(false);
          }
        } else {
          if (overrideToken) {
            apiClient.setToken(overrideToken);
          }
          const info = await apiClient.getServerInfo();
          if (isMounted) {
            setServerInfo(info);
            setConnectedDevices(info.connectedDevices || 0);
            apiClient.setToken(info.pairingToken);
            wsService.connect(apiClient.getBaseUrl(), info.pairingToken);
            setConnectionState('connected');
            setAuthRequired(false);
            setAuthError(null);
          }
        }
      } catch (err: any) {
        if (!isTauri() && (err?.message === 'UNAUTHORIZED_TOKEN' || err?.message?.includes('401'))) {
          if (isMounted) {
            setAuthRequired(true);
            setConnectionState('disconnected');
            try {
              const status = await apiClient.getPublicStatus();
              if (isMounted) setPublicStatus(status);
            } catch {
            }
          }
          return;
        }

        if (isMounted) {
          setConnectionState('connecting');
          retryTimer = setTimeout(() => init(), 2500);
        }
      }
    }

    init();
    refreshSharedFiles();

    const unsubConn = wsService.on<{ status: string }>('connection_change', (payload) => {
      if (payload.status === 'connected') {
        setConnectionState('connected');
      } else {
        setConnectionState('disconnected');
      }
    });

    let lastPeerCount = -1;

    const unsubDevices = wsService.on<{ connectedCount: number }>('devices_count', (payload) => {
      if (typeof payload?.connectedCount === 'number') {
        setConnectedDevices(payload.connectedCount);
        lastPeerCount = payload.connectedCount;
      }
    });

    const unsubPeer = wsService.on<{ connectedCount?: number }>('peer_connected', (payload) => {
      if (typeof payload?.connectedCount === 'number') {
        const count = payload.connectedCount;
        setConnectedDevices(count);
        if (lastPeerCount !== -1 && count > lastPeerCount) {
          setSnackbarMessage('Device connected');
        }
        lastPeerCount = count;
      }
    });

    const unsubPeerLeft = wsService.on<{ connectedCount?: number }>('peer_disconnected', (payload) => {
      if (typeof payload?.connectedCount === 'number') {
        const count = payload.connectedCount;
        setConnectedDevices(count);
        if (lastPeerCount !== -1 && count < lastPeerCount) {
          setSnackbarMessage('Device disconnected');
        }
        lastPeerCount = count;
      }
    });

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      unsubConn();
      unsubDevices();
      unsubPeer();
      unsubPeerLeft();
    };
  }, [refreshSharedFiles]);

  const handleTokenSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;

    try {
      apiClient.setToken(token);
      const info = await apiClient.getServerInfo(token);
      setServerInfo(info);
      setConnectedDevices(info.connectedDevices || 0);
      wsService.connect(apiClient.getBaseUrl(), info.pairingToken);
      setConnectionState('connected');
      setAuthRequired(false);
      setAuthError(null);
      refreshSharedFiles();
      setSnackbarMessage('Connected & paired successfully!');
    } catch {
      setAuthError('Invalid pairing token. Please enter the token matching the host PC.');
    }
  };

  const handleCopyLink = async () => {
    if (!serverInfo?.url) return;
    try {
      await navigator.clipboard.writeText(serverInfo.url);
      setCopiedLink(true);
      setSnackbarMessage('Local URL copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleOpenFolder = async () => {
    if (isTauri()) {
      await tauriApi.openDownloadFolder();
    }
  };

  const handleCopyToken = async () => {
    if (!serverInfo?.pairingToken) return;
    try {
      await navigator.clipboard.writeText(serverInfo.pairingToken);
      setSnackbarMessage('Pairing token copied to clipboard');
    } catch {}
  };

  const isTauriDesktop = isTauri() || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === 'desktop');
  const activeQueueCount = transferQueue.filter((q) => q.status === 'transferring' || q.status === 'queued').length;

  if (authRequired && !isTauriDesktop) {
    return (
      <div className="localdrop-app">
        <TopAppBar
          navigationIcon={<img src="/favicon.png" alt="LocalDrop" className="localdrop-nav-logo" />}
          title="LocalDrop"
          actions={
            <Button
              variant="icon"
              onClick={() => setThemePickerOpen(true)}
              title="Theme & Colors"
              aria-label="Theme & Colors"
            >
              <Palette size={20} />
            </Button>
          }
        />

        <main className="localdrop-auth-container">
          <Card variant="elevated" className="localdrop-auth-card">
            <div className="localdrop-auth-icon-wrap">
              <Lock size={32} />
            </div>
            <h2 className="localdrop-auth-title">Authentication Required</h2>
            <p className="localdrop-auth-subtitle">
              Connected to host <strong>{publicStatus?.deviceName || 'LocalDrop PC'}</strong>.
              <br />
              Please provide the pairing token shown on the host PC to authorize this device.
            </p>

            <form onSubmit={handleTokenSubmit} className="localdrop-auth-form">
              <div className="localdrop-auth-input-group">
                <input
                  type="text"
                  className="localdrop-auth-input"
                  placeholder="Enter pairing token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  maxLength={64}
                  autoFocus
                />
              </div>

              {authError && (
                <div className="localdrop-auth-error">
                  <ShieldAlert size={14} />
                  <span>{authError}</span>
                </div>
              )}

              <Button
                variant="filled"
                type="submit"
                disabled={!tokenInput.trim()}
                className="localdrop-auth-btn"
              >
                Authorize & Connect
              </Button>
            </form>

            <div className="localdrop-auth-hint">
              <p>Tip: Scan the QR code on your host PC to connect automatically without typing the token.</p>
            </div>
          </Card>
        </main>

        <footer className="localdrop-footer">
          <button
            type="button"
            className="localdrop-footer-link"
            onClick={() => tauriApi.openUrl('https://github.com/sanzydev')}
          >
            Made by <strong>Sanzy Dev</strong>
          </button>
        </footer>

        <ThemePickerDialog open={themePickerOpen} onClose={() => setThemePickerOpen(false)} />

        <Snackbar
          open={!!snackbarMessage}
          message={snackbarMessage}
          onClose={() => setSnackbarMessage(null)}
        />
      </div>
    );
  }

  return (
    <div className="localdrop-app" {...(isTauriDesktop ? dragProps : {})}>
      <TopAppBar
        navigationIcon={<img src="/favicon.png" alt="LocalDrop" className="localdrop-nav-logo" />}
        title="LocalDrop"
        actions={
          <>
            {isTauriDesktop && (
              <Button
                variant="icon"
                onClick={() => setPairingOpen(true)}
                title="Connect Smartphone (QR Code)"
                aria-label="Show QR Code"
              >
                <QrCode size={20} />
              </Button>
            )}

            <Button
              variant="icon"
              onClick={() => setHistoryOpen(true)}
              title="Transfer History"
              aria-label="Transfer History"
            >
              <History size={20} />
            </Button>

            {isTauriDesktop && (
              <Button
                variant="icon"
                onClick={() => setSettingsOpen(true)}
                title="Settings"
                aria-label="Settings"
              >
                <Settings size={20} />
              </Button>
            )}

            <Button
              variant="icon"
              onClick={() => setThemePickerOpen(true)}
              title="Theme & Colors"
              aria-label="Theme & Colors"
            >
              <Palette size={20} />
            </Button>
          </>
        }
      />

      <main className={`localdrop-main ${isMobile ? 'mobile' : 'desktop'}`}>
        {!isMobile && isTauriDesktop && (
          <aside className="localdrop-sidebar">
            <Card variant="filled" className="localdrop-device-card">
              <div className="localdrop-device-header">
                <div className="localdrop-device-avatar">
                  <Laptop size={24} />
                </div>
                <div>
                  <h2 className="localdrop-device-name">{serverInfo?.deviceName || 'This PC'}</h2>
                </div>
                <div className={`localdrop-status-indicator ${connectionState}`} title={`Status: ${connectionState}`} />
              </div>

              <div className="localdrop-device-stat-row">
                <div className="localdrop-stat-item">
                  <span className="localdrop-stat-label">Connected Devices</span>
                  <span className="localdrop-stat-badge">
                    <Users size={14} />
                    <strong>{connectedDevices}</strong> {connectedDevices === 1 ? 'peer' : 'peers'}
                  </span>
                </div>
                <div className="localdrop-stat-item token-item">
                  <span className="localdrop-stat-label">Pairing Token</span>
                  <button
                    type="button"
                    className="localdrop-stat-badge token-badge"
                    onClick={handleCopyToken}
                    title={`Pairing Token: ${serverInfo?.pairingToken} (Click to copy)`}
                  >
                    <KeyRound size={12} />
                    <code>
                      {serverInfo?.pairingToken
                        ? `${serverInfo.pairingToken.slice(0, 6)}…${serverInfo.pairingToken.slice(-4)}`
                        : '••••'}
                    </code>
                    <Copy size={11} className="localdrop-token-copy-icon" />
                  </button>
                </div>
              </div>

              <div className="localdrop-sidebar-actions">
                <Button
                  variant="outlined"
                  icon={<FolderOpen size={16} />}
                  onClick={handleOpenFolder}
                  className="localdrop-sidebar-btn"
                >
                  Downloads folder
                </Button>
              </div>
            </Card>

            <Card variant="outlined" className="localdrop-qr-preview-card">
              <div className="localdrop-qr-preview-header">
                <Smartphone size={18} />
                <span>Scan to connect phone</span>
              </div>
              <div className="localdrop-qr-canvas" onClick={() => setPairingOpen(true)}>
                {serverInfo?.url ? (
                  <QRCodeSVG value={serverInfo.url} size={140} level="M" />
                ) : (
                  <div className="localdrop-qr-placeholder">...</div>
                )}
              </div>
              <div className="localdrop-qr-url-row">
                <span
                  className={`localdrop-qr-url-text ${revealUrl ? 'revealed' : 'censored'}`}
                  onClick={() => setRevealUrl((prev) => !prev)}
                  title={revealUrl ? 'Click to hide URL' : 'Click or hover to reveal URL'}
                >
                  {serverInfo?.url}
                </span>
                <button
                  type="button"
                  className="localdrop-copy-icon-btn"
                  onClick={handleCopyLink}
                  title="Copy link"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </Card>
          </aside>
        )}

        <section className="localdrop-content">
          <div className="localdrop-drop-section">
            <DropZone
              isDragging={isDragging}
              onFilesSelected={(files) => addFiles(files)}
              onNativePick={isTauriDesktop ? () => addFiles() : undefined}
              dragProps={dragProps}
              compact={isMobile}
            />
          </div>

          {overallProgress.activeCount > 0 && (
            <TransferProgressCard
              activeCount={overallProgress.activeCount}
              totalBytes={overallProgress.totalBytes}
              transferredBytes={overallProgress.transferredBytes}
              speed={overallProgress.speed}
              percentage={overallProgress.percentage}
            />
          )}

          <div className="localdrop-tabs-bar">
            <button
              type="button"
              className={`localdrop-tab ${activeTab === 'available' ? 'active' : ''}`}
              onClick={() => setActiveTab('available')}
            >
              <Download size={16} />
              <span>Available Files</span>
              {sharedFiles.length > 0 && (
                <span className="localdrop-tab-count">{sharedFiles.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`localdrop-tab ${activeTab === 'queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('queue')}
            >
              <Send size={16} />
              <span>Transfer Queue</span>
              {activeQueueCount > 0 && (
                <span className="localdrop-tab-count active">{activeQueueCount}</span>
              )}
            </button>
          </div>

          <div className="localdrop-file-view">
            {activeTab === 'available' ? (
              <FileList
                files={sharedFiles}
                selectable={true}
                selectedFileIds={selectedFileIds}
                onToggleSelect={toggleSelectFile}
                onDownload={downloadSingleFile}
                onRemove={isTauriDesktop ? removeSharedFile : undefined}
                emptyTitle="No files available to download"
                emptySubtitle={
                  isTauriDesktop
                    ? 'Drag and drop files here to make them available to your phone'
                    : 'Wait for the PC to share files, or use the button above to upload files from this device'
                }
              />
            ) : (
              <FileList
                files={transferQueue}
                isQueue={true}
                onCancel={cancelTransfer}
                onRetry={retryTransfer}
                onRemove={removeFromQueue}
                emptyTitle="No transfer activity"
                emptySubtitle="Files being sent or received will appear here with live speed and progress"
              />
            )}
          </div>
        </section>
      </main>

      <footer className="localdrop-footer">
        <button
          type="button"
          className="localdrop-footer-link"
          onClick={() => tauriApi.openUrl('https://github.com/sanzydev')}
          title="Open Sanzy Dev on GitHub"
        >
          <span>Made by <strong>Sanzy Dev</strong></span>
        </button>
      </footer>

      <BulkActionBar
        selectedCount={selectedFileIds.size}
        totalCount={sharedFiles.length}
        isAllSelected={selectedFileIds.size > 0 && selectedFileIds.size === sharedFiles.length}
        onSelectAll={selectAllFiles}
        onClearSelection={clearSelection}
        onDownloadSelected={downloadSelectedFiles}
        onDeleteSelected={
          isTauriDesktop
            ? () => {
                Array.from(selectedFileIds).forEach(removeSharedFile);
              }
            : undefined
        }
        isDownloading={isProcessing}
      />

      {serverInfo && (
        <PairingModal
          open={pairingOpen}
          onClose={() => setPairingOpen(false)}
          url={serverInfo.url}
          deviceName={serverInfo.deviceName}
        />
      )}

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={(updated) => {
          if (serverInfo) {
            setServerInfo({ ...serverInfo, deviceName: updated.deviceName });
          }
          setSnackbarMessage('Settings saved successfully');
        }}
      />

      <HistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />

      <ConflictDialog
        conflict={conflict}
        onResolve={() => setConflict(null)}
        onClose={() => setConflict(null)}
      />

      <ThemePickerDialog open={themePickerOpen} onClose={() => setThemePickerOpen(false)} />

      <Snackbar
        open={!!snackbarMessage}
        message={snackbarMessage}
        onClose={() => setSnackbarMessage(null)}
      />
    </div>
  );
}
