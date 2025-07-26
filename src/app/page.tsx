'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Header from '@/components/Header';
import RoutePanel from '@/components/RoutePanel';
import GoogleMap from '@/components/GoogleMap';
import ReportModal from '@/components/ReportModal';
import AISuggestionsModal from '@/components/AISuggestionsModal';
import NavigationBar from '@/components/NavigationBar';
import { ToastContainer, useToast } from '@/components/Toast';
import CyberLoader from '@/components/CyberLoader';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getEnhancedWeather, 
  getSocialMediaData, 
  generateAIKeywords,
  EnhancedWeatherResponse,
  SocialMediaResponse
} from '@/lib/api';
import { useReportsRealtime, Report } from '@/hooks/useReportsRealtime';
import { ReportMapMarkers } from '@/components/ReportMapMarkers';
import { ReportDetailsModal } from '@/components/ReportDetailsModal';
import { useAutoExpiration } from '@/hooks/useAutoExpiration';
import { useSocket } from '@/hooks/useSocket';
import { useSoundAlerts } from '@/hooks/useSoundAlerts';
import { useAutoCleanup } from '@/hooks/useAutoCleanup';
import { useAutoMigration } from '@/hooks/useAutoMigration';
import { useAutoErrorRecovery } from '@/hooks/useAutoErrorRecovery';
import { useSystemHealth } from '@/hooks/useSystemHealth';

interface ReportData {
  photo: string; // Base64 encoded
  photoDetails: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
  location: string;
  description: string;
  emergency: boolean;
  deviceInfo: {
    publicIP: string;
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
    timestamp: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
  };
}

