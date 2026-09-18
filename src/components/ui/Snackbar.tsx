import React, { ReactNode, useEffect, useRef } from 'react';
import './Snackbar.css';

interface SnackbarProps {
  open: boolean;
  message: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  duration?: number;
}

export const Snackbar: React.FC<SnackbarProps> = ({
  open,
  message,
  actionLabel,
  onAction,
  onClose,
  duration = 3000,
}) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || duration <= 0) return;
    const timer = setTimeout(() => {
      onCloseRef.current();
    }, duration);
    return () => clearTimeout(timer);
  }, [open, duration, message]);

  if (!open) return null;

  return (
    <div className="md3-snackbar-container" role="status" aria-live="polite">
      <div className="md3-snackbar">
        <span className="md3-snackbar-text">{message}</span>
        {actionLabel && (
          <button
            type="button"
            className="md3-snackbar-action"
            onClick={() => {
              if (onAction) onAction();
              onClose();
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
