import { Shift, ScheduledShift, GuardProfile, PriorityShiftMatch } from '../types/shift';
import { calculateHours } from './time';

/**
 * Parses start and end timestamps for a shift, accurately handling overnight shifts
 */
export function parseShiftTimeWindow(
  dateStr: string,
  startTimeStr: string,
  endTimeStr: string,
  hoursOverride?: number
): { startMs: number; endMs: number; startIso: string; endIso: string } {
  const cleanStartTime = (startTimeStr || '08:00').trim();
  const cleanEndTime = (endTimeStr || '16:00').trim();

  const startIsoStr = `${dateStr}T${cleanStartTime.length === 5 ? cleanStartTime : '08:00'}:00`;
  const startDate = new Date(startIsoStr);
  const startMs = startDate.getTime();

  let endMs: number;

  if (hoursOverride && hoursOverride > 0) {
    endMs = startMs + hoursOverride * 3600 * 1000;
  } else {
    const calculated = calculateHours(cleanStartTime, cleanEndTime);
    const durationHours = calculated > 0 ? calculated : 8;
    endMs = startMs + durationHours * 3600 * 1000;
  }

  const endDate = new Date(endMs);

  return {
    startMs: isNaN(startMs) ? 0 : startMs,
    endMs: isNaN(endMs) ? 0 : endMs,
    startIso: !isNaN(startMs) ? startDate.toISOString() : '',
    endIso: !isNaN(endMs) ? endDate.toISOString() : ''
  };
}

/**
 * Checks if a shift start time falls within the next 24 hours from the reference time
 */
export function isShiftOccurringInNext24Hours(
  shift: { date: string; startTime: string; endTime?: string; hours?: number },
  referenceDate: Date = new Date()
): { inWindow: boolean; startsInMs: number; startsInHours: number; startsInMinutes: number; startMs: number; endMs: number } {
  const { startMs, endMs } = parseShiftTimeWindow(
    shift.date,
    shift.startTime,
    shift.endTime || '16:00',
    shift.hours
  );

  if (startMs === 0) {
    return { inWindow: false, startsInMs: 0, startsInHours: 0, startsInMinutes: 0, startMs: 0, endMs: 0 };
  }

  const nowMs = referenceDate.getTime();
  const diffMs = startMs - nowMs;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  // Within the next 24 hours: starts between -30 mins ago (urgent late fill) and +24 hours from now
  const inWindow = diffMs >= -30 * 60 * 1000 && diffMs <= twentyFourHoursMs;

  const totalMinutes = Math.floor(Math.max(0, diffMs) / 60000);
  const startsInHours = Math.floor(totalMinutes / 60);
  const startsInMinutes = totalMinutes % 60;

  return {
    inWindow,
    startsInMs: diffMs,
    startsInHours,
    startsInMinutes,
    startMs,
    endMs
  };
}

export interface ScheduleConflictCheckResult {
  hasOverlap: boolean;
  hasInsufficientRest: boolean;
  isEligible: boolean;
  overlappingShift?: ScheduledShift | Shift;
  adjacentShiftBefore?: ScheduledShift | Shift;
  adjacentShiftAfter?: ScheduledShift | Shift;
  restHoursBefore?: number;
  restHoursAfter?: number;
  conflictReason?: string;
}

/**
 * Validates whether a proposed open shift conflicts with any of a guard's scheduled shifts.
 * Enforces two strict constraints:
 * 1. ZERO OVERLAP: No overlapping duty hours.
 * 2. REST BUFFER: At least 6 hours (or custom minRestHours) rest gap before and after any adjacent scheduled shift.
 */
