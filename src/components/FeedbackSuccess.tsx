
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

interface FeedbackSuccessProps {
  onClose: () => void;
}

const FeedbackSuccess = ({ onClose }: FeedbackSuccessProps) => {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-4">
      <Card className="w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">Thank You!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            We appreciate your valuable feedback. Your insights help us improve ExpendX
            and create a better experience for everyone.
          </p>
          <p className="mt-4 text-sm">
            The team will review your feedback and take appropriate action.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center pt-2">
          <Button onClick={onClose}>
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FeedbackSuccess;
