/**
 * Utility functions for time, date, and hour calculation
 */

export function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
    return 0;
  }
  
  const startTotalMinutes = startHour * 60 + startMin;
  let endTotalMinutes = endHour * 60 + endMin;
  
  // If end time is earlier or equal to start time, assume next day
  if (endTotalMinutes <= startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }
  
  const diffMinutes = endTotalMinutes - startTotalMinutes;
  const hours = diffMinutes / 60;
  
  return Math.round(hours * 10) / 10;
}

export function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const target = new Date(dateStr + 'T00:00:00');
    
    // Check if valid
    if (isNaN(target.getTime())) return dateStr;
    
    if (dateStr === todayStr) {
      return 'Today';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().split('T')[0]) {
      return 'Tomorrow';
    }
    
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return target.toLocaleDateString('en-US', options);
  } catch {
    return dateStr;
  }
}

export function formatTimestamp(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export function generateSmsLink(opsPhone: string, bodyText: string): string {
  const cleanPhone = opsPhone.replace(/[^0-9+]/g, '');
  const encodedBody = encodeURIComponent(bodyText);
  
  // Cross-platform SMS URL format
  // iOS and Android typically support sms:number?body=text or sms:number&body=text
  return `sms:${cleanPhone}?&body=${encodedBody}`;
}

/**
 * Compare two shifts chronologically from soonest date/time to furthest
 */
export function compareShiftsByDateSoonest(
  a: { date: string; startTime?: string },
  b: { date: string; startTime?: string }
): number {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;

  const timeA = a.startTime ? (a.startTime.length === 5 ? a.startTime : '00:00') : '00:00';
  const timeB = b.startTime ? (b.startTime.length === 5 ? b.startTime : '00:00') : '00:00';

  const dtA = new Date(`${a.date}T${timeA}:00`).getTime();
  const dtB = new Date(`${b.date}T${timeB}:00`).getTime();

  if (isNaN(dtA) && isNaN(dtB)) {
    return a.date.localeCompare(b.date);
  }
  if (isNaN(dtA)) return 1;
  if (isNaN(dtB)) return -1;

  return dtA - dtB;
}

/**
 * Compare two shifts chronologically from furthest date/time to soonest
 */
export function compareShiftsByDateFurthest(
  a: { date: string; startTime?: string },
  b: { date: string; startTime?: string }
): number {
  return compareShiftsByDateSoonest(b, a);
}

/**
 * Calculate elapsed seconds for an active shift (subtracting completed breaks)
 */
export function getShiftElapsedSeconds(
  clockInIso?: string, 
  clockOutIso?: string, 
  breaks?: Array<{ startedAt: string; endedAt?: string; durationMinutes?: number }>
): number {
  if (!clockInIso) return 0;
  const startMs = new Date(clockInIso).getTime();
  if (isNaN(startMs)) return 0;
  
  const endMs = clockOutIso ? new Date(clockOutIso).getTime() : Date.now();
  if (isNaN(endMs)) return 0;
  let totalElapsedMs = Math.max(0, endMs - startMs);

  // If there are breaks, deduct completed break time
  if (breaks && breaks.length > 0) {
    breaks.forEach((b) => {
      if (b.durationMinutes) {
        totalElapsedMs -= b.durationMinutes * 60 * 1000;
      } else if (b.startedAt && b.endedAt) {
        const breakStart = new Date(b.startedAt).getTime();
        const breakEnd = new Date(b.endedAt).getTime();
        if (!isNaN(breakStart) && !isNaN(breakEnd) && breakEnd > breakStart) {
          totalElapsedMs -= (breakEnd - breakStart);
        }
      }
    });
  }

  return Math.max(0, Math.floor(totalElapsedMs / 1000));
}

/**
 * Format total seconds into HH:MM:SS or HHh MMm
 */
export function formatElapsedTimer(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Check if a scheduled shift is currently overdue / late for clock-in
 * Late if currentTime > (scheduledDate + scheduledStartTime)
 * Flagged as late alert if minutesLate >= 15
 */
export function calculateShiftLateStatus(
  scheduledDate: string,
  scheduledStartTime: string,
  clockInTime?: string,
  referenceDate: Date = new Date()
): { isLate: boolean; minutesLate: number; isOverdue15m: boolean; scheduledDateTimeStr: string } {
  const time = scheduledStartTime.length === 5 ? scheduledStartTime : '08:00';
  const scheduledTimeMs = new Date(`${scheduledDate}T${time}:00`).getTime();
  
  if (isNaN(scheduledTimeMs)) {
    return { isLate: false, minutesLate: 0, isOverdue15m: false, scheduledDateTimeStr: '' };
  }

  const scheduledDateTimeStr = `${scheduledDate} ${scheduledStartTime}`;

  // If guard already clocked in, calculate if they were late upon clocking in
  if (clockInTime) {
    const clockInMs = new Date(clockInTime).getTime();
    if (!isNaN(clockInMs)) {
      const diffMs = clockInMs - scheduledTimeMs;
      const diffMinutes = Math.floor(diffMs / 60000);
      const isLate = diffMinutes > 0;
      return {
        isLate,
        minutesLate: isLate ? diffMinutes : 0,
        isOverdue15m: diffMinutes >= 15,
        scheduledDateTimeStr
      };
    }
  }

  // If not yet clocked in, compare against reference/current time
  const nowMs = referenceDate.getTime();
  const diffMs = nowMs - scheduledTimeMs;
  const minutesLate = Math.floor(diffMs / 60000);

  if (minutesLate > 0) {
    return {
      isLate: true,
      minutesLate,
      isOverdue15m: minutesLate >= 15,
      scheduledDateTimeStr
    };
  }

  return {
    isLate: false,
    minutesLate: 0,
    isOverdue15m: false,
    scheduledDateTimeStr
  };
}

