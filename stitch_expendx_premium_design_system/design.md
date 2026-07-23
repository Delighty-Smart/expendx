# ExpendX Design System: Pure Minimalist Carbon

This document describes in detail the current user interface (UI) and user experience (UX) design system of **ExpendX**. The app utilizes a premium, high-fidelity, flat minimalist aesthetic tailored for modern fintech.

---

## 1. Core Philosophy & Theme
ExpendX features a **"Pure Minimalist Carbon"** theme. It relies on extremely clean layouts, subtle interactive depth, geometric typography, and a strict separation between neutral surfaces and semantic financial accents.

- **Light Mode**: Minimalist cool off-white environment that feels spacious, airy, and clinical.
- **Dark Mode**: Deep carbon palette using deep grays (`#050507`, `#0E0E11`) instead of absolute pitch black, providing rich visual comfort.
- **Micro-elevation & Flatness**: Elements use ultra-subtle shadows or pure borders. Depth is primarily communicated via hover transitions (slight translation and border-color shifts) and matted glassmorphic backdrops.

---

## 2. Global Typography

ExpendX uses **Plus Jakarta Sans** as its primary geometric font, optimized for readability and modern fintech visuals.

- **Font Family**: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- **Tabular Figures**: Numeric outputs, financial charts, and main balances use `font-variant-numeric: tabular-nums` and tighter tracking (`letter-spacing: -0.035em`) to ensure perfectly aligned, highly professional numeric grids.

### Hierarchy & Scale
| Token | Element / Class | Size | Line Height | Weight | Letter Spacing | Color Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Heading 1** | `h1`, `.h1` | `24px` | `32px` | Bold (`700`) | `-0.035em` | `var(--text-heading)` |
| **Heading 2** | `h2`, `.h2` | `20px` | `28px` | Semibold (`600`) | `-0.025em` | `var(--text-heading)` |
| **Heading 3** | `h3`, `.h3` | `15px` | `22px` | Semibold (`600`) | `-0.015em` | `var(--text-heading)` |
| **Heading 4** | `h4`, `.h4` | `14px` | `20px` | Medium (`500`) | `-0.01em` | `var(--text-heading)` |
| **Body** | `p` | `14px` | `20px` | Regular (`400`) | `normal` | `var(--text-primary)` |
| **Small** | `small`, `.text-sm` | `13px` | `18px` | Regular (`400`) | `normal` | `var(--text-secondary)` |

---

## 3. Design System Tokens (Color & Layout Variables)

All colors are controlled dynamically via CSS Custom Properties.

### Light Mode Foundations
- `--brand-primary`: `#111111` (Pure Minimalist Carbon)
- `--bg-base`: `#F8F9FB` (Cool off-white backdrop)
- `--bg-surface`: `#FFFFFF`
- `--bg-card`: `#FFFFFF`
- `--bg-card-hover`: `#FAFAF9`
- `--text-primary`: `#111111`
- `--text-secondary`: `#6B7280` (Muted gray)
- `--border-default`: `rgba(0, 0, 0, 0.03)` (Ultra-subtle contrast)
- `--border-strong`: `#C5CAD3`

### Dark Mode Foundations
- `--brand-primary`: `#FFFFFF`
- `--bg-base`: `#050507` (Void carbon)
- `--bg-surface`: `#0E0E11` (Elevated surface carbon)
- `--bg-card`: `#0E0E11`
- `--bg-card-hover`: `#121216`
- `--text-primary`: `#F3F4F6`
- `--text-secondary`: `#9CA3AF`
- `--border-default`: `rgba(255, 255, 255, 0.03)`
- `--border-strong`: `#242429`

### Finance Semantics (Unified Accents)
These semantic colors map directly to financial behaviors and ignore general light/dark background shifts where contrast is maintained.

| Role | Variable | Light Hex | Dark Hex | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Income / Positive** | `--finance-income` | `#10B981` | `#34D399` | Inflows, positive growth, success |
| **Expense / Negative** | `--finance-expense` | `#EF4444` | `#F87171` | Outflows, spending alerts, warnings |
| **Savings** | `--finance-savings` | `#3B82F6` | `#60A5FA` | Target goals, security, info banners |
| **Debt** | `--finance-debt` | `#F97316` | `#FB923C` | Outstanding loans, credit cards |

