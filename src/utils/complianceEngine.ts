import {
  GuardProfile,
  LicenseStatus,
  SchedulingConstraints,
  SchedulingViolation,
  Shift,
} from '../types/scheduling';

const DAY_INDEX_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * Parses a "HH:MM" 24-hour string into decimal hours since 00:00.
 */
export function parseTimeToDecimalHours(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':').map(Number);
  const hours = !isNaN(parts[0]) ? parts[0] : 0;
  const minutes = !isNaN(parts[1]) ? parts[1] : 0;
  return hours + minutes / 60;
}

/**
 * Computes the start and end offset in hours relative to Sunday 00:00 for a Shift.
 */
export function getShiftWeekHourBounds(shift: Shift): { startHour: number; endHour: number } {
  let dayIdx = DAY_INDEX_MAP[shift.dayOfWeek];
  if (dayIdx === undefined && shift.date) {
    const parsed = new Date(shift.date + 'T12:00:00');
    if (!isNaN(parsed.getTime())) {
      dayIdx = parsed.getDay();
    }
  }
  if (dayIdx === undefined) {
    dayIdx = 0;
  }

  const startDecimal = parseTimeToDecimalHours(shift.startTime);
  const endDecimal = parseTimeToDecimalHours(shift.endTime);

  const startHour = dayIdx * 24 + startDecimal;
  let duration = shift.durationHours;
  if (typeof duration !== 'number' || duration <= 0) {
    duration = endDecimal > startDecimal ? endDecimal - startDecimal : 24 - startDecimal + endDecimal;
  }

  const endHour = startHour + duration;
  return { startHour, endHour };
}

/**
 * Checks whether two shifts overlap in time on the weekly timeline.
 */
export function doShiftsOverlap(shiftA: Shift, shiftB: Shift): boolean {
  if (shiftA.id && shiftB.id && shiftA.id === shiftB.id) return false;
  const boundsA = getShiftWeekHourBounds(shiftA);
  const boundsB = getShiftWeekHourBounds(shiftB);
  return boundsA.startHour < boundsB.endHour && boundsA.endHour > boundsB.startHour;
}

/**
 * Calculates Denver Security License (DSL) compliance status from an expiration date string.
 */
export function calculateLicenseStatus(expirationDate: string | null): {
  status: LicenseStatus;
  daysUntilExpiration: number;
  daysExpired: number;
  denverEligible: boolean;
} {
  if (
    expirationDate === null ||
    expirationDate === undefined ||
    expirationDate.trim() === '' ||
    expirationDate.trim().toUpperCase() === 'NO'
  ) {
    return {
      status: 'REVOKED',
      daysUntilExpiration: 0,
      daysExpired: 999,
      denverEligible: false,
    };
  }

  const expTime = new Date(expirationDate).getTime();
  if (isNaN(expTime)) {
    return {
      status: 'REVOKED',
      daysUntilExpiration: 0,
      daysExpired: 999,
      denverEligible: false,
    };
  }

  const diffDays = Math.ceil((expTime - Date.now()) / (1000 * 60 * 60 * 24));

  if (diffDays > 30) {
    return {
      status: 'COMPLIANT',
      daysUntilExpiration: diffDays,
      daysExpired: 0,
      denverEligible: true,
    };
  }

  if (diffDays <= 30 && diffDays >= 0) {
    return {
      status: 'EXPIRING_SOON',
      daysUntilExpiration: diffDays,
      daysExpired: 0,
      denverEligible: true,
    };
  }

  const daysExpired = Math.abs(diffDays);
  if (daysExpired <= 90) {
    return {
      status: 'EXPIRED_GRACE',
      daysUntilExpiration: 0,
      daysExpired,
      denverEligible: false,
    };
  }

  return {
    status: 'REVOKED',
    daysUntilExpiration: 0,
    daysExpired,
    denverEligible: false,
  };
}

/**
 * Checks whether a guard is marked unavailable on a given day of the week or specific ISO date.
 */
