'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Report } from '@/hooks/useReportsRealtime';
import { getEmergencyIconConfig, createAnimatedIcon } from '@/utils/emergencyIcons';

interface ReportMapMarkersProps {
  reports: Report[];
  mapInstance: google.maps.Map | null;
  onReportClick?: (report: Report) => void;
}

export function ReportMapMarkers({ reports, mapInstance, onReportClick }: ReportMapMarkersProps) {
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);

  // Initialize geocoder
  useEffect(() => {
    if (typeof google !== 'undefined' && google.maps && !geocoder) {
      setGeocoder(new google.maps.Geocoder());
    }
  }, [geocoder]);

  // Geocode location to get coordinates
  const geocodeLocation = useCallback(async (location: string): Promise<{ lat: number; lng: number } | null> => {
    if (!geocoder) return null;

    try {
      const result = await geocoder.geocode({ address: location });
      if (result.results && result.results.length > 0) {
        const { lat, lng } = result.results[0].geometry.location;
        return { lat: lat(), lng: lng() };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  }, [geocoder]);

  // Create marker for a report
  const createReportMarker = useCallback(async (report: Report) => {
    if (!mapInstance) return;

    // Geocode the location to get coordinates
    const coordinates = await geocodeLocation(report.location);
    if (!coordinates) {
      console.warn('Could not geocode location:', report.location);
      return;
    }

    // Get icon configuration based on emergency type and category
    const iconConfig = getEmergencyIconConfig(
      report.emergencyType,
      report.imageAnalysis?.category
    );

    // Create the marker
    const marker = new google.maps.Marker({
      position: coordinates,
      map: mapInstance,
      icon: createAnimatedIcon(iconConfig),
      title: `${report.isEmergency ? 'EMERGENCY: ' : ''}${report.location}`,
      zIndex: report.isEmergency ? 1000 : 100
    });

    // Add click listener
    marker.addListener('click', () => {
      if (onReportClick) {
        onReportClick(report);
      }
    });

    // Store marker reference
    markersRef.current.set(report.id, marker);

    return marker;
  }, [mapInstance, geocodeLocation, onReportClick]);

  // Update markers when reports change
  useEffect(() => {
    if (!mapInstance) return;

    // Remove markers for reports that no longer exist
    const currentReportIds = new Set(reports.map(r => r.id));
    const existingMarkerIds = Array.from(markersRef.current.keys());

    existingMarkerIds.forEach(markerId => {
      if (!currentReportIds.has(markerId)) {
        const marker = markersRef.current.get(markerId);
        if (marker) {
          marker.setMap(null);
          markersRef.current.delete(markerId);
        }
      }
    });

    // Add markers for new reports
    reports.forEach(async (report) => {
      if (!markersRef.current.has(report.id)) {
        await createReportMarker(report);
      }
    });
  }, [reports, mapInstance, createReportMarker]);

  // Cleanup markers when component unmounts
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current.clear();
    };
  }, []);

  return null; // This component doesn't render anything visible
} 