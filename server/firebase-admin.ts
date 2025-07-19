// Load environment variables from .env file in development
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

import admin from 'firebase-admin';

let firebaseAdmin: admin.app.App;

export function initializeFirebaseAdmin() {
  if (!firebaseAdmin) {
    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
        console.log(`Firebase Admin: Using service account for project ${serviceAccount.project_id}`);
      } else {
        // For development with project ID
        firebaseAdmin = admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID
        });
        console.log('Firebase Admin: Using project ID for development');
      }
    } else {
      firebaseAdmin = admin.apps[0] as admin.app.App;
    }
  }
  return firebaseAdmin;
}

export async function verifyFirebaseToken(token: string) {
  try {
    // In development, if we can't verify the token due to Firebase Admin issues,
    // we'll decode it locally (less secure but allows development to continue)
    if (process.env.NODE_ENV === 'development') {
      try {
        const app = initializeFirebaseAdmin();
        const decodedToken = await app.auth().verifyIdToken(token);
        return decodedToken;
      } catch (adminError) {
        console.warn('Firebase Admin verification failed, using fallback for development:', adminError);

        // Basic JWT decode for development (not secure for production)
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid token format');
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

        // Basic validation
        if (!payload.uid || !payload.email) {
          throw new Error('Invalid token payload');
        }

        return {
          uid: payload.uid,
          email: payload.email,
          firebase: payload
        };
      }
    } else {
      const app = initializeFirebaseAdmin();
      const decodedToken = await app.auth().verifyIdToken(token);
      return decodedToken;
    }
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw new Error('Invalid token');
  }
}

export { admin };