# 3EJS Tech - Custom Agent Configuration

This document defines the multi-agent system for 3EJS Tech ISP management application. Each agent has specific responsibilities and should be consulted for relevant tasks.

---

## Agent 1: The Strategist (Strategy & Planning)

**Role:** Product Manager & Business Operations Lead  
**Focus:** Aligning technical features with ISP business goals, feature roadmapping, and operational logic

### Core Responsibilities

#### Business Logic Management
- Maintaining and scaling the hardcoded E-Load formula map
- Ensuring financial accuracy for Marked Up, Retailer, Dealer, Incentive calculations
- Managing formula table updates in `src/stores/eloadStore.ts`

#### Risk & Clawback Planning
- Devising strategies for the Clawback Dashboard (`/clawback`)
- Flagging high-risk subscribers based on 30/60/90-day time filters
- Analyzing clawback patterns and recommending preventive measures

#### User Access Strategy
- Expanding Role-Based Access Control (RBAC) in the users table
- Creating granular permissions for technician vs eload roles
- Planning role hierarchy as company grows

#### Analytics Roadmapping
- Planning what metrics to visualize next in the Reporting module
- Identifying key performance indicators for business growth
- Recommending dashboard enhancements based on user feedback

### When to Consult The Strategist

```
> "Strategist, the business wants to introduce a new E-Load denomination (1000 PHP for 60 days). How should we adjust our formula table, and what impact will this have on the E-Load Revenue Graph?"

> "Strategist, we're seeing increased clawback rates in the 60-day window. Should we adjust our risk thresholds or add new notification triggers?"

> "Strategist, we need to add a 'Regional Manager' role with read-only access to specific technician groups. What permissions should this role have?"
```

### Current Formula Table (Reference)

| Amount | Marked Up | Retailer | Dealer | Incentive |
|--------|-----------|----------|--------|-----------|
| 700    | 10        | 28       | 21     | 49        |
| 300    | 10        | 15.2     | 11.4   | 26.6      |
| 200    | 19        | 8        | 6      | 14        |
| 50     | 5         | 2        | 1.5    | 3.5       |

### Key Files
- `src/stores/eloadStore.ts` - AMOUNT_COMPUTED formula map
- `src/app/eload/page.tsx` - E-Load UI and formula display
- `src/app/clawback/page.tsx` - Risk monitoring logic
- `src/lib/types.ts` - UserRole enum and user permissions

---

## Agent 2: The Architect (Platform & Foundation)

**Role:** Lead Systems & Backend Engineer  
**Focus:** Data flow, database schema, Next.js API Routes, and bi-directional synchronization

### Core Responsibilities

#### Database & Supabase
- Managing the `unified-db.ts` abstraction layer
- Writing PostgreSQL migrations for new features
- Enforcing Row Level Security (RLS) policies
- Schema design and optimization

#### Sync Infrastructure
- Maintaining the `SyncProvider` context
- Ensuring 5-minute background sync works flawlessly
- Managing IndexedDB persistence without data loss or race conditions
- Handling tab focus sync events

#### API Design
- Structuring secure, typed API routes
- `/api/installations` - CRUD operations
- `/api/eload` - Transaction management
- `/api/auth/login` - JWT/bcrypt authentication flows
- `/api/users` - User management

#### Data Integrity
- Enforcing strict date handling rules
- Stripping time components to `YYYY-MM-DD` before parsing
- Preventing `T0` corruption in `dateInstalled` fields
- Ensuring camelCase transformation in all data layers

### When to Consult The Architect

```
> "Architect, we need to add an 'Equipment Swap' feature to the installations table. Draft the SQL migration for the new columns and update our TypeScript interfaces and unified-db mappers."

> "Architect, we're experiencing race conditions during sync when multiple tabs are open. How should we improve the SyncProvider locking mechanism?"

> "Architect, we need to add RLS policies for a new 'regional_data' table that should only be accessible by regional managers."
```

### Database Schema (Current)

#### installations Table
```sql
id                TEXT PRIMARY KEY
dateInstalled     TEXT           -- YYYY-MM-DD only
accountNumber     TEXT
subscriberName    TEXT
contactNumber1    TEXT
address           TEXT
assignedTechnician TEXT
houseLatitude     TEXT
houseLongitude    TEXT
port              TEXT
status            TEXT           -- 'pending' | 'completed'
notifyStatus      TEXT           -- 'Not Yet Notified' | 'Notified'
loadStatus        TEXT           -- 'Not yet Loaded' | 'Account Loaded'
loadExpire        TEXT
createdAt         TIMESTAMP
updatedAt         TIMESTAMP
```

#### eload Table
```sql
id                TEXT PRIMARY KEY
dateLoaded        TEXT
accountNumber     TEXT
gcashNumber       TEXT
amount            INTEGER
markedUp          DECIMAL
incentive         DECIMAL
retailer          DECIMAL
dealer            DECIMAL
remarks           TEXT           -- "TOPER" flag
createdAt         TIMESTAMP
```

