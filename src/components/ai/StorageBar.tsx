import React from 'react';
import { HardDrive, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface StorageBarProps {
  usedBytes: number;
  totalQuotaGB?: number;
}

export const StorageBar: React.FC<StorageBarProps> = ({ usedBytes, totalQuotaGB = 32 }) => {
  const usedMB = usedBytes / (1024 * 1024);
  const totalMB = totalQuotaGB * 1024;
  const pct = Math.min(100, Math.max(1, (usedMB / totalMB) * 100));

  const formatSize = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="p-4 rounded-2xl bg-bg-surface border border-border-default space-y-2.5 shadow-2xs">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-semibold text-text-primary">
          <HardDrive className="w-4 h-4 text-brand-primary" />
          <span>Local Model Storage</span>
        </div>
        <span className="text-text-secondary font-medium">
          {formatSize(usedMB)} used of {totalQuotaGB} GB
        </span>
      </div>

      <div className="h-2 w-full bg-border-default/60 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>

      <p className="text-[11px] text-text-secondary">
        All installed models run 100% offline directly on your device CPU/GPU.
      </p>
    </div>
  );
};
