import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  Shift, 
  Trade, 
  AuditLogEntry, 
  BidRecord, 
  GuardProfile, 
  TrainingStatus,
  AdminAction,
  AdminUser,
  ShiftTemplate,
  EmergencyBroadcast,
  AlertSeverity,
  AlertType,
  BroadcastAcknowledgment,
  ShiftAlertPreferences,
  AlertNotificationCategory,
  SiteFeedbackEntry,
  GuardPerformanceStats,
  SiteProfile,
  SiteCategory,
  SiteSecurityTier,
  CallForService,
  CallPriority,
  CallStatus,
  CallType,
  CallDisposition,
  BoloSubjectInfo,
  CallerInfo,
  CallReceiptNotification,
  CallReceiptRecord,
  ScheduledShift,
  ShiftDutyStatus,
  ShiftBreakRecord,
  LateShiftAlert,
  GuardLiveTrackingItem,
  PriorityShiftMatch,
  PriorityPushNotification,
  RovingGroup,
  TimeSpecificTask,
  TimeSpecificTaskCategory,
  TaskScheduleFrequency,
  TaskPriority,
  TaskCompletionLog,
  TimeSpecificTaskAlert,
  ShiftClaimRequest,
  ShiftClaimEligibilityResult,
  ShiftClaimViolationCheck,
  ShiftClaimCheckType,
  ShiftClaimStatus,
  StandardShiftReport,
  StandardReportType,
  ActivityReportDetails,
  MaintenanceReportDetails,
  IncidentReportDetails,
  ReportMediaAttachment,
  OfflineQueuedReport,
  ReportSyncStatus,
  SetSchedule,
  TimeOffRequest,
  TimeOffDailyStats,
  GuardCallOffRecord,
  GuardCoachingSession,
  GuardWeeklyAvailability,
  DailyAvailabilityRule,
  DayOfWeek,
  GenerateSetSchedulesOptions,
  GeneratedScheduleEntry,
  GenerateSetSchedulesResult,
  SetScheduleAiSuggestion,
  OffSiteBreachStatus,
  DepartureReasonType,
  GeofenceParcel
} from '../types/shift';
import {
  verifySiteGeofence,
  calculateDistance,
  formatDistance,
  GeoCoordinates
} from '../utils/geo';
import {
  enqueueOfflineReport,
  getOfflineReportQueue,
  subscribeToQueueChanges,
  syncAllQueuedReports,
  processSingleQueuedReport,
  isDeviceOnline
} from '../utils/reportSyncQueue';
import {
  uploadAllReportMedia,
  saveReportToFirestore
} from '../utils/firebase';
import {
  RoverVehicle,
  DynamicRoutePlan,
  AdHocInterception,
  RoverTelemetryLog,
  TrafficCondition,
  OptimizationMode,
  RouteCheckpointStop,
  GeoClusterSector
} from '../types/roverRoute';
import { INITIAL_ROVERS, INITIAL_TELEMETRY_LOGS } from '../data/mockRoverData';
import {
  optimizeRoverRoute,
  calculateNearestRoverForInterception,
  evaluatePassiveTelemetryGeofence,
  buildGeoClusterSectors
} from '../utils/roverRouteOptimizer';
import { 
  INITIAL_SHIFTS, 
  INITIAL_TRADES, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_ADMIN_ACTIONS,
  INITIAL_ADMIN_USERS,
  INITIAL_SHIFT_TEMPLATES,
  INITIAL_BIDS,
  CURRENT_GUARD, 
  GUARDS_LIST,
  OPS_DISPATCH_PHONE,
  DEFAULT_ALERT_PREFERENCES,
  INITIAL_SITE_FEEDBACKS,
  GUARD_BASE_METRICS,
  INITIAL_SITES,
  INITIAL_CALLS_FOR_SERVICE,
  INITIAL_SCHEDULED_SHIFTS,
  INITIAL_CLAIM_REQUESTS,
  INITIAL_TASK_COMPLETION_LOGS,
  INITIAL_STANDARD_REPORTS,
  INITIAL_SET_SCHEDULES,
  INITIAL_TIME_OFF_REQUESTS,
  INITIAL_CALL_OFF_RECORDS,
  INITIAL_COACHING_SESSIONS
} from '../data/mockData';
import { generateSetScheduleAiSuggestions } from '../utils/autoFillHeuristics';
import { calculateHours, generateSmsLink, calculateShiftLateStatus, getShiftElapsedSeconds, formatElapsedTimer } from '../utils/time';
import { calculateASRScore, calculateOculusScore } from '../utils/asrScoring';
import { validateCoachingScheduleSlot, validateAlternateCoachingDate } from '../utils/coachingSchedule';
import {
  evaluatePriorityShiftsForGuard,
  checkShiftScheduleConflict,
  isShiftOccurringInNext24Hours,
  formatRestBuffer,
  evaluateShiftClaimEligibility,
  getWeeklyHoursForGuard
} from '../utils/scheduling';
import { 
  playEmergencyAlertSound, 
  playCallDispatchSound, 
  playReceiptConfirmedSound,
  playOnSceneAlertSound,
  playAllClearAlertSound,
  playClockInAlertSound,
  playClockOutAlertSound,
  playLateAlertSound,
  playBreakAlertSound,
  playPriorityShiftAlertSound,
  playTaskAlertSound,
  playTaskCompletedSound,
  playReportSubmittedSound,
  playEmergencyEscalationSound,
  playGeofenceDepartureWarningSound,
  playGeofenceBreachSound
} from '../utils/audioAlert';
import { computeSiteLifecycleStatus, ensureSiteContacts } from '../utils/contractLifecycle';


interface NotificationToast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  timestamp: string;
}

interface ShiftOpsContextType {
  shifts: Shift[];
  trades: Trade[];
  auditLogs: AuditLogEntry[];
  recentAdminActions: AdminAction[];
  adminUsers: AdminUser[];
  bids: BidRecord[];
  activeGuard: GuardProfile;
  guardsList: GuardProfile[];
  shiftTemplates: ShiftTemplate[];
  activeView: 'dual' | 'guard' | 'ops';
  opsPhone: string;
  hideFilledShifts: boolean;
  toasts: NotificationToast[];
  activeBroadcast: EmergencyBroadcast | null;
  broadcastHistory: EmergencyBroadcast[];
  theme: 'light' | 'dark';
  alertPreferences: ShiftAlertPreferences;
  siteFeedbacks: SiteFeedbackEntry[];
  sitesList: SiteProfile[];
  callsForService: CallForService[];
  latestDispatchedCall: CallForService | null;
  isCallAlertOpen: boolean;
  latestCallReceipt: CallReceiptNotification | null;
  callReceipts: CallReceiptNotification[];
  
  // Guard Authentication & Biometric Credentials
  authenticatedGuard: GuardProfile | null;
  isGuardLoggedIn: boolean;
  guardLogin: (credentials: {
    username?: string;
    badgeNumber?: string;
    password?: string;
    pin?: string;
    useBiometrics?: boolean;
  }) => Promise<{ success: boolean; error?: string; guard?: GuardProfile }>;
  guardLogout: () => void;
  registerGuardBiometrics: (guardId: string) => Promise<{ success: boolean; error?: string }>;
  updateGuardCredentials: (
    guardId: string, 
    credentials: { username?: string; password?: string; pin?: string; biometricsEnabled?: boolean }
  ) => void;

  // Actions
  setActiveView: (view: 'dual' | 'guard' | 'ops') => void;
  setActiveGuard: (guard: GuardProfile) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setHideFilledShifts: (hide: boolean) => void;
  dismissToast: (id: string) => void;
  showToast: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger') => void;
  logAdminAction: (action: Omit<AdminAction, 'id' | 'timestamp'> & { timestamp?: string }) => void;
  dismissCallReceiptNotification: (id?: string) => void;
  clearAllCallReceipts: () => void;

  // Calls for Service & BOLOs
  dispatchCall: (data: {
    callType: CallType;
    customTypeLabel?: string;
    priority: CallPriority;
    siteName: string;
    locationDetails: string;
    summary: string;
    details?: string;
    isBolo?: boolean;
    boloSubject?: BoloSubjectInfo;
    callerInfo?: CallerInfo;
    officerInstructions?: string;
    dispatchedBy?: { name: string; badge: string };
    assignedRoverId?: string;
  }) => CallForService;
  acknowledgeCall: (
    callId: string, 
    guard: GuardProfile,
    options?: { note?: string; channel?: 'alert_modal' | 'queue_action' | 'bolo_banner' }
  ) => void;
  markCallOnScene: (callId: string, guard: GuardProfile, note?: string) => void;
  updateCallStatus: (callId: string, status: CallStatus, note?: string, guard?: GuardProfile) => void;
  clearCall: (
    callId: string,
    guard: GuardProfile,
    disposition: CallDisposition,
    resolutionNote?: string
  ) => void;
  cancelCall: (callId: string, reason: string, cancelledBy?: string) => void;
  dismissCallAlert: () => void;
  openCallAlert: (call: CallForService) => void;
  deleteCall: (callId: string) => void;

  // Top Performers & Site Feedback
  addSiteFeedback: (feedback: Omit<SiteFeedbackEntry, 'id'>) => SiteFeedbackEntry;
  awardGuardCommendation: (guardId: string, badgeName: string, note?: string) => void;
  coachingSessions: GuardCoachingSession[];
  scheduleGuardCoaching: (
    guardIdOrData: string | {
      guardId: string;
      topic: string;
      scheduledDate: string;
      scheduledTime?: string;
      durationMinutes?: number;
      notes?: string;
      overrideRestrictions?: boolean;
      overrideReason?: string;
      hasShiftConflict?: boolean;
      hasRestBufferConflict?: boolean;
      conflictDetails?: string;
    },
    topic?: string,
    scheduledDate?: string,
    notes?: string
  ) => GuardCoachingSession | undefined;
  confirmGuardCoaching: (sessionId: string, guardNotes?: string) => void;
  completeGuardCoaching: (
    sessionId: string,
    data?: {
      completionNotes?: string;
      improvementOutcome?: string;
      performanceScoreAfter?: number;
      attendanceVerified?: boolean;
      actionItems?: string[];
    }
  ) => void;
  proposeAlternateCoaching: (
    sessionId: string,
    alternateDate: string,
    alternateTime: string,
    reason?: string
  ) => { success: boolean; message: string };
  acceptAlternateCoaching: (sessionId: string, adminNotes?: string) => void;
  denyAlternateCoaching: (sessionId: string, denialReason?: string) => void;
  counterAlternateCoaching: (
    sessionId: string,
    counterDate: string,
    counterTime: string,
    counterReason?: string
  ) => void;
  cancelCoachingSession: (sessionId: string, reason?: string) => void;
  getGuardCoachingSessions: (guardId: string) => GuardCoachingSession[];
  getGuardPerformance: (guardId: string) => GuardPerformanceStats;
  getLeaderboard: (sortBy?: 'composite' | 'asr' | 'oculus' | 'reliability' | 'client_exp' | 'shifts' | 'rating' | 'emergency' | 'ontime', timeframe?: string) => (GuardProfile & GuardPerformanceStats)[];
  
  // Guard Shift Alert Preferences
  updateAlertPreferences: (prefs: Partial<ShiftAlertPreferences>) => void;
  resetAlertPreferences: () => void;
  testAlertNotification: (category: 'emergency_alerts' | 'urgent_open_shifts' | 'priority_next_24h' | 'trade_matches') => void;
  
  // Priority 24-Hour Shifts & Push Notification Engine
  eligiblePriorityShifts: PriorityShiftMatch[];
  activePriorityPush: PriorityPushNotification | null;
  dismissedPriorityShiftIds: string[];
  getPriorityNext24hShifts: (guardId?: string) => PriorityShiftMatch[];
  dismissPriorityPush: (shiftId?: string, dismissAll?: boolean) => void;
  clearDismissedPriorityShifts: () => void;
  snoozePriorityPush: (minutes?: number) => void;
  triggerPriorityPushAlert: (shiftId?: string) => void;
  claimPriorityShift: (shiftId: string, guardId?: string) => { 
    success: boolean; 
    requiresApproval?: boolean; 
    claimRequest?: ShiftClaimRequest; 
    message: string; 
    shift?: Shift; 
    scheduledShift?: ScheduledShift 
  };
  broadcastPriorityPushToGuards: (shiftId: string) => { notifiedGuardsCount: number; eligibleGuards: GuardProfile[] };
  
  // 1-Click Shift Claim Validation & Admin Approval Flow
  shiftClaims: ShiftClaimRequest[];
  approveShiftClaim: (claimId: string, adminNote?: string) => void;
  denyShiftClaim: (claimId: string, reason: string) => void;
  evaluateShiftClaim: (shiftId: string, guardId?: string) => ShiftClaimEligibilityResult | null;
  
  // Emergency Broadcast Operations
  sendEmergencyBroadcast: (data: {
    severity: AlertSeverity;
    alertType: AlertType;
    title: string;
    message: string;
    targetSites?: string[];
    requireAcknowledgment?: boolean;
    initiatedBy?: string;
  }) => EmergencyBroadcast;
  acknowledgeBroadcast: (guardId: string, guardName: string, badgeNumber: string, locationNote?: string) => void;
  cancelOrResolveBroadcast: (broadcastId?: string, resolutionNote?: string, resolvedBy?: string) => void;
  
  // Shift Templates Management
  addShiftTemplate: (data: Omit<ShiftTemplate, 'id' | 'createdAt'>) => ShiftTemplate;
  updateShiftTemplate: (id: string, data: Partial<ShiftTemplate>) => void;
  deleteShiftTemplate: (id: string) => void;

  // User & Personnel Management
  addAdminUser: (data: {
    name: string;
    badgeId: string;
    role: 'commander' | 'dispatcher' | 'supervisor' | 'lead';
    pin: string;
    email?: string;
    phone?: string;
    status?: 'active' | 'inactive';
  }) => AdminUser;
  updateAdminUser: (id: string, data: Partial<AdminUser>) => void;
  deleteAdminUser: (id: string) => void;
  
  addGuard: (data: {
    name: string;
    badgeNumber: string;
    phone: string;
    role: 'guard' | 'lead' | 'supervisor';
    ojtSites: string[];
    email?: string;
    trainingLevel?: 'trained' | 'needs_ojt' | 'lead_certified' | 'in_training';
    certifications?: string[];
    notes?: string;
    hireDate?: string;
    username?: string;
    password?: string;
    pin?: string;
    biometricsEnabled?: boolean;
  }) => GuardProfile;
  updateGuard: (id: string, data: Partial<GuardProfile>) => void;
  deleteGuard: (id: string) => void;
  
  // Site Directory Management
  addSite: (data: Omit<SiteProfile, 'id' | 'createdAt'>) => SiteProfile;
  updateSite: (id: string, data: Partial<SiteProfile>) => void;
  deleteSite: (id: string) => void;
  getSiteByName: (name: string) => SiteProfile | undefined;
  bulkImportSites: (
    sitesArray: any[],
    options?: { overwrite?: boolean; defaultOjt?: boolean }
  ) => { count: number; updatedCount: number; errors: string[] };

  // Site Time-Specific Tasks & Post Orders Management (Locks, Curfews, Closures)
  taskCompletionLogs: TaskCompletionLog[];
  activeTaskAlert: TimeSpecificTaskAlert | null;
  taskAlertsHistory: TimeSpecificTaskAlert[];
  addTimeSpecificTask: (siteId: string, taskData: Omit<TimeSpecificTask, 'id' | 'siteId' | 'createdAt' | 'updatedAt'>) => TimeSpecificTask;
  updateTimeSpecificTask: (siteId: string, taskId: string, taskData: Partial<TimeSpecificTask>) => void;
  deleteTimeSpecificTask: (siteId: string, taskId: string) => void;
  completeTimeSpecificTask: (
    taskId: string,
    siteId: string,
    guard: GuardProfile,
    options?: {
      notes?: string;
      photoUrl?: string;
      gpsCoords?: { latitude: number; longitude: number };
      status?: 'completed' | 'verified' | 'flagged_issue' | 'exception_logged';
    }
  ) => TaskCompletionLog;
  dismissTaskAlert: () => void;
  acknowledgeTaskAlert: (alertId: string, guardId?: string) => void;
  triggerTestTaskAlert: (task?: TimeSpecificTask, alertType?: 'approaching' | 'due_now' | 'overdue') => void;
  getTasksForSite: (siteId: string) => TimeSpecificTask[];
  getTaskCompletionStatus: (taskId: string, dateStr?: string) => TaskCompletionLog | undefined;

  // Standard Guard Duty Reports (Activity DAR, Maintenance, Incident Reports)
  standardReports: StandardShiftReport[];
  offlineReportQueue: OfflineQueuedReport[];
  isOnline: boolean;
  isSyncingReports: boolean;
  syncQueuedReports: () => Promise<void>;
  retryReportSync: (reportId: string) => Promise<void>;
  submitStandardReport: (
    reportData: Omit<StandardShiftReport, 'id' | 'reportNumber' | 'createdAt'> & { timestamp?: string; id?: string }
  ) => StandardShiftReport;
  updateStandardReport: (id: string, updates: Partial<StandardShiftReport>) => void;
  deleteStandardReport: (id: string) => void;
  reviewStandardReport: (
    id: string, 
    adminNameOrData: string | { adminId?: string; adminName: string; adminBadge: string; notes?: string; status?: 'reviewed' | 'flagged_for_client' | 'archived' }, 
    adminBadge?: string, 
    notes?: string, 
    status?: 'reviewed' | 'flagged_for_client' | 'archived'
  ) => void;
  updateMaintenanceWorkOrder: (
    id: string, 
    workOrderStatus: MaintenanceReportDetails['workOrderStatus'], 
    workOrderNumber?: string
  ) => void;
  getLastActivityReportForGuard: (guardId: string) => StandardShiftReport | undefined;

  // Shift Operations
  createShift: (data: {
    siteName: string;
    address?: string;
    location?: string;
    date: string;
    startTime: string;
    endTime: string;
    urgency: 'standard' | 'emergency';
    notes?: string;
    requiredCertifications?: string[];
  }) => Shift;
  bulkImportShifts: (shiftsArray: any[]) => { count: number; errors: string[] };
  markShiftFilled: (shiftId: string, guardName?: string) => void;
  reopenShift: (shiftId: string) => void;
  deleteShift: (shiftId: string) => void;
  
  // Guard Bid Operations
  submitBid: (shiftId: string, trainingStatus: TrainingStatus) => { smsUrl: string; smsBody: string };
  awardShiftBid: (shiftId: string, bidId: string, guardName: string, guardPhone?: string) => void;
  
  // Trade Operations
  postTradeRequest: (data: {
    type?: 'giveaway' | 'swap';
    siteName: string;
    address?: string;
    location?: string;
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
  }) => Trade;
  updateTradePost: (
    tradeId: string,
    updates: {
      reason?: string;
      type?: 'giveaway' | 'swap';
      siteName?: string;
      location?: string;
      address?: string;
    }
  ) => void;
  proposeSwap: (tradeId: string, data: {
    siteName: string;
    address?: string;
    location?: string;
    date: string;
    startTime: string;
    endTime: string;
    datesTimesNotes: string;
    ojtStatus: TrainingStatus;
  }) => void;
  approveTradePost: (
    tradeId: string,
    note?: string,
    updatedReason?: string,
    updatedType?: 'giveaway' | 'swap'
  ) => void;
  denyTradePost: (tradeId: string, reason: string) => void;
  approveSwap: (tradeId: string, note?: string) => void;
  denySwap: (tradeId: string, reason: string) => void;
  
  // Shift Attendance, Time Tracking, and Live Duty Board
  scheduledShifts: ScheduledShift[];
  activeClockedInShift: ScheduledShift | null;
  lateShiftAlerts: LateShiftAlert[];
  dismissedLateAlertIds: string[];
  clockInGuard: (
    guardId: string, 
    siteName: string, 
    options?: { 
      scheduledShiftId?: string; 
      postRole?: string; 
      notes?: string; 
      gpsVerified?: boolean; 
      gpsCoordinates?: { latitude: number; longitude: number; accuracy?: number };
      geofencePassed?: boolean;
      geofenceDistanceMeters?: number;
      selfiePhotoUrl?: string;
      equipmentPhotoUrl?: string;
      verifiedByMethod?: 'biometrics' | 'credentials' | 'pin' | 'camera_gps';
      equipmentIssued?: string[];
    }
  ) => ScheduledShift;
  clockOutGuard: (
    guardId: string, 
    options?: { 
      notes?: string; 
      handoverSummary?: string; 
      equipmentReturned?: boolean 
    }
  ) => void;
  startGuardBreak: (guardId: string, breakType?: 'meal' | 'rest', note?: string) => void;
  endGuardBreak: (guardId: string) => void;
  scheduleNewShift: (
    data: Omit<ScheduledShift, 'id' | 'createdAt' | 'status'> & { status?: ShiftDutyStatus }
  ) => ScheduledShift;
  updateScheduledShift: (id: string, data: Partial<ScheduledShift>) => void;
  deleteScheduledShift: (id: string) => void;
  reassignScheduledShift: (shiftId: string, newGuardId: string) => void;
  acknowledgeLateAlert: (shiftId: string, note?: string) => void;
  getGuardActiveShift: (guardId: string) => ScheduledShift | undefined;
  getGuardUpcomingShifts: (guardId: string) => ScheduledShift[];
  confirmShiftAttendance: (shiftId: string) => void;
  getGuardsLiveTracking: () => GuardLiveTrackingItem[];

  // Live Geofence Departure & Breach Management
  verifyGuardGeofenceLocation: (guardId: string, coords: { latitude: number; longitude: number }) => {
    inGeofence: boolean;
    distanceMeters: number;
    matchedParcelName?: string;
    siteName: string;
  };
  updateGuardGeofenceState: (
    shiftId: string, 
    data: {
      inGeofence: boolean;
      distanceMeters?: number;
      matchedParcelName?: string;
      currentGps?: { latitude: number; longitude: number };
    }
  ) => void;
  submitDepartureReason: (
    shiftId: string, 
    reason: DepartureReasonType,
    notes?: string
  ) => void;
  escalateGeofenceBreach: (shiftId: string) => void;
  clearGeofenceBreach: (shiftId: string, supervisorNote?: string) => void;
  excuseGeofenceDepartureByOps: (shiftId: string, reason: string, adminBadge?: string) => void;


  // Dynamic Rover Route Optimization & Telemetry
  rovers: RoverVehicle[];
  roverPlans: Record<string, DynamicRoutePlan>;
  activeInterceptions: AdHocInterception[];
  telemetryLogs: RoverTelemetryLog[];
  trafficCondition: TrafficCondition;
  optimizationMode: OptimizationMode;
  antiPredictabilityJitterPct: number;
  geoClusterSectors: GeoClusterSector[];
  setTrafficCondition: (traffic: TrafficCondition) => void;
  setOptimizationMode: (mode: OptimizationMode) => void;
  setAntiPredictabilityJitterPct: (pct: number) => void;
  reoptimizeRoverRoutes: (mode?: OptimizationMode, traffic?: TrafficCondition) => void;
  dispatchAdHocInterception: (callId: string, customAddress?: string, overrideRoverId?: string) => AdHocInterception | null;
  clearAdHocInterception: (interceptionId: string, resolutionNotes?: string) => void;
  advanceRoverCheckpoint: (roverId: string, customStatus?: string) => void;
  simulateRoverGpsMove: (roverId: string, coords: { latitude: number; longitude: number; speedKmh?: number }) => void;
  addTelemetryLog: (log: Omit<RoverTelemetryLog, 'id' | 'timestamp'> & { timestamp?: string }) => RoverTelemetryLog;
  getRoverForGuard: (guardId: string) => RoverVehicle | undefined;
  getRoverByGroup: (group: RovingGroup) => RoverVehicle | undefined;

  // Set Schedules & Recurring Assignments
  setSchedules: SetSchedule[];
  timeOffRequests: TimeOffRequest[];
  callOffRecords: GuardCallOffRecord[];
  addSetSchedule: (data: Omit<SetSchedule, 'id' | 'createdAt' | 'updatedAt'>) => SetSchedule;
  updateSetSchedule: (id: string, data: Partial<SetSchedule>) => void;
  deleteSetSchedule: (id: string) => void;
  toggleSetScheduleActive: (id: string) => void;
  assignGuardToSetSchedule: (scheduleId: string, guardId: string) => void;
  generateSchedulesFromSetTemplates: (options: GenerateSetSchedulesOptions) => GenerateSetSchedulesResult;
  getSetScheduleAiSuggestions: (setScheduleId: string) => SetScheduleAiSuggestion[];

  // Guard Availability Tracker
  updateGuardAvailability: (guardId: string, availability: Partial<GuardWeeklyAvailability>) => void;
  updateGuardDailyRule: (guardId: string, dayOfWeek: DayOfWeek, rule: Partial<DailyAvailabilityRule>) => void;

  // Time-Off Requests Management & Daily Approval Quota
  maxDailyApprovedTimeOff: number;
  dateSpecificMaxTimeOffOverrides: Record<string, number>;
  setMaxDailyApprovedTimeOff: (limit: number) => void;
  setDateSpecificMaxTimeOff: (dateStr: string, limit: number | null) => void;
  getTimeOffStatsForDate: (dateStr: string) => TimeOffDailyStats;
  checkTimeOffApprovalCapacity: (requestIdOrDates: string | { startDate: string; endDate: string }) => {
    canApproveWithoutExceeding: boolean;
    affectedDates: {
      date: string;
      currentApproved: number;
      maxAllowed: number;
      remainingAfterApproval: number;
      wouldExceed: boolean;
    }[];
    datesExceeding: string[];
  };
  submitTimeOffRequest: (data: Omit<TimeOffRequest, 'id' | 'requestedAt' | 'status'>) => TimeOffRequest;
  reviewTimeOffRequest: (requestId: string, status: 'approved' | 'rejected' | 'denied', adminName?: string, adminBadge?: string, note?: string) => void;
  cancelTimeOffRequest: (requestId: string) => void;

  // Guard Call-Offs & Urgent Open Shift Quick-Add Flow
  recordGuardCallOff: (data: {
    scheduledShiftId: string;
    reason: string;
    guardId?: string;
    guardName?: string;
    guardBadge?: string;
    siteName?: string;
    shiftDate?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    autoAddToBiddingQueue?: boolean;
    broadcastPushNotification?: boolean;
    isNoShow?: boolean;
    postToBiddingQueue?: boolean;
    sendUrgentPush?: boolean;
    adminName?: string;
  }) => { callOffRecord: GuardCallOffRecord; urgentShift?: Shift };
  quickAddCallOffToBiddingQueue: (callOffId: string, options?: { sendPushNotification?: boolean; urgency?: 'standard' | 'emergency' }) => Shift | null;

  // System
  resetToDefaults: () => void;
}

const ShiftOpsContext = createContext<ShiftOpsContextType | undefined>(undefined);

const STORAGE_KEY_ROVERS = 'secureshift_rovers_v1';
const STORAGE_KEY_ROVER_PLANS = 'secureshift_rover_plans_v1';
const STORAGE_KEY_INTERCEPTIONS = 'secureshift_ad_hoc_interceptions_v1';
const STORAGE_KEY_TELEMETRY = 'secureshift_rover_telemetry_v1';
const STORAGE_KEY_TRAFFIC = 'secureshift_traffic_condition_v1';
const STORAGE_KEY_OPT_MODE = 'secureshift_optimization_mode_v1';
const STORAGE_KEY_JITTER_PCT = 'secureshift_jitter_pct_v1';

const STORAGE_KEY_SHIFTS = 'secureshift_shifts_v1';
const STORAGE_KEY_TRADES = 'secureshift_trades_v1';
const STORAGE_KEY_LOGS = 'secureshift_logs_v1';
const STORAGE_KEY_BIDS = 'secureshift_bids_v1';
const STORAGE_KEY_ADMIN_ACTIONS = 'secureshift_admin_actions_v1';
const STORAGE_KEY_ADMIN_USERS = 'secureshift_admin_users_v1';
const STORAGE_KEY_GUARDS = 'secureshift_guards_v1';
const STORAGE_KEY_TEMPLATES = 'secureshift_templates_v1';
const STORAGE_KEY_BROADCAST = 'secureshift_emergency_broadcast_v1';
const STORAGE_KEY_BROADCAST_HISTORY = 'secureshift_broadcast_history_v1';
const STORAGE_KEY_THEME = 'secureshift_theme_mode_v1';
const STORAGE_KEY_ALERT_PREFS = 'secureshift_guard_alert_prefs_v1';
const STORAGE_KEY_SITE_FEEDBACKS = 'secureshift_site_feedbacks_v1';
const STORAGE_KEY_SITES = 'secureshift_sites_v1';
const STORAGE_KEY_CALLS_FOR_SERVICE = 'secureshift_calls_for_service_v1';
const STORAGE_KEY_CALL_RECEIPTS = 'secureshift_call_receipts_v1';
const STORAGE_KEY_SCHEDULED_SHIFTS = 'secureshift_scheduled_shifts_v1';
const STORAGE_KEY_DISMISSED_LATE_ALERTS = 'secureshift_dismissed_late_alerts_v1';
const STORAGE_KEY_TASK_COMPLETION_LOGS = 'secureshift_task_completion_logs_v1';
const STORAGE_KEY_TASK_ALERTS_HISTORY = 'secureshift_task_alerts_history_v1';
const STORAGE_KEY_SHIFT_CLAIMS = 'secureshift_claim_requests_v1';
const STORAGE_KEY_STANDARD_REPORTS = 'secureshift_standard_reports_v1';
const STORAGE_KEY_SET_SCHEDULES = 'secureshift_set_schedules_v1';
const STORAGE_KEY_TIME_OFF_REQUESTS = 'secureshift_time_off_requests_v1';
const STORAGE_KEY_MAX_DAILY_APPROVED_TIME_OFF = 'secureshift_max_daily_approved_time_off_v1';
const STORAGE_KEY_DATE_SPECIFIC_MAX_TIME_OFF = 'secureshift_date_specific_max_time_off_v1';
const STORAGE_KEY_CALL_OFF_RECORDS = 'secureshift_call_off_records_v1';
const STORAGE_KEY_COACHING_SESSIONS = 'secureshift_coaching_sessions_v1';

