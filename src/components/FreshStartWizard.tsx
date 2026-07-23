import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import { format } from "date-fns";

interface FreshStartWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculatedBalance: number;
}

export const FreshStartWizard: React.FC<FreshStartWizardProps> = ({
  open,
  onOpenChange,
  calculatedBalance,
}) => {
  const { currency, formatValue } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [currentBalanceInput, setCurrentBalanceInput] = useState<string>("");
  const [limitHandling, setLimitHandling] = useState<"reset" | "keep">("reset");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resetWizard = () => {
    setStep(1);
    setCurrentBalanceInput("");
    setLimitHandling("reset");
    setIsSubmitting(false);
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      resetWizard();
    }
    onOpenChange(newOpen);
  };

  const trueCurrentBalance = parseFloat(currentBalanceInput) || 0;
  const adjustmentAmount = trueCurrentBalance - calculatedBalance;

  const handleConfirmFreshStart = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const todayIso = new Date().toISOString();

      // 1. Calculate system adjustment transaction
      const isCredit = adjustmentAmount >= 0;
      const absAmount = Math.abs(adjustmentAmount);

      // Create single automatic adjustment transaction
      if (absAmount > 0.001) {
        await enhancedOfflineManager.addTransactionOffline({
          user_id: user.id,
          date: todayStr,
          amount: absAmount,
          type: isCredit ? "credit" : "debit",
          category: "System-Adjustment",
          description: "Fresh Start Adjustment Balance",
          archived: false,
          is_locked: false,
          is_system_adjustment: true,
          created_at: todayIso,
        });
      }

      // 2. Lock all transactions prior to today (safely fallback if database column is missing)
      if (navigator.onLine) {
        try {
          await supabase
            .from("transactions")
            .update({ is_locked: true })
            .eq("user_id", user.id)
            .lt("date", todayStr);
        } catch (dbError) {
          console.warn("Could not update is_locked on database schema:", dbError);
        }
      }

      // 3. Store fresh start log for chart untracked period & audit
      const freshStartData = {
        user_id: user.id,
        created_at: todayIso,
        date: todayStr,
        old_balance: calculatedBalance,
        new_balance: trueCurrentBalance,
        adjustment_amount: adjustmentAmount,
        limit_option: limitHandling,
      };

      try {
        const stored = localStorage.getItem(`fresh_start_logs_${user.id}`);
        const logs = stored ? JSON.parse(stored) : [];
        logs.push(freshStartData);
        localStorage.setItem(`fresh_start_logs_${user.id}`, JSON.stringify(logs));
      } catch (e) {
        console.error("Local log error:", e);
      }

      // 4. Invalidate queries for instant UI refresh
      queryClient.invalidateQueries({ queryKey: ["enhanced_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["enhanced_budgets"] });

      toast({
        title: "Fresh Start Active! 🚀",
        description: `Your balance is now set to ${currency.symbol}${trueCurrentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`,
      });

      handleClose(false);
    } catch (error: any) {
      console.error("Fresh start error:", error);
      toast({
        title: "Fresh Start Failed",
        description: error.message || "Something went wrong while setting your fresh start.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border/80 shadow-2xl rounded-3xl p-6 overflow-hidden">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Fresh Start • Step {step} of 3</span>
          </div>
          <DialogTitle className="text-xl font-extrabold tracking-tight text-foreground">
            {step === 1 && "Step 1: Set Your Current Balance"}
            {step === 2 && "Step 2: Refresh Your Limits"}
            {step === 3 && "You are ready!"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {step === 1 && "Look at your actual bank accounts or wallet right now. Enter the total amount of money you currently have available."}
            {step === 2 && "How should we handle your spending limits for the rest of this month?"}
            {step === 3 && "Review your fresh start details before confirming your new financial baseline."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* STEP 1: Current Balance */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-balance" className="text-xs font-bold text-foreground">
                  Enter Current Balance ({currency.symbol})
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                    {currency.symbol}
                  </span>
                  <Input
                    id="current-balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={currentBalanceInput}
                    onChange={(e) => setCurrentBalanceInput(e.target.value)}
                    className="pl-9 h-14 text-xl font-bold font-numeric rounded-2xl bg-background/50 border-border focus-visible:ring-primary"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/40 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Your past transactions will be locked and saved safely in your history reports.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Handle Category Limits */}
          {step === 2 && (
            <div className="space-y-4">
              <RadioGroup
                value={limitHandling}
                onValueChange={(val) => setLimitHandling(val as "reset" | "keep")}
                className="space-y-3"
              >
                <div
                  className={`flex items-start space-x-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                    limitHandling === "reset"
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-background/40 border-border/50 hover:bg-accent/10"
                  }`}
                  onClick={() => setLimitHandling("reset")}
                >
                  <RadioGroupItem value="reset" id="reset-option" className="mt-1" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="reset-option" className="font-bold text-sm cursor-pointer text-foreground">
                        Option A: Reset to Full
                      </Label>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      "Give me a clean slate. Reset all my category limits to their full amounts starting today."
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-start space-x-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                    limitHandling === "keep"
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-background/40 border-border/50 hover:bg-accent/10"
                  }`}
                  onClick={() => setLimitHandling("keep")}
                >
                  <RadioGroupItem value="keep" id="keep-option" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="keep-option" className="font-bold text-sm cursor-pointer text-foreground">
                      Option B: Keep Existing
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      "Keep my current spending progress as it is. Just update my total balance."
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* STEP 3: Review & Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">New Starting Balance:</span>
                  <span className="font-bold text-base font-numeric text-emerald-600 dark:text-emerald-400">
                    {currency.symbol}{trueCurrentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Calculated System Adjustment:</span>
                  <span className="font-bold font-numeric text-foreground">
                    {adjustmentAmount >= 0 ? "+" : ""}{currency.symbol}{adjustmentAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Category Limits:</span>
                  <span className="font-semibold text-foreground">
                    {limitHandling === "reset" ? "Reset to Full (Clean Slate)" : "Kept Existing Progress"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    Your transaction history before today will be safely saved as <strong>"Read-Only"</strong> for your trends and reports.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    A system adjustment log will smooth out the gap in your charts.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              className="rounded-xl border-border/60 gap-1 text-xs"
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => {
                if (step === 1 && (!currentBalanceInput || isNaN(parseFloat(currentBalanceInput)))) {
                  toast({
                    title: "Enter a valid balance",
                    description: "Please enter your true current balance to proceed.",
                    variant: "destructive",
                  });
                  return;
                }
                setStep((s) => (s + 1) as 2 | 3);
              }}
              className="rounded-xl gap-1 text-xs font-bold ml-auto"
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleConfirmFreshStart}
              disabled={isSubmitting}
              className="rounded-xl gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white ml-auto"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Fresh Start
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
