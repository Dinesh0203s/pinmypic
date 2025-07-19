import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoUploadDialog } from './PhotoUploadDialog';
import { Camera } from 'lucide-react';
import { Event } from '@shared/types';

interface GalleryUploadDialogProps {
  events: Event[];
  onPhotosUploaded: () => void;
}

export function GalleryUploadDialog({ events, onPhotosUploaded }: GalleryUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handleOpenUpload = () => {
    if (selectedEventId) {
      setUploadDialogOpen(true);
    }
  };

  const handlePhotosUploaded = () => {
    setUploadDialogOpen(false);
    setOpen(false);
    setSelectedEventId('');
    onPhotosUploaded();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="bg-green-50 border-green-200 text-green-600 hover:bg-green-100">
            <Camera className="h-4 w-4 mr-2" />
            Upload Gallery Photos
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Gallery Photos</DialogTitle>
            <DialogDescription>
              Select an event to upload photos to its gallery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Event</label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an event to upload photos" />
                </SelectTrigger>
                <SelectContent>
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title} ({event.photoCount || 0} photos)
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-events" disabled>
                      No events available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {selectedEvent && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">{selectedEvent.title}</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Date: {new Date(selectedEvent.eventDate).toLocaleDateString()}</p>
                  <p>Location: {selectedEvent.location}</p>
                  <p>Current Photos: {selectedEvent.photoCount || 0}</p>
                </div>
              </div>
            )}

            <Button 
              onClick={handleOpenUpload}
              disabled={!selectedEventId}
              className="w-full bg-gradient-to-r from-pink-500 to-orange-500 text-white hover:from-pink-600 hover:to-orange-600"
            >
              <Camera className="h-4 w-4 mr-2" />
              Upload Photos to Selected Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedEvent && (
        <PhotoUploadDialog
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          onPhotosUploaded={handlePhotosUploaded}
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
        />
      )}
    </>
  );
}