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
  RovingGroup
} from '../types/shift';
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
  INITIAL_SCHEDULED_SHIFTS
} from '../data/mockData';
import { calculateHours, generateSmsLink, calculateShiftLateStatus, getShiftElapsedSeconds, formatElapsedTimer } from '../utils/time';
import {
  evaluatePriorityShiftsForGuard,
  checkShiftScheduleConflict,
  isShiftOccurringInNext24Hours,
  formatRestBuffer
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
  playPriorityShiftAlertSound
} from '../utils/audioAlert';

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
  getGuardPerformance: (guardId: string) => GuardPerformanceStats;
  getLeaderboard: (sortBy?: 'composite' | 'shifts' | 'rating' | 'emergency' | 'ontime', timeframe?: string) => (GuardProfile & GuardPerformanceStats)[];
  
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
  claimPriorityShift: (shiftId: string, guardId?: string) => { success: boolean; message: string; shift?: Shift; scheduledShift?: ScheduledShift };
  broadcastPriorityPushToGuards: (shiftId: string) => { notifiedGuardsCount: number; eligibleGuards: GuardProfile[] };
  
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
  getGuardsLiveTracking: () => GuardLiveTrackingItem[];

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
      return saved ? JSON.parse(saved) : INITIAL_SITES;
    } catch {
      return INITIAL_SITES;
    }
  });

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

  // One-Click Claim of Priority Shift with Overlap & 6-Hour Rest Gap Verification
  const claimPriorityShift = (
    shiftId: string,
    guardId?: string
  ): { success: boolean; message: string; shift?: Shift; scheduledShift?: ScheduledShift } => {
    const targetShift = shifts.find((s) => s.id === shiftId);
    if (!targetShift) {
      return { success: false, message: 'Shift not found.' };
    }

    if (targetShift.status !== 'open') {
      return { success: false, message: 'This shift is no longer open or has already been filled.' };
    }

    const guard = guardId ? (guardsList.find((g) => g.id === guardId) || activeGuard) : activeGuard;

    // Collect all existing assignments for the guard
    const guardAssignedShifts: Array<ScheduledShift | Shift> = [
      ...scheduledShifts.filter((s) => s.guardId === guard.id && s.status !== 'cancelled'),
      ...shifts.filter(
        (s) =>
          s.status === 'filled' &&
          (s.assignedGuardId === guard.id || s.assignedGuardName?.toLowerCase() === guard.name.toLowerCase())
      )
    ];

    const minRest = alertPreferences.minRestBufferHours !== undefined ? alertPreferences.minRestBufferHours : 6;
    const conflict = checkShiftScheduleConflict(targetShift, guardAssignedShifts, minRest);

    if (!conflict.isEligible) {
      const reason = conflict.conflictReason || 'Schedule conflict detected.';
      showToast('Cannot Claim Shift', reason, 'danger');
      addAuditLog(
        'SHIFT_CLAIM_REJECTED',
        'shift',
        `Officer ${guard.name} (${guard.badgeNumber}) claim for ${targetShift.siteName} rejected: ${reason}`,
        `${guard.name} (${guard.badgeNumber})`,
        'warning'
      );
      return { success: false, message: reason, shift: targetShift };
    }

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
      postRole: targetShift.location || `${targetShift.siteName} Priority Post`,
      postInstructions: targetShift.notes || 'Report to security office on arrival. Complete patrol checklist.',
      requiredCertifications: targetShift.requiredCertifications || [],
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    setScheduledShifts((prev) => [newScheduledShift, ...prev]);

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
      `Officer ${guard.name} (${guard.badgeNumber}) claimed 24h priority shift at ${targetShift.siteName} (${targetShift.date} ${targetShift.startTime}-${targetShift.endTime}). 6h+ rest buffer verified.`,
      `${guard.name} (${guard.badgeNumber})`,
      'success'
    );

    logAdminAction({
      type: 'priority_shift_claimed',
      title: 'Priority 24h Shift Claimed',
      description: `Officer ${guard.name} (${guard.badgeNumber}) claimed 24h priority post at ${targetShift.siteName} (${targetShift.date} ${targetShift.startTime}-${targetShift.endTime}). Rest buffer verified (${minRest}h min).`,
      adminName: `${guard.name}`,
      adminBadge: `${guard.badgeNumber}`,
      badgeVariant: 'emerald',
      metadata: { shiftId: targetShift.id, guardId: guard.id, siteName: targetShift.siteName, minRest }
    });

    showToast(
      '🎉 Priority Shift Claimed!',
      `You are scheduled for ${targetShift.siteName} on ${targetShift.date} (${targetShift.startTime}-${targetShift.endTime}). 6h+ rest buffer verified.`,
      'success'
    );

    return {
      success: true,
      message: 'Shift successfully claimed and scheduled!',
      shift: { ...targetShift, status: 'filled', assignedGuardName: guard.name, assignedGuardId: guard.id },
      scheduledShift: newScheduledShift
    };
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

  const getGuardPerformance = (guardId: string): GuardPerformanceStats => {
    const base = GUARD_BASE_METRICS[guardId] || {
      fulfilledShiftsCount: 6,
      totalHoursCompleted: 48,
      emergencyShiftsFulfilled: 1,
      ratingAverage: 4.65,
      positiveFeedbackCount: 3,
      onTimeArrivalRate: 96.0,
      recognitionBadges: ['Active Patrol'],
      topCommendedSite: 'Corporate HQ'
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
      recentFeedbacks: guardFeedbacks
    };
  };

  const getLeaderboard = (
    sortBy: 'composite' | 'shifts' | 'rating' | 'emergency' | 'ontime' = 'composite',
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
      
      // Default composite score
      const scoreA = (a.fulfilledShiftsCount * 2) + (a.ratingAverage * 25) + (a.emergencyShiftsFulfilled * 4) + (a.onTimeArrivalRate / 5);
      const scoreB = (b.fulfilledShiftsCount * 2) + (b.ratingAverage * 25) + (b.emergencyShiftsFulfilled * 4) + (b.onTimeArrivalRate / 5);
      return scoreB - scoreA;
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
    const newSite: SiteProfile = {
      ...data,
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
      prev.map((s) => (s.id === id ? { ...s, ...data } : s))
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
            alpha: 'Alpha Group',
            bravo: 'Bravo Group',
            charlie: 'Charlie Group',
            delta: 'Delta Group',
            echo: 'Echo Group',
            foxtrot: 'Foxtrot Group'
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
        clockInVerifiedAt: currentShift?.clockInVerifiedAt
      };
    });
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
      notes: `Full fleet circuit re-optimized. Projected ${totalDeadheadSaved} min deadhead reduction across ${rovers.length} rover units.`
    });

    logAdminAction({
      type: 'routes_reoptimized',
      title: 'Rover Routes Re-Optimized',
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
    showToast('System Reset', 'Demo shift, trade, schedule, time tracking, CFS calls, rover routes, and telemetry restored to initial state.', 'info');
  };

  return (
    <ShiftOpsContext.Provider
      value={{
        shifts,
        trades,
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
        getGuardsLiveTracking,
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

