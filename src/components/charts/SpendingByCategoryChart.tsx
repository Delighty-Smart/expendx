
import React from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell
} from "recharts";
import { useSettings } from "@/contexts/SettingsContext";

interface SpendingCategoryItem {
    name: string;
    amount: number;
}

interface SpendingByCategoryChartProps {
    data: SpendingCategoryItem[];
    hideAmounts: boolean;
    currencySymbol: string;
    formatAmount: (amount: number) => string;
    colors: string[];
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        payload: SpendingCategoryItem;
    }>;
    currencySymbol: string;
    formatAmount: (amount: number) => string;
    hideAmounts: boolean;
}

const CustomTooltip = ({ active, payload, currencySymbol, formatAmount, hideAmounts }: CustomTooltipProps) => {
    const { showLifeHours } = useSettings();
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div 
                className="rounded-xl p-3 flex flex-col gap-0.5 pointer-events-none select-none"
                style={{
                    backgroundColor: 'var(--bg-card)',
                    border: 'none',
                    color: 'var(--text-primary)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
                }}
            >
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">
                    {data.name}
                </span>
                <span className="text-sm font-bold text-foreground font-numeric leading-none mt-1">
                    {hideAmounts ? '***' : `${showLifeHours ? '' : currencySymbol}${formatAmount(data.amount)}`}
                </span>
            </div>
        );
    }
    return null;
};

const SpendingByCategoryChart = ({
    data,
    hideAmounts,
    currencySymbol,
    formatAmount,
    colors
}: SpendingByCategoryChartProps) => {
    const { showLifeHours } = useSettings();
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 20, right: 10, left: 10, bottom: 10 }}
                barSize={20}
            >
                <defs>
                    {colors.map((color, index) => (
                        <linearGradient key={`bar-gradient-${index}`} id={`bar-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                        </linearGradient>
                    ))}
                </defs>
                <CartesianGrid stroke="var(--border-default)" strokeWidth={1} opacity={0.12} horizontal={true} vertical={false} strokeDasharray="3 3" />

                <XAxis
                    dataKey="name"
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
                    contentStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}
                    wrapperStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
                    cursor={{ fill: 'var(--border-default)', opacity: 0.1 }}
                />

                <Bar
                    dataKey="amount"
                    animationDuration={1500}
                    animationEasing="ease-out"
                    radius={[6, 6, 0, 0]}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={`url(#bar-gradient-${index % colors.length})`}
                            stroke={colors[index % colors.length]}
                            strokeWidth={0.5}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default SpendingByCategoryChart;
