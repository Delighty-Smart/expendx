import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Clock, HelpCircle, Activity, ChevronDown, ChevronUp, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LifeEnergyData {
  grossSalary: number;
  workHoursPerWeek: number;
  commuteTimePerWeek: number;
  jobCostsCommute: number;
  jobCostsAttire: number;
  jobCostsMeals: number;
  jobCostsDecompression: number;
  jobCostsOther: number;
  passiveMonthlyIncome: number;
  trueHourlyRate: number;
}

export const defaultLifeEnergyData: LifeEnergyData = {
  grossSalary: 3500,
  workHoursPerWeek: 40,
  commuteTimePerWeek: 5,
  jobCostsCommute: 150,
  jobCostsAttire: 50,
  jobCostsMeals: 100,
  jobCostsDecompression: 120,
  jobCostsOther: 50,
  passiveMonthlyIncome: 150,
  trueHourlyRate: 15.63,
};

export const LifeEnergySettings: React.FC = () => {
  const { toast } = useToast();
  const [data, setData] = useState<LifeEnergyData>(() => {
    const saved = localStorage.getItem("lucent_life_energy_data") || localStorage.getItem("expendx_life_energy_data");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultLifeEnergyData;
      }
    }
    return defaultLifeEnergyData;
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Recalculate true hourly wage whenever inputs change (using identical formula as LifeEnergy page)
  const computedNominalRate = (() => {
    const monthlyGross = data.grossSalary;
    const workHoursMonthly = data.workHoursPerWeek * 4.3;
    if (workHoursMonthly <= 0) return 0;
    return monthlyGross / workHoursMonthly;
  })();

  const computedTrueRate = (() => {
    const monthlyGross = data.grossSalary;
    const workHoursMonthly = data.workHoursPerWeek * 4.3;
    const prepHoursMonthly = data.commuteTimePerWeek * 4.3;
    const totalHoursDedicated = workHoursMonthly + prepHoursMonthly;

    const totalMonthlyJobCosts =
      data.jobCostsCommute +
      data.jobCostsAttire +
      data.jobCostsMeals +
      data.jobCostsDecompression +
      data.jobCostsOther;

    const trueMonthlyNet = Math.max(0, monthlyGross - totalMonthlyJobCosts);
    if (totalHoursDedicated <= 0) return 0;
    return trueMonthlyNet / totalHoursDedicated;
  })();

  const handleInputChange = (field: keyof LifeEnergyData, value: number) => {
    setData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    const updatedData = {
      ...data,
      trueHourlyRate: Number(computedTrueRate.toFixed(2)),
    };
    localStorage.setItem("lucent_life_energy_data", JSON.stringify(updatedData));
    localStorage.setItem("expendx_life_energy_data", JSON.stringify(updatedData));
    localStorage.setItem("lucent_true_hourly_rate", updatedData.trueHourlyRate.toString());
    localStorage.setItem("expendx_true_hourly_rate", updatedData.trueHourlyRate.toString());
    
    // Dispatch storage event to sync all listeners globally
    window.dispatchEvent(new Event("storage"));
    
    toast({
      title: "Life Energy Settings Saved!",
      description: `Your computed True Hourly Wage is now configured at $${updatedData.trueHourlyRate.toFixed(2)}/hr.`,
    });
  };

  return (
    <div className="space-y-6 text-foreground">
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <h4 className="font-bold text-sm">True Hourly Wage Summary</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Based on the classic personal finance principle from <em>Your Money or Your Life</em>, your true hourly wage factors in the time and money spent to perform your job.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-background/50 rounded-lg border border-border/40">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Nominal Rate</span>
            <span className="text-lg font-bold font-numeric text-muted-foreground/80">${computedNominalRate.toFixed(2)}<span className="text-xs font-normal text-muted-foreground/60">/hr</span></span>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">True Hourly Rate</span>
            <span className="text-lg font-bold font-numeric text-primary">${computedTrueRate.toFixed(2)}<span className="text-xs font-normal text-primary/80">/hr</span></span>
          </div>
        </div>
        
        {computedTrueRate < computedNominalRate && (
          <p className="text-[10px] text-orange-500 font-semibold bg-orange-500/5 px-2 py-1 rounded">
            ⚠️ Job-related expenses and commute hours decrease your actual hourly wage by {(((computedNominalRate - computedTrueRate) / computedNominalRate) * 100).toFixed(0)}%.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {/* Core Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="grossSalary" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Monthly Salary</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/75" />
              <Input
                id="grossSalary"
                type="number"
                value={data.grossSalary || ""}
                onChange={(e) => handleInputChange("grossSalary", parseFloat(e.target.value) || 0)}
                className="pl-9 h-10 bg-background/50 border-border/50 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workHoursPerWeek" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Work Hours / Week</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/75" />
              <Input
                id="workHoursPerWeek"
                type="number"
                value={data.workHoursPerWeek || ""}
                onChange={(e) => handleInputChange("workHoursPerWeek", parseFloat(e.target.value) || 0)}
                className="pl-9 h-10 bg-background/50 border-border/50 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Commute Time Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="commuteTimePerWeek" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Commute Time / Week (Hours)</Label>
            <Input
              id="commuteTimePerWeek"
              type="number"
              value={data.commuteTimePerWeek || ""}
              onChange={(e) => handleInputChange("commuteTimePerWeek", parseFloat(e.target.value) || 0)}
              className="h-10 bg-background/50 border-border/50 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passiveMonthlyIncome" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Monthly Passive/Investment Income</Label>
            <div className="relative">
              <TrendingUp className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/75" />
              <Input
                id="passiveMonthlyIncome"
                type="number"
                value={data.passiveMonthlyIncome || ""}
                onChange={(e) => handleInputChange("passiveMonthlyIncome", parseFloat(e.target.value) || 0)}
                className="pl-9 h-10 bg-background/50 border-border/50 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Collapsible Job Costs section */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs font-bold text-primary py-2 hover:opacity-85 transition-opacity"
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showAdvanced ? "Hide Job-Related Costs" : "Configure Job-Related Costs"}
        </button>

        {showAdvanced && (
          <div className="space-y-4 border-l-2 border-primary/20 pl-4 py-1 animate-in fade-in slide-in-from-top-1">
            <p className="text-[11px] text-muted-foreground">
              Enter monthly expenses incurred specifically to perform your job:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobCostsCommute" className="text-xs font-bold text-muted-foreground">Monthly Commuting (Fuel, Transit)</Label>
                <Input
                  id="jobCostsCommute"
                  type="number"
                  value={data.jobCostsCommute || ""}
                  onChange={(e) => handleInputChange("jobCostsCommute", parseFloat(e.target.value) || 0)}
                  className="h-9 bg-background/50 border-border/50 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobCostsAttire" className="text-xs font-bold text-muted-foreground">Monthly Work Attire / Dry Cleaning</Label>
                <Input
                  id="jobCostsAttire"
                  type="number"
                  value={data.jobCostsAttire || ""}
                  onChange={(e) => handleInputChange("jobCostsAttire", parseFloat(e.target.value) || 0)}
                  className="h-9 bg-background/50 border-border/50 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobCostsMeals" className="text-xs font-bold text-muted-foreground">Monthly Coffee/Lunch at Work</Label>
                <Input
                  id="jobCostsMeals"
                  type="number"
                  value={data.jobCostsMeals || ""}
                  onChange={(e) => handleInputChange("jobCostsMeals", parseFloat(e.target.value) || 0)}
                  className="h-9 bg-background/50 border-border/50 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobCostsDecompression" className="text-xs font-bold text-muted-foreground">Monthly Stress Relief / Decompression</Label>
                <Input
                  id="jobCostsDecompression"
                  type="number"
                  value={data.jobCostsDecompression || ""}
                  onChange={(e) => handleInputChange("jobCostsDecompression", parseFloat(e.target.value) || 0)}
                  className="h-9 bg-background/50 border-border/50 text-xs"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="jobCostsOther" className="text-xs font-bold text-muted-foreground">Other Monthly Job Expenses</Label>
                <Input
                  id="jobCostsOther"
                  type="number"
                  value={data.jobCostsOther || ""}
                  onChange={(e) => handleInputChange("jobCostsOther", parseFloat(e.target.value) || 0)}
                  className="h-9 bg-background/50 border-border/50 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleSave}
          className="w-full h-11 bg-primary text-primary-foreground font-bold hover:bg-primary/95 transition-all rounded-xl"
        >
          Save & Apply True Wage
        </Button>
      </div>
    </div>
  );
};
