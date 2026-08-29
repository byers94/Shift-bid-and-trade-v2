import { Shift, GuardProfile, BidRecord, SiteProfile, SetSchedule, TimeOffRequest, SetScheduleAiSuggestion, DayOfWeek } from '../types/shift';
import { INITIAL_SITES } from '../data/mockData';

export interface GuardCandidateEvaluation {
  guard: GuardProfile;
  score: number; // 0 to 100
  matchGrade: 'top' | 'strong' | 'moderate' | 'needs_ojt' | 'conflict';
  isSiteTrained: boolean;
  trainingLevel: 'trained' | 'needs_ojt' | 'lead_certified' | 'in_training';
  lastWorkedShift: {
    siteName: string;
    date: string;
    startTime: string;
    endTime: string;
    hours: number;
    daysAgo: number | null;
  } | null;
  daysSinceLastWorked: number | null; // e.g. 3 days ago, or null if no previous shifts
  hasScheduleConflict: boolean;
  conflictReason?: string;
  hasBid: boolean;
  bidTrainingStatus?: 'trained' | 'needs_ojt';
  matchedCertifications: string[];
  missingCertifications: string[];
  // Site Directory qualification fields
  siteProfile?: SiteProfile | null;
  siteRequiredClearances: string[];
  matchedClearances: string[];
  missingClearances: string[];
  isSiteClearanceMet: boolean;
  reasons: string[];
  isTimeOffConflict?: boolean;
  availabilityMatchNote?: string;
}

export interface BatchAutoFillItem {
  shift: Shift;
  selectedGuardId: string | null;
  topCandidate: GuardCandidateEvaluation | null;
  allCandidates: GuardCandidateEvaluation[];
  isAssigned: boolean;
  siteProfile?: SiteProfile | null;
}

/**
 * Robust facility lookup that resolves site names or codes against the Site Directory.
 */
export function findSiteProfile(siteNameOrCode?: string, sitesList: SiteProfile[] = INITIAL_SITES): SiteProfile | undefined {
  if (!siteNameOrCode) return undefined;
  const targetClean = (siteNameOrCode || '').toLowerCase().trim();

  // 1. Exact match by name or code
  let match = sitesList.find(
    (s) => (s.name || '').toLowerCase() === targetClean || (s.code || '').toLowerCase() === targetClean || (s.id || '').toLowerCase() === targetClean
  );
  if (match) return match;

  // 2. Substring matching
  match = sitesList.find((s) => {
    const sName = (s.name || '').toLowerCase();
    const sCode = (s.code || '').toLowerCase();
    return sName.includes(targetClean) || targetClean.includes(sName) || sCode.includes(targetClean);
  });
  if (match) return match;

  // 3. Keyword / alias matching for specialized facilities
  return sitesList.find((s) => {
    const sName = (s.name || '').toLowerCase();
    if (targetClean.includes('port') && sName.includes('port')) return true;
    if (targetClean.includes('airport') && sName.includes('airport')) return true;
    if (targetClean.includes('corporate') && sName.includes('corporate')) return true;
    if (targetClean.includes('medical') && sName.includes('medical')) return true;
    if (targetClean.includes('retail') && sName.includes('retail')) return true;
    if (targetClean.includes('tech') && sName.includes('tech')) return true;
    if (targetClean.includes('warehouse') && sName.includes('warehouse')) return true;
    if (targetClean.includes('hotel') && sName.includes('hotel')) return true;
    if (targetClean.includes('financial') && sName.includes('financial')) return true;
    if ((targetClean.includes('transit') || targetClean.includes('metro')) && (sName.includes('metro') || sName.includes('transit'))) return true;
    if (targetClean.includes('chemical') && sName.includes('chemical')) return true;
    if (targetClean.includes('museum') && sName.includes('museum')) return true;
    return false;
  });
}

/**
 * Checks if a guard's OJT sites match the target shift site name or site code.
 */
