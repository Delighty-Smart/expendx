
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

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check URL params to set active tab
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'users', 'feedback'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

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
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        toast({
          title: "Error",
          description: "There was an error verifying your permissions",
          variant: "destructive",
        });
        navigate('/');
      }
    };

    checkAdminStatus();
  }, [navigate, toast]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/admin?tab=${value}`, { replace: true });
  };

  if (isAdmin === null) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">System Overview</h2>
              <p className="text-muted-foreground">
                Welcome to the admin panel. Use the tabs above to navigate between different sections.
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
    </Layout>
  );
};

export default AdminDashboard;
