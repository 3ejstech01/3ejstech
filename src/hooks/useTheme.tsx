'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isSystem: boolean;
  setSystemPreference: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = '3jes-theme';
const SYSTEM_KEY = '3jes-use-system';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    return stored || 'dark';
  });
  const [isSystem, setIsSystemState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(SYSTEM_KEY) !== 'false';
  });
  const [mounted, setMounted] = useState(false);

  const getSystemTheme = useCallback((): Theme => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  useEffect(() => {
    const useSystem = localStorage.getItem(SYSTEM_KEY) !== 'false';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSystemState(useSystem);
    if (useSystem) {
      setThemeState(getSystemTheme());
    }
    setMounted(true);
  }, [getSystemTheme]);

  // Listen for system preference changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (isSystem) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted, isSystem]);

  // Apply theme to document with smooth transition
  useEffect(() => {
    if (!mounted) return;

    // Add transition class before changing theme
    document.documentElement.classList.add('theme-transition');
    
    // Apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Remove transition class after animation
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 300);

    return () => clearTimeout(timer);
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setIsSystemState(false);
    localStorage.setItem(THEME_KEY, newTheme);
    localStorage.setItem(SYSTEM_KEY, 'false');
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [theme, setTheme]);

  const setSystemPreference = useCallback((enabled: boolean) => {
    setIsSystemState(enabled);
    localStorage.setItem(SYSTEM_KEY, String(enabled));
    
    if (enabled) {
      localStorage.removeItem(THEME_KEY);
      setThemeState(getSystemTheme());
    }
  }, [getSystemTheme]);

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isSystem, setSystemPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Theme-aware background component
export function ThemeBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}