export function isGuardSiteTrained(guard: GuardProfile, siteName?: string, siteProfile?: SiteProfile): boolean {
  if (!guard.ojtSites || guard.ojtSites.length === 0 || !siteName) return false;
  const targetClean = (siteName || '').toLowerCase().trim();
  const siteCode = (siteProfile?.code || '').toLowerCase().trim();
  const siteFullName = (siteProfile?.name || '').toLowerCase().trim();
  
  return guard.ojtSites.some((site) => {
    if (!site) return false;
    const siteClean = (site || '').toLowerCase().trim();
    if (siteClean === targetClean) return true;
    if (siteCode && siteClean === siteCode) return true;
    if (siteFullName && (siteClean === siteFullName || siteFullName.includes(siteClean) || siteClean.includes(siteFullName))) return true;
    if (targetClean.includes(siteClean) || siteClean.includes(targetClean)) return true;

    // Keyword heuristics
    if (siteClean.includes('port') && targetClean.includes('port')) return true;
    if (siteClean.includes('airport') && targetClean.includes('airport')) return true;
    if (siteClean.includes('corporate') && targetClean.includes('corporate')) return true;
    if (siteClean.includes('medical') && targetClean.includes('medical')) return true;
    if (siteClean.includes('retail') && targetClean.includes('retail')) return true;
    if (siteClean.includes('tech') && targetClean.includes('tech')) return true;
    if (siteClean.includes('warehouse') && targetClean.includes('warehouse')) return true;
    if (siteClean.includes('hotel') && targetClean.includes('hotel')) return true;
    if (siteClean.includes('financial') && targetClean.includes('financial')) return true;
    if (siteClean.includes('chemical') && targetClean.includes('chemical')) return true;
    if (siteClean.includes('transit') && targetClean.includes('transit')) return true;
    if (siteClean.includes('museum') && targetClean.includes('museum')) return true;
    return false;
  });
}

/**
 * Calculates days between two YYYY-MM-DD date strings.
 */
