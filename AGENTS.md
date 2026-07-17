# AGENTS.md — 3EJS Tech

Guidance for AI agents and contributors working on the 3EJS Tech ISP management app.

## What this project is
A Next.js 16 (App Router) + TypeScript ISP management app. Data lives in **Google Sheets** (via a Google Apps Script Web App) with an **IndexedDB** offline cache, and the same app ships as an **Electron** desktop executable. Auth uses **session cookies (JWT) + bcryptjs**, enforced by `middleware.ts`.

> Note: `README.md` previously described a Supabase + Next.js 14 + Netlify stack. That is **out of date**. The current stack is Google Sheets + Next.js 16 + Electron (web deploy via Vercel/Netlify configs). See `README.md` for the accurate architecture.

## Commands
- `npm run dev` — web dev server
- `npm run build` / `npm run start` — production web build/serve
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint (0 errors expected; warnings allowed)
- `npm run test` — Jest
- `npm run electron:dev` — Next dev + Electron window
- `npm run dist` — build installer into `dist/`

## Architecture at a glance
- `src/app/api/**` — Route Handlers (auth, installations, eload, users, archive, sheets-proxy)
- `src/lib/sheets.ts` + `unified-db.ts` + `sheets-mapper.ts` — data layer (Sheets ↔ camelCase)
- `src/lib/local-db.ts` + `src/lib/sync-queue.ts` — IndexedDB cache + offline sync
- `src/stores/**` — Zustand stores (use selectors to avoid re-renders)
- `src/types/electron.d.ts` — `window.electron` API typing (desktop only)
- `electron/main.js`, `electron/preload.js`, `server.js` — desktop shell (CommonJS, excluded from lint)

## Lint/type/test conventions
- Stylized strict rules (`no-explicit-any`, `no-require-imports`) are **warnings**; `react-hooks/set-state-in-effect` and `react/no-unescaped-entities` are **off** in `eslint.config.mjs`. Keep `lint` at 0 errors.
- `electron/`, root Apps Script files, and helper `.js` scripts are git-ignored by ESLint.
- Do not add `require()` to app TypeScript; the Electron JS files are intentionally CommonJS.

## Multi-agent reference (advisory)
The repo also ships agent specs under `CUSTOM_AGENTS.md` (Strategist/Architect/Artisan/Optimizer) and `ArchitectureReview.agent.md` (read-only review agent). They are planning aids, not enforced process. Key ownership:
- Data/E-Load formula: `src/stores/eloadStore.ts`, `src/app/eload/page.tsx`
- Sheets backend + data integrity: `src/lib/sheets.ts`, `src/lib/unified-db.ts`, `src/lib/sheets-mapper.ts`, `SHEETS_CODE.js`
- Sync: `src/components/sync/SyncProvider.tsx`, `src/lib/sync-queue.ts`, `src/hooks/useEventListener.ts`
- Auth: `src/lib/auth-server.ts`, `src/lib/session.ts`, `middleware.ts`, `src/app/api/auth/**`
- UI/theme: `src/app/**`, `src/components/common/**`, `src/lib/themes.ts`, `globals.css`

## Before committing
Run `npm run typecheck && npm run lint && npm run test`. Keep the working tree clean (the `.kilo/`, `.kiro/`, `.playwright-mcp/`, `dist/`, `.next/` dirs should stay git-ignored).
