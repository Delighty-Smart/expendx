import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import {
    Activity,
    PieChart,
    Target,
    TrendingUp,
    Smartphone,
    Globe,
    Monitor,
    ArrowRight,
    BarChart3,
    AreaChart,
    LineChart,
    ArrowUpRight,
    ArrowDownRight,
    Eye,
    EyeOff,
    Hourglass
} from "lucide-react";
import { motion, useScroll, useTransform, AnimatePresence, useInView } from "framer-motion";
import { format } from "date-fns";
import { GlassCard } from "@/components/ui/card";
import SpendingByCategoryChart from "@/components/charts/SpendingByCategoryChart";
import DailyIncomeExpensesChart from "@/components/charts/DailyIncomeExpensesChart";
import BalanceTrendChart from "@/components/charts/BalanceTrendChart";
import ExpenseDistributionChart from "@/components/charts/ExpenseDistributionChart";

export default function Landing() {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    const [hoveredLegendItem, setHoveredLegendItem] = useState<string | null>(null);
    const [hideAmounts, setHideAmounts] = useState(false);
    const [currentNameIndex, setCurrentNameIndex] = useState(0);

    const names = [
        "Adebayo", "Folake", "Oluwaseun", // Yoruba
        "Chibuzor", "Ngozi", "Ebuka",     // Igbo
        "Sadiq", "Aisha", "Musa",         // Hausa
        "David", "Sarah", "Samuel"        // Bible
    ];

    // Dummy Data for Live Preview
    const dummySpendingData = [
        { name: "Rent", amount: 1200000 },
        { name: "Groceries", amount: 450000 },
        { name: "Transport", amount: 150000 },
        { name: "Entertainment", amount: 200000 },
        { name: "Utilities", amount: 180000 }
    ];

    const dummyDailyData = [
        { date: "01", fullDate: "Feb 01", income: 0, expense: 45000 },
        { date: "02", fullDate: "Feb 02", income: 2500000, expense: 1200000 },
        { date: "03", fullDate: "Feb 03", income: 0, expense: 65000 },
        { date: "04", fullDate: "Feb 04", income: 0, expense: 180000 },
        { date: "05", fullDate: "Feb 05", income: 150000, expense: 40000 },
        { date: "06", fullDate: "Feb 06", income: 0, expense: 210000 },
        { date: "07", fullDate: "Feb 07", income: 0, expense: 95000 }
    ];

    const dummyTrendData = [
        { date: "01", balance: 500000 },
        { date: "02", balance: 1755000 },
        { date: "03", balance: 1690000 },
        { date: "04", balance: 1510000 },
        { date: "05", balance: 1620000 },
        { date: "06", balance: 1410000 },
        { date: "07", balance: 1315000 }
    ];

    const COLORS = ["#00AAFF", "#A3CE22", "#4B5563", "#9CA3AF", "#F59E0B"];
    const totalDummySpending = dummySpendingData.reduce((acc, curr) => acc + curr.amount, 0);

    // Parallax
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 800], [0, 150]);
    const y2 = useTransform(scrollY, [0, 800], [0, -100]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentNameIndex((prev) => (prev + 1) % names.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            if (user) {
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/auth', { replace: true });
            }
        }
    }, [user, navigate]);

    useEffect(() => {
        // If we are processing an OAuth callback, hold the redirect so Supabase can parse it
        // but only if the user is not already authenticated
        if (!user && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
            return;
        }

        if (!isLoading && user) {
            navigate('/dashboard');
        }
    }, [user, isLoading, navigate]);

    // Utility function for formatting amounts with commas and hiding
    const formatAmount = (amount: number) => {
        if (hideAmounts) {
            return "***";
        }
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    };

    if (isLoading || Capacitor.isNativePlatform()) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="flex flex-col items-center gap-4"
                >
                    <img
                        src="/lucent-header-light.png"
                        alt="Lucent"
                        className="h-10 sm:h-12 object-contain"
                    />
                    <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            className="h-full bg-emerald-400 w-1/2 rounded-full"
                        />
                    </div>
                </motion.div>
            </div>
        );
    }

    if (user) return null; // Prevent flash before redirect

    // Animation variants
    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
    };

    const staggerContainer = {
        hidden: { opacity: 1 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15
            }
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning,";
        if (hour < 18) return "Good afternoon,";
        return "Good evening,";
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-primary/30 overflow-hidden">
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}
                className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md safe-pt"
            >
                <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <img
                                src="/lucent-header-light.png"
                                alt="Lucent"
                                className="h-5 sm:h-6 object-contain"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link to="/auth" className="hidden sm:inline-flex text-sm font-medium hover:text-white/80 transition-colors">
                            Log in
                        </Link>
                        <Button asChild className="rounded-full px-5 sm:px-6 text-sm bg-white text-black hover:bg-white/90">
                            <Link to="/auth">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </motion.nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32">
                {/* Abstract Background Blobs (Parallax) */}
                <motion.div style={{ y: y1 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                    className="container mx-auto px-6 relative z-10 text-center max-w-4xl"
                >
                    <motion.div variants={fadeUp}>
                        <Badge className="mb-6 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm">
                            Life Energy Analytics • Lucent v1.2.0
                        </Badge>
                    </motion.div>
                    <motion.h1 variants={fadeUp} style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
                        Measure Expenses in <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                            Hours of Your Life.
                        </span>
                    </motion.h1>
                    <motion.p variants={fadeUp} className="text-base md:text-lg text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed px-2">
                        Discover your true hourly wage after working expenses. Transform currency prices into real life-hours worked and master your financial freedom.
                    </motion.p>
                    <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 sm:px-0">
                        <Button asChild size="lg" className="rounded-full w-full sm:w-auto px-8 h-14 text-base bg-white text-black hover:bg-white/90 transition-transform active:scale-95">
                            <Link to="/auth">
                                Start for free <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="rounded-full w-full sm:w-auto px-8 h-14 text-base border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm transition-transform active:scale-95">
                            <Link to="/download">Download App</Link>
                        </Button>
                    </motion.div>
                </motion.div>
            </section>

            {/* Problem / Solution */}
            <section className="py-24 bg-white/5 border-y border-white/5 relative">
                <motion.div style={{ y: y2 }} className="absolute -left-32 top-10 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={fadeUp}
                    className="container mx-auto px-6 max-w-5xl text-center relative z-10"
                >
                    <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 leading-tight">Tired of manual spreadsheets?</h2>
                    <p className="text-base md:text-xl text-white/60 leading-relaxed max-w-3xl mx-auto">
                        Stop wasting hours trying to figure out where your money went. Lucent provides intelligent categorizations, target pacing, and real-time reports to give you a crystal-clear picture of your wealth.
                    </p>
                </motion.div>
            </section>

            {/* Live App Preview Section */}
            <section className="py-24 relative overflow-hidden bg-black/50">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

                <div className="container mx-auto px-4 max-w-7xl relative z-10">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeUp}
                        className="text-center mb-16"
                    >
                        <Badge className="mb-4 bg-primary/20 text-emerald-400 border-0 px-4 py-1.5 rounded-full text-sm font-medium">
                            Live Preview
                        </Badge>
                        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-3xl md:text-4xl font-bold mb-4">See your money in motion</h2>
                        <p className="text-lg text-white/60 max-w-2xl mx-auto">
                            Transform raw numbers into stunning visuals. This is the exact layout you'll use inside to monitor, tweak, and master your financial flow.
                        </p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: false, margin: "-100px" }}
                        variants={staggerContainer}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                        {/* Dummy Dashboard Summary Cards */}
                        <motion.div variants={fadeUp} className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
                            {/* Dashboard Header */}
                            <div className="md:col-span-3 flex items-center justify-between mb-2">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold text-white flex items-center flex-wrap gap-x-2">
                                        {getGreeting()}
                                        <div className="relative inline-block min-w-[120px] h-[32px] overflow-hidden ml-1 align-bottom">
                                            <AnimatePresence mode="popLayout">
                                                <motion.span
                                                    key={names[currentNameIndex]}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -20 }}
                                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                                    className="absolute left-0 bottom-0 whitespace-nowrap text-emerald-400"
                                                >
                                                    {names[currentNameIndex]}
                                                </motion.span>
                                            </AnimatePresence>
                                        </div>
                                    </h3>
                                    <p className="text-sm text-white/50">{format(new Date(), 'EEEE, MMMM do')}</p>
                                </div>
                            </div>

                            {/* Total Balance */}
                            <GlassCard className="p-5 flex flex-col justify-between transition-opacity duration-500 bg-emerald-500/5 hover:bg-emerald-500/10 border-white/10 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                                <div className="relative z-10 flex justify-between items-start w-full">
                                    <div>
                                        <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-1">Total Balance</p>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-3xl font-semibold tracking-tight text-white">
                                                {hideAmounts ? "₦***" : "₦1,315,000"}
                                            </span>
                                            {!hideAmounts && (
                                                <span className="text-sm font-medium text-white/60">
                                                    .00
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        className="p-2 bg-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors cursor-pointer outline-none flex items-center justify-center shrink-0"
                                        onClick={() => setHideAmounts(!hideAmounts)}
                                    >
                                        {hideAmounts ? (
                                            <EyeOff className="w-5 h-5" strokeWidth={2} />
                                        ) : (
                                            <Eye className="w-5 h-5" strokeWidth={2} />
                                        )}
                                    </button>
                                </div>
                                <div className="relative z-10 mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 w-fit">
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="text-xs font-medium text-emerald-400">
                                        {hideAmounts ? "₦***" : "₦470,000.00"} Net Income this month
                                    </span>
                                </div>
                            </GlassCard>

                            {/* Monthly Income */}
                            <GlassCard className="p-5 flex flex-col justify-between transition-opacity duration-500 bg-emerald-500/5 border-white/10 relative overflow-hidden">
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                                <div className="relative z-10 flex justify-between items-start w-full">
                                    <div>
                                        <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-1">Income THIS MONTH</p>
                                        <p className="text-2xl font-bold tracking-tight text-white mt-1">
                                            {hideAmounts ? "₦***" : (
                                                <>
                                                    <span className="text-xs font-normal text-white/60 mr-0.5">₦</span>
                                                    2,650,000
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-green-500/20 rounded-full text-green-400">
                                        <ArrowUpRight className="w-5 h-5" strokeWidth={2} />
                                    </div>
                                </div>
                                <div className="relative z-10 mt-4 text-xs font-medium text-white/50">
                                    25% of target
                                </div>
                            </GlassCard>

                            {/* Monthly Expenses */}
                            <GlassCard className="p-5 flex flex-col justify-between transition-opacity duration-500 bg-rose-500/5 border-white/10 relative overflow-hidden">
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
                                <div className="relative z-10 flex justify-between items-start w-full">
                                    <div>
                                        <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-1">Expenses THIS MONTH</p>
                                        <p className="text-2xl font-bold tracking-tight text-white mt-1">
                                            {hideAmounts ? "₦***" : (
                                                <>
                                                    <span className="text-xs font-normal text-white/60 mr-0.5">₦</span>
                                                    2,180,000
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-red-500/20 rounded-full text-red-400">
                                        <ArrowDownRight className="w-5 h-5" strokeWidth={2} />
                                    </div>
                                </div>
                                <div className="relative z-10 mt-4 text-xs font-medium text-white/50">
                                    33% of budget
                                </div>
                            </GlassCard>
                        </motion.div>

                        {/* Spending by Category Chart Dummy */}
                        <motion.div variants={fadeUp}>
                            <GlassCard className="p-6 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-white/10 h-[400px]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                                        <BarChart3 className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
                                        Spending by Category
                                    </h3>
                                </div>
                                <div className="h-[300px]">
                                    <AnimatedChartMount>
                                        <SpendingByCategoryChart
                                            data={dummySpendingData}
                                            hideAmounts={hideAmounts}
                                            currencySymbol="₦"
                                            formatAmount={formatAmount}
                                            colors={COLORS}
                                        />
                                    </AnimatedChartMount>
                                </div>
                            </GlassCard>
                        </motion.div>

                        {/* Daily Income & Expenses Chart Dummy */}
                        <motion.div variants={fadeUp}>
                            <GlassCard className="p-6 transition-opacity duration-500 bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-white/10 h-[400px]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                                        <AreaChart className="h-5 w-5 text-blue-400" strokeWidth={1.5} />
                                        Daily Income & Expenses
                                    </h3>
                                </div>
                                <div className="h-[300px]">
                                    <AnimatedChartMount>
                                        <DailyIncomeExpensesChart
                                            data={dummyDailyData}
                                            hideAmounts={hideAmounts}
                                            currencySymbol="₦"
                                            formatAmount={formatAmount}
                                        />
                                    </AnimatedChartMount>
                                </div>
                            </GlassCard>
                        </motion.div>

                        {/* Balance Trend Dummy */}
                        <motion.div variants={fadeUp}>
                            <GlassCard className="p-6 transition-opacity duration-500 bg-gradient-to-br from-green-500/5 to-green-500/10 border border-white/10 h-[400px]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                                        <LineChart className="h-5 w-5 text-green-400" strokeWidth={1.5} />
                                        Balance Trend
                                    </h3>
                                </div>
                                <div className="h-[300px]">
                                    <AnimatedChartMount>
                                        <BalanceTrendChart
                                            data={dummyTrendData}
                                            hideAmounts={hideAmounts}
                                            currencySymbol="₦"
                                            formatAmount={formatAmount}
                                        />
                                    </AnimatedChartMount>
                                </div>
                            </GlassCard>
                        </motion.div>

                        {/* Expense Distribution Dummy */}
                        <motion.div variants={fadeUp}>
                            <GlassCard className="p-6 transition-opacity duration-500 bg-gradient-to-br from-amber-500/5 to-amber-500/10 border border-white/10 h-[400px]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                                        <PieChart className="h-5 w-5 text-amber-400" strokeWidth={1.5} />
                                        Expense Distribution
                                    </h3>
                                </div>
                                <div className="h-[320px]">
                                    <AnimatedChartMount>
                                        <ExpenseDistributionChart
                                            data={dummySpendingData}
                                            hideAmounts={hideAmounts}
                                            currencySymbol="₦"
                                            formatAmount={formatAmount}
                                            colors={COLORS}
                                            totalAmount={totalDummySpending}
                                            hoveredLegendItem={hoveredLegendItem}
                                            setHoveredLegendItem={setHoveredLegendItem}
                                        />
                                    </AnimatedChartMount>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 lg:py-32 relative">
                <div className="container mx-auto px-6 max-w-6xl">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeUp}
                        className="text-center mb-16"
                    >
                        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-3xl md:text-4xl font-bold mb-4">Everything you need</h2>
                        <p className="text-lg text-white/60">Powerful oversight tools designed for everyday life.</p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        <motion.div variants={fadeUp}>
                            <FeatureCard
                                icon={<Hourglass className="h-6 w-6 text-amber-400" />}
                                title="Life Energy Mode"
                                description="Convert prices into actual working hours needed based on your true net hourly wage."
                            />
                        </motion.div>
                        <motion.div variants={fadeUp}>
                            <FeatureCard
                                icon={<Activity className="h-6 w-6 text-blue-400" />}
                                title="Smart Tracking"
                                description="Log and categorize every transaction instantly. Know exactly where your money goes."
                            />
                        </motion.div>
                        <motion.div variants={fadeUp}>
                            <FeatureCard
                                icon={<PieChart className="h-6 w-6 text-emerald-400" />}
                                title="Visual Reports"
                                description="Beautiful charts and breakdowns simplify your spending habits at a glance."
                            />
                        </motion.div>
                        <motion.div variants={fadeUp}>
                            <FeatureCard
                                icon={<Target className="h-6 w-6 text-purple-400" />}
                                title="Set Targets"
                                description="Define monthly limits for specific categories and monitor your pacing."
                            />
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Platforms */}
            <section id="platforms" className="py-24 lg:py-32 bg-white/5 border-y border-white/5 relative overflow-hidden">
                <motion.div style={{ y: y1 }} className="absolute -right-32 bottom-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="container mx-auto px-6 max-w-5xl text-center relative z-10">
                    <motion.h2
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                        style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                        className="text-3xl md:text-4xl font-bold mb-16"
                    >
                        Available wherever you are
                    </motion.h2>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={staggerContainer}
                        className="grid md:grid-cols-3 gap-8"
                    >
                        <motion.div variants={fadeUp}>
                            <PlatformCard
                                icon={<Globe className="h-8 w-8" />}
                                title="Web App"
                                description="Access fully-featured from any browser."
                                link="/auth"
                                linkText="Open Web App"
                            />
                        </motion.div>
                        <motion.div variants={fadeUp}>
                            <PlatformCard
                                icon={<Smartphone className="h-8 w-8" />}
                                title="Android App (APK)"
                                description="Download the native Android app directly."
                                link="/download"
                                linkText="Get the App"
                            />
                        </motion.div>
                        <motion.div variants={fadeUp}>
                            <PlatformCard
                                icon={<Monitor className="h-8 w-8" />}
                                title="Windows Desktop"
                                description="Native experience for power users."
                                link="#"
                                linkText="Download .exe"
                                comingSoon={true}
                            />
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/10" />
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeUp}
                    className="container mx-auto px-6 relative z-10 text-center"
                >
                    <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-3xl md:text-5xl font-bold mb-8 px-4 leading-tight">Ready to transform your finances?</h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button asChild size="lg" className="rounded-full w-full sm:w-auto px-10 h-14 text-base sm:text-lg bg-white text-black hover:bg-white/90 transition-transform active:scale-95 shadow-2xl shadow-primary/20">
                            <Link to="/auth">Create your free account</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="rounded-full w-full sm:w-auto px-10 h-14 text-base border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm transition-transform active:scale-95">
                            <Link to="/download">Download for Android</Link>
                        </Button>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-black py-12 relative z-10">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
                    <div className="flex items-center gap-2 mb-4 md:mb-0">
                        <img
                            src="/lucent-header-light.png"
                            alt="Lucent"
                            className="h-6 object-contain opacity-50 grayscale"
                        />
                    </div>
                    <div className="text-sm text-white/40">
                        © {new Date().getFullYear()} Lucent. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <GlassCard className="p-8 rounded-[2rem] border-white/5 hover:border-primary/20 transition-all duration-500 h-full group relative overflow-hidden bg-white/[0.03]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />
            <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    {icon}
                </div>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-white/50 leading-relaxed text-base">{description}</p>
            </div>
        </GlassCard>
    );
}

function PlatformCard({ icon, title, description, link, linkText, comingSoon }: { icon: React.ReactNode, title: string, description: string, link: string, linkText: string, comingSoon?: boolean }) {
    return (
        <GlassCard className="p-8 rounded-3xl border-white/10 flex flex-col items-center text-center hover:border-white/30 transition-all duration-300 relative overflow-hidden h-full">
            {comingSoon && (
                <div className="absolute top-4 right-4 bg-white/10 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full backdrop-blur-md">
                    Coming Soon
                </div>
            )}
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-white group-hover:bg-primary/20 transition-colors">
                {icon}
            </div>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }} className="text-xl font-semibold mb-3">{title}</h3>
            <p className="text-white/60 mb-8 flex-1">{description}</p>
            {comingSoon ? (
                <Button disabled variant="outline" className="w-full rounded-full border-white/20 bg-transparent text-white/50 cursor-not-allowed">
                    {linkText}
                </Button>
            ) : link.startsWith('/') ? (
                <Button asChild variant="outline" className="w-full rounded-full border-white/20 bg-transparent hover:bg-white hover:text-black">
                    <Link to={link}>{linkText}</Link>
                </Button>
            ) : (
                <Button asChild variant="outline" className="w-full rounded-full border-white/20 bg-transparent hover:bg-white hover:text-black">
                    <a href={link}>{linkText}</a>
                </Button>
            )}
        </GlassCard>
    );
}

function AnimatedChartMount({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: false, margin: "-100px" });

    return (
        <div ref={ref} className="w-full h-full">
            {isInView && children}
        </div>
    );
}

// Add simple badge component since we're using it
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={`inline-flex items-center ${className}`}>
            {children}
        </span>
    );
}
