import { 
  GuardProfile, 
  GuardPerformanceStats, 
  SiteFeedbackEntry, 
  ASRScoreBreakdown, 
  CallOffRecord,
  ReviewerRoleType 
} from '../types/shift';

export const ROLE_WEIGHTS: Record<ReviewerRoleType, number> = {
  property_manager: 3, // Property Manager / Client / Facilities
  supervisor: 2,       // Operations Supervisor / Lead Officer
  resident: 1          // Resident / Tenant / Visitor
};

/**
 * Infer reviewer role from title if not explicitly tagged
 */
export function inferReviewerRole(reviewerTitle: string): ReviewerRoleType {
  const lower = (reviewerTitle || '').toLowerCase();
  if (
    lower.includes('manager') || 
    lower.includes('director') || 
    lower.includes('chief') || 
    lower.includes('client') || 
    lower.includes('coordinator') || 
    lower.includes('liaison') || 
    lower.includes('head of') ||
    lower.includes('dockmaster')
  ) {
    return 'property_manager';
  }
  if (
    lower.includes('supervisor') || 
    lower.includes('commander') || 
    lower.includes('lead') || 
    lower.includes('captain') || 
    lower.includes('sgt') || 
    lower.includes('sergeant') || 
    lower.includes('lt') || 
    lower.includes('lieutenant') ||
    lower.includes('disp')
  ) {
    return 'supervisor';
  }
  return 'resident';
}

/**
 * Calculate the 100-Point Composite ASR (Aegis Score & Rank) and breakdown for a guard
 */