---

## 4. Key Interactive Components

### Buttons (`.btn`)
*   **Forced Capsule Shape**: Every button is strictly capsule/pill-shaped (`border-radius: 9999px !important`).
*   **Visual Hover Feedback**: Transitions are set at `200ms` with smooth opacity and background-color interpolations.
*   **Dimensions**:
    *   `btn-xs`: Height `28px`, Padding `0 12px`, Font `12px`
    *   `btn-sm`: Height `34px`, Padding `0 16px`, Font `13px`
    *   `btn-md`: Height `42px`, Padding `0 20px`, Font `14px` (Standard)
    *   `btn-lg`: Height `48px`, Padding `0 24px`, Font `15px`
    *   `btn-xl`: Height `54px`, Padding `0 32px`, Font `16px`

### Card Systems (`.card`)
*   **Curvature**: Uses elegant minimalist curves (`border-radius: 24px !important` or `border-radius: 20px !important`).
*   **Micro-Depth**: Card containers sit flat on `--bg-base`.
*   **Dynamic Hover States**: On hover, cards transition smoothly (`300ms cubic-bezier(0.16, 1, 0.3, 1)`):
    *   Translate upward: `translateY(-2px)`
    *   Border update: transitions from `var(--border-default)` to `var(--border-strong)`.
    *   Shadow: shifts to an incredibly soft, expanded ambient shadow (`rgba(0, 0, 0, 0.03)` on light, `rgba(0, 0, 0, 0.2)` on dark) to create physical elevation.

### Form Inputs (`.input`)
*   **Structure**: Default height of `44px`, padding `0 16px`, and an elegant `12px` rounded corner (`border-radius: 12px`).
*   **Interactive Ring**: Focus triggers a double-ring boundary with outline suppressions (`box-shadow: 0 0 0 2px var(--brand-primary-subtle)`).

---

## 5. Mobile Layout & Navigation Architecture

ExpendX is meticulously tuned for mobile viewports using high-end app-like layouts:

### Matted Glassmorphic Header
*   Fixed to the top of the mobile screen with a height of `64px`.
*   Uses matted glassmorphic backdrop filters (`backdrop-filter: blur(20px)` and `-webkit-backdrop-filter: blur(20px)`).
*   Semi-transparent background (`rgba(255, 255, 255, 0.8)` on light / `rgba(13, 13, 13, 0.8)` on dark) to let the dashboard content scroll beautifully underneath.

### Docked Bottom Navigation Bar
*   Sticky, app-like bottom navigation capsule matching the height of `64px + env(safe-area-inset-bottom)`.
*   Fitted with strict safe-area-inset boundary paddings for high-end notch screen support.
*   **Central Transaction Trigger**: A custom action button container situated in the center (`div.flex-1.flex.justify-center.-translate-y-6`) translated upward by `-16px`.
*   **Active States**: Icons and labels shift smoothly to `var(--brand-primary)` while inactive elements rest on `var(--text-secondary)`.
*   **Floating Action Button (FAB) Suppression**: The floating action buttons are completely hidden on mobile viewports since the center navigation capsule houses the main transaction trigger.

---

## 6. Modals & Dialog System
*   **Overlay**: Modals utilize a luxury matted glassmorphic overlay (`backdrop-filter: blur(12px)`) with custom fade-in entry animations (`backdrop-fade-in 0.3s`).
*   **Modal Body**: High-curvature layout (`border-radius: 28px !important`) with absolute smooth slide-up animations (`modal-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)`).

---

## 7. Data Visualization Style
*   **Gradients Disallowed**: Raw background gradients in chart containers are disabled; all charts sit inside flat, modern `.chart-container` elements.
*   **Grid Lines**: Horizontal and vertical grid lines are rendered clean, flat, and thin, using `var(--border-default)` at `0.8` opacity.
*   **Custom Tooltips**: Chart tooltips (`.recharts-tooltip-wrapper`) are decoupled from library defaults, featuring custom `12px` rounded corners, custom dark elevation, and high-contrast text (`var(--text-inverse)`).