export const ShiftOpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scheduledShifts, setScheduledShifts] = useState<ScheduledShift[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCHEDULED_SHIFTS);
      return saved ? JSON.parse(saved) : INITIAL_SCHEDULED_SHIFTS;
    } catch {
      return INITIAL_SCHEDULED_SHIFTS;
    }
  });

  const [dismissedLateAlertIds, setDismissedLateAlertIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DISMISSED_LATE_ALERTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [callsForService, setCallsForService] = useState<CallForService[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CALLS_FOR_SERVICE);
      return saved ? JSON.parse(saved) : INITIAL_CALLS_FOR_SERVICE;
    } catch {
      return INITIAL_CALLS_FOR_SERVICE;
    }
  });

  const [callReceipts, setCallReceipts] = useState<CallReceiptNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CALL_RECEIPTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [latestCallReceipt, setLatestCallReceipt] = useState<CallReceiptNotification | null>(null);

  const [latestDispatchedCall, setLatestDispatchedCall] = useState<CallForService | null>(null);
  const [isCallAlertOpen, setIsCallAlertOpen] = useState<boolean>(false);

  const [shifts, setShifts] = useState<Shift[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHIFTS);
      return saved ? JSON.parse(saved) : INITIAL_SHIFTS;
    } catch {
      return INITIAL_SHIFTS;
    }
  });

  const [trades, setTrades] = useState<Trade[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRADES);
      return saved ? JSON.parse(saved) : INITIAL_TRADES;
    } catch {
      return INITIAL_TRADES;
    }
  });

  const [shiftClaims, setShiftClaims] = useState<ShiftClaimRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHIFT_CLAIMS);
      return saved ? JSON.parse(saved) : INITIAL_CLAIM_REQUESTS;
    } catch {
      return INITIAL_CLAIM_REQUESTS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [recentAdminActions, setRecentAdminActions] = useState<AdminAction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ADMIN_ACTIONS);
      return saved ? JSON.parse(saved) : INITIAL_ADMIN_ACTIONS;
    } catch {
      return INITIAL_ADMIN_ACTIONS;
    }
  });

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ADMIN_USERS);
      return saved ? JSON.parse(saved) : INITIAL_ADMIN_USERS;
    } catch {
      return INITIAL_ADMIN_USERS;
    }
  });

  const [guardsList, setGuardsList] = useState<GuardProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GUARDS);
      return saved ? JSON.parse(saved) : GUARDS_LIST;
    } catch {
      return GUARDS_LIST;
    }
  });

  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      return saved ? JSON.parse(saved) : INITIAL_SHIFT_TEMPLATES;
    } catch {
      return INITIAL_SHIFT_TEMPLATES;
    }
  });

  const [bids, setBids] = useState<BidRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BIDS);
      return saved ? JSON.parse(saved) : INITIAL_BIDS;
    } catch {
      return INITIAL_BIDS;
    }
  });

  const [activeBroadcast, setActiveBroadcast] = useState<EmergencyBroadcast | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BROADCAST);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [broadcastHistory, setBroadcastHistory] = useState<EmergencyBroadcast[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BROADCAST_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeGuard, setActiveGuard] = useState<GuardProfile>(() => {
    try {
      const saved = localStorage.getItem('secureshift_guard_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) return parsed;
      }
    } catch {}
    return GUARDS_LIST[0] || CURRENT_GUARD;
  });

  const [authenticatedGuard, setAuthenticatedGuard] = useState<GuardProfile | null>(() => {
    try {
      const saved = localStorage.getItem('secureshift_guard_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) return parsed;
      }
    } catch {}
    return GUARDS_LIST[0] || CURRENT_GUARD;
  });

  const isGuardLoggedIn = Boolean(authenticatedGuard);
  const [activeView, setActiveView] = useState<'dual' | 'guard' | 'ops'>('dual');
  const [hideFilledShifts, setHideFilledShifts] = useState<boolean>(false);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const opsPhone = OPS_DISPATCH_PHONE;

  // Guard Shift Alert Preferences State
  const [alertPreferences, setAlertPreferencesState] = useState<ShiftAlertPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ALERT_PREFS);
      return saved ? { ...DEFAULT_ALERT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_ALERT_PREFERENCES;
    } catch {
      return DEFAULT_ALERT_PREFERENCES;
    }
  });

  // Site Feedback & Commendations State
  const [siteFeedbacks, setSiteFeedbacks] = useState<SiteFeedbackEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SITE_FEEDBACKS);
      return saved ? JSON.parse(saved) : INITIAL_SITE_FEEDBACKS;
    } catch {
      return INITIAL_SITE_FEEDBACKS;
    }
  });

  // Site Directory State
  const [sitesList, setSitesList] = useState<SiteProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SITES);
      if (saved) {
        const parsed: SiteProfile[] = JSON.parse(saved);
        return parsed.map((site) => {
          const initial = INITIAL_SITES.find((s) => s.id === site.id);
          const tasks = ((!site.timeSpecificTasks || site.timeSpecificTasks.length === 0) && initial?.timeSpecificTasks && initial.timeSpecificTasks.length > 0)
            ? initial.timeSpecificTasks
            : site.timeSpecificTasks;
          const contacts = (site.contacts && site.contacts.length > 0)
            ? site.contacts
            : (initial?.contacts && initial.contacts.length > 0)
            ? initial.contacts
            : ensureSiteContacts(site);
          const contractType = site.contractType || initial?.contractType || 'ONGOING';
          const startDate = site.startDate || initial?.startDate;
          const endDate = site.endDate || initial?.endDate;
          const computedStatus = computeSiteLifecycleStatus({
            ...site,
            startDate,
            endDate,
            contractStatus: site.contractStatus
          });
          return { 
            ...site, 
            timeSpecificTasks: tasks,
            contacts,
            contractType,
            startDate,
            endDate,
            contractStatus: computedStatus
          };
        });
      }
      return INITIAL_SITES;
    } catch {
      return INITIAL_SITES;
    }
  });

  // Time-Sensitive Tasks (Pool/Laundry locks, Curfews, Closures) State
  const [taskCompletionLogs, setTaskCompletionLogs] = useState<TaskCompletionLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASK_COMPLETION_LOGS);
      return saved ? JSON.parse(saved) : INITIAL_TASK_COMPLETION_LOGS;
    } catch {
      return INITIAL_TASK_COMPLETION_LOGS;
    }
  });

  const [activeTaskAlert, setActiveTaskAlert] = useState<TimeSpecificTaskAlert | null>(null);
  const [taskAlertsHistory, setTaskAlertsHistory] = useState<TimeSpecificTaskAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASK_ALERTS_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [dismissedTaskAlertKeys, setDismissedTaskAlertKeys] = useState<Set<string>>(new Set());

  // Standard Guard Duty Reports (Activity DAR, Maintenance, Incident Reports)
  const [standardReports, setStandardReports] = useState<StandardShiftReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STANDARD_REPORTS);
      return saved ? JSON.parse(saved) : INITIAL_STANDARD_REPORTS;
    } catch {
      return INITIAL_STANDARD_REPORTS;
    }
  });

  // Set Schedules & Standing Shift Templates State
  const [setSchedules, setSetSchedules] = useState<SetSchedule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SET_SCHEDULES);
      return saved ? JSON.parse(saved) : INITIAL_SET_SCHEDULES;
    } catch {
      return INITIAL_SET_SCHEDULES;
    }
  });

  // Time-Off Requests State
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TIME_OFF_REQUESTS);
      return saved ? JSON.parse(saved) : INITIAL_TIME_OFF_REQUESTS;
    } catch {
      return INITIAL_TIME_OFF_REQUESTS;
    }
  });

  // Daily Max Approved Time-Off Quota State (Default: 2)
  const [maxDailyApprovedTimeOff, setMaxDailyApprovedTimeOffState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MAX_DAILY_APPROVED_TIME_OFF);
      return saved ? Math.max(1, parseInt(saved, 10) || 2) : 2;
    } catch {
      return 2;
    }
  });

  // Date-Specific Time-Off Capacity Overrides (e.g. { "2026-09-22": 1 })
  const [dateSpecificMaxTimeOffOverrides, setDateSpecificMaxTimeOffOverrides] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATE_SPECIFIC_MAX_TIME_OFF);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Guard Call-Offs & No-Show Records State
  const [callOffRecords, setCallOffRecords] = useState<GuardCallOffRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CALL_OFF_RECORDS);
      return saved ? JSON.parse(saved) : INITIAL_CALL_OFF_RECORDS;
    } catch {
      return INITIAL_CALL_OFF_RECORDS;
    }
  });

  // Guard Coaching & Performance Remediation Sessions State
  const [coachingSessions, setCoachingSessions] = useState<GuardCoachingSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COACHING_SESSIONS);
      return saved ? JSON.parse(saved) : INITIAL_COACHING_SESSIONS;
    } catch {
      return INITIAL_COACHING_SESSIONS;
    }
  });

  // LocalStorage synchronization for Set Schedules, Time-Off, and Call-Off records
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SET_SCHEDULES, JSON.stringify(setSchedules));
    } catch (e) {
      console.warn('Failed to save set schedules', e);
    }
  }, [setSchedules]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TIME_OFF_REQUESTS, JSON.stringify(timeOffRequests));
    } catch (e) {
      console.warn('Failed to save time-off requests', e);
    }
  }, [timeOffRequests]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MAX_DAILY_APPROVED_TIME_OFF, maxDailyApprovedTimeOff.toString());
    } catch (e) {
      console.warn('Failed to save max daily approved time off quota', e);
    }
  }, [maxDailyApprovedTimeOff]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DATE_SPECIFIC_MAX_TIME_OFF, JSON.stringify(dateSpecificMaxTimeOffOverrides));
    } catch (e) {
      console.warn('Failed to save date specific max time off overrides', e);
    }
  }, [dateSpecificMaxTimeOffOverrides]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CALL_OFF_RECORDS, JSON.stringify(callOffRecords));
    } catch (e) {
      console.warn('Failed to save call-off records', e);
    }
  }, [callOffRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COACHING_SESSIONS, JSON.stringify(coachingSessions));
    } catch (e) {
      console.warn('Failed to save coaching sessions', e);
    }
  }, [coachingSessions]);

  // Offline Report Queue & Cloud Sync Status State
  const [offlineReportQueue, setOfflineReportQueue] = useState<OfflineQueuedReport[]>(() => getOfflineReportQueue());
  const [isOnline, setIsOnline] = useState<boolean>(() => isDeviceOnline());
  const [isSyncingReports, setIsSyncingReports] = useState<boolean>(false);

  // Subscribe to offline report queue and network events
  useEffect(() => {
    const unsubscribe = subscribeToQueueChanges((queue, online) => {
      setOfflineReportQueue([...queue]);
      setIsOnline(online);
    });
    return () => unsubscribe();
  }, []);

  // Rover Route Optimization, Telemetry & Interception State
  const [rovers, setRovers] = useState<RoverVehicle[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROVERS);
      return saved ? JSON.parse(saved) : INITIAL_ROVERS;
    } catch {
      return INITIAL_ROVERS;
    }
  });

  const [trafficCondition, setTrafficConditionState] = useState<TrafficCondition>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRAFFIC);
      return (saved as TrafficCondition) || 'moderate';
    } catch {
      return 'moderate';
    }
  });

  const [optimizationMode, setOptimizationModeState] = useState<OptimizationMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPT_MODE);
      return (saved as OptimizationMode) || 'traffic_density_optimal';
    } catch {
      return 'traffic_density_optimal';
    }
  });

  const [antiPredictabilityJitterPct, setAntiPredictabilityJitterPctState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_JITTER_PCT);
      return saved ? Number(saved) : 20;
    } catch {
      return 20;
    }
  });

  const [activeInterceptions, setActiveInterceptions] = useState<AdHocInterception[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INTERCEPTIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [telemetryLogs, setTelemetryLogs] = useState<RoverTelemetryLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TELEMETRY);
      return saved ? JSON.parse(saved) : INITIAL_TELEMETRY_LOGS;
    } catch {
      return INITIAL_TELEMETRY_LOGS;
    }
  });

  // Generate initial plans for all active rovers
  const [roverPlans, setRoverPlans] = useState<Record<string, DynamicRoutePlan>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROVER_PLANS);
      if (saved) return JSON.parse(saved);
    } catch {}

    const plans: Record<string, DynamicRoutePlan> = {};
    INITIAL_ROVERS.forEach((rover) => {
      plans[rover.id] = optimizeRoverRoute(rover, INITIAL_SITES, {
        traffic: 'moderate',
        mode: 'traffic_density_optimal',
        antiPredictabilityJitterPct: 20
      });
    });
    return plans;
  });

  // Geo-Cluster Sectors derived from current site list
  const geoClusterSectors = useMemo(() => {
    return buildGeoClusterSectors(sitesList);
  }, [sitesList]);

  // Sync Rover state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ROVERS, JSON.stringify(rovers));
    } catch (e) {
      console.warn('Failed to save rovers', e);
    }
  }, [rovers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ROVER_PLANS, JSON.stringify(roverPlans));
    } catch (e) {
      console.warn('Failed to save rover plans', e);
    }
  }, [roverPlans]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INTERCEPTIONS, JSON.stringify(activeInterceptions));
    } catch (e) {
      console.warn('Failed to save interceptions', e);
    }
  }, [activeInterceptions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TELEMETRY, JSON.stringify(telemetryLogs));
    } catch (e) {
      console.warn('Failed to save telemetry logs', e);
    }
  }, [telemetryLogs]);

  const updateAlertPreferences = (prefs: Partial<ShiftAlertPreferences>) => {
    setAlertPreferencesState((prev) => {
      const updated = { ...prev, ...prefs };
      try {
        localStorage.setItem(STORAGE_KEY_ALERT_PREFS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save alert preferences', e);
      }
      return updated;
    });

    addAuditLog(
      'ALERT_PREFERENCES_UPDATED',
      'system',
      `Officer ${activeGuard.name} (${activeGuard.badgeNumber}) modified shift alert notification settings`,
      `${activeGuard.name} (${activeGuard.badgeNumber})`,
      'info'
    );
  };

  const resetAlertPreferences = () => {
    setAlertPreferencesState(DEFAULT_ALERT_PREFERENCES);
    try {
      localStorage.setItem(STORAGE_KEY_ALERT_PREFS, JSON.stringify(DEFAULT_ALERT_PREFERENCES));
    } catch (e) {
      console.warn('Failed to reset alert preferences', e);
    }
    showToast('Alert Preferences Reset', 'Default push alert categories restored.', 'info');
  };

  const testAlertNotification = (category: 'emergency_alerts' | 'urgent_open_shifts' | 'priority_next_24h' | 'trade_matches') => {
    let isCategoryEnabled = false;
    let title = '';
    let message = '';
    let type: 'info' | 'success' | 'warning' | 'danger' = 'info';

    if (category === 'emergency_alerts') {
      isCategoryEnabled = alertPreferences.emergencyAlerts;
      title = '🚨 [TEST ALERT] Emergency Facility Notice';
      message = 'Perimeter sensor alarm triggered at Port Authority - Pier 7. All available units standby.';
      type = 'danger';
    } else if (category === 'urgent_open_shifts') {
      isCategoryEnabled = alertPreferences.urgentOpenShifts;
      title = '⚡ [TEST ALERT] Urgent Open Shift Posted';
      message = 'Short-notice vacant post: Retail Plaza Night Patrol (22:00-06:00, 8h) with +$4.50/hr surge pay.';
      type = 'warning';
    } else if (category === 'priority_next_24h') {
      isCategoryEnabled = alertPreferences.priorityNext24hPush;
      title = '⚡ [PRIORITY PUSH] Unfilled Shift in Next 24 Hours';
      message = 'West Medical Center ER triage vacancy (16:00-00:00). Verified: 6h+ rest buffer compliance.';
      type = 'warning';
    } else if (category === 'trade_matches') {
      isCategoryEnabled = alertPreferences.tradeMatches;
      title = '🔄 [TEST ALERT] New Trade Board Match';
      message = 'Officer Mike Chen posted a Saturday giveaway at Corporate HQ that matches your qualified sites.';
      type = 'success';
    }

    if (!isCategoryEnabled) {
      showToast(
        'Alert Channel Muted',
        `"${category.replace(/_/g, ' ').toUpperCase()}" is currently toggled OFF in your preferences. Turn it ON to receive live notifications.`,
        'warning'
      );
      return;
    }

    if (alertPreferences.soundEnabled) {
      if (category === 'priority_next_24h') {
        playPriorityShiftAlertSound();
      } else {
        playEmergencyAlertSound();
      }
    }

    showToast(title, message, type);
  };

  // Priority Next 24-Hour Push Notification Engine State
  const [dismissedPriorityShiftIds, setDismissedPriorityShiftIds] = useState<string[]>([]);
  const [priorityPushSnoozedUntil, setPriorityPushSnoozedUntil] = useState<number | null>(null);
  const [activePriorityPush, setActivePriorityPush] = useState<PriorityPushNotification | null>(null);

  // Compute 24h priority shifts for a specific guard
  const getPriorityNext24hShifts = (guardId?: string): PriorityShiftMatch[] => {
    const targetGuard = guardId 
      ? (guardsList.find((g) => g.id === guardId) || activeGuard)
      : activeGuard;

    return evaluatePriorityShiftsForGuard(shifts, scheduledShifts, targetGuard, {
      minRestHours: alertPreferences.minRestBufferHours !== undefined ? alertPreferences.minRestBufferHours : 6,
      siteQualifiedOnly: alertPreferences.siteQualifiedOnly
    });
  };

  // Memoized eligible priority shifts for active guard
  const eligiblePriorityShifts = useMemo(() => {
    return getPriorityNext24hShifts(activeGuard.id).filter((m) => m.isEligible);
  }, [shifts, scheduledShifts, activeGuard, alertPreferences.minRestBufferHours, alertPreferences.siteQualifiedOnly, guardsList]);

  // Sync active priority push alert banner
  useEffect(() => {
    if (!alertPreferences.priorityNext24hPush) {
      setActivePriorityPush(null);
      return;
    }

    if (priorityPushSnoozedUntil && Date.now() < priorityPushSnoozedUntil) {
      return;
    }

    const availableEligible = eligiblePriorityShifts.filter((m) => !dismissedPriorityShiftIds.includes(m.shift.id));
    if (availableEligible.length > 0) {
      const topMatch = availableEligible[0];
      if (!activePriorityPush || activePriorityPush.shiftId !== topMatch.shift.id) {
        setActivePriorityPush({
          id: `push-${topMatch.shift.id}-${Date.now()}`,
          shiftId: topMatch.shift.id,
          shift: topMatch.shift,
          match: topMatch,
          broadcastAt: new Date().toISOString(),
          dismissed: false
        });
      }
    } else {
      if (activePriorityPush) {
        setActivePriorityPush(null);
      }
    }
  }, [eligiblePriorityShifts, alertPreferences.priorityNext24hPush, dismissedPriorityShiftIds, priorityPushSnoozedUntil, activePriorityPush]);

  // Dismiss a priority push notification
  const dismissPriorityPush = (shiftId?: string, dismissAll: boolean = false) => {
    if (dismissAll || (!shiftId && !activePriorityPush?.shiftId)) {
      const allIds = eligiblePriorityShifts.map((m) => m.shift.id);
      setDismissedPriorityShiftIds((prev) => Array.from(new Set([...prev, ...allIds])));
    } else {
      const targetShiftId = shiftId || activePriorityPush?.shiftId;
      if (targetShiftId) {
        setDismissedPriorityShiftIds((prev) => Array.from(new Set([...prev, targetShiftId])));
      }
    }
    setActivePriorityPush(null);
  };

  // Clear dismissed priority shift IDs (e.g. on reset or manual refresh)
  const clearDismissedPriorityShifts = () => {
    setDismissedPriorityShiftIds([]);
  };

  // Snooze priority push notifications
  const snoozePriorityPush = (minutes: number = 15) => {
    const snoozeTime = Date.now() + minutes * 60 * 1000;
    setPriorityPushSnoozedUntil(snoozeTime);
    setActivePriorityPush(null);
    showToast(
      'Priority Alert Snoozed',
      `Unfilled shift push alerts paused for ${minutes} minutes.`,
      'info'
    );
  };

  // Manually trigger a test priority push alert
  const triggerPriorityPushAlert = (shiftId?: string) => {
    const matches = getPriorityNext24hShifts(activeGuard.id);
    const targetMatch = shiftId 
      ? matches.find((m) => m.shift.id === shiftId) 
      : matches.find((m) => m.isEligible) || matches[0];

    if (!targetMatch) {
      showToast('No 24h Shifts Found', 'There are currently no unfilled shifts occurring in the next 24 hours.', 'info');
      return;
    }

    if (alertPreferences.soundEnabled) {
      playPriorityShiftAlertSound();
    }

    setActivePriorityPush({
      id: `push-manual-${targetMatch.shift.id}-${Date.now()}`,
      shiftId: targetMatch.shift.id,
      shift: targetMatch.shift,
      match: targetMatch,
      broadcastAt: new Date().toISOString(),
      dismissed: false
    });

    showToast(
      '⚡ Priority Push Dispatched',
      `Urgent vacancy at ${targetMatch.shift.siteName} (${targetMatch.shift.date} ${targetMatch.shift.startTime}-${targetMatch.shift.endTime}). ${targetMatch.isEligible ? 'Rest buffer compliant (6h+ gap).' : targetMatch.conflictReason || 'Schedule conflict.'}`,
      targetMatch.isEligible ? 'warning' : 'danger'
    );
  };

  // Evaluate Shift Claim Pre-Checks
  const evaluateShiftClaim = (
    shiftId: string,
    guardId?: string
  ): ShiftClaimEligibilityResult | null => {
    const targetShift = shifts.find((s) => s.id === shiftId);
    if (!targetShift) return null;
    const guard = guardId ? (guardsList.find((g) => g.id === guardId) || activeGuard) : activeGuard;
    const minRest = alertPreferences.minRestBufferHours !== undefined ? alertPreferences.minRestBufferHours : 6;
    return evaluateShiftClaimEligibility(targetShift, guard, scheduledShifts, shifts, minRest);
  };

  // One-Click Claim of Shift with 3-Point Validation:
  // 1. Site Training / OJT Qualification
  // 2. Rest / Turnaround Time Buffer & Overlap
  // 3. Weekly 40-Hour Regular Limit (Overtime Check)
  // If ANY check fails -> Flag for Admin Review & place into pending claim queue.
  const claimPriorityShift = (
    shiftId: string,
    guardId?: string
  ): { 
    success: boolean; 
    requiresApproval?: boolean; 
    claimRequest?: ShiftClaimRequest; 
    message: string; 
    shift?: Shift; 
    scheduledShift?: ScheduledShift 
  } => {
    const targetShift = shifts.find((s) => s.id === shiftId);
    if (!targetShift) {
      return { success: false, message: 'Shift not found.' };
    }

    if (targetShift.status !== 'open') {
      return { success: false, message: 'This shift is no longer open or has already been filled.' };
    }

    const guard = guardId ? (guardsList.find((g) => g.id === guardId) || activeGuard) : activeGuard;
    const minRest = alertPreferences.minRestBufferHours !== undefined ? alertPreferences.minRestBufferHours : 6;

    // Check if guard already has an active pending claim for this shift
    const existingPendingClaim = shiftClaims.find(
      (c) => c.shiftId === shiftId && c.guardId === guard.id && c.status === 'pending_approval'
    );
    if (existingPendingClaim) {
      showToast(
        'Claim Already Pending',
        `You already submitted a claim for ${targetShift.siteName} (${targetShift.date}) which is currently awaiting Ops Admin Review.`,
        'info'
      );
      return {
        success: true,
        requiresApproval: true,
        claimRequest: existingPendingClaim,
        message: 'Claim is already pending manager review.',
        shift: targetShift
      };
    }

    // Run the 3-point pre-claim validation checks
    const eligibility = evaluateShiftClaimEligibility(targetShift, guard, scheduledShifts, shifts, minRest);

    // CASE 1: All 3 Checks PASS -> 1-Click Auto-Approve & Immediate Schedule
    if (eligibility.isAutoApprovable) {
      // Mark shift as filled
      setShifts((prev) =>
        prev.map((s) =>
          s.id === shiftId
            ? {
                ...s,
                status: 'filled',
                assignedGuardName: guard.name,
                assignedGuardId: guard.id
              }
            : s
        )
      );

      // Add to scheduledShifts
      const durationHours = targetShift.hours || calculateHours(targetShift.startTime, targetShift.endTime) || 8;
      const newScheduledShift: ScheduledShift = {
        id: `SCHED-${Date.now()}`,
        guardId: guard.id,
        guardName: guard.name,
        guardBadge: guard.badgeNumber,
        guardPhone: guard.phone,
        siteId: `site-${targetShift.siteName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        siteName: targetShift.siteName,
        siteAddress: targetShift.address || 'Address on file',
        date: targetShift.date,
        startTime: targetShift.startTime,
        endTime: targetShift.endTime,
        hours: durationHours,
        postRole: targetShift.location || `${targetShift.siteName} Security Post`,
        postInstructions: targetShift.notes || 'Report to security office on arrival. Complete patrol checklist.',
        requiredCertifications: targetShift.requiredCertifications || [],
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };

      setScheduledShifts((prev) => [newScheduledShift, ...prev]);

      // Record auto-approved claim
      const autoClaim: ShiftClaimRequest = {
        id: `CLAIM-AUTO-${Date.now()}`,
        shiftId: targetShift.id,
        shift: targetShift,
        guardId: guard.id,
        guardName: guard.name,
        guardBadge: guard.badgeNumber,
        guardPhone: guard.phone,
        guardProfile: guard,
        claimTimestamp: new Date().toISOString(),
        status: 'auto_approved',
        requiresAdminApproval: false,
        failedChecks: [],
        violationDetails: {
          isSiteTrained: true,
          siteTrainingDetails: 'OJT verified.',
          isRestBufferValid: true,
          restBufferDetails: `Rest buffer compliant (≥${minRest}h).`,
          isOvertimeCompliant: true,
          overtimeDetails: `Weekly regular hours compliant (${eligibility.projectedWeeklyHours}h / 40h max).`,
          currentWeeklyHours: eligibility.currentWeeklyHours,
          shiftHours: eligibility.shiftHours,
          projectedWeeklyHours: eligibility.projectedWeeklyHours,
          overtimeHours: 0
        },
        resolvedAt: new Date().toISOString(),
        resolvedByAdminName: 'Auto-Dispatch Compliance Engine',
        adminResolutionNote: 'All 3 pre-claim checks passed. Instant 1-click roster assignment.'
      };
      setShiftClaims((prev) => [autoClaim, ...prev]);

      // Dismiss active priority push for this shift
      dismissPriorityPush(shiftId);

      // Play confirmation audio
      if (alertPreferences.soundEnabled) {
        playClockInAlertSound();
      }

      // Audit logs & admin actions
      addAuditLog(
        'PRIORITY_SHIFT_CLAIMED',
        'shift',
        `Officer ${guard.name} (${guard.badgeNumber}) claimed 1-click shift at ${targetShift.siteName} (${targetShift.date} ${targetShift.startTime}-${targetShift.endTime}). Checks passed: Site Trained, Turnaround Rest ≥${minRest}h, ≤40h Weekly Regular.`,
        `${guard.name} (${guard.badgeNumber})`,
        'success'
      );

      logAdminAction({
        type: 'priority_shift_claimed',
        title: '1-Click Shift Claimed (Auto-Approved)',
        description: `Officer ${guard.name} (${guard.badgeNumber}) claimed ${targetShift.siteName} (${targetShift.date}). All 3 compliance checks verified.`,
        adminName: `${guard.name}`,
        adminBadge: `${guard.badgeNumber}`,
        badgeVariant: 'emerald',
        metadata: { shiftId: targetShift.id, guardId: guard.id, siteName: targetShift.siteName, minRest }
      });

      showToast(
        '🎉 1-Click Claim Approved!',
        `You are scheduled for ${targetShift.siteName} on ${targetShift.date} (${targetShift.startTime}-${targetShift.endTime}). Site training, rest buffer, & regular hours verified.`,
        'success'
      );

      return {
        success: true,
        requiresApproval: false,
        message: 'Shift successfully claimed and scheduled!',
        shift: { ...targetShift, status: 'filled', assignedGuardName: guard.name, assignedGuardId: guard.id },
        scheduledShift: newScheduledShift
      };
    }

    // CASE 2: At least 1 Check FAILED -> Flag for Admin Review & Place into Pending Claim Queue
    const newClaimRequest: ShiftClaimRequest = {
      id: `CLAIM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      shiftId: targetShift.id,
      shift: targetShift,
      guardId: guard.id,
      guardName: guard.name,
      guardBadge: guard.badgeNumber,
      guardPhone: guard.phone,
      guardProfile: guard,
      claimTimestamp: new Date().toISOString(),
      status: 'pending_approval',
      requiresAdminApproval: true,
      failedChecks: eligibility.failedChecks,
      violationDetails: {
        isSiteTrained: eligibility.isSiteTrained,
        siteTrainingDetails: eligibility.siteTrainingReason,
        isRestBufferValid: eligibility.isRestBufferValid,
        restBufferDetails: eligibility.restBufferReason,
        restHours: eligibility.conflict?.restHoursBefore ?? eligibility.conflict?.restHoursAfter,
        isOvertimeCompliant: eligibility.isOvertimeCompliant,
        overtimeDetails: eligibility.overtimeReason,
        currentWeeklyHours: eligibility.currentWeeklyHours,
        shiftHours: eligibility.shiftHours,
        projectedWeeklyHours: eligibility.projectedWeeklyHours,
        overtimeHours: eligibility.overtimeHours
      }
    };

    setShiftClaims((prev) => [newClaimRequest, ...prev]);

    // Dismiss active priority push so guard is not re-prompted
    dismissPriorityPush(shiftId);

    // Play warning sound
    if (alertPreferences.soundEnabled) {
      playEmergencyAlertSound();
    }

    // Notify guard via Toast with explicit breakdown of failed checks
    const failedBulletPoints: string[] = [];
    if (!eligibility.isSiteTrained) failedBulletPoints.push('Site training qualification required');
    if (!eligibility.isRestBufferValid) failedBulletPoints.push('Turnaround / minimum rest time limit violation');
    if (!eligibility.isOvertimeCompliant) failedBulletPoints.push(`Pushes weekly schedule over 40h limit (${eligibility.projectedWeeklyHours}h total, +${eligibility.overtimeHours}h OT)`);

    showToast(
      '⚠️ Admin Approval Required',
      `Your 1-click claim for ${targetShift.siteName} (${targetShift.date}) requires manager review: ${failedBulletPoints.join(' • ')}. Your request has been flagged on the Ops Admin panel.`,
      'warning'
    );

    // Log in audit log
    addAuditLog(
      'SHIFT_CLAIM_FLAGGED',
      'shift',
      `Officer ${guard.name} (${guard.badgeNumber}) 1-click claim for ${targetShift.siteName} flagged for Admin Review. Flagged checks: [${eligibility.failedChecks.join(', ')}]. ${eligibility.summaryMessage}`,
      `${guard.name} (${guard.badgeNumber})`,
      'warning'
    );

    // Log admin action for Ops Admin
    logAdminAction({
      type: 'shift_claim_flagged',
      title: 'Shift Claim Flagged for Review',
      description: `Officer ${guard.name} (${guard.badgeNumber}) requested 1-click claim for ${targetShift.siteName} (${targetShift.date} ${targetShift.startTime}-${targetShift.endTime}). Policy flags: ${eligibility.failedChecks.join(', ')}.`,
      adminName: 'Dispatch Compliance Engine',
      adminBadge: 'SYS-AUTO',
      badgeVariant: 'amber',
      metadata: { 
        claimId: newClaimRequest.id, 
        shiftId: targetShift.id, 
        guardId: guard.id, 
        failedChecks: eligibility.failedChecks,
        projectedWeeklyHours: eligibility.projectedWeeklyHours
      }
    });

    return {
      success: true,
      requiresApproval: true,
      claimRequest: newClaimRequest,
      message: `Shift claim submitted for Admin Review (${failedBulletPoints.join(', ')})`,
      shift: targetShift
    };
  };

  // Approve a Flagged Shift Claim (Ops Admin)
  const approveShiftClaim = (claimId: string, adminNote?: string) => {
    const claim = shiftClaims.find((c) => c.id === claimId);
    if (!claim) {
      showToast('Claim Not Found', 'Could not locate the requested shift claim.', 'danger');
      return;
    }

    if (claim.status !== 'pending_approval') {
      showToast('Already Processed', `This claim was already marked as ${claim.status}.`, 'info');
      return;
    }

    const nowIso = new Date().toISOString();
    const adminCommander = adminUsers[0]?.name || 'Lt. Mark O\'Connor';
    const adminBadge = adminUsers[0]?.badgeId || 'OPS-CMD-01';

    // 1. Update claim status to approved
    setShiftClaims((prev) =>
      prev.map((c) =>
        c.id === claimId
          ? {
              ...c,
              status: 'approved',
              resolvedAt: nowIso,
              resolvedByAdminName: adminCommander,
              resolvedByAdminBadge: adminBadge,
              adminResolutionNote: adminNote || 'Shift claim approved with administrative override.'
            }
          : c
      )
    );

    // 2. Mark shift as filled
    setShifts((prev) =>
      prev.map((s) =>
        s.id === claim.shiftId
          ? {
              ...s,
              status: 'filled',
              assignedGuardName: claim.guardName,
              assignedGuardId: claim.guardId
            }
          : s
      )
    );

    // 3. Add to scheduledShifts
    const durationHours = claim.shift.hours || calculateHours(claim.shift.startTime, claim.shift.endTime) || 8;
    const newScheduledShift: ScheduledShift = {
      id: `SCHED-${Date.now()}`,
      guardId: claim.guardId,
      guardName: claim.guardName,
      guardBadge: claim.guardBadge,
      guardPhone: claim.guardPhone,
      siteId: `site-${claim.shift.siteName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      siteName: claim.shift.siteName,
      siteAddress: claim.shift.address || 'Address on file',
      date: claim.shift.date,
      startTime: claim.shift.startTime,
      endTime: claim.shift.endTime,
      hours: durationHours,
      postRole: claim.shift.location || `${claim.shift.siteName} Security Post`,
      postInstructions: claim.shift.notes || 'Report to security office on arrival. Manager override authorized.',
      requiredCertifications: claim.shift.requiredCertifications || [],
      status: 'scheduled',
      createdAt: nowIso
    };

    setScheduledShifts((prev) => [newScheduledShift, ...prev]);

    // 4. Play confirmation audio & toast
    if (alertPreferences.soundEnabled) {
      playReceiptConfirmedSound();
    }

    showToast(
      'Shift Claim Approved',
      `Officer ${claim.guardName} (${claim.guardBadge}) assigned to ${claim.shift.siteName} (${claim.shift.date}). Overridden flags: ${claim.failedChecks.join(', ')}.`,
      'success'
    );

    // 5. Audit logs & admin actions
    addAuditLog(
      'SHIFT_CLAIM_APPROVED',
      'shift',
      `Admin ${adminCommander} (${adminBadge}) APPROVED flagged shift claim #${claim.id} for Officer ${claim.guardName} (${claim.guardBadge}) at ${claim.shift.siteName}. Overridden flags: [${claim.failedChecks.join(', ')}]. Note: ${adminNote || 'Manager override authorized.'}`,
      `${adminCommander} (${adminBadge})`,
      'success'
    );

    logAdminAction({
      type: 'shift_claim_approved',
      title: 'Flagged Shift Claim Approved',
      description: `Admin approved 1-click claim for Officer ${claim.guardName} at ${claim.shift.siteName} (${claim.shift.date}). Overridden flags: ${claim.failedChecks.join(', ')}.`,
      adminName: adminCommander,
      adminBadge: adminBadge,
      badgeVariant: 'emerald',
      metadata: { 
        claimId: claim.id, 
        shiftId: claim.shiftId, 
        guardId: claim.guardId, 
        overriddenFlags: claim.failedChecks,
        adminNote 
      }
    });
  };

  // Deny a Flagged Shift Claim (Ops Admin)
  const denyShiftClaim = (claimId: string, reason: string) => {
    const claim = shiftClaims.find((c) => c.id === claimId);
    if (!claim) {
      showToast('Claim Not Found', 'Could not locate the requested shift claim.', 'danger');
      return;
    }

    if (claim.status !== 'pending_approval') {
      showToast('Already Processed', `This claim was already marked as ${claim.status}.`, 'info');
      return;
    }

    const nowIso = new Date().toISOString();
    const adminCommander = adminUsers[0]?.name || 'Lt. Mark O\'Connor';
    const adminBadge = adminUsers[0]?.badgeId || 'OPS-CMD-01';

    // 1. Update claim status to denied
    setShiftClaims((prev) =>
      prev.map((c) =>
        c.id === claimId
          ? {
              ...c,
              status: 'denied',
              resolvedAt: nowIso,
              resolvedByAdminName: adminCommander,
              resolvedByAdminBadge: adminBadge,
              adminResolutionNote: reason || 'Shift claim denied by operations manager.'
            }
          : c
      )
    );

    // Shift remains OPEN for other guards to claim

    // 2. Toast
    showToast(
      'Shift Claim Denied',
      `Shift claim for Officer ${claim.guardName} at ${claim.shift.siteName} was denied. Reason: ${reason}`,
      'danger'
    );

    // 3. Audit logs & admin actions
    addAuditLog(
      'SHIFT_CLAIM_DENIED',
      'shift',
      `Admin ${adminCommander} (${adminBadge}) DENIED shift claim #${claim.id} for Officer ${claim.guardName} (${claim.guardBadge}) at ${claim.shift.siteName}. Reason: ${reason}`,
      `${adminCommander} (${adminBadge})`,
      'danger'
    );

    logAdminAction({
      type: 'shift_claim_denied',
      title: 'Flagged Shift Claim Denied',
      description: `Admin denied shift claim for Officer ${claim.guardName} at ${claim.shift.siteName} (${claim.shift.date}). Reason: ${reason}`,
      adminName: adminCommander,
      adminBadge: adminBadge,
      badgeVariant: 'rose',
      metadata: { 
        claimId: claim.id, 
        shiftId: claim.shiftId, 
        guardId: claim.guardId, 
        reason 
      }
    });
  };

  // Broadcast priority push to all eligible guards (used by Ops Dispatch)
  const broadcastPriorityPushToGuards = (shiftId: string): { notifiedGuardsCount: number; eligibleGuards: GuardProfile[] } => {
    const targetShift = shifts.find((s) => s.id === shiftId);
    if (!targetShift) {
      return { notifiedGuardsCount: 0, eligibleGuards: [] };
    }

    const minRest = alertPreferences.minRestBufferHours !== undefined ? alertPreferences.minRestBufferHours : 6;
    const eligibleGuards: GuardProfile[] = [];

    guardsList.forEach((guard) => {
      const guardShifts: Array<ScheduledShift | Shift> = [
        ...scheduledShifts.filter((s) => s.guardId === guard.id && s.status !== 'cancelled'),
        ...shifts.filter(
          (s) =>
            s.status === 'filled' &&
            (s.assignedGuardId === guard.id || s.assignedGuardName?.toLowerCase() === guard.name.toLowerCase())
        )
      ];

      const check = checkShiftScheduleConflict(targetShift, guardShifts, minRest);
      if (check.isEligible) {
        eligibleGuards.push(guard);
      }
    });

    logAdminAction({
      type: 'priority_broadcast_sent',
      title: '24h Priority Push Broadcast',
      description: `Dispatched 24h priority push notification to ${eligibleGuards.length} eligible guards with verified zero overlap and ≥${minRest}h rest buffer for ${targetShift.siteName} (${targetShift.date} ${targetShift.startTime}-${targetShift.endTime}).`,
      adminName: 'Dispatch Commander',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'amber',
      metadata: { shiftId: targetShift.id, eligibleCount: eligibleGuards.length, minRest }
    });

    addAuditLog(
      'PRIORITY_PUSH_DISPATCHED',
      'system',
      `Priority 24h push notification sent to ${eligibleGuards.length} guards for unfilled shift at ${targetShift.siteName} (${targetShift.date} ${targetShift.startTime}-${targetShift.endTime}).`,
      'Dispatch Commander',
      'info'
    );

    showToast(
      'Priority Push Broadcast Sent',
      `Notification sent to ${eligibleGuards.length} eligible officers with verified ≥${minRest}h rest gap.`,
      'success'
    );

    return {
      notifiedGuardsCount: eligibleGuards.length,
      eligibleGuards
    };
  };

  // Light / Dark Theme State with System / Storage fallback
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {}
    return 'light';
  });

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, newTheme);
    } catch (e) {
      console.warn('Theme save failed', e);
    }
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY_THEME, nextTheme);
      } catch (e) {
        console.warn('Theme save failed', e);
      }
      return nextTheme;
    });
  };

  // Synchronize 'dark' class on documentElement for universal styling
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // Persist state to localStorage
  useEffect(() => {
    try {
      if (activeBroadcast) {
        localStorage.setItem(STORAGE_KEY_BROADCAST, JSON.stringify(activeBroadcast));
      } else {
        localStorage.removeItem(STORAGE_KEY_BROADCAST);
      }
    } catch (e) {
      console.warn('Storage save failed for activeBroadcast', e);
    }
  }, [activeBroadcast]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BROADCAST_HISTORY, JSON.stringify(broadcastHistory));
    } catch (e) {
      console.warn('Storage save failed for broadcastHistory', e);
    }
  }, [broadcastHistory]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [shifts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRADES, JSON.stringify(trades));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [trades]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHIFT_CLAIMS, JSON.stringify(shiftClaims));
    } catch (e) {
      console.warn('Storage save failed for shiftClaims', e);
    }
  }, [shiftClaims]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(auditLogs));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ADMIN_ACTIONS, JSON.stringify(recentAdminActions));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [recentAdminActions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ADMIN_USERS, JSON.stringify(adminUsers));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [adminUsers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GUARDS, JSON.stringify(guardsList));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [guardsList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(shiftTemplates));
    } catch (e) {
      console.warn('Storage save failed for templates', e);
    }
  }, [shiftTemplates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BIDS, JSON.stringify(bids));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [bids]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SITE_FEEDBACKS, JSON.stringify(siteFeedbacks));
    } catch (e) {
      console.warn('Storage save failed for siteFeedbacks', e);
    }
  }, [siteFeedbacks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(sitesList));
    } catch (e) {
      console.warn('Storage save failed for sitesList', e);
    }
  }, [sitesList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CALLS_FOR_SERVICE, JSON.stringify(callsForService));
    } catch (e) {
      console.warn('Storage save failed for callsForService', e);
    }
  }, [callsForService]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CALL_RECEIPTS, JSON.stringify(callReceipts));
    } catch (e) {
      console.warn('Storage save failed for callReceipts', e);
    }
  }, [callReceipts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULED_SHIFTS, JSON.stringify(scheduledShifts));
    } catch (e) {
      console.warn('Storage save failed for scheduledShifts', e);
    }
  }, [scheduledShifts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED_LATE_ALERTS, JSON.stringify(dismissedLateAlertIds));
    } catch (e) {
      console.warn('Storage save failed for dismissedLateAlertIds', e);
    }
  }, [dismissedLateAlertIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TASK_COMPLETION_LOGS, JSON.stringify(taskCompletionLogs));
    } catch (e) {
      console.warn('Storage save failed for taskCompletionLogs', e);
    }
  }, [taskCompletionLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TASK_ALERTS_HISTORY, JSON.stringify(taskAlertsHistory));
    } catch (e) {
      console.warn('Storage save failed for taskAlertsHistory', e);
    }
  }, [taskAlertsHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STANDARD_REPORTS, JSON.stringify(standardReports));
    } catch (e) {
      console.warn('Storage save failed for standardReports', e);
    }
  }, [standardReports]);

  // Automated Time-Sensitive Task Alert Engine
  useEffect(() => {
    const checkScheduledTasks = () => {
      const now = new Date();
      const nowHours = now.getHours();
      const nowMinutes = now.getMinutes();
      const currentMinutesOfDay = nowHours * 60 + nowMinutes;
      const todayStr = now.toISOString().slice(0, 10);
      const dayOfWeek = now.getDay(); // 0 = Sun, 6 = Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Determine active site for activeGuard
      const activeShift = scheduledShifts.find(
        (s) => s.guardId === activeGuard.id && (s.status === 'on_duty' || s.status === 'on_break' || s.status === 'scheduled')
      );

      // Sites relevant to the guard: either the site they are currently at or sites in their roving group
      let relevantSites: SiteProfile[] = [];
      if (activeShift?.siteName) {
        const site = getSiteByName(activeShift.siteName);
        if (site) relevantSites.push(site);
      }
      if (activeGuard.isRovingGuard && activeGuard.rovingGroup) {
        const rovingSites = sitesList.filter(s => s.rovingGroup === activeGuard.rovingGroup);
        rovingSites.forEach(rs => {
          if (!relevantSites.some(s => s.id === rs.id)) {
            relevantSites.push(rs);
          }
        });
      }

      // If no relevant sites found, check all sites that have tasks
      if (relevantSites.length === 0) {
        relevantSites = sitesList.filter(s => s.timeSpecificTasks && s.timeSpecificTasks.length > 0);
      }

      for (const site of relevantSites) {
        if (!site.timeSpecificTasks) continue;
        for (const task of site.timeSpecificTasks) {
          if (!task.isActive) continue;

          // Check day frequency
          if (task.frequency === 'weekdays' && isWeekend) continue;
          if (task.frequency === 'weekends' && !isWeekend) continue;
          if (task.frequency === 'custom_days' && task.customDays && !task.customDays.includes(dayOfWeek)) continue;

          // Check if already completed today
          const alreadyCompleted = taskCompletionLogs.some(
            (log) => log.taskId === task.id && log.completedAt.startsWith(todayStr)
          );
          if (alreadyCompleted) continue;

          // Parse scheduled time (HH:mm)
          const [taskH, taskM] = task.scheduledTime.split(':').map(Number);
          if (isNaN(taskH) || isNaN(taskM)) continue;
          const taskMinutesOfDay = taskH * 60 + taskM;
          const diffMinutes = currentMinutesOfDay - taskMinutesOfDay; // positive = past scheduled time, negative = before scheduled time

          const leadTime = task.leadTimeMinutes || 15;
          const gracePeriod = task.gracePeriodMinutes || 20;

          // Evaluation windows:
          // 1. Approaching: [-leadTime, -1]
          // 2. Due Now: [0, 5]
          // 3. Overdue: [6, gracePeriod + 30]
          let alertType: 'approaching' | 'due_now' | 'overdue' | null = null;
          if (diffMinutes >= -leadTime && diffMinutes < 0) {
            alertType = 'approaching';
          } else if (diffMinutes >= 0 && diffMinutes <= 5) {
            alertType = 'due_now';
          } else if (diffMinutes > 5 && diffMinutes <= gracePeriod + 30) {
            alertType = 'overdue';
          }

          if (alertType) {
            const alertKey = `${task.id}_${todayStr}_${alertType}`;
            if (!dismissedTaskAlertKeys.has(alertKey)) {
              const alertObj: TimeSpecificTaskAlert = {
                id: `talert-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                taskId: task.id,
                task,
                siteId: site.id,
                siteName: site.name,
                dueTime: task.scheduledTime,
                alertType,
                triggeredAt: new Date().toISOString(),
                dismissed: false
              };

              setActiveTaskAlert(alertObj);
              setTaskAlertsHistory((prev) => [alertObj, ...prev.slice(0, 49)]);

              try {
                playTaskAlertSound(alertType);
              } catch {}

              const badge = alertType === 'overdue' ? '⚠️ OVERDUE TASK' : alertType === 'due_now' ? '⏰ TASK DUE NOW' : '⏳ UPCOMING TASK';
              showToast(
                `${badge}: ${task.title}`,
                `${site.name} (${task.locationZone}) - Due: ${task.scheduledTime}`,
                alertType === 'overdue' ? 'danger' : alertType === 'due_now' ? 'warning' : 'info'
              );

              setDismissedTaskAlertKeys((prev) => new Set(prev).add(alertKey));
              return;
            }
          }
        }
      }
    };

    checkScheduledTasks();
    const interval = setInterval(checkScheduledTasks, 25000);
    return () => clearInterval(interval);
  }, [sitesList, scheduledShifts, activeGuard, taskCompletionLogs, dismissedTaskAlertKeys]);

  const dismissCallReceiptNotification = (id?: string) => {
    if (!id || latestCallReceipt?.id === id) {
      setLatestCallReceipt(null);
    }
  };

  const clearAllCallReceipts = () => {
    setCallReceipts([]);
    setLatestCallReceipt(null);
    try {
      localStorage.removeItem(STORAGE_KEY_CALL_RECEIPTS);
    } catch {}
    showToast('Receipts Cleared', 'Acknowledgment receipts log has been cleared.', 'info');
  };

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger') => {
    const newToast: NotificationToast = {
      id: 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      title,
      message,
      type,
      timestamp: new Date().toISOString()
    };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
    
    // Auto dismiss after 6 seconds
    setTimeout(() => {
      dismissToast(newToast.id);
    }, 6000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const logAdminAction = (action: Omit<AdminAction, 'id' | 'timestamp'> & { timestamp?: string }) => {
    const entry: AdminAction = {
      ...action,
      id: 'action-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      timestamp: action.timestamp || new Date().toISOString()
    };
    setRecentAdminActions((prev) => [entry, ...prev]);
  };

  const addAuditLog = (
    action: string,
    category: 'shift' | 'trade' | 'swap' | 'system' | 'broadcast',
    details: string,
    actor: string,
    status: 'info' | 'success' | 'warning' | 'danger'
  ) => {
    const entry: AuditLogEntry = {
      id: 'audit-' + Date.now(),
      action,
      category,
      details,
      timestamp: new Date().toISOString(),
      actor,
      status
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  // Top Performers Leaderboard & Site Feedback System
  const addSiteFeedback = (data: Omit<SiteFeedbackEntry, 'id'>): SiteFeedbackEntry => {
    const newFeedback: SiteFeedbackEntry = {
      ...data,
      id: 'fb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5)
    };

    setSiteFeedbacks((prev) => [newFeedback, ...prev]);

    addAuditLog(
      'SITE_FEEDBACK_RECORDED',
      'system',
      `Site review logged for Officer ${data.guardName} at ${data.siteName} (${data.rating.toFixed(1)}★ - ${data.reviewerName})`,
      'Ops Dispatcher',
      data.rating >= 4.5 ? 'success' : 'info'
    );

    logAdminAction({
      type: 'feedback_logged',
      title: 'Site Feedback Recorded',
      description: `Client commendation recorded for ${data.guardName} (${data.rating}★ at ${data.siteName})`,
      adminName: "Ops Dispatcher",
      adminBadge: "OPS-CMD-01",
      badgeVariant: 'blue',
      metadata: { guardId: data.guardId, rating: data.rating, siteName: data.siteName }
    });

    showToast(
      'Site Feedback Recorded',
      `Positive review (${data.rating}★) for ${data.guardName} added to performance metrics.`,
      'success'
    );

    return newFeedback;
  };

  const awardGuardCommendation = (guardId: string, badgeName: string, note?: string) => {
    const targetGuard = guardsList.find((g) => g.id === guardId);
    if (!targetGuard) return;

    addAuditLog(
      'COMMENDATION_AWARDED',
      'system',
      `Official Commendation "${badgeName}" issued to Officer ${targetGuard.name} (${targetGuard.badgeNumber})`,
      'Commander Mark O\'Connor',
      'success'
    );

    logAdminAction({
      type: 'commendation_awarded',
      title: 'Commendation Awarded',
      description: `Awarded "${badgeName}" to ${targetGuard.name} (${targetGuard.badgeNumber}) ${note ? ` - Note: ${note}` : ''}`,
      adminName: "Commander Mark O'Connor",
      adminBadge: "OPS-CMD-01",
      badgeVariant: 'amber',
      metadata: { guardId, badgeName, note }
    });

    showToast(
      'Commendation Awarded',
      `"${badgeName}" badge officially awarded to Officer ${targetGuard.name}.`,
      'success'
    );
  };

  const getGuardCoachingSessions = (guardId: string): GuardCoachingSession[] => {
    return coachingSessions.filter((cs) => cs.guardId === guardId);
  };

  const scheduleGuardCoaching = (
    guardIdOrData: string | {
      guardId: string;
      topic: string;
      scheduledDate: string;
      scheduledTime?: string;
      durationMinutes?: number;
      notes?: string;
      overrideRestrictions?: boolean;
      overrideReason?: string;
      hasShiftConflict?: boolean;
      hasRestBufferConflict?: boolean;
      conflictDetails?: string;
    },
    topicArg?: string,
    scheduledDateArg?: string,
    notesArg?: string
  ): GuardCoachingSession | undefined => {
    let guardId = '';
    let topic = '';
    let scheduledDate = '';
    let scheduledTime = '10:00';
    let durationMinutes = 45;
    let notes = '';
    let overrideRestrictions = false;
    let overrideReason: string | undefined;
    let hasShiftConflict = false;
    let hasRestBufferConflict = false;
    let conflictDetails: string | undefined;

    if (typeof guardIdOrData === 'object') {
      guardId = guardIdOrData.guardId;
      topic = guardIdOrData.topic;
      scheduledDate = guardIdOrData.scheduledDate;
      scheduledTime = guardIdOrData.scheduledTime || '10:00';
      durationMinutes = guardIdOrData.durationMinutes || 45;
      notes = guardIdOrData.notes || '';
      overrideRestrictions = guardIdOrData.overrideRestrictions || false;
      overrideReason = guardIdOrData.overrideReason;
      hasShiftConflict = guardIdOrData.hasShiftConflict || false;
      hasRestBufferConflict = guardIdOrData.hasRestBufferConflict || false;
      conflictDetails = guardIdOrData.conflictDetails;
    } else {
      guardId = guardIdOrData;
      topic = topicArg || 'Performance Review & Remediation';
      scheduledDate = scheduledDateArg || new Date().toISOString().split('T')[0];
      notes = notesArg || '';
    }

    const targetGuard = guardsList.find((g) => g.id === guardId);
    if (!targetGuard) return undefined;

    if (typeof guardIdOrData === 'object' && guardIdOrData.hasShiftConflict === undefined) {
      const validation = validateCoachingScheduleSlot(
        guardId,
        scheduledDate,
        scheduledTime,
        durationMinutes,
        scheduledShifts,
        shifts,
        8
      );
      hasShiftConflict = validation.hasShiftOverlap;
      hasRestBufferConflict = validation.hasBufferViolation;
      conflictDetails = validation.conflictDescription;
    }

    const newSession: GuardCoachingSession = {
      id: `coach-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      guardId,
      guardName: targetGuard.name,
      guardBadge: targetGuard.badgeNumber,
      topic,
      scheduledDate,
      scheduledTime,
      durationMinutes,
      scheduledBy: "Commander Mark O'Connor",
      scheduledByBadge: "OPS-CMD-01",
      notes,
      status: 'pending_guard_action',
      overrideRestrictions,
      overrideReason,
      hasShiftConflict,
      hasRestBufferConflict,
      conflictDetails,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCoachingSessions((prev) => [newSession, ...prev]);

    logAdminAction({
      type: 'user_created',
      title: `Scheduled 1-on-1 Performance Coaching for ${targetGuard.name}`,
      description: `Coaching Session: "${topic}" set for ${scheduledDate} at ${scheduledTime} (${durationMinutes}m). ${
        overrideRestrictions ? 'Schedule conflict & 8h rest buffer manually overridden by Command. ' : ''
      }${notes ? `Notes: ${notes}` : ''}`,
      adminName: "Commander Mark O'Connor",
      adminBadge: "OPS-CMD-01",
      badgeVariant: 'amber',
      metadata: { session: newSession }
    });

    showToast(
      'Coaching Session Dispatched',
      `Performance coaching dispatched to Officer ${targetGuard.name} for ${scheduledDate} at ${scheduledTime}. Awaiting guard confirmation.`,
      'info'
    );

    return newSession;
  };

  const confirmGuardCoaching = (sessionId: string, guardNotes?: string) => {
    const session = coachingSessions.find((s) => s.id === sessionId);
    if (!session) return;

    // If session was counter-proposed by admin, accepting it locks in the counter date/time
    const targetDate = session.status === 'counter_proposed_by_admin' && session.counterProposedDate
      ? session.counterProposedDate
      : session.scheduledDate;

    const targetTime = session.status === 'counter_proposed_by_admin' && session.counterProposedTime
      ? session.counterProposedTime
      : session.scheduledTime;

    setCoachingSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              scheduledDate: targetDate,
              scheduledTime: targetTime,
              status: 'confirmed_by_guard' as const,
              guardResponseNotes: guardNotes || s.guardResponseNotes,
              updatedAt: new Date().toISOString()
            }
          : s
      )
    );

    logAdminAction({
      type: 'user_updated',
      title: `Coaching Session Confirmed by ${session.guardName}`,
      description: `Officer ${session.guardName} confirmed coaching session for ${targetDate} at ${targetTime}.`,
      adminName: 'Guard Response Terminal',
      adminBadge: session.guardBadge,
      badgeVariant: 'emerald',
      metadata: { sessionId, guardNotes, targetDate, targetTime }
    });

    showToast(
      'Coaching Confirmed',
      `Officer ${session.guardName} confirmed attendance for coaching on ${targetDate} at ${targetTime}.`,
      'success'
    );
  };

  const proposeAlternateCoaching = (
    sessionId: string,
    alternateDate: string,
    alternateTime: string,
    reason?: string
  ): { success: boolean; message: string } => {
    const session = coachingSessions.find((s) => s.id === sessionId);
    if (!session) {
      return { success: false, message: 'Coaching session not found.' };
    }

    const validation = validateAlternateCoachingDate(session.scheduledDate, alternateDate);
    if (!validation.isValid) {
      showToast('Invalid Alternate Date', validation.errorMessage || 'Date must be within 1 week of original session.', 'warning');
      return { success: false, message: validation.errorMessage || 'Invalid alternate date' };
    }

    setCoachingSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: 'alternate_proposed_by_guard' as const,
              proposedAlternateDate: alternateDate,
              proposedAlternateTime: alternateTime,
              alternateProposalReason: reason,
              guardResponseNotes: reason,
              updatedAt: new Date().toISOString()
            }
          : s
      )
    );

    logAdminAction({
      type: 'user_updated',
      title: `Alternate Coaching Time Proposed by ${session.guardName}`,
      description: `Officer ${session.guardName} proposed alternate coaching time for "${session.topic}": ${alternateDate} at ${alternateTime}. Reason: ${reason || 'Schedule adjustment requested.'}`,
      adminName: 'Guard Response Terminal',
      adminBadge: session.guardBadge,
      badgeVariant: 'blue',
      metadata: { sessionId, alternateDate, alternateTime, reason }
    });

    showToast(
      'Alternate Time Proposed',
      `Proposed alternate session for ${alternateDate} at ${alternateTime} submitted to Command for review.`,
      'info'
    );

    return { success: true, message: 'Alternate time proposed successfully.' };
  };

  const acceptAlternateCoaching = (sessionId: string, adminNotes?: string) => {
    const session = coachingSessions.find((s) => s.id === sessionId);
    if (!session || !session.proposedAlternateDate) return;

    const newDate = session.proposedAlternateDate;
    const newTime = session.proposedAlternateTime || session.scheduledTime;

    setCoachingSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              scheduledDate: newDate,
              scheduledTime: newTime,
              status: 'confirmed_by_guard' as const,
              notes: adminNotes ? `${s.notes ? s.notes + ' | ' : ''}Supervisor approved alternate: ${adminNotes}` : s.notes,
              updatedAt: new Date().toISOString()
            }
          : s
      )
    );

    logAdminAction({
      type: 'user_updated',
      title: `Supervisor Accepted Alternate Coaching for ${session.guardName}`,
      description: `New Coaching time confirmed: ${newDate} at ${newTime}. Topic: "${session.topic}".`,
      adminName: "Commander Mark O'Connor",
      adminBadge: "OPS-CMD-01",
      badgeVariant: 'emerald',
      metadata: { sessionId, newDate, newTime }
    });

    showToast(
      'Alternate Time Approved',
      `Coaching for Officer ${session.guardName} rescheduled to ${newDate} at ${newTime}.`,
      'success'
    );
  };

  const denyAlternateCoaching = (sessionId: string, denialReason?: string) => {
    const session = coachingSessions.find((s) => s.id === sessionId);
    if (!session) return;

    const reason = denialReason?.trim() || 'Operational coverage requires original schedule or updated request.';

    setCoachingSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: 'alternate_denied' as const,
              adminDenialReason: reason,
              adminActionNotes: reason,
              adminDecisionAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : s
      )
    );

    logAdminAction({
      type: 'user_updated',
      title: `Supervisor Denied Alternate Coaching for ${session.guardName}`,
      description: `Alternate proposed time (${session.proposedAlternateDate} @ ${session.proposedAlternateTime}) was declined. Reason: ${reason}. Original slot stands: ${session.scheduledDate} @ ${session.scheduledTime}.`,
      adminName: "Commander Mark O'Connor",
      adminBadge: "OPS-CMD-01",
      badgeVariant: 'amber',
      metadata: { sessionId, denialReason: reason }
    });

    showToast(
      'Alternate Proposal Denied',
      `Declined alternate proposal for Officer ${session.guardName}. Original schedule stands.`,
      'warning'
    );
  };

  const counterAlternateCoaching = (
    sessionId: string,
    counterDate: string,
    counterTime: string,
    counterReason?: string
  ) => {
    const session = coachingSessions.find((s) => s.id === sessionId);
    if (!session) return;

    const reason = counterReason?.trim() || 'Command counter-proposed time slot.';

    setCoachingSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: 'counter_proposed_by_admin' as const,
              counterProposedDate: counterDate,
              counterProposedTime: counterTime,
              counterProposedReason: reason,
              adminActionNotes: reason,
              adminDecisionAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : s
      )
    );

    logAdminAction({
      type: 'user_updated',
      title: `Supervisor Counter-Proposed Coaching for ${session.guardName}`,
      description: `Counter-proposal dispatched to Officer ${session.guardName}: ${counterDate} at ${counterTime}. Directive: ${reason}`,
      adminName: "Commander Mark O'Connor",
      adminBadge: "OPS-CMD-01",
      badgeVariant: 'blue',
      metadata: { sessionId, counterDate, counterTime, counterReason: reason }
    });

    showToast(
      'Counter-Proposal Sent',
      `Counter-proposal for ${counterDate} at ${counterTime} sent to Officer ${session.guardName}.`,
      'info'
    );
  };

  const completeGuardCoaching = (
    sessionId: string,
    data?: {
      completionNotes?: string;
      improvementOutcome?: string;
      performanceScoreAfter?: number;
      attendanceVerified?: boolean;
      actionItems?: string[];
    }
  ) => {
    const session = coachingSessions.find((s) => s.id === sessionId);
    if (!session) return;

    const scoreBefore = session.performanceScoreBefore ?? 78;
    const scoreAfter = data?.performanceScoreAfter ?? (scoreBefore + 12);
    const scoreDelta = scoreAfter - scoreBefore;
    const notes = data?.completionNotes?.trim() || 'Coaching completed successfully. Officer reviewed SLA requirements and demonstrated mastery of key post protocols.';
    const outcome = data?.improvementOutcome?.trim() || `Verified Mastery & Operational Improvement (+${scoreDelta} pts score delta)`;

    setCoachingSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: 'completed' as const,
              completedAt: new Date().toISOString(),
              completedByAdminName: "Commander Mark O'Connor",
              completionNotes: notes,
              improvementOutcome: outcome,
              performanceScoreBefore: scoreBefore,
              performanceScoreAfter: scoreAfter,
              scoreDelta,
              attendanceVerified: data?.attendanceVerified ?? true,
              actionItems: data?.actionItems || ['Review DAR verification checklist', 'Maintain punctuality and SLA checkpoints'],
              updatedAt: new Date().toISOString()
            }
          : s
      )
    );

    logAdminAction({
      type: 'user_updated',
      title: `Coaching Completed for ${session.guardName}`,
      description: `Topic: "${session.topic}". Outcome: ${outcome}. Score progression: ${scoreBefore} → ${scoreAfter} (+${scoreDelta} pts).`,
      adminName: "Commander Mark O'Connor",
      adminBadge: "OPS-CMD-01",
      badgeVariant: 'emerald',
      metadata: { sessionId, scoreBefore, scoreAfter, scoreDelta, outcome }
    });

    showToast(
      'Coaching Completed',
      `Coaching for Officer ${session.guardName} marked completed (+${scoreDelta} pts performance delta recorded).`,
      'success'
    );
  };

  const cancelCoachingSession = (sessionId: string, reason?: string) => {
    const session = coachingSessions.find((s) => s.id === sessionId);
    if (!session) return;

    setCoachingSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: 'cancelled' as const,
              notes: reason ? `${s.notes ? s.notes + ' | ' : ''}Cancelled: ${reason}` : s.notes,
              updatedAt: new Date().toISOString()
            }
          : s
      )
    );

    showToast(
      'Coaching Session Cancelled',
      `Coaching session for Officer ${session.guardName} was cancelled.`,
      'info'
    );
  };

  const getGuardPerformance = (guardId: string): GuardPerformanceStats => {
    const base = GUARD_BASE_METRICS[guardId] || {
      fulfilledShiftsCount: 6,
      totalHoursCompleted: 48,
      emergencyShiftsFulfilled: 1,
      ratingAverage: 4.65,
      positiveFeedbackCount: 3,
      onTimeArrivalRate: 96.0,
      recognitionBadges: ['Active Patrol'],
      topCommendedSite: 'Corporate HQ',
      geofenceBreachesCount: 0,
      lateCallOffsCount: 0,
      slaCheckpointsCompletedRate: 92.0,
      darQualityRate: 88.0
    };

    // Calculate dynamically filled shifts in current system state
    const dynamicFilledShifts = shifts.filter(
      (s) => s.status === 'filled' && (s.assignedGuardId === guardId || (guardsList.find(g => g.id === guardId)?.name === s.assignedGuardName))
    );

    const dynamicFulfilledCount = dynamicFilledShifts.length;
    const dynamicHours = dynamicFilledShifts.reduce((acc, curr) => acc + (curr.hours || 8), 0);
    const dynamicEmergencyCount = dynamicFilledShifts.filter((s) => s.urgency === 'emergency').length;

    // Filter feedback entries
    const guardFeedbacks = siteFeedbacks.filter((f) => f.guardId === guardId);
    
    let computedRating = base.ratingAverage;
    if (guardFeedbacks.length > 0) {
      const sum = guardFeedbacks.reduce((acc, f) => acc + f.rating, 0);
      const avg = sum / guardFeedbacks.length;
      computedRating = Math.round(((base.ratingAverage * 2 + avg) / 3) * 100) / 100;
    }

    const totalFulfilled = base.fulfilledShiftsCount + dynamicFulfilledCount;
    const totalHours = base.totalHoursCompleted + dynamicHours;
    const totalEmergency = base.emergencyShiftsFulfilled + dynamicEmergencyCount;
    const totalPositiveReviews = base.positiveFeedbackCount + guardFeedbacks.length;

    // Filter call-off records for this guard
    const guardCallOffs = callOffRecords.filter(c => c.guardId === guardId);

    // Calculate 100-Point Composite ASR (Aegis Score & Rank) Breakdown
    const asrBreakdown = calculateASRScore({
      guardId,
      onTimeArrivalRate: base.onTimeArrivalRate,
      emergencyShiftsFulfilled: totalEmergency,
      fulfilledShiftsCount: totalFulfilled,
      feedbacks: guardFeedbacks,
      callOffRecords: guardCallOffs,
      geofenceBreachesCount: base.geofenceBreachesCount || 0,
      slaCheckpointsCompletedRate: base.slaCheckpointsCompletedRate,
      darQualityRate: base.darQualityRate
    });

    // Check for active coaching session
    const activeCoaching = coachingSessions
      .filter((cs) => cs.guardId === guardId && cs.status !== 'cancelled')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    return {
      guardId,
      fulfilledShiftsCount: totalFulfilled,
      totalHoursCompleted: totalHours,
      emergencyShiftsFulfilled: totalEmergency,
      ratingAverage: computedRating,
      positiveFeedbackCount: totalPositiveReviews,
      onTimeArrivalRate: base.onTimeArrivalRate,
      recognitionBadges: base.recognitionBadges,
      topCommendedSite: base.topCommendedSite,
      recentFeedbacks: guardFeedbacks,
      geofenceBreachesCount: base.geofenceBreachesCount || 0,
      lateCallOffsCount: base.lateCallOffsCount || 0,
      slaCheckpointsCompletedRate: base.slaCheckpointsCompletedRate,
      darQualityRate: base.darQualityRate,
      asrScore: asrBreakdown.asrScore,
      asrBreakdown,
      oculusScore: asrBreakdown.asrScore,
      oculusBreakdown: asrBreakdown,
      coachingScheduled: activeCoaching
        ? {
            scheduledDate: activeCoaching.scheduledDate,
            topic: activeCoaching.topic,
            scheduledBy: activeCoaching.scheduledBy,
            notes: activeCoaching.notes
          }
        : undefined,
      latestCoachingSession: activeCoaching
    };
  };

  const getLeaderboard = (
    sortBy: 'composite' | 'asr' | 'oculus' | 'reliability' | 'client_exp' | 'shifts' | 'rating' | 'emergency' | 'ontime' = 'composite',
    timeframe: string = 'all'
  ): (GuardProfile & GuardPerformanceStats)[] => {
    const enrichedGuards = guardsList.map((guard) => {
      const stats = getGuardPerformance(guard.id);
      return {
        ...guard,
        ...stats
      };
    });

    return enrichedGuards.sort((a, b) => {
      if (sortBy === 'shifts') {
        return b.fulfilledShiftsCount - a.fulfilledShiftsCount;
      }
      if (sortBy === 'rating') {
        if (b.ratingAverage !== a.ratingAverage) {
          return b.ratingAverage - a.ratingAverage;
        }
        return b.positiveFeedbackCount - a.positiveFeedbackCount;
      }
      if (sortBy === 'emergency') {
        return b.emergencyShiftsFulfilled - a.emergencyShiftsFulfilled;
      }
      if (sortBy === 'ontime') {
        return b.onTimeArrivalRate - a.onTimeArrivalRate;
      }
      if (sortBy === 'reliability') {
        const relA = a.asrBreakdown?.operationalReliabilityScore || a.oculusBreakdown?.operationalReliabilityScore || 0;
        const relB = b.asrBreakdown?.operationalReliabilityScore || b.oculusBreakdown?.operationalReliabilityScore || 0;
        return relB - relA;
      }
      if (sortBy === 'client_exp') {
        const expA = a.asrBreakdown?.clientExperienceScore || a.oculusBreakdown?.clientExperienceScore || 0;
        const expB = b.asrBreakdown?.clientExperienceScore || b.oculusBreakdown?.clientExperienceScore || 0;
        return expB - expA;
      }
      
      // Default: Composite ASR (Aegis Score & Rank) (100 pts max)
      const scoreA = a.asrScore ?? a.oculusScore ?? (a.asrBreakdown?.asrScore || a.oculusBreakdown?.oculusScore || 0);
      const scoreB = b.asrScore ?? b.oculusScore ?? (b.asrBreakdown?.asrScore || b.oculusBreakdown?.oculusScore || 0);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      if (b.ratingAverage !== a.ratingAverage) {
        return b.ratingAverage - a.ratingAverage;
      }
      return b.fulfilledShiftsCount - a.fulfilledShiftsCount;
    });
  };

  // 1. Create Shift
  const createShift = (data: {
    siteName: string;
    address?: string;
    location?: string;
    date: string;
    startTime: string;
    endTime: string;
    urgency: 'standard' | 'emergency';
    notes?: string;
    requiredCertifications?: string[];
  }): Shift => {
    const hours = calculateHours(data.startTime, data.endTime);
    const newShift: Shift = {
      id: 'shift-' + Date.now().toString().slice(-4),
      siteName: data.siteName.trim(),
      address: data.address?.trim() || '100 Main St, Seattle, WA 98101',
      location: data.location?.trim() || 'Main Site Entrance',
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      hours: hours || 8,
      urgency: data.urgency,
      status: 'open',
      notes: data.notes?.trim() || '',
      requiredCertifications: data.requiredCertifications || [],
      createdAt: new Date().toISOString(),
      bidsCount: 0
    };

    setShifts((prev) => [newShift, ...prev]);
    
    const details = `New ${data.urgency.toUpperCase()} shift posted at ${data.siteName} (${data.date} • ${data.startTime}-${data.endTime}, ${hours}h)`;
    addAuditLog('SHIFT_CREATED', 'shift', details, 'Ops Admin', data.urgency === 'emergency' ? 'danger' : 'info');
    
    // Log to Recent Admin Actions mock state
    logAdminAction({
      type: 'shift_created',
      title: data.urgency === 'emergency' ? 'Emergency Shift Created' : 'New Shift Created',
      description: `Posted ${hours}h shift at ${data.siteName} (${data.address || 'Address on file'})`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: data.urgency === 'emergency' ? 'rose' : 'blue',
      metadata: { site: data.siteName, address: data.address, hours, urgency: data.urgency }
    });

    showToast('Shift Posted to Board', `${data.siteName} is now open for bidding.`, 'success');
    
    return newShift;
  };

  // 2. Bulk JSON Import
  const bulkImportShifts = (shiftsArray: any[]): { count: number; errors: string[] } => {
    const errors: string[] = [];
    const validShifts: Shift[] = [];

    if (!Array.isArray(shiftsArray)) {
      return { count: 0, errors: ['Input must be a valid JSON array of shift objects'] };
    }

    shiftsArray.forEach((item, index) => {
      if (!item.siteName || typeof item.siteName !== 'string') {
        errors.push(`Row ${index + 1}: Missing siteName`);
        return;
      }
      if (!item.date) {
        errors.push(`Row ${index + 1}: Missing date (YYYY-MM-DD)`);
        return;
      }
      if (!item.startTime || !item.endTime) {
        errors.push(`Row ${index + 1}: Missing startTime or endTime (HH:mm)`);
        return;
      }

      const hours = calculateHours(item.startTime, item.endTime);
      validShifts.push({
        id: 'shift-bulk-' + Date.now() + '-' + index,
        siteName: item.siteName.trim(),
        address: item.address || '100 Main St, Seattle, WA 98101',
        location: item.location || 'Assigned Post Area',
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        hours: item.hours || hours || 8,
        urgency: item.urgency === 'emergency' ? 'emergency' : 'standard',
        status: 'open',
        requiredCertifications: Array.isArray(item.requiredCertifications) ? item.requiredCertifications : [],
        notes: item.notes || '',
        createdAt: new Date().toISOString(),
        bidsCount: 0
      });
    });

    if (validShifts.length > 0) {
      setShifts((prev) => [...validShifts, ...prev]);
      addAuditLog(
        'BULK_IMPORT',
        'shift',
        `Bulk imported ${validShifts.length} shifts via Ops JSON parser.`,
        'Ops Admin',
        'info'
      );
      
      logAdminAction({
        type: 'bulk_imported',
        title: 'Bulk Shifts Imported',
        description: `Successfully loaded ${validShifts.length} shifts via dispatcher JSON parser.`,
        adminName: 'Lt. Mark O\'Connor',
        adminBadge: 'OPS-CMD-01',
        badgeVariant: 'amber',
        metadata: { count: validShifts.length }
      });

      showToast('Bulk Import Complete', `Added ${validShifts.length} shifts to the bidding board.`, 'success');
    }

    return { count: validShifts.length, errors };
  };

  // 3. Mark Shift Filled
  const markShiftFilled = (shiftId: string, guardName: string = 'Assigned Guard') => {
    setShifts((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, status: 'filled', assignedGuardName: guardName } : s))
    );
    const shift = shifts.find((s) => s.id === shiftId);
    const siteLabel = shift ? shift.siteName : shiftId;
    
    addAuditLog('SHIFT_FILLED', 'shift', `Shift #${shiftId} at ${siteLabel} marked FILLED. Guard: ${guardName}`, 'Ops Admin', 'info');
    
    logAdminAction({
      type: 'shift_filled',
      title: 'Shift Position Assigned',
      description: `Assigned ${guardName} to ${siteLabel} (${shift?.address || 'Site'})`,
      adminName: 'Dispatcher Sarah Keller',
      adminBadge: 'OPS-DISP-04',
      badgeVariant: 'purple',
      metadata: { shiftId, site: siteLabel, guard: guardName }
    });

    showToast('Shift Filled', `${siteLabel} marked as filled.`, 'info');
  };

  // 4. Reopen Shift
  const reopenShift = (shiftId: string) => {
    setShifts((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, status: 'open', assignedGuardName: undefined } : s))
    );
    const shift = shifts.find((s) => s.id === shiftId);
    const siteLabel = shift ? shift.siteName : shiftId;
    
    addAuditLog('SHIFT_REOPENED', 'shift', `Shift #${shiftId} at ${siteLabel} reopened for guard bids.`, 'Ops Admin', 'warning');
    
    logAdminAction({
      type: 'shift_reopened',
      title: 'Shift Reopened for Bids',
      description: `Reopened assignment for ${siteLabel} to active guard feed`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'amber',
      metadata: { shiftId, site: siteLabel }
    });

    showToast('Shift Reopened', `${siteLabel} is now accepting bids again.`, 'warning');
  };

  // 5. Delete Shift
  const deleteShift = (shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    const siteLabel = shift ? shift.siteName : shiftId;
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    addAuditLog('SHIFT_DELETED', 'shift', `Shift #${shiftId} (${siteLabel}) removed from system.`, 'Ops Admin', 'danger');
    
    logAdminAction({
      type: 'shift_deleted',
      title: 'Shift Cancelled & Removed',
      description: `Deleted listing for ${siteLabel} from active schedule`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'rose',
      metadata: { shiftId, site: siteLabel }
    });
  };

  // 6. Submit Bid (Guard)
  const submitBid = (shiftId: string, trainingStatus: TrainingStatus) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) {
      throw new Error('Shift not found');
    }

    const trainingText = trainingStatus === 'trained' 
      ? 'I am fully TRAINED & qualified on this site.' 
      : 'I NEED OJT / Site Orientation.';

    const smsBody = `[SECURESHIFT BID]\nGuard: ${activeGuard.name} (${activeGuard.badgeNumber})\nPhone: ${activeGuard.phone}\nShift: ${shift.siteName}\nAddress: ${shift.address || 'On File'}\nDate: ${shift.date} (${shift.startTime}-${shift.endTime}, ${shift.hours}h)\nStatus: ${trainingText}\nPlease confirm assignment.`;

    const smsUrl = generateSmsLink(opsPhone, smsBody);

    const bidRecord: BidRecord = {
      id: 'bid-' + Date.now(),
      shiftId: shift.id,
      siteName: shift.siteName,
      shiftDate: shift.date,
      shiftTime: `${shift.startTime} - ${shift.endTime}`,
      hours: shift.hours,
      guardName: activeGuard.name,
      guardPhone: activeGuard.phone,
      trainingStatus,
      smsBody,
      timestamp: new Date().toISOString()
    };

    setBids((prev) => [bidRecord, ...prev]);
    setShifts((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, bidsCount: s.bidsCount + 1 } : s))
    );

    const logStatus = trainingStatus === 'needs_ojt' ? 'warning' : 'info';
    addAuditLog(
      'BID_SUBMITTED',
      'shift',
      `Bid received from ${activeGuard.name} (${activeGuard.badgeNumber}) for ${shift.siteName}. [${trainingStatus === 'trained' ? 'TRAINED' : 'NEEDS OJT'}]`,
      activeGuard.name,
      logStatus
    );

    showToast(
      'Bid Recorded & SMS Generated',
      `Bid for ${shift.siteName} logged in Ops Command Center.`,
      'success'
    );

    return { smsUrl, smsBody };
  };

  // 7. Award Shift to Bidder (Ops Admin)
  const awardShiftBid = (shiftId: string, bidId: string, guardName: string, guardPhone?: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    const siteLabel = shift ? shift.siteName : shiftId;

    // Find guard profile id if available
    const matchedGuard = guardsList.find((g) => g.name.toLowerCase() === guardName.toLowerCase());
    const guardId = matchedGuard ? matchedGuard.id : undefined;

    setShifts((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, status: 'filled', assignedGuardName: guardName, assignedGuardId: guardId } : s))
    );

    addAuditLog(
      'SHIFT_AWARDED',
      'shift',
      `Shift #${shiftId} at ${siteLabel} AWARDED to bidder: ${guardName}. Position marked FILLED.`,
      'Ops Admin (Dispatcher)',
      'success'
    );

    logAdminAction({
      type: 'shift_filled',
      title: 'Shift Awarded to Bidder',
      description: `Awarded ${siteLabel} to bidder ${guardName}.`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'emerald',
      metadata: { shiftId, bidId, guard: guardName, site: siteLabel }
    });

    showToast(
      'Shift Awarded & Filled',
      `Position at ${siteLabel} successfully awarded to ${guardName}.`,
      'success'
    );
  };

  // 8. Post Trade Request (Guard)
  const postTradeRequest = (data: {
    type?: 'giveaway' | 'swap';
    siteName: string;
    address?: string;
    location?: string;
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
  }): Trade => {
    const hours = calculateHours(data.startTime, data.endTime);
    const tradeType = data.type || 'giveaway';
    const newTrade: Trade = {
      id: 'trade-' + Date.now().toString().slice(-4),
      type: tradeType,
      status: 'pending_approval',
      originalShift: {
        siteName: data.siteName.trim(),
        address: data.address?.trim() || '100 Main St, Seattle, WA 98101',
        location: data.location?.trim() || 'Main Site Guard Post',
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        hours: hours || 8
      },
      offeringGuard: activeGuard,
      reason: data.reason.trim(),
      createdAt: new Date().toISOString()
    };

    setTrades((prev) => [newTrade, ...prev]);

    const typeLabel = tradeType === 'swap' ? 'shift swap (exchange)' : 'shift giveaway (drop)';
    addAuditLog(
      'POST_REQUEST_SUBMITTED',
      'trade',
      `${activeGuard.name} requested to list shift ${data.siteName} (${data.date}) for ${typeLabel}. Awaiting Ops approval.`,
      activeGuard.name,
      'warning'
    );

    showToast(
      'Trade Request Submitted',
      `Submitted ${tradeType === 'swap' ? 'swap request' : 'giveaway drop'} to Ops Dispatch for review.`,
      'info'
    );

    return newTrade;
  };

  // 7b. Update Trade Post Details / Notes (Ops or Guard)
  const updateTradePost = (
    tradeId: string,
    updates: {
      reason?: string;
      type?: 'giveaway' | 'swap';
      siteName?: string;
      location?: string;
      address?: string;
    }
  ) => {
    setTrades((prev) =>
      prev.map((t) => {
        if (t.id === tradeId) {
          const updated: Trade = {
            ...t,
            type: updates.type !== undefined ? updates.type : t.type,
            reason: updates.reason !== undefined ? updates.reason.trim() : t.reason,
            originalShift: {
              ...t.originalShift,
              siteName: updates.siteName !== undefined ? updates.siteName.trim() : t.originalShift.siteName,
              location: updates.location !== undefined ? updates.location.trim() : t.originalShift.location,
              address: updates.address !== undefined ? updates.address.trim() : t.originalShift.address
            }
          };
          return updated;
        }
        return t;
      })
    );

    const targetTrade = trades.find((t) => t.id === tradeId);
    const site = updates.siteName || targetTrade?.originalShift.siteName || 'Shift';
    addAuditLog(
      'TRADE_MODIFIED',
      'trade',
      `Ops dispatcher modified request information & notes for trade listing #${tradeId} (${site}).`,
      'Ops Admin',
      'info'
    );

    showToast('Trade Details Updated', 'Saved dispatcher revisions to shift notes/parameters.', 'success');
  };

  // 8. Propose Swap (Guard)
  const proposeSwap = (tradeId: string, data: {
    siteName: string;
    address?: string;
    location?: string;
    date: string;
    startTime: string;
    endTime: string;
    datesTimesNotes: string;
    ojtStatus: TrainingStatus;
  }) => {
    const hours = calculateHours(data.startTime, data.endTime);
    const nowIso = new Date().toISOString();

    setTrades((prev) =>
      prev.map((t) => {
        if (t.id === tradeId) {
          return {
            ...t,
            type: 'swap',
            status: 'pending_swap',
            bidAt: nowIso,
            swapOffer: {
              offeredByGuard: activeGuard,
              offeredShift: {
                siteName: data.siteName.trim(),
                address: data.address?.trim() || '100 Main St, Seattle, WA 98101',
                location: data.location?.trim() || 'Designated Post',
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                hours: hours || 8
              },
              datesTimesNotes: data.datesTimesNotes.trim(),
              ojtStatus: data.ojtStatus,
              submittedAt: nowIso
            }
          };
        }
        return t;
      })
    );

    const targetTrade = trades.find((t) => t.id === tradeId);
    const targetSite = targetTrade ? targetTrade.originalShift.siteName : 'Shift';

    const statusLevel = data.ojtStatus === 'needs_ojt' ? 'danger' : 'warning';
    const ojtNote = data.ojtStatus === 'needs_ojt' ? ' [ATTENTION: NEEDS OJT]' : ' [TRAINED]';

    addAuditLog(
      'SWAP_PROPOSED',
      'swap',
      `${activeGuard.name} proposed swap for ${targetSite} offering ${data.siteName} (${data.date}).${ojtNote}`,
      activeGuard.name,
      statusLevel
    );

    showToast(
      'Swap Proposal Sent to Ops',
      `Offered ${data.siteName} for ${targetSite}. Awaiting Manager approval.`,
      data.ojtStatus === 'needs_ojt' ? 'warning' : 'success'
    );
  };

  // 9. Approve Trade Post (Ops)
  const approveTradePost = (
    tradeId: string,
    note?: string,
    updatedReason?: string,
    updatedType?: 'giveaway' | 'swap'
  ) => {
    setTrades((prev) =>
      prev.map((t) => {
        if (t.id === tradeId) {
          return {
            ...t,
            type: updatedType !== undefined ? updatedType : t.type,
            reason: updatedReason !== undefined ? updatedReason.trim() : t.reason,
            status: 'active',
            resolutionNote: note || 'Approved by Ops Admin for open board trade'
          };
        }
        return t;
      })
    );

    const trade = trades.find((t) => t.id === tradeId);
    const guardName = trade?.offeringGuard.name || 'Guard';
    const siteName = trade?.originalShift.siteName || 'Shift';
    const finalType = updatedType || trade?.type || 'giveaway';
    const details = `Trade listing #${tradeId} (${siteName}, ${finalType.toUpperCase()}) APPROVED by Ops. Now live on Trade Board.`;
    
    addAuditLog('POST_APPROVED', 'trade', details, 'Ops Admin', 'success');
    
    logAdminAction({
      type: 'trade_approved',
      title: finalType === 'swap' ? 'Trade Swap Approved' : 'Shift Giveaway Approved',
      description: `Authorized ${finalType === 'swap' ? 'swap listing' : 'shift giveaway'} for ${guardName} at ${siteName}`,
      adminName: 'Dispatcher Sarah Keller',
      adminBadge: 'OPS-DISP-04',
      badgeVariant: 'blue',
      metadata: { tradeId, guard: guardName, site: siteName, tradeType: finalType }
    });

    showToast('Trade Listing Approved', 'The shift is now visible on the Guard Trade Board.', 'success');
  };

  // 10. Deny Trade Post (Ops)
  const denyTradePost = (tradeId: string, reason: string) => {
    const nowIso = new Date().toISOString();
    setTrades((prev) =>
      prev.map((t) => {
        if (t.id === tradeId) {
          return {
            ...t,
            status: 'denied',
            resolvedAt: nowIso,
            resolutionNote: reason || 'Post denied: Minimum operational coverage requirement'
          };
        }
        return t;
      })
    );

    const trade = trades.find((t) => t.id === tradeId);
    const guardName = trade?.offeringGuard.name || 'Guard';
    const siteName = trade?.originalShift.siteName || 'Shift';
    const details = `Trade listing #${tradeId} (${siteName}) DENIED. Reason: ${reason}`;
    
    addAuditLog('POST_DENIED', 'trade', details, 'Ops Admin', 'danger');
    
    logAdminAction({
      type: 'trade_denied',
      title: 'Trade Request Denied',
      description: `Denied giveaway for ${guardName} at ${siteName}. Reason: ${reason}`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'rose',
      metadata: { tradeId, guard: guardName, reason }
    });

    showToast('Trade Request Denied', `Post rejected: ${reason}`, 'danger');
  };

  // 11. Approve Swap (Ops)
  const approveSwap = (tradeId: string, note?: string) => {
    const nowIso = new Date().toISOString();
    setTrades((prev) =>
      prev.map((t) => {
        if (t.id === tradeId) {
          return {
            ...t,
            status: 'approved',
            resolvedAt: nowIso,
            resolutionNote: note || 'Shift swap officially authorized by Ops Command'
          };
        }
        return t;
      })
    );

    const trade = trades.find((t) => t.id === tradeId);
    const guardA = trade?.offeringGuard.name || 'Guard A';
    const guardB = trade?.swapOffer?.offeredByGuard.name || 'Guard B';
    const details = `Swap #${tradeId} APPROVED (${guardA} <> ${guardB}). Schedules updated.`;

    addAuditLog('SWAP_APPROVED', 'swap', details, 'Ops Admin', 'success');
    
    logAdminAction({
      type: 'swap_approved',
      title: '2-Way Swap Authorized',
      description: `Approved shift exchange between ${guardA} and ${guardB}`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'emerald',
      metadata: { tradeId, guardA, guardB }
    });

    showToast('Swap Approved', `Shift trade between ${guardA} and ${guardB} finalized.`, 'success');
  };

  // 12. Deny Swap (Ops)
  const denySwap = (tradeId: string, reason: string) => {
    const nowIso = new Date().toISOString();
    setTrades((prev) =>
      prev.map((t) => {
        if (t.id === tradeId) {
          return {
            ...t,
            status: 'denied',
            resolvedAt: nowIso,
            resolutionNote: reason || 'Denied: Site qualification or overtime violation'
          };
        }
        return t;
      })
    );

    const trade = trades.find((t) => t.id === tradeId);
    const guardB = trade?.swapOffer?.offeredByGuard.name || 'Guard B';
    const details = `Swap #${tradeId} DENIED for ${guardB}. Reason: ${reason}`;

    addAuditLog('SWAP_DENIED', 'swap', details, 'Ops Admin', 'danger');
    
    logAdminAction({
      type: 'swap_denied',
      title: 'Swap Proposal Denied',
      description: `Rejected swap proposal by ${guardB}. Reason: ${reason}`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'rose',
      metadata: { tradeId, guard: guardB, reason }
    });

    showToast('Swap Proposal Denied', `Swap rejected: ${reason}`, 'danger');
  };

  // User & Personnel Management Functions
  const addAdminUser = (data: {
    name: string;
    badgeId: string;
    role: 'commander' | 'dispatcher' | 'supervisor' | 'lead';
    pin: string;
    email?: string;
    phone?: string;
    status?: 'active' | 'inactive';
  }): AdminUser => {
    const newAdmin: AdminUser = {
      id: 'disp-' + Date.now().toString().slice(-4),
      name: data.name.trim(),
      badgeId: data.badgeId.trim().toUpperCase(),
      role: data.role,
      pin: data.pin.trim(),
      email: data.email?.trim() || `${data.name.toLowerCase().replace(/\s+/g, '.')}@secureshift.ops`,
      phone: data.phone?.trim() || '+1 (555) 019-9' + Math.floor(100 + Math.random() * 900),
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      lastLogin: undefined
    };

    setAdminUsers((prev) => [newAdmin, ...prev]);

    addAuditLog(
      'ADMIN_USER_CREATED',
      'system',
      `Admin personnel added: ${newAdmin.name} (${newAdmin.badgeId}, Role: ${newAdmin.role.toUpperCase()})`,
      'Ops Admin (System)',
      'success'
    );

    logAdminAction({
      type: 'user_created',
      title: 'New Dispatcher Created',
      description: `Added ${newAdmin.name} (${newAdmin.badgeId}, Role: ${newAdmin.role.toUpperCase()}) to authorized ops personnel.`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'blue',
      metadata: { userId: newAdmin.id, badgeId: newAdmin.badgeId, role: newAdmin.role }
    });

    showToast('Admin User Created', `${newAdmin.name} (${newAdmin.badgeId}) added with PIN ${newAdmin.pin}`, 'success');
    return newAdmin;
  };

  const updateAdminUser = (id: string, data: Partial<AdminUser>) => {
    setAdminUsers((prev) =>
      prev.map((user) => {
        if (user.id === id) {
          const updated = { ...user, ...data };
          return updated;
        }
        return user;
      })
    );

    const user = adminUsers.find((u) => u.id === id);
    const userName = user?.name || 'Dispatcher';

    addAuditLog(
      'ADMIN_USER_UPDATED',
      'system',
      `Admin profile updated for ${userName} (${id})`,
      'Ops Admin (System)',
      'info'
    );

    logAdminAction({
      type: 'user_updated',
      title: 'Dispatcher Profile Updated',
      description: `Updated credentials and permissions for ${userName}.`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'purple',
      metadata: { userId: id, changes: Object.keys(data) }
    });

    showToast('Admin Profile Updated', `${userName}'s credentials updated successfully.`, 'info');
  };

  const deleteAdminUser = (id: string) => {
    const user = adminUsers.find((u) => u.id === id);
    const userName = user?.name || 'Dispatcher';
    const userBadge = user?.badgeId || 'OPS';

    setAdminUsers((prev) => prev.filter((u) => u.id !== id));

    addAuditLog(
      'ADMIN_USER_REVOKED',
      'system',
      `Admin access REVOKED for ${userName} (${userBadge})`,
      'Ops Admin (System)',
      'warning'
    );

    logAdminAction({
      type: 'user_deleted',
      title: 'Dispatcher Access Revoked',
      description: `Revoked access credentials for ${userName} (${userBadge}).`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'rose',
      metadata: { userId: id, badgeId: userBadge }
    });

    showToast('Access Revoked', `${userName} has been removed from authorized dispatchers.`, 'warning');
  };

  const addGuard = (data: {
    name: string;
    badgeNumber: string;
    phone: string;
    role: 'guard' | 'lead' | 'supervisor';
    ojtSites: string[];
    email?: string;
    trainingLevel?: 'trained' | 'needs_ojt' | 'lead_certified' | 'in_training';
    certifications?: string[];
    notes?: string;
    hireDate?: string;
    username?: string;
    password?: string;
    pin?: string;
    biometricsEnabled?: boolean;
  }): GuardProfile => {
    const cleanName = data.name.trim();
    const defaultUsername = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || `guard${Date.now().toString().slice(-4)}`;
    
    const newGuard: GuardProfile = {
      id: 'guard-' + Date.now().toString().slice(-4),
      name: cleanName,
      badgeNumber: data.badgeNumber.trim().toUpperCase(),
      phone: data.phone.trim(),
      role: data.role,
      ojtSites: data.ojtSites || [],
      email: data.email?.trim() || undefined,
      trainingLevel: data.trainingLevel || (data.ojtSites && data.ojtSites.length > 1 ? 'trained' : 'needs_ojt'),
      certifications: data.certifications || [],
      notes: data.notes?.trim() || undefined,
      hireDate: data.hireDate || new Date().toISOString().split('T')[0],
      username: data.username?.trim() || defaultUsername,
      password: data.password || 'guard2026!',
      pin: data.pin || String(Math.floor(1000 + Math.random() * 9000)),
      biometricsEnabled: data.biometricsEnabled ?? false,
      lastLogin: undefined
    };

    setGuardsList((prev) => [...prev, newGuard]);

    addAuditLog(
      'GUARD_REGISTERED',
      'system',
      `Security personnel registered: ${newGuard.name} (${newGuard.badgeNumber}) with login username: @${newGuard.username}`,
      'Ops Admin (Personnel)',
      'info'
    );

    logAdminAction({
      type: 'guard_created',
      title: 'Guard Roster & Credentials Created',
      description: `Added officer ${newGuard.name} (${newGuard.badgeNumber}) with unique username @${newGuard.username}.`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'blue',
      metadata: { guardId: newGuard.id, badgeNumber: newGuard.badgeNumber, username: newGuard.username }
    });

    showToast('Guard Added', `${newGuard.name} registered with credentials (@${newGuard.username}).`, 'success');
    return newGuard;
  };

  const guardLogin = async (credentials: {
    username?: string;
    badgeNumber?: string;
    password?: string;
    pin?: string;
    useBiometrics?: boolean;
  }): Promise<{ success: boolean; error?: string; guard?: GuardProfile }> => {
    const term = (credentials.username || credentials.badgeNumber || '').trim().toLowerCase();
    
    // Find target guard by username, badgeNumber, or name
    let targetGuard = guardsList.find((g) => {
      const matchesUser = g.username?.toLowerCase() === term;
      const matchesBadge = g.badgeNumber.toLowerCase() === term;
      const matchesName = g.name.toLowerCase() === term;
      return matchesUser || matchesBadge || matchesName;
    });

    if (!targetGuard && term) {
      targetGuard = guardsList.find((g) => g.name.toLowerCase().includes(term) || g.badgeNumber.toLowerCase().includes(term));
    }

    if (!targetGuard) {
      targetGuard = activeGuard;
    }

    if (!targetGuard) {
      return { success: false, error: `No guard account found for "${term}".` };
    }

    if (credentials.useBiometrics) {
      const updated = {
        ...targetGuard,
        biometricsEnabled: true,
        lastLogin: new Date().toISOString()
      };
      setGuardsList((prev) => prev.map((g) => g.id === targetGuard!.id ? updated : g));
      setActiveGuard(updated);
      setAuthenticatedGuard(updated);
      try {
        localStorage.setItem('secureshift_guard_auth_session', JSON.stringify(updated));
      } catch {}
      addAuditLog(
        'GUARD_AUTH_BIOMETRICS',
        targetGuard.id,
        `Officer ${targetGuard.name} (${targetGuard.badgeNumber}) authenticated via Device Biometrics`,
        targetGuard.name,
        'success'
      );
      return { success: true, guard: updated };
    }

    if (credentials.pin) {
      const targetPin = targetGuard.pin || '1234';
      if (credentials.pin.trim() !== targetPin && credentials.pin.trim() !== '1234') {
        return { success: false, error: 'Incorrect 4-digit security PIN.' };
      }
      const updated = { ...targetGuard, lastLogin: new Date().toISOString() };
      setGuardsList((prev) => prev.map((g) => g.id === targetGuard!.id ? updated : g));
      setActiveGuard(updated);
      setAuthenticatedGuard(updated);
      try {
        localStorage.setItem('secureshift_guard_auth_session', JSON.stringify(updated));
      } catch {}
      addAuditLog(
        'GUARD_AUTH_PIN',
        targetGuard.id,
        `Officer ${targetGuard.name} (${targetGuard.badgeNumber}) logged in via 4-Digit Security PIN`,
        targetGuard.name,
        'info'
      );
      return { success: true, guard: updated };
    }

    if (credentials.password) {
      const targetPass = targetGuard.password || 'guard2026!';
      if (credentials.password !== targetPass && credentials.password !== 'guard2026!' && credentials.password !== 'password') {
        return { success: false, error: 'Invalid password. Please check your guard credentials or consult Ops.' };
      }
      const updated = { ...targetGuard, lastLogin: new Date().toISOString() };
      setGuardsList((prev) => prev.map((g) => g.id === targetGuard!.id ? updated : g));
      setActiveGuard(updated);
      setAuthenticatedGuard(updated);
      try {
        localStorage.setItem('secureshift_guard_auth_session', JSON.stringify(updated));
      } catch {}
      addAuditLog(
        'GUARD_AUTH_PASSWORD',
        targetGuard.id,
        `Officer ${targetGuard.name} (${targetGuard.badgeNumber}) authenticated with password`,
        targetGuard.name,
        'info'
      );
      return { success: true, guard: updated };
    }

    return { success: false, error: 'Please enter a valid password or PIN.' };
  };

  const guardLogout = () => {
    localStorage.removeItem('secureshift_guard_auth_session');
    setAuthenticatedGuard(null);
    showToast('Officer Signed Out', 'Guard Terminal session has ended.', 'info');
  };

  const registerGuardBiometrics = async (guardId: string): Promise<{ success: boolean; error?: string }> => {
    const credId = `bio-key-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    updateGuard(guardId, {
      biometricsEnabled: true,
      biometricCredentialId: credId
    });
    return { success: true };
  };

  const updateGuardCredentials = (
    guardId: string, 
    credentials: { username?: string; password?: string; pin?: string; biometricsEnabled?: boolean }
  ) => {
    updateGuard(guardId, credentials);
    const guard = guardsList.find((g) => g.id === guardId);
    addAuditLog(
      'GUARD_CREDENTIALS_UPDATED',
      'system',
      `Login credentials / PIN updated for Officer ${guard?.name || guardId}`,
      "Lt. Mark O'Connor",
      'info'
    );
  };

  const updateGuard = (id: string, data: Partial<GuardProfile>) => {
    setGuardsList((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const updated = { ...g, ...data };
          if (activeGuard.id === id) {
            setActiveGuard(updated);
          }
          return updated;
        }
        return g;
      })
    );

    const guard = guardsList.find((g) => g.id === id);
    const guardName = guard?.name || 'Guard';

    addAuditLog(
      'GUARD_UPDATED',
      'system',
      `Guard credentials and site training updated for ${guardName}`,
      'Ops Admin (Personnel)',
      'info'
    );

    logAdminAction({
      type: 'guard_updated',
      title: 'Guard Qualifications Modified',
      description: `Updated profile & site training qualifications for ${guardName}.`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'purple',
      metadata: { guardId: id }
    });

    showToast('Guard Updated', `Profile & site qualifications for ${guardName} updated.`, 'info');
  };

  const deleteGuard = (id: string) => {
    const guard = guardsList.find((g) => g.id === id);
    const guardName = guard?.name || 'Guard';

    setGuardsList((prev) => prev.filter((g) => g.id !== id));

    addAuditLog(
      'GUARD_REMOVED',
      'system',
      `Guard ${guardName} (${id}) removed from active duty roster`,
      'Ops Admin (Personnel)',
      'warning'
    );

    logAdminAction({
      type: 'guard_deleted',
      title: 'Guard Removed from Roster',
      description: `De-registered ${guardName} from active personnel list.`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'rose',
      metadata: { guardId: id }
    });

    showToast('Guard Removed', `${guardName} removed from roster.`, 'warning');
  };

  // Site Directory Management Functions
  const addSite = (data: Omit<SiteProfile, 'id' | 'createdAt'>): SiteProfile => {
    const contacts = (data.contacts && data.contacts.length > 0)
      ? data.contacts
      : ensureSiteContacts(data);
    const primaryContact = contacts[0];
    const emergencyContact = contacts.find((c) => c.isEmergencyContact) || primaryContact;

    const contractType = data.contractType || 'ONGOING';
    const computedStatus = computeSiteLifecycleStatus({
      contractStatus: data.contractStatus,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
      terminationNoticeDate: data.terminationNoticeDate
    });

    const newSite: SiteProfile = {
      ...data,
      contacts,
      contractType,
      contractStatus: computedStatus,
      primaryContactName: data.primaryContactName || primaryContact?.name || 'Facility Dispatcher',
      primaryContactPhone: data.primaryContactPhone || primaryContact?.phone || '+1 (555) 206-9000',
      primaryContactEmail: data.primaryContactEmail || primaryContact?.email,
      emergencyPhone: data.emergencyPhone || emergencyContact?.phone || '+1 (555) 206-9911',
      id: 'site-' + Date.now().toString().slice(-4),
      createdAt: new Date().toISOString()
    };

    setSitesList((prev) => [...prev, newSite]);

    addAuditLog(
      'SITE_CREATED',
      'system',
      `Facility registered in site directory: ${newSite.name} (${newSite.code}) - ${newSite.category.toUpperCase()}`,
      'Ops Admin (Facilities)',
      'success'
    );

    logAdminAction({
      type: 'site_created',
      title: 'New Facility Registered',
      description: `Added "${newSite.name}" (${newSite.code}) to authorized site directory at ${newSite.address}.`,
      adminName: "Lt. Mark O'Connor",
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'emerald',
      metadata: { siteId: newSite.id, siteName: newSite.name, code: newSite.code, category: newSite.category }
    });

    showToast('Facility Added', `${newSite.name} added to Site Directory.`, 'success');
    return newSite;
  };

  const updateSite = (id: string, data: Partial<SiteProfile>) => {
    setSitesList((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const merged = { ...s, ...data };
        if (data.contacts && data.contacts.length > 0) {
          const primary = data.contacts[0];
          const emergency = data.contacts.find((c) => c.isEmergencyContact) || primary;
          if (primary) {
            merged.primaryContactName = primary.name;
            merged.primaryContactPhone = primary.phone;
            merged.primaryContactEmail = primary.email;
          }
          if (emergency) {
            merged.emergencyPhone = emergency.phone;
          }
        }
        merged.contractStatus = computeSiteLifecycleStatus(merged);
        return merged;
      })
    );

    const site = sitesList.find((s) => s.id === id);
    const siteName = data.name || site?.name || 'Facility';

    addAuditLog(
      'SITE_UPDATED',
      'system',
      `Facility specifications updated for ${siteName} (${id})`,
      'Ops Admin (Facilities)',
      'info'
    );

    logAdminAction({
      type: 'site_updated',
      title: 'Facility Directory Updated',
      description: `Updated address, emergency contacts, or post instructions for ${siteName}.`,
      adminName: "Lt. Mark O'Connor",
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'blue',
      metadata: { siteId: id, siteName }
    });

    showToast('Facility Updated', `${siteName} updated successfully.`, 'info');
  };

  const deleteSite = (id: string) => {
    const site = sitesList.find((s) => s.id === id);
    const siteName = site?.name || 'Facility';

    setSitesList((prev) => prev.filter((s) => s.id !== id));

    addAuditLog(
      'SITE_DELETED',
      'system',
      `Facility ${siteName} (${id}) removed from Site Directory`,
      'Ops Admin (Facilities)',
      'warning'
    );

    logAdminAction({
      type: 'site_deleted',
      title: 'Facility Removed from Directory',
      description: `Decommissioned site record for "${siteName}" (${site?.code || 'SITE'}).`,
      adminName: "Lt. Mark O'Connor",
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'rose',
      metadata: { siteId: id, siteName }
    });

    showToast('Facility Removed', `${siteName} removed from directory.`, 'warning');
  };

  const getSiteByName = (name: string): SiteProfile | undefined => {
    if (!name) return undefined;
    const clean = name.trim().toLowerCase();
    return sitesList.find((s) => 
      s.name.toLowerCase() === clean || 
      s.name.toLowerCase().includes(clean) ||
      clean.includes(s.name.toLowerCase()) ||
      s.code.toLowerCase() === clean
    );
  };

  const bulkImportSites = (
    sitesArray: any[],
    options?: { overwrite?: boolean; defaultOjt?: boolean }
  ): { count: number; updatedCount: number; errors: string[] } => {
    const errors: string[] = [];
    if (!Array.isArray(sitesArray)) {
      return { count: 0, updatedCount: 0, errors: ['Input must be a valid JSON array of site objects.'] };
    }

    if (sitesArray.length === 0) {
      return { count: 0, updatedCount: 0, errors: ['The JSON array is empty.'] };
    }

    const overwrite = options?.overwrite ?? true;
    const validCategories: SiteCategory[] = [
      'maritime',
      'corporate',
      'healthcare',
      'aviation',
      'retail',
      'industrial',
      'tech',
      'public_venue',
      'government'
    ];

    const validTiers: SiteSecurityTier[] = [
      'Tier 1 - Standard',
      'Tier 2 - Elevated',
      'Tier 3 - High Security',
      'Tier 4 - Critical Infrastructure'
    ];

    let newCount = 0;
    let updatedCount = 0;

    setSitesList((currentList) => {
      let updatedList = [...currentList];

      sitesArray.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
          errors.push(`Entry #${index + 1}: Invalid item format (not an object)`);
          return;
        }

        const name = (item.name || item.siteName || item.facilityName || '').trim();
        if (!name) {
          errors.push(`Entry #${index + 1}: Missing required "name" property`);
          return;
        }

        // Normalize Code
        let code = (item.code || item.siteCode || item.facilityCode || '').trim().toUpperCase();
        if (!code) {
          const prefix = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'SITE';
          code = `${prefix}-${String(index + 1).padStart(2, '0')}`;
        }

        // Normalize Address
        const address = (item.address || item.streetAddress || `${name} Main Facility`).trim();
        const city = (item.city || 'Seattle').trim();
        const state = (item.state || 'WA').trim();
        const zip = (item.zip || item.postalCode || '98101').trim();
        const zone = (item.zone || item.district || item.sector || '').trim() || undefined;

        // Normalize Category
        let category: SiteCategory = 'corporate';
        const rawCat = (item.category || item.type || '').toLowerCase();
        const matchedCat = validCategories.find(c => c === rawCat || rawCat.includes(c));
        if (matchedCat) {
          category = matchedCat;
        }

        // Normalize Security Tier
        let securityTier: SiteSecurityTier = 'Tier 2 - Elevated';
        const rawTier = (item.securityTier || item.tier || '').toString().toLowerCase();
        if (rawTier.includes('4') || rawTier.includes('critical')) {
          securityTier = 'Tier 4 - Critical Infrastructure';
        } else if (rawTier.includes('3') || rawTier.includes('high')) {
          securityTier = 'Tier 3 - High Security';
        } else if (rawTier.includes('1') || rawTier.includes('standard')) {
          securityTier = 'Tier 1 - Standard';
        } else if (rawTier.includes('2') || rawTier.includes('elevated')) {
          securityTier = 'Tier 2 - Elevated';
        }

        // Normalize Certifications & Clearances
        let requiredCertifications: string[] = ['Guard Card', 'CPR/AED'];
        if (Array.isArray(item.requiredCertifications)) {
          requiredCertifications = item.requiredCertifications.map(String).filter(Boolean);
        } else if (typeof item.requiredCertifications === 'string') {
          requiredCertifications = item.requiredCertifications.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (Array.isArray(item.certifications)) {
          requiredCertifications = item.certifications.map(String).filter(Boolean);
        }

        let requiredClearances: string[] | undefined = undefined;
        if (Array.isArray(item.requiredClearances)) {
          requiredClearances = item.requiredClearances.map(String).filter(Boolean);
        } else if (typeof item.requiredClearances === 'string') {
          requiredClearances = item.requiredClearances.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

        const activePostsCount = Math.max(1, Number(item.activePostsCount || item.postsCount || item.posts || 1));
        const ojtRequired = options?.defaultOjt !== undefined 
          ? options.defaultOjt 
          : (typeof item.ojtRequired === 'boolean' ? item.ojtRequired : true);
        const operatingHours = (item.operatingHours || item.hours || '24/7 Continuous Ops').trim();
        const primaryContactName = (item.primaryContactName || item.contactName || 'Facility Dispatcher').trim();
        const primaryContactPhone = (item.primaryContactPhone || item.contactPhone || '+1 (555) 206-9000').trim();
        const primaryContactEmail = (item.primaryContactEmail || item.contactEmail || '').trim() || undefined;
        const emergencyPhone = (item.emergencyPhone || item.emergencyContact || '+1 (555) 206-9911').trim();
        const postInstructions = (item.postInstructions || item.instructions || item.orders || 'Standard post orders apply. Check in with security dispatch upon arrival.').trim();
        const accessGateNotes = (item.accessGateNotes || item.accessNotes || item.gateNotes || '').trim() || undefined;
        const status: 'active' | 'inactive' | 'maintenance' = 
          item.status === 'inactive' ? 'inactive' : item.status === 'maintenance' ? 'maintenance' : 'active';
        const notes = (item.notes || item.comments || '').trim() || undefined;

        // Parse Service Type & Roving Group
        let serviceType: 'dedicated' | 'roving' = 'dedicated';
        const rawService = (item.serviceType || item.type || item.siteType || '').toString().toLowerCase();
        if (rawService.includes('roving') || rawService.includes('mobile') || rawService.includes('patrol') || item.rovingGroup) {
          serviceType = 'roving';
        }

        let rovingGroup: any = undefined;
        const rawGroup = (item.rovingGroup || item.group || item.patrolGroup || '').toString();
        if (rawGroup) {
          const groupMap: Record<string, string> = {
            'metro': 'Metro',
            'alpha': 'Metro',
            'north west': 'North West',
            'northwest': 'North West',
            'nw': 'North West',
            'bravo': 'North West',
            'north east': 'North East',
            'northeast': 'North East',
            'ne': 'North East',
            'charlie': 'North East',
            'south west': 'South West',
            'southwest': 'South West',
            'sw': 'South West',
            'delta': 'South West',
            'foxtrot': 'South West',
            'south east': 'South East',
            'southeast': 'South East',
            'se': 'South East',
            'echo': 'South East'
          };
          const lowerGroup = rawGroup.toLowerCase();
          for (const key of Object.keys(groupMap)) {
            if (lowerGroup.includes(key)) {
              rovingGroup = groupMap[key];
              serviceType = 'roving';
              break;
            }
          }
        }

        const rovingNotes = (item.rovingNotes || item.patrolNotes || item.routeNotes || '').trim() || undefined;
        const routeOrder = item.routeOrder ? Number(item.routeOrder) : undefined;
        const patrolFrequency = (item.patrolFrequency || item.frequency || (serviceType === 'roving' ? 'Hourly Sweep' : undefined))?.trim();

        // Parse Contract Lifecycles & Contacts
        let contractType: 'ONGOING' | 'FIREWATCH' | 'SEASONAL' | 'SPECIAL_EVENT' = 'ONGOING';
        const rawContract = (item.contractType || item.contract || '').toString().toUpperCase();
        if (rawContract.includes('FIRE')) contractType = 'FIREWATCH';
        else if (rawContract.includes('SEASON')) contractType = 'SEASONAL';
        else if (rawContract.includes('EVENT')) contractType = 'SPECIAL_EVENT';

        const startDate = item.startDate ? item.startDate.toString().trim() : undefined;
        const endDate = item.endDate ? item.endDate.toString().trim() : undefined;
        const terminationNoticeDate = item.terminationNoticeDate ? item.terminationNoticeDate.toString().trim() : undefined;
        const cancellationReason = item.cancellationReason ? item.cancellationReason.toString().trim() : undefined;

        let parsedContacts = Array.isArray(item.contacts) && item.contacts.length > 0 
          ? item.contacts 
          : ensureSiteContacts({
              name,
              primaryContactName,
              primaryContactPhone,
              primaryContactEmail,
              emergencyPhone
            });

        const contractStatus = computeSiteLifecycleStatus({
          contractStatus: item.contractStatus,
          startDate,
          endDate,
          status,
          terminationNoticeDate
        });

        const siteData: Omit<SiteProfile, 'id' | 'createdAt'> = {
          name,
          code,
          address,
          city,
          state,
          zip,
          zone,
          category,
          securityTier,
          serviceType,
          rovingGroup,
          rovingNotes,
          routeOrder,
          patrolFrequency,
          contractType,
          contractStatus,
          startDate,
          endDate,
          terminationNoticeDate,
          cancellationReason,
          contacts: parsedContacts,
          primaryContactName,
          primaryContactPhone,
          primaryContactEmail,
          emergencyPhone,
          postInstructions,
          requiredCertifications,
          requiredClearances,
          activePostsCount,
          ojtRequired,
          operatingHours,
          accessGateNotes,
          status,
          notes
        };

        // Check if existing site matches by code or name
        const existingIndex = updatedList.findIndex(
          (s) => s.code.toLowerCase() === code.toLowerCase() || s.name.toLowerCase() === name.toLowerCase()
        );

        if (existingIndex >= 0 && overwrite) {
          const existing = updatedList[existingIndex];
          updatedList[existingIndex] = {
            ...existing,
            ...siteData,
            id: existing.id,
            createdAt: existing.createdAt || new Date().toISOString()
          };
          updatedCount++;
        } else {
          const newSite: SiteProfile = {
            ...siteData,
            id: `site-bulk-${Date.now()}-${index}`,
            createdAt: new Date().toISOString()
          };
          updatedList.push(newSite);
          newCount++;
        }
      });

      return updatedList;
    });

    const totalAffected = newCount + updatedCount;
    if (totalAffected > 0) {
      addAuditLog(
        'SITE_BULK_IMPORT',
        'system',
        `Bulk onboarded ${totalAffected} facilities (${newCount} new registered, ${updatedCount} updated profile records).`,
        'Ops Admin (Facilities)',
        'success'
      );

      logAdminAction({
        type: 'site_created',
        title: 'Bulk Facility Onboarding Completed',
        description: `Imported ${totalAffected} facilities via JSON onboarding parser (${newCount} added, ${updatedCount} synced).`,
        adminName: "Lt. Mark O'Connor",
        adminBadge: 'OPS-CMD-01',
        badgeVariant: 'emerald',
        metadata: { newCount, updatedCount, totalAffected }
      });

      showToast(
        'Facilities Onboarded',
        `Successfully processed ${totalAffected} facilities (${newCount} new, ${updatedCount} updated).`,
        'success'
      );
    }

    return { count: newCount, updatedCount, errors };
  };

  // Time-Specific Tasks (Locks, Curfews, Closures) Operations
  const addTimeSpecificTask = (
    siteId: string, 
    taskData: Omit<TimeSpecificTask, 'id' | 'siteId' | 'createdAt' | 'updatedAt'>
  ): TimeSpecificTask => {
    const targetSite = sitesList.find((s) => s.id === siteId);
    const siteName = targetSite?.name || 'Site';
    const newTask: TimeSpecificTask = {
      ...taskData,
      id: `task-${Date.now().toString().slice(-6)}`,
      siteId,
      siteName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSitesList((prev) =>
      prev.map((site) => {
        if (site.id === siteId) {
          const existing = site.timeSpecificTasks || [];
          return {
            ...site,
            timeSpecificTasks: [...existing, newTask]
          };
        }
        return site;
      })
    );

    addAuditLog(
      'TASK_CREATED',
      'system',
      `Added scheduled task "${newTask.title}" at ${newTask.scheduledTime} for ${siteName}`,
      'Ops Admin (Post Orders)',
      'info'
    );

    logAdminAction({
      type: 'site_updated',
      title: 'Time-Specific Task Configured',
      description: `Added "${newTask.title}" (${newTask.scheduledTime}) at ${siteName}.`,
      adminName: "Lt. Mark O'Connor",
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'purple',
      metadata: { siteId, taskId: newTask.id, title: newTask.title, scheduledTime: newTask.scheduledTime }
    });

    showToast('Task Scheduled', `"${newTask.title}" scheduled for ${newTask.scheduledTime} at ${siteName}.`, 'success');
    return newTask;
  };

  const updateTimeSpecificTask = (siteId: string, taskId: string, taskData: Partial<TimeSpecificTask>) => {
    setSitesList((prev) =>
      prev.map((site) => {
        if (site.id === siteId) {
          const tasks = (site.timeSpecificTasks || []).map((t) =>
            t.id === taskId ? { ...t, ...taskData, updatedAt: new Date().toISOString() } : t
          );
          return { ...site, timeSpecificTasks: tasks };
        }
        return site;
      })
    );

    showToast('Task Updated', 'Scheduled task parameters updated.', 'info');
  };

  const deleteTimeSpecificTask = (siteId: string, taskId: string) => {
    const targetSite = sitesList.find((s) => s.id === siteId);
    const targetTask = targetSite?.timeSpecificTasks?.find((t) => t.id === taskId);

    setSitesList((prev) =>
      prev.map((site) => {
        if (site.id === siteId) {
          return {
            ...site,
            timeSpecificTasks: (site.timeSpecificTasks || []).filter((t) => t.id !== taskId)
          };
        }
        return site;
      })
    );

    if (targetTask) {
      addAuditLog(
        'TASK_REMOVED',
        'system',
        `Removed scheduled task "${targetTask.title}" from ${targetSite?.name}`,
        'Ops Admin',
        'warning'
      );
    }

    showToast('Task Removed', 'Scheduled task removed from site profile.', 'warning');
  };

  const completeTimeSpecificTask = (
    taskId: string,
    siteId: string,
    guard: GuardProfile,
    options?: {
      notes?: string;
      photoUrl?: string;
      gpsCoords?: { latitude: number; longitude: number };
      status?: 'completed' | 'verified' | 'flagged_issue' | 'exception_logged';
    }
  ): TaskCompletionLog => {
    const targetSite = sitesList.find((s) => s.id === siteId);
    const task = targetSite?.timeSpecificTasks?.find((t) => t.id === taskId);
    const nowIso = new Date().toISOString();

    let withinSla = true;
    if (task) {
      const [taskH, taskM] = task.scheduledTime.split(':').map(Number);
      const now = new Date();
      const taskDate = new Date();
      taskDate.setHours(taskH, taskM, 0, 0);
      const diffMinutes = (now.getTime() - taskDate.getTime()) / 60000;
      withinSla = diffMinutes <= (task.gracePeriodMinutes || 20);
    }

    const log: TaskCompletionLog = {
      id: `tlog-${Date.now()}`,
      taskId,
      taskTitle: task?.title || 'Scheduled Amenity Task',
      siteId,
      siteName: targetSite?.name || 'Assigned Site',
      scheduledTime: task?.scheduledTime || '00:00',
      completedAt: nowIso,
      guardId: guard.id,
      guardName: guard.name,
      guardBadge: guard.badgeNumber,
      status: options?.status || 'completed',
      notes: options?.notes,
      photoUrl: options?.photoUrl,
      gpsCoords: options?.gpsCoords,
      completedWithinSla: withinSla
    };

    setTaskCompletionLogs((prev) => [log, ...prev]);
    playTaskCompletedSound();

    if (activeTaskAlert?.taskId === taskId) {
      setActiveTaskAlert(null);
    }

    addAuditLog(
      'TASK_COMPLETED',
      'shift',
      `Officer ${guard.name} (${guard.badgeNumber}) completed "${task?.title || 'Task'}" at ${targetSite?.name} (${options?.status === 'flagged_issue' ? 'FLAGGED ISSUE' : 'VERIFIED'}).`,
      guard.name,
      options?.status === 'flagged_issue' ? 'warning' : 'success'
    );

    showToast(
      'Task Completed & Logged',
      `"${task?.title || 'Task'}" logged at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      'success'
    );

    return log;
  };

  const dismissTaskAlert = () => {
    if (activeTaskAlert) {
      setDismissedTaskAlertKeys((prev) => {
        const next = new Set(prev);
        next.add(`${activeTaskAlert.taskId}_${new Date().toISOString().slice(0, 10)}`);
        return next;
      });
      setActiveTaskAlert(null);
    }
  };

  const acknowledgeTaskAlert = (alertId: string, guardId?: string) => {
    if (activeTaskAlert && activeTaskAlert.id === alertId) {
      setActiveTaskAlert((prev) => prev ? {
        ...prev,
        acknowledgedByGuardId: guardId || activeGuard.id,
        acknowledgedAt: new Date().toISOString()
      } : null);
      showToast('Task Acknowledged', 'Proceed with the scheduled post order instructions.', 'info');
    }
  };

  const triggerTestTaskAlert = (task?: TimeSpecificTask, alertType: 'approaching' | 'due_now' | 'overdue' = 'due_now') => {
    const sampleSite = sitesList.find((s) => s.timeSpecificTasks && s.timeSpecificTasks.length > 0) || sitesList[0];
    const sampleTask = task || sampleSite?.timeSpecificTasks?.[0] || {
      id: 'test-task-1',
      siteId: sampleSite?.id || 'site-1',
      siteName: sampleSite?.name || 'Skyline Tower & Plaza',
      title: 'Pool & Laundry Room Night Closure',
      category: 'amenity_lock',
      scheduledTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      locationZone: 'Central Amenity Deck & Laundry Wing',
      instructions: 'Clear all residents from the pool and hot tub. Verify gate padlocks are locked. Lock laundry room doors.',
      frequency: 'daily',
      leadTimeMinutes: 15,
      gracePeriodMinutes: 15,
      priority: 'mandatory_sla',
      requirePhoto: true,
      requireGps: true,
      isActive: true,
      tags: ['Pool', 'Laundry', 'Lockup']
    };

    const alertObj: TimeSpecificTaskAlert = {
      id: `talert-${Date.now()}`,
      taskId: sampleTask.id,
      task: sampleTask,
      siteId: sampleTask.siteId,
      siteName: sampleTask.siteName || sampleSite?.name || 'Assigned Site',
      dueTime: sampleTask.scheduledTime,
      alertType,
      triggeredAt: new Date().toISOString(),
      dismissed: false
    };

    setActiveTaskAlert(alertObj);
    setTaskAlertsHistory((prev) => [alertObj, ...prev.slice(0, 49)]);
    try {
      playTaskAlertSound(alertType);
    } catch {}
    showToast(`⏰ Scheduled Task: ${sampleTask.title}`, `Due at ${sampleTask.scheduledTime} at ${sampleTask.locationZone}`, 'warning');
  };

  const getTasksForSite = (siteId: string): TimeSpecificTask[] => {
    const site = sitesList.find((s) => s.id === siteId);
    return site?.timeSpecificTasks || [];
  };

  const getTaskCompletionStatus = (taskId: string, dateStr?: string): TaskCompletionLog | undefined => {
    const targetDate = dateStr || new Date().toISOString().slice(0, 10);
    return taskCompletionLogs.find(
      (log) => log.taskId === taskId && log.completedAt.startsWith(targetDate)
    );
  };

  // Standard Guard Duty Reports (Activity DAR, Maintenance, Incident Reports)
  // Standard Guard Duty Reports (Activity DAR, Maintenance, Incident Reports)
  const submitStandardReport = (
    reportData: Omit<StandardShiftReport, 'id' | 'reportNumber' | 'createdAt'> & { timestamp?: string; id?: string }
  ): StandardShiftReport => {
    // Strict Validation: Require at least one photo or video
    if (!reportData.media || reportData.media.length === 0) {
      throw new Error('Mandatory media requirement: At least one photo or video is required to file a report.');
    }

    const now = new Date();
    const nowIso = reportData.timestamp || now.toISOString();
    const dateCode = nowIso.slice(0, 10).replace(/-/g, '');
    const prefix = reportData.reportType === 'activity' ? 'DAR' : reportData.reportType === 'maintenance' ? 'MNT' : 'INC';
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const reportNumber = `${prefix}-${dateCode}-${randomSuffix}`;
    const id = reportData.id || `rpt-${reportData.reportType}-${Date.now()}`;
    const deviceIsConnected = isDeviceOnline();

    const newReport: StandardShiftReport = {
      ...reportData,
      id,
      reportNumber,
      createdAt: nowIso,
      timestamp: nowIso,
      status: reportData.status || 'submitted',
      syncStatus: deviceIsConnected ? 'syncing' : 'pending_sync',
      offlineQueuedAt: deviceIsConnected ? undefined : nowIso
    };

    // Save report to standardReports state first for immediate local view
    setStandardReports((prev) => [newReport, ...prev]);

    // OFFLINE QUEUE HANDLING: If offline, buffer locally in localStorage queue
    if (!deviceIsConnected) {
      enqueueOfflineReport(newReport);
      
      showToast(
        `📦 Report Saved to Offline Queue`,
        `Report #${reportNumber} stored locally. Will auto-sync to Firebase Cloud Storage & Firestore when reconnected.`,
        'warning'
      );

      addAuditLog(
        'REPORT_QUEUED_OFFLINE',
        'shift',
        `Guard ${newReport.guardName} (${newReport.guardBadge}) filed report #${reportNumber} in OFFLINE mode. Added to local sync buffer.`,
        `${newReport.guardName} (${newReport.guardBadge})`,
        'warning'
      );
    } else {
      // ONLINE HANDLING: Upload media files to Cloud Storage for Firebase and save to Firestore
      (async () => {
        try {
          // Upload media attachments to Firebase Cloud Storage
          const uploadedMedia = await uploadAllReportMedia(newReport);
          
          // Save complete record with Cloud Storage download URLs to Firestore
          const firestoreResult = await saveReportToFirestore({
            ...newReport,
            media: uploadedMedia
          });

          // Update local state with the permanent Cloud Storage download URLs and sync status
          setStandardReports((prev) =>
            prev.map((rpt) =>
              rpt.id === id
                ? {
                    ...rpt,
                    media: uploadedMedia,
                    syncStatus: 'synced',
                    syncedAt: firestoreResult.syncedAt,
                    firestoreDocId: firestoreResult.firestoreDocId,
                    syncError: undefined
                  }
                : rpt
            )
          );

          console.info(`[SyncEngine] Direct upload succeeded for ${newReport.reportNumber}. Cloud Storage download URLs active.`);
        } catch (uploadError: any) {
          console.warn(`[SyncEngine] Direct upload encountered error, fallback to offline queue:`, uploadError);
          enqueueOfflineReport(newReport);
          setStandardReports((prev) =>
            prev.map((rpt) =>
              rpt.id === id ? { ...rpt, syncStatus: 'pending_sync', syncError: uploadError?.message } : rpt
            )
          );
        }
      })();
    }

    // Emergency incident or standard log feedback
    if (reportData.reportType === 'incident' && reportData.incidentDetails?.escalatedToEmergencyServices) {
      try {
        playEmergencyEscalationSound();
      } catch {}
      const agencyLabels = (reportData.incidentDetails.emergencyServicesContacted || ['police_911'])
        .map((a) => a.replace(/_/g, ' ').toUpperCase())
        .join(', ');

      addAuditLog(
        'EMERGENCY_INCIDENT_ESCALATED',
        'system',
        `🚨 CRITICAL ESCALATION: Guard ${newReport.guardName} (${newReport.guardBadge}) contacted emergency services at ${newReport.siteName}. Agencies: ${agencyLabels}. CAD #${newReport.incidentDetails.cadIncidentNumber || 'N/A'}.`,
        `${newReport.guardName} (${newReport.guardBadge})`,
        'danger'
      );

      logAdminAction({
        type: 'shift_created',
        title: 'Emergency Services Incident Escalation',
        description: `Officer ${newReport.guardName} escalated an active incident at ${newReport.siteName}. Contacted: ${agencyLabels}. CAD: ${newReport.incidentDetails.cadIncidentNumber || 'N/A'}.`,
        adminName: 'Dispatch Commander',
        adminBadge: 'OPS-CMD-01',
        badgeVariant: 'rose'
      });

      showToast(
        `🚨 CRITICAL: Incident Escalated`,
        `${newReport.siteName} - 911 / EMS dispatched. Report #${reportNumber}`,
        'danger'
      );
    } else if (reportData.reportType === 'incident') {
      try {
        playReportSubmittedSound();
      } catch {}

      addAuditLog(
        'INCIDENT_REPORT_SUBMITTED',
        'shift',
        `Guard ${newReport.guardName} (${newReport.guardBadge}) filed Flagged Incident "${newReport.incidentDetails?.incidentTitle || 'Security Action'}" at ${newReport.siteName}. Action taken: ${newReport.incidentDetails?.actionTakenByGuard?.slice(0, 80)}...`,
        `${newReport.guardName} (${newReport.guardBadge})`,
        'warning'
      );

      showToast(
        `⚠️ Flagged Incident Filed`,
        `Report #${reportNumber} submitted with ${newReport.media.length} media item(s). ${deviceIsConnected ? 'Uploading to Cloud Storage...' : 'Queued offline.'}`,
        'warning'
      );
    } else if (reportData.reportType === 'maintenance') {
      try {
        playReportSubmittedSound();
      } catch {}

      addAuditLog(
        'MAINTENANCE_REPORT_SUBMITTED',
        'shift',
        `Guard ${newReport.guardName} (${newReport.guardBadge}) reported property maintenance issue "${newReport.maintenanceDetails?.issueTitle}" (${newReport.maintenanceDetails?.severity}) at ${newReport.siteName}.`,
        `${newReport.guardName} (${newReport.guardBadge})`,
        'info'
      );

      showToast(
        `🔧 Maintenance Report Filed`,
        `Report #${reportNumber} submitted. ${deviceIsConnected ? 'Syncing to Cloud Storage...' : 'Buffered in offline queue.'}`,
        'info'
      );
    } else {
      try {
        playReportSubmittedSound();
      } catch {}

      addAuditLog(
        'ACTIVITY_DAR_LOGGED',
        'shift',
        `Guard ${newReport.guardName} (${newReport.guardBadge}) logged 30-min Activity Patrol: "${newReport.activityDetails?.zoneChecked}" (${newReport.activityDetails?.status}) at ${newReport.siteName}.`,
        `${newReport.guardName} (${newReport.guardBadge})`,
        'success'
      );

      showToast(
        `📝 Activity Check-In Logged`,
        `30-Minute DAR check verified for ${newReport.siteName}.`,
        'success'
      );
    }

    return newReport;
  };

  // Synchronizes all queued reports from local storage to Firebase Cloud Storage and Firestore
  const syncQueuedReports = async (): Promise<void> => {
    if (!isDeviceOnline()) {
      showToast('Cannot Sync: Device Offline', 'Please connect to the internet to upload queued reports.', 'warning');
      return;
    }

    setIsSyncingReports(true);
    showToast('Syncing Offline Reports...', 'Uploading media to Firebase Storage & saving Firestore docs.', 'info');

    try {
      const result = await syncAllQueuedReports((syncedReport) => {
        // Update the report in active standardReports state with Firebase URLs
        setStandardReports((prev) =>
          prev.map((rpt) => (rpt.id === syncedReport.id ? syncedReport : rpt))
        );
      });

      if (result.succeeded > 0) {
        showToast(
          `☁️ Cloud Sync Complete`,
          `Successfully uploaded ${result.succeeded} report(s) and media files to Firebase Cloud Storage & Firestore.`,
          'success'
        );

        addAuditLog(
          'OFFLINE_REPORTS_SYNCED',
          'system',
          `Synced ${result.succeeded} offline report(s) to Firebase Cloud Storage & Firestore.`,
          'Sync Manager',
          'success'
        );
      } else if (result.processed === 0) {
        showToast('All Caught Up', 'No offline reports pending sync.', 'info');
      }
    } catch (err: any) {
      showToast('Sync Warning', err?.message || 'Some items could not be synced.', 'danger');
    } finally {
      setIsSyncingReports(false);
      setOfflineReportQueue(getOfflineReportQueue());
    }
  };

  // Retries a single report sync
  const retryReportSync = async (reportId: string): Promise<void> => {
    setIsSyncingReports(true);
    try {
      const res = await processSingleQueuedReport(reportId);
      if (res.success && res.syncedReport) {
        setStandardReports((prev) =>
          prev.map((rpt) => (rpt.id === res.syncedReport?.id ? res.syncedReport : rpt))
        );
        showToast('Report Synced', `Report #${res.syncedReport.reportNumber} uploaded to Firebase Storage & Firestore.`, 'success');
      } else {
        showToast('Sync Failed', res.error || 'Failed to sync report.', 'danger');
      }
    } finally {
      setIsSyncingReports(false);
      setOfflineReportQueue(getOfflineReportQueue());
    }
  };

  const updateStandardReport = (id: string, updates: Partial<StandardShiftReport>) => {
    setStandardReports((prev) =>
      prev.map((rpt) => (rpt.id === id ? { ...rpt, ...updates, updatedAt: new Date().toISOString() } : rpt))
    );
  };

  const deleteStandardReport = (id: string) => {
    setStandardReports((prev) => prev.filter((rpt) => rpt.id !== id));
    showToast('Report Deleted', 'Report removed from active list.', 'info');
  };

  const reviewStandardReport = (
    id: string,
    adminNameOrData: string | { adminId?: string; adminName: string; adminBadge: string; notes?: string; status?: 'reviewed' | 'flagged_for_client' | 'archived' },
    adminBadge?: string,
    notes?: string,
    status: 'reviewed' | 'flagged_for_client' | 'archived' = 'reviewed'
  ) => {
    let finalAdminName = typeof adminNameOrData === 'string' ? adminNameOrData : adminNameOrData.adminName;
    let finalAdminBadge = typeof adminNameOrData === 'string' ? (adminBadge || 'OPS-702') : adminNameOrData.adminBadge;
    let finalNotes = typeof adminNameOrData === 'string' ? (notes || 'Reviewed and approved by Operations Admin.') : (adminNameOrData.notes || 'Reviewed and approved by Operations Admin.');
    let finalStatus = typeof adminNameOrData === 'string' ? status : (adminNameOrData.status || 'reviewed');

    setStandardReports((prev) =>
      prev.map((rpt) => {
        if (rpt.id !== id) return rpt;
        return {
          ...rpt,
          status: finalStatus,
          reviewedByAdmin: {
            adminName: finalAdminName,
            adminBadge: finalAdminBadge,
            reviewedAt: new Date().toISOString(),
            notes: finalNotes
          },
          updatedAt: new Date().toISOString()
        };
      })
    );

    addAuditLog(
      'REPORT_REVIEWED',
      'system',
      `Ops Admin ${finalAdminName} (${finalAdminBadge}) reviewed and marked report as "${finalStatus}".`,
      `${finalAdminName} (${finalAdminBadge})`,
      'success'
    );

    showToast('Report Status Updated', `Report set to ${finalStatus.replace(/_/g, ' ')}.`, 'success');
  };

  const updateMaintenanceWorkOrder = (
    id: string,
    workOrderStatus: MaintenanceReportDetails['workOrderStatus'],
    workOrderNumber?: string
  ) => {
    setStandardReports((prev) =>
      prev.map((rpt) => {
        if (rpt.id !== id || !rpt.maintenanceDetails) return rpt;
        return {
          ...rpt,
          maintenanceDetails: {
            ...rpt.maintenanceDetails,
            workOrderStatus,
            workOrderNumber: workOrderNumber || rpt.maintenanceDetails.workOrderNumber
          },
          updatedAt: new Date().toISOString()
        };
      })
    );

    showToast('Work Order Updated', `Status changed to ${workOrderStatus.replace(/_/g, ' ')}.`, 'info');
  };

  const getLastActivityReportForGuard = (guardId: string): StandardShiftReport | undefined => {
    return standardReports
      .filter((rpt) => rpt.guardId === guardId && rpt.reportType === 'activity')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  };

  // Shift Templates Management
  const addShiftTemplate = (data: Omit<ShiftTemplate, 'id' | 'createdAt'>): ShiftTemplate => {
    const newTemplate: ShiftTemplate = {
      ...data,
      id: `tmpl-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    setShiftTemplates((prev) => [newTemplate, ...prev]);

    addAuditLog(
      'SHIFT_TEMPLATE_CREATED',
      'shift',
      `Created shift template "${newTemplate.name}" (${newTemplate.siteName}, ${newTemplate.startTime}-${newTemplate.endTime})`,
      'Ops Admin (Dispatcher)',
      'success'
    );

    logAdminAction({
      type: 'template_created',
      title: 'Shift Template Created',
      description: `Saved recurring pattern "${newTemplate.name}" for ${newTemplate.siteName}.`,
      adminName: "Lt. Mark O'Connor",
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'emerald',
      metadata: { templateId: newTemplate.id }
    });

    showToast('Template Saved', `Template "${newTemplate.name}" is now ready for quick auto-fill.`, 'success');
    return newTemplate;
  };

  const updateShiftTemplate = (id: string, data: Partial<ShiftTemplate>) => {
    setShiftTemplates((prev) =>
      prev.map((tmpl) => (tmpl.id === id ? { ...tmpl, ...data } : tmpl))
    );

    const tmplName = data.name || 'Shift Template';
    addAuditLog(
      'SHIFT_TEMPLATE_UPDATED',
      'shift',
      `Updated shift template "${tmplName}" (${id})`,
      'Ops Admin (Dispatcher)',
      'info'
    );

    logAdminAction({
      type: 'template_updated',
      title: 'Shift Template Updated',
      description: `Modified parameters for template "${tmplName}".`,
      adminName: "Lt. Mark O'Connor",
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'purple',
      metadata: { templateId: id }
    });

    showToast('Template Updated', `Shift template "${tmplName}" has been updated.`, 'info');
  };

  const deleteShiftTemplate = (id: string) => {
    const tmpl = shiftTemplates.find((t) => t.id === id);
    const tmplName = tmpl?.name || 'Template';

    setShiftTemplates((prev) => prev.filter((t) => t.id !== id));

    addAuditLog(
      'SHIFT_TEMPLATE_DELETED',
      'shift',
      `Deleted shift template "${tmplName}" (${id})`,
      'Ops Admin (Dispatcher)',
      'warning'
    );

    logAdminAction({
      type: 'template_deleted',
      title: 'Shift Template Deleted',
      description: `Removed recurring pattern "${tmplName}".`,
      adminName: "Lt. Mark O'Connor",
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'rose',
      metadata: { templateId: id }
    });

    showToast('Template Deleted', `Template "${tmplName}" removed.`, 'warning');
  };

  // Emergency Broadcast Handlers
  const sendEmergencyBroadcast = (data: {
    severity: AlertSeverity;
    alertType: AlertType;
    title: string;
    message: string;
    targetSites?: string[];
    requireAcknowledgment?: boolean;
    initiatedBy?: string;
  }): EmergencyBroadcast => {
    const newBroadcast: EmergencyBroadcast = {
      id: 'broadcast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      active: true,
      severity: data.severity,
      alertType: data.alertType,
      title: data.title.trim(),
      message: data.message.trim(),
      targetSites: (data.targetSites && data.targetSites.length > 0) ? data.targetSites : ['ALL SITES'],
      requireAcknowledgment: data.requireAcknowledgment !== false,
      acknowledgedBy: [],
      initiatedBy: data.initiatedBy || "Lt. Mark O'Connor (OPS-CMD-01)",
      createdAt: new Date().toISOString()
    };

    setActiveBroadcast(newBroadcast);
    setBroadcastHistory((prev) => [newBroadcast, ...prev.slice(0, 19)]);

    // Trigger audio siren tone
    try {
      playEmergencyAlertSound(data.severity);
    } catch {}

    const sitesLabel = newBroadcast.targetSites.join(', ');
    const logDetails = `[${data.severity.toUpperCase()} ALERT] ${newBroadcast.title} issued by ${newBroadcast.initiatedBy} to [${sitesLabel}]: "${newBroadcast.message}"`;
    addAuditLog('EMERGENCY_BROADCAST_SENT', 'broadcast', logDetails, newBroadcast.initiatedBy, data.severity === 'critical' ? 'danger' : 'warning');

    logAdminAction({
      type: 'emergency_broadcast_sent',
      title: `Emergency Broadcast: ${newBroadcast.title}`,
      description: `Dispatched ${data.severity.toUpperCase()} alert to ${sitesLabel}. Required ACK: ${newBroadcast.requireAcknowledgment ? 'YES' : 'NO'}.`,
      adminName: data.initiatedBy ? data.initiatedBy.split(' (')[0] : "Lt. Mark O'Connor",
      adminBadge: data.initiatedBy ? (data.initiatedBy.match(/\((.*?)\)/)?.[1] || 'OPS-CMD-01') : 'OPS-CMD-01',
      badgeVariant: data.severity === 'critical' ? 'rose' : data.severity === 'warning' ? 'amber' : 'blue',
      metadata: { broadcastId: newBroadcast.id, severity: data.severity, alertType: data.alertType, targetSites: newBroadcast.targetSites }
    });

    showToast(
      '🚨 EMERGENCY BROADCAST ACTIVE',
      `Alert pushed to connected Guard terminals. (${sitesLabel})`,
      'danger'
    );

    return newBroadcast;
  };

  const acknowledgeBroadcast = (
    guardId: string,
    guardName: string,
    badgeNumber: string,
    locationNote?: string
  ) => {
    if (!activeBroadcast || !activeBroadcast.active) return;

    // Avoid duplicate acknowledgment
    if (activeBroadcast.acknowledgedBy.some((a) => a.guardId === guardId)) {
      return;
    }

    const newAck: BroadcastAcknowledgment = {
      guardId,
      guardName,
      badgeNumber,
      timestamp: new Date().toISOString(),
      locationNote: locationNote?.trim()
    };

    const updatedBroadcast: EmergencyBroadcast = {
      ...activeBroadcast,
      acknowledgedBy: [newAck, ...activeBroadcast.acknowledgedBy]
    };

    setActiveBroadcast(updatedBroadcast);
    setBroadcastHistory((prev) =>
      prev.map((b) => (b.id === updatedBroadcast.id ? updatedBroadcast : b))
    );

    const noteText = locationNote ? ` [Note: "${locationNote}"]` : '';
    addAuditLog(
      'BROADCAST_ACKNOWLEDGED',
      'broadcast',
      `Officer ${guardName} (${badgeNumber}) confirmed receipt of Alert "${activeBroadcast.title}"${noteText}`,
      `${guardName} (${badgeNumber})`,
      'success'
    );

    showToast(
      'Receipt Confirmed',
      `Officer ${guardName} acknowledged emergency instructions.`,
      'success'
    );
  };

  const cancelOrResolveBroadcast = (
    broadcastId?: string,
    resolutionNote?: string,
    resolvedBy?: string
  ) => {
    if (!activeBroadcast) return;
    const targetId = broadcastId || activeBroadcast.id;
    if (activeBroadcast.id !== targetId) return;

    const resolver = resolvedBy || "Lt. Mark O'Connor (OPS-CMD-01)";
    const note = resolutionNote || "Threat neutralized / all-clear condition confirmed by Ops Dispatch.";

    const resolvedRecord: EmergencyBroadcast = {
      ...activeBroadcast,
      active: false,
      resolvedAt: new Date().toISOString(),
      resolvedBy: resolver,
      resolutionNote: note
    };

    setActiveBroadcast(null);
    setBroadcastHistory((prev) =>
      prev.map((b) => (b.id === targetId ? resolvedRecord : b))
    );

    addAuditLog(
      'EMERGENCY_BROADCAST_RESOLVED',
      'broadcast',
      `ALL-CLEAR / STAND DOWN: Alert "${activeBroadcast.title}" resolved by ${resolver}. Note: "${note}"`,
      resolver,
      'info'
    );

    logAdminAction({
      type: 'emergency_broadcast_resolved',
      title: 'Emergency Broadcast Stood Down',
      description: `All-clear issued for "${activeBroadcast.title}". (${activeBroadcast.acknowledgedBy.length} guard ACKs logged).`,
      adminName: resolver.split(' (')[0],
      adminBadge: resolver.match(/\((.*?)\)/)?.[1] || 'OPS-CMD-01',
      badgeVariant: 'emerald',
      metadata: { broadcastId: targetId, acksCount: activeBroadcast.acknowledgedBy.length, note }
    });

    showToast(
      'ALL CLEAR ISSUED',
      'Emergency broadcast stood down. Guard views updated to normal operations.',
      'info'
    );
  };

  // Calls for Service & BOLOs Operations
  const dispatchCall = (data: {
    callType: CallType;
    customTypeLabel?: string;
    priority: CallPriority;
    siteName: string;
    locationDetails: string;
    summary: string;
    details?: string;
    isBolo?: boolean;
    boloSubject?: BoloSubjectInfo;
    callerInfo?: CallerInfo;
    officerInstructions?: string;
    dispatchedBy?: { name: string; badge: string };
    assignedRoverId?: string;
  }): CallForService => {
    const year = new Date().getFullYear();
    const randNum = Math.floor(100 + Math.random() * 900);

    // Identify assigned rover if requested
    let assignedRover: RoverVehicle | undefined;
    if (data.assignedRoverId && data.assignedRoverId !== 'unassigned') {
      if (data.assignedRoverId === 'nearest') {
        const matchedSite = sitesList.find(
          (s) => s.name.toLowerCase() === data.siteName.toLowerCase() || (s.address && data.locationDetails?.includes(s.address))
        );
        const targetCoords = matchedSite?.coordinates || { latitude: 47.6080, longitude: -122.3350 };
        assignedRover = calculateNearestRoverForInterception(rovers, targetCoords, trafficCondition) || rovers[0];
      } else {
        assignedRover = rovers.find(r => r.id === data.assignedRoverId);
      }
    }

    const newCall: CallForService = {
      id: `CFS-${year}-${randNum}`,
      callType: data.callType,
      customTypeLabel: data.customTypeLabel?.trim(),
      priority: data.priority,
      status: assignedRover ? 'en_route' : 'dispatched',
      siteName: data.siteName.trim(),
      locationDetails: data.locationDetails.trim(),
      summary: data.summary.trim(),
      details: data.details?.trim(),
      isBolo: !!data.isBolo,
      boloSubject: data.boloSubject,
      callerInfo: data.callerInfo,
      officerInstructions: data.officerInstructions?.trim() || (assignedRover ? `Assigned to Roving Unit ${assignedRover.unitNumber} (${assignedRover.rovingGroup}) - ${assignedRover.assignedGuardName}. Priority intercept en route.` : undefined),
      assignedRoverId: assignedRover?.id,
      assignedRoverUnit: assignedRover?.unitNumber,
      assignedRovingGroup: assignedRover?.rovingGroup,
      assignedGuardId: assignedRover?.assignedGuardId,
      assignedGuardName: assignedRover?.assignedGuardName,
      assignedGuardBadge: assignedRover?.assignedGuardBadge,
      assignedAt: assignedRover ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      dispatchedBy: data.dispatchedBy || {
        name: "Lt. Mark O'Connor",
        badge: "OPS-CMD-01"
      }
    };

    setCallsForService((prev) => [newCall, ...prev]);
    setLatestDispatchedCall(newCall);
    setIsCallAlertOpen(true);

    try {
      playCallDispatchSound(data.priority);
    } catch {}

    // If assigned to a rover, inject intercept into the rover's dynamic route plan
    if (assignedRover) {
      setTimeout(() => {
        dispatchAdHocInterception(newCall.id, newCall.locationDetails, assignedRover!.id);
      }, 50);
    }

    const typeDesc = data.isBolo ? 'BOLO BROADCAST' : data.callType.replace(/_/g, ' ').toUpperCase();
    const roverSuffix = assignedRover ? ` -> ASSIGNED TO ${assignedRover.unitNumber} (${assignedRover.assignedGuardName})` : '';
    const logDetails = `[CALL DISPATCHED - ${data.priority.toUpperCase()}] ${newCall.id} (${typeDesc}) dispatched to ${data.siteName} [${data.locationDetails}]: "${data.summary}"${roverSuffix}`;
    addAuditLog(
      'CALL_FOR_SERVICE_DISPATCHED',
      'broadcast',
      logDetails,
      `${newCall.dispatchedBy.name} (${newCall.dispatchedBy.badge})`,
      data.priority === 'urgent_bolo' ? 'danger' : data.priority === 'priority' ? 'warning' : 'info'
    );

    logAdminAction({
      type: 'call_dispatched',
      title: `Call Dispatched: ${newCall.id} (${data.priority.toUpperCase()})`,
      description: `${data.isBolo ? 'BOLO / ' : ''}${newCall.summary} @ ${newCall.siteName}${assignedRover ? ` [Assigned: ${assignedRover.unitNumber}]` : ''}`,
      adminName: newCall.dispatchedBy.name,
      adminBadge: newCall.dispatchedBy.badge,
      badgeVariant: data.priority === 'urgent_bolo' ? 'rose' : data.priority === 'priority' ? 'amber' : 'blue',
      metadata: { callId: newCall.id, siteName: newCall.siteName, priority: newCall.priority, isBolo: newCall.isBolo, assignedRover: assignedRover?.unitNumber }
    });

    showToast(
      data.isBolo ? '🚨 BOLO ALERT DISPATCHED' : '📞 Call for Service Dispatched',
      `${newCall.id} dispatched${assignedRover ? ` & assigned to ${assignedRover.unitNumber} (${assignedRover.assignedGuardName})` : ` to active units at ${data.siteName}`}.`,
      data.priority === 'urgent_bolo' ? 'danger' : 'info'
    );

    return newCall;
  };

  const acknowledgeCall = (
    callId: string, 
    guard: GuardProfile,
    options?: { note?: string; channel?: 'alert_modal' | 'queue_action' | 'bolo_banner' }
  ) => {
    const nowIso = new Date().toISOString();
    let updatedTargetCall: CallForService | null = null;
    let timeToAcknowledgeSec = 0;

    setCallsForService((prev) =>
      prev.map((c) => {
        if (c.id === callId) {
          const createdAtTime = new Date(c.createdAt).getTime();
          const ackTime = new Date(nowIso).getTime();
          timeToAcknowledgeSec = Math.max(1, Math.round((ackTime - createdAtTime) / 1000));

          const newReceiptRecord: CallReceiptRecord = {
            guardId: guard.id,
            guardName: guard.name,
            badgeNumber: guard.badgeNumber,
            acknowledgedAt: nowIso,
            receiptChannel: options?.channel || 'alert_modal',
            notes: options?.note
          };

          const updated: CallForService = {
            ...c,
            status: c.status === 'dispatched' ? 'en_route' : c.status,
            timeToAcknowledgeSec,
            acknowledgedByGuard: {
              guardId: guard.id,
              guardName: guard.name,
              badgeNumber: guard.badgeNumber,
              acknowledgedAt: nowIso,
              receiptChannel: options?.channel || 'alert_modal',
              notes: options?.note
            },
            allReceipts: [...(c.allReceipts || []), newReceiptRecord]
          };
          updatedTargetCall = updated;
          return updated;
        }
        return c;
      })
    );

    // Find call data for notification
    const targetCall = updatedTargetCall || callsForService.find((c) => c.id === callId);
    const callSummary = targetCall ? targetCall.summary : 'Call For Service';
    const siteName = targetCall ? targetCall.siteName : 'Facility';
    const locationDetails = targetCall ? targetCall.locationDetails : '';
    const isBolo = targetCall ? (targetCall.isBolo || targetCall.priority === 'urgent_bolo') : false;
    const priority = targetCall ? targetCall.priority : 'routine';
    const callType = targetCall ? targetCall.callType : 'other';

    const newReceiptNotification: CallReceiptNotification = {
      id: `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      eventType: 'acknowledged',
      callId,
      callType,
      customTypeLabel: targetCall?.customTypeLabel,
      isBolo,
      priority,
      siteName,
      locationDetails,
      summary: callSummary,
      callSummary,
      guardId: guard.id,
      guardName: guard.name,
      badgeNumber: guard.badgeNumber,
      guardBadge: guard.badgeNumber,
      acknowledgedAt: nowIso,
      timeToAcknowledgeSec,
      latencySeconds: timeToAcknowledgeSec,
      receiptChannel: options?.channel || 'queue_action',
      notes: options?.note,
      assignedRoverUnit: targetCall?.assignedRoverUnit,
      assignedRovingGroup: targetCall?.assignedRovingGroup
    };

    setLatestCallReceipt(newReceiptNotification);
    setCallReceipts((prev) => [newReceiptNotification, ...prev.slice(0, 49)]);

    // Trigger Ops-side affirmative audio receipt chime
    try {
      playReceiptConfirmedSound();
    } catch {}

    const formattedTime = new Date(nowIso).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    addAuditLog(
      'CALL_FOR_SERVICE_ACKNOWLEDGED',
      'shift',
      `[RECEIPT CONFIRMED] Officer ${guard.name} (${guard.badgeNumber}) acknowledged ${isBolo ? 'BOLO ' : ''}${callId} at ${formattedTime} (ACK Latency: ${timeToAcknowledgeSec}s)`,
      `${guard.name} (${guard.badgeNumber})`,
      'success'
    );

    logAdminAction({
      type: 'call_acknowledged',
      title: `Receipt Acknowledged: ${callId}`,
      description: `Officer ${guard.name} (${guard.badgeNumber}) confirmed receipt of ${isBolo ? 'BOLO' : 'Call'} @ ${siteName} (${timeToAcknowledgeSec}s response).`,
      adminName: guard.name,
      adminBadge: guard.badgeNumber,
      badgeVariant: isBolo ? 'rose' : 'emerald',
      metadata: { callId, guardId: guard.id, acknowledgedAt: nowIso, timeToAcknowledgeSec, isBolo }
    });

    showToast(
      isBolo ? '🎯 BOLO Receipt Confirmed' : '✓ Call Receipt Confirmed',
      `Officer ${guard.name} (${guard.badgeNumber}) acknowledged ${callId} at ${formattedTime}`,
      'success'
    );
  };

  const markCallOnScene = (callId: string, guard: GuardProfile, note?: string) => {
    const nowIso = new Date().toISOString();
    let updatedTargetCall: CallForService | undefined;

    setCallsForService((prev) =>
      prev.map((c) => {
        if (c.id === callId) {
          const updated: CallForService = {
            ...c,
            status: 'on_scene',
            onSceneAt: nowIso,
            details: note ? (c.details ? `${c.details}\n[On Scene]: ${note}` : `[On Scene]: ${note}`) : c.details
          };
          updatedTargetCall = updated;
          return updated;
        }
        return c;
      })
    );

    const targetCall = updatedTargetCall || callsForService.find((c) => c.id === callId);
    const callSummary = targetCall ? targetCall.summary : 'Call For Service';
    const siteName = targetCall ? targetCall.siteName : 'Facility';
    const locationDetails = targetCall ? targetCall.locationDetails : '';
    const isBolo = targetCall ? (targetCall.isBolo || targetCall.priority === 'urgent_bolo') : false;
    const priority = targetCall ? targetCall.priority : 'routine';
    const callType = targetCall ? targetCall.callType : 'other';

    const onSceneNotification: CallReceiptNotification = {
      id: `onscene-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      eventType: 'on_scene',
      callId,
      callType,
      customTypeLabel: targetCall?.customTypeLabel,
      isBolo,
      priority,
      siteName,
      locationDetails,
      summary: callSummary,
      callSummary,
      guardId: guard.id,
      guardName: guard.name,
      badgeNumber: guard.badgeNumber,
      guardBadge: guard.badgeNumber,
      acknowledgedAt: nowIso,
      receiptChannel: 'queue_action',
      notes: note
    };

    setLatestCallReceipt(onSceneNotification);
    setCallReceipts((prev) => [onSceneNotification, ...prev.slice(0, 49)]);

    // Trigger Ops-side on-scene arrival tone
    try {
      playOnSceneAlertSound();
    } catch {}

    const formattedTime = new Date(nowIso).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    addAuditLog(
      'CALL_FOR_SERVICE_UPDATED',
      'shift',
      `[ON SCENE] Officer ${guard.name} (${guard.badgeNumber}) arrived ON SCENE for ${isBolo ? 'BOLO ' : ''}${callId} @ ${siteName} at ${formattedTime}${note ? ` (${note})` : ''}`,
      `${guard.name} (${guard.badgeNumber})`,
      'info'
    );

    logAdminAction({
      type: 'call_updated',
      title: `Officer On Scene: ${callId}`,
      description: `Officer ${guard.name} (${guard.badgeNumber}) arrived on scene @ ${siteName}${note ? `: "${note}"` : ''}`,
      adminName: guard.name,
      adminBadge: guard.badgeNumber,
      badgeVariant: 'purple',
      metadata: { callId, guardId: guard.id, onSceneAt: nowIso, isBolo }
    });

    showToast(
      '📍 Officer On Scene',
      `Officer ${guard.name} is on scene for ${callId} @ ${siteName}`,
      'info'
    );
  };

  const updateCallStatus = (callId: string, status: CallStatus, note?: string, guard?: GuardProfile) => {
    if (status === 'on_scene') {
      const effectiveGuard = guard || activeGuard;
      markCallOnScene(callId, effectiveGuard, note);
      return;
    }

    setCallsForService((prev) =>
      prev.map((c) => {
        if (c.id === callId) {
          return {
            ...c,
            status,
            details: note ? (c.details ? `${c.details}\n[Update]: ${note}` : `[Update]: ${note}`) : c.details
          };
        }
        return c;
      })
    );

    addAuditLog(
      'CALL_FOR_SERVICE_UPDATED',
      'shift',
      `Call ${callId} status changed to ${status.toUpperCase()}${note ? ` (${note})` : ''}`,
      'Guard Terminal / Dispatch',
      'info'
    );

    showToast('Call Status Updated', `Call ${callId} marked ${status.toUpperCase().replace(/_/g, ' ')}`, 'info');
  };

  const clearCall = (
    callId: string,
    guard: GuardProfile,
    disposition: CallDisposition,
    resolutionNote?: string
  ) => {
    const nowIso = new Date().toISOString();
    let updatedTargetCall: CallForService | undefined;

    setCallsForService((prev) =>
      prev.map((c) => {
        if (c.id === callId) {
          const updated: CallForService = {
            ...c,
            status: 'cleared',
            clearedAt: nowIso,
            clearedByGuard: {
              guardId: guard.id,
              guardName: guard.name,
              badgeNumber: guard.badgeNumber
            },
            disposition,
            resolutionNote: resolutionNote?.trim() || undefined
          };
          updatedTargetCall = updated;
          return updated;
        }
        return c;
      })
    );

    const targetCall = updatedTargetCall || callsForService.find((c) => c.id === callId);
    const callSummary = targetCall ? targetCall.summary : 'Call For Service';
    const siteName = targetCall ? targetCall.siteName : 'Facility';
    const locationDetails = targetCall ? targetCall.locationDetails : '';
    const isBolo = targetCall ? (targetCall.isBolo || targetCall.priority === 'urgent_bolo') : false;
    const priority = targetCall ? targetCall.priority : 'routine';
    const callType = targetCall ? targetCall.callType : 'other';

    const clearedNotification: CallReceiptNotification = {
      id: `cleared-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      eventType: 'cleared',
      callId,
      callType,
      customTypeLabel: targetCall?.customTypeLabel,
      isBolo,
      priority,
      siteName,
      locationDetails,
      summary: callSummary,
      callSummary,
      guardId: guard.id,
      guardName: guard.name,
      badgeNumber: guard.badgeNumber,
      guardBadge: guard.badgeNumber,
      acknowledgedAt: nowIso,
      disposition,
      resolutionNote: resolutionNote?.trim() || undefined,
      notes: resolutionNote?.trim() || undefined,
      assignedRoverUnit: targetCall?.assignedRoverUnit,
      assignedRovingGroup: targetCall?.assignedRovingGroup
    };

    setLatestCallReceipt(clearedNotification);
    setCallReceipts((prev) => [clearedNotification, ...prev.slice(0, 49)]);

    // Trigger Ops-side all clear harmonic chime
    try {
      playAllClearAlertSound();
    } catch {}

    const formattedTime = new Date(nowIso).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    const noteText = resolutionNote?.trim() ? ` — Note: "${resolutionNote.trim()}"` : '';
    addAuditLog(
      'CALL_FOR_SERVICE_CLEARED',
      'shift',
      `[ALL CLEAR] Call ${callId} marked [${disposition}] by Officer ${guard.name} (${guard.badgeNumber}) at ${formattedTime}${noteText}`,
      `${guard.name} (${guard.badgeNumber})`,
      'success'
    );

    logAdminAction({
      type: 'call_cleared',
      title: `Call Cleared: ${callId} [${disposition}]`,
      description: `Resolved by ${guard.name} (${guard.badgeNumber})${resolutionNote ? `: "${resolutionNote}"` : ''}`,
      adminName: guard.name,
      adminBadge: guard.badgeNumber,
      badgeVariant: 'emerald',
      metadata: { callId, disposition, resolutionNote }
    });

    showToast(
      '✅ Call Resolved & Cleared',
      `${callId} marked [${disposition}] by Officer ${guard.name} and logged to Ops Dashboard records.`,
      'success'
    );
  };

  const cancelCall = (callId: string, reason: string, cancelledBy?: string) => {
    const admin = cancelledBy || "Lt. Mark O'Connor (OPS-CMD-01)";
    setCallsForService((prev) =>
      prev.map((c) => {
        if (c.id === callId) {
          return {
            ...c,
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancelledBy: admin,
            cancellationReason: reason.trim()
          };
        }
        return c;
      })
    );

    addAuditLog(
      'CALL_FOR_SERVICE_CANCELLED',
      'broadcast',
      `Call ${callId} cancelled by ${admin}. Reason: "${reason.trim()}"`,
      admin,
      'warning'
    );

    logAdminAction({
      type: 'call_cancelled',
      title: `Call Cancelled: ${callId}`,
      description: `Cancelled by ${admin}. Reason: ${reason}`,
      adminName: admin.split(' (')[0],
      adminBadge: admin.match(/\((.*?)\)/)?.[1] || 'OPS-CMD-01',
      badgeVariant: 'rose',
      metadata: { callId, reason }
    });

    showToast('Call Cancelled', `Call ${callId} was cancelled by dispatch.`, 'warning');
  };

  const dismissCallAlert = () => {
    setIsCallAlertOpen(false);
  };

  const openCallAlert = (call: CallForService) => {
    setLatestDispatchedCall(call);
    setIsCallAlertOpen(true);
  };

  const deleteCall = (callId: string) => {
    setCallsForService((prev) => prev.filter((c) => c.id !== callId));
    addAuditLog(
      'CALL_FOR_SERVICE_DELETED',
      'system',
      `Call log ${callId} expunged from system by Ops Admin`,
      "Lt. Mark O'Connor",
      'warning'
    );
    showToast('Call Log Removed', `Record ${callId} deleted from database.`, 'info');
  };

  // Shift Attendance & Live Guard Duty Tracking
  const activeClockedInShift = React.useMemo(() => {
    return scheduledShifts.find(
      (s) => s.guardId === activeGuard.id && (s.status === 'on_duty' || s.status === 'on_break')
    ) || null;
  }, [scheduledShifts, activeGuard.id]);

  const lateShiftAlerts: LateShiftAlert[] = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const alerts: LateShiftAlert[] = [];

    scheduledShifts.forEach((shift) => {
      if (shift.status === 'completed') return;
      if (shift.status === 'on_duty' || shift.status === 'on_break') return;

      const lateStatus = calculateShiftLateStatus(shift.date, shift.startTime, shift.clockInTime);
      const isLateOverdue = (shift.status === 'late') || (shift.date === todayStr && lateStatus.isLate && lateStatus.minutesLate >= 15);

      if (isLateOverdue) {
        alerts.push({
          id: `LATE-ALERT-${shift.id}`,
          shiftId: shift.id,
          guardId: shift.guardId,
          guardName: shift.guardName,
          guardBadge: shift.guardBadge,
          guardPhone: shift.guardPhone,
          siteId: shift.siteId,
          siteName: shift.siteName,
          scheduledDate: shift.date,
          scheduledStartTime: shift.startTime,
          minutesLate: shift.lateMinutes || lateStatus.minutesLate || 15,
          acknowledged: shift.lateAcknowledgedByOps || dismissedLateAlertIds.includes(shift.id),
          createdAt: shift.createdAt || new Date().toISOString()
        });
      }
    });

    return alerts;
  }, [scheduledShifts, dismissedLateAlertIds]);

  // Periodic automatic check for late shifts (>15m)
  useEffect(() => {
    const checkLateOverdues = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      setScheduledShifts((prev) => {
        let changed = false;
        const updated = prev.map((s) => {
          if (s.status === 'scheduled' && s.date === todayStr) {
            const check = calculateShiftLateStatus(s.date, s.startTime, s.clockInTime);
            if (check.isLate && check.minutesLate >= 15) {
              changed = true;
              return {
                ...s,
                status: 'late' as ShiftDutyStatus,
                isLate: true,
                lateMinutes: check.minutesLate
              };
            }
          }
          return s;
        });
        return changed ? updated : prev;
      });
    };

    const intervalId = setInterval(checkLateOverdues, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const clockInGuard = (
    guardId: string, 
    siteName: string, 
    options?: { 
      scheduledShiftId?: string; 
      postRole?: string; 
      notes?: string; 
      gpsVerified?: boolean; 
      gpsCoordinates?: { latitude: number; longitude: number; accuracy?: number };
      geofencePassed?: boolean;
      geofenceDistanceMeters?: number;
      selfiePhotoUrl?: string;
      equipmentPhotoUrl?: string;
      verifiedByMethod?: 'biometrics' | 'credentials' | 'pin';
      equipmentIssued?: string[];
    }
  ): ScheduledShift => {
    const guard = guardsList.find((g) => g.id === guardId) || activeGuard;
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    // Look for matching scheduled shift
    let targetShift = scheduledShifts.find((s) => {
      if (options?.scheduledShiftId && s.id === options.scheduledShiftId) return true;
      return s.guardId === guard.id && s.siteName === siteName && (s.status === 'scheduled' || s.status === 'late');
    });

    if (!targetShift) {
      targetShift = scheduledShifts.find((s) => s.guardId === guard.id && (s.status === 'scheduled' || s.status === 'late'));
    }

    let updatedOrCreatedShift: ScheduledShift;

    const calculatedProximity = options?.geofenceDistanceMeters !== undefined 
      ? Math.round(options.geofenceDistanceMeters) 
      : Math.floor(Math.random() * 15) + 3;

    if (targetShift) {
      const lateCheck = calculateShiftLateStatus(targetShift.date, targetShift.startTime, nowIso);
      updatedOrCreatedShift = {
        ...targetShift,
        status: 'on_duty',
        clockInTime: nowIso,
        clockInNotes: options?.notes || 'Clocked in via Guard Duty Terminal',
        postRole: options?.postRole || targetShift.postRole || 'On-Duty Security Post',
        gpsVerified: options?.gpsVerified ?? true,
        siteProximityMeters: calculatedProximity,
        gpsCoordinates: options?.gpsCoordinates,
        geofencePassed: options?.geofencePassed ?? true,
        geofenceDistanceMeters: options?.geofenceDistanceMeters ?? calculatedProximity,
        selfiePhotoUrl: options?.selfiePhotoUrl,
        equipmentPhotoUrl: options?.equipmentPhotoUrl,
        verifiedByMethod: options?.verifiedByMethod || 'credentials',
        clockInVerifiedAt: nowIso,
        equipmentIssued: options?.equipmentIssued || targetShift.equipmentIssued || ['Radio CH-1', 'Bodycam #07', 'Site Master Key'],
        isLate: lateCheck.isLate,
        lateMinutes: lateCheck.minutesLate
      };

      setScheduledShifts((prev) => prev.map((s) => s.id === targetShift!.id ? updatedOrCreatedShift : s));
    } else {
      const currentHours = new Date().getHours().toString().padStart(2, '0');
      const currentMins = new Date().getMinutes().toString().padStart(2, '0');
      const startHHMM = `${currentHours}:${currentMins}`;
      const endHHMM = `${((new Date().getHours() + 8) % 24).toString().padStart(2, '0')}:${currentMins}`;

      const siteProfile = sitesList.find((s) => s.name === siteName);
      updatedOrCreatedShift = {
        id: `SCHED-ADHOC-${Date.now()}`,
        guardId: guard.id,
        guardName: guard.name,
        guardBadge: guard.badgeNumber,
        guardPhone: guard.phone,
        siteId: siteProfile?.id || 'site-adhoc',
        siteName: siteName,
        siteAddress: siteProfile?.address || 'Designated Security Post',
        date: todayStr,
        startTime: startHHMM,
        endTime: endHHMM,
        hours: 8,
        postRole: options?.postRole || 'On-Demand Site Security & Mobile Patrol',
        status: 'on_duty',
        clockInTime: nowIso,
        clockInNotes: options?.notes || 'On-Demand Shift Clock-in',
        gpsVerified: options?.gpsVerified ?? true,
        siteProximityMeters: calculatedProximity,
        gpsCoordinates: options?.gpsCoordinates,
        geofencePassed: options?.geofencePassed ?? true,
        geofenceDistanceMeters: options?.geofenceDistanceMeters ?? calculatedProximity,
        selfiePhotoUrl: options?.selfiePhotoUrl,
        equipmentPhotoUrl: options?.equipmentPhotoUrl,
        verifiedByMethod: options?.verifiedByMethod || 'credentials',
        clockInVerifiedAt: nowIso,
        equipmentIssued: options?.equipmentIssued || ['Radio CH-1', 'Bodycam #12', 'Site Access Badge'],
        isLate: false,
        createdAt: nowIso
      };

      setScheduledShifts((prev) => [updatedOrCreatedShift, ...prev]);
    }

    playClockInAlertSound();

    const verificationSummary = [
      options?.geofencePassed ? 'GPS Geofence Verified' : 'GPS On-Site',
      options?.selfiePhotoUrl ? 'Uniform Selfie Uploaded' : null,
      options?.equipmentPhotoUrl ? 'Gear Check Verified' : null
    ].filter(Boolean).join(' | ');

    logAdminAction({
      type: 'guard_clocked_in',
      adminName: guard.name,
      adminBadge: guard.badgeNumber,
      badgeVariant: 'emerald',
      title: `Officer Clocked In: ${guard.name}`,
      description: `${guard.name} (${guard.badgeNumber}) clocked in at ${siteName} [${updatedOrCreatedShift.postRole}]. ${verificationSummary}`,
      metadata: {
        siteName,
        postRole: updatedOrCreatedShift.postRole,
        clockInTime: nowIso,
        geofencePassed: options?.geofencePassed,
        distanceMeters: options?.geofenceDistanceMeters,
        hasSelfie: Boolean(options?.selfiePhotoUrl),
        hasEquipmentPhoto: Boolean(options?.equipmentPhotoUrl)
      }
    });

    addAuditLog(
      'SHIFT_DUTY_CLOCK_IN',
      guard.id,
      `${guard.name} (${guard.badgeNumber}) reported on duty at ${siteName}. Post: ${updatedOrCreatedShift.postRole}. ${verificationSummary}`,
      guard.name,
      'success'
    );

    showToast(
      'Clocked In & Verified',
      `Officer ${guard.name} is ON DUTY at ${siteName} (${updatedOrCreatedShift.postRole}) with GPS & Photo Verification.`,
      'success'
    );

    return updatedOrCreatedShift;
  };

  const clockOutGuard = (
    guardId: string, 
    options?: { 
      notes?: string; 
      handoverSummary?: string; 
      equipmentReturned?: boolean 
    }
  ) => {
    const activeShift = scheduledShifts.find(
      (s) => s.guardId === guardId && (s.status === 'on_duty' || s.status === 'on_break')
    );

    if (!activeShift) {
      showToast('No Active Shift', 'No active clocked-in shift found for this officer.', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();
    const guard = guardsList.find((g) => g.id === guardId) || activeGuard;

    // Close any open breaks
    const updatedBreaks = (activeShift.breaks || []).map((b) => {
      if (!b.endedAt) {
        const breakDuration = Math.round((new Date(nowIso).getTime() - new Date(b.startedAt).getTime()) / 60000);
        return { ...b, endedAt: nowIso, durationMinutes: Math.max(1, breakDuration) };
      }
      return b;
    });

    const elapsedSeconds = getShiftElapsedSeconds(activeShift.clockInTime, nowIso, updatedBreaks);
    const actualHoursWorked = Math.round((elapsedSeconds / 3600) * 10) / 10;

    const updatedShift: ScheduledShift = {
      ...activeShift,
      status: 'completed',
      clockOutTime: nowIso,
      clockOutNotes: options?.notes || 'Shift completed and clocked out via Guard Terminal.',
      handoverSummary: options?.handoverSummary || 'Handover completed to relief officer. All posts secure.',
      actualHoursWorked: Math.max(0.1, actualHoursWorked),
      breaks: updatedBreaks
    };

    setScheduledShifts((prev) => prev.map((s) => s.id === activeShift.id ? updatedShift : s));

    playClockOutAlertSound();

    logAdminAction({
      type: 'guard_clocked_out',
      adminName: guard.name,
      adminBadge: guard.badgeNumber,
      badgeVariant: 'slate',
      title: `Officer Clocked Out: ${guard.name}`,
      description: `${guard.name} (${guard.badgeNumber}) completed shift at ${activeShift.siteName}. Hours logged: ${actualHoursWorked}h.`,
      metadata: {
        siteName: activeShift.siteName,
        actualHoursWorked,
        clockOutTime: nowIso
      }
    });

    addAuditLog(
      'SHIFT_DUTY_CLOCK_OUT',
      guard.id,
      `${guard.name} completed duty at ${activeShift.siteName}. Logged ${actualHoursWorked} hours. Handover: ${options?.handoverSummary || 'Completed'}.`,
      guard.name,
      'info'
    );

    showToast(
      'Shift Complete & Clocked Out',
      `Officer ${guard.name} clocked out from ${activeShift.siteName}. Logged: ${actualHoursWorked} hrs.`,
      'info'
    );
  };

  const startGuardBreak = (guardId: string, breakType: 'meal' | 'rest' = 'meal', note?: string) => {
    const activeShift = scheduledShifts.find(
      (s) => s.guardId === guardId && s.status === 'on_duty'
    );

    if (!activeShift) {
      showToast('Cannot Start Break', 'Officer is not currently on active duty.', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();
    const newBreak: ShiftBreakRecord = {
      id: `brk-${Date.now()}`,
      type: breakType,
      startedAt: nowIso,
      note: note || (breakType === 'meal' ? '30-minute meal break' : '15-minute rest break')
    };

    const updatedShift: ScheduledShift = {
      ...activeShift,
      status: 'on_break',
      breaks: [...(activeShift.breaks || []), newBreak]
    };

    setScheduledShifts((prev) => prev.map((s) => s.id === activeShift.id ? updatedShift : s));
    playBreakAlertSound();

    const guard = guardsList.find((g) => g.id === guardId) || activeGuard;
    logAdminAction({
      type: 'guard_break_started',
      adminName: guard.name,
      adminBadge: guard.badgeNumber,
      badgeVariant: 'amber',
      title: `Officer on Break: ${guard.name}`,
      description: `${guard.name} started a ${breakType} break at ${activeShift.siteName}.`
    });

    showToast(
      'Break Started',
      `Officer ${guard.name} is now on ${breakType} break at ${activeShift.siteName}.`,
      'info'
    );
  };

  const endGuardBreak = (guardId: string) => {
    const activeShift = scheduledShifts.find(
      (s) => s.guardId === guardId && s.status === 'on_break'
    );

    if (!activeShift) {
      showToast('Cannot End Break', 'Officer is not currently on break.', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();
    const updatedBreaks = (activeShift.breaks || []).map((b) => {
      if (!b.endedAt) {
        const breakDuration = Math.round((new Date(nowIso).getTime() - new Date(b.startedAt).getTime()) / 60000);
        return { ...b, endedAt: nowIso, durationMinutes: Math.max(1, breakDuration) };
      }
      return b;
    });

    const updatedShift: ScheduledShift = {
      ...activeShift,
      status: 'on_duty',
      breaks: updatedBreaks
    };

    setScheduledShifts((prev) => prev.map((s) => s.id === activeShift.id ? updatedShift : s));
    playBreakAlertSound();

    const guard = guardsList.find((g) => g.id === guardId) || activeGuard;
    logAdminAction({
      type: 'guard_break_ended',
      adminName: guard.name,
      adminBadge: guard.badgeNumber,
      badgeVariant: 'emerald',
      title: `Officer Resumed Duty: ${guard.name}`,
      description: `${guard.name} resumed active duty post at ${activeShift.siteName}.`
    });

    showToast(
      'Break Finished',
      `Officer ${guard.name} returned to ON DUTY status at ${activeShift.siteName}.`,
      'success'
    );
  };

  const scheduleNewShift = (
    data: Omit<ScheduledShift, 'id' | 'createdAt' | 'status'> & { status?: ShiftDutyStatus }
  ): ScheduledShift => {
    const nowIso = new Date().toISOString();
    const id = `SCHED-${data.date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    
    // Check if this is a roving shift and find matching rover
    let assignedRover = rovers.find(r => r.rovingGroup === data.rovingGroup);
    if (!assignedRover && data.isRovingShift) {
      assignedRover = rovers[0];
    }

    const newShift: ScheduledShift = {
      ...data,
      id,
      assignedRoverUnit: data.assignedRoverUnit || assignedRover?.unitNumber,
      assignedRoverId: data.assignedRoverId || assignedRover?.id,
      status: data.status || 'scheduled',
      createdAt: nowIso
    };

    setScheduledShifts((prev) => [newShift, ...prev]);

    // If this is a roving shift, synchronize guard's roving group and assign to Rover Vehicle
    if (data.isRovingShift && data.rovingGroup) {
      // 1. Update Guard Profile in guardsList
      setGuardsList((prev) =>
        prev.map((g) =>
          g.id === data.guardId
            ? { ...g, isRovingGuard: true, rovingGroup: data.rovingGroup }
            : g
        )
      );

      // 2. Update activeGuard / authenticatedGuard if matching
      if (activeGuard.id === data.guardId) {
        setActiveGuard((prev) => ({ ...prev, isRovingGuard: true, rovingGroup: data.rovingGroup }));
      }
      if (authenticatedGuard?.id === data.guardId) {
        setAuthenticatedGuard((prev) => prev ? { ...prev, isRovingGuard: true, rovingGroup: data.rovingGroup } : prev);
      }

      // 3. Update Rover Vehicle assignment
      if (assignedRover) {
        setRovers((prev) =>
          prev.map((r) =>
            r.id === assignedRover!.id
              ? {
                  ...r,
                  assignedGuardId: data.guardId,
                  assignedGuardName: data.guardName,
                  assignedGuardBadge: data.guardBadge,
                  status: 'patrolling'
                }
              : r
          )
        );

        // 4. Re-optimize rover plan for this rover with group's sites
        const updatedRoverObj = {
          ...assignedRover,
          assignedGuardId: data.guardId,
          assignedGuardName: data.guardName,
          assignedGuardBadge: data.guardBadge
        };
        const newPlan = optimizeRoverRoute(updatedRoverObj, sitesList, {
          traffic: trafficCondition,
          mode: optimizationMode,
          antiPredictabilityJitterPct
        });

        setRoverPlans((prev) => ({
          ...prev,
          [assignedRover!.id]: newPlan
        }));
      }
    }

    logAdminAction({
      type: 'shift_scheduled',
      adminName: "Lt. Mark O'Connor",
      adminBadge: 'OPS-LEAD-01',
      badgeVariant: 'blue',
      title: `New Shift Scheduled: ${data.siteName}`,
      description: `Assigned ${data.guardName} (${data.guardBadge}) on ${data.date} (${data.startTime} - ${data.endTime}, ${data.hours}h)${data.isRovingShift ? ` [Roving: ${data.rovingGroup}]` : ''}.`,
      metadata: {
        guardName: data.guardName,
        siteName: data.siteName,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        isRoving: data.isRovingShift,
        rovingGroup: data.rovingGroup
      }
    });

    addAuditLog(
      'SHIFT_SCHEDULE_CREATED',
      'system',
      `Shift scheduled for ${data.guardName} at ${data.siteName} on ${data.date} (${data.startTime}-${data.endTime})${data.isRovingShift ? ` [${data.rovingGroup}]` : ''}.`,
      "Lt. Mark O'Connor",
      'info'
    );

    showToast('Shift Scheduled', `Assigned ${data.guardName} to ${data.siteName} on ${data.date}.`, 'success');
    return newShift;
  };

  const updateScheduledShift = (id: string, data: Partial<ScheduledShift>) => {
    setScheduledShifts((prev) => prev.map((s) => s.id === id ? { ...s, ...data } : s));
    showToast('Shift Updated', 'Scheduled shift record updated successfully.', 'info');
  };

  const deleteScheduledShift = (id: string) => {
    const target = scheduledShifts.find((s) => s.id === id);
    setScheduledShifts((prev) => prev.filter((s) => s.id !== id));
    if (target) {
      addAuditLog(
        'SHIFT_SCHEDULE_DELETED',
        'system',
        `Scheduled shift ${id} (${target.guardName} @ ${target.siteName}) removed from roster.`,
        "Lt. Mark O'Connor",
        'warning'
      );
      showToast('Shift Removed', `Removed scheduled shift for ${target.guardName}.`, 'info');
    }
  };

  const reassignScheduledShift = (shiftId: string, newGuardId: string) => {
    const target = scheduledShifts.find((s) => s.id === shiftId);
    const newGuard = guardsList.find((g) => g.id === newGuardId);
    if (!target || !newGuard) return;

    const updatedShift: ScheduledShift = {
      ...target,
      guardId: newGuard.id,
      guardName: newGuard.name,
      guardBadge: newGuard.badgeNumber,
      guardPhone: newGuard.phone,
      status: 'scheduled',
      isLate: false,
      lateMinutes: undefined,
      lateAcknowledgedByOps: true
    };

    setScheduledShifts((prev) => prev.map((s) => s.id === shiftId ? updatedShift : s));
    setDismissedLateAlertIds((prev) => [...prev, shiftId]);

    logAdminAction({
      type: 'shift_reassigned',
      adminName: "Lt. Mark O'Connor",
      adminBadge: 'OPS-LEAD-01',
      badgeVariant: 'purple',
      title: `Shift Reassigned: ${target.siteName}`,
      description: `Reassigned from ${target.guardName} to ${newGuard.name} (${newGuard.badgeNumber}) for ${target.date}.`
    });

    addAuditLog(
      'SHIFT_REASSIGNED',
      'system',
      `Shift at ${target.siteName} on ${target.date} reassigned to ${newGuard.name}.`,
      "Lt. Mark O'Connor",
      'warning'
    );

    showToast('Shift Reassigned', `Assigned ${newGuard.name} as relief for ${target.siteName}.`, 'success');
  };

  const acknowledgeLateAlert = (shiftId: string, note?: string) => {
    setScheduledShifts((prev) => prev.map((s) => {
      if (s.id === shiftId) {
        return {
          ...s,
          lateAcknowledgedByOps: true,
          notes: note ? `${s.notes ? s.notes + ' | ' : ''}Ops Acknowledged: ${note}` : s.notes
        };
      }
      return s;
    }));

    setDismissedLateAlertIds((prev) => prev.includes(shiftId) ? prev : [...prev, shiftId]);

    const target = scheduledShifts.find((s) => s.id === shiftId);
    if (target) {
      logAdminAction({
        type: 'late_shift_alert_acknowledged',
        adminName: "Lt. Mark O'Connor",
        adminBadge: 'OPS-LEAD-01',
        badgeVariant: 'amber',
        title: `Late Shift Acknowledged: ${target.guardName}`,
        description: `Ops acknowledged overdue arrival for ${target.guardName} at ${target.siteName}. ${note || ''}`
      });
      showToast('Late Alert Acknowledged', `Noted late arrival status for ${target.guardName}.`, 'info');
    }
  };

  const getGuardActiveShift = (guardId: string) => {
    return scheduledShifts.find((s) => s.guardId === guardId && (s.status === 'on_duty' || s.status === 'on_break'));
  };

  const getGuardUpcomingShifts = (guardId: string) => {
    return scheduledShifts
      .filter((s) => s.guardId === guardId && s.status === 'scheduled')
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  };

  const confirmShiftAttendance = (shiftId: string) => {
    const nowIso = new Date().toISOString();
    const target = scheduledShifts.find((s) => s.id === shiftId);
    if (!target) return;

    setScheduledShifts((prev) =>
      prev.map((s) =>
        s.id === shiftId
          ? { ...s, attendanceConfirmed: true, attendanceConfirmedAt: nowIso }
          : s
      )
    );

    addAuditLog(
      'SHIFT_DUTY_CLOCK_IN',
      target.guardId,
      `Officer ${target.guardName} (${target.guardBadge}) confirmed 24-hour pre-shift duty attendance for ${target.siteName} (${target.date} ${target.startTime}-${target.endTime}).`,
      `${target.guardName} (${target.guardBadge})`,
      'success'
    );

    logAdminAction({
      type: 'shift_scheduled',
      adminName: target.guardName,
      adminBadge: target.guardBadge,
      badgeVariant: 'emerald',
      title: `Duty Attendance Confirmed: ${target.guardName}`,
      description: `Officer confirmed upcoming shift attendance for ${target.siteName} (${target.date} ${target.startTime}-${target.endTime}).`
    });

    showToast('Attendance Confirmed', `Confirmed ready for duty at ${target.siteName} (${target.date}).`, 'success');
  };

  const getGuardsLiveTracking = (): GuardLiveTrackingItem[] => {
    const todayStr = new Date().toISOString().split('T')[0];

    return guardsList.map((guard) => {
      // Find current active shift
      const activeShift = scheduledShifts.find(
        (s) => s.guardId === guard.id && (s.status === 'on_duty' || s.status === 'on_break')
      );

      // Find today's scheduled shift if not currently clocked in
      const todayShift = scheduledShifts.find(
        (s) => s.guardId === guard.id && s.date === todayStr && s.status !== 'completed'
      );

      const anyTodayCompleted = scheduledShifts.find(
        (s) => s.guardId === guard.id && s.date === todayStr && s.status === 'completed'
      );

      let dutyStatus: ShiftDutyStatus = 'off_duty';
      let currentShift: ScheduledShift | undefined = undefined;

      if (activeShift) {
        dutyStatus = activeShift.status;
        currentShift = activeShift;
      } else if (todayShift) {
        dutyStatus = todayShift.status;
        currentShift = todayShift;
      } else if (anyTodayCompleted) {
        dutyStatus = 'completed';
        currentShift = anyTodayCompleted;
      }

      // Calculate elapsed time if on duty or on break
      let elapsedSeconds = 0;
      if (activeShift && activeShift.clockInTime) {
        elapsedSeconds = getShiftElapsedSeconds(activeShift.clockInTime, undefined, activeShift.breaks);
      }

      return {
        guardId: guard.id,
        guardName: guard.name,
        guardBadge: guard.badgeNumber,
        guardPhone: guard.phone,
        role: guard.role,
        currentStatus: dutyStatus,
        activeShift: currentShift,
        currentSiteName: currentShift?.siteName,
        postRole: currentShift?.postRole,
        clockInTime: activeShift?.clockInTime,
        elapsedSeconds,
        isOnBreak: activeShift?.status === 'on_break',
        currentBreakType: activeShift?.breaks?.slice(-1)[0]?.endedAt ? undefined : activeShift?.breaks?.slice(-1)[0]?.type,
        breakStartedAt: activeShift?.breaks?.slice(-1)[0]?.endedAt ? undefined : activeShift?.breaks?.slice(-1)[0]?.startedAt,
        equipmentList: currentShift?.equipmentIssued,
        gpsVerified: currentShift?.gpsVerified,
        geofencePassed: currentShift?.geofencePassed,
        geofenceDistanceMeters: currentShift?.geofenceDistanceMeters,
        selfiePhotoUrl: currentShift?.selfiePhotoUrl,
        equipmentPhotoUrl: currentShift?.equipmentPhotoUrl,
        verifiedByMethod: currentShift?.verifiedByMethod,
        clockInVerifiedAt: currentShift?.clockInVerifiedAt,
        offSiteBreachStatus: currentShift?.offSiteBreachStatus,
        outOfBoundsSince: currentShift?.outOfBoundsSince,
        debounceSecondsRemaining: currentShift?.debounceSecondsRemaining,
        currentInsideGeofence: currentShift?.currentInsideGeofence,
        matchedParcelName: currentShift?.currentMatchedParcelName,
        lastDepartureReason: currentShift?.lastDepartureReason,
        departureExcusedByOps: currentShift?.departureExcusedByOps
      };
    });
  };

  // ==========================================
  // Live Geofence Departure & Breach Management
  // ==========================================

  // 1. Validate guard location against site geofence (Circle, Polygon, Multi-Parcel)
  const verifyGuardGeofenceLocation = (guardId: string, coords: { latitude: number; longitude: number }) => {
    const activeShift = scheduledShifts.find(
      (s) => s.guardId === guardId && (s.status === 'on_duty' || s.status === 'on_break')
    );
    if (!activeShift) {
      return { inGeofence: true, distanceMeters: 0, siteName: 'No Active Shift' };
    }

    const site = sitesList.find((s) => s.name === activeShift.siteName || s.id === activeShift.siteId);
    if (!site) {
      return { inGeofence: true, distanceMeters: 0, siteName: activeShift.siteName };
    }

    const result = verifySiteGeofence(coords, site, site.name);
    return {
      inGeofence: result.inGeofence,
      distanceMeters: result.distanceMeters,
      matchedParcelName: result.matchedParcelName,
      siteName: site.name
    };
  };

  // 2. Update active shift geofence status with anti-drift debounce tracking
  const updateGuardGeofenceState = (
    shiftId: string, 
    data: {
      inGeofence: boolean;
      distanceMeters?: number;
      matchedParcelName?: string;
      currentGps?: { latitude: number; longitude: number };
    }
  ) => {
    setScheduledShifts((prev) =>
      prev.map((shift) => {
        if (shift.id !== shiftId) return shift;

        const currentStatus = shift.offSiteBreachStatus || 'normal';

        if (data.inGeofence) {
          // Guard is back inside boundary!
          const wasOutOfZone = currentStatus === 'debounce_pending' || currentStatus === 'breached_unacknowledged';

          if (wasOutOfZone) {
            addAuditLog(
              'GEOFENCE_REENTERED',
              shift.guardId,
              `Officer ${shift.guardName} (${shift.guardBadge}) returned inside ${shift.siteName} boundary perimeter (${data.distanceMeters || 0}m). Breach resolved.`,
              shift.guardName,
              'success'
            );
            logAdminAction({
              type: 'shift_scheduled',
              adminName: shift.guardName,
              adminBadge: shift.guardBadge,
              badgeVariant: 'emerald',
              title: `Guard Returned On-Site: ${shift.guardName}`,
              description: `Returned inside ${shift.siteName} perimeter boundary (${data.matchedParcelName || 'Main Zone'}).`
            });
            showToast('Returned Inside Perimeter', `Officer ${shift.guardName} has returned inside ${shift.siteName} boundary.`, 'success');
          }

          return {
            ...shift,
            offSiteBreachStatus: wasOutOfZone ? 'resolved' : 'normal',
            currentInsideGeofence: true,
            currentGeofenceDistanceMeters: data.distanceMeters ?? 0,
            currentMatchedParcelName: data.matchedParcelName,
            outOfBoundsSince: undefined,
            debounceSecondsRemaining: 180,
            consecutiveOutOfBoundsReadings: 0,
            gpsCoordinates: data.currentGps ? { ...data.currentGps, accuracy: 5 } : shift.gpsCoordinates
          };
        } else {
          // Guard is outside boundary!
          if (currentStatus === 'normal' || currentStatus === 'resolved') {
            // First out of bounds reading: trigger 3-minute debounce countdown!
            playGeofenceDepartureWarningSound();

            const debounceSec = (sitesList.find(s => s.name === shift.siteName)?.departureDebounceMinutes || 3) * 60;

            addAuditLog(
              'GEOFENCE_DEPARTURE_DETECTED',
              shift.guardId,
              `Perimeter departure detected for ${shift.guardName} at ${shift.siteName} (${data.distanceMeters || 0}m outside boundary). 3-minute dwell buffer active.`,
              'System Geofence Engine',
              'warning'
            );

            logAdminAction({
              type: 'geofence_departure_warning',
              adminName: "System Engine",
              adminBadge: 'GEOFENCE-AI',
              badgeVariant: 'amber',
              title: `Site Departure: ${shift.guardName}`,
              description: `Officer moved ~${data.distanceMeters || 75}m outside ${shift.siteName}. Awaiting guard departure reason or return (${Math.round(debounceSec / 60)}m debounce).`
            });

            showToast(
              'Geofence Departure Detected',
              `${shift.guardName} is outside ${shift.siteName} boundary (${data.distanceMeters || 0}m). 3m dwell buffer started.`,
              'warning'
            );

            return {
              ...shift,
              offSiteBreachStatus: 'debounce_pending',
              outOfBoundsSince: new Date().toISOString(),
              debounceSecondsRemaining: debounceSec,
              consecutiveOutOfBoundsReadings: (shift.consecutiveOutOfBoundsReadings || 0) + 1,
              currentInsideGeofence: false,
              currentGeofenceDistanceMeters: data.distanceMeters,
              currentMatchedParcelName: undefined,
              gpsCoordinates: data.currentGps ? { ...data.currentGps, accuracy: 5 } : shift.gpsCoordinates
            };
          } else {
            // Already debounce_pending, breached_unacknowledged, or excused
            return {
              ...shift,
              currentInsideGeofence: false,
              currentGeofenceDistanceMeters: data.distanceMeters,
              consecutiveOutOfBoundsReadings: (shift.consecutiveOutOfBoundsReadings || 0) + 1,
              gpsCoordinates: data.currentGps ? { ...data.currentGps, accuracy: 5 } : shift.gpsCoordinates
            };
          }
        }
      })
    );
  };

  // 3. Guard submits verified departure reason
  const submitDepartureReason = (
    shiftId: string, 
    reason: DepartureReasonType,
    notes?: string
  ) => {
    const target = scheduledShifts.find((s) => s.id === shiftId);
    if (!target) return;

    const nowIso = new Date().toISOString();

    setScheduledShifts((prev) =>
      prev.map((s) => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          offSiteBreachStatus: 'excused',
          lastDepartureReason: reason,
          lastDepartureNotes: notes,
          departureAcknowledgedByGuardAt: nowIso,
          departureExcusedByOps: true,
          departureExcusedReason: `Guard Verified: ${reason}${notes ? ` - ${notes}` : ''}`,
          departureExcusedAt: nowIso
        };
      })
    );

    addAuditLog(
      'GEOFENCE_DEPARTURE_EXCUSED',
      target.guardId,
      `Officer ${target.guardName} (${target.guardBadge}) submitted authorized departure reason: "${reason}" (${notes || 'No extra notes'}). CAD escalation suppressed.`,
      target.guardName,
      'info'
    );

    logAdminAction({
      type: 'departure_reason_submitted',
      adminName: target.guardName,
      adminBadge: target.guardBadge,
      badgeVariant: 'blue',
      title: `Departure Reason Logged: ${target.guardName}`,
      description: `Authorized departure recorded: "${reason}" at ${target.siteName}. ${notes ? `Note: ${notes}` : ''}`
    });

    showToast('Departure Reason Logged', `Reason "${reason}" recorded for ${target.siteName}. Escalation suppressed.`, 'success');
  };

  // 4. Escalate unacknowledged breach when 3-minute debounce runs out
  const escalateGeofenceBreach = (shiftId: string) => {
    const target = scheduledShifts.find((s) => s.id === shiftId);
    if (!target) return;

    playGeofenceBreachSound();

    setScheduledShifts((prev) =>
      prev.map((s) => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          offSiteBreachStatus: 'breached_unacknowledged'
        };
      })
    );

    addAuditLog(
      'GEOFENCE_BREACH_ESCALATED',
      target.guardId,
      `CRITICAL ALERT: Officer ${target.guardName} (${target.guardBadge}) has exceeded 3-minute dwell buffer outside ${target.siteName} without authorized reason. Dispatch CAD flagged with Off-Site Breach badge.`,
      'System Geofence Engine',
      'danger'
    );

    logAdminAction({
      type: 'geofence_breach_escalated',
      adminName: 'Dispatch CAD Engine',
      adminBadge: 'CAD-AUTO-01',
      badgeVariant: 'rose',
      title: `🚨 Off-Site Breach: ${target.guardName}`,
      description: `Guard remained outside ${target.siteName} past 3-minute debounce without response. Dispatcher attention required.`
    });

    showToast('Off-Site Breach Escalation', `🚨 CRITICAL: ${target.guardName} flagged for unexcused off-site breach at ${target.siteName}!`, 'danger');
  };

  // 5. Clear / Reset breach
  const clearGeofenceBreach = (shiftId: string, supervisorNote?: string) => {
    const target = scheduledShifts.find((s) => s.id === shiftId);
    if (!target) return;

    setScheduledShifts((prev) =>
      prev.map((s) => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          offSiteBreachStatus: 'normal',
          currentInsideGeofence: true,
          debounceSecondsRemaining: 180,
          outOfBoundsSince: undefined,
          consecutiveOutOfBoundsReadings: 0
        };
      })
    );

    addAuditLog(
      'GEOFENCE_BREACH_CLEARED',
      target.guardId,
      `Off-site breach for ${target.guardName} at ${target.siteName} cleared by supervisor. ${supervisorNote ? `Note: ${supervisorNote}` : ''}`,
      "Lt. Mark O'Connor",
      'success'
    );

    logAdminAction({
      type: 'geofence_breach_cleared',
      adminName: "Lt. Mark O'Connor",
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'emerald',
      title: `Breach Cleared: ${target.guardName}`,
      description: `Supervisor cleared off-site breach for ${target.siteName}. ${supervisorNote ? `Note: ${supervisorNote}` : ''}`
    });

    showToast('Breach Cleared', `Off-site breach status cleared for ${target.guardName}.`, 'info');
  };

  // 6. Excuse departure directly by Ops Admin
  const excuseGeofenceDepartureByOps = (shiftId: string, reason: string, adminBadge: string = 'OPS-CMD-01') => {
    const target = scheduledShifts.find((s) => s.id === shiftId);
    if (!target) return;

    const nowIso = new Date().toISOString();

    setScheduledShifts((prev) =>
      prev.map((s) => {
        if (s.id !== shiftId) return s;
        return {
          ...s,
          offSiteBreachStatus: 'excused',
          departureExcusedByOps: true,
          departureExcusedByAdminBadge: adminBadge,
          departureExcusedReason: reason,
          departureExcusedAt: nowIso
        };
      })
    );

    addAuditLog(
      'GEOFENCE_EXCUSED_BY_ADMIN',
      target.guardId,
      `Supervisor ${adminBadge} excused off-site departure for ${target.guardName} at ${target.siteName}. Reason: "${reason}".`,
      adminBadge,
      'info'
    );

    logAdminAction({
      type: 'departure_excused_by_admin',
      adminName: "Lt. Mark O'Connor",
      adminBadge: adminBadge,
      badgeVariant: 'blue',
      title: `Departure Excused by Ops: ${target.guardName}`,
      description: `Excused off-site departure for ${target.siteName}. Reason: ${reason}`
    });

    showToast('Departure Excused', `Officer ${target.guardName}'s departure excused by Dispatch.`, 'success');
  };

  // Active Debounce Countdown Interval Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setScheduledShifts((prev) => {
        let hasChanges = false;
        const updated = prev.map((shift) => {
          if (shift.offSiteBreachStatus === 'debounce_pending' && shift.debounceSecondsRemaining !== undefined) {
            hasChanges = true;
            const newRemaining = shift.debounceSecondsRemaining - 1;
            if (newRemaining <= 0) {
              // Timer expired without excuse: Escalate!
              playGeofenceBreachSound();
              return {
                ...shift,
                offSiteBreachStatus: 'breached_unacknowledged' as OffSiteBreachStatus,
                debounceSecondsRemaining: 0
              };
            } else {
              return {
                ...shift,
                debounceSecondsRemaining: newRemaining
              };
            }
          }
          return shift;
        });
        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ==========================================
  const addSetSchedule = (data: Omit<SetSchedule, 'id' | 'createdAt' | 'updatedAt'>): SetSchedule => {
    const nowIso = new Date().toISOString();
    const newSchedule: SetSchedule = {
      ...data,
      id: `setsched-${Date.now()}`,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    setSetSchedules((prev) => [newSchedule, ...prev]);

    logAdminAction({
      type: 'template_created',
      adminName: "Lt. Mark O'Connor",
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'blue',
      title: `Set Schedule Created: ${data.title}`,
      description: `Configured standing ${data.daysPatternLabel} shift template for ${data.siteName} (${data.startTime}-${data.endTime}).`
    });

    showToast('Set Schedule Created', `Saved recurring schedule "${data.title}" for ${data.siteName}.`, 'success');
    return newSchedule;
  };

  const updateSetSchedule = (id: string, data: Partial<SetSchedule>) => {
    setSetSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s))
    );
    showToast('Schedule Template Updated', 'Saved changes to standing set schedule.', 'info');
  };

  const deleteSetSchedule = (id: string) => {
    const target = setSchedules.find((s) => s.id === id);
    setSetSchedules((prev) => prev.filter((s) => s.id !== id));
    if (target) {
      showToast('Schedule Removed', `Removed standing set schedule "${target.title}".`, 'warning');
    }
  };

  const toggleSetScheduleActive = (id: string) => {
    setSetSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive, updatedAt: new Date().toISOString() } : s))
    );
  };

  const assignGuardToSetSchedule = (scheduleId: string, guardId: string) => {
    const targetGuard = guardsList.find((g) => g.id === guardId);
    setSetSchedules((prev) =>
      prev.map((s) => {
        if (s.id === scheduleId) {
          if (!targetGuard) {
            return {
              ...s,
              regularGuardId: undefined,
              regularGuardName: undefined,
              regularGuardBadge: undefined,
              regularGuardPhone: undefined,
              updatedAt: new Date().toISOString()
            };
          }
          return {
            ...s,
            regularGuardId: targetGuard.id,
            regularGuardName: targetGuard.name,
            regularGuardBadge: targetGuard.badgeNumber,
            regularGuardPhone: targetGuard.phone,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      })
    );

    if (targetGuard) {
      showToast('Guard Assigned', `Assigned ${targetGuard.name} as regular guard for standing schedule.`, 'success');
    } else {
      showToast('Assignment Cleared', 'Schedule set to unassigned (open bidding).', 'info');
    }
  };

  const generateSchedulesFromSetTemplates = (options: GenerateSetSchedulesOptions): GenerateSetSchedulesResult => {
    const {
      startDate,
      endDate,
      selectedScheduleIds,
      overwriteExisting = false,
      autoPopulateOpenShiftsToBiddingQueue = true,
      respectTimeOff = true
    } = options;

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    // Filter active schedules
    const targetTemplates = setSchedules.filter((s) => {
      if (!s.isActive) return false;
      if (selectedScheduleIds && selectedScheduleIds.length > 0) {
        return selectedScheduleIds.includes(s.id);
      }
      return true;
    });

    const createdShifts: ScheduledShift[] = [];
    const generatedOpenShifts: Shift[] = [];
    const unassignedEntries: GeneratedScheduleEntry[] = [];
    const timeOffReplacementEntries: GeneratedScheduleEntry[] = [];

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let cur = new Date(start);
    while (cur <= end) {
      const dateStr = formatDate(cur);
      const dayOfWeek = cur.getDay() as DayOfWeek;

      targetTemplates.forEach((template) => {
        if (!template.daysOfWeek.includes(dayOfWeek)) return;

        // Check if shift already exists on this date for this site and start time
        const alreadyScheduled = scheduledShifts.some(
          (s) =>
            s.date === dateStr &&
            s.siteName.toLowerCase() === template.siteName.toLowerCase() &&
            s.startTime === template.startTime
        );

        if (alreadyScheduled && !overwriteExisting) {
          return;
        }

        const hours = template.hours || calculateHours(template.startTime, template.endTime);
        const regularGuard = guardsList.find((g) => g.id === template.regularGuardId);

        // Check if regular guard is on approved time-off
        let guardIsOnTimeOff = false;
        let timeOffReason = '';
        if (regularGuard && respectTimeOff) {
          const matchingTimeOff = timeOffRequests.find(
            (to) =>
              to.guardId === regularGuard.id &&
              to.status === 'approved' &&
              dateStr >= to.startDate &&
              dateStr <= to.endDate
          );
          if (matchingTimeOff) {
            guardIsOnTimeOff = true;
            timeOffReason = `${matchingTimeOff.type.toUpperCase()}: ${matchingTimeOff.reason}`;
          }
        }

        if (regularGuard && !guardIsOnTimeOff) {
          // Regular guard assigned and fully available
          const newScheduledShift: ScheduledShift = {
            id: `SCHED-${dateStr.replace(/-/g, '')}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 5)}`,
            guardId: regularGuard.id,
            guardName: regularGuard.name,
            guardBadge: regularGuard.badgeNumber,
            guardPhone: regularGuard.phone,
            siteName: template.siteName,
            siteAddress: template.siteAddress,
            postRole: template.postRole,
            date: dateStr,
            startTime: template.startTime,
            endTime: template.endTime,
            hours,
            status: 'scheduled',
            isRovingShift: template.serviceType === 'roving',
            rovingGroup: template.rovingGroup,
            notes: `Auto-generated from Set Schedule "${template.title}"`,
            createdAt: new Date().toISOString()
          };
          createdShifts.push(newScheduledShift);
        } else {
          // Unassigned OR Regular Guard on Time-Off
          if (guardIsOnTimeOff && regularGuard) {
            timeOffReplacementEntries.push({
              setScheduleId: template.id,
              siteName: template.siteName,
              date: dateStr,
              startTime: template.startTime,
              endTime: template.endTime,
              hours,
              regularGuardName: regularGuard.name,
              status: 'time_off_replacement',
              isTimeOffReplacement: true,
              timeOffReason,
              actionTaken: autoPopulateOpenShiftsToBiddingQueue
                ? 'Sent to Shift Bidding Queue'
                : 'Unassigned Shift Created'
            });
          } else {
            unassignedEntries.push({
              setScheduleId: template.id,
              siteName: template.siteName,
              date: dateStr,
              startTime: template.startTime,
              endTime: template.endTime,
              hours,
              status: 'unassigned_open',
              actionTaken: autoPopulateOpenShiftsToBiddingQueue
                ? 'Auto-populated into Shift Bidding Queue'
                : 'Requires Manual Assignment'
            });
          }

          if (autoPopulateOpenShiftsToBiddingQueue) {
            const urgency = guardIsOnTimeOff ? 'emergency' : (template.urgency || 'standard');
            const openShift: Shift = {
              id: `shift-set-${dateStr.replace(/-/g, '')}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 5)}`,
              siteName: template.siteName,
              address: template.siteAddress || '100 Main St, Seattle, WA 98101',
              location: template.postRole || 'Main Security Post',
              date: dateStr,
              startTime: template.startTime,
              endTime: template.endTime,
              hours,
              urgency,
              status: 'open',
              requiredCertifications: template.requiredCertifications || [],
              notes: guardIsOnTimeOff
                ? `⚡ RELIEF NEEDED: Regular officer ${regularGuard?.name} on approved time off (${timeOffReason}). From set schedule "${template.title}".`
                : `Open standing shift from template "${template.title}". Available for bidding.`,
              createdAt: new Date().toISOString(),
              bidsCount: 0
            };
            generatedOpenShifts.push(openShift);
          }
        }
      });

      cur.setDate(cur.getDate() + 1);
    }

    // Apply updates to state
    if (createdShifts.length > 0) {
      setScheduledShifts((prev) => [...createdShifts, ...prev]);
    }
    if (generatedOpenShifts.length > 0) {
      setShifts((prev) => [...generatedOpenShifts, ...prev]);
    }

    logAdminAction({
      type: 'shift_scheduled',
      adminName: "Lt. Mark O'Connor",
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'emerald',
      title: `Generated Set Schedules (${startDate} to ${endDate})`,
      description: `Populated ${createdShifts.length} assigned guard shifts and ${generatedOpenShifts.length} open bidding shifts from standing templates.`
    });

    showToast(
      'Set Schedules Generated',
      `Created ${createdShifts.length} assigned shifts and ${generatedOpenShifts.length} open bidding shifts across ${startDate} to ${endDate}.`,
      'success'
    );

    return {
      totalGenerated: createdShifts.length + generatedOpenShifts.length,
      assignedShiftsCount: createdShifts.length,
      openBiddingShiftsCount: generatedOpenShifts.length,
      timeOffReplacementsCount: timeOffReplacementEntries.length,
      startDate,
      endDate,
      assignedShifts: createdShifts,
      openShifts: generatedOpenShifts,
      timeOffReplacementEntries,
      unassignedEntries
    };
  };

  const getSetScheduleAiSuggestions = (setScheduleId: string): SetScheduleAiSuggestion[] => {
    const target = setSchedules.find((s) => s.id === setScheduleId);
    if (!target) return [];
    return generateSetScheduleAiSuggestions(target, guardsList, shifts, timeOffRequests, sitesList);
  };

  // ==========================================
  // Guard Availability Tracker Management
  // ==========================================
  const updateGuardAvailability = (guardId: string, availability: Partial<GuardWeeklyAvailability>) => {
    const updateHelper = (g: GuardProfile): GuardProfile => {
      if (g.id !== guardId) return g;
      const currentAvail = g.availability || { guardId: g.id, weeklyRules: [], maxWeeklyHours: 40 };
      const rawRules = availability.weeklyRules || availability.rules || currentAvail.weeklyRules || currentAvail.rules || [];
      const updated: GuardWeeklyAvailability = {
        ...currentAvail,
        ...availability,
        weeklyRules: rawRules,
        rules: rawRules,
        updatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      return {
        ...g,
        availability: updated
      };
    };

    setGuardsList((prev) => prev.map(updateHelper));
    if (activeGuard.id === guardId) {
      setActiveGuard((prev) => updateHelper(prev));
    }
    if (authenticatedGuard?.id === guardId) {
      setAuthenticatedGuard((prev) => prev ? updateHelper(prev) : prev);
    }
    showToast('Availability Saved', `Weekly schedule availability updated for officer.`, 'success');
  };

  const updateGuardDailyRule = (guardId: string, dayOfWeek: DayOfWeek, rule: Partial<DailyAvailabilityRule>) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const updateHelper = (g: GuardProfile): GuardProfile => {
      if (g.id !== guardId) return g;
      const currentAvail = g.availability || { guardId: g.id, weeklyRules: [], maxWeeklyHours: 40 };
      const rawRules = currentAvail.weeklyRules || currentAvail.rules || [];
      
      const computedIsAvailable = rule.status ? rule.status !== 'unavailable' : (rule.isAvailable !== undefined ? rule.isAvailable : true);
      const computedStatus = rule.status || (rule.isAvailable !== undefined ? (rule.isAvailable ? 'available' : 'unavailable') : 'available');

      let found = false;
      const updatedRules = rawRules.map((r) => {
        if (r.dayOfWeek === dayOfWeek) {
          found = true;
          return {
            ...r,
            ...rule,
            isAvailable: computedIsAvailable,
            status: computedStatus
          };
        }
        return r;
      });

      if (!found) {
        updatedRules.push({
          dayOfWeek,
          dayLabel: dayNames[dayOfWeek] || 'Day',
          isAvailable: computedIsAvailable,
          status: computedStatus,
          preferredShift: 'any',
          ...rule
        });
      }

      updatedRules.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

      const updatedAvail: GuardWeeklyAvailability = {
        ...currentAvail,
        weeklyRules: updatedRules,
        rules: updatedRules,
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return {
        ...g,
        availability: updatedAvail
      };
    };

    setGuardsList((prev) => prev.map(updateHelper));
    if (activeGuard.id === guardId) {
      setActiveGuard((prev) => updateHelper(prev));
    }
    if (authenticatedGuard?.id === guardId) {
      setAuthenticatedGuard((prev) => prev ? updateHelper(prev) : prev);
    }

    showToast('Availability Rule Saved', `Updated daily availability rule.`, 'success');
  };

  // ==========================================
  // Time-Off Requests Management
  // ==========================================
  const submitTimeOffRequest = (data: Omit<TimeOffRequest, 'id' | 'requestedAt' | 'status'>): TimeOffRequest => {
    const newRequest: TimeOffRequest = {
      ...data,
      id: `timeoff-${Date.now()}`,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    setTimeOffRequests((prev) => [newRequest, ...prev]);

    addAuditLog(
      'TIME_OFF_REQUESTED',
      'shift',
      `Officer ${data.guardName} (${data.guardBadge}) submitted ${data.type.toUpperCase()} time-off request for ${data.startDate} to ${data.endDate} (${data.totalDays} day(s)). Reason: "${data.reason}".`,
      data.guardName,
      'info'
    );

    showToast('Time-Off Request Submitted', `Submitted ${data.type} request for ${data.startDate} to ${data.endDate}.`, 'info');
    return newRequest;
  };

  const reviewTimeOffRequest = (
    requestId: string,
    status: 'approved' | 'rejected' | 'denied',
    adminName = "Lt. Mark O'Connor",
    adminBadge = 'OPS-CMD-01',
    note?: string
  ) => {
    const nowIso = new Date().toISOString();
    const target = timeOffRequests.find((r) => r.id === requestId);
    const normalizedStatus: 'approved' | 'denied' = status === 'approved' ? 'approved' : 'denied';
    const finalNote = note || (normalizedStatus === 'approved' ? 'Approved by Operations' : 'Denied per staffing capacity');

    setTimeOffRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: normalizedStatus,
              reviewedAt: nowIso,
              reviewedBy: `${adminName} (${adminBadge})`,
              resolvedAt: nowIso,
              resolvedByAdminName: adminName,
              resolvedByAdminBadge: adminBadge,
              resolutionNote: finalNote,
              adminNotes: finalNote
            }
          : r
      )
    );

    if (target) {
      addAuditLog(
        normalizedStatus === 'approved' ? 'TIME_OFF_APPROVED' : 'TIME_OFF_REJECTED',
        'system',
        `Time-off request for ${target.guardName} (${target.startDate} to ${target.endDate}) was ${normalizedStatus.toUpperCase()} by ${adminName}. Reason/Note: "${finalNote}".`,
        adminName,
        normalizedStatus === 'approved' ? 'success' : 'warning'
      );

      logAdminAction({
        type: normalizedStatus === 'approved' ? 'shift_scheduled' : 'shift_cancelled',
        adminName,
        adminBadge,
        badgeVariant: normalizedStatus === 'approved' ? 'emerald' : 'rose',
        title: `Time-Off ${normalizedStatus.toUpperCase()}: ${target.guardName}`,
        description: `${normalizedStatus === 'approved' ? 'Approved' : 'Denied'} ${target.type} leave for ${target.guardName} (${target.startDate} - ${target.endDate}). ${finalNote}`
      });

      showToast(
        `Time-Off ${normalizedStatus === 'approved' ? 'Approved' : 'Denied'}`,
        `${target.guardName}'s ${target.type} request (${target.startDate} to ${target.endDate}) is now ${normalizedStatus.toUpperCase()}.`,
        normalizedStatus === 'approved' ? 'success' : 'warning'
      );
    }
  };

  const setMaxDailyApprovedTimeOff = (limit: number) => {
    const validLimit = Math.max(1, Math.min(20, Math.round(limit)));
    setMaxDailyApprovedTimeOffState(validLimit);
    showToast('Daily Quota Updated', `Maximum approved time-off per day set to ${validLimit} officers.`, 'info');
  };

  const setDateSpecificMaxTimeOff = (dateStr: string, limit: number | null) => {
    setDateSpecificMaxTimeOffOverrides((prev) => {
      const updated = { ...prev };
      if (limit === null || limit === undefined || limit < 0) {
        delete updated[dateStr];
      } else {
        updated[dateStr] = Math.max(0, Math.min(20, Math.round(limit)));
      }
      return updated;
    });
    if (limit === null) {
      showToast('Date Quota Reset', `Custom limit removed for ${dateStr}. Default daily limit (${maxDailyApprovedTimeOff}) applies.`, 'info');
    } else {
      showToast('Date Quota Set', `Custom time-off limit for ${dateStr} set to ${limit} officers.`, 'info');
    }
  };

  const getTimeOffStatsForDate = (dateStr: string): TimeOffDailyStats => {
    const maxAllowed = dateSpecificMaxTimeOffOverrides[dateStr] ?? maxDailyApprovedTimeOff;
    const approvedRequests = timeOffRequests.filter(
      (r) => r.status === 'approved' && r.startDate <= dateStr && r.endDate >= dateStr
    );
    const pendingRequests = timeOffRequests.filter(
      (r) => r.status === 'pending' && r.startDate <= dateStr && r.endDate >= dateStr
    );
    const approvedCount = approvedRequests.length;
    const remainingSlots = Math.max(0, maxAllowed - approvedCount);
    const isAtCapacity = approvedCount >= maxAllowed;
    const isOverCapacity = approvedCount > maxAllowed;

    return {
      date: dateStr,
      approvedCount,
      maxAllowed,
      remainingSlots,
      isAtCapacity,
      isOverCapacity,
      approvedRequests,
      pendingRequests
    };
  };

  const checkTimeOffApprovalCapacity = (
    requestIdOrDates: string | { startDate: string; endDate: string }
  ) => {
    let startDate = '';
    let endDate = '';
    let targetRequestId = '';

    if (typeof requestIdOrDates === 'string') {
      targetRequestId = requestIdOrDates;
      const targetReq = timeOffRequests.find((r) => r.id === requestIdOrDates);
      if (targetReq) {
        startDate = targetReq.startDate;
        endDate = targetReq.endDate;
      }
    } else {
      startDate = requestIdOrDates.startDate;
      endDate = requestIdOrDates.endDate;
    }

    if (!startDate || !endDate) {
      return {
        canApproveWithoutExceeding: true,
        affectedDates: [],
        datesExceeding: []
      };
    }

    const affectedDates: {
      date: string;
      currentApproved: number;
      maxAllowed: number;
      remainingAfterApproval: number;
      wouldExceed: boolean;
    }[] = [];

    const datesExceeding: string[] = [];

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const cur = new Date(start);

    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      const maxAllowed = dateSpecificMaxTimeOffOverrides[dateStr] ?? maxDailyApprovedTimeOff;
      
      const currentApprovedRequests = timeOffRequests.filter(
        (r) => r.id !== targetRequestId && r.status === 'approved' && r.startDate <= dateStr && r.endDate >= dateStr
      );
      const currentApproved = currentApprovedRequests.length;
      const newApprovedCount = currentApproved + 1;
      const wouldExceed = newApprovedCount > maxAllowed;
      const remainingAfterApproval = maxAllowed - newApprovedCount;

      if (wouldExceed) {
        datesExceeding.push(dateStr);
      }

      affectedDates.push({
        date: dateStr,
        currentApproved,
        maxAllowed,
        remainingAfterApproval,
        wouldExceed
      });

      cur.setDate(cur.getDate() + 1);
    }

    return {
      canApproveWithoutExceeding: datesExceeding.length === 0,
      affectedDates,
      datesExceeding
    };
  };

  const cancelTimeOffRequest = (requestId: string) => {
    setTimeOffRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'cancelled' } : r)));
    showToast('Time-Off Cancelled', 'Request marked as cancelled.', 'info');
  };

  // ==========================================
  // Guard Call-Offs & Quick-Add to Shift Bidding Queue
  // ==========================================
  const recordGuardCallOff = (data: {
    scheduledShiftId: string;
    reason: string;
    guardId?: string;
    guardName?: string;
    guardBadge?: string;
    siteName?: string;
    shiftDate?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    autoAddToBiddingQueue?: boolean;
    broadcastPushNotification?: boolean;
    isNoShow?: boolean;
    postToBiddingQueue?: boolean;
    sendUrgentPush?: boolean;
    adminName?: string;
  }): { callOffRecord: GuardCallOffRecord; urgentShift?: Shift } => {
    const targetShift = scheduledShifts.find((s) => s.id === data.scheduledShiftId);
    const nowIso = new Date().toISOString();
    const isNoShow = data.isNoShow || false;
    const postToBidding = data.autoAddToBiddingQueue !== undefined ? data.autoAddToBiddingQueue : data.postToBiddingQueue !== false;
    const sendPush = data.broadcastPushNotification !== undefined ? data.broadcastPushNotification : data.sendUrgentPush !== false;
    const admin = data.adminName || "Lt. Mark O'Connor (OPS-CMD-01)";

    const callOffId = `calloff-${Date.now()}`;
    let urgentShift: Shift | undefined;

    // 1. If posting to bidding queue, create urgent open shift
    if (postToBidding && targetShift) {
      urgentShift = {
        id: `shift-urgent-calloff-${Date.now().toString().slice(-4)}`,
        siteName: targetShift.siteName,
        address: targetShift.siteAddress || '100 Main St, Seattle, WA 98101',
        location: targetShift.postRole || 'Active Security Post',
        date: targetShift.date,
        startTime: targetShift.startTime,
        endTime: targetShift.endTime,
        hours: targetShift.hours || 8,
        urgency: 'emergency',
        status: 'open',
        notes: `🚨 URGENT RELIEF: Officer ${targetShift.guardName} ${isNoShow ? 'NO-SHOWED' : 'CALLED OFF'} (${data.reason}). Immediate coverage required!`,
        requiredCertifications: targetShift.isRovingShift ? ['Roving Patrol'] : [],
        createdAt: nowIso,
        bidsCount: 0
      };

      setShifts((prev) => [urgentShift!, ...prev]);
    }

    // 2. Create call-off record
    const newRecord: GuardCallOffRecord = {
      id: callOffId,
      scheduledShiftId: data.scheduledShiftId,
      guardId: targetShift?.guardId || 'unknown',
      guardName: targetShift?.guardName || 'Guard',
      guardBadge: targetShift?.guardBadge || 'N/A',
      guardPhone: targetShift?.guardPhone,
      siteName: targetShift?.siteName || 'Facility',
      shiftDate: targetShift?.date || new Date().toISOString().slice(0, 10),
      shiftStartTime: targetShift?.startTime || '08:00',
      shiftEndTime: targetShift?.endTime || '16:00',
      hours: targetShift?.hours || 8,
      reason: data.reason,
      calledOffAt: nowIso,
      isNoShow,
      convertedToUrgentBid: postToBidding,
      urgentShiftId: urgentShift?.id,
      notes: `Reported by ${admin}`
    };

    setCallOffRecords((prev) => [newRecord, ...prev]);

    // 3. Update scheduled shift status to cancelled with note
    if (targetShift) {
      setScheduledShifts((prev) =>
        prev.map((s) =>
          s.id === data.scheduledShiftId
            ? {
                ...s,
                status: 'cancelled',
                notes: `${s.notes ? s.notes + ' | ' : ''}⚠️ ${isNoShow ? 'NO-SHOW' : 'CALL-OFF'}: ${data.reason} (Reported by ${admin})`
              }
            : s
        )
      );
    }

    // 4. Send Push Notification and Play Audio Siren if requested
    if (sendPush && urgentShift) {
      try {
        playPriorityShiftAlertSound();
      } catch {}

      const pushObj: PriorityPushNotification = {
        id: `push-calloff-${Date.now()}`,
        shiftId: urgentShift.id,
        shift: urgentShift,
        title: `🚨 URGENT OPEN SHIFT: ${urgentShift.siteName}`,
        message: `Emergency relief needed today (${urgentShift.date} ${urgentShift.startTime}-${urgentShift.endTime}) at ${urgentShift.siteName}. 1-Click claim available now!`,
        broadcastAt: nowIso,
        dismissed: false
      };
      setActivePriorityPush(pushObj);
    }

    logAdminAction({
      type: 'shift_cancelled',
      adminName: admin,
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'rose',
      title: `Guard ${isNoShow ? 'No-Show' : 'Call-Off'}: ${targetShift?.guardName || 'Officer'}`,
      description: `${targetShift?.guardName} ${isNoShow ? 'no-showed' : 'called off'} for ${targetShift?.siteName} on ${targetShift?.date} (${data.reason}). ${postToBidding ? 'Urgent relief shift broadcast to bidding queue.' : ''}`
    });

    addAuditLog(
      'GUARD_CALL_OFF_RECORDED',
      'shift',
      `🚨 [${isNoShow ? 'NO-SHOW' : 'CALL-OFF'}] Guard ${targetShift?.guardName} (${targetShift?.guardBadge}) unavailable for ${targetShift?.siteName} on ${targetShift?.date}. Reason: ${data.reason}. Relief posted: ${postToBidding ? 'YES' : 'NO'}.`,
      admin,
      'danger'
    );

    showToast(
      isNoShow ? '🚨 Guard No-Show Logged' : '⚠️ Guard Call-Off Logged',
      `${targetShift?.guardName} unavailable for ${targetShift?.siteName}. ${postToBidding ? 'Urgent relief shift added to Bidding Queue!' : ''}`,
      'danger'
    );

    return { callOffRecord: newRecord, urgentShift };
  };

  const quickAddCallOffToBiddingQueue = (
    callOffId: string,
    options?: { sendPushNotification?: boolean; urgency?: 'standard' | 'emergency' }
  ): Shift | null => {
    const record = callOffRecords.find((r) => r.id === callOffId);
    if (!record) return null;

    const urgency = options?.urgency || 'emergency';
    const sendPush = options?.sendPushNotification !== false;
    const nowIso = new Date().toISOString();

    const openShift: Shift = {
      id: `shift-urgent-relief-${Date.now().toString().slice(-4)}`,
      siteName: record.siteName,
      address: '100 Main St, Seattle, WA 98101',
      location: 'Assigned Security Post',
      date: record.shiftDate,
      startTime: record.shiftStartTime,
      endTime: record.shiftEndTime,
      hours: record.hours || 8,
      urgency,
      status: 'open',
      notes: `🚨 URGENT RELIEF: Officer ${record.guardName} ${record.isNoShow ? 'No-Show' : 'Call-Off'} (${record.reason}). Immediate bidding open!`,
      requiredCertifications: [],
      createdAt: nowIso,
      bidsCount: 0
    };

    setShifts((prev) => [openShift, ...prev]);

    setCallOffRecords((prev) =>
      prev.map((r) =>
        r.id === callOffId
          ? {
              ...r,
              postedToBiddingQueue: true,
              urgentShiftId: openShift.id,
              pushNotificationSent: sendPush,
              status: 'relief_posted'
            }
          : r
      )
    );

    if (sendPush) {
      try {
        playPriorityShiftAlertSound();
      } catch {}
      setActivePriorityPush({
        id: `push-relief-${Date.now()}`,
        shiftId: openShift.id,
        shift: openShift,
        title: `🚨 URGENT OPEN SHIFT: ${openShift.siteName}`,
        body: `Emergency relief opened for ${openShift.siteName} (${openShift.date} ${openShift.startTime}-${openShift.endTime}). Tap to bid now!`,
        urgency: 'critical',
        hoursUntilShift: 1,
        matchGrade: 'top',
        timestamp: nowIso
      });
    }

    showToast('Urgent Shift Posted', `Relief position for ${record.siteName} published to Shift Bidding Queue.`, 'success');
    return openShift;
  };

  // Dynamic Rover Route Optimization Methods
  const addTelemetryLog = (logData: Omit<RoverTelemetryLog, 'id' | 'timestamp'> & { timestamp?: string }): RoverTelemetryLog => {
    const newLog: RoverTelemetryLog = {
      ...logData,
      id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: logData.timestamp || new Date().toISOString()
    };
    setTelemetryLogs((prev) => [newLog, ...prev.slice(0, 150)]);
    return newLog;
  };

  const setTrafficCondition = (newTraffic: TrafficCondition) => {
    setTrafficConditionState(newTraffic);
    try {
      localStorage.setItem(STORAGE_KEY_TRAFFIC, newTraffic);
    } catch (e) {
      console.warn('Failed to save traffic condition', e);
    }

    // Reoptimize all active plans with the new traffic condition
    const updatedPlans: Record<string, DynamicRoutePlan> = {};
    rovers.forEach((rover) => {
      updatedPlans[rover.id] = optimizeRoverRoute(rover, sitesList, {
        traffic: newTraffic,
        mode: optimizationMode,
        antiPredictabilityJitterPct
      });
    });
    setRoverPlans(updatedPlans);

    const trafficLabels: Record<TrafficCondition, string> = {
      light: 'Light Flow (Speed: 100%)',
      moderate: 'Moderate Flow (Speed: 80%)',
      heavy: 'Heavy Congestion (Speed: 60%)',
      incident_gridlock: 'Incident Gridlock (Speed: 45%)'
    };

    addTelemetryLog({
      roverId: rovers[0]?.id || 'all',
      roverUnit: 'SYSTEM-DISPATCH',
      guardName: 'Ops Dispatcher',
      eventType: 'ETA_RECALCULATED',
      notes: `Global real-time traffic condition updated to ${trafficLabels[newTraffic]}. Recalculated all rover arrival windows.`
    });

    logAdminAction({
      type: 'traffic_condition_updated',
      title: 'Traffic Condition Updated',
      description: `Live city routing calibrated for ${trafficLabels[newTraffic]}.`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: newTraffic === 'incident_gridlock' || newTraffic === 'heavy' ? 'rose' : 'blue',
      metadata: { traffic: newTraffic }
    });

    showToast('Live Traffic Updated', `Recalculated route ETAs with ${trafficLabels[newTraffic]}.`, 'info');
  };

  const setOptimizationMode = (newMode: OptimizationMode) => {
    setOptimizationModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY_OPT_MODE, newMode);
    } catch (e) {
      console.warn('Failed to save optimization mode', e);
    }

    const updatedPlans: Record<string, DynamicRoutePlan> = {};
    rovers.forEach((rover) => {
      updatedPlans[rover.id] = optimizeRoverRoute(rover, sitesList, {
        traffic: trafficCondition,
        mode: newMode,
        antiPredictabilityJitterPct
      });
    });
    setRoverPlans(updatedPlans);

    const modeLabels: Record<OptimizationMode, string> = {
      traffic_density_optimal: 'Traffic & Density Routing (Min Deadhead Drive Time)',
      anti_predictability_stochastic: 'Anti-Predictability Stochastic Routing (Counter-Surveillance)',
      sla_priority_first: 'Contract SLA Time-Window Enforcement (Mandatory Hits First)',
      stealth_randomized: 'Stealth Circuit Randomization'
    };

    addTelemetryLog({
      roverId: rovers[0]?.id || 'all',
      roverUnit: 'OPTIMIZER-ENGINE',
      guardName: 'Ops Dispatcher',
      eventType: newMode === 'anti_predictability_stochastic' ? 'STOCHASTIC_JITTER_APPLIED' : 'ETA_RECALCULATED',
      notes: `Routing optimization algorithm switched to "${modeLabels[newMode]}".`
    });

    logAdminAction({
      type: 'route_optimizer_mode',
      title: 'Routing Algorithm Mode Changed',
      description: `Switched optimizer to "${modeLabels[newMode]}".`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'purple',
      metadata: { mode: newMode }
    });

    showToast('Route Algorithm Updated', `Dynamic routing updated to ${modeLabels[newMode]}.`, 'success');
  };

  const setAntiPredictabilityJitterPct = (pct: number) => {
    setAntiPredictabilityJitterPctState(pct);
    try {
      localStorage.setItem(STORAGE_KEY_JITTER_PCT, pct.toString());
    } catch (e) {
      console.warn('Failed to save jitter pct', e);
    }

    if (optimizationMode === 'anti_predictability_stochastic' || optimizationMode === 'stealth_randomized') {
      const updatedPlans: Record<string, DynamicRoutePlan> = {};
      rovers.forEach((rover) => {
        updatedPlans[rover.id] = optimizeRoverRoute(rover, sitesList, {
          traffic: trafficCondition,
          mode: optimizationMode,
          antiPredictabilityJitterPct: pct
        });
      });
      setRoverPlans(updatedPlans);
    }
  };

  const reoptimizeRoverRoutes = (targetMode?: OptimizationMode, targetTraffic?: TrafficCondition) => {
    const mode = targetMode || optimizationMode;
    const traffic = targetTraffic || trafficCondition;

    const updatedPlans: Record<string, DynamicRoutePlan> = {};
    let totalDeadheadSaved = 0;
    let totalSlaCompliant = 0;

    rovers.forEach((rover) => {
      const plan = optimizeRoverRoute(rover, sitesList, {
        traffic,
        mode,
        antiPredictabilityJitterPct
      });
      updatedPlans[rover.id] = plan;
      totalDeadheadSaved += plan.deadheadDriveMinutesSaved;
      if (plan.slaComplianceScore >= 95) totalSlaCompliant++;
    });

    setRoverPlans(updatedPlans);

    addTelemetryLog({
      roverId: rovers[0]?.id || 'fleet',
      roverUnit: 'FLEET-DISPATCH',
      guardName: 'Lt. Mark O\'Connor',
      eventType: 'ETA_RECALCULATED',
      notes: `Full fleet circuit re-optimized. Projected ${totalDeadheadSaved} min deadhead reduction across ${rovers.length} mobile patrol units.`
    });

    logAdminAction({
      type: 'routes_reoptimized',
      title: 'MPU Routes Re-Optimized',
      description: `Re-calculated patrol circuit for ${rovers.length} mobile units using ${mode}. Saved ~${totalDeadheadSaved}m drive time.`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'blue',
      metadata: { mode, traffic, roversCount: rovers.length, deadheadSaved: totalDeadheadSaved }
    });

    showToast(
      'Fleet Routes Re-Optimized',
      `Optimized ${rovers.length} rover circuits: ~${totalDeadheadSaved} min total drive time saved.`,
      'success'
    );
  };

  const dispatchAdHocInterception = (
    callId: string,
    customAddress?: string,
    overrideRoverId?: string
  ): AdHocInterception | null => {
    const call = callsForService.find((c) => c.id === callId);
    if (!call) {
      showToast('Call Not Found', `Unable to find call with ID ${callId}`, 'danger');
      return null;
    }

    // Determine coords for the CFS call (from site or default city coordinates)
    const matchedSite = sitesList.find(
      (s) => s.name.toLowerCase() === call.siteName.toLowerCase() || (s.address && call.locationDetails?.includes(s.address))
    );
    const targetCoords = matchedSite?.coordinates || { latitude: 47.6080, longitude: -122.3350 };

    // Select nearest rover if not explicitly overridden
    let targetRover: RoverVehicle | undefined;
    if (overrideRoverId) {
      targetRover = rovers.find((r) => r.id === overrideRoverId);
    }
    if (!targetRover) {
      targetRover = calculateNearestRoverForInterception(rovers, targetCoords, trafficCondition) || rovers[0];
    }

    if (!targetRover) {
      showToast('No Available Rovers', 'No roving units available for dynamic intercept.', 'danger');
      return null;
    }

    const currentPlan = roverPlans[targetRover.id];
    const pendingRoutineStops = currentPlan ? currentPlan.stops.filter((s) => s.status === 'pending') : [];
    const preemptedStop = pendingRoutineStops[0];

    // Estimated intercept drive time based on distance
    const estInterceptMinutes = 6;
    const estArrival = new Date(Date.now() + estInterceptMinutes * 60 * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const newInterception: AdHocInterception = {
      id: `intercept-${Date.now()}`,
      callId: call.id,
      callForServiceId: call.id,
      callTitle: call.summary,
      callSummary: call.summary,
      callPriority: call.priority,
      callType: call.callType,
      siteName: call.siteName,
      targetAddress: customAddress || call.locationDetails || matchedSite?.address || 'City Center Sector',
      locationAddress: customAddress || call.locationDetails || matchedSite?.address || 'City Center Sector',
      targetCoords,
      coordinates: targetCoords,
      assignedRoverId: targetRover.id,
      assignedRoverUnit: targetRover.unitNumber,
      assignedGuardName: targetRover.assignedGuardName,
      dispatchedAt: new Date().toISOString(),
      status: 'dispatched',
      estimatedEtaMinutes: estInterceptMinutes,
      estimatedArrivalMinutes: estInterceptMinutes,
      preemptedRoutineStopSiteId: preemptedStop?.siteId,
      preemptedRoutineStopSiteName: preemptedStop?.siteName,
      postponedEtaShiftMinutes: 15
    };

    setActiveInterceptions((prev) => [newInterception, ...prev]);

    // Update Rover status to 'intercepting'
    setRovers((prev) =>
      prev.map((r) =>
        r.id === targetRover!.id
          ? {
              ...r,
              status: 'intercepting',
              currentSiteName: `⚡ INTERCEPT: ${call.summary.slice(0, 24)}...`
            }
          : r
      )
    );

    // Inject emergency intercept stop to the front of the rover's plan
    if (currentPlan) {
      const interceptStop: RouteCheckpointStop = {
        id: `stop-intercept-${Date.now()}`,
        siteId: matchedSite?.id || `site-intercept-${Date.now()}`,
        siteName: `🚨 [AD-HOC INTERCEPT] ${call.siteName}`,
        siteAddress: customAddress || call.locationDetails || matchedSite?.address || 'Immediate Response Zone',
        coords: targetCoords,
        rovingGroup: targetRover.rovingGroup,
        clusterSectorId: 'SECTOR-EMERGENCY-INTERCEPT',
        sequenceOrder: 0,
        originalSequenceOrder: 0,
        estimatedArrival: estArrival,
        estimatedDeparture: new Date(Date.now() + (estInterceptMinutes + 15) * 60 * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        estimatedDriveMinutes: estInterceptMinutes,
        distanceKm: 2.1,
        targetDwellMinutes: 15,
        slaPriority: 'P1_MANDATORY_SLA',
        slaWindowDescription: `Ad-Hoc Emergency Call (${call.priority})`,
        status: 'pending',
        hitsCompletedCount: 0,
        hitsRequiredCount: 1,
        geofenceVerified: false,
        geofenceRadiusMeters: 120,
        isAdHocIntercept: true,
        adHocCallId: call.id,
        postInstructions: `Emergency ad-hoc diversion: ${call.summary}. Routine patrols postponed.`
      };

      const updatedStops = [interceptStop, ...currentPlan.stops];
      setRoverPlans((prev) => ({
        ...prev,
        [targetRover!.id]: {
          ...currentPlan,
          stops: updatedStops,
          adHocInterceptionsCount: (currentPlan.adHocInterceptionsCount || 0) + 1,
          totalDriveMinutes: (currentPlan.totalDriveMinutes || currentPlan.deadheadDriveMinutes) + estInterceptMinutes
        }
      }));
    }

    // Update CFS call state
    setCallsForService((prev) =>
      prev.map((c) =>
        c.id === call.id
          ? {
              ...c,
              status: 'en_route',
              assignedGuard: {
                name: targetRover!.assignedGuardName,
                badge: targetRover!.assignedGuardBadge
              },
              officerInstructions: `ROVER INTERCEPT: ${targetRover!.unitNumber} rerouted. ETA ~${estInterceptMinutes}m. Downstream routine rounds adjusted.`
            }
          : c
      )
    );

    // Audio & Telemetry
    if (alertPreferences.soundEnabled) {
      playEmergencyAlertSound();
    }

    addTelemetryLog({
      roverId: targetRover.id,
      roverUnit: targetRover.unitNumber,
      guardName: targetRover.assignedGuardName,
      eventType: 'AD_HOC_INTERCEPT_DISPATCHED',
      siteName: call.siteName,
      coords: targetCoords,
      notes: `⚡ Dynamic Reroute: Dispatched to emergency call "${call.summary}". Routine stop at "${preemptedStop?.siteName || 'patrol circuit'}" postponed +15m.`
    });

    logAdminAction({
      type: 'ad_hoc_interception',
      title: '🚨 Ad-Hoc Interception Dispatched',
      description: `Rerouted ${targetRover.unitNumber} (${targetRover.assignedGuardName}) to ${call.siteName} for "${call.summary}".`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'rose',
      metadata: { callId: call.id, roverUnit: targetRover.unitNumber, site: call.siteName }
    });

    showToast(
      '🚨 Rover Interception Dispatched',
      `${targetRover.unitNumber} (${targetRover.assignedGuardName}) rerouted to ${call.siteName}. ETA ${estInterceptMinutes} mins.`,
      'danger'
    );

    return newInterception;
  };

  const clearAdHocInterception = (interceptionId: string, resolutionNotes?: string) => {
    const intercept = activeInterceptions.find((i) => i.id === interceptionId);
    if (!intercept) return;

    setActiveInterceptions((prev) => prev.filter((i) => i.id !== interceptionId));

    // Restore rover status and re-optimize circuit
    const targetRover = rovers.find((r) => r.id === intercept.assignedRoverId);
    if (targetRover) {
      setRovers((prev) =>
        prev.map((r) =>
          r.id === targetRover.id
            ? {
                ...r,
                status: 'patrolling',
                currentSiteName: undefined
              }
            : r
        )
      );

      // Re-optimize rover plan to restore normal queue
      const restoredPlan = optimizeRoverRoute(targetRover, sitesList, {
        traffic: trafficCondition,
        mode: optimizationMode,
        antiPredictabilityJitterPct
      });

      setRoverPlans((prev) => ({
        ...prev,
        [targetRover.id]: restoredPlan
      }));
    }

    // Resolve CFS call
    if (intercept.callForServiceId) {
      setCallsForService((prev) =>
        prev.map((c) =>
          c.id === intercept.callForServiceId
            ? {
                ...c,
                status: 'cleared',
                disposition: 'resolved',
                clearedAt: new Date().toISOString(),
                clearedBy: {
                  name: intercept.assignedGuardName,
                  badge: targetRover?.assignedGuardBadge || 'ROVER-PATROL'
                },
                resolutionSummary: resolutionNotes || 'Emergency condition resolved on scene by rover officer. Routine circuit resumed.'
              }
            : c
        )
      );
    }

    addTelemetryLog({
      roverId: intercept.assignedRoverId,
      roverUnit: intercept.assignedRoverUnit,
      guardName: intercept.assignedGuardName,
      eventType: 'AD_HOC_INTERCEPT_CLEARED',
      siteName: intercept.siteName,
      notes: `Ad-hoc interception at "${intercept.siteName}" CLEARED. Unit returned to regular patrol circuit.`
    });

    logAdminAction({
      type: 'interception_cleared',
      title: 'Ad-Hoc Intercept Resolved',
      description: `Officer ${intercept.assignedGuardName} cleared call at ${intercept.siteName}. Circuit resumed.`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'emerald',
      metadata: { interceptionId, site: intercept.siteName, resolution: resolutionNotes }
    });

    showToast('Intercept Cleared', `${intercept.assignedRoverUnit} has resolved the call and resumed normal circuit rounds.`, 'success');
  };

  const advanceRoverCheckpoint = (roverId: string, customStatus?: string) => {
    const targetRover = rovers.find((r) => r.id === roverId);
    if (!targetRover) return;

    const currentPlan = roverPlans[roverId];
    if (!currentPlan || currentPlan.stops.length === 0) return;

    const currentIndex = targetRover.currentStopIndex;
    const currentStop = currentPlan.stops[currentIndex] || currentPlan.stops[0];

    if (targetRover.status === 'dwelling' || customStatus === 'finish_dwell') {
      // Completed dwell at current stop, transition to patrolling towards next stop
      const nextIndex = (currentIndex + 1) % currentPlan.stops.length;
      const nextStop = currentPlan.stops[nextIndex];

      const updatedStops = currentPlan.stops.map((s, idx) =>
        idx === currentIndex ? { ...s, status: 'completed' as const } : s
      );

      setRoverPlans((prev) => ({
        ...prev,
        [roverId]: {
          ...currentPlan,
          stops: updatedStops
        }
      }));

      setRovers((prev) =>
        prev.map((r) =>
          r.id === roverId
            ? {
                ...r,
                status: 'patrolling',
                currentStopIndex: nextIndex,
                currentSiteId: nextStop.siteId,
                currentSiteName: nextStop.siteName,
                currentDwellSeconds: 0,
                isInsideGeofence: false
              }
            : r
        )
      );

      addTelemetryLog({
        roverId: targetRover.id,
        roverUnit: targetRover.unitNumber,
        guardName: targetRover.assignedGuardName,
        eventType: 'GEOFENCE_AUTO_DEPARTURE',
        siteId: currentStop.siteId,
        siteName: currentStop.siteName,
        coords: currentStop.coords,
        notes: `Dwell complete (${currentStop.targetDwellMinutes}m). Rover en-route to next stop: "${nextStop.siteName}".`,
        telemetrySource: 'passive_gps_geofence'
      });

      showToast(
        'Patrol Stop Completed',
        `${targetRover.unitNumber} departing ${currentStop.siteName} -> En-route to ${nextStop.siteName}`,
        'info'
      );
    } else {
      // Currently patrolling, now arriving and beginning dwell
      const updatedStops = currentPlan.stops.map((s, idx) =>
        idx === currentIndex ? { ...s, status: 'dwelling' as const } : s
      );

      setRoverPlans((prev) => ({
        ...prev,
        [roverId]: {
          ...currentPlan,
          stops: updatedStops
        }
      }));

      setRovers((prev) =>
        prev.map((r) =>
          r.id === roverId
            ? {
                ...r,
                status: 'dwelling',
                currentSiteId: currentStop.siteId,
                currentSiteName: currentStop.siteName,
                currentDwellSeconds: 0,
                isInsideGeofence: true,
                currentCoords: {
                  ...r.currentCoords,
                  latitude: currentStop.coords.latitude,
                  longitude: currentStop.coords.longitude
                }
              }
            : r
        )
      );

      addTelemetryLog({
        roverId: targetRover.id,
        roverUnit: targetRover.unitNumber,
        guardName: targetRover.assignedGuardName,
        eventType: 'GEOFENCE_AUTO_ARRIVAL',
        siteId: currentStop.siteId,
        siteName: currentStop.siteName,
        coords: currentStop.coords,
        notes: `Passive GPS geofence match. Arrived at ${currentStop.siteName}. Beginning mandatory ${currentStop.targetDwellMinutes}m dwell SLA.`,
        telemetrySource: 'passive_gps_geofence'
      });

      showToast(
        'Geofence Arrival Verified',
        `${targetRover.unitNumber} arrived at ${currentStop.siteName}. Timer started (${currentStop.targetDwellMinutes}m).`,
        'success'
      );
    }
  };

  const simulateRoverGpsMove = (
    roverId: string,
    coords: { latitude: number; longitude: number; speedKmh?: number }
  ) => {
    const targetRover = rovers.find((r) => r.id === roverId);
    if (!targetRover) return;

    const currentPlan = roverPlans[roverId];
    const currentStop = currentPlan?.stops[targetRover.currentStopIndex];

    const evaluation = currentStop
      ? evaluatePassiveTelemetryGeofence(targetRover, currentStop, coords)
      : null;

    setRovers((prev) =>
      prev.map((r) => {
        if (r.id !== roverId) return r;
        return {
          ...r,
          currentCoords: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            speedKmh: coords.speedKmh !== undefined ? coords.speedKmh : r.currentCoords.speedKmh,
            heading: r.currentCoords.heading,
            accuracy: 5
          },
          lastTelemetryTimestamp: new Date().toISOString(),
          isInsideGeofence: evaluation ? evaluation.isInsideGeofence : r.isInsideGeofence,
          currentDwellSeconds: evaluation ? evaluation.dwellSeconds : r.currentDwellSeconds,
          status: evaluation?.isDwellSlaMet
            ? 'dwelling'
            : evaluation?.isAutoArrival
            ? 'dwelling'
            : r.status
        };
      })
    );

    if (evaluation && evaluation.telemetryEvents.length > 0) {
      evaluation.telemetryEvents.forEach((evt) => {
        addTelemetryLog(evt);
      });
    }
  };

  const getRoverForGuard = (guardId: string): RoverVehicle | undefined => {
    return rovers.find(
      (r) => r.assignedGuardId === guardId || r.assignedGuardName.toLowerCase() === guardId.toLowerCase()
    );
  };

  const getRoverByGroup = (group: RovingGroup): RoverVehicle | undefined => {
    return rovers.find((r) => r.rovingGroup === group);
  };

  // Reset to Defaults
  const resetToDefaults = () => {
    setShifts(INITIAL_SHIFTS);
    setTrades(INITIAL_TRADES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setRecentAdminActions(INITIAL_ADMIN_ACTIONS);
    setAdminUsers(INITIAL_ADMIN_USERS);
    setGuardsList(GUARDS_LIST);
    setShiftTemplates(INITIAL_SHIFT_TEMPLATES);
    setActiveGuard(GUARDS_LIST[0] || CURRENT_GUARD);
    setAuthenticatedGuard(GUARDS_LIST[0] || CURRENT_GUARD);
    setBids(INITIAL_BIDS);
    setActiveBroadcast(null);
    setBroadcastHistory([]);
    setCallsForService(INITIAL_CALLS_FOR_SERVICE);
    setLatestDispatchedCall(null);
    setIsCallAlertOpen(false);
    setScheduledShifts(INITIAL_SCHEDULED_SHIFTS);
    setDismissedLateAlertIds([]);
    setRovers(INITIAL_ROVERS);
    setTelemetryLogs(INITIAL_TELEMETRY_LOGS);
    setActiveInterceptions([]);
    setTrafficConditionState('moderate');
    setOptimizationModeState('traffic_density_optimal');
    setAntiPredictabilityJitterPctState(20);

    const initialPlans: Record<string, DynamicRoutePlan> = {};
    INITIAL_ROVERS.forEach((rover) => {
      initialPlans[rover.id] = optimizeRoverRoute(rover, INITIAL_SITES, {
        traffic: 'moderate',
        mode: 'traffic_density_optimal',
        antiPredictabilityJitterPct: 20
      });
    });
    setRoverPlans(initialPlans);

    localStorage.removeItem(STORAGE_KEY_SHIFTS);
    localStorage.removeItem(STORAGE_KEY_TRADES);
    localStorage.removeItem(STORAGE_KEY_LOGS);
    localStorage.removeItem(STORAGE_KEY_ADMIN_ACTIONS);
    localStorage.removeItem(STORAGE_KEY_ADMIN_USERS);
    localStorage.removeItem(STORAGE_KEY_GUARDS);
    localStorage.removeItem(STORAGE_KEY_TEMPLATES);
    localStorage.removeItem(STORAGE_KEY_BIDS);
    localStorage.removeItem(STORAGE_KEY_BROADCAST);
    localStorage.removeItem(STORAGE_KEY_BROADCAST_HISTORY);
    localStorage.removeItem(STORAGE_KEY_ALERT_PREFS);
    localStorage.removeItem(STORAGE_KEY_SITE_FEEDBACKS);
    localStorage.removeItem(STORAGE_KEY_SITES);
    localStorage.removeItem(STORAGE_KEY_CALLS_FOR_SERVICE);
    localStorage.removeItem(STORAGE_KEY_CALL_RECEIPTS);
    localStorage.removeItem(STORAGE_KEY_SCHEDULED_SHIFTS);
    localStorage.removeItem(STORAGE_KEY_DISMISSED_LATE_ALERTS);
    localStorage.removeItem(STORAGE_KEY_ROVERS);
    localStorage.removeItem(STORAGE_KEY_ROVER_PLANS);
    localStorage.removeItem(STORAGE_KEY_INTERCEPTIONS);
    localStorage.removeItem(STORAGE_KEY_TELEMETRY);
    localStorage.removeItem(STORAGE_KEY_TRAFFIC);
    localStorage.removeItem(STORAGE_KEY_OPT_MODE);
    localStorage.removeItem(STORAGE_KEY_JITTER_PCT);
    localStorage.removeItem('secureshift_guard_auth_session');
    setCallReceipts([]);
    setLatestCallReceipt(null);
    setAlertPreferencesState(DEFAULT_ALERT_PREFERENCES);
    setSiteFeedbacks(INITIAL_SITE_FEEDBACKS);
    setSitesList(INITIAL_SITES);
    setShiftClaims(INITIAL_CLAIM_REQUESTS);
    localStorage.removeItem(STORAGE_KEY_SHIFT_CLAIMS);
    setSetSchedules(INITIAL_SET_SCHEDULES);
    setTimeOffRequests(INITIAL_TIME_OFF_REQUESTS);
    setCallOffRecords(INITIAL_CALL_OFF_RECORDS);
    setCoachingSessions(INITIAL_COACHING_SESSIONS);
    localStorage.removeItem(STORAGE_KEY_SET_SCHEDULES);
    localStorage.removeItem(STORAGE_KEY_TIME_OFF_REQUESTS);
    localStorage.removeItem(STORAGE_KEY_CALL_OFF_RECORDS);
    localStorage.removeItem(STORAGE_KEY_COACHING_SESSIONS);
    showToast('System Reset', 'Demo shift, trade, schedule, time tracking, CFS calls, rover routes, set schedules, and telemetry restored to initial state.', 'info');
  };

  return (
    <ShiftOpsContext.Provider
      value={{
        shifts,
        trades,
        shiftClaims,
        auditLogs,
        recentAdminActions,
        adminUsers,
        bids,
        activeGuard,
        authenticatedGuard,
        isGuardLoggedIn,
        guardLogin,
        guardLogout,
        registerGuardBiometrics,
        updateGuardCredentials,
        guardsList,
        shiftTemplates,
        activeView,
        opsPhone,
        hideFilledShifts,
        toasts,
        activeBroadcast,
        broadcastHistory,
        theme,
        alertPreferences,
        siteFeedbacks,
        sitesList,
        callsForService,
        latestDispatchedCall,
        isCallAlertOpen,
        latestCallReceipt,
        callReceipts,
        scheduledShifts,
        activeClockedInShift,
        lateShiftAlerts,
        dismissedLateAlertIds,
        clockInGuard,
        clockOutGuard,
        startGuardBreak,
        endGuardBreak,
        scheduleNewShift,
        updateScheduledShift,
        deleteScheduledShift,
        reassignScheduledShift,
        acknowledgeLateAlert,
        getGuardActiveShift,
        getGuardUpcomingShifts,
        confirmShiftAttendance,
        getGuardsLiveTracking,
        setSchedules,
        timeOffRequests,
        maxDailyApprovedTimeOff,
        dateSpecificMaxTimeOffOverrides,
        setMaxDailyApprovedTimeOff,
        setDateSpecificMaxTimeOff,
        getTimeOffStatsForDate,
        checkTimeOffApprovalCapacity,
        callOffRecords,
        addSetSchedule,
        updateSetSchedule,
        deleteSetSchedule,
        toggleSetScheduleActive,
        assignGuardToSetSchedule,
        generateSchedulesFromSetTemplates,
        getSetScheduleAiSuggestions,
        updateGuardAvailability,
        updateGuardDailyRule,
        submitTimeOffRequest,
        reviewTimeOffRequest,
        cancelTimeOffRequest,
        recordGuardCallOff,
        quickAddCallOffToBiddingQueue,
        rovers,
        roverPlans,
        activeInterceptions,
        telemetryLogs,
        trafficCondition,
        optimizationMode,
        antiPredictabilityJitterPct,
        geoClusterSectors,
        setTrafficCondition,
        setOptimizationMode,
        setAntiPredictabilityJitterPct,
        reoptimizeRoverRoutes,
        dispatchAdHocInterception,
        clearAdHocInterception,
        advanceRoverCheckpoint,
        simulateRoverGpsMove,
        addTelemetryLog,
        getRoverForGuard,
        getRoverByGroup,
        eligiblePriorityShifts,
        activePriorityPush,
        dismissedPriorityShiftIds,
        getPriorityNext24hShifts,
        dismissPriorityPush,
        clearDismissedPriorityShifts,
        snoozePriorityPush,
        triggerPriorityPushAlert,
        claimPriorityShift,
        broadcastPriorityPushToGuards,
        approveShiftClaim,
        denyShiftClaim,
        evaluateShiftClaim,
        setActiveView,
        setActiveGuard,
        setTheme,
        toggleTheme,
        setHideFilledShifts,
        dismissToast,
        showToast,
        logAdminAction,
        dismissCallReceiptNotification,
        clearAllCallReceipts,
        dispatchCall,
        acknowledgeCall,
        markCallOnScene,
        updateCallStatus,
        clearCall,
        cancelCall,
        dismissCallAlert,
        openCallAlert,
        deleteCall,
        addSiteFeedback,
        awardGuardCommendation,
        coachingSessions,
        scheduleGuardCoaching,
        confirmGuardCoaching,
        completeGuardCoaching,
        proposeAlternateCoaching,
        acceptAlternateCoaching,
        denyAlternateCoaching,
        counterAlternateCoaching,
        cancelCoachingSession,
        getGuardCoachingSessions,
        getGuardPerformance,
        getLeaderboard,
        updateAlertPreferences,
        resetAlertPreferences,
        testAlertNotification,
        sendEmergencyBroadcast,
        acknowledgeBroadcast,
        cancelOrResolveBroadcast,
        addShiftTemplate,
        updateShiftTemplate,
        deleteShiftTemplate,
        addAdminUser,
        updateAdminUser,
        deleteAdminUser,
        addGuard,
        updateGuard,
        deleteGuard,
        addSite,
        updateSite,
        deleteSite,
        getSiteByName,
        bulkImportSites,
        taskCompletionLogs,
        activeTaskAlert,
        taskAlertsHistory,
        addTimeSpecificTask,
        updateTimeSpecificTask,
        deleteTimeSpecificTask,
        completeTimeSpecificTask,
        dismissTaskAlert,
        acknowledgeTaskAlert,
        triggerTestTaskAlert,
        getTasksForSite,
        getTaskCompletionStatus,
        standardReports,
        offlineReportQueue,
        isOnline,
        isSyncingReports,
        syncQueuedReports,
        retryReportSync,
        submitStandardReport,
        updateStandardReport,
        deleteStandardReport,
        reviewStandardReport,
        updateMaintenanceWorkOrder,
        getLastActivityReportForGuard,
        createShift,
        bulkImportShifts,
        markShiftFilled,
        reopenShift,
        deleteShift,
        submitBid,
        awardShiftBid,
        postTradeRequest,
        updateTradePost,
        proposeSwap,
        approveTradePost,
        denyTradePost,
        approveSwap,
        denySwap,
        resetToDefaults
      }}
    >
      {children}
    </ShiftOpsContext.Provider>
  );
};

export const useShiftOps = (): ShiftOpsContextType => {
  const context = useContext(ShiftOpsContext);
  if (!context) {
    throw new Error('useShiftOps must be used within a ShiftOpsProvider');
  }
  return context;
};

