import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { mongoService } from './mongodb';
import { firebaseRest } from './firebase-rest';
import { 
  User, Event, Booking, Photo, ContactMessage, Package,
  InsertUser, InsertEvent, InsertBooking, InsertPhoto, InsertContactMessage, InsertPackage
} from '../shared/types';

export interface IMongoStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Event methods
  getEvent(id: string): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  
  // Booking methods
  getBooking(id: string): Promise<Booking | undefined>;
  getAllBookings(): Promise<Booking[]>;
  getUserBookings(userId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;
  
  // Contact message methods
  getContactMessage(id: string): Promise<ContactMessage | undefined>;
  getAllContactMessages(): Promise<ContactMessage[]>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  updateContactMessage(id: string, updates: Partial<InsertContactMessage>): Promise<ContactMessage | undefined>;
  deleteContactMessage(id: string): Promise<boolean>;
  
  // Package methods
  getPackage(id: string): Promise<Package | undefined>;
  getAllPackages(): Promise<Package[]>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: string, updates: Partial<InsertPackage>): Promise<Package | undefined>;
  deletePackage(id: string): Promise<boolean>;
  
  // Photo methods with MongoDB GridFS
  getPhoto(id: string): Promise<Photo | undefined>;
  getEventPhotos(eventId: string): Promise<Photo[]>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  updatePhoto(id: string, updates: Partial<InsertPhoto>): Promise<Photo | undefined>;
  deletePhoto(id: string): Promise<boolean>;
  
  // GridFS specific methods for image handling
  uploadImageToGridFS(buffer: Buffer, filename: string, metadata: any): Promise<string>;
  getImageFromGridFS(fileId: string): Promise<{ stream: Readable; contentType: string } | null>;
  deleteImageFromGridFS(fileId: string): Promise<boolean>;
}

class MongoStorage implements IMongoStorage {
  private async ensureConnection() {
    await mongoService.ensureConnection();
  }

