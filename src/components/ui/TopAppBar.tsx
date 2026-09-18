import React, { ReactNode } from 'react';
import './TopAppBar.css';

interface TopAppBarProps {
  title: string;
  subtitle?: ReactNode;
  navigationIcon?: ReactNode;
  actions?: ReactNode;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  subtitle,
  navigationIcon,
  actions,
}) => {
  return (
    <header className="md3-top-app-bar">
      <div className="md3-top-app-bar-leading">
        {navigationIcon && (
          <div className="md3-top-app-bar-nav-icon">{navigationIcon}</div>
        )}
        <div className="md3-top-app-bar-title-group">
          <h1 className="md3-top-app-bar-title">{title}</h1>
          {subtitle && <div className="md3-top-app-bar-subtitle">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="md3-top-app-bar-actions">{actions}</div>}
    </header>
  );
};
