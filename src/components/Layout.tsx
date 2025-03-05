
import { Menu, LogOut, Flame, User, MessageSquare, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { updateUserStreak, getUserProfile, getStreakText } from "@/lib/streak";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import StreakModal from "./StreakModal";
import { Badge } from "@/components/ui/badge";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userStreak, setUserStreak] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const updateStreak = async () => {
      try {
        const streak = await updateUserStreak();
        setUserStreak(streak);
        
        const profile = await getUserProfile();
        setUserProfile(profile);
      } catch (error) {
        console.error("Error updating streak:", error);
      }
    };

    updateStreak();
  }, []);

  // Fetch unread alerts count
  useEffect(() => {
    const fetchUnreadAlerts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        const { count, error } = await supabase
          .from("alerts")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", user.id)
          .eq("read", false);

        if (error) throw error;
        
        setUnreadAlerts(count || 0);
      } catch (error) {
        console.error("Error fetching unread alerts:", error);
      }
    };

    fetchUnreadAlerts();
    
    // Set up realtime subscription for alerts
    const alertsChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'alerts'
        },
        (payload) => {
          fetchUnreadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  // Show streak modal after 90 seconds (only once per session)
  useEffect(() => {
    if (userStreak) {
      const timer = setTimeout(() => {
        const hasSeenStreakModal = sessionStorage.getItem('hasSeenStreakModal');
        if (!hasSeenStreakModal) {
          setShowStreakModal(true);
          sessionStorage.setItem('hasSeenStreakModal', 'true');
        }
      }, 90000); // 90 seconds
      
      return () => clearTimeout(timer);
    }
  }, [userStreak]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
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

  const menuItems = [
    { path: "/", label: "Dashboard" },
    { path: "/transactions", label: "Transactions" },
    { path: "/budgets", label: "Budgets" },
    { path: "/reports", label: "Reports" },
    { path: "/alerts", label: "Alerts", icon: <Bell className="h-4 w-4" />, badge: unreadAlerts },
    { path: "/feedback", label: "Feedback" },
    { path: "/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Streak Modal */}
      <StreakModal 
        open={showStreakModal} 
        onOpenChange={setShowStreakModal} 
        streak={userStreak}
      />

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-effect border-b border-border/50 flex items-center justify-between px-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="animated-button"
        >
          <Menu className="h-6 w-6 text-foreground" />
        </Button>
        <div className="h-10">
          <img 
            src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png" 
            alt="expendX" 
            className="h-full object-contain"
          />
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 glass-effect border-r border-border/50 transform transition-all duration-300 ease-in-out z-40 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 flex flex-col`}
      >
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <div className="h-12">
            <img 
              src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png" 
              alt="expendX" 
              className="h-full object-contain"
            />
          </div>
        </div>
        
        {/* User Profile Section */}
        <div 
          className="p-4 border-b border-border/50 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={handleProfileClick}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="overflow-hidden">
              <p className="font-medium text-foreground truncate">
                {userProfile?.first_name || userProfile?.email || "User"}
              </p>
              {userStreak && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"></span>
                  {userStreak.current_title}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Streak Info (clickable) */}
        {userStreak && (
          <div 
            className="p-4 border-b border-border/50 flex items-center gap-2 cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={handleStreakClick}
          >
            <div className="p-2 rounded-full bg-primary/20 flex items-center justify-center">
              <Flame className="h-4 w-4 text-pink-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{getStreakText(userStreak.current_streak)}</p>
              <p className="text-xs text-muted-foreground">
                Click to see your progress!
              </p>
            </div>
          </div>
        )}
        
        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded-lg mb-2 transition-all duration-200 animated-button ${
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              } ${item.badge ? 'flex justify-between items-center' : ''}`}
              onClick={() => setIsSidebarOpen(false)}
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 && (
                <Badge variant="secondary" className="ml-2">{item.badge}</Badge>
              )}
            </Link>
          ))}
        </nav>
        
        {/* Logout Button */}
        <div className="p-4 border-t border-border/50">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`pt-16 lg:pl-64 min-h-screen transition-all duration-300 ${
          isSidebarOpen ? "brightness-50 lg:brightness-100" : ""
        }`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <div className="container mx-auto p-4 lg:p-8 animate-fadeIn">
          {children}
        </div>
      </main>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
