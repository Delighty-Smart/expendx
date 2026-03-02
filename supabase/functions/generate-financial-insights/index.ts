declare const Deno: any;
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: any) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { transactions, budgets, dateRange, currency } = await req.json();

        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
        if (!openRouterKey) {
            throw new Error('OPENROUTER_API_KEY is not set');
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
Transactions: ${JSON.stringify(transactions.slice(0, 50))} // Limiting to top 50 for context
Budgets: ${JSON.stringify(budgets)}
Period: ${dateRange.from} to ${dateRange.to}`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json",
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

        const result = await response.json();
        const content = result.choices[0].message.content;

        // Clean up content if it's wrapped in markdown code blocks
        const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();
        const insights = JSON.parse(jsonString);

        return new Response(JSON.stringify(insights), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('Error in generate-financial-insights:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
