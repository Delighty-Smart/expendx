/**
 * Lucent AI Intent Engine
 * 
 * Parses natural language user input into structured intents.
 * Uses regex + keyword matching for Quick Mode (fast, no AI needed).
 * Falls back to AI-powered intent detection for complex queries.
 * 
 * Handles Nigerian Naira shorthand: "3.5k" → ₦3,500, "1m" → ₦1,000,000
 * Handles multi-turn follow-ups: "Groceries" after "I spent ₦6,000"
 */

import type { ParsedIntent, IntentEntities, IntentType, ConversationState } from '@/types/ai-types';

/** Words to numbers parser for spoken/written natural language numbers */
/** Words to numbers parser for spoken/written natural language numbers */
export function wordsToNumbers(text: string): string {
  const smallNumbers: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };

  const scaleNumbers: Record<string, number> = {
    hundred: 100,
    thousand: 1000,
    million: 1000000,
    billion: 1000000000
  };

  return text.replace(/\b(?:(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion)\s*)+\b/gi, (match) => {
    const tokens = match.toLowerCase().trim().split(/\s+/);
    let total = 0;
    let current = 0;

    for (const token of tokens) {
      if (smallNumbers[token] !== undefined) {
        current += smallNumbers[token];
      } else if (scaleNumbers[token] !== undefined) {
        const scale = scaleNumbers[token];
        if (scale === 100) {
          current = (current || 1) * 100;
        } else {
          total += (current || 1) * scale;
          current = 0;
        }
      }
    }
    const result = total + current;
    return result > 0 ? result.toString() : match;
  });
}

/** Clean amount string and convert to number */
export function parseAmount(text: string): number | undefined {
  if (!text) return undefined;
  const normalized = wordsToNumbers(text);
  // Remove commas, currency symbols, and currency words
  const cleaned = normalized
    .replace(/,/g, '')
    .replace(/(?:naira|nairas|dollars?|euros?|pounds?|[₦$€£N])\s*/gi, '')
    .trim();

  // Handle shorthand: 3.5k, 15k, 1m, 2.5m
  const shorthandMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(k|m|b)$/i);
  if (shorthandMatch) {
    const num = parseFloat(shorthandMatch[1]);
    const multiplier = shorthandMatch[2].toLowerCase();
    if (multiplier === 'k') return num * 1000;
    if (multiplier === 'm') return num * 1000000;
    if (multiplier === 'b') return num * 1000000000;
  }

  // Handle plain numbers (e.g. 5000, 15000, 300000)
  const plainMatch = cleaned.match(/^(\d+(?:\.\d+)?)$/);
  if (plainMatch) {
    return parseFloat(plainMatch[1]);
  }

  return undefined;
}

/** Extract amount from a sentence */
export function extractAmount(text: string): number | undefined {
  if (!text) return undefined;

  // Pre-clean commas from any formatted number (e.g. "5,000" -> "5000", "300,000" -> "300000")
  const uncomma = text.replace(/(\d+),(\d+)/g, '$1$2');

  // 1. Currency-prefixed or suffixed numbers (e.g. 5000 Naira, ₦5000, 15000 naira)
  const currencyMatch = uncomma.match(/(?:[₦$€£N])\s*(\d+(?:\.\d+)?(?:\s*[kmb])?)/i) ||
                        uncomma.match(/(\d+(?:\.\d+)?(?:\s*[kmb])?)\s*(?:[₦$€£N]|\bNaira\b|\bNairas\b)/i);
  if (currencyMatch) {
    const parsed = parseAmount(currencyMatch[1]);
    if (parsed !== undefined) return parsed;
  }

  // 2. Shorthand numbers (e.g. 15k, 300k, 1.5m)
  const shorthandMatch = uncomma.match(/\b(\d+(?:\.\d+)?)\s*([kmb])\b/i);
  if (shorthandMatch) {
    const parsed = parseAmount(shorthandMatch[0]);
    if (parsed !== undefined) return parsed;
  }

  // 3. Spoken words-to-numbers conversion (e.g. "three hundred thousand")
  const normalized = wordsToNumbers(uncomma);

  // 4. Standalone plain numbers with 2+ digits (e.g. 5000, 15000, 300000)
  const plainMatch = normalized.match(/\b\d{2,}\b/);
  if (plainMatch) {
    const val = parseFloat(plainMatch[0]);
    if (!isNaN(val)) return val;
  }

  // 5. Single digit with action verb context clue (e.g. "spent 5")
  const smallMatch = normalized.match(/(?:spent|paid|cost|was|for|got|received|earned)\s+(\d+)\b/i);
  if (smallMatch) {
    const val = parseFloat(smallMatch[1]);
    if (!isNaN(val)) return val;
  }

  return undefined;
}

