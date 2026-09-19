import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Zap,
  MessageSquare,
  Receipt,
  PiggyBank,
  Wallet,
  Search,
  Trash2,
  ArrowRightLeft,
  Brain,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

// ─── Example Command Data ────────────────────────────────────────────────────

interface ExampleCommand {
  text: string;
}

interface CommandSection {
  title: string;
  icon: React.ReactNode;
  description: string;
  examples: ExampleCommand[];
  color: string; // Tailwind gradient classes
}

const COMMAND_SECTIONS: CommandSection[] = [
  {
    title: 'Log Expenses',
    icon: <Receipt className="w-5 h-5" />,
    description: 'Tell Lucent what you spent and it will log it for you.',
    color: 'from-rose-500/10 to-orange-500/10 border-rose-500/20',
    examples: [
      { text: 'I spent ₦3,500 on transport' },
      { text: '₦1,200 for lunch' },
      { text: 'Bought data for ₦2,000' },
      { text: 'Paid ₦5,000 electricity bill' },
      { text: '₦800 on snacks today' },
    ],
  },
  {
    title: 'Log Income',
    icon: <Wallet className="w-5 h-5" />,
    description: 'Tell Lucent when you earn money.',
    color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
    examples: [
      { text: 'Add ₦50,000 salary' },
      { text: 'Received ₦15,000 freelance payment' },
      { text: 'Got ₦5,000 from side hustle' },
      { text: '₦20,000 income from tutoring' },
    ],
  },
  {
    title: 'Savings Goals',
    icon: <PiggyBank className="w-5 h-5" />,
    description: 'Create savings goals and add money to them.',
    color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
    examples: [
      { text: 'Create a savings goal called Laptop' },
      { text: 'Save ₦10,000 for emergency fund' },
      { text: 'Add ₦5,000 to my Vacation goal' },
      { text: 'How much have I saved this month?' },
    ],
  },
  {
    title: 'Budgets',
    icon: <Wallet className="w-5 h-5" />,
    description: 'Set monthly spending limits for different categories.',
    color: 'from-amber-500/10 to-yellow-500/10 border-amber-500/20',
    examples: [
      { text: 'Create a ₦30,000 budget for food' },
      { text: 'Set transport budget to ₦15,000' },
      { text: 'Show my budget status' },
      { text: 'Any budget exceeded?' },
    ],
  },
  {
    title: 'Check Your Finances',
    icon: <Search className="w-5 h-5" />,
    description: 'Ask questions about your money.',
    color: 'from-violet-500/10 to-purple-500/10 border-violet-500/20',
    examples: [
      { text: "What's my balance?" },
      { text: 'How much did I spend this month?' },
      { text: 'Show my recent transactions' },
      { text: 'How am I doing financially?' },
    ],
  },
  {
    title: 'Manage Transactions',
    icon: <ArrowRightLeft className="w-5 h-5" />,
    description: 'Edit or remove past transactions.',
    color: 'from-cyan-500/10 to-sky-500/10 border-cyan-500/20',
    examples: [
      { text: 'Delete my last transaction' },
      { text: 'Move this transaction to Food' },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const LucentGuide: React.FC = () => {
  const navigate = useNavigate();

  const handleExampleTap = (text: string) => {
    navigate('/chat');
    // Dispatch event after a brief delay to allow the chat page to mount
    setTimeout(() => {
      const event = new CustomEvent('lucent:send_message', {
        detail: { message: text },
      });
      window.dispatchEvent(event);
    }, 300);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-bg-base pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-surface/80 backdrop-blur-xl border-b border-border-default/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-full hover:bg-bg-sidebar-hover text-text-secondary hover:text-text-primary transition-colors active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-primary tracking-tight">
                How to Use Lucent Fast
              </h1>
              <p className="text-[10px] text-text-muted">Your quick command guide</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center space-y-3 py-4"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
            <Zap className="w-3 h-3" />
            <span>COMMAND-BASED ASSISTANT</span>
          </div>
          <h2 className="text-xl font-extrabold text-text-primary tracking-tight">
            Talk to your money,<br />the fast way.
          </h2>
          <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
            Lucent Fast is not AI. It's a smart command assistant that reads what you type and performs actions inside the app — instantly and accurately.
          </p>
        </motion.div>

        {/* What Lucent Fast Can & Can't Do */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* CAN */}
          <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
            <h3 className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              ✅ It can
            </h3>
            <ul className="space-y-1.5">
              {[
                'Log expenses & income',
                'Create savings goals',
                'Set budgets',
                'Check your balance',
                'Show spending stats',
                'Manage transactions',
              ].map((item) => (
                <li key={item} className="text-[10px] text-text-secondary leading-snug flex items-start gap-1">
                  <span className="text-emerald-500 mt-px">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CAN'T */}
          <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/15 space-y-2">
            <h3 className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              ❌ It can't
            </h3>
            <ul className="space-y-1.5">
              {[
                'Answer general questions',
                'Give financial advice',
                'Hold open conversations',
                'Understand complex sentences',
                'Predict future spending',
                'Browse the internet',
              ].map((item) => (
                <li key={item} className="text-[10px] text-text-secondary leading-snug flex items-start gap-1">
                  <span className="text-rose-500 mt-px">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Tips Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-brand-primary/5 to-amber-500/5 border border-brand-primary/10 space-y-2"
        >
          <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-brand-primary" />
            How to phrase your commands
          </h3>
          <ul className="space-y-1.5 text-[11px] text-text-secondary leading-snug">
            <li className="flex items-start gap-1.5">
              <span className="text-brand-primary font-bold mt-px">1.</span>
              <span><strong>Be direct</strong> — say what you want in a simple sentence.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-brand-primary font-bold mt-px">2.</span>
              <span><strong>Include the amount</strong> with the ₦ symbol or just the number.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-brand-primary font-bold mt-px">3.</span>
              <span><strong>Mention the category</strong> like food, transport, or rent.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-brand-primary font-bold mt-px">4.</span>
              <span><strong>One action at a time</strong> works best, but multi-actions work too!</span>
            </li>
          </ul>
        </motion.div>

        {/* AI Models Note */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-violet-500/5 to-indigo-500/5 border border-violet-500/10 space-y-2"
        >
          <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-violet-500" />
            Want more flexibility? Use an AI model
          </h3>
          <p className="text-[11px] text-text-secondary leading-snug">
            Switch to an AI model (like Gemma, LLaMA, or SmolLM) from the model selector for natural conversations. AI understands your intent — even vague or complex sentences — and still shows you a confirmation before saving anything.
          </p>
          <div className="flex items-center gap-1 pt-1">
            <Sparkles className="w-3 h-3 text-violet-500" />
            <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">AI understands. Lucent Fast executes.</span>
          </div>
        </motion.div>

        {/* Command Sections */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Example Commands — Tap to try
          </h3>

          {COMMAND_SECTIONS.map((section, sectionIdx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 + sectionIdx * 0.04 }}
              className={`p-3.5 rounded-2xl bg-gradient-to-br ${section.color} border space-y-2.5`}
            >
              <div className="flex items-center gap-2">
                <div className="text-text-primary">{section.icon}</div>
                <div>
                  <h4 className="text-xs font-bold text-text-primary">{section.title}</h4>
                  <p className="text-[10px] text-text-muted">{section.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {section.examples.map((ex) => (
                  <button
                    key={ex.text}
                    type="button"
                    onClick={() => handleExampleTap(ex.text)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-bg-surface/80 hover:bg-bg-surface border border-border-default/60 text-[10px] font-medium text-text-primary transition-all active:scale-95 shadow-xs hover:shadow-sm group"
                  >
                    <span>"{ex.text}"</span>
                    <ChevronRight className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LucentGuide;
