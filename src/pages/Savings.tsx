
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Target, TrendingUp, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";

interface SavingsGoal {
  id: string;
  category: string;
  target_amount: number;
  user_id: string;
  created_at?: string;
}

interface SavingsTransaction {
  id: string;
  amount: number;
  date: string;
  created_at?: string;
}

const SavingsPage = () => {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [savingsTransactions, setSavingsTransactions] = useState<Record<string, SavingsTransaction[]>>({});
  const [loading, setLoading] = useState(true);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currency } = useSettings();
  const { refreshData } = useRefresh();

  const fetchSavingsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch savings goals sorted by most recent first
      const { data: goals, error: goalsError } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      setSavingsGoals(goals || []);

      // Fetch savings transactions for each goal, sorted by most recent first
      const transactionsData: Record<string, SavingsTransaction[]> = {};
      
      for (const goal of goals || []) {
        const { data: transactions, error: transError } = await supabase
          .from('transactions')
          .select('id, amount, date, created_at')
          .eq('user_id', user.id)
          .eq('category', goal.category)
          .eq('type', 'savings')
          .eq('archived', false)
          .order('created_at', { ascending: false }); // Sort by most recent first

        if (transError) throw transError;

        transactionsData[goal.category] = transactions || [];
      }

      setSavingsTransactions(transactionsData);
    } catch (error: any) {
      console.error('Error fetching savings data:', error);
      toast({
        title: "Error",
        description: "Failed to load savings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavingsData();
  }, []);

  const handleRefreshSavings = async () => {
    await fetchSavingsData();
    await refreshData();
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const calculateSaved = (category: string) => {
    const transactions = savingsTransactions[category] || [];
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const calculateProgress = (saved: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((saved / target) * 100, 100);
  };

  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;

    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goalToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Savings goal deleted successfully",
      });

      await fetchSavingsData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setGoalToDelete(null);
    }
  };

  const confirmDeleteGoal = (goal: SavingsGoal) => {
    setGoalToDelete(goal);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return <Layout><div>Loading savings...</div></Layout>;
  }

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefreshSavings} containerClassName="h-full">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Savings Goals</h1>
            <Button onClick={() => navigate('/add-savings-goal')} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Goal
            </Button>
          </div>

          {savingsGoals.length === 0 ? (
            <Card className="p-8 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Savings Goals Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your financial future by setting up your first savings goal.
              </p>
              <Button onClick={() => navigate('/add-savings-goal')}>
                Create Your First Goal
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savingsGoals.map((goal) => {
                const saved = calculateSaved(goal.category);
                const progress = calculateProgress(saved, goal.target_amount);
                
                return (
                  <Card key={goal.id} className="p-4 glass-card hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-lg">{goal.category}</h3>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate('/set-savings-goal', { state: { goal } })}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => confirmDeleteGoal(goal)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Saved:</span>
                        <span className="font-medium text-green-600">
                          {currency.symbol}{formatAmount(saved)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="font-medium">
                          {currency.symbol}{formatAmount(goal.target_amount)}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {progress.toFixed(1)}% complete
                        </span>
                        <Button
                          size="sm"
                          onClick={() => navigate('/add-transaction', { 
                            state: { 
                              defaultType: 'savings', 
                              defaultCategory: goal.category 
                            } 
                          })}
                        >
                          Add Savings
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Savings Goal</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this savings goal? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setGoalToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteGoal} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default SavingsPage;
