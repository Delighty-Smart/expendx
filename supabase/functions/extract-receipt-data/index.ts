declare const Deno: any;
// Deployment trigger: Secrets updated


export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const json = await req.json().catch(() => ({}));
    const { imageBase64, categories } = json;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'No image data received. The pulse-check succeeded, but the image payload was empty.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    console.log('Extracting receipt data from image via OpenRouter...');

    const categoryRule = categories && categories.length > 0
      ? `4. Categorize: You MUST select the 'category' STRICTLY from this exact list: [${categories.join(', ')}]. Do not invent new categories. Also provide 3 'category_suggestions' from this SAME list that are plausible alternatives.`
      : `4. Categorize: Select the MOST LIKELY category. Also provide 3 'category_suggestions' that are plausible alternatives. Use standard finance categories.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://expendx.app', // Required by OpenRouter
        'X-Title': 'ExpendX', // Required by OpenRouter
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
        reasoning: { enabled: true },
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
                  category: { type: 'string', description: 'The absolute best matching category (e.g., Food & Dining, Shopping, Transportation)' },
                  category_suggestions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '3 alternative category suggestions if the nature of the transaction is ambiguous'
                  },
                  items: {
                    type: 'array',
                    description: 'Explicit line-item breakdown of the receipt contents',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Item name or description' },
                        quantity: { type: 'number', description: 'Number of units purchased (default to 1 if not specified)' },
                        unit_price: { type: 'number', description: 'Price per single unit. Mathematical rule: quantity * unit_price should roughly equal amount if itemized correctly' },
                        amount: { type: 'number', description: 'Total price for this line item (quantity * unit_price)' }
                      },
                      required: ['name', 'quantity', 'amount']
                    }
                  }
                },
                required: ['amount', 'summary', 'merchant', 'category', 'category_suggestions', 'items'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_receipt_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    if (data.error) {
      console.error('AI API logic error:', data.error);
      throw new Error(`AI API error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    const message = data.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    let extractedData;
    if (toolCall) {
      extractedData = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: Try to parse JSON from the content if tool calling failed or wasn't used
      const content = message?.content || '';
      console.log('No tool call found, attempting to parse content:', content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('Failed to parse JSON from content:', e);
        }
      }
    }

    if (!extractedData) {
      console.error('Extraction failed. Message content:', message?.content);
      throw new Error('Receipt analysis failed: The AI could not find structured data. Please try a clearer photo.');
    }

    console.log('Extracted data:', extractedData);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in extract-receipt-data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
