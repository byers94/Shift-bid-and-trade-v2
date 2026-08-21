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
