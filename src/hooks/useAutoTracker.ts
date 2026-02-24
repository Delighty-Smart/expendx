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
                // We assume NotificationPreferences.tsx handles the actual permission prompting.
                const permissions = await MessageReader.checkPermissions();
                if (permissions?.messages === 'granted') {
                    // SMS Inbox monitoring active
                }

                // Initialize Notification Listener
                await NotificationsListener.startListening({
                    cacheNotifications: true
                });

                // Listen for new notifications (like from Kuda app)
                await NotificationsListener.addListener('notificationReceivedEvent', async (notification: any) => {
                    const { title, text, package: pkgName } = notification;

                    // Only process from known bank packages if needed, or just let regex try
                    const parsed = parseBankMessage(`${title} ${text}`, pkgName, true);

                    if (parsed) {
                        const { data: userData } = await supabase.auth.getUser();
                        if (!userData.user) return;

                        await supabase.from('transactions').insert({
                            user_id: userData.user.id,
                            amount: parsed.amount,
                            type: parsed.type,
                            description: parsed.description,
                            category_id: null, // Auto uncategorized or default
                            date: parsed.date.toISOString(),
                        });

                        toast.success(`New ${parsed.type} tracked from ${parsed.source}: NGN ${parsed.amount}`);
                        queryClient.invalidateQueries({ queryKey: ['transactions'] });
                        queryClient.invalidateQueries({ queryKey: ['all_transactions'] });
                    }
                });

            } catch (error) {
                console.error('Error setting up auto-tracker listeners', error);
            }
        };

        setupListeners();

        return () => {
            NotificationsListener.removeAllListeners();
        };
    }, [userId, queryClient]);
};
