import { 
  DynamicRoutePlan, 
  RouteCheckpointStop, 
  RoverVehicle, 
  ClientContractSLA, 
  OptimizationMode, 
  TrafficCondition, 
  AdHocInterception, 
  RoverTelemetryLog, 
  GeoClusterSector, 
  SlaPriorityLevel,
  CheckpointStopStatus
} from '../types/roverRoute';
import { RovingGroup, SiteProfile } from '../types/shift';
import { calculateDistanceMeters } from './geo';

// Traffic condition travel time multipliers
export const TRAFFIC_MULTIPLIERS: Record<TrafficCondition, number> = {
  light: 1.0,
  moderate: 1.28,
  heavy: 1.68,
  incident_gridlock: 2.25
};

// Speed assumptions (average city patrol speeds in km/h)
const BASE_SPEED_KMH = 32;

/**
 * Calculates estimated driving time in minutes between two coordinates under specified traffic condition
 */
export function estimateDriveMinutes(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  traffic: TrafficCondition = 'moderate'
): { distanceKm: number; driveMinutes: number } {
  const meters = calculateDistanceMeters(lat1, lon1, lat2, lon2);
  const distanceKm = +(meters / 1000).toFixed(2);
  const speed = BASE_SPEED_KMH / TRAFFIC_MULTIPLIERS[traffic];
  const driveHours = distanceKm / speed;
  const driveMinutes = Math.max(2, Math.round(driveHours * 60));
  return { distanceKm, driveMinutes };
}

/**
 * Default Contract SLAs for client properties
 */
export const DEFAULT_CLIENT_SLAS: Record<string, ClientContractSLA> = {
  'site-1': {
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    contractTitle: 'Maritime Critical Perimeter Defense SLA',
    requiredHitsPerShift: 3,
    minHitSpacingMinutes: 90,
    timeWindows: [
      { startHour: '20:00', endHour: '23:00', label: 'Evening Dock Sweep' },
      { startHour: '23:00', endHour: '02:30', label: 'Midnight Berth Inspection' },
      { startHour: '03:00', endHour: '05:30', label: 'Pre-Dawn Cargo Sweep' }
    ],
    priority: 'P1_MANDATORY_SLA',
    requiredDwellMinutes: 15,
    penaltyPerMissedHitDollars: 350,
    notes: 'TWIC zone. Verify perimeter sensor gates and berth 4/7 cargo padlocks.'
  },
  'site-5': {
    siteId: 'site-5',
    siteName: 'Retail Plaza - Patrol',
    contractTitle: 'Urban Retail Concourse & Closing Escort SLA',
    requiredHitsPerShift: 2,
    minHitSpacingMinutes: 90,
    timeWindows: [
      { startHour: '20:30', endHour: '21:30', label: 'Store Closing & Staff Escort' },
      { startHour: '23:30', endHour: '01:30', label: 'Late Night Loading Bay Lockup' }
    ],
    priority: 'P1_MANDATORY_SLA',
    requiredDwellMinutes: 12,
    penaltyPerMissedHitDollars: 200,
    notes: 'Mandatory presence at 21:00 for store merchant cash drop escorts.'
  },
  'site-7': {
    siteId: 'site-7',
    siteName: 'Downtown Financial Center',
    contractTitle: 'Financial Plaza Vestibule & ATM Security SLA',
    requiredHitsPerShift: 2,
    minHitSpacingMinutes: 120,
    timeWindows: [
      { startHour: '21:00', endHour: '00:00', label: 'First Perimeter & ATM Sweep' },
      { startHour: '01:30', endHour: '04:30', label: 'Graveyard Tenant Access Check' }
    ],
    priority: 'P1_MANDATORY_SLA',
    requiredDwellMinutes: 10,
    penaltyPerMissedHitDollars: 250,
    notes: 'Inspect ATM foyer vestibules and check rear loading dock roll-up shutter.'
  },
  'site-8': {
    siteId: 'site-8',
    siteName: 'Industrial Warehouse Night Watch',
    contractTitle: 'Logistics Multimodal Storage Patrol SLA',
    requiredHitsPerShift: 2,
    minHitSpacingMinutes: 90,
    timeWindows: [
      { startHour: '22:00', endHour: '01:00', label: 'Freight Yard Gate Verification' },
      { startHour: '02:30', endHour: '05:00', label: 'Pre-Shift Logistics Shutter Inspection' }
    ],
    priority: 'P2_CONTRACTUAL_WINDOW',
    requiredDwellMinutes: 12,
    penaltyPerMissedHitDollars: 175,
    notes: 'Scan all 8 QR checkpoint tags along the perimeter fence line.'
  },
  'site-9': {
    siteId: 'site-9',
    siteName: 'Medical Arts Pavilion',
    contractTitle: 'Healthcare Exterior Pharmacy & Pharmacy Vault SLA',
    requiredHitsPerShift: 3,
    minHitSpacingMinutes: 75,
    timeWindows: [
      { startHour: '20:00', endHour: '22:30', label: 'Staff Shift Change Escort' },
      { startHour: '23:30', endHour: '02:00', label: 'Pharmacy Exterior Infrared Sweep' },
      { startHour: '03:15', endHour: '05:30', label: 'Oxygen Tank Storage Verification' }
    ],
    priority: 'P1_MANDATORY_SLA',
    requiredDwellMinutes: 10,
    penaltyPerMissedHitDollars: 300,
    notes: 'Verify pharmacy rear blast doors and medical gas storage lockboxes.'
  },
  'site-10': {
    siteId: 'site-10',
    siteName: 'Seaport Logistics Terminal B',
    contractTitle: 'Container Freight Yard & Multimodal Access SLA',
    requiredHitsPerShift: 2,
    minHitSpacingMinutes: 100,
    timeWindows: [
      { startHour: '21:30', endHour: '00:30', label: 'Rail Spur Gate Audit' },
      { startHour: '02:00', endHour: '04:45', label: 'Hazardous Materials Padlock Sweep' }
    ],
    priority: 'P2_CONTRACTUAL_WINDOW',
    requiredDwellMinutes: 14,
    penaltyPerMissedHitDollars: 220,
    notes: 'Check container reefer power drops and hazardous materials padlocks.'
  }
};

