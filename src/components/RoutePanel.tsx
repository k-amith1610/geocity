'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Navigation, 
  ChevronLeft, 
  Car, 
  User as WalkingIcon, 
  Bike, 
  Route,
  MapPin,
  Clock,
  Crosshair
} from 'lucide-react';
import { useToast } from './Toast';
import CustomLocationIcon from './CustomLocationIcon';

interface RoutePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onGetDirections?: (origin: string, destination: string, mode: string) => void;
  mapInstance?: google.maps.Map | null;
  directionsRenderer?: google.maps.DirectionsRenderer | null;
}

interface TravelMode {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  googleMode: string;
}

interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface RouteInfo {
  distance: string;
  duration: string;
  durationValue: number;
}

export default function RoutePanel({ isOpen, onToggle, onGetDirections, mapInstance, directionsRenderer }: RoutePanelProps) {
  const [travelMode, setTravelMode] = useState('bicycling');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [travelModes, setTravelModes] = useState<TravelMode[]>([]);
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);
  
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  
  const { showSuccess, showError, showInfo } = useToast();

  // Check if Google Maps API is fully loaded
  const checkGoogleMapsReady = useCallback(() => {
    return typeof google !== 'undefined' && 
           google.maps && 
           google.maps.DirectionsService && 
           google.maps.places &&
           google.maps.places.AutocompleteService &&
           google.maps.Geocoder;
  }, []);

  // Initialize travel modes immediately
  useEffect(() => {
    setTravelModes([
      { id: 'driving', label: 'Driving', icon: Car, googleMode: 'DRIVING' },
      { id: 'walking', label: 'Walking', icon: WalkingIcon, googleMode: 'WALKING' },
      { id: 'bicycling', label: 'Bicycling', icon: Bike, googleMode: 'BICYCLING' }
    ]);
  }, []);

  // Initialize Google Maps services when API is fully loaded
  useEffect(() => {
    const initializeGoogleMaps = () => {
      if (checkGoogleMapsReady()) {
        try {
          directionsServiceRef.current = new google.maps.DirectionsService();
          setIsGoogleMapsReady(true);
        } catch (error) {
          console.error('Error initializing Google Maps services:', error);
          showError('Google Maps Error', 'Failed to initialize mapping services.');
        }
      }
    };

    // Check immediately
    initializeGoogleMaps();

    // If not ready, check periodically
    if (!isGoogleMapsReady) {
      const interval = setInterval(() => {
        if (checkGoogleMapsReady()) {
          initializeGoogleMaps();
          clearInterval(interval);
        }
      }, 100);

      // Cleanup interval after 10 seconds
      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (!isGoogleMapsReady) {
          showError('Google Maps Error', 'Failed to load Google Maps services.');
        }
      }, 10000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [checkGoogleMapsReady, isGoogleMapsReady, showError]);

  // Calculate route when travel mode changes and both inputs are filled
  useEffect(() => {
    // Remove automatic route calculation - only calculate when user clicks "Get Directions"
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      showError('Geolocation Not Supported', 'Your browser does not support geolocation.');
      return;
    }

    if (!isGoogleMapsReady) {
      showError('Google Maps Not Ready', 'Please wait for Google Maps to load.');
      return;
    }

    setIsGettingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        // Suppress console warnings for CoreLocation errors
        const originalConsoleWarn = console.warn;
        console.warn = (...args) => {
          if (args[0] && typeof args[0] === 'string' && args[0].includes('CoreLocation')) {
            return; // Suppress CoreLocation warnings
          }
          originalConsoleWarn.apply(console, args);
        };

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.warn = originalConsoleWarn; // Restore console.warn
            resolve(pos);
          },
          (error) => {
            console.warn = originalConsoleWarn; // Restore console.warn
            reject(error);
          },
          {
            enableHighAccuracy: false, // Better compatibility
            timeout: 25000, // Increased timeout
            maximumAge: 300000 // 5 minutes cache
          }
        );
      });

      const { latitude, longitude } = position.coords;
      
      // Reverse geocode to get address
      if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
        
        if (result.results[0]) {
          const address = result.results[0].formatted_address;
          setOrigin(address);
          setShowOriginSuggestions(false);
          showSuccess('Location Found', 'Your current location has been set as the starting point.');
        } else {
          showError('Location Error', 'Could not get address for your location. Please enter manually.');
        }
      }
    } catch (error: any) {
      // Handle specific geolocation errors
      let errorMessage = 'Unable to get your current location. Please enter manually.';
      
      if (error.code) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again or enter manually.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or enter manually.';
            break;
          default:
            errorMessage = 'Unable to get your current location. Please enter manually.';
        }
      } else if (error.message && (error.message.includes('CoreLocation') || error.message.includes('kCLErrorLocationUnknown'))) {
        // Handle CoreLocation specific errors
        errorMessage = 'Location service temporarily unavailable. Please try again or enter manually.';
      }
      
      showError('Location Error', errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  }, [showSuccess, showError, isGoogleMapsReady]);

  // Handle origin input changes
  const handleOriginChange = useCallback((value: string) => {
    setOrigin(value);
    setShowOriginSuggestions(value.length > 2);
    
    // Clear route info when user starts typing
    if (routeInfo) {
      setRouteInfo(null);
    }
    
    if (value.length > 2 && isGoogleMapsReady && typeof google !== 'undefined' && google.maps && google.maps.places && google.maps.places.AutocompleteService) {
      try {
        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          {
            input: value,
            types: ['geocode', 'establishment']
          },
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              setOriginSuggestions(predictions.slice(0, 5));
            } else {
              setOriginSuggestions([]);
            }
          }
        );
      } catch (error) {
        console.error('Error getting origin suggestions:', error);
        setOriginSuggestions([]);
      }
    } else {
      setOriginSuggestions([]);
    }
  }, [isGoogleMapsReady, routeInfo]);

  // Handle destination input changes
  const handleDestinationChange = useCallback((value: string) => {
    setDestination(value);
    setShowDestinationSuggestions(value.length > 2);
    
    // Clear route info when user starts typing
    if (routeInfo) {
      setRouteInfo(null);
    }
    
    if (value.length > 2 && isGoogleMapsReady && typeof google !== 'undefined' && google.maps && google.maps.places && google.maps.places.AutocompleteService) {
      try {
        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          {
            input: value,
            types: ['geocode', 'establishment']
          },
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              setDestinationSuggestions(predictions.slice(0, 5));
            } else {
              setDestinationSuggestions([]);
            }
          }
        );
      } catch (error) {
        console.error('Error getting destination suggestions:', error);
        setDestinationSuggestions([]);
      }
    } else {
      setDestinationSuggestions([]);
    }
  }, [isGoogleMapsReady, routeInfo]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: PlaceSuggestion, type: 'origin' | 'destination') => {
    const value = suggestion.description;
    if (type === 'origin') {
      setOrigin(value);
      setShowOriginSuggestions(false);
      setOriginSuggestions([]);
    } else {
      setDestination(value);
      setShowDestinationSuggestions(false);
      setDestinationSuggestions([]);
    }
    
    // Clear route info when user selects new location
    if (routeInfo) {
      setRouteInfo(null);
    }
  }, [routeInfo]);

  // Geocode address to get coordinates
  const geocodeAddress = useCallback(async (address: string): Promise<google.maps.LatLng | null> => {
    if (!isGoogleMapsReady || !google.maps || !google.maps.Geocoder) {
      return null;
    }

    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address });
      
      if (result.results && result.results.length > 0) {
        return result.results[0].geometry.location;
      }
      return null;
    } catch (error: any) {
      // Handle geocoding errors silently - return null to let the calling function handle it
      console.warn('Geocoding error for address:', address, error);
      return null;
    }
  }, [isGoogleMapsReady]);

  // Calculate route - only called when user clicks "Get Directions"
  const calculateRoute = useCallback(async () => {
    if (!origin || !destination || !isGoogleMapsReady || !directionsServiceRef.current || !directionsRenderer) {
      return;
    }

    setIsLoadingRoute(true);
    setRouteInfo(null);

    try {
      const selectedMode = travelModes.find(mode => mode.id === travelMode);
      if (!selectedMode) return;

      // Convert string to Google Maps TravelMode enum
      let googleTravelMode: google.maps.TravelMode;
      switch (selectedMode.googleMode) {
        case 'DRIVING':
          googleTravelMode = google.maps.TravelMode.DRIVING;
          break;
        case 'WALKING':
          googleTravelMode = google.maps.TravelMode.WALKING;
          break;
        case 'BICYCLING':
          googleTravelMode = google.maps.TravelMode.BICYCLING;
          break;
        default:
          googleTravelMode = google.maps.TravelMode.DRIVING;
      }

      // Try to geocode addresses first to ensure they're valid
      const originCoords = await geocodeAddress(origin);
      const destinationCoords = await geocodeAddress(destination);

      if (!originCoords || !destinationCoords) {
        showError('Invalid Address', 'One or both addresses could not be found. Please check your input.');
        return;
      }

      // Use a promise-based approach to handle Google Maps errors properly
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsServiceRef.current!.route({
          origin: originCoords,
          destination: destinationCoords,
          travelMode: googleTravelMode
        }, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            resolve(result);
          } else {
            reject({ status, result });
          }
        });
      });

      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        const leg = route.legs[0];
        
        setRouteInfo({
          distance: leg.distance?.text || '',
          duration: leg.duration?.text || '',
          durationValue: leg.duration?.value || 0
        });

        // Display route on map using the shared directions renderer
        directionsRenderer.setDirections(result);

        if (onGetDirections) {
          onGetDirections(origin, destination, travelMode);
        }

        showSuccess('Route Found', `Route calculated: ${leg.distance?.text} in ${leg.duration?.text}`);
      } else {
        showError('No Route Found', 'No route could be found between these locations.');
      }
    } catch (error: any) {
      // Handle specific Google Maps errors
      let errorMessage = 'Unable to calculate route. Please check your input.';
      
      if (error && error.status && typeof google !== 'undefined' && google.maps && google.maps.DirectionsStatus) {
        // Check for Google Maps specific error status
        if (error.status === google.maps.DirectionsStatus.ZERO_RESULTS) {
          errorMessage = 'No route could be found between these locations. Try different addresses or travel mode.';
        } else if (error.status === google.maps.DirectionsStatus.NOT_FOUND) {
          errorMessage = 'One or both addresses could not be found. Please check your input.';
        } else if (error.status === google.maps.DirectionsStatus.OVER_QUERY_LIMIT) {
          errorMessage = 'Too many requests. Please try again later.';
        } else if (error.status === google.maps.DirectionsStatus.REQUEST_DENIED) {
          errorMessage = 'Request denied. Please check your Google Maps API key.';
        } else if (error.status === google.maps.DirectionsStatus.UNKNOWN_ERROR) {
          errorMessage = 'An unknown error occurred. Please try again.';
        }
      }
      
      showError('Route Error', errorMessage);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [origin, destination, travelMode, onGetDirections, showError, travelModes, isGoogleMapsReady, directionsRenderer, geocodeAddress, showSuccess]);

  // Handle travel mode change - no automatic route calculation
  const handleTravelModeChange = useCallback((mode: string) => {
    setTravelMode(mode);
    // Clear route info when travel mode changes
    if (routeInfo) {
      setRouteInfo(null);
    }
    showInfo('Travel Mode Changed', `Travel mode set to ${mode}. Click "Get Directions" to calculate route.`);
  }, [showInfo, routeInfo]);

  return (
    <>
      {/* Main Route Panel */}
      <div className={`absolute top-16 sm:top-20 left-2 sm:left-6 z-10 transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}>
        <div className="bg-white/98 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-2xl border border-[var(--color-border)]/40 w-80 sm:w-96 lg:w-[420px] p-4 sm:p-6">
          {/* Panel Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                <Route className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-black">Plan Your Route</h2>
            </div>
            <button 
              onClick={onToggle}
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-200 transform hover:scale-110 cursor-pointer ${
                isOpen 
                  ? 'bg-[var(--color-accent)] text-white' 
                  : 'bg-white border border-[var(--color-border)] text-[var(--color-accent)] hover:border-[var(--color-accent)]'
              }`}
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200" />
            </button>
          </div>

          {/* From Input */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-sm font-medium text-black mb-1 sm:mb-2">From</label>
            <div className="relative">
              <input
                ref={originInputRef}
                type="text"
                value={origin}
                onChange={(e) => handleOriginChange(e.target.value)}
                placeholder="Enter starting point"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-12 bg-white border border-[var(--color-border)] rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 text-sm text-black placeholder-gray-500"
              />
              <button
                onClick={getCurrentLocation}
                disabled={isGettingLocation || !isGoogleMapsReady}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-gray-200"
                title="Use current location"
              >
                <CustomLocationIcon className={`w-4 h-4 text-[var(--color-accent)] ${isGettingLocation ? 'animate-spin' : ''}`} />
              </button>
              
              {/* Origin Suggestions Dropdown */}
              {showOriginSuggestions && originSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto autocomplete-dropdown">
                  {originSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      onClick={() => handleSuggestionSelect(suggestion, 'origin')}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors duration-150 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-black truncate">
                            {suggestion.structured_formatting.main_text}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {suggestion.structured_formatting.secondary_text}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Destination Input */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-black mb-1 sm:mb-2">To</label>
            <div className="relative">
              <input
                ref={destinationInputRef}
                type="text"
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                placeholder="Enter destination"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-[var(--color-border)] rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 text-sm text-black placeholder-gray-500"
              />
              
              {/* Destination Suggestions Dropdown */}
              {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto autocomplete-dropdown">
                  {destinationSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      onClick={() => handleSuggestionSelect(suggestion, 'destination')}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors duration-150 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-black truncate">
                            {suggestion.structured_formatting.main_text}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {suggestion.structured_formatting.secondary_text}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Travel Mode Selection */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-black mb-2 sm:mb-3">Travel Mode</label>
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {travelModes.map((mode) => {
                const IconComponent = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => handleTravelModeChange(mode.id)}
                    className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-all duration-200 transform hover:scale-105 cursor-pointer ${
                      travelMode === mode.id
                        ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-md'
                        : 'bg-white border-[var(--color-border)] text-black hover:border-[var(--color-primary)]'
                    }`}
                  >
                    <div className="text-center">
                      <div className="flex justify-center mb-1">
                        <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="text-xs font-medium">{mode.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Route Information */}
          {routeInfo && (
            <div className="mb-4 sm:mb-6 p-3 bg-gray-50 rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Navigation className="w-4 h-4 text-[var(--color-accent)]" />
                  <span className="font-medium text-black">{routeInfo.distance}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[var(--color-accent)]" />
                  <span className="font-medium text-black">{routeInfo.duration}</span>
                </div>
              </div>
            </div>
          )}

          {/* Get Directions Button */}
          <button 
            onClick={calculateRoute}
            disabled={!origin || !destination || isLoadingRoute || !isGoogleMapsReady || !directionsRenderer}
            className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] hover:from-[var(--color-primary-dark)] hover:to-[#1A202C] disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
          >
            {isLoadingRoute ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span>{isLoadingRoute ? 'Calculating Route...' : 'Get Directions'}</span>
          </button>
        </div>
      </div>

      {/* Toggle Button for Route Panel */}
      {!isOpen && (
        <button 
          onClick={onToggle}
          className="absolute top-16 sm:top-20 left-2 sm:left-6 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/98 backdrop-blur-md rounded-lg sm:rounded-xl shadow-lg border border-[var(--color-border)]/40 flex items-center justify-center transition-all duration-200 transform hover:scale-110 cursor-pointer"
        >
          <Route className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
        </button>
      )}
    </>
  );
} 