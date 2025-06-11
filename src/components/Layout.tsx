
import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Home, PlusCircle, BarChart3, PieChart, DollarSign, Wallet, Settings, User, MessageSquare, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import AlphaBadge from "./AlphaBadge";

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currency } = useSettings();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/transactions", icon: BarChart3, label: "Transactions" },
    { path: "/budgets", icon: PieChart, label: "Budgets" },
    { path: "/savings", icon: DollarSign, label: "Savings" },
    { path: "/reports", icon: Wallet, label: "Reports" },
    { path: "/profile", icon: User, label: "Profile" },
    { path: "/feedback", icon: MessageSquare, label: "Feedback" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const isActiveRoute = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const DesktopSidebar = () => (
    <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 z-50 bg-card border-r border-border">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center h-16 px-4 border-b border-border">
          <h1 className="text-xl font-bold text-foreground flex items-center">
            ExpendX
            <AlphaBadge />
          </h1>
        </div>
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={isActiveRoute(item.path) ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleNavigation(item.path)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );

  const MobileHeader = () => (
    <div className="md:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <h1 className="text-lg font-bold text-foreground flex items-center">
          ExpendX
          <AlphaBadge />
        </h1>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSidebarOpen(true)}
        className="p-2"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </div>
  );

  const MobileSidebar = () => (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-64 h-full bg-card border-r border-border">
            <div className="flex items-center justify-between h-16 px-4 border-b border-border">
              <h1 className="text-xl font-bold text-foreground flex items-center">
                ExpendX
                <AlphaBadge />
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="p-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    variant={isActiveRoute(item.path) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleNavigation(item.path)}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="h-screen flex bg-background">
      <DesktopSidebar />
      <MobileSidebar />
      
      <div className="flex flex-col flex-1 md:pl-64">
        <MobileHeader />
        
        <main className="flex-1 relative overflow-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children || <Outlet />}
            </div>
          </div>
        </main>
        
        <div className="md:hidden">
          <div className="bg-card border-t border-border px-4 py-2">
            <Button
              onClick={() => navigate("/add-transaction")}
              className="w-full"
              size="lg"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
