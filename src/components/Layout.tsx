import { Menu, LogOut, Flame, User, Moon, Sun, Home, Receipt, DollarSign, PiggyBank, BarChart, MessageSquare, Settings, Shield, Bell, X, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { updateUserStreak, getUserProfile } from "@/lib/streak";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import StreakModal from "./StreakModal";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/contexts/SettingsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import UserAvatar from "./UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { notificationService } from "@/services/notificationService";
import { Capacitor } from "@capacitor/core";
import GlobalBanner from "@/components/GlobalBanner";
import MobileBottomNav from "@/components/MobileBottomNav";

const Layout = ({
  children
}: {
  children?: React.ReactNode;
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userStreak, setUserStreak] = useState<any>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const {
    theme,
    updateTheme
  } = useSettings();
  const { user, profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!user) return;

    const fetchInitialData = async () => {
      try {
        const streak = await updateUserStreak();
        setUserStreak(streak);
      } catch (error) {
        console.error("Error updating streak:", error);
      }
    };

    const fetchUnreadAlerts = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Alerts fetch timed out')), 6000);
        });

        const alertPromise = supabase.from('alerts').select('id').eq('user_id', user.id).eq('read', false);
        const { data, error } = await (Promise.race([alertPromise, timeoutPromise]) as any);

        if (error) throw error;
        setUnreadAlerts(data?.length || 0);
      } catch (error) {
        console.error('Error fetching unread alerts:', error);
      }
    };

    fetchInitialData();
    fetchUnreadAlerts();

    const channel = supabase.channel(`alerts-${user.id}`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'alerts',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      fetchUnreadAlerts();
      window.dispatchEvent(new CustomEvent('alerts-updated'));

      // Trigger device notification for real-time inserts
      if (payload.new) {
        const alert = payload.new;
        const highPriorityTypes = ['budget_alert', 'budget_breach', 'payment', 'unusual_activity'];

        if (highPriorityTypes.includes(alert.type) || !alert.read) {
          notificationService.sendServiceWorkerNotification(
            alert.title || "New Alert",
            alert.message || "You have a new high-priority notification.",
            {
              tag: alert.id,
              requireInteraction: highPriorityTypes.includes(alert.type)
            }
          );
        }
      }
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (userStreak) {
      const timer = setTimeout(() => {
        const hasSeenStreakModal = sessionStorage.getItem('hasSeenStreakModal');
        if (!hasSeenStreakModal) {
          setShowStreakModal(true);
          sessionStorage.setItem('hasSeenStreakModal', 'true');
        }
      }, 90000);
      return () => clearTimeout(timer);
    }
  }, [userStreak]);

  const handleLogout = () => {
    signOut().then(() => navigate("/auth"));
  };

  const handleStreakClick = () => {
    setShowStreakModal(true);
  };

  const handleProfileClick = () => {
    navigate("/profile");
    setIsSidebarOpen(false);
  };

  const toggleTheme = () => {
    updateTheme(theme === "dark" ? "light" : "dark");
  };

  interface MenuItem {
    path: string;
    label: string;
    icon: any;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }

  const menuItems: MenuItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/transactions", label: "Transactions", icon: Receipt },
    { path: "/budgets", label: "Budgets", icon: DollarSign },
    { path: "/savings", label: "Savings", icon: PiggyBank },
    { path: "/subscriptions", label: "Subscriptions", icon: CreditCard },
    { path: "/reports", label: "Reports", icon: BarChart },
    { path: "/alerts", label: "Alerts", icon: Bell, badge: unreadAlerts > 0 ? unreadAlerts : undefined },
    { path: "/feedback", label: "Feedback", icon: MessageSquare },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  if (isAdmin) {
    menuItems.push({ path: "/admin", label: "Admin Panel", icon: Shield });
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <GlobalBanner />
      <StreakModal open={showStreakModal} onOpenChange={setShowStreakModal} streak={userStreak} className="max-w-sm mx-auto" />

      {/* Header for mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 safe-h-header safe-pt glass-effect border-b border-border/50 z-50">
        <div className="container mx-auto h-full flex items-center justify-between px-4">
          <div className="flex items-center">
            {!isNative && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="animated-button touch-manipulation h-10 w-10 mr-2"
              >
                {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            )}
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png" alt="expendX" className="h-8 object-contain" />
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="animated-button touch-manipulation h-9 w-9">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleProfileClick}
              className="ml-1 rounded-full overflow-hidden border border-border/50 active:scale-95 transition-transform h-8 w-8"
            >
              <UserAvatar
                url={profile?.avatar_url}
                name={profile?.username || "U"}
                className="w-full h-full"
                showDefaultGradient={false}
              />
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop & PWA sidebar nav */}
      {!isNative && (
        <aside className={`fixed top-0 left-0 h-full w-[280px] md:w-64 bg-card border-r border-border transform transition-all duration-300 ease-in-out z-40 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 flex flex-col shadow-lg`}>
          <div className="p-4 safe-pt border-b border-border flex items-center justify-center">
            <img src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png" alt="expendX" className="h-8 object-contain mt-1" />
          </div>

          <nav className="flex-1 px-3 pt-4 space-y-1 overflow-y-auto">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isAction = 'onClick' in item;

              if (isAction) {
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.onClick?.();
                      setIsSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group touch-manipulation text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group touch-manipulation ${location.pathname === item.path ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && <Badge variant="destructive" className="ml-auto text-xs">{item.badge}</Badge>}
                  {item.path === "/feedback" && <div className="ml-auto w-2 h-2 bg-red-500 rounded-full"></div>}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border mt-auto p-2 safe-pb">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-all duration-200 group overflow-hidden" onClick={handleProfileClick}>
                <UserAvatar url={profile?.avatar_url} name={profile?.username || profile?.email || "User"} className="w-8 h-8 flex-shrink-0 shadow-sm ring-1 ring-border/50" />
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0">
                  <p className="text-sm font-bold text-foreground truncate tracking-tighter leading-tight">
                    {profile?.username || profile?.email || "User"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 flex-shrink-0 shadow-sm"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
              </Button>
            </div>
          </div>
        </aside>
      )
      }

      <main className={`safe-pt-header lg:!pt-0 ${!isNative ? 'lg:pl-64' : ''} min-h-screen transition-all duration-300 ${isSidebarOpen ? "brightness-50 lg:brightness-100" : ""}`} onClick={() => isSidebarOpen && setIsSidebarOpen(false)}>
        <div className={`container mx-auto py-3 md:p-4 lg:p-6 animate-fadeIn safe-pb ${isNative ? 'pb-24' : 'lg:pb-6'}`}>
          {children || <Outlet />}
        </div>
      </main>

      {!isNative && isSidebarOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Mobile bottom navigation — only shown on Native APK */}
      {
        isNative && (
          <div className="block pt-4">
            <MobileBottomNav unreadAlerts={unreadAlerts} />
          </div>
        )
      }
    </div >
  );
};

export default Layout;