// ─── Category Detection ──────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Expenses (debit)
  'Groceries Food': ['grocery', 'groceries', 'food', 'market', 'supermarket', 'shoprite', 'spar', 'biscuit', 'biscuits', 'bread', 'snacks', 'snack', 'cake', 'provision', 'provisions', 'yam', 'rice', 'meat', 'foodstuff'],
  'Dining Out': ['lunch', 'dinner', 'breakfast', 'restaurant', 'eating out', 'food court', 'suya', 'amala', 'pepper soup', 'bukateria', 'chicken republic', 'kfc', 'pizza', 'fast food'],
  'Fuel Transport': ['transport', 'transports', 'fuel', 'uber', 'bolt', 'taxi', 'bus', 'okada', 'keke', 'petrol', 'diesel', 'danfo', 'brt', 'fare', 'fares', 'cab', 'gasoline'],
  'Body Care & Skincare': ['body cream', 'cream', 'lotion', 'skincare', 'soap', 'body wash', 'moisturizer', 'sunscreen', 'deodorant'],
  'Personal Care': ['haircut', 'barber', 'salon', 'spa', 'cosmetics', 'perfume', 'makeup', 'nails', 'braids', 'beauty'],
  'Accommodation Rent': ['rent', 'accommodation', 'house', 'apartment', 'flat', 'lease', 'house rent'],
  'Data and Internet': ['data', 'internet', 'wifi', 'mtn', 'glo', 'airtel', '9mobile', 'spectranet', 'smile', 'mifi', 'fiber'],
  'Airtime': ['airtime', 'recharge', 'top up', 'credit'],
  'Entertainment Leisure': ['entertainment', 'movie', 'cinema', 'netflix', 'spotify', 'games', 'fun', 'party', 'outing', 'concert'],
  'Clothing Apparel': ['clothes', 'clothing', 'shoes', 'fashion', 'wear', 'outfit', 'dress', 'shirt', 'pants', 'trousers', 'sneakers', 'apparel'],
  'Healthcare Medical': ['hospital', 'clinic', 'doctor', 'medicine', 'pharmacy', 'health', 'medical', 'drugs', 'pills', 'checkup'],
  'Education Fees': ['school', 'education', 'tuition', 'fees', 'course', 'training', 'book', 'exam', 'udemy', 'coursera'],
  'Utility Bills': ['light', 'electricity', 'nepa', 'phcn', 'water', 'waste', 'utility', 'bills', 'prepaid meter'],
  'Electronics and Gadgets': ['phone', 'laptop', 'electronics', 'gadget', 'ps5', 'playstation', 'xbox', 'earbuds', 'charger', 'new charger', 'cable', 'adapter', 'macbook', 'iphone'],
  'Software & Apps': ['app', 'software', 'cloud', 'hosting', 'domain', 'chatgpt', 'ai subscription', 'github', 'notion', 'claude', 'midjourney'],
  'Family Support & Black Tax': ['family', 'parents', 'mom', 'dad', 'brother', 'sister', 'relatives', 'black tax', 'sent to family'],
  'Debt Payoff & Loans': ['loan', 'debt', 'borrowed', 'repayment', 'lending', 'credit card'],
  'Laundry & Dry Cleaning': ['laundry', 'dry cleaning', 'washing service'],
  'Bank Charges': ['bank charge', 'transfer fee', 'sms charge', 'account maintenance'],
  'Childcare and Babysitting': ['childcare', 'babysitting', 'nanny', 'day care', 'baby supplies'],
  'Fitness and Health Club': ['gym', 'fitness', 'health club', 'trainer'],
  'Gift Donations': ['gift', 'donation', 'charity', 'wedding', 'birthday gift'],
  'Home Maintenance': ['home maintenance', 'plumbing', 'electrical', 'repairs'],
  'Household Supplies': ['detergent', 'cleaning', 'tissue paper', 'trash bags', 'household supplies'],
  'Insurance Premiums': ['insurance', 'health insurance', 'car insurance', 'life insurance'],
  'Pets and Veterinary': ['pet', 'vet', 'dog food', 'cat food', 'pet grooming'],
  'Refreshments': ['drink', 'coffee', 'tea', 'juice', 'smoothie', 'beer', 'wine', 'soda', 'coke'],
  'Subscriptions': ['subscription', 'premium', 'plan', 'monthly', 'annual'],
  'Taxes Levies': ['tax', 'taxes', 'levies', 'government tax'],
  'Tithes': ['tithe', 'offering', 'church', 'mosque', 'religious'],
  'Travel and Vacations': ['travel', 'vacation', 'flight', 'hotel', 'trip'],
  'Vehicle Maintenance': ['car servicing', 'mechanic', 'tires', 'car repair', 'auto repair'],

  // Income (credit)
  'Salary Wages': ['salary', 'wage', 'paycheck', 'pay', 'income'],
  'Freelance Income': ['freelance', 'freelance job', 'gig', 'side hustle'],
  'Client Payment': ['client', 'client payment', 'from client', 'project payment', 'invoice paid'],
  'Business Sales': ['sales', 'business', 'revenue', 'profit', 'store sales'],
  'Crypto Gains': ['crypto', 'bitcoin', 'usdt', 'binance'],
  'Overtime Pay': ['overtime', 'extra hours'],
  'Asset Sales': ['asset sale', 'car sale', 'property sale', 'equipment sale'],
  'Bonuses and Incentives': ['bonus', 'incentive', 'work bonus'],
  'Cash Gifts': ['cash gift', 'gift received', 'gift from'],
  'Child Support / Alimony': ['child support', 'alimony'],
  'Commissions Earned': ['commission', 'commissions'],
  'Contract Income': ['contract income', 'contract pay'],
  'Dividend Income': ['dividend', 'dividends'],
  'Government Benefits': ['government benefit', 'welfare'],
  'Grant Funds': ['grant', 'grant fund'],
  'Interest Earned': ['interest earned', 'savings interest'],
  'Investment Gains': ['investment gain', 'capital gain', 'returns'],
  'Pension Income': ['pension'],
  'Prizes and Winnings': ['prize', 'winnings', 'lottery', 'raffle'],
  'Refunds and Reimbursements': ['refund', 'reimbursement', 'cashback', 'returned'],
  'Rental Income': ['rental income', 'rent collected'],
  'Royalties Received': ['royalty', 'royalties'],
  'Side Hustle': ['side hustle'],
  'Tips Received': ['tip', 'tips'],

  // Savings
  'Emergency Fund': ['emergency fund'],
  'Tech & Gadget Fund': ['tech fund', 'gadget fund'],
  'Education Fund': ['education fund'],
  'Health and Medical Fund': ['health fund', 'medical fund'],
  'Goal Savings': ['goal savings'],
  'Fixed Deposit': ['fixed deposit'],
  'Home Downpayment': ['home downpayment', 'down payment'],
  'Investment Contributions': ['investment contribution'],
  'Pension Contributions': ['pension contribution'],
  'Retirement Savings': ['retirement savings', 'nest egg'],
  'Short Term Savings': ['short term savings'],
  'Sinking Fund': ['sinking fund'],
  'Travel Fund': ['travel fund'],
  'Vehicle Purchase': ['vehicle purchase', 'car fund'],
  'Wealth Building': ['wealth building']
};

