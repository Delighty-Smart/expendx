import { Menu, LogOut, Flame, User, Moon, Sun } from "lucide-react";
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userStreak, setUserStreak] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme, updateTheme } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
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

  const setThemeOption = (option: "light" | "dark") => {
    updateTheme(option);
  };

  const menuItems = [
    { path: "/", label: "Dashboard", icon: "Home" },
    { path: "/transactions", label: "Transactions", icon: "Receipt" },
    { path: "/budgets", label: "Budgets", icon: "Budgets" },
    { path: "/savings", label: "Savings", icon: "Savings" },
    { path: "/reports", label: "Reports", icon: "BarChart" },
    { path: "/feedback", label: "Feedback", icon: "MessageSquare" },
    { path: "/settings", label: "Settings", icon: "Settings" },
  ];

  if (isAdmin) {
    menuItems.push({ path: "/admin", label: "Admin Panel", icon: "Shield" });
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <StreakModal 
        open={showStreakModal} 
        onOpenChange={setShowStreakModal} 
        streak={userStreak}
        className="max-w-sm mx-auto"
      />

      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 glass-effect border-b border-border/50 flex items-center justify-between px-3 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="animated-button"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </Button>
        <div className="h-8">
          <img 
            src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png" 
            alt="expendX" 
            className="h-full object-contain"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="animated-button">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 text-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-foreground" />
                )}
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

      <aside
        className={`fixed top-0 left-0 h-full w-[280px] md:w-64 glass-effect border-r border-border/50 transform transition-all duration-300 ease-in-out z-40 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 flex flex-col`}
      >
        <div className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-border/50">
          <div className="h-8 md:h-10">
            <img 
              src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png" 
              alt="expendX" 
              className="h-full object-contain"
            />
          </div>
        </div>
        
        <div 
          className="p-3 md:p-4 border-b border-border/50 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={handleProfileClick}
        >
          <div className="flex items-center gap-3 mb-1 md:mb-2">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="overflow-hidden">
              <p className="font-medium text-sm md:text-base text-foreground truncate">
                {userProfile?.username || userProfile?.email || "User"}
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
        
        {userStreak && (
          <div 
            className="p-3 md:p-4 border-b border-border/50 flex items-center gap-2 cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={handleStreakClick}
          >
            <div className="p-1.5 md:p-2 rounded-full bg-primary/20 flex items-center justify-center">
              <Flame className="h-3.5 w-3.5 md:h-4 md:w-4 text-pink-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs md:text-sm font-medium">{getStreakText(userStreak.current_streak)}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Click to see your progress!
              </p>
            </div>
          </div>
        )}
        
        <nav className="flex-1 p-2 md:p-3 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-1.5 md:px-4 md:py-2 rounded-md mb-1 transition-all duration-200 animated-button text-sm md:text-base ${
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              } flex justify-between items-center`}
              onClick={() => setIsSidebarOpen(false)}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="p-2 border-t border-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full justify-between text-sm font-normal"
              >
                <div className="flex items-center gap-2">
                  {theme === "light" && <Sun className="h-4 w-4" />}
                  {theme === "dark" && <Moon className="h-4 w-4" />}
                  <span>
                    {theme === "light" && "Light Mode"}
                    {theme === "dark" && "Dark Mode"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover/80 backdrop-blur-md border-border/50 w-[180px]">
              <DropdownMenuItem onClick={() => setThemeOption("light")} className="flex gap-2 text-sm">
                <Sun className="h-4 w-4" /> Light Mode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setThemeOption("dark")} className="flex gap-2 text-sm">
                <Moon className="h-4 w-4" /> Dark Mode
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="p-2">
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start gap-2 text-sm font-normal"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
        
        <div className="p-3 text-center text-[10px] md:text-xs text-muted-foreground border-t border-border/50">
          Powered by <span className="font-bold">Delighty Smart Solutions</span>
        </div>
      </aside>

      <main
        className={`pt-14 lg:pt-0 lg:pl-64 min-h-screen transition-all duration-300 ${
          isSidebarOpen ? "brightness-50 lg:brightness-100" : ""
        }`}
        onClick={() => isSidebarOpen && setIsSidebarOpen(false)}
      >
        <div className="container mx-auto p-3 md:p-4 lg:p-6 animate-fadeIn">
          {children}
        </div>
      </main>

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
