# EXPENDX — PREMIUM FINTECH UI REDESIGN
## Master System Prompt for AI Code Editor

---

## MISSION

You are tasked with a complete visual overhaul of the **ExpendiX** personal finance app. The goal is to transform it from a functional prototype into a premium-tier fintech product — one that communicates stability, institutional confidence, and financial authority at first glance. The visual target is the design language of **Revolut (dark mode)**, **N26**, and **Mercury Bank**: restrained, data-forward, and deeply intentional.

This is a **UI-only** operation. Every change is exclusively visual. Do not touch any business logic, state management, hooks, API calls, navigation routing, component prop interfaces, event handlers, or data flow. You will modify only: CSS files, style objects, style class names, colour values, font references, spacing values, border-radius values, shadow definitions, layout/flexbox/grid rules, and animation/transition values.

---

## CRITICAL CONSTRAINTS

```
❌ DO NOT TOUCH:  business logic · state management · hooks · API calls
                  routing · component names · prop types · event handlers
                  data fetching · authentication · localStorage/AsyncStorage

✅ ONLY MODIFY:   CSS · StyleSheets · className values · theme/token files
                  colour values · typography · spacing · layout · animations
```

All visual changes must flow from the design token file. **Never hardcode a colour, font size, or spacing value directly in a component.** All new components added in the future must inherit the token system automatically.

---

## DESIGN PHILOSOPHY

**"Institutional Restraint"** — The apps people trust with their money look calm because they are calm. This redesign follows five laws:

1. **Dark-first** — Deep navy-black base (`#070C14`), never pure `#000000`. Pure black looks unfinished; deep navy looks engineered.
2. **Number-forward** — Financial figures are the headline of every screen. Typography, spacing, and hierarchy exist solely to serve the numbers.
3. **Elevation through background stepping** — Depth is created by background colour layers, not box-shadows. Shadows are used only for floating elements.
4. **Semantic colour discipline** — Green = income/healthy. Red = expense/danger. Orange = brand identity. Blue = informational. These associations are locked and consistent across every screen, forever.
5. **Confident whitespace** — Crowded layouts signal a cheap product. Generous padding signals financial trustworthiness.

---

## STEP 1 — ESTABLISH THE DESIGN TOKEN SYSTEM

> **This is the most important step.** Do it first before touching any component. Everything else references these tokens.

Create (or fully replace) the following files. These are the single source of truth for all visual decisions.

### A. `src/styles/tokens.css` (for web/React PWA)

