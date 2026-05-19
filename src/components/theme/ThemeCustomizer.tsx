'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/common/PageContainer';
import { useTheme } from '@/hooks/useTheme';

type ColorwayId = 
  | 'deep-ocean' | 'forest-mist' | 'sunset-crimson' | 'royal-violet' 
  | 'golden-hour' | 'mint-breeze' | 'charcoal-slate' | 'rose-gold'
  | 'emerald-peak' | 'midnight-cyber';

type FontFamily = 
  | 'inter' | 'poppins' | 'roboto' | 'nunito' | 'ubuntu' | 'montserrat'
  | 'playfair' | 'lato' | 'oswald' | 'merriweather' | 'system';

type FontSize = 'sm' | 'md' | 'lg';

interface Colorway {
  id: ColorwayId;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  light: string;
  dark: string;
}

interface FontOption {
  id: FontFamily;
  name: string;
  category: string;
  preview: string;
}

const COLORWAYS: Colorway[] = [
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    description: 'Professional blue with purple accents',
    primary: '#1e40af',
    secondary: '#7c3aed',
    accent: '#06b6d4',
    light: '#3b82f6',
    dark: '#1e3a8a'
  },
  {
    id: 'forest-mist',
    name: 'Forest Mist',
    description: 'Natural green with cyan highlights',
    primary: '#059669',
    secondary: '#0891b2',
    accent: '#10b981',
    light: '#10b981',
    dark: '#047857'
  },
  {
    id: 'sunset-crimson',
    name: 'Sunset Crimson',
    description: 'Warm red with amber tones',
    primary: '#dc2626',
    secondary: '#f59e0b',
    accent: '#ef4444',
    light: '#f87171',
    dark: '#b91c1c'
  },
  {
    id: 'royal-violet',
    name: 'Royal Violet',
    description: 'Elegant purple with pink accents',
    primary: '#7c3aed',
    secondary: '#ec4899',
    accent: '#8b5cf6',
    light: '#a78bfa',
    dark: '#6d28d9'
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Rich amber with red undertones',
    primary: '#d97706',
    secondary: '#dc2626',
    accent: '#f59e0b',
    light: '#fbbf24',
    dark: '#b45309'
  },
  {
    id: 'mint-breeze',
    name: 'Mint Breeze',
    description: 'Fresh cyan with teal accents',
    primary: '#0891b2',
    secondary: '#0d9488',
    accent: '#22d3ee',
    light: '#67e8f9',
    dark: '#0e7490'
  },
  {
    id: 'charcoal-slate',
    name: 'Charcoal Slate',
    description: 'Modern gray with blue highlights',
    primary: '#475569',
    secondary: '#3b82f6',
    accent: '#64748b',
    light: '#94a3b8',
    dark: '#334155'
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    description: 'Sophisticated pink with rose tones',
    primary: '#e11d48',
    secondary: '#f43f5e',
    accent: '#fb7185',
    light: '#fda4af',
    dark: '#be123c'
  },
  {
    id: 'emerald-peak',
    name: 'Emerald Peak',
    description: 'Vibrant green with mint accents',
    primary: '#047857',
    secondary: '#34d399',
    accent: '#10b981',
    light: '#6ee7b7',
    dark: '#065f46'
  },
  {
    id: 'midnight-cyber',
    name: 'Midnight Cyber',
    description: 'Dark cyberpunk with neon accents',
    primary: '#6366f1',
    secondary: '#d946ef',
    accent: '#22d3ee',
    light: '#818cf8',
    dark: '#4f46e5'
  }
];

