
import { useState } from 'react';
import { Camera, Heart, Users, Building, Baby, Cake, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const PhotographyShowcase = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const showcaseImages = [
    {
      url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop",
      title: "Wedding Bliss",
      description: "Capturing eternal love moments"
    },
    {
      url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop",
      title: "Corporate Excellence",
      description: "Professional event photography"
    },
    {
      url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&h=600&fit=crop",
      title: "Birthday Joy",
      description: "Celebrating life's special moments"
    },
    {
      url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&h=600&fit=crop",
      title: "Family Memories",
      description: "Precious family gatherings"
    },
    {
      url: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&h=600&fit=crop",
      title: "Nature's Beauty",
      description: "Capturing wildlife in their natural habitat"
    },
    {
      url: "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=800&h=600&fit=crop",
      title: "Mountain Majesty",
      description: "Breathtaking landscape photography"
    },
    {
      url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&h=600&fit=crop",
      title: "Forest Serenity",
      description: "Peaceful pine forest captures"
    },
    {
      url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop",
      title: "Golden Hour Magic",
      description: "Nature's dramatic lighting moments"
    }
  ];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % showcaseImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + showcaseImages.length) % showcaseImages.length);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-pink-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">
              My Photography
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Capturing life's most precious moments with artistic vision and professional expertise
          </p>
        </div>

        {/* Main Showcase */}
        <div className="relative max-w-4xl mx-auto mb-16">
          <div className="relative overflow-hidden rounded-2xl shadow-2xl">
            <img 
              src={showcaseImages[currentImageIndex].url}
              alt={showcaseImages[currentImageIndex].title}
              className="w-full h-96 md:h-[500px] object-cover transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-8 left-8 text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-2">
                {showcaseImages[currentImageIndex].title}
              </h3>
              <p className="text-lg opacity-90">
                {showcaseImages[currentImageIndex].description}
              </p>
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white border-0 shadow-lg"
            onClick={prevImage}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white border-0 shadow-lg"
            onClick={nextImage}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* Dots Indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {showcaseImages.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentImageIndex 
                    ? 'bg-pink-500 scale-125' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PhotographyShowcase;
