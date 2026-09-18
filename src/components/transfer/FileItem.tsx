import React from 'react';
import { Download, X, RotateCcw, Trash2 } from 'lucide-react';
import { FileIcon } from '../../utils/fileIcons';
import { formatBytes, formatSpeed, formatEta, truncateFileName } from '../../utils/formatters';
import { Checkbox } from '../ui/Checkbox';
import { LinearProgress } from '../ui/ProgressIndicator';
import { Chip } from '../ui/Chip';
import './FileItem.css';

export interface FileItemProps {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
  status?: 'queued' | 'transferring' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  transferredBytes?: number;
  speed?: number;
  eta?: number;
  error?: string;
  selected?: boolean;
  selectable?: boolean;
  onToggleSelect?: () => void;
  onDownload?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onRemove?: () => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  name,
  size,
  mimeType,
  status,
  progress = 0,
  transferredBytes = 0,
  speed = 0,
  eta = 0,
  error,
  selected = false,
  selectable = false,
  onToggleSelect,
  onDownload,
  onCancel,
  onRetry,
  onRemove,
}) => {
  const isTransferring = status === 'transferring';
  const isFailed = status === 'failed';

  return (
    <div className={`md3-file-item ${selected ? 'selected' : ''}`}>
      {selectable && (
        <div className="md3-file-item-select">
          <Checkbox checked={selected} onChange={onToggleSelect} aria-label={`Select ${name}`} />
        </div>
      )}

      <div className="md3-file-item-icon-wrapper">
        <FileIcon name={name} mimeType={mimeType} size={24} className="md3-file-item-icon" />
      </div>

      <div className="md3-file-item-info">
        <div className="md3-file-item-header">
          <span className="md3-file-item-name" title={name}>
            {truncateFileName(name, 36)}
          </span>
          {status && (
            <Chip
              label={
                status === 'transferring'
                  ? `${progress}%`
                  : status.charAt(0).toUpperCase() + status.slice(1)
              }
              className={`md3-file-status-chip status-${status}`}
            />
          )}
        </div>

        <div className="md3-file-item-meta">
          {isTransferring ? (
            <div className="md3-file-item-transfer-details">
              <span>{`${formatBytes(transferredBytes)} / ${formatBytes(size)}`}</span>
              {speed > 0 && <span>• {formatSpeed(speed)}</span>}
              {eta > 0 && <span>• {formatEta(eta)} left</span>}
            </div>
          ) : (
            <span className="md3-file-item-size">{formatBytes(size)}</span>
          )}

          {error && <span className="md3-file-item-error">{error}</span>}
        </div>

        {isTransferring && (
          <div className="md3-file-item-progress">
            <LinearProgress value={progress} />
          </div>
        )}
      </div>

      <div className="md3-file-item-actions">
        {onDownload && (
          <button
            type="button"
            className="md3-file-action-btn"
            onClick={onDownload}
            title="Download file"
            aria-label={`Download ${name}`}
          >
            <Download size={18} />
          </button>
        )}

        {isTransferring && onCancel && (
          <button
            type="button"
            className="md3-file-action-btn"
            onClick={onCancel}
            title="Cancel transfer"
            aria-label={`Cancel transfer for ${name}`}
          >
            <X size={18} />
          </button>
        )}

        {isFailed && onRetry && (
          <button
            type="button"
            className="md3-file-action-btn"
            onClick={onRetry}
            title="Retry transfer"
            aria-label={`Retry transfer for ${name}`}
          >
            <RotateCcw size={18} />
          </button>
        )}

        {onRemove && (
          <button
            type="button"
            className="md3-file-action-btn delete"
            onClick={onRemove}
            title="Remove from list"
            aria-label={`Remove ${name}`}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
