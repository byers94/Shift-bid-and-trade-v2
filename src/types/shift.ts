export type UrgencyType = 'standard' | 'emergency';
export type ShiftStatus = 'open' | 'filled' | 'cancelled';
export type TrainingStatus = 'trained' | 'needs_ojt';

export interface Shift {
  id: string;
  siteName: string;
  address?: string; // Street address for commute calculation
  location?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  hours: number;
  urgency: UrgencyType;
  status: ShiftStatus;
  assignedGuardName?: string;
  assignedGuardId?: string;
  requiredCertifications?: string[];
  notes?: string;
  createdAt: string;
  bidsCount: number;
}

export type TradeStatus =
  | 'pending_approval' // Guard requested to post shift, needs Ops approval
  | 'active'           // Approved and available for swap on Trade Board
  | 'pending_swap'     // A guard proposed a swap, awaiting Ops approval
  | 'approved'         // Swap/trade approved and finalized
  | 'denied';          // Post or swap denied by Ops

export interface ShiftDetails {
  siteName: string;
  address?: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  location?: string;
}

export interface GuardProfile {
  id: string;
  name: string;
  phone: string;
  badgeNumber: string;
  role: 'guard' | 'lead' | 'supervisor';
  ojtSites: string[]; // sites guard is fully qualified/trained on
  email?: string;
  trainingLevel?: 'trained' | 'needs_ojt' | 'lead_certified' | 'in_training';
  certifications?: string[];
  notes?: string;
  hireDate?: string;
  
  // Guard Credentials & Biometrics Authentication
  username?: string;
  password?: string;
  pin?: string;
  biometricsEnabled?: boolean;
  biometricCredentialId?: string;
  lastLogin?: string;

  // Rover Fleet Circuit Assignment
  isRovingGuard?: boolean;
  rovingGroup?: RovingGroup;
}

export interface SwapProposal {
  offeredByGuard: GuardProfile;
  offeredShift: ShiftDetails;
  datesTimesNotes: string;
  ojtStatus: TrainingStatus;
  submittedAt: string;
}

export interface Trade {
  id: string;
  type: 'giveaway' | 'swap';
  status: TradeStatus;
  originalShift: ShiftDetails;
  offeringGuard: GuardProfile;
  reason: string;
  createdAt: string;
  bidAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  swapOffer?: SwapProposal;
}

export interface BidRecord {
  id: string;
  shiftId: string;
  siteName: string;
  shiftDate: string;
  shiftTime: string;
  hours: number;
  guardName: string;
  guardPhone: string;
  trainingStatus: TrainingStatus;
  smsBody: string;
  timestamp: string;
}

export type ShiftClaimCheckType = 'site_training' | 'rest_buffer' | 'overtime';

export interface ShiftClaimViolationCheck {
  isSiteTrained: boolean;
  siteTrainingDetails?: string;
  
  isRestBufferValid: boolean;
  restBufferDetails?: string;
  restHours?: number;
  
  isOvertimeCompliant: boolean;
  overtimeDetails?: string;
  currentWeeklyHours: number;
  shiftHours: number;
  projectedWeeklyHours: number;
  overtimeHours: number;
}

export type ShiftClaimStatus = 'pending_approval' | 'approved' | 'denied' | 'auto_approved';

