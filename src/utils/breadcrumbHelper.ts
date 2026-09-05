import { GpsBreadcrumb, ScheduledShift, SiteProfile } from '../types/shift';
import { calculateDistanceMeters } from './geo';

/**
 * Calculates summary metrics from a series of GPS breadcrumbs
 */
export interface BreadcrumbTrailMetrics {
  totalPoints: number;
  totalDistanceMeters: number;
  totalDistanceFormatted: string;
  patrolDurationMinutes: number;
  inGeofencePoints: number;
  outOfGeofencePoints: number;
  complianceRatePct: number;
  averageSpeedKmh: number;
  backgroundPointsCount: number;
  backgroundPercentage: number;
  batteryDrainPct: number;
  startBatteryPct?: number;
  currentBatteryPct?: number;
  breachPointsCount: number;
  startTimeIso?: string;
  lastTimeIso?: string;
}

export function calculateBreadcrumbMetrics(breadcrumbs: GpsBreadcrumb[] = []): BreadcrumbTrailMetrics {
  if (breadcrumbs.length === 0) {
    return {
      totalPoints: 0,
      totalDistanceMeters: 0,
      totalDistanceFormatted: '0 m',
      patrolDurationMinutes: 0,
      inGeofencePoints: 0,
      outOfGeofencePoints: 0,
      complianceRatePct: 100,
      averageSpeedKmh: 0,
      backgroundPointsCount: 0,
      backgroundPercentage: 0,
      batteryDrainPct: 0,
      breachPointsCount: 0
    };
  }

  let totalDist = 0;
  let inGeofenceCount = 0;
  let outOfGeofenceCount = 0;
  let backgroundCount = 0;
  let breachCount = 0;

  for (let i = 0; i < breadcrumbs.length; i++) {
    const pt = breadcrumbs[i];
    if (pt.inGeofence) {
      inGeofenceCount++;
    } else {
      outOfGeofenceCount++;
    }

    if (pt.isBackground) {
      backgroundCount++;
    }

    if (pt.status === 'breached' || pt.status === 'debounce_pending') {
      breachCount++;
    }

    if (i > 0) {
      const prev = breadcrumbs[i - 1];
      const dist = calculateDistanceMeters(prev.latitude, prev.longitude, pt.latitude, pt.longitude);
      // Filter out unreasonable GPS teleportation glitches > 200m per 30s
      if (dist <= 250) {
        totalDist += dist;
      }
    }
  }

  const firstPt = breadcrumbs[0];
  const lastPt = breadcrumbs[breadcrumbs.length - 1];
  const durationMs = Math.max(0, new Date(lastPt.timestamp).getTime() - new Date(firstPt.timestamp).getTime());
  const durationMins = Math.max(1, Math.round(durationMs / 60000));
  const durationHours = durationMins / 60;

  const totalDistanceKm = totalDist / 1000;
  const averageSpeedKmh = durationHours > 0 ? Number((totalDistanceKm / durationHours).toFixed(1)) : 0;

  const complianceRatePct = breadcrumbs.length > 0 
    ? Number(((inGeofenceCount / breadcrumbs.length) * 100).toFixed(1))
    : 100;

  const backgroundPercentage = breadcrumbs.length > 0
    ? Number(((backgroundCount / breadcrumbs.length) * 100).toFixed(0))
    : 0;

  const startBattery = firstPt.batteryLevel ?? 98;
  const endBattery = lastPt.batteryLevel ?? 85;
  const batteryDrain = Math.max(0, startBattery - endBattery);

  const formattedDist = totalDist < 1000 ? `${Math.round(totalDist)} m` : `${(totalDist / 1000).toFixed(2)} km`;

  return {
    totalPoints: breadcrumbs.length,
    totalDistanceMeters: Math.round(totalDist),
    totalDistanceFormatted: formattedDist,
    patrolDurationMinutes: durationMins,
    inGeofencePoints: inGeofenceCount,
    outOfGeofencePoints: outOfGeofenceCount,
    complianceRatePct,
    averageSpeedKmh,
    backgroundPointsCount: backgroundCount,
    backgroundPercentage,
    batteryDrainPct: batteryDrain,
    startBatteryPct: startBattery,
    currentBatteryPct: endBattery,
    breachPointsCount: breachCount,
    startTimeIso: firstPt.timestamp,
    lastTimeIso: lastPt.timestamp
  };
}

