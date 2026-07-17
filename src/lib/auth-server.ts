import { getAllUsers, type UserRow } from './unified-db';
import { verifyPassword } from './auth-utils';

export interface PublicUser {
  id: string;
  username: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function authenticateCredentials(username: string, password?: string): Promise<UserRow | null> {
  if (!username) return null;
  const users = await getAllUsers();
  const user = users.find(u => u.username?.toLowerCase() === username.toLowerCase());
  if (!user) return null;

  if (password !== undefined) {
    const stored = user.password;
    if (!stored) return null;
    const isValid = await verifyPassword(password, stored);
    if (!isValid) return null;
  }

  return user;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
