
// Handle notifications for users
const PERMISSION_DENIED = "denied";
const PERMISSION_GRANTED = "granted";
const PERMISSION_PROMPT = "prompt";

const VAPID_PUBLIC_KEY = 'BDc7wm1Bqp_rEItS6WW1Nsrtc_lggXGwcUnVO_FiOnJSrWCOsnn_-pk10LDvBDEicd2Skj5c5x7b70_00oPq7hc';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const notificationService = {
  // Check if the browser supports notifications
  isSupported(): boolean {
    return 'Notification' in window;
  },

  async requestPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const permStatus = await LocalNotifications.requestPermissions();
        return permStatus.display === 'granted';
      } catch (error) {
        console.error('Error requesting native notification permission:', error);
        return false;
      }
    }

    if (!this.isSupported()) {
      console.log('Notifications not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log(`Notification permission ${permission}`);
      return permission === PERMISSION_GRANTED;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  },

  // Check if we have permission to show notifications
  async hasPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await LocalNotifications.checkPermissions();
        return status.display === 'granted';
      } catch (e) {
        return false;
      }
    }
    if (!this.isSupported()) return false;
    return Notification.permission === PERMISSION_GRANTED;
  },

  async sendNotification(title: string, message: string, options: NotificationOptions = {}): Promise<boolean> {
    const isPermitted = await this.hasPermission();
    if (!isPermitted) {
      console.info('Notification permission not granted');
      return false;
    }

    try {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const icon = isDarkMode ? '/notification-icon-dark.png' : '/notification-icon-light.png';

      const notification = new Notification(title, {
        body: message,
        icon: icon,
        badge: icon,
        ...options
      });

      notification.onclick = function () {
        window.focus();
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  },

  async sendServiceWorkerNotification(title: string, message: string, options: NotificationOptions = {}): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body: message,
              id: Math.floor(new Date().getTime() / 1000) % 2000000000, // 32-bit int safe
              schedule: { at: new Date(Date.now() + 1000) }, // 1s from now for immediate effect
              sound: 'beep.wav',
              actionTypeId: options.tag || '',
              extra: null
            }
          ]
        });
        return true;
      } catch (error) {
        console.error('Error sending local native notification:', error);
        return false;
      }
    }

    if (!('serviceWorker' in navigator)) {
      return this.sendNotification(title, message, options);
    }

    try {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const icon = isDarkMode ? '/notification-icon-dark.png' : '/notification-icon-light.png';

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body: message,
        icon: icon,
        badge: icon,
        ...options
      });
      return true;
    } catch (error) {
      console.error('Error sending service worker notification:', error);
      return this.sendNotification(title, message, options);
    }
  },

  // --- Push API Integration ---

  isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  async getSubscription(): Promise<any | null> {
    if (Capacitor.isNativePlatform()) {
      const isGranted = await this.hasPermission();
      return isGranted ? { endpoint: 'native_local' } : null;
    }
    if (!this.isPushSupported()) return null;
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  },

  async subscribeToPush(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      return await this.requestPermission();
    }

    if (!this.isPushSupported()) return false;

    try {
      const registration = await navigator.serviceWorker.ready;

      // Request standard notification permission first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return false;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Store subscription in Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription: subscription.toJSON()
          }, { onConflict: 'user_id,subscription->>endpoint' });

        if (error) throw error;
      }

      console.log('Successfully subscribed to Push Notifications');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    }
  },

  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.isPushSupported()) return false;

    try {
      const subscription = await this.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();

        // Remove from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .match({ user_id: user.id, 'subscription->>endpoint': subscription.endpoint });
        }
      }
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }
};
