import {
  AutoFillExecutionResult,
  DayOfWeekName,
  DEFAULT_SCHEDULING_CONSTRAINTS,
  Guard,
  GuardProfile,
  GuardRating,
  GuardWorkloadTracker,
  SchedulingConstraints,
  Shift,
  ShiftAssignment,
  ShiftSchedule,
} from '../types/scheduling';
import { ScheduledShift, SiteProfile } from '../types/shift';
import { INITIAL_SITES, GUARD_BASE_METRICS } from '../data/mockData';
import { findSiteProfile, isGuardSiteTrained } from './autoFillHeuristics';
import {
  calculateLicenseStatus,
  checkShiftEligibility,
  doShiftsOverlap,
  getShiftWeekHourBounds,
  parseTimeToDecimalHours,
} from './complianceEngine';
import { parseShiftTimeWindow } from './scheduling';
import { calculateHours } from './time';

const DAY_ORDER: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const INDEX_TO_DAY: DayOfWeekName[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Resolves the dayOfWeek string ('Sunday' .. 'Saturday') from a Shift or date string.
 */
export function resolveDayOfWeek(shift: Partial<Shift> & { date?: string }): DayOfWeekName {
  if (shift.dayOfWeek && DAY_ORDER[shift.dayOfWeek] !== undefined) {
    return shift.dayOfWeek;
  }
  if (shift.date) {
    const parts = shift.date.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      return INDEX_TO_DAY[d.getDay()] || 'Monday';
    }
  }
  return 'Monday';
}

/**
 * Resolves the duration in hours for a shift or scheduled assignment.
 */
export function getShiftDurationHours(shift: Partial<Shift> | ScheduledShift): number {
  const explicit = (shift as Shift).durationHours ?? (shift as any).hours;
  if (typeof explicit === 'number' && explicit > 0) {
    return explicit;
  }
  const calc = calculateHours(shift.startTime || '08:00', shift.endTime || '16:00');
  return calc > 0 ? calc : 8;
}

/**
 * Computes the calendar workweek (Sunday 00:00:00 to Saturday 23:59:59) containing a YYYY-MM-DD date string.
 */
export function getCalendarWorkweekBounds(dateStr: string): {
  sundayStr: string;
  saturdayStr: string;
  sundayMs: number;
  saturdayMs: number;
} {
  const parts = (dateStr || '').split('-').map(Number);
  const baseDate =
    parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])
      ? new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0)
      : new Date();

  const dayOfWeek = baseDate.getDay();
  const sunday = new Date(baseDate);
  sunday.setDate(baseDate.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);

  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    sundayStr: formatYMD(sunday),
    saturdayStr: formatYMD(saturday),
    sundayMs: sunday.getTime(),
    saturdayMs: saturday.getTime(),
  };
}

/**
 * Normalizes any shift or schedule item into a compliant Shift record.
 */
export function normalizeShiftRecord(raw: any): Shift {
  const durationHours = getShiftDurationHours(raw);
  const dayOfWeek = resolveDayOfWeek(raw);
  const county = raw.county || (raw.address?.toLowerCase().includes('denver') ? 'Denver' : 'Arapahoe');
  const requiresDenverLicense =
    typeof raw.requiresDenverLicense === 'boolean'
      ? raw.requiresDenverLicense
      : county.toLowerCase() === 'denver';
  const requiredRating: GuardRating = (raw.requiredRating as GuardRating) || 3;
  const operatingDays: DayOfWeekName[] = Array.isArray(raw.operatingDays)
    ? raw.operatingDays
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    ...raw,
    id: raw.id || `shift-${Math.random().toString(36).slice(2, 9)}`,
    siteCode: raw.siteCode || raw.location || 'POST-01',
    siteName: raw.siteName || 'Assigned Security Post',
    county,
    requiresDenverLicense,
    requiredRating,
    startTime: raw.startTime || '08:00',
    endTime: raw.endTime || '16:00',
    durationHours,
    hours: raw.hours ?? durationHours,
    dayOfWeek,
    operatingDays,
    status: raw.status || (raw.assignedGuardId || raw.guardId ? 'SCHEDULED' : 'UNASSIGNED'),
    assignedGuardId: raw.assignedGuardId ?? raw.guardId,
    assignedGuardName: raw.assignedGuardName ?? raw.guardName,
  };
}

