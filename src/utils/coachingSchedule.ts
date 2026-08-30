import { Shift, ScheduledShift, GuardCoachingSession } from '../types/shift';
import { parseShiftTimeWindow } from './scheduling';

export interface CoachingConflictResult {
  hasConflict: boolean;
  hasShiftOverlap: boolean;
  hasBufferViolation: boolean;
  isRestricted: boolean; // true if conflict exists and not overridden
  overlapShift?: Shift | ScheduledShift;
  bufferShiftBefore?: Shift | ScheduledShift;
  bufferShiftAfter?: Shift | ScheduledShift;
  bufferHoursBefore?: number;
  bufferHoursAfter?: number;
  minBufferObserved?: number;
  conflictDescription?: string;
  allDayShifts: Array<Shift | ScheduledShift>;
}

/**
 * Validates a proposed coaching session against a guard's scheduled and assigned shifts.
 * Enforces:
 * 1. Zero overlap with any duty shift.
 * 2. At least an 8-hour buffer before or after any assigned shift.
 */
export function validateCoachingScheduleSlot(
  guardId: string,
  proposedDate: string, // YYYY-MM-DD
  proposedTime: string, // HH:mm
  durationMinutes: number = 45,
  scheduledShifts: ScheduledShift[] = [],
  shifts: Shift[] = [],
  minBufferHours: number = 8
): CoachingConflictResult {
  if (!proposedDate || !proposedTime) {
    return {
      hasConflict: false,
      hasShiftOverlap: false,
      hasBufferViolation: false,
      isRestricted: false,
      allDayShifts: []
    };
  }

  // Calculate coaching start and end in epoch ms
  const coachingStartIso = `${proposedDate}T${proposedTime.length === 5 ? proposedTime : '14:00'}:00`;
  const coachingStartDate = new Date(coachingStartIso);
  const coachingStartMs = coachingStartDate.getTime();
  const coachingEndMs = coachingStartMs + durationMinutes * 60 * 1000;

  if (isNaN(coachingStartMs)) {
    return {
      hasConflict: false,
      hasShiftOverlap: false,
      hasBufferViolation: false,
      isRestricted: false,
      allDayShifts: []
    };
  }

  const minBufferMs = minBufferHours * 3600 * 1000;

  // Gather all relevant shifts for this guard
  const guardShiftsMap = new Map<string, Shift | ScheduledShift>();

  scheduledShifts.forEach((s) => {
    if (s.guardId === guardId && s.status !== 'cancelled') {
      guardShiftsMap.set(s.id, s);
    }
  });

  shifts.forEach((s) => {
    if (s.assignedGuardId === guardId && s.status !== 'cancelled') {
      if (!guardShiftsMap.has(s.id)) {
        guardShiftsMap.set(s.id, s);
      }
    }
  });

  const guardShifts = Array.from(guardShiftsMap.values());

  // Filter shifts on the same day or adjacent days (within 24h of coaching date)
  const allDayShifts = guardShifts.filter((s) => {
    const shiftDate = s.date;
    const dayDiff = Math.abs(
      (new Date(shiftDate).getTime() - new Date(proposedDate).getTime()) / (1000 * 3600 * 24)
    );
    return dayDiff <= 1.5;
  });

  let hasShiftOverlap = false;
  let hasBufferViolation = false;
  let overlapShift: Shift | ScheduledShift | undefined;
  let bufferShiftBefore: Shift | ScheduledShift | undefined;
  let bufferShiftAfter: Shift | ScheduledShift | undefined;
  let minGapBeforeMs = Infinity;
  let minGapAfterMs = Infinity;

  for (const s of guardShifts) {
    const { startMs: shiftStartMs, endMs: shiftEndMs } = parseShiftTimeWindow(
      s.date,
      s.startTime,
      s.endTime,
      s.hours
    );

    if (shiftStartMs === 0 || shiftEndMs === 0) continue;

    // 1. Direct Overlap Check
    const overlaps = coachingStartMs < shiftEndMs && coachingEndMs > shiftStartMs;
    if (overlaps) {
      hasShiftOverlap = true;
      overlapShift = s;
      break; // Immediate hard conflict
    }

    // 2. Buffer Check: Shift ending before coaching starts
    if (shiftEndMs <= coachingStartMs) {
      const gapMs = coachingStartMs - shiftEndMs;
      if (gapMs < minBufferMs) {
        if (gapMs < minGapBeforeMs) {
          minGapBeforeMs = gapMs;
          bufferShiftBefore = s;
          hasBufferViolation = true;
        }
      }
    }

    // 3. Buffer Check: Shift starting after coaching ends
    if (shiftStartMs >= coachingEndMs) {
      const gapMs = shiftStartMs - coachingEndMs;
      if (gapMs < minBufferMs) {
        if (gapMs < minGapAfterMs) {
          minGapAfterMs = gapMs;
          bufferShiftAfter = s;
          hasBufferViolation = true;
        }
      }
    }
  }

  const bufferHoursBefore = isFinite(minGapBeforeMs)
    ? Math.round((minGapBeforeMs / (3600 * 1000)) * 10) / 10
    : undefined;
  const bufferHoursAfter = isFinite(minGapAfterMs)
    ? Math.round((minGapAfterMs / (3600 * 1000)) * 10) / 10
    : undefined;

  const minBufferObserved = Math.min(
    bufferHoursBefore !== undefined ? bufferHoursBefore : Infinity,
    bufferHoursAfter !== undefined ? bufferHoursAfter : Infinity
  );

  let conflictDescription = '';
  if (hasShiftOverlap && overlapShift) {
    const site = overlapShift.siteName || 'Assigned Shift';
    conflictDescription = `Direct overlap with scheduled post at "${site}" (${overlapShift.date} ${overlapShift.startTime}-${overlapShift.endTime}).`;
  } else if (hasBufferViolation) {
    const violatedShifts: string[] = [];
    if (bufferShiftBefore && bufferHoursBefore !== undefined) {
      const site = bufferShiftBefore.siteName || 'Shift';
      violatedShifts.push(
        `Preceding shift at "${site}" ends at ${bufferShiftBefore.endTime} (${bufferHoursBefore}h rest, need ≥${minBufferHours}h)`
      );
    }
    if (bufferShiftAfter && bufferHoursAfter !== undefined) {
      const site = bufferShiftAfter.siteName || 'Shift';
      violatedShifts.push(
        `Subsequent shift at "${site}" starts at ${bufferShiftAfter.startTime} (${bufferHoursAfter}h rest, need ≥${minBufferHours}h)`
      );
    }
    conflictDescription = `Rest buffer policy violation: ${violatedShifts.join(' & ')}.`;
  }

  const hasConflict = hasShiftOverlap || hasBufferViolation;

  return {
    hasConflict,
    hasShiftOverlap,
    hasBufferViolation,
    isRestricted: hasConflict,
    overlapShift,
    bufferShiftBefore,
    bufferShiftAfter,
    bufferHoursBefore,
    bufferHoursAfter,
    minBufferObserved: isFinite(minBufferObserved) ? minBufferObserved : undefined,
    conflictDescription: conflictDescription || undefined,
    allDayShifts
  };
}

