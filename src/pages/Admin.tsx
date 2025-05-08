import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserManagement from "@/components/admin/UserManagement";
import FeedbackManagement from "@/components/admin/FeedbackManagement";
import SidebarAdmin from "@/components/admin/SidebarAdmin";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    userCount: 0,
    transactionCount: 0,
    feedbackCount: 0
  });
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    // Check URL params to set active tab
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'users', 'feedback'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      // Fetch user count
      const {
        count: userCount,
        error: userError
      } = await supabase.from('user_profiles').select('*', {
        count: 'exact',
        head: true
      });
      if (userError) throw userError;

      // Fetch transaction count
      const {
        count: transactionCount,
        error: transactionError
      } = await supabase.from('transactions').select('*', {
        count: 'exact',
        head: true
      });
      if (transactionError) throw transactionError;

      // Fetch feedback count
      const {
        count: feedbackCount,
        error: feedbackError
      } = await supabase.from('user_feedback').select('*', {
        count: 'exact',
        head: true
      });
      if (feedbackError) throw feedbackError;
      setStats({
        userCount: userCount || 0,
        transactionCount: transactionCount || 0,
        feedbackCount: feedbackCount || 0
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  // Set up realtime subscriptions for dashboard stats
  useRealtimeSubscription('user_profiles', '*', () => fetchDashboardStats());
  useRealtimeSubscription('transactions', '*', () => fetchDashboardStats());
  useRealtimeSubscription('user_feedback', '*', () => fetchDashboardStats());
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }
        const {
          data: profileData,
          error
        } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        if (error) throw error;
        if (profileData?.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access the admin dashboard",
            variant: "destructive"
          });
          navigate('/');
          return;
        }
        setIsAdmin(true);
        fetchDashboardStats(); // Initial fetch of dashboard stats
      } catch (error) {
        console.error("Error checking admin status:", error);
        toast({
          title: "Error",
          description: "There was an error verifying your permissions",
          variant: "destructive"
        });
        navigate('/');
      }
    };
    checkAdminStatus();
  }, [navigate, toast]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/admin?tab=${value}`, {
      replace: true
    });
  };
  if (isAdmin === null) {
    return <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>;
  }
  return <Layout>
      <div className="space-y-6">
        <h1 className="font-bold text-xl">Admin Dashboard</h1>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">System Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Users</h3>
                  <p className="text-2xl font-bold">{stats.userCount}</p>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-600 dark:text-green-400">Transactions</h3>
                  <p className="text-2xl font-bold">{stats.transactionCount}</p>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-amber-600 dark:text-amber-400">Feedback Entries</h3>
                  <p className="text-2xl font-bold">{stats.feedbackCount}</p>
                </div>
              </div>
              
              <p className="text-muted-foreground">
                Welcome to the admin panel. Use the tabs above to navigate between different sections.
                The dashboard will automatically update when data changes.
              </p>
            </Card>
          </TabsContent>
          
          <TabsContent value="users" className="mt-4">
            <Card className="p-6">
              <UserManagement />
            </Card>
          </TabsContent>
          
          <TabsContent value="feedback" className="mt-4">
            <Card className="p-6">
              <FeedbackManagement />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>;
};
export default AdminDashboard;