
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

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: "credit" | "debit";
  category: typeof transactionCategories[number];
  description: string;
  user_id?: string;
}
