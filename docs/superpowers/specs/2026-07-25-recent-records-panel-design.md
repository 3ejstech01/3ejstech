# Recent Records Panel — Design Spec

## Overview

A slide-out panel that appears from the right side of the screen when a new record is successfully saved and synced. It displays the last 5 most recently created records with their Subscriber Name, Account Number, Date Installed, and sync status indicators. The panel auto-dismisses after 5 seconds (pauses on hover).

## Trigger

The panel is triggered by a successful flush of the sync queue. When `flushQueue()` in `src/lib/sync-queue.ts` successfully syncs a record to Google Sheets, it emits a custom `record-saved` DOM event on `window`.

## Data Source

- Records are fetched from the `installations` store in IndexedDB via `getAllInstallations()` in `src/lib/unified-db.ts`
- Records are sorted by `createdAt` descending, limited to the last 5

## Component: `RecentRecordsPanel`

**Location**: `src/components/recent-records/RecentRecordsPanel.tsx`

**Behavior**:
- Slides in from the right edge of the viewport
- Shows a header: "Recent Records" with a close button
- Each record displays:
  - **Subscriber Name** — the `subscriberName` field
  - **Account Number** — the `accountNumber` field
  - **Date Installed** — the `dateInstalled` field, formatted as a short date
  - **Sync Status** — a progress indicator with color coding:
    - Green (synced to both local and remote)
    - Amber (saved locally, not yet synced to remote)
    - Gray (pending sync)
- Auto-dismisses after 5 seconds
- Pauses auto-dismiss when the user hovers over the panel
- Can be manually closed via the close button

## CSS / Styling

- Uses existing Tailwind CSS utility classes and CSS variables from the app's design system
- Panel has a fixed position on the right side, below the TopBar
- Width: ~380px
- Background: matches the app's card/surface color (supports dark mode)
- Animation: smooth slide-in from right (300ms ease-out)

## Sync Status Indicator (Progress Indicator)

Each record row shows a small progress-like indicator:
- **Fully synced**: Green pulsing dot or mini progress bar (100% filled, green)
- **Local only**: Amber/yellow indicator (partial fill)
- **Pending**: Gray indicator (empty or low fill)

## Event Flow

1. User submits a new installation record
2. `createInstallation()` saves to IndexedDB
3. Sync queue processes the `create` operation
4. `flushQueue()` succeeds → dispatches `window.dispatchEvent(new CustomEvent('record-saved'))`
5. `RecentRecordsPanel` listens for `record-saved` event
6. Panel fetches last 5 records from IndexedDB via `getAllInstallations()`
7. Panel slides in with the records
8. After 5 seconds (or on close), panel slides out and unmounts

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/recent-records/RecentRecordsPanel.tsx` | Create |
| `src/components/recent-records/RecentRecordsPanel.module.css` | Create (or use Tailwind inline) |
| `src/lib/sync-queue.ts` | Modify — add `record-saved` event dispatch on successful flush |
| `src/App.tsx` or layout | Modify — include `RecentRecordsPanel` in the app tree |
| `src/components/common/TopBar.tsx` | Optional — add a subtle indicator badge showing count of pending records |

## Design Constraints

- Must NOT hinder or overlap existing tables (Subscribers, Installations, Dashboard)
- Must be lightweight — no heavy animations or external dependencies
- Must support both light and dark themes
- Must be responsive — on screens < 768px, the panel should be full-width
- Must handle the case where the sync queue has no pending records gracefully