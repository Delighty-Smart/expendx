
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Home, ArrowRight } from "lucide-react";

interface FeedbackSuccessProps {
  onClose: () => void;
}

const FeedbackSuccess = ({ onClose }: FeedbackSuccessProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-xl mx-auto px-6 text-center animate-fadeIn">
      {/* Decorative Background for Success */}
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-[60px] animate-pulse" />
        <div className="relative h-28 w-28 bg-primary rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-primary/40 animate-float translate-y-[-10px]">
          <Check className="h-14 w-14 text-primary-foreground stroke-[3px]" />
          <div className="absolute -top-2 -right-2 bg-yellow-400 p-2 rounded-full shadow-lg animate-bounce">
            <Sparkles className="h-4 w-4 text-yellow-900" />
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-md mx-auto relative z-10">
        <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
          Feedback Received!
        </h2>

        <p className="text-lg text-muted-foreground leading-relaxed font-medium px-4">
          Thank you for helping us shape the future of <span className="text-primary font-bold">expendX</span>. Your insights are already on their way to our development team.
        </p>

        <div className="glass-card rounded-lg p-6 border border-white/10 bg-muted/20 backdrop-blur-sm">
          <p className="text-sm text-foreground/70 font-medium">
            We value your time and will review your submission within 24 hours. If we need more context, we'll reach out via your profile email.
          </p>
        </div>

        <div className="pt-8 flex flex-col gap-4">
          <Button
            size="lg"
            onClick={onClose}
            className="group h-16 w-full rounded-lg text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
          >
            <span>Back to Dashboard</span>
            <Home className="h-5 w-5 opacity-70 group-hover:scale-110 transition-transform" />
          </Button>

          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center justify-center gap-2 group/btn"
          >
            Stay on this page
            <ArrowRight className="h-4 w-4 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
          </button>
        </div>
      </div>

      {/* Background visual flair */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>
    </div>
  );
};

export default FeedbackSuccess;
