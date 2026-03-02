import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { notificationService } from './services/notificationService'
import { AuthProvider } from './hooks/useAuth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import "./components/ui/smoothScroll.css";

// Register the service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
        // Force an update check immediately — picks up new SW from Vercel deploys
        registration.update().catch(() => { });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// No explicit DB initialization here; enhancedOfflineManager handles it in its constructor



// Create a new QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