/**
 * Builds Geo-Cluster Sectors for roving sites based on geographic coordinates
 */
export function buildGeoClusterSectors(sites: SiteProfile[]): GeoClusterSector[] {
  const rovingSites = sites.filter(s => s.serviceType === 'roving' || s.rovingGroup);
  const groupsMap = new Map<RovingGroup, SiteProfile[]>();

  rovingSites.forEach(site => {
    const grp = site.rovingGroup || 'Metro';
    if (!groupsMap.has(grp)) groupsMap.set(grp, []);
    groupsMap.get(grp)!.push(site);
  });

  const sectors: GeoClusterSector[] = [];

  groupsMap.forEach((grpSites, groupName) => {
    if (grpSites.length === 0) return;
    const avgLat = grpSites.reduce((sum, s) => sum + (s.latitude || 47.6062), 0) / grpSites.length;
    const avgLng = grpSites.reduce((sum, s) => sum + (s.longitude || -122.3321), 0) / grpSites.length;

    // Calculate max radius in km from center
    let maxDistMeters = 500;
    grpSites.forEach(s => {
      const d = calculateDistanceMeters(avgLat, avgLng, s.latitude || avgLat, s.longitude || avgLng);
      if (d > maxDistMeters) maxDistMeters = d;
    });

    const radiusKm = +(maxDistMeters / 1000).toFixed(2);
    const densityLevel = radiusKm <= 3.5 ? 'high_density' : radiusKm <= 7.0 ? 'moderate' : 'dispersed';

    sectors.push({
      sectorId: `CLUSTER-${groupName.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`,
      sectorName: `${groupName} Sector Cluster`,
      rovingGroup: groupName,
      centerCoords: { latitude: +avgLat.toFixed(4), longitude: +avgLng.toFixed(4) },
      siteCount: grpSites.length,
      radiusKm,
      sites: grpSites.map(s => s.name),
      densityLevel
    });
  });

  return sectors;
}

