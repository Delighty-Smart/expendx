
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserManagement from "@/components/admin/UserManagement";
import FeedbackManagement from "@/components/admin/FeedbackManagement";
import BannerManagement from "@/components/admin/BannerManagement";
import AdminStatChart from "@/components/admin/AdminStatChart";
import AdminActivityFeed from "@/components/admin/AdminActivityFeed";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  CreditCard,
  MessageSquare,
  TrendingUp,
  LayoutDashboard,
  ShieldAlert,
  Activity,
  Server,
  Database as DbIcon,
  Globe
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
  const [trends, setTrends] = useState<Record<string, { value: number }[]>>({
    users: [],
    transactions: [],
    feedback: [],
    streaks: []
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

  // Generate mock trend data for now (could be replaced with real windowed aggregation)
  const generateTrend = (base: number) => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: Math.max(0, base - (12 - i) * Math.floor(Math.random() * 5) + Math.floor(Math.random() * 10))
    }));
  };

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

      const counts = {
        userCount: userCount || 0,
        transactionCount: transactionCount || 0,
        feedbackCount: feedbackCount || 0,
        streakCount: streakCount || 0,
        savingsCount: savingsCount || 0
      };

      setStats(counts);

      // Update trends based on new counts
      setTrends({
        users: generateTrend(counts.userCount),
        transactions: generateTrend(counts.transactionCount),
        feedback: generateTrend(counts.feedbackCount),
        streaks: generateTrend(counts.streakCount)
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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary border-t-transparent shadow-premium" />
          <p className="text-muted-foreground font-medium animate-pulse">Initializing Command Center...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#09090b] text-white">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block w-72 border-r border-white/5 bg-black/40 backdrop-blur-xl p-6 space-y-8 sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-3 px-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tighter text-white">ExpendX <span className="text-primary text-xs ml-1 uppercase bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">Admin</span></h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Control Panel v2.0</p>
          </div>
        </div>

        <nav className="space-y-2">
          <p className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Core Management</p>
          {[
            { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'feedback', label: 'Feedback', icon: MessageSquare },
            { id: 'banners', label: 'Marketing', icon: ShieldAlert },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 group ${activeTab === item.id
                ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10'
                : 'text-muted-foreground hover:bg-white/[0.03] hover:text-white'
                }`}
            >
              <item.icon className={`h-5 w-5 transition-colors ${activeTab === item.id ? 'text-primary' : 'text-muted-foreground group-hover:text-white'}`} />
              {item.label}
              {activeTab === item.id && <motion.div layoutId="activeTab" className="ml-auto w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
            </button>
          ))}
        </nav>

        <div className="pt-8 space-y-4">
          <p className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Platform Health</p>
          <HealthItem label="Database" status="online" icon={DbIcon} />
          <HealthItem label="Storage" status="online" icon={Globe} />
          <HealthItem label="API" status="online" icon={Server} />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-black to-[#09090b]">
        <div className="max-w-[1600px] mx-auto p-6 md:p-10">
          <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                {activeTab === 'overview' ? 'Dashboard Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <p className="text-sm text-muted-foreground font-medium">
                  {activeTab === 'overview' && "Live analytics and system metrics."}
                  {activeTab === 'users' && `${stats.userCount} registered accounts found.`}
                  {activeTab === 'feedback' && "User sentiment and bug reports."}
                  {activeTab === 'banners' && "Campaign management and global popups."}
                </p>
              </div>
            </motion.div>

            <div className="flex gap-3">
              <button className="h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95 text-white">
                <Activity className="h-4 w-4 text-primary" />
                Live Feed
              </button>
              <button className="h-10 w-10 bg-white text-black rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-xl active:scale-95">
                <TrendingUp className="h-5 w-5" />
              </button>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Tabs value={activeTab} className="w-full space-y-10">
                <TabsContent value="overview" className="space-y-10 m-0 outline-none border-none">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <StatsCard
                      title="Total Users"
                      value={stats.userCount}
                      icon={Users}
                      trend="+12% growth"
                      chartData={trends.users}
                      color="blue"
                    />
                    <StatsCard
                      title="Transactions"
                      value={stats.transactionCount}
                      icon={CreditCard}
                      trend="3.2k this week"
                      chartData={trends.transactions}
                      color="emerald"
                    />
                    <StatsCard
                      title="Sentiment"
                      value={stats.feedbackCount}
                      icon={MessageSquare}
                      trend="Positive trend"
                      chartData={trends.feedback}
                      color="amber"
                    />
                    <StatsCard
                      title="Engagement"
                      value={stats.streakCount}
                      icon={TrendingUp}
                      trend="+5.2% daily"
                      chartData={trends.streaks}
                      color="violet"
                    />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Activity Feed */}
                    <Card className="xl:col-span-2 bg-[#0d0d0f] border-white/5 shadow-2xl rounded-3xl overflow-hidden border-none transition-all">
                      <CardHeader className="border-b border-white/5 p-6 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-xl font-bold text-white">Recent System Activity</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1 font-medium italic">Latest events across the platform</p>
                        </div>
                        <button className="text-xs font-bold text-primary hover:underline transition-all">View All Activity</button>
                      </CardHeader>
                      <CardContent className="p-6">
                        <AdminActivityFeed />
                      </CardContent>
                    </Card>

                    {/* Quick Stats/Summary */}
                    <div className="space-y-6">
                      <Card className="bg-[#0d0d0f] border-white/5 shadow-2xl rounded-3xl overflow-hidden border-none transition-all">
                        <CardHeader className="p-6">
                          <CardTitle className="text-xl font-bold text-white">System Status</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                          <StatusIndicator label="DB Throughput" value="Normal" progress={85} />
                          <StatusIndicator label="API Latency" value="24ms" progress={92} />
                          <StatusIndicator label="Auth Service" value="Steady" progress={98} />
                          <StatusIndicator label="Storage Cap" value="12%" progress={12} />
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-primary to-primary/80 border-none shadow-2xl rounded-3xl overflow-hidden p-6 text-white group cursor-pointer active:scale-[0.98] transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Pro License</p>
                            <h3 className="text-2xl font-black mt-1">Upgrade System</h3>
                            <p className="text-xs mt-2 opacity-90 max-w-[200px]">Unlock advanced predictive analytics and user behavior mapping.</p>
                          </div>
                          <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-all">
                            <TrendingUp className="h-6 w-6" />
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="users" className="m-0 outline-none border-none">
                  <Card className="bg-[#0d0d0f] border-white/5 shadow-2xl rounded-3xl overflow-hidden min-h-[600px] border-none">
                    <CardContent className="p-8">
                      <UserManagement />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="feedback" className="m-0 outline-none border-none">
                  <Card className="bg-[#0d0d0f] border-white/5 shadow-2xl rounded-3xl overflow-hidden min-h-[600px] border-none">
                    <CardContent className="p-8">
                      <FeedbackManagement />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="banners" className="m-0 outline-none border-none">
                  <Card className="bg-[#0d0d0f] border-white/5 shadow-2xl rounded-3xl overflow-hidden min-h-[600px] border-none">
                    <CardContent className="p-8">
                      <BannerManagement />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const HealthItem = ({ label, status, icon: Icon }: any) => (
  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-all group cursor-default">
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-all">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all" />
      </div>
      <span className="text-sm font-semibold text-muted-foreground group-hover:text-white transition-all">{label}</span>
    </div>
    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
  </div>
);

const StatusIndicator = ({ label, value, progress }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between items-end">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-xs font-black text-white">{value}</span>
    </div>
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`h-full rounded-full bg-primary`}
      />
    </div>
  </div>
);

const StatsCard = ({ title, value, icon: Icon, trend, color, chartData }: any) => {
  const colorClasses: Record<string, string> = {
    blue: "from-blue-500/10 to-transparent",
    emerald: "from-emerald-500/10 to-transparent",
    amber: "from-amber-500/10 to-transparent",
    violet: "from-violet-500/10 to-transparent",
  };

  const iconColors: Record<string, string> = {
    blue: "text-blue-500",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    violet: "text-violet-500",
  };

  const hexColor = color === 'blue' ? '#3b82f6' : color === 'emerald' ? '#10b981' : color === 'amber' ? '#f59e0b' : color === 'violet' ? '#8b5cf6' : '#3b82f6';

  return (
    <Card className="bg-[#0d0d0f] border-white/5 hover:border-white/10 transition-all duration-300 shadow-2xl rounded-[2rem] overflow-hidden border-none group">
      <div className={`p-6 bg-gradient-to-b ${colorClasses[color]}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-2xl bg-white/5 group-hover:scale-110 transition-all duration-300">
            <Icon className={`h-6 w-6 ${iconColors[color]}`} />
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
            <h3 className="text-3xl font-black mt-1 tabular-nums text-white text-3xl font-bold">{value.toLocaleString()}</h3>
          </div>
        </div>
        <div className="flex items-center justify-between mt-6">
          <div className="flex flex-col">
            <p className={`text-[10px] font-black italic ${iconColors[color]} bg-${color}-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1`}>
              <TrendingUp className="h-3 w-3" />
              {trend}
            </p>
          </div>
          <div className="w-24 h-12">
            <AdminStatChart data={chartData} color={hexColor} />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AdminDashboard;
