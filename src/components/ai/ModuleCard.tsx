import React from 'react';
import { motion } from 'framer-motion';
import { Download, Check, Trash2, Cpu, HardDrive, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AIModuleDefinition, InstalledModuleState } from '@/types/ai-module-types';

interface ModuleCardProps {
  module: AIModuleDefinition;
  state: InstalledModuleState;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  onCancel: (id: string) => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  module,
  state,
  onInstall,
  onUninstall,
  onCancel,
}) => {
  const isInstalled = state.status === 'installed';
  const isDownloading = state.status === 'downloading';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-3xl bg-bg-surface border border-border-default space-y-4 shadow-xs relative overflow-hidden group hover:border-border-strong transition-all"
    >
      {module.isRecommended && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-rose-500 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider shadow-xs">
          Recommended
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-text-primary tracking-tight">{module.name}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-sidebar-hover text-text-secondary border border-border-default font-medium">
              v{module.version}
            </span>
          </div>
          <p className="text-xs text-brand-primary font-semibold mt-0.5">{module.tagline}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-text-secondary leading-relaxed">{module.description}</p>

      {/* Specs Badges (Size, RAM, Engine) */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-sidebar-hover text-text-secondary border border-border-default">
          <HardDrive className="w-3.5 h-3.5 text-text-muted" />
          <span>{module.sizeFormatted}</span>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-sidebar-hover text-text-secondary border border-border-default">
          <Cpu className="w-3.5 h-3.5 text-text-muted" />
          <span>{module.ramRequiredMB} MB RAM</span>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-sidebar-hover text-text-secondary border border-border-default">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{module.engine} Engine</span>
        </div>
      </div>

      {/* Capabilities List */}
      <div className="space-y-1.5 pt-1">
        {module.capabilities.map((cap, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{cap}</span>
          </div>
        ))}
      </div>

      {/* Action Footer Button / Download Progress */}
      <div className="pt-2 border-t border-border-default flex items-center justify-between gap-3">
        {isDownloading ? (
          <div className="w-full space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-text-primary">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
                Downloading...
              </span>
              <span>{state.progressPercent}%</span>
            </div>
            <div className="h-2 w-full bg-border-default rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-primary rounded-full transition-all duration-300"
                style={{ width: `${state.progressPercent}%` }}
              />
            </div>
          </div>
        ) : isInstalled ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Check className="w-4 h-4" />
              <span>Installed & Ready</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUninstall(module.id)}
              className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => onInstall(module.id)}
            className="w-full h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-xs hover:opacity-90 transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download ({module.sizeFormatted})
          </Button>
        )}
      </div>
    </motion.div>
  );
};
