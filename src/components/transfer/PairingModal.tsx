import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, QrCode } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import './PairingModal.css';

interface PairingModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  deviceName: string;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  open,
  onClose,
  url,
  deviceName,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Connect Smartphone"
      icon={<QrCode size={32} />}
      actions={
        <Button variant="filled" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="md3-pairing-modal-content">
        <p className="md3-pairing-instructions">
          Connect your phone to the same Wi-Fi network, then scan this QR code with your camera or QR scanner.
        </p>

        <div className="md3-pairing-qr-wrapper">
          <div className="md3-pairing-qr-card">
            {url ? (
              <QRCodeSVG
                value={url}
                size={210}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            ) : (
              <div className="md3-pairing-qr-loading">Generating QR...</div>
            )}
          </div>
          <span className="md3-pairing-device-label">Device: {deviceName}</span>
        </div>

        <div className="md3-pairing-link-box">
          <span className="md3-pairing-url">{url}</span>
          <Button
            variant="tonal"
            icon={copied ? <Check size={16} /> : <Copy size={16} />}
            onClick={handleCopy}
            className="md3-pairing-copy-btn"
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