export function detectCategory(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
  }

  // Fallback: Only extract single-word or short 2-word item descriptions if text is concise
  const words = text.trim().split(/\s+/);
  if (words.length <= 3) {
    const desc = extractDescription(text);
    if (desc && desc.length > 2 && desc.length < 25 && !/\b(?:show|what|how|any|check|my|the|this)\b/i.test(desc)) {
      return desc.charAt(0).toUpperCase() + desc.slice(1);
    }
  }

  return undefined;
}

// ─── Date Extraction ─────────────────────────────────────────────────────────

export function extractDate(text: string): string | undefined {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes('today') || lower.includes('just now')) {
    return now.toISOString().split('T')[0];
  }
  if (lower.includes('yesterday')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  // "last Monday", "on Friday", etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < dayNames.length; i++) {
    if (lower.includes(dayNames[i])) {
      const d = new Date(now);
      const diff = (d.getDay() - i + 7) % 7 || 7;
      d.setDate(d.getDate() - diff);
      return d.toISOString().split('T')[0];
    }
  }

  return undefined;
}

// ─── Time Period Extraction ──────────────────────────────────────────────────

export type TimePeriod = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

export function extractTimePeriod(text: string): TimePeriod | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('today')) return 'today';
  if (lower.includes('this week')) return 'this_week';
  if (lower.includes('this month') || lower.includes('month')) return 'this_month';
  if (lower.includes('last month')) return 'last_month';
  if (lower.includes('this year') || lower.includes('year')) return 'this_year';
  return undefined;
}

