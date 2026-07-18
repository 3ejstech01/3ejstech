'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { syncFromRemote } from '@/lib/unified-db';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

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
              onClick={async () => {
                try {
                  await syncFromRemote();
                  window.dispatchEvent(new CustomEvent('db-synced'));
                } catch (err) {
                  console.error('Sync failed:', err);
                }
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m0 0H9m12 12v5h.581m0 0a8.003 8.003 0 01-15.357 2m0 0H9" />
              </svg>
            </button>

            {/* Settings Button */}
            <Link
              href="/settings"
              className="p-2 rounded-xl text-text/60 hover:text-text hover:bg-primary/10 transition-colors"
              aria-label="Settings"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>

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
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-surface border-l border-border z-50 lg:hidden flex flex-col"
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