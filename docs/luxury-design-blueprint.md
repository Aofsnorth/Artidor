# OpenCut Luxury macOS Glassmorphism Design System Blueprint

This document outlines the visual identity, design guidelines, and technical CSS formulas for the premium, luxury macOS-like web interface of OpenCut.

---

## 1. Visual Identity & Mood Board

The design draws inspiration from modern dark luxury interfaces, combining editorial typography with bioluminescent glowing aesthetics and tactile macOS desktop metaphors:

*   **Tactile Glassmorphism**: Translucent panels with background blurs, fine borders, and top-edge highlights that make the web application feel like a native macOS desktop utility.
*   **Bioluminescent Atmospheres**: High-performance, ambient radial glows washed across the background, simulating dark cosmic nebulae or organic light leaks.
*   **Editorial Elegance**: A premium pairing of a rich serif heading typeface (`Playfair Display`) with an ultra-clean, legible sans-serif (`Inter`) for controls.

---

## 2. Color System & Theme Variables

All colors are designed for deep contrast and minimal eye strain during long editing sessions, mapped to standard CSS custom properties.

### 2.1 Dark Luxury Palette (`.dark`)

```css
.dark {
  --background: hsl(240, 20%, 3%);             /* Deep Slate-Black canvas */
  --foreground: hsl(0, 0%, 93%);
  --card: rgba(10, 10, 15, 0.70);              /* Translucent panel background */
  --card-foreground: hsl(0, 0%, 93%);
  --popover: rgba(15, 15, 20, 0.90);            /* Solid dropdown menus */
  --popover-hover: rgba(25, 25, 32, 0.95);
  --popover-foreground: hsl(0, 0%, 98%);
  
  --secondary: hsla(240, 15%, 15%, 0.5);       /* Subtle control backgrounds */
  --secondary-border: hsla(240, 15%, 25%, 0.3);
  --secondary-foreground: hsl(0, 0%, 90%);
  
  --muted: hsla(0, 0%, 100%, 0.06);            /* Inactive status background */
  --accent: hsla(0, 0%, 100%, 0.08);           /* Hover background highlights */
  --accent-foreground: hsl(0, 0%, 98%);
  
  --border: hsla(0, 0%, 100%, 0.08);           /* Glass borders */
  --input: hsla(0, 0%, 100%, 0.03);            /* Input field wells */
  --ring: hsla(240, 100%, 65%, 0.4);           /* Focus ring color */

  /* Bioluminescent Glow Variables */
  --bg-glow-1: hsla(270, 30%, 15%, 0.25);      /* Amethyst nebula wash */
  --bg-glow-2: hsla(210, 40%, 15%, 0.25);      /* Sapphire horizon wash */
}
```

---

## 3. Glassmorphic Panels (`.panel`)

To ensure lightweight and high-performance rendering across browser engines, glassmorphism is achieved using optimized CSS compositing layers:

```css
.panel {
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Scoped variables override for panel content */
.dark .panel {
  --background: rgba(10, 10, 15, 0.65);
  --card: rgba(10, 10, 15, 0.65);
  --border: rgba(255, 255, 255, 0.06);
  --input: rgba(255, 255, 255, 0.03);
  
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-top: 1px solid rgba(255, 255, 255, 0.12); /* macOS top reflection border */
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.40);    /* Premium drop shadow */
}
```

This scoped variable design guarantees that any UI elements nested inside `.panel` (buttons, inputs, lists) automatically adapt their transparency level without manual overriding.

---

## 4. Typography Scale

*   **Branding & Editorial Headings**: `font-serif font-medium italic` (using Google Fonts `Playfair Display`). Applied to project lists, landing page titles, and empty-state banners.
*   **Controls & Data Display**: `font-sans` (using `Inter` or native macOS `SF Pro`). Applied to timeline tracks, panel configurations, number field scrubbers, and tooltips.

---

## 5. Theme Transition & Interaction

Theme switching triggers a dual-layer animation to ensure a smooth transition:

1.  **View Transitions API**: Leverages the browser-native View Transitions API (if available) to capture screenshots and animate a full-screen circular wipe or cinematic cross-fade.
2.  **CSS Variable Transition Fallback**: A smooth transition applied to background colors, borders, colors, and shadows to prevent raw layout thrashing on unsupported engines:

    ```css
    transition: background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    ```
