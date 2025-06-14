import { Menu, LogOut, Flame, User, Moon, Sun, Home, Receipt, DollarSign, PiggyBank, BarChart, MessageSquare, Settings, Shield } from "lucide-react";
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
  const setThemeOption = (option: "light" | "dark") => {
    updateTheme(option);
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
    path: "/reports",
    label: "Reports",
    icon: BarChart
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

      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 glass-effect border-b border-border/50 flex items-center justify-between px-3 z-50">
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="animated-button">
          <Menu className="h-5 w-5 text-foreground" />
        </Button>
        <div className="h-8">
          <img src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png" alt="expendX" className="h-full object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="animated-button">
                {theme === "dark" ? <Moon className="h-5 w-5 text-foreground" /> : <Sun className="h-5 w-5 text-foreground" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover/80 backdrop-blur-md border-border/50">
              <DropdownMenuItem onClick={() => setThemeOption("light")} className="flex gap-2 text-sm">
                <Sun className="h-4 w-4" /> Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setThemeOption("dark")} className="flex gap-2 text-sm">
                <Moon className="h-4 w-4" /> Dark
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <aside className={`fixed top-0 left-0 h-full w-[280px] md:w-64 bg-card border-r border-border transform transition-all duration-300 ease-in-out z-40 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 flex flex-col shadow-lg`}>
        {/* Integration Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Integration</p>
            </div>
          </div>
          
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map(item => {
          const IconComponent = item.icon;
          const isActive = location.pathname === item.path;
          return <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`} onClick={() => setIsSidebarOpen(false)}>
                <IconComponent className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.path === "/feedback" && <div className="ml-auto w-2 h-2 bg-red-500 rounded-full"></div>}
              </Link>;
        })}
        </nav>

        {/* Shortcuts Section */}
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-3">SHORTCUTS</p>
          <div className="space-y-1">
            <Link to="/add-transaction" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setIsSidebarOpen(false)}>
              <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span className="text-sm">Add Transaction</span>
            </Link>
            <Link to="/reports" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setIsSidebarOpen(false)}>
              <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span className="text-sm">Monthly Report</span>
            </Link>
          </div>
        </div>

        {/* Usage Stats */}
        

        {/* User Profile */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors" onClick={handleProfileClick}>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <User className="h-4 w-4 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {userProfile?.username || userProfile?.email || "User"}
              </p>
              {userStreak && <p className="text-xs text-muted-foreground truncate">
                  {userStreak.current_title}
                </p>}
            </div>
            <Button variant="ghost" size="sm" onClick={e => {
            e.stopPropagation();
            handleLogout();
          }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className={`pt-14 lg:pt-0 lg:pl-64 min-h-screen transition-all duration-300 ${isSidebarOpen ? "brightness-50 lg:brightness-100" : ""}`} onClick={() => isSidebarOpen && setIsSidebarOpen(false)}>
        <div className="container mx-auto p-3 md:p-4 lg:p-6 animate-fadeIn">
          {children}
        </div>
      </main>

      {isSidebarOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>;
};
export default Layout;