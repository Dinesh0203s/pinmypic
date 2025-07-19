/**
 * User Deduplication Script
 * 
 * This script identifies and removes duplicate user accounts based on:
 * 1. Email address
 * 2. Firebase UID
 * 
 * Keeps the oldest account and merges any important data from newer duplicates.
 */

const FirebaseRest = require('../server/firebase-rest.js');

async function deduplicateUsers() {
  try {
    console.log('Starting user deduplication process...');
    
    const firebaseRest = new FirebaseRest();
    const users = await firebaseRest.get('users');
    
    if (!users) {
      console.log('No users found in database.');
      return;
    }
    
    // Convert to array with IDs
    const userArray = Object.entries(users).map(([id, user]) => ({
      id,
      ...user
    }));
    
    console.log(`Found ${userArray.length} total users`);
    
    // Group by email
    const emailGroups = {};
    const firebaseUidGroups = {};
    
    userArray.forEach(user => {
      // Group by email
      if (!emailGroups[user.email]) {
        emailGroups[user.email] = [];
      }
      emailGroups[user.email].push(user);
      
      // Group by Firebase UID
      if (user.firebaseUid) {
        if (!firebaseUidGroups[user.firebaseUid]) {
          firebaseUidGroups[user.firebaseUid] = [];
        }
        firebaseUidGroups[user.firebaseUid].push(user);
      }
    });
    
    // Find duplicates by email
    const emailDuplicates = Object.entries(emailGroups).filter(([email, users]) => users.length > 1);
    
    // Find duplicates by Firebase UID
    const uidDuplicates = Object.entries(firebaseUidGroups).filter(([uid, users]) => users.length > 1);
    
    console.log(`Found ${emailDuplicates.length} email duplicates`);
    console.log(`Found ${uidDuplicates.length} Firebase UID duplicates`);
    
    // Process email duplicates
    for (const [email, duplicateUsers] of emailDuplicates) {
      console.log(`\nProcessing email duplicates for: ${email}`);
      console.log(`Users: ${duplicateUsers.map(u => `${u.id} (${u.createdAt})`).join(', ')}`);
      
      // Sort by creation date (keep oldest)
      const sortedUsers = duplicateUsers.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      const keepUser = sortedUsers[0];
      const removeUsers = sortedUsers.slice(1);
      
      console.log(`Keeping user: ${keepUser.id} (${keepUser.createdAt})`);
      console.log(`Removing users: ${removeUsers.map(u => u.id).join(', ')}`);
      
      // Merge any important data from newer accounts to the kept account
      let mergedData = { ...keepUser };
      
      removeUsers.forEach(user => {
        // Merge saved photos
        if (user.savedPhotos && user.savedPhotos.length > 0) {
          mergedData.savedPhotos = [...new Set([
            ...(mergedData.savedPhotos || []),
            ...user.savedPhotos
          ])];
        }
        
        // Use the most recent display name and photo if updated
        if (new Date(user.updatedAt) > new Date(mergedData.updatedAt)) {
          mergedData.displayName = user.displayName || mergedData.displayName;
          mergedData.photoURL = user.photoURL || mergedData.photoURL;
          mergedData.customPhotoURL = user.customPhotoURL || mergedData.customPhotoURL;
          mergedData.phone = user.phone || mergedData.phone;
          mergedData.bio = user.bio || mergedData.bio;
        }
        
        // Preserve admin status if any duplicate has it
        if (user.isAdmin) {
          mergedData.isAdmin = true;
          mergedData.adminRole = user.adminRole || mergedData.adminRole;
          mergedData.adminPermissions = user.adminPermissions || mergedData.adminPermissions;
        }
      });
      
      // Update the kept user with merged data
      mergedData.updatedAt = new Date().toISOString();
      await firebaseRest.set(`users/${keepUser.id}`, mergedData);
      
      // Delete duplicate users
      for (const user of removeUsers) {
        await firebaseRest.delete(`users/${user.id}`);
        console.log(`Deleted duplicate user: ${user.id}`);
      }
    }
    
    // Process Firebase UID duplicates (similar logic)
    for (const [uid, duplicateUsers] of uidDuplicates) {
      // Skip if already processed by email deduplication
      const stillExist = [];
      for (const user of duplicateUsers) {
        try {
          const exists = await firebaseRest.get(`users/${user.id}`);
          if (exists) stillExist.push(user);
        } catch (e) {
          // User was already deleted
        }
      }
      
      if (stillExist.length <= 1) continue;
      
      console.log(`\nProcessing Firebase UID duplicates for: ${uid}`);
      console.log(`Users: ${stillExist.map(u => `${u.id} (${u.createdAt})`).join(', ')}`);
      
      // Sort by creation date (keep oldest)
      const sortedUsers = stillExist.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      const keepUser = sortedUsers[0];
      const removeUsers = sortedUsers.slice(1);
      
      console.log(`Keeping user: ${keepUser.id} (${keepUser.createdAt})`);
      console.log(`Removing users: ${removeUsers.map(u => u.id).join(', ')}`);
      
      // Delete duplicate users
      for (const user of removeUsers) {
        await firebaseRest.delete(`users/${user.id}`);
        console.log(`Deleted duplicate user: ${user.id}`);
      }
    }
    
    console.log('\nUser deduplication completed successfully!');
    
  } catch (error) {
    console.error('Error during user deduplication:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  deduplicateUsers()
    .then(() => {
      console.log('Deduplication completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Deduplication failed:', error);
      process.exit(1);
    });
}

module.exports = { deduplicateUsers };