function getDaysDifference(targetDateStr: string, pastDateStr: string): number | null {
  try {
    const target = new Date(targetDateStr + 'T00:00:00');
    const past = new Date(pastDateStr + 'T00:00:00');
    if (isNaN(target.getTime()) || isNaN(past.getTime())) return null;
    
    const diffTime = target.getTime() - past.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Evaluates a single guard for a target open shift using Site Directory requiredClearances,
 * OJT verification, rest recency, schedule conflicts, availability tracker, time-off requests, and active bids.
 */
export function evaluateGuardForShift(
  shift: Shift,
  guard: GuardProfile,
  allShifts: Shift[],
  allBids: BidRecord[] = [],
  sitesList: SiteProfile[] = INITIAL_SITES,
  timeOffRequests: TimeOffRequest[] = []
): GuardCandidateEvaluation {
  const reasons: string[] = [];
  let score = 40; // Base baseline score

  // 1. Resolve facility from Site Directory
  const siteProfile = findSiteProfile(shift.siteName, sitesList);
  const siteDisplayName = siteProfile?.name || shift.siteName;

  // Retrieve mandatory clearances from Site Directory (primary: requiredClearances, fallback: requiredCertifications or shift.requiredCertifications)
  const siteRequiredClearances: string[] = Array.from(
    new Set([
      ...(siteProfile?.requiredClearances || []),
      ...(siteProfile?.requiredCertifications || []),
      ...(shift.requiredCertifications || [])
    ])
  );

  // 2. Validate Guard against Site Directory Clearances
  const matchedClearances: string[] = [];
  const missingClearances: string[] = [];
  const guardCerts = (guard.certifications || []).map((c) => c.toLowerCase().trim());

  if (siteRequiredClearances.length > 0) {
    siteRequiredClearances.forEach((req) => {
      const reqClean = req.toLowerCase().trim();
      const isMet = guardCerts.some((gc) => {
        if (gc === reqClean) return true;
        if (gc.includes(reqClean) || reqClean.includes(gc)) return true;
        // Known credential normalization
        if (reqClean.includes('twic') && gc.includes('twic')) return true;
        if (reqClean.includes('sida') && gc.includes('sida')) return true;
        if (reqClean.includes('secret') && gc.includes('secret')) return true;
        if (reqClean.includes('cpr') && (gc.includes('cpr') || gc.includes('aed') || gc.includes('first aid'))) return true;
        if (reqClean.includes('armed') && (gc.includes('armed') || gc.includes('weapon'))) return true;
        if (reqClean.includes('de-escalation') && gc.includes('de-escalation')) return true;
        if (reqClean.includes('cctv') && gc.includes('cctv')) return true;
        if (reqClean.includes('hazmat') && gc.includes('hazmat')) return true;
        if (reqClean.includes('transit') && (gc.includes('transit') || gc.includes('rail'))) return true;
        return false;
      });

      if (isMet) {
        matchedClearances.push(req);
      } else {
        missingClearances.push(req);
      }
    });

    if (missingClearances.length === 0) {
      score += 25;
      reasons.push(`✅ 100% Site Clearances Verified: ${matchedClearances.join(', ')} (${siteDisplayName})`);
    } else {
      score -= 35;
      reasons.push(`⚠️ Missing Mandatory Clearances: ${missingClearances.join(', ')} (Mandated by Site Directory for ${siteDisplayName})`);
    }
  } else {
    reasons.push(`Standard post (No specialized facility clearances mandated)`);
  }

  const isSiteClearanceMet = missingClearances.length === 0;

  // 3. Site Training & OJT Match Check
  const siteTrained = isGuardSiteTrained(guard, shift.siteName, siteProfile);
  const trainingLevel = guard.trainingLevel || (guard.role === 'lead' || guard.role === 'supervisor' ? 'lead_certified' : 'trained');

  if (siteTrained) {
    score += 25;
    reasons.push(`Fully OJT Qualified on ${siteDisplayName}`);
  } else if (guard.role === 'supervisor' || guard.role === 'lead') {
    score += 12;
    reasons.push(`${guard.role === 'supervisor' ? 'Supervisor' : 'Lead'} rating (Authorized for rapid site orientation)`);
  } else if (siteProfile && !siteProfile.ojtRequired) {
    score += 10;
    reasons.push(`Standard clearance (Facility does not require prior OJT)`);
  } else {
    score -= 20;
    reasons.push(`Needs OJT orientation for ${siteDisplayName}`);
  }

  // Training Level Bonuses
  if (trainingLevel === 'lead_certified') {
    score += 10;
    reasons.push('Lead-Certified credential');
  } else if (trainingLevel === 'trained') {
    score += 5;
  } else if (trainingLevel === 'needs_ojt' || trainingLevel === 'in_training') {
    score -= 10;
  }

  // 4. Time-Off / Leave Check
  let isTimeOffConflict = false;
  let hasScheduleConflict = false;
  let conflictReason: string | undefined = undefined;

  const approvedTimeOff = timeOffRequests.find(
    (to) =>
      to.guardId === guard.id &&
      to.status === 'approved' &&
      shift.date >= to.startDate &&
      shift.date <= to.endDate
  );

  if (approvedTimeOff) {
    isTimeOffConflict = true;
    hasScheduleConflict = true;
    conflictReason = `Approved Time-Off (${approvedTimeOff.type.toUpperCase()}): ${approvedTimeOff.reason}`;
    score -= 75;
    reasons.unshift(`⛔ Time-Off: ${conflictReason}`);
  }

  // 5. Weekly Availability Tracker Evaluation
  let availabilityMatchNote: string | undefined = undefined;
  if (shift.date) {
    try {
      const shiftDateObj = new Date(shift.date + 'T00:00:00');
      const dayOfWeek = shiftDateObj.getDay() as DayOfWeek;
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayLabel = dayNames[dayOfWeek] || 'Day';

      if (guard.availability?.weeklyRules && guard.availability.weeklyRules.length > 0) {
        const dayRule = guard.availability.weeklyRules.find((r) => r.dayOfWeek === dayOfWeek);
        if (dayRule) {
          if (!dayRule.isAvailable) {
            score -= 40;
            reasons.push(`⚠️ Guard marked UNAVAILABLE on ${dayLabel}s in Availability Tracker`);
            availabilityMatchNote = `Unavailable on ${dayLabel}s`;
          } else {
            score += 15;
            reasons.push(`✅ Active Availability on ${dayLabel}s (${dayRule.startTime || '00:00'} - ${dayRule.endTime || '23:59'})`);
            availabilityMatchNote = `Available on ${dayLabel}s`;
          }
        }
      }

      // Check Preferred Sites & Service Types
      if (guard.availability?.preferredSites && guard.availability.preferredSites.some((ps) => ps.toLowerCase().includes(shift.siteName.toLowerCase()) || shift.siteName.toLowerCase().includes(ps.toLowerCase()))) {
        score += 12;
        reasons.push(`🌟 Guard designated ${siteDisplayName} as a Preferred Site`);
      }

      if (siteProfile?.serviceType === 'roving' && (guard.isRovingGuard || guard.availability?.preferredServiceTypes?.includes('roving'))) {
        score += 15;
        reasons.push(`🚗 Certified Roving Patrol Officer (${siteProfile.rovingGroup || 'Mobile Unit'})`);
      }
    } catch {
      // Date parse fallback
    }
  }

  // 6. Find Last Worked Shift & Past Activity
  const guardFilledShifts = allShifts
    .filter(
      (s) =>
        s.status === 'filled' &&
        (s.assignedGuardId === guard.id || (s.assignedGuardName && s.assignedGuardName.toLowerCase() === guard.name.toLowerCase()))
    )
    .sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.startTime.localeCompare(a.startTime);
    });

  let lastWorkedShift: GuardCandidateEvaluation['lastWorkedShift'] = null;
  let daysSinceLastWorked: number | null = null;

  if (guardFilledShifts.length > 0) {
    const mostRecent = guardFilledShifts[0];
    const daysDiff = getDaysDifference(shift.date, mostRecent.date);
    daysSinceLastWorked = daysDiff;

    lastWorkedShift = {
      siteName: mostRecent.siteName,
      date: mostRecent.date,
      startTime: mostRecent.startTime,
      endTime: mostRecent.endTime,
      hours: mostRecent.hours,
      daysAgo: daysDiff
    };
  }

  // 7. Scheduling Conflict Check (Same date assigned shift)
  if (!hasScheduleConflict) {
    const sameDayShift = guardFilledShifts.find((s) => s.date === shift.date && s.id !== shift.id);
    if (sameDayShift) {
      hasScheduleConflict = true;
      conflictReason = `Already assigned to ${sameDayShift.siteName} (${sameDayShift.startTime}-${sameDayShift.endTime})`;
      score -= 60;
      reasons.unshift(`⚠️ Conflict: ${conflictReason}`);
    }
  }

  // 8. Rest / Equitable Distribution Heuristic
  if (!hasScheduleConflict) {
    if (daysSinceLastWorked === null) {
      score += 18;
      reasons.push('Full availability (No prior shifts on schedule)');
    } else if (daysSinceLastWorked >= 3) {
      score += 20;
      reasons.push(`Well-rested (${daysSinceLastWorked} days since last shift at ${lastWorkedShift?.siteName})`);
    } else if (daysSinceLastWorked === 2) {
      score += 15;
      reasons.push(`Standard rest (${daysSinceLastWorked} days since last shift)`);
    } else if (daysSinceLastWorked === 1) {
      score += 8;
      reasons.push(`Worked yesterday at ${lastWorkedShift?.siteName}`);
    } else if (daysSinceLastWorked === 0) {
      score -= 8;
      reasons.push(`Working another shift today (Caution for fatigue)`);
    } else if (daysSinceLastWorked < 0) {
      score += 10;
      reasons.push(`No shifts prior to this date`);
    }
  }

  // 9. Active Bid Bonus
  const guardBid = allBids.find(
    (b) =>
      b.shiftId === shift.id &&
      (b.guardName.toLowerCase() === guard.name.toLowerCase() || b.guardPhone === guard.phone)
  );

  const hasBid = !!guardBid;
  if (hasBid) {
    score += 15;
    reasons.push(`⚡ Actively bid on this shift (${guardBid.trainingStatus === 'trained' ? 'TRAINED' : 'OJT'})`);
  }

  // Clamp score between 5 and 99
  const finalScore = Math.max(5, Math.min(99, Math.round(score)));

  // 10. Match Grade Calculation
  let matchGrade: GuardCandidateEvaluation['matchGrade'] = 'moderate';
  if (hasScheduleConflict) {
    matchGrade = 'conflict';
  } else if (finalScore >= 80 && siteTrained && isSiteClearanceMet) {
    matchGrade = 'top';
  } else if (finalScore >= 65 && isSiteClearanceMet) {
    matchGrade = 'strong';
  } else if (!isSiteClearanceMet || !siteTrained) {
    matchGrade = 'needs_ojt';
  }

  return {
    guard,
    score: finalScore,
    matchGrade,
    isSiteTrained: siteTrained,
    trainingLevel,
    lastWorkedShift,
    daysSinceLastWorked,
    hasScheduleConflict,
    conflictReason,
    hasBid,
    bidTrainingStatus: guardBid?.trainingStatus,
    matchedCertifications: matchedClearances,
    missingCertifications: missingClearances,
    siteProfile,
    siteRequiredClearances,
    matchedClearances,
    missingClearances,
    isSiteClearanceMet,
    reasons,
    isTimeOffConflict,
    availabilityMatchNote
  };
}

