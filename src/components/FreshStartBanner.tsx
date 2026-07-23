import React from "react";
import { Sparkles, ArrowRight, CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FreshStartBannerProps {
  onStartFresh: () => void;
  onDismiss?: () => void;
}

export const FreshStartBanner: React.FC<FreshStartBannerProps> = ({
  onStartFresh,
  onDismiss,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-primary/10 to-emerald-500/10 border border-primary/20 p-5 shadow-sm">
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/50 transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-foreground tracking-tight">
              Welcome Back! Let’s Get Back on Track.
            </h3>
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded-full">
              Gap Detected
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            We noticed a gap in your logs. Don't worry about entering past missing expenses—let’s start fresh today without losing your historical charts and trends!
          </p>

          <div className="pt-1">
            <Button
              size="sm"
              onClick={onStartFresh}
              className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <span>Start Fresh Today</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
