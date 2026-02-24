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
                if (permissions?.sms === 'granted') {
                    // Listen for incoming SMS
                    // Since SMSReader might not have a direct event listener for *new* incoming SMS natively (it's often a reader of the inbox),
                    // We would actually need to poll or use a background receiver. 
                    // For the sake of this implementation, we will mock an event listener if the plugin supports it,
                    // or advise the user that true background SMS listening requires a background service.
                    // Note: @solimanware/capacitor-sms-reader is for *reading* the inbox. To *receive* live,
                    // we might need to poll the latest ones every few minutes when the app is active.
                }

                // Listen for new notifications (like from Kuda app)
                await NotificationsListener.addListener('notificationReceivedEvent', async (notification: any) => {
                    const { title, text, packageName } = notification;

                    // Only process from known bank packages if needed, or just let regex try
                    const parsed = parseBankMessage(`${title} ${text}`, packageName, true);

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
