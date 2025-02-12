
import { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionForm } from "@/components/TransactionForm";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle } from "lucide-react";

// Temporary transaction data for demonstration
const transactionData = [
  {
    id: 1,
    date: "2024-02-12",
    description: "MTN Airtime",
    amount: 608,
    type: "debit",
    category: "Airtime",
  },
  {
    id: 2,
    date: "2024-02-11",
    description: "Monthly Salary",
    amount: 5000,
    type: "credit",
    category: "Income",
  },
  // Add more sample transactions...
];

const transactionCategories = [
  "All",
  "Food",
  "Internet",
  "Airtime",
  "Transportation",
  "Gifts",
  "Refreshments",
  "Offerings",
  "Toiletries",
  "Electricity",
  "Taxes",
  "Entertainment",
  "Other",
] as const;

const TransactionsPage = () => {
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("all");

  const filteredTransactions = transactionData.filter((transaction) => {
    const matchesSearch = transaction.description
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || transaction.category === selectedCategory;
    const matchesType =
      selectedType === "all" || transaction.type === selectedType;

    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-neutral">Transactions</h1>
          <Button
            className="flex items-center gap-2"
            onClick={() => setIsTransactionFormOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <div className="flex gap-4">
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Credit (Income)</SelectItem>
                    <SelectItem value="debit">Debit (Expense)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === "credit"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          transaction.type === "credit"
                            ? "text-primary"
                            : "text-secondary"
                        }`}
                      >
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>

        <TransactionForm
          open={isTransactionFormOpen}
          onOpenChange={setIsTransactionFormOpen}
        />
      </div>
    </Layout>
  );
};

export default TransactionsPage;
