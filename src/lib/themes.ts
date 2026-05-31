export interface ThemeColors {
  [key: string]: string;
}

export interface ThemeDefinition {
  name: string;
  label: string;
  description: string;
  colors: ThemeColors;
}

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: {
    '--color-primary': string;
    '--color-primary-light': string;
    '--color-primary-dark': string;
    '--color-secondary': string;
    '--color-secondary-light': string;
    '--color-accent': string;
    '--color-accent-light': string;
  };
}

export const themes: ThemeDefinition[] = [
  {
    name: 'dark-plus',
    label: 'VS Code Dark+',
    description: 'Dark background, light text — the classic VS Code default',
    colors: {
      '--color-background': '#1e1e1e',
      '--color-background-alt': '#252526',
      '--color-surface': '#252526',
      '--color-surface-elevated': '#2d2d2d',
      '--color-primary': '#007acc',
      '--color-primary-light': '#1a85cc',
      '--color-primary-dark': '#005f9e',
      '--color-secondary': '#c586c0',
      '--color-secondary-light': '#d4a0d0',
      '--color-accent': '#4ec9b0',
      '--color-accent-light': '#6dd4c0',
      '--color-text': '#d4d4d4',
      '--color-text-secondary': '#cccccc',
      '--color-text-muted': '#969696',
      '--color-text-disabled': '#5a5a5a',
      '--color-text-inverse': '#1e1e1e',
      '--color-border': '#3c3c3c',
      '--color-border-strong': '#474747',
      '--color-border-subtle': '#2d2d2d',
      '--color-success': '#4ec9b0',
      '--color-warning': '#ce9178',
      '--color-error': '#f44747',
      '--color-info': '#3794ff',
    },
  },
  {
    name: 'light-plus',
    label: 'VS Code Light+',
    description: 'Light background, dark text — crisp and clean',
    colors: {
      '--color-background': '#ffffff',
      '--color-background-alt': '#f3f3f3',
      '--color-surface': '#ffffff',
      '--color-surface-elevated': '#f3f3f3',
      '--color-primary': '#007acc',
      '--color-primary-light': '#1a85cc',
      '--color-primary-dark': '#005f9e',
      '--color-secondary': '#7b2d8b',
      '--color-secondary-light': '#9b4bab',
      '--color-accent': '#0e7c6b',
      '--color-accent-light': '#2ea08b',
      '--color-text': '#333333',
      '--color-text-secondary': '#444444',
      '--color-text-muted': '#666666',
      '--color-text-disabled': '#999999',
      '--color-text-inverse': '#ffffff',
      '--color-border': '#e0e0e0',
      '--color-border-strong': '#cccccc',
      '--color-border-subtle': '#f0f0f0',
      '--color-success': '#0e7c6b',
      '--color-warning': '#ce9178',
      '--color-error': '#f44747',
      '--color-info': '#3794ff',
    },
  },
];

export const colorPalettes: ColorPalette[] = [
  { id: 'deep-ocean', name: 'Deep Ocean', description: 'Professional blue with purple accents',
    colors: { '--color-primary': '#2563eb', '--color-primary-light': '#3b82f6', '--color-primary-dark': '#1d4ed8', '--color-secondary': '#7c3aed', '--color-secondary-light': '#8b5cf6', '--color-accent': '#06b6d4', '--color-accent-light': '#22d3ee' } },
  { id: 'forest-mist', name: 'Forest Mist', description: 'Natural green with cyan highlights',
    colors: { '--color-primary': '#059669', '--color-primary-light': '#10b981', '--color-primary-dark': '#047857', '--color-secondary': '#0891b2', '--color-secondary-light': '#22d3ee', '--color-accent': '#10b981', '--color-accent-light': '#34d399' } },
  { id: 'sunset-crimson', name: 'Sunset Crimson', description: 'Warm red with amber tones',
    colors: { '--color-primary': '#dc2626', '--color-primary-light': '#ef4444', '--color-primary-dark': '#b91c1c', '--color-secondary': '#f59e0b', '--color-secondary-light': '#fbbf24', '--color-accent': '#f97316', '--color-accent-light': '#fb923c' } },
  { id: 'royal-violet', name: 'Royal Violet', description: 'Elegant purple with pink accents',
    colors: { '--color-primary': '#7c3aed', '--color-primary-light': '#8b5cf6', '--color-primary-dark': '#6d28d9', '--color-secondary': '#ec4899', '--color-secondary-light': '#f472b6', '--color-accent': '#a78bfa', '--color-accent-light': '#c4b5fd' } },
  { id: 'golden-hour', name: 'Golden Hour', description: 'Rich amber with red undertones',
    colors: { '--color-primary': '#d97706', '--color-primary-light': '#f59e0b', '--color-primary-dark': '#b45309', '--color-secondary': '#dc2626', '--color-secondary-light': '#ef4444', '--color-accent': '#fbbf24', '--color-accent-light': '#fcd34d' } },
  { id: 'mint-breeze', name: 'Mint Breeze', description: 'Fresh cyan with teal accents',
    colors: { '--color-primary': '#0891b2', '--color-primary-light': '#22d3ee', '--color-primary-dark': '#0e7490', '--color-secondary': '#0d9488', '--color-secondary-light': '#14b8a6', '--color-accent': '#2dd4bf', '--color-accent-light': '#5eead4' } },
  { id: 'charcoal-slate', name: 'Charcoal Slate', description: 'Modern gray with blue highlights',
    colors: { '--color-primary': '#64748b', '--color-primary-light': '#94a3b8', '--color-primary-dark': '#475569', '--color-secondary': '#3b82f6', '--color-secondary-light': '#60a5fa', '--color-accent': '#94a3b8', '--color-accent-light': '#cbd5e1' } },
  { id: 'rose-gold', name: 'Rose Gold', description: 'Sophisticated pink with rose tones',
    colors: { '--color-primary': '#e11d48', '--color-primary-light': '#f43f5e', '--color-primary-dark': '#be123c', '--color-secondary': '#f43f5e', '--color-secondary-light': '#fb7185', '--color-accent': '#fda4af', '--color-accent-light': '#fecdd3' } },
  { id: 'emerald-peak', name: 'Emerald Peak', description: 'Vibrant green with mint accents',
    colors: { '--color-primary': '#047857', '--color-primary-light': '#10b981', '--color-primary-dark': '#065f46', '--color-secondary': '#34d399', '--color-secondary-light': '#6ee7b7', '--color-accent': '#10b981', '--color-accent-light': '#34d399' } },
  { id: 'midnight-cyber', name: 'Midnight Cyber', description: 'Dark cyberpunk with neon accents',
    colors: { '--color-primary': '#6366f1', '--color-primary-light': '#818cf8', '--color-primary-dark': '#4f46e5', '--color-secondary': '#d946ef', '--color-secondary-light': '#e879f9', '--color-accent': '#22d3ee', '--color-accent-light': '#67e8f9' } },
];

export const fontOptions = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Nunito', sans-serif", label: 'Nunito' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: 'system-ui, sans-serif', label: 'System Default' },
];

export const fontSizeOptions = [
  { value: 13, label: 'Compact' },
  { value: 14, label: 'Regular' },
  { value: 16, label: 'Spacious' },
];

export function getTheme(name: string): ThemeDefinition {
  return themes.find(t => t.name === name) || themes[0];
}

export function getPalette(id: string): ColorPalette {
  return colorPalettes.find(p => p.id === id) || colorPalettes[0];
}