```css
/* =====================================================================
   EXPENDX DESIGN SYSTEM — GLOBAL TOKENS v2.0
   Source of truth for all visual decisions.
   Import this FIRST in your root index.css or App.css.
   ===================================================================== */

@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap');

:root {

  /* ─────────────────────────────────────────────────────
     BACKGROUNDS — Layered elevation. Never use pure black.
     Each step is visually distinct. Cards float on surface.
     Modals float above cards. Tooltips float above modals.
     ───────────────────────────────────────────────────── */
  --bg-base:        #070C14;   /* Root app background                */
  --bg-surface:     #0D1421;   /* Page-level panels, section areas   */
  --bg-card:        #111C2D;   /* Primary cards, list containers     */
  --bg-elevated:    #172538;   /* Modals, selected/active cards      */
  --bg-overlay:     #1C2D42;   /* Dropdowns, tooltips                */
  --bg-input:       rgba(255, 255, 255, 0.04);
  --bg-hover:       rgba(255, 255, 255, 0.035);
  --bg-active:      rgba(255, 255, 255, 0.07);

  /* ─────────────────────────────────────────────────────
     BORDERS — Whisper-thin, layered like watercolours.
     ───────────────────────────────────────────────────── */
  --border-faint:   rgba(255, 255, 255, 0.035);
  --border-subtle:  rgba(255, 255, 255, 0.065);
  --border-default: rgba(255, 255, 255, 0.10);
  --border-strong:  rgba(255, 255, 255, 0.17);

  /* ─────────────────────────────────────────────────────
     TEXT COLOURS
     ───────────────────────────────────────────────────── */
  --text-primary:    #E6EEFF;   /* Headings, amounts, primary content */
  --text-secondary:  #627899;   /* Labels, subtext, descriptions      */
  --text-muted:      #3C5068;   /* Timestamps, placeholders, disabled */
  --text-inverted:   #070C14;   /* Text on light/brand backgrounds    */

  /* ─────────────────────────────────────────────────────
     BRAND — ExpendiX orange identity, kept but refined.
     ───────────────────────────────────────────────────── */
  --brand:           #FF6B2B;
  --brand-hover:     #FF7F47;
  --brand-subtle:    rgba(255, 107, 43, 0.10);
  --brand-border:    rgba(255, 107, 43, 0.22);
  --brand-glow:      rgba(255, 107, 43, 0.14);

  /* ─────────────────────────────────────────────────────
     SEMANTIC COLOURS — Locked. Never repurpose these.
     ───────────────────────────────────────────────────── */

  /* SUCCESS — Income, on-track budgets, met goals */
  --success:         #0B9E6E;
  --success-text:    #29D4A0;
  --success-bg:      rgba(11, 158, 110, 0.09);
  --success-border:  rgba(41, 212, 160, 0.17);

  /* DANGER — Expenses, budget breaches, alerts */
  --danger:          #C93030;
  --danger-text:     #F47777;
  --danger-bg:       rgba(201, 48, 48, 0.09);
  --danger-border:   rgba(244, 119, 119, 0.17);

  /* WARNING — Budget nearing limit (61–85% used) */
  --warning:         #C97A06;
  --warning-text:    #F5B942;
  --warning-bg:      rgba(201, 122, 6, 0.09);
  --warning-border:  rgba(245, 185, 66, 0.17);

  /* INFO — Sync status, informational states */
  --info:            #1D5FD4;
  --info-text:       #5A9BF5;
  --info-bg:         rgba(29, 95, 212, 0.09);
  --info-border:     rgba(90, 155, 245, 0.17);

  /* ─────────────────────────────────────────────────────
     TYPOGRAPHY
     Primary:  DM Sans     — UI body text, labels, buttons
     Display:  Manrope     — Page titles, balance hero
     Mono:     DM Mono     — Financial amounts, account IDs
     ───────────────────────────────────────────────────── */
  --font-sans:     'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-display:  'Manrope', 'DM Sans', sans-serif;
  --font-mono:     'DM Mono', 'SF Mono', ui-monospace, monospace;

  /* Size scale */
  --text-2xs:    10px;
  --text-xs:     11px;
  --text-sm:     12px;
  --text-base:   14px;
  --text-md:     15px;
  --text-lg:     16px;
  --text-xl:     18px;
  --text-2xl:    22px;
  --text-3xl:    28px;
  --text-4xl:    36px;
  --text-5xl:    48px;
  --text-6xl:    58px;

  /* Weights */
  --weight-regular:    400;
  --weight-medium:     500;
  --weight-semibold:   600;
  --weight-bold:       700;
  --weight-extrabold:  800;

  /* Letter-spacing — tight for financial figures, open for labels */
  --tracking-tightest:  -0.04em;   /* Balance hero number             */
  --tracking-tight:     -0.025em;  /* Page titles, large amounts      */
  --tracking-snug:      -0.015em;  /* Card headings                   */
  --tracking-normal:    -0.005em;  /* Body text                       */
  --tracking-wide:       0.04em;   /* Uppercase UI labels             */
  --tracking-widest:     0.09em;   /* Section caps (DATE, BUDGET…)    */

  /* ─────────────────────────────────────────────────────
     SPACING — 4px base grid. Use multiples only.
     ───────────────────────────────────────────────────── */
  --space-1:   4px;    --space-2:   8px;    --space-3:   12px;
  --space-4:   16px;   --space-5:   20px;   --space-6:   24px;
  --space-7:   28px;   --space-8:   32px;   --space-10:  40px;
  --space-12:  48px;   --space-16:  64px;   --space-20:  80px;

  /* ─────────────────────────────────────────────────────
     BORDER RADIUS
     ───────────────────────────────────────────────────── */
  --radius-xs:    4px;
  --radius-sm:    8px;
  --radius-md:    12px;
  --radius-lg:    16px;
  --radius-xl:    20px;
  --radius-2xl:   24px;
  --radius-pill:  9999px;

  /* Semantic aliases — use these in components */
  --radius-card:        var(--radius-lg);    /* 16px — primary cards       */
  --radius-card-inner:  var(--radius-md);    /* 12px — inner card sections */
  --radius-button:      var(--radius-md);    /* 12px — standard buttons    */
  --radius-button-pill: var(--radius-pill);  /* — filter/tag buttons       */
  --radius-input:       var(--radius-md);    /* 12px — inputs              */
  --radius-badge:       6px;                 /* — status badges            */
  --radius-chip:        var(--radius-sm);    /* 8px — category chips       */
  --radius-modal:       var(--radius-2xl);   /* 24px — bottom sheets       */
  --radius-icon-box:    var(--radius-sm);    /* 8px — icon containers      */

  /* ─────────────────────────────────────────────────────
     SHADOWS — Sparingly. Prefer bg steps for depth.
     ───────────────────────────────────────────────────── */
  --shadow-sm:      0 1px 3px rgba(0, 0, 0, 0.45);
  --shadow-card:    0 4px 20px rgba(0, 0, 0, 0.40),
                    0 0 0 1px var(--border-subtle);
  --shadow-elevated:0 8px 32px rgba(0, 0, 0, 0.55),
                    0 0 0 1px var(--border-default);
  --shadow-modal:   0 16px 60px rgba(0, 0, 0, 0.75),
                    0 0 0 1px var(--border-default);
  --shadow-fab:     0 4px 18px rgba(0, 0, 0, 0.55),
                    0 0 0 1px rgba(255, 255, 255, 0.10);

  /* ─────────────────────────────────────────────────────
     MOTION
     ───────────────────────────────────────────────────── */
  --ease-spring:   cubic-bezier(0.16, 1, 0.3, 1);
  --ease-smooth:   cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out:      cubic-bezier(0, 0, 0.2, 1);
  --dur-fast:      110ms;
  --dur-base:      200ms;
  --dur-slow:      360ms;
  --dur-enter:     320ms;
}
```