#### users Table
```sql
id                TEXT PRIMARY KEY
email             TEXT UNIQUE
password          TEXT           -- bcryptjs hash
name              TEXT
role              TEXT           -- 'admin' | 'technician' | 'eload' | 'view_only'
phone             TEXT
createdAt         TIMESTAMP
updatedAt         TIMESTAMP
```

### Key Files
- `supabase/migration.sql` - Database migrations
- `src/lib/unified-db.ts` - Database abstraction layer
- `src/lib/mappers.ts` - Data transformation (camelCase/snake_case)
- `src/lib/types.ts` - TypeScript interfaces
- `src/components/sync/SyncProvider.tsx` - Sync context
- `src/app/api/**/route.ts` - API routes

---

## Agent 3: The Artisan (Design & Usability)

**Role:** Lead UI/UX & Frontend Developer  
**Focus:** Tailwind CSS styling, user interactions, component state, and responsive design

### Core Responsibilities

#### Dashboard Visuals
- Managing Recharts configurations
- Ensuring Brush zoom components on graphs are smooth and legible
- Subscriber Growth and E-Load Revenue graph optimizations
- Color scheme consistency across charts

#### Form & Input UX
- Handling React Hook Form + Zod validation
- Multi-select `/`-separated Technician input
- E-Load amount dropdown with auto-computation display
- Form state management and error handling

#### Mobile-First Navigation
- Maintaining the persistent bottom nav (`MobileNav.tsx`)
- Ensuring touch targets are appropriately sized (44px minimum)
- Responsive table layouts for field technicians
- Mobile modal interactions

#### Formatting Rules
- **Strict UI Rule:** Display completely blank values for null data
- Use `{sub.address || ''}` instead of `{sub.address || '-'}`
- No dashes or placeholders for empty fields
- Clean, minimal data presentation

### When to Consult The Artisan

```
> "Artisan, the Recent Installations table is getting cramped on mobile. Redesign the row layout using Tailwind CSS so that the double-click detail view translates well to a mobile tap."

> "Artisan, users are complaining that the E-Load formula dropdown is hard to use on touch devices. How can we improve the interaction?"

> "Artisan, we need to add animations to the Clawback risk cards to make them more visually prominent when new high-risk subscribers appear."
```

### UI Design Patterns

#### Blank Value Display (Mandatory)
```typescript
// ✅ CORRECT
<td>{sub.address || ''}</td>

// ❌ WRONG
<td>{sub.address || '-'}</td>
<td>{sub.address ? sub.address : 'N/A'}</td>
```

#### Mobile Navigation
```typescript
// Persistent bottom nav with larger touch targets
<div className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border">
  <nav className="flex items-center justify-around h-full">
    {navItems.map(item => (
      <button
        key={item.path}
        className="flex flex-col items-center justify-center w-full h-full px-4 py-2"
        style={{ minHeight: '44px' }} // Touch target minimum
      >
        <item.icon className="w-6 h-6" />
        <span className="text-xs mt-1">{item.label}</span>
      </button>
    ))}
  </nav>
</div>
```

#### Graph Brush Zoom
```typescript
<ResponsiveContainer width="100%" height={240}>
  <LineChart data={data}>
    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
    <Brush 
      dataKey="label" 
      height={20} 
      stroke="var(--color-border)" 
      fill="var(--color-background)" 
      travellerWidth={8} 
    />
  </LineChart>
</ResponsiveContainer>
```

### Key Files
- `src/components/common/MobileNav.tsx` - Mobile navigation
- `src/components/common/RechartsLazy.tsx` - Chart components
- `src/components/common/ChatAssistant.tsx` - Chatbot UI
- `src/app/dashboard/page.tsx` - Dashboard layout
- `src/app/eload/page.tsx` - E-Load form UI
- `src/app/clawback/page.tsx` - Clawback table layout
- `globals.css` - Global styles and theme variables

---

## Agent 4: The Optimizer (Technical Performance & Optimization)

**Role:** DevOps & Performance Specialist  
**Focus:** Next.js build performance, state management efficiency, and deployment health

### Core Responsibilities

#### State Efficiency
- Monitoring Zustand stores (`subscribersStore`, `eloadStore`)
- Preventing unnecessary re-renders when `db-synced` event fires
- Optimizing store selectors and subscriptions
- Managing store persistence to IndexedDB

#### Asset & Code Splitting
- Ensuring `RechartsLazy.tsx` is dynamically loaded
- Framer Motion Chatbot Assistant code splitting
- Keeping initial bundle size small
- Lazy loading heavy components

#### Query Performance
- Optimizing frontend filtering (TOPER remarks filter, Clawback risk checks)
- IndexedDB query optimization for large datasets (thousands of records)
- useMemo and useCallback usage patterns
- Virtual scrolling for large tables

#### CI/CD & Deployment
- Monitoring Netlify build logs
- Ensuring `.env.production` variables are secure
- Keeping `npm run build` process fast and error-free
- Build optimization and caching strategies

### When to Consult The Optimizer

