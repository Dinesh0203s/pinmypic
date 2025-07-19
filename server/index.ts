// Load environment variables from .env file in development
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import multer from "multer";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { mongoService } from "./mongodb";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Initialize MongoDB connection
async function initializeMongoDB() {
  try {
    await mongoService.connect();
  } catch (error) {
    console.error('Failed to initialize MongoDB:', error);
  }
}

// Configure multer for file uploads with memory storage (for MongoDB GridFS)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 100 // Max 100 files
  },
  fileFilter: (req, file, cb) => {
    try {
      // Only allow image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        const error = new Error('Only image files are allowed') as any;
        error.code = 'LIMIT_FILE_TYPE';
        cb(error, false);
      }
    } catch (error) {
      console.error('Error in multer fileFilter:', error);
      cb(error as Error, false);
    }
  }
});

// Enable compression for all routes
app.use(compression({
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024, // Only compress if response is larger than 1KB
  filter: (req, res) => {
    // Don't compress responses if the request is for an image
    if (req.path.startsWith('/api/images/')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));

// Serve static files from uploads directory (for local storage fallback)
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Route to serve images from MongoDB GridFS with optimization
app.get('/api/images/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { thumbnail = 'false', quality = '90' } = req.query;
    const isThumbnail = thumbnail === 'true';
    const { mongoStorage } = await import('./mongo-storage');
    
    const imageData = await mongoStorage.getImageFromGridFS(fileId);
    if (!imageData) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Set appropriate headers for performance
    res.set('Content-Type', imageData.contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
    res.set('ETag', `"${fileId}${isThumbnail ? '-thumb' : ''}"`); // Different ETag for thumbnails
    res.set('Vary', 'Accept-Encoding'); // Enable compression
    
    // Add performance headers
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Accept-Ranges', 'bytes');
    
    // Check if client supports WebP and modern formats
    const acceptsWebP = req.headers.accept?.includes('image/webp');
    const acceptsAvif = req.headers.accept?.includes('image/avif');
    
    if (acceptsAvif && imageData.contentType.startsWith('image/')) {
      res.set('Content-Type', 'image/avif');
    } else if (acceptsWebP && imageData.contentType.startsWith('image/')) {
      res.set('Content-Type', 'image/webp');
    }
    
    // For thumbnail requests, add specific headers
    if (isThumbnail) {
      res.set('X-Image-Type', 'thumbnail');
    }
    
    imageData.stream.pipe(res);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Add multer middleware only for POST requests to photo upload endpoint
app.post('/api/photos/upload', (req, res, next) => {
  upload.array('photos', 50)(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      
      if (err.code === 'LIMIT_FILE_TYPE') {
        return res.status(400).json({ error: 'Only image files are allowed' });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Max size is 10MB' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files. Max 50 files allowed' });
      }
      
      // Generic error
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize MongoDB connection
  await initializeMongoDB();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