---

### B. `src/theme/tokens.ts` (for React Native)

```typescript
// src/theme/tokens.ts
// Mirror of tokens.css for React Native StyleSheet usage.
// Import { tokens } everywhere instead of hardcoding values.

export const tokens = {
  colors: {
    // Backgrounds
    bgBase:        '#070C14',
    bgSurface:     '#0D1421',
    bgCard:        '#111C2D',
    bgElevated:    '#172538',
    bgOverlay:     '#1C2D42',
    bgInput:       'rgba(255,255,255,0.04)',
    bgHover:       'rgba(255,255,255,0.035)',
    bgActive:      'rgba(255,255,255,0.07)',
    // Borders
    borderFaint:   'rgba(255,255,255,0.035)',
    borderSubtle:  'rgba(255,255,255,0.065)',
    borderDefault: 'rgba(255,255,255,0.10)',
    borderStrong:  'rgba(255,255,255,0.17)',
    // Text
    textPrimary:   '#E6EEFF',
    textSecondary: '#627899',
    textMuted:     '#3C5068',
    textInverted:  '#070C14',
    // Brand
    brand:         '#FF6B2B',
    brandHover:    '#FF7F47',
    brandSubtle:   'rgba(255,107,43,0.10)',
    brandBorder:   'rgba(255,107,43,0.22)',
    brandGlow:     'rgba(255,107,43,0.14)',
    // Semantic
    success:       '#0B9E6E',  successText:  '#29D4A0',
    successBg:     'rgba(11,158,110,0.09)',
    successBorder: 'rgba(41,212,160,0.17)',
    danger:        '#C93030',  dangerText:   '#F47777',
    dangerBg:      'rgba(201,48,48,0.09)',
    dangerBorder:  'rgba(244,119,119,0.17)',
    warning:       '#C97A06',  warningText:  '#F5B942',
    warningBg:     'rgba(201,122,6,0.09)',
    warningBorder: 'rgba(245,185,66,0.17)',
    info:          '#1D5FD4',  infoText:     '#5A9BF5',
    infoBg:        'rgba(29,95,212,0.09)',
    infoBorder:    'rgba(90,155,245,0.17)',
  },
  spacing: {
    1: 4,  2: 8,  3: 12,  4: 16,  5: 20,
    6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
  },
  radius: {
    xs: 4,  sm: 8,   md: 12,  lg: 16,
    xl: 20, '2xl': 24, pill: 999,
    card: 16, cardInner: 12, button: 12,
    input: 12, badge: 6, chip: 8, modal: 24,
  },
  typography: {
    fontDisplay:  'Manrope',
    fontSans:     'DMSans',
    fontMono:     'DMMono',
    sizes: {
      xs: 11, sm: 12, base: 14, md: 15, lg: 16,
      xl: 18, '2xl': 22, '3xl': 28, '4xl': 36, '5xl': 48,
    },
    weights: {
      regular: '400', medium: '500', semibold: '600',
      bold: '700',    extrabold: '800',
    },
  },
} as const;

export type Tokens = typeof tokens;
```

---

### C. `tailwind.config.js` (if using Tailwind CSS)

```javascript
// Extend your existing tailwind.config.js with these additions:
module.exports = {
  theme: {
    extend: {
      colors: {
        'bg-base':     '#070C14',
        'bg-surface':  '#0D1421',
        'bg-card':     '#111C2D',
        'bg-elevated': '#172538',
        brand:         '#FF6B2B',
        'brand-hover': '#FF7F47',
        'success-text':'#29D4A0',
        'danger-text': '#F47777',
        'warning-text':'#F5B942',
        'text-primary':   '#E6EEFF',
        'text-secondary': '#627899',
        'text-muted':     '#3C5068',
      },
      fontFamily: {
        sans:    ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Manrope', 'DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'SF Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '16px', 'card-inner': '12px',
        modal: '24px', badge: '6px', chip: '8px',
      },
    },
  },
};
```

---

## STEP 2 — GLOBAL BASE STYLES

Replace or augment your `src/styles/globals.css` with the following. This sets the baseline that every component inherits:

```css
/* =====================================================================
   GLOBAL BASE STYLES — src/styles/globals.css
   ===================================================================== */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  background-color: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  font-weight: var(--weight-regular);
  letter-spacing: var(--tracking-normal);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* Prevent text size inflation on mobile */
  -webkit-text-size-adjust: 100%;
}

/* ── SCROLLBARS — invisible but functional ── */
* { scrollbar-width: none; -ms-overflow-style: none; }
*::-webkit-scrollbar { display: none; }

/* ── FINANCIAL NUMBERS — always tabular, no column-width jitter ── */
.amount,
[class*="amount"],
[class*="balance"],
[class*="currency"],
[data-type="amount"] {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: var(--tracking-tight);
  font-feature-settings: 'tnum' 1, 'ss01' 1;
}

/* ── TYPOGRAPHY UTILITY CLASSES ── */

.font-display { font-family: var(--font-display); }
.font-mono    { font-family: var(--font-mono); }

/* Balance hero — the largest number on the Home screen */
.text-balance-hero {
  font-family: var(--font-display);
  font-size: var(--text-5xl);
  font-weight: var(--weight-extrabold);
  letter-spacing: var(--tracking-tightest);
  color: var(--text-primary);
  line-height: 1.0;
  font-variant-numeric: tabular-nums;
}

/* Page title */
.text-page-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--weight-extrabold);
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
  line-height: 1.1;
}

/* Section heading */
.text-section-title {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-snug);
  color: var(--text-primary);
}

/* UPPERCASE label — dates, section dividers, field labels */
.text-label-caps {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-muted);
}

/* Large card amount */
.text-card-amount {
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
  font-variant-numeric: tabular-nums;
}
```

