'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, MapPin, Locate, Flag, FileImage, AlertTriangle } from 'lucide-react';
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError, showInfo } = useToast();

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
    onClose();
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  if (!isOpen) return null;

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
              
              {/* File Input */}
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-[var(--color-accent)] hover:bg-gray-50 transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 font-medium">Choose Photo</span>
                </button>
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
                    className="w-full h-40 object-cover rounded-lg border border-gray-200"
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
                <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
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