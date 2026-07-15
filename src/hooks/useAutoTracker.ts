import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseBankMessage } from '@/utils/bankParsers';
import { Capacitor } from '@capacitor/core';
import { MessageReader } from '@solimanware/capacitor-sms-reader';
import { NotificationsListener } from 'capacitor-notifications-listener';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';
import { TransactionType } from '@/types/transactions';

export const useAutoTracker = (userId: string | undefined) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!userId) return;

        const isAndroidDevice = Capacitor.getPlatform() === 'android' || /Android/i.test(navigator.userAgent);
        if (!isAndroidDevice) return;

        const isSmsEnabled = localStorage.getItem('auto_tracker_sms_enabled') === 'true';
        const isNotificationsEnabled = localStorage.getItem('auto_tracker_notifications_enabled') === 'true';

        let notificationListenerInstance: { remove: () => Promise<void> } | null = null;

        const setupListeners = async () => {
            try {
                // 1. SMS Inbox Monitoring & Sync
                if (isSmsEnabled) {
                    const permissions = await MessageReader.checkPermissions().catch(() => null);
                    if (permissions?.messages === 'granted') {
                        const lastSync = parseInt(localStorage.getItem('last_sms_sync_time') || '0');
                        // Limit fallback sync to last 4 hours on initial run to avoid flooding notifications
                        const minDate = lastSync === 0 ? Date.now() - (4 * 60 * 60 * 1000) : lastSync;

                        try {
                            const result = await MessageReader.getMessages({
                                minDate,
                                limit: 50
                            });

                            if (result && result.messages && result.messages.length > 0) {
                                const syncedSmsIds: string[] = JSON.parse(localStorage.getItem('synced_sms_ids') || '[]');
                                let newTransactionsAdded = 0;

                                for (const msg of result.messages) {
                                    if (syncedSmsIds.includes(msg.id)) continue;

                                    const parsed = parseBankMessage(msg.body, msg.sender, false);
                                    if (parsed) {
                                        const transactionData = {
                                            amount: parsed.amount,
                                            type: (parsed.type === 'income' ? 'credit' : 'debit') as TransactionType,
                                            description: parsed.description || `SMS alert from ${parsed.source}`,
                                            category: parsed.type === 'income' ? 'Salary' : 'Shopping',
                                            date: new Date(msg.date).toISOString().split('T')[0],
                                            user_id: userId
                                        };

                                        await enhancedOfflineManager.addTransactionOffline(transactionData);
                                        syncedSmsIds.push(msg.id);
                                        newTransactionsAdded++;
                                    }
                                }

                                if (newTransactionsAdded > 0) {
                                    localStorage.setItem('synced_sms_ids', JSON.stringify(syncedSmsIds));
                                    toast.success(`Automatically tracked ${newTransactionsAdded} new transaction(s) from SMS.`);
                                    queryClient.invalidateQueries({ queryKey: ["enhanced_transactions"] });
                                    queryClient.invalidateQueries({ queryKey: ["transactions"] });
                                    queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
                                    queryClient.invalidateQueries({ queryKey: ["budgets"] });
                                }
                            }

                            localStorage.setItem('last_sms_sync_time', Date.now().toString());
                        } catch (smsError) {
                            console.error('Error executing SMS parsing job:', smsError);
                        }
                    }
                }

                // 2. Real-time Push Notification Listener
                if (isNotificationsEnabled) {
                    try {
                        await NotificationsListener.startListening({
                            cacheNotifications: true
                        });
                    } catch (e) {
                        console.error('Failed to start NotificationsListener:', e);
                    }

                    notificationListenerInstance = await NotificationsListener.addListener('notificationReceivedEvent', async (notification: { title?: string; text?: string; package?: string }) => {
                        try {
                            const { title, text, package: pkgName } = notification;
                            const parsed = parseBankMessage(`${title} ${text}`, pkgName || 'App', true);

                            if (parsed) {
                                const transactionData = {
                                    amount: parsed.amount,
                                    type: (parsed.type === 'income' ? 'credit' : 'debit') as TransactionType,
                                    description: parsed.description || `Alert from ${parsed.source}`,
                                    category: parsed.type === 'income' ? 'Salary' : 'Shopping',
                                    date: new Date().toISOString().split('T')[0],
                                    user_id: userId
                                };

                                await enhancedOfflineManager.addTransactionOffline(transactionData);
                                toast.success(`Tracked transaction from push alert: ${parsed.amount} NGN.`);
                                queryClient.invalidateQueries({ queryKey: ["enhanced_transactions"] });
                                queryClient.invalidateQueries({ queryKey: ["transactions"] });
                                queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
                                queryClient.invalidateQueries({ queryKey: ["budgets"] });
                            }
                        } catch (innerError) {
                            console.error('Error parsing notification content:', innerError);
                        }
                    }).catch(e => {
                        console.error('Failed to register notification listener callback:', e);
                        return null;
                    });
                }
            } catch (error) {
                console.error('Error initializing auto-tracker background listeners:', error);
            }
        };

        setupListeners();

        return () => {
            if (notificationListenerInstance) {
                notificationListenerInstance.remove().catch(() => { });
            }
            if (isNotificationsEnabled) {
                NotificationsListener.removeAllListeners().catch(() => { });
            }
        };
    }, [userId, queryClient]);
};
