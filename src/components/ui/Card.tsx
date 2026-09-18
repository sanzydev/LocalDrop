import React, { HTMLAttributes, ReactNode } from 'react';
import './Card.css';

export type CardVariant = 'elevated' | 'filled' | 'outlined';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'filled',
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`md3-card md3-card-${variant} ${className}`} {...props}>
      {children}
    </div>
  );
};