/**
 * Normalizes any guard record into a compliant GuardProfile with Denver DSL status fields.
 */
export function normalizeGuardRecord(raw: any): GuardProfile {
  const hasExplicitDslFields =
    typeof raw.denverEligible === 'boolean' && typeof raw.licenseStatus === 'string';

  const dslExpirationDate: string | null =
    raw.dslExpirationDate !== undefined ? raw.dslExpirationDate : '2027-06-30';

  const computedLicense = hasExplicitDslFields
    ? {
        status: raw.licenseStatus,
        daysUntilExpiration: raw.daysUntilExpiration ?? 180,
        daysExpired: raw.daysExpired ?? 0,
        denverEligible: raw.denverEligible,
      }
    : calculateLicenseStatus(dslExpirationDate);

  const rating: GuardRating = (raw.rating as GuardRating) || 3;

  return {
    ...raw,
    id: raw.id,
    name: raw.name,
    badgeNumber: raw.badgeNumber || 'SEC-000',
    phone: raw.phone,
    rating,
    dslExpirationDate,
    licenseStatus: computedLicense.status,
    daysUntilExpiration: computedLicense.daysUntilExpiration,
    daysExpired: computedLicense.daysExpired,
    denverEligible: computedLicense.denverEligible,
    weeklyScheduledHours:
      typeof raw.weeklyScheduledHours === 'number' ? raw.weeklyScheduledHours : 0,
    maxWeeklyHours: typeof raw.maxWeeklyHours === 'number' ? raw.maxWeeklyHours : 40,
    assignedShiftIds: Array.isArray(raw.assignedShiftIds) ? [...raw.assignedShiftIds] : [],
  };
}

/**
 * Checks whether a candidate guard meets post qualifications for legacy callers.
 */
export function isGuardQualifiedForPost(
  guard: Guard,
  shift: any,
  sitesList: SiteProfile[] = INITIAL_SITES
): { qualified: boolean; isSiteTrained: boolean; reason?: string } {
  const siteProfile = findSiteProfile(shift.siteName, sitesList);
  const siteTrained = isGuardSiteTrained(guard as any, shift.siteName, siteProfile);
  return {
    qualified: true,
    isSiteTrained: siteTrained,
  };
}

/**
 * Checks whether a proposed shift has a direct time overlap OR violates the minimum rest turnaround interval.
 */
export function checkOverlapAndRestTurnaround(
  proposedShift: any,
  assignedShifts: any[],
  minRestHours: number
): {
  hasOverlap: boolean;
  hasRestViolation: boolean;
  nearestRestHours: number | null;
  conflictDetail?: string;
} {
  const normProposed = normalizeShiftRecord(proposedShift);
  const propBounds = getShiftWeekHourBounds(normProposed);
  let minRestGapHours: number | null = null;

  for (const rawExisting of assignedShifts) {
    if (rawExisting.status === 'cancelled' || rawExisting.id === normProposed.id) continue;
    const existing = normalizeShiftRecord(rawExisting);
    const exBounds = getShiftWeekHourBounds(existing);

    if (propBounds.startHour < exBounds.endHour && propBounds.endHour > exBounds.startHour) {
      return {
        hasOverlap: true,
        hasRestViolation: false,
        nearestRestHours: 0,
        conflictDetail: `Overlaps with ${existing.siteName} (${existing.dayOfWeek} ${existing.startTime}-${existing.endTime})`,
      };
    }

    const gapHours =
      exBounds.endHour <= propBounds.startHour
        ? propBounds.startHour - exBounds.endHour
        : exBounds.startHour - propBounds.endHour;

    if (minRestGapHours === null || gapHours < minRestGapHours) {
      minRestGapHours = Math.round(gapHours * 10) / 10;
    }

    if (gapHours < minRestHours) {
      return {
        hasOverlap: false,
        hasRestViolation: true,
        nearestRestHours: Math.round(gapHours * 10) / 10,
        conflictDetail: `Violates ${minRestHours}-hour turnaround rest period between shifts`,
      };
    }
  }

  return {
    hasOverlap: false,
    hasRestViolation: false,
    nearestRestHours: minRestGapHours,
  };
}

