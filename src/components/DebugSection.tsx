
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEnhancedOfflineSync } from "@/hooks/useEnhancedOfflineSync";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Database, Cloud, Wifi, WifiOff, HardDrive, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const DebugSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const { syncStatus, forceSync, getCacheAge } = useEnhancedOfflineSync();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Load auto-sync preference from localStorage on mount
  useEffect(() => {
    const savedAutoSync = localStorage.getItem('expendx_auto_sync');
    if (savedAutoSync !== null) {
      setAutoSync(JSON.parse(savedAutoSync));
    }
  }, []);

  // Save auto-sync preference to localStorage when changed
  useEffect(() => {
    localStorage.setItem('expendx_auto_sync', JSON.stringify(autoSync));
    // TODO: Pass this setting to the enhanced offline manager
    console.log('Auto-sync setting changed to:', autoSync);
  }, [autoSync]);

  useEffect(() => {
    if (isOpen) {
      const info = {
        cacheAge: getCacheAge(),
        syncQueue: syncStatus.syncQueue || [],
        localStorage: {
          cacheSize: localStorage.getItem('expendx_cache_data')?.length || 0,
          queueSize: localStorage.getItem('expendx_sync_queue')?.length || 0,
        }
      };
      setDebugInfo(info);
    }
  }, [isOpen, syncStatus, getCacheAge]);

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'Unknown';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) return `${minutes}m ${seconds}s ago`;
    return `${seconds}s ago`;
  };

  const clearAllData = () => {
    if (confirm('This will clear all offline data and reload the app. Continue?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Offline and Cache
        </CardTitle>
        <CardDescription>
          Manage offline data storage, sync settings, and cache status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-sync" className="text-sm font-medium">
              Auto-sync when online
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically sync changes when connected to the internet
            </p>
          </div>
          <Switch
            id="auto-sync"
            checked={autoSync}
            onCheckedChange={setAutoSync}
          />
        </div>

        <Separator />

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Cache & Sync Status
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Network:</span>
                  <div className="flex items-center gap-1">
                    {syncStatus.isOnline ? (
                      <Wifi className="h-3 w-3 text-green-500" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-red-500" />
                    )}
                    <Badge variant={syncStatus.isOnline ? "default" : "destructive"} className="text-xs">
                      {syncStatus.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sync Status:</span>
                  <Badge variant={syncStatus.isSyncing ? "secondary" : "outline"} className="text-xs">
                    {syncStatus.isSyncing ? "Syncing" : "Idle"}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Queue Count:</span>
                  <Badge 
                    variant={syncStatus.queueCount > 0 ? "secondary" : "outline"} 
                    className="text-xs"
                  >
                    {syncStatus.queueCount}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Failed:</span>
                  <Badge 
                    variant={syncStatus.failedCount > 0 ? "destructive" : "outline"} 
                    className="text-xs"
                  >
                    {syncStatus.failedCount}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Sync:</span>
                <span className="text-xs">{formatTime(syncStatus.lastSync?.getTime() || null)}</span>
              </div>
              
              {debugInfo?.cacheAge && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cache Age:</span>
                  <span className="text-xs">{formatDuration(debugInfo.cacheAge)}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium">{enhancedOfflineManager.getTransactions().length}</div>
                <div className="text-muted-foreground">Transactions</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{enhancedOfflineManager.getBudgets().length}</div>
                <div className="text-muted-foreground">Budgets</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{enhancedOfflineManager.getSavings().length}</div>
                <div className="text-muted-foreground">Savings</div>
              </div>
            </div>

            {debugInfo?.syncQueue?.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Sync Queue Items</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {debugInfo.syncQueue.map((item: any, index: number) => (
                      <div key={index} className="text-xs p-2 bg-muted rounded flex justify-between items-center">
                        <span>{item.type} {item.table}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-2">
          <Button 
            onClick={forceSync} 
            disabled={syncStatus.isSyncing || !syncStatus.isOnline}
            size="sm" 
            className="flex-1"
          >
            <Cloud className="h-4 w-4 mr-2" />
            {syncStatus.isSyncing ? "Syncing..." : "Force Sync"}
          </Button>
          
          <Button 
            onClick={clearAllData}
            variant="outline"
            size="sm" 
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