/**
 * Returns ranked guard candidates for a specific shift against the Site Directory, availability tracker, and time off.
 */
export function suggestGuardsForShift(
  shift: Shift,
  guardsList: GuardProfile[],
  allShifts: Shift[],
  allBids: BidRecord[] = [],
  sitesList: SiteProfile[] = INITIAL_SITES,
  timeOffRequests: TimeOffRequest[] = []
): GuardCandidateEvaluation[] {
  return guardsList
    .map((guard) => evaluateGuardForShift(shift, guard, allShifts, allBids, sitesList, timeOffRequests))
    .sort((a, b) => {
      // Conflicts always last
      if (a.hasScheduleConflict && !b.hasScheduleConflict) return 1;
      if (!a.hasScheduleConflict && b.hasScheduleConflict) return -1;
      // Primary: Score descending
      return b.score - a.score;
    });
}

/**
 * AI Auto-Fill Engine for Set Schedules & Standing Shift Templates.
 * Analyzes recurring days of week, time window, site clearances, guard weekly availability,
 * and current assignments to recommend best-fit regular guards.
 */
export function generateSetScheduleAiSuggestions(
  setSchedule: SetSchedule,
  guardsList: GuardProfile[],
  allShifts: Shift[] = [],
  timeOffRequests: TimeOffRequest[] = [],
  sitesList: SiteProfile[] = INITIAL_SITES
): SetScheduleAiSuggestion[] {
  const siteProfile = findSiteProfile(setSchedule.siteName, sitesList) || sitesList.find(s => s.id === setSchedule.siteId);
  const requiredClearances = Array.from(
    new Set([
      ...(siteProfile?.requiredClearances || []),
      ...(siteProfile?.requiredCertifications || []),
      ...(setSchedule.requiredCertifications || [])
    ])
  );

  return guardsList
    .map((guard) => {
      let score = 50;
      const reasons: string[] = [];
      const guardCerts = (guard.certifications || []).map(c => c.toLowerCase().trim());
      const missingCerts: string[] = [];
      const matchedCerts: string[] = [];

      // 1. Check Site Clearances
      if (requiredClearances.length > 0) {
        requiredClearances.forEach((req) => {
          const reqClean = req.toLowerCase().trim();
          const isMet = guardCerts.some(gc => gc.includes(reqClean) || reqClean.includes(gc));
          if (isMet) matchedCerts.push(req);
          else missingCerts.push(req);
        });

        if (missingCerts.length === 0) {
          score += 25;
          reasons.push(`100% Certified for ${setSchedule.siteName} (${matchedCerts.join(', ')})`);
        } else {
          score -= 30;
          reasons.push(`Missing certifications: ${missingCerts.join(', ')}`);
        }
      }

      // 2. Check OJT Qualifications
      const isTrained = isGuardSiteTrained(guard, setSchedule.siteName, siteProfile);
      if (isTrained) {
        score += 20;
        reasons.push(`OJT Trained & Qualified at ${setSchedule.siteName}`);
      } else if (guard.role === 'lead' || guard.role === 'supervisor') {
        score += 10;
        reasons.push(`${guard.role.toUpperCase()} credentials (Fast-track site orientation)`);
      } else {
        score -= 15;
        reasons.push(`Pending OJT orientation at ${setSchedule.siteName}`);
      }

      // 3. Weekly Availability Alignment for required days
      const daysOfWeek = setSchedule.daysOfWeek || [];
      const weeklyRules = guard.availability?.weeklyRules || [];
      let availableDaysCount = 0;
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      daysOfWeek.forEach((dayNum) => {
        const rule = weeklyRules.find(r => r.dayOfWeek === dayNum);
        if (!rule || rule.isAvailable) {
          availableDaysCount++;
        }
      });

      const dayAvailabilityPct = daysOfWeek.length > 0 ? (availableDaysCount / daysOfWeek.length) : 1;

      if (dayAvailabilityPct === 1) {
        score += 20;
        reasons.push(`Full weekly availability match for ${setSchedule.daysPatternLabel || 'all required days'}`);
      } else if (dayAvailabilityPct >= 0.6) {
        score += 5;
        reasons.push(`Partial availability (${availableDaysCount}/${daysOfWeek.length} days match)`);
      } else {
        score -= 25;
        reasons.push(`Availability mismatch (Unavailable on ${daysOfWeek.length - availableDaysCount} required days)`);
      }

      // 4. Preferred Sites & Service Type
      if (guard.availability?.preferredSites?.some(ps => ps.toLowerCase().includes(setSchedule.siteName.toLowerCase()))) {
        score += 10;
        reasons.push(`Designated preferred site by guard`);
      }

      if (setSchedule.serviceType === 'roving' && (guard.isRovingGuard || guard.availability?.preferredServiceTypes?.includes('roving'))) {
        score += 15;
        reasons.push(`Rover specialist (${setSchedule.rovingGroup || 'Mobile Unit'})`);
      }

      // 5. Total Weekly Hours Capacity
      const weeklySetHours = (setSchedule.hours || 8) * daysOfWeek.length;
      const maxHours = guard.availability?.maxWeeklyHours || 40;
      if (weeklySetHours <= maxHours) {
        score += 5;
        reasons.push(`Fits weekly target capacity (${weeklySetHours}h / max ${maxHours}h)`);
      } else {
        score -= 15;
        reasons.push(`Exceeds guard weekly cap (${weeklySetHours}h > ${maxHours}h limit)`);
      }

      // Final Score & Grade
      const finalScore = Math.max(10, Math.min(99, Math.round(score)));
      let matchGrade: 'top' | 'strong' | 'moderate' | 'needs_ojt' | 'conflict' = 'moderate';

      if (dayAvailabilityPct < 0.5) {
        matchGrade = 'conflict';
      } else if (finalScore >= 80 && isTrained && missingCerts.length === 0) {
        matchGrade = 'top';
      } else if (finalScore >= 65 && missingCerts.length === 0) {
        matchGrade = 'strong';
      } else if (!isTrained || missingCerts.length > 0) {
        matchGrade = 'needs_ojt';
      }

      return {
        guardId: guard.id,
        guardName: guard.name,
        guardBadge: guard.badgeNumber,
        guardPhone: guard.phone,
        suitabilityScore: finalScore,
        matchGrade,
        isSiteTrained: isTrained,
        missingCertifications: missingCerts,
        matchedCertifications: matchedCerts,
        weeklyAvailabilityMatch: `${Math.round(dayAvailabilityPct * 100)}% (${availableDaysCount}/${daysOfWeek.length} days)`,
        reasons,
        suggestedAssignmentNote: `Recommended for ${setSchedule.title} (${finalScore}% match)`
      };
    })
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}

