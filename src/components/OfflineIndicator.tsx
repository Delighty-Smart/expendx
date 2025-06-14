
import { Wifi, WifiOff, Cloud, CloudOff, Loader2 } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function OfflineIndicator() {
  const { isSyncing, syncQueueLength, isOnline, forceSync } = useOfflineSync();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Network Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isOnline ? "Online" : "Offline"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Sync Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {isSyncing ? (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              ) : isOnline ? (
                <Cloud className="h-4 w-4 text-green-500" />
              ) : (
                <CloudOff className="h-4 w-4 text-orange-500" />
              )}
              
              {syncQueueLength > 0 && (
                <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                  {syncQueueLength}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isSyncing 
                ? "Syncing..." 
                : syncQueueLength > 0 
                  ? `${syncQueueLength} items pending sync`
                  : isOnline 
                    ? "Synced with cloud" 
                    : "Offline - changes saved locally"
              }
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Force Sync Button */}
        {isOnline && syncQueueLength > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={forceSync}
            disabled={isSyncing}
            className="h-8 px-2"
          >
            Sync Now
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}
