import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/contexts/SettingsContext";
import { format, eachMonthOfInterval, subMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { 
  Sparkles, TrendingUp, Heart, Award, ArrowRight, ArrowLeft, 
  HelpCircle, ChevronRight, CheckCircle2, DollarSign, Calendar, Clock, ShieldAlert, Hourglass 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/ui/page-header";

interface TxRow {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  type: string;
}

const CustomLifeEnergyIcon = ({ className }: { className?: string }) => (
  <Hourglass className={className} strokeWidth={2.2} />
);

const LifeEnergy = () => {
  const { user } = useAuth();
  const { currency } = useSettings();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"crossover" | "fulfillment" | "concept">("crossover");
  const [showSetup, setShowSetup] = useState(() => {
    return !localStorage.getItem("lucent_life_energy_data") && !localStorage.getItem("expendx_life_energy_data");
  });
  const [setupStep, setSetupStep] = useState(1);

  // Form states for onboarding/setup
  const [formData, setFormData] = useState({
    grossSalary: 3500,
    hoursPerWeek: 40,
    commuteHoursPerWeek: 5,
    taxPercentage: 20,
    commuteCost: 150,
    wardrobeCost: 50,
    mealsCost: 100,
    decompressionCost: 100,
    passiveMonthlyIncome: 150,
  });

  // Load existing values into form if present
  const loadSavedData = React.useCallback(() => {
    try {
      const saved = localStorage.getItem("lucent_life_energy_data") || localStorage.getItem("expendx_life_energy_data");
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({
          ...prev,
          grossSalary: Number(parsed.grossSalary) || 3500,
          hoursPerWeek: Number(parsed.workHoursPerWeek || parsed.hoursPerWeek) || 40,
          commuteHoursPerWeek: Number(parsed.commuteTimePerWeek || parsed.commuteHoursPerWeek) || 5,
          taxPercentage: Number(parsed.taxPercentage) || 0,
          commuteCost: Number(parsed.jobCostsCommute || parsed.commuteCost) || 150,
          wardrobeCost: Number(parsed.jobCostsAttire || parsed.wardrobeCost) || 50,
          mealsCost: Number(parsed.jobCostsMeals || parsed.mealsCost) || 100,
          decompressionCost: Number(parsed.jobCostsDecompression || parsed.decompressionCost) || 100,
          passiveMonthlyIncome: Number(parsed.passiveMonthlyIncome) || 150,
        }));
      }
    } catch (e) {}
  }, []);

  useMemo(() => {
    loadSavedData();
  }, [loadSavedData]);

  React.useEffect(() => {
    const handleStorageChange = () => {
      loadSavedData();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [loadSavedData]);

  // Live calculations for wizard
  const wizardCalculations = useMemo(() => {
    const monthlyGross = formData.grossSalary;
    const workHoursMonthly = formData.hoursPerWeek * 4.3;
    const prepHoursMonthly = formData.commuteHoursPerWeek * 4.3;
    const totalHoursDedicated = workHoursMonthly + prepHoursMonthly;

    const taxAmount = (formData.taxPercentage / 100) * monthlyGross;
    const totalJobCosts = taxAmount + formData.commuteCost + formData.wardrobeCost + formData.mealsCost + formData.decompressionCost;
    const trueMonthlyNet = Math.max(0, monthlyGross - totalJobCosts);

    const nominalHourly = monthlyGross / workHoursMonthly;
    const trueHourly = totalHoursDedicated > 0 ? trueMonthlyNet / totalHoursDedicated : 0;

    return {
      nominalHourly: Number(nominalHourly.toFixed(2)),
      trueHourly: Number(trueHourly.toFixed(2)),
      totalJobCosts,
      trueMonthlyNet,
      totalHoursDedicated,
    };
  }, [formData]);

  // Handle save
  const handleSaveSetup = () => {
    try {
      const savedData = {
        grossSalary: formData.grossSalary,
        workHoursPerWeek: formData.hoursPerWeek,
        commuteTimePerWeek: formData.commuteHoursPerWeek,
        jobCostsCommute: formData.commuteCost,
        jobCostsAttire: formData.wardrobeCost,
        jobCostsMeals: formData.mealsCost,
        jobCostsDecompression: formData.decompressionCost,
        jobCostsOther: 0,
        passiveMonthlyIncome: formData.passiveMonthlyIncome,
        trueHourlyRate: wizardCalculations.trueHourly,
      };
      localStorage.setItem("lucent_life_energy_data", JSON.stringify(savedData));
      localStorage.setItem("lucent_true_hourly_rate", wizardCalculations.trueHourly.toString());
      
      // Dispatch storage change event to sync headers & settings immediately
      window.dispatchEvent(new Event("storage"));
      
      toast({
        title: "Setup Completed",
        description: `Your True Hourly Wage has been set to ${currency.symbol}${wizardCalculations.trueHourly}/hr`
      });
      setShowSetup(false);
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Fetch all transactions
  const { data: transactions = [], isLoading } = useQuery<TxRow[]>({
    queryKey: ["life_energy_transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("id, date, amount, category, description, type")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TxRow[];
    },
    enabled: !!user,
  });

  const trueHourlyRate = wizardCalculations.trueHourly;
  const passiveMonthlyIncome = formData.passiveMonthlyIncome;

  // 1. Calculations for the Escape Strategy (Crossover Chart)
  const crossoverData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map((m) => {
      const monthStr = format(m, "yyyy-MM");
      const monthLabel = format(m, "MMM yy");

      const monthlyTransactions = transactions.filter(t => t.date && typeof t.date === "string" && t.date.startsWith(monthStr));
      
      const income = monthlyTransactions
        .filter(t => t.type === "credit")
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = monthlyTransactions
        .filter(t => t.type === "debit" || t.type === "subscription")
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        label: monthLabel,
        "Active Income": income,
        "Total Expenses": expenses,
        "Investment Income": passiveMonthlyIncome
      };
    });
  }, [transactions, passiveMonthlyIncome]);

  // Project months to crossover
  const monthsToCrossover = useMemo(() => {
    const avgExpenses = crossoverData.reduce((sum, d) => sum + Number(d["Total Expenses"] || 0), 0) / (crossoverData.length || 1);
    const savingsRate = Math.max(0, formData.grossSalary - avgExpenses);
    const monthlyReturn = 0.05 / 12;
    
    if (avgExpenses <= passiveMonthlyIncome) return 0;
    if (savingsRate <= 0) return 999;

    let currentPassive = passiveMonthlyIncome;
    let months = 0;
    
    while (currentPassive < avgExpenses && months < 360) {
      currentPassive += savingsRate * monthlyReturn;
      months++;
    }
    return months;
  }, [crossoverData, passiveMonthlyIncome, formData.grossSalary]);

  // 2. Calculations for the Fulfillment Curve
  const fulfillmentData = useMemo(() => {
    const ratedTx = transactions
      .map(t => {
        const ratingMatch = t.description && typeof t.description === "string"
          ? t.description.match(/\[Fulfillment:\s*([1-5])\]/)
          : null;
        return {
          ...t,
          rating: ratingMatch ? parseInt(ratingMatch[1]) : null
        };
      })
      .filter(t => t.rating !== null && (t.type === "debit" || t.type === "subscription"));

    const byCategory: Record<string, { category: string; sumRating: number; count: number; amount: number }> = {};
    ratedTx.forEach(t => {
      if (!byCategory[t.category]) {
        byCategory[t.category] = { category: t.category, sumRating: 0, count: 0, amount: 0 };
      }
      const entry = byCategory[t.category];
      entry.sumRating += t.rating!;
      entry.count += 1;
      entry.amount += t.amount;
    });

    return Object.values(byCategory)
      .map(c => ({
        name: c.category,
        Fulfillment: Number((c.sumRating / c.count).toFixed(1)),
        Spending: Number(c.amount.toFixed(0)),
        hours: Number((c.amount / trueHourlyRate).toFixed(1))
      }))
      .sort((a, b) => b.Spending - a.Spending);
  }, [transactions, trueHourlyRate]);

  const primaryWastes = useMemo(() => {
    return fulfillmentData
      .filter(c => c.Fulfillment <= 2.5)
      .sort((a, b) => b.Spending - a.Spending);
  }, [fulfillmentData]);

  const COLORS = ["#7877C6", "#34D399", "#F87171", "#FB7185", "#60A5FA"];

  if (showSetup) {
    // Premium Onboarding Flow
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-24 px-4 text-foreground">
        {/* Onboarding Header */}
        <div className="text-center space-y-3 pt-6">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 mx-auto">
            <CustomLifeEnergyIcon className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Discover Your Life Energy</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Money is simply something you trade your life energy for. Let's calculate your <strong className="text-foreground font-bold">True Hourly Wage</strong> to start tracking in time, not just currency.
          </p>
        </div>

        {/* Setup Card */}
        <Card className="glass-card border-none overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
            <div 
              className="h-full bg-primary transition-all duration-300" 
              style={{ width: `${(setupStep / 4) * 100}%` }}
            />
          </div>

          <CardHeader className="pt-8">
            <CardTitle className="text-base font-bold flex justify-between items-center">
              <span>Step {setupStep} of 4</span>
              <span className="text-xs text-muted-foreground font-medium">
                {setupStep === 1 && "The Concept"}
                {setupStep === 2 && "Nominal Earnings"}
                {setupStep === 3 && "Job-Related Costs"}
                {setupStep === 4 && "Passive Assets"}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 min-h-[300px] flex flex-col justify-between">
            {setupStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold">What is Life Energy?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Most people think they make $30/hour. But after subtracting income taxes, commuting expenses, wardrobes, extra meals, and stress decompression, their actual <strong className="text-foreground font-bold">True Hourly Wage</strong> is often less than half of that!
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    In Step 2 and 3, we will break down your gross earnings and real expenses to uncover the true value of your time.
                  </p>
                </div>
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Once set up, you can toggle your dashboard to display balances in <strong className="text-foreground font-bold">hours of life energy</strong> instead of traditional currency.
                  </p>
                </div>
              </div>
            )}

            {setupStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold">What are your basic parameters?</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grossSalary">Monthly Gross Salary ({currency.symbol})</Label>
                    <Input 
                      id="grossSalary" 
                      type="number"
                      value={formData.grossSalary}
                      onChange={(e) => setFormData({...formData, grossSalary: Number(e.target.value)})}
                      className="bg-background/50 border-none rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hoursPerWeek">Working Hours / Week</Label>
                    <Input 
                      id="hoursPerWeek" 
                      type="number"
                      value={formData.hoursPerWeek}
                      onChange={(e) => setFormData({...formData, hoursPerWeek: Number(e.target.value)})}
                      className="bg-background/50 border-none rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commuteHoursPerWeek">Weekly Prep & Commuting (Hours)</Label>
                  <Input 
                    id="commuteHoursPerWeek" 
                    type="number"
                    value={formData.commuteHoursPerWeek}
                    onChange={(e) => setFormData({...formData, commuteHoursPerWeek: Number(e.target.value)})}
                    className="bg-background/50 border-none rounded-xl"
                  />
                  <span className="text-[10px] text-muted-foreground">Time spent getting ready for work, traveling, or winding down.</span>
                </div>
              </div>
            )}

            {setupStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold">What does it cost you to work?</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxPercentage">Average Tax Rate (%)</Label>
                    <Input 
                      id="taxPercentage" 
                      type="number"
                      value={formData.taxPercentage}
                      onChange={(e) => setFormData({...formData, taxPercentage: Number(e.target.value)})}
                      className="bg-background/50 border-none rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commuteCost">Monthly Commute / Travel ({currency.symbol})</Label>
                    <Input 
                      id="commuteCost" 
                      type="number"
                      value={formData.commuteCost}
                      onChange={(e) => setFormData({...formData, commuteCost: Number(e.target.value)})}
                      className="bg-background/50 border-none rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wardrobeCost">Monthly Clothes / Uniforms ({currency.symbol})</Label>
                    <Input 
                      id="wardrobeCost" 
                      type="number"
                      value={formData.wardrobeCost}
                      onChange={(e) => setFormData({...formData, wardrobeCost: Number(e.target.value)})}
                      className="bg-background/50 border-none rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mealsCost">Monthly Work Lunches / Coffee ({currency.symbol})</Label>
                    <Input 
                      id="mealsCost" 
                      type="number"
                      value={formData.mealsCost}
                      onChange={(e) => setFormData({...formData, mealsCost: Number(e.target.value)})}
                      className="bg-background/50 border-none rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="decompressionCost">Monthly Stress Relief / Escapism Hobbies ({currency.symbol})</Label>
                  <Input 
                    id="decompressionCost" 
                    type="number"
                    value={formData.decompressionCost}
                    onChange={(e) => setFormData({...formData, decompressionCost: Number(e.target.value)})}
                    className="bg-background/50 border-none rounded-xl"
                  />
                  <span className="text-[10px] text-muted-foreground">Costs spent directly to recover from work-related stress.</span>
                </div>
              </div>
            )}

            {setupStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold">Passive Income & Freedom</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="passiveMonthlyIncome">Current Monthly Passive / Investment Income ({currency.symbol})</Label>
                  <Input 
                    id="passiveMonthlyIncome" 
                    type="number"
                    value={formData.passiveMonthlyIncome}
                    onChange={(e) => setFormData({...formData, passiveMonthlyIncome: Number(e.target.value)})}
                    className="bg-background/50 border-none rounded-xl"
                  />
                  <span className="text-[10px] text-muted-foreground">Dividends, interests, rental yields, or residual income.</span>
                </div>

                {/* Real-time Wage Summary */}
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Calculation Results</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Nominal Wage (reported):</span>
                    <span className="font-bold text-xs">{currency.symbol}{wizardCalculations.nominalHourly}/hr</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-primary">True Hourly Wage (actual):</span>
                    <span className="font-black text-sm text-primary">{currency.symbol}{wizardCalculations.trueHourly}/hr</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-border/50">
              <Button
                variant="ghost"
                onClick={() => setSetupStep(prev => Math.max(1, prev - 1))}
                disabled={setupStep === 1}
                className="gap-2 text-xs"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>

              {setupStep < 4 ? (
                <Button
                  onClick={() => setSetupStep(prev => Math.min(4, prev + 1))}
                  className="gap-2 text-xs px-5"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSaveSetup}
                  className="gap-2 text-xs px-6 bg-primary text-primary-foreground font-bold"
                >
                  Calculate & Complete <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard with Charts
  return (
    <div className="space-y-6 pb-24 text-foreground">
      {/* Page Header */}
      <PageHeader
        title="Life Energy & Freedom"
        actions={
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setSetupStep(1);
              setShowSetup(true);
            }}
            className="text-xs font-bold border border-primary/20 hover:border-primary/40 bg-background/50 hover:bg-muted/20 rounded-xl px-4 py-2"
          >
            Adjust Wage Settings
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex bg-muted/40 rounded-xl p-1 gap-1 w-full max-w-lg overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("crossover")}
          className={cn(
            "flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
            activeTab === "crossover" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="h-3.5 w-3.5 shrink-0 hidden sm:inline" />
          <span>
            <span className="hidden sm:inline">Escape Strategy</span>
            <span className="inline sm:hidden">Escape</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab("fulfillment")}
          className={cn(
            "flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
            activeTab === "fulfillment" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Heart className="h-3.5 w-3.5 shrink-0 hidden sm:inline" />
          <span>
            <span className="hidden sm:inline">Fulfillment Curve</span>
            <span className="inline sm:hidden">Fulfillment</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab("concept")}
          className={cn(
            "flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap",
            activeTab === "concept" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <HelpCircle className="h-3.5 w-3.5 shrink-0 hidden sm:inline" />
          <span>
            <span className="hidden sm:inline">Concept Guide</span>
            <span className="inline sm:hidden">Guide</span>
          </span>
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : activeTab === "crossover" ? (
        // Crossover Tab content
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card border-none bg-gradient-to-br from-indigo-500/5 to-indigo-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly Passive Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-numeric text-indigo-500">{currency.symbol}{passiveMonthlyIncome}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Earnings from investments & passive sources</p>
              </CardContent>
            </Card>
 
            <Card className="glass-card border-none bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">True Hourly Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-numeric text-emerald-500">{currency.symbol}{trueHourlyRate}<span className="text-xs font-normal text-muted-foreground">/hr</span></div>
                <p className="text-[10px] text-muted-foreground mt-1">Calculated net hourly wage after work costs</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-none bg-gradient-to-br from-purple-500/5 to-purple-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Freedom Projection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-500">
                  {monthsToCrossover === 0 ? "Already Crossed!" : monthsToCrossover === 999 ? "Not Saving" : `≈ ${monthsToCrossover} Months`}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Est. months until passive income covers costs</p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card border-none min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                The Crossover Chart
              </CardTitle>
              <CardDescription>
                When the green line (Investment Income) crosses the red line (Total Expenses), you achieve financial freedom and work becomes fully optional.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={crossoverData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" opacity={0.4} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-strong)", borderRadius: "12px", color: "var(--text-primary)" }} />
                    <Legend />
                    <Line type="monotone" dataKey="Active Income" stroke="#60A5FA" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Total Expenses" stroke="#F87171" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Investment Income" stroke="#34D399" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === "fulfillment" ? (
        // Fulfillment Tab content
        <div className="space-y-6">
          {fulfillmentData.length === 0 ? (
            <Card className="glass-card border-none py-12 text-center flex flex-col items-center justify-center gap-4">
              <Award className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <h3 className="font-bold text-base">No Fulfillment Ratings Found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1 mx-auto">
                  Add some ratings (💔, 😐, 😊, 💖, 🌟) when logging transactions to map out your Fulfillment Curve!
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              {/* Curve Chart */}
              <Card className="glass-card border-none min-w-0 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Fulfillment vs. Spending</CardTitle>
                  <CardDescription>
                    Comparing average fulfillment score (1-5) against total spending per category. Look for categories where you spend heavily but get low fulfillment.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fulfillmentData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" opacity={0.4} vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={40} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={24} />
                        <Tooltip contentStyle={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-strong)", borderRadius: "12px", color: "var(--text-primary)" }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="Spending" name={`Spending (${currency.symbol})`} fill="#7877C6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                        <Line yAxisId="right" type="monotone" dataKey="Fulfillment" name="Avg Fulfillment (1-5)" stroke="#34D399" strokeWidth={3} dot={{ r: 5 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Insights Side Panel */}
              <div className="space-y-4">
                <Card className="glass-card border-none bg-gradient-to-br from-rose-500/5 to-rose-500/10">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-rose-500 flex items-center gap-2">
                      <Award className="h-4 w-4" /> Optimisation Opportunities
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Low fulfillment spending categories. Trimming these down will not feel like a sacrifice!
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {primaryWastes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Fantastic! You have zero low-fulfillment spending categories.</p>
                    ) : (
                      primaryWastes.map(w => (
                        <div key={w.name} className="flex justify-between items-center bg-background/50 p-2.5 rounded-lg border border-border/40">
                          <div>
                            <span className="font-semibold text-xs text-foreground block">{w.name}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">Rating: {w.Fulfillment} / 5</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-xs text-foreground block">{currency.symbol}{w.Spending}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">{w.hours} life hrs</span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="glass-card border-none">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fulfillment Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[160px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={fulfillmentData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={4}
                            dataKey="Spending"
                          >
                            {fulfillmentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${currency.symbol}${value}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Concept Guide Tab Content (Educates about Life Energy)
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/0 border border-border-default/50 backdrop-blur-sm">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-2">
              <HelpCircle className="h-4.5 w-4.5 text-primary" />
              Understanding Life Energy
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Based on the book <em>Your Money or Your Life</em>, money is simply something you trade your <strong>life energy</strong> (time) for. When you buy something, you aren't just spending currency—you are spending hours of your life.
            </p>
          </div>

          {/* Combined definitions to reduce visual noise */}
          <Card className="glass-card border-none overflow-hidden">
            <CardContent className="p-5 sm:p-6 divide-y divide-border-default/30 space-y-5">
              {/* 1. True Hourly Wage */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Clock className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">1. True Hourly Wage</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your actual hourly earnings after subtracting the hidden costs of working (taxes, travel costs, dress code, meals, stress decompression) and adding preparation/commute hours.
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 text-[10px] font-mono text-muted-foreground">
                  Formula: (Gross Salary − Job Costs) ÷ Total Hours Dedicated
                </div>
              </div>

              {/* 2. Life Energy Cost */}
              <div className="pt-5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Hourglass className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">2. Life Energy Cost</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The real price of a purchase measured in the hours of your life you worked to buy it. (e.g. if your True Wage is $15/hr, a $150 item costs 10 hours of life).
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 text-[10px] font-mono text-muted-foreground">
                  Formula: Purchase Price ÷ True Hourly Wage
                </div>
              </div>

              {/* 3. The Fulfillment Curve */}
              <div className="pt-5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-rose-500/10 text-rose-500">
                    <Heart className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">3. The Fulfillment Curve</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The correlation between spending and happiness. Real fulfillment peaks at the point of "enough". Spending past this peak starts to add clutter and stress rather than genuine fulfillment.
                </p>
              </div>

              {/* 4. The Crossover Point */}
              <div className="pt-5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-purple-500/10 text-purple-500">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">4. The Crossover Point</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When your monthly passive/investment income grows to cover your living costs. At this crossing, working becomes completely optional, resulting in full financial freedom.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="bg-primary/5 rounded-2xl p-4 sm:p-5 border border-primary/10 space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Quick Start Steps
            </h4>
            <ul className="text-xs text-muted-foreground space-y-2 list-none pl-0">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
                <span>Tap <strong>Adjust Wage Settings</strong> at the top of this page to calculate your True Hourly Wage.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
                <span>Go to the Dashboard and tap the <strong>Hourglass</strong> icon on the Balance Card to toggle your balances into Life Hours.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
                <span>Rate your fulfillment when adding transactions (e.g. including tag <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">[Fulfillment: 5]</code> in descriptions).</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default LifeEnergy;