export default function Home() {
  const [showLoader, setShowLoader] = useState(true);
  const [isRoutePanelOpen, setIsRoutePanelOpen] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAISuggestionsModalOpen, setIsAISuggestionsModalOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  
  // Navigation state
  const [isNavigationBarVisible, setIsNavigationBarVisible] = useState(false);
  const [navigationRouteInfo, setNavigationRouteInfo] = useState<{
    distance: string;
    duration: string;
    durationValue: number;
    origin: string;
    destination: string;
    travelMode: string;
  } | null>(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [currentLocationMarker, setCurrentLocationMarker] = useState<google.maps.Marker | null>(null);
  
  // AI Suggestions state
  const [showAISuggestionsButton, setShowAISuggestionsButton] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<{ origin: string; destination: string } | null>(null);
  const [weatherData, setWeatherData] = useState<EnhancedWeatherResponse | null>(null);
  const [weatherDataDestination, setWeatherDataDestination] = useState<EnhancedWeatherResponse | null>(null);
  const [socialMediaData, setSocialMediaData] = useState<SocialMediaResponse | null>(null);
  const [isLoadingAISuggestions, setIsLoadingAISuggestions] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isLoadingSocialMedia, setIsLoadingSocialMedia] = useState(false);
  const [aiSuggestionsLoaded, setAiSuggestionsLoaded] = useState(false);
  
  // Reports system state
  const { reports, loading: reportsLoading, error: reportsError, refreshReports, forceRefresh, connectionStatus, setReports } = useReportsRealtime();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isReportDetailsOpen, setIsReportDetailsOpen] = useState(false);
  
  // WebSocket for real-time updates
  const { socket, emit, on, off } = useSocket();
  const { playEmergencyAlert, playNotificationSound } = useSoundAlerts();
  
  // Auto-cleanup for expired reports
  useAutoCleanup(5); // Run cleanup every 5 minutes
  
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Auto-expiration for reports
  const { getTimeRemaining, isExpired } = useAutoExpiration(reports, (reportId) => {
    // This will be handled by the real-time listener automatically
    console.log('Report expired:', reportId);
  });

  // Auto migration system
  const { migrationStatus } = useAutoMigration();

  // Auto error recovery system
  const { recoveryStatus } = useAutoErrorRecovery();

  // System health monitoring
  const { health, getRecommendations } = useSystemHealth();

  // Handle report click
  const handleReportClick = useCallback((report: Report, allReports?: Report[]) => {
    setSelectedReport(report);
    // Store all reports from the cluster if available
    if (allReports && allReports.length > 1) {
      // We'll pass this to the modal to show all reports
      setSelectedReport({ ...report, _allReportsFromCluster: allReports } as any);
    }
    setIsReportDetailsOpen(true);
  }, []);

  // WebSocket event handlers for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleReportsUpdated = (data: any) => {
      console.log('🔔 WebSocket event received:', data);
      
      if (data.type === 'new-report') {
        // Play sound based on emergency status
        if (data.report?.isEmergency) {
          playEmergencyAlert();
          showSuccess('🚨 Emergency Report', 'A new emergency report has been submitted in your area!');
        } else {
          playNotificationSound();
          showSuccess('📝 New Report', 'A new report has been submitted in your area!');
        }
        
        // Single immediate refresh - the Firestore listener should handle real-time updates
        console.log('🔄 Triggering immediate reports refresh after new report');
        forceRefresh();
        
        // Additional refresh after a short delay to ensure data consistency
        setTimeout(() => {
          console.log('🔄 Delayed refresh for data consistency...');
          forceRefresh();
        }, 2000);
        
      } else if (data.type === 'report-expired') {
        showInfo('⏰ Report Expired', 'A report has expired and been removed from the map.');
        
        // Force refresh of reports after expiration
        console.log('🔄 Triggering reports refresh after report expired');
        forceRefresh();
        
      } else if (data.type === 'reports-list') {
        // Handle bulk reports update if needed
        console.log('📋 Received bulk reports update:', data.reports?.length || 0, 'reports');
        // The Firestore listener should handle this automatically
      }
    };

    on('reports-updated', handleReportsUpdated);

    return () => {
      off('reports-updated', handleReportsUpdated);
    };
  }, [socket, on, off, showSuccess, showInfo, forceRefresh, playEmergencyAlert, playNotificationSound]);

  // Suppress CoreLocation warnings globally
  useEffect(() => {
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('CoreLocation') || args[0].includes('kCLErrorLocationUnknown'))) {
        return; // Suppress CoreLocation warnings
      }
      originalConsoleWarn.apply(console, args);
    };

    return () => {
      console.warn = originalConsoleWarn;
    };
  }, []);

  const handleLoaderComplete = () => {
    setShowLoader(false);
  };

  const handleReportIssue = () => {
    setIsReportModalOpen(true);
  };

  const handleUserProfile = () => {
    console.log('User Profile clicked');
    // Add your user profile logic here
  };

  const handleGetDirections = (origin: string, destination: string, mode: string) => {
    console.log('Get Directions:', { origin, destination, mode });
    // Add your directions logic here
  };

  // Navigation handlers
  const handleNavigationReady = useCallback((routeInfo: {
    distance: string;
    duration: string;
    durationValue: number;
    origin: string;
    destination: string;
    travelMode: string;
  }) => {
    setNavigationRouteInfo(routeInfo);
    setIsNavigationBarVisible(true);
  }, []);

  const handleStartNavigation = useCallback(() => {
    console.log('Navigation started');
    setShowTraffic(true);
    
    // Zoom to fit the entire route when starting navigation
    if (mapInstance && directionsRenderer) {
      const result = directionsRenderer.getDirections();
      if (result && result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        
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
          
          // After fitting bounds, zoom in for "look straight" view like Google Maps
          setTimeout(() => {
            const currentZoom = mapInstance.getZoom();
            if (currentZoom) {
              // Zoom in more for better "look straight" view
              const targetZoom = Math.min(currentZoom + 2, 19); // Max zoom 19 for street level
              mapInstance.setZoom(targetZoom);
              
              // Center on the route for better navigation view
              if (route.legs[0] && route.legs[0].steps && route.legs[0].steps.length > 0) {
                const firstStep = route.legs[0].steps[0];
                const centerPoint = {
                  lat: (firstStep.start_location.lat() + firstStep.end_location.lat()) / 2,
                  lng: (firstStep.start_location.lng() + firstStep.end_location.lng()) / 2
                };
                mapInstance.panTo(centerPoint);
              }
            }
          }, 800); // Longer delay for smoother transition
        }, 200);
        
        // Calculate initial heading from first step
        if (route.legs[0] && route.legs[0].steps && route.legs[0].steps.length > 0) {
          const firstStep = route.legs[0].steps[0];
          const heading = google.maps.geometry.spherical.computeHeading(
            firstStep.start_location,
            firstStep.end_location
          );
          
          // Create professional navigation arrow for initial position
          const createNavigationArrow = (heading: number) => {
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
          };
          
          // Update the current location marker with the calculated heading
          if (currentLocationMarker) {
            currentLocationMarker.setIcon(createNavigationArrow(heading));
          }
        }
      }
    }
    
    // Additional navigation start logic can be added here
  }, [mapInstance, directionsRenderer, currentLocationMarker]);

  const handleStopNavigation = useCallback(() => {
    console.log('Navigation stopped');
    setShowTraffic(false);
    
    // Remove location marker
    if (currentLocationMarker) {
      currentLocationMarker.setMap(null);
      setCurrentLocationMarker(null);
    }
    
    // Additional navigation stop logic can be added here
  }, [currentLocationMarker]);

  const handleCloseNavigation = useCallback(() => {
    setIsNavigationBarVisible(false);
    setNavigationRouteInfo(null);
    setShowTraffic(false);
    
    // Remove location marker
    if (currentLocationMarker) {
      currentLocationMarker.setMap(null);
      setCurrentLocationMarker(null);
    }
  }, [currentLocationMarker]);

  // Handle location updates during navigation
  const handleLocationUpdate = useCallback((location: { lat: number; lng: number; heading?: number }) => {
    if (!mapInstance) return;

    // Remove existing marker if it exists
    if (currentLocationMarker) {
      currentLocationMarker.setMap(null);
    }

    // Calculate heading based on route direction if available
    let calculatedHeading = location.heading || 0;
    let isNearDestination = false;
    
    if (directionsRenderer) {
      const result = directionsRenderer.getDirections();
      if (result && result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        const leg = route.legs[0];
        
        // Check if we're near destination (within 50 meters)
        const distanceToDestination = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(location.lat, location.lng),
          leg.end_location
        );
        
        if (distanceToDestination <= 50) {
          isNearDestination = true;
          // Show destination reached notification
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('You have arrived at your destination');
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            speechSynthesis.speak(utterance);
          }
        }
        
        if (leg.steps && leg.steps.length > 0) {
          // Find the nearest step to current location
          let nearestStep = leg.steps[0];
          let minDistance = Infinity;
          
          leg.steps.forEach(step => {
            const stepDistance = google.maps.geometry.spherical.computeDistanceBetween(
              new google.maps.LatLng(location.lat, location.lng),
              step.start_location
            );
            
            if (stepDistance < minDistance) {
              minDistance = stepDistance;
              nearestStep = step;
            }
          });
          
          // Calculate heading from the nearest step (corrected calculation)
          calculatedHeading = google.maps.geometry.spherical.computeHeading(
            nearestStep.start_location,
            nearestStep.end_location
          );
        }
      }
    }

    // Create professional Google Maps style navigation arrow
    const createNavigationArrow = (heading: number) => {
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
    };

    // Create new location marker with professional Google Maps style navigation arrow
    const marker = new google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map: mapInstance,
      icon: createNavigationArrow(calculatedHeading),
      title: isNearDestination ? 'You have arrived!' : 'Your Location',
      zIndex: 1000
    });

    setCurrentLocationMarker(marker);
    
    // Debug logging for marker updates
    console.log('Marker Updated:', {
      position: { lat: location.lat.toFixed(6), lng: location.lng.toFixed(6) },
      heading: calculatedHeading.toFixed(1),
      isNearDestination,
      timestamp: new Date().toLocaleTimeString()
    });

    // Center map on user location during navigation (but not when near destination)
    if (!isNearDestination) {
      // Smooth pan to user location with Google Maps style behavior
      const currentCenter = mapInstance.getCenter();
      if (currentCenter) {
        const currentLat = currentCenter.lat();
        const currentLng = currentCenter.lng();
        const targetLat = location.lat;
        const targetLng = location.lng;
        
        // Calculate distance to determine if we need to pan
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(currentLat, currentLng),
          new google.maps.LatLng(targetLat, targetLng)
        );
        
        // Only pan if user has moved significantly (more than 50 meters)
        if (distance > 50) {
          // Smooth pan with easing
          mapInstance.panTo({ lat: targetLat, lng: targetLng });
          
          // Adjust zoom level for better navigation view
          const currentZoom = mapInstance.getZoom();
          if (currentZoom && currentZoom < 16) {
            // Gradually zoom in for better navigation view
            mapInstance.setZoom(Math.min(currentZoom + 0.5, 18));
          }
        }
      }
    }
  }, [mapInstance, currentLocationMarker, directionsRenderer]);

  // Handle when directions are requested - start background API calls
  const handleDirectionsRequested = useCallback(async (origin: string, destination: string) => {
    setCurrentRoute({ origin, destination });
    setShowAISuggestionsButton(true);
    setAiSuggestionsLoaded(false);
    
    // Reset all data
    setWeatherData(null);
    setWeatherDataDestination(null);
    setSocialMediaData(null);
    
    // Start background API calls for AI suggestions
    setIsLoadingAISuggestions(true);
    setIsLoadingWeather(true);
    setIsLoadingSocialMedia(true);
    
    try {
      // Generate AI keywords first
      const keywordsResponse = await generateAIKeywords(origin, destination);
      console.log('AI Keywords generated:', keywordsResponse);
      
      // Start weather API calls for both locations in parallel
      const weatherPromises = [
        getEnhancedWeather(origin).then(data => {
          setWeatherData(data);
          setIsLoadingWeather(false);
          showSuccess('Weather Data Loaded', 'Origin location weather information is ready.');
          // Set loaded if we have any data
          if (data && (data.weather || data.analysis)) {
            setAiSuggestionsLoaded(true);
          }
          return { type: 'origin', data };
        }).catch(error => {
          console.error('Origin weather API failed:', error);
          setIsLoadingWeather(false);
          return { type: 'origin', error };
        }),
        
        getEnhancedWeather(destination).then(data => {
          setWeatherDataDestination(data);
          // Set loaded if we have any data
          if (data && (data.weather || data.analysis)) {
            setAiSuggestionsLoaded(true);
          }
          return { type: 'destination', data };
        }).catch(error => {
          console.error('Destination weather API failed:', error);
          return { type: 'destination', error };
        })
      ];
      
      // Start social media scraping
      const socialMediaPromise = getSocialMediaData({
        routes: keywordsResponse.routes,
        keywords: keywordsResponse.keywords,
        maxPosts: keywordsResponse.maxPosts
      }).then(data => {
        setSocialMediaData(data);
        setIsLoadingSocialMedia(false);
        showSuccess('Social Media Analysis Ready', 'Recent social media posts have been analyzed.');
        // Set loaded if we have social media data
        if (data && data.data && data.data.posts.length > 0) {
          setAiSuggestionsLoaded(true);
        }
        return data;
      }).catch(error => {
        console.error('Social media API failed:', error);
        setIsLoadingSocialMedia(false);
        throw error;
      });
      
      // Wait for all promises to settle
      await Promise.allSettled([...weatherPromises, socialMediaPromise]);
      
      // Final check - if we still don't have any data, set loaded anyway to allow manual opening
      if (!weatherData && !weatherDataDestination && !socialMediaData) {
        setAiSuggestionsLoaded(true);
      }
      
      showSuccess('AI Insights Complete', 'Route analysis completed. Click "AI Insights" to view recommendations.');
      
    } catch (error) {
      console.error('AI suggestions failed:', error);
      setWeatherData(null);
      setWeatherDataDestination(null);
      setSocialMediaData(null);
      setAiSuggestionsLoaded(true);
      setIsLoadingWeather(false);
      setIsLoadingSocialMedia(false);
      showError('AI Analysis Failed', 'Unable to gather route insights. Please try again.');
    } finally {
      setIsLoadingAISuggestions(false);
    }
  }, [showSuccess, showError]);

  // Handle AI suggestions modal
  const handleAISuggestions = () => {
    // Allow opening if either weather data or social media data is available
    const hasWeatherData = weatherData || weatherDataDestination;
    const hasSocialData = socialMediaData;
    
    if (hasWeatherData || hasSocialData) {
      setIsAISuggestionsModalOpen(true);
    } else {
      showError('AI Insights Not Ready', 'Please wait for route analysis to complete.');
    }
  };

  const handleSubmitReport = async (data: ReportData) => {
    try {
      // Convert File to base64 if it's still a File object
      let photoBase64 = data.photo;
      let photoDetails = data.photoDetails;
      
      // If photo is still a File object, convert it
      if (data.photo && typeof data.photo === 'object' && 'name' in data.photo) {
        const file = data.photo as unknown as File;
        photoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        photoDetails = {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        };
      }

      // Simulate backend API call (commented out)
      /*
      const response = await submitReport({
        photo: photoBase64,
        photoDetails,
        location: data.location,
        description: data.description,
        emergency: data.emergency,
        deviceInfo: data.deviceInfo
      });
      */

      // Simulate successful response
      const response = {
        status: 'success',
        message: 'Your report has been submitted successfully and will be reviewed.'
      };

      showSuccess('Report Submitted', response.message);
    } catch (error) {
      showError('Submission Failed', 'Failed to submit report. Please try again.');
      throw error; // Re-throw to let the modal handle the error state
    }
  };

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    console.log('Map loaded successfully');
    console.log('Map instance:', map);
    console.log('Map center:', map.getCenter());
    console.log('Map zoom:', map.getZoom());
    setMapInstance(map);
    
    // Initialize directions renderer with Google Maps-style colors and markers
    if (typeof google !== 'undefined' && google.maps) {
      const renderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true, // Suppress default markers to use custom ones
        polylineOptions: {
          strokeColor: '#4285F4', // Google Maps blue
          strokeWeight: 5,
          strokeOpacity: 0.8,
          zIndex: 1
        }
      });
      
      // Override the default markers with custom ones
      renderer.addListener('directions_changed', () => {
        const result = renderer.getDirections();
        if (result && result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          const leg = route.legs[0];
          
          // Clear existing markers
          if (renderer.getMap()) {
            // Create custom start marker (blue circle with direction indicator - Google Maps style)
            const startMarker = new google.maps.Marker({
              position: leg.start_location,
              map: renderer.getMap(),
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="white" stroke-width="2"/>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 12)
              },
              title: 'Start Location'
            });
            
            // Create custom destination marker (clean red pin without arrow - Google Maps style)
            const destMarker = new google.maps.Marker({
              position: leg.end_location,
              map: renderer.getMap(),
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335" stroke="white" stroke-width="1"/>
                    <circle cx="12" cy="9" r="2.5" fill="white"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 24)
              },
              title: 'Destination'
            });
          }
        }
      });
      
      renderer.setMap(map);
      setDirectionsRenderer(renderer);
    }
  }, []);

  // Show loader for first 10 seconds
  if (showLoader) {
    return <CyberLoader onComplete={handleLoaderComplete} />;
  }

  return (
    <div className="w-full h-screen relative">
      {/* Google Maps Background */}
      <GoogleMap 
        onMapLoad={handleMapLoad}
        directionsRenderer={directionsRenderer}
        showTraffic={showTraffic}
      />
      
      {/* Header Component */}
      <Header 
        onReportIssue={handleReportIssue}
        onUserProfile={handleUserProfile}
        onAISuggestions={handleAISuggestions}
        showAISuggestions={showAISuggestionsButton}
      />

      {/* Route Planning Panel */}
      <RoutePanel 
        isOpen={isRoutePanelOpen}
        onToggle={() => setIsRoutePanelOpen(!isRoutePanelOpen)}
        onGetDirections={handleGetDirections}
        onDirectionsRequested={handleDirectionsRequested}
        onNavigationReady={handleNavigationReady}
        mapInstance={mapInstance}
        directionsRenderer={directionsRenderer}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleSubmitReport}
        mapInstance={mapInstance}
      />

      {/* AI Suggestions Modal */}
      <AISuggestionsModal
        isOpen={isAISuggestionsModalOpen}
        onClose={() => setIsAISuggestionsModalOpen(false)}
        origin={currentRoute?.origin || ''}
        destination={currentRoute?.destination || ''}
        weatherData={weatherData}
        weatherDataDestination={weatherDataDestination}
        socialMediaData={socialMediaData}
        isLoading={isLoadingAISuggestions}
        isLoadingWeather={isLoadingWeather}
        isLoadingSocialMedia={isLoadingSocialMedia}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Report Map Markers */}
      <ReportMapMarkers
        reports={reports}
        mapInstance={mapInstance}
        onReportClick={handleReportClick}
      />
      


      {/* Report Details Modal */}
      <ReportDetailsModal
        isOpen={isReportDetailsOpen}
        report={selectedReport}
        onClose={() => {
          setIsReportDetailsOpen(false);
          setSelectedReport(null);
        }}
      />

      {/* Navigation Bar */}
      <NavigationBar
        isVisible={isNavigationBarVisible}
        routeInfo={navigationRouteInfo}
        onStartNavigation={handleStartNavigation}
        onStopNavigation={handleStopNavigation}
        onClose={handleCloseNavigation}
        onLocationUpdate={handleLocationUpdate}
        directionsRenderer={directionsRenderer}
      />
    </div>
  );
}
