import { useEffect, useState, useRef } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SettingsProvider, syncStatusBarTheme } from '@/contexts/SettingsContext'
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { useToast } from '@/hooks/use-toast';
import { App as CapacitorApp } from '@capacitor/app';

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

import FinancialTimeline from '@/pages/FinancialTimeline'
import Insights from '@/pages/Insights'
import Missions from '@/pages/Missions'
import TrustCenter from '@/pages/TrustCenter'
import AIMarketplace from '@/pages/AIMarketplace'
import LucentChat from '@/pages/LucentChat'
import LucentGuide from '@/pages/LucentGuide'
import { ChatProvider } from '@/contexts/ChatContext'
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
  useEffect(() => { 
    locationRef.current = location.pathname; 
    // Always sync native status bar items color on page navigation
    syncStatusBarTheme();
  }, [location.pathname]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid);

      if (Capacitor.isNativePlatform()) {
        SplashScreen.hide({ fadeOutDuration: 100 }).catch(() => { });

        const nativeSplash = document.getElementById('native-splash');
        if (nativeSplash) {
          nativeSplash.style.opacity = '0';
          setTimeout(() => {
            nativeSplash.remove();
          }, 100);
        }

        if (locationRef.current === '/') {
          if (user) {
            navigate('/chat', { replace: true });
          } else {
            navigate('/auth', { replace: true });
          }
        }
      } else if (user) {
        const publicRoutes = ['/', '/auth'];
        if (publicRoutes.includes(locationRef.current)) {
          navigate('/chat', { replace: true });
        }
      }
    });

    return () => unsubscribe();
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

    // Set native status bar style from saved theme preference
    syncStatusBarTheme();

    // Initial sync for enhanced offline manager
    if (navigator.onLine) {
      enhancedOfflineManager.forceSync().catch(console.error);
    }

    // Handle deep links from App opening with custom scheme
    let appUrlListener: any;
    if (Capacitor.isNativePlatform()) {
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
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/download" element={<Download />} />
        {/* Protected Routes with Persistent Layout */}
        <Route element={<AuthGuard><ChatProvider><Layout /></ChatProvider></AuthGuard>}>
          <Route path="/chat" element={<LucentChat />} />
          <Route path="/lucent-guide" element={<LucentGuide />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/time-travel" element={<FinancialTimeline />} />
          <Route path="/trust-center" element={<TrustCenter />} />
          <Route path="/ai-marketplace" element={<AIMarketplace />} />
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

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}

function App() {
  return (
    <GlobalErrorBoundary>
      <TooltipProvider>
        <SettingsProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AppContent />
            <PushOnboarding />
            <Toaster />
            <PWAUpdatePrompt />
          </BrowserRouter>
        </SettingsProvider>
      </TooltipProvider>
    </GlobalErrorBoundary>
  );
}

export default App
