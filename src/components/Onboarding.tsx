
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Wallet, Target, Shield, ChevronRight, Zap, TrendingUp, Lock } from "lucide-react";
import { ButtonLoading } from "@/components/ui/loading-state";

interface OnboardingProps {
  onComplete: () => Promise<void>;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = [
    {
      icon: <div className="relative">
        <Wallet className="w-16 h-16 text-primary animate-pulse" />
        <Zap className="w-6 h-6 text-yellow-500 absolute -top-2 -right-2 animate-bounce" />
      </div>,
      title: "🛑 Stop the Money Leak",
      description: "Ever wonder where your salary went by the 15th? expendX tracks every penny automatically so you can regain control and stop overspending today.",
      gradient: "from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10",
      accent: "text-primary"
    },
    {
      icon: <div className="relative">
        <Target className="w-16 h-16 text-secondary" />
        <TrendingUp className="w-6 h-6 text-secondary absolute -top-2 -right-2 animate-pulse" />
      </div>,
      title: "💰 Achieve Your Dream Goals",
      description: "Saving for a house, car, or freedom? Set smart targets and watch your wealth grow. We keep you disciplined so you can reach your big milestones faster.",
      gradient: "from-secondary/20 to-secondary/5 dark:from-secondary/30 dark:to-secondary/10",
      accent: "text-secondary"
    },
    {
      icon: <div className="relative">
        <Shield className="w-16 h-16 text-blue-500" />
        <Lock className="w-6 h-6 text-blue-400 absolute -top-2 -right-2" />
      </div>,
      title: "🛡️ Total Peace of Mind",
      description: "Your financial secrets are yours alone. With military-grade encryption and full offline support, your data stays safe and accessible anywhere on earth.",
      gradient: "from-blue-500/20 to-blue-500/5 dark:from-blue-500/30 dark:to-blue-500/10",
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
          title: "Welcome to expendX! 🎉",
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration with more vibrant blur */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 dark:bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/10 dark:bg-secondary/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <Card className="relative w-full max-w-lg shadow-2xl border-none bg-card/80 backdrop-blur-xl overflow-hidden rounded-[32px]">
        {/* Subtle top border gradient */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${activeStep === 0 ? 'from-primary' : activeStep === 1 ? 'from-secondary' : 'from-blue-500'} to-transparent opacity-50`} />

        <CardHeader className="text-center pb-2 pt-8">
          {/* Logo */}
          <div className="inline-flex items-center justify-center mb-6 mx-auto transform hover:scale-105 transition-transform">
            <img
              src="/app-icon.png"
              alt="ExpendX"
              className="h-14 w-14 object-contain shadow-lg rounded-2xl"
            />
          </div>

          {/* Progress indicators - more modern */}
          <div className="flex justify-center space-x-3 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-500 ${index === activeStep
                    ? "w-8 bg-primary"
                    : index < activeStep
                      ? "w-4 bg-primary/40"
                      : "w-4 bg-muted"
                  }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-10">
          {/* Current step content with smooth transition placeholder */}
          <div className="min-h-[320px] flex flex-col items-center justify-center text-center">
            <div className={`mb-8 p-10 rounded-full bg-gradient-to-br ${steps[activeStep].gradient} border border-white/10 shadow-inner scale-110`}>
              {steps[activeStep].icon}
            </div>

            <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">
              {steps[activeStep].title}
            </h2>

            <p className="text-muted-foreground text-lg leading-relaxed max-w-[90%] mx-auto">
              {steps[activeStep].description}
            </p>
          </div>

          {/* Action buttons - more prominent Skip */}
          <div className="flex flex-col gap-4 mt-8">
            <Button
              onClick={handleNext}
              disabled={isProcessing}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-xl hover:shadow-primary/20 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <ButtonLoading
                isLoading={isProcessing}
                loadingText="Securing your account..."
              >
                <>
                  {activeStep < steps.length - 1 ? "Keep going" : "Start My Journey"}
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              </ButtonLoading>
            </Button>

            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isProcessing}
              className="w-full h-12 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-2xl font-medium"
            >
              Skip and log in
            </Button>
          </div>

          {/* Step indicator footer */}
          <div className="text-center mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              Personal Finance • Powered by AI
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
