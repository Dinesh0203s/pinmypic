
import { Camera, Search, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/hero-background.jpg)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-pink-900/70 via-orange-900/60 to-yellow-900/70"></div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-pink-400 to-orange-400 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-to-br from-yellow-400 to-cyan-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-gradient-to-br from-cyan-400 to-pink-400 rounded-full opacity-15 animate-pulse delay-500"></div>

      <div className="container mx-auto px-4 text-center relative z-10 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-pink-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent">
              Capture
            </span>
            <br />
            <span className="bg-gradient-to-r from-yellow-300 via-orange-300 to-cyan-300 bg-clip-text text-transparent">
              Every Moment
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Professional photography services with AI-powered face recognition. 
            Find yourself in any event instantly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/findmyface">
              <Button className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white px-8 py-3 text-lg rounded-full shadow-lg hover:shadow-xl transition-all">
                <Search className="mr-2 h-5 w-5" />
                Find My Photos
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="outline" className="border-2 border-white/60 text-white hover:bg-transparent hover:border-white/80 bg-transparent px-8 py-3 text-lg rounded-full">
                <Calendar className="mr-2 h-5 w-5" />
                View Events
              </Button>
            </Link>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-white/20">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Professional Photography</h3>
              <p className="text-white/80">High-quality event photography with professional equipment and expertise.</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-white/20">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Search className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Face Recognition</h3>
              <p className="text-white/80">Find yourself in thousands of photos using our advanced AI technology.</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-white/20">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Download className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Instant Download</h3>
              <p className="text-white/80">Download your favorite photos instantly in high resolution.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
