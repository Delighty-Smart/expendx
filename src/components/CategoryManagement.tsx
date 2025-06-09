
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TransactionType } from "@/types/transactions";
import { Trash2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface UserCategory {
  id: string;
  name: string;
  type: TransactionType;
}

export const CategoryManagement = () => {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<TransactionType>("debit");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchUserCategories();
  }, []);

  const fetchUserCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if category already exists for this user and type
      const existingCategory = categories.find(
        cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase() && cat.type === newCategoryType
      );

      if (existingCategory) {
        toast({
          title: "Error",
          description: `Category "${newCategoryName}" already exists for ${newCategoryType} transactions`,
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from("user_categories")
        .insert({
          user_id: user.id,
          name: newCategoryName.trim(),
          type: newCategoryType
        })
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => [...prev, data]);
      setNewCategoryName("");
      
      // Invalidate queries to refresh category lists
      queryClient.invalidateQueries({ queryKey: ['userCategories'] });
      
      toast({
        title: "Success",
        description: "Category added successfully"
      });
    } catch (error: any) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add category",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string, categoryName: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("user_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      
      // Invalidate queries to refresh category lists
      queryClient.invalidateQueries({ queryKey: ['userCategories'] });
      
      toast({
        title: "Success",
        description: `Category "${categoryName}" deleted successfully`
      });
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addCategory();
    }
  };

  const categoriesByType = categories.reduce((acc, category) => {
    if (!acc[category.type]) {
      acc[category.type] = [];
    }
    acc[category.type].push(category);
    return acc;
  }, {} as Record<TransactionType, UserCategory[]>);

  return (
    <Card className="p-4 md:p-6 space-y-6 glass-card">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Manage Categories</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Category Name</Label>
              <Input
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-9 text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Type</Label>
              <Select value={newCategoryType} onValueChange={(value) => setNewCategoryType(value as TransactionType)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Expense</SelectItem>
                  <SelectItem value="credit">Income</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm invisible">Action</Label>
              <Button 
                onClick={addCategory} 
                disabled={loading || !newCategoryName.trim()}
                className="h-9 w-full flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </div>
          </div>
        </div>

        {Object.keys(categoriesByType).length > 0 && (
          <div className="space-y-4">
            {(Object.keys(categoriesByType) as TransactionType[]).map(type => (
              <div key={type} className="space-y-2">
                <h4 className="font-medium text-sm capitalize">
                  {type === 'debit' ? 'Expense' : type === 'credit' ? 'Income' : 'Savings'} Categories
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {categoriesByType[type]?.map(category => (
                    <div 
                      key={category.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-md border"
                    >
                      <span className="text-sm font-medium">{category.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCategory(category.id, category.name)}
                        disabled={loading}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