/**
 * Generates an optimized batch auto-fill proposal across multiple open shifts,
 * resolving facility profiles and required clearances from Site Directory.
 */
export function generateBatchAutoFillPlan(
  openShifts: Shift[],
  guardsList: GuardProfile[],
  allShifts: Shift[],
  allBids: BidRecord[] = [],
  sitesList: SiteProfile[] = INITIAL_SITES
): BatchAutoFillItem[] {
  // Track dynamically assigned guards per date to prevent duplicate assignments during batching
  const assignedByDate: Record<string, Set<string>> = {};

  // Initialize with already filled shifts in the system
  allShifts
    .filter((s) => s.status === 'filled' && (s.assignedGuardId || s.assignedGuardName))
    .forEach((s) => {
      if (!assignedByDate[s.date]) {
        assignedByDate[s.date] = new Set();
      }
      if (s.assignedGuardId) assignedByDate[s.date].add(s.assignedGuardId);
      if (s.assignedGuardName) assignedByDate[s.date].add(s.assignedGuardName.toLowerCase());
    });

  // Sort open shifts: Emergency first, then chronologically soonest
  const prioritizedShifts = [...openShifts].sort((a, b) => {
    if (a.urgency === 'emergency' && b.urgency !== 'emergency') return -1;
    if (a.urgency !== 'emergency' && b.urgency === 'emergency') return 1;
    return a.date.localeCompare(b.date);
  });

  const planItems: BatchAutoFillItem[] = [];

  prioritizedShifts.forEach((shift) => {
    const siteProfile = findSiteProfile(shift.siteName, sitesList);
    // Generate candidates with Site Directory context
    const allCandidates = suggestGuardsForShift(shift, guardsList, allShifts, allBids, sitesList);
    
    // Pick the highest scoring candidate that is not already assigned on this date
    const dateAssignments = assignedByDate[shift.date] || new Set<string>();
    
    const viableCandidate = allCandidates.find((cand) => {
      if (cand.hasScheduleConflict) return false;
      const isAlreadyAssignedInBatch = 
        dateAssignments.has(cand.guard.id) || 
        dateAssignments.has(cand.guard.name.toLowerCase());
      return !isAlreadyAssignedInBatch;
    });

    const chosen = viableCandidate || allCandidates[0] || null;

    if (chosen && !chosen.hasScheduleConflict) {
      if (!assignedByDate[shift.date]) {
        assignedByDate[shift.date] = new Set();
      }
      assignedByDate[shift.date].add(chosen.guard.id);
      assignedByDate[shift.date].add(chosen.guard.name.toLowerCase());
    }

    planItems.push({
      shift,
      selectedGuardId: chosen ? chosen.guard.id : null,
      topCandidate: chosen,
      allCandidates,
      isAssigned: !!chosen && !chosen.hasScheduleConflict,
      siteProfile
    });
  });

  return planItems;
}
