// Firebase Admin SDK disabled - using REST API approach instead
// This eliminates credential warnings and provides better compatibility with Replit environment

console.log('Firebase: Using REST API approach for database operations');
console.log('Database URL:', process.env.FIREBASE_DATABASE_URL || 'https://pinmypic-3c170-default-rtdb.firebaseio.com/');

// Legacy exports for backward compatibility (these will not be used)
export const db = null;
export const auth = null;