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
import Feedback from '@/pages/Feedback'
import NotFound from '@/pages/NotFound'
import AddSavingsGoal from '@/pages/AddSavingsGoal'
import SavingsWithdrawal from '@/pages/SavingsWithdrawal'
import Subscriptions from '@/pages/Subscriptions'

// Import enhanced offline manager
import { enhancedOfflineManager } from './services/enhancedOfflineManager';

function App() {
  // Initialize enhanced offline manager
  useEffect(() => {
    const initializeEnhancedOffline = async () => {
      try {
        // Enhanced offline manager initialized successfully
        console.log('Enhanced offline manager initialized');
      } catch (err) {
        console.error('Failed to initialize enhanced offline manager:', err);
      }
    };

    initializeEnhancedOffline();

    // Enable native pull-to-refresh by setting appropriate meta tags
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=yes');
    }

    // Add CSS to enable native pull-to-refresh
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overscroll-behavior: auto;
        -webkit-overflow-scrolling: touch;
      }
      
      /* Enable native pull-to-refresh on mobile */
      @supports (-webkit-overflow-scrolling: touch) {
        body {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: auto;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <TooltipProvider>
      <SettingsProvider>
        <BrowserRouter>
          <div className="app-container">
            <Routes>
              <Route path="/" element={<IndexPage />} />
              <Route path="/auth" element={<Auth />} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
        </BrowserRouter>
      </SettingsProvider>
    </TooltipProvider>
  )
}

export default App
