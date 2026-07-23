
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Wallet, Target, Shield, ChevronRight, Zap, TrendingUp, Lock } from "lucide-react";
import { ButtonLoading } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";

interface OnboardingProps {
  onComplete: () => Promise<void>;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = [
    {
      icon: <div className="p-4 bg-muted/40 rounded-full flex items-center justify-center">
        <Wallet className="w-12 h-12 text-primary" strokeWidth={1.5} />
      </div>,
      title: "Trace expenditure flows",
      description: "Automatically log and categorize card alerts, SMS and cash payouts. Understand exactly where resources flow without tracking manually.",
      gradient: "from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/5",
      accent: "text-primary"
    },
    {
      icon: <div className="p-4 bg-muted/40 rounded-full flex items-center justify-center">
        <Target className="w-12 h-12 text-primary" strokeWidth={1.5} />
      </div>,
      title: "Set custom milestones",
      description: "Define boundaries for dynamic budget limits. Keep track of saving goals, investments and purchase goals visually.",
      gradient: "from-secondary/10 to-secondary/5 dark:from-secondary/20 dark:to-secondary/5",
      accent: "text-secondary"
    },
    {
      icon: <div className="p-4 bg-muted/40 rounded-full flex items-center justify-center">
        <Shield className="w-12 h-12 text-primary" strokeWidth={1.5} />
      </div>,
      title: "Decentralized offline core",
      description: "Maintain absolute control over your ledger. Fully offline capable local vault syncs securely when connectivity is available.",
      gradient: "from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/5",
      accent: "text-blue-500"
    }
  ];

  const handleNext = async () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      setIsProcessing(true);
      try {
        toast({
          title: "Welcome to Lucent! 🎉",
          description: "You're all set to master your finances.",
        });
        await onComplete();
      } catch (error) {
        console.error("Error completing onboarding:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSkip = async () => {
    setIsProcessing(true);
    try {
      await onComplete();
    } catch (error) {
      console.error("Error skipping onboarding:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-pt">
      {/* Background decoration with more vibrant blur */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 dark:bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/10 dark:bg-secondary/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <Card className="relative w-full max-w-[340px] border-0 bg-transparent shadow-none overflow-hidden rounded-[32px] select-none">
        <CardHeader className="text-center pb-2 pt-2">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/lucent-header-dark.png"
              alt="Lucent"
              className="h-6 object-contain"
            />
          </div>

          {/* Progress indicators - minimal thin dashes */}
          <div className="flex justify-center space-x-2.5 mb-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all duration-300 ${index === activeStep
                  ? "w-8 bg-foreground"
                  : "w-2 bg-muted-foreground/30"
                  }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-4">
          <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
            <div className="mb-8 scale-105 transition-transform duration-500">
              {steps[activeStep].icon}
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
              {steps[activeStep].title}
            </h2>

            <p className="text-muted-foreground text-sm leading-relaxed max-w-[95%] mx-auto">
              {steps[activeStep].description}
            </p>
          </div>

          {/* Action buttons - clean pill buttons */}
          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={handleNext}
              disabled={isProcessing}
              className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-semibold text-sm rounded-full transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <ButtonLoading
                isLoading={isProcessing}
                loadingText="Wait..."
              >
                <>
                  {activeStep < steps.length - 1 ? "Keep going" : "Start My Journey"}
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              </ButtonLoading>
            </Button>

            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isProcessing}
              className="w-full h-10 text-muted-foreground/80 hover:text-foreground hover:bg-transparent transition-colors rounded-full text-xs font-semibold"
            >
              Skip and log in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
