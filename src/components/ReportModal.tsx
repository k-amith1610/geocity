'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, MapPin, Locate, Flag, FileImage, AlertTriangle, Camera, CameraOff, RotateCcw } from 'lucide-react';
import { useToast } from './Toast';
import { getDeviceInfo } from '@/lib/deviceInfo';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: ReportData) => void;
  mapInstance?: google.maps.Map | null;
}

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

export default function ReportModal({ isOpen, onClose, onSubmit, mapInstance }: ReportModalProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Camera modal states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showSuccess, showError, showInfo } = useToast();

  // Firebase Studio approach: Simple camera stream start
  const startCameraStream = useCallback(async () => {
    if (videoRef.current) {
      try {
        // Try HD constraints first, fallback to basic if needed
        let stream: MediaStream;
        
        try {
          // HD constraints for better image quality
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode,
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              aspectRatio: { ideal: 16/9 }
            },
          });
          console.log('Camera stream started successfully with HD quality');
        } catch (hdError) {
          console.warn('HD constraints failed, falling back to basic:', hdError);
          // Fallback to basic constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
          });
          console.log('Camera stream started successfully with basic quality');
        }
        
        videoRef.current.srcObject = stream;
        setStream(stream);
        setIsVideoLoading(false);
        setCameraError(null);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setCameraError("Could not access camera. Please check permissions.");
        // Close camera on error
        setIsCameraOpen(false);
        setIsVideoLoading(false);
        setHasMultipleCameras(false);
        setCameraError(null);
        setStream(null);
      }
    }
  }, [facingMode]);

  // Cleanup effect for camera streams - Firebase Studio approach
  useEffect(() => {
    if (isCameraOpen) {
      startCameraStream();
    }
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const mediaStream = videoRef.current.srcObject as MediaStream;
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraOpen, facingMode, startCameraStream]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('Invalid File Type', 'Please select an image file.');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        showError('File Too Large', 'Please select an image smaller than 5MB.');
        return;
      }

      setPhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      showSuccess('Photo Selected', 'Photo has been uploaded successfully.');
    }
  }, [showSuccess, showError]);

  // Check for multiple cameras
  const checkMultipleCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);
      console.log('Found video devices:', videoDevices.length);
    } catch (error) {
      console.warn('Could not enumerate devices:', error);
      setHasMultipleCameras(false);
    }
  }, []);

  // Open camera modal - Firebase Studio approach
  const openCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showError('Camera Not Supported', 'Your browser does not support camera access.');
      return;
    }

    setIsCameraLoading(true);
    setCameraError(null);
    
    try {
      await checkMultipleCameras();
      setIsCameraOpen(true);
      setIsVideoLoading(true);
      showSuccess('Camera Opened', 'Camera is ready. Click the capture button when ready.');
    } catch (error: any) {
      console.error('Camera access error:', error);
      let errorMessage = 'Unable to access camera. Please try again.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on your device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not meet the required specifications.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera is not supported on this device.';
      }
      
      setCameraError(errorMessage);
      showError('Camera Error', errorMessage);
    } finally {
      setIsCameraLoading(false);
    }
  }, [showSuccess, showError, checkMultipleCameras]);

  // Close camera modal - Firebase Studio approach
  const closeCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const mediaStream = videoRef.current.srcObject as MediaStream;
      mediaStream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsCameraOpen(false);
    setIsVideoLoading(false);
    setHasMultipleCameras(false);
    setCameraError(null);
    setStream(null);
  }, []);

  // Switch camera (front/back) - Firebase Studio approach
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Capture photo from camera - Firebase Studio approach with HD quality
  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement("canvas");
    // Set canvas to video dimensions for maximum quality
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext("2d");
    
    if (context) {
      // Enable image smoothing for better quality
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      
      // Draw the video frame to canvas
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Convert to high-quality JPEG
      const dataUri = canvas.toDataURL("image/jpeg", 0.95); // 95% quality
      
      // Create file from data URI
      const byteString = atob(dataUri.split(',')[1]);
      const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const file = new File([blob], `camera_photo_${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      // Validate file size (10MB limit for HD images)
      if (file.size > 10 * 1024 * 1024) {
        showError('Photo Too Large', 'Captured photo is too large. Please try again.');
        return;
      }
      
      setPhoto(file);
      setPhotoPreview(dataUri);
      showSuccess('HD Photo Captured', 'High-quality photo has been captured successfully.');
      closeCamera();
    }
  }, [closeCamera, showSuccess, showError]);

  // Handle current location
  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      showError('Geolocation Not Supported', 'Your browser does not support geolocation.');
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
            enableHighAccuracy: false,
            timeout: 25000,
            maximumAge: 300000
          }
        );
      });

      const { latitude, longitude } = position.coords;
      
      // Zoom map to current location if map instance is available
      if (mapInstance && typeof google !== 'undefined' && google.maps) {
        try {
          const latLng = new google.maps.LatLng(latitude, longitude);
          
          // Smooth pan to location
          mapInstance.panTo(latLng);
          
          // Set appropriate zoom level
          mapInstance.setZoom(15);
          
          showSuccess('Location Found', 'Your current location has been set and map has been updated.');
        } catch (mapError) {
          console.warn('Map zoom failed:', mapError);
          // Continue with geocoding even if map zoom fails
        }
      }
      
      // Reverse geocode to get address
      if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
        
        if (result.results[0]) {
          const address = result.results[0].formatted_address;
          setLocation(address);
          
          // Show success message only if map zoom didn't already show one
          if (!mapInstance) {
            showSuccess('Location Found', 'Your current location has been set.');
          }
        } else {
          showError('Location Error', 'Could not get address for your location. Please enter manually.');
        }
      }
    } catch (error: any) {
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
        errorMessage = 'Location service temporarily unavailable. Please try again or enter manually.';
      }
      
      showError('Location Error', errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  }, [showSuccess, showError, mapInstance]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!photo) {
      showError('Photo Required', 'Please select a photo for your report.');
      return;
    }
    
    if (!location.trim()) {
      showError('Location Required', 'Please enter a location for your report.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get device information for fraud prevention
      const deviceInfo = await getDeviceInfo();
      
      const reportData: ReportData = {
        photo: photoPreview || '', // Use photoPreview for base64
        photoDetails: {
          name: photo.name,
          size: photo.size,
          type: photo.type,
          lastModified: photo.lastModified,
        },
        location: location.trim(),
        description: description.trim(),
        emergency,
        deviceInfo
      };

      if (onSubmit) {
        await onSubmit(reportData);
      }
      console.log(reportData);
      
      showSuccess('Report Submitted', 'Your report has been submitted successfully.');
      handleClose();
    } catch (error) {
      showError('Submission Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [photo, location, description, emergency, onSubmit, showSuccess, showError, photoPreview]);

  // Handle modal close
  const handleClose = useCallback(() => {
    setPhoto(null);
    setPhotoPreview(null);
    setLocation('');
    setDescription('');
    setEmergency(false);
    closeCamera(); // Close camera if open
    onClose();
  }, [onClose, closeCamera]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  if (!isOpen) return null;

  // Camera Modal
  if (isCameraOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Camera Header */}
        <div className="flex items-center justify-between p-4 bg-black/80 text-white">
          <h3 className="text-lg font-semibold">Take Photo</h3>
          <button
            onClick={closeCamera}
            className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera View */}
        <div className="flex-1 relative bg-black overflow-hidden">
          {/* Video Element */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ 
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)',
              display: cameraError ? 'none' : 'block'
            }}
          />
          
          {/* Loading Overlay */}
          {isVideoLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-white text-sm">Loading camera...</p>
              </div>
            </div>
          )}
          
          {/* Error Overlay */}
          {cameraError && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
              <div className="text-center max-w-sm mx-auto p-6">
                <CameraOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">Camera Error</h3>
                <p className="text-gray-300 text-sm mb-4">{cameraError}</p>
                <div className="space-y-2">
                  <button
                    onClick={openCamera}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={closeCamera}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                  >
                    Close Camera
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Camera Controls Overlay */}
          {!cameraError && (
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8 bg-gradient-to-t from-black/95 via-black/70 to-transparent min-h-[200px] flex flex-col justify-end z-10">
              <div className="flex items-center justify-center space-x-4 sm:space-x-6 lg:space-x-8 mb-4">
                {/* Switch Camera Button (only show if multiple cameras) */}
                {hasMultipleCameras && (
                  <button
                    onClick={switchCamera}
                    disabled={isVideoLoading}
                    className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-white/30 flex items-center justify-center hover:bg-white/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg z-10"
                    title="Switch Camera"
                  >
                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </button>
                )}
                
                {/* Capture Button - Made larger and more prominent */}
                <button
                  onClick={capturePhoto}
                  disabled={isVideoLoading || !!cameraError}
                  className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl border-4 border-white/20 z-10"
                  title="Capture Photo"
                >
                  <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full border-4 border-gray-800 bg-white"></div>
                </button>
                
                {/* Cancel Button - Added for better UX */}
                <button
                  onClick={closeCamera}
                  disabled={isVideoLoading}
                  className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-white/30 flex items-center justify-center hover:bg-white/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg z-10"
                  title="Cancel"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                </button>
              </div>
              
              {/* Instructions Text */}
              <div className="text-center mb-4">
                <p className="text-white/90 text-xs sm:text-sm lg:text-base font-medium">Tap the white button to capture photo</p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden Canvas for Photo Capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Submit a Citizen Report</h2>
            <p className="text-xs text-gray-600 mt-0.5">Help improve your community by reporting issues. Fill out the details below.</p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo Upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-2">
                Photo <span className="text-red-500">*</span>
              </label>
              
              {/* Photo Upload Buttons - Responsive Layout */}
              <div className="mb-3">
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* File Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-[var(--color-accent)] hover:bg-gray-50 transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 font-medium">Upload Photo</span>
                  </button>
                  
                  {/* Camera Button */}
                  <button
                    type="button"
                    onClick={openCamera}
                    disabled={isCameraLoading}
                    className="flex-1 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-[var(--color-accent)] hover:bg-gray-50 transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCameraLoading ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600 font-medium">
                      {isCameraLoading ? 'Opening Camera...' : 'Take Photo'}
                    </span>
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Photo Preview */}
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-60 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors duration-200 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-60 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
                  <FileImage className="w-8 h-8 text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Image preview will appear here</p>
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter an address or use locator"
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 text-sm text-gray-900 placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-7 h-7 bg-white rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-gray-200"
                  title="Use current location"
                >
                  <Locate className={`w-3.5 h-3.5 text-[var(--color-accent)] ${isGettingLocation ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Emergency Checkbox */}
            <div>
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emergency}
                  onChange={(e) => setEmergency(e.target.checked)}
                  className="w-4 h-4 text-[var(--color-accent)] bg-gray-100 border-gray-300 rounded focus:ring-[var(--color-accent)] focus:ring-2"
                />
                <div className="flex items-center space-x-2">
                  <AlertTriangle className={`w-5 h-5 ${emergency ? 'text-red-500' : 'text-gray-400'}`} />
                  <div>
                    <span className={`text-sm font-medium ${emergency ? 'text-red-600' : 'text-gray-700'}`}>
                      Emergency Report
                    </span>
                    <p className="text-xs text-gray-500">Mark this if immediate attention is required</p>
                  </div>
                </div>
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-2">
                Description <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any extra details about the incident..."
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 text-sm text-gray-900 placeholder-gray-500 resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer mr-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !photo || !location.trim()}
            className={`px-4 py-2 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer flex items-center space-x-2 text-sm ${
              emergency 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]'
            }`}
          >
            {isSubmitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : emergency ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <Flag className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? 'Submitting...' : emergency ? 'Submit Emergency Report' : 'Submit Report'}</span>
          </button>
        </div>
      </div>
    </div>
  );
} 