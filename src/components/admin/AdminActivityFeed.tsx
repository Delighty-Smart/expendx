
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Users, CreditCard, MessageSquare, TrendingUp, PiggyBank, Bell } from "lucide-react";

interface Activity {
    id: string;
    type: 'user' | 'transaction' | 'feedback' | 'streak' | 'savings' | 'alert';
    title: string;
    description: string;
    timestamp: string;
}

const AdminActivityFeed = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchActivities = async () => {
        try {
            setLoading(true);

            const [
                { data: users },
                { data: transactions },
                { data: feedback },
                { data: alerts }
            ] = await Promise.all([
                supabase.from('user_profiles').select('id, email, created_at').order('created_at', { ascending: false }).limit(5),
                supabase.from('transactions').select('id, amount, description, created_at').order('created_at', { ascending: false }).limit(5),
                supabase.from('user_feedback').select('id, rating, created_at').order('created_at', { ascending: false }).limit(5),
                supabase.from('alerts').select('id, title, type, created_at').order('created_at', { ascending: false }).limit(20)
            ]);

            const allActivities: Activity[] = [
                ...(users || []).map(u => ({
                    id: u.id,
                    type: 'user' as const,
                    title: 'New User Join',
                    description: `${u.email} joined the platform.`,
                    timestamp: u.created_at || new Date().toISOString()
                })),
                ...(transactions || []).map(t => ({
                    id: t.id,
                    type: 'transaction' as const,
                    title: 'New Transaction',
                    description: `Transaction of ${t.amount} recorded.`,
                    timestamp: t.created_at || new Date().toISOString()
                })),
                ...(feedback || []).map(f => ({
                    id: f.id,
                    type: 'feedback' as const,
                    title: 'New Feedback',
                    description: `Received rating: ${f.rating}`,
                    timestamp: f.created_at || new Date().toISOString()
                })),
                ...(alerts || []).map(a => ({
                    id: a.id,
                    type: 'alert' as const,
                    title: 'System Alert Sent',
                    description: `${a.title} (${a.type})`,
                    timestamp: a.created_at || new Date().toISOString()
                }))
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 15);

            setActivities(allActivities);
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();

        // Set up realtime subscriptions for activity updates
        const channels = [
            supabase.channel('public:user_profiles').on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, fetchActivities).subscribe(),
            supabase.channel('public:transactions').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchActivities).subscribe(),
            supabase.channel('public:user_feedback').on('postgres_changes', { event: '*', schema: 'public', table: 'user_feedback' }, fetchActivities).subscribe()
        ];

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, []);

    const getIcon = (type: Activity['type']) => {
        switch (type) {
            case 'user': return <Users className="h-4 w-4 text-blue-500" />;
            case 'transaction': return <CreditCard className="h-4 w-4 text-green-500" />;
            case 'feedback': return <MessageSquare className="h-4 w-4 text-amber-500" />;
            case 'streak': return <TrendingUp className="h-4 w-4 text-purple-500" />;
            case 'savings': return <PiggyBank className="h-4 w-4 text-pink-500" />;
            default: return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    if (loading && activities.length === 0) {
        return (
            <div className="flex flex-col gap-4 py-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex gap-4 animate-pulse">
                        <div className="h-10 w-10 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-muted rounded w-3/4" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No recent activity detected.</p>
            ) : (
                activities.map((activity, index) => (
                    <div key={`${activity.id}-${index}`} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="h-9 w-9 rounded-full bg-background border flex items-center justify-center shrink-0">
                            {getIcon(activity.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-none">{activity.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{activity.description}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default AdminActivityFeed;
