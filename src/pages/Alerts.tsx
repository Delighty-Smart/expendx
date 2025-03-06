
import { useState, useEffect } from "react";
import { Bell, Check, X, FileText, Users, Flame, AlertTriangle, TrendingDown, PiggyBank } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Alerts = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const { toast } = useToast();

  // Fetch alerts, transactions, and budgets
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Fetch alerts
        const { data: alertsData, error: alertsError } = await supabase
          .from("alerts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (alertsError) throw alertsError;

        // Fetch transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(20);

        if (transactionsError) throw transactionsError;
        setTransactions(transactionsData || []);

        // Fetch budgets
        const { data: budgetsData, error: budgetsError } = await supabase
          .from("budget_categories")
          .select("*")
          .eq("user_id", user.id);

        if (budgetsError) throw budgetsError;
        setBudgets(budgetsData || []);

        // Process connection request alerts
        const alertsWithSenderInfo = await Promise.all(
          (alertsData || []).map(async (alert) => {
            if (alert.type === "connection_request") {
              // Get connection request to find sender
              const { data: requestData } = await supabase
                .from("connection_requests")
                .select("sender_id")
                .eq("id", alert.related_id)
                .single();

              if (requestData) {
                // Get sender profile
                const { data: profileData } = await supabase
                  .from("user_profiles")
                  .select("id, username, first_name, last_name, email, avatar_url")
                  .eq("id", requestData.sender_id)
                  .single();

                if (profileData) {
                  return { ...alert, sender: profileData };
                }
              }
            }
            return alert;
          })
        );

        // Generate real-time financial insights based on transactions and budgets
        const generatedAlerts = generateFinancialInsights(transactionsData || [], budgetsData || [], user.id);
        
        setAlerts([...alertsWithSenderInfo, ...generatedAlerts]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up realtime subscription for alerts
    const alertsChannel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'alerts'
        },
        (payload) => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  // Generate real financial insights based on user data
  const generateFinancialInsights = (transactions: any[], budgets: any[], userId: string) => {
    const insights: any[] = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Filter transactions for current month
    const currentMonthTransactions = transactions.filter(t => {
      const transDate = new Date(t.date);
      return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
    });
    
    // Check budget utilization
    budgets.forEach(budget => {
      const categoryTransactions = currentMonthTransactions.filter(t => t.category === budget.category && t.type === 'expense');
      const categoryTotal = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const budgetLimit = Number(budget.monthly_limit);
      
      const utilization = (categoryTotal / budgetLimit) * 100;
      
      // Alert if budget is at 80% or 100%
      if (utilization >= 100) {
        insights.push({
          id: `budget-exceeded-${budget.category}`,
          title: "Budget Exceeded!",
          message: `You've spent ${Math.round(utilization)}% of your '${budget.category}' budget for this month.`,
          type: "budget_alert",
          read: false,
          created_at: new Date().toISOString(),
          user_id: userId
        });
      } else if (utilization >= 80) {
        insights.push({
          id: `budget-warning-${budget.category}`,
          title: "Budget Alert",
          message: `You've spent ${Math.round(utilization)}% of your '${budget.category}' budget for this month.`,
          type: "budget_alert",
          read: false,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          user_id: userId
        });
      }
    });
    
    // Calculate total income and expenses for the month
    const totalIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const totalExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Balance warning if expenses are over 90% of income
    if (totalIncome > 0 && totalExpenses > 0) {
      const expenseRatio = totalExpenses / totalIncome;
      if (expenseRatio > 0.9) {
        insights.push({
          id: "balance-warning",
          title: "Low Balance Warning",
          message: `Your expenses are ${Math.round(expenseRatio * 100)}% of your income this month. Consider reducing spending.`,
          type: "balance_warning",
          read: false,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          user_id: userId
        });
      }
    }
    
    // Daily streak reminder (if it's been a few days since last transaction)
    if (transactions.length > 0) {
      const lastTransactionDate = new Date(transactions[0].date);
      const daysSinceLastTransaction = Math.floor((today.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastTransaction >= 2) {
        insights.push({
          id: "streak-reminder",
          title: "Daily Reminder",
          message: `It's been ${daysSinceLastTransaction} days since you recorded an expense. Keep your streak going!`,
          type: "streak_reminder",
          read: false,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          user_id: userId
        });
      }
    }
    
    // Savings highlights if the user is saving over 20% of income
    if (totalIncome > 0 && totalExpenses > 0) {
      const savingsRate = 1 - (totalExpenses / totalIncome);
      if (savingsRate > 0.2) {
        insights.push({
          id: "savings-highlight",
          title: "Savings Milestone",
          message: `Congratulations! You're saving ${Math.round(savingsRate * 100)}% of your income this month.`,
          type: "savings_highlight",
          read: true,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
          user_id: userId
        });
      }
    }
    
    return insights;
  };

  // Mark alert as read
  const markAsRead = async (alertId: string) => {
    try {
      // For generated alerts, just update the local state
      if (alertId.includes('-')) {
        setAlerts(alerts.map(alert => 
          alert.id === alertId ? { ...alert, read: true } : alert
        ));
        return;
      }

      // For real alerts, update in the database
      const { error } = await supabase
        .from("alerts")
        .update({ read: true })
        .eq("id", alertId);

      if (error) throw error;

      // Update local state
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      ));
      
      toast({
        title: "Alert marked as read",
        description: "The notification has been marked as read",
      });
    } catch (error) {
      console.error("Error marking alert as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark the alert as read",
        variant: "destructive",
      });
    }
  };

  // Handle connection request response
  const handleConnectionRequest = async (alertId: string, requestId: string, accept: boolean) => {
    try {
      // Update connection request status
      const { error } = await supabase
        .from("connection_requests")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      // Mark alert as read
      await markAsRead(alertId);

      // Update local state to remove the alert from the list
      setAlerts(alerts.filter(alert => alert.id !== alertId));

      toast({
        title: accept ? "Connection accepted" : "Connection declined",
        description: accept 
          ? "You are now connected with this user" 
          : "The connection request has been declined",
      });
    } catch (error: any) {
      console.error("Error handling connection request:", error);
      toast({
        title: "Error",
        description: error.message || "There was an error processing your request",
        variant: "destructive",
      });
    }
  };

  // Render alert icon based on type
  const renderAlertIcon = (type: string) => {
    switch (type) {
      case "connection_request":
      case "connection_accepted":
        return <Users className="h-5 w-5 text-blue-500" />;
      case "streak_warning":
      case "streak_reminder":
        return <Flame className="h-5 w-5 text-orange-500" />;
      case "budget_alert":
        return <PiggyBank className="h-5 w-5 text-red-500" />;
      case "balance_warning":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case "savings_highlight":
        return <PiggyBank className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Alerts
        </h1>

        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Stay on top of your finances</AlertTitle>
          <AlertDescription>
            We'll notify you about budget alerts, low balances, and daily reminders to help you maintain your financial goals.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading alerts...</div>
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Bell className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">You don't have any alerts yet</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-4 flex items-start gap-3 ${alert.read ? '' : 'bg-accent/10'}`}
                  >
                    <div className="mt-1">
                      {renderAlertIcon(alert.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">
                          {alert.title}
                          {!alert.read && (
                            <Badge variant="secondary" className="ml-2">New</Badge>
                          )}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(alert.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-muted-foreground mt-1">
                        {alert.message}
                      </p>
                      
                      {/* Connection request alert with profile info */}
                      {alert.type === "connection_request" && alert.sender && (
                        <div className="mt-3 flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage 
                              src={`/lovable-uploads/${alert.sender.avatar_url || 'avatar-1.png'}`} 
                              alt={alert.sender.username || alert.sender.email} 
                            />
                            <AvatarFallback>
                              {alert.sender.first_name?.[0]}{alert.sender.last_name?.[0] || ''}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {alert.sender.username || alert.sender.email}
                            </p>
                            {alert.sender.first_name && (
                              <p className="text-xs text-muted-foreground">
                                {alert.sender.first_name} {alert.sender.last_name || ''}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Action buttons for connection requests */}
                      {alert.type === "connection_request" && (
                        <div className="mt-3 flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleConnectionRequest(alert.id, alert.related_id, true)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleConnectionRequest(alert.id, alert.related_id, false)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                      
                      {/* Mark as read button for other alerts */}
                      {!alert.read && (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="mt-3"
                          onClick={() => markAsRead(alert.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Alerts;
