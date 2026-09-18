import React from 'react';
import { X, Activity } from 'lucide-react';
import { formatBytes, formatSpeed } from '../../utils/formatters';
import { LinearProgress } from '../ui/ProgressIndicator';
import { Button } from '../ui/Button';
import './TransferProgressCard.css';

interface TransferProgressCardProps {
  activeCount: number;
  totalBytes: number;
  transferredBytes: number;
  speed: number;
  percentage: number;
  onCancelAll?: () => void;
}

export const TransferProgressCard: React.FC<TransferProgressCardProps> = ({
  activeCount,
  totalBytes,
  transferredBytes,
  speed,
  percentage,
  onCancelAll,
}) => {
  if (activeCount === 0) return null;

  return (
    <div className="md3-transfer-progress-card">
      <div className="md3-tpc-header">
        <div className="md3-tpc-title-group">
          <div className="md3-tpc-icon">
            <Activity size={18} />
          </div>
          <div>
            <span className="md3-tpc-title">
              {activeCount} {activeCount === 1 ? 'file transferring' : 'files transferring'}
            </span>
            <span className="md3-tpc-subtitle">
              {`${formatBytes(transferredBytes)} / ${formatBytes(totalBytes)}`}
            </span>
          </div>
        </div>

        <div className="md3-tpc-metrics">
          {speed > 0 && <span className="md3-tpc-speed">{formatSpeed(speed)}</span>}
          <span className="md3-tpc-pct">{percentage}%</span>
          {onCancelAll && (
            <Button
              variant="text"
              icon={<X size={16} />}
              onClick={onCancelAll}
              className="md3-tpc-cancel-btn"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="md3-tpc-progress-bar">
        <LinearProgress value={percentage} />
      </div>
    </div>
  );
};
