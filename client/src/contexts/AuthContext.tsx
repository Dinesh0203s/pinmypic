import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { User } from '@shared/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncInProgress, setSyncInProgress] = useState(false);

  const syncUserWithDatabase = async (firebaseUser: FirebaseUser) => {
    // Prevent duplicate sync requests
    if (syncInProgress) {
      console.log('Sync already in progress, skipping duplicate request');
      return;
    }

    setSyncInProgress(true);
    
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        })
      });

      if (response.ok) {
        const user = await response.json();
        console.log('Synced user data:', user);
        setUserData(user);
      } else {
        console.error('Failed to sync user:', response.status, response.statusText);
        // Set basic user data even if sync fails
        const fallbackUser = {
          id: firebaseUser.uid,
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setUserData(fallbackUser);
      }
    } catch (error) {
      console.error('Error syncing user with database:', error);
      // Set basic user data even if sync fails
      const fallbackUser = {
        id: firebaseUser.uid,
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setUserData(fallbackUser);
    } finally {
      setSyncInProgress(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
      // Note: syncUserWithDatabase will be called automatically by onAuthStateChanged
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
  };

  const refreshUserData = async () => {
    if (currentUser) {
      // Force refresh the Firebase token to get updated claims
      await currentUser.getIdToken(true);
      await syncUserWithDatabase(currentUser);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      if (user) {
        await syncUserWithDatabase(user);
      } else {
        setUserData(null);
      }
    });

    return unsubscribe;
  }, []);

  // Sync user data on page refresh/reload
  useEffect(() => {
    const handlePageRefresh = async () => {
      if (currentUser) {
        await refreshUserData();
      }
    };

    // Listen for page visibility changes (when user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden && currentUser) {
        handlePageRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also sync when the page loads if user is already authenticated
    if (currentUser && !loading) {
      handlePageRefresh();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, loading]);

  const value: AuthContextType = {
    currentUser,
    userData,
    loginWithGoogle,
    logout,
    refreshUserData,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}