export function checkShiftScheduleConflict(
  openShift: Shift,
  guardShifts: Array<ScheduledShift | Shift>,
  minRestHours: number = 6
): ScheduleConflictCheckResult {
  const { startMs: openStart, endMs: openEnd } = parseShiftTimeWindow(
    openShift.date,
    openShift.startTime,
    openShift.endTime,
    openShift.hours
  );

  if (openStart === 0 || openEnd === 0) {
    return {
      hasOverlap: false,
      hasInsufficientRest: false,
      isEligible: true
    };
  }

  const minRestMs = minRestHours * 3600 * 1000;

  let closestShiftBefore: ScheduledShift | Shift | undefined;
  let maxBeforeEndMs = -Infinity;
  let minGapBeforeMs = Infinity;

  let closestShiftAfter: ScheduledShift | Shift | undefined;
  let minAfterStartMs = Infinity;
  let minGapAfterMs = Infinity;

  for (const s of guardShifts) {
    // Ignore cancelled shifts
    if ('status' in s && s.status === 'cancelled') continue;

    const { startMs: assignedStart, endMs: assignedEnd } = parseShiftTimeWindow(
      s.date,
      s.startTime,
      s.endTime,
      s.hours
    );

    if (assignedStart === 0 || assignedEnd === 0) continue;

    // 1. Direct Overlap Check:
    // Intervals [openStart, openEnd) and [assignedStart, assignedEnd) overlap if:
    // openStart < assignedEnd AND openEnd > assignedStart
    const overlaps = openStart < assignedEnd && openEnd > assignedStart;
    if (overlaps) {
      const site = s.siteName || ('postRole' in s ? (s as any).postRole : 'Scheduled Shift');
      return {
        hasOverlap: true,
        hasInsufficientRest: false,
        isEligible: false,
        overlappingShift: s,
        conflictReason: `Shift overlaps with scheduled post at "${site}" (${s.date} ${s.startTime}-${s.endTime}).`
      };
    }

    // 2. Rest Gap Check: Prior shift ending before open shift starts
    if (assignedEnd <= openStart) {
      const gapMs = openStart - assignedEnd;
      if (assignedEnd > maxBeforeEndMs) {
        maxBeforeEndMs = assignedEnd;
        minGapBeforeMs = gapMs;
        closestShiftBefore = s;
      }
    }

    // 3. Rest Gap Check: Next shift starting after open shift ends
    if (assignedStart >= openEnd) {
      const gapMs = assignedStart - openEnd;
      if (assignedStart < minAfterStartMs) {
        minAfterStartMs = assignedStart;
        minGapAfterMs = gapMs;
        closestShiftAfter = s;
      }
    }
  }

  // Evaluate rest buffer before
  const restHoursBefore = minGapBeforeMs !== Infinity ? Math.round((minGapBeforeMs / 3600000) * 10) / 10 : undefined;
  const hasInsufficientRestBefore = minGapBeforeMs !== Infinity && minGapBeforeMs < minRestMs;

  // Evaluate rest buffer after
  const restHoursAfter = minGapAfterMs !== Infinity ? Math.round((minGapAfterMs / 3600000) * 10) / 10 : undefined;
  const hasInsufficientRestAfter = minGapAfterMs !== Infinity && minGapAfterMs < minRestMs;

  if (hasInsufficientRestBefore && closestShiftBefore) {
    const site = closestShiftBefore.siteName || 'Previous Shift';
    return {
      hasOverlap: false,
      hasInsufficientRest: true,
      isEligible: false,
      adjacentShiftBefore: closestShiftBefore,
      adjacentShiftAfter: closestShiftAfter,
      restHoursBefore,
      restHoursAfter,
      conflictReason: `Insufficient rest buffer: only ${restHoursBefore}h rest after prior shift at "${site}" (ends ${closestShiftBefore.endTime}). Mandated rest is ${minRestHours}h.`
    };
  }

  if (hasInsufficientRestAfter && closestShiftAfter) {
    const site = closestShiftAfter.siteName || 'Next Shift';
    return {
      hasOverlap: false,
      hasInsufficientRest: true,
      isEligible: false,
      adjacentShiftBefore: closestShiftBefore,
      adjacentShiftAfter: closestShiftAfter,
      restHoursBefore,
      restHoursAfter,
      conflictReason: `Insufficient rest buffer: only ${restHoursAfter}h rest before subsequent shift at "${site}" (starts ${closestShiftAfter.startTime}). Mandated rest is ${minRestHours}h.`
    };
  }

  return {
    hasOverlap: false,
    hasInsufficientRest: false,
    isEligible: true,
    adjacentShiftBefore: closestShiftBefore,
    adjacentShiftAfter: closestShiftAfter,
    restHoursBefore,
    restHoursAfter
  };
}

