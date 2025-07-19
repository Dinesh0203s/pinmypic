import { MongoClient, GridFSBucket, Db } from 'mongodb';

export class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private gridFS: GridFSBucket | null = null;
  private connectionString: string;

  constructor() {
    // Initialize connection string (will be set during connect())
    this.connectionString = '';
  }

  private initializeConnectionString() {
    // Use environment variable or default to local MongoDB
    this.connectionString = process.env.MONGODB_URI || `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@localhost:27017/${process.env.MONGODB_DB_NAME}`;
  }

  async connect(): Promise<void> {
    try {
      if (!this.client) {
        // Initialize connection string with current environment variables
        this.initializeConnectionString();
        
        this.client = new MongoClient(this.connectionString, {
          serverSelectionTimeoutMS: 10000, // 10 second timeout for Atlas
          connectTimeoutMS: 10000,
        });
        await this.client.connect();
        
        // Test the connection
        await this.client.db('admin').command({ ping: 1 });
        
        // Extract database name from connection string or use default
        // For MongoDB Atlas, the database name might not be in the URL, so we use a default
        let dbName = 'pinmypic';
        try {
          const urlParts = this.connectionString.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          if (lastPart && lastPart !== '' && !lastPart.startsWith('?')) {
            const nameBeforeQuery = lastPart.split('?')[0];
            if (nameBeforeQuery && nameBeforeQuery !== '') {
              dbName = nameBeforeQuery;
            }
          }
        } catch (e) {
          // Use default database name
        }
        
        this.db = this.client.db(dbName);
        
        // Initialize GridFS bucket for file storage
        this.gridFS = new GridFSBucket(this.db, { bucketName: 'photos' });
      }
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      // Reset connection state
      this.client = null;
      this.db = null;
      this.gridFS = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.gridFS = null;
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected');
    }
    return this.db;
  }

  getGridFS(): GridFSBucket {
    if (!this.gridFS) {
      throw new Error('GridFS not initialized');
    }
    return this.gridFS;
  }

  async ensureConnection(): Promise<void> {
    if (!this.client || !this.db || !this.gridFS) {
      await this.connect();
    }
  }
}

export const mongoService = new MongoDBService();