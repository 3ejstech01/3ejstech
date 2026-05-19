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

  // If the stored password looks like a bcrypt hash, use bcrypt
  if (hashedPassword.startsWith('$2')) {
    return bcrypt.compare(password, hashedPassword);
  }

  // Fallback: plain text comparison for migrated accounts
  // This handles passwords that were stored in plain text during initial migration
  if (hashedPassword === password) {
    return true;
  }

  return false;
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
  [UserRole.E_LOAD]: ['eload_system', 'eload_reporting'],
  [UserRole.VIEW_ONLY]: ['view_dashboard', 'view_reports']
};
