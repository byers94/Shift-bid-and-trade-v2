import {
  Shift as LegacyShift,
  GuardProfile as LegacyGuardProfile,
  ScheduledShift,
} from './shift';

export type GuardRating = 1 | 2 | 3 | 4 | 5;
// Level 1: Fire Watch Only (No DSL required)
// Level 2: Guard Shack & Pool Watch (No DSL required)
// Level 3: General Guard Duties (Requires active Denver DSL if site is in Denver County)
// Level 4: Armed Endorsement
// Level 5: High-Level Sites / Executive Protection

export type LicenseStatus = 'COMPLIANT' | 'EXPIRING_SOON' | 'EXPIRED_GRACE' | 'REVOKED';

export type SchedulingViolationType =
  | 'OVERTIME'
  | 'REST_TURNAROUND'
  | 'JURISDICTION_LICENSE'
  | 'RATING';

export interface SchedulingViolation {
  type: SchedulingViolationType;
  message: string;
  severity: 'WARNING' | 'BLOCKING';
}

export type DayOfWeekName =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export type ShiftOperationalStatus =
  | 'SCHEDULED'
  | 'UNASSIGNED'
  | 'BIDDING'
  | 'COMPLETED';

export interface ScheduleTemplate {
  id: string;
  shiftName: string;
  siteCode: string;
  siteName: string;
  county: string;
  requiresDenverLicense: boolean;
  requiredRating: GuardRating;
  startTime: string;
  endTime: string;
  durationHours: number;
  serviceCategory: 'MPU' | 'DEDICATED';
  operatingDays: Array<
    'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'
  >;
  status: 'SCHEDULED' | 'UNASSIGNED' | 'BIDDING' | 'COMPLETED';
  defaultGuardId?: string;
  defaultGuardName?: string;
  defaultGuardBadge?: string;
  postRole?: string;
  rovingGroup?: string;
  assignedRoverUnit?: string;
}

export interface Shift {
  id: string;
  siteCode: string;
  siteName: string;
  county: string; // e.g., 'Denver', 'Arapahoe', 'Adams', 'Douglas', 'Jefferson'
  requiresDenverLicense: boolean; // True ONLY for sites within the City & County of Denver
  requiredRating: GuardRating;
  startTime: string; // "HH:MM" 24h format (e.g., "18:00")
  endTime: string; // "HH:MM" 24h format (e.g., "06:00")
  durationHours: number; // e.g., 8.0, 10.0, 12.0
  dayOfWeek: DayOfWeekName;
  operatingDays: Array<
    'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'
  >;
  status:
    | 'SCHEDULED'
    | 'UNASSIGNED'
    | 'BIDDING'
    | 'COMPLETED'
    | 'open'
    | 'filled'
    | 'pending_trade'
    | 'completed'
    | 'cancelled';
  assignedGuardId?: string;
  assignedGuardName?: string;
  isOverride?: boolean;
  overrideDetails?: {
    authorizedBy: string;
    reason: string;
    timestamp: string; // ISO
    overrideTypes: SchedulingViolationType[];
  };
  // Optional compatibility properties for existing views
  shiftName?: string;
  date?: string;
  hours?: number;
  address?: string;
  location?: string;
  urgency?: 'standard' | 'high' | 'emergency';
  requiredCertifications?: string[];
  notes?: string;
  createdAt?: string;
  bidsCount?: number;
}

export interface GuardProfile {
  id: string;
  name: string;
  badgeNumber: string;
  phone?: string;
  rating: GuardRating;
  dslExpirationDate: string | null; // ISO "YYYY-MM-DD" or null if uncertified
  licenseStatus: LicenseStatus;
  daysUntilExpiration: number;
  daysExpired: number;
  denverEligible: boolean; // True if license is valid or within authorized grace
  weeklyScheduledHours: number; // Sum of assigned shift durations in active week
  maxWeeklyHours: number; // Hard ceiling, default: 40
  assignedShiftIds: string[];
  // Optional compatibility properties for existing views
  role?: 'guard' | 'lead' | 'supervisor' | string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | string;
  seniorityYears?: number;
  hireDate?: string;
  certifications?: string[];
  ojtSites?: string[];
  isRovingGuard?: boolean;
  availability?: LegacyGuardProfile['availability'];
}

