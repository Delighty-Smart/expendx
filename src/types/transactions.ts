
import { supabase } from "@/integrations/supabase/client";

export type TransactionType = "credit" | "debit" | "savings";

// Category type
export type TransactionCategory = string;

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  archived?: boolean; // Add archived property
  created_at?: string;
  updated_at?: string;
}

// SavingsGoal interface for other components
export interface SavingsGoal {
  id: string;
  user_id: string;
  category: string;
  target_amount: number;
  created_at?: string;
  updated_at?: string;
}

// Default categories for each transaction type
const DEFAULT_CATEGORIES = {
  credit: [
    "Salary",
    "Freelance",
    "Business Income",
    "Investment Returns",
    "Rental Income",
    "Gifts Received",
    "Refunds",
    "Other Income"
  ],
  debit: [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Education",
    "Travel",
    "Groceries",
    "Rent/Mortgage",
    "Insurance",
    "Subscriptions",
    "Other Expenses"
  ],
  savings: [
    "Emergency Fund",
    "Retirement",
    "Vacation Fund",
    "Education Fund",
    "Investment",
    "Home Down Payment",
    "Car Fund",
    "General Savings"
  ]
};

// Export specific category arrays for backwards compatibility
export const expenseCategories = DEFAULT_CATEGORIES.debit;
export const savingsCategories = DEFAULT_CATEGORIES.savings;

export function getDefaultCategoriesForType(type: TransactionType): readonly string[] {
  return DEFAULT_CATEGORIES[type] || [];
}

export async function getCategoriesForType(type: TransactionType): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [...getDefaultCategoriesForType(type)];
    }

    // Get user's custom categories
    const { data: userCategories, error } = await supabase
      .from("user_categories")
      .select("name")
      .eq("user_id", user.id)
      .eq("type", type);

    if (error) {
      console.error("Error fetching user categories:", error);
      return [...getDefaultCategoriesForType(type)];
    }

    // Combine default and user categories, removing duplicates
    const defaultCategories = getDefaultCategoriesForType(type);
    const customCategories = userCategories?.map(cat => cat.name) || [];
    
    const allCategories = [
      ...defaultCategories,
      ...customCategories.filter(cat => !defaultCategories.includes(cat))
    ];

    return allCategories;
  } catch (error) {
    console.error("Error in getCategoriesForType:", error);
    return [...getDefaultCategoriesForType(type)];
  }
}
