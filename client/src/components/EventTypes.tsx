
import { Heart, Users, Building, Baby, Cake, Star, GraduationCap, Music } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EventTypes = () => {
  const eventTypes = [
    {
      icon: <Heart className="h-8 w-8" />,
      title: "Weddings",
      description: "Capturing your special day with romantic elegance and timeless beauty",
      color: "from-pink-500 to-rose-500",
      bgColor: "from-pink-50 to-rose-50"
    },
    {
      icon: <Building className="h-8 w-8" />,
      title: "Corporate Events",
      description: "Professional photography for conferences, galas, and business gatherings",
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-50 to-cyan-50"
    },
    {
      icon: <Cake className="h-8 w-8" />,
      title: "Birthday Parties",
      description: "Joyful celebrations and milestone moments captured with fun and creativity",
      color: "from-yellow-500 to-orange-500",
      bgColor: "from-yellow-50 to-orange-50"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Family Portraits",
      description: "Beautiful family memories preserved with warmth and natural connection",
      color: "from-green-500 to-emerald-500",
      bgColor: "from-green-50 to-emerald-50"
    },
    {
      icon: <Baby className="h-8 w-8" />,
      title: "Baby & Maternity",
      description: "Tender moments and new beginnings captured with gentle care",
      color: "from-purple-500 to-violet-500",
      bgColor: "from-purple-50 to-violet-50"
    },
    {
      icon: <GraduationCap className="h-8 w-8" />,
      title: "Graduations",
      description: "Achievement milestones and proud moments documented beautifully",
      color: "from-indigo-500 to-blue-500",
      bgColor: "from-indigo-50 to-blue-50"
    },
    {
      icon: <Music className="h-8 w-8" />,
      title: "Concerts & Shows",
      description: "Live performances and entertainment events with dynamic energy",
      color: "from-red-500 to-pink-500",
      bgColor: "from-red-50 to-pink-50"
    },
    {
      icon: <Star className="h-8 w-8" />,
      title: "Special Occasions",
      description: "Anniversaries, engagements, and unique celebrations tailored to you",
      color: "from-amber-500 to-yellow-500",
      bgColor: "from-amber-50 to-yellow-50"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-orange-500 to-cyan-500 bg-clip-text text-transparent">
              Event Types
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Specializing in various types of events, each captured with unique style and attention to detail
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {eventTypes.map((eventType, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${eventType.color}`}></div>
              <CardHeader className={`bg-gradient-to-br ${eventType.bgColor} pb-4`}>
                <div className={`w-16 h-16 bg-gradient-to-r ${eventType.color} rounded-2xl flex items-center justify-center text-white mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  {eventType.icon}
                </div>
                <CardTitle className="text-xl font-bold text-gray-800 text-center">
                  {eventType.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-600 text-center leading-relaxed">
                  {eventType.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventTypes;