export interface ShiftClaimRequest {
  id: string;
  shiftId: string;
  shift: Shift;
  guardId: string;
  guardName: string;
  guardBadge: string;
  guardPhone: string;
  guardProfile: GuardProfile;
  claimTimestamp: string;
  status: ShiftClaimStatus;
  requiresAdminApproval: boolean;
  failedChecks: ShiftClaimCheckType[];
  violationDetails: ShiftClaimViolationCheck;
  resolvedAt?: string;
  resolvedByAdminName?: string;
  resolvedByAdminBadge?: string;
  adminResolutionNote?: string;
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

export interface ShiftClaimEligibilityResult {
  isAutoApprovable: boolean;
  requiresAdminApproval: boolean;
  isSiteTrained: boolean;
  siteTrainingReason?: string;
  isRestBufferValid: boolean;
  restBufferReason?: string;
  conflict?: ScheduleConflictCheckResult;
  isOvertimeCompliant: boolean;
  overtimeReason?: string;
  currentWeeklyHours: number;
  shiftHours: number;
  projectedWeeklyHours: number;
  overtimeHours: number;
  failedChecks: ShiftClaimCheckType[];
  summaryMessage: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  category: 'shift' | 'trade' | 'swap' | 'system' | 'broadcast';
  details: string;
  timestamp: string;
  actor: string;
  status: 'info' | 'success' | 'warning' | 'danger';
  metadata?: Record<string, any>;
}

export interface AdminUser {
  id: string;
  name: string;
  badgeId: string;
  role: 'commander' | 'dispatcher' | 'supervisor' | 'lead';
  pin: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  lastLogin?: string;
}

export type AdminActionType =
  | 'admin_login'
  | 'admin_lock'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'guard_created'
  | 'guard_updated'
  | 'guard_deleted'
  | 'shift_created'
  | 'shift_filled'
  | 'shift_reopened'
  | 'shift_deleted'
  | 'bulk_imported'
  | 'trade_approved'
  | 'trade_denied'
  | 'swap_approved'
  | 'swap_denied'
  | 'template_created'
  | 'template_updated'
  | 'template_deleted'
  | 'emergency_broadcast_sent'
  | 'emergency_broadcast_resolved'
  | 'feedback_logged'
  | 'commendation_awarded'
  | 'site_created'
  | 'site_updated'
  | 'site_deleted'
  | 'call_dispatched'
  | 'call_acknowledged'
  | 'call_updated'
  | 'call_cleared'
  | 'call_cancelled'
  | 'guard_clocked_in'
  | 'guard_clocked_out'
  | 'guard_break_started'
  | 'guard_break_ended'
  | 'shift_scheduled'
  | 'shift_reassigned'
  | 'priority_broadcast_sent'
  | 'priority_shift_claimed'
  | 'shift_claim_flagged'
  | 'shift_claim_approved'
  | 'shift_claim_denied'
  | 'late_shift_alert_acknowledged'
  | 'traffic_condition_updated'
  | 'route_optimizer_mode'
  | 'routes_reoptimized'
  | 'ad_hoc_interception'
  | 'interception_cleared'
  | 'system_reset';

export interface AdminAction {
  id: string;
  type: AdminActionType;
  title: string;
  description: string;
  adminName: string;
  adminBadge: string;
  timestamp: string;
  badgeVariant: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple';
  metadata?: Record<string, any>;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertType =
  | 'lockdown'
  | 'active_threat'
  | 'fire_evac'
  | 'severe_weather'
  | 'perimeter_breach'
  | 'medical'
  | 'general_alert';

export interface BroadcastAcknowledgment {
  guardId: string;
  guardName: string;
  badgeNumber: string;
  timestamp: string;
  locationNote?: string;
}

export interface EmergencyBroadcast {
  id: string;
  active: boolean;
  severity: AlertSeverity;
  alertType: AlertType;
  title: string;
  message: string;
  targetSites: string[]; // ['ALL SITES'] or specific site names
  requireAcknowledgment: boolean;
  acknowledgedBy: BroadcastAcknowledgment[];
  initiatedBy: string; // e.g. "Lt. Mark O'Connor (OPS-CMD-01)"
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

export interface ShiftTemplate {
  id: string;
  name: string; // e.g. "Mon-Fri 0800-1600 Corporate Day Patrol"
  siteName: string;
  address?: string;
  location?: string;
  startTime: string; // "08:00"
  endTime: string; // "16:00"
  urgency: UrgencyType;
  daysPattern?: string; // e.g. "Mon - Fri", "Sat - Sun", "Daily Night"
  notes?: string;
  requiredCertifications?: string[];
  createdAt?: string;
}

export type AlertNotificationCategory = 'emergency_alerts' | 'urgent_open_shifts' | 'priority_next_24h' | 'trade_matches';

export interface ShiftAlertPreferences {
  emergencyAlerts: boolean; // Critical broadcasts, lockdown & active threat notifications
  urgentOpenShifts: boolean; // Same-day / urgent unfilled shifts & priority open posts
  priorityNext24hPush: boolean; // Priority push notification for unfilled shifts occurring in next 24h
  minRestBufferHours: number; // Minimum rest buffer between shifts in hours (default: 6)
  tradeMatches: boolean; // Shift giveaways & swap proposals matching guard's sites or schedule
  siteQualifiedOnly: boolean; // Filter shift notifications to only sites guard is OJT-cleared for
  soundEnabled: boolean; // Play alert audio chime/siren for incoming notifications
  quietHoursEnabled: boolean; // Mute non-emergency alerts during scheduled quiet hours
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "06:00"
  notifyViaSms: boolean; // Dispatch fallback SMS dispatch alert
}

export interface PriorityShiftMatch {
  shift: Shift;
  startsInHours: number;
  startsInMinutes: number;
  isEligible: boolean;
  hasOverlap: boolean;
  overlappingShift?: ScheduledShift | Shift;
  hasInsufficientRest: boolean;
  restHoursBefore?: number;
  restHoursAfter?: number;
  adjacentShiftBefore?: ScheduledShift | Shift;
  adjacentShiftAfter?: ScheduledShift | Shift;
  conflictReason?: string;
  isSiteQualified: boolean;
  surgeBonusRate?: number; // e.g. +$3.50/hr urgency fill premium
  startsAtIso: string;
  endsAtIso: string;
}

export interface PriorityPushNotification {
  id: string;
  shiftId: string;
  shift: Shift;
  match: PriorityShiftMatch;
  broadcastAt: string;
  dismissed: boolean;
  isSnoozed?: boolean;
  snoozedUntil?: string;
}

export interface SiteFeedbackEntry {
  id: string;
  guardId: string;
  guardName: string;
  siteName: string;
  rating: number; // 1.0 to 5.0
  reviewerName: string;
  reviewerTitle: string;
  comment: string;
  tags: string[];
  date: string; // YYYY-MM-DD
  isVerifiedClient: boolean;
}

export interface GuardPerformanceStats {
  guardId: string;
  fulfilledShiftsCount: number;
  totalHoursCompleted: number;
  emergencyShiftsFulfilled: number;
  ratingAverage: number; // 1.0 - 5.0
  positiveFeedbackCount: number;
  onTimeArrivalRate: number; // percentage e.g. 99.4
  recognitionBadges: string[];
  topCommendedSite: string;
  recentFeedbacks?: SiteFeedbackEntry[];
}

export type SiteCategory = 
  | 'maritime' 
  | 'corporate' 
  | 'healthcare' 
  | 'aviation' 
  | 'retail' 
  | 'industrial' 
  | 'tech' 
  | 'public_venue' 
  | 'government';

export type SiteSecurityTier = 
  | 'Tier 1 - Standard' 
  | 'Tier 2 - Elevated' 
  | 'Tier 3 - High Security' 
  | 'Tier 4 - Critical Infrastructure';

export type SiteServiceType = 'dedicated' | 'roving';

export type RovingGroup = 
  | 'Alpha Group' 
  | 'Bravo Group' 
  | 'Charlie Group' 
  | 'Delta Group' 
  | 'Echo Group' 
  | 'Foxtrot Group';

export const ROVING_GROUPS: RovingGroup[] = [
  'Alpha Group',
  'Bravo Group',
  'Charlie Group',
  'Delta Group',
  'Echo Group',
  'Foxtrot Group'
];

export interface RovingGroupConfig {
  id: RovingGroup;
  name: string;
  shortCode: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  zone: string;
  description: string;
}

export const ROVING_GROUP_CONFIGS: Record<RovingGroup, RovingGroupConfig> = {
  'Alpha Group': {
    id: 'Alpha Group',
    name: 'Alpha Group',
    shortCode: 'GRP-A',
    color: 'blue',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/70',
    badgeText: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-300 dark:border-blue-700',
    zone: 'Downtown Core & Financial District',
    description: 'High-density commercial towers, financial hubs, and plaza access checkpoints.'
  },
  'Bravo Group': {
    id: 'Bravo Group',
    name: 'Bravo Group',
    shortCode: 'GRP-B',
    color: 'cyan',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-950/70',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-cyan-300 dark:border-cyan-700',
    zone: 'Waterfront & Maritime Commercial Strip',
    description: 'Marina boardwalks, waterfront piers, passenger terminals, and seaside retail properties.'
  },
  'Charlie Group': {
    id: 'Charlie Group',
    name: 'Charlie Group',
    shortCode: 'GRP-C',
    color: 'emerald',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/70',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    zone: 'Eastside Tech Parks & Innovation Campuses',
    description: 'Tech development offices, research buildings, and corporate business parks.'
  },
  'Delta Group': {
    id: 'Delta Group',
    name: 'Delta Group',
    shortCode: 'GRP-D',
    color: 'amber',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/70',
    badgeText: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-700',
    zone: 'North Urban Retail Centers & Commercial Plazas',
    description: 'Shopping centers, outdoor retail strips, dining pavilions, and parking complexes.'
  },
  'Echo Group': {
    id: 'Echo Group',
    name: 'Echo Group',
    shortCode: 'GRP-E',
    color: 'rose',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/70',
    badgeText: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-300 dark:border-rose-700',
    zone: 'South Industrial Logistics & Freight Corridors',
    description: 'Distribution warehouses, shipping yards, logistics terminals, and multimodal storage.'
  },
  'Foxtrot Group': {
    id: 'Foxtrot Group',
    name: 'Foxtrot Group',
    shortCode: 'GRP-F',
    color: 'purple',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/70',
    badgeText: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-300 dark:border-purple-700',
    zone: 'West Metro Transit Hubs & Civic Venues',
    description: 'Light rail plazas, transit transit centers, event concourses, and municipal buildings.'
  }
};

export interface SiteProfile {
  id: string;
  name: string;
  code: string; // e.g. "PORT-P7", "CORP-HQ"
  address: string; // Full street address
  city: string;
  state: string;
  zip: string;
  zone?: string; // Sector / District e.g. "Maritime District", "Downtown Metro"
  category: SiteCategory;
  securityTier: SiteSecurityTier;

