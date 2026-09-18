import React, { InputHTMLAttributes } from 'react';
import { Check, Minus } from 'lucide-react';
import './Checkbox.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean;
  label?: React.ReactNode;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  indeterminate = false,
  disabled = false,
  label,
  onChange,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? `cb-${Math.random().toString(36).substring(2, 9)}` : undefined);

  return (
    <label className={`md3-checkbox-wrapper ${disabled ? 'disabled' : ''} ${className}`}>
      <span className="md3-checkbox-container">
        <input
          type="checkbox"
          id={inputId}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="md3-checkbox-input"
          {...props}
        />
        <span className={`md3-checkbox-box ${checked ? 'checked' : ''} ${indeterminate ? 'indeterminate' : ''}`}>
          {indeterminate ? (
            <Minus size={14} strokeWidth={3} className="md3-checkbox-icon" />
          ) : checked ? (
            <Check size={14} strokeWidth={3} className="md3-checkbox-icon" />
          ) : null}
        </span>
      </span>
      {label && <span className="md3-checkbox-label">{label}</span>}
    </label>
  );
};
