
import { useState } from 'react';
import { Menu, X, Camera, User, Settings, LogOut, Shield } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { hasAdminDashboardAccess, getAdminRoleDisplayName } from '@/utils/adminUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import logoImage from '@assets/pinmypic_removed bg_1750753890638.png';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userData, logout, loginWithGoogle } = useAuth();



  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src={logoImage} 
              alt="PinMyPic Logo" 
              className="h-8 w-auto"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 via-orange-500 to-cyan-500 bg-clip-text text-transparent">
              PinMyPic
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`transition-colors font-medium ${
                isActive('/') ? 'text-pink-500' : 'text-gray-700 hover:text-pink-500'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/events" 
              className={`transition-colors font-medium ${
                isActive('/events') ? 'text-pink-500' : 'text-gray-700 hover:text-pink-500'
              }`}
            >
              Events
            </Link>
            <Link 
              to="/findmyface" 
              className={`transition-colors font-medium ${
                isActive('/findmyface') ? 'text-pink-500' : 'text-gray-700 hover:text-pink-500'
              }`}
            >
              FindMyFace
            </Link>
            <Link 
              to="/booking" 
              className={`transition-colors font-medium ${
                isActive('/booking') ? 'text-pink-500' : 'text-gray-700 hover:text-pink-500'
              }`}
            >
              Booking
            </Link>
            <Link 
              to="/contact" 
              className={`transition-colors font-medium ${
                isActive('/contact') ? 'text-pink-500' : 'text-gray-700 hover:text-pink-500'
              }`}
            >
              Contact Us
            </Link>
          </nav>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <Link to="/booking">
                  <Button className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white">
                    Book Now
                  </Button>
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                      {(userData?.customPhotoURL || currentUser.photoURL) ? (
                        <img
                          className="h-8 w-8 rounded-full object-cover"
                          src={(userData?.customPhotoURL || currentUser.photoURL) as string}
                          alt={currentUser.displayName || 'User'}
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = target.nextElementSibling as HTMLElement;
                            target.style.display = 'none';
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm"
                        style={{ display: (userData?.customPhotoURL || currentUser.photoURL) ? 'none' : 'flex' }}
                      >
                        {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : currentUser.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        {currentUser.displayName && (
                          <p className="font-medium">{currentUser.displayName}</p>
                        )}
                        {currentUser.email && (
                          <p className="w-[200px] truncate text-sm text-muted-foreground">
                            {currentUser.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    {hasAdminDashboardAccess(userData) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center">
                            <Shield className="mr-2 h-4 w-4" />
                            Admin Dashboard
                            <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                              {getAdminRoleDisplayName(userData?.adminRole)}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button 
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center space-x-2">
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                    {(userData?.customPhotoURL || currentUser.photoURL) ? (
                      <img
                        className="h-8 w-8 rounded-full object-cover"
                        src={(userData?.customPhotoURL || currentUser.photoURL) as string}
                        alt={currentUser.displayName || 'User'}
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = target.nextElementSibling as HTMLElement;
                          target.style.display = 'none';
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm"
                      style={{ display: (userData?.customPhotoURL || currentUser.photoURL) ? 'none' : 'flex' }}
                    >
                      {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : currentUser.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {currentUser.displayName && (
                        <p className="font-medium">{currentUser.displayName}</p>
                      )}
                      {currentUser.email && (
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {currentUser.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/booking" className="flex items-center">
                      <Camera className="mr-2 h-4 w-4" />
                      Book Now
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {hasAdminDashboardAccess(userData) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={handleGoogleSignIn}
                disabled={loading}
                size="sm"
                className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            )}
            
            <button
              className="p-2 text-gray-600 hover:text-pink-500 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            <div className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className={`transition-colors font-medium ${
                  isActive('/') ? 'text-pink-500' : 'text-gray-700 hover:text-pink-500'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/events" 
                className={`transition-colors font-medium ${
                  isActive('/events') ? 'text-pink-500' : 'text-gray-700 hover:text-pink-500'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Events
              </Link>
              <Link 
                to="/findmyface" 
                className={`transition-colors font-medium ${
                  isActive('/findmyface') ? 'text-pink-500' : 'text-gray-700 hover:text-pink-500'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                FindMyFace
              </Link>
              <Link 
                to="/booking" 
                className={`transition-colors font-medium ${
                  isActive('/booking') ? 'text-pink-500' : 'text-gray-700 hover:text-pink-500'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Booking
              </Link>
              <Link 
                to="/contact" 
                className={`transition-colors font-medium ${
                  isActive('/contact') ? 'text-pink-500' : 'text-gray-700 hover:text-pink-500'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Contact Us
              </Link>
              
              <div className="pt-4 border-t border-gray-200">
                {currentUser ? (
                  <div className="space-y-3">
                    <Link 
                      to="/profile"
                      className="flex items-center gap-2 text-gray-700 hover:text-pink-500 font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    {(userData?.isAdmin || currentUser?.email === 'dond2674@gmail.com') && (
                      <Link 
                        to="/admin"
                        className="flex items-center gap-2 text-gray-700 hover:text-pink-500 font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 text-gray-700 hover:text-red-500 font-medium"
                    >
                      <LogOut className="h-4 w-4" />
                      Log Out
                    </button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => {
                      handleGoogleSignIn();
                      setIsMenuOpen(false);
                    }}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
                  >
                    {loading ? 'Signing In...' : 'Sign In with Google'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
