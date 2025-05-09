
// Only adding a className prop to the component to control size
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className={cn("w-[95%] max-w-[400px] mx-auto rounded-2xl", className)}>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            {streak.current_streak} Day Streak!
          </DialogTitle>
          <DialogDescription>
            Keep logging in daily to maintain your streak and unlock more titles!
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div className="flex flex-col items-center gap-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="p-3 rounded-full bg-orange-500/20">
              <Flame className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-lg font-semibold">Current Title</p>
            <div className="bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold py-1.5 px-3 rounded-full shadow-md">
              {streak.current_title}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-3 flex flex-col items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <p className="text-sm text-muted-foreground">Highest Streak</p>
              <p className="text-xl font-bold">{streak.highest_streak}</p>
              <p className="text-xs text-muted-foreground">days</p>
            </div>
            
            <div className="border rounded-lg p-3 flex flex-col items-center gap-2">
              <Award className="h-5 w-5 text-purple-500" />
              <p className="text-sm text-muted-foreground">Freeze Credits</p>
              <p className="text-xl font-bold">{streak.freeze_count}</p>
              <p className="text-xs text-muted-foreground">remaining</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <Button onClick={() => onOpenChange(false)}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StreakModal;
