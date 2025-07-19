import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CalendarIcon, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface CreateEventDialogProps {
  onEventCreated: () => void;
}

export function CreateEventDialog({ onEventCreated }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: undefined as Date | undefined,
    location: '',
    category: '',
    isPrivate: false,
    publicPin: '',
    brideGroomPin: '',
    thumbnailUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  const generatePin = (length = 6) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGeneratePins = () => {
    setFormData(prev => ({
      ...prev,
      publicPin: generatePin(6),
      brideGroomPin: generatePin(8)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.eventDate || !formData.location || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          eventDate: formData.eventDate?.toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Event created successfully:', result);
        setOpen(false);
        setFormData({
          title: '',
          description: '',
          eventDate: undefined,
          location: '',
          category: '',
          isPrivate: false,
          publicPin: '',
          brideGroomPin: '',
          thumbnailUrl: ''
        });
        onEventCreated();
      } else {
        console.error('Failed to create event');
        alert('Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Create a new photography event with access controls and photo management.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="Wedding of John & Jane"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="graduation">Graduation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the event..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.eventDate ? format(formData.eventDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.eventDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, eventDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="Event venue or address"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">Event Thumbnail (optional)</Label>
            <Input
              id="thumbnail"
              type="file"
              accept="image/jpeg,image/jpg"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file && file.type.match(/^image\/jpe?g$/i)) {
                  // Convert to base64 for immediate storage
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setFormData(prev => ({ ...prev, thumbnailUrl: reader.result as string }));
                  };
                  reader.readAsDataURL(file);
                } else if (file) {
                  alert('Please select a JPEG image file');
                }
              }}
            />
            <p className="text-xs text-gray-500">Upload a JPEG image for the event thumbnail</p>
          </div>

          <div className="space-y-4 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Access Controls</Label>
                <p className="text-sm text-gray-600">Set up PIN codes for different access levels</p>
              </div>
              <Button type="button" onClick={handleGeneratePins} variant="outline" size="sm">
                Generate PINs
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="publicPin">Public PIN</Label>
                <Input
                  id="publicPin"
                  placeholder="ABC123"
                  value={formData.publicPin}
                  onChange={(e) => setFormData(prev => ({ ...prev, publicPin: e.target.value }))}
                />
                <p className="text-xs text-gray-500">General access for guests</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brideGroomPin">Bride-Groom PIN</Label>
                <Input
                  id="brideGroomPin"
                  placeholder="XYZ789AB"
                  value={formData.brideGroomPin}
                  onChange={(e) => setFormData(prev => ({ ...prev, brideGroomPin: e.target.value }))}
                />
                <p className="text-xs text-gray-500">Special access for bride and groom</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPrivate"
              checked={formData.isPrivate}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))}
            />
            <Label htmlFor="isPrivate">Private Event</Label>
            <p className="text-sm text-gray-600">Only accessible with PIN codes</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}