
import { useState } from "react";
import { Transaction, TransactionType } from "@/types/transactions";
import { Currency } from "@/lib/currencies";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";

interface TransactionsTableProps {
  transactions: Transaction[];
  currency: Currency;
}

const TransactionsTable = ({ transactions, currency }: TransactionsTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | TransactionType>("all");
  
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || transaction.type === selectedType;
    return matchesSearch && matchesType;
  });

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search transactions..." 
            className="pl-9" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>

        <Select
          value={selectedType}
          onValueChange={(value: "all" | TransactionType) => setSelectedType(value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="credit">Credit (Income)</SelectItem>
            <SelectItem value="debit">Debit (Expense)</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{format(new Date(transaction.date), "MMM d, yyyy")}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>{transaction.category}</TableCell>
                <TableCell>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    transaction.type === "credit" 
                      ? "bg-green-100 text-green-800" 
                      : transaction.type === "debit"
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {transaction.type}
                  </span>
                </TableCell>
                <TableCell className={`text-right ${
                  transaction.type === "credit" 
                    ? "text-green-600" 
                    : transaction.type === "debit"
                    ? "text-red-600"
                    : "text-blue-600"
                }`}>
                  {currency.symbol}{formatAmount(transaction.amount)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                No transactions found for the selected filters
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionsTable;