---

## STEP 3 — CORE COMPONENT PATTERNS

Apply these patterns globally. Every component that uses these visual patterns must reference the shared classes or token values — never re-implement them locally.

### 3.1 — Cards

```css
/* Base card — primary surface for all content blocks */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-card);
  padding: var(--space-5);
  position: relative;
  overflow: hidden;
}

/* Elevated card — modals, selected states, overlays */
.card-elevated {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  padding: var(--space-5);
}

/* Hero card — full-width feature cards (e.g., Balance card on Home) */
.card-hero {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  padding: var(--space-6);
  /* Subtle noise texture for premium feel */
  background-image:
    radial-gradient(ellipse at 80% 20%, rgba(255,107,43,0.06) 0%, transparent 60%),
    radial-gradient(ellipse at 20% 80%, rgba(29,95,212,0.04) 0%, transparent 60%);
}

/* Tinted card variants */
.card-success {
  background: var(--success-bg);
  border: 1px solid var(--success-border);
  border-radius: var(--radius-card);
}
.card-danger {
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-card);
}
.card-brand {
  background: var(--brand-subtle);
  border: 1px solid var(--brand-border);
  border-radius: var(--radius-card);
}
```

### 3.2 — Buttons

```css
/* Base button reset + shared styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 48px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-button);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  letter-spacing: -0.01em;
  cursor: pointer;
  border: none;
  outline: none;
  white-space: nowrap;
  transition:
    background var(--dur-fast) var(--ease-spring),
    transform   var(--dur-fast) var(--ease-spring),
    opacity     var(--dur-fast) var(--ease-smooth);
  -webkit-tap-highlight-color: transparent;
}
.btn:active { transform: scale(0.97); }

/* PRIMARY — Brand orange, high emphasis actions */
.btn-primary {
  background: var(--brand);
  color: #fff;
}
.btn-primary:hover  { background: var(--brand-hover); }

/* OUTLINE — Medium emphasis, secondary actions */
.btn-outline {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}
.btn-outline:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

/* GHOST — Low emphasis, tertiary/destructive */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}
.btn-ghost:hover { background: var(--bg-hover); color: var(--text-primary); }

/* DANGER — Destructive actions */
.btn-danger {
  background: var(--danger-bg);
  color: var(--danger-text);
  border: 1px solid var(--danger-border);
}

/* SIZE MODIFIERS */
.btn-sm {
  height: 36px;
  padding: 0 var(--space-4);
  font-size: var(--text-sm);
  border-radius: var(--radius-chip);
}
.btn-xs {
  height: 28px;
  padding: 0 var(--space-3);
  font-size: var(--text-xs);
  border-radius: var(--radius-badge);
}

/* SHAPE MODIFIER */
.btn-pill { border-radius: var(--radius-pill); }

/* FULL WIDTH */
.btn-block { width: 100%; }
```

### 3.3 — Progress Bars

```css
/* Used on budget cards — thin, refined, no height above 5px */
.progress-track {
  height: 4px;
  background: var(--bg-input);
  border-radius: var(--radius-pill);
  overflow: hidden;
  position: relative;
  margin: var(--space-3) 0;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--brand);
  transition: width var(--dur-slow) var(--ease-spring);
  min-width: 4px; /* Always visible even at 0% */
  position: relative;
}

/* Semantic fill variants — apply via JS based on % used */
.progress-fill.on-track  { background: var(--success); }
.progress-fill.warning   { background: var(--warning); }
.progress-fill.over      { background: var(--danger); }
/* 0–60%: on-track | 61–85%: warning | 86–100%+: over */
```

### 3.4 — Status Badges

```css
/* Compact status indicators — "On track", "Overbudget", etc. */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: var(--radius-badge);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  line-height: 1;
  white-space: nowrap;
}
.badge svg, .badge .badge-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
}

.badge-success {
  color: var(--success-text);
  background: var(--success-bg);
  border: 1px solid var(--success-border);
}
.badge-danger {
  color: var(--danger-text);
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
}
.badge-warning {
  color: var(--warning-text);
  background: var(--warning-bg);
  border: 1px solid var(--warning-border);
}
.badge-brand {
  color: var(--brand-hover);
  background: var(--brand-subtle);
  border: 1px solid var(--brand-border);
}
.badge-info {
  color: var(--info-text);
  background: var(--info-bg);
  border: 1px solid var(--info-border);
}
.badge-neutral {
  color: var(--text-secondary);
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
}
```

