import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PhotoUploadDialog } from '@/components/PhotoUploadDialog';
import { Edit, Save, X, Eye, Calendar, MapPin, Lock, Unlock, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Event } from '@shared/types';

interface EditableEventRowProps {
  event: Event;
  onEventUpdated: () => void;
  onViewEvent: (event: Event) => void;
}

export function EditableEventRow({ event, onEventUpdated, onViewEvent }: EditableEventRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [editData, setEditData] = useState({
    title: event.title,
    description: event.description || '',
    eventDate: event.eventDate.split('T')[0], // Format for input[type="date"]
    location: event.location,
    category: event.category,
    isPrivate: event.isPrivate,
    publicPin: event.publicPin || '',
    brideGroomPin: event.brideGroomPin || '',
    passcode: event.passcode || ''
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

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editData,
          eventDate: new Date(editData.eventDate).toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }

      toast({
        title: "Event updated",
        description: "Event details have been saved successfully.",
      });

      setIsEditing(false);
      onEventUpdated();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error updating event",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
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
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <TableRow className="bg-blue-50">
        <TableCell>
          <Input
            value={editData.title}
            onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Event title"
            className="min-w-[200px]"
          />
        </TableCell>
        <TableCell>
          <Textarea
            value={editData.description}
            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Event description"
            rows={2}
            className="min-w-[300px]"
          />
        </TableCell>
        <TableCell>
          <Input
            type="date"
            value={editData.eventDate}
            onChange={(e) => setEditData(prev => ({ ...prev, eventDate: e.target.value }))}
            className="min-w-[150px]"
          />
        </TableCell>
        <TableCell>
          <Input
            value={editData.location}
            onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Location"
            className="min-w-[150px]"
          />
        </TableCell>
        <TableCell>
          <Select 
            value={editData.category} 
            onValueChange={(value) => setEditData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger className="min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Select 
            value={editData.isPrivate.toString()} 
            onValueChange={(value) => setEditData(prev => ({ ...prev, isPrivate: value === 'true' }))}
          >
            <SelectTrigger className="min-w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">Public</SelectItem>
              <SelectItem value="true">Private</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <div className="space-y-2">
            <Input
              value={editData.publicPin}
              onChange={(e) => setEditData(prev => ({ ...prev, publicPin: e.target.value }))}
              placeholder="Public PIN"
              className="min-w-[100px]"
            />
            <Input
              value={editData.brideGroomPin}
              onChange={(e) => setEditData(prev => ({ ...prev, brideGroomPin: e.target.value }))}
              placeholder="B&G PIN"
              className="min-w-[100px]"
            />
          </div>
        </TableCell>
        <TableCell>{event.photoCount}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Save className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell>
        <div className="font-medium">{event.title}</div>
      </TableCell>
      <TableCell>
        <div className="max-w-[300px] truncate text-sm text-gray-600">
          {event.description || 'No description'}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-gray-500" />
          {new Date(event.eventDate).toLocaleDateString()}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-gray-500" />
          {event.location}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{event.category}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {event.isPrivate ? (
            <>
              <Lock className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600">Private</span>
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Public</span>
            </>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {event.publicPin && (
            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Public: {event.publicPin}
            </div>
          )}
          {event.brideGroomPin && (
            <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
              B&G: {event.brideGroomPin}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{event.photoCount}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewEvent(event)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-700"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <PhotoUploadDialog
            eventId={event.id}
            eventTitle={event.title}
            onPhotosUploaded={onEventUpdated}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}