---
name: Pure Minimalist Carbon (Light)
colors:
  surface: '#fdf8f8'
  surface-dim: '#ddd9d8'
  surface-bright: '#fdf8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3f2'
  surface-container: '#f1edec'
  surface-container-high: '#ebe7e6'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#444748'
  inverse-surface: '#313030'
  inverse-on-surface: '#f4f0ef'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#585f6c'
  on-secondary: '#ffffff'
  secondary-container: '#dce2f3'
  on-secondary-container: '#5e6572'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#dce2f3'
  secondary-fixed-dim: '#c0c7d6'
  on-secondary-fixed: '#151c27'
  on-secondary-fixed-variant: '#404754'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#fdf8f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  data-tabular:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-padding: 32px
  gutter: 24px
---

## Brand & Style
The design system evolves into a premium Light Mode that emphasizes clinical precision, high-fidelity surfaces, and an expansive sense of negative space. The aesthetic is rooted in **Modern Minimalism** with a focus on structural clarity and functional elegance.

The target audience consists of high-net-worth individuals and professionals who demand a focused, distraction-free environment for financial data. The UI should evoke a sense of calm, intellectual control, and institutional reliability. By utilizing a "Carbon" philosophy, the design treats every pixel as a deliberate choice, favoring microscopic details over decorative elements.

## Colors
The palette is monochromatic and functional, using a cool off-white base to reduce eye strain while maintaining a pristine "gallery" feel.

- **Base Background:** `#F8F9FB` creates a distinct separation from the pure white surface containers.
- **Surface/Card:** `#FFFFFF` is used for primary content areas to provide maximum lift and clarity.
- **Typography:** Primary text uses `#111111` for authoritative contrast, while secondary metadata uses `#6B7280`.
- **Semantic Accents:** `#10B981` (Success/Income) and `#EF4444` (Alert/Expense) are used sparingly to highlight data trends without overwhelming the minimalist canvas.
- **Borders:** Ultra-subtle `rgba(0, 0, 0, 0.03)` outlines define structures through texture rather than weight.

## Typography
The system utilizes **Plus Jakarta Sans** for its soft yet professional geometric rhythm. 

- **Numerical Integrity:** For all financial figures and data tables, use the `data-tabular` style. This forces monospaced digit widths (`tnum`) to ensure columns of numbers align vertically for instant scannability.
- **Hierarchy:** Use bold weights for headlines to create "anchors" on the page. Body text remains light and airy to support the minimalist narrative.
- **Letter Spacing:** Headlines utilize slight negative tracking to appear more cohesive and premium.

## Layout & Spacing
The layout philosophy is based on a **Fixed Grid** with generous internal margins to prevent content crowding.

- **Grid:** A 12-column grid for desktop with 24px gutters. Content should be centered with a max-width of 1280px.
- **Rhythm:** An 8px linear scale is the primary driver, but a 4px "half-step" is permitted for microscopic adjustments in densified data views.
- **Padding:** Use `48px` (xl) for section spacing and `24px` (lg) for internal card padding to maintain a spacious, high-end feel.

## Elevation & Depth
In this design system, depth is achieved through **Tonal Layering** and soft atmospheric shadows rather than heavy borders.

- **Level 0 (Background):** `#F8F9FB` (Flat).
- **Level 1 (Cards/Surfaces):** `#FFFFFF` with a very soft ambient shadow: `0px 4px 20px rgba(0, 0, 0, 0.02)`.
- **Level 2 (Modals/Popovers):** `#FFFFFF` with a more pronounced elevation: `0px 12px 40px rgba(0, 0, 0, 0.05)`.
- **Interactive State:** On hover, a surface may transition from Level 1 to Level 2 to provide tactile feedback.

## Shapes
The shape language is a mix of architectural structure and organic softness.

- **Containers:** All primary cards and surfaces must use a **24px corner radius**, creating a friendly yet sophisticated frame for data.
- **Interactive Elements:** Buttons and chips utilize **Capsule Geometry** (100px+ radius). This creates a distinct visual contrast between the "containers" (structured) and the "actions" (organic).
- **Inputs:** Form fields should follow a softer `12px` radius to sit comfortably between the two extremes.

## Components
- **Buttons:** Primary buttons are solid `#111111` with white text. Secondary buttons are `#FFFFFF` with the ultra-subtle border `rgba(0,0,0,0.03)`. All are capsule-shaped.
- **Cards:** White surfaces with 24px radius. Use the subtle border to define edges against the off-white background.
- **Chips:** Small capsule elements with a light grey background (`#F1F5F9`) and secondary text, used for categories or status labels.
- **Input Fields:** Minimalist design with a 1px border. On focus, the border transitions to `#111111` with no glow, maintaining a clinical aesthetic.
- **Lists:** Transaction items should have ample vertical padding (16px) and use tabular figures for amounts. Use divider lines only if necessary, preferring whitespace for separation.
- **Checkboxes/Radios:** Small, precise, and utilizing the primary accent color (`#111111`) when active to maintain the monochrome-first approach.