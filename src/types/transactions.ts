import { supabase } from "@/integrations/supabase/client";
import { SERVICE_PROVIDERS } from "@/types/subscriptions";

export type TransactionType = "credit" | "debit" | "savings" | "subscription";

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
  merchant?: string; // Merchant / store / vendor name
  archived?: boolean; // Add archived property
  is_locked?: boolean; // Lock past transactions during Fresh Start
  is_system_adjustment?: boolean; // Flag adjustment transactions
  created_at?: string;
  updated_at?: string;
}

// SavingsGoal interface for other components
export interface SavingsGoal {
  id: string;
  user_id: string;
  category: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string;
  created_at?: string;
  updated_at?: string;
}

// Default categories for each transaction type
const DEFAULT_CATEGORIES = {
  credit: [
    "Asset Sales",
    "Bonuses and Incentives",
    "Business Sales",
    "Cash Gifts",
    "Child Support / Alimony",
    "Client Payment",
    "Commissions Earned",
    "Contract Income",
    "Crypto Gains",
    "Dividend Income",
    "Freelance Income",
    "Government Benefits",
    "Grant Funds",
    "Interest Earned",
    "Investment Gains",
    "Overtime Pay",
    "Pension Income",
    "Prizes and Winnings",
    "Refunds and Reimbursements",
    "Rental Income",
    "Royalties Received",
    "Salary Wages",
    "Side Hustle",
    "Tips Received"
  ],
  debit: [
    "Accommodation Rent",
    "Airtime",
    "Bank Charges",
    "Body Care & Skincare",
    "Childcare and Babysitting",
    "Clothing Apparel",
    "Data and Internet",
    "Debt Payoff & Loans",
    "Dining Out",
    "Education Fees",
    "Electronics and Gadgets",
    "Entertainment Leisure",
    "Family Support & Black Tax",
    "Fitness and Health Club",
    "Fuel Transport",
    "Gift Donations",
    "Groceries Food",
    "Healthcare Medical",
    "Home Maintenance",
    "Household Supplies",
    "Insurance Premiums",
    "Laundry & Dry Cleaning",
    "Personal Care",
    "Pets and Veterinary",
    "Refreshments",
    "Software & Apps",
    "Subscriptions",
    "Taxes Levies",
    "Tithes",
    "Travel and Vacations",
    "Utility Bills",
    "Vehicle Maintenance"
  ],
  savings: [
    "Education Fund",
    "Emergency Fund",
    "Fixed Deposit",
    "Goal Savings",
    "Health and Medical Fund",
    "Home Downpayment",
    "Investment Contributions",
    "Pension Contributions",
    "Retirement Savings",
    "Short Term Savings",
    "Sinking Fund",
    "Tech & Gadget Fund",
    "Travel Fund",
    "Vehicle Purchase",
    "Wealth Building"
  ],
  subscription: SERVICE_PROVIDERS
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
    ].sort((a, b) => a.localeCompare(b));

    return allCategories;
  } catch (error) {
    console.error("Error in getCategoriesForType:", error);
    return [...getDefaultCategoriesForType(type)];
  }
}
