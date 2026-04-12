# Design System Specification

## 1. Overview & Creative North Star: "The Obsidian Architect"
The vision for this design system is **The Obsidian Architect**. We are moving away from the "standard dashboard" aesthetic toward a high-end editorial experience that feels like a premium intelligence tool. 

While the ACP Agent Platform provides the functional blueprint, our execution must feel bespoke. This is achieved through **intentional asymmetry**, where content isn't just boxed in, but anchored by vast negative space. We challenge the rigid grid by using overlapping elements and a dramatic typographic scale. The goal is to make the user feel they are interacting with a sophisticated, physical layer of dark glass and light, rather than a flat digital interface.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep, ink-like tones and vibrant, electric purples. The core of this system is how light interacts with dark surfaces.

### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders for sectioning or structural separation. In this design system, boundaries are defined exclusively through background color shifts. 
*   Use `surface-container-low` (#131313) to anchor a section against the main `background` (#0e0e0e). 
*   Define importance through tonal contrast, not outlines.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of polished obsidian.
*   **Layer 1 (The Void):** `surface` (#0e0e0e) - The base canvas.
*   **Layer 2 (The Stage):** `surface-container` (#1a1a1a) - Used for primary content areas.
*   **Layer 3 (The Focus):** `surface-container-high` (#20201f) - Used for cards and interactive elements.
*   **Layer 4 (The Interaction):** `surface-container-highest` (#262626) - Reserved for active states or nested components.

### The "Glass & Gradient" Rule
To elevate beyond standard UI, use glassmorphism for floating elements (like Modals or Floating Action Buttons). Apply `surface-variant` (#262626) with a 60% opacity and a `20px` backdrop-blur. 
*   **Signature Textures:** Use subtle linear gradients for primary CTAs, transitioning from `primary_dim` (#7e51ff) to `primary` (#b6a0ff) at a 135-degree angle. This provides a "glow" that flat colors cannot replicate.

---

## 3. Typography: Editorial Authority
We utilize a dual-font strategy to balance character with utility.

*   **Display & Headlines (Space Grotesk):** This is our "Editorial" voice. The geometric, slightly technical nature of Space Grotesk should be used at large scales (`display-lg` at 3.5rem) with tighter letter-spacing (-0.02em) to command attention.
*   **Body & Labels (Inter):** Our "Functional" voice. Inter provides maximum legibility for the AI-driven data. 
*   **Contrast as Hierarchy:** Pair a `display-sm` headline in `on-surface` (#ffffff) with a `label-md` uppercase subtitle in `on-surface-variant` (#adaaaa) to create a sophisticated, high-contrast lockup.

---

## 4. Elevation & Depth
Elevation is conveyed through **Tonal Layering** and light physics, never through heavy structural shadows.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface-container-lowest` card sitting on a `surface-container-low` section creates a natural, soft lift.
*   **Ambient Shadows:** When a floating effect is required (e.g., a dropdown), use an extra-diffused shadow: `box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5)`. The shadow should feel like a soft pool of darkness, not a hard edge.
*   **The "Ghost Border" Fallback:** If a border is strictly required for accessibility, it must be a **Ghost Border**. Use the `outline-variant` (#484847) token at 15% opacity. High-contrast, 100% opaque borders are strictly forbidden.
*   **Glassmorphism Depth:** For top-level navigation bars, use a semi-transparent `surface` with backdrop blur. This allows the deep navy and charcoal tones of the content to bleed through as the user scrolls, maintaining a sense of place.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary_dim` to `primary`), `9999px` (full) roundedness. Text is `on-primary` (#340090).
*   **Secondary:** Ghost style. No fill, `Ghost Border` (15% opacity `outline-variant`), text in `primary`.
*   **States:** On hover, primary buttons should increase their "glow" (outer shadow in `primary` at 20% opacity).

### Cards
*   **Structure:** No borders. Use `surface-container-high` (#20201f).
*   **Spacing:** Use generous internal padding (`xl`: 0.75rem or greater) to allow content to breathe.
*   **Layout:** Forbid the use of divider lines within cards. Separate "Try asking" sections from header sections using vertical white space or a subtle shift to `surface-container-highest`.

### Chips
*   **Selection Chips:** Use `secondary-container` (#464553) with `on-secondary-container` text. 
*   **Visual Style:** Keep them small (`label-sm`) with `md` (0.375rem) corner radius to differentiate them from the fully rounded buttons.

### Input Fields
*   **Canvas:** `surface-container-lowest` (#000000) backgrounds to create a "recessed" feel.
*   **States:** Active states are signaled by a 1px "Ghost Border" that transitions to 100% opacity `primary` color only on the bottom edge.

### Lists
*   **Separation:** Vertical space only. Never use horizontal rules (<hr>) to separate list items. The transition from one item to the next should be felt through rhythmic spacing.

---

## 6. Do’s and Don’ts

### Do
*   **DO** use extreme typographic scale. A very large headline next to a very small label creates a premium, intentional look.
*   **DO** use `surface-tint` (#b6a0ff) sparingly as a subtle top-light on the most important containers.
*   **DO** prioritize "Breathing Room." If a layout feels crowded, increase the spacing tokens rather than adding lines or boxes.

### Don’t
*   **DON’T** use pure white (#ffffff) for long-form body text; use `on-surface-variant` (#adaaaa) to reduce eye strain against the dark background.
*   **DON’T** use standard drop shadows. If a component doesn't feel "up," change its background color to a higher surface tier.
*   **DON’T** use 100% opaque borders. They break the "Obsidian" illusion and make the UI look like a template.