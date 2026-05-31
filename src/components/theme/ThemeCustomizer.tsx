'use client';

import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { themes, colorPalettes, fontOptions, fontSizeOptions } from '@/lib/themes';

export function ThemeCustomizer() {
  const { themeName, paletteName, fontFamily, fontSize, setTheme, setPalette, setFontFamily, setFontSize } = useTheme();

  return (
    <div className="space-y-8">
      {/* Theme Pickers */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Theme</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {themes.map((theme) => {
            const isDark = theme.name === 'dark-plus';
            const bg = isDark ? '#1e1e1e' : '#ffffff';
            const fg = isDark ? '#d4d4d4' : '#333333';
            const accent = '#007acc';
            return (
              <button
                key={theme.name}
                onClick={() => setTheme(theme.name)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  themeName === theme.name
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-border-strong'
                }`}
                style={{ backgroundColor: bg, color: fg }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accent }} />
                  <span className="text-sm font-medium">{theme.label}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 rounded" style={{ backgroundColor: isDark ? '#2d2d2d' : '#f0f0f0', width: '70%' }} />
                  <div className="h-2 rounded" style={{ backgroundColor: isDark ? '#3c3c3c' : '#e0e0e0', width: '50%' }} />
                  <div className="h-2 rounded" style={{ backgroundColor: accent, width: '40%', opacity: 0.5 }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Palettes */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-1">Color Palette</h3>
        <p className="text-xs text-text/50 mb-3">Accent colors that overlay the base theme</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {colorPalettes.map((p) => (
            <button
              key={p.id}
              onClick={() => setPalette(p.id)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                paletteName === p.id
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border hover:border-border-strong'
              }`}
            >
              <div className="flex gap-1 mb-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.colors['--color-primary'] }} />
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.colors['--color-secondary'] }} />
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.colors['--color-accent'] }} />
              </div>
              <p className="text-xs font-medium text-text">{p.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Font</h3>
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        >
          {fontOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Font Size</h3>
        <div className="flex gap-2">
          {fontSizeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFontSize(opt.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                fontSize === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-background border border-border text-text hover:border-primary/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
