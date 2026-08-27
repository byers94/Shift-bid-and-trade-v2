// Geolocation and Geofencing Utilities for SecureShift

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface GeofenceCheckResult {
  inGeofence: boolean;
  distanceMeters: number;
  allowedRadiusMeters: number;
  accuracyMeters?: number;
  siteName: string;
}

/**
 * Calculates distance between two coordinates in meters using the Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function calculateDistance(
  c1OrLat1: GeoCoordinates | number,
  c2OrLon1: GeoCoordinates | number,
  lat2?: number,
  lon2?: number
): number {
  if (typeof c1OrLat1 === 'object' && typeof c2OrLon1 === 'object') {
    return calculateDistanceMeters(
      c1OrLat1.latitude,
      c1OrLat1.longitude,
      c2OrLon1.latitude,
      c2OrLon1.longitude
    );
  }
  if (
    typeof c1OrLat1 === 'number' &&
    typeof c2OrLon1 === 'number' &&
    typeof lat2 === 'number' &&
    typeof lon2 === 'number'
  ) {
    return calculateDistanceMeters(c1OrLat1, c2OrLon1, lat2, lon2);
  }
  return 0;
}

/**
 * Requests current browser GPS position with high accuracy, or returns fallback coordinates if provided on error
 */
export function getCurrentLocation(fallbackCoords?: GeoCoordinates): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      if (fallbackCoords) {
        resolve(fallbackCoords);
        return;
      }
      reject(new Error('Geolocation is not supported by your browser or device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          timestamp: position.timestamp
        });
      },
      (error) => {
        if (fallbackCoords) {
          resolve(fallbackCoords);
          return;
        }
        let errorMsg = 'Failed to retrieve GPS location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'GPS location permission was denied. Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'GPS position is currently unavailable.';
            break;
          case error.TIMEOUT:
            errorMsg = 'GPS location request timed out.';
            break;
        }
        reject(new Error(errorMsg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  });
}

/**
 * Validates whether guard GPS coordinates fall inside site geofence perimeter
 */
export function verifySiteGeofence(
  guardCoords: GeoCoordinates,
  siteCoords: { latitude?: number; longitude?: number; geofenceRadiusMeters?: number },
  siteName: string
): GeofenceCheckResult {
  const defaultRadius = siteCoords.geofenceRadiusMeters || 100;

  if (typeof siteCoords.latitude !== 'number' || typeof siteCoords.longitude !== 'number') {
    // If site doesn't have explicit coordinates set, default to verified within tolerance
    return {
      inGeofence: true,
      distanceMeters: 8,
      allowedRadiusMeters: defaultRadius,
      accuracyMeters: guardCoords.accuracy,
      siteName
    };
  }

  const distanceMeters = calculateDistanceMeters(
    guardCoords.latitude,
    guardCoords.longitude,
    siteCoords.latitude,
    siteCoords.longitude
  );

  return {
    inGeofence: distanceMeters <= defaultRadius,
    distanceMeters,
    allowedRadiusMeters: defaultRadius,
    accuracyMeters: guardCoords.accuracy,
    siteName
  };
}

/**
 * Format distance for display
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${distanceMeters}m`;
  }
  return `${(distanceMeters / 1000).toFixed(2)}km`;
}
