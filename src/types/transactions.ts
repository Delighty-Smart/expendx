
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
export type TransactionCategory = IncomeCategory | ExpenseCategory | SavingsCategory;

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
export const getCategoriesForType = (type: TransactionType): readonly string[] => {
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