export interface SchedulingConstraints {
  maxWeeklyHours: number; // Default 40
  minRestHours: number; // Default 12 (turnaround between consecutive shifts)
  maxConsecutiveDays: number; // Default 5
  enforceDenverLicense: boolean; // Default true
  enforceRatingCheck: boolean; // Default true
  allowOvertimeOverride?: boolean; // Optional compatibility flag
}

export const DEFAULT_SCHEDULING_CONSTRAINTS: SchedulingConstraints = {
  maxWeeklyHours: 40,
  minRestHours: 12,
  maxConsecutiveDays: 5,
  enforceDenverLicense: true,
  enforceRatingCheck: true,
  allowOvertimeOverride: false,
};

export type Guard = (GuardProfile | LegacyGuardProfile) & {
  status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | string;
  rating?: number;
  seniorityYears?: number;
};

export type ShiftSchedule = ScheduledShift | Shift | LegacyShift;

export interface ShiftAssignment {
  shiftId: string;
  shift: any;
  guardId: string;
  guardName: string;
  guardBadge: string;
  siteName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  weeklyHoursBefore: number;
  weeklyHoursAfter: number;
  restHoursGap: number | null;
  consecutiveDaysAfter: number;
  isSiteTrained: boolean;
  reason: string;
}

export interface GuardWorkloadTracker {
  weeklyHours: number;
  weeklyHoursByWeek: Record<string, number>;
  shiftDates: string[];
  assignedDays?: Set<string>;
  assignedShifts: any[];
}

export interface AutoFillExecutionSummary {
  filledCount: number;
  unassignedCount: number;
  overtimePreventedCount: number;
  logs: string[];
}

export interface AutoFillExecutionResult {
  updatedShifts: Shift[];
  updatedRoster: GuardProfile[];
  unassigned: any[];
  executionSummary: AutoFillExecutionSummary;
  // Compatibility properties for existing views
  assignments: ShiftAssignment[];
  auditLog: string[];
  overtimePreventedCount: number;
  restTurnaroundPreventedCount: number;
  consecutiveDaysPreventedCount: number;
  guardTrackers: Record<string, GuardWorkloadTracker>;
}

/**
 * Unified 8 Active Set Schedule Templates shared across Weekly Shift Matrix and Master Calendar.
 */
