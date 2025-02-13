
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  DollarSign,
  Download,
  PlusCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Layout from "@/components/Layout";
import { TransactionForm } from "@/components/TransactionForm";
import { useState } from "react";

// Temporary data for demonstration
const spendingData = [
  { name: "Food", amount: 300 },
  { name: "Transport", amount: 150 },
  { name: "Bills", amount: 400 },
  { name: "Shopping", amount: 200 },
  { name: "Entertainment", amount: 100 },
];

const COLORS = ["#4A6741", "#6B8E4E", "#8CB25C", "#AAD66A", "#C8E87D"];

const Dashboard = () => {
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <Button
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-200"
            onClick={() => setIsTransactionFormOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Add Transaction
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        <TransactionForm
          open={isTransactionFormOpen}
          onOpenChange={setIsTransactionFormOpen}
        />

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="glass-card p-6 animate-float hover:scale-105 transition-transform duration-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-semibold">$2,450.50</p>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-6 animate-float [animation-delay:200ms] hover:scale-105 transition-transform duration-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Income</p>
                <p className="text-2xl font-semibold text-primary">$3,550.00</p>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-6 animate-float [animation-delay:400ms] hover:scale-105 transition-transform duration-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Expenses</p>
                <p className="text-2xl font-semibold text-destructive">$1,099.50</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Spending by Category
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Budget Distribution
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendingData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {spendingData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(${217.2 + index * 20} 91.2% 59.8%)`}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
