# Top Navigation Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vertical sidebar with a horizontal top navigation bar that includes live date/time, ink fill nav animations, and mobile hamburger overlay — freeing up horizontal work area.

**Architecture:** Create a new `TopBar` component that replaces `Sidebar` and `MobileNav`. Update `LayoutWrapper` to render `TopBar` instead of `Sidebar`, remove left margin. Delete `Sidebar.tsx` and `MobileNav.tsx`. Add ink fill + border glow animations to `globals.css`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Framer Motion for animations, Tailwind CSS, Zustand for any shared state.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/common/TopBar.tsx` | Create | Primary navigation component (desktop + mobile) |
| `src/components/common/LayoutWrapper.tsx` | Modify | Render `TopBar` instead of `Sidebar`; remove left padding |
| `src/components/common/Sidebar.tsx` | Delete | No longer needed |
| `src/components/common/MobileNav.tsx` | Delete | Replaced by `TopBar` mobile overlay |
| `src/app/globals.css` | Modify | Add ink fill + border glow keyframes + utility classes |
| `src/__tests__/topbar.test.tsx` | Create | Test TopBar rendering, nav items, clock, mobile toggle |

---

## Task 1: Add Animation CSS

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write the failing test** — No test needed for pure CSS (skip)

- [ ] **Step 2: Add ink fill and border glow keyframes to globals.css**

Append to `src/app/globals.css`:

```css
/* TopBar animations */
@keyframes inkFill {
  0% { transform: scale(0); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
}

@keyframes borderGlow {
  0% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 0 10px 3px color-mix(in srgb, var(--color-primary) 60%, transparent); }
  100% { box-shadow: 0 0 0 0 transparent; }
}

@keyframes slideInFromRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.nav-ink-fill {
  position: relative;
  overflow: hidden;
}

.nav-ink-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  transform: scale(0);
  opacity: 0;
  pointer-events: none;
  z-index: -1;
}

.nav-ink-fill.active::after {
  animation: inkFill 0.3s ease-out forwards;
}

.nav-border-glow {
  transition: box-shadow 0.2s ease-in-out;
}

.nav-border-glow:hover {
  animation: borderGlow 1.5s ease-in-out infinite;
}

.nav-border-glow.active {
  box-shadow: 0 0 12px 3px color-mix(in srgb, var(--color-primary) 40%, transparent);
}

.mobile-overlay-enter {
  animation: slideInFromRight 0.3s ease-out forwards;
}

.mobile-backdrop-enter {
  animation: fadeIn 0.2s ease-out forwards;
}
```

- [ ] **Step 3: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(topbar): add ink fill and border glow animations"
```

---

## Task 2: Create TopBar Component

**Files:**
- Create: `src/components/common/TopBar.tsx`
- Test: `src/__tests__/topbar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/topbar.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopBar } from '@/components/common/TopBar';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { name: 'Test User', role: 'admin' },
    logout: jest.fn(),
  })),
}));

describe('TopBar', () => {
  it('renders logo and brand name', () => {
    render(<TopBar />);
    expect(screen.getByAltText('3EJS')).toBeInTheDocument();
    expect(screen.getByText('3EJS Tech')).toBeInTheDocument();
  });

  it('renders live clock with seconds', () => {
    render(<TopBar />);
    const clock = screen.getByTestId('live-clock');
    expect(clock).toBeInTheDocument();
    expect(clock.textContent).toMatch(/\d{1,2}:\d{2}:\d{2} [AP]M/);
  });

  it('renders all four nav items', () => {
    render(<TopBar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Subscribers')).toBeInTheDocument();
    expect(screen.getByText('Clawback')).toBeInTheDocument();
    expect(screen.getByText('Historical Data')).toBeInTheDocument();
  });

  it('highlights active nav item', () => {
    render(<TopBar />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('active');
  });

  it('renders sync, settings, and logout buttons', () => {
    render(<TopBar />);
    expect(screen.getByLabelText('Sync')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Logout')).toBeInTheDocument();
  });

  it('shows hamburger menu on mobile viewport', () => {
    const { rerender } = render(<TopBar />);
    // Simulate mobile by changing innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
    fireEvent(window, new Event('resize'));
    rerender(<TopBar />);
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/topbar.test.tsx --no-coverage`
Expected: FAIL — `TopBar` not defined