  // Service Type & Roving Property Group
  serviceType?: SiteServiceType; // 'dedicated' (guard remains on-site) | 'roving' (serviced by roving patrol guard)
  rovingGroup?: RovingGroup; // e.g. 'Alpha Group', 'Bravo Group', 'Charlie Group', 'Delta Group', 'Echo Group', 'Foxtrot Group'
  rovingNotes?: string; // Specific patrol instructions, keybox code, checkpoint sequence, or lockup orders
  routeOrder?: number; // Sequence order within the roving group patrol route (1, 2, 3...)
  patrolFrequency?: string; // e.g. "3x Per Shift", "Hourly Sweep", "Opening/Closing Check", "2-Hour Loop"

  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail?: string;
  emergencyPhone: string;
  postInstructions: string;
  requiredClearances?: string[]; // Mandatory facility security clearances & credentials from Site Directory
  requiredCertifications: string[]; // Facility qualifications & certifications list
  activePostsCount: number;
  ojtRequired: boolean;
  operatingHours?: string; // e.g. "24/7 Continuous Ops"
  accessGateNotes?: string;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt?: string;
  notes?: string;

  // GPS Coordinates & Geofencing Configuration
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number; // Allowed clock-in perimeter (e.g. 50, 100, 200m)
  requireGeofence?: boolean; // Whether GPS validation is mandatory
  geofenceStrictEnforce?: boolean; // Whether out-of-bounds clock-ins are blocked vs logged

