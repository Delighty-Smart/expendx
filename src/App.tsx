
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AddTransaction from "./pages/AddTransaction";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import AddBudget from "./pages/AddBudget";
import EditBudget from "./pages/EditBudget";
import Savings from "./pages/Savings";
import AddSavingsGoal from "./pages/AddSavingsGoal";
import SetSavingsGoal from "./pages/SetSavingsGoal";
import SavingsWithdrawal from "./pages/SavingsWithdrawal";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import SetIncome from "./pages/SetIncome";
import Feedback from "./pages/Feedback";
import Admin from "./pages/Admin";
import AdminFeedback from "./pages/AdminFeedback";
import Alerts from "./pages/Alerts";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <SettingsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/add" element={<AddTransaction />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/budgets" element={<Budgets />} />
                  <Route path="/budgets/add" element={<AddBudget />} />
                  <Route path="/budgets/edit/:id" element={<EditBudget />} />
                  <Route path="/savings" element={<Savings />} />
                  <Route path="/savings/add" element={<AddSavingsGoal />} />
                  <Route path="/savings/set/:id" element={<SetSavingsGoal />} />
                  <Route path="/savings/withdrawal/:id" element={<SavingsWithdrawal />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/set-income" element={<SetIncome />} />
                  <Route path="/feedback" element={<Feedback />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/feedback" element={<AdminFeedback />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