/**
 * Calculates how many consecutive days a guard would work if assigned to `targetDateStr`.
 */
export function getConsecutiveDaysWorked(existingDates: string[], targetDateStr: string): {
  consecutiveDaysBefore: number;
  consecutiveStreakWithTarget: number;
} {
  const uniqueDates = new Set(existingDates.filter(Boolean));
  return {
    consecutiveDaysBefore: uniqueDates.size,
    consecutiveStreakWithTarget: uniqueDates.has(targetDateStr)
      ? uniqueDates.size
      : uniqueDates.size + 1,
  };
}

/**
 * STATEFUL MULTI-DAY AUTO-FILL SCHEDULING ENGINE
 *
 * Enforces Denver Security License (DSL) jurisdiction eligibility, guard rating levels,
 * 40h weekly overtime ceilings, 12h turnaround rest periods, and least-loaded load balancing.
 */
export function autoFillShifts(
  unassignedShifts: any[],
  roster: any[],
  currentSchedule: any[] = [],
  constraints?: SchedulingConstraints
): AutoFillExecutionResult {
  const effectiveConstraints: SchedulingConstraints = {
    maxWeeklyHours: constraints?.maxWeeklyHours ?? DEFAULT_SCHEDULING_CONSTRAINTS.maxWeeklyHours,
    minRestHours: constraints?.minRestHours ?? DEFAULT_SCHEDULING_CONSTRAINTS.minRestHours,
    maxConsecutiveDays:
      constraints?.maxConsecutiveDays ?? DEFAULT_SCHEDULING_CONSTRAINTS.maxConsecutiveDays,
    enforceDenverLicense:
      constraints?.enforceDenverLicense ?? DEFAULT_SCHEDULING_CONSTRAINTS.enforceDenverLicense,
    enforceRatingCheck:
      constraints?.enforceRatingCheck ?? DEFAULT_SCHEDULING_CONSTRAINTS.enforceRatingCheck,
    allowOvertimeOverride:
      constraints?.allowOvertimeOverride ?? DEFAULT_SCHEDULING_CONSTRAINTS.allowOvertimeOverride,
  };

  // Normalize roster and existing schedule
  const normalizedRoster: GuardProfile[] = roster.map(normalizeGuardRecord);
  const normalizedSchedule: Shift[] = (currentSchedule || [])
    .filter((s) => s && (s as any).status !== 'cancelled')
    .map(normalizeShiftRecord);

  // Create in-memory mutable tracker for each guard:
  // { weeklyHours: guard.weeklyScheduledHours, assignedDays: Set<string>(), assignedShifts: Shift[] }
  interface GuardTrackerState {
    guard: GuardProfile;
    weeklyHours: number;
    assignedDays: Set<string>;
    assignedShifts: Shift[];
    assignedShiftIds: string[];
  }

  const trackerMap = new Map<string, GuardTrackerState>();

  for (const guard of normalizedRoster) {
    const existingForGuard = normalizedSchedule.filter(
      (s) =>
        s.assignedGuardId === guard.id ||
        (s.assignedGuardName && s.assignedGuardName.toLowerCase() === guard.name.toLowerCase())
    );

    const scheduleHoursSum = existingForGuard.reduce((sum, s) => sum + s.durationHours, 0);
    const initialWeeklyHours =
      guard.weeklyScheduledHours > 0 ? guard.weeklyScheduledHours : scheduleHoursSum;

    const assignedDays = new Set<string>();
    const assignedShiftIds = [...(guard.assignedShiftIds || [])];

    for (const s of existingForGuard) {
      assignedDays.add(s.dayOfWeek);
      if (s.id && !assignedShiftIds.includes(s.id)) {
        assignedShiftIds.push(s.id);
      }
    }

    trackerMap.set(guard.id, {
      guard: { ...guard },
      weeklyHours: initialWeeklyHours,
      assignedDays,
      assignedShifts: [...existingForGuard],
      assignedShiftIds,
    });
  }

  // Sort unassignedShifts chronologically by day of week (Sunday -> Saturday) and start time
  const sortedUnassigned: Shift[] = [...unassignedShifts]
    .map(normalizeShiftRecord)
    .sort((a, b) => {
      const dayA = DAY_ORDER[a.dayOfWeek] ?? 0;
      const dayB = DAY_ORDER[b.dayOfWeek] ?? 0;
      if (dayA !== dayB) return dayA - dayB;

      const timeA = parseTimeToDecimalHours(a.startTime);
      const timeB = parseTimeToDecimalHours(b.startTime);
      if (timeA !== timeB) return timeA - timeB;

      return a.id.localeCompare(b.id);
    });

  const updatedShiftsMap = new Map<string, Shift>();
  for (const existing of normalizedSchedule) {
    updatedShiftsMap.set(existing.id, { ...existing });
  }

  const newlyProcessedShifts: Shift[] = [];
  const unassigned: Shift[] = [];
  const logs: string[] = [];
  const assignments: ShiftAssignment[] = [];

  let filledCount = 0;
  let overtimePreventedCount = 0;
  let restTurnaroundPreventedCount = 0;
  const consecutiveDaysPreventedCount = 0;

  for (const shift of sortedUnassigned) {
    const eligibleCandidates: GuardTrackerState[] = [];

    for (const guard of normalizedRoster) {
      if (guard.status && guard.status.toUpperCase() !== 'ACTIVE') {
        continue;
      }

      const tracker = trackerMap.get(guard.id)!;

      // Guard must not already be booked on the same day during an overlapping time window
      const hasSameDayOverlap = tracker.assignedShifts.some(
        (existing) => existing.dayOfWeek === shift.dayOfWeek && doShiftsOverlap(existing, shift)
      );
      if (hasSameDayOverlap) {
        continue;
      }

      // Build current guard snapshot with accumulated weeklyHours
      const currentGuardSnapshot: GuardProfile = {
        ...tracker.guard,
        weeklyScheduledHours: tracker.weeklyHours,
        assignedShiftIds: tracker.assignedShiftIds,
      };

      const eligibility = checkShiftEligibility(
        currentGuardSnapshot,
        shift,
        tracker.assignedShifts,
        effectiveConstraints
      );

      if (!eligibility.eligible) {
        if (eligibility.violations.some((v) => v.type === 'REST_TURNAROUND')) {
          restTurnaroundPreventedCount++;
        }
        continue;
      }

      eligibleCandidates.push(tracker);
    }

    // 2. Candidate Selection (Least-Loaded Load Balancing):
    // - From eligible guards, select the candidate with the lowest accumulated weeklyHours.
    // - Tie-breaker: guard with higher rating or seniority.
    eligibleCandidates.sort((a, b) => {
      if (a.weeklyHours !== b.weeklyHours) {
        return a.weeklyHours - b.weeklyHours;
      }
      if (b.guard.rating !== a.guard.rating) {
        return b.guard.rating - a.guard.rating;
      }
      const senA = a.guard.seniorityYears ?? 0;
      const senB = b.guard.seniorityYears ?? 0;
      if (senB !== senA) {
        return senB - senA;
      }
      const metricsA = GUARD_BASE_METRICS[a.guard.id]?.ratingAverage ?? 0;
      const metricsB = GUARD_BASE_METRICS[b.guard.id]?.ratingAverage ?? 0;
      return metricsB - metricsA;
    });

    const chosen = eligibleCandidates[0];

    // 3. State Accumulation
    if (chosen) {
      const weeklyHoursBefore = chosen.weeklyHours;
      const weeklyHoursAfter =
        Math.round((weeklyHoursBefore + shift.durationHours) * 100) / 100;

      const assignedShift: Shift = {
        ...shift,
        status: 'filled',
        assignedGuardId: chosen.guard.id,
        assignedGuardName: chosen.guard.name,
      };

      chosen.weeklyHours = weeklyHoursAfter;
      chosen.assignedDays.add(shift.dayOfWeek);
      chosen.assignedShifts.push(assignedShift);
      if (!chosen.assignedShiftIds.includes(shift.id)) {
        chosen.assignedShiftIds.push(shift.id);
      }

      newlyProcessedShifts.push(assignedShift);
      updatedShiftsMap.set(assignedShift.id, assignedShift);
      filledCount++;

      const logEntry = `[ASSIGNED] ${chosen.guard.name} -> ${shift.siteName} (${shift.dayOfWeek} ${shift.startTime}-${shift.endTime}, ${shift.durationHours}h)`;
      logs.push(logEntry);

      assignments.push({
        shiftId: shift.id,
        shift: assignedShift,
        guardId: chosen.guard.id,
        guardName: chosen.guard.name,
        guardBadge: chosen.guard.badgeNumber,
        siteName: shift.siteName,
        date: shift.date || shift.dayOfWeek,
        startTime: shift.startTime,
        endTime: shift.endTime,
        durationHours: shift.durationHours,
        weeklyHoursBefore,
        weeklyHoursAfter,
        restHoursGap: null,
        consecutiveDaysAfter: chosen.assignedDays.size,
        isSiteTrained: isGuardSiteTrained(chosen.guard as any, shift.siteName),
        reason: `Load-balanced assignment (${weeklyHoursBefore}h → ${weeklyHoursAfter}h/${effectiveConstraints.maxWeeklyHours}h wk)`,
      });
    } else {
      const openShift: Shift = {
        ...shift,
        status: 'open',
        assignedGuardId: undefined,
        assignedGuardName: undefined,
      };

      newlyProcessedShifts.push(openShift);
      updatedShiftsMap.set(openShift.id, openShift);
      unassigned.push(openShift);
      overtimePreventedCount++;

      const openLog = `[OPEN] ${shift.siteName} (${shift.dayOfWeek}) left unfilled: all qualified personnel at weekly 40h limit or missing Denver DSL`;
      logs.push(openLog);
    }
  }

  const updatedRoster: GuardProfile[] = normalizedRoster.map((g) => {
    const tracker = trackerMap.get(g.id)!;
    return {
      ...g,
      weeklyScheduledHours: tracker.weeklyHours,
      assignedShiftIds: [...tracker.assignedShiftIds],
    };
  });

  // Combine updated schedule shifts, preserving updated assignments
  const updatedShifts: Shift[] =
    currentSchedule && currentSchedule.length > 0
      ? Array.from(updatedShiftsMap.values())
      : newlyProcessedShifts;

  const guardTrackers: Record<string, GuardWorkloadTracker> = {};
  trackerMap.forEach((tracker, guardId) => {
    guardTrackers[guardId] = {
      weeklyHours: tracker.weeklyHours,
      weeklyHoursByWeek: { current: tracker.weeklyHours },
      shiftDates: Array.from(tracker.assignedDays),
      assignedDays: new Set(tracker.assignedDays),
      assignedShifts: [...tracker.assignedShifts],
    };
  });

  return {
    updatedShifts,
    updatedRoster,
    unassigned,
    executionSummary: {
      filledCount,
      unassignedCount: unassigned.length,
      overtimePreventedCount,
      logs,
    },
    // Legacy compatibility fields
    assignments,
    auditLog: logs,
    overtimePreventedCount,
    restTurnaroundPreventedCount,
    consecutiveDaysPreventedCount,
    guardTrackers,
  };
}
