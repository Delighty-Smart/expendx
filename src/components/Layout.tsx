
import { ReactNode, useEffect, useState } from "react";
import { Bell, Menu, X, Settings, Home, TrendingUp, PlusCircle, Target, PiggyBank, BarChart3, User, MessageSquare, AlertCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PendingSyncIndicator } from "./PendingSyncIndicator";
import { OfflineIndicator } from "./OfflineIndicator";
import { supabase } from "@/integrations/supabase/client";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    fetchUnreadAlertsCount();
    
    // Set up real-time subscription for alerts
    const channel = supabase
      .channel('alerts-count')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          fetchUnreadAlertsCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUnreadAlertsCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('alerts')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      setUnreadAlertsCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching unread alerts count:', error);
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Transactions", href: "/transactions", icon: TrendingUp },
    { name: "Add Transaction", href: "/add", icon: PlusCircle },
    { name: "Budgets", href: "/budgets", icon: Target },
    { name: "Savings", href: "/savings", icon: PiggyBank },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { 
      name: "Alerts", 
      href: "/alerts", 
      icon: AlertCircle,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined
    },
    { name: "Profile", href: "/profile", icon: User },
    { name: "Feedback", href: "/feedback", icon: MessageSquare },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden bg-card border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">ExpendX</h1>
        <div className="flex items-center gap-2">
          <PendingSyncIndicator />
          <OfflineIndicator />
          <Link to="/alerts" className="relative">
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
              {unreadAlertsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {unreadAlertsCount}
                </Badge>
              )}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block w-64 bg-card border-r min-h-screen">
          <div className="p-6">
            <h1 className="text-xl font-bold mb-8">ExpendX</h1>
            <nav className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                    {item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto h-5 px-2 text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-8 pt-6 border-t">
              <div className="flex flex-col gap-2">
                <PendingSyncIndicator />
                <OfflineIndicator />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile navigation overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background">
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-xl font-bold">ExpendX</h1>
                <Button variant="ghost" onClick={toggleMobileMenu}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                      {item.badge && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto h-5 px-2 text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
