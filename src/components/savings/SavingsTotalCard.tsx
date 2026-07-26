
import { GlassCard } from "@/components/ui/card";
import { PiggyBank } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface SavingsTotalCardProps {
  totalSavings: number;
}

export function SavingsTotalCard({ totalSavings }: SavingsTotalCardProps) {
  const { formatValue } = useSettings();

  return (
    <div className="p-6 rounded-[20px] bg-bg-card border border-border-default shadow-[var(--elevation-1)] select-none">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
          <PiggyBank className="h-6 w-6 text-finance-income" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Total Savings</span>
          <span className="text-[32px] font-bold text-text-heading font-numeric leading-tight tracking-tight">
            {formatValue(totalSavings)}
          </span>
        </div>
      </div>
    </div>
  );
}
