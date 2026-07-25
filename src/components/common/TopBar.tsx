'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { syncFromRemote } from '@/lib/unified-db';
import { RefreshCw, Settings, LogOut, Menu, X } from 'lucide-react';

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
              aria-label="Sync data now"
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
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* Settings Button */}
            <Link
              href="/settings"
              className="p-2 rounded-xl text-text/60 hover:text-text hover:bg-primary/10 transition-colors"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>

            {/* Logout Button */}
            <motion.button
              onClick={logout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center hover:shadow-lg hover:shadow-red-500/40 transition-all duration-300"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </motion.button>

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-text/60 hover:text-text hover:bg-primary/10 transition-colors"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-6 h-6" />
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
                  <X className="w-6 h-6" />
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