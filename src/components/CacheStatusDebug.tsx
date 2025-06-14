
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEnhancedOfflineSync } from "@/hooks/useEnhancedOfflineSync";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Database, Cloud, Wifi, WifiOff } from "lucide-react";

export const CacheStatusDebug = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { syncStatus, forceSync, getCacheAge } = useEnhancedOfflineSync();

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'Unknown';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s ago`;
  };

  const cacheAge = getCacheAge();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="shadow-lg bg-background/95 backdrop-blur-sm"
          >
            <Database className="h-4 w-4 mr-1" />
            Cache Debug
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 w-80 shadow-lg bg-background/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {syncStatus.isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                Enhanced Offline Status
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time sync and cache information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Network:</span>
                  <Badge 
                    variant={syncStatus.isOnline ? "default" : "destructive"} 
                    className="ml-1 text-xs"
                  >
                    {syncStatus.isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Sync Status:</span>
                  <Badge 
                    variant={syncStatus.isSyncing ? "secondary" : "outline"} 
                    className="ml-1 text-xs"
                  >
                    {syncStatus.isSyncing ? "Syncing" : "Idle"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Queue Count:</span>
                  <Badge 
                    variant={syncStatus.queueCount > 0 ? "secondary" : "outline"} 
                    className="ml-1 text-xs"
                  >
                    {syncStatus.queueCount}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Has Cache:</span>
                  <Badge 
                    variant={syncStatus.hasData ? "default" : "outline"} 
                    className="ml-1 text-xs"
                  >
                    {syncStatus.hasData ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <div>
                  <span className="font-medium">Last Sync:</span>
                  <div className="text-muted-foreground text-xs mt-1">
                    {formatTime(syncStatus.lastSync?.getTime() || null)}
                  </div>
                </div>
                
                {cacheAge && (
                  <div>
                    <span className="font-medium">Cache Age:</span>
                    <div className="text-muted-foreground text-xs mt-1">
                      {formatDuration(cacheAge)}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div>
                  <span className="font-medium">Cached Transactions:</span>
                  <span className="ml-1 text-muted-foreground">
                    {enhancedOfflineManager.getTransactions().length}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Cached Budgets:</span>
                  <span className="ml-1 text-muted-foreground">
                    {enhancedOfflineManager.getBudgets().length}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Cached Savings:</span>
                  <span className="ml-1 text-muted-foreground">
                    {enhancedOfflineManager.getSavings().length}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Button 
                  onClick={forceSync} 
                  disabled={syncStatus.isSyncing || !syncStatus.isOnline}
                  size="sm" 
                  className="w-full text-xs"
                >
                  {syncStatus.isSyncing ? "Syncing..." : "Force Sync"}
                </Button>
                
                <Button 
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  variant="outline"
                  size="sm" 
                  className="w-full text-xs"
                >
                  Clear Cache & Reload
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
