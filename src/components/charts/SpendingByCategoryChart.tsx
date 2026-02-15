
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

interface SpendingByCategoryChartProps {
    data: any[];
    hideAmounts: boolean;
    currencySymbol: string;
    formatAmount: (amount: number) => string;
    colors: string[];
}

const SpendingByCategoryChart = ({
    data,
    hideAmounts,
    currencySymbol,
    formatAmount,
    colors
}: SpendingByCategoryChartProps) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 5, bottom: 20 }}
                barSize={50}
                layout="vertical"
            >
                <defs>
                    {colors.map((color, index) => (
                        <linearGradient key={`bar-gradient-${index}`} id={`bar-gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                        </linearGradient>
                    ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={true} vertical={false} />

                <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                    width={100}
                />

                <XAxis
                    type="number"
                    tickFormatter={(value) => hideAmounts ? '***' : `${currencySymbol}${formatAmount(value)}`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                />

                <Tooltip
                    formatter={(value: number) => [hideAmounts ? '***' : `${currencySymbol}${formatAmount(value)}`, "Amount"]}
                    contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(229, 231, 235, 0.5)",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />

                <Bar
                    dataKey="amount"
                    animationDuration={1500}
                    animationEasing="ease-out"
                    radius={[0, 4, 4, 0]}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={`url(#bar-gradient-${index % colors.length})`}
                            stroke={colors[index % colors.length]}
                            strokeWidth={1}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default SpendingByCategoryChart;
