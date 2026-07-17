# 3EJS Static Clone Design (2026-06-18)

## Overview
This design documents a lightweight, fast, and locally‑only clone of the **3EJS‑main** application. The goal is to keep the visual richness needed for ISP management while simplifying the stack to a static, client‑only deployment.

## 1. Architecture & Data Flow
- **Framework:** Next.js 16 with `output: "export"` → generates a static `out/` folder that can be opened directly in a browser or served with a simple static server.
- **Data Layer:**
  - **Google Sheets** (via the existing Apps Script webapp) is the source of truth.
  - **IndexedDB** (via `src/lib/local-db.ts`) provides an offline cache and write‑queue.
  - **Unified DB (`src/lib/unified-db.ts`)** exposes a thin public API used by the stores.
- **No Server:** All API routes and middleware are removed. The client fetches Google Sheets directly.
- **Auth:** Simple local login with a hard‑coded admin credential stored in the browser context (`AuthContext`). No JWT, no roles.
- **Theme:** Existing CSS‑variable theme system retained. Default is dark mode with a toggle.

## 2. Project Layout (Pruned)
```
src/
  app/
    layout.tsx          ← Root layout (theme, stores, auth guard)
    page.tsx            ← Redirect to /dashboard after login
    login/page.tsx      ← Simple login form (local check)
    dashboard/page.tsx ← KPI cards + lazy‑loaded Recharts chart
    subscribers/page.tsx ← CRUD table for subscriber records
    eload/page.tsx      ← E‑Load transaction list + auto‑computed fields
    clawback/page.tsx   ← Risk monitor (30/60/90‑day filter)
    historical/page.tsx ← Read‑only archive viewer
    settings/page.tsx   ← Theme picker, data sync button, user list (static)
  components/
    common/
      Header.tsx
      Sidebar.tsx
      MobileNav.tsx
      ThemeCustomizer.tsx
      ToastStack.tsx
      DataTable.tsx
      ColumnConfigPanel.tsx
      ConfirmModal.tsx
      EmptyState.tsx
      ErrorState.tsx
      SkeletonRows.tsx
      RechartsLazy.tsx   ← Dynamic import of Recharts
    layout/
      LayoutWrapper.tsx   ← Auth guard + wrapper
  lib/
    types.ts
    unified-db.ts        ← Public API (list, create, update, delete)
    local-db.ts
    sheets.ts            ← Direct fetch to Apps Script endpoint
    mappers.ts
    date-utils.ts
    number-utils.ts
    themes.ts
  stores/
    subscribersStore.ts
    eloadStore.ts
    clawbackStore.ts
    historicalStore.ts
    settingsStore.ts
  hooks/
    useAuth.ts
    useTheme.ts
    useQuickAction.ts
    useAutoFlush.ts     ← Periodic sync to Google Sheets
  context/
    AuthContext.tsx
```
All `src/app/api/*` routes, `middleware.ts`, role‑based guards, and chatbot components are removed.

## 3. UI / UX – Functional & Fast
- **Minimal chrome:** Collapsible sidebar, thin top header, bottom mobile nav.
- **Data‑dense tables:** Re‑usable `DataTable` component with column hide/show, sortable headers, pagination (10 rows/page), skeleton loading.
- **KPI cards:** Four cards on the dashboard with subtle hover glow.
- **Lazy loading:** Recharts (charts) are loaded only on the dashboard via `RechartsLazy` to keep bundle size low.
- **Theme system:** Dark mode default, toggle in the header. `ThemeCustomizer` (palette, font, size) persists to `localStorage`.
- **Animations:** Only low‑cost hover glows and simple fade‑ins via Tailwind utility classes; complex Framer Motion variants are removed.

## 4. Data Layer Simplification
- **Unified DB API** (exposed subset):
  ```ts
  export const getDashboardStats = async () => {/*…*/}
  export const listSubscribers = async (opts) => {/*…*/}
  export const upsertSubscriber = async (sub) => {/*…*/}
  export const deleteSubscriber = async (id) => {/*…*/}
  // similar functions for eload, clawback, historical
  ```
- **Sync queue:** `useAutoFlush` runs every 30 s, flushing pending writes from IndexedDB to Google Sheets. Errors surface via a toast.

## 5. Auth Simplification
- Hard‑coded credentials (e.g., `admin@local` / `password`).
- `AuthContext` holds `isLoggedIn` boolean; the `LayoutWrapper` redirects to `/login` when false.
- No JWT, no role checks, no logout API – logout just clears the flag.

## 6. Build & Run Flow
1. `npm ci`
2. **Development:** `npm run dev` → `http://localhost:3000`
3. **Static export:** `npm run build && npm run export` → produces `out/`
4. **Run locally:** `npx serve out` *or* open `out/index.html` in a browser.

## 7. Testing & Quality
- Existing Jest tests for stores and utilities remain unchanged.
- Add a single test for the login flow (checks `isLoggedIn` toggles).
- Run `npm test` as part of any CI step.

## 8. Documentation Updates
- **README.md** will be updated with a “Static Export” section and a “Local‑Only Run” note.
- Remove references to role‑based auth, chatbot, Netlify deployment.
- Add a quick start section for the static build.

---
**Next steps:**
1. Review the design spec (this file).  
2. When approved, a detailed implementation plan will be generated (writing‑plans skill).  
3. The plan will cover file deletions, component trimming, auth rewrite, build config changes, and documentation updates.
