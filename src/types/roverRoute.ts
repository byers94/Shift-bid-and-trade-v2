import { RovingGroup } from './shift';

export type TrafficCondition = 'light' | 'moderate' | 'heavy' | 'incident_gridlock';

export type OptimizationMode = 
  | 'traffic_density_optimal'     // Min deadhead drive time & geo-clustering
  | 'anti_predictability_stochastic' // Controlled jitter to prevent pattern recognition
  | 'sla_priority_first'          // Hard-lock mandatory contract hit windows first
  | 'stealth_randomized';         // High-variance counter-reconnaissance mode

export type SlaPriorityLevel = 
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4'
  | 'P1_MANDATORY_SLA'      // Strict contractual deadline (e.g. 2 hits between 22:00-02:00)
  | 'P2_CONTRACTUAL_WINDOW' // Required time-bound window (e.g. Closing lockup by 21:00)
  | 'P3_ROUTINE_SWEEP'      // Routine patrol check
  | 'P4_STANDBY_CHECK';     // Low priority or visual drive-by

export type CheckpointStopStatus = 
  | 'pending'
  | 'en_route'
  | 'dwelling'
  | 'completed'
  | 'skipped'
  | 'intercept_delayed';

export interface ClientContractSLA {
  siteId: string;
  siteName: string;
  contractTitle: string;
  requiredHitsPerShift: number;
  minHitSpacingMinutes: number; // e.g. 90 minutes apart
  timeWindows: Array<{
    startHour: string; // "22:00"
    endHour: string;   // "02:00"
    label: string;
  }>;
  priority: SlaPriorityLevel;
  requiredDwellMinutes: number; // minimum time guard must remain on site (e.g. 10m)
  penaltyPerMissedHitDollars?: number;
  notes?: string;
}

export interface RouteCheckpointStop {
  id: string;
  siteId: string;
  siteName: string;
  siteAddress: string;
  coords: {
    latitude: number;
    longitude: number;
  };
  rovingGroup: RovingGroup;
  clusterSectorId: string; // e.g. "SECTOR-DOWNTOWN-NORTH"
  sequenceOrder: number;
  originalSequenceOrder: number;
  estimatedArrival: string; // e.g. "22:15"
  estimatedDeparture: string; // e.g. "22:28"
  estimatedDriveMinutes: number;
  distanceKm: number;
  targetDwellMinutes: number;
  slaPriority: SlaPriorityLevel;
  slaWindowDescription?: string;
  slaWindowStart?: string;
  slaWindowEnd?: string;
  status: CheckpointStopStatus;
  hitsCompletedCount: number;
  hitsRequiredCount: number;
  lastHitTimestamp?: string;
  nextHitAllowedAfter?: string; // enforces minHitSpacingMinutes
  actualArrivalTime?: string;
  actualDepartureTime?: string;
  actualDwellMinutes?: number;
  geofenceVerified: boolean;
  geofenceRadiusMeters: number;
  currentDistanceMeters?: number;
  verificationSource?: 'passive_gps_geofence' | 'manual_scan' | 'nfc_tag';
  postInstructions?: string;
  gateCode?: string;
  isAdHocIntercept?: boolean;
  adHocCallId?: string;
  stochasticJitterAppliedMinutes?: number;
}

export interface RoverVehicle {
  id: string;
  unitNumber: string; // e.g. "ROVER-01 (Echo Unit)"
  callSign: string;   // "MOBILE-ECHO-1"
  assignedGuardId: string;
  assignedGuardName: string;
  assignedGuardBadge: string;
  assignedGuardPhone: string;
  rovingGroup: RovingGroup;
  status: 'patrolling' | 'dwelling' | 'intercepting' | 'break' | 'idle' | 'off_duty';
  currentCoords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speedKmh?: number;
  };
  currentSiteId?: string;
  currentSiteName?: string;
  currentStopIndex: number;
  batteryLevelPct: number;
  fuelLevelPct: number;
  vehicleModel: string; // e.g. "Ford Explorer Interceptor"
  licensePlate: string;
  lastTelemetryTimestamp: string;
  activeInterceptionId?: string;
  currentDwellSeconds?: number;
  isInsideGeofence?: boolean;
}

export interface DynamicRoutePlan {
  id: string;
  roverId: string;
  roverUnitNumber: string;
  rovingGroup: RovingGroup;
  generatedAt: string;
  optimizationMode: OptimizationMode;
  trafficCondition: TrafficCondition;
  trafficMultiplier: number;
  antiPredictabilityJitterPct: number;
  stops: RouteCheckpointStop[];
  totalEstimatedMinutes: number;
  deadheadDriveMinutes: number;
  deadheadDriveMinutesSaved?: number;
  deadheadSavedMinutes: number;
  totalDistanceKm: number;
  efficiencyScorePct: number;
  patternPredictabilityScorePct: number; // Lower is better for counter-surveillance
  slaComplianceScorePct: number;
  slaComplianceScore?: number;
  activeInterceptionCallId?: string;
  adHocInterceptionsCount?: number;
  totalDriveMinutes?: number;
}

export interface AdHocInterception {
  id: string;
  callId: string;
  callForServiceId?: string;
  callTitle: string;
  callSummary?: string;
  callPriority: string;
  callType: string;
  siteName?: string;
  targetAddress: string;
  locationAddress?: string;
  targetCoords: {
    latitude: number;
    longitude: number;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  targetSiteName?: string;
  assignedRoverId: string;
  assignedRoverUnit: string;
  assignedGuardName: string;
  distanceMeters?: number;
  estimatedEtaMinutes?: number;
  estimatedArrivalMinutes?: number;
  dispatchedAt: string;
  status: 'dispatched' | 'accepted' | 'en_route' | 'on_scene' | 'cleared' | 'declined';
  preemptedRoutineStopSiteId?: string;
  preemptedRoutineStopSiteName?: string;
  postponedEtaShiftMinutes?: number;
  postponedStops?: Array<{
    stopId: string;
    siteName: string;
    originalEta: string;
    newDelayedEta: string;
    delayMinutes: number;
  }>;
  resolutionNotes?: string;
  clearedAt?: string;
}

export type TelemetryEventType = 
  | 'GEOFENCE_AUTO_ARRIVAL'
  | 'GEOFENCE_AUTO_DEPARTURE'
  | 'DWELL_SLA_MET'
  | 'DWELL_SHORTFALL_WARNING'
  | 'SPEED_ANOMALY'
  | 'INTERCEPT_REROUTE'
  | 'STOCHASTIC_JITTER_APPLIED'
  | 'SLA_WINDOW_MET'
  | 'HEARTBEAT_PING'
  | 'ETA_RECALCULATED'
  | 'AD_HOC_INTERCEPT_DISPATCHED'
  | 'AD_HOC_INTERCEPT_CLEARED';

export interface RoverTelemetryLog {
  id: string;
  roverId: string;
  roverUnit: string;
  guardName: string;
  timestamp: string;
  eventType: TelemetryEventType;
  siteId?: string;
  siteName?: string;
  coords?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  speedKmh?: number;
  distanceToSiteMeters?: number;
  dwellDurationSeconds?: number;
  notes: string;
  telemetrySource?: 'passive_gps_geofence' | 'obd2_in_vehicle' | 'guard_mobile_sdk';
}

export interface GeoClusterSector {
  sectorId: string;
  sectorName: string;
  rovingGroup: RovingGroup;
  centerCoords: { latitude: number; longitude: number };
  siteCount: number;
  radiusKm: number;
  sites: string[];
  densityLevel: 'high_density' | 'moderate' | 'dispersed';
}
