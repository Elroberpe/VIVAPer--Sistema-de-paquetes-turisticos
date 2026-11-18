---
name: VivaPeru
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#43474d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#74777e'
  outline-variant: '#c4c6ce'
  surface-tint: '#49607e'
  primary: '#000f22'
  on-primary: '#ffffff'
  primary-container: '#0a2540'
  on-primary-container: '#768dad'
  inverse-primary: '#b0c8eb'
  secondary: '#ab3500'
  on-secondary: '#ffffff'
  secondary-container: '#fe6a34'
  on-secondary-container: '#5d1900'
  tertiary: '#001209'
  on-tertiary: '#ffffff'
  tertiary-container: '#002a1a'
  on-tertiary-container: '#009e6d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#b0c8eb'
  on-primary-fixed: '#001c37'
  on-primary-fixed-variant: '#314865'
  secondary-fixed: '#ffdbd0'
  secondary-fixed-dim: '#ffb59d'
  on-secondary-fixed: '#390c00'
  on-secondary-fixed-variant: '#832600'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.005em
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
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.03em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
---

## Brand & Style

This design system targets modern travelers seeking curate-worthy, transformative experiences. It blends aspirational editorial luxury with accessible, high-utility booking functionality. The aesthetic draws heavily from contemporary travel journalism and elevated digital concierge applications, pairing generous negative space with sun-drenched accents and maritime depth.

### Design Movement
**Vibrant Modernist Travel:** Clean, high-clarity interfaces enriched with subtle depth, smooth radii, and luminous accents. High-contrast typography pairs with micro-translucencies to keep photography and itinerary logistics in effortless harmony. The atmosphere feels sunlit, breezy, and thoroughly reliable.

## Colors

The palette balances maritime authority with the warmth of dusk:

- **Deep Ocean Blue (`#0A2540`)**: Serves as the primary anchor for headers, primary action states, and high-emphasis textual elements. Conveys structure, safety, and operational credibility.
- **Warm Terracotta (`#FF6B35`)**: The high-energy accent reserved for primary booking buttons, conversion hotspots, special promotional highlights, and price emphasis.
- **Verdant Emerald (`#10B981`)**: The tertiary semantic color used strictly for sustainability metrics, eco-certified partner badges, confirmed booking tags, and positive trust signals.
- **Soft Sand Canvas (`#F8FAFC`)**: The ambient foundational surface, softened by muted blue-slate undertones (`#F1F5F9`) to mitigate screen glare and evoke sun-washed coasts.

### Surface Hierarchy & Contrast
- `surface-canvas`: `#F8FAFC`
- `surface-card`: `#FFFFFF`
- `surface-subtle`: `#F1F5F9`
- `text-primary`: `#0A2540`
- `text-muted`: `#627D98`
- `border-subtle`: `rgba(10, 37, 64, 0.08)`

## Typography

The type system is powered entirely by **Plus Jakarta Sans**, chosen for its friendly, wide apertures and crisp geometric cadence. This creates an open, welcoming interface without sacrificing structure or space efficiency in complex itineraries.

- **Headlines**: Set tightly with negative tracking to impart an editorial, boutique magazine feel.
- **Numbers & Rates**: Always rendered using `headline-md` or `headline-sm` with tabular lining figures to ensure fast visual scanning of package costs and dates.
- **Labels & Micro-copy**: Employs medium-to-semibold weights with slight positive tracking for crisp readability over photography and inside high-density summary bars.

## Layout & Spacing

A balanced fluid-grid framework engineered for image-rich cataloging and clear multi-step booking.

### Grid & Breakpoints
- **Desktop (1200px+)**: 12-column layout, max content width of `1280px`, `3rem` margins, `1.5rem` gutters.
- **Tablet (768px - 1199px)**: 8-column layout, `2rem` margins, `1.25rem` gutters.
- **Mobile (Below 768px)**: 4-column layout, `1.25rem` margins, `1rem` gutters. Package cards reflow to single-column full-width cards with edge bleed on imagery.

### Spacing Principles
- Package cards enforce internal breathing room using `space-lg` (`1.5rem`) on desktop, compressing to `space-md` (`1rem`) on compact views.
- Section-level dividers between tour highlights, review aggregates, and sticky booking docks use `space-2xl` (`4rem`) to let editorial photography breathe.

