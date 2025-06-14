
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'

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

// Import enhanced offline manager
import { enhancedOfflineManager } from './services/enhancedOfflineManager';

// Create a new QueryClient instance with proper configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  // Initialize enhanced offline manager
  useEffect(() => {
    const initializeEnhancedOffline = async () => {
      try {
        // The enhanced offline manager initializes itself
        console.log('Enhanced offline manager initialized');
      } catch (err) {
        console.error('Failed to initialize enhanced offline manager:', err);
      }
    };
    
    initializeEnhancedOffline();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SettingsProvider>
          <BrowserRouter>
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
              <Route path="/profile" element={<Profile />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/feedback" element={<AdminFeedback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
