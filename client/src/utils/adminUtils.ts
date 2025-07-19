import { User } from '@shared/types';

export const hasAdminDashboardAccess = (user: User | null): boolean => {
  if (!user) return false;
  
  // Special check for owner email as fallback
  if (user.email === 'dond2674@gmail.com') {
    return true;
  }
  
  // Check if user has admin privileges
  return user.isAdmin === true && (
    user.adminRole === 'owner' || 
    user.adminRole === 'admin' || 
    user.adminRole === 'moderator'
  );
};

export const getAdminRoleDisplayName = (adminRole?: string): string => {
  switch (adminRole) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Administrator';
    case 'moderator':
      return 'Moderator';
    default:
      return 'User';
  }
};

export const getAdminPermissions = (adminRole?: string): string[] => {
  switch (adminRole) {
    case 'owner':
      return ['events', 'bookings', 'packages', 'photos', 'contacts', 'users', 'users_manage'];
    case 'admin':
      return ['events', 'bookings', 'packages', 'photos', 'contacts', 'users_view'];
    case 'moderator':
      return ['events', 'bookings', 'photos', 'contacts'];
    default:
      return [];
  }
};

// Check if user has specific permission
export const hasPermission = (user: User | null, permission: string): boolean => {
  if (!user || !user.isAdmin) return false;
  
  // Owner has all permissions
  if (user.adminRole === 'owner') return true;
  
  // Check user's specific permissions
  const userPermissions = user.adminPermissions || getAdminPermissions(user.adminRole);
  return userPermissions.includes(permission);
};

// Get available tabs based on user permissions
export const getAvailableTabs = (user: User | null): { value: string; label: string; permission: string }[] => {
  const allTabs = [
    { value: 'events', label: 'Events', permission: 'events' },
    { value: 'bookings', label: 'Bookings', permission: 'bookings' },
    { value: 'packages', label: 'Packages', permission: 'packages' },
    { value: 'photos', label: 'Photo Requests', permission: 'photos' },
    { value: 'messages', label: 'Messages', permission: 'contacts' },
    { value: 'users', label: 'Users', permission: 'users' },
  ];

  return allTabs.filter(tab => hasPermission(user, tab.permission));
};