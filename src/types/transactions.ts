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

// Helper function to get categories based on transaction type
export const getCategoriesForType = (type: TransactionType, userCategories: any[] = []): string[] => {
  let defaultCategories: string[] = [];
  
  switch (type) {
    case 'credit':
      defaultCategories = [...incomeCategories];
      break;
    case 'debit':
      defaultCategories = [...expenseCategories];
      break;
    case 'savings':
      defaultCategories = [...savingsCategories];
      break;
  }
  
  // Add user categories for the specified type
  const userCatsForType = userCategories
    .filter(cat => cat.type === type)
    .map(cat => cat.name);
  
  // Combine and remove duplicates
  return [...new Set([...defaultCategories, ...userCatsForType])];
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
