# Session Memory — June 1, 2026

*(Auto-updated during session)*

## Session Context
- Opened project to check on prior work and memory system
- Discovered `docs/session-memory.md` — project's manual session logging mechanism

## Prior Session: May 31, 2026

### Theme Simplification (VS Code Presets)

- Replaced old light/dark toggle + 10 colorway system with 2 VS Code themes (Dark+/Light+)
- Added 10 color palette overlays (Deep Ocean, Forest Mist, etc.) that accent the base theme
- Reduced fonts from 11 to 6 with dropdown selector
- Removed `ThemeToggle.tsx` component from header
- Removed `className="dark"` from `layout.tsx`
- Cleaned `globals.css`: removed `:root.dark` block, slate backward-compat layer, `:root.dark .bg-mesh`
- Created `src/lib/themes.ts` — centralized theme/palette/font data
- Rewrote `useTheme.tsx` — manages `themeName`, `paletteName`, `fontFamily`, `fontSize` only
- Rewrote `ThemeCustomizer.tsx` — theme cards + palette grid + font dropdown + size buttons
- Settings page themes tab now renders simplified `<ThemeCustomizer />`
- Net code reduction: ~300 lines removed

## Date Format MM/DD/YYYY

- `mappers.ts`: `parseExcelSerialDate` outputs MM/DD/YYYY
- `utils.ts`: `excelSerialToDate` outputs MM/DD/YYYY; added `toInputDate`, `toStorageDate`, `todayStorageDate`
- `unified-db.ts`: loadExpire calculations produce MM/DD/YYYY; `formatLoadExpire` extracted to module level
- `SHEETS_CODE.js`: `formatCellValue` outputs MM/DD/YYYY (re-deploy needed)
- All page form inputs use `toInputDate`/`toStorageDate` for HTML `<input type="date">` boundary conversion
- Test expectations updated

## Google Sheets CRUD Fixes

- Fixed `SHEETS_CODE.js`: SHEET_NAMES mapping + `getSheetByName()` for reliable sheet lookup
- Fixed `formatCellValue()` to convert Date objects to clean strings
- Updated `.env` files with consistent WebApp URL
- Removed redundant `axios.patch` from subscribers/clawback pages (fix 500 errors)
- Removed `<SyncStatus />` from `SyncProvider` (kept background sync)
- All 4 CRUD operations verified passing

## Key Patterns/Tokens
- CSS variables: `--color-background`, `--color-text`, `--color-primary`, etc.
- Theme application: `style.setProperty(key, value)` on `document.documentElement`
- Date boundary: HTML `<input type="date">` requires YYYY-MM-DD → convert at boundary
- localStorage key: `3jes-theme-prefs` (JSON: `{themeName, paletteName, fontFamily, fontSize}`)
- Tailwind v4, no tailwind.config.ts (uses `@theme inline` in globals.css)
