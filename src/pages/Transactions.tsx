import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TransactionForm } from "@/components/TransactionForm";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, MoreVertical, Edit, Trash2, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Transaction, transactionCategories } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
const allCategories = ["All", ...transactionCategories] as const;
const TransactionsPage = () => {
  const {
    currency
  } = useSettings();
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<typeof allCategories[number]>("All");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const {
    toast
  } = useToast();
  const {
    data: transactions,
    refetch: refetchTransactions
  } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("transactions").select("*").order("date", {
        ascending: false
      });
      if (error) throw error;
      return data;
    }
  });
  const handleDelete = async (ids: string[]) => {
    try {
      const {
        error
      } = await supabase.from("transactions").delete().in("id", ids);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Transaction(s) deleted successfully"
      });
      setSelectedTransactions([]);
      refetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const filteredTransactions = transactions?.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || transaction.category === selectedCategory;
    const matchesType = selectedType === "all" || transaction.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });
  const groupedTransactions = filteredTransactions?.reduce((groups, transaction) => {
    const month = format(new Date(transaction.date), "MMMM yyyy");
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>) || {};
  const handleSelectAll = (monthTransactions: Transaction[]) => {
    const monthTransactionIds = monthTransactions.map(t => t.id);
    if (monthTransactionIds.every(id => selectedTransactions.includes(id))) {
      setSelectedTransactions(prev => prev.filter(id => !monthTransactionIds.includes(id)));
    } else {
      setSelectedTransactions(prev => [...prev, ...monthTransactionIds.filter(id => !prev.includes(id))]);
    }
  };
  return <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-neutral">Transactions</h1>
          <div className="flex gap-2">
            {selectedTransactions.length > 0 && <Button variant="destructive" className="flex items-center gap-2" onClick={() => handleDelete(selectedTransactions)}>
                <Trash className="h-4 w-4" />
                Delete Selected ({selectedTransactions.length})
              </Button>}
            <Button className="flex items-center gap-2" onClick={() => {
            setEditingTransaction(null);
            setIsTransactionFormOpen(true);
          }}>
              <PlusCircle className="h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input placeholder="Search transactions..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>

              <div className="flex gap-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map(category => <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#ebebeb]/[0.78]">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Credit (Income)</SelectItem>
                    <SelectItem value="debit">Debit (Expense)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {Object.entries(groupedTransactions).map(([month, monthTransactions]) => <div key={month} className="rounded-md border">
                <div className="bg-muted px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={monthTransactions.every(t => selectedTransactions.includes(t.id))} onClick={() => handleSelectAll(monthTransactions)} />
                    <h3 className="font-semibold">{month}</h3>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthTransactions.map(transaction => <TableRow key={transaction.id}>
                        <TableCell>
                          <Checkbox checked={selectedTransactions.includes(transaction.id)} onCheckedChange={checked => {
                      setSelectedTransactions(prev => checked ? [...prev, transaction.id] : prev.filter(id => id !== transaction.id));
                    }} />
                        </TableCell>
                        <TableCell>{format(new Date(transaction.date), "MMM d, yyyy")}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${transaction.type === "credit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {transaction.type}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right ${transaction.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                          {currency.symbol}{transaction.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                          setEditingTransaction(transaction);
                          setIsTransactionFormOpen(true);
                        }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDelete([transaction.id])}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </div>)}
          </div>
        </Card>

        <TransactionForm open={isTransactionFormOpen} onOpenChange={setIsTransactionFormOpen} onTransactionAdded={refetchTransactions} transaction={editingTransaction} />
      </div>
    </Layout>;
};
export default TransactionsPage;