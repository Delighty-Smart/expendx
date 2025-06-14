
import { Wifi, WifiOff, CloudOff, Cloud, Loader2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEnhancedOfflineSync } from "@/hooks/useEnhancedOfflineSync";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const OfflineIndicator = () => {
  const { syncStatus, forceSync, getCacheAge } = useEnhancedOfflineSync();

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    
    if (syncStatus.isSyncing) {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    
    if (syncStatus.queueCount > 0) {
      return <CloudOff className="h-4 w-4 text-orange-500" />;
    }
    
    if (syncStatus.hasData) {
      return <Database className="h-4 w-4 text-green-500" />;
    }
    
    return <Cloud className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) {
      return "Offline";
    }
    
    if (syncStatus.isSyncing) {
      return "Syncing...";
    }
    
    if (syncStatus.queueCount > 0) {
      return `${syncStatus.queueCount} pending`;
    }
    
    if (syncStatus.hasData) {
      return "Cached";
    }
    
    return "Synced";
  };

  const getTooltipText = () => {
    if (!syncStatus.isOnline) {
      return "You're offline. All changes are saved locally and will sync when connection is restored.";
    }
    
    if (syncStatus.isSyncing) {
      return "Syncing your data with the cloud...";
    }
    
    if (syncStatus.queueCount > 0) {
      return `${syncStatus.queueCount} changes waiting to sync. Click to sync now.`;
    }
    
    if (syncStatus.hasData) {
      const cacheAge = getCacheAge();
      const ageText = cacheAge ? `Cache updated ${Math.floor(cacheAge / 60000)} minutes ago` : "Data cached locally";
      return `${ageText}. All changes are synced with the cloud.`;
    }
    
    return "All changes are synced with the cloud.";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-2"
              onClick={syncStatus.queueCount > 0 && !syncStatus.isSyncing ? forceSync : undefined}
              disabled={syncStatus.isSyncing}
            >
              {getStatusIcon()}
              <span className="text-xs font-medium">{getStatusText()}</span>
            </Button>
            {syncStatus.queueCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-orange-100 text-orange-700 border-orange-200">
                {syncStatus.queueCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
