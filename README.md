# 3EJS Tech - ISP Management Application

A comprehensive, production-grade web application for managing Internet Service Provider operations including subscriber management, E-Load transactions, technician tracking, and clawback monitoring. Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase PostgreSQL.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Module Documentation](#module-documentation)
- [API Reference](#api-reference)
- [Deployment](#deployment)

---

## ✨ Features

### 1. **Dashboard** (`/dashboard`)
- **Welcome Message**: Dynamic greeting with current year ("Here is your 2026 performance and overview")
- **Stat Cards with Glow Animations**:
  - Total Subscribers (Installations + Historical Data combined count)
  - E-Load Transactions (count)
  - Active Installations (current installations count)
  - Historical Records (archived installations count)
- **Subscriber Installations Graph**: Monthly installations with Brush zoom (all-time data)
- **Recent E-Load Transactions Table**: Scrollable list showing Account #, Loaded by, GCash Reference, Amount
- **Clawback Report**: Shows subscribers requiring attention within 90 days with notify/load status filtering
- **Latest Installations Table**: Most recent 10 installations with double-click detail view
- **Card Animations**: Subtle glow effects on hover using theme-aware gradients

### 2. **Sidebar Navigation**
- **Circular Quick Action Buttons**: Side-by-side New Installation and New E-Load buttons
  - Theme-aware gradient colors (from-primary to-secondary)
  - Pulsing glow animation
  - Hover to reveal text labels
- **Sync Database Button**: Located in footer beside Settings and Logout
- **Settings Button**: Glowing animation with theme primary color
- **Logout Button**: Red gradient with modern icon
- **All buttons have ripple click animations**

### 3. **Clawback Dashboard** (`/clawback`)
- **Risk Monitoring**: Shows subscribers requiring attention
  - `loadStatus !== 'Account Loaded'`
  - `notifyStatus === 'Not Yet Notified'` OR `notifyStatus === 'Notified'`
  - Within configured days (30/60/90 days)
- **Time-based Filtering**: 30/60/90 days options
- **Search Functionality**: Filter by name, account, phone, technician
- **Address Display**: Full address with blank display for null values
- **Modal Actions**: Mark as Notified / Mark as Loaded with confirmation dialogs

### 4. **Subscribers Management** (`/subscribers`)
- **Subscriber List**: Searchable, sortable grid
- **Detail Modal**: View/edit subscriber information
- **Date Sort**: Dropdown (Latest First / Oldest First)
- **Fields**: Name, Account #, Contact, Address, Technician, Load/Notify Status
- **Status Editing**: Only via Clawback Dashboard (removed from modal)

### 5. **E-Load System** (`/eload`)
- **Transaction Entry**: Amount dropdown with auto-computed values
  - Options: 50 (1 DAY), 200 (7 DAYS), 300 (15 DAYS), 700 (30 DAYS)
- **Table Columns**: Service, Date, Amount, GCash Reference, Account, Remarks
  - (Removed: Marked Up, Incentive, Retailer, Dealer)
- **Formula Auto-computation**:
  | Amount | Marked Up | Retailer | Dealer | Incentive |
  |--------|-----------|----------|--------|-----------|
  | 700    | 10        | 28       | 21     | 49        |
  | 300    | 10        | 15.2     | 11.4   | 26.6      |
  | 200    | 19        | 8        | 6      | 14        |
  | 50     | 5         | 2        | 1.5    | 3.5       |
- **TOPER Filter**: Shows only records with "TOPER" in remarks
- **Search**: Filter by GCash, account, reference number
- **Duplicate Prevention**: Blocks submission of duplicate reference numbers
- **Stats**: Total (count+amount), Accounts

### 6. **Historical Data** (`/historical`)
- **Archived Installations**: View all historical/archived records
- **Combined with Active**: Total subscribers count includes both active and historical

### 7. **Reporting** (`/reporting`)
- **Simplified Design**: Print-focused layout
- **Subscriber Report**:
  - Address and Contact Number columns
  - Records from both Installations and Historical Data tables
- **Print Button**: Print-optimized layout

### 8. **Settings** (`/settings`)
- **Themes Tab**: Theme customizer for app appearance
- **Data Tab**:
  - Sync from Supabase
  - Archive Previous Years
  - Clear Local Database
- **Users Tab**: User management with role-based access
  - Roles: Admin, Technician, E-Load, View Only
  - Password required for all users (including View Only)

### 9. **Chatbot Assistant**
- **Floating Button**: Bottom-right corner
- **Cute Character**: Animated glasses + folder icon
- **Query Support**: Subscribers, E-Load totals, technicians

### 10. **Mobile Navigation**
- **Persistent Bottom Nav**: Always visible on mobile
- **Larger Icons**: Touch-friendly design
- **Labels**: Clear navigation text

### 11. **Theme System**
- **CSS Variable-based**: Full theme synchronization
- **Light/Dark Mode**: Toggle with system preference detection
- **Theme Presets**: Multiple color options including ocean-blue, emerald-green, sunset-orange, etc.

### 12. **Global Animations**
- **Ripple Effect**: All buttons have click ripple animation
- **Glow Effects**: Cards and buttons have subtle pulsing glow on hover
- **Framer Motion**: Smooth transitions and animations throughout

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with CSS Variables
- **State Management**: Zustand (IndexedDB persistence)
- **Animations**: Framer Motion
- **Charts**: Recharts (with Brush component)
- **Forms**: React Hook Form + Zod validation

### Backend
- **Runtime**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **ORM**: Custom unified database layer
- **Authentication**: JWT + bcryptjs

### Data Layer
- **Local Storage**: IndexedDB (via Zustand stores)
- **Sync**: Bi-directional sync with Supabase
- **Type Safety**: Unified TypeScript types across stack

### Deployment
- **Platform**: Netlify
- **CI/CD**: Auto-deploy on push to `main`

---

## 📁 Project Structure

```
3EJS-main/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/login/route.ts          # Login endpoint
│   │   │   ├── eload/route.ts                # E-Load CRUD
│   │   │   ├── installations/route.ts       # Installations list
│   │   │   ├── installations/[id]/route.ts    # Single installation
│   │   │   ├── users/route.ts                # User management
│   │   │   └── archive/route.ts              # Archive old records
│   │   ├── clawback/page.tsx                 # Clawback dashboard
│   │   ├── dashboard/page.tsx               # Main dashboard
│   │   ├── eload/page.tsx                    # E-Load module
│   │   ├── historical/page.tsx              # Historical data
│   │   ├── installations/page.tsx            # New installations
│   │   ├── login/page.tsx                    # Login page
│   │   ├── reporting/page.tsx               # Reports
│   │   ├── subscribers/page.tsx             # Subscriber list
│   │   ├── settings/page.tsx                 # Settings
│   │   └── theme/page.tsx                    # Theme settings
│   ├── components/
│   │   ├── common/
│   │   │   ├── ChatAssistant.tsx            # Chatbot component
│   │   │   ├── ClientRipple.tsx              # Global ripple effect
│   │   │   ├── Header.tsx                    # Page header
│   │   │   ├── LayoutWrapper.tsx            # Layout wrapper
│   │   │   ├── MobileNav.tsx                 # Mobile navigation
│   │   │   ├── PageContainer.tsx            # Layout wrapper
│   │   │   ├── RechartsLazy.tsx             # Lazy-loaded charts
│   │   │   ├── SettingsButton.tsx           # Settings with glow
│   │   │   ├── Sidebar.tsx                   # Sidebar navigation
│   │   │   └── SyncButton.tsx                # Sync with Supabase
│   │   ├── sync/
│   │   │   └── SyncProvider.tsx              # Sync context
│   │   └── theme/
│   │       └── ThemeCustomizer.tsx          # Theme settings
│   ├── hooks/
│   │   ├── useAuth.ts                        # Authentication hook
│   │   ├── useTheme.ts                       # Theme management
│   │   └── useQuickAction.ts                # Quick action state
│   ├── lib/
│   │   ├── types.ts                         # TypeScript interfaces
│   │   ├── unified-db.ts                    # Database abstraction
│   │   ├── supabase.ts                      # Supabase client
│   │   ├── local-db.ts                       # IndexedDB wrapper
│   │   ├── mappers.ts                       # Data transformation
│   │   ├── utils.ts                         # Utility functions
│   │   ├── auth-utils.ts                    # Auth utilities
│   │   ├── validation.ts                    # Zod schemas
│   │   └── axios.ts                         # HTTP client
│   ├── stores/
│   │   ├── subscribersStore.ts             # Subscriber state
│   │   ├── eloadStore.ts                    # E-Load state
│   │   ├── techniciansStore.ts              # Technician state
│   │   ├── usersStore.ts                    # Users state
│   │   └── historicalDataStore.ts          # Historical data state
│   └── context/
│       └── AuthContext.tsx                  # Auth provider
├── supabase/
│   └── migration.sql                        # Database migrations
├── public/
│   └── logo.png                             # App logo
├── .env.local                               # Environment variables
├── .env.production                          # Production env
├── netlify.toml                             # Netlify config
└── package.json                             # Dependencies
```

---

## 🏗 Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                          │
│  (React Components + Zustand Stores)                         │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Unified Database Layer                     │
│  - getAllInstallations()                                     │
│  - getAllEload()                                             │
│  - getAllHistoricalData()                                    │
│  - toCamelCase transformation                                │
│  - Falls back to IndexedDB on Supabase failure               │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase (PostgreSQL)                      │
│  - installations (active records)                            │
│  - historicaldata (archived records)                         │
│  - eload (transactions)                                      │
│  - users (authentication)                                    │
└─────────────────────────────────────────────────────────────┘
```

### State Management

- **Zustand Stores**: Each module has its own store with IndexedDB persistence
- **Sync Flow**:
  1. User logs in → fetches from Supabase
  2. Data cached in IndexedDB for offline support
  3. Sync button triggers manual refresh from Supabase
  4. Dispatches `db-synced` event
  5. All stores re-fetch updated data

---

## 🗄 Database Schema

### `installations` Table

```sql
id                    TEXT PRIMARY KEY
no                    TEXT
dateInstalled         TEXT           -- Date only (YYYY-MM-DD)
agentName             TEXT
joNumber              TEXT UNIQUE
accountNumber         TEXT
subscriberName        TEXT
contact1              TEXT
contact2              TEXT
address               TEXT
houselatitude         TEXT           -- GPS coordinates
houselongitude        TEXT
port                  TEXT
technician            TEXT
modemSerial           TEXT
reelNum               TEXT
reelStart             TEXT
reelEnd               TEXT
fiberOpticCable       TEXT
mechConnector         TEXT
sClamp                TEXT
patchcordApscsc       TEXT
houseBracket          TEXT
midSpan               TEXT
cableClip             TEXT
ftthTerminalBox       TEXT
doubleSidedTape       TEXT
cableTieWrap          TEXT
status                TEXT           -- Status values
loadExpire            TEXT           -- Load expiry date
notifyStatus          TEXT           -- 'Not Yet Notified' | 'Notified' | 'Not Needed'
loadStatus            TEXT           -- 'Not yet Loaded' | 'Account Loaded'
createdAt             TIMESTAMPTZ
updatedAt             TIMESTAMPTZ
```

### `historicaldata` Table

Same structure as installations (minus material columns).

### `eload` Table

```sql
id                  TEXT PRIMARY KEY
gcashHandler        TEXT
dateLoaded          TEXT
gcashReference      TEXT
timeLoaded          TEXT
amount              NUMERIC(10,2)
accountNumber       TEXT
markup              NUMERIC(10,2)
incentive           NUMERIC(10,2)
retailer            NUMERIC(10,2)
dealer              NUMERIC(10,2)
remarks             TEXT           -- "TOPER" flag
createdAt           TIMESTAMPTZ
updatedAt           TIMESTAMPTZ
```

### `users` Table

```sql
id                  TEXT PRIMARY KEY
username            TEXT UNIQUE NOT NULL
password            TEXT NOT NULL  -- bcrypt hash
role                TEXT NOT NULL -- 'admin' | 'technician' | 'eload' | 'view_only'
createdat           TIMESTAMPTZ
```

### RLS Policies

All tables have SELECT, INSERT, UPDATE, DELETE policies with `USING (true)` for full access.

---

## 🔌 API Reference

### Authentication

**POST** `/api/auth/login`
```json
{
  "username": "admin",
  "password": "password123"
}
```
Response: `{ user: { id, username, name, email, role, createdAt } }`

### Installations

**GET** `/api/installations` - List all installations
**POST** `/api/installations` - Create installation
**PATCH** `/api/installations/[id]` - Update installation
**DELETE** `/api/installations?id=xxx` - Delete installation

### E-Load

**GET** `/api/eload` - List transactions
**POST** `/api/eload` - Create transaction
**PATCH** `/api/eload` - Update transaction
**DELETE** `/api/eload?id=xxx` - Delete transaction

### Users

**GET** `/api/users` - List users (admin only)
**POST** `/api/users` - Create user (admin only)
**PATCH** `/api/users` - Update user (admin only)
**DELETE** `/api/users?id=xxx` - Delete user (admin only)

---

## 🚀 Deployment

### Netlify Auto-Deploy

1. Push to `main` branch
2. Netlify automatically builds and deploys
3. Set environment variables in Netlify dashboard

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
DATA_SOURCE=supabase
```

---

## 🔧 Development Guidelines

### Adding New Features

1. Update `src/lib/types.ts` with new interfaces
2. Create/modify store in `src/stores/`
3. Add API route in `src/app/api/`
4. Create component in `src/app/` or `src/components/`
5. Run type check: `npm run typecheck`
6. Run lint: `npm run lint`
7. Build: `npm run build`

### Code Style

- **TypeScript**: Strict mode enabled
- **Components**: Functional components with hooks
- **State**: Zustand for global state
- **Animations**: Framer Motion for complex animations
- **Styling**: Tailwind CSS with theme-aware CSS variables

---

## 📄 License

MIT License - See LICENSE file for details