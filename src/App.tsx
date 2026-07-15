import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useToast } from '@/hooks/use-toast';

import IndexPage from '@/pages/Index'
import Landing from '@/pages/Landing'
import Auth from '@/pages/Auth'
import Transactions from '@/pages/Transactions'
import AddTransaction from '@/pages/AddTransaction'
import Budgets from '@/pages/Budgets'
import AddBudget from '@/pages/AddBudget'
import EditBudget from '@/pages/EditBudget'
import SetIncome from '@/pages/SetIncome'
import SetSavingsGoal from '@/pages/SetSavingsGoal'
import Savings from '@/pages/Savings'
import Profile from '@/pages/Profile'
import Reports from '@/pages/Reports'
import Alerts from '@/pages/Alerts'
import Settings from '@/pages/Settings'
import Admin from '@/pages/Admin'
import AdminFeedback from '@/pages/AdminFeedback'
import Feedback from '@/pages/FeedbackPage'
import NotFound from '@/pages/NotFound'
import AddSavingsGoal from '@/pages/AddSavingsGoal'
import SavingsWithdrawal from '@/pages/SavingsWithdrawal'
import Subscriptions from '@/pages/Subscriptions'
import Trends from '@/pages/Trends'
import Download from '@/pages/Download'
import LifeEnergy from '@/pages/LifeEnergy'
import PWAUpdatePrompt from '@/components/PWAUpdatePrompt'
import PushOnboarding from '@/components/PushOnboarding'
import { CapacitorShareTarget } from '@capgo/capacitor-share-target';

// Import enhanced offline manager
import { enhancedOfflineManager } from './services/enhancedOfflineManager';

import Layout from '@/components/Layout'
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary'

import { useAutoTracker } from './hooks/useAutoTracker';
import { useBiometricLock } from './hooks/useBiometricLock';
import { AuthGuard } from '@/components/AuthGuard';

function AppContent() {
  const [userId, setUserId] = useState<string | undefined>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const backPressedOnce = useRef(false);
  // Keep a ref so the onAuthStateChange closure always sees the current pathname
  const locationRef = useRef(location.pathname);
  useEffect(() => { locationRef.current = location.pathname; }, [location.pathname]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);

      // Hide native plugins splash screen once session is resolved
      if (Capacitor.isNativePlatform()) {
        SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => { });

        // Hide our custom HTML splash screen gracefully
        const nativeSplash = document.getElementById('native-splash');
        if (nativeSplash) {
          nativeSplash.style.opacity = '0';
          setTimeout(() => {
            nativeSplash.remove();
          }, 300); // Wait for the CSS transition to finish before dropping from DOM
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id);

      // On successful sign-in (including native Google Sign-In via signInWithIdToken),
      // redirect to dashboard if the user is currently on a public route.
      if (event === 'SIGNED_IN' && session?.user) {
        const publicRoutes = ['/', '/auth'];
        if (publicRoutes.includes(locationRef.current)) {
          navigate('/dashboard', { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useAutoTracker(userId);
  useBiometricLock(); // Prompts biometric on app resume if user has enabled it

  useEffect(() => {
    // Fix for mobile viewport height (100vh issue)
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);

    // Set native status bar style from saved theme preference (Style.Dark = dark text for light theme)
    if (Capacitor.isNativePlatform()) {
      const savedTheme = localStorage.getItem('theme') || 'dark';
      StatusBar.setStyle({ style: savedTheme === 'dark' ? Style.Light : Style.Dark }).catch(() => { });
    }

    // Initial sync for enhanced offline manager
    if (navigator.onLine) {
      enhancedOfflineManager.forceSync().catch(console.error);
    }

    // Handle deep links from App opening with custom scheme (for Supabase Redirects)
    let appUrlListener: any;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', async (event) => {
        // e.g. io.expendx.app://login-callback#access_token=....
        if (event.url.includes('login-callback')) {
          // Send the URL to supabase to extract the session
          try {
            const urlObj = new URL(event.url);

            // Check for PKCE code first
            const code = urlObj.searchParams.get('code');
            if (code) {
              await supabase.auth.exchangeCodeForSession(code);
              navigate('/dashboard', { replace: true });
              return;
            }

            // Fallback to implicit flow tokens in hash
            const hashFragment = urlObj.hash.substring(1);
            const params = new URLSearchParams(hashFragment);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');

            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
              navigate('/dashboard', { replace: true });
            }
          } catch (err) {
            console.error("Deep link Auth parsing Error", err);
          }
        }
      }).then(listener => {
        appUrlListener = listener;
      });

      // Share Target listener
      CapacitorShareTarget.addListener('shareReceived', (event: any) => {
        if (event.files && event.files.length > 0) {
          // Take the first file and redirect to add-transaction to use unified AI OCR
          const file = event.files[0];
          navigate('/add-transaction', { state: { sharedFileUri: file.uri, mimeType: file.type } });
        }
      });
    }

    // Handle Android hardware back button
    let backButtonListener: any;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('backButton', () => {
        const rootPaths = ['/', '/dashboard', '/auth'];
        const isRoot = rootPaths.includes(location.pathname);

        if (!isRoot) {
          navigate(-1);
        } else if (backPressedOnce.current) {
          CapacitorApp.exitApp();
        } else {
          backPressedOnce.current = true;
          toast({
            title: 'Press back again to exit',
            duration: 2000,
          });
          setTimeout(() => { backPressedOnce.current = false; }, 2000);
        }
      }).then(listener => {
        backButtonListener = listener;
      });
    }

    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
      if (appUrlListener) appUrlListener.remove();
      if (backButtonListener) backButtonListener.remove();
    };
  }, [navigate]);

  return (
    <div className="app-container">
      <Routes>
        {/* Public Routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/download" element={<Download />} />
        <Route path="/" element={<Landing />} />

        {/* Protected Routes with Persistent Layout */}
        <Route element={<AuthGuard><Layout /></AuthGuard>}>
          <Route path="/dashboard" element={<IndexPage />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/add-transaction" element={<AddTransaction />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/add-budget" element={<AddBudget />} />
          <Route path="/edit-budget" element={<EditBudget />} />
          <Route path="/set-income" element={<SetIncome />} />
          <Route path="/set-savings-goal" element={<SetSavingsGoal />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/add-savings-goal" element={<AddSavingsGoal />} />
          <Route path="/savings-withdrawal" element={<SavingsWithdrawal />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/life-energy" element={<LifeEnergy />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <GlobalErrorBoundary>
      <TooltipProvider>
        <SettingsProvider>
          <BrowserRouter>
            <AppContent />
            <PushOnboarding />
            <Toaster />
            <PWAUpdatePrompt />
          </BrowserRouter>
        </SettingsProvider>
      </TooltipProvider>
    </GlobalErrorBoundary>
  )
}

export default App
