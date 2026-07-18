# Top Navigation Bar — Design Spec

> Replaces the vertical sidebar with a horizontal top bar to maximize work area. Includes live date/time display, ink fill nav animations, and mobile hamburger overlay.

---

## 1. Layout Structure

```
Desktop (≥1024px):
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] 3EJS Tech  |  Saturday, July 18, 2026 | 08:53:02 AM     │  ← Left section
│              Dashboard  Subscribers  Clawback  Historical      │  ← Center nav
│                                   [⟳] [⚙] [↩]                  │  ← Right actions
└─────────────────────────────────────────────────────────────────┘

Mobile (<1024px):
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] 3EJS | 08:53 AM              [☰]  [⟳] [⚙] [↩]        │
└─────────────────────────────────────────────────────────────────┘
```

**Three sections (desktop):**
- **Left:** Logo (36×36px) + "3EJS Tech" + full date/time with live seconds
- **Center:** 4 nav items with ink fill animation + border hover effect
- **Right:** Sync, Settings, Logout buttons

---

## 2. Components

### New: `TopBar.tsx`
Primary navigation component replacing `Sidebar` for desktop and `MobileNav` for mobile.

### Modified: `LayoutWrapper.tsx`
Renders `TopBar` instead of `Sidebar`; removes left margin/padding since sidebar no longer exists.

### Deleted: `Sidebar.tsx`
No longer needed — navigation moves to `TopBar`.

### Deleted: `MobileNav.tsx`
Replaced by mobile version of `TopBar` (hamburger overlay).

### Updated: `globals.css`
Ink fill and border animation keyframes.

---

## 3. Animations

### Ink Fill (nav item click)
- **Trigger:** click on nav item
- **Effect:** colored circle expands from center, fills button with primary gradient
- **Duration:** 300ms ease-out
- **Result:** text turns white, background filled

### Border Glow (hover/active)
- **Hover:** subtle glowing outline animates in (200ms)
- **Active:** thicker glowing border, persists while page is active
- **Transition:** 200ms ease-in-out

### Live Clock
- **Format:** `Saturday, July 18, 2026 | 08:53:02 AM` (12-hour with seconds)
- **Updates:** every second via `setInterval` in a `useEffect`
- **Cleanup:** interval cleared on unmount

---

## 4. Mobile Behavior

- **Hamburger menu** opens full-screen overlay from right
- **Overlay contains:** 4 nav items stacked vertically (large touch targets: min 48px height)
- **Sync/Settings/Logout** remain visible in top bar on mobile
- **Overlay closes** on: nav item click, backdrop click, Escape key

---

## 5. Data & Behavior Preservation

| Feature | Current | New |
|---------|---------|-----|
| Sync button | Sidebar footer `SyncButton` | Top bar right — same `syncFromRemote()` call |
| Settings | Sidebar footer `SettingsButton` | Top bar right — same behavior |
| Logout | Sidebar footer button | Top bar right — same `logout()` call |
| Active nav highlight | `usePathname()` match | Same logic in `TopBar` |
| User info | Sidebar footer | Top bar right (desktop) / overlay (mobile) |
| Quick "New Install" action | Sidebar circular button | **Removed** (per user request) |

---

## 6. CSS Additions

```css
@keyframes inkFill {
  0% { transform: scale(0); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
}

@keyframes borderGlow {
  0% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 0 8px 2px color-mix(in srgb, var(--color-primary) 60%, transparent); }
  100% { box-shadow: 0 0 0 0 transparent; }
}

.nav-ink-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--ink-gradient, var(--color-primary));
  transform: scale(0);
  opacity: 0;
  pointer-events: none;
}

.nav-ink-fill.active::after {
  animation: inkFill 0.3s ease-out forwards;
}
```

---

## 7. Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| `lg` (≥1024px) | Full top bar with 3 sections |
| `md` (768–1023px) | Condensed top bar, hamburger for nav |
| `sm` (<768px) | Compact top bar, overlay nav |

---

## 8. Accessibility

- All nav items are `<a>` links with proper `href`
- Hamburger button has `aria-label="Open menu"` and `aria-expanded`
- Overlay traps focus, restores on close
- Clock uses `aria-live="polite"` for time updates
- Color contrast meets WCAG AA for all states

---

## 9. Out of Scope

- No routing changes
- No data layer changes
- No auth changes
- No API changes
- No new features — layout refactor only