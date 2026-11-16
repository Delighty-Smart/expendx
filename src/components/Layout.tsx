import { Menu, LogOut, Flame, User, Moon, Sun, Home, Banknote, Wallet, Landmark, BarChart3, MessageSquare, Settings, Shield, Bell, X, Repeat, TrendingUp, Hourglass, Gem, Brain, Target, Compass, Sparkles, Layers, History, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { updateUserStreak, getUserProfile } from "@/lib/streak";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
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

import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { useLucentChat } from "@/contexts/ChatContext";

const Layout = ({
  children
}: {
  children?: React.ReactNode;
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userStreak, setUserStreak] = useState<any>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const { theme, updateTheme } = useSettings();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { conversations, loadConversation, deleteConversation } = useLucentChat();
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
        const q = query(
          collection(db, 'alerts'),
          where('user_id', '==', user.id),
          where('read', '==', false)
        );
        const snap = await getDocs(q);
        setUnreadAlerts(snap.size);
      } catch (error) {
        console.error('Error fetching unread alerts:', error);
      }
    };

    fetchInitialData();
    fetchUnreadAlerts();

    const q = query(collection(db, 'alerts'), where('user_id', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unreadCount = 0;
      snapshot.docs.forEach((docSnap) => {
        if (!docSnap.data().read) unreadCount++;
      });
      setUnreadAlerts(unreadCount);
      window.dispatchEvent(new CustomEvent('alerts-updated'));
    }, (error) => console.error("Alerts listener error:", error));

    return () => {
      unsubscribe();
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
    { path: "/chat", label: "Lucent AI Chat", icon: MessageSquare },
    { path: "/ai-marketplace", label: "AI Marketplace", icon: Gem },
    { path: "/insights", label: "AI Insights", icon: Brain },
    { path: "/missions", label: "Missions", icon: Target },
    { path: "/time-travel", label: "Time Travel", icon: Compass },
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/transactions", label: "Transactions", icon: Banknote },
    { path: "/budgets", label: "Budgets", icon: Wallet },
    { path: "/savings", label: "Savings", icon: Landmark },
    { path: "/subscriptions", label: "Subscriptions", icon: Repeat },
    { path: "/reports", label: "Reports", icon: BarChart3 },
    { path: "/trends", label: "Trends", icon: TrendingUp },
    { path: "/life-energy", label: "Life Energy", icon: Hourglass },
    { path: "/alerts", label: "Alerts", icon: Bell, badge: unreadAlerts > 0 ? unreadAlerts : undefined },
    { path: "/trust-center", label: "Trust & Privacy", icon: Shield },
    { path: "/feedback", label: "Feedback", icon: MessageSquare },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  if (isAdmin) {
    menuItems.push({ path: "/admin", label: "Admin Panel", icon: Shield });
  }

  return (
    <div className={`bg-bg-base text-text-primary flex flex-col font-sans transition-colors duration-200 ${location.pathname === '/chat' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'}`}>
      <GlobalBanner />

      {/* Global Drawer Sidebar */}
      <ChatSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNewChat={() => navigate('/chat')}
      />
      <StreakModal open={showStreakModal} onOpenChange={setShowStreakModal} streak={userStreak} className="max-w-sm mx-auto" />

      {/* Header for mobile */}
      {location.pathname !== '/chat' && (
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-bg-surface/90 backdrop-blur-lg border-b border-border-default pt-[calc(max(env(safe-area-inset-top,0px),8px))] pb-1.5 px-3.5">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-1.5 rounded-full hover:bg-bg-sidebar-hover text-text-secondary hover:text-text-primary transition-colors"
                title="Open menu"
              >
                <Menu className="w-5 h-5 text-text-primary" />
              </button>
              <Link to="/chat" className="flex items-center gap-1.5">
                <img src={theme === "dark" ? "/lucent-header-dark.png?v=3" : "/lucent-header-light.png?v=3"} alt="Lucent" className="h-[18px] sm:h-[20px] max-w-[118px] object-contain" />
              </Link>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-7.5 w-7.5 text-text-secondary hover:bg-bg-sidebar-hover hover:text-text-primary rounded-full transition-colors p-0 flex items-center justify-center">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleProfileClick}
                className="ml-0.5 rounded-full overflow-hidden border border-border-default active:scale-95 transition-transform h-7 w-7 p-0"
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
      )}

      {/* Desktop sidebar nav (Hidden on lg < screens) */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-bg-sidebar border-r border-border-default z-40 hidden lg:flex flex-col`}>
        <div className="p-4 safe-pt border-b border-border-default flex items-center justify-center gap-2 h-[72px]">
          <img src={theme === "dark" ? "/lucent-header-dark.png?v=3" : "/lucent-header-light.png?v=3"} alt="Lucent" className="h-[22px] max-w-[135px] object-contain mt-1" />
        </div>

        <nav className="flex-1 px-3 pt-2 space-y-3 overflow-y-auto scrollable-container">
          {/* Group 1: AI Intelligence OS */}
          <div>
            <div className="px-2 mb-1 text-text-secondary">
              <span className="text-[11px] font-semibold tracking-tight text-text-secondary">AI Intelligence</span>
            </div>
            <div className="space-y-0.5">
              {[
                { path: "/chat", label: "Lucent AI Chat", icon: MessageSquare },
                { path: "/ai-marketplace", label: "AI Marketplace", icon: Gem },
                { path: "/insights", label: "AI Insights", icon: Brain },
                { path: "/missions", label: "Missions", icon: Target },
                { path: "/time-travel", label: "Time Travel", icon: Compass },
              ].map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-m3-full transition-all duration-m3-short ease-m3-standard ${
                      isActive
                        ? "bg-m3-secondary-container text-m3-on-secondary-container font-semibold"
                        : "text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-on-surface"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-text-primary" : ""}`} strokeWidth={1.8} />
                    <span className="text-xs">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Group 2: Money Management */}
          <div>
            <div className="px-2 mb-1 text-text-secondary">
              <span className="text-[11px] font-semibold tracking-tight text-text-secondary">Money Management</span>
            </div>
            <div className="space-y-0.5">
              {[
                { path: "/dashboard", label: "Dashboard", icon: Home },
                { path: "/transactions", label: "Transactions", icon: Banknote },
                { path: "/budgets", label: "Budgets", icon: Wallet },
                { path: "/savings", label: "Savings Goals", icon: Landmark },
                { path: "/subscriptions", label: "Subscriptions", icon: Repeat },
              ].map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-m3-full transition-all duration-m3-short ease-m3-standard ${
                      isActive
                        ? "bg-m3-secondary-container text-m3-on-secondary-container font-semibold"
                        : "text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-on-surface"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-text-primary" : ""}`} strokeWidth={1.8} />
                    <span className="text-xs">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Group 3: Analytics & Settings */}
          <div>
            <div className="px-2 mb-1 text-text-secondary">
              <span className="text-[11px] font-semibold tracking-tight text-text-secondary">Analytics & Settings</span>
            </div>
            <div className="space-y-0.5">
              {[
                { path: "/reports", label: "Reports & Trends", icon: BarChart3 },
                { path: "/life-energy", label: "Life Energy", icon: Hourglass },
                { path: "/alerts", label: "Alerts", icon: Bell, badge: unreadAlerts > 0 ? unreadAlerts : undefined },
                { path: "/trust-center", label: "Trust & Privacy", icon: Shield },
                { path: "/settings", label: "Settings", icon: Settings },
              ].map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-m3-full transition-all duration-m3-short ease-m3-standard ${
                      isActive
                        ? "bg-m3-secondary-container text-m3-on-secondary-container font-semibold"
                        : "text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-on-surface"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-text-primary" : ""}`} strokeWidth={1.8} />
                    <span className="text-xs">{item.label}</span>
                    {item.badge && <Badge className="ml-auto text-[9px] bg-semantic-danger-bg text-semantic-danger-text border-semantic-danger-border border">{item.badge}</Badge>}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Dedicated Recent Conversations Section for Desktop Sidebar */}
        <div className="pt-2.5 pb-2 border-t border-border-default/40 px-3 shrink-0">
          <p className="px-2 mb-1.5 text-[11px] font-semibold text-text-secondary">Recents</p>
          <div className="space-y-0.5 max-h-28 overflow-y-auto scrollbar-none">
            {conversations.slice(0, 5).map(item => (
              <div key={item.id} className="group relative flex items-center">
                <button
                  onClick={() => {
                    loadConversation(item.id);
                    if (location.pathname !== '/chat') {
                      navigate('/chat');
                    }
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover truncate transition-colors flex items-center gap-2 pr-6"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-text-secondary/70 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(item.id);
                  }}
                  className="absolute right-1 p-1 rounded hover:bg-rose-500/10 text-text-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete chat"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border-default mt-auto p-4 safe-pb bg-bg-surface">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-2 p-1.5 rounded-lg hover:bg-bg-sidebar-hover cursor-pointer transition-all duration-200 group overflow-hidden" onClick={handleProfileClick}>
              <UserAvatar url={profile?.avatar_url} name={profile?.username || profile?.email || "User"} className="w-8 h-8 flex-shrink-0 shadow-sm ring-1 ring-border-default" />
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-0">
                <p className="text-sm font-semibold text-text-primary truncate tracking-tighter leading-tight">
                  {profile?.username || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}` : profile?.email || "Peter Babalola")}
                </p>
                <p className="text-[11px] text-text-secondary truncate">Manage Account</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-8 w-8 text-text-secondary hover:text-semantic-danger-text hover:bg-semantic-danger-bgSubtle rounded-lg flex-shrink-0"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className={`flex-1 lg:pl-64 transition-all duration-300 ${location.pathname === '/chat' ? 'pt-[calc(max(env(safe-area-inset-top,0px),8px)+44px)] lg:pt-0 h-full min-h-0 max-h-full overflow-hidden flex flex-col' : 'pb-2 pt-14 lg:pt-2 min-h-screen'}`}>
        <div className={location.pathname === '/chat' ? 'w-full h-full flex flex-col min-h-0 flex-1 overflow-hidden' : 'container mx-auto px-4 py-2 md:px-8 md:py-6 lg:px-10 lg:py-8 animate-fadeIn max-w-7xl'}>
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

