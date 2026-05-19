import { create } from 'zustand';
import { UserRole } from '@/lib/types';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  createdAt: string;
}

interface UsersState {
  users: User[];
  isLoading: boolean;
  isSubmitting: boolean;
  fetchUsers: () => Promise<void>;
  addUser: (username: string, password: string, role: UserRole) => Promise<boolean>;
  updateUser: (id: string, username: string, password?: string, role?: UserRole) => Promise<boolean>;
  deleteUser: (id: string, username: string) => Promise<boolean>;
  getUserByUsername: (username: string) => User | undefined;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  isLoading: false,
  isSubmitting: false,

  fetchUsers: async () => {
    set({ isLoading: true });
    try {
      const res = await apiGet('/api/users');
      if (res.ok) {
        const data = await res.json();
        const users: User[] = data.map((u: { id: string; username: string; role: string; createdAt?: string }) => ({
          id: u.id || u.username,
          username: u.username,
          password: '',
          role: u.role as UserRole,
          createdAt: u.createdAt || '',
        }));
        set({ users, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      set({ isLoading: false });
    }
  },

  addUser: async (username: string, password: string, role: UserRole) => {
    set({ isSubmitting: true });
    try {
      const response = await apiPost('/api/users', { username, password, role });
      if (response.ok) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding user:', error);
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateUser: async (id: string, username: string, password?: string, role?: UserRole) => {
    const data: Record<string, string> = { username };
    if (password) data.password = password;
    if (role) data.role = role;
    try {
      const response = await apiPatch('/api/users', { id, ...data });
      if (response.ok) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  },

  deleteUser: async (id: string, username: string) => {
    try {
      const response = await apiDelete(`/api/users?id=${id}&username=${username}`);
      if (response.ok) {
        await get().fetchUsers();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  },

  getUserByUsername: (username: string) => get().users.find(u => u.username.toLowerCase() === username.toLowerCase()),
}));