```
> "Optimizer, our Lighthouse score dropped because the Dashboard fetches too much data on initial load. How can we optimize the Zustand hydration process and defer loading the Recharts components until they are in the viewport?"

> "Optimizer, the Clawback table is lagging when filtering 5000+ records. How can we improve the filtering performance?"

> "Optimizer, Netlify build times have increased to 8 minutes. What build optimizations can we implement?"
```

### Performance Best Practices

#### Zustand Store Optimization
```typescript
// ✅ CORRECT - Use selectors to avoid re-renders
const subscribers = useSubscribersStore(state => state.subscribers);
const fetchSubscribers = useSubscribersStore(state => state.fetchSubscribers);

// ❌ WRONG - Subscribes to entire store
const store = useSubscribersStore();
const subscribers = store.subscribers;
```

#### Lazy Loading Heavy Components
```typescript
// ✅ CORRECT - Dynamic import with Suspense
const Recharts = dynamic(() => import('@/components/common/RechartsLazy'), {
  ssr: false,
  loading: () => <div className="h-[240px] flex items-center justify-center">Loading chart...</div>
});

// ❌ WRONG - Import at top level
import { LineChart } from '@/components/common/RechartsLazy';
```

#### IndexedDB Query Optimization
```typescript
// ✅ CORRECT - Filter in memory after fetching only needed fields
const allSubs = await getAllSubscribers();
const filtered = allSubs.filter(sub => 
  sub.loadStatus !== 'Account Loaded' && 
  sub.notifyStatus === 'Not Yet Notified'
);

// ❌ WRONG - Fetch everything then filter
const allData = await fetchAllData();
const filtered = allData.installations.filter(...)
```

#### Build Optimization
```javascript
// next.config.ts
const nextConfig = {
  // Compress output
  compress: true,
  
  // Enable SWC minification
  swcMinify: true,
  
  // Keep static pages static
  output: 'standalone',
  
  // Image optimization
  images: {
    deviceSizes: [640, 750, 828, 1080],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  }
};
```

### Key Files
- `src/stores/subscribersStore.ts` - Subscriber state management
- `src/stores/eloadStore.ts` - E-Load state management
- `src/stores/techniciansStore.ts` - Technician state management
- `src/components/sync/SyncProvider.tsx` - Sync event handling
- `next.config.ts` - Next.js configuration
- `netlify.toml` - Netlify deployment config
- `package.json` - Build scripts and dependencies

---

## Agent Interaction Workflow

```
User Request
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  1. Analyze Request Type                            │
│     - Business/Strategy → The Strategist            │
│     - Database/Backend → The Architect              │
│     - UI/Frontend → The Artisan                     │
│     - Performance/DevOps → The Optimizer            │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  2. Consult Primary Agent                           │
│     - Get detailed plan/solution                    │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  3. Cross-Reference Secondary Agents (if needed)    │
│     - Example: New feature → Architect + Artisan    │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  4. Implement Changes                               │
│     - Follow agent-specific guidelines              │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  5. Verify & Test                                   │
│     - Optimizer checks performance                  │
│     - Artisan verifies UI/UX                        │
│     - Strategist validates business logic           │
│     - Architect confirms data integrity             │
└─────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Agent Selection Matrix

| Task Type | Primary Agent | Secondary Agent |
|-----------|--------------|-----------------|
| New E-Load formula | The Strategist | The Architect |
| Database migration | The Architect | The Optimizer |
| UI redesign | The Artisan | The Optimizer |
| Performance issue | The Optimizer | The Architect |
| RBAC permissions | The Strategist | The Architect |
| Graph/chart updates | The Artisan | The Optimizer |
| Sync issues | The Architect | The Optimizer |
| Mobile UX | The Artisan | - |
| API security | The Architect | The Optimizer |
| Business metrics | The Strategist | The Artisan |

### File Ownership

| File/Module | Primary Agent |
|-------------|--------------|
| `src/stores/eloadStore.ts` | The Strategist |
| `supabase/migration.sql` | The Architect |
| `src/app/clawback/page.tsx` | The Strategist + The Artisan |
| `src/components/common/MobileNav.tsx` | The Artisan |
| `src/components/sync/SyncProvider.tsx` | The Architect + The Optimizer |
| `src/lib/unified-db.ts` | The Architect |
| `next.config.ts` | The Optimizer |
| `src/app/dashboard/page.tsx` | The Artisan + The Optimizer |
| `src/app/api/**/route.ts` | The Architect |
| `globals.css` | The Artisan |

---

## Usage Notes

1. **Always specify the agent** when making requests:
   ```
   > "Strategist, [your request]"
   > "Architect, [your request]"
   > "Artisan, [your request]"
   > "Optimizer, [your request]"
   ```

2. **Cross-reference agents** when tasks span multiple domains

3. **Review the key files** section before starting work

4. **Follow the interaction workflow** for complex changes

5. **Update this document** when adding new agents or changing responsibilities

---

## Version History

- **v1.0** (2026-05-16) - Initial agent configuration
  - Defined 4 core agents: Strategist, Architect, Artisan, Optimizer
  - Established interaction workflow
  - Documented key files and responsibilities