// ─── Intent Patterns ─────────────────────────────────────────────────────────

interface IntentPattern {
  type: IntentType;
  patterns: RegExp[];
  /** Base confidence for regex match */
  confidence: number;
  /** What transaction type this implies */
  transactionType?: 'credit' | 'debit' | 'savings';
}

const INTENT_PATTERNS: IntentPattern[] = [
  // ── Expense Logging ──
  {
    type: 'log_expense',
    patterns: [
      /(?:i\s+)?(?:also\s+)?(?:spent|paid|pay|bought|purchased|got)\b/i,
      /(?:cost|was|for)\s+(?:₦|N|\$|€|£)?\s*\d/i,
      /(?:₦|N|\$|€|£)?\s*[\d,]+(?:\.\d+)?(?:\s*[kmb])?\s+(?:on|for)\b/i,
    ],
    confidence: 0.85,
    transactionType: 'debit',
  },

  // ── Income Logging ──
  {
    type: 'log_income',
    patterns: [
      /(?:i\s+)?(?:also\s+)?(?:received|earned|got paid|collected|got|made)\b/i,
      /(?:salary|wage|income|payment|credit|refund|paycheck)\s+(?:of|was|₦|N|from|\d)/i,
    ],
    confidence: 0.85,
    transactionType: 'credit',
  },

  // ── Savings ──
  {
    type: 'log_savings',
    patterns: [
      /(?:save|saved|saving|put aside|set aside)\b/i,
      /(?:move|transfer)\s+.*(?:to\s+)?savings\b/i,
    ],
    confidence: 0.80,
    transactionType: 'savings',
  },

  // ── Balance Queries ──
  {
    type: 'query_balance',
    patterns: [
      /(?:what(?:'s| is)?\s+)?(?:my\s+)?balance\b/i,
      /how\s+much\s+(?:do i have|money|left|remaining)\b/i,
      /(?:total|current)\s+(?:balance|amount)\b/i,
    ],
    confidence: 0.90,
  },

  // ── Spending Queries ──
  {
    type: 'query_spending',
    patterns: [
      /how\s+much\s+(?:did i|have i|am i)?\s*(?:spend|spent)\b/i,
      /how\s+much\s+have\s+i\s+spent\s+(?:in|on)?\s*(?:my\s+)?budget\b/i,
      /(?:what|show)\s+(?:did i|my)\s+(?:spend|spending)\b/i,
      /(?:spending|expenses?)\s+(?:this|last|on|for|breakdown|summary)\b/i,
      /(?:where|what)\s+(?:did|does|is)\s+my\s+money\s+go\b/i,
    ],
    confidence: 0.95,
  },

  // ── Budget Queries (Status Checks) ──
  {
    type: 'query_budget',
    patterns: [
      /^(?:what(?:'s| is)?\s+)?(?:my\s+)?budget\s*(?:status|overview|summary|health)?$/i,
      /how\s+(?:am i|is my)\s+(?:doing\s+on\s+my\s+)?budget/i,
      /(?:budget|limit)\s+(?:status|overview)\b/i,
      /(?:over|under|within|exceeded?|surpassed)\s+(?:a\s+)?budget\b/i,
      /(?:any\s+)?budget\s+(?:exceeded?|over|surpassed)\b/i,
      /show\s+(?:my\s+)?budget/i,
    ],
    confidence: 0.92,
  },

  // ── Create / Build / Recommend Budget ──
  {
    type: 'create_budget',
    patterns: [
      /(?:create|set|make|start|build|recommend|plan|design|suggest)\s+(?:a\s+|me\s+a\s+)?budget\b/i,
      /(?:build|create|plan|set)\s+budget\s+(?:for|my)\s+(?:next\s+month|salary|income|month)\b/i,
      /help\s+(?:me\s+)?(?:build|budget|plan)\b/i,
      /can\s+you\s+(?:build|make|create|recommend)\s+.*budget/i,
    ],
    confidence: 0.90,
  },

  // ── Savings Queries ──
  {
    type: 'query_savings',
    patterns: [
      /(?:show|view|check|get|my)\s+.*savings?\s*(?:goals?|progress)?/i,
      /how\s+much\s+(?:have i|is)\s+saved\b/i,
      /savings?\s*(?:goals?|progress|status|summary)\b/i,
    ],
    confidence: 0.95,
  },

  // ── Create Goal ──
  {
    type: 'create_goal',
    patterns: [
      /(?:create|set|start|new|enter|add|log|record|make)\s+(?:a\s+)?(?:savings?\s+)?goal\b/i,
      /(?:i\s+)?want\s+to\s+save\s+(?:for|up)\b/i,
      /(?:save|saving)\s+(?:for|towards)\b/i,
      /savings?\s+goal\s+for\b/i,
    ],
    confidence: 0.90,
  },

  // ── Forecast ──
  {
    type: 'forecast',
    patterns: [
      /(?:forecast|predict|projection|estimate)\b/i,
      /what\s+(?:if|happens)\b/i,
      /can\s+i\s+(?:afford|buy|get)\b/i,
      /(?:when|how long)\s+(?:will|can|would)\s+(?:i|it)\b/i,
    ],
    confidence: 0.75,
  },

  // ── Subscriptions ──
  {
    type: 'query_subscriptions',
    patterns: [
      /(?:subscriptions?|recurring\s+bills?|memberships?)\b/i,
      /what\s+(?:are\s+)?(?:my\s+)?(?:active\s+)?(?:subscriptions?|bills?)/i,
      /show\s+.*subscriptions?/i,
    ],
    confidence: 0.90,
  },

  // ── Life Energy ──
  {
    type: 'query_life_energy',
    patterns: [
      /(?:life\s+energy|hourly\s+rate|work\s+hours|hours?\s+of\s+life)\b/i,
      /how\s+many\s+hours\s+of\s+life\b/i,
    ],
    confidence: 0.90,
  },

  // ── Alerts & Warnings ──
  {
    type: 'query_alerts',
    patterns: [
      /(?:alerts?|notifications?|warnings?|overspend\s+warning)\b/i,
      /show\s+.*alerts?/i,
    ],
    confidence: 0.90,
  },

  // ── Reports ──
  {
    type: 'report',
    patterns: [
      /(?:report|summary|overview|analysis|review)\b/i,
      /how\s+am\s+i\s+doing\s+(?:financially)?\b/i,
      /(?:show|give)\s+(?:me\s+)?(?:a\s+)?(?:report|summary|overview)\b/i,
      /(?:monthly|weekly|financial)\s+(?:report|review|summary)\b/i,
      /compare\s+(?:last|this|my)\b/i,
    ],
    confidence: 0.80,
  },

  // ── Greeting ──
  {
    type: 'greeting',
    patterns: [
      /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening)|howdy|sup|what'?s?\s+up)\b/i,
      /^(?:yo|hiya|greetings)\b/i,
    ],
    confidence: 0.95,
  },

  // ── Help ──
  {
    type: 'help',
    patterns: [
      /(?:help|what\s+can\s+you\s+do|how\s+do\s+i|guide|tutorial)\b/i,
      /(?:show|tell)\s+me\s+(?:how|what)\b/i,
    ],
    confidence: 0.85,
  },
];

// ─── Main Parse Function ─────────────────────────────────────────────────────

/**
 * Parse user text into a structured intent.
 * Handles multi-turn by accepting current conversation state.
 */
import { classifyIntent } from './intent-classifier';

export function parseIntent(
  text: string,
  conversationState?: ConversationState
): ParsedIntent {
  const trimmed = text.trim();

  // ── Handle follow-ups to pending multi-turn conversations ──
  if (conversationState?.pendingIntent && conversationState.awaitingFields?.length) {
    return handleFollowUp(trimmed, conversationState);
  }

  // ── Level 2: Multi-Signal Intent Classifier (NLOS Intent Normalizer) ──
  const classified = classifyIntent(trimmed, conversationState);
  if (classified.confidence >= 0.70) {
    return classified;
  }

  // ── Level 1: Legacy Pattern Fallback ──
  let bestMatch: ParsedIntent | null = null;

  for (const pattern of INTENT_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(trimmed)) {
        const entities: IntentEntities = {};
        const amount = extractAmount(trimmed);
        const category = detectCategory(trimmed);
        const date = extractDate(trimmed);
        const timePeriod = extractTimePeriod(trimmed);

        if (amount !== undefined) entities.amount = amount;
        if (category) entities.category = category;
        if (date) entities.date = date;
        if (timePeriod) entities.timePeriod = timePeriod;
        if (pattern.transactionType) entities.transactionType = pattern.transactionType;

        if (pattern.type === 'create_goal') {
          if (amount !== undefined) entities.goalAmount = amount;
          const goalName = extractGoalName(trimmed);
          if (goalName) entities.goalName = goalName;
        }

        if (pattern.type === 'create_budget') {
          if (amount !== undefined) entities.budgetLimit = amount;
          if (category) entities.budgetCategory = category;
        }

        const confidence = pattern.confidence + (amount !== undefined ? 0.05 : 0) + (category ? 0.05 : 0);
        const isAction = isActionIntent(pattern.type);
        const missingFields = isAction ? getMissingFields(pattern.type, entities) : [];

        const intent: ParsedIntent = {
          type: pattern.type,
          confidence: Math.min(confidence, 1),
          entities,
          rawText: trimmed,
          needsFollowUp: isAction && missingFields.length > 0,
          missingFields,
        };

        if (!bestMatch || intent.confidence > bestMatch.confidence) {
          bestMatch = intent;
        }

        break;
      }
    }
  }

  if (bestMatch) return bestMatch;

  return classified;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function isActionIntent(type: IntentType): boolean {
  return ['log_expense', 'log_income', 'log_savings', 'create_budget', 'create_goal'].includes(type);
}

function getMissingFields(type: IntentType, entities: IntentEntities): string[] {
  const missing: string[] = [];

  switch (type) {
    case 'log_expense':
    case 'log_income':
    case 'log_savings':
      if (entities.amount === undefined) missing.push('amount');
      if (!entities.category) missing.push('category');
      break;
    case 'create_budget':
      if (!entities.budgetCategory) missing.push('budgetCategory');
      if (entities.budgetLimit === undefined) missing.push('budgetLimit');
      break;
    case 'create_goal':
      if (!entities.goalName) missing.push('goalName');
      if (entities.goalAmount === undefined) missing.push('goalAmount');
      break;
  }

  return missing;
}

function extractDescription(text: string): string | undefined {
  const normalized = wordsToNumbers(text);
  // Remove amount patterns, currency, numbers, and common verbs to get description
  let desc = normalized
    .replace(/(?:i\s+)?(?:also\s+)?(?:spent|paid|bought|purchased|got|received|earned|saved)\s*/gi, '')
    .replace(/(?:naira|nairas|dollars?|euros?|pounds?|[₦$€£N])\s*/gi, '')
    .replace(/[\d,]+(?:\.\d+)?(?:\s*[kmb])?/g, '')
    .replace(/\b(?:on|for|at|from|to|today|yesterday|a|an|the|new|job)\b/gi, '')
    .trim();

  // Clean up leftover whitespace
  desc = desc.replace(/\s+/g, ' ').trim();
  return desc.length > 1 ? desc : undefined;
}

export function extractGoalName(text: string): string | undefined {
  // Pattern 1: "Set emergency fund goal of 50000" or "create vacation goal"
  const goalMatch = text.match(/(?:set|create|make|add|start|new)\s+(?:a\s+)?([a-z0-9\s]+?)\s+goal\b/i);
  if (goalMatch && goalMatch[1].trim().length > 1) {
    const raw = goalMatch[1].trim();
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  // Pattern 2: "goal for [name]" or "save for [name]"
  const match = text.match(/(?:goal\s+for|save\s+for|saving\s+for|save\s+up\s+for)\s+(?:a\s+)?([^0-9₦$€£at,]+)/i);
  if (match) {
    const name = match[1].replace(/\b(?:at|of|for|with)\b/gi, '').trim();
    if (name.length > 1) return name.charAt(0).toUpperCase() + name.slice(1);
  }

  const cat = detectCategory(text);
  if (cat && !/\b(?:show|what|how|any|check|my|the|this)\b/i.test(cat)) {
    return cat;
  }
  return undefined;
}

function handleFollowUp(text: string, state: ConversationState): ParsedIntent {
  const pending = state.pendingIntent!;
  const awaiting = state.awaitingFields || [];
  const entities: IntentEntities = { ...pending.entities } as IntentEntities;

  const parsedAmt = parseAmount(text) || extractAmount(text);

  // Fill in amount fields
  if (parsedAmt !== undefined) {
    if (awaiting.includes('amount')) entities.amount = parsedAmt;
    if (awaiting.includes('goalAmount')) entities.goalAmount = parsedAmt;
    if (awaiting.includes('budgetLimit')) entities.budgetLimit = parsedAmt;
  }

  // Fill in category / name fields
  if (awaiting.includes('category')) {
    const category = detectCategory(text);
    if (category) {
      entities.category = category;
    } else {
      entities.category = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      if (!entities.description) entities.description = text;
    }
  }

  if (awaiting.includes('goalName')) {
    entities.goalName = detectCategory(text) || text;
  }

  if (awaiting.includes('budgetCategory')) {
    entities.budgetCategory = detectCategory(text) || text;
  }

  if (awaiting.includes('description')) {
    entities.description = text;
  }

  const intentType = pending.type as IntentType || 'conversation';
  const missingFields = getMissingFields(intentType, entities);

  return {
    type: intentType,
    confidence: 0.95,
    entities,
    rawText: text,
    needsFollowUp: missingFields.length > 0,
    missingFields,
  };
}

// ─── Follow-up Question Generator ────────────────────────────────────────────

/** Generate a conversational follow-up question for missing fields */
export function getFollowUpQuestion(intent: ParsedIntent): string {
  const missing = intent.missingFields || [];
  const first = missing[0];

  switch (first) {
    case 'amount':
      if (intent.entities.category && intent.entities.category.length < 25 && !/\b(?:show|what|how|any|check|my|the|this)\b/i.test(intent.entities.category)) {
        return `How much was the ${intent.entities.category.toLowerCase()}?`;
      }
      return 'How much was it?';

    case 'category':
      if (intent.entities.amount !== undefined) {
        return `What was the ₦${intent.entities.amount.toLocaleString()} for?`;
      }
      return 'What was it for?';

    case 'description':
      return 'Any details you\'d like to add?';

    case 'budgetCategory':
      return 'Which category would you like to set a budget for?';

    case 'budgetLimit':
      return 'What should the monthly limit be?';

    case 'goalName':
      return 'What are you saving for?';

    case 'goalAmount':
      return `How much do you need to save for ${intent.entities.goalName || 'your goal'}?`;

    default:
      return 'Could you tell me more?';
  }
}
