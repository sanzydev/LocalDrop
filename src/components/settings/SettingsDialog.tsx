import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Folder } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { AppSettings, DEFAULT_SETTINGS } from '../../types/settings';
import { isTauri, tauriApi } from '../../services/tauriBridge';
import './SettingsDialog.css';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: (settings: AppSettings) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (isTauri()) {
        tauriApi.getSettings().then((s) => setSettings(s)).catch(() => {});
      } else {
        const saved = localStorage.getItem('localdrop_web_settings');
        if (saved) {
          try {
            setSettings(JSON.parse(saved));
          } catch {}
        }
      }
    }
  }, [open]);

  const handleBrowseFolder = async () => {
    if (isTauri()) {
      const folder = await tauriApi.pickDownloadFolder();
      if (folder) {
        setSettings((prev) => ({ ...prev, downloadDir: folder }));
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isTauri()) {
        await tauriApi.updateSettings(settings);
      } else {
        localStorage.setItem('localdrop_web_settings', JSON.stringify(settings));
      }
      if (onSave) onSave(settings);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settings"
      icon={<SettingsIcon size={32} />}
      actions={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="filled" onClick={handleSave} loading={isSaving}>
            Save
          </Button>
        </>
      }
    >
      <div className="md3-settings-body">
        <section className="md3-settings-section">
          <h3 className="md3-settings-section-title">General</h3>

          {isTauri() && (
            <div className="md3-settings-field">
              <label className="md3-settings-label">Download location</label>
              <div className="md3-settings-folder-picker">
                <input
                  type="text"
                  readOnly
                  value={settings.downloadDir}
                  className="md3-settings-input"
                  title={settings.downloadDir}
                />
                <Button variant="tonal" icon={<Folder size={16} />} onClick={handleBrowseFolder}>
                  Browse
                </Button>
              </div>
            </div>
          )}

          <div className="md3-settings-field">
            <label className="md3-settings-label">Device name</label>
            <input
              type="text"
              value={settings.deviceName}
              onChange={(e) => setSettings({ ...settings, deviceName: e.target.value })}
              className="md3-settings-input"
              placeholder="e.g. Sanzy-PC"
            />
          </div>
        </section>

        <section className="md3-settings-section">
          <h3 className="md3-settings-section-title">Transfer</h3>

          <div className="md3-settings-field-row">
            <Checkbox
              checked={settings.askBeforeReplace}
              onChange={(e) =>
                setSettings({ ...settings, askBeforeReplace: e.target.checked })
              }
              label="Ask before replacing existing files"
            />
          </div>

          <div className="md3-settings-field-row">
            <Checkbox
              checked={settings.keepHistory}
              onChange={(e) =>
                setSettings({ ...settings, keepHistory: e.target.checked })
              }
              label="Keep local transfer history"
            />
          </div>

          <div className="md3-settings-field">
            <label className="md3-settings-label">Maximum concurrent transfers</label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.maxConcurrentTransfers}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxConcurrentTransfers: parseInt(e.target.value, 10) || 3,
                })
              }
              className="md3-settings-input short"
            />
          </div>
        </section>

        <section className="md3-settings-section">
          <h3 className="md3-settings-section-title">Network</h3>
          <div className="md3-settings-field">
            <label className="md3-settings-label">Local server port</label>
            <input
              type="number"
              min={1024}
              max={65535}
              value={settings.port}
              onChange={(e) =>
                setSettings({ ...settings, port: parseInt(e.target.value, 10) || 3000 })
              }
              className="md3-settings-input short"
            />
            <span className="md3-settings-hint">
              Requires app restart if changed.
            </span>
          </div>
        </section>
      </div>
    </Dialog>
  );
};
