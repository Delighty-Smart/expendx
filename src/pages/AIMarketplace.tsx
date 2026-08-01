import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Download, HardDrive, ShieldCheck, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AVAILABLE_AI_MODULES, type AIModuleCategory } from '@/types/ai-module-types';
import { aiDownloadManager } from '@/services/ai/ai-download-manager';
import { ModuleCard } from '@/components/ai/ModuleCard';
import { StorageBar } from '@/components/ai/StorageBar';

export const AIMarketplace: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<AIModuleCategory | 'all'>('all');
  const [, setTick] = useState(0);

  // Subscribe to download manager updates
  useEffect(() => {
    const unsubscribe = aiDownloadManager.subscribe(() => {
      setTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  const totalUsedBytes = aiDownloadManager.getTotalStorageUsedBytes();

  const filteredModules = AVAILABLE_AI_MODULES.filter(
    m => selectedCategory === 'all' || m.category === selectedCategory
  );

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            className="p-2 rounded-full hover:bg-bg-sidebar-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
              AI Marketplace
            </h1>
            <p className="text-xs text-text-secondary">
              Download 100% on-device AI capabilities. Run offline with zero API cost.
            </p>
          </div>
        </div>
      </div>

      {/* Device Storage Meter */}
      <StorageBar usedBytes={totalUsedBytes} />

      {/* Category Tabs Filter */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 border-b border-border-default/40">
        {[
          { id: 'all', label: 'All Modules' },
          { id: 'chat', label: 'Language & Chat' },
          { id: 'voice', label: 'Voice to Text' },
          { id: 'ocr', label: 'Receipt Scanner' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
              selectedCategory === tab.id
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'bg-bg-surface text-text-secondary hover:text-text-primary border border-border-default/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModules.map((module) => {
          const state = aiDownloadManager.getModuleState(module.id);
          return (
            <ModuleCard
              key={module.id}
              module={module}
              state={state}
              onInstall={(id) => aiDownloadManager.startDownload(id)}
              onUninstall={(id) => aiDownloadManager.uninstallModule(id)}
              onCancel={(id) => aiDownloadManager.cancelDownload(id)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AIMarketplace;
