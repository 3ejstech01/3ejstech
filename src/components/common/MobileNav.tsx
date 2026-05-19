'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/lib/types';
import { motion } from 'framer-motion';

interface NavItem {
  label: string;
  href: string;
  allowedRoles: UserRole[];
  icon: string;
  shortLabel: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', shortLabel: 'Home', href: '/dashboard', allowedRoles: [UserRole.ADMIN], icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Subscribers', shortLabel: 'Clients', href: '/subscribers', allowedRoles: [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.E_LOAD, UserRole.VIEW_ONLY], icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { label: 'E-Load', shortLabel: 'E-Load', href: '/eload', allowedRoles: [UserRole.ADMIN, UserRole.E_LOAD], icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { label: 'Historical Data', shortLabel: 'History', href: '/historical', allowedRoles: [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.E_LOAD, UserRole.VIEW_ONLY], icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  // { label: 'Technicians', shortLabel: 'Tech', href: '/technicians', allowedRoles: [UserRole.ADMIN], icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16 9 16 11s2 5.657 5-2.343a8 8 0 01-3.343 12z' },
  { label: 'Reports', shortLabel: 'Reports', href: '/reporting', allowedRoles: [UserRole.ADMIN], icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { label: 'Settings', shortLabel: 'Settings', href: '/settings', allowedRoles: [UserRole.ADMIN], icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
];

export const MobileNav: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const visibleItems = navItems.filter((item) => item.allowedRoles.includes(user.role));
  // Show up to 6 items; if more exist, last slot becomes "More"
  const mainItems = visibleItems.slice(0, 6);

  return (
    <>
      {/* Top bar — mobile only */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">3J</span>
            </div>
            <span className="font-bold text-text">3EJS Tech</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
              {(user.name || user.email || '?')[0].toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="text-text/40 hover:text-red-500 transition-colors p-1.5"
              title="Sign Out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom tab bar — always visible on mobile, persistent */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-border shadow-2xl">
        <nav className="flex items-end justify-around px-1 pb-[env(safe-area-inset-bottom,8px)] h-[4.5rem]">
          {mainItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[3.5rem] flex-1 transition-all ${
                  isActive ? 'text-primary' : 'text-text/40 hover:text-text/70'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottom-tab-active"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? 'bg-primary/15' : ''
                }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2 : 1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                <span className={`text-[11px] leading-tight font-medium ${isActive ? 'text-primary' : ''}`}>
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};
