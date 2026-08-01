/**
 * Capability Grammar Engine & Intent Schema Definitions
 * 
 * Defines standard application capabilities and natural language concept models
 * for NLOS (Natural Language Operating System).
 */

export interface CapabilityGrammar {
  intent: string;
  module: string;
  description: string;
  requiredEntities: string[];
  optionalEntities: string[];
  concepts: string[];
  transactionType?: 'debit' | 'credit' | 'savings';
}

export const CAPABILITY_GRAMMARS: CapabilityGrammar[] = [
  {
    intent: 'log_expense',
    module: 'expenses',
    description: 'Record a spent amount or financial debit',
    requiredEntities: ['amount'],
    optionalEntities: ['category', 'description', 'date', 'merchant'],
    transactionType: 'debit',
    concepts: [
      'spent', 'paid', 'pay', 'bought', 'purchased', 'got', 'cost', 'cost me', 'parted with',
      'cough up', 'coughed up', 'took from me', 'charged', 'billed', 'order', 'ordered',
      'subscribed', 'transferred', 'sent', 'settled', 'donated', 'gave', 'fuel', 'groceries',
      'rent', 'ticket', 'food', 'transport', 'lunch', 'dinner', 'breakfast', 'shopping'
    ],
  },
  {
    intent: 'log_income',
    module: 'income',
    description: 'Record money received or financial credit',
    requiredEntities: ['amount'],
    optionalEntities: ['category', 'description', 'date'],
    transactionType: 'credit',
    concepts: [
      'received', 'earned', 'got paid', 'collected', 'income', 'salary', 'freelance',
      'gig', 'wage', 'paycheck', 'dividend', 'revenue', 'profit', 'refund', 'reimbursement',
      'cashback', 'credit', 'gifted', 'won', 'bonus'
    ],
  },
  {
    intent: 'log_savings',
    module: 'goals',
    description: 'Put money aside or deposit into a savings goal',
    requiredEntities: ['amount'],
    optionalEntities: ['goalName', 'category', 'date'],
    transactionType: 'savings',
    concepts: [
      'deposit into savings', 'put aside into savings', 'saved ₦', 'saved money', 'stashed into savings'
    ],
  },
  {
    intent: 'query_balance',
    module: 'analytics',
    description: 'Check net balance, income vs expense totals',
    requiredEntities: [],
    optionalEntities: ['timePeriod'],
    concepts: ['balance', 'how much do i have', 'net worth', 'total money', 'remaining', 'left over', 'summary'],
  },
  {
    intent: 'query_spending',
    module: 'analytics',
    description: 'Analyze expenses across categories or dates',
    requiredEntities: [],
    optionalEntities: ['category', 'timePeriod'],
    concepts: ['how much did i spend', 'how much have i spent', 'spent in my budget', 'spent on budget', 'total spent', 'breakdown', 'expenses', 'where did my money go', 'spending'],
  },
  {
    intent: 'query_income',
    module: 'income',
    description: 'Analyze total income received',
    requiredEntities: [],
    optionalEntities: ['timePeriod'],
    concepts: ['income', 'earnings', 'earned', 'salary total', 'how much did i make', 'how much did i earn', 'revenue', 'money received', 'total income'],
  },
  {
    intent: 'query_budget',
    module: 'budgets',
    description: 'Check status of budgets and limits',
    requiredEntities: [],
    optionalEntities: ['category'],
    concepts: ['budget', 'budgets', 'limit', 'over budget', 'exceeded', 'exceed', 'overbudget', 'surpassed', 'how much budget left'],
  },
  {
    intent: 'query_savings',
    module: 'goals',
    description: 'Check goal progress and total saved',
    requiredEntities: [],
    optionalEntities: ['goalName'],
    concepts: ['goals', 'goal progress', 'how much saved', 'savings balance', 'target'],
  },
  {
    intent: 'create_budget',
    module: 'budgets',
    description: 'Set a monthly spend limit for a category',
    requiredEntities: ['budgetCategory', 'budgetLimit'],
    optionalEntities: [],
    concepts: ['create budget', 'set budget', 'limit spend', 'cap spending', 'budget limit'],
  },
  {
    intent: 'create_goal',
    module: 'goals',
    description: 'Create a new savings goal',
    requiredEntities: ['goalName', 'goalAmount'],
    optionalEntities: [],
    concepts: ['create goal', 'new goal', 'save for', 'target for', 'saving goal'],
  },
  {
    intent: 'report',
    module: 'analytics',
    description: 'Generate financial report and insights',
    requiredEntities: [],
    optionalEntities: ['timePeriod'],
    concepts: ['report', 'financial review', 'insights', 'analysis', 'overview', 'health score'],
  },
  {
    intent: 'forecast',
    module: 'analytics',
    description: 'Predict future balance and run-rate',
    requiredEntities: [],
    optionalEntities: [],
    concepts: ['forecast', 'predict', 'projection', 'runway', 'end of month balance'],
  },
  {
    intent: 'help',
    module: 'system',
    description: 'Show app capabilities and help',
    requiredEntities: [],
    optionalEntities: [],
    concepts: ['help', 'guide', 'what can you do', 'how to use', 'commands'],
  },
];
