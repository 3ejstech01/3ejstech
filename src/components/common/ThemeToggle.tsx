'use client';

import React from 'react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme, isSystem, setSystemPreference } = useTheme();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={toggleTheme}
        className="relative w-14 h-8 rounded-full bg-surface border border-border p-1 transition-all hover:border-primary/50"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <div
          className={`absolute w-5 h-5 rounded-full shadow-md transition-transform duration-300 ${
            theme === 'dark' ? 'translate-6 bg-primary' : 'translate-1 bg-yellow-400'
          }`}
        />
        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs">
          {theme === 'dark' ? '🌙' : '☀️'}
        </span>
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs">
          {theme === 'dark' ? '🌙' : '☀️'}
        </span>
      </button>
      
      {isSystem && (
        <span className="text-xs text-text-muted">Auto</span>
      )}
    </div>
  );
}

export function ThemeToggleIcon({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg bg-surface border border-border hover:border-primary/50 transition-colors ${className}`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 17.657l-.707.707m16.95-.707l-.707.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
        </svg>
      )}
    </button>
  );
}