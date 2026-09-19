
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, query, where, setDoc, deleteDoc } from "firebase/firestore";
import { TransactionType } from "@/types/transactions";
import { Trash2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();

  useEffect(() => {
    fetchUserCategories();
  }, [user]);

  const fetchUserCategories = async () => {
    try {
      if (!user) return;

      const q = query(
        collection(db, "user_categories"),
        where("user_id", "==", user.uid)
      );
      const snapshot = await getDocs(q);

      const typedCategories: UserCategory[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          type: data.type as TransactionType
        };
      });

      typedCategories.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(typedCategories);
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

      const docRef = doc(collection(db, "user_categories"));
      const newCategory: UserCategory = {
        id: docRef.id,
        name: newCategoryName.trim(),
        type: newCategoryType
      };

      await setDoc(docRef, {
        id: docRef.id,
        user_id: user.uid,
        name: newCategory.name,
        type: newCategory.type,
        created_at: new Date().toISOString()
      });

      setCategories(prev => [...prev, newCategory]);
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

      await deleteDoc(doc(db, "user_categories", categoryId));

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
                  <SelectItem value="subscription">Subscriptions</SelectItem>
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
                  {type === 'debit' ? 'Expense' : type === 'credit' ? 'Income' : type === 'savings' ? 'Savings' : 'Subscription'} Categories
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
