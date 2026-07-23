import { Menu, LogOut, Flame, User, Moon, Sun, Home, Banknote, Wallet, Landmark, BarChart3, MessageSquare, Settings, Shield, Bell, X, Repeat, TrendingUp, Hourglass } from "lucide-react";
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
import GlobalBanner from "@/components/GlobalBanner";
import MobileBottomNav from "@/components/MobileBottomNav";

const Layout = ({
  children
}: {
  children?: React.ReactNode;
}) => {
  const [userStreak, setUserStreak] = useState<any>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const { theme, updateTheme } = useSettings();
  const { user, profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleProfileClick = () => {
    navigate("/profile");
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
    { path: "/transactions", label: "Transactions", icon: Banknote },
    { path: "/budgets", label: "Budgets", icon: Wallet },
    { path: "/savings", label: "Savings", icon: Landmark },
    { path: "/subscriptions", label: "Subscriptions", icon: Repeat },
    { path: "/reports", label: "Reports", icon: BarChart3 },
    { path: "/trends", label: "Trends", icon: TrendingUp },
    { path: "/life-energy", label: "Life Energy", icon: Hourglass },
    { path: "/alerts", label: "Alerts", icon: Bell, badge: unreadAlerts > 0 ? unreadAlerts : undefined },
    { path: "/feedback", label: "Feedback", icon: MessageSquare },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  if (isAdmin) {
    menuItems.push({ path: "/admin", label: "Admin Panel", icon: Shield });
  }

  return (
    <div className="min-h-screen bg-bg-base transition-colors duration-300 flex flex-col safe-pt">
      <GlobalBanner />
      <StreakModal open={showStreakModal} onOpenChange={setShowStreakModal} streak={userStreak} className="max-w-sm mx-auto" />

      {/* Header for mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-bg-surface/90 backdrop-blur-lg border-b border-border-default pt-[calc(max(env(safe-area-inset-top,0px),24px)+6px)] pb-3 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={theme === "dark" ? "/lucent-header-dark.png" : "/lucent-header-light.png"} alt="Lucent" className="h-8 object-contain" />
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 text-text-secondary hover:bg-bg-sidebar-hover hover:text-text-primary rounded-full transition-colors">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleProfileClick}
              className="ml-1 rounded-full overflow-hidden border border-border-default active:scale-95 transition-transform h-8 w-8"
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

      {/* Desktop sidebar nav (Hidden on lg < screens) */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-bg-sidebar border-r border-border-default z-40 hidden lg:flex flex-col`}>
        <div className="p-4 safe-pt border-b border-border-default flex items-center justify-center gap-2 h-[72px]">
          <img src={theme === "dark" ? "/lucent-header-dark.png" : "/lucent-header-light.png"} alt="Lucent" className="h-8 object-contain mt-1" />
        </div>

        <nav className="flex-1 px-3 pt-4 space-y-1 overflow-y-auto scrollable-container">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isAction = 'onClick' in item;

            if (isAction) {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    item.onClick?.();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-text-secondary hover:bg-semantic-danger-bgSubtle hover:text-semantic-danger-text"
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${location.pathname === item.path ? "bg-bg-sidebar-active text-text-primary font-medium" : "text-text-secondary hover:bg-bg-sidebar-hover hover:text-text-primary"}`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${location.pathname === item.path ? "text-brand-primary" : ""}`} strokeWidth={1.5} />
                <span className="text-sm">{item.label}</span>
                {item.badge && <Badge className="ml-auto text-xs bg-semantic-danger-bg text-semantic-danger-text border-semantic-danger-border border">{item.badge}</Badge>}
                {item.path === "/feedback" && <div className="ml-auto w-2 h-2 bg-semantic-danger-bg rounded-full"></div>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border-default mt-auto p-4 safe-pb bg-bg-surface">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-2 p-1.5 rounded-lg hover:bg-bg-sidebar-hover cursor-pointer transition-all duration-200 group overflow-hidden" onClick={handleProfileClick}>
              <UserAvatar url={profile?.avatar_url} name={profile?.username || profile?.email || "User"} className="w-8 h-8 flex-shrink-0 shadow-sm ring-1 ring-border-default" />
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-0">
                <p className="text-sm font-semibold text-text-primary truncate tracking-tighter leading-tight">
                  {profile?.username || profile?.email || "User"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 rounded-lg bg-semantic-danger-bgSubtle text-semantic-danger-text hover:bg-semantic-danger-bg hover:text-semantic-danger-textStrong transition-all duration-200 flex-shrink-0 shadow-sm"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </Button>
          </div>
        </div>
      </aside>

      <main className={`flex-1 lg:pl-64 safe-pt-main min-h-screen transition-all duration-300 pb-20 lg:pb-6`}>
        <div className="container mx-auto px-6 py-4 md:p-6 lg:p-8 animate-fadeIn max-w-7xl">
          {children || <Outlet />}
        </div>
      </main>

      {/* Mobile bottom navigation — always shown on mobile screens */}
      <div className="block lg:hidden">
        <MobileBottomNav unreadAlerts={unreadAlerts} />
      </div>
    </div>
  );
};

export default Layout;

