# Redesign Master Prompt: ExpendX Premium Minimalist Carbon

Perform a comprehensive UI/UX overhaul of the entire application to achieve a **premium, stable, and trustworthy fintech aesthetic** while preserving all existing application logic and functionality.

## 1. Global Visual Strategy (The "Pure Minimalist Carbon" Theme)
Apply a high-fidelity, clinical, and minimalist style characterized by deep neutral surfaces and purposeful semantic accents.

- **Color Palette (Dark Mode Primary)**:
  - Base Background: `#050507` (Void Carbon)
  - Surface/Card Background: `#0E0E11`
  - Text Primary: `#F3F4F6`
  - Text Secondary: `#9CA3AF`
  - Accent (Income/Success): `#34D399`
  - Accent (Expense/Alert): `#F87171`
  - Borders: `rgba(255, 255, 255, 0.03)` (Ultra-subtle)

- **Typography (Plus Jakarta Sans)**:
  - Set all headings and body text to `Plus Jakarta Sans`.
  - **CRITICAL**: Apply `font-variant-numeric: tabular-nums` and `letter-spacing: -0.035em` to all currency, percentages, and financial balances to ensure professional alignment.

## 2. Layout & Components
- **Capsule Geometry**: Every button, badge, and interaction trigger must be strictly pill-shaped (`border-radius: 9999px`).
- **Card System**:
  - Border Radius: `24px`.
  - Flat elevation on base.
  - Hover state: `translateY(-2px)` with a slightly stronger border and ultra-soft ambient shadow.
- **Header/Nav**:
  - Implement a matted glassmorphic header (`backdrop-filter: blur(20px)`) at `64px` height.
  - Sticky bottom navigation bar at `64px` with a central elevated action button.

## 3. Implementation Directives
- **Global Stylesheet**: Define all theme tokens as CSS variables (`--bg-base`, `--text-primary`, etc.) at the `:root` level.
- **Glassmorphism**: Use `rgba` backgrounds with `-webkit-backdrop-filter` for all overlays and fixed navigation elements.
- **Logic Preservation**: Do not alter any state management, data fetching, or event handling logic. Only modify the class names, inline styles, and structural HTML wrappers to match the new design system.

## 4. Code Snippet for Reference (Global CSS)
```css
:root {
  --bg-base: #050507;
  --bg-surface: #0E0E11;
  --text-primary: #F3F4F6;
  --finance-income: #34D399;
  --border-subtle: rgba(255, 255, 255, 0.03);
}

body {
  background-color: var(--bg-base);
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.financial-value {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.035em;
}

.card {
  background: var(--bg-surface);
  border-radius: 24px;
  border: 1px solid var(--border-subtle);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
```