import React, { useEffect, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { MapPin, RefreshCw } from 'lucide-react';
import { Listing } from '@/lib/firestore';

interface LiveMapProps {
  listings: Listing[];
  onListingSelect?: (listing: Listing) => void;
  userLocation?: { lat: number; lng: number } | null;
  onLocationUpdate?: () => void;
  center?: google.maps.LatLngLiteral;
  zoom?: number;
}

interface LiveMapComponentProps extends LiveMapProps {
  apiKey: string;
}

const LiveMapComponent: React.FC<LiveMapComponentProps> = ({ 
  listings, 
  onListingSelect,
  userLocation,
  onLocationUpdate,
  center = { lat: 37.7749, lng: -122.4194 }, 
  zoom = 12 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow>();

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center: userLocation || center,
        zoom: userLocation ? 15 : zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        // Remove default Google controls (Pegman/Street View, compass, etc.)
        disableDefaultUI: true,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        zoomControl: false,
        rotateControl: false,
      });
      setMap(newMap);
      setInfoWindow(new window.google.maps.InfoWindow());
    }
  }, [ref, map, center, zoom, userLocation]);

  // Recenter the map when userLocation changes
  useEffect(() => {
    if (map && userLocation) {
      map.setZoom(Math.max(map.getZoom() || 0, 15));
      map.panTo(userLocation);
    }
  }, [map, userLocation]);

  useEffect(() => {
    if (map && infoWindow) {
      console.log('LiveMap: Updating markers, userLocation:', userLocation);
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      const newMarkers: google.maps.Marker[] = [];

      // Add user's current location marker
      if (userLocation) {
        console.log('Adding user location marker at:', userLocation);
        const userMarker = new google.maps.Marker({
          position: userLocation,
          map,
          title: 'Your Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
                <circle cx="20" cy="20" r="8" fill="#ffffff"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20)
          }
        });

        userMarker.addListener('click', () => {
          const content = `
            <div style="padding: 8px; min-width: 150px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 12px; height: 12px; background: #10b981; border-radius: 50%;"></div>
                <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">Your Location</h3>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">
                Live location from GPS
              </p>
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.open(map, userMarker);
        });

        newMarkers.push(userMarker);
      }

      // Add listing markers
      listings.forEach((listing) => {
        if (listing.location) {
          const marker = new google.maps.Marker({
            position: {
              lat: listing.location.latitude,
              lng: listing.location.longitude
            },
            map,
            title: listing.title,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
                  <path d="M20 8l-4 12h8l-4-12z" fill="#ffffff"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20)
            }
          });

          marker.addListener('click', () => {
            const content = `
              <div style="padding: 8px; min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <img src="${listing.images[0] || '/placeholder.svg'}" 
                       style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" 
                       alt="${listing.title}" />
                  <div>
                    <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">${listing.title}</h3>
                    <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                      <span style="color: #3b82f6; font-weight: 600; font-size: 16px;">₹${listing.rentPerDay}</span>
                      <span style="color: #6b7280; font-size: 12px;">/day</span>
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
                  <span style="background: #f3f4f6; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${listing.category}</span>
                  ${listing.swapAllowed ? '<span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 10px;">SWAP</span>' : ''}
                </div>
                <button onclick="window.viewListingDetails('${listing.id}')" 
                        style="width: 100%; background: #3b82f6; color: white; border: none; padding: 8px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                  View Details
                </button>
              </div>
            `;
            
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
            
            // Add global function for button click
            (window as any).viewListingDetails = (listingId: string) => {
              window.location.href = `/item/${listingId}`;
            };
          });

          newMarkers.push(marker);
        }
      });

      setMarkers(newMarkers);
    }
  }, [map, infoWindow, listings, onListingSelect, userLocation]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <div ref={ref} style={{ height: '100%', width: '100%' }} />
      
      {/* Location Status Indicator */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${userLocation ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-sm font-medium">
            {userLocation ? 'Live Location Active' : 'Location Not Available'}
          </span>
        </div>
        {userLocation && (
          <p className="text-xs text-gray-600">
            Lat: {userLocation.lat.toFixed(6)}, Lng: {userLocation.lng.toFixed(6)}
          </p>
        )}
        {!userLocation && (
          <p className="text-xs text-yellow-600">Click "Update Location" to enable</p>
        )}
      </div>

      {/* Refresh Button */}
      {onLocationUpdate && (
        <button
          onClick={onLocationUpdate}
          className="absolute top-4 right-4 bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-full shadow-lg border border-gray-200 transition-colors"
          title="Update Location"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load map</p>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const LiveMap: React.FC<LiveMapProps> = (props) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground mb-2">Google Maps API key not configured</p>
          <p className="text-sm text-muted-foreground">
            Please add your Google Maps API key to the .env file
          </p>
        </div>
      </div>
    );
  }

  return (
    <Wrapper apiKey={apiKey} render={render}>
      <LiveMapComponent {...props} apiKey={apiKey} />
    </Wrapper>
  );
};

export default LiveMap;
