/**
 * Mock Chat Provider
 * 
 * Works without any AI backend — deterministic pattern-matched responses.
 * Provides a great experience even when no AI model is installed.
 * Uses the intent engine for parsing and returns helpful, encouraging responses.
 */

import type {
  ChatAIProvider,
  ChatMessage,
  ChatResponse,
  FinancialContext,
  AIProviderStatus,
} from '@/types/ai-types';

export class MockChatProvider implements ChatAIProvider {
  id = 'lucent-mock-chat';
  name = 'Lucent Built-in';
  type = 'chat' as const;
  status: AIProviderStatus = 'ready';
  isOffline = true;

  async initialize(): Promise<boolean> {
    this.status = 'ready';
    return true;
  }

  async dispose(): Promise<void> {
    // Nothing to clean up
  }

  async chat(messages: ChatMessage[], context: FinancialContext): Promise<ChatResponse> {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return { content: "Hey! I'm here whenever you need me. 💬" };
    }

    const text = lastMessage.content.toLowerCase().trim();

    // ── Greetings ──
    if (this.isGreeting(text)) {
      return this.generateGreeting(context);
    }

    // ── Help ──
    if (this.isHelp(text)) {
      return this.generateHelp();
    }

    // ── Balance queries ──
    if (text.includes('balance') || text.includes('how much do i have') || text.includes('how much left')) {
      return this.generateBalanceResponse(context);
    }

    // ── Spending queries ──
    if (text.includes('spend') || text.includes('spent') || text.includes('expenses')) {
      return this.generateSpendingResponse(context);
    }

    // ── Budget queries ──
    if (text.includes('budget')) {
      return this.generateBudgetResponse(context);
    }

    // ── Savings queries ──
    if (text.includes('saving') || text.includes('saved')) {
      return this.generateSavingsResponse(context);
    }

    // ── Can I afford ──
    if (text.includes('can i afford') || text.includes('afford')) {
      return this.generateAffordResponse(text, context);
    }

    // ── How am I doing ──
    if (text.includes('how am i doing') || text.includes('overview') || text.includes('summary') || text.includes('report')) {
      return this.generateOverview(context);
    }

    // ── Financial Literacy / Knowledge Queries ──
    if (text.includes('literacy') || text.includes('what is') || text.includes('explain') || text.includes('definition') || text.includes('how to')) {
      return this.generateLiteracyResponse(text);
    }

    // ── Fallback for action intents (handled by action dispatcher, not here) ──
    // The mock provider only handles queries. Action intents (log_expense, etc.)
    // are processed by the intent engine + action dispatcher before reaching here.

