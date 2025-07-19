
import { Camera, Search, Download, Save, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const FindMyFaceSection = () => {
  const steps = [
    {
      icon: <Camera className="h-8 w-8" />,
      title: "Take a Selfie",
      description: "Use your camera to take a clear selfie for face recognition"
    },
    {
      icon: <Search className="h-8 w-8" />,
      title: "AI Recognition",
      description: "Our AI scans through event photos to find matches"
    },
    {
      icon: <Download className="h-8 w-8" />,
      title: "Download & Save",
      description: "Download your photos or save them to your profile"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-orange-500 to-cyan-500 bg-clip-text text-transparent">
              FindMyFace
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Revolutionary AI-powered face recognition technology that helps you find all your photos from any event instantly
          </p>
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg">
                  {step.icon}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>



        {/* Features */}
        <div className="grid md:grid-cols-2 gap-8 mt-16">
          <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Advanced AI Technology</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-pink-500 rounded-full mr-3"></div>
                Google Cloud Vision API integration
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                High accuracy face matching
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                Real-time photo processing
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-cyan-500 rounded-full mr-3"></div>
                Secure and private recognition
              </li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-cyan-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Easy Photo Management</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center">
                <Save className="w-5 h-5 text-cyan-500 mr-3" />
                Save photos to your profile
              </li>
              <li className="flex items-center">
                <Download className="w-5 h-5 text-cyan-500 mr-3" />
                Download in high resolution
              </li>
              <li className="flex items-center">
                <Search className="w-5 h-5 text-cyan-500 mr-3" />
                Search across multiple events
              </li>
              <li className="flex items-center">
                <Camera className="w-5 h-5 text-cyan-500 mr-3" />
                Access from any device
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FindMyFaceSection;
