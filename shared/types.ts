import { z } from "zod";

// Firebase Realtime Database compatible types
export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  customPhotoURL?: string;
  isAdmin?: boolean;
  adminRole?: 'owner' | 'admin' | 'moderator';
  adminPermissions?: string[];
  isActive?: boolean;
  lastLogin?: string;
  phone?: string;
  bio?: string;
  savedPhotos?: string[]; // Array of photo IDs saved to profile
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  location: string;
  photoCount: number;
  isPrivate: boolean;
  category: string;
  thumbnailUrl?: string;
  publicPin?: string;
  brideGroomPin?: string;
  passcode?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  location: string;
  duration: string;
  guestCount?: number;
  packageType: string;
  amount?: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  eventId: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  tags?: string;
  isProcessed: boolean;
  uploadedAt: string;
  faceData?: FaceData[];
}

export interface FaceData {
  bbox: number[]; // [x, y, width, height]
  confidence: number;
  embedding: number[];
  landmarks?: number[][];
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  duration: string;
  photoCount: string;
  features?: string[];
  isPopular: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Zod schemas for validation
export const insertUserSchema = z.object({
  firebaseUid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  customPhotoURL: z.string().optional(),
  isAdmin: z.boolean().optional(),
  adminRole: z.enum(['owner', 'admin', 'moderator']).optional(),
  adminPermissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  lastLogin: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

export const insertEventSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  eventDate: z.string(),
  location: z.string(),
  photoCount: z.number().default(0),
  isPrivate: z.boolean().default(false),
  category: z.string(),
  thumbnailUrl: z.string().optional(),
  publicPin: z.string().optional(),
  brideGroomPin: z.string().optional(),
  passcode: z.string().optional(),
  createdBy: z.string().optional(),
});

export const insertBookingSchema = z.object({
  userId: z.string().optional(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  eventType: z.string(),
  eventDate: z.string(),
  eventTime: z.string(),
  location: z.string(),
  duration: z.string(),
  guestCount: z.union([z.number(), z.string()]).optional().transform((val) => {
    if (val === null || val === undefined || val === '') return undefined;
    return typeof val === 'string' ? parseInt(val, 10) || undefined : val;
  }),
  packageType: z.string(),
  amount: z.number().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled']).default('pending'),
  message: z.string().optional(),
});

export const insertPhotoSchema = z.object({
  eventId: z.string(),
  filename: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  tags: z.string().optional(),
  isProcessed: z.boolean().default(false),
  faceData: z.array(z.object({
    bbox: z.array(z.number()).length(4),
    confidence: z.number(),
    embedding: z.array(z.number()),
    landmarks: z.array(z.array(z.number())).optional(),
  })).optional(),
});

export const insertContactMessageSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  subject: z.string().optional(),
  message: z.string(),
  isRead: z.boolean().default(false),
});

export const insertPackageSchema = z.object({
  name: z.string(),
  price: z.number(),
  duration: z.string(),
  photoCount: z.string(),
  features: z.array(z.string()).optional(),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type InsertPackage = z.infer<typeof insertPackageSchema>;