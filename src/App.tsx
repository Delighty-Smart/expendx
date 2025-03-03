
import { Routes, Route } from "react-router-dom";
import IndexPage from "./pages/Index";
import AuthPage from "./pages/Auth";
import TransactionsPage from "./pages/Transactions";
import BudgetsPage from "./pages/Budgets";
import SettingsPage from "./pages/Settings";
import NotFoundPage from "./pages/NotFound";
import ProfilePage from "./pages/Profile";
import AlertsPage from "./pages/Alerts";
import { Toaster } from "./components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/" element={<IndexPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster />
          <SonnerToaster position="top-right" expand={true} richColors />
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