  // Time-Specific Scheduled Tasks & Amenities Closures
  timeSpecificTasks?: TimeSpecificTask[];
}

export type TimeSpecificTaskCategory = 
  | 'amenity_lock'        // e.g. Pool, jacuzzi, rooftop closure
  | 'amenity_unlock'      // e.g. Morning gym/pool unlock
  | 'facility_closure'    // e.g. Laundry room, clubhouse, business center
  | 'access_control'      // e.g. Gate lock, lobby exterior doors locking
  | 'lighting_audit'      // e.g. Perimeter and garage lighting inspection
  | 'curfew_enforcement'  // e.g. Noise curfew check, courtyard clearing
  | 'hazard_inspection'   // e.g. Fire exit check, boiler room log, dumpster gate
  | 'general_service'     // e.g. Package room lock, key checkout audit
  | 'other';

export type TaskScheduleFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom_days';

export type TaskPriority = 'mandatory_sla' | 'priority' | 'routine';

export interface TimeSpecificTask {
  id: string;
  siteId: string;
  siteName?: string;
  title: string; // e.g. "Pool & Jacuzzi Area Lockup"
  category: TimeSpecificTaskCategory;
  scheduledTime: string; // "HH:MM" 24hr format, e.g. "22:00"
  locationZone: string; // e.g. "North Courtyard Pool Gate #2"
  instructions: string; // e.g. "Clear all residents from water. Lock perimeter gates with padlock #4. Verify pump room is secured."
  frequency: TaskScheduleFrequency;
  customDays?: number[]; // [0 = Sun, 1 = Mon, ..., 6 = Sat]
  leadTimeMinutes: number; // e.g. 15 (notify 15 min before scheduledTime)
  gracePeriodMinutes: number; // e.g. 15 (allowed completion window after scheduledTime)
  priority: TaskPriority;
  requirePhoto: boolean;
  requireGps: boolean;
  isActive: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskCompletionLog {
  id: string;
  taskId: string;
  taskTitle: string;
  siteId: string;
  siteName: string;
  scheduledTime: string;
  completedAt: string; // ISO string
  guardId: string;
  guardName: string;
  guardBadge: string;
  status: 'completed' | 'verified' | 'flagged_issue' | 'exception_logged';
  notes?: string;
  photoUrl?: string;
  gpsCoords?: { latitude: number; longitude: number };
  completedWithinSla: boolean;
}

export interface TimeSpecificTaskAlert {
  id: string;
  taskId: string;
  task: TimeSpecificTask;
  siteId: string;
  siteName: string;
  dueTime: string; // Formatted or 24hr
  alertType: 'approaching' | 'due_now' | 'overdue';
  triggeredAt: string; // ISO
  dismissed: boolean;
  acknowledgedByGuardId?: string;
  acknowledgedAt?: string;
}

export type CallPriority = 'routine' | 'priority' | 'urgent_bolo';

export type CallStatus = 'dispatched' | 'en_route' | 'on_scene' | 'cleared' | 'cancelled';

export type CallType = 
  | 'noise_complaint'
  | 'suspicious_vehicle'
  | 'suspicious_person'
  | 'escort_request'
  | 'trespass_warning'
  | 'trespassing'
  | 'maintenance_hazard'
  | 'wellness_check'
  | 'welfare_check'
  | 'open_door_alarm'
  | 'perimeter_alarm'
  | 'access_assistance'
  | 'bolo_alert'
  | 'property_recovery'
  | 'parking_violation'
  | 'general_service'
  | 'other';

export type CallDisposition = 
  | 'Resolved'
  | 'Unfounded'
  | 'Escalated'
  | 'Assistance Rendered'
  | 'Gone on Arrival (GOA)'
  | 'Warning Issued'
  | 'Referred to Emergency Services'
  | 'Report Filed';

export interface BoloSubjectInfo {
  subjectType?: 'vehicle' | 'person' | 'property';
  name?: string;
  gender?: string;
  race?: string;
  approxAge?: string;
  height?: string;
  weight?: string;
  armedAndDangerous?: boolean;
  description?: string;
  vehicleInfo?: string;
  clothingDescription?: string;
  licensePlate?: string;
  makeModelColor?: string;
  directionOfTravel?: string;
  lastKnownDirection?: string;
  lastSeenTime?: string;
  identifyingMarks?: string;
}

export interface CallerInfo {
  name?: string;
  roleOrTitle?: string; // e.g. "Tenant Suite 400", "Dockmaster", "Anonymous"
  phone?: string;
  unitOrLocation?: string;
}

export interface CallReceiptRecord {
  guardId: string;
  guardName: string;
  badgeNumber: string;
  acknowledgedAt: string; // ISO timestamp
  receiptChannel?: 'alert_modal' | 'queue_action' | 'bolo_banner';
  notes?: string;
}

export interface CallReceiptNotification {
  id: string;
  eventType?: 'acknowledged' | 'on_scene' | 'cleared';
  callId: string;
  callType?: CallType;
  customTypeLabel?: string;
  isBolo?: boolean;
  priority: CallPriority;
  siteName: string;
  locationDetails: string;
  summary: string;
  callSummary?: string;
  guardId: string;
  guardName: string;
  badgeNumber: string;
  guardBadge?: string;
  acknowledgedAt: string; // ISO timestamp
  timeToAcknowledgeSec?: number;
  latencySeconds?: number;
  receiptChannel?: 'alert_modal' | 'queue_action' | 'bolo_banner';
  notes?: string;
  assignedRoverUnit?: string;
  assignedRovingGroup?: RovingGroup;
  disposition?: CallDisposition;
  resolutionNote?: string;
}

export interface CallForService {
  id: string; // e.g. "CFS-8041"
  callType: CallType;
  customTypeLabel?: string;
  priority: CallPriority;
  siteName: string; // Specific facility or "ALL SITES"
  locationDetails: string; // Specific post/area e.g. "Gate 3 Loading Dock, Berth 4"
  summary: string;
  details?: string;
  
