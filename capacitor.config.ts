import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.expendx.app',
  appName: 'Lucent',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#111315',     // Lucent dark background
      androidSplashResourceName: 'splash',
      showSpinner: false,
      launchAutoHide: true,           // let it hide automatically once resources are loaded
      fadeInDuration: 0,
      fadeOutDuration: 100,
    },
    StatusBar: {
      style: 'Light',                 // Light = white icons for dark theme
      backgroundColor: '#111315',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'body',                  // prevents webview from being pushed up
      style: 'dark',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7C3AED',
      sound: 'beep.wav',
      channels: [
        {
          id: 'budget_alerts',
          name: 'Budget Alerts',
          description: 'Get notified when you are approaching or exceeding your budget limits.',
          importance: 5,   // IMPORTANCE_HIGH
          visibility: 1,   // VISIBILITY_PUBLIC
          sound: 'beep.wav',
          lights: true,
          lightColor: '#EF4444',
          vibration: true,
        },
        {
          id: 'auto_tracker',
          name: 'Auto Tracker',
          description: 'Notifications from the automatic transaction detector.',
          importance: 3,   // IMPORTANCE_DEFAULT
          visibility: 0,   // VISIBILITY_PRIVATE (contains financial info)
          lights: true,
          lightColor: '#22C55E',
          vibration: true,
        },
        {
          id: 'sync_status',
          name: 'Sync Status',
          description: 'Background data sync updates.',
          importance: 2,   // IMPORTANCE_LOW — no sound
          visibility: 1,
          lights: false,
          vibration: false,
        },
      ],
    },
  },
};

export default config;
