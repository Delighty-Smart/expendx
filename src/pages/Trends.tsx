import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/contexts/SettingsContext";
import {
    format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, getDay
} from "date-fns";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer
} from "recharts";
import {
    TrendingUp, BarChart2, LineChart as LineIcon, X,
    Search, ChevronRight, ChevronDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
type TimeView = "weekly" | "monthly" | "yearly";
type ChartType = "line" | "bar";
type FilterTab = "all" | "debit" | "credit" | "savings" | "subscription";

interface TxRow {
    id: string;
    date: string;
    amount: number;
    category: string;
    description: string;
    type: string;
}

interface TrackableItem {
    id: string;
    label: string;
    kind: "category" | "description" | "type";
    typeScope?: string; // which transaction type this belongs to
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS = ["#a3e635", "#38bdf8", "#fb923c", "#c084fc", "#f472b6"];
const MAX_ITEMS = 5;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TYPE_TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "debit", label: "Expenses" },
    { id: "credit", label: "Income" },
    { id: "savings", label: "Savings" },
    { id: "subscription", label: "Subscriptions" },
];

const TYPE_ITEMS: TrackableItem[] = [
    { id: "debit", label: "All Expenses", kind: "type" },
    { id: "credit", label: "All Income", kind: "type" },
    { id: "savings", label: "All Savings", kind: "type" },
    { id: "subscription", label: "All Subscriptions", kind: "type" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function matchesItem(t: TxRow, item: TrackableItem): boolean {
    if (item.kind === "category") return t.category === item.label && (!item.typeScope || t.type === item.typeScope);
    if (item.kind === "description") return t.description === item.label;
    if (item.kind === "type") return t.type === item.id;
    return false;
}

function buildChartData(
    transactions: TxRow[],
    selected: TrackableItem[],
    view: TimeView
): Record<string, number | string>[] {
    const now = new Date();

    if (view === "weekly") {
        return DAY_LABELS.map((label, dayIndex) => {
            const row: Record<string, number | string> = { label };
            selected.forEach((item) => {
                row[item.id] = transactions
                    .filter((t) => {
                        const d = new Date(t.date);
                        return d >= startOfWeek(now) && d <= endOfWeek(now) && getDay(d) === dayIndex && matchesItem(t, item);
                    })
                    .reduce((sum, t) => sum + t.amount, 0);
            });
            return row;
        });
    }

    if (view === "monthly") {
        const days = eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
        return days.map((day) => {
            const row: Record<string, number | string> = { label: format(day, "d") };
            selected.forEach((item) => {
                row[item.id] = transactions
                    .filter((t) => format(new Date(t.date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd") && matchesItem(t, item))
                    .reduce((sum, t) => sum + t.amount, 0);
            });
            return row;
        });
    }

    // yearly
    const months = eachMonthOfInterval({ start: startOfYear(now), end: endOfYear(now) });
    return months.map((m) => {
        const row: Record<string, number | string> = { label: MONTH_LABELS[m.getMonth()] };
        selected.forEach((item) => {
            row[item.id] = transactions
                .filter((t) => {
                    const d = new Date(t.date);
                    return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth() && matchesItem(t, item);
                })
                .reduce((sum, t) => sum + t.amount, 0);
        });
        return row;
    });
}

// ─── Custom Checkbox ──────────────────────────────────────────────────────────
const CheckBox = ({ checked, color }: { checked: boolean; color?: string }) => (
    <span
        className={cn(
            "w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all",
            checked ? "border-transparent" : "border-muted-foreground/40 bg-transparent"
        )}
        style={checked ? { background: color || "#a3e635", borderColor: color || "#a3e635" } : {}}
    >
        {checked && (
            <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2">
                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )}
    </span>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, currency, selected }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card border border-border rounded-xl shadow-xl px-4 py-3 text-sm">
            <p className="font-semibold text-foreground mb-2">{label}</p>
            {payload.map((entry: any) => (
                <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                    <span className="text-muted-foreground">{selected?.find((s: TrackableItem) => s.id === entry.dataKey)?.label ?? entry.dataKey}:</span>
                    <span className="font-bold text-foreground">{currency} {Number(entry.value).toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Selector Panel ───────────────────────────────────────────────────────────
interface SelectorProps {
    transactions: TxRow[];
    selected: TrackableItem[];
    onToggle: (item: TrackableItem) => void;
}

const SelectorPanel = ({ transactions, selected, onToggle }: SelectorProps) => {
    const [activeTab, setActiveTab] = useState<FilterTab>("all");
    const [searchQ, setSearchQ] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const isSelected = (id: string) => selected.some((s) => s.id === id);
    const selectedCount = selected.length;

    const toggleCategory = (cat: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            next.has(cat) ? next.delete(cat) : next.add(cat);
            return next;
        });
    };

    // Build grouped structure: categories (with types) → descriptions inside
    const grouped = useMemo(() => {
        const typeFilter = activeTab === "all" ? null : activeTab;

        // Filter txns by active tab
        const filtered = transactions.filter((t) => !typeFilter || t.type === typeFilter);

        // Build: category → descriptions
        const catMap = new Map<string, { category: string; txType: string; descriptions: string[] }>();
        filtered.forEach((t) => {
            const key = `${t.type}::${t.category}`;
            if (!catMap.has(key)) {
                catMap.set(key, { category: t.category, txType: t.type, descriptions: [] });
            }
            const entry = catMap.get(key)!;
            if (!entry.descriptions.includes(t.description)) {
                entry.descriptions.push(t.description);
            }
        });

        return Array.from(catMap.values()).sort((a, b) => a.category.localeCompare(b.category));
    }, [transactions, activeTab]);

    // Apply search filter
    const filteredGrouped = useMemo(() => {
        if (!searchQ.trim()) return grouped;
        const q = searchQ.toLowerCase();
        return grouped
            .map((g) => ({
                ...g,
                descriptions: g.descriptions.filter((d) => d.toLowerCase().includes(q)),
            }))
            .filter((g) => g.category.toLowerCase().includes(q) || g.descriptions.length > 0);
    }, [grouped, searchQ]);

    // Type-level items (shown only in "all" tab or matching tab)
    const typeItems = activeTab === "all"
        ? TYPE_ITEMS
        : TYPE_ITEMS.filter((t) => t.id === activeTab);

    return (
        <div className="space-y-3">
            {/* Tab row */}
            <div className="flex gap-1 bg-muted/30 rounded-xl p-1 overflow-x-auto">
                {TYPE_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-primary text-primary-foreground shadow"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                    placeholder="Search…"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    className="pl-8 h-9 text-sm bg-muted/30 border-none rounded-xl"
                />
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">

                {/* Type-level rows */}
                {!searchQ && typeItems.map((item) => {
                    const checked = isSelected(item.id);
                    const canAdd = selectedCount < MAX_ITEMS || checked;
                    return (
                        <button
                            key={item.id}
                            disabled={!canAdd}
                            onClick={() => onToggle(item)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group",
                                checked ? "bg-primary/10" : "hover:bg-muted/60",
                                !canAdd && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            <CheckBox checked={checked} color={CHART_COLORS[selected.findIndex((s) => s.id === item.id)]} />
                            <span className={cn("flex-1 text-left", checked ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                                {item.label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">Type</span>
                        </button>
                    );
                })}

                {/* Separator */}
                {!searchQ && typeItems.length > 0 && filteredGrouped.length > 0 && (
                    <div className="flex items-center gap-2 py-1 px-3">
                        <div className="flex-1 h-px bg-border/50" />
                        <span className="text-[10px] text-muted-foreground font-medium">Categories</span>
                        <div className="flex-1 h-px bg-border/50" />
                    </div>
                )}

                {/* Category rows */}
                {filteredGrouped.map((group) => {
                    const catItem: TrackableItem = {
                        id: `cat_${group.txType}_${group.category}`,
                        label: group.category,
                        kind: "category",
                        typeScope: group.txType,
                    };
                    const isCatChecked = isSelected(catItem.id);
                    const canAdd = selectedCount < MAX_ITEMS || isCatChecked;
                    const isExpanded = expandedCategories.has(catItem.id) || !!searchQ;
                    const colorIdx = selected.findIndex((s) => s.id === catItem.id);

                    return (
                        <div key={catItem.id}>
                            {/* Category row */}
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={!canAdd}
                                    onClick={() => onToggle(catItem)}
                                    className={cn(
                                        "flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all group",
                                        isCatChecked ? "bg-primary/10" : "hover:bg-muted/60",
                                        !canAdd && "opacity-40 cursor-not-allowed"
                                    )}
                                >
                                    <CheckBox checked={isCatChecked} color={colorIdx >= 0 ? CHART_COLORS[colorIdx] : undefined} />
                                    <span className={cn("flex-1 text-left font-medium", isCatChecked ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                                        {group.category}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium capitalize">
                                        {group.txType === "debit" ? "Expense" : group.txType === "credit" ? "Income" : group.txType}
                                    </span>
                                </button>
                                {/* Expand toggle for items */}
                                {group.descriptions.length > 0 && (
                                    <button
                                        onClick={() => toggleCategory(catItem.id)}
                                        className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
                                    >
                                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                    </button>
                                )}
                            </div>

                            {/* Description rows (children) */}
                            {isExpanded && group.descriptions.map((desc) => {
                                const descItem: TrackableItem = {
                                    id: `desc_${group.txType}_${group.category}_${desc}`,
                                    label: desc,
                                    kind: "description",
                                    typeScope: group.txType,
                                };
                                const isDescChecked = isSelected(descItem.id);
                                const canAddDesc = selectedCount < MAX_ITEMS || isDescChecked;
                                const descColorIdx = selected.findIndex((s) => s.id === descItem.id);
                                return (
                                    <button
                                        key={descItem.id}
                                        disabled={!canAddDesc}
                                        onClick={() => onToggle(descItem)}
                                        className={cn(
                                            "w-full flex items-center gap-3 pl-9 pr-3 py-1.5 rounded-xl text-sm transition-all group",
                                            isDescChecked ? "bg-primary/10" : "hover:bg-muted/60",
                                            !canAddDesc && "opacity-40 cursor-not-allowed"
                                        )}
                                    >
                                        <CheckBox checked={isDescChecked} color={descColorIdx >= 0 ? CHART_COLORS[descColorIdx] : undefined} />
                                        <span className={cn(
                                            "flex-1 text-left text-xs truncate",
                                            isDescChecked ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"
                                        )}>
                                            {desc}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground">item</span>
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}

                {filteredGrouped.length === 0 && (
                    <p className="text-muted-foreground text-xs text-center py-6">No data found for this filter.</p>
                )}
            </div>

            {/* Footer hint */}
            <p className="text-[11px] text-muted-foreground text-right">
                {selectedCount}/{MAX_ITEMS} selected
                {selectedCount >= MAX_ITEMS && <span className="text-destructive ml-1">· limit reached</span>}
            </p>
        </div>
    );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const Trends = () => {
    const { user } = useAuth();
    const { currency } = useSettings();

    const [view, setView] = useState<TimeView>("monthly");
    const [chartType, setChartType] = useState<ChartType>("line");
    const [selected, setSelected] = useState<TrackableItem[]>([]);

    // ── Fetch all transactions ─────────────────────────────────────────────────
    const { data: transactions = [], isLoading } = useQuery<TxRow[]>({
        queryKey: ["trends_transactions", user?.id],
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

    // ── Toggle selection ───────────────────────────────────────────────────────
    const toggleItem = (item: TrackableItem) => {
        setSelected((prev) => {
            const exists = prev.find((s) => s.id === item.id);
            if (exists) return prev.filter((s) => s.id !== item.id);
            if (prev.length >= MAX_ITEMS) return prev;
            return [...prev, item];
        });
    };

    // ── Chart data ─────────────────────────────────────────────────────────────
    const chartData = useMemo(
        () => buildChartData(transactions, selected, view),
        [transactions, selected, view]
    );

    // ── Summary stats ──────────────────────────────────────────────────────────
    const summaryStats = useMemo(() => {
        return selected.map((item, idx) => {
            const totals = chartData.map((row) => Number(row[item.id] ?? 0));
            const totalSpend = totals.reduce((a, b) => a + b, 0);
            const maxVal = Math.max(...totals);
            const minNonZero = Math.min(...totals.filter((v) => v > 0));
            const maxLabel = chartData[totals.indexOf(maxVal)]?.label ?? "-";
            return { item, totalSpend, maxVal, maxLabel, minVal: isFinite(minNonZero) ? minNonZero : 0, color: CHART_COLORS[idx] };
        });
    }, [selected, chartData]);

    const hasData = chartData.some((row) => selected.some((s) => Number(row[s.id] ?? 0) > 0));

    return (
        <div className="space-y-5 pb-8">
            {/* ── Header ── */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" strokeWidth={2} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Trends</h1>
                    <p className="text-sm text-muted-foreground">Visualise your spending patterns over time</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
                {/* ── Left: Selector + selected chips ── */}
                <div className="space-y-4">
                    {/* Selected chips */}
                    {selected.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {selected.map((item, idx) => (
                                <span
                                    key={item.id}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                                    style={{ borderColor: CHART_COLORS[idx] + "60", background: CHART_COLORS[idx] + "15", color: CHART_COLORS[idx] }}
                                >
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[idx] }} />
                                    <span className="max-w-[140px] truncate">{item.label}</span>
                                    <button onClick={() => toggleItem(item)} className="ml-0.5 hover:opacity-70">
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Selector card */}
                    <Card className="glass-card border-none">
                        <CardContent className="pt-4 pb-4">
                            {isLoading ? (
                                <div className="h-32 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                                </div>
                            ) : (
                                <SelectorPanel transactions={transactions} selected={selected} onToggle={toggleItem} />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Right: Controls + Chart + Summary ── */}
                <div className="space-y-4">
                    {/* Time + chart toggle */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-muted/40 rounded-xl p-1 gap-1">
                            {(["weekly", "monthly", "yearly"] as TimeView[]).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                                        view === v ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {v.charAt(0).toUpperCase() + v.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="flex bg-muted/40 rounded-xl p-1 gap-1 ml-auto">
                            <button
                                onClick={() => setChartType("line")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                                    chartType === "line" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <LineIcon className="h-4 w-4" /> Line
                            </button>
                            <button
                                onClick={() => setChartType("bar")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                                    chartType === "bar" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <BarChart2 className="h-4 w-4" /> Bar
                            </button>
                        </div>
                    </div>

                    {/* Chart Card */}
                    <Card className="glass-card border-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">
                                {view === "weekly" ? "This Week" : view === "monthly" ? format(new Date(), "MMMM yyyy") : format(new Date(), "yyyy")} Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selected.length === 0 ? (
                                <div className="h-56 flex flex-col items-center justify-center text-center gap-3">
                                    <TrendingUp className="h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
                                    <p className="text-muted-foreground text-sm max-w-xs">
                                        Select items on the left to see their spending trend.
                                    </p>
                                </div>
                            ) : !hasData ? (
                                <div className="h-56 flex flex-col items-center justify-center text-center gap-3">
                                    <BarChart2 className="h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
                                    <p className="text-muted-foreground text-sm max-w-xs">
                                        No transactions in this time frame. Try switching to Yearly.
                                    </p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    {chartType === "line" ? (
                                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={48}
                                                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                                            <Tooltip content={<CustomTooltip currency={currency.symbol} selected={selected} />} />
                                            <Legend formatter={(value) => selected.find((s) => s.id === value)?.label ?? value} />
                                            {selected.map((item, idx) => (
                                                <Line key={item.id} type="monotone" dataKey={item.id} name={item.id}
                                                    stroke={CHART_COLORS[idx]} strokeWidth={2.5}
                                                    dot={{ r: 3, fill: CHART_COLORS[idx] }} activeDot={{ r: 5 }} />
                                            ))}
                                        </LineChart>
                                    ) : (
                                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="30%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={48}
                                                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                                            <Tooltip content={<CustomTooltip currency={currency.symbol} selected={selected} />} />
                                            <Legend formatter={(value) => selected.find((s) => s.id === value)?.label ?? value} />
                                            {selected.map((item, idx) => (
                                                <Bar key={item.id} dataKey={item.id} name={item.id} fill={CHART_COLORS[idx]} radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            ))}
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Summary Cards */}
                    {summaryStats.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {summaryStats.map(({ item, totalSpend, maxVal, maxLabel, minVal, color }) => (
                                <Card key={item.id} className="glass-card border-none">
                                    <CardContent className="pt-4 pb-4">
                                        <div className="flex items-start gap-3">
                                            <span className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold truncate text-muted-foreground">{item.label}</p>
                                                <p className="text-xl font-bold mt-0.5">
                                                    {currency.symbol} {totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </p>
                                                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                                                    <span>Peak <strong className="text-foreground">{currency.symbol} {maxVal.toLocaleString()}</strong> ({maxLabel})</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Trends;
