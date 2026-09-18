import React, { ReactNode, useEffect, useRef } from 'react';
import './Dialog.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  maxWidth?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  icon,
  children,
  actions,
  maxWidth = '480px',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="md3-dialog-backdrop" onClick={onClose}>
      <div
        className="md3-dialog-surface"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        ref={dialogRef}
      >
        {icon && <div className="md3-dialog-icon">{icon}</div>}
        {title && <h2 className="md3-dialog-title">{title}</h2>}
        <div className="md3-dialog-content">{children}</div>
        {actions && <div className="md3-dialog-actions">{actions}</div>}
      </div>
    </div>
  );
};
