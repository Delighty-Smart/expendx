
export const transactionCategories = [
  "Food",
  "Internet",
  "Airtime",
  "Transportation",
  "Gifts",
  "Refreshments",
  "Offerings",
  "Toiletries",
  "Electricity",
  "Taxes",
  "Entertainment",
  "Other",
] as const;

export type TransactionType = "credit" | "debit";
export type TransactionCategory = typeof transactionCategories[number];

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
