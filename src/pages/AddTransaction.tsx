
import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { TransactionForm } from "@/components/TransactionForm";
import { ReceiptReviewDialog } from "@/components/ReceiptReviewDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { supabase } from "@/integrations/supabase/client";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import { TransactionType } from "@/types/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AddTransactionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(true);
  const [showReceiptReview, setShowReceiptReview] = useState(false);
  const [scannedReceiptData, setScannedReceiptData] = useState<any>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  
  // Get transaction from location state if editing
  const transaction = location.state?.transaction || null;
  const isEditing = !!transaction;

  // Load all categories (for receipt review)
  useEffect(() => {
    const loadAllCategories = async () => {
      const { getCategoriesForType } = await import("@/types/transactions");
      const debitCats = await getCategoriesForType("debit");
      const creditCats = await getCategoriesForType("credit");
      const savingsCats = await getCategoriesForType("savings");
      
      // Combine and deduplicate
      const allCats = Array.from(new Set([...debitCats, ...creditCats, ...savingsCats]));
      setAllCategories(allCats);
    };
    
    loadAllCategories();
  }, []);

  const handleTransactionAdded = () => {
    navigate("/transactions");
  };

  const handleFormClose = () => {
    setShowForm(false);
    navigate("/transactions");
  };

  const handleReceiptScanComplete = useCallback((data: {
    amount: number;
    date?: string;
    description: string;
    category?: string;
  }) => {
    setScannedReceiptData(data);
    setShowReceiptReview(true);
  }, []);

  const getCachedUserId = (): string | null => {
    try {
      return localStorage.getItem('cached_user_id');
    } catch (error) {
      console.error("Error getting cached user ID:", error);
      return null;
    }
  };

  const cacheUserId = (userId: string) => {
    try {
      localStorage.setItem('cached_user_id', userId);
    } catch (error) {
      console.error("Error caching user ID:", error);
    }
  };

  const handleConfirmSingleTransaction = useCallback(async (data: {
    amount: number;
    date: string;
    description: string;
    category: string;
    type: "expense" | "income";
  }) => {
    try {
      let userId = getCachedUserId();
      if (!userId && navigator.onLine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          cacheUserId(userId);
        }
      }

      if (!userId) {
        throw new Error("Unable to determine user ID. Please try again when online.");
      }

      const transactionData = {
        amount: data.amount,
        date: data.date,
        description: data.description,
        category: data.category,
        type: (data.type === "expense" ? "debit" : "credit") as TransactionType,
        user_id: userId
      };

      await enhancedOfflineManager.addTransactionOffline(transactionData);

      toast.success("Transaction added successfully!");
      queryClient.invalidateQueries({ queryKey: ["enhanced_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      
      setShowReceiptReview(false);
      navigate("/transactions");
    } catch (error: any) {
      console.error("Error adding transaction:", error);
      toast.error(error.message);
    }
  }, [navigate, queryClient]);

  const handleConfirmMultipleTransactions = useCallback(async (items: Array<{
    amount: number;
    date: string;
    description: string;
    category: string;
    type: "expense" | "income";
  }>) => {
    try {
      let userId = getCachedUserId();
      if (!userId && navigator.onLine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          cacheUserId(userId);
        }
      }

      if (!userId) {
        throw new Error("Unable to determine user ID. Please try again when online.");
      }

      for (const item of items) {
        const transactionData = {
          amount: item.amount,
          date: item.date,
          description: item.description,
          category: item.category,
          type: (item.type === "expense" ? "debit" : "credit") as TransactionType,
          user_id: userId
        };

        await enhancedOfflineManager.addTransactionOffline(transactionData);
      }

      toast.success(`Successfully added ${items.length} transactions!`);
      queryClient.invalidateQueries({ queryKey: ["enhanced_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      
      setShowReceiptReview(false);
      navigate("/transactions");
    } catch (error: any) {
      console.error("Error adding multiple transactions:", error);
      toast.error(error.message);
    }
  }, [navigate, queryClient]);

  return (
    <Layout>
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              className="mobile-button-sm mr-2 touch-manipulation" 
              onClick={() => navigate("/transactions")}
            >
              <ArrowLeft className="mobile-icon-sm mr-2" />
              Back
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">
              {isEditing ? 'Edit Transaction' : 'Add Transaction'}
            </h1>
          </div>
          <OfflineIndicator />
        </div>
        
        {!navigator.onLine && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              You're offline. Your transaction will be saved locally and synced when connection is restored.
            </p>
          </div>
        )}
        
        <TransactionForm
          open={showForm}
          onOpenChange={handleFormClose}
          onTransactionAdded={handleTransactionAdded}
          transaction={transaction}
          onReceiptScanComplete={handleReceiptScanComplete}
        />

        <ReceiptReviewDialog
          open={showReceiptReview}
          onOpenChange={setShowReceiptReview}
          extractedData={scannedReceiptData || { amount: 0, description: "" }}
          categories={allCategories.map(name => ({ id: name, name }))}
          onConfirmSingle={handleConfirmSingleTransaction}
          onConfirmMultiple={handleConfirmMultipleTransactions}
        />
      </div>
    </Layout>
  );
};

export default AddTransactionPage;
