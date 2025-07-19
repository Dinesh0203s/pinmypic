class ImagePreloader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  preloadImage(src: string): Promise<HTMLImageElement> {
    // Return cached image if available
    if (this.cache.has(src)) {
      return Promise.resolve(this.cache.get(src)!);
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src)!;
    }

    // Create new loading promise
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.cache.set(src, img);
        this.loadingPromises.delete(src);
        resolve(img);
      };
      
      img.onerror = () => {
        this.loadingPromises.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      // Set decode hint for better performance
      img.decoding = 'async';
      img.src = src;
    });

    this.loadingPromises.set(src, promise);
    return promise;
  }

  preloadBatch(sources: string[], batchSize: number = 5): Promise<HTMLImageElement[]> {
    const batches: string[][] = [];
    
    // Split sources into batches
    for (let i = 0; i < sources.length; i += batchSize) {
      batches.push(sources.slice(i, i + batchSize));
    }

    // Process batches sequentially to avoid overwhelming the browser
    return batches.reduce(async (prevPromise, batch) => {
      const results = await prevPromise;
      const batchResults = await Promise.allSettled(
        batch.map(src => this.preloadImage(src))
      );
      
      const successResults = batchResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<HTMLImageElement>).value);
      
      return [...results, ...successResults];
    }, Promise.resolve([] as HTMLImageElement[]));
  }

  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  isImageCached(src: string): boolean {
    return this.cache.has(src);
  }
}

// Create singleton instance
export const imagePreloader = new ImagePreloader();

// Utility function for image optimization
export const getOptimizedImageUrl = (originalUrl: string, options: {
  thumbnail?: boolean;
  quality?: number;
  format?: 'webp' | 'avif' | 'original';
} = {}) => {
  const { thumbnail = false, quality = 90, format = 'original' } = options;
  
  const url = new URL(originalUrl, window.location.origin);
  
  if (thumbnail) {
    url.searchParams.set('thumbnail', 'true');
  }
  
  if (quality !== 90) {
    url.searchParams.set('quality', quality.toString());
  }
  
  if (format !== 'original') {
    url.searchParams.set('format', format);
  }
  
  return url.toString();
};

// Performance monitoring utility
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static startTiming(key: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(key)) {
        this.metrics.set(key, []);
      }
      
      this.metrics.get(key)!.push(duration);
    };
  }

  static getAverageTime(key: string): number {
    const times = this.metrics.get(key) || [];
    if (times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  static getMetrics(): Record<string, { average: number, count: number, min: number, max: number }> {
    const result: Record<string, { average: number, count: number, min: number, max: number }> = {};
    
    for (const [key, times] of this.metrics.entries()) {
      if (times.length > 0) {
        result[key] = {
          average: times.reduce((sum, time) => sum + time, 0) / times.length,
          count: times.length,
          min: Math.min(...times),
          max: Math.max(...times)
        };
      }
    }
    
    return result;
  }

  static clearMetrics(): void {
    this.metrics.clear();
  }
}