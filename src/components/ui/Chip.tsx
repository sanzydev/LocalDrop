import React, { ReactNode } from 'react';
import './Chip.css';

interface ChipProps {
  label: ReactNode;
  icon?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
  disabled?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  selected = false,
  onClick,
  onRemove,
  className = '',
  disabled = false,
}) => {
  return (
    <button
      type="button"
      className={`md3-chip ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''} ${className}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {icon && <span className="md3-chip-icon">{icon}</span>}
      <span className="md3-chip-label">{label}</span>
      {onRemove && (
        <span
          className="md3-chip-remove"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onRemove();
          }}
          aria-label="Remove"
        >
          ×
        </span>
      )}
    </button>
  );
};
