import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, ShieldCheck, Zap } from "lucide-react";
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const PushOnboarding = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const checkPermission = async () => {
            if (!Capacitor.isNativePlatform()) return;

            const permStatus = await PushNotifications.checkPermissions();
            const hasPrompted = localStorage.getItem('push_prompted');

            // If permissions are already granted (e.g., Android 12 and below), just register seamlessly and return
            if (permStatus.receive === 'granted') {
                try {
                    await PushNotifications.register();
                } catch (e) {
                    console.error("Auto registration error:", e);
                }
                return;
            }

            // If it's promptable, and we haven't prompted them yet, show the dialog
            if (permStatus.receive === 'prompt' && !hasPrompted) {
                setIsOpen(true);
            }
        };

        checkPermission();
    }, []);

    const handleRequest = async () => {
        localStorage.setItem('push_prompted', 'true');
        setIsOpen(false);

        if (Capacitor.isNativePlatform()) {
            try {
                const result = await PushNotifications.requestPermissions();
                if (result.receive === 'granted') {
                    await PushNotifications.register();
                }
            } catch (e) {
                console.error("Push permission error:", e);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[400px] bg-background/95 backdrop-blur-2xl border-primary/20">
                <DialogHeader className="space-y-4 pt-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                        <Bell className="h-8 w-8 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-xl font-bold">Stay in the Loop 🚀</DialogTitle>
                    <DialogDescription className="text-center text-sm">
                        Enable notifications to get the most out of Expendx. We'll only nudge you for the important stuff.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold">Budget Protection</p>
                            <p className="text-[10px] text-muted-foreground">Instant alerts when you're nearing your limits.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold">Streak Reminders</p>
                            <p className="text-[10px] text-muted-foreground">Never lose your progress with daily log nudges.</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-col gap-2 pt-2">
                    <Button
                        className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/20"
                        onClick={handleRequest}
                    >
                        Enable Notifications
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full h-10 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                            localStorage.setItem('push_prompted', 'true');
                            setIsOpen(false);
                        }}
                    >
                        Maybe Later
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PushOnboarding;
