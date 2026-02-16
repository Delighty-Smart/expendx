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
      event: '*',
      schema: 'public',
      table: 'alerts',
      filter: `user_id=eq.${user.id}`
    }, () => {
      fetchUnreadAlerts();
      window.dispatchEvent(new CustomEvent('alerts-updated'));
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

  const menuItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/transactions", label: "Transactions", icon: Receipt },
    { path: "/budgets", label: "Budgets", icon: DollarSign },
    { path: "/savings", label: "Savings", icon: PiggyBank },
    { path: "/subscriptions", label: "Subscriptions", icon: CreditCard },
    { path: "/reports", label: "Reports", icon: BarChart },
    { path: "/alerts", label: "Alerts", icon: Bell, badge: unreadAlerts > 0 ? unreadAlerts : undefined },
    { path: "/feedback", label: "Feedback", icon: MessageSquare },
    { path: "/settings", label: "Settings", icon: Settings },
    { path: "#", label: "Log Out", icon: LogOut, onClick: handleLogout, active: false },
  ];

  if (isAdmin) {
    menuItems.push({ path: "/admin", label: "Admin Panel", icon: Shield });
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <StreakModal open={showStreakModal} onOpenChange={setShowStreakModal} streak={userStreak} className="max-w-sm mx-auto" />

      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 glass-effect border-b border-border/50 z-50">
        <div className="container mx-auto h-full flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="animated-button touch-manipulation">
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          <div className="h-8 md:h-9">
            <img src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png" alt="expendX" className="h-full object-contain" />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="animated-button touch-manipulation">
              {theme === "dark" ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </header>

      <aside className={`fixed top-0 left-0 h-full w-[280px] md:w-64 bg-card border-r border-border transform transition-all duration-300 ease-in-out z-40 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 flex flex-col shadow-lg`}>
        <div className="p-4 border-b border-border flex items-center justify-center">
          <img src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png" alt="expendX" className="h-8 object-contain" />
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

        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2 px-3 tracking-wider">SHORTCUTS</p>
          <div className="space-y-1">
            <Link to="/add-transaction" className="flex items-center gap-3 px-3 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setIsSidebarOpen(false)}>
              <div className="w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
              </div>
              <span className="text-sm">Add Transaction</span>
            </Link>
            <Link to="/reports" className="flex items-center gap-3 px-3 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setIsSidebarOpen(false)}>
              <div className="w-5 h-5 bg-orange-500 rounded-sm flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
              </div>
              <span className="text-sm">Monthly Report</span>
            </Link>
            <button onClick={() => { handleStreakClick(); setIsSidebarOpen(false); }} className="flex items-center gap-3 px-3 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left">
              <div className="w-5 h-5 bg-purple-500 rounded-sm flex items-center justify-center">
                <Flame className="w-3 h-3 text-white" strokeWidth={1.5} />
              </div>
              <span className="text-sm">Streak Progress</span>
            </button>
          </div>
        </div>

        <div className="border-t border-border mt-auto p-1.5">
          <div className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-accent/50 cursor-pointer transition-all duration-200 group" onClick={handleProfileClick}>
            <UserAvatar url={profile?.avatar_url} name={profile?.username || profile?.email || "User"} className="w-8 h-8 shadow-sm ring-1 ring-border/50" />
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-sm font-bold text-foreground truncate tracking-tighter leading-none">
                {profile?.username || profile?.email || "User"}
              </p>
              {userStreak && <p className="text-[10px] uppercase font-black text-muted-foreground/50 truncate tracking-wider leading-none mt-1">
                {userStreak.current_title}
              </p>}
            </div>
          </div>
        </div>
      </aside>

      <main className={`pt-14 lg:pt-0 lg:pl-64 min-h-screen transition-all duration-300 ${isSidebarOpen ? "brightness-50 lg:brightness-100" : ""}`} onClick={() => isSidebarOpen && setIsSidebarOpen(false)}>
        <div className="container mx-auto py-3 md:p-4 lg:p-6 animate-fadeIn">
          {children || <Outlet />}
        </div>
      </main>

      {isSidebarOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

export default Layout;
