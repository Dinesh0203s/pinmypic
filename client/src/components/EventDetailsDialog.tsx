import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Save, 
  Edit, 
  Calendar, 
  MapPin, 
  Camera, 
  Lock, 
  Unlock,
  Eye,
  X,
  Grid,
  Download,
  Trash2,
  Upload,
  ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Event, Photo } from '@shared/types';
import { PhotoUploadDialog } from './PhotoUploadDialog';
import AdminPhotoGallery from './AdminPhotoGallery';

interface EventDetailsDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated: () => void;
  initialEditMode?: boolean;
}

export function EventDetailsDialog({ event, open, onOpenChange, onEventUpdated, initialEditMode = false }: EventDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<Photo | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
          event.stopPropagation(); // Prevent dialog from closing
          setFullScreenImage(null);
          setActiveTab('gallery'); // Ensure we're on the gallery tab
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

  const [editData, setEditData] = useState({
    title: '',
    description: '',
    eventDate: '',
    location: '',
    category: '',
    isPrivate: false,
    publicPin: '',
    brideGroomPin: '',
    passcode: ''
  });

  const categories = [
    'Wedding',
    'Corporate',
    'Birthday',
    'Family',
    'Graduation',
    'Concert',
    'Other'
  ];

  useEffect(() => {
    if (event) {
      setEditData({
        title: event.title,
        description: event.description || '',
        eventDate: event.eventDate.split('T')[0],
        location: event.location,
        category: event.category,
        isPrivate: event.isPrivate,
        publicPin: event.publicPin || '',
        brideGroomPin: event.brideGroomPin || '',
        passcode: event.passcode || ''
      });
      
      if (activeTab === 'gallery') {
        loadPhotos();
      }
    }
  }, [event, activeTab]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open && event) {
      setActiveTab('details');
      setPhotos([]);
      setIsEditing(initialEditMode);
    }
  }, [open, event, initialEditMode]);

  const loadPhotos = async () => {
    if (!event) return;
    
    setLoadingPhotos(true);
    try {
      const response = await fetch(`/api/events/${event.id}/photos`);
      if (response.ok) {
        const data = await response.json();
        // Handle both new paginated format and old direct array format
        if (data.photos && Array.isArray(data.photos)) {
          setPhotos(data.photos);
        } else if (Array.isArray(data)) {
          setPhotos(data);
        } else {
          setPhotos([]);
        }
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      toast({
        title: "Error",
        description: "Failed to load photos",
        variant: "destructive"
      });
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    
    setDeletingPhotoId(photoId);
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Photo deleted successfully"
        });
        // Remove photo from local state
        setPhotos(photos.filter(p => p.id !== photoId));
        // Refresh event data to update photo count
        onEventUpdated();
      } else {
        throw new Error('Failed to delete photo');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: "Error",
        description: "Failed to delete photo",
        variant: "destructive"
      });
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleSetAsThumbnail = async (photoUrl: string) => {
    if (!event) return;
    
    setUploadingThumbnail(true);
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ thumbnailUrl: photoUrl })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Event thumbnail updated successfully"
        });
        onEventUpdated();
      } else {
        throw new Error('Failed to update thumbnail');
      }
    } catch (error) {
      console.error('Error updating thumbnail:', error);
      toast({
        title: "Error",
        description: "Failed to update thumbnail",
        variant: "destructive"
      });
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleSave = async () => {
    if (!event) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Event updated successfully"
        });
        setIsEditing(false);
        onEventUpdated();
        // Update the dialog with new data
        const updatedEvent = await response.json();
        if (updatedEvent) {
          setEditData({
            title: updatedEvent.title,
            description: updatedEvent.description || '',
            eventDate: updatedEvent.eventDate.split('T')[0],
            location: updatedEvent.location,
            category: updatedEvent.category,
            isPrivate: updatedEvent.isPrivate,
            publicPin: updatedEvent.publicPin || '',
            brideGroomPin: updatedEvent.brideGroomPin || '',
            passcode: updatedEvent.passcode || ''
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update event",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;

    // Only accept JPEG/JPG files
    if (!file.type.match(/^image\/jpe?g$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG image file",
        variant: "destructive"
      });
      return;
    }

    setUploadingThumbnail(true);
    const formData = new FormData();
    formData.append('photos', file); // Changed from 'file' to 'photos' to match multer config
    formData.append('eventId', event.id);
    formData.append('filename', file.name);

    try {
      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        // Set the uploaded photo as thumbnail
        await handleSetAsThumbnail(data.photo.url);
        // Load photos to show the new upload
        loadPhotos();
      } else {
        throw new Error('Failed to upload thumbnail');
      }
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast({
        title: "Error",
        description: "Failed to upload thumbnail",
        variant: "destructive"
      });
    } finally {
      setUploadingThumbnail(false);
      // Reset input
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = '';
      }
    }
  };

  const handleCancel = () => {
    if (event) {
      setEditData({
        title: event.title,
        description: event.description || '',
        eventDate: event.eventDate.split('T')[0],
        location: event.location,
        category: event.category,
        isPrivate: event.isPrivate,
        publicPin: event.publicPin || '',
        brideGroomPin: event.brideGroomPin || '',
        passcode: event.passcode || ''
      });
    }
    setIsEditing(false);
  };

  if (!event) return null;

  return (
    <Dialog 
      open={open} 
      onOpenChange={fullScreenImage ? undefined : onOpenChange} // Prevent closing when in slideshow
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onOpenChange(false)}
              className="p-1 h-auto"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Calendar className="h-5 w-5" />
            {event.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and manage event details including photos, thumbnail, and event information
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Event Details
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photo Gallery ({event.photoCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Event Information</h3>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} disabled={loading} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Event
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Event Title</Label>
                    {isEditing ? (
                      <Input
                        id="title"
                        value={editData.title}
                        onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter event title"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-600">{event.title}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    {isEditing ? (
                      <Textarea
                        id="description"
                        value={editData.description}
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter event description"
                        rows={3}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-600">{event.description || 'No description provided'}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="eventDate">Event Date</Label>
                    {isEditing ? (
                      <Input
                        id="eventDate"
                        type="date"
                        value={editData.eventDate}
                        onChange={(e) => setEditData(prev => ({ ...prev, eventDate: e.target.value }))}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-600 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(event.eventDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    {isEditing ? (
                      <Input
                        id="location"
                        value={editData.location}
                        onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Enter event location"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-600 flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        {event.location}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    {isEditing ? (
                      <Select 
                        value={editData.category} 
                        onValueChange={(value) => setEditData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary" className="mt-1">
                        {event.category}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Privacy & Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Event Type</Label>
                    {isEditing ? (
                      <Select 
                        value={editData.isPrivate.toString()} 
                        onValueChange={(value) => setEditData(prev => ({ ...prev, isPrivate: value === 'true' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">Public Event</SelectItem>
                          <SelectItem value="true">Private Event</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1">
                        <Badge variant={event.isPrivate ? "destructive" : "secondary"} className="flex items-center w-fit">
                          {event.isPrivate ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                          {event.isPrivate ? 'Private' : 'Public'}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="publicPin">Public PIN</Label>
                    {isEditing ? (
                      <Input
                        id="publicPin"
                        value={editData.publicPin}
                        onChange={(e) => setEditData(prev => ({ ...prev, publicPin: e.target.value }))}
                        placeholder="Enter public PIN"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-600 font-mono">
                        {event.publicPin || 'Not set'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="brideGroomPin">Bride & Groom PIN</Label>
                    {isEditing ? (
                      <Input
                        id="brideGroomPin"
                        value={editData.brideGroomPin}
                        onChange={(e) => setEditData(prev => ({ ...prev, brideGroomPin: e.target.value }))}
                        placeholder="Enter bride & groom PIN"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-600 font-mono">
                        {event.brideGroomPin || 'Not set'}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Photo Count:</span>
                      <span className="font-medium flex items-center">
                        <Camera className="h-4 w-4 mr-1" />
                        {event.photoCount} photos
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-500">Created:</span>
                      <span className="text-gray-600">{new Date(event.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-500">Updated:</span>
                      <span className="text-gray-600">{new Date(event.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Event Thumbnail</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.thumbnailUrl ? (
                    <div className="space-y-4">
                      <img 
                        src={event.thumbnailUrl} 
                        alt="Event thumbnail" 
                        className="w-full max-w-md h-48 object-cover rounded-lg border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/400x300?text=No+Thumbnail';
                        }}
                      />
                      <p className="text-xs text-gray-500">Current thumbnail image</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full max-w-md h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No thumbnail set</p>
                        <p className="text-xs text-gray-400 mt-1">Select a photo from the gallery to set as thumbnail</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg"
                        onChange={handleThumbnailUpload}
                        className="hidden"
                        id="thumbnail-upload"
                      />
                      <label
                        htmlFor="thumbnail-upload"
                        className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg hover:from-pink-600 hover:to-orange-600 transition-all ${uploadingThumbnail ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {uploadingThumbnail ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload JPEG Thumbnail
                          </>
                        )}
                      </label>
                      <span className="text-xs text-gray-500">JPEG files only</span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">Or set from gallery:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Go to the Photo Gallery tab</li>
                        <li>Hover over any photo</li>
                        <li>Click the camera icon to set it as thumbnail</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Grid className="h-5 w-5" />
                Photo Gallery
              </h3>
              <div className="flex gap-2">
                <PhotoUploadDialog 
                  eventId={event.id} 
                  eventTitle={event.title}
                  onPhotosUploaded={() => {
                    loadPhotos();
                    onEventUpdated();
                  }}
                />
                <Button onClick={loadPhotos} variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            <AdminPhotoGallery
              photos={photos}
              loading={loadingPhotos}
              onPhotoClick={setFullScreenImage}
              onDeletePhoto={handleDeletePhoto}
              onSetAsThumbnail={handleSetAsThumbnail}
              currentThumbnailUrl={event?.thumbnailUrl}
              deletingPhotoId={deletingPhotoId}
              uploadingThumbnail={uploadingThumbnail}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Full Screen Image Viewer with Slideshow */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black"
          onClick={(e) => {
            // Only close if clicking on the background (not on buttons or image)
            if (e.target === e.currentTarget) {
              setFullScreenImage(null);
              setActiveTab('gallery');
            }
          }}
        >
          {/* Header with back button and download */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
            <div className="flex items-center justify-between text-white">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Back button clicked');
                  setFullScreenImage(null);
                  setActiveTab('gallery');
                }}
                className="text-white hover:bg-white/20 pointer-events-auto cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Event Gallery
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-75">
                  {currentPhotoIndex + 1} of {photos.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Download button clicked');
                    const link = document.createElement('a');
                    link.href = fullScreenImage.url;
                    link.download = fullScreenImage.filename;
                    link.click();
                  }}
                  className="text-white hover:bg-white/20 pointer-events-auto cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Close button clicked');
                    setFullScreenImage(null);
                    setActiveTab('gallery');
                  }}
                  className="text-white hover:bg-white/20 pointer-events-auto cursor-pointer"
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
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 text-white hover:bg-white/20 h-16 w-16 rounded-full pointer-events-auto"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>

              {/* Next Button */}
              <Button
                variant="ghost"
                size="lg"
                onClick={goToNextPhoto}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 text-white hover:bg-white/20 h-16 w-16 rounded-full pointer-events-auto"
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
            />
          </div>

          {/* Footer with image info and navigation dots */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="text-center text-white">
              <p className="text-sm opacity-75">
                {fullScreenImage.filename}
              </p>
              <p className="text-xs opacity-50 mt-1">
                Use arrow keys or navigation buttons to browse • Press ESC or Back button to return to event gallery
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
    </Dialog>
  );
}