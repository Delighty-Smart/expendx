
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Wallet, PieChart, Cloud, Shield, ChevronRight } from "lucide-react";

interface OnboardingProps {
  onComplete: () => Promise<void>;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const steps = [
    {
      icon: <Wallet className="w-16 h-16 text-primary" />,
      title: "💸 Track Every Naira",
      description: "Easily monitor your income, expenses, and savings in one smart dashboard.",
      gradient: "from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10"
    },
    {
      icon: <PieChart className="w-16 h-16 text-secondary" />,
      title: "📊 Smart Budgeting Tools",
      description: "Set monthly budgets, get spending alerts, and stay in control of your finances.",
      gradient: "from-secondary/10 to-secondary/5 dark:from-secondary/20 dark:to-secondary/10"
    },
    {
      icon: <Cloud className="w-16 h-16 text-blue-500" />,
      title: "🌍 Offline or Online, Always On",
      description: "Use the app anywhere — even offline. Syncs securely when you're back online.",
      gradient: "from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/10"
    },
    {
      icon: <Shield className="w-16 h-16 text-green-500" />,
      title: "🔐 Your Data, Fully Secure",
      description: "Your privacy matters. Your data is encrypted and stored safely.",
      gradient: "from-green-500/10 to-green-500/5 dark:from-green-500/20 dark:to-green-500/10"
    }
  ];
  
  const handleNext = async () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      setIsProcessing(true);
      try {
        toast({
          title: "Welcome to ExpendX! 🎉",
          description: "You're all set to start your financial journey.",
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
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/5 dark:bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-lg shadow-2xl border bg-card">
        <CardHeader className="text-center pb-2">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-4 mx-auto shadow-lg">
            <span className="text-xl font-bold text-primary-foreground">E</span>
          </div>
          
          {/* Progress dots */}
          <div className="flex justify-center space-x-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  index <= activeStep ? "bg-primary scale-125" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          {/* Current step content */}
          <div className={`text-center mb-8 p-6 rounded-2xl bg-gradient-to-br ${steps[activeStep].gradient} border border-border/50`}>
            <div className="flex justify-center mb-4">
              {steps[activeStep].icon}
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {steps[activeStep].title}
            </h2>
            
            <p className="text-muted-foreground text-base leading-relaxed">
              {steps[activeStep].description}
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-between items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isProcessing}
              className="px-6 py-3 text-muted-foreground hover:text-foreground transition-colors rounded-xl"
            >
              Skip for now
            </Button>
            
            <Button 
              onClick={handleNext}
              disabled={isProcessing}
              className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  {activeStep < steps.length - 1 ? "Next" : "Get Started"}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          
          {/* Step indicator */}
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Step {activeStep + 1} of {steps.length}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
