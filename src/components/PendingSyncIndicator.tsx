
import { CloudOff, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PendingSyncIndicatorProps {
  isPending?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const PendingSyncIndicator = ({ 
  isPending = false, 
  size = 'sm',
  className = '' 
}: PendingSyncIndicatorProps) => {
  if (!isPending) return null;

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const badgeSize = size === 'sm' ? 'text-xs px-1 py-0.5' : 'text-sm px-2 py-1';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={`${badgeSize} bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 transition-colors ${className}`}
          >
            <Clock className={`${iconSize} mr-1`} />
            {size === 'md' && "Pending Sync"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">This item will sync when you're back online</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
