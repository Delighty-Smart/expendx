
import React from 'react';
import {
    ResponsiveContainer,
    AreaChart as RechartAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from "recharts";
import { useSettings } from "@/contexts/SettingsContext";

interface BalanceTrendChartProps {
    data: any[];
    hideAmounts: boolean;
    currencySymbol: string;
    formatAmount: (amount: number) => string;
}

const CustomTooltip = ({ active, payload, currencySymbol, formatAmount, hideAmounts }: any) => {
    const { showLifeHours } = useSettings();
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-bg-surface/90 dark:bg-bg-surface/90 border border-border-default shadow-xl rounded-[16px] p-3 flex flex-col gap-0.5 pointer-events-none select-none backdrop-blur-md">
                <span className="text-sm font-bold text-foreground font-numeric leading-none">
                    {hideAmounts ? '***' : `${showLifeHours ? '' : currencySymbol}${formatAmount(data.balance)}`}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium leading-none mt-0.5">
                    {data.fullDate || `Day ${data.date}`}
                </span>
            </div>
        );
    }
    return null;
};

const BalanceTrendChart = ({
    data,
    hideAmounts,
    currencySymbol,
    formatAmount
}: BalanceTrendChartProps) => {
    const { showLifeHours } = useSettings();
    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartAreaChart data={data} margin={{ top: 25, right: 30, left: 15, bottom: 5 }}>
                <defs>
                    <linearGradient id="balance-area-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0084FF" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0084FF" stopOpacity={0} />
                    </linearGradient>
                </defs>
                {/* Thin, vertical-only grid lines corresponding to each data point */}
                <CartesianGrid stroke="var(--border-default)" strokeWidth={1} opacity={0.15} horizontal={false} vertical={true} />

                <XAxis
                    dataKey="date"
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
                    cursor={{ stroke: '#0084FF', strokeWidth: 1.5, opacity: 0.6 }}
                />

                <Area
                    type="linear"
                    dataKey="balance"
                    stroke="#0084FF"
                    strokeWidth={2}
                    fill="url(#balance-area-gradient)"
                    fillOpacity={1}
                    connectNulls={true}
                    dot={{ r: 4, stroke: "#0084FF", strokeWidth: 2, fill: "var(--bg-card)" }}
                    activeDot={{ r: 6, stroke: "#0084FF", strokeWidth: 2, fill: "var(--bg-card)" }}
                    animationDuration={1500}
                    animationEasing="ease-out"
                />
            </RechartAreaChart>
        </ResponsiveContainer>
    );
};

export default BalanceTrendChart;
