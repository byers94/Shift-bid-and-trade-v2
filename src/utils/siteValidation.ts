import { SiteProfile } from '../types/shift';

export interface SiteValidationIssue {
  field: string;
  label: string;
  reason: string;
  severity: 'error' | 'warning';
  section: 'contact' | 'orders' | 'general' | 'certifications';
}

export interface SiteValidationResult {
  siteId: string;
  siteName: string;
  siteCode: string;
  isValid: boolean; // 100% valid with zero critical errors
  readinessScore: number; // 0 - 100%
  hasMissingContact: boolean;
  hasIncompleteOrders: boolean;
  issues: SiteValidationIssue[];
  status: 'fully_ready' | 'missing_contact' | 'incomplete_orders' | 'critical_action_required';
  statusLabel: string;
  statusColor: string; // Tailwind class
}

export interface SiteDirectoryAuditReport {
  timestamp: string;
  totalSites: number;
  fullyReadyCount: number;
  missingContactCount: number;
  incompleteOrdersCount: number;
  criticalIssuesCount: number;
  overallReadinessPercentage: number;
  results: SiteValidationResult[];
}

/**
 * Validates a facility profile against operational dispatch standards:
 * 1. Client Contact Information: primary contact name, phone, email, and 24/7 emergency hotline.
 * 2. Post Order Instructions: standard post orders, access gate instructions, operating hours.
 * 3. Security Clearances & Certifications.
 */
