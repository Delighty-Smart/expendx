import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import {
    Activity,
    PieChart,
    Target,
    TrendingUp,
    Smartphone,
    Globe,
    Monitor,
    ArrowRight
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function Landing() {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();

    // Parallax
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 800], [0, 150]);
    const y2 = useTransform(scrollY, [0, 800], [0, -100]);

    useEffect(() => {
        if (!isLoading && user) {
            navigate('/dashboard');
        }
    }, [user, isLoading, navigate]);

    if (isLoading || user) return null; // Prevent flash

    // Animation variants
    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
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

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-primary/30 overflow-hidden">
            {/* Navigation */}
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}
                className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-md"
            >
                <div className="container mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img
                            src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png"
                            alt="ExpendX"
                            className="h-7 sm:h-8 object-contain"
                        />
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
                        <Badge className="mb-6 bg-white/10 hover:bg-white/20 text-white border-0 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                            Smarter Expense Tracking
                        </Badge>
                    </motion.div>
                    <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
                        Take Control of Your <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                            Finances, Effortlessly.
                        </span>
                    </motion.h1>
                    <motion.p variants={fadeUp} className="text-base md:text-lg text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed px-2">
                        The intelligent way to track every expense, monitor your inflow, set monthly targets, and generate beautiful insights—anywhere, anytime.
                    </motion.p>
                    <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 sm:px-0">
                        <Button asChild size="lg" className="rounded-full w-full sm:w-auto px-8 h-14 text-base bg-white text-black hover:bg-white/90 transition-transform active:scale-95">
                            <Link to="/auth">
                                Start for free <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="rounded-full w-full sm:w-auto px-8 h-14 text-base border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm transition-transform active:scale-95">
                            <a href="#platforms">Download App</a>
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
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 leading-tight">Tired of manual spreadsheets?</h2>
                    <p className="text-base md:text-xl text-white/60 leading-relaxed max-w-3xl mx-auto">
                        Stop wasting hours trying to figure out where your money went. ExpendX provides intelligent categorizations, target pacing, and real-time reports to give you a crystal-clear picture of your wealth.
                    </p>
                </motion.div>
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
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need</h2>
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
                        <motion.div variants={fadeUp}>
                            <FeatureCard
                                icon={<TrendingUp className="h-6 w-6 text-rose-400" />}
                                title="Inflow Monitoring"
                                description="Keep a close eye on income streams and measure your net growth over time."
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
                                title="Android & iOS PWA"
                                description="Install directly to your homescreen."
                                link="/auth"
                                linkText="Get Mobile App"
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
                    <h2 className="text-3xl md:text-5xl font-bold mb-8 px-4 leading-tight">Ready to transform your finances?</h2>
                    <Button asChild size="lg" className="rounded-full w-[calc(100%-2rem)] sm:w-auto px-10 h-14 text-base sm:text-lg bg-white text-black hover:bg-white/90 transition-transform active:scale-95 shadow-2xl shadow-primary/20">
                        <Link to="/auth">Create your free account</Link>
                    </Button>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-black py-12 relative z-10">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
                    <div className="flex items-center gap-2 mb-4 md:mb-0">
                        <img
                            src="/lovable-uploads/87a85edd-1a8a-44f7-92c9-dd1273fccf8c.png"
                            alt="ExpendX"
                            className="h-6 object-contain opacity-50 grayscale"
                        />
                    </div>
                    <div className="text-sm text-white/40">
                        © {new Date().getFullYear()} ExpendX. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-3">{title}</h3>
            <p className="text-white/60 leading-relaxed">{description}</p>
        </div>
    );
}

function PlatformCard({ icon, title, description, link, linkText, comingSoon }: { icon: React.ReactNode, title: string, description: string, link: string, linkText: string, comingSoon?: boolean }) {
    return (
        <div className="p-8 rounded-3xl bg-black border border-white/10 flex flex-col items-center text-center hover:border-white/30 transition-colors relative overflow-hidden">
            {comingSoon && (
                <div className="absolute top-4 right-4 bg-white/10 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full backdrop-blur-md">
                    Coming Soon
                </div>
            )}
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-white">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-3">{title}</h3>
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
