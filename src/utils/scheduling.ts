import { 
  Shift, 
  ScheduledShift, 
  GuardProfile, 
  PriorityShiftMatch,
  ShiftClaimEligibilityResult,
  ShiftClaimCheckType
} from '../types/shift';
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

/**
 * Calculates a guard's scheduled and filled hours for the Monday-Sunday work week containing targetDateStr.
 */
export function getWeeklyHoursForGuard(
  guardId: string,
  targetDateStr: string,
  scheduledShifts: ScheduledShift[],
  shifts: Shift[],
  guardName?: string
): {
  weekStartIso: string;
  weekEndIso: string;
  weekLabel: string;
  totalWeeklyHours: number;
  assignedShiftCount: number;
  shiftsInWeek: Array<ScheduledShift | Shift>;
} {
  const targetDate = new Date(`${targetDateStr}T12:00:00`);
  if (isNaN(targetDate.getTime())) {
    return {
      weekStartIso: targetDateStr,
      weekEndIso: targetDateStr,
      weekLabel: 'Current Week',
      totalWeeklyHours: 0,
      assignedShiftCount: 0,
      shiftsInWeek: []
    };
  }

  // Calculate Monday (start of work week) and Sunday (end of work week)
  const day = targetDate.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  
  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const mondayStr = monday.toISOString().split('T')[0];
  const sundayStr = sunday.toISOString().split('T')[0];

  const shiftsInWeek: Array<ScheduledShift | Shift> = [];
  const processedShiftIds = new Set<string>();

  // 1. Scheduled shifts
  for (const s of scheduledShifts) {
    if (s.guardId === guardId && s.status !== 'cancelled') {
      if (s.date >= mondayStr && s.date <= sundayStr) {
        shiftsInWeek.push(s);
        processedShiftIds.add(s.id);
      }
    }
  }

  // 2. Filled shifts from general shifts list (avoiding duplicate ID)
  for (const s of shifts) {
    if (
      s.status === 'filled' &&
      !processedShiftIds.has(s.id) &&
      (s.assignedGuardId === guardId || (guardName && s.assignedGuardName?.toLowerCase() === guardName.toLowerCase()))
    ) {
      if (s.date >= mondayStr && s.date <= sundayStr) {
        shiftsInWeek.push(s);
        processedShiftIds.add(s.id);
      }
    }
  }

  const totalWeeklyHours = shiftsInWeek.reduce((sum, s) => {
    const h = s.hours || calculateHours(s.startTime, s.endTime) || 8;
    return sum + h;
  }, 0);

  const weekLabel = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return {
    weekStartIso: mondayStr,
    weekEndIso: sundayStr,
    weekLabel,
    totalWeeklyHours: Math.round(totalWeeklyHours * 10) / 10,
    assignedShiftCount: shiftsInWeek.length,
    shiftsInWeek
  };
}

/**
 * Evaluates the 3 mandatory pre-claim checks for 1-click shift claiming:
 * 1. Site Training / OJT Qualification: Guard must be trained for this site.
 * 2. Rest / Turnaround Time Buffer: Guard must not have direct overlap and must meet minRestHours (turnaround) buffer.
 * 3. Weekly 40-Hour Regular Limit (Overtime Check): Claiming this shift must not push guard over 40.0 hours for the week.
 *
 * If ANY check fails, isAutoApprovable is false and requiresAdminApproval is true.
 */
