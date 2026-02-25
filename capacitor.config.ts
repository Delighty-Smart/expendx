import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.expendx.app',
  appName: 'Expendx',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#09090b',     // zinc-950 — matches the app dark bg
      androidSplashResourceName: 'splash',
      showSpinner: false,
      launchAutoHide: false,           // we hide manually after app is ready
      fadeInDuration: 200,
      fadeOutDuration: 300,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#09090b',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',                  // prevents webview from being pushed up
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
