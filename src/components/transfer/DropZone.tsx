import React, { useRef } from 'react';
import { UploadCloud, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import './DropZone.css';

interface DropZoneProps {
  isDragging: boolean;
  onFilesSelected: (files: File[]) => void;
  onNativePick?: () => void;
  dragProps: any;
  compact?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  isDragging,
  onFilesSelected,
  onNativePick,
  dragProps,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleButtonClick = () => {
    if (onNativePick) {
      onNativePick();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={`md3-dropzone ${isDragging ? 'is-dragging' : ''} ${compact ? 'compact' : ''}`}
      {...dragProps}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="md3-dropzone-hidden-input"
        onChange={handleInputChange}
      />
      <div className="md3-dropzone-content">
        <div className="md3-dropzone-icon">
          <UploadCloud size={compact ? 28 : 40} strokeWidth={1.75} />
        </div>
        <div className="md3-dropzone-text">
          <p className="md3-dropzone-title">
            {isDragging ? 'Drop files to transfer' : 'Drag & drop files here'}
          </p>
          {!compact && (
            <p className="md3-dropzone-subtitle">or choose files from your device</p>
          )}
        </div>
        <Button
          variant="tonal"
          icon={<Plus size={18} />}
          onClick={handleButtonClick}
          className="md3-dropzone-btn"
        >
          Select files
        </Button>
      </div>
    </div>
  );
};
