
export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const currencies: Record<string, Currency> = {
  USD: { code: "USD", name: "US Dollar", symbol: "$" },
  EUR: { code: "EUR", name: "Euro", symbol: "€" },
  GBP: { code: "GBP", name: "British Pound", symbol: "£" },
  NGN: { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  GHS: { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  KES: { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  ZAR: { code: "ZAR", name: "South African Rand", symbol: "R" },
  EGP: { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
  MAD: { code: "MAD", name: "Moroccan Dirham", symbol: "MAD" },
  XOF: { code: "XOF", name: "West African CFA", symbol: "CFA" },
  XAF: { code: "XAF", name: "Central African CFA", symbol: "FCFA" },
  TZS: { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
  UGX: { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
  RWF: { code: "RWF", name: "Rwandan Franc", symbol: "RF" },
  ETB: { code: "ETB", name: "Ethiopian Birr", symbol: "Br" },
  AUD: { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  CAD: { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  INR: { code: "INR", name: "Indian Rupee", symbol: "₹" },
  JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  CNY: { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
};

// Helper function to get available currency codes
export const getCurrencyCodes = (): string[] => {
  return Object.keys(currencies);
};

// Helper function to get currency by code
export const getCurrencyByCode = (code: string): Currency => {
  return currencies[code] || currencies.USD;
};

// Convert the currencies object to an array when needed
export const currenciesArray = Object.values(currencies);
