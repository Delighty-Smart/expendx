
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/hooks/useAuth'

import IndexPage from '@/pages/Index'
import Auth from '@/pages/Auth'
import Transactions from '@/pages/Transactions'
import Budgets from '@/pages/Budgets'
import Savings from '@/pages/Savings'
import Profile from '@/pages/Profile'
import Reports from '@/pages/Reports'
import Alerts from '@/pages/Alerts'
import Settings from '@/pages/Settings'
import Admin from '@/pages/Admin'
import AdminFeedback from '@/pages/AdminFeedback'
import Feedback from '@/pages/Feedback'
import NotFound from '@/pages/NotFound'

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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<IndexPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/savings" element={<Savings />} />
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
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
