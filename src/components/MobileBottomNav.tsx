
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Home,
    Receipt,
    DollarSign,
    PiggyBank,
    MoreHorizontal,
    Bell,
    BarChart,
    Settings,
    MessageSquare,
    CreditCard,
    ChevronDown,
    Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface MobileBottomNavProps {
    unreadAlerts: number;
}

const PRIMARY_TABS = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/transactions", label: "Transactions", icon: Receipt },
    { path: "/budgets", label: "Budgets", icon: DollarSign },
    { path: "/savings", label: "Savings", icon: PiggyBank },
];

const MORE_ITEMS = [
    { path: "/subscriptions", label: "Subscriptions", icon: CreditCard },
    { path: "/reports", label: "Reports", icon: BarChart },
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
                    className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
                    onClick={() => setShowMore(false)}
                />
            )}

            {/* More sheet — slides up from bottom */}
            <div
                ref={sheetRef}
                className={cn(
                    "fixed bottom-[64px] left-0 right-0 bg-card border-t border-border z-50 px-4 pt-3 pb-4 rounded-t-2xl shadow-xl transition-all duration-300 ease-out",
                    showMore
                        ? "translate-y-0 opacity-100"
                        : "translate-y-full opacity-0 pointer-events-none"
                )}
            >
                <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
                <div className="grid grid-cols-3 gap-2">
                    {allMoreItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all active:scale-95",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-accent"
                                )}
                            >
                                <div className="relative">
                                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.75} />
                                    {item.path === "/alerts" && unreadAlerts > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                                            {unreadAlerts > 9 ? "9+" : unreadAlerts}
                                        </span>
                                    )}
                                </div>
                                <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Tab Bar */}
            <nav
                className="fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-md border-t border-border z-40 flex items-center safe-pb"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                <div className="flex w-full">
                    {PRIMARY_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = location.pathname === tab.path;
                        return (
                            <Link
                                key={tab.path}
                                to={tab.path}
                                onClick={() => Haptics.impact({ style: ImpactStyle.Light }).catch(() => { })}
                                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-95 group"
                            >
                                <div
                                    className={cn(
                                        "flex items-center justify-center w-10 h-6 rounded-full transition-all duration-200",
                                        isActive ? "bg-primary/15" : "bg-transparent"
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "h-5 w-5 transition-all duration-200",
                                            isActive ? "text-primary" : "text-muted-foreground"
                                        )}
                                        strokeWidth={isActive ? 2.5 : 1.75}
                                    />
                                </div>
                                <span
                                    className={cn(
                                        "text-[10px] font-medium transition-colors duration-200",
                                        isActive ? "text-primary" : "text-muted-foreground"
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
                        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-95"
                    >
                        <div
                            className={cn(
                                "flex items-center justify-center w-10 h-6 rounded-full transition-all duration-200 relative",
                                isMoreActive || showMore ? "bg-primary/15" : "bg-transparent"
                            )}
                        >
                            <MoreHorizontal
                                className={cn(
                                    "h-5 w-5 transition-all duration-200",
                                    isMoreActive || showMore ? "text-primary" : "text-muted-foreground"
                                )}
                                strokeWidth={isMoreActive || showMore ? 2.5 : 1.75}
                            />
                            {unreadAlerts > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center">
                                    {unreadAlerts > 9 ? "9+" : unreadAlerts}
                                </span>
                            )}
                        </div>
                        <span
                            className={cn(
                                "text-[10px] font-medium transition-colors duration-200",
                                isMoreActive || showMore ? "text-primary" : "text-muted-foreground"
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
