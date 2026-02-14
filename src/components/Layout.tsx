import { Menu, LogOut, Flame, User, Moon, Sun, Home, Receipt, DollarSign, PiggyBank, BarChart, MessageSquare, Settings, Shield, Bell, X, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { updateUserStreak, getUserProfile, getStreakText } from "@/lib/streak";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import StreakModal from "./StreakModal";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/contexts/SettingsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { OfflineIndicator } from "./OfflineIndicator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Layout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userStreak, setUserStreak] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const {
    theme,
    updateTheme
  } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const isMobile = useIsMobile();
  useEffect(() => {
    const updateStreak = async () => {
      try {
        const streak = await updateUserStreak();
        setUserStreak(streak);
        const profile = await getUserProfile();
        setUserProfile(profile);
        setIsAdmin(profile?.role === 'admin');
      } catch (error) {
        console.error("Error updating streak:", error);
      }
    };
    updateStreak();
  }, []);
  useEffect(() => {
    const fetchUnreadAlerts = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;
        const {
          data,
          error
        } = await supabase.from('alerts').select('id').eq('user_id', user.id).eq('read', false);
        if (error) throw error;
        setUnreadAlerts(data?.length || 0);
      } catch (error) {
        console.error('Error fetching unread alerts:', error);
      }
    };
    fetchUnreadAlerts();

    // Set up realtime subscription for alerts
    const channel = supabase.channel('alerts-count').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'alerts'
    }, () => {
      fetchUnreadAlerts();
      // Dispatch event to notify Alerts page to refresh
      window.dispatchEvent(new CustomEvent('alerts-updated'));
    }).subscribe((status) => {
      console.log('Subscription status for alerts:', status);
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
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
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account"
      });
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleStreakClick = () => {
    setShowStreakModal(true);
  };
  const handleProfileClick = () => {
    navigate("/profile");
    setIsSidebarOpen(false);
  };
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    updateTheme(newTheme);
  };
  const menuItems = [{
    path: "/",
    label: "Dashboard",
    icon: Home
  }, {
    path: "/transactions",
    label: "Transactions",
    icon: Receipt
  }, {
    path: "/budgets",
    label: "Budgets",
    icon: DollarSign
  }, {
    path: "/savings",
    label: "Savings",
    icon: PiggyBank
  }, {
    path: "/subscriptions",
    label: "Subscriptions",
    icon: CreditCard
  }, {
    path: "/reports",
    label: "Reports",
    icon: BarChart
  }, {
    path: "/alerts",
    label: "Alerts",
    icon: Bell,
    badge: unreadAlerts > 0 ? unreadAlerts : undefined
  }, {
    path: "/feedback",
    label: "Feedback",
    icon: MessageSquare
  }, {
    path: "/settings",
    label: "Settings",
    icon: Settings
  }];
  if (isAdmin) {
    menuItems.push({
      path: "/admin",
      label: "Admin Panel",
      icon: Shield
    });
  }
  return <div className="min-h-screen bg-background transition-colors duration-300">

    <StreakModal open={showStreakModal} onOpenChange={setShowStreakModal} streak={userStreak} className="max-w-sm mx-auto" />

    <header className="lg:hidden fixed top-0 left-0 right-0 h-14 glass-effect border-b border-border/50 z-50">
      <div className="container mx-auto h-full flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="animated-button touch-manipulation">
          {isSidebarOpen ? (
            <X className="h-6 w-6 text-foreground md:h-5 md:w-5" strokeWidth={1.5} />
          ) : (
            <Menu className="h-6 w-6 text-foreground md:h-5 md:w-5" strokeWidth={1.5} />
          )}
        </Button>
        <div className="h-8 md:h-9">
          <img src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png" alt="expendX" className="h-full object-contain" />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="animated-button touch-manipulation" onClick={toggleTheme}>
            {theme === "dark" ? <Moon className="h-6 w-6 text-foreground md:h-5 md:w-5" strokeWidth={1.5} /> : <Sun className="h-6 w-6 text-foreground md:h-5 md:w-5" strokeWidth={1.5} />}
          </Button>
        </div>
      </div>
    </header>

    <aside className={`fixed top-0 left-0 h-full w-[280px] md:w-64 bg-card border-r border-border transform transition-all duration-300 ease-in-out z-40 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 flex flex-col shadow-lg`}>
      {/* Logo Header */}
      <div className="p-4 border-b border-border flex items-center justify-center">
        <img src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png" alt="expendX" className="h-8 object-contain" />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 pt-4 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const IconComponent = item.icon;
          const isActive = location.pathname === item.path;
          return <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group touch-manipulation ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`} onClick={() => setIsSidebarOpen(false)}>
            <IconComponent className="h-5 w-5 flex-shrink-0 md:h-5 md:w-5" strokeWidth={1.5} />
            <span className="text-sm font-medium">{item.label}</span>
            {item.badge && <Badge variant="destructive" className="ml-auto text-xs">{item.badge}</Badge>}
            {item.path === "/feedback" && <div className="ml-auto w-2 h-2 bg-red-500 rounded-full"></div>}
          </Link>;
        })}
      </nav>


      {/* Shortcuts Section */}
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-muted-foreground mb-2 px-3 tracking-wider">SHORTCUTS</p>
        <div className="space-y-1">
          <Link to="/add-transaction" className="flex items-center gap-3 px-3 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors touch-manipulation" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center md:w-5 md:h-5">
              <div className="w-2.5 h-2.5 bg-white rounded-full md:w-2.5 md:h-2.5"></div>
            </div>
            <span className="text-sm">Add Transaction</span>
          </Link>

          <Link to="/reports" className="flex items-center gap-3 px-3 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors touch-manipulation" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-5 h-5 bg-orange-500 rounded-sm flex items-center justify-center md:w-5 md:h-5">
              <div className="w-2.5 h-2.5 bg-white rounded-full md:w-2.5 md:h-2.5"></div>
            </div>
            <span className="text-sm">Monthly Report</span>
          </Link>

          <button onClick={() => {
            handleStreakClick();
            setIsSidebarOpen(false);
          }} className="flex items-center gap-3 px-3 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left touch-manipulation">
            <div className="w-5 h-5 bg-purple-500 rounded-sm flex items-center justify-center md:w-5 md:h-5">
              <Flame className="w-3 h-3 text-white md:w-3 md:h-3" strokeWidth={1.5} />
            </div>
            <span className="text-sm">Streak Progress</span>
          </button>

        </div>
      </div>

      {/* Usage Stats */}


      {/* User Profile */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors touch-manipulation" onClick={handleProfileClick}>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden md:w-9 md:h-9">
            {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <User className="h-5 w-5 text-primary md:h-5 md:w-5" strokeWidth={1.5} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {userProfile?.username || userProfile?.email || "User"}
            </p>
            {userStreak && <p className="text-xs text-muted-foreground truncate">
              {userStreak.current_title}
            </p>}
          </div>
          <Button variant="ghost" size="icon" onClick={e => {
            e.stopPropagation();
            handleLogout();
          }} className="touch-manipulation">
            <LogOut className="h-5 w-5 md:h-5 md:w-5" strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </aside>

    <main className={`pt-14 lg:pt-0 lg:pl-64 min-h-screen transition-all duration-300 ${isSidebarOpen ? "brightness-50 lg:brightness-100" : ""}`} onClick={() => isSidebarOpen && setIsSidebarOpen(false)}>
      <div className="container mx-auto py-3 md:p-4 lg:p-6 animate-fadeIn">
        {children}
      </div>
    </main>

    {isSidebarOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
  </div>;

};
export default Layout;

