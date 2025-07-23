'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Square, 
  Navigation, 
  MapPin, 
  Clock, 
  ArrowUp,
  Car,
  User as WalkingIcon,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useToast } from './Toast';

interface LocationUpdate {
  lat: number;
  lng: number;
  heading?: number;
}

interface NavigationBarProps {
  isVisible: boolean;
  routeInfo: {
    distance: string;
    duration: string;
    durationValue: number;
    origin: string;
    destination: string;
    travelMode: string;
  } | null;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  onClose: () => void;
  onLocationUpdate: (location: LocationUpdate) => void;
  directionsRenderer?: google.maps.DirectionsRenderer | null;
}

export default function NavigationBar({ 
  isVisible, 
  routeInfo, 
  onStartNavigation, 
  onStopNavigation, 
  onClose,
  onLocationUpdate,
  directionsRenderer
}: NavigationBarProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [remainingDistance, setRemainingDistance] = useState<string>('');
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState<string>('');
  const [eta, setEta] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);
  const { showSuccess, showError } = useToast();

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

  // Get travel mode icon
  const getTravelModeIcon = (mode: string) => {
    switch (mode) {
      case 'driving':
        return Car;
      case 'walking':
        return WalkingIcon;
      default:
        return Navigation;
    }
  };

  // Check if we're near destination
  const checkDestinationReached = useCallback((location: LocationUpdate) => {
    if (!routeInfo || !directionsRenderer) return false;
    
    const result = directionsRenderer.getDirections();
    if (result && result.routes && result.routes.length > 0) {
      const route = result.routes[0];
      const leg = route.legs[0];
      
      const distanceToDestination = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(location.lat, location.lng),
        leg.end_location
      );
      
      return distanceToDestination <= 50; // Within 50 meters
    }
    return false;
  }, [routeInfo, directionsRenderer]);

  // Get turn-by-turn instructions
  const getTurnByTurnInstructions = useCallback((location: LocationUpdate) => {
    if (!directionsRenderer) return null;
    
    const result = directionsRenderer.getDirections();
    if (result && result.routes && result.routes.length > 0) {
      const route = result.routes[0];
      const leg = route.legs[0];
      
      if (leg.steps && leg.steps.length > 0) {
        // Find the current step based on location
        let currentStepIndex = 0;
        let minDistance = Infinity;
        
        leg.steps.forEach((step, index) => {
          const stepDistance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(location.lat, location.lng),
            step.start_location
          );
          
          if (stepDistance < minDistance) {
            minDistance = stepDistance;
            currentStepIndex = index;
          }
        });
        
        // Find next step for upcoming instructions
        if (currentStepIndex < leg.steps.length - 1) {
          const nextStep = leg.steps[currentStepIndex + 1];
          const distanceToNextStep = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(location.lat, location.lng),
            nextStep.start_location
          );
          
          // Return instruction if within 300 meters of next turn (increased range)
          if (distanceToNextStep <= 300) {
            // Clean up instruction text (remove HTML tags and improve formatting)
            let cleanInstruction = nextStep.instructions.replace(/<[^>]*>/g, '');
            
            // Enhance instruction formatting
            cleanInstruction = cleanInstruction
              .replace(/\s+/g, ' ') // Remove extra spaces
              .replace(/^Turn\s+/, '') // Remove "Turn " prefix for cleaner look
              .replace(/\s+onto\s+/, ' onto ') // Clean up "onto" formatting
              .replace(/\s+towards\s+/, ' towards ') // Clean up "towards" formatting
              .trim();
            
            return {
              instruction: cleanInstruction,
              distance: nextStep.distance?.text || '',
              maneuver: nextStep.maneuver || 'straight',
              distanceMeters: distanceToNextStep
            };
          }
        }
        
        // If no upcoming turn, show current step info
        const currentStep = leg.steps[currentStepIndex];
        if (currentStep) {
          let cleanInstruction = currentStep.instructions.replace(/<[^>]*>/g, '');
          cleanInstruction = cleanInstruction
            .replace(/\s+/g, ' ')
            .replace(/^Turn\s+/, '')
            .replace(/\s+onto\s+/, ' onto ')
            .replace(/\s+towards\s+/, ' towards ')
            .trim();
          
          return {
            instruction: `Continue ${cleanInstruction}`,
            distance: currentStep.distance?.text || '',
            maneuver: 'straight',
            distanceMeters: 0
          };
        }
      }
    }
    return null;
  }, [directionsRenderer]);

  // Calculate heading from route direction
  const calculateRouteHeading = useCallback((location: LocationUpdate, directionsRenderer: google.maps.DirectionsRenderer) => {
    if (!directionsRenderer) return 0;
    
    const result = directionsRenderer.getDirections();
    if (result && result.routes && result.routes.length > 0) {
      const route = result.routes[0];
      const leg = route.legs[0];
      
      if (leg.steps && leg.steps.length > 0) {
        // Find the nearest step to current location
        let nearestStep = leg.steps[0];
        let minDistance = Infinity;
        let nearestStepIndex = 0;
        
        leg.steps.forEach((step, index) => {
          const stepDistance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(location.lat, location.lng),
            step.start_location
          );
          
          if (stepDistance < minDistance) {
            minDistance = stepDistance;
            nearestStep = step;
            nearestStepIndex = index;
          }
        });
        
        // Calculate heading from the nearest step
        let heading = google.maps.geometry.spherical.computeHeading(
          nearestStep.start_location,
          nearestStep.end_location
        );
        
        // If we're very close to the start, use the first step's heading
        if (nearestStepIndex === 0 && minDistance < 50) {
          heading = google.maps.geometry.spherical.computeHeading(
            leg.start_location,
            leg.steps[0].end_location
          );
        }
        
        // If we're very close to the end, use the last step's heading
        if (nearestStepIndex === leg.steps.length - 1 && minDistance < 50) {
          heading = google.maps.geometry.spherical.computeHeading(
            leg.steps[leg.steps.length - 1].start_location,
            leg.end_location
          );
        }
        
        console.log('Route Heading Calculation:', {
          nearestStepIndex,
          minDistance: `${minDistance.toFixed(1)}m`,
          heading: `${heading.toFixed(1)}°`,
          stepInstruction: nearestStep.instructions.replace(/<[^>]*>/g, '')
        });
        
        return heading;
      }
    }
    return 0;
  }, []);

  // Create professional Google Maps style navigation arrow
  const createNavigationArrow = useCallback((heading: number) => {
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Outer glow/shadow -->
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
            </filter>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <!-- Main circle with gradient -->
          <circle cx="24" cy="24" r="20" fill="url(#gradient)" stroke="white" stroke-width="2" filter="url(#shadow)"/>
          
          <!-- Gradient definition -->
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#4285F4;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#3367D6;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          <!-- Custom Navigation Arrow (Flaticon style) -->
          <g transform="rotate(${heading} 24 24)">
            <!-- Arrow body -->
            <path d="M24 8L24 36" stroke="white" stroke-width="4" stroke-linecap="round"/>
            <!-- Arrow head (pointing up) -->
            <path d="M24 8L30 14M24 8L18 14" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- Center dot -->
            <circle cx="24" cy="24" r="4" fill="white"/>
            <!-- Additional arrow details for better visibility -->
            <path d="M24 12L24 32" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
          </g>
          
          <!-- Pulse animation for active navigation -->
          <circle cx="24" cy="24" r="22" stroke="#4285F4" stroke-width="1" fill="none" opacity="0.6">
            <animate attributeName="r" values="22;26;22" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
          </circle>
        </svg>
      `),
      scaledSize: new google.maps.Size(48, 48),
      anchor: new google.maps.Point(24, 24)
    };
  }, []);

  // Start navigation
  const startNavigation = useCallback(async () => {
    if (!routeInfo) return;
    
    setIsNavigating(true);
    
    try {
      // Request location permission and start watching
      if (navigator.geolocation) {
        // Check permissions first
        const permissionStatus = await checkLocationPermissions();
        console.log('Permission status:', permissionStatus);
        
        if (permissionStatus === 'denied') {
          showError('Location Access Denied', 'Please allow location access in your browser settings to use navigation.');
          setIsNavigating(false);
          return;
        }

        // First, try to get initial position with better error handling
        const getInitialPosition = () => {
          return new Promise<GeolocationPosition>((resolve, reject) => {
            // Suppress CoreLocation warnings
            const originalConsoleWarn = console.warn;
            console.warn = (...args) => {
              if (args[0] && typeof args[0] === 'string' && 
                  (args[0].includes('CoreLocation') || args[0].includes('kCLErrorLocationUnknown'))) {
                return; // Suppress CoreLocation warnings
              }
              originalConsoleWarn.apply(console, args);
            };

            navigator.geolocation.getCurrentPosition(
              (position) => {
                console.warn = originalConsoleWarn;
                resolve(position);
              },
              (error) => {
                console.warn = originalConsoleWarn;
                console.log('Initial position error:', error);
                
                // If high accuracy fails, try with low accuracy
                if (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT) {
                  console.log('Trying low accuracy for initial position...');
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      console.warn = originalConsoleWarn;
                      resolve(position);
                    },
                    (fallbackError) => {
                      console.warn = originalConsoleWarn;
                      reject(fallbackError);
                    },
                    {
                      enableHighAccuracy: false,
                      timeout: 30000,
                      maximumAge: 600000 // 10 minutes cache
                    }
                  );
                } else {
                  reject(error);
                }
              },
              {
                enableHighAccuracy: true, // Use high accuracy for better navigation
                timeout: 15000, // 15 second timeout
                maximumAge: 5000 // 5 second cache for very frequent updates
              }
            );
          });
        };

        // Get initial position first
        try {
          const initialPosition = await getInitialPosition();
          const location: LocationUpdate = {
            lat: initialPosition.coords.latitude,
            lng: initialPosition.coords.longitude,
            heading: initialPosition.coords.heading || undefined
          };
          
          setCurrentLocation(location);
          
          // Calculate route-based heading for initial position
          let calculatedHeading = location.heading || 0;
          if (directionsRenderer) {
            const routeHeading = calculateRouteHeading(location, directionsRenderer);
            if (routeHeading !== 0) {
              calculatedHeading = routeHeading;
            }
          }
          
          // Update location with calculated heading
          const locationWithHeading: LocationUpdate = {
            ...location,
            heading: calculatedHeading
          };
          
          // Pass the location with proper heading to parent (ONLY ONCE)
          onLocationUpdate(locationWithHeading);
          
          // Debug logging for location updates
          console.log('Location Update:', {
            lat: locationWithHeading.lat.toFixed(6),
            lng: locationWithHeading.lng.toFixed(6),
            heading: calculatedHeading.toFixed(1),
            timestamp: new Date().toLocaleTimeString()
          });
          
          // Check if destination reached
          if (checkDestinationReached(locationWithHeading)) {
            showSuccess('Destination Reached!', 'You have arrived at your destination.');
            if (isVoiceEnabled && 'speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance('You have arrived at your destination');
              utterance.rate = 0.9;
              utterance.pitch = 1.0;
              utterance.volume = 0.8;
              speechSynthesis.speak(utterance);
            }
            // Auto-stop navigation after reaching destination
            setTimeout(() => {
              if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
              }
              setIsNavigating(false);
              setCurrentLocation(null);
              setProgress(0);
              setRemainingDistance('');
              setRemainingTime('');
              onStopNavigation();
              showSuccess('Navigation Stopped', 'You have arrived at your destination.');
            }, 3000);
            return;
          }
        } catch (initialError) {
          console.log('Initial position failed, continuing with watch...');
        }

        // Now start watching position with better error handling
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const location: LocationUpdate = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              heading: position.coords.heading || undefined
            };
            
            setCurrentLocation(location);
            
            // Calculate route-based heading for better navigation
            let calculatedHeading = location.heading || 0;
            if (directionsRenderer) {
              const routeHeading = calculateRouteHeading(location, directionsRenderer);
              if (routeHeading !== 0) {
                calculatedHeading = routeHeading;
              }
            }
            
            // Update location with calculated heading
            const locationWithHeading: LocationUpdate = {
              ...location,
              heading: calculatedHeading
            };
            
            // Pass the location with proper heading to parent (ONLY ONCE)
            onLocationUpdate(locationWithHeading);
            
            // Debug logging for location updates
            console.log('Location Update:', {
              lat: locationWithHeading.lat.toFixed(6),
              lng: locationWithHeading.lng.toFixed(6),
              heading: calculatedHeading.toFixed(1),
              timestamp: new Date().toLocaleTimeString()
            });
            
            // Check if destination reached
            if (checkDestinationReached(locationWithHeading)) {
              showSuccess('Destination Reached!', 'You have arrived at your destination.');
              if (isVoiceEnabled && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance('You have arrived at your destination');
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                utterance.volume = 0.8;
                speechSynthesis.speak(utterance);
              }
              // Auto-stop navigation after reaching destination
              setTimeout(() => {
                if (watchIdRef.current) {
                  navigator.geolocation.clearWatch(watchIdRef.current);
                  watchIdRef.current = null;
                }
                setIsNavigating(false);
                setCurrentLocation(null);
                setProgress(0);
                setRemainingDistance('');
                setRemainingTime('');
                onStopNavigation();
                showSuccess('Navigation Stopped', 'You have arrived at your destination.');
              }, 3000);
              return;
            }
            
            // Get turn-by-turn instructions
            const instruction = getTurnByTurnInstructions(locationWithHeading);
            if (instruction) {
              setCurrentInstruction(instruction.instruction);
              
              // Enhanced voice guidance for upcoming turns
              if (isVoiceEnabled && 'speechSynthesis' in window) {
                // Only announce if within 200 meters and not already announced
                if (instruction.distanceMeters <= 200 && instruction.distanceMeters > 0) {
                  const voiceInstruction = `${instruction.instruction} in ${instruction.distance}`;
                  const utterance = new SpeechSynthesisUtterance(voiceInstruction);
                  utterance.rate = 0.9;
                  utterance.pitch = 1.0;
                  utterance.volume = 0.8;
                  
                  // Cancel any existing speech
                  speechSynthesis.cancel();
                  speechSynthesis.speak(utterance);
                  
                  console.log('Voice guidance:', voiceInstruction);
                }
              }
            }
            
            // Calculate remaining distance and time
            if (directionsRenderer) {
              const result = directionsRenderer.getDirections();
              if (result && result.routes && result.routes.length > 0) {
                const route = result.routes[0];
                const leg = route.legs[0];
                
                // Calculate distance from current location to destination
                const distanceToDestination = google.maps.geometry.spherical.computeDistanceBetween(
                  new google.maps.LatLng(locationWithHeading.lat, locationWithHeading.lng),
                  leg.end_location
                );
                
                setRemainingDistance(`${Math.round(distanceToDestination / 1000 * 10) / 10} km`);
                
                // Enhanced time calculation based on travel mode and current speed
                let avgSpeed = 30; // Default km/h for driving
                if (routeInfo.travelMode === 'walking') {
                  avgSpeed = 5; // km/h for walking
                } else if (routeInfo.travelMode === 'bicycling') {
                  avgSpeed = 15; // km/h for cycling
                }
                
                // Calculate remaining time with more accuracy
                const remainingTimeMinutes = Math.round((distanceToDestination / 1000) / avgSpeed * 60);
                setRemainingTime(`${remainingTimeMinutes} min`);
                
                // Calculate ETA with current time
                const eta = new Date();
                eta.setMinutes(eta.getMinutes() + remainingTimeMinutes);
                setEta(eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                
                // Enhanced progress calculation based on route segments
                const totalDistance = leg.distance?.value || 0;
                const distanceTraveled = totalDistance - distanceToDestination;
                
                // More accurate progress calculation
                let progressPercent = 0;
                if (totalDistance > 0) {
                  // Calculate progress based on actual distance traveled
                  progressPercent = Math.max(0, Math.min(100, (distanceTraveled / totalDistance) * 100));
                  
                  // Add small buffer to prevent showing progress when not actually moving
                  if (progressPercent < 5 && distanceToDestination > totalDistance * 0.95) {
                    progressPercent = 0; // Reset to 0 if we're still very close to start
                  }
                  
                  // Only update progress if we've actually moved significantly (more than 50 meters from start)
                  const distanceFromStart = google.maps.geometry.spherical.computeDistanceBetween(
                    new google.maps.LatLng(locationWithHeading.lat, locationWithHeading.lng),
                    leg.start_location
                  );
                  
                  if (distanceFromStart < 50) {
                    progressPercent = 0; // Keep at 0 if still very close to start
                  }
                }
                
                setProgress(progressPercent);
                
                // Log progress for debugging
                console.log('Navigation Progress:', {
                  totalDistance: `${(totalDistance / 1000).toFixed(2)} km`,
                  distanceTraveled: `${(distanceTraveled / 1000).toFixed(2)} km`,
                  distanceToDestination: `${(distanceToDestination / 1000).toFixed(2)} km`,
                  distanceFromStart: `${(google.maps.geometry.spherical.computeDistanceBetween(
                    new google.maps.LatLng(locationWithHeading.lat, locationWithHeading.lng),
                    leg.start_location
                  ) / 1000).toFixed(2)} km`,
                  progress: `${progressPercent.toFixed(1)}%`,
                  eta: eta.toLocaleTimeString(),
                  remainingTime: `${remainingTimeMinutes} min`,
                  isMoving: distanceTraveled > 100 // Consider moving if traveled more than 100m
                });
              }
            }
          },
          (error) => {
            console.log('Watch position error:', error);
            
            // Handle specific error types with better messaging
            let errorMessage = 'Unable to get your location. Please check location permissions.';
            let shouldContinue = true;
            
            if (error.code) {
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = 'Location access denied. Please allow location access in your browser settings.';
                  shouldContinue = false;
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage = 'Location information is temporarily unavailable. This is normal in some areas.';
                  shouldContinue = true; // Continue navigation with last known position
                  break;
                case error.TIMEOUT:
                  errorMessage = 'Location request timed out. This is normal in some areas.';
                  shouldContinue = true; // Continue navigation with last known position
                  break;
                default:
                  errorMessage = 'Location service temporarily unavailable. This is normal in some areas.';
                  shouldContinue = true;
              }
            }
            
            // Handle CoreLocation specific errors
            if (error.message && (error.message.includes('CoreLocation') || error.message.includes('kCLErrorLocationUnknown'))) {
              console.log('CoreLocation error detected - this is normal on iOS/macOS Safari');
              shouldContinue = true; // Continue navigation with last known position
            }
            
            // Don't show error for temporary issues, just log them
            if (shouldContinue) {
              console.log('Temporary location issue, continuing navigation with last known position...');
              return;
            }
            
            showError('Location Error', errorMessage);
            setIsNavigating(false);
          },
          {
            enableHighAccuracy: true, // Use high accuracy for better navigation
            timeout: 15000, // 15 second timeout
            maximumAge: 5000 // 5 second cache for very frequent updates
          }
        );
        
        watchIdRef.current = watchId;
        
        // Initial voice announcement
        if (isVoiceEnabled && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('Navigation started. Follow the route ahead.');
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 0.8;
          speechSynthesis.speak(utterance);
        }
        
        showSuccess('Navigation Started', 'Real-time navigation is now active.');
        
        // Auto-collapse after starting navigation for better UX
        setTimeout(() => {
          setIsCollapsed(true);
        }, 2000);
      } else {
        showError('Geolocation Not Supported', 'Your browser does not support geolocation.');
        setIsNavigating(false);
      }
    } catch (error) {
      console.error('Navigation start error:', error);
      showError('Navigation Error', 'Failed to start navigation.');
      setIsNavigating(false);
    }
  }, [onStartNavigation, showSuccess, showError, routeInfo, progress, onLocationUpdate, isVoiceEnabled, checkLocationPermissions, checkDestinationReached, directionsRenderer, getTurnByTurnInstructions, onStopNavigation, calculateRouteHeading]);

  // Stop navigation
  const stopNavigation = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    setIsNavigating(false);
    setCurrentLocation(null);
    setProgress(0);
    setRemainingDistance('');
    setRemainingTime('');
    onStopNavigation();
    
    showSuccess('Navigation Stopped', 'Navigation has been stopped.');
  }, [onStopNavigation, showSuccess]);

  // Toggle voice navigation
  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(!isVoiceEnabled);
    if (!isVoiceEnabled) {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('Voice navigation enabled');
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        speechSynthesis.speak(utterance);
      }
    }
  }, [isVoiceEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (!isVisible || !routeInfo) {
    return null;
  }

  const TravelModeIcon = getTravelModeIcon(routeInfo.travelMode);

  // Collapsed view - just essential info
  if (isCollapsed) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[var(--color-border)] shadow-lg">
        <div className="p-2">
          <div className="flex items-center justify-between">
            {/* Essential Info */}
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-[var(--color-accent)] rounded-lg flex items-center justify-center">
                <TravelModeIcon className="w-2.5 h-2.5 text-white" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Navigation className="w-3 h-3 text-[var(--color-accent)]" />
                  <span className="text-sm font-medium text-black">
                    {isNavigating ? remainingDistance : routeInfo.distance}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-[var(--color-accent)]" />
                  <span className="text-sm font-medium text-black">
                    {isNavigating ? remainingTime : routeInfo.duration}
                  </span>
                </div>
                {isNavigating && eta && (
                  <div className="text-xs text-gray-500">ETA: {eta}</div>
                )}
              </div>
            </div>
            
            {/* Progress indicator when navigating */}
            {isNavigating && (
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-[var(--color-accent)] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
              </div>
            )}
            
            {/* Controls */}
            <div className="flex items-center space-x-1">
              {isNavigating && (
                <button
                  onClick={toggleVoice}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                    isVoiceEnabled ? 'bg-[var(--color-accent)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isVoiceEnabled ? 'Disable voice navigation' : 'Enable voice navigation'}
                >
                  {isVoiceEnabled ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
                </button>
              )}
              <button
                onClick={() => setIsCollapsed(false)}
                className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                title="Expand navigation"
              >
                <ArrowUp className="w-2.5 h-2.5 text-gray-600" />
              </button>
              <button
                onClick={onClose}
                className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                title="Close navigation"
              >
                <span className="text-xs font-bold text-gray-600">×</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expanded view - full navigation panel
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[var(--color-border)] shadow-lg">
      <div className="p-3">
        {/* Header - More Compact */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-[var(--color-accent)] rounded-lg flex items-center justify-center">
              <TravelModeIcon className="w-3 h-3 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-black">Navigation</h3>
              <p className="text-xs text-gray-500">{routeInfo.travelMode === 'driving' ? 'Driving' : 'Walking'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleVoice}
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                isVoiceEnabled ? 'bg-[var(--color-accent)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isVoiceEnabled ? 'Disable voice navigation' : 'Enable voice navigation'}
            >
              {isVoiceEnabled ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              title="Collapse navigation"
            >
              <ArrowUp className="w-2.5 h-2.5 text-gray-600 rotate-180" />
            </button>
            <button
              onClick={onClose}
              className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              title="Close navigation"
            >
              <span className="text-xs font-bold text-gray-600">×</span>
            </button>
          </div>
        </div>

        {/* Route Info - More Compact */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1 mb-0.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              <p className="text-xs text-gray-600 truncate">{routeInfo.origin}</p>
            </div>
            <div className="flex items-center space-x-1">
              <MapPin className="w-2 h-2 text-red-500 flex-shrink-0" />
              <p className="text-xs text-gray-600 truncate">{routeInfo.destination}</p>
            </div>
          </div>
          
          <div className="text-right ml-2">
            <div className="flex items-center space-x-1">
              <Navigation className="w-2.5 h-2.5 text-[var(--color-accent)]" />
              <span className="text-xs font-medium text-black">
                {isNavigating ? remainingDistance : routeInfo.distance}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-2.5 h-2.5 text-[var(--color-accent)]" />
              <span className="text-xs font-medium text-black">
                {isNavigating ? remainingTime : routeInfo.duration}
              </span>
            </div>
            {isNavigating && eta && (
              <div className="text-xs text-gray-500">ETA: {eta}</div>
            )}
          </div>
        </div>

        {/* Progress Bar - Only show when navigating */}
        {isNavigating && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-[var(--color-accent)] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {/* Current Instruction - More compact */}
            {currentInstruction && (
              <div className="mt-1 p-1.5 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-center space-x-1">
                  <Navigation className="w-2.5 h-2.5 text-blue-600" />
                  <span className="text-xs text-blue-700 font-medium">{currentInstruction}</span>
                </div>
              </div>
            )}
            
            {/* Navigation Status Indicator */}
            {isNavigating && (
              <div className="mt-1 p-1.5 bg-green-50 rounded border border-green-200">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-700 font-medium">
                    Navigation Active • GPS Tracking
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Controls - More compact */}
        <div className="flex items-center space-x-2">
          {!isNavigating ? (
            <button
              onClick={startNavigation}
              className="flex-1 bg-[var(--color-accent)] text-white font-semibold py-2 px-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-[var(--color-accent-dark)] transition-colors text-sm"
            >
              <Play className="w-3 h-3" />
              <span>Start Navigation</span>
            </button>
          ) : (
            <button
              onClick={stopNavigation}
              className="flex-1 bg-red-600 text-white font-semibold py-2 px-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-red-700 transition-colors text-sm"
            >
              <Square className="w-3 h-3" />
              <span>Stop Navigation</span>
            </button>
          )}
        </div>

        {/* Current Location Indicator - Only show when navigating and more compact */}
        {isNavigating && currentLocation && (
          <div className="mt-2 p-1.5 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-700">
                Tracking location... {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 