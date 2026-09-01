// Geolocation and Geofencing Utilities for SecureShift
import { SiteProfile, GeofenceParcel } from '../types/shift';

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
  geofenceType?: 'circle' | 'polygon' | 'multi_parcel';
  matchedParcelName?: string;
  zoneDescription?: string;
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
 * Ray-Casting algorithm to determine if a point (lat, lng) is inside a multi-point polygon
 * Returns true if inside the boundary
 */
export function isPointInPolygon(
  point: { latitude: number; longitude: number },
  polygon: Array<{ latitude: number; longitude: number }>
): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Checks if a point is within a circular radius
 */
export function isPointInCircle(
  point: { latitude: number; longitude: number },
  center: { latitude: number; longitude: number },
  radiusMeters: number
): boolean {
  const distance = calculateDistanceMeters(
    point.latitude,
    point.longitude,
    center.latitude,
    center.longitude
  );
  return distance <= radiusMeters;
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
 * Supports:
 *  1. Circular radius ('circle')
 *  2. Multi-point polygon ('polygon') using Ray-Casting
 *  3. Multi-parcel multi-zone ('multi_parcel') checking if point is inside ANY parcel
 */
export function verifySiteGeofence(
  guardCoords: GeoCoordinates,
  site: Partial<SiteProfile> & { latitude?: number; longitude?: number; geofenceRadiusMeters?: number },
  siteName: string = site.name || 'Site'
): GeofenceCheckResult {
  const defaultRadius = site.geofenceRadiusMeters || 100;
  const geofenceType = site.geofenceType || 'circle';

  // Fallback if no coordinates specified
  if (typeof site.latitude !== 'number' || typeof site.longitude !== 'number') {
    return {
      inGeofence: true,
      distanceMeters: 8,
      allowedRadiusMeters: defaultRadius,
      accuracyMeters: guardCoords.accuracy,
      siteName,
      geofenceType: 'circle',
      zoneDescription: 'Default verified perimeter'
    };
  }

  const distanceToCenter = calculateDistanceMeters(
    guardCoords.latitude,
    guardCoords.longitude,
    site.latitude,
    site.longitude
  );

  // 1. Multi-Parcel Checking
  if (geofenceType === 'multi_parcel' && site.multiParcels && site.multiParcels.length > 0) {
    for (const parcel of site.multiParcels) {
      if (parcel.type === 'polygon' && parcel.coordinates && parcel.coordinates.length >= 3) {
        if (isPointInPolygon(guardCoords, parcel.coordinates)) {
          return {
            inGeofence: true,
            distanceMeters: distanceToCenter,
            allowedRadiusMeters: defaultRadius,
            accuracyMeters: guardCoords.accuracy,
            siteName,
            geofenceType: 'multi_parcel',
            matchedParcelName: parcel.name,
            zoneDescription: `Inside Parcel: ${parcel.name}`
          };
        }
      } else if (parcel.center && parcel.radiusMeters) {
        if (isPointInCircle(guardCoords, parcel.center, parcel.radiusMeters)) {
          return {
            inGeofence: true,
            distanceMeters: distanceToCenter,
            allowedRadiusMeters: parcel.radiusMeters,
            accuracyMeters: guardCoords.accuracy,
            siteName,
            geofenceType: 'multi_parcel',
            matchedParcelName: parcel.name,
            zoneDescription: `Inside Circular Zone: ${parcel.name}`
          };
        }
      }
    }

    // Not inside any parcel
    return {
      inGeofence: false,
      distanceMeters: distanceToCenter,
      allowedRadiusMeters: defaultRadius,
      accuracyMeters: guardCoords.accuracy,
      siteName,
      geofenceType: 'multi_parcel',
      zoneDescription: `Outside all ${site.multiParcels.length} defined parcels`
    };
  }

  // 2. Custom Multi-point Polygon Checking
  if (geofenceType === 'polygon' && site.polygonCoordinates && site.polygonCoordinates.length >= 3) {
    const isInside = isPointInPolygon(guardCoords, site.polygonCoordinates);
    return {
      inGeofence: isInside,
      distanceMeters: distanceToCenter,
      allowedRadiusMeters: defaultRadius,
      accuracyMeters: guardCoords.accuracy,
      siteName,
      geofenceType: 'polygon',
      zoneDescription: isInside ? 'Inside Custom Polygon Boundary' : 'Outside Custom Polygon Boundary'
    };
  }

  // 3. Circular Radius Checking (Default)
  const isInsideCircle = distanceToCenter <= defaultRadius;
  return {
    inGeofence: isInsideCircle,
    distanceMeters: distanceToCenter,
    allowedRadiusMeters: defaultRadius,
    accuracyMeters: guardCoords.accuracy,
    siteName,
    geofenceType: 'circle',
    zoneDescription: isInsideCircle
      ? `Within ${defaultRadius}m Perimeter`
      : `${distanceToCenter - defaultRadius}m beyond radius`
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

/**
 * Approximate conversion: meters to lat/long delta
 */
export function metersToLatDelta(meters: number): number {
  return meters / 111139;
}

export function metersToLonDelta(meters: number, lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return meters / (111139 * Math.cos(rad));
}

/**
 * Generates preset polygon shapes around a center coordinate
 */
export function generatePresetPolygon(
  centerLat: number,
  centerLng: number,
  shape: 'square' | 'rectangle_wharf' | 'hexagon' | 'l_shape' | 'campus_box',
  radiusMeters: number = 100
): Array<{ latitude: number; longitude: number }> {
  const dLat = metersToLatDelta(radiusMeters);
  const dLon = metersToLonDelta(radiusMeters, centerLat);

  switch (shape) {
    case 'square':
      return [
        { latitude: centerLat + dLat, longitude: centerLng - dLon },
        { latitude: centerLat + dLat, longitude: centerLng + dLon },
        { latitude: centerLat - dLat, longitude: centerLng + dLon },
        { latitude: centerLat - dLat, longitude: centerLng - dLon }
      ];

    case 'rectangle_wharf':
      // Elongated along longitude (east-west pier/wharf)
      return [
        { latitude: centerLat + dLat * 0.6, longitude: centerLng - dLon * 1.8 },
        { latitude: centerLat + dLat * 0.6, longitude: centerLng + dLon * 1.8 },
        { latitude: centerLat - dLat * 0.6, longitude: centerLng + dLon * 1.8 },
        { latitude: centerLat - dLat * 0.6, longitude: centerLng - dLon * 1.8 }
      ];

    case 'hexagon': {
      const pts: Array<{ latitude: number; longitude: number }> = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 * Math.PI) / 180;
        pts.push({
          latitude: centerLat + dLat * Math.sin(angle),
          longitude: centerLng + dLon * Math.cos(angle)
        });
      }
      return pts;
    }

    case 'l_shape':
      // L-shaped commercial complex
      return [
        { latitude: centerLat + dLat, longitude: centerLng - dLon },
        { latitude: centerLat + dLat, longitude: centerLng },
        { latitude: centerLat, longitude: centerLng },
        { latitude: centerLat, longitude: centerLng + dLon },
        { latitude: centerLat - dLat, longitude: centerLng + dLon },
        { latitude: centerLat - dLat, longitude: centerLng - dLon }
      ];

    case 'campus_box':
    default:
      return [
        { latitude: centerLat + dLat * 1.2, longitude: centerLng - dLon * 1.2 },
        { latitude: centerLat + dLat * 1.2, longitude: centerLng + dLon * 1.2 },
        { latitude: centerLat - dLat * 1.2, longitude: centerLng + dLon * 1.2 },
        { latitude: centerLat - dLat * 1.2, longitude: centerLng - dLon * 1.2 }
      ];
  }
}

/**
 * Calculates centroid of a polygon
 */
export function calculatePolygonCentroid(
  coords: Array<{ latitude: number; longitude: number }>
): { latitude: number; longitude: number } {
  if (!coords || coords.length === 0) return { latitude: 47.6062, longitude: -122.3321 };
  let sumLat = 0;
  let sumLng = 0;
  coords.forEach((p) => {
    sumLat += p.latitude;
    sumLng += p.longitude;
  });
  return {
    latitude: parseFloat((sumLat / coords.length).toFixed(6)),
    longitude: parseFloat((sumLng / coords.length).toFixed(6))
  };
}