const FONTS: FontOption[] = [
  { id: 'inter', name: 'Inter', category: 'Sans-serif', preview: 'AaBbCc' },
  { id: 'poppins', name: 'Poppins', category: 'Sans-serif', preview: 'AaBbCc' },
  { id: 'roboto', name: 'Roboto', category: 'Sans-serif', preview: 'AaBbCc' },
  { id: 'nunito', name: 'Nunito', category: 'Sans-serif', preview: 'AaBbCc' },
  { id: 'ubuntu', name: 'Ubuntu', category: 'Sans-serif', preview: 'AaBbCc' },
  { id: 'montserrat', name: 'Montserrat', category: 'Sans-serif', preview: 'AaBbCc' },
  { id: 'playfair', name: 'Playfair Display', category: 'Serif', preview: 'AaBbCc' },
  { id: 'lato', name: 'Lato', category: 'Sans-serif', preview: 'AaBbCc' },
  { id: 'oswald', name: 'Oswald', category: 'Sans-serif', preview: 'AaBbCc' },
  { id: 'merriweather', name: 'Merriweather', category: 'Serif', preview: 'AaBbCc' },
  { id: 'system', name: 'System Default', category: 'System', preview: 'AaBbCc' }
];

const FONT_SIZES: { id: FontSize; name: string; size: string; value: number }[] = [
  { id: 'sm', name: 'Compact', size: 'text-[13px]', value: 13 },
  { id: 'md', name: 'Regular', size: 'text-[14px]', value: 14 },
  { id: 'lg', name: 'Spacious', size: 'text-[16px]', value: 16 }
];

const STORAGE_KEY = '3jes-theme-prefs';

function getStoredPrefs() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hexToHsl(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 50];
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function adjustLightness(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex);
  const newL = Math.max(0, Math.min(100, l + amount));
  return hslToHex(h, s, newL);
}

function applyColorway(colorway: Colorway) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', colorway.primary);
  root.style.setProperty('--color-primary-light', colorway.light);
  root.style.setProperty('--color-primary-dark', colorway.dark);
  root.style.setProperty('--color-secondary', colorway.secondary);
  root.style.setProperty('--color-accent', colorway.accent);
}

function applyFont(font: FontFamily) {
  const fonts: Record<FontFamily, string> = {
    inter: "'Inter', sans-serif",
    poppins: "'Poppins', sans-serif",
    roboto: "'Roboto', sans-serif",
    nunito: "'Nunito', sans-serif",
    ubuntu: "'Ubuntu', sans-serif",
    montserrat: "'Montserrat', sans-serif",
    playfair: "'Playfair Display', serif",
    lato: "'Lato', sans-serif",
    oswald: "'Oswald', sans-serif",
    merriweather: "'Merriweather', serif",
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  };
  document.documentElement.style.setProperty('--font-family', fonts[font]);
  document.body.style.fontFamily = fonts[font];
}

function applyFontSize(size: FontSize) {
  const sizes: Record<FontSize, string> = { sm: '13px', md: '14px', lg: '16px' };
  document.documentElement.style.fontSize = sizes[size];
}

