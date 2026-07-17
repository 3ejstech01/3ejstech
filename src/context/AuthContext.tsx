'use client';

import React, { createContext, useContext, useState } from 'react';
import { User, UserRole } from '@/lib/types';
import { localDb } from '@/lib/local-db';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTO_USER: User = { id: 'system', name: 'System', email: '', username: 'system', role: UserRole.ADMIN, createdAt: new Date(), updatedAt: new Date() };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(AUTO_USER);
  const [isLoading] = useState(false);

  const login = async (username: string) => {
    try {
      const userRecord = await localDb.getById('users', username);
      if (userRecord && typeof userRecord === 'object' && 'password' in userRecord) {
        const record = userRecord as { password?: string };
        if (record.password) {
          await localDb.put('credentials', { id: username, passwordHash: record.password });
        }
      }
    } catch (error) {
      console.error('Failed to cache credentials:', error);
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};