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

export type AlertNotificationCategory = 'emergency_alerts' | 'urgent_open_shifts' | 'trade_matches';

export interface ShiftAlertPreferences {
  emergencyAlerts: boolean; // Critical broadcasts, lockdown & active threat notifications
  urgentOpenShifts: boolean; // Same-day / urgent unfilled shifts & priority open posts
  tradeMatches: boolean; // Shift giveaways & swap proposals matching guard's sites or schedule
  siteQualifiedOnly: boolean; // Filter shift notifications to only sites guard is OJT-cleared for
  soundEnabled: boolean; // Play alert audio chime/siren for incoming notifications
  quietHoursEnabled: boolean; // Mute non-emergency alerts during scheduled quiet hours
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "06:00"
  notifyViaSms: boolean; // Dispatch fallback SMS dispatch alert
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
}