  // BOLO specifics
  isBolo?: boolean;
  boloSubject?: BoloSubjectInfo;

  callerInfo?: CallerInfo;
  officerInstructions?: string;
  
  // Rover Fleet Dispatch Linkage
  assignedRoverId?: string;
  assignedRoverUnit?: string;
  assignedRovingGroup?: RovingGroup;
  assignedGuardId?: string;
  assignedGuardName?: string;
  assignedGuardBadge?: string;
  assignedAt?: string;

  dispatchedBy: {
    name: string;
    badge: string;
  };
  
  createdAt: string; // ISO timestamp
  status: CallStatus;
  
  // Guard response tracking
  acknowledgedByGuard?: {
    guardId: string;
    guardName: string;
    badgeNumber: string;
    acknowledgedAt: string;
    receiptChannel?: 'alert_modal' | 'queue_action' | 'bolo_banner';
    notes?: string;
  };
  allReceipts?: CallReceiptRecord[];
  timeToAcknowledgeSec?: number;
  
  onSceneAt?: string;
  
  // Clearance tracking
  clearedAt?: string;
  clearedByGuard?: {
    guardId: string;
    guardName: string;
    badgeNumber: string;
  };
  disposition?: CallDisposition;
  resolutionNote?: string;
  
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
}

// ----------------------------------------------------
// Shift Attendance, Time Clocking, and Live Tracking
// ----------------------------------------------------

export type ShiftDutyStatus = 
  | 'scheduled'    // Assigned and waiting for start time
  | 'on_duty'      // Guard has clocked in and actively working
  | 'on_break'     // Guard clocked in but currently on meal or rest break
  | 'completed'    // Guard completed shift and clocked out
  | 'late'         // Overdue for clock-in (> 15 min past scheduled start time)
  | 'missed'       // Shift was missed or unfulfilled
  | 'off_duty'     // Not currently on active shift
  | 'cancelled';

export interface ShiftBreakRecord {
  id: string;
  type: 'meal' | 'rest';
  startedAt: string; // ISO timestamp
  endedAt?: string;  // ISO timestamp
  durationMinutes?: number;
  note?: string;
}

export interface ScheduledShift {
  id: string;
  guardId: string;
  guardName: string;
  guardBadge: string;
  guardPhone?: string;
  siteId?: string;
  siteName: string;
  siteAddress?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h) e.g. "08:00"
  endTime: string; // HH:mm (24h) e.g. "16:00"
  hours: number;
  postRole: string; // e.g. "Access Control & Lobby", "Perimeter Patrol", "Gate 4 Checkpoint"
  postInstructions?: string;
  requiredCertifications?: string[];
  status: ShiftDutyStatus;
  
