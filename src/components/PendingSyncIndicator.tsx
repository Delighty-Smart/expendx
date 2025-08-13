
import { CloudOff, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'synced' | 'offline';

interface PendingSyncIndicatorProps {
  status?: SyncStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const PendingSyncIndicator = ({ 
  status = 'synced', 
  size = 'sm',
  className = '' 
}: PendingSyncIndicatorProps) => {
  if (status === 'synced') return null;

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const badgeSize = size === 'sm' ? 'text-xs px-1 py-0.5' : 'text-sm px-2 py-1';

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className={`${iconSize} mr-1`} />,
          text: size === 'md' ? "Pending Sync" : "",
          variant: "secondary" as const,
          className: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200",
          tooltip: "This item will sync when you're back online"
        };
      case 'syncing':
        return {
          icon: <LoadingSpinner size={size === 'sm' ? 'xs' : 'sm'} className="mr-1" />,
          text: size === 'md' ? "Syncing..." : "",
          variant: "secondary" as const,
          className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
          tooltip: "Currently syncing to the cloud"
        };
      case 'failed':
        return {
          icon: <AlertCircle className={`${iconSize} mr-1`} />,
          text: size === 'md' ? "Sync Failed" : "",
          variant: "destructive" as const,
          className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
          tooltip: "Sync failed - will retry automatically"
        };
      case 'offline':
        return {
          icon: <CloudOff className={`${iconSize} mr-1`} />,
          text: size === 'md' ? "Offline" : "",
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
          tooltip: "Added while offline - will sync when online"
        };
      default:
        return {
          icon: <Clock className={`${iconSize} mr-1`} />,
          text: size === 'md' ? "Pending" : "",
          variant: "secondary" as const,
          className: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200",
          tooltip: "Waiting to sync"
        };
    }
  };

  const config = getStatusConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={config.variant}
            className={`${badgeSize} ${config.className} transition-colors ${className}`}
          >
            {config.icon}
            {config.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
