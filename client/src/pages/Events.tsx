
import { useState, useEffect, useMemo } from 'react';
import { Calendar, Lock, Users, Camera, Search, MapPin, Eye, X, Upload, Scan, Download, Unlock, Video, VideoOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OptimizedPhotoGallery from '@/components/OptimizedPhotoGallery';
import { Event, Photo } from '@shared/types';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const Events = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [faceScanDialogOpen, setFaceScanDialogOpen] = useState(false);

  const [showInlineGallery, setShowInlineGallery] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploadedFace, setUploadedFace] = useState<File | null>(null);
  const [scanningFace, setScanningFace] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<Photo | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'upload' | 'camera'>('upload');
  
  // Save to Profile functionality
  const [savedPhotoIds, setSavedPhotoIds] = useState<string[]>([]);
  const [savingPhotoIds, setSavingPhotoIds] = useState<string[]>([]);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Navigation functions for slideshow
  const goToPreviousPhoto = () => {
    if (photos.length === 0) return;
    const newIndex = currentPhotoIndex === 0 ? photos.length - 1 : currentPhotoIndex - 1;
    setCurrentPhotoIndex(newIndex);
    setFullScreenImage(photos[newIndex]);
  };

  const goToNextPhoto = () => {
    if (photos.length === 0) return;
    const newIndex = currentPhotoIndex === photos.length - 1 ? 0 : currentPhotoIndex + 1;
    setCurrentPhotoIndex(newIndex);
    setFullScreenImage(photos[newIndex]);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!fullScreenImage) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPreviousPhoto();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNextPhoto();
          break;
        case 'Escape':
          event.preventDefault();
          setFullScreenImage(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [fullScreenImage, currentPhotoIndex, photos]);

  // Update photo index when fullScreenImage changes
  useEffect(() => {
    if (fullScreenImage) {
      const index = photos.findIndex(photo => photo.id === fullScreenImage.id);
      if (index !== -1) {
        setCurrentPhotoIndex(index);
      }
    }
  }, [fullScreenImage, photos]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Fetch all events from lightweight endpoint
        const response = await fetch('/api/events/all');
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        } else {
          // Fallback to admin endpoint if new endpoint doesn't exist yet
          const fallbackResponse = await fetch('/api/admin/events');
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            setEvents(data);
          }
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Load saved photos when user is logged in
  useEffect(() => {
    if (currentUser) {
      loadSavedPhotos();
    }
  }, [currentUser]);

  const loadSavedPhotos = async () => {
    try {
      const token = await currentUser?.getIdToken(true);
      const response = await fetch('/api/user/saved-photos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const savedPhotos = await response.json();
        setSavedPhotoIds(savedPhotos.map((photo: Photo) => photo.id));
      }
    } catch (error) {
      console.error('Error loading saved photos:', error);
    }
  };

  const handleSavePhoto = async (photoId: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save photos to your profile.",
        variant: "destructive"
      });
      return;
    }

    setSavingPhotoIds(prev => [...prev, photoId]);
    
    try {
      const token = await currentUser.getIdToken(true);
      const response = await fetch('/api/user/save-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ photoId })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Add to local state for immediate UI feedback
        setSavedPhotoIds(prev => [...prev, photoId]);
        
        // Invalidate the saved photos query to refresh the Profile page
        queryClient.invalidateQueries({ queryKey: ['/api/user/saved-photos'] });
        
        if (data.alreadySaved) {
          toast({
            title: "Photo Already Saved",
            description: "This photo was already in your saved photos.",
          });
        } else {
          toast({
            title: "Photo Saved",
            description: "Photo has been saved to your profile.",
          });
        }
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save photo.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving photo:', error);
      toast({
        title: "Error",
        description: "An error occurred while saving the photo.",
        variant: "destructive"
      });
    } finally {
      setSavingPhotoIds(prev => prev.filter(id => id !== photoId));
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to manage your saved photos.",
        variant: "destructive"
      });
      return;
    }

    setSavingPhotoIds(prev => [...prev, photoId]);
    
    try {
      const token = await currentUser.getIdToken(true);
      const response = await fetch('/api/user/remove-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ photoId })
      });
      
      if (response.ok) {
        setSavedPhotoIds(prev => prev.filter(id => id !== photoId));
        
        // Invalidate the saved photos query to refresh the Profile page
        queryClient.invalidateQueries({ queryKey: ['/api/user/saved-photos'] });
        
        toast({
          title: "Photo Removed",
          description: "Photo has been removed from your profile.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to remove photo.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: "Error",
        description: "An error occurred while removing the photo.",
        variant: "destructive"
      });
    } finally {
      setSavingPhotoIds(prev => prev.filter(id => id !== photoId));
    }
  };

  // Handle auto-opening selected event from homepage navigation
  useEffect(() => {
    if (events.length > 0 && !loading) {
      const selectedEventId = sessionStorage.getItem('selectedEventId');
      if (selectedEventId) {
        const autoOpenEvent = events.find((event: Event) => event.id === selectedEventId);
        if (autoOpenEvent) {
          handleEventAccess(autoOpenEvent);
        }
        // Clear the stored event ID after use
        sessionStorage.removeItem('selectedEventId');
      }
    }
  }, [events, loading]);

  const filteredEvents = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return events;
    
    const lowercaseSearch = debouncedSearchTerm.toLowerCase();
    return events.filter(event =>
      event.title.toLowerCase().includes(lowercaseSearch) ||
      event.location.toLowerCase().includes(lowercaseSearch) ||
      event.category.toLowerCase().includes(lowercaseSearch)
    );
  }, [events, debouncedSearchTerm]);

  const handleEventAccess = async (event: Event) => {
    setSelectedEvent(event);
    setPin('');
    setPinError('');
    setUploadedFace(null);
    setCapturedPhoto(null);
    setUploadMode('upload');
    
    if (event.isPrivate) {
      // Private events require PIN
      setPinDialogOpen(true);
    } else {
      // Public events - direct access to full gallery (no PIN, no face scan)
      await loadEventPhotos(event.id);
      setShowInlineGallery(true);
    }
  };

  const handlePinSubmit = async () => {
    if (!selectedEvent || !pin.trim()) {
      setPinError('Please enter a PIN');
      return;
    }

    // Check which type of PIN was entered
    if (pin === selectedEvent.brideGroomPin) {
      // Bride-Groom PIN: Direct access to full gallery (no face scan)
      setPinDialogOpen(false);
      await loadEventPhotos(selectedEvent.id);
      setShowInlineGallery(true);
    } else if (pin === selectedEvent.publicPin) {
      // Public PIN: Requires face scan to show matched photos
      setPinDialogOpen(false);
      setFaceScanDialogOpen(true);
    } else {
      setPinError('Invalid PIN. Please try again.');
    }
  };

  const handleFaceScan = async () => {
    if (!uploadedFace || !selectedEvent) return;
    
    setScanningFace(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadedFace);
      });
      
      // Call face recognition API
      const response = await fetch('/api/face-recognition/find-my-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selfieData: base64Data,
          eventId: selectedEvent.id
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Show only matched photos (filtered by face recognition)
        setFaceScanDialogOpen(false);
        setPhotos(data.matchedPhotos || []);
        setShowInlineGallery(true);
      } else {
        console.error('Face recognition failed');
        // Show error message
        setPinError('Face recognition failed. Please try again.');
      }
    } catch (error) {
      console.error('Face scanning error:', error);
      setPinError('An error occurred during face scanning.');
    } finally {
      setScanningFace(false);
    }
  };

  const loadEventPhotos = async (eventId: string, page: number = 1) => {
    setLoadingPhotos(true);
    try {
      const response = await fetch(`/api/events/${eventId}/photos?page=${page}&limit=50&lightweight=true`);
      if (response.ok) {
        const data = await response.json();
        if (data.photos) {
          setPhotos(data.photos);
          
          // Preload first 10 images for better performance
          const imageUrls = data.photos.slice(0, 10).map((photo: any) => photo.url);
          if (imageUrls.length > 0) {
            import('@/utils/imagePreloader').then(({ imagePreloader }) => {
              imagePreloader.preloadBatch(imageUrls, 3);
            });
          }
        } else {
          setPhotos(data); // Fallback for old API format
        }
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFace(file);
      setCapturedPhoto(null);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      setCameraStream(stream);
      setCameraActive(true);
      setUploadMode('camera');
      setUploadedFace(null);
      setCapturedPhoto(null);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please try file upload instead.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (video && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(imageData);
      
      // Convert to File for compatibility with existing upload logic
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
          setUploadedFace(file);
        }
      }, 'image/jpeg', 0.8);
      
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setUploadedFace(null);
    startCamera();
  };

  // Clean up camera stream when dialog closes
  useEffect(() => {
    if (!faceScanDialogOpen && cameraStream) {
      stopCamera();
    }
  }, [faceScanDialogOpen]);

  // Show inline gallery instead of events list
  if (showInlineGallery && selectedEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
        <Header />
        
        <main className="pt-16">
          <section className="py-8">
            <div className="container mx-auto px-4">
              {/* Gallery Header with Back Button */}
              <div className="flex items-center justify-between mb-8">
                <Button
                  onClick={() => setShowInlineGallery(false)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Back to Events
                </Button>
                
                <div className="text-center">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                    {selectedEvent.title}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {photos.length} photos found
                  </p>
                </div>
                
                <div className="w-32"></div> {/* Spacer for centering */}
              </div>

              {/* Photo Gallery */}
              <OptimizedPhotoGallery
                photos={photos}
                loading={loadingPhotos}
                onPhotoClick={setFullScreenImage}
                className="mt-4"
                showSaveToProfile={true}
                savedPhotoIds={savedPhotoIds}
                onSavePhoto={handleSavePhoto}
                onRemovePhoto={handleRemovePhoto}
                savingPhotoIds={savingPhotoIds}
              />
            </div>
          </section>
        </main>
        
        {/* Full Screen Image Viewer with Slideshow */}
        {fullScreenImage && (
          <div className="fixed inset-0 z-[100] bg-black">
            {/* Header with back button and download */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center justify-between text-white">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFullScreenImage(null)}
                  className="text-white hover:bg-white/20"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  Back to Gallery
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-75">
                    {currentPhotoIndex + 1} of {photos.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = fullScreenImage.url;
                      link.download = fullScreenImage.filename;
                      link.click();
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFullScreenImage(null)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                {/* Previous Button */}
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={goToPreviousPhoto}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:bg-white/20 h-16 w-16 rounded-full"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>

                {/* Next Button */}
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={goToNextPhoto}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:bg-white/20 h-16 w-16 rounded-full"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Image container */}
            <div className="flex items-center justify-center h-full p-4 pt-20 pb-20">
              <img
                src={fullScreenImage.url}
                alt={fullScreenImage.filename}
                className="max-w-full max-h-full object-contain transition-opacity duration-300"
                style={{ maxHeight: 'calc(100vh - 160px)' }}
                loading="eager"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
            </div>

            {/* Footer with image info and navigation dots */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="text-center text-white">
                <p className="text-sm opacity-75">
                  {fullScreenImage.filename}
                </p>
                <p className="text-xs opacity-50 mt-1">
                  Use arrow keys or navigation buttons to browse • Press ESC to close
                </p>
                
                {/* Navigation dots for smaller photo sets */}
                {photos.length > 1 && photos.length <= 10 && (
                  <div className="flex justify-center mt-3 gap-2">
                    {photos.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentPhotoIndex(index);
                          setFullScreenImage(photos[index]);
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentPhotoIndex 
                            ? 'bg-white scale-125' 
                            : 'bg-white/50 hover:bg-white/75'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-pink-50 via-orange-50 to-yellow-50 py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-pink-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                Event Gallery
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Browse through our captured moments and find your special memories
            </p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 rounded-full border-2 border-pink-200 focus:border-pink-500"
              />
            </div>
          </div>
        </section>

        {/* Events Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, index) => (
                  <Card key={index} className="overflow-hidden animate-pulse">
                    <div className="w-full h-48 bg-gray-200"></div>
                    <CardHeader>
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      </div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredEvents.map((event) => (
                <Card key={event.id} className="group hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
                  <div className="relative overflow-hidden bg-gray-100">
                    <img 
                      src={event.thumbnailUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBpbWFnZSBhdmFpbGFibGU8L3RleHQ+PC9zdmc+'} 
                      alt={event.title}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                      }}
                    />
                    <div className="absolute top-4 right-4">
                      {event.isPrivate ? (
                        <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center">
                          <Lock className="h-3 w-3 mr-1" />
                          Private
                        </div>
                      ) : (
                        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                          Public
                        </div>
                      )}
                    </div>
                    <div className="absolute top-4 left-4">
                      <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                        {event.category}
                      </div>
                    </div>
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-800">
                      {event.title}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="text-sm">{new Date(event.eventDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="text-sm">{event.location}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Camera className="h-4 w-4 mr-2" />
                        <span className="text-sm">{event.photoCount} photos</span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleEventAccess(event)}
                      className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
                    >
                      {event.isPrivate ? (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Enter PIN
                        </>
                      ) : (
                        <>
                          <Unlock className="h-4 w-4 mr-2" />
                          View Gallery
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
                ))}
              </div>
            )}

            {!loading && filteredEvents.length === 0 && (
              <div className="text-center py-16">
                <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No events found</h3>
                <p className="text-gray-500">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* PIN Entry Dialog for Private Events */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2 text-red-500" />
              Private Event Access
            </DialogTitle>
            <DialogDescription>
              Enter your PIN to access {selectedEvent?.title} photos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pin">PIN Code</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter your PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                className="text-center text-lg tracking-widest"
              />
              {pinError && <p className="text-red-500 text-sm mt-1">{pinError}</p>}
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <p className="flex items-center gap-2">
                <span className="font-medium">Public PIN:</span> 
                <span className="text-xs">Face scan required - view your photos only</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-medium">Bride-Groom PIN:</span> 
                <span className="text-xs">Full access - view all event photos</span>
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPinDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handlePinSubmit} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                Access Gallery
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Face Scan Dialog for Public PIN Access */}
      <Dialog open={faceScanDialogOpen} onOpenChange={setFaceScanDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Scan className="h-5 w-5 mr-2 text-green-500" />
              Face Recognition Required
            </DialogTitle>
            <DialogDescription>
              You've entered the Public PIN. Upload a photo or take a selfie to find your pictures in {selectedEvent?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Mode Selection */}
            <div className="flex gap-2 justify-center">
              <Button
                variant={uploadMode === 'upload' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setUploadMode('upload');
                  stopCamera();
                  setCapturedPhoto(null);
                }}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Photo
              </Button>
              <Button
                variant={uploadMode === 'camera' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setUploadMode('camera');
                  setUploadedFace(null);
                  startCamera();
                }}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Take Selfie
              </Button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {/* Show captured photo or uploaded file */}
              {(uploadedFace || capturedPhoto) ? (
                <div className="space-y-2">
                  <img 
                    src={capturedPhoto || URL.createObjectURL(uploadedFace!)} 
                    alt="Face photo" 
                    className="w-20 h-20 rounded-full mx-auto object-cover"
                  />
                  <p className="text-sm text-green-600">
                    {capturedPhoto ? 'Selfie captured' : uploadedFace!.name}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setUploadedFace(null);
                        setCapturedPhoto(null);
                      }}
                    >
                      Remove
                    </Button>
                    {capturedPhoto && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={retakePhoto}
                      >
                        Retake
                      </Button>
                    )}
                  </div>
                </div>
              ) : uploadMode === 'camera' ? (
                <div className="space-y-2">
                  {cameraActive ? (
                    <div className="space-y-2">
                      <video
                        id="camera-video"
                        ref={(video) => {
                          if (video && cameraStream) {
                            video.srcObject = cameraStream;
                            video.play();
                          }
                        }}
                        className="w-full max-w-xs mx-auto rounded-lg"
                        autoPlay
                        playsInline
                        muted
                      />
                      <div className="flex gap-2 justify-center">
                        <Button 
                          onClick={capturePhoto}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Capture Photo
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={stopCamera}
                        >
                          <VideoOff className="h-4 w-4 mr-2" />
                          Stop Camera
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Video className="h-12 w-12 text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-600">Take a clear selfie of your face</p>
                      <Button 
                        variant="outline"
                        onClick={startCamera}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Start Camera
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-600">Upload a clear photo of your face</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="face-upload"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => document.getElementById('face-upload')?.click()}
                  >
                    Choose Photo
                  </Button>
                </div>
              )}
            </div>
            {scanningFace && (
              <div className="text-center text-sm text-gray-600">
                <p>Please wait a few minutes while we process your face recognition...</p>
                <p className="text-xs mt-1">This may take 2-3 minutes depending on the number of photos</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFaceScanDialogOpen(false);
                  stopCamera();
                  setCapturedPhoto(null);
                  setUploadedFace(null);
                  setUploadMode('upload');
                }} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleFaceScan}
                disabled={!uploadedFace || scanningFace}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                {scanningFace ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Find My Photos'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      {/* Full Screen Image Viewer */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] bg-black">
          {/* Header with back button and download */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between text-white">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFullScreenImage(null)}
                className="text-white hover:bg-white/20"
              >
                <Eye className="h-5 w-5 mr-2" />
                Back to Gallery
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = fullScreenImage.url;
                    link.download = fullScreenImage.filename;
                    link.click();
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFullScreenImage(null)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Image container */}
          <div className="flex items-center justify-center h-full p-4 pt-20 pb-16">
            <img
              src={fullScreenImage.url}
              alt={fullScreenImage.filename}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: 'calc(100vh - 140px)' }}
              loading="eager"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
              }}
            />
          </div>

          {/* Footer with image info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="text-center text-white">
              <p className="text-sm opacity-75">
                {fullScreenImage.filename}
              </p>
              <p className="text-xs opacity-50 mt-1">
                Uploaded on {new Date(fullScreenImage.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Events;