  // Roving Circuit Shift Specification
  isRovingShift?: boolean;
  rovingGroup?: RovingGroup;
  assignedRoverUnit?: string;
  assignedRoverId?: string;
  circuitStopsCount?: number;
  
  // Clock in/out tracking
  clockInTime?: string; // ISO timestamp
  clockOutTime?: string; // ISO timestamp
  actualHoursWorked?: number;
  breaks?: ShiftBreakRecord[];
  
  // Late tracking
  isLate?: boolean;
  lateMinutes?: number;
  lateAcknowledgedByOps?: boolean;
  
  // Notes & Handover
  notes?: string;
  clockInNotes?: string;
  clockOutNotes?: string;
  handoverSummary?: string;
  equipmentIssued?: string[]; // e.g. ["Radio Ch-3", "Bodycam #08", "Gate Fob #4"]
  
  // Location, Geofence & Photo Verification
  gpsVerified?: boolean;
  siteProximityMeters?: number;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  geofencePassed?: boolean;
  geofenceDistanceMeters?: number;
  selfiePhotoUrl?: string; // Uniform verification selfie
  equipmentPhotoUrl?: string; // Equipment verification photo
  clockInVerifiedAt?: string;
  verifiedByMethod?: 'biometrics' | 'credentials' | 'pin' | 'camera_gps';
  
