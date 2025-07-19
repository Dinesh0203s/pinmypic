import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Camera, User as UserIcon, MapPin, Phone, Mail, Clock, CheckCircle, XCircle, Edit, Save, X, Eye, Download, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { format } from 'date-fns';
import type { Booking, Photo, User } from '@shared/types';

const Profile = () => {
  const { currentUser, userData, refreshUserData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<Photo | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [editForm, setEditForm] = useState({
    displayName: '',
    phone: '',
    bio: '',
    customPhotoURL: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userBookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ['/api/user/bookings'],
    queryFn: async () => {
      if (!currentUser) return [];
      
      // Force refresh token to ensure it's valid
      const token = await currentUser.getIdToken(true);
      const response = await fetch('/api/user/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch bookings');
      }
      
      return response.json();
    },
    enabled: !!currentUser,
  });

  const { data: photos = [], isLoading: photosLoading } = useQuery<Photo[]>({
    queryKey: ['/api/user/saved-photos'],
    queryFn: async () => {
      if (!currentUser) return [];
      
      // Force refresh token to ensure it's valid
      const token = await currentUser.getIdToken(true);
      const response = await fetch('/api/user/saved-photos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch saved photos');
      }
      
      return response.json();
    },
    enabled: !!currentUser
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      if (!currentUser) throw new Error('No user logged in');
      
      // Force refresh the token to ensure it's valid
      const token = await currentUser.getIdToken(true);
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: async (updatedUser) => {
      console.log('Profile updated successfully:', updatedUser);
      
      // Refresh user data in auth context
      await refreshUserData();
      
      // Invalidate query cache
      queryClient.invalidateQueries({ queryKey: ['/api/auth/sync-user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/bookings'] });
      
      // Update the edit form to reflect the new data
      setEditForm({
        displayName: updatedUser.displayName || '',
        phone: updatedUser.phone || '',
        bio: updatedUser.bio || '',
        customPhotoURL: updatedUser.customPhotoURL || ''
      });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const unsavePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      if (!currentUser) throw new Error('No user logged in');
      
      const token = await currentUser.getIdToken(true);
      const response = await fetch('/api/user/remove-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ photoId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove photo');
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh saved photos list
      queryClient.invalidateQueries({ queryKey: ['/api/user/saved-photos'] });
      
      toast({
        title: "Photo Removed",
        description: "Photo has been removed from your saved photos.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove photo. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Navigation functions for full-screen viewer
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

  const handleUnsavePhoto = (photoId: string) => {
    unsavePhotoMutation.mutate(photoId);
  };

  // Update form when userData changes
  useEffect(() => {
    if (userData && !isEditing) {
      setEditForm({
        displayName: userData?.displayName || currentUser?.displayName || '',
        phone: userData?.phone || '',
        bio: userData?.bio || '',
        customPhotoURL: userData?.customPhotoURL || ''
      });
    }
  }, [userData, currentUser, isEditing]);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditForm({
        displayName: userData?.displayName || currentUser?.displayName || '',
        phone: userData?.phone || '',
        bio: userData?.bio || '',
        customPhotoURL: userData?.customPhotoURL || ''
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editForm);
  };

  const getProfilePhotoURL = () => {
    // Priority: Custom photo > Google photo > fallback
    return userData?.customPhotoURL || currentUser?.photoURL || '';
  };

  const getProfileInitials = () => {
    if (userData?.displayName || currentUser?.displayName) {
      return (userData?.displayName || currentUser?.displayName)!.charAt(0).toUpperCase();
    }
    return currentUser?.email?.charAt(0).toUpperCase() || 'U';
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Please sign in to view your profile</h1>
            <p className="text-gray-600">You need to be logged in to access this page.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={getProfilePhotoURL()} alt={currentUser.displayName || 'User'} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white font-bold">
                      {getProfileInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div className="absolute -bottom-2 -right-2">
                      <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                    {isEditing ? (
                      <div className="flex-1">
                        <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
                        <Input
                          id="displayName"
                          value={editForm.displayName}
                          onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                          className="text-2xl font-bold"
                        />
                      </div>
                    ) : (
                      <h1 className="text-3xl font-bold text-gray-800">
                        {userData?.displayName || currentUser.displayName || 'Welcome!'}
                      </h1>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {userData?.isAdmin && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                          <UserIcon className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={handleSave}
                            disabled={updateProfileMutation.isPending}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setIsEditing(false)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={handleEditToggle}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Profile
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{currentUser.email}</span>
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                          <Input
                            id="phone"
                            value={editForm.phone}
                            onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="Your phone number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customPhotoURL" className="text-sm font-medium">Profile Photo URL</Label>
                          <Input
                            id="customPhotoURL"
                            value={editForm.customPhotoURL}
                            onChange={(e) => setEditForm(prev => ({ ...prev, customPhotoURL: e.target.value }))}
                            placeholder="Custom profile photo URL (leave empty to use Google photo)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                          <Textarea
                            id="bio"
                            value={editForm.bio}
                            onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="Tell us about yourself..."
                            rows={3}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {(userData?.phone || editForm.phone) && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{userData?.phone || editForm.phone}</span>
                          </div>
                        )}
                        
                        {(userData?.bio || editForm.bio) && (
                          <div className="flex items-start gap-2">
                            <UserIcon className="h-4 w-4 mt-0.5" />
                            <span className="text-gray-600">{userData?.bio || editForm.bio}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Member since {format(new Date(userData?.createdAt || new Date()), 'MMMM yyyy')}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Tabs */}
          <Tabs defaultValue="bookings" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
              <TabsTrigger value="bookings" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Booking History
              </TabsTrigger>
              <TabsTrigger value="photos" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Saved Photos
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Booking History */}
            <TabsContent value="bookings">
              <div className="space-y-6">
                {/* Booking Summary */}
                {userBookings.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="text-sm text-gray-600">Total Bookings</p>
                            <p className="text-2xl font-bold">{userBookings.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="text-sm text-gray-600">Confirmed</p>
                            <p className="text-2xl font-bold">{userBookings.filter(b => b.status === 'confirmed').length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="text-sm text-gray-600">Pending</p>
                            <p className="text-2xl font-bold">{userBookings.filter(b => b.status === 'pending').length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-500 font-bold">₹</span>
                          <div>
                            <p className="text-sm text-gray-600">Total Spent</p>
                            <p className="text-2xl font-bold">
                              ₹{userBookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + (b.amount || 0), 0)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Bookings List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Your Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bookingsLoading ? (
                      <div className="text-center py-8">Loading bookings...</div>
                    ) : userBookings.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No bookings yet</p>
                        <p className="text-sm">Book your first photography session to see it here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {userBookings.map((booking: Booking) => (
                          <Card key={booking.id} className="border border-gray-200">
                            <CardContent className="p-6">
                              <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-lg">{booking.eventType}</h3>
                                    <Badge className={`${getStatusColor(booking.status)} flex items-center gap-1`}>
                                      {getStatusIcon(booking.status)}
                                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4" />
                                      <span>{format(new Date(booking.eventDate), 'MMMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>{booking.eventTime}</span>
                                    </div>
                                    {booking.location && (
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span>{booking.location}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">₹{booking.amount || 0}</span>
                                    </div>
                                  </div>
                                  
                                  {booking.message && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                      <p className="text-sm text-gray-700">{booking.message}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Saved Photos */}
            <TabsContent value="photos">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Saved Photos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {photosLoading ? (
                    <div className="text-center py-8">Loading photos...</div>
                  ) : photos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Camera className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No saved photos yet</p>
                      <p className="text-sm">Use the "FindMyFace" feature to save photos from events to your profile</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {photos.map((photo: Photo) => (
                        <div key={photo.id} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={photo.url}
                              alt={photo.filename || 'Photo'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement?.classList.add('bg-gray-200');
                              }}
                            />
                          </div>
                          
                          {/* Action buttons overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-white hover:bg-white/20 h-8 w-8 p-0"
                                onClick={() => setFullScreenImage(photo)}
                                title="View full size"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-white hover:bg-white/20 h-8 w-8 p-0"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = photo.url;
                                  link.download = photo.filename || 'photo';
                                  link.click();
                                }}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-white hover:bg-red-500/80 h-8 w-8 p-0"
                                onClick={() => handleUnsavePhoto(photo.id)}
                                title="Remove from saved"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                          <p className="text-gray-900">{currentUser.displayName || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <p className="text-gray-900">{currentUser.email}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="text-md font-medium text-gray-800 mb-2">Account Type</h4>
                        <div className="flex items-center gap-2">
                          {userData?.isAdmin ? (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                              <UserIcon className="h-3 w-3 mr-1" />
                              Administrator
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <UserIcon className="h-3 w-3 mr-1" />
                              Standard User
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Preferences</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <h4 className="font-medium">Email Notifications</h4>
                          <p className="text-sm text-gray-600">Receive updates about your bookings</p>
                        </div>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <h4 className="font-medium">Privacy Settings</h4>
                          <p className="text-sm text-gray-600">Manage your data and privacy preferences</p>
                        </div>
                        <Button variant="outline" size="sm">Manage</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Full Screen Image Viewer with Slideshow */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[60] bg-black">
          {/* Header with back button and download */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
            <div className="flex items-center justify-between text-white">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFullScreenImage(null);
                }}
                className="text-white hover:bg-white/20 pointer-events-auto cursor-pointer"
              >
                <X className="h-5 w-5 mr-2" />
                Close
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
                    link.download = fullScreenImage.filename || 'photo';
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
                  onClick={() => {
                    handleUnsavePhoto(fullScreenImage.id);
                    setFullScreenImage(null);
                  }}
                  className="text-white hover:bg-red-500/80 pointer-events-auto cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
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
              alt={fullScreenImage.filename || 'Photo'}
              className="max-w-full max-h-full object-contain transition-opacity duration-300"
              style={{ maxHeight: 'calc(100vh - 160px)' }}
            />
          </div>

          {/* Navigation dots for small galleries */}
          {photos.length > 1 && photos.length <= 10 && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
              {photos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentPhotoIndex(index);
                    setFullScreenImage(photos[index]);
                  }}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentPhotoIndex 
                      ? 'bg-white' 
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Footer with instructions */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm opacity-75 text-center">
            <p>Use arrow keys to navigate • ESC to close</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;