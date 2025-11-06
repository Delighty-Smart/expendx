
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { TransactionForm } from "@/components/TransactionForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { OfflineIndicator } from "@/components/OfflineIndicator";

const AddTransactionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(true);
  
  // Get transaction from location state if editing
  const transaction = location.state?.transaction || null;
  const isEditing = !!transaction;

  const handleTransactionAdded = () => {
    navigate("/transactions");
  };

  const handleFormClose = () => {
    setShowForm(false);
    navigate("/transactions");
  };

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
        />
      </div>
    </Layout>
  );
};

export default AddTransactionPage;