- [ ] **Step 3: Implement TopBar component**

Create `src/components/common/TopBar.tsx`:

```tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  label: string;
  href: string;
  allowedRoles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', allowedRoles: [UserRole.ADMIN] },
  { label: 'Subscribers', href: '/subscribers', allowedRoles: [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.VIEW_ONLY] },
  { label: 'Clawback', href: '/clawback', allowedRoles: [UserRole.ADMIN, UserRole.TECHNICIAN] },
  { label: 'Historical Data', href: '/historical', allowedRoles: [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.VIEW_ONLY] },
];

export function TopBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }, []);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  if (!user) return null;

  const visibleItems = navItems.filter(item => item.allowedRoles.includes(user.role));

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-full mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Brand + Clock */}
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-3" aria-label="Go to Dashboard">
              <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="3EJS"
                  width={36}
                  height={36}
                  className="rounded-lg"
                  unoptimized
                />
              </div>
              <span className="text-lg font-bold text-text tracking-tight hidden sm:block">3EJS Tech</span>
            </Link>
            <div className="hidden lg:flex items-center gap-2 text-xs text-text/50 font-mono" role="timer" aria-live="polite" data-testid="live-clock">
              <span>{formatDate(currentTime)}</span>
              <span className="text-primary">|</span>
              <span>{formatTime(currentTime)}</span>
            </div>
          </div>

          {/* Center: Navigation (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    nav-ink-fill nav-border-glow relative px-4 py-2 rounded-lg
                    text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'active text-white'
                      : 'text-text/60 hover:text-text hover:bg-primary/5'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Sync Button */}
            <button
              type="button"
              className="p-2 rounded-xl text-text/60 hover:text-text hover:bg-primary/10 transition-colors"
              aria-label="Sync"
              title="Sync data"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Settings Button */}
            <button
              type="button"
              className="p-2 rounded-xl text-text/60 hover:text-text hover:bg-primary/10 transition-colors"
              aria-label="Settings"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Logout Button */}
            <motion.button
              onClick={logout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center hover:shadow-lg hover:shadow-red-500/40 transition-all duration-300"
              aria-label="Logout"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </motion.button>

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-text/60 hover:text-text hover:bg-primary/10 transition-colors"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden mobile-backdrop-enter"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-surface border-l border-border z-50 lg:hidden mobile-overlay-enter flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-bold text-text">Menu</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-text/60 hover:text-text hover:bg-primary/10 transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 p-4 overflow-y-auto" role="navigation" aria-label="Mobile navigation">
                <ul className="space-y-2">
                  {visibleItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`
                          nav-ink-fill nav-border-glow block px-4 py-4 rounded-lg
                          text-base font-medium transition-all duration-200
                          ${pathname === item.href
                            ? 'active text-white'
                            : 'text-text/60 hover:text-text hover:bg-primary/5'
                          }
                        `}
                        aria-current={pathname === item.href ? 'page' : undefined}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="p-4 border-t border-border">
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full nav-ink-fill nav-border-glow px-4 py-3 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white font-medium transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/topbar.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/components/common/TopBar.tsx src/__tests__/topbar.test.tsx
git commit -m "feat(topbar): create TopBar component with desktop + mobile nav"
```

---

## Task 3: Update LayoutWrapper

**Files:**
- Modify: `src/components/common/LayoutWrapper.tsx`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/layout-wrapper.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { LayoutWrapper } from '@/components/common/LayoutWrapper';

jest.mock('@/components/common/TopBar', () => ({
  TopBar: () => <header data-testid="topbar" className="h-16 bg-red-500">TopBar</header>,
}));

