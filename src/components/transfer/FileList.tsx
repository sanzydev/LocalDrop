import React, { useState, useMemo } from 'react';
import { FileItem } from './FileItem';
import { SharedFile, TransferFile } from '../../types/transfer';
import { Chip } from '../ui/Chip';
import { FolderOpen } from 'lucide-react';
import { getFileCategory } from '../../utils/fileIcons';
import './FileList.css';

interface FileListProps {
  files: (SharedFile | TransferFile)[];
  selectedFileIds?: Set<string>;
  selectable?: boolean;
  onToggleSelect?: (id: string) => void;
  onDownload?: (id: string, name: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
  isQueue?: boolean;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedFileIds,
  selectable = false,
  onToggleSelect,
  onDownload,
  onCancel,
  onRetry,
  onRemove,
  emptyTitle = 'No files shared yet',
  emptySubtitle = 'Add files to start transferring across your local network',
  isQueue = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'document' | 'archive'>('all');

  const filteredFiles = useMemo(() => {
    if (filter === 'all') return files;
    return files.filter((f) => getFileCategory(f.name, (f as any).mimeType || (f as any).type) === filter);
  }, [files, filter]);

  if (files.length === 0) {
    return (
      <div className="md3-file-list-empty">
        <div className="md3-file-list-empty-icon">
          <FolderOpen size={48} strokeWidth={1.5} />
        </div>
        <p className="md3-file-list-empty-title">{emptyTitle}</p>
        <p className="md3-file-list-empty-subtitle">{emptySubtitle}</p>
      </div>
    );
  }

  return (
    <div className="md3-file-list-container">
      {!isQueue && files.length > 3 && (
        <div className="md3-file-list-filters">
          <Chip label="All" selected={filter === 'all'} onClick={() => setFilter('all')} />
          <Chip label="Images" selected={filter === 'image'} onClick={() => setFilter('image')} />
          <Chip label="Videos" selected={filter === 'video'} onClick={() => setFilter('video')} />
          <Chip label="Documents" selected={filter === 'document'} onClick={() => setFilter('document')} />
          <Chip label="Archives" selected={filter === 'archive'} onClick={() => setFilter('archive')} />
        </div>
      )}

      <div className="md3-file-list-items">
        {filteredFiles.map((file) => {
          const isSelected = selectedFileIds ? selectedFileIds.has(file.id) : false;
          const transferFile = file as TransferFile;

          return (
            <FileItem
              key={file.id}
              id={file.id}
              name={file.name}
              size={file.size}
              mimeType={(file as any).mimeType || (file as any).type}
              status={transferFile.status}
              progress={transferFile.progress}
              transferredBytes={transferFile.transferredBytes}
              speed={transferFile.speed}
              eta={transferFile.eta}
              error={transferFile.error}
              selected={isSelected}
              selectable={selectable}
              onToggleSelect={onToggleSelect ? () => onToggleSelect(file.id) : undefined}
              onDownload={onDownload ? () => onDownload(file.id, file.name) : undefined}
              onCancel={onCancel ? () => onCancel(file.id) : undefined}
              onRetry={onRetry ? () => onRetry(file.id) : undefined}
              onRemove={onRemove ? () => onRemove(file.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};
