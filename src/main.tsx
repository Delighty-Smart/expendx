
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeDB } from './services/offlineStorage'
import { notificationService } from './services/notificationService'

// Register the service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Initialize the offline database
initializeDB()
  .then(() => console.log('Offline storage initialized'))
  .catch(err => console.error('Failed to initialize offline storage:', err));

// Request notification permissions on startup
notificationService.requestPermission()
  .then(granted => {
    if (granted) {
      console.log('Notification permission granted');
    } else {
      console.log('Notification permission denied');
    }
  });

createRoot(document.getElementById("root")!).render(
  <App />
);
