import React from 'react';

export type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeProps {
  value: string;
  variant?: StatusVariant;
  className?: string;
}

const variants: Record<StatusVariant, string> = {
  default: 'bg-text/5 text-text/70',
  success: 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20',
  danger: 'bg-red-500/10 text-red-600 ring-1 ring-red-500/20',
  info: 'bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20',
  neutral: 'bg-background text-text/60 ring-1 ring-border',
};

export function StatusBadge({ value, variant = 'default', className = '' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {value}
    </span>
  );
}
