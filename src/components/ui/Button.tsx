import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

export type ButtonVariant = 'filled' | 'outlined' | 'tonal' | 'text' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  iconTrailing?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'filled',
  icon,
  iconTrailing,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      className={`md3-btn md3-btn-${variant} ${loading ? 'loading' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="md3-btn-spinner" aria-hidden="true" />
      ) : (
        icon && <span className="md3-btn-icon">{icon}</span>
      )}
      {children && <span className="md3-btn-label">{children}</span>}
      {!loading && iconTrailing && <span className="md3-btn-icon-trailing">{iconTrailing}</span>}
    </button>
  );
};
