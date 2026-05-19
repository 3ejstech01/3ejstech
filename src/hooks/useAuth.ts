import { useAuth as useAuthContext } from '@/context/AuthContext';
import { UserRole } from '@/lib/types';

export const useAuth = () => {
  return useAuthContext();
};

export const useRequireRole = (requiredRoles: UserRole | UserRole[]) => {
  const { user, isAuthenticated } = useAuth();
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  if (!isAuthenticated || !user) {
    return false;
  }

  if (user.role === UserRole.ADMIN) {
    return true;
  }

  return roles.includes(user.role);
};
