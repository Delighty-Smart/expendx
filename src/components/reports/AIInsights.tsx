
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, TrendingUp, AlertCircle, CheckCircle2, Lightbulb, ChevronRight } from "lucide-react";
import { GlassCard, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface AIInsightsProps {
    transactions: any[];
    budgets: any[];
    dateRange: { from: string; to: string };
}

interface InsightData {
    summary: string;
    quantitative_analysis: string[];
    actionable_advice: string[];
    sentiment: "positive" | "neutral" | "caution";
}

export const AIInsights = ({ transactions, budgets, dateRange }: AIInsightsProps) => {
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState<InsightData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { currency } = useSettings();

    const generateInsights = async () => {
        if (transactions.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const { data, error: invokeError } = await supabase.functions.invoke('generate-financial-insights', {
                body: {
                    transactions: transactions.slice(0, 50),
                    budgets: budgets,
                    dateRange: dateRange,
                    currency: currency.code
                }
            });

            if (invokeError) {
                // Try to extract error message from the response body if it's a Supabase error
                const errorBody = await (invokeError as any).context?.json?.().catch(() => null);
                const message = errorBody?.error || invokeError.message || "Unknown error";
                throw new Error(message);
            }
            setInsights(data);
        } catch (err: any) {
            console.error("Failed to generate AI insights:", err);
            setError(err.message || "Lucent AI is currently unavailable. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Generate insights on initial load if we have data
        if (transactions.length > 0 && !insights && !loading) {
            generateInsights();
        }
    }, [transactions.length]);

    const getSentimentStyles = (sentiment: string) => {
        switch (sentiment) {
            case "positive":
                return "from-emerald-500/20 to-lime-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400";
            case "caution":
                return "from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400";
            default:
                return "from-blue-500/20 to-indigo-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400";
        }
    };

    return (
        <GlassCard className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-card/60 to-card/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Brain className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold text-foreground">
                            Lucent Intelligence
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">AI-Powered Financial Feedback</p>
                    </div>
                </div>
                {!loading && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateInsights}
                        className="text-xs hover:bg-white/5 text-muted-foreground"
                    >
                        Refresh Analysis
                    </Button>
                )}
            </CardHeader>

            <CardContent className="p-6">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-12 flex flex-col items-center justify-center space-y-4"
                        >
                            <div className="relative">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="w-16 h-16 rounded-full border-2 border-dashed border-primary/30"
                                />
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 flex items-center justify-center"
                                >
                                    <Sparkles className="w-6 h-6 text-emerald-500" />
                                </motion.div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium animate-pulse">Analyzing your financial patterns...</p>
                                <p className="text-xs text-muted-foreground mt-1">Generating qualitative & quantitative feedback</p>
                            </div>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="py-8 flex flex-col items-center text-center space-y-3"
                        >
                            <AlertCircle className="w-10 h-10 text-destructive/50" />
                            <p className="text-sm text-muted-foreground">{error}</p>
                            <Button variant="outline" size="sm" onClick={generateInsights}>Retry Analysis</Button>
                        </motion.div>
                    ) : insights ? (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            {/* Qualitative Summary */}
                            <div className={cn(
                                "p-4 rounded-xl border bg-gradient-to-r transition-all duration-500",
                                getSentimentStyles(insights.sentiment)
                            )}>
                                <div className="flex gap-3">
                                    <TrendingUp className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm leading-relaxed font-medium italic">"{insights.summary}"</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Quantitative Analysis */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-primary" />
                                        Key Observations
                                    </h4>
                                    <ul className="space-y-3">
                                        {insights.quantitative_analysis.map((obs, i) => (
                                            <motion.li
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="text-sm flex gap-2 group"
                                            >
                                                <ChevronRight className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                                <span className="text-muted-foreground group-hover:text-foreground transition-colors">{obs}</span>
                                            </motion.li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Actionable Advice */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <Lightbulb className="w-3 h-3 text-emerald-500" />
                                        Smart Recommendations
                                    </h4>
                                    <ul className="space-y-3">
                                        {insights.actionable_advice.map((advice, i) => (
                                            <motion.li
                                                key={i}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: (i + 3) * 0.1 }}
                                                className="text-sm p-3 rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all cursor-default"
                                            >
                                                <span className="text-muted-foreground hover:text-foreground transition-colors">{advice}</span>
                                            </motion.li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-4 rounded-full bg-muted/20">
                                <Brain className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">No insights generated yet</p>
                                <p className="text-xs text-muted-foreground mt-1">Add some transactions to get personalized financial feedback</p>
                            </div>
                            <Button size="sm" onClick={generateInsights}>Generate Analysis</Button>
                        </div>
                    )}
                </AnimatePresence>
            </CardContent>
        </GlassCard>
    );
};