## Elevation & Depth

Visual hierarchy relies on warm ambient shadows and polished multi-layered surfaces that float cleanly against off-white backdrops.

- **Level 0 (Flat Canvas)**: Neutral off-white ground (`#F8FAFC`). No elevation.
- **Level 1 (Resting Cards & Dividers)**: Pure white `#FFFFFF` cards using an ambient tint:
  `box-shadow: 0 4px 20px -2px rgba(10, 37, 64, 0.05), 0 2px 6px -1px rgba(10, 37, 64, 0.03);`
  Border: `1px solid rgba(10, 37, 64, 0.06)`.
- **Level 2 (Hover States & Dropdowns)**:
  `box-shadow: 0 12px 32px -4px rgba(10, 37, 64, 0.08), 0 4px 12px -2px rgba(10, 37, 64, 0.04);`
  Card surfaces elevate slightly via `-translate-y-1` transition.
- **Level 3 (Sticky Booking Bars & Modals)**:
  `box-shadow: 0 20px 48px -6px rgba(10, 37, 64, 0.12), 0 8px 20px -4px rgba(10, 37, 64, 0.06);`
- **Glassmorphism**: Sticky global search and sub-navigation headers use `rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(12px)` and a subtle `rgba(10, 37, 64, 0.06)` lower divider.

## Shapes

The interface embraces organic, friendly curves that soften the utilitarian structure of flight and hotel logistics:

- **Cards & Primary Modules**: Utilize `rounded-xl` (`1rem`) to create smooth framing around destination photography. Hero card groups step up to `rounded-2xl` (`1.5rem`).
- **Interactive Controls (Inputs, Buttons, Dropdowns)**: Standardized on `rounded-lg` (`0.75rem`) for consistent balance.
- **Badges, Pills & Avatars**: Full circular pill styling (`rounded-full`) for tags, duration chips, rating counters, and status indicators.
- **Media**: All hero imagery and image gallery grids inherit uniform outer corner radii, maintaining consistent internal border-radii alignments.

## Components

### Buttons
- **Primary ("Book Experience")**: Terracotta background (`#FF6B35`), pure white text, bold tracking, `rounded-lg`, subtle glow hover (`box-shadow: 0 8px 20px -4px rgba(255, 107, 53, 0.35)`). Active state applies a slight scale down (`scale-98`).
- **Secondary**: Deep Ocean Blue (`#0A2540`) fill with white text, or pure white with a 1px border of `rgba(10, 37, 64, 0.12)` and text in `#0A2540`.
- **Ghost/Tertiary**: Transparent fill, `#0A2540` label, light `#F1F5F9` hover fill with matching micro-transitions.

### Chips & Badges
- **Eco / Verified Badge**: Pill-shaped container (`rounded-full`), surface `#ECFDF5`, text `#065F46`, paired with an emerald `#10B981` leading icon (leaf or check-shield).
- **Tour Category Chips**: Soft background `#F1F5F9`, borderless, text `#0A2540`, selected state switches to Deep Ocean Blue background with crisp white typography.

### Input Fields & Search Bars
- **Floating Destination Search Dock**: Pill-shaped or `rounded-2xl` white container with Level 2 elevation. Divided into multi-segment tap areas (Where, When, Travelers).
- **Form Inputs**: Height `48px`, background `#FFFFFF`, border `1.5px solid rgba(10, 37, 64, 0.12)`, text `#0A2540`. Focus state shifts border to `#0A2540` with an outer ring of `rgba(10, 37, 64, 0.08)`.

### Tour Package Cards
- Composed of an aspect-ratio-locked visual top (16:10 or 4:3), heart-icon favorite button top-right in a translucent pill, duration and location chip overlay bottom-left, followed by a card body containing title, star-rating inline, key inclusions, and price split (`"From $X / person"`).

### Checkboxes & Radios
- Checkbox size `20px`, `rounded-md` (`6px`). Unchecked: border `1.5px solid rgba(10, 37, 64, 0.2)`. Checked: `#0A2540` fill with a sharp white checkmark.