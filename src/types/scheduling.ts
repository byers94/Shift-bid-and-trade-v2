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
  date?: string;
  hours?: number;
  address?: string;
  location?: string;
  urgency?: 'standard' | 'high' | 'emergency';
  status?: 'open' | 'filled' | 'pending_trade' | 'completed' | 'cancelled';
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
