'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Report } from '@/hooks/useReportsRealtime';
import { getEmergencyIconConfig, createAnimatedIcon, createClusterIcon } from '@/utils/emergencyIcons';

interface ReportMapMarkersProps {
  reports: Report[];
  mapInstance: google.maps.Map | null;
  onReportClick?: (report: Report) => void;
}

interface LocationCluster {
  location: string;
  coordinates: { lat: number; lng: number };
  reports: Report[];
  isEmergency: boolean;
  emergencyType?: string;
  priority?: string;
}

export function ReportMapMarkers({ reports, mapInstance, onReportClick }: ReportMapMarkersProps) {
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [currentViewCenter, setCurrentViewCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize geocoder
  useEffect(() => {
    if (typeof google !== 'undefined' && google.maps && !geocoder) {
      console.log('🗺️ Initializing Google Maps Geocoder...');
      const newGeocoder = new google.maps.Geocoder();
      setGeocoder(newGeocoder);
    }
  }, [geocoder]);

  // Track map center for 10km filtering
  useEffect(() => {
    if (!mapInstance) return;

    const updateViewCenter = () => {
      const center = mapInstance.getCenter();
      if (center) {
        setCurrentViewCenter({ lat: center.lat(), lng: center.lng() });
      }
    };

    // Update center on map movement
    const boundsChangedListener = mapInstance.addListener('bounds_changed', updateViewCenter);
    const centerChangedListener = mapInstance.addListener('center_changed', updateViewCenter);
    
    // Initial center
    updateViewCenter();

    return () => {
      google.maps.event.removeListener(boundsChangedListener);
      google.maps.event.removeListener(centerChangedListener);
    };
  }, [mapInstance]);

  // Calculate distance between two points in kilometers
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Improved geocoding function with better location parsing
  const geocodeLocation = useCallback(async (location: string): Promise<{ lat: number; lng: number } | null> => {
    console.log('📍 Geocoding location:', location);
    
    if (!geocoder) {
      console.log('❌ No geocoder available');
      return null;
    }

    try {
      // Try the full location first
      let result = await geocoder.geocode({ address: location });
      console.log('📍 Geocoding result for full location:', result);
      
      if (result.results && result.results.length > 0) {
        const { lat, lng } = result.results[0].geometry.location;
        const coordinates = { lat: lat(), lng: lng() };
        console.log('✅ Geocoding successful for full location:', coordinates);
        return coordinates;
      }
      
      // Try parsing the location string to extract meaningful parts
      const parts = location.split(',').map(part => part.trim());
      console.log('📍 Location parts:', parts);
      
      // Try different combinations of location parts
      const attempts = [
        // Try without the Plus Code (3F6G+R5C)
        parts.filter(part => !part.match(/^[A-Z0-9]{4}\+[A-Z0-9]{3}$/)).join(', '),
        // Try just the neighborhood name
        parts.find(part => part.includes('halli') || part.includes('nagar') || part.includes('layout')) || parts[1],
        // Try the second part (usually neighborhood)
        parts[1],
        // Try the third part (usually city)
        parts[2]
      ].filter(Boolean);
      
      console.log('📍 Geocoding attempts:', attempts);
      
      for (const attempt of attempts) {
        if (!attempt || attempt.length < 3) continue;
        
        try {
          console.log('📍 Trying geocoding with:', attempt);
          result = await geocoder.geocode({ 
            address: attempt + (attempt.includes('Bengaluru') ? '' : ', Bengaluru, India'),
            region: 'in' // Restrict to India
          });
        
        if (result.results && result.results.length > 0) {
          const { lat, lng } = result.results[0].geometry.location;
          const coordinates = { lat: lat(), lng: lng() };
            console.log('✅ Geocoding successful with attempt:', attempt, coordinates);
          return coordinates;
          }
        } catch (attemptError) {
          console.warn('⚠️ Geocoding attempt failed for:', attempt, attemptError);
        }
      }
      
      console.warn('⚠️ Could not geocode location:', location);
      
      // Fallback: Use Bengaluru center coordinates
      console.log('🔄 Using fallback coordinates for Bengaluru center');
      return { lat: 12.9716, lng: 77.5946 };
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return null;
    }
  }, [geocoder]);

  // Filter reports within 10km of current view
  const filterReportsByDistance = useCallback(async (reports: Report[]): Promise<Report[]> => {
    if (!currentViewCenter) return reports;

    const filteredReports: Report[] = [];
    
    for (const report of reports) {
      try {
        // Geocode the report location first
        const coordinates = await geocodeLocation(report.location);
        if (coordinates) {
          const distance = calculateDistance(
            currentViewCenter.lat,
            currentViewCenter.lng,
            coordinates.lat,
            coordinates.lng
          );
          
          if (distance <= 10) { // 10km radius
            filteredReports.push(report);
          }
        }
      } catch (error) {
        console.warn('⚠️ Error filtering report by distance:', error);
        // Include report if geocoding fails (better to show than hide)
        filteredReports.push(report);
      }
    }
    
    return filteredReports;
  }, [currentViewCenter, calculateDistance, geocodeLocation]);

  // Group reports by location and create clusters with improved logic
  const createLocationClusters = useCallback(async (reports: Report[]): Promise<LocationCluster[]> => {
    const locationMap = new Map<string, Report[]>();
    
    // Group reports by location (normalize location strings)
    for (const report of reports) {
      const location = report.location.trim().toLowerCase();
      if (!locationMap.has(location)) {
        locationMap.set(location, []);
      }
      locationMap.get(location)!.push(report);
    }
    
    // Create clusters
    const clusters: LocationCluster[] = [];
    
    for (const [location, locationReports] of locationMap) {
      const coordinates = await geocodeLocation(location);
      if (coordinates) {
        // Sort reports by priority (emergency first, then by timestamp)
        const sortedReports = locationReports.sort((a, b) => {
          if (a.isEmergency && !b.isEmergency) return -1;
          if (!a.isEmergency && b.isEmergency) return 1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        
        // Determine if any report in cluster is emergency
        const isEmergency = sortedReports.some(r => r.isEmergency);
        const emergencyType = sortedReports.find(r => r.isEmergency)?.emergencyType;
        
        // Determine priority for non-emergency reports
        let priority: string | undefined;
        if (!isEmergency) {
          const firstReport = sortedReports[0];
          if (firstReport.imageAnalysis?.emergencyLevel) {
            switch (firstReport.imageAnalysis.emergencyLevel) {
              case 'CRITICAL':
              case 'HIGH':
                priority = 'high';
                break;
              case 'MEDIUM':
                priority = 'medium';
                break;
              case 'LOW':
                priority = 'low';
                break;
              case 'NONE':
                priority = 'safe';
                break;
            }
          } else {
            priority = 'medium'; // Default
          }
        }
        
        clusters.push({
          location,
          coordinates,
          reports: sortedReports,
          isEmergency,
          emergencyType,
          priority
        });
      }
    }
    
    return clusters;
  }, [geocodeLocation]);

  // Create marker for a cluster with improved icon handling
  const createClusterMarker = useCallback(async (cluster: LocationCluster) => {
    if (!mapInstance) return;

    console.log('🎯 Creating cluster marker for location:', cluster.location, 'with', cluster.reports.length, 'reports');

    const isEmergency = cluster.isEmergency;
    const count = cluster.reports.length;
    
    // Use cluster icon if multiple reports, otherwise use individual icon
    let icon: google.maps.Icon;
    
    if (count > 1) {
      icon = createClusterIcon(count, isEmergency, cluster.priority);
    } else {
      const report = cluster.reports[0];
      const iconConfig = getEmergencyIconConfig(
        report.emergencyType,
        report.imageAnalysis?.category,
        report.isEmergency,
        cluster.priority
      );
      icon = createAnimatedIcon(iconConfig);
    }

    // Create the marker with fixed positioning
    const marker = new google.maps.Marker({
      position: cluster.coordinates,
      map: mapInstance,
      icon: icon,
      title: count > 1 
        ? `${count} reports at ${cluster.location}${isEmergency ? ' (EMERGENCY)' : ''}`
        : `${cluster.reports[0].isEmergency ? 'EMERGENCY: ' : ''}${cluster.location}`,
      zIndex: isEmergency ? 1000 : 100,
      // Remove bounce animation to prevent dancing
      animation: undefined
    });

    // Add click listener
    marker.addListener('click', () => {
      if (onReportClick) {
        // Show the most important report (first in sorted array)
        onReportClick(cluster.reports[0]);
      }
    });

    // Add hover effects for emergency reports
    if (isEmergency) {
      marker.addListener('mouseover', () => {
        marker.setZIndex(2000);
      });
      
      marker.addListener('mouseout', () => {
        marker.setZIndex(1000);
      });
    }

    // Store marker reference with cluster ID
    const clusterId = `cluster_${cluster.location}`;
    markersRef.current.set(clusterId, marker);

    return marker;
  }, [mapInstance, onReportClick]);

  // Update markers when reports change
  useEffect(() => {
    console.log('🗺️ ReportMapMarkers: Reports changed:', reports.length, 'reports');
    console.log('🗺️ ReportMapMarkers: Map instance:', !!mapInstance);
    
    if (!mapInstance) {
      console.log('❌ ReportMapMarkers: No map instance, skipping marker updates');
      return;
    }
    
    // Remove all existing markers
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current.clear();

    // Create clusters and markers
    const updateMarkers = async () => {
      try {
        // Filter reports by distance first
        const filteredReports = await filterReportsByDistance(reports);
        console.log('📍 Filtered reports within 10km:', filteredReports.length, 'of', reports.length, 'total');

        const clusters = await createLocationClusters(filteredReports);
        console.log('✅ Created clusters:', clusters.length);
        
        for (const cluster of clusters) {
          await createClusterMarker(cluster);
        }
      } catch (error) {
        console.error('❌ Error updating markers:', error);
      }
    };

    updateMarkers();
  }, [reports, mapInstance, createLocationClusters, createClusterMarker, filterReportsByDistance]);

  // Cleanup markers when component unmounts
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current.clear();
    };
  }, []);

  // Debug: Log component render
  console.log('🗺️ ReportMapMarkers component rendered with', reports.length, 'reports');
  
  return null; // This component doesn't render anything visible
} 