
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, Settings, Megaphone, Layers, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { cn } from '@/lib/utils';

const SidebarAdmin = () => {
  const [unreadFeedback, setUnreadFeedback] = useState(0);

  const fetchUnreadFeedbacks = async () => {
    try {
      const { count, error } = await supabase
        .from('user_feedback')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      setUnreadFeedback(count || 0);
    } catch (error) {
      console.error('Error fetching unread feedback:', error);
    }
  };

  useRealtimeSubscription('user_feedback', '*', fetchUnreadFeedbacks);

  useEffect(() => {
    fetchUnreadFeedbacks();
  }, []);

  const navItems = [
    { to: "/admin", end: true, icon: LayoutDashboard, label: "Overview" },
    { to: "/admin/users", icon: Users, label: "User Base" },
    { to: "/admin/feedback", icon: MessageSquare, label: "Sentiment", badge: unreadFeedback },
  ];

  const marketingItems = [
    { to: "/admin/banners", icon: Megaphone, label: "Campaigns" },
    { to: "/admin/slideshow", icon: Layers, label: "Slideshow" },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-white/5 w-64">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tighter italic">COMMAND</h2>
        </div>
        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] ml-11">
          Central Intelligence
        </p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-8 overflow-y-auto">
        <div>
          <h3 className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 opacity-50">
            Management
          </h3>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  "group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300",
                  isActive
                    ? "bg-white/10 text-white shadow-xl shadow-black/20 translate-x-1"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                <div className="flex items-center">
                  <item.icon className={cn(
                    "mr-3 h-4 w-4 transition-colors",
                    "group-hover:text-primary"
                  )} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 && (
                  <Badge className="bg-primary text-white border-none h-5 min-w-[20px] px-1 shadow-lg shadow-primary/30 flex items-center justify-center font-black text-[10px]">
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <h3 className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 opacity-50">
            Marketing
          </h3>
          <nav className="space-y-1">
            {marketingItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  "group flex items-center rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300",
                  isActive
                    ? "bg-white/10 text-white shadow-xl shadow-black/20 translate-x-1"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn(
                  "mr-3 h-4 w-4 transition-colors",
                  "group-hover:text-primary"
                )} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-4 mt-auto">
        <div className="p-4 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/5">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">System Status</p>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-xs font-bold text-white/90">Operational</span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-2 font-medium">Core v2.4.0-build</p>
        </div>
      </div>
    </div>
  );
};

export default SidebarAdmin;
