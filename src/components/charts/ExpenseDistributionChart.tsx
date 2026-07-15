
import React from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip
} from "recharts";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface ExpenseDistributionChartProps {
    data: any[];
    hideAmounts: boolean;
    currencySymbol: string;
    formatAmount: (amount: number) => string;
    colors: string[];
    totalAmount: number;
    hoveredLegendItem: string | null;
    setHoveredLegendItem: (name: string | null) => void;
    showLegend?: boolean;
}

const ExpenseDistributionChart = ({
    data,
    hideAmounts,
    currencySymbol,
    formatAmount,
    colors,
    totalAmount,
    hoveredLegendItem,
    setHoveredLegendItem,
    showLegend = true
}: ExpenseDistributionChartProps) => {
    const { showLifeHours } = useSettings();
    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Pie Chart */}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            {colors.map((color, index) => (
                                <linearGradient key={`pie-gradient-${index}`} id={`pie-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0.8} />
                                </linearGradient>
                            ))}
                        </defs>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            dataKey="amount"
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-out"
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={`url(#pie-gradient-${index % colors.length})`}
                                    stroke="#FFFFFF"
                                    strokeWidth={2}
                                    opacity={hoveredLegendItem === null || hoveredLegendItem === entry.name ? 1 : 0.3}
                                    className="hover:opacity-90 transition-opacity"
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => [hideAmounts ? '***' : `${showLifeHours ? '' : currencySymbol}${formatAmount(value)}`, `${((value / totalAmount) * 100).toFixed(1)}%`]}
                            contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.95)",
                                borderRadius: "0.5rem",
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                border: "1px solid rgba(0, 0, 0, 0.05)",
                                padding: "0.5rem 1rem"
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Interactive Legend */}
            {showLegend && (
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                    {data.map((entry, index) => {
                        const percentage = totalAmount > 0 ? ((entry.amount / totalAmount) * 100).toFixed(1) : '0';
                        return (
                            <div
                                key={entry.name}
                                className={cn(
                                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200",
                                    "hover:bg-slate-100 dark:hover:bg-slate-700/50",
                                    hoveredLegendItem === entry.name && "bg-slate-100 dark:bg-slate-700/50 shadow-sm"
                                )}
                                onMouseEnter={() => setHoveredLegendItem(entry.name)}
                                onMouseLeave={() => setHoveredLegendItem(null)}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: colors[index % colors.length] }}
                                    />
                                    <span className="font-medium text-xs truncate max-w-[120px]">{entry.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-xs">
                                        {hideAmounts ? '***' : `${showLifeHours ? '' : currencySymbol}${formatAmount(entry.amount)}`}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {percentage}%
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ExpenseDistributionChart;
