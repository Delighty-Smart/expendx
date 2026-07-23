
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TransactionForm } from "@/components/TransactionForm";
import PageHeader from "@/components/ui/page-header";

const AddTransactionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(true);

  const transaction = location.state?.transaction || null;
  const isEditing = !!transaction;
  const sharedFileUri = location.state?.sharedFileUri || null;
  const sharedMimeType = location.state?.mimeType || null;

  const handleTransactionAdded = () => {
    navigate("/transactions");
  };

  const handleFormClose = () => {
    setShowForm(false);
    navigate("/transactions");
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <PageHeader
        title={isEditing ? 'Edit Transaction' : 'New Transaction'}
        backTo="/transactions"
      />

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
        sharedFileUri={sharedFileUri}
        sharedMimeType={sharedMimeType}
      />
    </div>
  );
};

export default AddTransactionPage;
