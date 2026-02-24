export interface ParsedTransaction {
    amount: number;
    type: 'income' | 'expense';
    description: string;
    source: string;
    date: Date;
}

export const parseBankMessage = (text: string, sender: string, isNotification = false): ParsedTransaction | null => {
    const normalizedText = text.replace(/,/g, '').toLowerCase();

    let amount = 0;
    let type: 'income' | 'expense' | null = null;
    let description = 'Bank Transaction';
    const now = new Date();

    // Try to match standard NGN amount formats
    // Matches "ngn 5000", "ngn5000", "n5000", "amt: 5000"
    const amountRegex = /(?:ngn|n|amt[:\s]+)(?:naira\s*)?(\d+(?:\.\d+)?)/i;
    const amountMatch = normalizedText.match(amountRegex);

    if (amountMatch && amountMatch[1]) {
        amount = parseFloat(amountMatch[1]);
    } else {
        // Look for any standalone number with context like "sent you 5000" or "sent 5000"
        const genericAmountRegex = /(?:sent|received)(?:\s+you)?\s+(?:n|ngn)?\s*(\d+(?:\.\d+)?)/i;
        const genericAmountMatch = normalizedText.match(genericAmountRegex);
        if (genericAmountMatch && genericAmountMatch[1]) {
            amount = parseFloat(genericAmountMatch[1]);
        }
    }

    if (amount === 0) return null; // Couldn't find a valid amount

    // Determine type (Dr/Cr)
    if (normalizedText.includes(' dr') || normalizedText.includes('debit') || normalizedText.includes('sent n') || normalizedText.includes('sent from')) {
        type = 'expense';
    } else if (normalizedText.includes(' cr') || normalizedText.includes('credit') || normalizedText.includes('received') || normalizedText.includes('sent you')) {
        type = 'income';
    }

    if (!type) return null; // Couldn't confidently determine direction

    // Try to extract a description
    const descRegex = /desc(?:ription)?[:\s]+([^.\n]+)/i;
    const descMatch = text.match(descRegex);
    if (descMatch && descMatch[1]) {
        description = descMatch[1].trim();
    }

    return {
        amount,
        type,
        description,
        source: isNotification ? `${sender} Notification` : `${sender} SMS`,
        date: now
    };
};
