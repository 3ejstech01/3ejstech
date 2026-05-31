'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { themes, fontOptions, fontSizeOptions, getTheme, getPalette, colorPalettes } from '@/lib/themes';

interface ThemePrefs {
  themeName: string;
  paletteName: string;
  fontFamily: string;
  fontSize: number;
}

interface ThemeContextType {
  themeName: string;
  paletteName: string;
  fontFamily: string;
  fontSize: number;
  setTheme: (name: string) => void;
  setPalette: (id: string) => void;
  setFontFamily: (font: string) => void;
  setFontSize: (size: number) => void;
}

const STORAGE_KEY = '3jes-theme-prefs';

const defaultPrefs: ThemePrefs = {
  themeName: 'dark-plus',
  paletteName: 'deep-ocean',
  fontFamily: 'Inter, sans-serif',
  fontSize: 14,
};

function loadPrefs(): ThemePrefs {
  if (typeof window === 'undefined') return defaultPrefs;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultPrefs;
    const parsed = JSON.parse(stored) as Partial<ThemePrefs>;
    return {
      themeName: getTheme(parsed.themeName || '').name,
      paletteName: getPalette(parsed.paletteName || '').id,
      fontFamily: fontOptions.some(f => f.value === parsed.fontFamily) ? parsed.fontFamily! : defaultPrefs.fontFamily,
      fontSize: fontSizeOptions.some(f => f.value === parsed.fontSize) ? parsed.fontSize! : defaultPrefs.fontSize,
    };
  } catch {
    return defaultPrefs;
  }
}

function applyThemeAndPalette(themeName: string, paletteName: string) {
  const theme = getTheme(themeName);
  const palette = getPalette(paletteName);
  const root = document.documentElement;
  // Apply all theme colors first
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  // Override brand colors from palette
  Object.entries(palette.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

function applyFont(fontFamily: string) {
  document.documentElement.style.fontFamily = fontFamily;
}

function applyFontSize(fontSize: number) {
  document.documentElement.style.fontSize = `${fontSize}px`;
}

function savePrefs(prefs: ThemePrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ThemePrefs>(defaultPrefs);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    applyThemeAndPalette(loaded.themeName, loaded.paletteName);
    applyFont(loaded.fontFamily);
    applyFontSize(loaded.fontSize);
    setReady(true);
  }, []);

  const setTheme = useCallback((themeName: string) => {
    setPrefs(prev => {
      const next = { ...prev, themeName };
      applyThemeAndPalette(themeName, prev.paletteName);
      savePrefs(next);
      return next;
    });
  }, []);

  const setPalette = useCallback((paletteName: string) => {
    setPrefs(prev => {
      const next = { ...prev, paletteName };
      applyThemeAndPalette(prev.themeName, paletteName);
      savePrefs(next);
      return next;
    });
  }, []);

  const setFontFamily = useCallback((fontFamily: string) => {
    setPrefs(prev => {
      const next = { ...prev, fontFamily };
      applyFont(fontFamily);
      savePrefs(next);
      return next;
    });
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    setPrefs(prev => {
      const next = { ...prev, fontSize };
      applyFontSize(fontSize);
      savePrefs(next);
      return next;
    });
  }, []);

  if (!ready) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ ...prefs, setTheme, setPalette, setFontFamily, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeBackground({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen bg-background text-text transition-colors duration-300 ${className}`}>
      {children}
    </div>
  );
}