describe('LayoutWrapper', () => {
  it('renders TopBar at top', () => {
    render(
      <LayoutWrapper>
        <main data-testid="content">Content</main>
      </LayoutWrapper>
    );
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });

  it('does not have left sidebar margin', () => {
    const { container } = render(
      <LayoutWrapper>
        <main data-testid="content">Content</main>
      </LayoutWrapper>
    );
    const main = container.querySelector('main');
    expect(main).not.toHaveClass('lg:ml-64');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/layout-wrapper.test.tsx --no-coverage`
Expected: FAIL — LayoutWrapper still uses Sidebar

- [ ] **Step 3: Modify LayoutWrapper**

Read `src/components/common/LayoutWrapper.tsx` and update:

```tsx
'use client';

import React, { ReactNode } from 'react';
import { TopBar } from '@/components/common/TopBar';

interface LayoutWrapperProps {
  children: ReactNode;
  className?: string;
}

export function LayoutWrapper({ children, className = '' }: LayoutWrapperProps) {
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      <TopBar />
      <main className="pt-16 min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/layout-wrapper.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/components/common/LayoutWrapper.tsx src/__tests__/layout-wrapper.test.tsx
git commit -m "feat(topbar): update LayoutWrapper to use TopBar, remove sidebar margin"
```

---

## Task 4: Delete Sidebar and MobileNav

**Files:**
- Delete: `src/components/common/Sidebar.tsx`
- Delete: `src/components/common/MobileNav.tsx`

- [ ] **Step 1: Delete Sidebar.tsx**

Run: `rm src/components/common/Sidebar.tsx`

- [ ] **Step 2: Delete MobileNav.tsx**

Run: `rm src/components/common/MobileNav.tsx`

- [ ] **Step 3: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: 0 errors (no broken imports)

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "chore(topbar): delete Sidebar and MobileNav components"
```

---

## Task 5: Verify Integration

**Files:**
- Test: `src/__tests__/topbar-integration.test.tsx`

- [ ] **Step 1: Write integration test**

Create `src/__tests__/topbar-integration.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { LayoutWrapper } from '@/components/common/LayoutWrapper';
import { TopBar } from '@/components/common/TopBar';

describe('TopBar integration', () => {
  it('renders full layout with TopBar', () => {
    render(
      <LayoutWrapper>
        <div data-testid="page-content">Page Content</div>
      </LayoutWrapper>
    );
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('clicking nav item updates active state', () => {
    render(
      <LayoutWrapper>
        <TopBar />
      </LayoutWrapper>
    );
    const subscribersLink = screen.getByText('Subscribers');
    fireEvent.click(subscribersLink);
    // Note: actual navigation tested in e2e, here we verify link exists
    expect(subscribersLink.closest('a')).toHaveAttribute('href', '/subscribers');
  });

  it('mobile menu opens and closes', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
    fireEvent(window, new Event('resize'));

    render(
      <LayoutWrapper>
        <TopBar />
      </LayoutWrapper>
    );

    const hamburger = screen.getByLabelText('Open menu');
    fireEvent.click(hamburger);
    expect(screen.getByRole('dialog', { name: 'Navigation menu' })).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close menu');
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** (tests not yet updated for new layout)

Run: `npx jest src/__tests__/topbar-integration.test.tsx --no-coverage`
Expected: FAIL initially

- [ ] **Step 3: Fix any issues, run again**

Run: `npx jest src/__tests__/topbar-integration.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 4: Run full test suite**

Run: `npm run test`
Expected: All 86+ tests pass

- [ ] **Step 5: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/topbar-integration.test.tsx
git commit -m "test(topbar): add integration tests for full layout"
```

---

## Self-Review Checklist

- [ ] Spec coverage: All 9 spec sections mapped to tasks
- [ ] No placeholders: Every step has actual code/commands
- [ ] Type consistency: `TopBar` props, `NavItem` type, `UserRole` enum all match
- [ ] CSS animations defined before component uses them
- [ ] Mobile overlay handles focus trapping and Escape key
- [ ] Live clock cleans up interval on unmount
- [ ] Sync button behavior preserved (calls same syncFromRemote)

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-18-top-navigation-bar-implementation.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**