    return this.generateFallback(context);
  }

  // ─── Response Generators ───────────────────────────────────────────────────

  private isGreeting(text: string): boolean {
    return /^(hi|hello|hey|good\s+(morning|afternoon|evening)|howdy|sup|what'?s?\s+up|yo|hiya)\b/i.test(text);
  }

  private isHelp(text: string): boolean {
    return /\b(help|what can you do|guide|tutorial|how do i)\b/i.test(text);
  }

  private generateGreeting(ctx: FinancialContext): ChatResponse {
    const greetings = {
      morning: [
        `Good morning${ctx.userName ? `, ${ctx.userName}` : ''}! ☀️ Ready to start the day on track?`,
        `Morning${ctx.userName ? `, ${ctx.userName}` : ''}! 🌅 Let's make today count financially.`,
      ],
      afternoon: [
        `Hey${ctx.userName ? ` ${ctx.userName}` : ''}! 👋 How's your day going?`,
        `Good afternoon${ctx.userName ? `, ${ctx.userName}` : ''}! Need help with anything?`,
      ],
      evening: [
        `Good evening${ctx.userName ? `, ${ctx.userName}` : ''}! 🌙 Let's review how today went.`,
        `Hey${ctx.userName ? ` ${ctx.userName}` : ''}! 🌇 Ready to wrap up the day?`,
      ],
    };

    const options = greetings[ctx.timeOfDay] || greetings.afternoon;
    const content = options[Math.floor(Math.random() * options.length)];

    return {
      content,
      suggestedActions: [
        'How am I doing?',
        'Log an expense',
        "What's my balance?",
      ],
    };
  }

  private generateHelp(): ChatResponse {
    return {
      content: `Here's what I can help you with! 🚀

**📝 Log transactions**
"I spent ₦3,500 on transport"
"Received ₦150k salary"

**💰 Check your finances**
"What's my balance?"
"How much did I spend this month?"
"Show my budget status"

**📊 Get insights**
"How am I doing?"
"Can I afford a ₦50k laptop?"

**🎯 Set goals**
"Create a savings goal"
"Set a budget for food"

Just type naturally — I'll understand! 💬`,
      suggestedActions: [
        'Log an expense',
        "What's my balance?",
        'Show spending breakdown',
      ],
    };
  }

  private generateBalanceResponse(ctx: FinancialContext): ChatResponse {
    const { currency, monthlyIncome, monthlyExpenses } = ctx;
    const netBalance = monthlyIncome - monthlyExpenses;
    const emoji = netBalance >= 0 ? '💚' : '🔶';

    return {
      content: `${emoji} Here's your financial snapshot:

**Monthly Income:** ${currency.symbol}${monthlyIncome.toLocaleString()}
**Monthly Expenses:** ${currency.symbol}${monthlyExpenses.toLocaleString()}
**Net this month:** ${currency.symbol}${Math.abs(netBalance).toLocaleString()} ${netBalance >= 0 ? 'surplus' : 'deficit'}
${ctx.totalSavings > 0 ? `**Total Savings:** ${currency.symbol}${ctx.totalSavings.toLocaleString()}` : ''}

${netBalance >= 0 ? "You're doing well! Keep it up. 🌟" : "You're spending more than you earn this month. Let's find ways to balance things out."}`,
      attachments: [{
        type: 'budget_summary',
        data: { income: monthlyIncome, expenses: monthlyExpenses, net: netBalance }
      }],
      suggestedActions: [
        'Spending breakdown',
        'Budget status',
        'Log an expense',
      ],
    };
  }

  private generateSpendingResponse(ctx: FinancialContext): ChatResponse {
    const { currency, monthlyExpenses, budgets } = ctx;

    let breakdown = '';
    if (budgets.length > 0) {
      breakdown = '\n\n**Spending by category:**\n';
      const sorted = [...budgets].sort((a, b) => b.spent - a.spent);
      sorted.slice(0, 5).forEach(b => {
        const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
        const bar = pct > 90 ? '🔴' : pct > 70 ? '🟡' : '🟢';
        breakdown += `${bar} ${b.category}: ${currency.symbol}${b.spent.toLocaleString()} / ${currency.symbol}${b.limit.toLocaleString()} (${pct}%)\n`;
      });
    }

    return {
      content: `📊 Your spending this month: **${currency.symbol}${monthlyExpenses.toLocaleString()}**${breakdown}

${monthlyExpenses > 0 ? 'Want me to help identify where you can save?' : "You haven't logged any expenses yet this month. Start by telling me what you've spent!"}`,
      suggestedActions: [
        'Where can I save?',
        "What's my biggest expense?",
        'Log an expense',
      ],
    };
  }

  private generateBudgetResponse(ctx: FinancialContext): ChatResponse {
    const { currency, budgets } = ctx;

    if (budgets.length === 0) {
      return {
        content: "You don't have any budgets set up yet! 📋\n\nBudgets help you stay on track by setting spending limits for different categories. Want me to help you create one?",
        suggestedActions: [
          'Create a budget',
          'Show my spending',
        ],
      };
    }

    let response = '📋 **Budget Status:**\n\n';
    budgets.forEach(b => {
      const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
      const remaining = b.limit - b.spent;
      const bar = pct > 100 ? '🔴' : pct > 80 ? '🟡' : '🟢';
      response += `${bar} **${b.category}:** ${currency.symbol}${b.spent.toLocaleString()} / ${currency.symbol}${b.limit.toLocaleString()} (${pct}%)`;
      if (remaining > 0) {
        response += ` — ${currency.symbol}${remaining.toLocaleString()} remaining`;
      }
      response += '\n';
    });

    const overBudget = budgets.filter(b => b.spent > b.limit);
    if (overBudget.length > 0) {
      response += `\n💡 You're close to your limit on ${overBudget.map(b => b.category).join(', ')}. A small adjustment can keep you on track!`;
    } else {
      response += '\n🌟 All budgets are looking healthy!';
    }

    return {
      content: response,
      attachments: [{
        type: 'budget_summary',
        data: { budgets }
      }],
      suggestedActions: [
        'Adjust a budget',
        'Create new budget',
        'Spending breakdown',
      ],
    };
  }

  private generateSavingsResponse(ctx: FinancialContext): ChatResponse {
    const { currency, savingsGoals, totalSavings } = ctx;

    if (savingsGoals.length === 0) {
      return {
        content: `You have **${currency.symbol}${totalSavings.toLocaleString()}** in total savings! 💰\n\nWant to set a savings goal? It helps you stay motivated and track progress.`,
        suggestedActions: [
          'Create savings goal',
          "What's my balance?",
        ],
      };
    }

    let response = `💰 **Savings Goals:**\n\n`;
    savingsGoals.forEach(g => {
      const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
      response += `🎯 **${g.category}:** ${currency.symbol}${g.current.toLocaleString()} / ${currency.symbol}${g.target.toLocaleString()} (${pct}%)\n`;
    });

    return {
      content: response,
      suggestedActions: [
        'Add to savings',
        'New savings goal',
      ],
    };
  }

  private generateAffordResponse(text: string, ctx: FinancialContext): ChatResponse {
    // Try to extract an amount from "can I afford X"
    const amountMatch = text.match(/(\d[\d,]*(?:\.\d+)?(?:\s*[kmb])?)/i);
    if (amountMatch) {
      const amount = this.parseQuickAmount(amountMatch[1]);
      if (amount) {
        const { currency, monthlyIncome, monthlyExpenses } = ctx;
        const surplus = monthlyIncome - monthlyExpenses;
        const canAfford = surplus >= amount;

        return {
          content: canAfford
            ? `✅ Based on your current surplus of ${currency.symbol}${surplus.toLocaleString()}, you can afford ${currency.symbol}${amount.toLocaleString()} this month!\n\nThat would still leave you with ${currency.symbol}${(surplus - amount).toLocaleString()}.`
            : `🤔 ${currency.symbol}${amount.toLocaleString()} is ${amount > surplus + (surplus * 0.5) ? 'a stretch' : 'tight'} right now. Your current surplus is ${currency.symbol}${Math.max(0, surplus).toLocaleString()}.\n\n💡 Consider waiting until next month or adjusting your spending in another area.`,
          suggestedActions: [
            'Where can I cut back?',
            'Show spending breakdown',
          ],
        };
      }
    }

    return {
      content: "Tell me the amount you're thinking about and I'll check if it fits your budget! 🧮",
      suggestedActions: [
        'Can I afford ₦50,000?',
        "What's my surplus?",
      ],
    };
  }

  private generateOverview(ctx: FinancialContext): ChatResponse {
    const { currency, monthlyIncome, monthlyExpenses, streakDays, budgets } = ctx;
    const netBalance = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;
    const overBudgetCount = budgets.filter(b => b.spent > b.limit).length;

    let health = '🟢 Excellent';
    if (savingsRate < 10) health = '🟡 Needs attention';
    if (savingsRate < 0) health = '🔴 Overspending';

    return {
      content: `📊 **Your Financial Overview**

**Health Score:** ${health}
**Savings Rate:** ${savingsRate}%
**Net this month:** ${currency.symbol}${Math.abs(netBalance).toLocaleString()} ${netBalance >= 0 ? 'surplus' : 'deficit'}
${streakDays ? `**Streak:** ${streakDays} days 🔥` : ''}
${overBudgetCount > 0 ? `**Budgets near limit:** ${overBudgetCount}` : '**All budgets:** On track ✅'}

${savingsRate >= 20 ? "You're crushing it! Your savings rate is above 20% — that's fantastic. 🌟" :
  savingsRate >= 0 ? "You're on the right track! Try to push your savings rate toward 20%." :
  "Let's work on bringing spending below income. Small changes add up! 💪"}`,
      suggestedActions: [
        'Spending breakdown',
        'Budget status',
        'Where can I improve?',
      ],
    };
  }

  private generateLiteracyResponse(text: string): ChatResponse {
    if (text.includes('literacy')) {
      return {
        content: `📚 **Financial Literacy** is the ability to understand and effectively use various financial skills, including personal financial management, budgeting, and investing.\n\n**4 Core Pillars:**\n1. **Budgeting**: Tracking income vs. expenses so you never spend more than you earn.\n2. **Emergency Savings**: Setting aside 3-6 months of expenses for unexpected events.\n3. **Debt Management**: Avoiding high-interest debt and paying off loans systematically.\n4. **Investing & Wealth**: Putting surplus money into assets that grow over time.\n\nWant to start by logging an expense or checking your current budget?`,
        suggestedActions: ['Check balance', 'Show spending breakdown', 'Log an expense'],
      };
    }

    return {
      content: `💡 **Lucent Financial Knowledge Base**\n\nI'm designed to help you manage your money, log transactions, track budgets, and build long-term wealth.\n\n**Ask me anything like:**\n• "What is financial literacy?"\n• "How am I doing this month?"\n• "I spent ₦4,500 on dinner"\n• "Can I afford ₦50,000?"`,
      suggestedActions: ['What is financial literacy?', 'How am I doing?', 'Log an expense'],
    };
  }

  private generateFallback(ctx: FinancialContext): ChatResponse {
    return {
      content: `I'm your financial assistant — here to help you track, save, and grow! 💬\n\nTry asking me things like:\n• "I spent ₦5,000 on lunch"\n• "What's my balance?"\n• "How am I doing this month?"`,
      suggestedActions: [
        'Log an expense',
        "What's my balance?",
        'How am I doing?',
      ],
    };
  }

  private parseQuickAmount(text: string): number | undefined {
    const cleaned = text.replace(/[₦$€£,\s]/g, '');
    const shorthand = cleaned.match(/^(\d+(?:\.\d+)?)\s*(k|m|b)$/i);
    if (shorthand) {
      const num = parseFloat(shorthand[1]);
      const mult = shorthand[2].toLowerCase();
      if (mult === 'k') return num * 1000;
      if (mult === 'm') return num * 1000000;
      if (mult === 'b') return num * 1000000000;
    }
    const plain = cleaned.match(/^(\d+(?:\.\d+)?)$/);
    if (plain) return parseFloat(plain[1]);
    return undefined;
  }
}
