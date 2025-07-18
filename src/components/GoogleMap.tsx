'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  onMapLoad?: (map: google.maps.Map) => void;
  directionsRenderer?: google.maps.DirectionsRenderer | null;
}

export default function GoogleMap({ 
  center = { lat: 20.5937, lng: 78.9629 }, // India center
  zoom = 5,
  onMapLoad,
  directionsRenderer
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Memoize the onMapLoad callback
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    if (onMapLoad) {
      onMapLoad(map);
    }
  }, [onMapLoad]);

  // Set directions renderer on map when it changes
  useEffect(() => {
    if (directionsRenderer && mapInstanceRef.current) {
      directionsRenderer.setMap(mapInstanceRef.current);
    }
  }, [directionsRenderer]);

  // Handle client-side rendering to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only initialize if map doesn't exist, ref is available, and we're on client
    if (mapInstanceRef.current || !mapRef.current || !isClient) {
      return;
    }

    const initMap = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const mapId = process.env.NEXT_PUBLIC_MAP_ID || 'DEMO_MAP_ID';
      
      if (!apiKey) {
        console.error('Google Maps API key is not configured');
        return;
      }

      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places', 'marker'] // Added marker library
      });

      try {
        const google = await loader.load();
        
        if (mapRef.current && !mapInstanceRef.current) {
          // Create map options after Google Maps API is loaded
          const mapOptions = {
            center,
            zoom,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_CENTER
            },
            mapTypeControl: true,
            mapTypeControlOptions: {
              position: google.maps.ControlPosition.BOTTOM_LEFT,
              style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR
            },
            scaleControl: true,
            streetViewControl: true,
            streetViewControlOptions: {
              position: google.maps.ControlPosition.RIGHT_CENTER
            },
            rotateControl: true,
            fullscreenControl: true,
            fullscreenControlOptions: {
              position: google.maps.ControlPosition.RIGHT_TOP
            },
            mapId // Use environment variable
          };

          const map = new google.maps.Map(mapRef.current, mapOptions);
          mapInstanceRef.current = map;

          // Import the marker library for advanced markers
          const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

          // Add a custom advanced marker for India
          new AdvancedMarkerElement({
            map: map,
            position: center,
            title: 'India',
            content: new google.maps.marker.PinElement({
              background: '#556B2F',
              borderColor: '#ffffff',
              glyphColor: '#ffffff',
              scale: 1.2
            }).element
          });

          // Add custom CSS for map type controls only once
          if (!document.querySelector('#geocity-map-styles')) {
            const style = document.createElement('style');
            style.id = 'geocity-map-styles';
            style.textContent = `
              .gmnoprint .gm-style-mtc {
                font-size: 11px !important;
                font-family: 'Roboto', Arial, sans-serif !important;
                margin-left: 10px !important;
                margin-bottom: 20px !important;
              }
              .gmnoprint .gm-style-mtc button {
                font-size: 11px !important;
                padding: 6px 12px !important;
                background: white !important;
                border: 1px solid var(--color-border) !important;
                border-radius: 6px !important;
                box-shadow: 0 2px 8px var(--color-shadow) !important;
                color: black !important;
                cursor: pointer !important;
              }
              .gmnoprint .gm-style-mtc button:hover {
                border-color: var(--color-accent) !important;
              }
              .gmnoprint .gm-style-mtc button:first-child {
                border-bottom-right-radius: 0 !important;
                border-top-right-radius: 0 !important;
              }
              .gmnoprint .gm-style-mtc button:last-child {
                border-bottom-left-radius: 0 !important;
                border-top-left-radius: 0 !important;
                border-left: none !important;
              }
              .gmnoprint .gm-style-mtc button[aria-pressed="true"],
              .gmnoprint .gm-style-mtc button[aria-selected="true"],
              .gmnoprint .gm-style-mtc button.selected {
                background: var(--color-accent) !important;
                color: white !important;
                border-color: var(--color-accent) !important;
              }
            `;
            document.head.appendChild(style);
          }

          handleMapLoad(map);
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        // Show a user-friendly error message
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; color: #6c757d; font-family: Arial, sans-serif;">
              <div style="text-align: center; padding: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #495057;">Map Loading Error</h3>
                <p style="margin: 0; font-size: 14px;">Unable to load Google Maps. Please check your internet connection and try again.</p>
              </div>
            </div>
          `;
        }
      }
    };

    initMap();
  }, [center, zoom, handleMapLoad, isClient]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full"
      style={{ minHeight: '100vh' }}
    />
  );
} 