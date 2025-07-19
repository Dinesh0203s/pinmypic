import fetch from 'node-fetch';
import { cache } from './cache';

const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL?.replace(/\/$/, '') || 'https://pinmypic-3c170-default-rtdb.firebaseio.com';

export class FirebaseRestClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = FIREBASE_DATABASE_URL;
  }

  async set(path: string, data: any): Promise<void> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}.json`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Firebase REST write failed: ${response.statusText}`);
    }
    
    // Invalidate cache for this path and parent path
    cache.delete(`firebase:${cleanPath}`);
    const parentPath = cleanPath.substring(0, cleanPath.lastIndexOf('/'));
    if (parentPath) {
      cache.delete(`firebase:${parentPath}`);
    }
  }

  async push(path: string, data: any): Promise<string> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Firebase REST push failed: ${response.statusText}`);
    }

    const result = await response.json() as any;
    const generatedKey = result.name;
    
    // Invalidate cache for the collection
    cache.delete(`firebase:${cleanPath}`);
    
    return generatedKey;
  }

  async get(path: string): Promise<any> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const cacheKey = `firebase:${cleanPath}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }
    
    const url = `${this.baseUrl}${cleanPath}.json`;
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Firebase REST read failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache the result
    cache.set(cacheKey, data);
    
    return data;
  }

  async update(path: string, data: any): Promise<void> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}.json`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Firebase REST update failed: ${response.statusText}`);
    }
    
    // Invalidate cache for the updated item and its parent collection
    const pathParts = cleanPath.split('/');
    cache.delete(`firebase:${cleanPath}`);
    
    if (pathParts.length > 1) {
      const parentPath = pathParts.slice(0, -1).join('/');
      cache.delete(`firebase:${parentPath}`);
    }
  }

  async delete(path: string): Promise<void> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}.json`;
    
    const response = await fetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Firebase REST delete failed: ${response.statusText}`);
    }
    
    // Invalidate cache for the deleted item and its parent collection
    const pathParts = cleanPath.split('/');
    cache.delete(`firebase:${cleanPath}`);
    
    if (pathParts.length > 1) {
      const parentPath = pathParts.slice(0, -1).join('/');
      cache.delete(`firebase:${parentPath}`);
    }
  }
}

export const firebaseRest = new FirebaseRestClient();