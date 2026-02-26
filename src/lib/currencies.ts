
export interface Currency {
    code: string;
    name: string;
    symbol: string;
}

export const currencies: Currency[] = [
    { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
    { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
    { code: "ZAR", name: "South African Rand", symbol: "R" },
    { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
    { code: "MAD", name: "Moroccan Dirham", symbol: "MAD" },
    { code: "XOF", name: "West African CFA", symbol: "CFA" },
    { code: "XAF", name: "Central African CFA", symbol: "FCFA" },
    { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
    { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
    { code: "RWF", name: "Rwandan Franc", symbol: "RF" },
    { code: "ETB", name: "Ethiopian Birr", symbol: "Br" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
];

// Helper function to get available currency codes
export const getCurrencyCodes = (): string[] => {
    return currencies.map(c => c.code);
};

// Helper function to get currency by code
export const getCurrencyByCode = (code: string): Currency => {
    const currency = currencies.find(c => c.code === code);
    return currency || currencies[0]; // Default to NGN if not found
};

// Convert to Object format when needed
export const currenciesObj: Record<string, Currency> = currencies.reduce((acc, curr) => {
    acc[curr.code] = curr;
    return acc;
}, {} as Record<string, Currency>);