  createdAt?: string;
}

export interface LateShiftAlert {
  id?: string;
  shiftId: string;
  guardId: string;
  guardName: string;
  guardBadge?: string;
  guardPhone?: string;
  badgeNumber?: string;
  siteId?: string;
  siteName: string;
  postRole?: string;
  scheduledDate: string;
  scheduledStartTime: string;
  minutesLate: number;
  alertTriggeredAt?: string;
  acknowledged?: boolean;
  acknowledgedByAdmin?: boolean;
  createdAt?: string;
}

// ----------------------------------------------------
// Standard Guard Duty Reports (Activity DAR, Maintenance, Incident with Escalation)
// ----------------------------------------------------

export type StandardReportType = 'activity' | 'maintenance' | 'incident';

export interface ReportMediaAttachment {
  id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  capturedAt: string; // ISO timestamp
  fileName?: string;
  fileSizeMb?: number;
  durationSeconds?: number; // For video clips
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

export type ActivityPatrolType = 
  | 'foot_patrol' 
  | 'vehicle_patrol' 
  | 'perimeter_sweep' 
  | 'interior_inspection' 
  | 'access_checkpoint_check' 
  | 'fixed_post_scan'
  | 'common_area_sweep';

export type ActivityStatusType = 
  | 'all_clear' 
  | 'routine_normal' 
  | 'doors_secured' 
  | 'patrol_completed' 
  | 'no_anomalies_detected';

export interface ActivityReportDetails {
  patrolType: ActivityPatrolType;
  zoneChecked: string; // e.g. "North Loading Dock & Perimeter Fence"
  status: ActivityStatusType;
  observationNotes: string; // Routine details, all doors verified secured
  isThirtyMinCheckin: boolean; // Indicates standard 30-minute interval patrol check-in
  intervalSequence?: number; // e.g. 1st, 2nd, 3rd patrol check of shift
  doorsCheckedCount?: number;
  lightsCheckedCount?: number;
}

export type MaintenanceIssueCategory = 
  | 'lighting_electrical' 
  | 'plumbing_leak' 
  | 'doors_locks_gates' 
  | 'hvac_climate' 
  | 'glass_drywall_damage' 
  | 'trash_hazards' 
  | 'elevator_mechanical' 
  | 'fire_safety_extinguisher' 
  | 'landscaping_obstruction' 
  | 'other';

export type MaintenanceSeverity = 'routine' | 'moderate' | 'urgent' | 'critical_safety_hazard';

export type WorkOrderStatus = 
  | 'reported' 
  | 'acknowledged_by_ops' 
  | 'work_order_created' 
  | 'in_progress' 
  | 'dispatched_to_client' 
  | 'resolved' 
  | 'escalated_to_property_management';

export type MaintenanceWorkOrderStatus = WorkOrderStatus;

export interface MaintenanceReportDetails {
  issueCategory: MaintenanceIssueCategory;
  severity: MaintenanceSeverity;
  specificLocation: string; // e.g. "Building C, 2nd Floor Hallway near Rm 204"
  issueTitle: string; // e.g. "Overhead Light Ballast Sparks / Outage"
  detailedDescription: string;
  safetyHazard: boolean;
  propertyStaffNotified: boolean;
  notifiedPersonName?: string;
  suggestedAction?: string;
  workOrderStatus: WorkOrderStatus;
  workOrderNumber?: string;
}

export type IncidentCategory = 
  | 'trespassing' 
  | 'suspicious_person' 
  | 'suspicious_vehicle' 
  | 'parking_violation' 
  | 'noise_disturbance' 
  | 'property_damage' 
  | 'altercation_verbal' 
  | 'altercation_physical' 
  | 'burglary_forced_entry' 
  | 'theft_shoplifting' 
  | 'unauthorized_access' 
  | 'medical_emergency' 
  | 'fire_smoke_hazard' 
  | 'contraband_confiscation' 
  | 'loitering' 
  | 'other_guard_action';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IncidentPartyInvolved {
  id: string;
  name?: string;
  role: 'suspect' | 'victim' | 'witness' | 'tenant' | 'visitor' | 'contractor';
  description?: string;
  vehicleInfo?: string;
  phoneOrContact?: string;
  refusedIdentification?: boolean;
}

export type EmergencyServiceAgency = 
  | 'police_911' 
  | 'fire_department' 
  | 'ems_paramedics' 
  | 'hazmat_team' 
  | 'transit_police' 
  | 'operations_supervisor_onscene';

export interface IncidentReportDetails {
  incidentCategory: IncidentCategory;
  severity: IncidentSeverity;
  incidentTitle: string; // e.g. "Trespasser Directed Off Pier 7 Berth 4"
  summary: string;
  detailedTimeline: string;
  actionTakenByGuard: string; // e.g. "Confronted individual, issued formal verbal trespass notice, monitored subject until off property."
  partiesInvolved?: IncidentPartyInvolved[];
  