export function isGuardUnavailableOnDay(
  guard: Partial<GuardProfile> | any,
  dayOfWeek?: string,
  dateStr?: string
): boolean {
  const availability = guard?.availability;
  if (!availability) return false;

  // 1. Check blackoutDates (ISO 'YYYY-MM-DD')
  if (dateStr && Array.isArray(availability.blackoutDates)) {
    if (availability.blackoutDates.includes(dateStr)) {
      return true;
    }
  }

  // Resolve dayOfWeek from dateStr if not explicitly passed
  let resolvedDay = dayOfWeek;
  if (!resolvedDay && dateStr) {
    const parsed = new Date(dateStr + 'T12:00:00');
    if (!isNaN(parsed.getTime())) {
      const names = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      resolvedDay = names[parsed.getDay()];
    }
  }

  // 2. Check recurringUnavailableDays (e.g., ['Tuesday', 'Thursday'])
  if (resolvedDay && Array.isArray(availability.recurringUnavailableDays)) {
    const targetLower = resolvedDay.trim().toLowerCase();
    const targetShort = targetLower.slice(0, 3);
    const matchesRecurring = availability.recurringUnavailableDays.some((d: string) => {
      const clean = (d || '').trim().toLowerCase();
      return clean === targetLower || clean === targetShort;
    });
    if (matchesRecurring) {
      return true;
    }
  }

  // 3. Fallback to weeklyRules if present from GuardWeeklyAvailability
  if (resolvedDay && Array.isArray(availability.weeklyRules)) {
    const targetLower = resolvedDay.trim().toLowerCase();
    const rule = availability.weeklyRules.find(
      (r: any) => (r.dayLabel || '').trim().toLowerCase() === targetLower
    );
    if (rule && (rule.isAvailable === false || rule.status === 'unavailable')) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates a guard's eligibility for a specific shift against availability, 4-tier rating,
 * universal site security license requirement, weekly overtime threshold, and 12-hour turnaround rest periods.
 */
export function checkShiftEligibility(
  guard: GuardProfile,
  shift: Shift,
  existingShiftsForGuard: Shift[],
  constraints?: SchedulingConstraints
): { eligible: boolean; violations: SchedulingViolation[] } {
  const violations: SchedulingViolation[] = [];

  const enforceRating = constraints?.enforceRatingCheck ?? true;
  const enforceLicense = constraints?.enforceDenverLicense ?? true;
  const maxWeeklyHours = constraints?.maxWeeklyHours ?? guard.maxWeeklyHours ?? 40;
  const minRestHours = constraints?.minRestHours ?? 12;

  // 1. Availability Check
  if (isGuardUnavailableOnDay(guard, shift.dayOfWeek, shift.date)) {
    violations.push({
      type: 'AVAILABILITY',
      severity: 'BLOCKING',
      message: '[AVAILABILITY CONFLICT: Officer marked unavailable on this date]',
    });
  }

  // 2. Tier Level Match
  const guardTier = guard.tier ?? Math.min(4, guard.rating || 1);
  const shiftRequiredTier =
    shift.requiredTier ?? Math.min(4, shift.requiredRating || 1);

  if (enforceRating && guardTier < shiftRequiredTier) {
    violations.push({
      type: 'RATING',
      severity: 'BLOCKING',
      message:
        'Officer tier (Tier ' +
        guardTier +
        ') below required post tier (Tier ' +
        shiftRequiredTier +
        ')',
    });
  }

  // 3. Universal License Enforcement
  const requiresSecurityLicense =
    typeof shift.requiresSecurityLicense === 'boolean'
      ? shift.requiresSecurityLicense
      : typeof shift.requiresDenverLicense === 'boolean'
      ? shift.requiresDenverLicense
      : shiftRequiredTier >= 2;

  const isLicenseActiveAndValid =
    guard.hasSecurityLicense !== false &&
    (guard.licenseStatus === 'COMPLIANT' || guard.licenseStatus === 'EXPIRING_SOON');

  if (enforceLicense && requiresSecurityLicense && !isLicenseActiveAndValid) {
    violations.push({
      type: 'JURISDICTION_LICENSE',
      severity: 'BLOCKING',
      message:
        'Site mandates an active Security License. Officer license is expired or missing',
    });
  }

  // 4. Evaluate Overtime Threshold
  const projectedHours = guard.weeklyScheduledHours + shift.durationHours;
  if (projectedHours > maxWeeklyHours) {
    violations.push({
      type: 'OVERTIME',
      severity: 'BLOCKING',
      message:
        'Assignment adds ' +
        shift.durationHours +
        'h, bringing total to ' +
        projectedHours +
        'h (Exceeds ' +
        maxWeeklyHours +
        'h weekly limit)',
    });
  }

  // 5. Evaluate Turnaround Rest Period (12 Hours)
  const targetBounds = getShiftWeekHourBounds(shift);
  let hasRestViolation = false;

  for (const existing of existingShiftsForGuard) {
    if (existing.id && shift.id && existing.id === shift.id) continue;

    const exBounds = getShiftWeekHourBounds(existing);

    // Direct overlap or insufficient rest turnaround between shifts
    const overlaps =
      targetBounds.startHour < exBounds.endHour && targetBounds.endHour > exBounds.startHour;

    if (overlaps) {
      hasRestViolation = true;
      break;
    }

    const gapHours =
      exBounds.endHour <= targetBounds.startHour
        ? targetBounds.startHour - exBounds.endHour
        : exBounds.startHour - targetBounds.endHour;

    if (gapHours < minRestHours) {
      hasRestViolation = true;
      break;
    }
  }

  if (hasRestViolation) {
    violations.push({
      type: 'REST_TURNAROUND',
      severity: 'BLOCKING',
      message: 'Violates 12-hour turnaround rest period between shifts',
    });
  }

  return {
    eligible: violations.length === 0,
    violations,
  };
}

