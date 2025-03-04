
import { Flame } from "lucide-react";
import { getStreakText } from "@/lib/streak";

interface StreakDisplayProps {
  streak: {
    current_streak: number;
    highest_streak: number;
    current_title: string;
    last_login: string;
  };
  onClick: () => void;
}

const StreakDisplay = ({ streak, onClick }: StreakDisplayProps) => {
  return (
    <div 
      className="bg-gradient-to-br from-background to-background/80 rounded-xl border border-border p-4 hover:border-primary/50 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-3 rounded-full">
          <Flame className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">
            {streak.current_streak}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {streak.current_streak === 1 ? "day" : "days"}
            </span>
          </h3>
          <p className="text-sm text-muted-foreground">Your current streak</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/50">
        <p className="text-xs text-muted-foreground flex justify-between">
          <span>Current title: {streak.current_title}</span>
          <span>Best: {streak.highest_streak} days</span>
        </p>
      </div>
    </div>
  );
};

export default StreakDisplay;
