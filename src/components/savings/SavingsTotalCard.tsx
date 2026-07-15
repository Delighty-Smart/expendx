
import { GlassCard } from "@/components/ui/card";
import { PiggyBank } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface SavingsTotalCardProps {
  totalSavings: number;
}

export function SavingsTotalCard({ totalSavings }: SavingsTotalCardProps) {
  const { formatValue } = useSettings();

  return (
    <GlassCard className="p-6 bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-teal-50/40 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/10 border-green-200/30 dark:border-green-800/30">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 flex items-center justify-center shadow-lg">
          <PiggyBank className="h-8 w-8 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Total Savings</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
            {formatValue(totalSavings)}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
