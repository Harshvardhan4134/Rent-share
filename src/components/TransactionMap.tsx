import React, { useEffect, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { MapPin, User, Navigation, RefreshCw } from 'lucide-react';
import { Transaction, User as UserType, updateUserLocation } from '@/lib/firestore';
import { auth } from '@/lib/firebase';

interface TransactionMapProps {
  transaction: Transaction;
  owner: UserType | null;
  renter: UserType | null;
  center?: google.maps.LatLngLiteral;
  zoom?: number;
}

interface TransactionMapComponentProps extends TransactionMapProps {
  apiKey: string;
}

const TransactionMapComponent: React.FC<TransactionMapComponentProps> = ({ 
  transaction,
  owner,
  renter,
  center = { lat: 37.7749, lng: -122.4194 }, 
  zoom = 12 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow>();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get user's current location
  const updateLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        setIsGettingLocation(false);
        
        // Update user location in database
        if (auth.currentUser) {
          try {
            await updateUserLocation(
              auth.currentUser.uid,
              position.coords.latitude,
              position.coords.longitude
            );
            console.log('Location updated successfully:', location);
          } catch (error) {
            console.error('Error updating user location:', error);
          }
        }
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setLocationError(errorMessage);
        console.error('Error getting user location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );
  };

  useEffect(() => {
    updateLocation();
  }, []);

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center: userLocation || center,
        zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });
      setMap(newMap);
      setInfoWindow(new window.google.maps.InfoWindow());
    }
  }, [ref, map, center, zoom, userLocation]);

  useEffect(() => {
    if (map && infoWindow) {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      const newMarkers: google.maps.Marker[] = [];

      // Add user's current location marker
      if (userLocation) {
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

      // Add owner location marker (if available)
      if (owner?.location) {
        const ownerMarker = new google.maps.Marker({
          position: {
            lat: owner.location.latitude,
            lng: owner.location.longitude
          },
          map,
          title: `${owner.name} (Owner)`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
                <text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="bold">O</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20)
          }
        });

        ownerMarker.addListener('click', () => {
          const content = `
            <div style="padding: 8px; min-width: 150px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 12px; height: 12px; background: #3b82f6; border-radius: 50%;"></div>
                <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">${owner.name}</h3>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">
                Item Owner
              </p>
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.open(map, ownerMarker);
        });

        newMarkers.push(ownerMarker);
      }

      // Add renter location marker (if available)
      if (renter?.location) {
        const renterMarker = new google.maps.Marker({
          position: {
            lat: renter.location.latitude,
            lng: renter.location.longitude
          },
          map,
          title: `${renter.name} (Renter)`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#f59e0b" stroke="#ffffff" stroke-width="2"/>
                <text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="bold">R</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20)
          }
        });

        renterMarker.addListener('click', () => {
          const content = `
            <div style="padding: 8px; min-width: 150px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 12px; height: 12px; background: #f59e0b; border-radius: 50%;"></div>
                <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">${renter.name}</h3>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">
                Item Renter
              </p>
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.open(map, renterMarker);
        });

        newMarkers.push(renterMarker);
      }

      setMarkers(newMarkers);
    }
  }, [map, infoWindow, userLocation, owner, renter]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <div ref={ref} style={{ height: '100%', width: '100%' }} />
      
      {/* Location Status Indicator */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${userLocation ? 'bg-green-500' : locationError ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
          <span className="text-sm font-medium">
            {userLocation ? 'Live Location Active' : locationError ? 'Location Error' : 'Getting Location...'}
          </span>
        </div>
        {userLocation && (
          <p className="text-xs text-gray-600">
            Lat: {userLocation.lat.toFixed(6)}, Lng: {userLocation.lng.toFixed(6)}
          </p>
        )}
        {locationError && (
          <p className="text-xs text-red-600">{locationError}</p>
        )}
        {isGettingLocation && (
          <p className="text-xs text-blue-600">Requesting location access...</p>
        )}
        {locationError && locationError.includes('denied') && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <p className="text-yellow-800 font-medium">Location Access Required</p>
            <p className="text-yellow-700 mt-1">
              1. Click the refresh button above<br/>
              2. Allow location access when prompted<br/>
              3. Your live location will appear on the map
            </p>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={updateLocation}
        disabled={isGettingLocation}
        className={`absolute top-4 right-4 bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-full shadow-lg border border-gray-200 transition-colors ${
          isGettingLocation ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="Update Location"
      >
        <RefreshCw className={`h-4 w-4 ${isGettingLocation ? 'animate-spin' : ''}`} />
      </button>
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

const TransactionMap: React.FC<TransactionMapProps> = (props) => {
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
      <TransactionMapComponent {...props} apiKey={apiKey} />
    </Wrapper>
  );
};

export default TransactionMap;
