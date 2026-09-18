import React from 'react';
import { Download, CheckSquare, XSquare, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import './BulkActionBar.css';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDownloadSelected: () => void;
  onDeleteSelected?: () => void;
  isDownloading?: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  isAllSelected,
  onSelectAll,
  onClearSelection,
  onDownloadSelected,
  onDeleteSelected,
  isDownloading = false,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="md3-bulk-action-bar" role="toolbar" aria-label="Bulk actions">
      <div className="md3-bulk-action-info">
        <span className="md3-bulk-selected-count">
          {selectedCount} <span className="md3-bulk-label">selected</span>
        </span>
        <span className="md3-bulk-divider">•</span>
        <button
          type="button"
          className="md3-bulk-text-btn"
          onClick={isAllSelected ? onClearSelection : onSelectAll}
        >
          {isAllSelected ? (
            <>
              <XSquare size={15} /> <span className="md3-bulk-btn-text">Deselect all</span>
            </>
          ) : (
            <>
              <CheckSquare size={15} /> <span className="md3-bulk-btn-text">Select all ({totalCount})</span>
            </>
          )}
        </button>
      </div>

      <div className="md3-bulk-action-buttons">
        <Button
          variant="filled"
          icon={<Download size={16} />}
          onClick={onDownloadSelected}
          loading={isDownloading}
          className="md3-bulk-download-btn"
        >
          <span className="md3-bulk-download-text-desktop">
            Download {selectedCount > 1 ? `(${selectedCount} as ZIP)` : ''}
          </span>
          <span className="md3-bulk-download-text-mobile">
            {selectedCount > 1 ? `ZIP (${selectedCount})` : 'Download'}
          </span>
        </Button>

        {onDeleteSelected && (
          <Button
            variant="tonal"
            icon={<Trash2 size={16} />}
            onClick={onDeleteSelected}
            className="md3-bulk-delete-btn"
          >
            Remove
          </Button>
        )}

        <button
          type="button"
          className="md3-bulk-close-btn"
          onClick={onClearSelection}
          title="Cancel selection"
          aria-label="Clear selection"
        >
          ×
        </button>
      </div>
    </div>
  );
};
