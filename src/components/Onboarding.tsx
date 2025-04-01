
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  
  const steps = [
    {
      title: "Welcome to ExpendX!",
      description: "Let's set up your profile to get started with budgeting and expense tracking."
    },
    {
      title: "Add your first budget",
      description: "Set up your first budget category to start tracking your expenses."
    },
    {
      title: "Connect your accounts",
      description: "Connect your bank accounts to automatically track transactions."
    }
  ];
  
  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      toast({
        title: "Setup complete!",
        description: "You're all set to start your financial journey."
      });
      onComplete();
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {steps[activeStep].title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 mx-1 rounded-full ${
                  index <= activeStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          
          <p className="text-center text-muted-foreground">
            {steps[activeStep].description}
          </p>
          
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={onComplete}
            >
              Skip
            </Button>
            <Button onClick={handleNext}>
              {activeStep < steps.length - 1 ? "Next" : "Get Started"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
