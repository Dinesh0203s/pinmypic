import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Booking, Event, Package as PackageType } from '@shared/types';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  Camera, 
  Users, 
  IndianRupee, 
  Download,
  FileText,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

interface AnalyticsReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AnalyticsData {
  bookingStats: {
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    revenue: number;
  };
  eventStats: {
    total: number;
    private: number;
    public: number;
    photoCount: number;
  };
  monthlyData: Array<{
    month: string;
    bookings: number;
    revenue: number;
    events: number;
  }>;
  categoryData: Array<{
    name: string;
    count: number;
  }>;
  packageData: Array<{
    name: string;
    bookings: number;
    revenue: number;
  }>;
}

export function AnalyticsReport({ open, onOpenChange }: AnalyticsReportProps) {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (open) {
      fetchAnalyticsData();
    }
  }, [open]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch all required data
      const [bookingsRes, eventsRes, photosRes, packagesRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/events/all'),
        fetch('/api/events'), // Public events
        fetch('/api/packages')
      ]);

      const bookings = await bookingsRes.json();
      const allEvents = await eventsRes.json();
      const photos = [];
      const packages = await packagesRes.json();

      // Calculate booking statistics
      const bookingStats = {
        total: bookings.length,
        confirmed: bookings.filter((b: Booking) => b.status === 'confirmed').length,
        pending: bookings.filter((b: Booking) => b.status === 'pending').length,
        cancelled: bookings.filter((b: Booking) => b.status === 'cancelled').length,
        revenue: bookings
          .filter((b: Booking) => b.status === 'confirmed')
          .reduce((sum: number, b: Booking) => sum + (b.amount || 0), 0)
      };

      // Calculate event statistics
      const eventStats = {
        total: allEvents.length,
        private: allEvents.filter((e: Event) => e.isPrivate).length,
        public: allEvents.filter((e: Event) => !e.isPrivate).length,
        photoCount: allEvents.reduce((sum: number, e: Event) => sum + (e.photoCount || 0), 0)
      };

      // Generate monthly data (last 6 months)
      const monthlyData = generateMonthlyData(bookings, allEvents);

      // Category distribution
      const categoryData = generateCategoryData(bookings);

      // Package performance
      const packageData = generatePackageData(bookings, packages);

      setAnalyticsData({
        bookingStats,
        eventStats,
        monthlyData,
        categoryData,
        packageData
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (bookings: Booking[], events: Event[]) => {
    const months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = format(date, 'MMM yyyy');
      
      const monthBookings = bookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === date.getMonth() && 
               bookingDate.getFullYear() === date.getFullYear();
      });

      const monthEvents = events.filter(e => {
        const eventDate = new Date(e.createdAt);
        return eventDate.getMonth() === date.getMonth() && 
               eventDate.getFullYear() === date.getFullYear();
      });

      months.push({
        month: monthStr,
        bookings: monthBookings.length,
        revenue: monthBookings
          .filter(b => b.status === 'confirmed')
          .reduce((sum, b) => sum + (b.amount || 0), 0),
        events: monthEvents.length
      });
    }
    
    return months;
  };

  const generateCategoryData = (bookings: Booking[]) => {
    const categories: { [key: string]: number } = {};
    
    bookings.forEach(b => {
      const category = b.eventType || 'Other';
      categories[category] = (categories[category] || 0) + 1;
    });

    return Object.entries(categories)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const generatePackageData = (bookings: Booking[], packages: PackageType[]) => {
    const packageStats: { [key: string]: { bookings: number; revenue: number } } = {};
    
    bookings.forEach(b => {
      const pkgName = b.packageType || 'Custom';
      if (!packageStats[pkgName]) {
        packageStats[pkgName] = { bookings: 0, revenue: 0 };
      }
      packageStats[pkgName].bookings += 1;
      if (b.status === 'confirmed') {
        packageStats[pkgName].revenue += (b.amount || 0);
      }
    });

    return Object.entries(packageStats)
      .map(([name, stats]) => ({
        name,
        bookings: stats.bookings,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  const COLORS = ['#ec4899', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  const downloadReport = () => {
    if (!analyticsData) return;

    const reportContent = `
PINMYPIC ANALYTICS REPORT
Generated on: ${new Date().toLocaleString()}

BOOKING STATISTICS
Total Bookings: ${analyticsData.bookingStats.total}
Confirmed: ${analyticsData.bookingStats.confirmed}
Pending: ${analyticsData.bookingStats.pending}
Cancelled: ${analyticsData.bookingStats.cancelled}
Total Revenue: ₹${analyticsData.bookingStats.revenue.toLocaleString()}

EVENT STATISTICS
Total Events: ${analyticsData.eventStats.total}
Private Events: ${analyticsData.eventStats.private}
Public Events: ${analyticsData.eventStats.public}
Total Photos: ${analyticsData.eventStats.photoCount}

MONTHLY PERFORMANCE
${analyticsData.monthlyData.map(m => 
  `${m.month}: ${m.bookings} bookings, ₹${m.revenue.toLocaleString()} revenue`
).join('\n')}

TOP CATEGORIES
${analyticsData.categoryData.map(c => 
  `${c.name}: ${c.count} bookings`
).join('\n')}

PACKAGE PERFORMANCE
${analyticsData.packageData.map(p => 
  `${p.name}: ${p.bookings} bookings, ₹${p.revenue.toLocaleString()} revenue`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Analytics Report
            </span>
            <Button variant="outline" size="sm" onClick={downloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        ) : analyticsData ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Total Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData.bookingStats.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {analyticsData.bookingStats.confirmed} confirmed
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold flex items-center">
                      <IndianRupee className="h-5 w-5" />
                      {analyticsData.bookingStats.revenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      From confirmed bookings
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Total Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData.eventStats.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {analyticsData.eventStats.private} private
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Total Photos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData.eventStats.photoCount}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Across all events
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="bookings" 
                        stroke="#ec4899" 
                        name="Bookings"
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#22c55e" 
                        name="Revenue (₹)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bookings" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Confirmed', value: analyticsData.bookingStats.confirmed },
                            { name: 'Pending', value: analyticsData.bookingStats.pending },
                            { name: 'Cancelled', value: analyticsData.bookingStats.cancelled }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#22c55e" />
                          <Cell fill="#f97316" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Event Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.categoryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#ec4899" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Booking Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Event Privacy Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Public', value: analyticsData.eventStats.public },
                            { name: 'Private', value: analyticsData.eventStats.private }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#22c55e" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Events Created Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="events" stroke="#8b5cf6" name="Events" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${value}`} />
                      <Bar dataKey="revenue" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Package Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.packageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${value}`} />
                      <Bar dataKey="revenue" fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load analytics data</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}