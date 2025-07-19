import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken } from '../firebase-admin';
import { storage } from '../storage';

export interface AuthenticatedRequest extends Request {
  user?: {
    firebaseUid: string;
    email: string;
    userData?: any;
  };
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Development bypass: If Firebase Admin is having issues, use token payload directly
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: bypassing full Firebase verification');
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          
          if (payload.uid && payload.email) {
            req.user = {
              firebaseUid: payload.uid,
              email: payload.email,
            };

            // Get or create user data
            let userData = await storage.getUserByFirebaseUid(payload.uid);
            if (!userData) {
              userData = await storage.getUserByEmail(payload.email);
            }
            
            if (!userData) {
              // Create user in database for development
              userData = {
                id: payload.uid,
                firebaseUid: payload.uid,
                email: payload.email,
                displayName: payload.name || 'User',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // Set admin status for owner
                isAdmin: payload.email === process.env.ADMIN_EMAIL,
                adminRole: payload.email === process.env.ADMIN_EMAIL ? 'owner' : undefined,
                adminPermissions: payload.email === process.env.ADMIN_EMAIL ? ['events', 'bookings', 'packages', 'photos', 'contacts', 'users', 'users_manage'] : undefined
              };
            } else if (payload.email === process.env.ADMIN_EMAIL && !userData.isAdmin) {
              // Ensure owner always has admin status
              userData.isAdmin = true;
              userData.adminRole = 'owner';
              userData.adminPermissions = ['events', 'bookings', 'packages', 'photos', 'contacts', 'users', 'users_manage'];
            }
            
            req.user.userData = userData;
            return next();
          }
        }
      } catch (devError) {
        console.log('Development token parsing failed, trying Firebase verification');
      }
    }
    
    // Production path: Use Firebase verification
    try {
      const decodedToken = await verifyFirebaseToken(token);
      
      req.user = {
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || '',
      };

      // Get user data from database
      let userData = await storage.getUserByFirebaseUid(decodedToken.uid);
      if (!userData) {
        userData = await storage.getUserByEmail(decodedToken.email || '');
      }
      
      // Ensure owner always has admin status
      if (userData && decodedToken.email === process.env.ADMIN_EMAIL && !userData.isAdmin) {
        userData.isAdmin = true;
        userData.adminRole = 'owner';
        userData.adminPermissions = ['events', 'bookings', 'packages', 'photos', 'contacts', 'users', 'users_manage'];
      }
      
      if (userData) {
        req.user.userData = userData;
      }

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check if user has admin privileges in the database
  const userData = req.user?.userData;
  const isAdmin = userData?.isAdmin === true;
  
  if (!isAdmin) {
    console.log('Admin access denied for user:', userData);
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Only allow the owner to perform certain actions
  const isOwner = req.user?.email === process.env.ADMIN_EMAIL && req.user?.userData?.adminRole === 'owner';
  if (!isOwner) {
    return res.status(403).json({ error: 'Owner access required' });
  }
  next();
}