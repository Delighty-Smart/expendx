import React, { useState, useEffect } from 'react';
import { ChevronDown, Sparkles, Zap, Brain, PieChart, Info, Download, CheckCircle2, Cpu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { ChatMode } from '@/types/ai-types';
import { aiDownloadManager } from '@/services/ai/ai-download-manager';
import { useNavigate } from 'react-router-dom';

interface ChatModeSelectorProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  activeModelName?: string;
}

export const ChatModeSelector: React.FC<ChatModeSelectorProps> = ({
  currentMode,
  onModeChange,
  activeModelName = 'Gemini Flash',
}) => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  useEffect(() => {
    return aiDownloadManager.subscribe(() => setTick(prev => prev + 1));
  }, []);

  const smolLmState = aiDownloadManager.getModuleState('smollm2-360m');
  const qwenState = aiDownloadManager.getModuleState('qwen2.5-1.5b');

  const modes: { id: ChatMode; label: string; tag: string; description: string; icon: any; isInstalled: boolean }[] = [
    {
      id: 'quick',
      label: 'Lucent (Fast)',
      tag: 'Built-in',
      description: 'Fast, reliable command assistant for instant app actions — not AI',
      icon: Zap,
      isInstalled: true,
    },
    {
      id: 'cloud',
      label: 'Gemma 4 26B (Cloud)',
      tag: 'OpenRouter Free',
      description: 'Understands natural language • Actions reviewed before saving',
      icon: Sparkles,
      isInstalled: true,
    },
    {
      id: 'nvidia',
      label: 'LLaMA 3.3 70B / DeepSeek R1 (NVIDIA)',
      tag: 'NVIDIA Free',
      description: 'Meta LLaMA 3.3 70B & DeepSeek R1 flagship models via build.nvidia.com',
      icon: Cpu,
      isInstalled: true,
    },
    {
      id: 'coach',
      label: 'SmolLM2 360M (Coach)',
      tag: smolLmState.status === 'installed' ? 'Installed • 240 MB' : 'Not Installed',
      description: '100% offline local language model for conversation & smart budgeting',
      icon: Sparkles,
      isInstalled: smolLmState.status === 'installed',
    },
    {
      id: 'analyst',
      label: 'Qwen 2.5 1.5 B (Analyst)',
      tag: qwenState.status === 'installed' ? 'Installed • 980 MB' : 'Not Installed',
      description: 'Advanced local AI for deep debt planning, forecasting & math',
      icon: Brain,
      isInstalled: qwenState.status === 'installed',
    },
  ];

  const current = modes.find(m => m.id === currentMode) || modes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-surface/80 hover:bg-bg-surface border border-border-default text-text-primary font-semibold text-sm transition-all active:scale-95 shadow-2xs">
          <span>{current.label}</span>
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 max-w-[calc(100vw-2rem)] p-2 bg-bg-surface backdrop-blur-xl border border-border-default text-text-primary rounded-2xl shadow-2xl z-50 space-y-1"
      >
        <div className="px-3 py-2 border-b border-border-default/60 mb-1 flex items-center justify-between">
          <p className="text-xs font-semibold text-text-secondary">Select Intelligence Engine</p>
          <button
            onClick={() => navigate('/ai-marketplace')}
            className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-500 hover:bg-amber-500/20 flex items-center gap-1 active:scale-95 transition-all shadow-xs"
          >
            <Download className="w-3 h-3" />
            <span>Marketplace</span>
          </button>
        </div>
        {modes.map((m) => {
          const Icon = m.icon;
          const isSelected = m.id === currentMode;
          return (
            <DropdownMenuItem
              key={m.id}
              onClick={() => {
                if (!m.isInstalled) {
                  navigate('/ai-marketplace');
                } else {
                  onModeChange(m.id);
                }
              }}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-bg-sidebar-active text-text-primary font-medium'
                  : 'hover:bg-bg-sidebar-hover text-text-secondary'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-500' : 'text-text-secondary'}`} />
                  <span className="text-xs font-semibold truncate">{m.label}</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-md shrink-0 whitespace-nowrap ${
                  m.isInstalled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold' : 'bg-black/5 dark:bg-white/5 text-text-muted'
                }`}>
                  {m.tag}
                </span>
              </div>
              <p className="text-[10px] text-text-muted pl-5 leading-tight line-clamp-2">
                {m.description}
              </p>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