/**
 * Validates that an alternate proposed date from a guard is no more than 1 week (7 days)
 * from the original scheduled date.
 */
export function validateAlternateCoachingDate(
  originalDateStr: string,
  proposedDateStr: string
): {
  isValid: boolean;
  daysDiff: number;
  maxAllowedDateStr: string;
  minAllowedDateStr: string;
  errorMessage?: string;
} {
  const origDate = new Date(originalDateStr);
  const propDate = new Date(proposedDateStr);

  // Set today as min date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minAllowedDate = new Date(today);
  const minAllowedDateStr = minAllowedDate.toISOString().split('T')[0];

  // Max allowed is original date + 7 days
  const maxAllowedDate = new Date(origDate);
  maxAllowedDate.setDate(maxAllowedDate.getDate() + 7);
  const maxAllowedDateStr = maxAllowedDate.toISOString().split('T')[0];

  if (isNaN(propDate.getTime())) {
    return {
      isValid: false,
      daysDiff: 0,
      maxAllowedDateStr,
      minAllowedDateStr,
      errorMessage: 'Please select a valid date.'
    };
  }

  // Calculate day difference from original date
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiffFromOriginal = Math.round((propDate.getTime() - origDate.getTime()) / msPerDay);
  const daysDiffFromToday = Math.round((propDate.getTime() - today.getTime()) / msPerDay);

  if (daysDiffFromToday < 0) {
    return {
      isValid: false,
      daysDiff: daysDiffFromOriginal,
      maxAllowedDateStr,
      minAllowedDateStr,
      errorMessage: 'Alternate date cannot be in the past.'
    };
  }

  if (daysDiffFromOriginal > 7) {
    return {
      isValid: false,
      daysDiff: daysDiffFromOriginal,
      maxAllowedDateStr,
      minAllowedDateStr,
      errorMessage: `Proposed date cannot exceed 1 week (7 days) from the original scheduled date (${originalDateStr}). Max allowed is ${maxAllowedDateStr}.`
    };
  }

  return {
    isValid: true,
    daysDiff: daysDiffFromOriginal,
    maxAllowedDateStr,
    minAllowedDateStr
  };
}

/**
 * Generates recommended conflict-free time slots for a given date
 */
export function getRecommendedCoachingSlots(
  guardId: string,
  dateStr: string,
  scheduledShifts: ScheduledShift[] = [],
  shifts: Shift[] = []
): Array<{ time: string; label: string; isClear: boolean; conflictReason?: string }> {
  const commonSlots = [
    '09:00',
    '10:30',
    '13:00',
    '14:30',
    '16:00',
    '17:30'
  ];

  return commonSlots.map((time) => {
    const check = validateCoachingScheduleSlot(
      guardId,
      dateStr,
      time,
      45,
      scheduledShifts,
      shifts,
      8
    );

    const [hours, mins] = time.split(':');
    const hourNum = parseInt(hours, 10);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
    const label = `${displayHour}:${mins} ${period}`;

    return {
      time,
      label,
      isClear: !check.hasConflict,
      conflictReason: check.conflictDescription
    };
  });
}

/**
 * Format a date and time string nicely for UI display
 */
export function formatCoachingDateTime(dateStr: string, timeStr: string): string {
  try {
    const [hours, mins] = (timeStr || '14:00').split(':');
    const hourNum = parseInt(hours, 10);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
    const timeFormatted = `${displayHour}:${mins || '00'} ${period}`;

    const dateObj = new Date(`${dateStr}T12:00:00`);
    const dateFormatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return `${dateFormatted} at ${timeFormatted}`;
  } catch (e) {
    return `${dateStr} ${timeStr}`;
  }
}

