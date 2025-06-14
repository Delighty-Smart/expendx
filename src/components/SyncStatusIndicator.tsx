
import { Circle, Cloud, CloudOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOfflineData } from "@/hooks/useOfflineData";

export const SyncStatusIndicator = () => {
  const { status, forceSync } = useOfflineData();

  if (!status.isInitialized) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Initializing...</span>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (!status.isOnline) {
      return <CloudOff className="h-4 w-4 text-orange-500" />;
    }

    if (status.failedCount > 0) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }

    if (status.pendingCount > 0) {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }

    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!status.isOnline) {
      return "Offline";
    }

    if (status.failedCount > 0) {
      return `${status.failedCount} failed`;
    }

    if (status.pendingCount > 0) {
      return "Syncing...";
    }

    return "Synced";
  };

  const getTooltipText = () => {
    if (!status.isOnline) {
      return "You're offline. Changes will be saved locally and synced when connection is restored.";
    }

    if (status.failedCount > 0) {
      return `${status.failedCount} items failed to sync. Click to retry.`;
    }

    if (status.pendingCount > 0) {
      return `Syncing ${status.pendingCount} changes to the cloud...`;
    }

    const lastSyncText = status.lastSync 
      ? `Last synced: ${new Date(status.lastSync).toLocaleTimeString()}`
      : "All changes are synced";
    
    return lastSyncText;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-2"
            onClick={status.hasUnsynced && status.isOnline ? forceSync : undefined}
            disabled={!status.isOnline || (!status.hasUnsynced && status.pendingCount === 0)}
          >
            {getStatusIcon()}
            <span className="text-xs font-medium">{getStatusText()}</span>
            {(status.pendingCount > 0 || status.failedCount > 0) && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs ml-1">
                {status.pendingCount + status.failedCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
