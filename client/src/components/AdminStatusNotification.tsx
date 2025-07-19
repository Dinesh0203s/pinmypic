import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { hasAdminDashboardAccess, getAdminRoleDisplayName } from '@/utils/adminUtils';

export function AdminStatusNotification() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const previousStatusRef = useRef<{ isAdmin: boolean; adminRole?: string } | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!userData || !initializedRef.current) {
      // Store initial state
      if (userData && !initializedRef.current) {
        previousStatusRef.current = {
          isAdmin: userData.isAdmin || false,
          adminRole: userData.adminRole
        };
        initializedRef.current = true;
      }
      return;
    }

    const currentStatus = {
      isAdmin: userData.isAdmin || false,
      adminRole: userData.adminRole
    };

    const previousStatus = previousStatusRef.current;

    // Check if admin status changed
    if (previousStatus && (
      previousStatus.isAdmin !== currentStatus.isAdmin ||
      previousStatus.adminRole !== currentStatus.adminRole
    )) {
      
      // User was promoted to admin
      if (!previousStatus.isAdmin && currentStatus.isAdmin) {
        const roleName = getAdminRoleDisplayName(currentStatus.adminRole);
        toast({
          title: "Admin Access Granted",
          description: `You have been promoted to ${roleName}. Refreshing your session to enable admin features...`,
          duration: 8000,
        });
        
        // Refresh the page to update authentication context
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
      
      // User was demoted from admin
      else if (previousStatus.isAdmin && !currentStatus.isAdmin) {
        toast({
          title: "Admin Access Removed",
          description: "Your admin privileges have been removed. You will be redirected to the home page.",
          variant: "destructive",
          duration: 8000,
        });
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
      
      // Admin role changed
      else if (previousStatus.isAdmin && currentStatus.isAdmin && 
               previousStatus.adminRole !== currentStatus.adminRole) {
        const newRoleName = getAdminRoleDisplayName(currentStatus.adminRole);
        toast({
          title: "Admin Role Updated",
          description: `Your admin role has been updated to ${newRoleName}.`,
          duration: 6000,
        });
      }
    }

    // Update previous status
    previousStatusRef.current = currentStatus;
  }, [userData, toast]);

  // This component doesn't render anything
  return null;
}