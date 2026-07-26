import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Home,
    Banknote,
    Wallet,
    Landmark,
    MoreHorizontal,
    Bell,
    BarChart3,
    Settings,
    MessageSquare,
    Repeat,
    ChevronDown,
    Shield,
    CirclePlus,
    TrendingUp,
    Hourglass
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface MobileBottomNavProps {
    unreadAlerts: number;
}

// The bottom nav now has 5 slots: Home, Transactions, Add (middle), Budgets, More.
// Savings is moved to MORE_ITEMS.
const LEFT_TABS = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/transactions", label: "Txns", icon: Banknote },
];

const RIGHT_TABS = [
    { path: "/budgets", label: "Budgets", icon: Wallet },
];

const MORE_ITEMS = [
    { path: "/savings", label: "Savings", icon: Landmark },
    { path: "/subscriptions", label: "Subscriptions", icon: Repeat },
    { path: "/reports", label: "Reports", icon: BarChart3 },
    { path: "/trends", label: "Trends", icon: TrendingUp },
    { path: "/life-energy", label: "Life Energy", icon: Hourglass },
    { path: "/alerts", label: "Alerts", icon: Bell },
    { path: "/feedback", label: "Feedback", icon: MessageSquare },
    { path: "/settings", label: "Settings", icon: Settings },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ unreadAlerts }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [showMore, setShowMore] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);

    // Which tab is active?
    const isMoreActive = MORE_ITEMS.some((item) => location.pathname === item.path) ||
        location.pathname === "/admin";

    // Close "More" sheet when navigating
    useEffect(() => {
        setShowMore(false);
    }, [location.pathname]);

    // Close on outside tap
    useEffect(() => {
        if (!showMore) return;
        const handler = (e: MouseEvent) => {
            if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
                setShowMore(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showMore]);

    const allMoreItems = isAdmin
        ? [...MORE_ITEMS, { path: "/admin", label: "Admin", icon: Shield }]
        : MORE_ITEMS;

    return (
        <>
            {/* More sheet backdrop */}
            {showMore && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30"
                    onClick={() => setShowMore(false)}
                />
            )}

            {/* More sheet — slides up from bottom behind the bottom bar */}
            <div
                ref={sheetRef}
                className={cn(
                    "fixed bottom-[64px] left-0 right-0 bg-bg-surface border-t border-border-default z-30 px-4 pt-3 pb-4 rounded-t-[32px] shadow-2xl transition-all duration-300 ease-out",
                    showMore
                        ? "translate-y-0 opacity-100"
                        : "translate-y-full opacity-0 pointer-events-none"
                )}
            >
                <div className="w-10 h-1 bg-border-strong rounded-full mx-auto mb-4" />
                <div className="grid grid-cols-3 gap-2">
                    {allMoreItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex flex-col items-center gap-1.5 py-3 px-2 rounded-[20px] transition-all active:scale-95",
                                    isActive
                                        ? "bg-brand-primary-subtle text-brand-primary"
                                        : "text-icon-muted hover:bg-bg-sidebar-hover"
                                )}
                            >
                                <div className="relative">
                                    <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 1.75} />
                                    {item.path === "/alerts" && unreadAlerts > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 bg-semantic-danger-bg text-semantic-danger-text text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                                            {unreadAlerts > 9 ? "9+" : unreadAlerts}
                                        </span>
                                    )}
                                </div>
                                <span className={cn("text-[10px] font-semibold", isActive && "text-brand-primary")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Tab Bar */}
            <nav
                className="fixed bottom-0 left-0 right-0 h-[64px] bg-bg-surface border-t border-border-default z-50 flex items-center safe-pb px-4"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                <div className="flex w-full items-center justify-between h-full">
                    {/* Left 2 Tabs */}
                    {LEFT_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = location.pathname === tab.path;
                        return (
                            <Link
                                key={tab.path}
                                to={tab.path}
                                onClick={() => Haptics.impact({ style: ImpactStyle.Light }).catch(() => { })}
                                className="flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group h-full"
                            >
                                <div className={cn(
                                    "p-1.5 rounded-[12px] transition-all",
                                    isActive ? "bg-black text-white dark:bg-white dark:text-black" : "text-icon-muted"
                                )}>
                                    <Icon
                                        className="h-5 w-5"
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                    />
                                </div>
                                <span
                                    className={cn(
                                        "text-[9px] font-semibold transition-colors duration-200",
                                        isActive ? "text-text-primary" : "text-icon-muted"
                                    )}
                                >
                                    {tab.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Prominent Add Button (Center) */}
                    <div className="flex-1 flex justify-center -translate-y-6">
                        <Link
                            to="/add-transaction"
                            onClick={() => Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { })}
                            className="bg-black dark:bg-white text-white dark:text-black shadow-brand w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95 border-4 border-bg-base"
                        >
                            <CirclePlus className="h-6 w-6" strokeWidth={1.8} />
                        </Link>
                    </div>

                    {/* Right 1 Tab (Budgets) */}
                    {RIGHT_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = location.pathname === tab.path;
                        return (
                            <Link
                                key={tab.path}
                                to={tab.path}
                                onClick={() => Haptics.impact({ style: ImpactStyle.Light }).catch(() => { })}
                                className="flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group h-full"
                            >
                                <div className={cn(
                                    "p-1.5 rounded-[12px] transition-all",
                                    isActive ? "bg-black text-white dark:bg-white dark:text-black" : "text-icon-muted"
                                )}>
                                    <Icon
                                        className="h-5 w-5"
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                    />
                                </div>
                                <span
                                    className={cn(
                                        "text-[9px] font-semibold transition-colors duration-200",
                                        isActive ? "text-text-primary" : "text-icon-muted"
                                    )}
                                >
                                    {tab.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* More button */}
                    <button
                        onClick={() => {
                            Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
                            setShowMore((v) => !v);
                        }}
                        className="flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 h-full relative"
                    >
                        <div className={cn(
                            "p-1.5 rounded-[12px] transition-all",
                            isMoreActive || showMore ? "bg-black text-white dark:bg-white dark:text-black" : "text-icon-muted"
                        )}>
                            <MoreHorizontal
                                className="h-5 w-5"
                                strokeWidth={isMoreActive || showMore ? 2.5 : 1.8}
                            />
                        </div>
                        <span
                            className={cn(
                                "text-[9px] font-semibold transition-colors duration-200",
                                isMoreActive || showMore ? "text-text-primary" : "text-icon-muted"
                            )}
                        >
                            More
                        </span>
                    </button>
                </div>
            </nav>
        </>
    );
};

export default MobileBottomNav;