export const UNIFIED_SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  {
    id: 'SETSCHED-00',
    shiftName: 'Metro MPU',
    siteCode: 'MPU-MET-01',
    siteName: 'Metro MPU',
    county: 'Denver',
    requiresDenverLicense: true,
    requiredRating: 3,
    startTime: '06:00',
    endTime: '14:00',
    durationHours: 8.0,
    serviceCategory: 'MPU',
    operatingDays: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
    status: 'SCHEDULED',
    defaultGuardId: 'guard-103',
    defaultGuardName: 'Marcus Wright',
    defaultGuardBadge: 'SEC-6340',
    postRole: 'Metro MPU Sector 1 Roving Patrol',
    rovingGroup: 'Metro',
    assignedRoverUnit: 'MPU-1 (Metro)',
  },
  {
    id: 'SETSCHED-01',
    shiftName: 'Pier 7 Maritime Scale Gate',
    siteCode: 'PORT-P7',
    siteName: 'Port Authority - Pier 7',
    county: 'Denver',
    requiresDenverLicense: true,
    requiredRating: 4,
    startTime: '08:00',
    endTime: '16:00',
    durationHours: 8.0,
    serviceCategory: 'DEDICATED',
    operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    status: 'SCHEDULED',
    defaultGuardId: 'guard-current',
    defaultGuardName: 'Alex Mercer',
    defaultGuardBadge: 'SEC-8842',
    postRole: 'Berth 4 Access Control & Truck Scale Gate Lead',
  },
  {
    id: 'SETSCHED-02',
    shiftName: 'Corporate HQ Executive Concierge',
    siteCode: 'CORP-HQ-01',
    siteName: 'Corporate HQ - Main Tower',
    county: 'Denver',
    requiresDenverLicense: true,
    requiredRating: 3,
    startTime: '16:00',
    endTime: '00:00',
    durationHours: 8.0,
    serviceCategory: 'DEDICATED',
    operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    status: 'SCHEDULED',
    defaultGuardId: 'guard-101',
    defaultGuardName: 'Sarah Jenkins',
    defaultGuardBadge: 'SEC-7721',
    postRole: 'Executive Lobby Concierge & C-Suite Access Control',
  },
  {
    id: 'SETSCHED-03',
    shiftName: 'Tech Campus North Data Center',
    siteCode: 'TECH-DC-04',
    siteName: 'Tech Campus North - Data Center',
    county: 'Arapahoe',
    requiresDenverLicense: false,
    requiredRating: 5,
    startTime: '00:00',
    endTime: '08:00',
    durationHours: 8.0,
    serviceCategory: 'DEDICATED',
    operatingDays: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
    status: 'SCHEDULED',
    defaultGuardId: 'guard-104',
    defaultGuardName: 'Elena Rostova',
    defaultGuardBadge: 'SEC-4199',
    postRole: 'Server Pods & Mantrap Biometric Access Specialist',
  },
  {
    id: 'SETSCHED-04',
    shiftName: 'Metro MPU Downtown Mobile Patrol',
    siteCode: 'MPU-DTN-02',
    siteName: 'Midtown Commercial Lofts',
    county: 'Denver',
    requiresDenverLicense: true,
    requiredRating: 4,
    startTime: '20:00',
    endTime: '04:00',
    durationHours: 8.0,
    serviceCategory: 'MPU',
    operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    status: 'SCHEDULED',
    defaultGuardId: 'guard-107',
    defaultGuardName: 'Chloe Bennett',
    defaultGuardBadge: 'SEC-1102',
    postRole: 'Metro MPU Downtown Commercial & Residential Circuit Lead',
    rovingGroup: 'Metro',
    assignedRoverUnit: 'MPU-1 (Metro)',
  },
  {
    id: 'SETSCHED-05',
    shiftName: 'Waterfront Chemical Plant - Weekend Night Watch',
    siteCode: 'CHEM-WFP-05',
    siteName: 'Waterfront Chemical Plant',
    county: 'Adams',
    requiresDenverLicense: false,
    requiredRating: 3,
    startTime: '18:00',
    endTime: '06:00',
    durationHours: 12.0,
    serviceCategory: 'DEDICATED',
    operatingDays: ['Sunday', 'Saturday'],
    status: 'SCHEDULED',
    defaultGuardId: 'guard-105',
    defaultGuardName: 'David Silva',
    defaultGuardBadge: 'SEC-5510',
    postRole: 'HAZMAT Tank Farm & South Rail Perimeter Gate',
  },
  {
    id: 'SETSCHED-06',
    shiftName: 'Retail Plaza Weekend Safety Patrol',
    siteCode: 'RET-PLZ-06',
    siteName: 'Retail Plaza - Weekend Safety Patrol',
    county: 'Arapahoe',
    requiresDenverLicense: false,
    requiredRating: 2,
    startTime: '10:00',
    endTime: '18:00',
    durationHours: 8.0,
    serviceCategory: 'DEDICATED',
    operatingDays: ['Sunday', 'Saturday'],
    status: 'UNASSIGNED',
    defaultGuardId: undefined,
    defaultGuardName: undefined,
    defaultGuardBadge: undefined,
    postRole: 'Retail Concourse Patrol & Shoplifting Deterrence',
  },
  {
    id: 'SETSCHED-07',
    shiftName: 'North West MPU Waterfront Marina',
    siteCode: 'MPU-NW-07',
    siteName: 'Pier 66 Marina Boardwalk',
    county: 'Jefferson',
    requiresDenverLicense: false,
    requiredRating: 3,
    startTime: '18:00',
    endTime: '02:00',
    durationHours: 8.0,
    serviceCategory: 'MPU',
    operatingDays: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
    status: 'UNASSIGNED',
    defaultGuardId: undefined,
    defaultGuardName: undefined,
    defaultGuardBadge: undefined,
    postRole: 'North West MPU Waterfront Marina & Promenade Patrol',
    rovingGroup: 'North West',
    assignedRoverUnit: 'MPU-2 (North West)',
  },
];
