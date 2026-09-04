import { SiteContact, ContractServiceType, ContractLifecycleStatus, SiteProfile } from '../types/shift';

export interface GroupedGuardContacts {
  emergency: SiteContact[];
  maintenance: SiteContact[];
  dispatch: SiteContact[];
}

/**
 * Standard Role Presets for Property POCs
 */
export const CONTACT_ROLE_PRESETS = [
  'Property Manager',
  'Assistant PM',
  'On-Call Maintenance',
  'HOA Board President',
  'Tow Operator',
  'Building Engineer',
  'Security Director',
  'Facilities Lead',
  'Dispatch / Front Desk',
  'General Liaison'
] as const;

/**
 * Computes automated contract lifecycle status based on start/end dates and current date.
 */
export function computeSiteLifecycleStatus(site: {
  contractStatus?: ContractLifecycleStatus;
  startDate?: string;
  endDate?: string;
  status?: 'active' | 'inactive' | 'maintenance';
  terminationNoticeDate?: string;
}): ContractLifecycleStatus {
  if (site.status === 'inactive' || site.contractStatus === 'INACTIVE') {
    return 'INACTIVE';
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  // If contract has a future start date
  if (site.startDate && site.startDate > todayStr) {
    return 'SCHEDULED';
  }

  // If contract has an end date
  if (site.endDate) {
    if (site.endDate < todayStr) {
      return 'EXPIRED';
    } else {
      // End date is today or in the future
      return 'PENDING_TERMINATION';
    }
  }

  // If a termination notice date was logged even without strict endDate
  if (site.terminationNoticeDate && site.terminationNoticeDate <= todayStr) {
    return 'PENDING_TERMINATION';
  }

  return 'ACTIVE';
}

/**
 * Checks whether a site's contract is expiring within the specified threshold (default 30 days).
 */
export function isExpiringSoon(endDate?: string, daysThreshold = 30): boolean {
  if (!endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(endDate + 'T23:59:59');
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= daysThreshold;
}

/**
 * Calculates remaining days until contract end date.
 * Returns null if no endDate.
 */
export function getDaysUntilEnd(endDate?: string): number | null {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(endDate + 'T00:00:00');
  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formats a date string nicely (e.g. "Sep 15, 2026")
 */
export function formatContractDate(dateStr?: string): string {
  if (!dateStr) return 'Ongoing';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Groups site contacts by priority for Guard/Mobile view:
 * 1. Emergency Escalation (isEmergencyContact === true or emergency roles)
 * 2. Facility & On-Call Maintenance (Maintenance, Tow Operator, Engineer, Lockouts)
 * 3. Property Management & Dispatch (Property Manager, Assistant PM, HOA President, Dispatch, General)
 *
 * NOTE: Does NOT expose internal administrative report flags (receivesReports) to field guards.
 */
export function groupContactsForGuard(contacts: SiteContact[] = []): GroupedGuardContacts {
  const emergency: SiteContact[] = [];
  const maintenance: SiteContact[] = [];
  const dispatch: SiteContact[] = [];

  contacts.forEach((contact) => {
    const titleLower = (contact.title || '').toLowerCase();
    const notesLower = (contact.notes || '').toLowerCase();

    // 1. Emergency Flag takes top priority
    if (contact.isEmergencyContact || titleLower.includes('emergency') || titleLower.includes('911')) {
      emergency.push(contact);
    } 
    // 2. Maintenance / Tow / Engineer / Lockout
    else if (
      titleLower.includes('maint') ||
      titleLower.includes('tow') ||
      titleLower.includes('engineer') ||
      titleLower.includes('lockout') ||
      titleLower.includes('hvac') ||
      titleLower.includes('facility') ||
      notesLower.includes('lockout') ||
      notesLower.includes('tow')
    ) {
      maintenance.push(contact);
    } 
    // 3. Dispatch & Property Management
    else {
      dispatch.push(contact);
    }
  });

  return { emergency, maintenance, dispatch };
}

/**
 * Backwards compatibility helper:
 * Guarantees a valid SiteContact[] array from a site profile even if contacts was empty.
 */
export function ensureSiteContacts(site: Partial<SiteProfile>): SiteContact[] {
  if (site.contacts && Array.isArray(site.contacts) && site.contacts.length > 0) {
    return site.contacts;
  }

  const generated: SiteContact[] = [];

  // Primary Contact
  const pName = site.primaryContactName?.trim() || 'Property Manager';
  const pPhone = site.primaryContactPhone?.trim() || '+1 (555) 206-9000';
  const pEmail = site.primaryContactEmail?.trim() || 'management@propertyops.com';

  generated.push({
    id: `${site.id || 'site'}-poc-1`,
    name: pName,
    title: 'Property Manager',
    phone: pPhone,
    secondaryPhone: '+1 (555) 206-9001',
    email: pEmail,
    receivesReports: true,
    isEmergencyContact: false,
    notes: 'Primary liaison for daily post orders, tenant notices, and incident escalations.'
  });

  // Emergency Hotline / Contact
  const ePhone = site.emergencyPhone?.trim() || '+1 (555) 206-9911';
  if (ePhone && ePhone !== pPhone) {
    generated.push({
      id: `${site.id || 'site'}-poc-2`,
      name: `${site.name || 'Site'} Emergency Dispatch Desk`,
      title: '24/7 Dispatch Escalation',
      phone: ePhone,
      secondaryPhone: '+1 (800) 555-0199',
      email: 'dispatch@propertyops.com',
      receivesReports: true,
      isEmergencyContact: true,
      notes: 'Top-level escalation for active 911 calls, security breaches, and emergency response.'
    });
  }

  // Add a dedicated On-Call Maintenance contact
  generated.push({
    id: `${site.id || 'site'}-poc-3`,
    name: 'Facilities & On-Call Maintenance',
    title: 'On-Call Maintenance',
    phone: '+1 (555) 206-4357',
    secondaryPhone: '+1 (555) 206-4358',
    email: 'maintenance@propertyops.com',
    receivesReports: false,
    isEmergencyContact: false,
    notes: 'Contact for after-hours plumbing leaks, elevator entrapments, or door lock failures.'
  });

  return generated;
}

/**
 * Meta configs for Service Type Badges
 */
export const SERVICE_TYPE_CONFIGS: Record<ContractServiceType, {
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  iconName: string;
  description: string;
}> = {
  ONGOING: {
    label: 'Ongoing Contract',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/70',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    iconName: 'Shield',
    description: 'Standard contracted post and patrol service'
  },
  FIREWATCH: {
    label: 'Firewatch Coverage',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/70',
    badgeText: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-300 dark:border-rose-700',
    iconName: 'Flame',
    description: 'Temporary emergency fire safety coverage during system outage'
  },
  SEASONAL: {
    label: 'Seasonal Service',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/70',
    badgeText: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-700',
    iconName: 'Sun',
    description: 'Recurring seasonal coverage (e.g. Summer Pool or Winter Heat Watch)'
  },
  SPECIAL_EVENT: {
    label: 'Special Event',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/70',
    badgeText: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-300 dark:border-purple-700',
    iconName: 'Sparkles',
    description: 'Short-term or single-day event security coverage'
  }
};

/**
 * Meta configs for Contract Lifecycle Status Badges
 */
export const LIFECYCLE_STATUS_CONFIGS: Record<ContractLifecycleStatus, {
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  dotColor: string;
}> = {
  ACTIVE: {
    label: 'Active',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/70',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    dotColor: 'bg-emerald-500'
  },
  PENDING_TERMINATION: {
    label: 'Pending Termination',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/70',
    badgeText: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-700',
    dotColor: 'bg-amber-500'
  },
  SCHEDULED: {
    label: 'Scheduled',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/70',
    badgeText: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-300 dark:border-blue-700',
    dotColor: 'bg-blue-500'
  },
  EXPIRED: {
    label: 'Expired',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-600 dark:text-slate-400',
    borderColor: 'border-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-400'
  },
  INACTIVE: {
    label: 'Inactive / Archived',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50',
    badgeText: 'text-rose-700 dark:text-rose-400',
    borderColor: 'border-rose-200 dark:border-rose-800',
    dotColor: 'bg-rose-400'
  }
};

/**
 * Format a contract date range string (e.g. "Jan 01, 2026 – Ongoing" or "Jun 01, 2026 – Sep 15, 2026")
 */
export function formatContractDateRange(startDate?: string, endDate?: string): string {
  const startFmt = startDate ? formatContractDate(startDate) : 'Effective Immediate';
  const endFmt = endDate ? formatContractDate(endDate) : 'Ongoing (Indefinite)';
  return `${startFmt} – ${endFmt}`;
}

export const getDaysUntilContractEnd = getDaysUntilEnd;
export const LIFECYCLE_STATUS_CONFIG = LIFECYCLE_STATUS_CONFIGS;
export const CONTRACT_SERVICE_TYPE_CONFIG = SERVICE_TYPE_CONFIGS;
