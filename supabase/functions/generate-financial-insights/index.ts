declare const Deno: any;
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { transactions, budgets, dateRange, currency } = await req.json();

        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
        if (!openRouterKey) {
            console.error('OPENROUTER_API_KEY is not set in the environment');
            return new Response(JSON.stringify({
                error: 'AI service configuration missing. Please set OPENROUTER_API_KEY in Supabase Vault.'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const systemPrompt = `You are a world-class financial advisor for "ExpendX", a modern fintech app. 
Your goal is to provide quantitative and qualitative analysis of the user's financial data.
The user's currency is ${currency}.

Please analyze the provided transactions and budgets for the period: ${dateRange.from} to ${dateRange.to}.

Your response MUST be a JSON object with the following structure:
{
  "summary": "A high-level qualitative narrative (2-3 sentences) about their financial health this period.",
  "quantitative_analysis": [
    "A list of 3-4 specific, data-driven observations (e.g., 'Spending in Dining Out is up 15% compared to last week')."
  ],
  "actionable_advice": [
    "A list of 3-4 specific, simple steps to improve their financial situation."
  ],
  "sentiment": "positive" | "neutral" | "caution"
}`;

        const userPrompt = `Financial Data:
Transactions: ${JSON.stringify(transactions.slice(0, 30))} // Limiting to top 30 for token safety
Budgets: ${JSON.stringify(budgets)}
Period: ${dateRange.from} to ${dateRange.to}`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://expendx.app",
                "X-Title": "ExpendX",
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-001",
                "messages": [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": userPrompt }
                ],
                "response_format": { "type": "json_object" }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenRouter error:', response.status, errorData);
            throw new Error(`AI Provider Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const result = await response.json();

        if (!result.choices?.[0]?.message?.content) {
            console.error('Malformed OpenRouter response:', result);
            throw new Error('AI Provider returned an empty or malformed response.');
        }

        const content = result.choices[0].message.content;

        // Clean up content if it's wrapped in markdown code blocks
        const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();
        let insights;
        try {
            insights = JSON.parse(jsonString);
        } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', jsonString);
            throw new Error('AI returned invalid data format.');
        }

        return new Response(JSON.stringify(insights), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('Error in generate-financial-insights:', error);
        return new Response(JSON.stringify({
            error: error.message || 'Internal logic error',
            details: error.stack
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
