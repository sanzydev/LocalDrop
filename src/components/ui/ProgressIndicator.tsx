import React from 'react';
import './ProgressIndicator.css';

interface LinearProgressProps {
  value?: number;
  indeterminate?: boolean;
  className?: string;
}

export const LinearProgress: React.FC<LinearProgressProps> = ({
  value = 0,
  indeterminate = false,
  className = '',
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(clampedValue)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`md3-linear-progress ${indeterminate ? 'indeterminate' : ''} ${className}`}
    >
      <div className="md3-linear-progress-track" />
      <div
        className="md3-linear-progress-indicator"
        style={indeterminate ? undefined : { width: `${clampedValue}%` }}
      />
    </div>
  );
};

interface CircularProgressProps {
  value?: number;
  size?: number;
  strokeWidth?: number;
  indeterminate?: boolean;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value = 0,
  size = 36,
  strokeWidth = 4,
  indeterminate = false,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(clampedValue)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`md3-circular-progress ${indeterminate ? 'indeterminate' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="md3-circular-progress-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="md3-circular-progress-indicator"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={indeterminate ? undefined : strokeDashoffset}
        />
      </svg>
    </div>
  );
};