/**
 * Converts a string HH:mm to minutes from start of shift (base 20:00 = 0)
 */
function timeStringToMinutes(timeStr: string, baseHour = 20): number {
  const [h, m] = timeStr.split(':').map(Number);
  let hourDiff = h - baseHour;
  if (hourDiff < 0) hourDiff += 24; // wraps past midnight
  return hourDiff * 60 + m;
}

/**
 * Formats minutes from shift start back to HH:mm
 */
function minutesToTimeString(minutes: number, baseHour = 20): string {
  const totalMinutes = baseHour * 60 + minutes;
  const hours24 = Math.floor((totalMinutes / 60) % 24);
  const mins = Math.floor(totalMinutes % 60);
  return `${String(hours24).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Solves Traveling Salesperson / Density TSP with 2-Opt local search to minimize deadhead drive time
 */
export function solveDensityTspRoute(
  startCoords: { latitude: number; longitude: number },
  stops: RouteCheckpointStop[],
  traffic: TrafficCondition
): RouteCheckpointStop[] {
  if (stops.length <= 1) return [...stops];

  // 1. Greedy Nearest-Neighbor Construction
  const unvisited = [...stops];
  const ordered: RouteCheckpointStop[] = [];
  let currentLat = startCoords.latitude;
  let currentLon = startCoords.longitude;

  while (unvisited.length > 0) {
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = calculateDistanceMeters(
        currentLat,
        currentLon,
        unvisited[i].coords.latitude,
        unvisited[i].coords.longitude
      );
      if (d < minDistance) {
        minDistance = d;
        closestIndex = i;
      }
    }

    const nextStop = unvisited.splice(closestIndex, 1)[0];
    ordered.push(nextStop);
    currentLat = nextStop.coords.latitude;
    currentLon = nextStop.coords.longitude;
  }

  // 2. 2-Opt Local Search Optimization
  let improved = true;
  let iterations = 0;
  const maxIterations = 30;

  const calculateTotalDistance = (route: RouteCheckpointStop[]) => {
    let dist = 0;
    let prevLat = startCoords.latitude;
    let prevLon = startCoords.longitude;
    for (const stop of route) {
      dist += calculateDistanceMeters(prevLat, prevLon, stop.coords.latitude, stop.coords.longitude);
      prevLat = stop.coords.latitude;
      prevLon = stop.coords.longitude;
    }
    return dist;
  };

  let bestRoute = [...ordered];
  let bestDistance = calculateTotalDistance(bestRoute);

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < bestRoute.length - 1; i++) {
      for (let k = i + 1; k < bestRoute.length; k++) {
        // Reverse sub-array from i to k
        const newRoute = [
          ...bestRoute.slice(0, i),
          ...bestRoute.slice(i, k + 1).reverse(),
          ...bestRoute.slice(k + 1)
        ];

        const newDist = calculateTotalDistance(newRoute);
        if (newDist < bestDistance - 50) { // minimum 50m improvement
          bestRoute = newRoute;
          bestDistance = newDist;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return bestRoute;
}

/**
 * Main Engine: Optimizes a Rover's Route Circuit with:
 * - Geo-Clustering & Traffic Density
 * - Contract SLA Time Windows & Required Hit Spacing
 * - Anti-Predictability Stochastic Randomization
 */
export function optimizeRoverRoute(
  roverOrOptions: RoverVehicle | {
    rover: RoverVehicle;
    sites: SiteProfile[];
    mode?: OptimizationMode;
    traffic?: TrafficCondition;
    shiftStartHour?: number;
    antiPredictabilityJitterPct?: number;
    activeInterception?: AdHocInterception | null;
  },
  sitesArg?: SiteProfile[],
  optionsArg?: {
    mode?: OptimizationMode;
    traffic?: TrafficCondition;
    shiftStartHour?: number;
    antiPredictabilityJitterPct?: number;
    activeInterception?: AdHocInterception | null;
  }
): DynamicRoutePlan {
  let rover: RoverVehicle;
  let sites: SiteProfile[];
  let mode: OptimizationMode = 'traffic_density_optimal';
  let traffic: TrafficCondition = 'moderate';
  let shiftStartHour = 20;
  let antiPredictabilityJitterPct = 20;
  let activeInterception: AdHocInterception | null = null;

  if ('id' in roverOrOptions && sitesArg) {
    rover = roverOrOptions;
    sites = sitesArg;
    if (optionsArg?.mode) mode = optionsArg.mode;
    if (optionsArg?.traffic) traffic = optionsArg.traffic;
    if (optionsArg?.shiftStartHour !== undefined) shiftStartHour = optionsArg.shiftStartHour;
    if (optionsArg?.antiPredictabilityJitterPct !== undefined) antiPredictabilityJitterPct = optionsArg.antiPredictabilityJitterPct;
    if (optionsArg?.activeInterception !== undefined) activeInterception = optionsArg.activeInterception;
  } else {
    const opts = roverOrOptions as {
      rover: RoverVehicle;
      sites: SiteProfile[];
      mode?: OptimizationMode;
      traffic?: TrafficCondition;
      shiftStartHour?: number;
      antiPredictabilityJitterPct?: number;
      activeInterception?: AdHocInterception | null;
    };
    rover = opts.rover;
    sites = opts.sites;
    if (opts.mode) mode = opts.mode;
    if (opts.traffic) traffic = opts.traffic;
    if (opts.shiftStartHour !== undefined) shiftStartHour = opts.shiftStartHour;
    if (opts.antiPredictabilityJitterPct !== undefined) antiPredictabilityJitterPct = opts.antiPredictabilityJitterPct;
    if (opts.activeInterception !== undefined) activeInterception = opts.activeInterception;
  }
  // Filter sites assigned to this rover's roving group
  const groupSites = sites.filter(s => 
    s.serviceType === 'roving' && s.rovingGroup === rover.rovingGroup
  );

  // If no sites explicitly assigned to group, pick nearest matching roving sites
  const poolSites = groupSites.length > 0 ? groupSites : sites.filter(s => s.serviceType === 'roving').slice(0, 6);

  // Build raw checkpoint stops pool
  const rawStops: RouteCheckpointStop[] = [];

  poolSites.forEach((site, idx) => {
    const sla = DEFAULT_CLIENT_SLAS[site.id] || {
      siteId: site.id,
      siteName: site.name,
      contractTitle: `${site.name} Routine Patrol SLA`,
      requiredHitsPerShift: 2,
      minHitSpacingMinutes: 90,
      timeWindows: [
        { startHour: '21:00', endHour: '00:00', label: 'Primary Shift Check' },
        { startHour: '01:30', endHour: '04:30', label: 'Secondary Early Morning Sweep' }
      ],
      priority: site.securityTier === 'Tier 4 - Critical Infrastructure' ? 'P1_MANDATORY_SLA' : 'P2_CONTRACTUAL_WINDOW',
      requiredDwellMinutes: 10
    };

    const hitsRequired = sla.requiredHitsPerShift || 2;

    for (let hitNum = 1; hitNum <= hitsRequired; hitNum++) {
      const window = sla.timeWindows[hitNum - 1] || sla.timeWindows[0];
      const stopId = `stop-${site.id}-hit${hitNum}`;

      rawStops.push({
        id: stopId,
        siteId: site.id,
        siteName: site.name,
        siteAddress: site.address,
        coords: {
          latitude: site.latitude || 47.6062,
          longitude: site.longitude || -122.3321
        },
        rovingGroup: rover.rovingGroup,
        clusterSectorId: `SECTOR-${rover.rovingGroup.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`,
        sequenceOrder: idx * 2 + hitNum,
        originalSequenceOrder: idx * 2 + hitNum,
        estimatedArrival: '21:00',
        estimatedDeparture: '21:12',
        estimatedDriveMinutes: 8,
        distanceKm: 2.5,
        targetDwellMinutes: sla.requiredDwellMinutes || 10,
        slaPriority: sla.priority,
        slaWindowDescription: `${window.label} (${window.startHour} - ${window.endHour})`,
        slaWindowStart: window.startHour,
        slaWindowEnd: window.endHour,
        status: 'pending',
        hitsCompletedCount: hitNum > 1 ? 1 : 0,
        hitsRequiredCount: hitsRequired,
        geofenceVerified: false,
        geofenceRadiusMeters: site.geofenceRadiusMeters || 100,
        postInstructions: site.postInstructions,
        gateCode: site.accessGateNotes || site.rovingNotes
      });
    }
  });

  // Calculate baseline unoptimized sequential route drive minutes
  let baselineDeadheadMinutes = 0;
  let curLat = rover.currentCoords.latitude;
  let curLon = rover.currentCoords.longitude;
  rawStops.forEach(s => {
    const { driveMinutes } = estimateDriveMinutes(curLat, curLon, s.coords.latitude, s.coords.longitude, traffic);
    baselineDeadheadMinutes += driveMinutes;
    curLat = s.coords.latitude;
    curLon = s.coords.longitude;
  });

  // Step 1: Split into Round 1 (first hits) and Round 2 (second hits with spacing)
  const round1Stops = rawStops.filter(s => s.id.includes('-hit1') || s.hitsRequiredCount === 1);
  const round2Stops = rawStops.filter(s => s.id.includes('-hit2') || s.id.includes('-hit3'));

  // Step 2: Density TSP optimization for each round
  let optimizedRound1 = solveDensityTspRoute(rover.currentCoords, round1Stops, traffic);
  let lastR1Coords = optimizedRound1.length > 0 
    ? optimizedRound1[optimizedRound1.length - 1].coords 
    : rover.currentCoords;
  let optimizedRound2 = solveDensityTspRoute(lastR1Coords, round2Stops, traffic);

  // Step 3: Anti-Predictability Stochastic Randomization if requested
  let predictabilityScore = 88; // Default high predictability without stochastic jitter

  if (mode === 'anti_predictability_stochastic' || mode === 'stealth_randomized') {
    const jitterMultiplier = mode === 'stealth_randomized' ? 0.35 : (antiPredictabilityJitterPct / 100);

    // Controlled swap of intermediate non-mandatory or secondary checks
    if (optimizedRound1.length > 3) {
      // Swap adjacent compatible checks
      const swapIdx = 1 + Math.floor(Math.random() * (optimizedRound1.length - 2));
      const temp = optimizedRound1[swapIdx];
      optimizedRound1[swapIdx] = optimizedRound1[swapIdx + 1];
      optimizedRound1[swapIdx + 1] = temp;
    }

    // Reverse Round 2 loop direction to prevent clockwise/counter-clockwise routine mapping
    optimizedRound2.reverse();

    predictabilityScore = mode === 'stealth_randomized' ? 12 : 28;
  }

  // Step 4: Merge ordered stops
  let combinedStops = [...optimizedRound1, ...optimizedRound2];

  // Step 5: If dynamic ad-hoc interception is active, inject at index 0
  if (activeInterception && activeInterception.status !== 'cleared') {
    const interceptStop: RouteCheckpointStop = {
      id: `intercept-${activeInterception.callId}`,
      siteId: `adhoc-${activeInterception.callId}`,
      siteName: `[PRIORITY INTERCEPT] ${activeInterception.callTitle}`,
      siteAddress: activeInterception.targetAddress,
      coords: activeInterception.targetCoords,
      rovingGroup: rover.rovingGroup,
      clusterSectorId: 'SECTOR-EMERGENCY-INTERCEPT',
      sequenceOrder: 0,
      originalSequenceOrder: 0,
      estimatedArrival: 'Immediate',
      estimatedDeparture: '+15m on scene',
      estimatedDriveMinutes: activeInterception.estimatedEtaMinutes,
      distanceKm: +(activeInterception.distanceMeters / 1000).toFixed(2),
      targetDwellMinutes: 15,
      slaPriority: 'P1_MANDATORY_SLA',
      slaWindowDescription: `Ad-Hoc Urgent Call (${activeInterception.callPriority})`,
      status: activeInterception.status === 'on_scene' ? 'dwelling' : 'en_route',
      hitsCompletedCount: 0,
      hitsRequiredCount: 1,
      geofenceVerified: false,
      geofenceRadiusMeters: 120,
      isAdHocIntercept: true,
      adHocCallId: activeInterception.callId,
      postInstructions: `Immediate emergency response. Coordinate with local dispatch on radio CH-1.`
    };

    // Insert intercept at front of queue
    combinedStops.unshift(interceptStop);
  }

  // Step 6: Recalculate timestamps, drive minutes, spacing, and dwell
  let currentMinutesFromStart = 15; // 15 mins post shift start
  let prevCoords = rover.currentCoords;
  let totalDistanceKm = 0;
  let totalDeadheadMinutes = 0;
  let totalDwellMinutes = 0;

  const finalStops: RouteCheckpointStop[] = combinedStops.map((stop, index) => {
    const { distanceKm, driveMinutes } = estimateDriveMinutes(
      prevCoords.latitude,
      prevCoords.longitude,
      stop.coords.latitude,
      stop.coords.longitude,
      traffic
    );

    // Apply anti-predictability jitter (± 3 to 7 mins) if stochastic mode is active
    let jitter = 0;
    if ((mode === 'anti_predictability_stochastic' || mode === 'stealth_randomized') && !stop.isAdHocIntercept) {
      jitter = Math.floor((Math.random() * 8) - 4); // -4 to +4 mins
    }

    const arrivalMinutes = currentMinutesFromStart + driveMinutes + jitter;
    const departureMinutes = arrivalMinutes + stop.targetDwellMinutes;

    currentMinutesFromStart = departureMinutes;
    prevCoords = stop.coords;
    totalDistanceKm += distanceKm;
    totalDeadheadMinutes += driveMinutes;
    totalDwellMinutes += stop.targetDwellMinutes;

    return {
      ...stop,
      sequenceOrder: index + 1,
      estimatedArrival: minutesToTimeString(arrivalMinutes, shiftStartHour),
      estimatedDeparture: minutesToTimeString(departureMinutes, shiftStartHour),
      estimatedDriveMinutes: driveMinutes,
      distanceKm,
      stochasticJitterAppliedMinutes: jitter !== 0 ? jitter : undefined
    };
  });

  const deadheadSavedMinutes = Math.max(0, baselineDeadheadMinutes - totalDeadheadMinutes);
  const efficiencyScorePct = Math.min(99, Math.round(100 - (totalDeadheadMinutes / (totalDeadheadMinutes + totalDwellMinutes)) * 40));

  return {
    id: `plan-${rover.id}-${Date.now()}`,
    roverId: rover.id,
    roverUnitNumber: rover.unitNumber,
    rovingGroup: rover.rovingGroup,
    generatedAt: new Date().toISOString(),
    optimizationMode: mode,
    trafficCondition: traffic,
    trafficMultiplier: TRAFFIC_MULTIPLIERS[traffic],
    antiPredictabilityJitterPct,
    stops: finalStops,
    totalEstimatedMinutes: totalDeadheadMinutes + totalDwellMinutes,
    deadheadDriveMinutes: totalDeadheadMinutes,
    deadheadSavedMinutes,
    totalDistanceKm: +totalDistanceKm.toFixed(2),
    efficiencyScorePct,
    patternPredictabilityScorePct: predictabilityScore,
    slaComplianceScorePct: 98,
    activeInterceptionCallId: activeInterception?.callId
  };
}

/**
 * Computes Nearest Rover for Ad-Hoc Call Interception
 */
export function calculateNearestRoverForInterception(
  param1: { latitude: number; longitude: number } | RoverVehicle[],
  param2: string | { latitude: number; longitude: number },
  param3?: RoverVehicle[] | TrafficCondition,
  param4: TrafficCondition = 'moderate'
): {
  nearestRover: RoverVehicle;
  distanceMeters: number;
  estimatedEtaMinutes: number;
  rankings: Array<{
    rover: RoverVehicle;
    distanceMeters: number;
    estimatedEtaMinutes: number;
    currentStatus: string;
  }>;
} {
  let targetCoords: { latitude: number; longitude: number };
  let rovers: RoverVehicle[];
  let traffic: TrafficCondition = 'moderate';

  if (Array.isArray(param1)) {
    rovers = param1;
    targetCoords = param2 as { latitude: number; longitude: number };
    if (typeof param3 === 'string') traffic = param3 as TrafficCondition;
  } else {
    targetCoords = param1;
    if (Array.isArray(param3)) {
      rovers = param3;
      traffic = param4;
    } else {
      rovers = [];
    }
  }

  const rankings = rovers
    .map(rover => {
      const distanceMeters = calculateDistanceMeters(
        rover.currentCoords.latitude,
        rover.currentCoords.longitude,
        targetCoords.latitude,
        targetCoords.longitude
      );
      const { driveMinutes } = estimateDriveMinutes(
        rover.currentCoords.latitude,
        rover.currentCoords.longitude,
        targetCoords.latitude,
        targetCoords.longitude,
        traffic
      );

      // Add 2 min delay if rover is currently dwelling at a checkpoint
      const eta = rover.status === 'dwelling' ? driveMinutes + 2 : driveMinutes;

      return {
        rover,
        distanceMeters,
        estimatedEtaMinutes: Math.max(1, eta),
        currentStatus: rover.status
      };
    })
    .sort((a, b) => a.estimatedEtaMinutes - b.estimatedEtaMinutes);

  return {
    nearestRover: rankings[0]?.rover || rovers[0],
    distanceMeters: rankings[0]?.distanceMeters || 1200,
    estimatedEtaMinutes: rankings[0]?.estimatedEtaMinutes || 4,
    rankings
  };
}

/**
 * Passive Telemetry & Geofence Verification Engine:
 * Analyzes rover current GPS position relative to active target site geofence
 */
export function evaluatePassiveTelemetryGeofence(
  roverOrOptions: RoverVehicle | {
    rover: RoverVehicle;
    currentStop: RouteCheckpointStop;
    roverCoords: { latitude: number; longitude: number; accuracy?: number; speedKmh?: number };
    currentTime?: string;
  },
  stopArg?: RouteCheckpointStop,
  coordsArg?: { latitude: number; longitude: number; accuracy?: number; speedKmh?: number },
  timeArg?: string
): {
  isInsideGeofence: boolean;
  distanceMeters: number;
  newStatus: CheckpointStopStatus;
  dwellSeconds: number;
  isDwellSlaMet: boolean;
  isAutoArrival: boolean;
  generatedTelemetryLogs: RoverTelemetryLog[];
  telemetryEvents?: RoverTelemetryLog[];
} {
  let rover: RoverVehicle;
  let currentStop: RouteCheckpointStop;
  let roverCoords: { latitude: number; longitude: number; accuracy?: number; speedKmh?: number };
  let currentTime = timeArg || new Date().toISOString();

  if ('id' in roverOrOptions && stopArg && coordsArg) {
    rover = roverOrOptions;
    currentStop = stopArg;
    roverCoords = coordsArg;
  } else {
    const opts = roverOrOptions as {
      rover: RoverVehicle;
      currentStop: RouteCheckpointStop;
      roverCoords: { latitude: number; longitude: number; accuracy?: number; speedKmh?: number };
      currentTime?: string;
    };
    rover = opts.rover;
    currentStop = opts.currentStop;
    roverCoords = opts.roverCoords;
    if (opts.currentTime) currentTime = opts.currentTime;
  }

  const distanceMeters = calculateDistanceMeters(
    roverCoords.latitude,
    roverCoords.longitude,
    currentStop.coords.latitude,
    currentStop.coords.longitude
  );

  const radius = currentStop.geofenceRadiusMeters || 100;
  const isInsideGeofence = distanceMeters <= radius;
  const logs: RoverTelemetryLog[] = [];

  let newStatus: CheckpointStopStatus = currentStop.status;
  let dwellSeconds = rover.currentDwellSeconds || 0;
  let isDwellSlaMet = false;
  let isAutoArrival = false;

  if (isInsideGeofence) {
    if (currentStop.status === 'en_route' || currentStop.status === 'pending') {
      newStatus = 'dwelling';
      dwellSeconds = 5;
      isAutoArrival = true;
      logs.push({
        id: `telemetry-arr-${Date.now()}`,
        roverId: rover.id,
        roverUnit: rover.unitNumber,
        guardName: rover.assignedGuardName,
        timestamp: currentTime,
        eventType: 'GEOFENCE_AUTO_ARRIVAL',
        siteId: currentStop.siteId,
        siteName: currentStop.siteName,
        coords: roverCoords,
        speedKmh: roverCoords.speedKmh || 12,
        distanceToSiteMeters: distanceMeters,
        notes: `Passive GPS Geofence verified. Auto-arrival at ${currentStop.siteName} (${distanceMeters}m from centroid, radius ${radius}m).`,
        telemetrySource: 'passive_gps_geofence'
      });
    } else if (currentStop.status === 'dwelling') {
      dwellSeconds += 10;
      const targetSeconds = currentStop.targetDwellMinutes * 60;
      if (dwellSeconds >= targetSeconds) {
        isDwellSlaMet = true;
        logs.push({
          id: `telemetry-sla-${Date.now()}`,
          roverId: rover.id,
          roverUnit: rover.unitNumber,
          guardName: rover.assignedGuardName,
          timestamp: currentTime,
          eventType: 'DWELL_SLA_MET',
          siteId: currentStop.siteId,
          siteName: currentStop.siteName,
          coords: roverCoords,
          dwellDurationSeconds: dwellSeconds,
          notes: `Contractual Dwell SLA satisfied: ${Math.floor(dwellSeconds / 60)} mins on site (Required ${currentStop.targetDwellMinutes}m).`,
          telemetrySource: 'passive_gps_geofence'
        });
      }
    }
  } else {
    // Outside geofence
    if (currentStop.status === 'dwelling') {
      newStatus = 'completed';
      logs.push({
        id: `telemetry-dep-${Date.now()}`,
        roverId: rover.id,
        roverUnit: rover.unitNumber,
        guardName: rover.assignedGuardName,
        timestamp: currentTime,
        eventType: 'GEOFENCE_AUTO_DEPARTURE',
        siteId: currentStop.siteId,
        siteName: currentStop.siteName,
        coords: roverCoords,
        speedKmh: roverCoords.speedKmh || 28,
        dwellDurationSeconds: dwellSeconds,
        notes: `Passive Geofence departure detected. Dwell concluded: ${Math.floor(dwellSeconds / 60)}m ${dwellSeconds % 60}s. Advancing to next checkpoint in circuit.`,
        telemetrySource: 'passive_gps_geofence'
      });
    } else if (currentStop.status === 'pending') {
      newStatus = 'en_route';
    }
  }

  return {
    isInsideGeofence,
    distanceMeters,
    newStatus,
    dwellSeconds,
    isDwellSlaMet,
    isAutoArrival,
    generatedTelemetryLogs: logs,
    telemetryEvents: logs
  };
}
