
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, getAvailableTabs } from '@/utils/adminUtils';
import { 
  Users, 
  Calendar, 
  Camera, 
  BookOpen, 
  TrendingUp, 
  DollarSign,
  Search,
  Plus,
  Edit,
  Trash2,
  Info,
  FileText,
  Eye,
  Phone,
  Mail,
  MapPin,
  Clock,
  User,
  Lock,
  RefreshCw
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronUp, ChevronDown, Filter } from 'lucide-react';
import Header from '@/components/Header';
import { CreateEventDialog } from '@/components/CreateEventDialog';
import { CreatePackageDialog } from '@/components/CreatePackageDialog';
import { PhotoUploadDialog } from '@/components/PhotoUploadDialog';
import { CreateBookingDialog } from '@/components/CreateBookingDialog';
import { ManageUsersDialog } from '@/components/ManageUsersDialog';
import { EditableEventRow } from '@/components/EditableEventRow';
import { EventDetailsDialog } from '@/components/EventDetailsDialog';
import { AnalyticsReport } from '@/components/AnalyticsReport';
import { GalleryUploadDialog } from '@/components/GalleryUploadDialog';
import { AdminUsersManagement } from '@/components/AdminUsersManagement';
import AdminRoleManagement from '@/components/AdminRoleManagement';
import { Booking, ContactMessage, Event, Package } from '@shared/types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AdminStats {
  totalEvents: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  unreadMessages: number;
}

const AdminDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<keyof Booking>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [photoRequests, setPhotoRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [uploadGalleryOpen, setUploadGalleryOpen] = useState(false);
  const [selectedEventForUpload, setSelectedEventForUpload] = useState<Event | null>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState<Event | null>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  
  // Package management states
  const [packageSearchTerm, setPackageSearchTerm] = useState('');
  const [packageStatusFilter, setPackageStatusFilter] = useState<string>('all');
  const [packageSortField, setPackageSortField] = useState<keyof Package>('createdAt');
  const [packageSortDirection, setPackageSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get available tabs based on user permissions
  const availableTabs = getAvailableTabs(userData);
  const [activeTab, setActiveTab] = useState(availableTabs.length > 0 ? availableTabs[0].value : 'events');

  // Helper function to get authentication headers
  const getAuthHeaders = async () => {
    if (!currentUser) return {};
    try {
      const token = await currentUser.getIdToken();
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('Error getting auth token:', error);
      return {};
    }
  };

  // Separate function to fetch packages for reuse
  const fetchPackages = async () => {
    try {
      const headers = await getAuthHeaders();
      const packagesRes = await fetch('/api/packages', { headers });
      if (packagesRes.ok) {
        const packagesData = await packagesRes.json();
        setPackages(packagesData || []);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  // Package filtering and sorting logic
  const filteredAndSortedPackages = packages
    .filter(pkg => {
      // Status filter
      if (packageStatusFilter === 'active' && !pkg.isActive) return false;
      if (packageStatusFilter === 'inactive' && pkg.isActive) return false;
      
      // Search filter
      if (packageSearchTerm) {
        const searchLower = packageSearchTerm.toLowerCase();
        return (
          pkg.name?.toLowerCase().includes(searchLower) ||
          pkg.duration?.toLowerCase().includes(searchLower) ||
          pkg.photoCount?.toLowerCase().includes(searchLower) ||
          pkg.features?.some(feature => feature.toLowerCase().includes(searchLower)) ||
          pkg.price?.toString().includes(searchLower)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (packageSortField) {
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || '').getTime();
          bValue = new Date(b.createdAt || '').getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt || '').getTime();
          bValue = new Date(b.updatedAt || '').getTime();
          break;
        default:
          aValue = a[packageSortField];
          bValue = b[packageSortField];
      }
      
      if (packageSortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const handlePackageSort = (field: keyof Package) => {
    if (packageSortField === field) {
      setPackageSortDirection(packageSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPackageSortField(field);
      setPackageSortDirection('asc');
    }
  };



  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        console.log('Admin Dashboard: Starting parallel data fetch...');

        // Get authentication headers
        const headers = await getAuthHeaders();

        // Fetch all data in parallel for better performance
        const promises = [
          fetch('/api/bookings', { headers }).then(res => res.ok ? res.json() : []).catch(() => []),
          fetch('/api/admin/stats', { headers }).then(res => res.ok ? res.json() : null).catch(() => null),
          fetch('/api/contact', { headers }).then(res => res.ok ? res.json() : []).catch(() => []),
          fetch('/api/admin/events', { headers }).then(res => res.ok ? res.json() : []).catch(() => []),
          fetch('/api/packages', { headers }).then(res => res.ok ? res.json() : []).catch(() => [])
        ];

        const [bookingsData, statsData, messagesData, eventsData, packagesData] = await Promise.all(promises);

        // Update all states at once
        setBookings(bookingsData || []);
        setStats(statsData);
        setMessages(messagesData || []);
        setEvents(eventsData || []);
        setPackages(packagesData || []);
        
        console.log('Admin Dashboard: Data fetch completed');
      } catch (error) {
        console.error('Admin Dashboard: General error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [currentUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleBookingAction = async (bookingId: string, status: 'confirmed' | 'cancelled' | 'pending') => {
    try {
      console.log(`Updating booking ${bookingId} to status: ${status}`);
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        console.log('Booking status updated successfully');
        // Refresh bookings data
        const bookingsRes = await fetch('/api/bookings');
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData);
          console.log('Bookings data refreshed');
        }
      } else {
        console.error('Failed to update booking status:', response.statusText);
        toast({
          title: "Error",
          description: "Failed to update booking status. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: "Failed to update booking status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAmountChange = async (bookingId: string, amount: number) => {
    try {
      console.log(`Updating booking ${bookingId} amount to: ${amount}`);
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });

      if (response.ok) {
        const updatedBooking = await response.json();
        console.log('Amount updated successfully:', updatedBooking);
        
        // Update local state immediately
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking.id === bookingId ? { ...booking, amount } : booking
          )
        );
        
        // Update the selected booking if it's currently viewed
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking(prev => prev ? { ...prev, amount } : null);
        }
      } else {
        console.error('Failed to update booking amount:', response.statusText);
        toast({
          title: "Error",
          description: "Failed to update amount. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating booking amount:', error);
      toast({
        title: "Error",
        description: "Failed to update amount. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    
    try {
      console.log(`Deleting booking: ${bookingId}`);
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('Booking deleted successfully');
        // Refresh bookings data
        const bookingsRes = await fetch('/api/bookings');
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData);
          console.log('Bookings data refreshed after deletion');
        }
      } else {
        console.error('Failed to delete booking:', response.statusText);
        toast({
          title: "Error",
          description: "Failed to delete booking. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error",
        description: "Failed to delete booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setViewDialogOpen(true);
  };

  const handleSort = (field: keyof Booking) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedAndFilteredBookings = () => {
    let filteredBookings = bookings.filter(booking => {
      // Search filter
      const matchesSearch = booking.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.eventType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort bookings
    filteredBookings.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle date sorting
      if (sortField === 'eventDate' || sortField === 'createdAt') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      
      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1;
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filteredBookings;
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      console.log('Refreshing admin dashboard data...');

      const [statsRes, bookingsRes, messagesRes, eventsRes] = await Promise.all([
        fetch('/api/admin/stats').catch(() => ({ ok: false })),
        fetch('/api/bookings').catch(() => ({ ok: false })),
        fetch('/api/contact').catch(() => ({ ok: false })),
        fetch('/api/admin/events').catch(() => ({ ok: false }))
      ]);

      if (statsRes.ok && 'json' in statsRes) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (bookingsRes.ok && 'json' in bookingsRes) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData || []);
      }

      if (messagesRes.ok && 'json' in messagesRes) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData || []);
      }

      if (eventsRes.ok && 'json' in eventsRes) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData || []);
      }

      // Refresh packages data
      await fetchPackages();

      // Trigger users data refresh by incrementing the refresh trigger
      setRefreshTrigger(prev => prev + 1);

      console.log('Admin dashboard data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing admin data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewEvent = (event: Event) => {
    setSelectedEventForView(event);
    setIsEditingEvent(false);
    setEventDetailsOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEventForView(event);
    setEventDetailsOpen(true);
    setIsEditingEvent(true);
    // The EventDetailsDialog will handle the editing functionality
  };

  const handleUploadPhotos = (eventId: string) => {
    // Photo upload is now handled by the PhotoUploadDialog component
    console.log('Photo upload triggered for event:', eventId);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This will also delete all associated photos.')) return;
    
    try {
      const token = await currentUser?.getIdToken();
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        refreshData();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete event. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
              {userData && (
                <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 px-3 py-1">
                  {userData.adminRole === 'owner' && '👑 Owner'}
                  {userData.adminRole === 'admin' && '🛡️ Administrator'}
                  {userData.adminRole === 'moderator' && '⚡ Moderator'}
                </Badge>
              )}
            </div>
            <p className="text-gray-600">Welcome back! Here's what's happening with your photography business.</p>
          </div>
          <Button 
            onClick={refreshData}
            disabled={refreshing || loading}
            variant="outline"
            size="lg"
            className="bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
            <CardDescription>Administrative tasks based on your permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {hasPermission(userData, 'bookings') && (
                <CreateBookingDialog onBookingCreated={() => {
                  console.log('Booking created, refreshing data...');
                  const refreshData = async () => {
                    try {
                      const bookingsRes = await fetch('/api/bookings');
                      if (bookingsRes.ok) {
                        const bookingsData = await bookingsRes.json();
                        setBookings(bookingsData);
                      }
                    } catch (error) {
                      console.error('Error refreshing bookings:', error);
                    }
                  };
                  refreshData();
                }} />
              )}
              {hasPermission(userData, 'photos') && (
                <GalleryUploadDialog 
                  events={events} 
                  onPhotosUploaded={refreshData} 
                />
              )}
              {hasPermission(userData, 'users') && (
                <ManageUsersDialog onUserUpdated={() => {
                  console.log('User updated, refreshing data...');
                }} />
              )}
              {hasPermission(userData, 'events') && (
                <Button 
                  variant="outline" 
                  className="bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100"
                  onClick={() => setAnalyticsOpen(true)}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics Report
                </Button>
              )}

            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvents}</div>
                <p className="text-xs text-muted-foreground">Active events</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <BookOpen className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBookings}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingBookings} pending, {stats.confirmedBookings} confirmed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">From confirmed bookings</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unreadMessages}</div>
                <p className="text-xs text-muted-foreground">Unread messages</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="border-b border-gray-200 mb-6">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-none bg-transparent p-0 space-x-0 w-full overflow-x-auto">
              {availableTabs.map((tab) => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent transition-colors duration-200"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>



          {hasPermission(userData, 'events') && (
            <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Event Management</CardTitle>
                    <CardDescription>Create and manage photography events with photo galleries</CardDescription>
                  </div>
                  <CreateEventDialog onEventCreated={refreshData} />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Photos</TableHead>
                      <TableHead>PINs</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.length > 0 ? (
                      events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>{new Date(event.eventDate).toLocaleDateString()}</TableCell>
                          <TableCell>{event.location}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{event.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={event.isPrivate ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                              {event.isPrivate ? 'Private' : 'Public'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{event.photoCount || 0} photos</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {event.publicPin && (
                                <div className="text-xs">
                                  <span className="font-mono bg-gray-100 px-1 rounded">Public: {event.publicPin}</span>
                                </div>
                              )}
                              {event.brideGroomPin && (
                                <div className="text-xs">
                                  <span className="font-mono bg-pink-100 px-1 rounded">B&G: {event.brideGroomPin}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleViewEvent(event)} title="View Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <PhotoUploadDialog 
                                eventId={event.id} 
                                eventTitle={event.title}
                                onPhotosUploaded={refreshData}
                              />
                              <Button variant="ghost" size="sm" onClick={() => handleEditEvent(event)} title="Edit Event">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteEvent(event.id)}
                                title="Delete Event"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No events created yet</p>
                          <p className="text-sm mt-2">Create your first event to start managing photo galleries</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {hasPermission(userData, 'bookings') && (
            <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>All Bookings</CardTitle>
                    <CardDescription>Manage all event bookings and requests</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search bookings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => navigate('/booking')}
                      className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Booking
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-2">
                          Client
                          {sortField === 'name' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('eventType')}
                      >
                        <div className="flex items-center gap-2">
                          Event Type
                          {sortField === 'eventType' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('eventDate')}
                      >
                        <div className="flex items-center gap-2">
                          Date
                          {sortField === 'eventDate' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {sortField === 'status' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('amount')}
                      >
                        <div className="flex items-center gap-2">
                          Amount
                          {sortField === 'amount' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSortedAndFilteredBookings().length > 0 ? (
                      getSortedAndFilteredBookings().map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{booking.name || 'Unknown Client'}</TableCell>
                          <TableCell>{booking.eventType}</TableCell>
                          <TableCell>{new Date(booking.eventDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Select 
                              value={booking.status} 
                              onValueChange={(newStatus) => handleBookingAction(booking.id, newStatus as 'confirmed' | 'cancelled' | 'pending')}
                            >
                              <SelectTrigger className={`w-32 ${getStatusColor(booking.status)} border-0`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    Pending
                                  </div>
                                </SelectItem>
                                <SelectItem value="confirmed">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    Confirmed
                                  </div>
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    Cancelled
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-sm">₹</span>
                              <input
                                type="number"
                                value={booking.amount || 0}
                                onChange={(e) => handleAmountChange(booking.id, Number(e.target.value))}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                min="0"
                                step="50"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleViewBooking(booking)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteBooking(booking.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>
                            {bookings.length === 0 
                              ? 'No bookings found' 
                              : 'No bookings match your filters'
                            }
                          </p>
                          <p className="text-sm">
                            {bookings.length === 0 
                              ? 'Create your first booking to get started' 
                              : 'Try adjusting your search or filter options'
                            }
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {hasPermission(userData, 'packages') && (
            <TabsContent value="packages" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Photography Packages</CardTitle>
                    <CardDescription>Manage your photography service packages and pricing</CardDescription>
                  </div>
                  <CreatePackageDialog onPackageCreated={fetchPackages} />
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search packages by name, duration, features, or price..."
                      value={packageSearchTerm}
                      onChange={(e) => setPackageSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={packageStatusFilter} onValueChange={setPackageStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Packages</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={`${packageSortField}-${packageSortDirection}`} onValueChange={(value) => {
                    const [field, direction] = value.split('-') as [keyof Package, 'asc' | 'desc'];
                    setPackageSortField(field);
                    setPackageSortDirection(direction);
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt-desc">Newest First</SelectItem>
                      <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                      <SelectItem value="name-asc">Name A-Z</SelectItem>
                      <SelectItem value="name-desc">Name Z-A</SelectItem>
                      <SelectItem value="price-asc">Price Low-High</SelectItem>
                      <SelectItem value="price-desc">Price High-Low</SelectItem>
                      <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Results Summary */}
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-600">
                    Showing {filteredAndSortedPackages.length} of {packages.length} packages
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedPackages.length > 0 ? (
                    filteredAndSortedPackages.map((pkg) => (
                      <Card key={pkg.id} className="relative">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{pkg.name}</CardTitle>
                              <div className="flex gap-2 mt-2">
                                {pkg.isPopular && (
                                  <Badge className="bg-orange-100 text-orange-800">Popular</Badge>
                                )}
                                <Badge className={pkg.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                  {pkg.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">₹{pkg.price}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                              <Clock className="w-4 h-4 inline mr-1" />
                              {pkg.duration}
                            </p>
                            <p className="text-sm text-gray-600">
                              <Camera className="w-4 h-4 inline mr-1" />
                              {pkg.photoCount}
                            </p>
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-2">Features:</p>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {pkg.features?.map((feature, index) => (
                                  <li key={`${pkg.id}-feature-${index}-${feature.substring(0, 10)}`} className="flex items-center">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <CreatePackageDialog 
                              editPackage={pkg} 
                              isEditing={true} 
                              onPackageCreated={fetchPackages} 
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this package?')) {
                                  try {
                                    await fetch(`/api/packages/${pkg.id}`, { method: 'DELETE' });
                                    await fetchPackages();
                                  } catch (error) {
                                    console.error('Error deleting package:', error);
                                  }
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-gray-500 mb-4">
                        {packages.length === 0 
                          ? 'No packages found' 
                          : 'No packages match your filters'
                        }
                      </p>
                      <p className="text-sm text-gray-400 mb-4">
                        {packages.length === 0 
                          ? 'Create your first package to get started' 
                          : 'Try adjusting your search or filter options'
                        }
                      </p>
                      {packages.length === 0 && (
                        <CreatePackageDialog onPackageCreated={fetchPackages} />
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {hasPermission(userData, 'photos') && (
            <TabsContent value="photos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Photo Requests</CardTitle>
                <CardDescription>Manage FindMyFace photo requests and deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Photos Found</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {photoRequests.length > 0 ? (
                      photoRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.client}</TableCell>
                          <TableCell>{request.event}</TableCell>
                          <TableCell>{request.photos} photos</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No photo requests yet</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {hasPermission(userData, 'contacts') && (
            <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Contact Messages</CardTitle>
                    <CardDescription>Manage messages from contact form submissions</CardDescription>
                  </div>
                  <Badge variant="secondary" className="px-3 py-1">
                    {messages.filter(m => !m.isRead).length} unread
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead className="w-[120px]">Name</TableHead>
                        <TableHead className="w-[200px]">Email</TableHead>
                        <TableHead className="w-[150px]">Subject</TableHead>
                        <TableHead className="w-[250px]">Message</TableHead>
                        <TableHead className="w-[80px] text-center">Status</TableHead>
                        <TableHead className="w-[100px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.length > 0 ? (
                        messages.map((message) => (
                          <TableRow key={message.id} className={!message.isRead ? 'bg-blue-50' : ''}>
                            <TableCell className="text-sm font-medium">
                              {new Date(message.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="truncate" title={message.name}>
                                {message.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <a 
                                href={`mailto:${message.email}`} 
                                className="text-blue-600 hover:underline truncate block" 
                                title={message.email}
                              >
                                {message.email}
                              </a>
                            </TableCell>
                            <TableCell>
                              <div className="truncate" title={message.subject || 'No subject'}>
                                {message.subject || 'No subject'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="truncate" title={message.message}>
                                {message.message}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={message.isRead ? "secondary" : "default"} className="whitespace-nowrap">
                                {message.isRead ? 'Read' : 'Unread'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-center">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    setSelectedMessage(message);
                                    setMessageDialogOpen(true);
                                    // Mark as read
                                    fetch(`/api/contact/${message.id}/read`, { method: 'PATCH' })
                                      .then(() => refreshData())
                                      .catch(console.error);
                                  }}
                                  title="View message"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                  onClick={() => window.location.href = `mailto:${message.email}?subject=Re: ${message.subject || 'Your inquiry'}`}
                                  title="Reply via email"
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No messages received yet</p>
                          <p className="text-sm mt-2">Contact form submissions will appear here</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {hasPermission(userData, 'users') && (
            <TabsContent value="users" className="space-y-6">
              <AdminRoleManagement currentUser={userData} refreshTrigger={refreshTrigger} />
            </TabsContent>
          )}

        </Tabs>
      </div>

      {/* Booking Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Booking Details</DialogTitle>
            <DialogDescription>
              Complete information about this booking request
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6 p-2">
              {/* Header with Status */}
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-xl font-semibold">{selectedBooking.name}</h3>
                  <p className="text-gray-600">{selectedBooking.email}</p>
                </div>
                <Badge className={getStatusColor(selectedBooking.status)} variant="outline">
                  {selectedBooking.status.toUpperCase()}
                </Badge>
              </div>

              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                      <User className="h-5 w-5" />
                      Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm text-gray-600">Name:</span>
                      </div>
                      <span className="font-semibold">{selectedBooking.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm text-gray-600">Email:</span>
                      </div>
                      <span>{selectedBooking.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm text-gray-600">Phone:</span>
                      </div>
                      <span>{selectedBooking.phone || 'Not provided'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                      <Calendar className="h-5 w-5" />
                      Event Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-600">Event Type:</span>
                      <span className="font-semibold">{selectedBooking.eventType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm text-gray-600">Date:</span>
                      </div>
                      <span>{new Date(selectedBooking.eventDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm text-gray-600">Time:</span>
                      </div>
                      <span>{selectedBooking.eventTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm text-gray-600">Location:</span>
                      </div>
                      <span>{selectedBooking.location}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Booking Details */}
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-purple-700">Booking Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block">Duration:</span>
                      <p className="text-lg font-semibold text-gray-800">{selectedBooking.duration}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block">Guest Count:</span>
                      <p className="text-lg font-semibold text-gray-800">{selectedBooking.guestCount || 'Not specified'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block">Package:</span>
                      <p className="text-lg font-semibold text-gray-800">{selectedBooking.packageType || 'Not specified'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block">Amount:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-gray-800">₹</span>
                        <input
                          type="number"
                          value={selectedBooking.amount || 0}
                          onChange={(e) => {
                            const newAmount = Number(e.target.value);
                            setSelectedBooking(prev => prev ? {...prev, amount: newAmount} : null);
                            handleAmountChange(selectedBooking.id, newAmount);
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-lg font-semibold"
                          min="0"
                          step="50"
                        />
                      </div>
                    </div>
                  </div>

                  {selectedBooking.message && (
                    <div className="mt-4">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Client Message:</span>
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                        <p className="text-gray-800 italic">"{selectedBooking.message}"</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t bg-gray-50 p-4 rounded-lg">
                {selectedBooking.status === 'pending' ? (
                  <>
                    <Button 
                      onClick={() => {
                        handleBookingAction(selectedBooking.id, 'confirmed');
                        setViewDialogOpen(false);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 py-3 text-lg font-semibold"
                      size="lg"
                    >
                      ✓ Accept Booking
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        handleBookingAction(selectedBooking.id, 'cancelled');
                        setViewDialogOpen(false);
                      }}
                      className="flex-1 py-3 text-lg font-semibold"
                      size="lg"
                    >
                      ✗ Decline Booking
                    </Button>
                  </>
                ) : (
                  <div className="flex-1 text-center">
                    <p className="text-gray-600 text-lg">
                      This booking has been {selectedBooking.status === 'confirmed' ? 'accepted' : 'declined'}.
                    </p>
                    {selectedBooking.status === 'confirmed' && (
                      <p className="text-green-600 font-semibold mt-2">
                        Amount: ₹{selectedBooking.amount || 0}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Comprehensive Event Details Dialog - Disabled in favor of EventDetailsDialog */}
      <Dialog open={false} onOpenChange={() => setSelectedEventForView(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              Complete Event Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedEventForView && (
            <div className="space-y-6 py-4">
              {/* Basic Event Information */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                    <Info className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Event Title:</span>
                      <p className="text-lg font-semibold text-gray-800 break-words">{selectedEventForView.title}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Event ID:</span>
                      <p className="text-sm font-mono text-gray-700 break-all">{selectedEventForView.id}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Category:</span>
                      <Badge variant="outline" className="text-base">{selectedEventForView.category}</Badge>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Visibility:</span>
                      <Badge className={selectedEventForView.isPrivate ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                        {selectedEventForView.isPrivate ? 'Private Event' : 'Public Event'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Date & Location */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                    <MapPin className="h-5 w-5" />
                    Date & Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm text-gray-600">Event Date:</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-800">
                        {new Date(selectedEventForView.eventDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm text-gray-600">Location:</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-800 break-words">{selectedEventForView.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              {selectedEventForView.description && (
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
                      <FileText className="h-5 w-5" />
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                        {selectedEventForView.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Access & Security */}
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                    <Lock className="h-5 w-5" />
                    Access & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Public PIN:</span>
                      {selectedEventForView.publicPin ? (
                        <p className="text-lg font-mono bg-green-100 text-green-800 px-3 py-2 rounded border">
                          {selectedEventForView.publicPin}
                        </p>
                      ) : (
                        <p className="text-gray-500 italic">Not set</p>
                      )}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Bride & Groom PIN:</span>
                      {selectedEventForView.brideGroomPin ? (
                        <p className="text-lg font-mono bg-pink-100 text-pink-800 px-3 py-2 rounded border">
                          {selectedEventForView.brideGroomPin}
                        </p>
                      ) : (
                        <p className="text-gray-500 italic">Not set</p>
                      )}
                    </div>
                  </div>
                  {selectedEventForView.passcode && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Additional Passcode:</span>
                      <p className="text-lg font-mono bg-blue-100 text-blue-800 px-3 py-2 rounded border break-all">
                        {selectedEventForView.passcode}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Photo & Media Information */}
              <Card className="border-l-4 border-l-indigo-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-indigo-700">
                    <Camera className="h-5 w-5" />
                    Photo & Media
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Photo Count:</span>
                      <p className="text-3xl font-bold text-indigo-600">{selectedEventForView.photoCount || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Thumbnail URL:</span>
                      {selectedEventForView.thumbnailUrl ? (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500 break-all font-mono">{selectedEventForView.thumbnailUrl}</p>
                          <img 
                            src={selectedEventForView.thumbnailUrl} 
                            alt="Event thumbnail" 
                            className="w-full h-20 object-cover rounded border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No thumbnail set</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Creation & Modification Info */}
              <Card className="border-l-4 border-l-gray-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-700">
                    <Clock className="h-5 w-5" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Created At:</span>
                      <p className="text-sm text-gray-800">
                        {new Date(selectedEventForView.createdAt).toLocaleString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Last Updated:</span>
                      <p className="text-sm text-gray-800">
                        {new Date(selectedEventForView.updatedAt).toLocaleString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  {selectedEventForView.createdBy && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="font-medium text-sm text-gray-600 block mb-2">Created By:</span>
                      <p className="text-sm font-mono text-gray-700 break-all">{selectedEventForView.createdBy}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedEventForView(null)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => handleEditEvent(selectedEventForView)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Event
                </Button>
                <Button variant="outline" onClick={() => handleUploadPhotos(selectedEventForView.id)}>
                  <Camera className="h-4 w-4 mr-2" />
                  Upload Photos
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <EventDetailsDialog
        event={selectedEventForView}
        open={eventDetailsOpen}
        onOpenChange={(open) => {
          setEventDetailsOpen(open);
          if (!open) {
            setIsEditingEvent(false);
          }
        }}
        onEventUpdated={refreshData}
        initialEditMode={isEditingEvent}
      />

      {/* Analytics Report */}
      <AnalyticsReport
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
      />

      {/* Message Details Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Message Details</DialogTitle>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Sender Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-600">Name:</span>
                    <span className="font-semibold">{selectedMessage.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-600">Email:</span>
                    <span>{selectedMessage.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-600">Date:</span>
                    <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Message Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedMessage.subject && (
                    <div>
                      <span className="font-medium text-sm text-gray-600 block mb-1">Subject:</span>
                      <p className="font-semibold">{selectedMessage.subject}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-sm text-gray-600 block mb-1">Message:</span>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => window.location.href = `mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject || 'Your inquiry'}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Reply via Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
