import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { hasAdminDashboardAccess } from '@/utils/adminUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { currentUser, userData, loading } = useAuth();

  // Don't show loading if we have a current user
  if (loading && !currentUser) {
    return <LoadingSpinner message="Authenticating..." />;
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // Check if user has admin access
  if (requireAdmin) {
    const hasAdminAccess = hasAdminDashboardAccess(userData);
    
    if (!hasAdminAccess) {
      console.log('Admin access denied for user:', userData);
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;