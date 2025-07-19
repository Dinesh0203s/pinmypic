
import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Camera, User, Mail, Phone, MessageSquare, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import useEmblaCarousel from 'embla-carousel-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Package as PackageType } from '@shared/types';

const Booking = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+91',
    eventType: '',
    eventDate: '',
    eventTime: '',
    location: '',
    duration: '',
    guestCount: '',
    packageType: '',
    message: ''
  });
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [loading, setLoading] = useState(false);
  const [emblaRef] = useEmblaCarousel({ align: 'start', loop: false });
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const eventTypes = [
    'Wedding',
    'Corporate Event',
    'Birthday Party',
    'Family Portrait',
    'Baby & Maternity',
    'Graduation',
    'Concert & Show',
    'Other'
  ];

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await fetch('/api/packages');
        if (response.ok) {
          const data = await response.json();
          // Ensure packages have features as arrays and proper price formatting
          const processedPackages = data.map((pkg: PackageType) => ({
            ...pkg,
            features: Array.isArray(pkg.features) ? pkg.features : (typeof pkg.features === 'string' ? JSON.parse(pkg.features || '[]') : []),
            price: typeof pkg.price === 'number' ? pkg.price : parseFloat(pkg.price || '0')
          }));
          setPackages(processedPackages);
        }
      } catch (error) {
        console.error('Error fetching packages:', error);
      }
    };

    fetchPackages();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.displayName || '',
        email: currentUser.email || '',
        countryCode: '+91'
      }));
    }
  }, [currentUser]);

  const handlePackageSelect = (pkg: PackageType) => {
    setSelectedPackage(pkg);
    setFormData(prev => ({
      ...prev,
      packageType: pkg.name,
      duration: pkg.duration
    }));
    // Scroll to form section
    setTimeout(() => {
      document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!currentUser) {
        throw new Error('Please sign in to submit a booking');
      }

      if (!formData.packageType) {
        toast({
          title: "Package Required",
          description: "Please select a photography package before submitting.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get token with fallback for development
      let token;
      try {
        token = await currentUser.getIdToken();
      } catch (error) {
        console.warn('Failed to get Firebase token, using fallback');
        token = 'dev-token';
      }
      
      const bookingData = {
        name: formData.name,
        email: formData.email,
        phone: formData.countryCode + formData.phone,
        eventType: formData.eventType,
        eventDate: formData.eventDate,
        eventTime: formData.eventTime,
        location: formData.location,
        duration: formData.duration,
        packageType: formData.packageType,
        amount: selectedPackage?.price || undefined,
        guestCount: formData.guestCount ? parseInt(formData.guestCount) : undefined,
        message: formData.message
      };
      
      console.log('Submitting booking data:', bookingData);
      
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Booking created successfully:', result);
        toast({
          title: "Booking Submitted!",
          description: "We'll contact you soon to confirm your booking.",
        });
        setFormData({
          name: currentUser?.displayName || '',
          email: currentUser?.email || '',
          phone: '',
          countryCode: '+91',
          eventType: '',
          eventDate: '',
          eventTime: '',
          location: '',
          duration: '',
          guestCount: '',
          packageType: '',
          message: ''
        });
        setSelectedPackage(null);
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.error || 'Failed to submit booking');
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                Book Your Session
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Let's capture your special moments together. Choose your package and schedule your photography session
            </p>
          </div>
        </section>

        {/* Packages Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Photography Packages
              </span>
            </h2>
            
            {/* Sliding Package Cards */}
            <div className="max-w-7xl mx-auto mb-16">
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-6">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="flex-[0_0_90%] sm:flex-[0_0_45%] lg:flex-[0_0_30%] min-w-0">
                      <Card 
                        className={`relative overflow-hidden cursor-pointer transition-all duration-300 h-full ${
                          selectedPackage?.id === pkg.id 
                            ? 'ring-2 ring-pink-500 shadow-2xl scale-105 transform' 
                            : pkg.isPopular 
                              ? 'ring-2 ring-orange-400 shadow-xl' 
                              : 'shadow-lg hover:shadow-xl hover:scale-102'
                        }`}
                        onClick={() => handlePackageSelect(pkg)}
                      >
                        {/* Popular Badge */}
                        {pkg.isPopular && (
                          <div className="absolute -top-1 -right-1 z-10">
                            <div className="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg flex items-center">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Popular
                            </div>
                          </div>
                        )}

                        {/* Selected Badge */}
                        {selectedPackage?.id === pkg.id && (
                          <div className="absolute top-4 left-4 z-10">
                            <div className="bg-green-500 text-white rounded-full p-1">
                              <Check className="w-4 h-4" />
                            </div>
                          </div>
                        )}

                        <CardHeader className="text-center pb-4">
                          <CardTitle className="text-2xl font-bold text-gray-800 mb-2">{pkg.name}</CardTitle>
                          <div className="text-4xl font-bold text-pink-600 mb-1">₹{pkg.price}</div>
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            {pkg.duration}
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mt-1">
                            <Camera className="w-4 h-4" />
                            {pkg.photoCount}
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          <div className="space-y-3 mb-6">
                            {(pkg.features || []).slice(0, 4).map((feature: string, featureIndex: number) => (
                              <div key={`${pkg.id}-feature-${featureIndex}-${feature.substring(0, 10)}`} className="flex items-center text-gray-600 text-sm">
                                <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mr-3 flex-shrink-0"></div>
                                {feature}
                              </div>
                            ))}
                            {(pkg.features || []).length > 4 && (
                              <div className="text-sm text-gray-500 text-center">
                                +{(pkg.features || []).length - 4} more features
                              </div>
                            )}
                          </div>

                          <Button 
                            className={`w-full transition-all duration-300 ${
                              selectedPackage?.id === pkg.id
                                ? 'bg-green-500 hover:bg-green-600'
                                : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'
                            } text-white`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePackageSelect(pkg);
                            }}
                          >
                            {selectedPackage?.id === pkg.id ? (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                Selected
                              </>
                            ) : (
                              'Select Package'
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scroll Indicator */}
              {packages.length > 3 && (
                <div className="text-center mt-6">
                  <p className="text-gray-500 text-sm">← Swipe to see more packages →</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Booking Form */}
        <section id="booking-form" className="py-16 bg-gradient-to-br from-gray-50 to-purple-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="shadow-2xl border-0">
                <CardHeader className="text-center bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="text-3xl font-bold text-gray-800">
                    Book Your Photography Session
                  </CardTitle>
                  <p className="text-gray-600">
                    Fill out the form below and we'll get back to you within 24 hours
                  </p>
                </CardHeader>
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <User className="inline h-4 w-4 mr-1" />
                          Full Name *
                        </label>
                        <Input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Your full name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Mail className="inline h-4 w-4 mr-1" />
                          Email Address *
                        </label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="your@email.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Phone className="inline h-4 w-4 mr-1" />
                          Phone Number *
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={formData.countryCode}
                            onChange={(e) => handleInputChange('countryCode', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white"
                            style={{ minWidth: '180px' }}
                          >
                            <option value="+91">🇮🇳 India (+91)</option>
                            <option value="+1">🇺🇸 United States (+1)</option>
                            <option value="+1">🇨🇦 Canada (+1)</option>
                            <option value="+44">🇬🇧 United Kingdom (+44)</option>
                            <option value="+33">🇫🇷 France (+33)</option>
                            <option value="+49">🇩🇪 Germany (+49)</option>
                            <option value="+39">🇮🇹 Italy (+39)</option>
                            <option value="+34">🇪🇸 Spain (+34)</option>
                            <option value="+31">🇳🇱 Netherlands (+31)</option>
                            <option value="+32">🇧🇪 Belgium (+32)</option>
                            <option value="+41">🇨🇭 Switzerland (+41)</option>
                            <option value="+43">🇦🇹 Austria (+43)</option>
                            <option value="+45">🇩🇰 Denmark (+45)</option>
                            <option value="+46">🇸🇪 Sweden (+46)</option>
                            <option value="+47">🇳🇴 Norway (+47)</option>
                            <option value="+358">🇫🇮 Finland (+358)</option>
                            <option value="+61">🇦🇺 Australia (+61)</option>
                            <option value="+64">🇳🇿 New Zealand (+64)</option>
                            <option value="+81">🇯🇵 Japan (+81)</option>
                            <option value="+82">🇰🇷 South Korea (+82)</option>
                            <option value="+86">🇨🇳 China (+86)</option>
                            <option value="+65">🇸🇬 Singapore (+65)</option>
                            <option value="+852">🇭🇰 Hong Kong (+852)</option>
                            <option value="+853">🇲🇴 Macau (+853)</option>
                            <option value="+886">🇹🇼 Taiwan (+886)</option>
                            <option value="+60">🇲🇾 Malaysia (+60)</option>
                            <option value="+66">🇹🇭 Thailand (+66)</option>
                            <option value="+84">🇻🇳 Vietnam (+84)</option>
                            <option value="+63">🇵🇭 Philippines (+63)</option>
                            <option value="+62">🇮🇩 Indonesia (+62)</option>
                            <option value="+55">🇧🇷 Brazil (+55)</option>
                            <option value="+52">🇲🇽 Mexico (+52)</option>
                            <option value="+54">🇦🇷 Argentina (+54)</option>
                            <option value="+56">🇨🇱 Chile (+56)</option>
                            <option value="+57">🇨🇴 Colombia (+57)</option>
                            <option value="+51">🇵🇪 Peru (+51)</option>
                            <option value="+58">🇻🇪 Venezuela (+58)</option>
                            <option value="+27">🇿🇦 South Africa (+27)</option>
                            <option value="+20">🇪🇬 Egypt (+20)</option>
                            <option value="+971">🇦🇪 United Arab Emirates (+971)</option>
                            <option value="+966">🇸🇦 Saudi Arabia (+966)</option>
                            <option value="+974">🇶🇦 Qatar (+974)</option>
                            <option value="+965">🇰🇼 Kuwait (+965)</option>
                            <option value="+973">🇧🇭 Bahrain (+973)</option>
                            <option value="+968">🇴🇲 Oman (+968)</option>
                            <option value="+961">🇱🇧 Lebanon (+961)</option>
                            <option value="+962">🇯🇴 Jordan (+962)</option>
                            <option value="+90">🇹🇷 Turkey (+90)</option>
                            <option value="+7">🇷🇺 Russia (+7)</option>
                            <option value="+380">🇺🇦 Ukraine (+380)</option>
                            <option value="+48">🇵🇱 Poland (+48)</option>
                            <option value="+420">🇨🇿 Czech Republic (+420)</option>
                            <option value="+421">🇸🇰 Slovakia (+421)</option>
                            <option value="+36">🇭🇺 Hungary (+36)</option>
                            <option value="+40">🇷🇴 Romania (+40)</option>
                            <option value="+359">🇧🇬 Bulgaria (+359)</option>
                            <option value="+385">🇭🇷 Croatia (+385)</option>
                            <option value="+386">🇸🇮 Slovenia (+386)</option>
                            <option value="+372">🇪🇪 Estonia (+372)</option>
                            <option value="+371">🇱🇻 Latvia (+371)</option>
                            <option value="+370">🇱🇹 Lithuania (+370)</option>
                          </select>
                          <Input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="flex-1"
                            placeholder="123-456-7890"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Camera className="inline h-4 w-4 mr-1" />
                          Event Type *
                        </label>
                        <Select value={formData.eventType} onValueChange={(value) => handleInputChange('eventType', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                          <SelectContent>
                            {eventTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          Event Date *
                        </label>
                        <Input
                          type="date"
                          value={formData.eventDate}
                          onChange={(e) => handleInputChange('eventDate', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Clock className="inline h-4 w-4 mr-1" />
                          Event Time *
                        </label>
                        <Input
                          type="time"
                          value={formData.eventTime}
                          onChange={(e) => handleInputChange('eventTime', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration
                        </label>
                        <Select value={formData.duration} onValueChange={(value) => handleInputChange('duration', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2-hours">2 hours</SelectItem>
                            <SelectItem value="4-hours">4 hours</SelectItem>
                            <SelectItem value="6-hours">6 hours</SelectItem>
                            <SelectItem value="8-hours">8+ hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <MapPin className="inline h-4 w-4 mr-1" />
                          Event Location *
                        </label>
                        <Input
                          type="text"
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          placeholder="Event venue or address"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Guest Count (approx.)
                        </label>
                        <Select value={formData.guestCount} onValueChange={(value) => handleInputChange('guestCount', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Number of guests" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-10">1-10 people</SelectItem>
                            <SelectItem value="11-25">11-25 people</SelectItem>
                            <SelectItem value="26-50">26-50 people</SelectItem>
                            <SelectItem value="51-100">51-100 people</SelectItem>
                            <SelectItem value="100+">100+ people</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Package Selection Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Star className="inline h-4 w-4 mr-1" />
                        Selected Package *
                      </label>
                      <Select 
                        value={formData.packageType} 
                        onValueChange={(value) => {
                          handleInputChange('packageType', value);
                          // Update selected package when changed from dropdown
                          const pkg = packages.find(p => p.name === value);
                          if (pkg) {
                            setSelectedPackage(pkg);
                            setFormData(prev => ({
                              ...prev,
                              duration: pkg.duration
                            }));
                          }
                        }}
                        required
                      >
                        <SelectTrigger className={selectedPackage ? "border-green-500" : ""}>
                          <SelectValue placeholder="Select a package above or choose here" />
                        </SelectTrigger>
                        <SelectContent>
                          {packages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.name}>
                              <div className="flex items-center justify-between w-full">
                                <span>{pkg.name}</span>
                                <span className="text-sm text-gray-500 ml-2">₹{pkg.price}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedPackage && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-sm text-green-700 font-medium">
                            ✓ {selectedPackage.name} Package Selected - ₹{selectedPackage.price}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            {selectedPackage.duration} • {selectedPackage.photoCount}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MessageSquare className="inline h-4 w-4 mr-1" />
                        Additional Details
                      </label>
                      <Textarea
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        placeholder="Tell us more about your event, special requests, or any questions you have..."
                        rows={4}
                      />
                    </div>

                    <div className="text-center pt-6">
                      <Button 
                        type="submit"
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-4 text-lg rounded-full shadow-lg"
                      >
                        Submit Booking Request
                      </Button>
                      <p className="text-sm text-gray-500 mt-4">
                        We'll contact you within 24 hours to confirm your booking
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Booking;
