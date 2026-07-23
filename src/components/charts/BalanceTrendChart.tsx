
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
            <div 
                className="rounded-xl p-3 flex flex-col gap-0.5 pointer-events-none select-none"
                style={{
                    backgroundColor: 'var(--bg-card)',
                    border: 'none',
                    color: 'var(--text-primary)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
                }}
            >
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
                        <stop offset="5%" stopColor="#1F5C82" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#1F5C82" stopOpacity={0} />
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
                    contentStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}
                    wrapperStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
                    cursor={{ stroke: '#1F5C82', strokeWidth: 1.5, opacity: 0.6 }}
                />

                <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#1F5C82"
                    strokeWidth={2.5}
                    fill="url(#balance-area-gradient)"
                    fillOpacity={1}
                    connectNulls={true}
                    dot={false}
                    activeDot={{ r: 5, stroke: "#1F5C82", strokeWidth: 2, fill: "var(--bg-card)" }}
                    animationDuration={1200}
                    animationEasing="ease-out"
                />
            </RechartAreaChart>
        </ResponsiveContainer>
    );
};

export default BalanceTrendChart;