export const ThemeCustomizer: React.FC = () => {
  const { theme, setTheme, isSystem, setSystemPreference } = useTheme();
  const [colorway, setColorway] = useState<ColorwayId>(() => {
    const prefs = getStoredPrefs();
    return (prefs?.colorway as ColorwayId) || 'deep-ocean';
  });
  const [font, setFont] = useState<FontFamily>(() => {
    const prefs = getStoredPrefs();
    return (prefs?.font as FontFamily) || 'inter';
  });
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const prefs = getStoredPrefs();
    return (prefs?.fontSize as FontSize) || 'md';
  });
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'preview'>('colors');
  const [hoveredSwatch, setHoveredSwatch] = useState<string | null>(null);

  useEffect(() => {
    const currentColorway = COLORWAYS.find(c => c.id === colorway);
    if (currentColorway) applyColorway(currentColorway);
  }, [colorway]);

  useEffect(() => {
    applyFont(font);
  }, [font]);

  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  const savePrefs = (updates: Partial<{ colorway: ColorwayId; font: FontFamily; fontSize: FontSize }>) => {
    const prefs = { ...getStoredPrefs(), ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  };

  const currentColorway = COLORWAYS.find(c => c.id === colorway) || COLORWAYS[0];
  const currentFont = FONTS.find(f => f.id === font) || FONTS[0];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <Card className="p-1">
        <div className="flex gap-1">
          {[
            { id: 'colors' as const, label: 'Color Palettes', icon: '🎨' },
            { id: 'typography' as const, label: 'Typography', icon: 'Aa' },
            { id: 'preview' as const, label: 'Live Preview', icon: '👁️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-text/60 hover:bg-background-alt'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          {/* Appearance */}
          <Card className="p-6">
            <h3 className="font-bold text-text mb-4 flex items-center gap-2">
              <span>🌓</span> Appearance Mode
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 ${
                  theme === 'light'
                    ? 'border-primary bg-primary/10 shadow-lg scale-105'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-text">Light</p>
                  <p className="text-xs text-text/50">Bright & clean</p>
                </div>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/10 shadow-lg scale-105'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-text">Dark</p>
                  <p className="text-xs text-text/50">Sleek & modern</p>
                </div>
              </button>
            </div>
            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={isSystem}
                onChange={(e) => setSystemPreference(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text/60">Follow system preference</span>
            </label>
          </Card>

          {/* Color Palettes */}
          <Card className="p-6">
            <h3 className="font-bold text-text mb-2 flex items-center gap-2">
              <span>🎨</span> Color Palettes
            </h3>
            <p className="text-sm text-text/50 mb-6">Choose a palette that matches your brand</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {COLORWAYS.map((cw) => (
                <div
                  key={cw.id}
                  onMouseEnter={() => setHoveredSwatch(cw.id)}
                  onMouseLeave={() => setHoveredSwatch(null)}
                  className={`relative group cursor-pointer rounded-2xl border-2 transition-all duration-300 ${
                    colorway === cw.id
                      ? 'border-primary shadow-xl scale-105'
                      : 'border-border hover:border-primary/30 hover:shadow-md'
                  }`}
                  onClick={() => {
                    setColorway(cw.id);
                    savePrefs({ colorway: cw.id });
                  }}
                >
                  {/* Color Swatches */}
                  <div className="h-20 rounded-t-xl flex">
                    <div
                      className="flex-1 transition-all"
                      style={{ backgroundColor: cw.primary }}
                    />
                    <div
                      className="flex-1 transition-all"
                      style={{ backgroundColor: cw.secondary }}
                    />
                    <div
                      className="flex-1 transition-all"
                      style={{ backgroundColor: cw.accent }}
                    />
                    <div
                      className="flex-1 transition-all"
                      style={{ backgroundColor: cw.light }}
                    />
                    <div
                      className="flex-1 transition-all"
                      style={{ backgroundColor: cw.dark }}
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="p-4">
                    <h4 className="font-semibold text-text mb-1">{cw.name}</h4>
                    <p className="text-xs text-text/50">{cw.description}</p>
                    
                    {/* Hover Preview */}
                    {hoveredSwatch === cw.id && (
                      <div className="mt-3 p-3 rounded-lg bg-background-alt border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-6 h-6 rounded-lg"
                            style={{ backgroundColor: cw.primary }}
                          />
                          <div
                            className="w-6 h-6 rounded-lg"
                            style={{ backgroundColor: cw.secondary }}
                          />
                          <div
                            className="w-6 h-6 rounded-lg"
                            style={{ backgroundColor: cw.accent }}
                          />
                        </div>
                        <p className="text-xs text-text/60">
                          {theme === 'dark' ? 'Dark' : 'Light'} variant preview
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Badge */}
                  {colorway === cw.id && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Typography Tab */}
      {activeTab === 'typography' && (
        <div className="space-y-6">
          {/* Font Family */}
          <Card className="p-6">
            <h3 className="font-bold text-text mb-4 flex items-center gap-2">
              <span>🔤</span> Font Family
            </h3>
            <p className="text-sm text-text/50 mb-4">Choose the typography style</p>
            
            <div className="relative">
              <select
                value={font}
                onChange={(e) => {
                  const newFont = e.target.value as FontFamily;
                  setFont(newFont);
                  savePrefs({ font: newFont });
                }}
                className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border text-text focus:outline-none focus:border-primary text-lg appearance-none cursor-pointer"
                style={{ fontFamily: font === 'system' ? undefined : FONTS.find(f => f.id === font)?.name }}
              >
                {FONTS.map((f) => (
                  <option key={f.id} value={f.id} style={{ fontFamily: f.id === 'system' ? undefined : f.name }}>
                    {f.name} — {f.category}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-text/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {/* Font Preview */}
            <div
              className="mt-6 p-6 rounded-xl bg-background-alt border border-border"
              style={{ fontFamily: font === 'system' ? undefined : FONTS.find(f => f.id === font)?.name }}
            >
              <p className="text-3xl font-bold text-text mb-2">Aa Bb Cc</p>
              <p className="text-lg text-text/70 mb-2">The quick brown fox jumps over the lazy dog</p>
              <p className="text-sm text-text/50">{currentFont.category} typeface</p>
            </div>
          </Card>

          {/* Font Size */}
          <Card className="p-6">
            <h3 className="font-bold text-text mb-4 flex items-center gap-2">
              <span>📏</span> Base Font Size
            </h3>
            <p className="text-sm text-text/50 mb-4">Adjust the overall text size</p>
            
            <div className="grid grid-cols-3 gap-3">
              {FONT_SIZES.map((fs) => (
                <button
                  key={fs.id}
                  onClick={() => {
                    setFontSize(fs.id);
                    savePrefs({ fontSize: fs.id });
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    fontSize === fs.id
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <p className={`font-bold text-text mb-1 ${fs.size}`}>Aa</p>
                  <p className="text-xs text-text/50">{fs.name}</p>
                  <p className="text-[10px] text-text/30 mt-1">{fs.value}px</p>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <Card className="p-6">
          <h3 className="font-bold text-text mb-6 flex items-center gap-2">
            <span>👁️</span> Live Preview
          </h3>
          
          <div
            className="rounded-2xl border-2 border-border overflow-hidden"
            style={{ fontFamily: font === 'system' ? undefined : FONTS.find(f => f.id === font)?.name }}
          >
            {/* Mock Header */}
            <div
              className="p-4 text-white"
              style={{ background: `linear-gradient(135deg, ${currentColorway.primary}, ${currentColorway.secondary})` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="font-bold text-white">3J</span>
                  </div>
                  <div>
                    <p className="font-bold">3EJS Tech</p>
                    <p className="text-xs text-white/70">ISP Management</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20" />
                  <div className="w-8 h-8 rounded-lg bg-white/20" />
                </div>
              </div>
            </div>
            
            {/* Mock Content */}
            <div className="p-6 bg-background">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Total Subscribers', value: '2,847', color: 'blue' },
                  { label: 'E-Load Incentive', value: '₱48,250', color: 'purple' },
                  { label: 'Revenue', value: '₱125K', color: 'emerald' }
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border"
                    style={{
                      backgroundColor: `${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'}`,
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <p className="text-xs text-text/50 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-text">{stat.value}</p>
                  </div>
                ))}
              </div>
              
              {/* Mock Button */}
              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: currentColorway.primary }}
                >
                  Primary Action
                </button>
                <button
                  className="flex-1 px-4 py-3 rounded-xl font-medium border-2 transition-all hover:bg-background-alt"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Secondary
                </button>
              </div>
              
              {/* Mock Form */}
              <div className="mt-6 space-y-3">
                <div>
                  <label className="block text-xs text-text/50 mb-1">Input Field</label>
                  <input
                    type="text"
                    placeholder="Type something..."
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
                      borderColor: 'var(--color-border)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Current Settings Summary */}
          <div className="mt-6 p-4 rounded-xl bg-background-alt border border-border">
            <h4 className="font-semibold text-text mb-3">Current Configuration</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-text/50">Palette</p>
                <p className="font-medium text-text">{currentColorway.name}</p>
              </div>
              <div>
                <p className="text-text/50">Font</p>
                <p className="font-medium text-text">{currentFont.name}</p>
              </div>
              <div>
                <p className="text-text/50">Size</p>
                <p className="font-medium text-text">{FONT_SIZES.find(f => f.id === fontSize)?.name}</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};