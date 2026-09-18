import React, { ReactNode, useEffect } from 'react';
import './BottomSheet.css';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="md3-bottom-sheet-backdrop" onClick={onClose}>
      <div
        className="md3-bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="md3-bottom-sheet-handle" />
        {title && <div className="md3-bottom-sheet-header">{title}</div>}
        <div className="md3-bottom-sheet-content">{children}</div>
      </div>
    </div>
  );
};
