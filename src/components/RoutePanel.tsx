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
  onDirectionsRequested?: (origin: string, destination: string) => void;
  onNavigationReady?: (routeInfo: {
    distance: string;
    duration: string;
    durationValue: number;
    origin: string;
    destination: string;
    travelMode: string;
  }) => void;
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
  trafficCondition?: 'normal' | 'medium' | 'heavy';
  trafficDelay?: number; // delay in minutes
}

export default function RoutePanel({ isOpen, onToggle, onGetDirections, onDirectionsRequested, onNavigationReady, mapInstance, directionsRenderer }: RoutePanelProps) {
  const [travelMode, setTravelMode] = useState('driving');
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
    const isReady = typeof google !== 'undefined' && 
           google.maps && 
           google.maps.DirectionsService && 
           google.maps.places &&
           google.maps.places.AutocompleteService &&
           google.maps.Geocoder;
    
    console.log('Google Maps ready check:', {
      google: typeof google !== 'undefined',
      maps: typeof google !== 'undefined' && !!google.maps,
      directionsService: typeof google !== 'undefined' && google.maps && !!google.maps.DirectionsService,
      places: typeof google !== 'undefined' && google.maps && !!google.maps.places,
      autocompleteService: typeof google !== 'undefined' && google.maps && google.maps.places && !!google.maps.places.AutocompleteService,
      geocoder: typeof google !== 'undefined' && google.maps && !!google.maps.Geocoder,
      isReady
    });
    
    return isReady;
  }, []);

  // Initialize travel modes immediately
  useEffect(() => {
    setTravelModes([
      { id: 'driving', label: 'Driving', icon: Car, googleMode: 'DRIVING' },
      { id: 'walking', label: 'Walking', icon: WalkingIcon, googleMode: 'WALKING' }
    ]);
  }, []);

  // Initialize Google Maps services when API is fully loaded
  useEffect(() => {
    const initializeGoogleMaps = () => {
      console.log('Initializing Google Maps services...');
      if (checkGoogleMapsReady()) {
        try {
          console.log('Creating DirectionsService...');
          directionsServiceRef.current = new google.maps.DirectionsService();
          console.log('DirectionsService created successfully');
          setIsGoogleMapsReady(true);
          console.log('Google Maps ready state set to true');
        } catch (error) {
          console.error('Error initializing Google Maps services:', error);
          showError('Google Maps Error', 'Failed to initialize mapping services.');
        }
      } else {
        console.log('Google Maps not ready yet, will retry...');
      }
    };

    // Check immediately
    initializeGoogleMaps();

    // If not ready, check periodically
    if (!isGoogleMapsReady) {
      console.log('Setting up periodic Google Maps ready check...');
      const interval = setInterval(() => {
        if (checkGoogleMapsReady()) {
          console.log('Google Maps became ready, initializing...');
          initializeGoogleMaps();
          clearInterval(interval);
        }
      }, 100);

      // Cleanup interval after 10 seconds
      const timeout = setTimeout(() => {
        console.log('Google Maps ready check timeout reached');
        clearInterval(interval);
        if (!isGoogleMapsReady) {
          showError('Google Maps Error', 'Failed to load Google Maps services.');
        }
      }, 10000);

      return () => {
        console.log('Cleaning up Google Maps initialization...');
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [checkGoogleMapsReady, isGoogleMapsReady, showError]);

  // Calculate route when travel mode changes and both inputs are filled
  useEffect(() => {
    // Remove automatic route calculation - only calculate when user clicks "Get Directions"
  }, []);

  // Check location permissions
  const checkLocationPermissions = useCallback(async () => {
    if (!navigator.permissions) {
      console.log('Permissions API not supported');
      return 'unknown';
    }
    
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      console.log('Location permission status:', permission.state);
      return permission.state;
    } catch (error) {
      console.log('Error checking location permissions:', error);
      return 'unknown';
    }
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    console.log('getCurrentLocation called');
    
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      showError('Geolocation Not Supported', 'Your browser does not support geolocation.');
      return;
    }

    if (!isGoogleMapsReady) {
      console.error('Google Maps not ready');
      showError('Google Maps Not Ready', 'Please wait for Google Maps to load.');
      return;
    }

    // Check permissions first
    const permissionStatus = await checkLocationPermissions();
    console.log('Permission status:', permissionStatus);
    
    if (permissionStatus === 'denied') {
      showError('Location Access Denied', 'Please allow location access in your browser settings to use this feature.');
      return;
    }

    console.log('Starting location request...');
    setIsGettingLocation(true);
    
    try {
      console.log('Requesting current location...');
      
      // Suppress CoreLocation warnings globally
      const originalConsoleWarn = console.warn;
      console.warn = (...args) => {
        if (args[0] && typeof args[0] === 'string' && 
            (args[0].includes('CoreLocation') || args[0].includes('kCLErrorLocationUnknown'))) {
          return; // Suppress CoreLocation warnings
        }
        originalConsoleWarn.apply(console, args);
      };

      // Enhanced location request with multiple fallback strategies
      const getLocationWithFallbacks = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 3;
          
          const tryGetLocation = (highAccuracy: boolean, timeout: number, maxAge: number) => {
            attempts++;
            console.log(`Location attempt ${attempts}/${maxAttempts} - High accuracy: ${highAccuracy}, Timeout: ${timeout}s`);
            
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                console.log(`Location obtained successfully (attempt ${attempts}):`, pos.coords);
                console.warn = originalConsoleWarn;
                resolve(pos);
              },
              (error) => {
                console.log(`Location attempt ${attempts} failed:`, error);
                console.warn = originalConsoleWarn;
                
                // Handle specific error types
                if (error.code === error.POSITION_UNAVAILABLE) {
                  console.log('Position unavailable - trying different strategy...');
                  
                  if (attempts < maxAttempts) {
                    // Try with different settings
                    if (highAccuracy) {
                      // If high accuracy failed, try low accuracy
                      setTimeout(() => tryGetLocation(false, 30000, 600000), 1000);
                    } else {
                      // If low accuracy failed, try with longer timeout
                      setTimeout(() => tryGetLocation(false, 60000, 1200000), 2000);
                    }
                  } else {
                    reject(error);
                  }
                } else if (error.code === error.TIMEOUT) {
                  console.log('Location timeout - trying with longer timeout...');
                  
                  if (attempts < maxAttempts) {
                    setTimeout(() => tryGetLocation(highAccuracy, timeout * 2, maxAge), 1000);
                  } else {
                    reject(error);
                  }
                } else if (error.code === error.PERMISSION_DENIED) {
                  // Permission denied - can't recover
                  reject(error);
                } else {
                  // Other errors - try again with different settings
                  if (attempts < maxAttempts) {
                    setTimeout(() => tryGetLocation(false, 30000, 600000), 1000);
                  } else {
                    reject(error);
                  }
                }
              },
              {
                enableHighAccuracy: highAccuracy,
                timeout: timeout,
                maximumAge: maxAge
              }
            );
          };
          
          // Start with high accuracy, short timeout
          tryGetLocation(true, 10000, 300000);
        });
      };

      const position = await getLocationWithFallbacks();

      console.log('Processing location data...');
      const { latitude, longitude } = position.coords;
      console.log('Coordinates:', { latitude, longitude });
      
      // Reverse geocode to get address
      if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
        try {
          console.log('Attempting to geocode coordinates...');
          const geocoder = new google.maps.Geocoder();
          const result = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
          
          if (result.results && result.results.length > 0) {
            const address = result.results[0].formatted_address;
            console.log('Geocoded address:', address);
            setOrigin(address);
            setShowOriginSuggestions(false);
            showSuccess('Location Found', 'Your current location has been set as the starting point.');
          } else {
            // If geocoding fails, use coordinates as fallback
            const coordAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            console.log('Using coordinates as fallback:', coordAddress);
            setOrigin(coordAddress);
            setShowOriginSuggestions(false);
            showSuccess('Location Found', 'Your current coordinates have been set as the starting point.');
          }
        } catch (geocodeError) {
          console.log('Geocoding failed, using coordinates:', geocodeError);
          // If geocoding fails, use coordinates as fallback
          const coordAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setOrigin(coordAddress);
          setShowOriginSuggestions(false);
          showSuccess('Location Found', 'Your current coordinates have been set as the starting point.');
        }
      } else {
        console.log('Google Maps not available, using coordinates');
        // If Google Maps is not available, use coordinates
        const coordAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setOrigin(coordAddress);
        setShowOriginSuggestions(false);
        showSuccess('Location Found', 'Your current coordinates have been set as the starting point.');
      }
    } catch (error: any) {
      console.error('Location error:', error);
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
      console.log('Location request completed');
      setIsGettingLocation(false);
    }
  }, [showSuccess, showError, isGoogleMapsReady, checkLocationPermissions]);

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

  // Update route colors based on traffic conditions
  const updateRouteColors = useCallback((result: google.maps.DirectionsResult, directionsRenderer: google.maps.DirectionsRenderer) => {
    if (!result.routes || result.routes.length === 0) return;

    const route = result.routes[0];
    const leg = route.legs[0];
    
    // Check for traffic information in the route
    let hasTraffic = false;
    let trafficLevel = 'normal'; // normal, medium, heavy
    
    // Check if there are any traffic warnings or delays
    if (leg.duration_in_traffic && leg.duration) {
      const trafficDelay = leg.duration_in_traffic.value - leg.duration.value;
      const delayMinutes = trafficDelay / 60;
      
      if (delayMinutes > 10) {
        trafficLevel = 'heavy';
        hasTraffic = true;
      } else if (delayMinutes > 5) {
        trafficLevel = 'medium';
        hasTraffic = true;
      }
    }

    // Update polyline colors based on traffic
    let strokeColor = '#4285F4'; // Default Google Maps blue
    
    if (hasTraffic) {
      switch (trafficLevel) {
        case 'heavy':
          strokeColor = '#EA4335'; // Google Maps red for heavy traffic
          break;
        case 'medium':
          strokeColor = '#FBBC04'; // Google Maps yellow for medium traffic
          break;
        default:
          strokeColor = '#4285F4'; // Google Maps blue for normal traffic
      }
    }

    // Update the directions renderer with new colors
    directionsRenderer.setOptions({
      polylineOptions: {
        strokeColor,
        strokeWeight: 5,
        strokeOpacity: 0.8,
        zIndex: 1
      }
    });

    // Re-render the route with new colors
    directionsRenderer.setDirections(result);
  }, []);

  // Calculate route - only called when user clicks "Get Directions"
  const calculateRoute = useCallback(async () => {
    if (!origin || !destination || !isGoogleMapsReady || !directionsServiceRef.current || !directionsRenderer) {
      return;
    }

    // Call the callback to notify parent that directions were requested
    if (onDirectionsRequested) {
      onDirectionsRequested(origin, destination);
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
        const request: google.maps.DirectionsRequest = {
          origin: originCoords,
          destination: destinationCoords,
          travelMode: googleTravelMode
        };

        // Add traffic-aware routing for driving mode
        if (googleTravelMode === google.maps.TravelMode.DRIVING) {
          request.drivingOptions = {
            departureTime: new Date(),
            trafficModel: google.maps.TrafficModel.BEST_GUESS
          };
        }

        directionsServiceRef.current!.route(request, (result, status) => {
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
        
        // Calculate traffic conditions
        let trafficLevel: 'normal' | 'medium' | 'heavy' = 'normal';
        let hasTraffic = false;
        
        if (leg.duration_in_traffic && leg.duration) {
          const trafficDelay = leg.duration_in_traffic.value - leg.duration.value;
          const delayMinutes = trafficDelay / 60;
          
          if (delayMinutes > 10) {
            trafficLevel = 'heavy';
            hasTraffic = true;
          } else if (delayMinutes > 5) {
            trafficLevel = 'medium';
            hasTraffic = true;
          }
        }
        
        setRouteInfo({
          distance: leg.distance?.text || '',
          duration: leg.duration?.text || '',
          durationValue: leg.duration?.value || 0,
          trafficCondition: trafficLevel,
          trafficDelay: hasTraffic ? Math.round((leg.duration_in_traffic?.value || 0) - (leg.duration?.value || 0)) / 60 : 0
        });

        // Display route on map using the shared directions renderer
        directionsRenderer.setDirections(result);

        // Update route colors based on traffic conditions
        updateRouteColors(result, directionsRenderer);

        // Zoom to fit the entire route when first calculated
        if (mapInstance) {
          // Create bounds to fit the entire route
          const bounds = new google.maps.LatLngBounds();
          
          // Add all waypoints to bounds
          route.legs.forEach(leg => {
            bounds.extend(leg.start_location);
            bounds.extend(leg.end_location);
            
            // Add intermediate steps to bounds for better fit
            if (leg.steps) {
              leg.steps.forEach(step => {
                bounds.extend(step.start_location);
                bounds.extend(step.end_location);
              });
            }
          });
          
          // Fit map to bounds with padding after a small delay for smooth transition
          setTimeout(() => {
            mapInstance.fitBounds(bounds, {
              top: 100,    // Account for header
              right: 50,
              bottom: 200, // Account for navigation bar
              left: 50
            });
            
            // After fitting bounds, zoom in for better "look straight" view
            setTimeout(() => {
              const currentZoom = mapInstance.getZoom();
              if (currentZoom) {
                // Zoom in more for better navigation view
                const targetZoom = Math.min(currentZoom + 1.5, 18); // Slightly less zoom than navigation start
                mapInstance.setZoom(targetZoom);
                
                // Center on the route for better view
                if (route.legs[0] && route.legs[0].steps && route.legs[0].steps.length > 0) {
                  const firstStep = route.legs[0].steps[0];
                  const centerPoint = {
                    lat: (firstStep.start_location.lat() + firstStep.end_location.lat()) / 2,
                    lng: (firstStep.start_location.lng() + firstStep.end_location.lng()) / 2
                  };
                  mapInstance.panTo(centerPoint);
                }
              }
            }, 600); // Slightly shorter delay for route calculation
          }, 150);
        }

        // Clear any existing custom markers and let the directions renderer handle them
        if (mapInstance) {
          // The directions renderer will automatically create the proper markers
          // based on the handleMapLoad configuration
        }

        if (onGetDirections) {
          onGetDirections(origin, destination, travelMode);
        }

        // Trigger navigation bar
        if (onNavigationReady) {
          onNavigationReady({
            distance: leg.distance?.text || '',
            duration: leg.duration?.text || '',
            durationValue: leg.duration?.value || 0,
            origin,
            destination,
            travelMode
          });
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
  }, [origin, destination, travelMode, onGetDirections, showError, travelModes, isGoogleMapsReady, directionsRenderer, geocodeAddress, showSuccess, onDirectionsRequested, onNavigationReady, updateRouteColors, mapInstance]);

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
                onClick={() => {
                  console.log('Current location button clicked');
                  getCurrentLocation();
                }}
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
            <div className="grid grid-cols-2 gap-1 sm:gap-2">
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
              {/* Traffic Information */}
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    routeInfo.trafficCondition === 'heavy' ? 'bg-red-500' :
                    routeInfo.trafficCondition === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-xs text-gray-600">
                    {routeInfo.trafficCondition === 'heavy' ? `Heavy traffic (+${routeInfo.trafficDelay} min delay)` :
                     routeInfo.trafficCondition === 'medium' ? `Moderate traffic (+${routeInfo.trafficDelay} min delay)` :
                     'Traffic conditions normal'}
                  </span>
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