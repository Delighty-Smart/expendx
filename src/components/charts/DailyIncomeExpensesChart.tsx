
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

interface DailyIncomeExpensesChartProps {
    data: any[];
    hideAmounts: boolean;
    currencySymbol: string;
    formatAmount: (amount: number) => string;
}

const DailyIncomeExpensesChart = ({
    data,
    hideAmounts,
    currencySymbol,
    formatAmount
}: DailyIncomeExpensesChartProps) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartAreaChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
                <defs>
                    <linearGradient id="income-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A3CE22" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#A3CE22" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expense-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00AAFF" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#00AAFF" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                    dataKey="fullDate"
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
                    formatter={(value: number) => [hideAmounts ? '***' : `${currencySymbol}${formatAmount(value)}`, ""]}
                    contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(229, 231, 235, 0.5)",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
                />

                <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                />

                <Area
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#A3CE22"
                    fillOpacity={1}
                    fill="url(#income-gradient)"
                    strokeWidth={2}
                    activeDot={{ r: 6, stroke: "#A3CE22", strokeWidth: 2, fill: "white" }}
                    animationDuration={1500}
                    animationEasing="ease-out"
                />

                <Area
                    type="monotone"
                    dataKey="expense"
                    name="Expense"
                    stroke="#00AAFF"
                    fillOpacity={1}
                    fill="url(#expense-gradient)"
                    strokeWidth={2}
                    activeDot={{ r: 6, stroke: "#00AAFF", strokeWidth: 2, fill: "white" }}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    animationBegin={300}
                />
            </RechartAreaChart>
        </ResponsiveContainer>
    );
};

export default DailyIncomeExpensesChart;
