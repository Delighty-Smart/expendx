import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseBankMessage } from '@/utils/bankParsers';
import { Capacitor } from '@capacitor/core';
import { MessageReader } from '@solimanware/capacitor-sms-reader';
import { NotificationsListener } from 'capacitor-notifications-listener';

export const useAutoTracker = (userId: string | undefined) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!userId) return;

        const isAndroidDevice = Capacitor.getPlatform() === 'android' || /Android/i.test(navigator.userAgent);
        if (!isAndroidDevice) return;

        const setupListeners = async () => {
            try {
                // We only start listening if permissions are granted.
                const permissions = await MessageReader.checkPermissions().catch(() => null);
                if (permissions?.messages === 'granted') {
                    // SMS Inbox monitoring active
                }

                // Initialize Notification Listener - catch errors to prevent crash
                try {
                    await NotificationsListener.startListening({
                        cacheNotifications: true
                    });
                } catch (e) {
                    console.error('Failed to start NotificationsListener:', e);
                }

                // Listen for new notifications
                const listener = await NotificationsListener.addListener('notificationReceivedEvent', async (notification: any) => {
                    try {
                        const { title, text, package: pkgName } = notification;
                        const parsed = parseBankMessage(`${title} ${text}`, pkgName, true);

                        if (parsed) {
                            const { data: userData, error: userError } = await supabase.auth.getUser();
                            if (userError || !userData.user) return;

                            const { error: insertError } = await supabase.from('transactions').insert({
                                user_id: userData.user.id,
                                amount: parsed.amount,
                                type: parsed.type,
                                description: parsed.description,
                                category_id: null,
                                date: parsed.date.toISOString(),
                            });

                            if (insertError) {
                                console.error('Failed to insert auto-tracked transaction:', insertError);
                                return;
                            }

                            toast.success(`New ${parsed.type} tracked from ${parsed.source}: NGN ${parsed.amount}`);
                            queryClient.invalidateQueries({ queryKey: ['transactions'] });
                            queryClient.invalidateQueries({ queryKey: ['all_transactions'] });
                        }
                    } catch (innerError) {
                        console.error('Error processing notification event:', innerError);
                    }
                }).catch(e => {
                    console.error('Failed to add notification listener:', e);
                    return null;
                });

                return () => {
                    if (listener) {
                        listener.remove().catch(() => { });
                    }
                    NotificationsListener.removeAllListeners().catch(() => { });
                };
            } catch (error) {
                console.error('Error setting up auto-tracker listeners', error);
            }
        };

        let cleanupFn: (() => void) | undefined;
        setupListeners().then(cleanup => {
            cleanupFn = cleanup;
        });

        return () => {
            if (cleanupFn) cleanupFn();
        };
    }, [userId, queryClient]);
};