export function calculateASRScore(params: {
  guardId: string;
  onTimeArrivalRate: number;
  emergencyShiftsFulfilled: number;
  fulfilledShiftsCount: number;
  feedbacks: SiteFeedbackEntry[];
  callOffRecords?: CallOffRecord[];
  geofenceBreachesCount?: number;
  slaCheckpointsCompletedRate?: number;
  darQualityRate?: number;
}): ASRScoreBreakdown {
  const {
    onTimeArrivalRate,
    emergencyShiftsFulfilled,
    feedbacks = [],
    callOffRecords = [],
    geofenceBreachesCount = 0,
    slaCheckpointsCompletedRate,
    darQualityRate
  } = params;

  // -------------------------------------------------------------
  // 1. Operational Reliability (Max 60 pts)
  // -------------------------------------------------------------

  // A. Punctuality & Attendance (Max 25 pts)
  // Base arrival punctuality: up to 22 pts
  const basePunctuality = Math.min(22, (Math.max(0, onTimeArrivalRate) / 100) * 22);
  
  // Emergency shift surge bonus: +1 pt per emergency shift (capped at 4 pts)
  const emergencyBonusPts = Math.min(4, emergencyShiftsFulfilled * 1.0);
  
  // Call-off penalties (-3 per unexcused call-off, -5 per no-show)
  const guardCallOffs = callOffRecords.filter(c => c.guardId === params.guardId);
  const lateCallOffsCount = guardCallOffs.filter(c => !c.isNoShow).length;
  const noShowsCount = guardCallOffs.filter(c => c.isNoShow).length;
  const callOffPenaltyPts = (lateCallOffsCount * 3) + (noShowsCount * 5);

  const rawAttendanceScore = basePunctuality + emergencyBonusPts - callOffPenaltyPts;
  const attendancePunctualityScore = Math.max(0, Math.min(25, Math.round(rawAttendanceScore * 10) / 10));

  // B. SLA Checkpoints (Max 20 pts)
  // Rate of timed tasks and circuit checkpoints completed within SLA
  const effectiveSlaRate = slaCheckpointsCompletedRate !== undefined 
    ? slaCheckpointsCompletedRate 
    : Math.min(100, Math.max(75, 85 + (params.fulfilledShiftsCount > 20 ? 12 : 6)));
  const slaCheckpointsScore = Math.max(0, Math.min(20, Math.round(((effectiveSlaRate / 100) * 20) * 10) / 10));

  // C. DAR Quality (Max 15 pts)
  // Quality and completeness of Daily Activity Reports (photo proof, log rigor)
  const effectiveDarRate = darQualityRate !== undefined 
    ? darQualityRate 
    : Math.min(100, Math.max(70, 84 + (params.fulfilledShiftsCount > 15 ? 12 : 5)));
  const darQualityScore = Math.max(0, Math.min(15, Math.round(((effectiveDarRate / 100) * 15) * 10) / 10));

  // D. Geofence Breaches (-3 pts per unexcused >10m breach)
  const geofencePenaltyPts = geofenceBreachesCount * 3;

  const rawReliability = attendancePunctualityScore + slaCheckpointsScore + darQualityScore - geofencePenaltyPts;
  const operationalReliabilityScore = Math.max(0, Math.min(60, Math.round(rawReliability * 10) / 10));

  // -------------------------------------------------------------
  // 2. Client Experience (Max 40 pts)
  // Role weights: Property Manager = 3x, Supervisor = 2x, Resident = 1x
  // Default baseline: 4.0 stars (32 pts) for guards with <3 reviews
  // -------------------------------------------------------------
  let pmCount = 0;
  let supvCount = 0;
  let residentCount = 0;

  let weightedRatingSum = 0;
  let totalWeight = 0;

  feedbacks.forEach(fb => {
    const role = fb.reviewerRole || inferReviewerRole(fb.reviewerTitle);
    const weight = ROLE_WEIGHTS[role] || 1;
    
    if (role === 'property_manager') pmCount++;
    else if (role === 'supervisor') supvCount++;
    else residentCount++;

    weightedRatingSum += fb.rating * weight;
    totalWeight += weight;
  });

  const totalReviewsCount = feedbacks.length;
  const isDefaultBaseline = totalReviewsCount < 3;

  let weightedStarRating: number;

  if (totalReviewsCount === 0) {
    weightedStarRating = 4.0; // 4.0 Stars Default Baseline
  } else if (totalReviewsCount < 3) {
    // Bayesian prior baseline with 4.0 stars for remaining slots up to 3
    const missingSlots = 3 - totalReviewsCount;
    const priorWeight = missingSlots * 2.0; // 2x weight for baseline prior
    const combinedWeight = totalWeight + priorWeight;
    const combinedSum = weightedRatingSum + (4.0 * priorWeight);
    weightedStarRating = Math.round((combinedSum / combinedWeight) * 100) / 100;
  } else {
    weightedStarRating = totalWeight > 0 
      ? Math.round((weightedRatingSum / totalWeight) * 100) / 100 
      : 4.0;
  }

  // Convert to 40-pt scale: (Stars / 5.0) * 40
  const clientExperienceScore = Math.max(0, Math.min(40, Math.round(((weightedStarRating / 5.0) * 40) * 10) / 10));

  // -------------------------------------------------------------
  // 3. Composite ASR (Aegis Score & Rank) (0 - 100 Pts)
  // -------------------------------------------------------------
  const asrScore = Math.max(0, Math.min(100, Math.round(operationalReliabilityScore + clientExperienceScore)));

  // Tier Classification
  let tier: 'diamond' | 'gold' | 'silver' | 'bronze' | 'coaching';
  let tierLabel: string;

  if (asrScore >= 95) {
    tier = 'diamond';
    tierLabel = 'Elite Diamond Tier';
  } else if (asrScore >= 88) {
    tier = 'gold';
    tierLabel = 'Master Gold Tier';
  } else if (asrScore >= 80) {
    tier = 'silver';
    tierLabel = 'Proficient Silver Tier';
  } else if (asrScore >= 70) {
    tier = 'bronze';
    tierLabel = 'Standard Bronze Tier';
  } else {
    tier = 'coaching';
    tierLabel = 'Coaching / Improvement Tier';
  }

  return {
    asrScore,
    oculusScore: asrScore, // backward compatibility
    tier,
    tierLabel,
    operationalReliabilityScore,
    attendancePunctualityScore,
    emergencyBonusPts,
    callOffPenaltyPts,
    slaCheckpointsScore,
    darQualityScore,
    geofenceBreachesCount,
    geofencePenaltyPts,
    clientExperienceScore,
    weightedStarRating,
    reviewCount: totalReviewsCount,
    isDefaultBaseline,
    reviewWeightBreakdown: {
      propertyManagerCount: pmCount,
      supervisorCount: supvCount,
      residentCount: residentCount
    }
  };
}

// Aliases for backwards compatibility
export const calculateAsrScore = calculateASRScore;
export const calculateOculusScore = calculateASRScore;
