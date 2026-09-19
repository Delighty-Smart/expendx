
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
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
                usersSnap,
                transactionsSnap,
                feedbackSnap,
                alertsSnap
            ] = await Promise.all([
                getDocs(query(collection(db, 'user_profiles'), orderBy('created_at', 'desc'), limit(5))).catch(() => getDocs(collection(db, 'user_profiles'))),
                getDocs(query(collection(db, 'transactions'), orderBy('created_at', 'desc'), limit(5))).catch(() => getDocs(collection(db, 'transactions'))),
                getDocs(query(collection(db, 'user_feedback'), orderBy('created_at', 'desc'), limit(5))).catch(() => getDocs(collection(db, 'user_feedback'))),
                getDocs(query(collection(db, 'alerts'), orderBy('created_at', 'desc'), limit(20))).catch(() => getDocs(collection(db, 'alerts')))
            ]);

            const users = usersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as any[];
            const transactions = transactionsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as any[];
            const feedback = feedbackSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as any[];
            const alerts = alertsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as any[];

            const allActivities: Activity[] = [
                ...(users || []).map(u => ({
                    id: u.id,
                    type: 'user' as const,
                    title: 'New User Join',
                    description: `${u.email || u.username || 'User'} joined the platform.`,
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
