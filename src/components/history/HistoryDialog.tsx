import React, { useState, useEffect, useMemo } from 'react';
import { History as HistoryIcon, ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { TransferHistoryItem } from '../../types/transfer';
import { isTauri, tauriApi } from '../../services/tauriBridge';
import { formatBytes, formatDate, truncateFileName } from '../../utils/formatters';
import './HistoryDialog.css';

interface HistoryDialogProps {
  open: boolean;
  onClose: () => void;
}

export const HistoryDialog: React.FC<HistoryDialogProps> = ({ open, onClose }) => {
  const [history, setHistory] = useState<TransferHistoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  useEffect(() => {
    if (open) {
      if (isTauri()) {
        tauriApi.getTransferHistory().then(setHistory).catch(() => {});
      } else {
        const saved = localStorage.getItem('localdrop_web_history');
        if (saved) {
          try {
            setHistory(JSON.parse(saved));
          } catch {}
        }
      }
    }
  }, [open]);

  const handleClearHistory = async () => {
    if (isTauri()) {
      await tauriApi.clearTransferHistory();
    } else {
      localStorage.removeItem('localdrop_web_history');
    }
    setHistory([]);
  };

  const filteredHistory = useMemo(() => {
    if (filter === 'all') return history;
    return history.filter((item) => item.direction === filter);
  }, [history, filter]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Transfer History"
      icon={<HistoryIcon size={32} />}
      maxWidth="560px"
      actions={
        <>
          {history.length > 0 && (
            <Button
              variant="text"
              icon={<Trash2 size={16} />}
              onClick={handleClearHistory}
              style={{ color: 'var(--md-sys-color-error)', marginRight: 'auto' }}
            >
              Clear history
            </Button>
          )}
          <Button variant="filled" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="md3-history-body">
        <div className="md3-history-filters">
          <Chip label="All" selected={filter === 'all'} onClick={() => setFilter('all')} />
          <Chip label="Sent" selected={filter === 'sent'} onClick={() => setFilter('sent')} />
          <Chip label="Received" selected={filter === 'received'} onClick={() => setFilter('received')} />
        </div>

        {filteredHistory.length === 0 ? (
          <div className="md3-history-empty">
            <p>No transfer history recorded yet.</p>
          </div>
        ) : (
          <div className="md3-history-list">
            {filteredHistory.map((item) => (
              <div key={item.id} className="md3-history-item">
                <div className={`md3-history-icon-wrapper dir-${item.direction}`}>
                  {item.direction === 'sent' ? (
                    <ArrowUpRight size={18} />
                  ) : (
                    <ArrowDownLeft size={18} />
                  )}
                </div>

                <div className="md3-history-info">
                  <span className="md3-history-name" title={item.fileName}>
                    {truncateFileName(item.fileName, 32)}
                  </span>
                  <div className="md3-history-meta">
                    <span>{formatBytes(item.fileSize)}</span>
                    <span>•</span>
                    <span>{formatDate(item.timestamp)}</span>
                    <span>•</span>
                    <span className={`md3-history-status status-${item.status}`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
};
