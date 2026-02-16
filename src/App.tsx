import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SettingsProvider } from '@/contexts/SettingsContext'

import IndexPage from '@/pages/Index'
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
import PWAUpdatePrompt from '@/components/PWAUpdatePrompt'

// Import enhanced offline manager
import { enhancedOfflineManager } from './services/enhancedOfflineManager';

import Layout from '@/components/Layout'

function App() {
  useEffect(() => {
    // Fix for mobile viewport height (100vh issue)
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);

    // Initial sync for enhanced offline manager
    if (navigator.onLine) {
      enhancedOfflineManager.forceSync().catch(console.error);
    }

    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  return (
    <TooltipProvider>
      <SettingsProvider>
        <BrowserRouter>
          <div className="app-container">
            <Routes>
              {/* Public Routes */}
              <Route path="/auth" element={<Auth />} />

              {/* Protected Routes with Persistent Layout */}
              <Route element={<Layout />}>
                <Route path="/" element={<IndexPage />} />
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
          <Toaster />
          <PWAUpdatePrompt />
        </BrowserRouter>
      </SettingsProvider>
    </TooltipProvider>
  )
}

export default App