export function validateSite(site: Partial<SiteProfile>): SiteValidationResult {
  const issues: SiteValidationIssue[] = [];

  const siteId = site.id || 'temp-id';
  const siteName = site.name || 'Unnamed Facility';
  const siteCode = site.code || 'NO-CODE';

  // 1. Client Contact Validation
  let hasMissingContact = false;

  const contactName = (site.primaryContactName || '').trim();
  const genericNames = ['tbd', 'none', 'unknown', 'n/a', 'site contact', 'contact'];
  if (!contactName || genericNames.includes(contactName.toLowerCase())) {
    hasMissingContact = true;
    issues.push({
      field: 'primaryContactName',
      label: 'Primary Client Contact Name',
      reason: 'Contact name is missing or set to placeholder.',
      severity: 'error',
      section: 'contact'
    });
  }

  const contactPhone = (site.primaryContactPhone || '').replace(/\D/g, '');
  if (!contactPhone || contactPhone.length < 7) {
    hasMissingContact = true;
    issues.push({
      field: 'primaryContactPhone',
      label: 'Client Contact Phone',
      reason: 'Valid liaison phone number is required for dispatchers to reach client.',
      severity: 'error',
      section: 'contact'
    });
  }

  const emergencyPhone = (site.emergencyPhone || '').replace(/\D/g, '');
  if (!emergencyPhone || emergencyPhone.length < 7) {
    hasMissingContact = true;
    issues.push({
      field: 'emergencyPhone',
      label: '24/7 Emergency Dispatch Hotline',
      reason: 'Mandatory 24/7 emergency hotline is missing or invalid.',
      severity: 'error',
      section: 'contact'
    });
  }

  if (site.primaryContactEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(site.primaryContactEmail.trim())) {
      issues.push({
        field: 'primaryContactEmail',
        label: 'Client Contact Email',
        reason: 'Client contact email format appears invalid.',
        severity: 'warning',
        section: 'contact'
      });
    }
  } else {
    issues.push({
      field: 'primaryContactEmail',
      label: 'Client Contact Email',
      reason: 'Email is recommended for automated shift confirmation manifests.',
      severity: 'warning',
      section: 'contact'
    });
  }

  // 2. Post Order Validation
  let hasIncompleteOrders = false;

  const postOrders = (site.postInstructions || '').trim();
  const genericOrders = ['tbd', 'none', 'n/a', 'standard post orders apply.', 'standard'];
  if (!postOrders || postOrders.length < 20 || genericOrders.includes(postOrders.toLowerCase())) {
    hasIncompleteOrders = true;
    issues.push({
      field: 'postInstructions',
      label: 'Standard Post Instructions & Orders',
      reason: postOrders.length === 0 
        ? 'Post orders are completely missing. Guards will lack operational guidelines.'
        : 'Post orders are too brief or generic (< 20 characters). Detailed directives required.',
      severity: 'error',
      section: 'orders'
    });
  }

  // Operating schedule check
  if (!site.operatingHours || site.operatingHours.trim().length === 0) {
    issues.push({
      field: 'operatingHours',
      label: 'Operating Schedule',
      reason: 'Operating schedule (e.g. 24/7 or specific hours) is recommended.',
      severity: 'warning',
      section: 'orders'
    });
  }

  // Gate access notes check for elevated tiers
  if (
    (site.securityTier === 'Tier 3 - High Security' || site.securityTier === 'Tier 4 - Critical Infrastructure') &&
    (!site.accessGateNotes || site.accessGateNotes.trim().length < 5)
  ) {
    issues.push({
      field: 'accessGateNotes',
      label: 'Gate / Access Checkpoint Notes',
      reason: `Tier 3/4 facility requires documented checkpoint or gate access procedures.`,
      severity: 'warning',
      section: 'orders'
    });
  }

  // 3. Security Certifications Check
  const certs = site.requiredCertifications || [];
  if (certs.length === 0) {
    issues.push({
      field: 'requiredCertifications',
      label: 'Security Certifications',
      reason: 'No required endorsements or qualifications defined for this post.',
      severity: 'warning',
      section: 'certifications'
    });
  }

  // 4. Roving Service Classification Validation
  if (site.serviceType === 'roving') {
    if (!site.rovingGroup) {
      issues.push({
        field: 'rovingGroup',
        label: 'Roving Property Group Assignment',
        reason: 'Roving property must be assigned to an operational patrol group (Alpha, Bravo, Charlie, Delta, Echo, or Foxtrot).',
        severity: 'error',
        section: 'general'
      });
    }
    if (!site.patrolFrequency || site.patrolFrequency.trim().length === 0) {
      issues.push({
        field: 'patrolFrequency',
        label: 'Patrol Sweep Frequency',
        reason: 'Roving property should specify required patrol frequency (e.g. "Hourly Sweep", "3x Per Shift").',
        severity: 'warning',
        section: 'orders'
      });
    }
  }

  // Physical address check
  if (!site.address || site.address.trim().length < 5) {
    issues.push({
      field: 'address',
      label: 'Physical Street Address',
      reason: 'Street address coordinates are missing.',
      severity: 'error',
      section: 'general'
    });
  }

  // Calculate readiness score
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  
  let readinessScore = 100;
  readinessScore -= errorCount * 25;
  readinessScore -= warningCount * 8;
  readinessScore = Math.max(0, Math.min(100, readinessScore));

  const isValid = errorCount === 0;

  let status: SiteValidationResult['status'] = 'fully_ready';
  let statusLabel = '100% Dispatch Ready';
  let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';

  if (hasMissingContact && hasIncompleteOrders) {
    status = 'critical_action_required';
    statusLabel = 'Missing Contact & Orders';
    statusColor = 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
  } else if (hasMissingContact) {
    status = 'missing_contact';
    statusLabel = 'Missing Client Contact';
    statusColor = 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
  } else if (hasIncompleteOrders) {
    status = 'incomplete_orders';
    statusLabel = 'Incomplete Post Orders';
    statusColor = 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800';
  } else if (warningCount > 0) {
    statusLabel = 'Ready (Minor Warnings)';
    statusColor = 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
  }

  return {
    siteId,
    siteName,
    siteCode,
    isValid,
    readinessScore,
    hasMissingContact,
    hasIncompleteOrders,
    issues,
    status,
    statusLabel,
    statusColor
  };
}

/**
 * Audits all facilities in the directory and produces a comprehensive report.
 */
export function auditAllSites(sites: SiteProfile[]): SiteDirectoryAuditReport {
  const results = sites.map(site => validateSite(site));
  const totalSites = sites.length;
  const fullyReadyCount = results.filter(r => r.isValid).length;
  const missingContactCount = results.filter(r => r.hasMissingContact).length;
  const incompleteOrdersCount = results.filter(r => r.hasIncompleteOrders).length;
  const criticalIssuesCount = results.filter(r => r.status === 'critical_action_required').length;

  const totalScores = results.reduce((acc, curr) => acc + curr.readinessScore, 0);
  const overallReadinessPercentage = totalSites > 0 ? Math.round(totalScores / totalSites) : 100;

  return {
    timestamp: new Date().toISOString(),
    totalSites,
    fullyReadyCount,
    missingContactCount,
    incompleteOrdersCount,
    criticalIssuesCount,
    overallReadinessPercentage,
    results
  };
}
