'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Report } from '@/hooks/useReportsRealtime';
import { getEmergencyIconConfig, createAnimatedIcon, createClusterIcon } from '@/utils/emergencyIcons';

interface ReportMapMarkersProps {
  reports: Report[];
  mapInstance: google.maps.Map | null;
  onReportClick?: (report: Report, allReports?: Report[]) => void;
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
  const [currentZoom, setCurrentZoom] = useState<number>(5);

  // Track map zoom level for clustering
  useEffect(() => {
    if (!mapInstance) return;

    const updateZoom = () => {
      const zoom = mapInstance.getZoom();
      if (zoom !== undefined) {
        setCurrentZoom(zoom);
      }
    };

    // Update zoom on map changes
    const zoomChangedListener = mapInstance.addListener('zoom_changed', updateZoom);
    const boundsChangedListener = mapInstance.addListener('bounds_changed', updateZoom);
    
    // Initial zoom
    updateZoom();

    return () => {
      google.maps.event.removeListener(zoomChangedListener);
      google.maps.event.removeListener(boundsChangedListener);
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

  // Get coordinates from report (use stored coordinates if available, fallback to geocoding)
  const getReportCoordinates = useCallback(async (report: Report): Promise<{ lat: number; lng: number } | null> => {
    // First, try to use stored coordinates from the database
    if (report.coordinates && report.coordinates.lat && report.coordinates.lng) {
      console.log('📍 Using stored coordinates for report:', report.id, report.coordinates);
      return { lat: report.coordinates.lat, lng: report.coordinates.lng };
    }

    // Fallback: geocode the location string (for backward compatibility with old reports)
    if (report.location) {
      try {
        console.log('📍 Geocoding location for report:', report.id, report.location);
        
        if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
          const geocoder = new google.maps.Geocoder();
          const result = await geocoder.geocode({ address: report.location });
          
          if (result.results && result.results.length > 0) {
            const { lat, lng } = result.results[0].geometry.location;
            console.log('📍 Geocoded location:', report.location, 'to:', { lat: lat(), lng: lng() });
            return { lat: lat(), lng: lng() };
          }
        }
      } catch (error) {
        console.warn('⚠️ Error geocoding location for report:', report.id, error);
      }
    }

    console.warn('⚠️ No coordinates available for report:', report.id);
    return null;
  }, []);

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
      const coordinates = await getReportCoordinates(locationReports[0]);
      if (coordinates) {
        // Sort reports by priority (emergency first, then by creation time)
        const sortedReports = locationReports.sort((a, b) => {
          if (a.isEmergency && !b.isEmergency) return -1;
          if (!a.isEmergency && b.isEmergency) return 1;
          return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
        });
        
        // Determine if any report in cluster is emergency
        const isEmergency = sortedReports.some(r => r.isEmergency);
        const emergencyType = sortedReports.find(r => r.isEmergency)?.emergencyType;
        
        // Determine priority for non-emergency reports
        let priority: string | undefined;
        if (!isEmergency) {
          // Use AI analysis category to determine priority
          const reportWithAnalysis = sortedReports.find(r => r.imageAnalysis);
          if (reportWithAnalysis?.imageAnalysis?.category) {
            switch (reportWithAnalysis.imageAnalysis.category) {
              case 'DANGER':
                priority = 'high';
                break;
              case 'WARNING':
                priority = 'medium';
                break;
              case 'SAFE':
                priority = 'safe';
                break;
              default:
                priority = 'low';
            }
          } else {
            priority = 'medium'; // Default priority
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
    
    // If zoom level is low (zoomed out), we might want to cluster nearby locations
    if (currentZoom <= 8 && clusters.length > 1) {
      return clusterNearbyLocations(clusters);
    }
    
    return clusters;
  }, [getReportCoordinates, currentZoom]);

  // Function to cluster nearby locations when zoomed out
  const clusterNearbyLocations = useCallback((clusters: LocationCluster[]): LocationCluster[] => {
    const clustered: LocationCluster[] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < clusters.length; i++) {
      if (processed.has(i)) continue;
      
      const cluster = clusters[i];
      const nearbyClusters: LocationCluster[] = [cluster];
      processed.add(i);
      
      // Find nearby clusters (within 50km when zoomed out)
      for (let j = i + 1; j < clusters.length; j++) {
        if (processed.has(j)) continue;
        
        const otherCluster = clusters[j];
        const distance = calculateDistance(
          cluster.coordinates.lat,
          cluster.coordinates.lng,
          otherCluster.coordinates.lat,
          otherCluster.coordinates.lng
        );
        
        if (distance <= 50) { // 50km radius for clustering when zoomed out
          nearbyClusters.push(otherCluster);
          processed.add(j);
        }
      }
      
      if (nearbyClusters.length === 1) {
        // Single cluster, keep as is
        clustered.push(cluster);
      } else {
        // Multiple nearby clusters, merge them
        const allReports = nearbyClusters.flatMap(c => c.reports);
        const isEmergency = allReports.some(r => r.isEmergency);
        const emergencyType = allReports.find(r => r.isEmergency)?.emergencyType;
        
        // Calculate center point of all clusters
        const totalLat = nearbyClusters.reduce((sum, c) => sum + c.coordinates.lat, 0);
        const totalLng = nearbyClusters.reduce((sum, c) => sum + c.coordinates.lng, 0);
        const centerLat = totalLat / nearbyClusters.length;
        const centerLng = totalLng / nearbyClusters.length;
        
        // Sort reports by priority
        const sortedReports = allReports.sort((a, b) => {
          if (a.isEmergency && !b.isEmergency) return -1;
          if (!a.isEmergency && b.isEmergency) return 1;
          return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
        });
        
        clustered.push({
          location: `${nearbyClusters.length} locations`,
          coordinates: { lat: centerLat, lng: centerLng },
          reports: sortedReports,
          isEmergency,
          emergencyType,
          priority: isEmergency ? 'high' : 'medium'
        });
      }
    }
    
    return clustered;
  }, [calculateDistance]);

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
        // Pass all reports from the cluster instead of just the first one
        if (cluster.reports.length > 1) {
          // For multiple reports, pass the entire cluster
          onReportClick(cluster.reports[0], cluster.reports);
        } else {
          // For single report, pass just the report
          onReportClick(cluster.reports[0]);
        }
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
    console.log('🗺️ ReportMapMarkers: Current zoom:', currentZoom);
    
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
        // Use all reports without distance filtering
        console.log('📍 Processing all reports:', reports.length, 'total');

        const clusters = await createLocationClusters(reports);
        console.log('✅ Created clusters:', clusters.length);
        
        for (const cluster of clusters) {
          await createClusterMarker(cluster);
        }
      } catch (error) {
        console.error('❌ Error updating markers:', error);
      }
    };

    updateMarkers();
  }, [reports, mapInstance, createLocationClusters, createClusterMarker, currentZoom, clusterNearbyLocations]);

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