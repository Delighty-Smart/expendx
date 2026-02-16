
// Only adding a className prop to the component to control size
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flame, Award, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface StreakModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streak: any;
  className?: string;
}

const StreakModal = ({ open, onOpenChange, streak, className }: StreakModalProps) => {
  if (!streak) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[420px]", className)}>

        <DialogHeader className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-orange-500/10">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {streak.current_streak} Day Streak!
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground/70 font-medium">
            Keep logging in daily to maintain your streak and unlock more titles!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          <div className="relative overflow-hidden flex flex-col items-center gap-4 bg-gradient-to-b from-orange-500/5 to-transparent border border-orange-500/10 rounded-3xl p-8 transition-all hover:scale-[1.02] duration-300">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.1),transparent_70%)]" />
            <div className="relative p-4 rounded-full bg-orange-500/10 ring-4 ring-orange-500/5 shadow-inner">
              <Flame className="h-10 w-10 text-orange-500 animate-pulse" />
            </div>
            <div className="relative text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500/60 mb-2">Current Title</p>
              <div className="inline-flex bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-2.5 px-6 rounded-2xl shadow-xl shadow-orange-500/20 text-lg tracking-tight">
                {streak.current_title}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 border border-border/10 rounded-2xl p-4 flex flex-col items-center gap-2 group transition-colors hover:bg-muted/50">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/50">Highest</p>
                <p className="text-xl font-bold text-foreground tracking-tight">{streak.highest_streak}</p>
              </div>
            </div>

            <div className="bg-muted/30 border border-border/10 rounded-2xl p-4 flex flex-col items-center gap-2 group transition-colors hover:bg-muted/50">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                <Award className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/50">Freezes</p>
                <p className="text-xl font-bold text-foreground tracking-tight">{streak.freeze_count}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-10 border-none pt-0">
          <Button
            className="w-full h-12 rounded-xl bg-foreground text-background font-bold hover:scale-[1.02] transition-all"
            onClick={() => onOpenChange(false)}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StreakModal;
