
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, X, Edit, Check } from "lucide-react";
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
  const [editingCategory, setEditingCategory] = useState<{id: string, name: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const queryClient = useQueryClient();

  const { data: userCategories, isLoading } = useQuery({
    queryKey: ["user_categories"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      // Use type assertion to bypass TypeScript errors
      const { data, error } = await supabase
        .from("user_categories" as any)
        .select("*")
        .eq("user_id", user.id);
        
      if (error) {
        console.error("Error fetching user categories:", error);
        return [];
      }
      
      return data as unknown as UserCategory[];
    }
  });

  const getCategoriesForType = useCallback((type: TransactionType) => {
    // Filter user categories for this type
    const userCatsForType = userCategories
      ?.filter(cat => cat.type === type)
      .map(cat => ({ id: cat.id, name: cat.name })) || [];
    
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
    
    // Convert default categories to objects with null id (to indicate they're system defaults)
    const defaultCategoriesObjects = Array.from(defaultCategories).map(name => ({ 
      id: null, 
      name
    }));
    
    // Combine both arrays, avoiding duplicates by name
    const userCategoryNames = new Set(userCatsForType.map(cat => cat.name));
    const filteredDefaults = defaultCategoriesObjects.filter(cat => !userCategoryNames.has(cat.name));
    
    return [...filteredDefaults, ...userCatsForType];
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
    if (existingCategories.some(cat => cat.name.toLowerCase() === newCategory.toLowerCase())) {
      toast({
        title: "Error",
        description: `Category "${newCategory}" already exists`,
        variant: "destructive"
      });
      return;
    }
    
    // Use type assertion to bypass TypeScript errors
    const { error } = await supabase
      .from("user_categories" as any)
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

  const deleteCategory = useCallback(async (categoryId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Use type assertion to bypass TypeScript errors
    const { error } = await supabase
      .from("user_categories" as any)
      .delete()
      .eq("id", categoryId);
      
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
      description: "Category deleted successfully"
    });
  }, [toast, queryClient]);

  const startEditing = (category: {id: string, name: string}) => {
    setEditingCategory(category);
    setEditValue(category.name);
  };

  const saveEdit = async () => {
    if (!editingCategory || !editValue.trim()) {
      setEditingCategory(null);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if category name already exists
    const existingCategories = getCategoriesForType(activeTab);
    if (existingCategories.some(cat => 
      cat.name.toLowerCase() === editValue.toLowerCase() && 
      cat.id !== editingCategory.id
    )) {
      toast({
        title: "Error",
        description: `Category "${editValue}" already exists`,
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from("user_categories" as any)
      .update({ name: editValue })
      .eq("id", editingCategory.id);

    if (error) {
      console.error("Error updating category:", error);
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive"
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ["user_categories"] });
      toast({
        title: "Success",
        description: "Category updated successfully"
      });
    }

    setEditingCategory(null);
  };

  const cancelEdit = () => {
    setEditingCategory(null);
  };

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
        
        <ScrollArea className="h-[300px] mt-4 pr-4 transition-all duration-500 ease-in-out">
          <div className="space-y-2">
            {getCategoriesForType(activeTab).map((category) => {
              const isDefaultCategory = category.id === null;
              const isEditing = editingCategory?.id === category.id;
              
              return (
                <div 
                  key={category.id || category.name} 
                  className="flex items-center justify-between p-2 bg-background/50 rounded border"
                >
                  {isEditing ? (
                    <Input 
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      autoFocus
                      className="flex-1 mr-2"
                    />
                  ) : (
                    <span className="truncate">{category.name}</span>
                  )}
                  
                  <div className="flex items-center">
                    {isEditing ? (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={saveEdit}
                          className="h-7 w-7 p-0"
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={cancelEdit}
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    ) : !isDefaultCategory && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => startEditing(category as {id: string, name: string})}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteCategory(category.id!)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Tabs>
    </Card>
  );
}
