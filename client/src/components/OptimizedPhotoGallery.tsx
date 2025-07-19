import { useState, useEffect, useRef, useMemo } from 'react';
import { Download, Eye, Loader2, Image as ImageIcon, Heart, HeartOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Photo } from '@shared/types';
import { imagePreloader, getOptimizedImageUrl, PerformanceMonitor } from '@/utils/imagePreloader';
import { useAuth } from '@/contexts/AuthContext';

interface OptimizedPhotoGalleryProps {
  photos: Photo[];
  loading?: boolean;
  onPhotoClick?: (photo: Photo) => void;
  className?: string;
  showSaveToProfile?: boolean;
  savedPhotoIds?: string[];
  onSavePhoto?: (photoId: string) => void;
  onRemovePhoto?: (photoId: string) => void;
  savingPhotoIds?: string[];
}

interface PhotoWithLoading extends Photo {
  loaded?: boolean;
  error?: boolean;
}

const OptimizedPhotoGallery = ({ 
  photos, 
  loading = false, 
  onPhotoClick, 
  className = "", 
  showSaveToProfile = false,
  savedPhotoIds = [],
  onSavePhoto,
  onRemovePhoto,
  savingPhotoIds = []
}: OptimizedPhotoGalleryProps) => {
  const [loadedPhotos, setLoadedPhotos] = useState<PhotoWithLoading[]>([]);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { currentUser } = useAuth();

  // Initialize photos with loading states
  useEffect(() => {
    if (Array.isArray(photos)) {
      setLoadedPhotos(photos.map(photo => ({ ...photo, loaded: false, error: false })));
    } else {
      setLoadedPhotos([]);
    }
  }, [photos]);

  // Virtualized scrolling - load more photos as user scrolls
  useEffect(() => {
    if (!containerRef.current) return;

    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      
      // Load more photos when user scrolls to 80% of current content
      if (scrollPercentage > 0.8 && Array.isArray(photos) && visibleRange.end < photos.length) {
        setVisibleRange(prev => ({
          ...prev,
          end: Math.min(prev.end + 20, photos.length)
        }));
      }
    };

    containerRef.current.addEventListener('scroll', handleScroll);
    return () => containerRef.current?.removeEventListener('scroll', handleScroll);
  }, [photos.length, visibleRange.end]);

  // Intersection observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const photoId = entry.target.getAttribute('data-photo-id');
            if (photoId) {
              // Start loading the image
              const img = entry.target.querySelector('img') as HTMLImageElement;
              if (img && !img.src.startsWith('/api/images/')) {
                img.src = img.dataset.src || '';
              }
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const handleImageLoad = (photoId: string) => {
    setLoadedPhotos(prev => 
      prev.map(photo => 
        photo.id === photoId ? { ...photo, loaded: true } : photo
      )
    );
  };

  const handleImageError = (photoId: string) => {
    setLoadedPhotos(prev => 
      prev.map(photo => 
        photo.id === photoId ? { ...photo, error: true } : photo
      )
    );
  };

  const visiblePhotos = useMemo(() => {
    if (!Array.isArray(loadedPhotos)) {
      return [];
    }
    return loadedPhotos.slice(visibleRange.start, visibleRange.end);
  }, [loadedPhotos, visibleRange]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        <span className="text-gray-600">Loading photos...</span>
      </div>
    );
  }

  if (!Array.isArray(photos) || photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-gray-500">
        <ImageIcon className="h-16 w-16" />
        <p className="text-lg font-medium">No photos available</p>
        <p className="text-sm">Photos will appear here once uploaded</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`max-h-[70vh] overflow-y-auto ${className}`}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-1">
        {visiblePhotos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onLoad={() => handleImageLoad(photo.id)}
            onError={() => handleImageError(photo.id)}
            onPhotoClick={onPhotoClick}
            observer={observerRef.current}
            showSaveToProfile={showSaveToProfile}
            savedPhotoIds={savedPhotoIds}
            onSavePhoto={onSavePhoto}
            onRemovePhoto={onRemovePhoto}
            savingPhotoIds={savingPhotoIds}
            currentUser={currentUser}
          />
        ))}
      </div>
      
      {/* Loading more indicator */}
      {visibleRange.end < photos.length && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
          <span className="ml-2 text-gray-600">Loading more photos...</span>
        </div>
      )}
      
      {/* Photos counter */}
      <div className="text-center py-4 text-sm text-gray-500">
        Showing {visibleRange.end} of {photos.length} photos
      </div>
    </div>
  );
};

interface PhotoCardProps {
  photo: PhotoWithLoading;
  onLoad: () => void;
  onError: () => void;
  onPhotoClick?: (photo: Photo) => void;
  observer: IntersectionObserver | null;
  showSaveToProfile?: boolean;
  savedPhotoIds?: string[];
  onSavePhoto?: (photoId: string) => void;
  onRemovePhoto?: (photoId: string) => void;
  savingPhotoIds?: string[];
  currentUser?: any;
}

const PhotoCard = ({ 
  photo, 
  onLoad, 
  onError, 
  onPhotoClick, 
  observer, 
  showSaveToProfile = false, 
  savedPhotoIds = [], 
  onSavePhoto, 
  onRemovePhoto, 
  savingPhotoIds = [], 
  currentUser 
}: PhotoCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (observer && cardRef.current) {
      observer.observe(cardRef.current);
    }
    
    return () => {
      if (observer && cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [observer]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading photo:', error);
    }
  };

  const handleSaveToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSavePhoto) {
      onSavePhoto(photo.id);
    }
  };

  const handleRemoveFromProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemovePhoto) {
      onRemovePhoto(photo.id);
    }
  };

  const isPhotoSaved = savedPhotoIds.includes(photo.id);
  const isPhotoSaving = savingPhotoIds.includes(photo.id);
  const canShowSaveButton = showSaveToProfile && currentUser;

  return (
    <div
      ref={cardRef}
      data-photo-id={photo.id}
      className="aspect-square relative group overflow-hidden rounded-lg bg-gray-100 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
      onClick={() => onPhotoClick?.(photo)}
    >
      {/* Loading skeleton */}
      {!photo.loaded && !photo.error && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-pulse" 
               style={{ animationDuration: '2s' }} />
        </div>
      )}
      
      {/* Error state */}
      {photo.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
      
      {/* Image with optimized loading */}
      <img
        data-src={photo.url}
        src={photo.loaded ? photo.url : undefined}
        alt={photo.filename}
        className={`w-full h-full object-cover transition-all duration-300 ${
          photo.loaded ? 'opacity-100' : 'opacity-0'
        } group-hover:scale-110`}
        loading="lazy"
        decoding="async"
        onLoad={onLoad}
        onError={onError}
      />
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/90 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              onPhotoClick?.(photo);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/90 hover:bg-white"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
          {canShowSaveButton && (
            <Button
              variant="secondary"
              size="sm"
              className={`bg-white/90 hover:bg-white ${isPhotoSaved ? 'text-red-500' : 'text-green-500'}`}
              onClick={isPhotoSaved ? handleRemoveFromProfile : handleSaveToProfile}
              disabled={isPhotoSaving}
            >
              {isPhotoSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPhotoSaved ? (
                <HeartOff className="h-4 w-4" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Loading indicator for individual photos */}
      {!photo.loaded && !photo.error && (
        <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1">
          <Loader2 className="h-3 w-3 animate-spin text-white" />
        </div>
      )}
    </div>
  );
};

export default OptimizedPhotoGallery;