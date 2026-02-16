
import React from 'react';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Info } from 'lucide-react';
import { toast } from 'sonner';

const PWAUpdatePrompt = () => {
    const { updateAvailable, updateApp } = usePWAUpdate();

    React.useEffect(() => {
        if (updateAvailable) {
            toast.info('A new version of expendX is available!', {
                description: 'Update now to get the latest features and fixes.',
                action: {
                    label: 'Update Now',
                    onClick: () => updateApp(),
                },
                duration: Infinity,
                position: 'top-center',
                icon: <RefreshCw className="h-5 w-5 text-primary animate-spin-slow" />,
            });
        }
    }, [updateAvailable, updateApp]);

    if (!updateAvailable) return null;

    // We could also return a discrete UI element if preferred, 
    // but using Sonner toast is more consistent with our app.
    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-background/90 backdrop-blur-xl border border-primary/20 shadow-2xl rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Download className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-foreground">Update Available</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">New version ready with latest fixes</p>
                    </div>
                </div>
                <Button
                    size="sm"
                    onClick={updateApp}
                    className="rounded-xl px-4 font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                    Update Now
                </Button>
            </div>
        </div>
    );
};

export default PWAUpdatePrompt;