  // User methods - using Firebase for consistency with existing auth
  async getUser(id: string): Promise<User | undefined> {
    try {
      const user = await firebaseRest.get(`users/${id}`);
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    try {
      const users = await firebaseRest.get('users');
      if (!users) return undefined;
      
      return Object.values(users as Record<string, User>)
        .find((user: User) => user.firebaseUid === firebaseUid);
    } catch (error) {
      console.error('Error getting user by Firebase UID:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
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
      
      await firebaseRest.update(`users/${id}`, { id });
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const existingUser = await firebaseRest.get(`users/${id}`);
      if (!existingUser) return undefined;
      
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

  // Event methods - using Firebase for metadata
  async getEvent(id: string): Promise<Event | undefined> {
    try {
      const event = await firebaseRest.get(`events/${id}`);
      return event;
    } catch (error) {
      console.error('Error getting event:', error);
      return undefined;
    }
  }

  async getAllEvents(): Promise<Event[]> {
    try {
      const events = await firebaseRest.get('events');
      if (!events) return [];
      
      return Object.values(events as Record<string, Event>)
        .sort((a: Event, b: Event) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    try {
      const now = new Date().toISOString();
      const eventData = {
        ...event,
        createdAt: now,
        updatedAt: now,
      };
      
      const id = await firebaseRest.push('events', eventData);
      const newEvent: Event = {
        id,
        ...eventData,
      };
      
      await firebaseRest.update(`events/${id}`, { id });
      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    try {
      const existingEvent = await firebaseRest.get(`events/${id}`);
      if (!existingEvent) return undefined;
      
      const updatedEvent = {
        ...existingEvent,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await firebaseRest.update(`events/${id}`, updatedEvent);
      return updatedEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      return undefined;
    }
  }

  async deleteEvent(id: string): Promise<boolean> {
    try {
      // First delete all photos for this event
      const photos = await this.getEventPhotos(id);
      for (const photo of photos) {
        await this.deletePhoto(photo.id);
      }
      
      await firebaseRest.delete(`events/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  }

  // Booking methods - using Firebase
  async getBooking(id: string): Promise<Booking | undefined> {
    try {
      const booking = await firebaseRest.get(`bookings/${id}`);
      return booking;
    } catch (error) {
      console.error('Error getting booking:', error);
      return undefined;
    }
  }

  async getAllBookings(): Promise<Booking[]> {
    try {
      const bookings = await firebaseRest.get('bookings');
      if (!bookings) return [];
      
      return Object.values(bookings as Record<string, Booking>)
        .sort((a: Booking, b: Booking) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    try {
      const bookings = await firebaseRest.get('bookings');
      if (!bookings) return [];
      
      return Object.values(bookings as Record<string, Booking>)
        .filter((booking: Booking) => booking.userId === userId)
        .sort((a: Booking, b: Booking) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      return [];
    }
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    try {
      const now = new Date().toISOString();
      const bookingData = {
        ...booking,
        createdAt: now,
        updatedAt: now,
      };
      
      const id = await firebaseRest.push('bookings', bookingData);
      const newBooking: Booking = {
        id,
        ...bookingData,
      };
      
      await firebaseRest.update(`bookings/${id}`, { id });
      return newBooking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  async updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined> {
    try {
      const existingBooking = await firebaseRest.get(`bookings/${id}`);
      if (!existingBooking) return undefined;
      
      const updatedBooking = {
        ...existingBooking,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await firebaseRest.update(`bookings/${id}`, updatedBooking);
      return updatedBooking;
    } catch (error) {
      console.error('Error updating booking:', error);
      return undefined;
    }
  }

  async deleteBooking(id: string): Promise<boolean> {
    try {
      await firebaseRest.delete(`bookings/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting booking:', error);
      return false;
    }
  }

  // Contact message methods - using Firebase
  async getContactMessage(id: string): Promise<ContactMessage | undefined> {
    try {
      const message = await firebaseRest.get(`contactMessages/${id}`);
      return message;
    } catch (error) {
      console.error('Error getting contact message:', error);
      return undefined;
    }
  }

  async getAllContactMessages(): Promise<ContactMessage[]> {
    try {
      const messages = await firebaseRest.get('contactMessages');
      if (!messages) return [];
      
      return Object.values(messages as Record<string, ContactMessage>)
        .sort((a: ContactMessage, b: ContactMessage) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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

  async updateContactMessage(id: string, updates: Partial<InsertContactMessage>): Promise<ContactMessage | undefined> {
    try {
      const existingMessage = await firebaseRest.get(`contactMessages/${id}`);
      if (!existingMessage) return undefined;
      
      const updatedMessage = {
        ...existingMessage,
        ...updates,
      };
      
      await firebaseRest.update(`contactMessages/${id}`, updatedMessage);
      return updatedMessage;
    } catch (error) {
      console.error('Error updating contact message:', error);
      return undefined;
    }
  }

  async deleteContactMessage(id: string): Promise<boolean> {
    try {
      await firebaseRest.delete(`contactMessages/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting contact message:', error);
      return false;
    }
  }

  // Package methods - using Firebase
  async getPackage(id: string): Promise<Package | undefined> {
    try {
      const pkg = await firebaseRest.get(`packages/${id}`);
      return pkg;
    } catch (error) {
      console.error('Error getting package:', error);
      return undefined;
    }
  }

  async getAllPackages(): Promise<Package[]> {
    try {
      const packages = await firebaseRest.get('packages');
      if (!packages) return [];
      
      return Object.values(packages as Record<string, Package>)
        .filter((pkg: Package) => pkg.isActive)
        .sort((a: Package, b: Package) => a.price - b.price);
    } catch (error) {
      console.error('Error fetching packages:', error);
      return [];
    }
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    try {
      const now = new Date().toISOString();
      const packageData = {
        ...pkg,
        createdAt: now,
        updatedAt: now,
      };
      
      const id = await firebaseRest.push('packages', packageData);
      const newPackage: Package = {
        id,
        ...packageData,
      };
      
      await firebaseRest.update(`packages/${id}`, { id });
      return newPackage;
    } catch (error) {
      console.error('Error creating package:', error);
      throw error;
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

  // Photo methods - using MongoDB GridFS for file storage, Firebase for metadata
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

  async deletePhoto(id: string): Promise<boolean> {
    try {
      const existingPhoto = await firebaseRest.get(`photos/${id}`);
      if (!existingPhoto) return false;
      
      // Delete image from GridFS if it has a gridfs file ID
      if (existingPhoto.url && existingPhoto.url.startsWith('gridfs://')) {
        const fileId = existingPhoto.url.replace('gridfs://', '');
        await this.deleteImageFromGridFS(fileId);
      }
      
      await firebaseRest.delete(`photos/${id}`);
      
      // Update event photo count in Firebase
      await this.updateEventPhotoCount(existingPhoto.eventId);
      
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }

  // GridFS specific methods for image handling
  async uploadImageToGridFS(buffer: Buffer, filename: string, metadata: any): Promise<string> {
    try {
      await this.ensureConnection();
      const gridFS = mongoService.getGridFS();
      
      return new Promise((resolve, reject) => {
        const uploadStream = gridFS.openUploadStream(filename, {
          metadata: {
            ...metadata,
            uploadedAt: new Date(),
          }
        });
        
        uploadStream.on('error', reject);
        uploadStream.on('finish', () => {
          console.log(`Image uploaded to GridFS: ${uploadStream.id}`);
          resolve(uploadStream.id.toString());
        });
        
        // Convert buffer to readable stream and pipe to GridFS
        const readable = Readable.from(buffer);
        readable.pipe(uploadStream);
      });
    } catch (error) {
      console.error('Error uploading image to GridFS:', error);
      throw error;
    }
  }

  async getImageFromGridFS(fileId: string): Promise<{ stream: Readable; contentType: string } | null> {
    try {
      await this.ensureConnection();
      const gridFS = mongoService.getGridFS();
      
      // Find the file to get metadata
      const files = await gridFS.find({ _id: new ObjectId(fileId) }).toArray();
      if (files.length === 0) {
        return null;
      }
      
      const file = files[0];
      const downloadStream = gridFS.openDownloadStream(new ObjectId(fileId));
      
      // Determine content type from filename or metadata
      const contentType = file.metadata?.contentType || this.getContentTypeFromFilename(file.filename);
      
      return {
        stream: downloadStream,
        contentType
      };
    } catch (error) {
      console.error('Error getting image from GridFS:', error);
      return null;
    }
  }

  async deleteImageFromGridFS(fileId: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const gridFS = mongoService.getGridFS();
      
      await gridFS.delete(new ObjectId(fileId));
      console.log(`Image deleted from GridFS: ${fileId}`);
      return true;
    } catch (error) {
      console.error('Error deleting image from GridFS:', error);
      return false;
    }
  }

  private getContentTypeFromFilename(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
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
      
      console.log(`Updated photo count for event ${eventId}: ${actualPhotoCount}`);
    } catch (error) {
      console.error('Error updating event photo count:', error);
    }
  }
}

export const mongoStorage = new MongoStorage();