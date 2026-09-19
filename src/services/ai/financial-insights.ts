export interface FinancialInsightsInput {
  transactions: any[];
  budgets: any[];
  dateRange: { from: string; to: string };
  currency: string;
}

export interface InsightData {
  summary: string;
  quantitative_analysis: string[];
  actionable_advice: string[];
  sentiment: "positive" | "neutral" | "caution";
}

export async function generateFinancialInsights(input: FinancialInsightsInput): Promise<InsightData> {
  const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://expendx.app',
      'X-Title': 'Lucent',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-thinking-exp:free',
      messages: [
        {
          role: 'system',
          content: `You are Lucent AI, an expert personal finance advisor and data analyst. Analyze user transaction and budget data and provide clear, actionable insights, quantitative observations, and qualitative summary.`
        },
        {
          role: 'user',
          content: `Analyze the following financial data for period ${input.dateRange.from} to ${input.dateRange.to} (Currency: ${input.currency}):
Transactions: ${JSON.stringify(input.transactions.slice(0, 50))}
Budgets: ${JSON.stringify(input.budgets)}`
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_insights',
            description: 'Generate financial insights and recommendations',
            parameters: {
              type: 'object',
              properties: {
                summary: { type: 'string', description: 'One to two sentence overall summary of spending behavior and financial health.' },
                quantitative_analysis: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '3-4 key quantitative observations about spending breakdown, top categories, or changes.'
                },
                actionable_advice: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '2-3 specific recommendations for improving savings or optimizing budget.'
                },
                sentiment: {
                  type: 'string',
                  enum: ['positive', 'neutral', 'caution'],
                  description: 'Overall sentiment rating for the user financial period.'
                }
              },
              required: ['summary', 'quantitative_analysis', 'actionable_advice', 'sentiment']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'generate_insights' } }
    })
  });

  if (!response.ok) {
    // Fallback static analysis if AI API limit reached
    return generateFallbackInsights(input);
  }

  try {
    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return parsed as InsightData;
    }
  } catch (err) {
    console.warn("Falling back to client-side rule-based financial insights", err);
  }

  return generateFallbackInsights(input);
}

function generateFallbackInsights(input: FinancialInsightsInput): InsightData {
  const totalIncome = input.transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = input.transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const net = totalIncome - totalExpenses;
  const sentiment = net >= 0 ? 'positive' : 'caution';

  return {
    summary: `During this period, your total income was ${input.currency}${totalIncome.toFixed(2)} and total expenses were ${input.currency}${totalExpenses.toFixed(2)}.`,
    quantitative_analysis: [
      `Total income: ${input.currency}${totalIncome.toFixed(2)} across ${input.transactions.filter(t => t.type === 'credit').length} items.`,
      `Total expenses: ${input.currency}${totalExpenses.toFixed(2)} across ${input.transactions.filter(t => t.type === 'debit').length} items.`,
      `Net Cashflow: ${input.currency}${net.toFixed(2)}.`
    ],
    actionable_advice: [
      `Keep track of recurring categories to stay within budget targets.`,
      `Consider allocating a portion of surplus to savings goals.`
    ],
    sentiment
  };
}
