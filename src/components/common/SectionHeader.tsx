'use client';

import React from 'react';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-text tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-text/50">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
