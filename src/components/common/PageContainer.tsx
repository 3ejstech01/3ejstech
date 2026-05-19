'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PageContainerProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, title, subtitle }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-text/50">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; hover?: boolean; onClick?: () => void }> = ({ children, className = '', hover = false, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-foreground rounded-2xl ${hover ? 'hover:shadow-md cursor-pointer transition-2xl transition-all' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export const Button: React.FC<{
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ variant = 'primary', children, className = '', onClick, type = 'button', disabled = false, size = 'md' }) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-background text-text hover:border-primary/30',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    ghost: 'text-text/60 hover:text-text hover:bg-background',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-foreground text-foreground/70">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3.5 py-2.5 rounded-2xl bg-foreground text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-1 ${className}`}
        {...props}
      />
    </div>
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[] }> = ({ label, options, className = '', ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-foreground text-foreground/70">
          {label}
        </label>
      )}
      <select
        className={`w-full px-3.5 py-2.5 rounded-2xl bg-foreground text-foreground focus:outline-2 focus:ring-2 focus:ring-foreground/20 transition-1 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'; className?: string }> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-text/5 text-text/60',
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
    danger: 'bg-red-500/10 text-red-600',
    info: 'bg-blue-500/10 text-blue-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const StatusDot: React.FC<{ status: 'active' | 'pending' | 'expired' | 'inactive' }> = ({ status }) => {
  const colors = {
    active: 'bg-emerald-400',
    pending: 'bg-amber-400',
    expired: 'bg-red-400',
    inactive: 'bg-slate-400',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />
  );
};