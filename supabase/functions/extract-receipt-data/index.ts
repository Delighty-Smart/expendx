declare const Deno: any;
import "https://deno.land/x/xhr@0.1.0/mod.ts";


const corsHeaders = {
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
    const { imageBase64 } = json;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'No image data received. The pulse-check succeeded, but the image payload was empty.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || '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';

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    console.log('Extracting receipt data from image via OpenRouter...');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://expendx.app', // Required by OpenRouter
        'X-Title': 'ExpendX', // Required by OpenRouter
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract transaction details from this receipt. Return only valid JSON with no markdown formatting.'
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
              description: 'Extract structured transaction data from a receipt image',
              parameters: {
                type: 'object',
                properties: {
                  amount: {
                    type: 'number',
                    description: 'Total amount on the receipt'
                  },
                  date: {
                    type: 'string',
                    description: 'Transaction date in YYYY-MM-DD format'
                  },
                  description: {
                    type: 'string',
                    description: 'Merchant name or description'
                  },
                  category: {
                    type: 'string',
                    description: 'Best matching category (e.g., Food & Dining, Shopping, Transportation, etc.)'
                  }
                },
                required: ['amount', 'description'],
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

    if (!toolCall) {
      console.error('No tool call in AI response. Message content:', message?.content);
      throw new Error('Receipt analysis failed: The AI could not find structured data. Please try a clearer photo.');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
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