export function evaluateShiftClaimEligibility(
  shift: Shift,
  guard: GuardProfile,
  scheduledShifts: ScheduledShift[],
  shifts: Shift[],
  minRestHours: number = 6
): ShiftClaimEligibilityResult {
  const failedChecks: ShiftClaimCheckType[] = [];
  
  // ----------------------------------------------------
  // CHECK 1: Site Training / OJT Qualification Check
  // ----------------------------------------------------
  const cleanSiteName = (shift.siteName || '').trim().toLowerCase();
  const isSiteTrained = (guard.ojtSites || []).some((trainedSite) => {
    const cleanTrained = trainedSite.trim().toLowerCase();
    return (
      cleanTrained === cleanSiteName ||
      cleanSiteName.includes(cleanTrained) ||
      cleanTrained.includes(cleanSiteName)
    );
  });

  let siteTrainingReason: string | undefined;
  if (!isSiteTrained) {
    failedChecks.push('site_training');
    siteTrainingReason = `Officer ${guard.name} (${guard.badgeNumber}) is not OJT-certified/trained for "${shift.siteName}". (Certified sites: ${guard.ojtSites?.join(', ') || 'None'})`;
  }

  // ----------------------------------------------------
  // CHECK 2: Minimum Rest / Turnaround Buffer & Overlap Check
  // ----------------------------------------------------
  const guardAssignedShifts: Array<ScheduledShift | Shift> = [
    ...scheduledShifts.filter((s) => s.guardId === guard.id && s.status !== 'cancelled'),
    ...shifts.filter(
      (s) =>
        s.status === 'filled' &&
        (s.assignedGuardId === guard.id || s.assignedGuardName?.toLowerCase() === guard.name.toLowerCase())
    )
  ];

  const conflict = checkShiftScheduleConflict(shift, guardAssignedShifts, minRestHours);
  const isRestBufferValid = conflict.isEligible;
  let restBufferReason: string | undefined;

  if (!isRestBufferValid) {
    failedChecks.push('rest_buffer');
    restBufferReason = conflict.conflictReason || 'Turnaround rest limit / schedule conflict detected.';
  }

  // ----------------------------------------------------
  // CHECK 3: 40-Hour Weekly Overtime Limit Check
  // ----------------------------------------------------
  const weeklyInfo = getWeeklyHoursForGuard(guard.id, shift.date, scheduledShifts, shifts, guard.name);
  const currentWeeklyHours = weeklyInfo.totalWeeklyHours;
  const shiftHours = shift.hours || calculateHours(shift.startTime, shift.endTime) || 8;
  const projectedWeeklyHours = Math.round((currentWeeklyHours + shiftHours) * 10) / 10;
  const isOvertimeCompliant = projectedWeeklyHours <= 40.0;
  const overtimeHours = isOvertimeCompliant ? 0 : Math.round((projectedWeeklyHours - 40.0) * 10) / 10;
  
  let overtimeReason: string | undefined;
  if (!isOvertimeCompliant) {
    failedChecks.push('overtime');
    overtimeReason = `Overtime threshold exceeded: Officer currently has ${currentWeeklyHours}h scheduled this week (${weeklyInfo.weekLabel}). Adding this ${shiftHours}h shift brings total to ${projectedWeeklyHours}h (${overtimeHours}h Overtime).`;
  }

  // ----------------------------------------------------
  // Summary & Approval Determination
  // ----------------------------------------------------
  const isAutoApprovable = failedChecks.length === 0;
  const requiresAdminApproval = failedChecks.length > 0;

  let summaryMessage = 'All pre-claim checks passed. Shift auto-approved for 1-click scheduling.';
  if (requiresAdminApproval) {
    const reasons: string[] = [];
    if (!isSiteTrained) reasons.push('Not trained on site');
    if (!isRestBufferValid) reasons.push('Rest buffer/turnaround violation');
    if (!isOvertimeCompliant) reasons.push(`Overtime threshold exceeded (${projectedWeeklyHours}h/40h)`);
    summaryMessage = `Admin review required: ${reasons.join(', ')}.`;
  }

  return {
    isAutoApprovable,
    requiresAdminApproval,
    isSiteTrained,
    siteTrainingReason,
    isRestBufferValid,
    restBufferReason,
    conflict,
    isOvertimeCompliant,
    overtimeReason,
    currentWeeklyHours,
    shiftHours,
    projectedWeeklyHours,
    overtimeHours,
    failedChecks,
    summaryMessage
  };
}
