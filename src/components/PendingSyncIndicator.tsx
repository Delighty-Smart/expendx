
import { Circle, Clock, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PendingSyncIndicatorProps {
  syncStatus?: 'synced' | 'pending' | 'failed';
  size?: 'sm' |md';
  showTooltip?: boolean;
}

export const PendingSyncIndicator = ({ 
  syncStatus = 'synced', 
  size = 'sm',
  showTooltip = true 
}: PendingSyncIndicatorProps) => {
  if (syncStatus === 'synced') {
    return null;
  }

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  
  const getIcon = () => {
    switch (syncStatus) {
      case 'pending':
        return <Circle className={`${iconSize} text-orange-500 fill-orange-100`} />;
      case 'failed':
        return <AlertTriangle className={`${iconSize} text-red-500`} />;
      default:
        return null;
    }
  };

  const getTooltipText = () => {
    switch (syncStatus) {
      case 'pending':
        return "Pending sync - will be uploaded when online";
      case 'failed':
        return "Sync failed - will retry automatically";
      default:
        return "";
    }
  };

  const icon = getIcon();
  if (!icon) return null;

  if (!showTooltip) {
    return <span className="inline-flex items-center">{icon}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-help">
            {icon}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
