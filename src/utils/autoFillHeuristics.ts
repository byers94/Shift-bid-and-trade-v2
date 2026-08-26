import { Shift, GuardProfile, BidRecord } from '../types/shift';

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
  reasons: string[];
}

export interface BatchAutoFillItem {
  shift: Shift;
  selectedGuardId: string | null;
  topCandidate: GuardCandidateEvaluation | null;
  allCandidates: GuardCandidateEvaluation[];
  isAssigned: boolean;
}

/**
 * Checks if a guard's OJT sites match the target shift site name.
 */
export function isGuardSiteTrained(guard: GuardProfile, siteName: string): boolean {
  if (!guard.ojtSites || guard.ojtSites.length === 0) return false;
  const targetClean = siteName.toLowerCase().trim();
  
  return guard.ojtSites.some((site) => {
    const siteClean = site.toLowerCase().trim();
    return (
      targetClean === siteClean ||
      targetClean.includes(siteClean) ||
      siteClean.includes(targetClean) ||
      // Normalized matching for common site keywords
      (siteClean.includes('port') && targetClean.includes('port')) ||
      (siteClean.includes('airport') && targetClean.includes('airport')) ||
      (siteClean.includes('corporate') && targetClean.includes('corporate')) ||
      (siteClean.includes('medical') && targetClean.includes('medical')) ||
      (siteClean.includes('retail') && targetClean.includes('retail')) ||
      (siteClean.includes('tech') && targetClean.includes('tech')) ||
      (siteClean.includes('warehouse') && targetClean.includes('warehouse')) ||
      (siteClean.includes('hotel') && targetClean.includes('hotel'))
    );
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
 * Evaluates a single guard for a target open shift using training and last-worked heuristics.
 */
export function evaluateGuardForShift(
  shift: Shift,
  guard: GuardProfile,
  allShifts: Shift[],
  allBids: BidRecord[] = []
): GuardCandidateEvaluation {
  const reasons: string[] = [];
  let score = 40; // Base score

  // 1. Site Training & OJT Match Check
  const siteTrained = isGuardSiteTrained(guard, shift.siteName);
  const trainingLevel = guard.trainingLevel || (guard.role === 'lead' || guard.role === 'supervisor' ? 'lead_certified' : 'trained');

  if (siteTrained) {
    score += 30;
    reasons.push(`Fully OJT Qualified on ${shift.siteName}`);
  } else if (guard.role === 'supervisor' || guard.role === 'lead') {
    score += 15;
    reasons.push(`${guard.role === 'supervisor' ? 'Supervisor' : 'Lead'} rating (Capable of rapid site orientation)`);
  } else {
    score -= 15;
    reasons.push(`Needs OJT orientation for this facility`);
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

  // 2. Required Certifications Verification
  const matchedCertifications: string[] = [];
  const missingCertifications: string[] = [];
  
  if (shift.requiredCertifications && shift.requiredCertifications.length > 0) {
    const guardCerts = (guard.certifications || []).map((c) => c.toLowerCase());
    
    shift.requiredCertifications.forEach((req) => {
      const isMet = guardCerts.some((gc) => gc.includes(req.toLowerCase()) || req.toLowerCase().includes(gc));
      if (isMet) {
        matchedCertifications.push(req);
      } else {
        missingCertifications.push(req);
      }
    });

    if (missingCertifications.length === 0) {
      score += 15;
      reasons.push(`Meets 100% of required certifications (${matchedCertifications.join(', ')})`);
    } else {
      score -= 25;
      reasons.push(`Missing certifications: ${missingCertifications.join(', ')}`);
    }
  }

  // 3. Find Last Worked Shift & Past Activity
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

  // 4. Scheduling Conflict Check (Same date assigned shift)
  const sameDayShift = guardFilledShifts.find((s) => s.date === shift.date && s.id !== shift.id);
  let hasScheduleConflict = false;
  let conflictReason: string | undefined = undefined;

  if (sameDayShift) {
    hasScheduleConflict = true;
    conflictReason = `Already assigned to ${sameDayShift.siteName} (${sameDayShift.startTime}-${sameDayShift.endTime})`;
    score -= 60;
    reasons.unshift(`⚠️ Conflict: ${conflictReason}`);
  }

  // 5. Rest / Equitable Distribution Heuristic
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
      score -= 5;
      reasons.push(`Working another shift today (Caution for fatigue)`);
    } else if (daysSinceLastWorked < 0) {
      // Future shift
      score += 10;
      reasons.push(`No shifts prior to this date`);
    }
  }

  // 6. Active Bid Bonus
  const guardBid = allBids.find(
    (b) =>
      b.shiftId === shift.id &&
      (b.guardName.toLowerCase() === guard.name.toLowerCase() || b.guardPhone === guard.phone)
  );

  const hasBid = !!guardBid;
  if (hasBid) {
    score += 12;
    reasons.push(`⚡ Actively bid on this shift (${guardBid.trainingStatus === 'trained' ? 'TRAINED' : 'OJT'})`);
  }

  // Clamp score between 5 and 100
  const finalScore = Math.max(5, Math.min(99, Math.round(score)));

  // Match Grade
  let matchGrade: GuardCandidateEvaluation['matchGrade'] = 'moderate';
  if (hasScheduleConflict) {
    matchGrade = 'conflict';
  } else if (finalScore >= 80 && siteTrained && missingCertifications.length === 0) {
    matchGrade = 'top';
  } else if (finalScore >= 65 && missingCertifications.length === 0) {
    matchGrade = 'strong';
  } else if (!siteTrained || missingCertifications.length > 0) {
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
    matchedCertifications,
    missingCertifications,
    reasons
  };
}

/**
 * Returns ranked guard candidates for a specific shift.
 */
export function suggestGuardsForShift(
  shift: Shift,
  guardsList: GuardProfile[],
  allShifts: Shift[],
  allBids: BidRecord[] = []
): GuardCandidateEvaluation[] {
  return guardsList
    .map((guard) => evaluateGuardForShift(shift, guard, allShifts, allBids))
    .sort((a, b) => {
      // Conflicts always last
      if (a.hasScheduleConflict && !b.hasScheduleConflict) return 1;
      if (!a.hasScheduleConflict && b.hasScheduleConflict) return -1;
      // Primary: Score descending
      return b.score - a.score;
    });
}

/**
 * Generates an optimized batch auto-fill proposal across multiple open shifts.
 * Prevents assigning the same guard multiple times on the same shift date.
 */
export function generateBatchAutoFillPlan(
  openShifts: Shift[],
  guardsList: GuardProfile[],
  allShifts: Shift[],
  allBids: BidRecord[] = []
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
    // Generate candidates
    const allCandidates = suggestGuardsForShift(shift, guardsList, allShifts, allBids);
    
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
      isAssigned: !!chosen && !chosen.hasScheduleConflict
    });
  });

  return planItems;
}
