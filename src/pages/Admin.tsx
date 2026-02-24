
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserManagement from "@/components/admin/UserManagement";
import FeedbackManagement from "@/components/admin/FeedbackManagement";
import BannerManagement from "@/components/admin/BannerManagement";
import SidebarAdmin from "@/components/admin/SidebarAdmin";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import {
  Users,
  CreditCard,
  MessageSquare,
  TrendingUp,
  PiggyBank,
  LayoutDashboard,
  ShieldAlert
} from "lucide-react";

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    userCount: 0,
    transactionCount: 0,
    feedbackCount: 0,
    streakCount: 0,
    savingsCount: 0
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'users', 'feedback', 'banners'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      const [
        { count: userCount },
        { count: transactionCount },
        { count: feedbackCount },
        { count: streakCount },
        { count: savingsCount }
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('user_feedback').select('*', { count: 'exact', head: true }),
        supabase.from('user_streaks').select('*', { count: 'exact', head: true }),
        supabase.from('savings_goals').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        userCount: userCount || 0,
        transactionCount: transactionCount || 0,
        feedbackCount: feedbackCount || 0,
        streakCount: streakCount || 0,
        savingsCount: savingsCount || 0
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  useRealtimeSubscription('user_profiles', '*', fetchDashboardStats);
  useRealtimeSubscription('transactions', '*', fetchDashboardStats);
  useRealtimeSubscription('user_feedback', '*', fetchDashboardStats);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        const { data: profileData, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (profileData?.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access the admin dashboard",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }

        setIsAdmin(true);
        fetchDashboardStats();
      } catch (error) {
        console.error("Error checking admin status:", error);
        navigate('/dashboard');
      }
    };

    checkAdminStatus();
  }, [navigate, toast]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/admin?tab=${value}`, { replace: true });
  };

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground animate-pulse">Verifying privileges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block w-64 border-r bg-card/50 backdrop-blur-sm p-4 space-y-4">
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Admin Portal</h1>
            <p className="text-xs text-muted-foreground">System Management</p>
          </div>
        </div>

        <nav className="space-y-1">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'feedback', label: 'Feedback', icon: MessageSquare },
            { id: 'banners', label: 'Banners & Popups', icon: ShieldAlert },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === item.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h1>
              <p className="text-muted-foreground mt-1">
                {activeTab === 'overview' && "System-wide metrics and status at a glance."}
                {activeTab === 'users' && "Manage user accounts, roles, and permissions."}
                {activeTab === 'feedback' && "Review and respond to user feedback."}
                {activeTab === 'banners' && "Manage global announcements and popups."}
              </p>
            </div>
            {/* Mobile Sidebar Trigger could go here if needed */}
          </header>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-8">
            <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="Total Users"
                  value={stats.userCount}
                  icon={Users}
                  trend="+12% from last month"
                  color="blue"
                />
                <StatsCard
                  title="Transactions"
                  value={stats.transactionCount}
                  icon={CreditCard}
                  trend="Active daily volume"
                  color="green"
                />
                <StatsCard
                  title="Feedback"
                  value={stats.feedbackCount}
                  icon={MessageSquare}
                  trend="Pending review"
                  color="amber"
                />
                <StatsCard
                  title="Active Streaks"
                  value={stats.streakCount}
                  icon={TrendingUp}
                  trend="High engagement"
                  color="purple"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">New user registration</p>
                            <p className="text-xs text-muted-foreground">2 minutes ago</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>System Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                          <span className="font-medium text-sm">Database</span>
                        </div>
                        <span className="text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded-full">Operational</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                          <span className="font-medium text-sm">API Gateway</span>
                        </div>
                        <span className="text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded-full">Operational</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                          <span className="font-medium text-sm">Vercel Deployment</span>
                        </div>
                        <span className="text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded-full">Operational</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              <UserManagement />
            </TabsContent>

            <TabsContent value="feedback" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              <FeedbackManagement />
            </TabsContent>

            <TabsContent value="banners" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              <BannerManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

// Helper component for clearer stats code
const StatsCard = ({ title, value, icon: Icon, trend, color }: any) => {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500 bg-blue-500/10",
    green: "text-green-500 bg-green-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    purple: "text-purple-500 bg-purple-500/10",
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;
