
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, Settings, Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const SidebarAdmin = () => {
  const [unreadFeedback, setUnreadFeedback] = useState(0);
  
  useEffect(() => {
    const fetchUnreadFeedbacks = async () => {
      try {
        const { count, error } = await supabase
          .from('user_feedback')
          .select('id', { count: 'exact', head: true })
          .eq('is_read', false);

        if (error) throw error;
        setUnreadFeedback(count || 0);
      } catch (error) {
        console.error('Error fetching unread feedback:', error);
      }
    };

    fetchUnreadFeedbacks();

    // Create a channel for feedback changes
    const feedbackChannel = supabase.channel('feedback-changes');
    
    // Add a specific event listener to the channel with the correct type signature
    feedbackChannel
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'user_feedback' },
        () => fetchUnreadFeedbacks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(feedbackChannel);
    };
  }, []);

  return (
    <div className="space-y-4 py-2">
      <div className="px-4 py-2">
        <h2 className="text-lg font-semibold tracking-tight">Admin Panel</h2>
        <p className="text-xs text-muted-foreground">
          Manage your application settings
        </p>
      </div>
      <Separator className="my-2" />
      <div className="px-3 py-1">
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">Dashboard</h3>
        <div className="space-y-1">
          <NavLink 
            to="/admin" 
            end
            className={({ isActive }) => cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Overview</span>
          </NavLink>
          
          <NavLink 
            to="/admin/feedback" 
            className={({ isActive }) => cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors justify-between",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            <div className="flex items-center">
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Feedback</span>
            </div>
            {unreadFeedback > 0 && (
              <Badge variant="outline" className="ml-auto bg-red-500 text-white border-red-500">
                {unreadFeedback}
              </Badge>
            )}
          </NavLink>
          
          <NavLink 
            to="/admin/users" 
            className={({ isActive }) => cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>Users</span>
          </NavLink>

          <NavLink 
            to="/admin/metrics" 
            className={({ isActive }) => cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            <Gauge className="mr-2 h-4 w-4" />
            <span>Metrics</span>
          </NavLink>

          <NavLink 
            to="/admin/settings" 
            className={({ isActive }) => cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default SidebarAdmin;
