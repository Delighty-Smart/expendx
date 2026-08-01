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
    { path: "/chat", label: "Lucent AI", icon: MessageSquare },
    { path: "/dashboard", label: "Home", icon: Home },
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
    return null;
};

export default MobileBottomNav;
