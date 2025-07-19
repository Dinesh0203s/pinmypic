import { firebaseRest } from "./firebase-rest";
import { cache } from "./cache";
import { 
  type User, 
  type InsertUser,
  type Event,
  type InsertEvent,
  type Booking,
  type InsertBooking,
  type ContactMessage,
  type InsertContactMessage,
  type Photo,
  type InsertPhoto,
  type Package,
  type InsertPackage
} from "@shared/types";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getAdminUsers(): Promise<User[]>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  updateUserAdminStatus(id: string, isAdmin: boolean, adminRole?: 'owner' | 'admin' | 'moderator', permissions?: string[]): Promise<User | undefined>;
  deactivateUser(id: string): Promise<boolean>;
  findOrCreateUserByEmail(userData: InsertUser): Promise<User>;
  savePhotoToProfile(userId: string, photoId: string): Promise<boolean>;
  removePhotoFromProfile(userId: string, photoId: string): Promise<boolean>;
  getUserSavedPhotos(userId: string): Promise<Photo[]>;
  
  // Event methods
  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  getPublicEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  
  // Booking methods
  getBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getUserBookings(userId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;
  
  // Contact methods
  getContactMessages(): Promise<ContactMessage[]>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  markMessageAsRead(id: string): Promise<boolean>;
  
  // Package methods
  getPackages(): Promise<Package[]>;
  getAllPackages(): Promise<Package[]>;
  getActivePackages(): Promise<Package[]>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: string, updates: Partial<InsertPackage>): Promise<Package | undefined>;
  deletePackage(id: string): Promise<boolean>;
  
  // Photo methods
  getPhoto(id: string): Promise<Photo | undefined>;
  getEventPhotos(eventId: string): Promise<Photo[]>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  updatePhoto(id: string, updates: Partial<InsertPhoto>): Promise<Photo | undefined>;
  deletePhoto(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    try {
      const data = await firebaseRest.get(`users/${id}`);
      return data;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    try {
      const users = await firebaseRest.get('users');
      if (!users) return undefined;
      
      for (const [id, user] of Object.entries(users as Record<string, any>)) {
        if (user.firebaseUid === firebaseUid) {
          return { ...user, id } as User;
        }
      }
      return undefined;
    } catch (error) {
      console.error('Error getting user by Firebase UID:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const users = await firebaseRest.get('users');
      if (!users) return undefined;
      
      for (const [id, user] of Object.entries(users as Record<string, any>)) {
        if (user.email === email) {
          return { ...user, id } as User;
        }
      }
      return undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async findOrCreateUserByEmail(userData: InsertUser): Promise<User> {
    try {
      // First try to find existing user by Firebase UID (most reliable)
      let user = await this.getUserByFirebaseUid(userData.firebaseUid);
      
      if (user) {
        // User exists by Firebase UID, update with latest data
        const updatedUser = await this.updateUser(user.id, {
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          email: userData.email, // Update email if changed
        });
        return updatedUser || user;
      }
      
      // Try to find by email as fallback
      user = await this.getUserByEmail(userData.email);
      
      if (user) {
        // User exists by email but not Firebase UID, update Firebase UID and other data
        const updatedUser = await this.updateUser(user.id, {
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          firebaseUid: userData.firebaseUid, // Link Firebase UID to existing account
        });
        return updatedUser || user;
      } else {
        // No user exists, create new one
        return await this.createUser(userData);
      }
    } catch (error) {
      console.error('Error finding or creating user by email:', error);
      throw error;
    }
  }



  async createUser(user: InsertUser): Promise<User> {
    try {
      // Double-check for existing users by both email and Firebase UID to prevent duplicates
      const [existingUserByEmail, existingUserByUid] = await Promise.all([
        this.getUserByEmail(user.email),
        this.getUserByFirebaseUid(user.firebaseUid)
      ]);
      
      if (existingUserByEmail) {
        console.log(`User with email ${user.email} already exists, returning existing user`);
        return existingUserByEmail;
      }
      
      if (existingUserByUid) {
        console.log(`User with Firebase UID ${user.firebaseUid} already exists, returning existing user`);
        return existingUserByUid;
      }
      
      const now = new Date().toISOString();
      const userData = {
        ...user,
        createdAt: now,
        updatedAt: now,
      };
      
      const id = await firebaseRest.push('users', userData);
      const newUser: User = {
        id,
        ...userData,
      };
      
      console.log(`Created new user with email ${user.email} and Firebase UID ${user.firebaseUid}`);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const existingUser = await this.getUser(id);
      if (!existingUser) {
        return undefined;
      }
      
      const updatedUser = {
        ...existingUser,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await firebaseRest.set(`users/${id}`, updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const users = await firebaseRest.get('users');
      if (!users) return [];
      
      // Convert Firebase object to array with proper ID fields
      const userArray = Object.entries(users as Record<string, any>).map(([id, user]) => ({
        ...user,
        id
      }));
      
      return userArray.sort((a: User, b: User) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const existingUser = await this.getUser(id);
      if (!existingUser) return false;
      
      await firebaseRest.delete(`users/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getAdminUsers(): Promise<User[]> {
    try {
      const users = await firebaseRest.get('users');
      if (!users) return [];
      
      const adminUsers = Object.entries(users as Record<string, any>)
        .filter(([_, user]) => user.isAdmin === true)
        .map(([id, user]) => ({ ...user, id }))
        .sort((a: User, b: User) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      
      return adminUsers;
    } catch (error) {
      console.error('Error fetching admin users:', error);
      return [];
    }
  }

  async updateUserAdminStatus(
    id: string, 
    isAdmin: boolean, 
    adminRole?: 'owner' | 'admin' | 'moderator', 
    permissions?: string[]
  ): Promise<User | undefined> {
    try {
      const existingUser = await this.getUser(id);
      if (!existingUser) return undefined;
      
      const updates = {
        isAdmin,
        adminRole,
        adminPermissions: permissions,
        updatedAt: new Date().toISOString(),
      };
      
      const updatedUser = {
        ...existingUser,
        ...updates,
      };
      
      await firebaseRest.set(`users/${id}`, updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user admin status:', error);
      return undefined;
    }
  }

  async deactivateUser(id: string): Promise<boolean> {
    try {
      const existingUser = await this.getUser(id);
      if (!existingUser) return false;
      
      const updatedUser = {
        ...existingUser,
        isActive: false,
        updatedAt: new Date().toISOString(),
      };
      
      await firebaseRest.set(`users/${id}`, updatedUser);
      return true;
    } catch (error) {
      console.error('Error deactivating user:', error);
      return false;
    }
  }

  // Event methods
  async getEvents(): Promise<Event[]> {
    try {
      const events = await firebaseRest.get('events');
      if (!events) return [];
      
      // Convert Firebase object to array with proper id field
      const eventsArray = Object.entries(events as Record<string, any>).map(([key, event]) => ({
        ...event,
        id: key
      })) as Event[];
      
      // Update photo counts efficiently
      const photos = await firebaseRest.get('photos');
      if (photos) {
        const photoCounts = new Map<string, number>();
        Object.values(photos as Record<string, any>).forEach((photo: any) => {
          const count = photoCounts.get(photo.eventId) || 0;
          photoCounts.set(photo.eventId, count + 1);
        });
        
        eventsArray.forEach(event => {
          event.photoCount = photoCounts.get(event.id) || 0;
        });
      }
      
      return eventsArray.sort((a: Event, b: Event) => 
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      );
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  async getEvent(id: string): Promise<Event | undefined> {
    try {
      const event = await firebaseRest.get(`events/${id}`);
      if (event) {
        return { ...event, id };
      }
      return undefined;
    } catch (error) {
      console.error('Error getting event:', error);
      return undefined;
    }
  }

  async getPublicEvents(): Promise<Event[]> {
    try {
      const events = await firebaseRest.get('events');
      if (!events) return [];
      
      // Convert Firebase object to array with proper id field
      const eventsArray = Object.entries(events as Record<string, any>).map(([key, event]) => ({
        ...event,
        id: key
      })) as Event[];
      
      return eventsArray
        .filter((event: Event) => !event.isPrivate)
        .sort((a: Event, b: Event) => 
          new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
        );
    } catch (error) {
      console.error('Error fetching public events:', error);
      return [];
    }
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    try {
      const now = new Date().toISOString();
      const eventData = {
        ...event,
        photoCount: event.photoCount || 0,
        isPrivate: event.isPrivate || false,
        createdAt: now,
        updatedAt: now,
      };
      
      const id = await firebaseRest.push('events', eventData);
      const newEvent: Event = {
        id,
        ...eventData,
      };
      
      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    try {
      const existingEvent = await this.getEvent(id);
      if (!existingEvent) return undefined;
      
      const updatedEvent = {
        ...existingEvent,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await firebaseRest.set(`events/${id}`, updatedEvent);
      return updatedEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      return undefined;
    }
  }

  async deleteEvent(id: string): Promise<boolean> {
    try {
      const existingEvent = await this.getEvent(id);
      if (!existingEvent) return false;
      
      await firebaseRest.delete(`events/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  }

  // Booking methods
  async getBookings(): Promise<Booking[]> {
    try {
      const bookings = await firebaseRest.get('/bookings');
      
      if (!bookings) {
        return [];
      }
      
      // Convert Firebase object to array with proper id field
      const bookingArray = Object.entries(bookings as Record<string, any>).map(([key, booking]) => ({
        ...booking,
        id: key
      })) as Booking[];
      
      return bookingArray.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    try {
      const booking = await firebaseRest.get(`bookings/${id}`);
      return booking;
    } catch (error) {
      console.error('Error getting booking:', error);
      return undefined;
    }
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    try {
      const bookings = await firebaseRest.get('bookings');
      if (!bookings) return [];
      
      const userBookings = Object.values(bookings as Record<string, Booking>)
        .filter((booking: Booking) => booking.userId === userId)
        .sort((a: Booking, b: Booking) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      
      return userBookings;
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      return [];
    }
  }

  async createBooking(booking: any): Promise<Booking> {
    try {
      const now = new Date().toISOString();
      
      // Create booking object with only defined values
      const newBooking: any = {
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      
      // Only add defined values from booking
      Object.keys(booking).forEach(key => {
        if (booking[key] !== undefined && booking[key] !== null && booking[key] !== '') {
          newBooking[key] = booking[key];
        }
      });
      
  
      
      // Use Firebase REST API to push data
      const generatedKey = await firebaseRest.push('/bookings', newBooking);
      
      // Add the ID to the booking object
      const finalBooking = {
        id: generatedKey,
        ...newBooking
      };
      
      // Update the record with the ID
      await firebaseRest.update(`/bookings/${generatedKey}`, { id: generatedKey });
      

      
      return finalBooking as Booking;
    } catch (firebaseError) {
      console.error('Firebase booking save error:', firebaseError);
      throw firebaseError;
    }
  }

  async updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined> {
    try {
  
      
      // Get current booking data first
      const currentData = await firebaseRest.get(`/bookings/${id}`);
      if (!currentData) {
        console.error(`Booking ${id} not found`);
        return undefined;
      }
      
      const updatedData = {
        ...currentData,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Update the booking using REST API
      await firebaseRest.update(`/bookings/${id}`, updatedData);

      
      return updatedData as Booking;
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }

  async deleteBooking(id: string): Promise<boolean> {
    try {
  
      
      // Check if booking exists first
      const currentData = await firebaseRest.get(`/bookings/${id}`);
      if (!currentData) {
        console.error(`Booking ${id} not found`);
        return false;
      }
      
      // Delete the booking using REST API
      await firebaseRest.delete(`/bookings/${id}`);

      
      return true;
    } catch (error) {
      console.error('Error deleting booking:', error);
      return false;
    }
  }

  // Contact methods
  async getContactMessages(): Promise<ContactMessage[]> {
    try {
      const messages = await firebaseRest.get('contactMessages');
      if (!messages) return [];
      return Object.values(messages as Record<string, ContactMessage>).sort((a: ContactMessage, b: ContactMessage) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching contact messages:', error);
      return [];
    }
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    try {
      const now = new Date().toISOString();
      const messageData = {
        ...message,
        isRead: message.isRead || false,
        createdAt: now,
      };
      
      const id = await firebaseRest.push('contactMessages', messageData);
      const newMessage: ContactMessage = {
        id,
        ...messageData,
      };
      
      await firebaseRest.update(`contactMessages/${id}`, { id });
      return newMessage;
    } catch (error) {
      console.error('Error creating contact message:', error);
      throw error;
    }
  }

  async markMessageAsRead(id: string): Promise<boolean> {
    try {
      const existingMessage = await firebaseRest.get(`contactMessages/${id}`);
      if (!existingMessage) return false;
      
      await firebaseRest.update(`contactMessages/${id}`, { isRead: true });
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  // Package methods
  async getPackages(): Promise<Package[]> {
    try {
      const packages = await firebaseRest.get('packages');
      if (!packages) return [];
      return Object.values(packages as Record<string, Package>).sort((a: Package, b: Package) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching packages:', error);
      return [];
    }
  }

  async getAllPackages(): Promise<Package[]> {
    try {
      const packages = await firebaseRest.get('packages');
      if (!packages) return [];
      
      // Return all packages without filtering - include both active and inactive
      const packageArray = Object.values(packages as Record<string, Package>);
      
      return packageArray.sort((a: Package, b: Package) => 
        new Date(a.createdAt || new Date()).getTime() - new Date(b.createdAt || new Date()).getTime()
      );
    } catch (error) {
      console.error('Error fetching all packages:', error);
      return [];
    }
  }

  async getActivePackages(): Promise<Package[]> {
    try {
      const packages = await firebaseRest.get('packages');
      
      if (!packages) {
        return [];
      }
      
      const packageArray = Object.values(packages as Record<string, Package>).filter((pkg: Package) => pkg.isActive !== false);
      
      return packageArray.sort((a: Package, b: Package) => 
        new Date(a.createdAt || new Date()).getTime() - new Date(b.createdAt || new Date()).getTime()
      );
    } catch (error) {
      console.error('Error fetching active packages:', error);
      return [];
    }
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    try {
      const now = new Date().toISOString();
      const packageData = {
        ...pkg,
        isPopular: pkg.isPopular || false,
        isActive: pkg.isActive !== false, // default to true
        createdAt: now,
        updatedAt: now,
      };
      
      const generatedKey = await firebaseRest.push('/packages', packageData);
      const newPackage: Package = {
        id: generatedKey,
        ...packageData,
      };
      
      // Update with ID
      await firebaseRest.update(`/packages/${generatedKey}`, { id: generatedKey });
      
      return newPackage;
    } catch (error) {
      console.error('Error creating package:', error);
      throw error;
    }
  }

  private async seedDefaultPackages(): Promise<void> {
    try {
      const defaultPackages = [
        {
          name: "Basic",
          price: 299,
          duration: "2 hours",
          photoCount: "50+ photos",
          features: ["Professional editing", "Digital gallery", "Email delivery"],
          isPopular: false,
          isActive: true
        },
        {
          name: "Premium",
          price: 499,
          duration: "4 hours",
          photoCount: "100+ photos",
          features: ["Professional editing", "Digital gallery", "Print release", "USB drive"],
          isPopular: true,
          isActive: true
        },
        {
          name: "Deluxe",
          price: 799,
          duration: "8 hours",
          photoCount: "200+ photos",
          features: ["Professional editing", "Digital gallery", "Print release", "USB drive", "Photo album"],
          isPopular: false,
          isActive: true
        }
      ];


      for (const pkg of defaultPackages) {
        await this.createPackage(pkg);
      }

    } catch (error) {
      console.error('Error seeding default packages:', error);
    }
  }

  async updatePackage(id: string, updates: Partial<InsertPackage>): Promise<Package | undefined> {
    try {
      const existingPackage = await firebaseRest.get(`packages/${id}`);
      if (!existingPackage) return undefined;
      
      const updatedPackage = {
        ...existingPackage,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await firebaseRest.set(`packages/${id}`, updatedPackage);
      return updatedPackage;
    } catch (error) {
      console.error('Error updating package:', error);
      return undefined;
    }
  }

  async deletePackage(id: string): Promise<boolean> {
    try {
      await firebaseRest.delete(`packages/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting package:', error);
      return false;
    }
  }

  // Photo methods
  async getPhoto(id: string): Promise<Photo | undefined> {
    try {
      const photo = await firebaseRest.get(`photos/${id}`);
      return photo;
    } catch (error) {
      console.error('Error getting photo:', error);
      return undefined;
    }
  }

  async getEventPhotos(eventId: string): Promise<Photo[]> {
    try {
      const photos = await firebaseRest.get('photos');
      if (!photos) return [];
      
      return Object.values(photos as Record<string, Photo>)
        .filter((photo: Photo) => photo.eventId === eventId)
        .sort((a: Photo, b: Photo) => 
          new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
        );
    } catch (error) {
      console.error('Error fetching event photos:', error);
      return [];
    }
  }

  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    try {
      const now = new Date().toISOString();
      const photoData = {
        ...photo,
        isProcessed: photo.isProcessed || false,
        uploadedAt: now,
      };
      
      const id = await firebaseRest.push('photos', photoData);
      const newPhoto: Photo = {
        id,
        ...photoData,
      };
      
      await firebaseRest.update(`photos/${id}`, { id });
      
      // Update event photo count in Firebase
      await this.updateEventPhotoCount(photo.eventId);
      
      return newPhoto;
    } catch (error) {
      console.error('Error creating photo:', error);
      throw error;
    }
  }

  async updatePhoto(id: string, updates: Partial<InsertPhoto>): Promise<Photo | undefined> {
    try {
      const existingPhoto = await firebaseRest.get(`photos/${id}`);
      if (!existingPhoto) return undefined;
      
      const updatedPhoto = {
        ...existingPhoto,
        ...updates,
      };
      
      await firebaseRest.update(`photos/${id}`, updatedPhoto);
      
      return updatedPhoto as Photo;
    } catch (error) {
      console.error('Error updating photo:', error);
      return undefined;
    }
  }

  // Helper method to update event photo count in Firebase
  private async updateEventPhotoCount(eventId: string): Promise<void> {
    try {
      // Get actual photo count from photos collection
      const photos = await firebaseRest.get('photos');
      let actualPhotoCount = 0;
      
      if (photos) {
        actualPhotoCount = Object.values(photos as Record<string, any>)
          .filter((photo: any) => photo.eventId === eventId)
          .length;
      }
      
      // Update the event's photo count in Firebase
      await firebaseRest.update(`events/${eventId}`, { 
        photoCount: actualPhotoCount,
        updatedAt: new Date().toISOString()
      });
      

    } catch (error) {
      console.error('Error updating event photo count:', error);
    }
  }

  async deletePhoto(id: string): Promise<boolean> {
    try {
      const existingPhoto = await firebaseRest.get(`photos/${id}`);
      if (!existingPhoto) return false;
      
      await firebaseRest.delete(`photos/${id}`);
      
      // Update event photo count in Firebase
      await this.updateEventPhotoCount(existingPhoto.eventId);
      
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }

  // User saved photos methods
  async savePhotoToProfile(userId: string, photoId: string): Promise<{ success: boolean; alreadySaved?: boolean }> {
    try {
      console.log(`Attempting to save photo ${photoId} for user ${userId}`);
      
      // Get the current user data
      const user = await firebaseRest.get(`users/${userId}`);
      if (!user) {
        console.log('User not found in database');
        return { success: false };
      }
      
      // Initialize savedPhotos array if it doesn't exist
      const savedPhotos = user.savedPhotos || [];
      console.log('Current saved photos:', savedPhotos);
      
      // Check if photo is already saved
      if (savedPhotos.includes(photoId)) {
        console.log(`Photo ${photoId} already saved`);
        return { success: true, alreadySaved: true }; // Already saved
      }
      
      // Add the photo ID to the saved photos array
      const updatedSavedPhotos = [...savedPhotos, photoId];
      console.log('Updated saved photos array:', updatedSavedPhotos);
      
      // Update the user record
      await firebaseRest.update(`users/${userId}`, {
        savedPhotos: updatedSavedPhotos,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`Successfully saved photo ${photoId} to user ${userId} profile`);
      
      // Clear cache to ensure fresh data
      cache.delete(`users/${userId}`);
      
      return { success: true, alreadySaved: false };
    } catch (error) {
      console.error('Error saving photo to profile:', error);
      return { success: false };
    }
  }

  async removePhotoFromProfile(userId: string, photoId: string): Promise<boolean> {
    try {
      // Get the current user data
      const user = await firebaseRest.get(`users/${userId}`);
      if (!user) return false;
      
      // Get current saved photos
      const savedPhotos = user.savedPhotos || [];
      
      // Remove the photo ID from the saved photos array
      const updatedSavedPhotos = savedPhotos.filter((id: string) => id !== photoId);
      
      // Update the user record
      await firebaseRest.update(`users/${userId}`, {
        savedPhotos: updatedSavedPhotos,
        updatedAt: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error removing photo from profile:', error);
      return false;
    }
  }

  async getUserSavedPhotos(userId: string): Promise<Photo[]> {
    try {
      console.log(`Fetching saved photos for user ${userId}`);
      
      // Clear cache for this user to ensure fresh data
      cache.delete(`users/${userId}`);
      
      // Get the user data (fresh from database)
      const user = await firebaseRest.get(`users/${userId}`);
      if (!user || !user.savedPhotos) {
        console.log(`No saved photos found for user ${userId}`);
        return [];
      }
      
      console.log(`User has ${user.savedPhotos.length} saved photos:`, user.savedPhotos);
      
      // Get all photos and filter by saved photo IDs
      const allPhotos = await firebaseRest.get('photos');
      if (!allPhotos) return [];
      
      const savedPhotos = Object.values(allPhotos as Record<string, Photo>)
        .filter((photo: Photo) => user.savedPhotos.includes(photo.id))
        .sort((a: Photo, b: Photo) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
      
      console.log(`Returning ${savedPhotos.length} saved photos for user ${userId}`);
      
      return savedPhotos;
    } catch (error) {
      console.error('Error fetching user saved photos:', error);
      return [];
    }
  }


}

export const storage = new DatabaseStorage();
