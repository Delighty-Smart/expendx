export async function extractReceiptData(imageBase64: string, categories?: string[]) {
  const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

  const categoryRule = categories && categories.length > 0
    ? `4. Categorize: You MUST select the 'category' STRICTLY from this exact list: [${categories.join(', ')}]. Do not invent new categories.`
    : `4. Categorize: Select the MOST LIKELY category. Use standard finance categories.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://expendx.app',
      'X-Title': 'Lucent',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
      messages: [
        {
          role: 'system',
          content: `You are an expert OCR vision AI specializing in financial documents, invoices, and receipt extraction.
          
INSTRUCTIONS:
1. Merchant/Company Name: Locate the main business name, vendor, store, or company title at the top of the invoice/receipt. Do NOT output 'Unknown' if any vendor or business name is readable anywhere on the document.
2. Date: Locate the transaction or invoice date (e.g. 2026-07-29, 29/07/2026, or July 29, 2026) and convert it to 'YYYY-MM-DD' format. If no date is found, use today's date.
3. Itemize: Extract line items with item name, quantity, unit price, and subtotal amount.
4. Summary: Provide a clear summary of what this document or invoice represents.
${categoryRule}
5. Accuracy: Extract exact total amount and currency.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the complete transaction context, itemized breakdown, and relevant categories from this receipt.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64
              }
            }
          ]
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'extract_receipt_data',
            description: 'Extract highly structured, itemized transaction data and qualitative summaries from a receipt image.',
            parameters: {
              type: 'object',
              properties: {
                amount: { type: 'number', description: 'Total exact amount on the receipt' },
                date: { type: 'string', description: 'Transaction date in YYYY-MM-DD format (if visible)' },
                summary: { type: 'string', description: 'Rich, descriptive summary detailing the underlying transaction context and main items bought' },
                merchant: { type: 'string', description: 'Name of the merchant, store, or vendor' },
                category: { type: 'string', description: 'The absolute best matching category' },
                category_suggestions: {
                  type: 'array',
                  items: { type: 'string' }
                },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      quantity: { type: 'number' },
                      unit_price: { type: 'number' },
                      amount: { type: 'number' }
                    }
                  }
                }
              },
              required: ['amount', 'summary', 'merchant', 'category']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'extract_receipt_data' } }
    })
  });

  if (!response.ok) {
    throw new Error(`Receipt extraction API error: ${response.status}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  const toolCall = message?.tool_calls?.[0];

  if (toolCall) {
    const extractedData = JSON.parse(toolCall.function.arguments);
    return { success: true, data: extractedData };
  }

  return { success: false, error: 'Could not extract structured receipt data' };
}
