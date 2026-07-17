# 3EJS Tech - ISP Management Application

A comprehensive ISP management application for subscriber management, E-Load transactions, technician tracking, and clawback monitoring. Built with **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS v4**, and **Zustand**. Data is stored in **Google Sheets** (via a Google Apps Script Web App) with an **IndexedDB** local cache for offline support, and it ships as a **desktop app** via **Electron**.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment (see .env.example)
cp .env.example .env.local

# Development (web)
npm run dev

# Production build (web)
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Tests
npm run test
```

---

## 🖥 Desktop (Electron)

The same Next.js app runs as a standalone Windows desktop app. Electron launches the bundled Next.js server and renders it in a window; the Google Sheets Web App URL is stored locally via `electron-store` (set in **Settings**).

```bash
# Run desktop app in dev (Next dev server + Electron window)
npm run electron:dev

# Build the installer (.exe) into dist/
npm run dist
```

- `electron/main.js` — main process, IPC handlers (`get-sheets-url`, `set-sheets-url`, `export-csv`, `show-notification`, …)
- `electron/preload.js` — secure `contextBridge` exposing `window.electron`
- `src/types/electron.d.ts` — typing for the `window.electron` API
- `server.js` — standalone Next.js server spawned by Electron in production

---

## 📋 Modules

| Route | Module |
|-------|--------|
| `/dashboard` | Overview: stat cards, installations graph, recent E-Load, clawback report |
| `/subscribers` | Subscriber list (search/sort), detail modal |
| `/installations` | New installations entry |
| `/eload` | E-Load transactions (auto-computed markup/retailer/dealer/incentive) |
| `/clawback` | Risk monitoring (30/60/90-day filters, notify/load actions) |
| `/historical` | Archived installations |
| `/technicians` | Technician management |
| `/reporting` | Print-focused reports |
| `/settings` | Themes, data (sync/archive/clear), users, Google Sheets URL (desktop) |
| `/login` | Authentication |

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 + CSS variables (theme presets + palettes)
- **State**: Zustand (with IndexedDB persistence)
- **Animations**: Framer Motion
- **Charts**: Recharts (lazy-loaded)
- **Validation**: Zod

### Backend / Data
- **Data store**: Google Sheets, accessed through a **Google Apps Script Web App** (`NEXT_PUBLIC_WEBAPP_URL`)
- **Local cache**: IndexedDB (`src/lib/local-db.ts`) for offline support
- **Abstraction**: `src/lib/unified-db.ts` + `sheets.ts` (read/write/delete/filter)
- **API routes**: Next.js Route Handlers under `src/app/api/**`
- **Auth**: Session cookies (JWT) + bcryptjs, enforced by `middleware.ts`

### Desktop
- **Framework**: Electron + electron-builder (Windows NSIS installer)
- **Persistence**: `electron-store` for the Sheets URL and app settings

### Deployment
- **Web**: Vercel (`vercel.json`) and Netlify (`netlify.toml`) configs are both present
- **Desktop**: Electron installer built with `npm run dist`

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        UI (React + Zustand)                    │
│   Pages (src/app/**)  ·  Stores (src/stores/**)               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   API Routes (src/app/api/**)                  │
│   auth/login · installations · eload · users · archive        │
│   Protected by middleware.ts (session cookie) + rate-limit     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              unified-db.ts / sheets.ts                         │
│   - getAll / append / update / delete / filter                 │
│   - snake_case ↔ camelCase mapping (sheets-mapper.ts)          │
└──────────────────────────────────────────────────────────────┘
            │                              │
            ▼                              ▼
┌──────────────────────┐      ┌─────────────────────────────────┐
│  Google Sheets        │      │  IndexedDB (local-db.ts)         │
│  (Apps Script Web App)│      │  offline cache + sync queue      │
└──────────────────────┘      └─────────────────────────────────┘
```

### Data flow
1. API routes call `sheets.ts`, which POSTs to the Google Apps Script Web App URL.
2. Responses are mapped snake_case → camelCase and cached in IndexedDB.
3. Zustand stores hydrate from the local cache; a sync action re-fetches from Sheets.
4. On desktop, the Sheets URL comes from `window.electron.getSheetsUrl()`; on web it comes from `NEXT_PUBLIC_WEBAPP_URL`.

---

## 🔌 API Reference

All `/api/**` routes except `POST /api/auth/login` require a valid session cookie.

- `POST /api/auth/login` — authenticate (username + password → session cookie)
- `POST /api/auth/logout` — clear session
- `GET|POST|PATCH|DELETE /api/installations` — installations CRUD
- `GET|POST|PATCH|DELETE /api/installations/[id]` — single installation
- `GET|POST|PATCH|DELETE /api/eload` — E-Load transactions
- `GET|POST|PATCH|DELETE /api/users` — user management (admin)
- `POST /api/archive` — archive previous years
- `GET /api/sheets-proxy`, `GET /api/debug-sheets` — Sheets helpers/debug

---

## ⚙️ Environment Variables

```env
# Google Apps Script Web App URL (deployment endpoint)
NEXT_PUBLIC_WEBAPP_URL=https://script.google.com/macros/s/.../exec

# App configuration
NEXT_PUBLIC_APP_NAME=3EJS Tech
```

On desktop, the Sheets URL is stored per-machine via `electron-store` and overrides the env value.

---

## 🧪 Development Guidelines

### Adding a feature
1. Update `src/lib/types.ts` with new interfaces.
2. Add/adjust the store in `src/stores/`.
3. Add the API route under `src/app/api/`.
4. Build the UI under `src/app/` or `src/components/`.
5. Run: `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`.

### Code style
- TypeScript strict mode.
- Functional components + hooks.
- Zustand for global state; use selectors to avoid unnecessary re-renders.
- Theme-aware styling via CSS variables (no hardcoded colors).

---

## ☁️ Google Apps Script Backend

The Sheets backend is implemented as a Google Apps Script Web App (the `doGet`/`doPost` handlers). The canonical deployment script is **`SHEETS_CODE.js`** at the repo root (deployed to the Apps Script project referenced by `NEXT_PUBLIC_WEBAPP_URL`). The `3EJS_Sheets_API*.ts` files are historical iterations kept for reference only.

---

## 📄 License

MIT License.
