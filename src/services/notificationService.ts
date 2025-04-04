
/**
 * Service for managing browser notifications
 */
export const notificationService = {
  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return Notification.permission === 'granted';
  },
  
  /**
   * Check if notifications are supported and enabled
   */
  areNotificationsEnabled(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  },
  
  /**
   * Send a notification to the user
   */
  async sendNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!this.areNotificationsEnabled()) {
      const granted = await this.requestPermission();
      if (!granted) {
        console.log('Notification permission denied');
        return;
      }
    }
    
    const mergedOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options
    };
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Send via service worker if available
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, mergedOptions);
    } else {
      // Fallback to regular notification
      new Notification(title, mergedOptions);
    }
  },
  
  /**
   * Send a streak reminder notification
   */
  async sendStreakReminder(daysLeft: number): Promise<void> {
    const title = 'Streak Reminder';
    const body = daysLeft > 1 
      ? `You have ${daysLeft} days left to maintain your streak!` 
      : 'Last day to maintain your streak! Add a transaction today!';
    
    await this.sendNotification(title, { 
      body,
      data: { url: '/transactions' },
      requireInteraction: true
    });
  },
  
  /**
   * Send a budget alert notification
   */
  async sendBudgetAlert(category: string, percentage: number, spent: number, limit: number): Promise<void> {
    const title = percentage >= 100 ? 'Budget Exceeded!' : 'Budget Alert';
    const body = `You've spent ${percentage.toFixed(1)}% of your ${category} budget (${spent.toFixed(2)} of ${limit.toFixed(2)})`;
    
    await this.sendNotification(title, { 
      body,
      data: { url: '/budgets' },
      requireInteraction: true 
    });
  }
};
