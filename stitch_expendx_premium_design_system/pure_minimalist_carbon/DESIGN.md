---
name: Pure Minimalist Carbon
colors:
  surface: '#111415'
  surface-dim: '#111415'
  surface-bright: '#37393b'
  surface-container-lowest: '#0c0f10'
  surface-container-low: '#191c1e'
  surface-container: '#1d2022'
  surface-container-high: '#282a2c'
  surface-container-highest: '#323537'
  on-surface: '#e1e2e4'
  on-surface-variant: '#c8c5cb'
  inverse-surface: '#e1e2e4'
  inverse-on-surface: '#2e3132'
  outline: '#929095'
  outline-variant: '#47464b'
  surface-tint: '#c8c5c9'
  primary: '#c8c5c9'
  on-primary: '#313033'
  primary-container: '#050507'
  on-primary-container: '#78777a'
  inverse-primary: '#5f5e61'
  secondary: '#93ccff'
  on-secondary: '#003351'
  secondary-container: '#00a9fd'
  on-secondary-container: '#003a5c'
  tertiary: '#a5d700'
  on-tertiary: '#263500'
  tertiary-container: '#030600'
  on-tertiary-container: '#628200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e5e1e5'
  primary-fixed-dim: '#c8c5c9'
  on-primary-fixed: '#1c1b1e'
  on-primary-fixed-variant: '#47464a'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#bef521'
  tertiary-fixed-dim: '#a5d700'
  on-tertiary-fixed: '#151f00'
  on-tertiary-fixed-variant: '#394d00'
  background: '#111415'
  on-background: '#e1e2e4'
  surface-variant: '#323537'
  carbon-surface: '#0E0E11'
  obsidian-card: '#121216'
  border-subtle: rgba(255, 255, 255, 0.03)
  border-strong: '#242429'
  finance-income: '#34D399'
  finance-expense: '#F87171'
  finance-savings: '#60A5FA'
  finance-debt: '#FB923C'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.035em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.025em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.015em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: normal
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: normal
  label-tabular:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.035em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  compact-xs: 0.375rem
  compact-sm: 0.625rem
  compact-md: 0.875rem
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 32px
---

## Brand & Style

The design system embodies a **Pure Minimalist Carbon** aesthetic, specifically engineered for a high-fidelity fintech experience. The brand personality is stable, clinical, and exceptionally trustworthy, prioritizing data density and legibility for power users. 

The visual style is a hybrid of **Minimalism** and **Glassmorphism**, utilizing a "Carbon & Obsidian" environment in dark mode and a "Clinical Workspace" in light mode. The interface avoids unnecessary decoration, relying instead on ultra-subtle borders, high-quality geometric typography, and physical metaphors like tactile compression on interaction. The emotional response should be one of absolute precision and premium reliability.

## Colors

The palette is anchored by a deep carbon foundation. While the system supports light mode, the primary expression is a dark "Carbon" theme. 

- **Primary & Neutral**: The background uses `#050507` (Void Carbon), with elevated surfaces using `#0E0E11`. Text is primarily `#F3F4F6` for high contrast without the harshness of pure white.
- **Accents**: **Electric Blue** (`#00AAFF`) is the primary interactive driver, while **Lime Green** (`#B0E600`) serves as a secondary high-saturation spotlight.
- **Financial Semantics**: Specific hues are reserved for financial behavior: Emerald for income, Coral for expenses, and Blue-Teal for savings.
- **Borders**: Depth is created using ultra-subtle borders (`rgba(255, 255, 255, 0.03)`) rather than heavy shadows to maintain a flat, clinical aesthetic.

## Typography

This design system utilizes **Plus Jakarta Sans** for its geometric precision and modern fintech feel. 

**Tabular Figures & Numeric Data:**
All financial data, balances, and transaction amounts must utilize `font-variant-numeric: tabular-nums`. This ensures vertical alignment in lists and grids. For these numeric displays, apply a tighter tracking of `-0.035em`.

**Hierarchy:**
Headings use bold and semibold weights with negative letter spacing to create a dense, authoritative appearance. Body text remains regular for maximum legibility.

## Layout & Spacing

The layout follows a **fluid grid** model optimized for dense information display. 

- **Spacing Rhythm**: A compact 4px/8px rhythm is strictly enforced. Custom fractional increments (e.g., 6px, 10px, 14px) are used to maintain a highly disciplined, "tight" interface that maximizes screen real estate without clutter.
- **Grid Models**: On desktop, the system uses a fixed-width sidebar (256px) with a fluid content area. On mobile, the system relies on a single-column reflow with 20px side margins.
- **Performance**: High-frequency scroll items like transaction lists are promoted to GPU compositor layers using `will-change: transform` to ensure 60fps performance during rapid scrolling.

## Elevation & Depth

Hierarchy is established through a combination of **Tonal Layers** and **Glassmorphism**.

1.  **Matted Glassmorphism**: Headers, mobile navigation, and modal overlays use intense backdrop blurs (`20px`) with semi-transparent backgrounds (`rgba(13, 13, 13, 0.8)` in dark mode). This allows content to scroll visibly but obscured beneath the UI chrome.
2.  **Ultra-Subtle Outlines**: Depth is primarily communicated through "hairline" borders (`1px`) with very low opacity. 
3.  **Ambient Shadows**: Shadows are used sparingly. When applied (e.g., on cards), they are extra-diffused and low-opacity (`rgba(0, 0, 0, 0.2)` in dark mode), intended to feel like physical elevation rather than a distinct visual element.
4.  **Micro-elevation**: On hover, elements translate `-2px` on the Y-axis and shift border contrast slightly to signal interactivity.

## Shapes

The shape language is a strategic mix of **Rounded** and **Pill-shaped** elements.

- **Interactive Elements**: All buttons and tags must be strictly **capsule-shaped** (pill-shaped) to distinguish them from structural containers.
- **Containers**: Cards and modals use a "Rounded" radius (12px to 24px) to create a soft, premium feel that contrasts with the sharp data grids within.
- **Inputs**: Form fields use a 12px corner radius, balancing the pill-shaped buttons with the rectangular containers.

## Components

### Buttons
Strictly capsule-shaped. Primary buttons use a high-contrast fill (Off-white on Carbon). Hover states trigger a 200ms transition of background color and a slight tactile compression (`scale-95`) on click. Mobile touch targets are forced to a minimum of `48px` height.

### Card Systems
Cards use 20px-24px corner radius. They sit flat with a hairline border. Glass-card variants use `backdrop-blur-2xl` and a 10% opacity white border. Budget cards may use a very subtle gradient overlay (Slate to Charcoal).

### Input Fields
Height of `44px` with 12px rounded corners. Focus states trigger a double-ring boundary: a 1px primary color border and a 2px glowing outer ring.

### Mobile Bottom Navigation
A 72px height capsule with a `backdrop-blur-md` glass effect. It features a central floating transaction trigger—a circular button translated upward by `-16px` with a 4px border matching the background color.

### List Items
Transaction items use a compact layout with 0.5rem rounded corners. Icons are placed in 15% opacity Electric Blue circles. Amounts are always right-aligned using tabular figures.