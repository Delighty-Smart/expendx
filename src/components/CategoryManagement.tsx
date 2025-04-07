
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { 
  TransactionType, 
  incomeCategories, 
  expenseCategories, 
  savingsCategories,
  UserCategory
} from "@/types/transactions";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CategoryManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TransactionType>("credit");
  const [newCategory, setNewCategory] = useState("");
  const queryClient = useQueryClient();

  const { data: userCategories, isLoading } = useQuery({
    queryKey: ["user_categories"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("user_categories")
        .select("*")
        .eq("user_id", user.id);
        
      if (error) {
        console.error("Error fetching user categories:", error);
        return [];
      }
      
      return data as UserCategory[];
    }
  });

  const getCategoriesForType = useCallback((type: TransactionType) => {
    // Filter user categories for this type
    const userCatsForType = userCategories
      ?.filter(cat => cat.type === type)
      .map(cat => cat.name) || [];
    
    // Get default categories for this type
    let defaultCategories: readonly string[] = [];
    switch (type) {
      case "credit":
        defaultCategories = incomeCategories;
        break;
      case "debit":
        defaultCategories = expenseCategories;
        break;
      case "savings":
        defaultCategories = savingsCategories;
        break;
    }
    
    // Combine both arrays, avoiding duplicates
    return [...Array.from(defaultCategories), ...userCatsForType.filter(cat => 
      !defaultCategories.includes(cat as any)
    )];
  }, [userCategories]);

  const addCategory = useCallback(async () => {
    if (!newCategory.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add categories",
        variant: "destructive"
      });
      return;
    }
    
    // Check if category already exists in default or user categories
    const existingCategories = getCategoriesForType(activeTab);
    if (existingCategories.includes(newCategory)) {
      toast({
        title: "Error",
        description: `Category "${newCategory}" already exists`,
        variant: "destructive"
      });
      return;
    }
    
    const { error } = await supabase
      .from("user_categories")
      .insert({
        type: activeTab,
        name: newCategory,
        user_id: user.id
      });
      
    if (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ["user_categories"] });
    setNewCategory("");
    
    toast({
      title: "Success",
      description: `Category "${newCategory}" added successfully`
    });
  }, [newCategory, activeTab, toast, queryClient, getCategoriesForType]);

  const deleteCategory = useCallback(async (categoryName: string) => {
    // Check if it's a default category
    let isDefault = false;
    
    switch (activeTab) {
      case "credit":
        isDefault = incomeCategories.includes(categoryName as any);
        break;
      case "debit":
        isDefault = expenseCategories.includes(categoryName as any);
        break;
      case "savings":
        isDefault = savingsCategories.includes(categoryName as any);
        break;
    }
    
    if (isDefault) {
      toast({
        title: "Cannot Delete",
        description: "Default categories cannot be deleted",
        variant: "destructive"
      });
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from("user_categories")
      .delete()
      .eq("user_id", user.id)
      .eq("name", categoryName)
      .eq("type", activeTab);
      
    if (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ["user_categories"] });
    
    toast({
      title: "Success",
      description: `Category "${categoryName}" deleted successfully`
    });
  }, [activeTab, toast, queryClient]);

  // Detect Enter key press to submit new category
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCategory();
    }
  };
  
  return (
    <Card className="p-5 glass-card">
      <h2 className="text-lg font-semibold mb-4">Manage Categories</h2>
      
      <Tabs defaultValue="credit" value={activeTab} onValueChange={(v) => setActiveTab(v as TransactionType)}>
        <TabsList className="w-full">
          <TabsTrigger value="credit" className="flex-1">Income</TabsTrigger>
          <TabsTrigger value="debit" className="flex-1">Expenses</TabsTrigger>
          <TabsTrigger value="savings" className="flex-1">Savings</TabsTrigger>
        </TabsList>
        
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Add new category..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
          <Button onClick={addCategory} size="sm">
            <PlusCircle className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        
        <ScrollArea className="h-[300px] mt-4 pr-4">
          <div className="space-y-2">
            {getCategoriesForType(activeTab).map((category) => {
              const isDefaultCategory = (
                activeTab === "credit" && incomeCategories.includes(category as any) ||
                activeTab === "debit" && expenseCategories.includes(category as any) ||
                activeTab === "savings" && savingsCategories.includes(category as any)
              );
              
              return (
                <div 
                  key={category} 
                  className="flex items-center justify-between p-2 bg-background/50 rounded border"
                >
                  <span className="truncate">{category}</span>
                  {!isDefaultCategory && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteCategory(category)}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Tabs>
    </Card>
  );
}
