import bcrypt from 'bcryptjs';
import { UserRole } from './types';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  if (!hashedPassword) {
    return false;
  }

  if (!hashedPassword.startsWith('$2')) {
    return false;
  }

  return bcrypt.compare(password, hashedPassword);
}

export async function hashPasswordIfNeeded(password: string): Promise<string> {
  if (password.startsWith('$2') && password.length >= 60) {
    return password;
  }
  return hashPassword(password);
}

export function checkPermission(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (userRole === UserRole.ADMIN) {
    return true;
  }

  return requiredRoles.includes(userRole);
}

export const rolePermissions = {
  [UserRole.ADMIN]: ['*'],
  [UserRole.TECHNICIAN]: ['view_profile', 'update_installations', 'report_modem'],
  [UserRole.VIEW_ONLY]: ['view_dashboard', 'view_reports']
};