  // Guard Action Details
  trespassNoticeIssued?: boolean;
  policeReportNumber?: string;

  // Escalation to Emergency Services
  escalatedToEmergencyServices: boolean;
  emergencyServicesContacted?: EmergencyServiceAgency[];
  emergencyContactTime?: string; // ISO or HH:MM
  cadIncidentNumber?: string; // Dispatch/CAD CAD-8921
  respondingUnits?: string; // e.g. "Seattle PD Unit 412, Officer Chen (Badge #891)"
  emergencyOutcome?: string; // e.g. "Subject detained by SPD and issued criminal trespass admonishment."
  supervisorNotified: boolean;
  supervisorName?: string;
}

export interface StandardShiftReport {
  id: string; // e.g. "RPT-2026-0829-01"
  reportNumber: string;
  reportType: StandardReportType;
  
  // Shift & Facility linkage
  shiftId?: string;
  siteId?: string;
  siteName: string;
  siteAddress?: string;
  
  // Guard Officer
  guardId: string;
  guardName: string;
  guardBadge: string;
  guardPhone?: string;
  
  timestamp: string; // ISO
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  
  // MANDATORY: All reports must require at least one photo and/or video
  media: ReportMediaAttachment[];
  
  // Specific Report Details
  activityDetails?: ActivityReportDetails;
  maintenanceDetails?: MaintenanceReportDetails;
  incidentDetails?: IncidentReportDetails;
  
  // Review & Workflow
  status: 'submitted' | 'reviewed' | 'flagged_for_client' | 'archived';
  reviewedByAdmin?: {
    adminName: string;
    adminBadge: string;
    reviewedAt: string;
    notes?: string;
  };
  
  createdAt: string;
  updatedAt?: string;
}

export interface GuardLiveTrackingItem {
  guardId: string;
  guardName: string;
  guardBadge: string;
  guardPhone: string;
  role: 'guard' | 'lead' | 'supervisor';
  currentStatus: ShiftDutyStatus;
  activeShift?: ScheduledShift;
  currentSiteName?: string;
  postRole?: string;
  clockInTime?: string;
  elapsedSeconds?: number;
  isOnBreak?: boolean;
  currentBreakType?: 'meal' | 'rest';
  breakStartedAt?: string;
  lastKnownActivity?: string;
  equipmentList?: string[];
  selfiePhotoUrl?: string;
  equipmentPhotoUrl?: string;
  geofencePassed?: boolean;
  geofenceDistanceMeters?: number;
}



