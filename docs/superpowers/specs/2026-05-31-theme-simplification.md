# Theme Simplification — VS Code Presets

## Goal
Simplify 3EJS' theme system to a VS Code-like preset picker: two complete themes (Dark+, Light+) with 10 color palette overlays, no light/dark toggle, simplified typography.

## Architecture
Theme definitions and palette data in `src/lib/themes.ts`. `useTheme.tsx` manages `themeName`, `paletteName`, `fontFamily`, `fontSize` — applies theme colors then palette overrides via `style.setProperty`. `ThemeCustomizer` shows theme cards + palette grid + font dropdown + size buttons.

## Key Changes
- Removed light/dark toggle (header sun/moon icon)
- Removed `:root.dark` CSS block and slate compat layer
- Removed `ThemeToggle.tsx` component
- Removed `className="dark"` from layout.tsx
- 2 themes: VS Code Dark+ / Light+ (define all bg/text/border/surface colors)
- 10 color palettes: Deep Ocean, Forest Mist, etc. (override brand accent colors on top of theme)
- 6 fonts (down from 11), 3 font sizes
- Settings page simplified to single unified section
