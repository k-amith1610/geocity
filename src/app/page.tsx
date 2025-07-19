'use client';

import { useState, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import RoutePanel from '@/components/RoutePanel';
import GoogleMap from '@/components/GoogleMap';
import ReportModal from '@/components/ReportModal';
import { ToastContainer, useToast } from '@/components/Toast';
import CyberLoader from '@/components/CyberLoader';
import { useAuth } from '@/contexts/AuthContext';
// import { submitReport } from '@/lib/api';

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
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  
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
      />

      {/* Route Planning Panel */}
      <RoutePanel 
        isOpen={isRoutePanelOpen}
        onToggle={() => setIsRoutePanelOpen(!isRoutePanelOpen)}
        onGetDirections={handleGetDirections}
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

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
