'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Header from '@/components/Header';
import RoutePanel from '@/components/RoutePanel';
import GoogleMap from '@/components/GoogleMap';
import ReportModal from '@/components/ReportModal';
import AISuggestionsModal from '@/components/AISuggestionsModal';
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
  
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const { user, isAuthenticated } = useAuth();

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
    setMapInstance(map);
    
    // Initialize directions renderer
    if (typeof google !== 'undefined' && google.maps) {
      const renderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#556B2F',
          strokeWeight: 4,
          strokeOpacity: 0.8
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
    </div>
  );
}
