
import React from 'react';
import {
    ResponsiveContainer,
    AreaChart as RechartAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from "recharts";
import { useSettings } from "@/contexts/SettingsContext";

interface DailyIncomeExpenseItem {
    date: string;
    fullDate: string;
    income: number;
    expense: number;
}

interface DailyIncomeExpensesChartProps {
    data: DailyIncomeExpenseItem[];
    hideAmounts: boolean;
    currencySymbol: string;
    formatAmount: (amount: number) => string;
}

interface TooltipPayloadEntry {
    name: string;
    value: number;
    stroke?: string;
    color?: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string;
    currencySymbol: string;
    formatAmount: (amount: number) => string;
    hideAmounts: boolean;
}

const CustomTooltip = ({ active, payload, label, currencySymbol, formatAmount, hideAmounts }: CustomTooltipProps) => {
    const { showLifeHours } = useSettings();
    if (active && payload && payload.length) {
        return (
            <div className="bg-bg-surface/90 dark:bg-bg-surface/90 border border-border-default shadow-xl rounded-[16px] p-3 flex flex-col gap-1.5 pointer-events-none select-none backdrop-blur-md">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">
                    {label}
                </span>
                <div className="flex flex-col gap-1 mt-0.5">
                    {payload.map((entry: TooltipPayloadEntry, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                                <span 
                                    className="w-1.5 h-1.5 rounded-full" 
                                    style={{ backgroundColor: entry.stroke || entry.color }} 
                                />
                                <span className="text-[11px] text-muted-foreground font-medium">
                                    {entry.name}
                                </span>
                            </div>
                            <span className="text-[11px] font-bold text-foreground font-numeric">
                                {hideAmounts ? '***' : `${showLifeHours ? '' : currencySymbol}${formatAmount(entry.value)}`}
                            </span>
                        </div>
                    ))}
                </div>

            </div>
        );
    }
    return null;
};

const DailyIncomeExpensesChart = ({
    data,
    hideAmounts,
    currencySymbol,
    formatAmount
}: DailyIncomeExpensesChartProps) => {
    const { showLifeHours } = useSettings();
    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartAreaChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                <defs>
                    <linearGradient id="income-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expense-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748B" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#64748B" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-default)" strokeWidth={1} opacity={0.12} horizontal={true} vertical={false} strokeDasharray="3 3" />
                <XAxis
                    dataKey="fullDate"
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-default)', strokeWidth: 1 }}
                />

                <YAxis
                    tickFormatter={(value) => hideAmounts ? '***' : `${showLifeHours ? '' : currencySymbol}${formatAmount(value)}`}
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-default)', strokeWidth: 1 }}
                />

                <Tooltip
                    content={
                        <CustomTooltip 
                            currencySymbol={currencySymbol} 
                            formatAmount={formatAmount} 
                            hideAmounts={hideAmounts} 
                        />
                    }
                    cursor={{ stroke: 'var(--border-default)', strokeWidth: 1.5, opacity: 0.4 }}
                />

                <Legend
                    verticalAlign="top"
                    align="right"
                    height={36}
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}
                />

                <Area
                    type="linear"
                    dataKey="income"
                    name="Income"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#income-gradient)"
                    strokeWidth={2}
                    activeDot={{ r: 5, stroke: "#10B981", strokeWidth: 2, fill: "var(--bg-card)" }}
                    animationDuration={1500}
                    animationEasing="ease-out"
                />

                <Area
                    type="linear"
                    dataKey="expense"
                    name="Expense"
                    stroke="#64748B"
                    fillOpacity={1}
                    fill="url(#expense-gradient)"
                    strokeWidth={2}
                    activeDot={{ r: 5, stroke: "#64748B", strokeWidth: 2, fill: "var(--bg-card)" }}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    animationBegin={300}
                />
            </RechartAreaChart>
        </ResponsiveContainer>
    );
};

export default DailyIncomeExpensesChart;
