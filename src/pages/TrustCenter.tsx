import React from 'react';
import { ShieldCheck, Lock, Eye, Download, Trash2, Smartphone, Cpu, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import DataExportSection from '@/components/DataExportSection';
import DeleteAccountSection from '@/components/DeleteAccountSection';
import { useBiometricLock } from '@/hooks/useBiometricLock';

export const TrustCenter: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-bg-surface border border-border-default text-text-primary shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
              Trust & Privacy Center
            </h1>
            <p className="text-xs text-text-secondary">
              Complete transparency over your financial data and AI permissions.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Security Modules */}
      <div className="space-y-4">
        {/* On-device Privacy Promise */}
        <div className="p-5 rounded-3xl bg-bg-surface border border-border-default space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-extrabold text-text-primary">100% On-Device & Encrypted</h3>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Lucent encrypts your financial transactions locally. When using downloaded AI modules, calculations take place directly on your phone hardware and never leave your device.
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Zero cloud telemetry or data selling</span>
          </div>
        </div>

        {/* Biometric Security */}
        <div className="p-5 rounded-3xl bg-bg-surface border border-border-default space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-brand-primary" />
              <div>
                <h3 className="text-sm font-extrabold text-text-primary">Biometric Lock</h3>
                <p className="text-xs text-text-secondary">Require Fingerprint / FaceID on app resume</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        {/* Data Ownership & Export */}
        <div className="p-5 rounded-3xl bg-bg-surface border border-border-default space-y-4 shadow-xs">
          <h3 className="text-base font-extrabold text-text-primary">Data Ownership & Portability</h3>
          <DataExportSection />
        </div>

        {/* Danger Zone */}
        <div className="p-5 rounded-3xl bg-bg-surface border border-rose-500/20 space-y-4 shadow-xs">
          <h3 className="text-base font-extrabold text-rose-500">Account Deletion</h3>
          <DeleteAccountSection />
        </div>
      </div>
    </div>
  );
};

export default TrustCenter;