### 3.5 — Input Fields

```css
.input-field {
  width: 100%;
  height: 48px;
  padding: 0 var(--space-4);
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  outline: none;
  transition:
    border-color var(--dur-fast) var(--ease-smooth),
    background   var(--dur-fast) var(--ease-smooth);
  -webkit-appearance: none;
}
.input-field:focus {
  border-color: var(--brand-border);
  background: rgba(255, 107, 43, 0.04);
}
.input-field::placeholder { color: var(--text-muted); }

/* Search input variant */
.input-search {
  height: 44px;
  padding: 0 var(--space-4) 0 var(--space-10);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  color: var(--text-primary);
  outline: none;
  width: 100%;
}
.input-search:focus { border-color: var(--border-default); }
.input-search::placeholder { color: var(--text-muted); }
```

### 3.6 — Transaction List Item

```css
/* The core repeating element across Transactions + Home screens */
.txn-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-card-inner);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-spring);
  position: relative;
}
.txn-item:hover, .txn-item:active { background: var(--bg-hover); }

/* Category icon container */
.txn-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  /* background-color set per category in JS */
}

.txn-body { flex: 1; min-width: 0; }

.txn-name {
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.txn-sub {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: 2px;
}

/* Right-side amount + metadata */
.txn-right { text-align: right; flex-shrink: 0; }

.txn-amount {
  font-family: var(--font-mono);
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  font-variant-numeric: tabular-nums;
  letter-spacing: var(--tracking-tight);
  display: block;
}
.txn-amount.income  { color: var(--success-text); }
.txn-amount.expense { color: var(--danger-text); }
.txn-amount.neutral { color: var(--text-secondary); }

.txn-type-label {
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-muted);
  margin-top: 3px;
  display: block;
}

/* Date-group header separators */
.date-group-header {
  padding: var(--space-5) var(--space-5) var(--space-2);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.date-group-label {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--text-muted);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
}
.date-group-summary { font-size: var(--text-sm); color: var(--text-muted); }
```

### 3.7 — Toggle Switch

```css
/* Custom toggle — replaces any default checkbox/switch */
.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.toggle-track {
  position: relative;
  width: 48px;
  height: 28px;
  background: var(--border-default);
  border-radius: var(--radius-pill);
  flex-shrink: 0;
  transition: background var(--dur-base) var(--ease-smooth);
  cursor: pointer;
}
.toggle-track.active { background: var(--brand); }

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0,0,0,0.45);
  transition: transform var(--dur-base) var(--ease-spring);
}
.toggle-track.active .toggle-thumb { transform: translateX(20px); }
```

### 3.8 — Settings Row

```css
/* Used in Settings, Notifications, and More pages */
.settings-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-card-inner);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-spring);
  -webkit-tap-highlight-color: transparent;
}
.settings-row:hover { background: var(--bg-hover); }
.settings-row:active { background: var(--bg-active); }

.settings-icon-box {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-icon-box);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.settings-row-body { flex: 1; min-width: 0; }
.settings-row-label {
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
}
.settings-row-sub {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: 2px;
}

.settings-chevron {
  color: var(--text-muted);
  margin-left: auto;
  flex-shrink: 0;
}
```

### 3.9 — Bottom Sheet / Modal

```css
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.70);
  backdrop-filter: blur(4px);
  z-index: 200;
}

.sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-elevated);
  border-radius: var(--radius-modal) var(--radius-modal) 0 0;
  border: 1px solid var(--border-default);
  border-bottom: none;
  padding: var(--space-2) var(--space-6) var(--space-8);
  z-index: 201;
  box-shadow: var(--shadow-modal);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--border-default);
  border-radius: var(--radius-pill);
  margin: var(--space-3) auto var(--space-6);
}

.sheet-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-snug);
  color: var(--text-primary);
  margin-bottom: var(--space-6);
}
```

---

## STEP 4 — APP HEADER & BOTTOM NAVIGATION

### App Header (global, appears on all pages)

```css
.app-header {
  height: 56px;
  padding: 0 var(--space-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  position: sticky;
  top: 0;
  z-index: 100;
  /* Transparent at top, blurs when scrolled — apply via scroll JS */
}
.app-header.scrolled {
  background: rgba(7, 12, 20, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-faint);
}

/* "BETA" badge next to logo */
.header-beta-badge {
  font-size: var(--text-2xs);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--brand-hover);
  background: var(--brand-subtle);
  border: 1px solid var(--brand-border);
  padding: 2px 6px;
  border-radius: var(--radius-badge);
  margin-left: var(--space-2);
  vertical-align: middle;
}

/* Avatar button (top right) */
.header-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: var(--weight-extrabold);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid var(--brand-border);
}

.header-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  margin-right: var(--space-2);
  transition: background var(--dur-fast) var(--ease-spring);
}
.header-icon-btn:hover { background: var(--bg-elevated); }
```

