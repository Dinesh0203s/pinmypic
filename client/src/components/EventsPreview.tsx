
import { Calendar, Lock, Users, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  eventDate: string;
  location: string;
  photoCount: number;
  isPrivate: boolean;
  thumbnailUrl?: string;
  category: string;
}

const EventsPreview = () => {
  // Fetch real events from database - only public events for homepage
  const { data: events = [], isLoading, error, isError } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    queryFn: async () => {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
    select: (data) => data
      .filter(event => !event.isPrivate) // Show only public events
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
      .slice(0, 3) // Show only 3 most recent events
  });

  // Show loading state
  if (isLoading) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">
                Recent Events
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Browse through our latest photography events and find your memorable moments
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
                <CardHeader>
                  <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Show error state
  if (isError) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">
                Recent Events
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Unable to load events at the moment. Please try again later.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Show empty state if no events
  if (events.length === 0) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">
                Recent Events
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              No events available at the moment. Check back soon for new photography events!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">
              Recent Events
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Browse through our latest photography events and find your memorable moments
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {events.map((event) => (
            <Card key={event.id} className="group hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
              <div className="relative overflow-hidden">
                <img 
                  src={event.thumbnailUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop'} 
                  alt={event.title}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop';
                  }}
                />
                <div className="absolute top-4 right-4">
                  {event.isPrivate ? (
                    <div className="bg-red-500 text-white px-2 py-1 rounded-full text-sm flex items-center">
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </div>
                  ) : (
                    <div className="bg-green-500 text-white px-2 py-1 rounded-full text-sm">
                      Public
                    </div>
                  )}
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
                    <Users className="h-4 w-4 mr-2" />
                    <span className="text-sm">{event.location}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Camera className="h-4 w-4 mr-2" />
                    <span className="text-sm">{event.photoCount} photos</span>
                  </div>
                </div>
                
                <Link to="/events">
                  <Button 
                    className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
                    onClick={() => {
                      // Store the selected event ID for the Events page to auto-open
                      sessionStorage.setItem('selectedEventId', event.id);
                    }}
                  >
                    View Event
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link to="/events">
            <Button variant="outline" className="border-2 border-pink-200 text-pink-600 hover:bg-pink-50 px-8 py-3 text-lg rounded-full">
              View All Events
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default EventsPreview;