/**
 * Finds all open unfilled shifts occurring in the next 24 hours, evaluating guard eligibility
 * against their scheduled assignments and 6-hour rest buffers.
 */
export function evaluatePriorityShiftsForGuard(
  shifts: Shift[],
  scheduledShifts: ScheduledShift[],
  guard: GuardProfile,
  options?: {
    referenceDate?: Date;
    minRestHours?: number;
    siteQualifiedOnly?: boolean;
  }
): PriorityShiftMatch[] {
  const refDate = options?.referenceDate || new Date();
  const minRest = options?.minRestHours !== undefined ? options.minRestHours : 6;

  // Collect all existing assignments for the guard
  const guardAssignedShifts: Array<ScheduledShift | Shift> = [
    ...scheduledShifts.filter((s) => s.guardId === guard.id && s.status !== 'cancelled'),
    ...shifts.filter(
      (s) =>
        s.status === 'filled' &&
        (s.assignedGuardId === guard.id || s.assignedGuardName?.toLowerCase() === guard.name.toLowerCase())
    )
  ];

  // Filter open unfilled shifts
  const openShifts = shifts.filter((s) => s.status === 'open' && !s.assignedGuardId);

  const results: PriorityShiftMatch[] = [];

  for (const shift of openShifts) {
    const { inWindow, startsInHours, startsInMinutes, startMs, endMs } = isShiftOccurringInNext24Hours(
      shift,
      refDate
    );

    if (!inWindow) continue;

    const conflict = checkShiftScheduleConflict(shift, guardAssignedShifts, minRest);

    // Site qualification check
    const isSiteQualified = guard.ojtSites.some((site) =>
      shift.siteName.toLowerCase().includes(site.toLowerCase())
    );

    if (options?.siteQualifiedOnly && !isSiteQualified) {
      continue;
    }

    // Urgency surge bonus calculation (emergency + short-notice premium)
    let surgeBonusRate = 0;
    if (shift.urgency === 'emergency') {
      surgeBonusRate += 3.50;
    }
    if (startsInHours <= 6) {
      surgeBonusRate += 2.00;
    } else if (startsInHours <= 12) {
      surgeBonusRate += 1.00;
    }

    results.push({
      shift,
      startsInHours,
      startsInMinutes,
      isEligible: conflict.isEligible,
      hasOverlap: conflict.hasOverlap,
      overlappingShift: conflict.overlappingShift,
      hasInsufficientRest: conflict.hasInsufficientRest,
      restHoursBefore: conflict.restHoursBefore,
      restHoursAfter: conflict.restHoursAfter,
      adjacentShiftBefore: conflict.adjacentShiftBefore,
      adjacentShiftAfter: conflict.adjacentShiftAfter,
      conflictReason: conflict.conflictReason,
      isSiteQualified,
      surgeBonusRate: surgeBonusRate > 0 ? surgeBonusRate : undefined,
      startsAtIso: new Date(startMs).toISOString(),
      endsAtIso: new Date(endMs).toISOString()
    });
  }

  // Sort: Eligible first, then soonest start time, then emergency
  return results.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;

    const aTime = new Date(a.startsAtIso).getTime();
    const bTime = new Date(b.startsAtIso).getTime();
    if (aTime !== bTime) return aTime - bTime;

    if (a.shift.urgency === 'emergency' && b.shift.urgency !== 'emergency') return -1;
    if (a.shift.urgency !== 'emergency' && b.shift.urgency === 'emergency') return 1;

    return 0;
  });
}

/**
 * Formats rest buffer gap into human-readable string
 */
export function formatRestBuffer(hours?: number): string {
  if (hours === undefined || isNaN(hours)) return 'No adjacent shift';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h 00m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}
