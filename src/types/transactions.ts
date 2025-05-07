
export type TransactionType = "credit" | "debit" | "savings";

// Categories for each transaction type
export const incomeCategories = [
  "Salary/Wages",
  "Business Income",
  "Freelance/Consulting",
  "Rental Income",
  "Investment Income",
  "Bonuses & Commissions",
  "Gifts",
  "Royalties",
  "Miscellaneous earnings",
  "Withdrawal from Savings",
  "Others"
] as const;

export const expenseCategories = [
  "Housing",
  "Electricity",
  "Water",
  "Gas",
  "Internet",
  "Airtime",
  "Food & Groceries",
  "Transportation",
  "Health & Medical",
  "Debt Repayment",
  "Insurance",
  "Clothing",
  "Personal Care",
  "Entertainment",
  "hobbies",
  "Tuition",
  "Books",
  "Courses",
  "Gifts",
  "Donations",
  "Subscriptions",
  "Others"
] as const;

export const savingsCategories = [
  "Emergency Fund",
  "Retirement Savings",
  "Savings for vacations",
  "Savings for a new car",
  "Savings for House/land",
  "Investment Savings",
  "Education/College Savings",
  "Goal-Based Savings",
  "Others"
] as const;

export type IncomeCategory = typeof incomeCategories[number];
export type ExpenseCategory = typeof expenseCategories[number];
export type SavingsCategory = typeof savingsCategories[number];
export type TransactionCategory = IncomeCategory | ExpenseCategory | SavingsCategory | string; // Added string to allow dynamic categories from database

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper function to get categories based on transaction type - Updated to fetch user categories
export const getCategoriesForType = async (type: TransactionType): Promise<string[]> => {
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

  // Convert to array since we'll be adding user-defined categories
  const categories = [...defaultCategories];

  try {
    // Import dynamically to avoid circular dependencies
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Fetch user-defined categories
      const { data: userCategories, error } = await supabase
        .from("user_categories" as any)
        .select("name")
        .eq("type", type)
        .eq("user_id", user.id);
        
      if (!error && userCategories) {
        // Add user-defined categories, avoiding duplicates
        userCategories.forEach(category => {
          // Make sure the category object has a name property and it's not already in the categories array
          if (category && 'name' in category && typeof category.name === 'string' && !categories.includes(category.name)) {
            categories.push(category.name);
          }
        });
      }
    }
  } catch (error) {
    console.error("Error fetching user categories:", error);
  }
  
  return categories;
};

// This is the synchronous version for components that can't use async directly
export const getDefaultCategoriesForType = (type: TransactionType): readonly string[] => {
  switch (type) {
    case "credit":
      return incomeCategories;
    case "debit":
      return expenseCategories;
    case "savings":
      return savingsCategories;
    default:
      return expenseCategories; // Default to expense categories as fallback
  }
};

// Category management section - Add custom categories functionality
export interface UserCategory {
  id: string;
  type: TransactionType;
  name: string;
  user_id: string;
  created_at?: string;
}

// Savings goal interface
export interface SavingsGoal {
  id: string;
  category: string;
  target_amount: number;
  current_amount?: number;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}