/**
 * Generates synthetic but realistic 30-second interval GPS breadcrumbs around a site center.
 * Simulates foot patrols, gate inspections, checkpoints, and occasional dwell stops.
 */
export function generateSyntheticShiftBreadcrumbs(options: {
  centerLat: number;
  centerLng: number;
  startTime: string; // ISO
  endTime?: string; // ISO or now
  totalPoints?: number; // e.g. 24 points (12 minutes) or 40 points
  hasPerimeterBreach?: boolean;
  siteRadiusMeters?: number;
  guardName?: string;
  startBattery?: number;
}): GpsBreadcrumb[] {
  const {
    centerLat,
    centerLng,
    startTime,
    siteRadiusMeters = 100,
    hasPerimeterBreach = false,
    startBattery = 96
  } = options;

  const startMs = new Date(startTime).getTime();
  const pointsCount = options.totalPoints || 30; // 30 points = 15 minutes of 30-sec intervals
  const breadcrumbs: GpsBreadcrumb[] = [];

  let curLat = centerLat;
  let curLng = centerLng;
  let currentAngle = Math.random() * Math.PI * 2;
  let currentBattery = startBattery;

  const checkPoints = [
    'Main Lobby Entrance',
    'North Perimeter Gate',
    'Loading Dock Berth',
    'East Courtyard Walkway',
    'Emergency Exit Corridor',
    'South Fence Checkpoint'
  ];

  for (let i = 0; i < pointsCount; i++) {
    const timestampMs = startMs + i * 30 * 1000;
    const timestampIso = new Date(timestampMs).toISOString();

    // Natural patrol path evolution: gradual wandering around perimeter
    currentAngle += (Math.random() - 0.5) * 0.8;
    
    // Distance from center: usually within 10m to (siteRadiusMeters - 15m)
    let patrolRadius = 20 + Math.sin(i * 0.4) * (siteRadiusMeters * 0.65);
    let isOutOfBounds = false;
    let status: GpsBreadcrumb['status'] = 'on_duty';

    // If simulating breach for this guard, move points outside boundary on latter half
    if (hasPerimeterBreach && i >= pointsCount - 6) {
      patrolRadius = siteRadiusMeters + 30 + (i - (pointsCount - 6)) * 25;
      isOutOfBounds = true;
      status = i >= pointsCount - 2 ? 'breached' : 'debounce_pending';
    }

    // Convert meters to lat/lng offset
    const latOffset = (patrolRadius * Math.cos(currentAngle)) / 111111;
    const lngOffset = (patrolRadius * Math.sin(currentAngle)) / (111111 * Math.cos((centerLat * Math.PI) / 180));

    curLat = Number((centerLat + latOffset).toFixed(6));
    curLng = Number((centerLng + lngOffset).toFixed(6));

    // Realistic walking speed: 0.8 to 1.6 m/s (approx 3 to 5.5 km/h)
    const speed = isOutOfBounds ? 2.1 : Number((0.9 + Math.random() * 0.7).toFixed(1));
    const heading = Math.round(((currentAngle * 180) / Math.PI + 360) % 360);
    const accuracy = Math.round(3 + Math.random() * 4); // 3m to 7m accuracy

    // Realistic battery drain: 1% every ~40-60 points
    if (i % 35 === 0 && currentBattery > 15) {
      currentBattery -= 1;
    }

    // Simulate 75% of time device is in pocket/holster with screen off (isBackground)
    const isBackground = (i % 4 !== 0);

    const checkpointName = (i % 6 === 0) ? checkPoints[(i / 6) % checkPoints.length] : undefined;

    breadcrumbs.push({
      id: `crumb-${startMs}-${i}`,
      latitude: curLat,
      longitude: curLng,
      accuracy,
      timestamp: timestampIso,
      speed,
      heading,
      inGeofence: !isOutOfBounds,
      distanceMeters: Math.round(patrolRadius),
      status,
      batteryLevel: currentBattery,
      isBackground,
      recordedIntervalSec: 30,
      source: i % 10 === 0 ? 'patrol_checkpoint' : 'watch_position',
      parcelOrCheckpointName: checkpointName
    });
  }

  return breadcrumbs;
}
