
// Handle notifications for users
const PERMISSION_DENIED = "denied";
const PERMISSION_GRANTED = "granted";
const PERMISSION_PROMPT = "prompt";

export const notificationService = {
  // Check if the browser supports notifications
  isSupported(): boolean {
    return 'Notification' in window;
  },

  // Request notification permission
  async requestPermission(): Promise<boolean> {
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
  hasPermission(): boolean {
    if (!this.isSupported()) return false;
    return Notification.permission === PERMISSION_GRANTED;
  },

  // Send a notification with the given title and message
  async sendNotification(title: string, message: string, options: NotificationOptions = {}): Promise<boolean> {
    if (!this.hasPermission()) {
      console.info('Notification permission not granted');
      return false;
    }

    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/icons/icon-192x192.png',
        ...options
      });

      notification.onclick = function() {
        window.focus();
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  },

  // Try to send a notification through the service worker
  async sendServiceWorkerNotification(title: string, message: string, options: NotificationOptions = {}): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return this.sendNotification(title, message, options);
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body: message,
        icon: '/icons/icon-192x192.png',
        ...options
      });
      return true;
    } catch (error) {
      console.error('Error sending service worker notification:', error);
      return this.sendNotification(title, message, options);
    }
  }
};
