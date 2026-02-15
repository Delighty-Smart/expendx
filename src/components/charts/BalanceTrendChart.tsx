
import React from 'react';
import {
    ResponsiveContainer,
    LineChart as RechartLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from "recharts";

interface BalanceTrendChartProps {
    data: any[];
    hideAmounts: boolean;
    currencySymbol: string;
    formatAmount: (amount: number) => string;
}

const BalanceTrendChart = ({
    data,
    hideAmounts,
    currencySymbol,
    formatAmount
}: BalanceTrendChartProps) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />

                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                />

                <YAxis
                    tickFormatter={(value) => hideAmounts ? '***' : `${currencySymbol}${formatAmount(value)}`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                />

                <Tooltip
                    formatter={(value: number) => [hideAmounts ? '***' : `${currencySymbol}${formatAmount(value)}`, "Balance"]}
                    contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(229, 231, 235, 0.5)",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
                />

                <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#00AAFF"
                    strokeWidth={3}
                    connectNulls={true}
                    dot={false}
                    activeDot={{ r: 6, stroke: "#00AAFF", strokeWidth: 2, fill: "white" }}
                    animationDuration={2000}
                    animationEasing="ease-out"
                />
            </RechartLineChart>
        </ResponsiveContainer>
    );
};

export default BalanceTrendChart;