### Bottom Navigation

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: rgba(7, 12, 20, 0.94);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 var(--space-2);
  z-index: 400;
  /* Add safe-area-inset for iPhone home bar */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: var(--space-2) var(--space-4);
  color: var(--text-muted);
  font-size: var(--text-2xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  cursor: pointer;
  transition:
    color     var(--dur-fast) var(--ease-spring),
    transform var(--dur-fast) var(--ease-spring);
  -webkit-tap-highlight-color: transparent;
}
.nav-item:active { transform: scale(0.92); }
.nav-item.active { color: var(--brand); }
.nav-item.active svg { stroke: var(--brand); }

/* The floating action button */
.nav-fab {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--text-primary);
  color: var(--bg-base);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-fab);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-spring);
  flex-shrink: 0;
  margin-top: -6px; /* Lift it slightly above the nav bar */
}
.nav-fab:active { transform: scale(0.9) rotate(45deg); }
```

---

## STEP 5 — PAGE-BY-PAGE REDESIGN SPECIFICATIONS

> Apply to every screen. Reference the component patterns from Step 3 throughout.

---

### 5.1 — HOME SCREEN

**Layout: vertically stacked, bottom-padded for nav bar (80px)**

**Balance Hero Card** — use `.card-hero` class
- Top row (flex, space-between): `TOTAL BALANCE` label (`.text-label-caps`) + eye icon (text-muted) on left; streak flame + notification bell on right
- Streak button: `var(--brand-subtle)` bg, `var(--brand-border)` border, `border-radius: var(--radius-pill)`, compact (28px height)
- Balance number: `.text-balance-hero` — this is the most important element on screen. Make it breathe.
- Decimal part (`.00`): same font/weight but `font-size: var(--text-3xl)`, `color: var(--text-secondary)` — visually recedes
- Account ID below balance: `font-family: var(--font-mono)`, `font-size: var(--text-xs)`, `color: var(--text-muted)` + small "Copy" badge
- Bottom divider row: Net income chip (`.badge-success` or `.badge-danger` based on value) + `ACTIVE ACCOUNT` label right-aligned

**Income / Expenses Cards** — side-by-side flex row, gap `var(--space-3)`
- Each: `.card` with 50% width
- Icon: 32px circle; income = `var(--success-bg)` + `var(--success-text)` icon; expense = `var(--danger-bg)` + `var(--danger-text)` icon
- Label: `.text-label-caps` ("INCOME" / "EXPENSES")
- Amount: `.text-card-amount`, coloured (success-text / danger-text)
- Sub: "X% of target" in `var(--text-muted)`, `font-size: var(--text-sm)`

**Quick Actions Row** — horizontal scroll or fixed 4-grid
- Each item: icon in 44px circle (`var(--bg-surface)`, `var(--border-subtle)`) + label below (`font-size: var(--text-xs)`, `color: var(--text-secondary)`)
- Active/current page item: icon bg → `var(--brand-subtle)`, icon color → `var(--brand)`

**Recent Transactions Section**
- Section header: `.text-section-title` ("Transactions") + "see all" link (`var(--brand)`, `font-size: var(--text-sm)`, `font-weight: var(--weight-semibold)`)
- List: `.txn-item` per transaction (use category icon with soft background tint)

**Spending by Category Card** — `.card`, full-width
- Title row: `Spending by Category` + expand icon (text-muted)
- Chart area: maintain existing chart component; update axis/label colours to `var(--text-muted)`, gridlines to `var(--border-faint)`
- Legend dots: use semantic colours

**Daily Income & Expenses Card** — `.card`, full-width
- Week navigator: `< WEEK OF [DATE] >` in text-muted
- Chart legend: income dot = `var(--success-text)`, expense dot = `var(--danger-text)`

---

### 5.2 — TRANSACTIONS SCREEN

**Page header** — `Budgets` → use `.text-page-title`

**Action buttons row**
- `↑ Import` → `.btn .btn-outline .btn-sm .btn-pill`
- `+ Add` → `.btn .btn-primary .btn-sm .btn-pill`
- Syncing indicator: `.badge-info` + spinner icon

**Search bar** — `.input-search` with search icon (text-muted, 16px, `left: 14px, top: 50%`)

**Filter row** (All Types + Categories + Select)
- "All Types" dropdown: `.btn-outline .btn-sm` with chevron; bg `var(--bg-card)`, border `var(--border-default)`
- "Categories" filter pill: same pattern
- "Select" button: `.btn-ghost .btn-sm`

**Date Groups** — `.date-group-header`
- Date label: `.date-group-label` (e.g., "WEDNESDAY, MAY 6")
- Month summary line: `In: ₦X Out: ₦Y` — small text-muted

**Transaction Items** — `.txn-item`
- Category icon backgrounds: consistent tinted circles per category type
  - Food/Groceries: `rgba(245, 185, 66, 0.15)` tint, amber icon
  - Transport: `rgba(90, 155, 245, 0.15)` tint, blue icon
  - Airtime/Data: `rgba(41, 212, 160, 0.15)` tint, teal icon
  - Income/Freelance: `var(--success-bg)`, success icon
  - Shopping: `rgba(244, 119, 119, 0.15)` tint, red icon
  - Transfers: `var(--border-subtle)` tint, neutral icon

---

### 5.3 — BUDGETS SCREEN

**Page header** — `.text-page-title` ("Budgets")

**Action buttons**
- `$ Set Income` → `.btn .btn-outline .btn-sm .btn-pill`
- `+ Add Budget` → `.btn .btn-primary .btn-sm .btn-pill`

**Total Budget Summary Card** — `.card-brand` (orange-tinted)
- Left: Icon in 52px circle, `var(--brand-subtle)` bg, brand-coloured chart/trend icon
- Right: `Total Budget` label (`.text-label-caps`) + amount (`font-size: var(--text-4xl)`, `font-family: var(--font-mono)`, `font-weight: var(--weight-extrabold)`, `color: var(--brand)`)

**Individual Budget Cards** — `.card`
- Header row: Category name (`font-size: var(--text-lg)`, `font-weight: var(--weight-bold)`) + edit icon (`color: var(--text-muted)`) + delete icon (`color: var(--danger-text)`)
- Budget row: "Budget:" label (`color: var(--text-secondary)`) + amount (`.font-mono`, right-aligned, `color: var(--text-primary)`)
- Progress bar: `.progress-track` + `.progress-fill` (colour driven by % used — see Step 3.3)
- Status badge: `.badge-success` ("✓ On track") or `.badge-warning` ("⚠ Near limit") or `.badge-danger` ("! Over budget")
- Footer row: "X% used" (`color: var(--text-muted)`, `font-size: var(--text-sm)`) + "₦Y remaining" (`color: var(--text-secondary)`, right-aligned)

---

### 5.4 — SAVINGS SCREEN

**Total Savings Card** — `.card` with subtle success gradient (background-image: `radial-gradient(ellipse at 80% 10%, var(--success-bg) 0%, transparent 60%)`)
- Icon: 52px circle, `var(--success-bg)`, success piggy bank icon
- Label: `Total Savings` (`.text-label-caps`)
- Amount: `.text-balance-hero` scaled to `var(--text-4xl)`, `color: var(--text-primary)`

**Savings Goals Section**
- Header row: `Savings Goals` (`.text-section-title`) + "New Goal" button (`.btn .btn-outline .btn-sm .btn-pill`)
- Subtitle: "Track your progress towards financial goals" (`color: var(--text-secondary)`, `font-size: var(--text-sm)`)
- Stats group: Two rows, each with icon in 36px circle + label + value
  - Icon bg: `var(--bg-surface)`, border `var(--border-subtle)`
  - Label: `.text-label-caps`
  - Value: `font-size: var(--text-2xl)`, `font-weight: var(--weight-bold)`
- Empty state: centred, faded icon (32px, text-muted), text "No savings goals yet" (text-secondary), "+ Add Goal" button

---

### 5.5 — TRENDS SCREEN

**Page header** — with trending-up icon + `.text-page-title` ("Trends") + subtitle (`color: var(--text-secondary)`, `font-size: var(--text-sm)`)

**Filter tab group** (All / Expenses / Income / Savings / Subs)
- Wrapper: `var(--bg-card)` background, `var(--border-subtle)` border, `border-radius: var(--radius-pill)`, `padding: 4px`
- Active tab: `var(--bg-elevated)` bg, `var(--text-primary)` text, `border-radius: var(--radius-pill)`, `font-weight: var(--weight-semibold)`
- Inactive tab: `color: var(--text-secondary)`, hover `color: var(--text-primary)`

**Search + selector list**
- `.input-search` for search
- Checkbox rows: custom checkbox — 18px square, `var(--border-default)` border, checked = `var(--brand)` fill with white checkmark
- "Type" badges: `.badge-neutral`
- "Categories" divider: `.text-label-caps` as section separator
- "0/5 selected" counter: `color: var(--text-muted)`, `font-size: var(--text-xs)`

**Time toggle** (Weekly / Monthly / Yearly)
- Same pill group pattern as filter tabs above

**Chart type toggle** (Line / Bar)
- Same pattern; active = `.btn .btn-primary .btn-sm`; inactive = `.btn-ghost .btn-sm`

---

### 5.6 — MORE MENU (bottom sheet / page)

**Grid of options** — 3-column grid, equal-width cells
- Each cell: centred vertically, `padding: var(--space-4)`, `border-radius: var(--radius-card-inner)`, hover `background: var(--bg-hover)`
- Icon container: 48px circle, `var(--bg-card)`, `var(--border-subtle)` border, icon in `color: var(--text-secondary)`
- Label: `font-size: var(--text-xs)`, `color: var(--text-secondary)`, `margin-top: var(--space-2)`, centred
- Active/highlighted option (e.g., Reports): icon bg → `var(--brand-subtle)`, icon colour → `var(--brand)`, label → `var(--brand-hover)`

---

### 5.7 — SETTINGS / PROFILE SCREEN

**Profile header section** — centred
- Avatar circle: 72px, `var(--bg-elevated)`, `var(--border-default)` border, 2px; person icon `color: var(--text-secondary)`
- Username: `font-family: var(--font-display)`, `font-size: var(--text-xl)`, `font-weight: var(--weight-bold)`, `color: var(--text-primary)`
- Email: `font-size: var(--text-sm)`, `color: var(--text-secondary)`

**Settings groups** — each group has:
- Group label: `.text-label-caps` with `margin: var(--space-5) 0 var(--space-2) var(--space-5)`
- Items: `.settings-row`
- Dividers between items: `1px solid var(--border-faint)` (or use border-radius on rows instead)

**Notification Centre row** — expandable `.settings-row`
- "AI Configured" badge: `.badge-info` right-aligned before chevron

**Smart Alert Channel toggles**
- Each item: `.settings-row` with `.toggle-track` instead of chevron
- Item icon: unique per alert type with contextual colour
  - Critical Alerts: danger-tinted icon box
  - Consistency Nudges: brand-tinted icon box
  - Bill Reminders: info-tinted icon box
- "Scheduled for" row: `color: var(--text-secondary)`, time badge aligned right (`.badge-neutral`)

---

### 5.8 — STREAK MODAL

```
Layout: .sheet over .sheet-backdrop
```

**Header row** — flame icon (32px, `color: var(--brand)`, `background: var(--brand-subtle)`, circle container) + `"4 Day Streak!"` (`font-family: var(--font-display)`, `font-size: var(--text-2xl)`, `font-weight: var(--weight-extrabold)`) + ✕ close button (`color: var(--text-muted)`)

**Subtitle** — `"Keep logging in daily..."` — `color: var(--text-secondary)`, `font-size: var(--text-sm)`, centred, `max-width: 280px`, margin auto

**Current Title Card** — `.card-brand` (orange-tinted, centred content)
- Flame icon: 52px, `color: var(--brand)`, `var(--brand-subtle)` circle bg, `var(--brand-border)` border
- "CURRENT TITLE" label: `.text-label-caps`
- Title pill: `.btn .btn-primary .btn-pill` (non-interactive, display only), brand gradient `background: linear-gradient(135deg, var(--brand), #FF9A5C)`, `font-size: var(--text-md)`, `font-weight: var(--weight-extrabold)`, `letter-spacing: -0.01em`

**Stats Row** — 2 cards side-by-side, gap `var(--space-3)`
- Each: `.card`, centred
- Icon: 36px circle, `var(--bg-surface)`, `var(--border-subtle)`, contextual icon
- Label: `.text-label-caps`
- Number: `font-family: var(--font-display)`, `font-size: var(--text-3xl)`, `font-weight: var(--weight-extrabold)`, `color: var(--text-primary)`

**Continue Button** — `.btn .btn-outline .btn-block .btn-pill`, `height: 52px`, `font-size: var(--text-lg)`, `margin-top: var(--space-6)`

---

## STEP 6 — FUTURE-PROOFING RULES

Every new screen, component, or feature added to this codebase must follow these rules unconditionally:

```
COLOUR:     Pull exclusively from --bg-*, --text-*, --border-*, --brand*, or semantic vars.
            Never use a raw hex. Never use opacity tricks to "approximate" a colour.

TYPOGRAPHY: Use the defined type classes or token vars. Never set a font-size without a
            corresponding token. Financial numbers always use font-family: var(--font-mono)
            and font-variant-numeric: tabular-nums.

SPACING:    Use only multiples of 4px (i.e., var(--space-*) values). No margin: 7px.
            No padding: 13px.

RADIUS:     Use semantic aliases (--radius-card, --radius-button, etc.), not raw px values.

ICONS:      Consistent stroke-width: 1.5px across all icons. Size in multiples of 4.
            Colour always from the token system.

ANIMATIONS: Max 2 animated properties per transition. Duration ≤ 400ms.
            Always use var(--ease-spring) for enter/scale, var(--ease-smooth) for color/opacity.
            Never animate layout properties (width, height, top, left).

NEW COLOURS: If a new colour is genuinely needed (new feature, new category),
             define a new token in tokens.css first, then reference it.
             Do not re-use existing semantic colours for different meanings.

CARDS:      Every new card uses .card, .card-elevated, or a tinted variant.
            Never create a new card with a custom background that doesn't reference a token.

AMOUNTS:    All monetary amounts rendered to users → .font-mono + tabular-nums + semantic colour.
```

---

## REFERENCE: COLOUR QUICK-LOOKUP

| Situation                    | Text colour          | Background          | Border                |
|------------------------------|----------------------|---------------------|-----------------------|
| Primary content              | `--text-primary`     | `--bg-card`         | `--border-subtle`     |
| Secondary / labels           | `--text-secondary`   | `--bg-surface`      | `--border-faint`      |
| Disabled / timestamps        | `--text-muted`       | `--bg-input`        | `--border-faint`      |
| Income amount                | `--success-text`     | `--success-bg`      | `--success-border`    |
| Expense amount               | `--danger-text`      | `--danger-bg`       | `--danger-border`     |
| Budget near limit            | `--warning-text`     | `--warning-bg`      | `--warning-border`    |
| Brand action / CTA           | `#fff`               | `--brand`           | `--brand-border`      |
| Informational / sync         | `--info-text`        | `--info-bg`         | `--info-border`       |
| Elevated modal/sheet         | `--text-primary`     | `--bg-elevated`     | `--border-default`    |

---

*End of Master Redesign Prompt — ExpendiX v2.0*
*Apply STEP 1 before all other steps. All subsequent steps reference STEP 1 tokens.*
