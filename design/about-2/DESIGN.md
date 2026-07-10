---
name: Intellectual Professional
colors:
  surface: '#f9f9ff'
  surface-dim: '#d4daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e8eeff'
  surface-container-high: '#e3e8f9'
  surface-container-highest: '#dde2f3'
  on-surface: '#161c27'
  on-surface-variant: '#43474e'
  inverse-surface: '#2a303d'
  inverse-on-surface: '#ecf0ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f88'
  primary: '#002045'
  on-primary: '#ffffff'
  primary-container: '#1a365d'
  on-primary-container: '#86a0cd'
  inverse-primary: '#adc7f7'
  secondary: '#0a6c44'
  on-secondary: '#ffffff'
  secondary-container: '#9ff5c1'
  on-secondary-container: '#167249'
  tertiary: '#321b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f2e00'
  on-tertiary-container: '#c6955e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f7'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#9ff5c1'
  secondary-fixed-dim: '#83d8a6'
  on-secondary-fixed: '#002111'
  on-secondary-fixed-variant: '#005231'
  tertiary-fixed: '#ffddba'
  tertiary-fixed-dim: '#f2bc82'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#633f0f'
  background: '#f9f9ff'
  on-background: '#161c27'
  surface-variant: '#dde2f3'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  article-title:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.01em
  article-body:
    fontFamily: Source Serif 4
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 32px
  article-body-mobile:
    fontFamily: Source Serif 4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  ui-medium:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  ui-small:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  metadata:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  article-max: 720px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is rooted in the "Modern Professional" movement, prioritizing legibility, structure, and functional clarity above all else. It is designed for high-density information environments where the content is the primary focus. 

The aesthetic is characterized by a "quiet" UI—using generous white space and a restrained color palette to ensure that the interface never competes with the long-form text. The emotional response should be one of reliability and intellectual rigor, moving away from decorative trends toward a timeless, editorial-grade experience. No asymmetric layouts, heavy shadows, or experimental interactions are permitted; the user should feel a sense of immediate familiarity and trust.

## Colors

The color strategy uses a hierarchy of depth and purpose. The primary color—a deep, authoritative Navy (#1A365D)—is reserved for critical UI interactions and brand touchpoints. A forest green (#2F855A) serves as a secondary accent for success states or specific metadata like "New" tags or "Published" indicators.

Backgrounds remain pure white (#FFFFFF) for the main reading area to maximize contrast. For non-content surfaces like sidebars, search bars, or footer sections, a very light gray (#F7FAFC) is used to create subtle containment without introducing visual noise. Body text is set in a deep Charcoal (#1A202C) rather than pure black to reduce eye strain during extended reading sessions.

## Typography

This design system utilizes a dual-font strategy. **Inter** is the workhorse for all UI elements, navigation, and functional labels, providing a clean, systematic feel. For the primary article content, **Source Serif 4** is employed; its balanced proportions and high legibility make it ideal for long-form reading.

Key typographic rules:
- **Vertical Rhythm:** Article body text must adhere to a strict 32px line-height to maintain a comfortable reading pace.
- **Hierarchy:** Article titles use tight letter spacing and bold weights to stand out against the more open, airy body text.
- **Metadata:** Small labels (dates, categories) should always be in Inter, uppercase, with slight tracking to differentiate them from prose.

## Layout & Spacing

The layout philosophy is based on a **fixed-grid** system for desktop and a fluid system for mobile. 

1.  **Main Container:** Centers content with a maximum width of 1200px.
2.  **Article Column:** Long-form prose is restricted to a maximum width of 720px to maintain optimal line lengths (characters per line) for readability.
3.  **Grid System:** A 12-column grid is used for the homepage and category views.
    - **Desktop:** 40px side margins, 24px gutters.
    - **Tablet:** 24px side margins, 16px gutters.
    - **Mobile:** 16px side margins, single-column stack.
4.  **Spacing Scale:** All margins and paddings must be multiples of 8px to ensure a consistent vertical rhythm.

## Elevation & Depth

To maintain a professional and "flat" editorial feel, this design system avoids heavy shadows. Instead, it uses **low-contrast outlines** and **tonal layering** to indicate hierarchy.

- **Level 0 (Base):** The primary background (#FFFFFF).
- **Level 1 (Subtle):** Used for cards and secondary sections. Indicated by a 1px solid border (#E2E8F0) rather than a shadow.
- **Level 2 (Interactive):** When hovering over a card or button, apply a very soft, high-diffusion shadow (0px 4px 12px rgba(0, 0, 0, 0.05)) to suggest lift without breaking the clean aesthetic.
- **Separators:** Use 1px hairlines (#EDF2F7) to divide list items or sections.

## Shapes

The shape language is "Soft" (0.25rem). This subtle rounding takes the aggressive edge off the professional aesthetic without making the UI feel overly casual or "bubbly."

- **Input Fields & Buttons:** 4px (0.25rem) corner radius.
- **Cards:** 8px (0.5rem) corner radius for a slightly more defined container.
- **Search Bar:** Should remain rectangular with the standard 4px radius to align with the systematic, professional tone.

## Components

### Buttons
- **Primary:** Solid Navy (#1A365D) background, white Inter medium text. No gradients.
- **Secondary (External Links):** Ghost style. 1px border of Navy or Green, matching text color. Used for "GitHub" or "Live Site" links.
- **States:** Hover states should involve a subtle shift in background opacity or a 10% darkening of the fill color.

### Article Cards
- **Structure:** Vertical stack. Image at top (optional), followed by a metadata row (Category in Green, Date in Gray), then the Title, then a short excerpt.
- **Metadata:** Use the `metadata` typography token. Use a bullet point `•` to separate date and read time.

### Search Bar
- **Style:** High-visibility but minimalist. A 1px border (#CBD5E0) that thickens or changes to Primary color on focus. Use a simple magnifying glass icon (20px).

### Input Fields
- **Design:** Clean, rectangular. Labels sit above the field in `ui-small` bold. Placeholder text in a light gray (#A0AEC0).

### Chips/Tags
- **Style:** Small, subtle backgrounds (#EDF2F7) with `metadata` typography. Used for article tags like "React" or "Design Systems." No icons inside chips.