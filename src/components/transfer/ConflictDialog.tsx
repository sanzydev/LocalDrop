import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { FileConflict, ConflictAction } from '../../types/transfer';
import { formatBytes } from '../../utils/formatters';

interface ConflictDialogProps {
  conflict: FileConflict | null;
  onResolve: (action: ConflictAction) => void;
  onClose: () => void;
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  conflict,
  onResolve,
  onClose,
}) => {
  if (!conflict) return null;

  return (
    <Dialog
      open={!!conflict}
      onClose={onClose}
      icon={<AlertCircle size={36} color="var(--md-sys-color-error)" />}
      title="File Conflict"
      actions={
        <>
          <Button variant="text" onClick={() => onResolve('cancel')}>
            Cancel
          </Button>
          <Button variant="outlined" onClick={() => onResolve('replace')}>
            Replace
          </Button>
          <Button variant="filled" onClick={() => onResolve('keep_both')}>
            Keep both
          </Button>
        </>
      }
    >
      <p style={{ marginBottom: '12px' }}>
        A file named <strong>{conflict.fileName}</strong> ({formatBytes(conflict.fileSize)}) already exists in your download folder.
      </p>
      <p style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '13px' }}>
        • <strong>Replace:</strong> Overwrite the existing file.<br />
        • <strong>Keep both:</strong> Save this file with a numbered suffix (e.g. photo (1).jpg).<br />
        • <strong>Cancel:</strong> Skip this file.
      </p>
    </Dialog>
  );
};
