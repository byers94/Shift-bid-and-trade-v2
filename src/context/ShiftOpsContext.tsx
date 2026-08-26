import React, { createContext, useContext, useState, useEffect } from 'react';
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
  SiteSecurityTier
} from '../types/shift';
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
  INITIAL_SITES
} from '../data/mockData';
import { calculateHours, generateSmsLink } from '../utils/time';
import { playEmergencyAlertSound } from '../utils/audioAlert';

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
  
  // Actions
  setActiveView: (view: 'dual' | 'guard' | 'ops') => void;
  setActiveGuard: (guard: GuardProfile) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setHideFilledShifts: (hide: boolean) => void;
  dismissToast: (id: string) => void;
  showToast: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger') => void;
  logAdminAction: (action: Omit<AdminAction, 'id' | 'timestamp'> & { timestamp?: string }) => void;

  // Top Performers & Site Feedback
  addSiteFeedback: (feedback: Omit<SiteFeedbackEntry, 'id'>) => SiteFeedbackEntry;
  awardGuardCommendation: (guardId: string, badgeName: string, note?: string) => void;
  getGuardPerformance: (guardId: string) => GuardPerformanceStats;
  getLeaderboard: (sortBy?: 'composite' | 'shifts' | 'rating' | 'emergency' | 'ontime', timeframe?: string) => (GuardProfile & GuardPerformanceStats)[];
  
  // Guard Shift Alert Preferences
  updateAlertPreferences: (prefs: Partial<ShiftAlertPreferences>) => void;
  resetAlertPreferences: () => void;
  testAlertNotification: (category: 'emergency_alerts' | 'urgent_open_shifts' | 'trade_matches') => void;
  
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
  
  // System
  resetToDefaults: () => void;
}

const ShiftOpsContext = createContext<ShiftOpsContextType | undefined>(undefined);

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

export const ShiftOpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    return GUARDS_LIST[0] || CURRENT_GUARD;
  });
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

  const testAlertNotification = (category: 'emergency_alerts' | 'urgent_open_shifts' | 'trade_matches') => {
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
      playEmergencyAlertSound();
    }

    showToast(title, message, type);
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
  }): GuardProfile => {
    const newGuard: GuardProfile = {
      id: 'guard-' + Date.now().toString().slice(-4),
      name: data.name.trim(),
      badgeNumber: data.badgeNumber.trim().toUpperCase(),
      phone: data.phone.trim(),
      role: data.role,
      ojtSites: data.ojtSites || [],
      email: data.email?.trim() || undefined,
      trainingLevel: data.trainingLevel || (data.ojtSites && data.ojtSites.length > 1 ? 'trained' : 'needs_ojt'),
      certifications: data.certifications || [],
      notes: data.notes?.trim() || undefined,
      hireDate: data.hireDate || new Date().toISOString().split('T')[0]
    };

    setGuardsList((prev) => [...prev, newGuard]);

    addAuditLog(
      'GUARD_REGISTERED',
      'system',
      `Security personnel registered: ${newGuard.name} (${newGuard.badgeNumber}) with ${newGuard.ojtSites.length} site qualifications`,
      'Ops Admin (Personnel)',
      'info'
    );

    logAdminAction({
      type: 'guard_created',
      title: 'Guard Roster Updated',
      description: `Added officer ${newGuard.name} (${newGuard.badgeNumber}) to guard directory.`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'blue',
      metadata: { guardId: newGuard.id, badgeNumber: newGuard.badgeNumber }
    });

    showToast('Guard Added', `${newGuard.name} registered to guard roster.`, 'success');
    return newGuard;
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
    setBids(INITIAL_BIDS);
    setActiveBroadcast(null);
    setBroadcastHistory([]);
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
    setAlertPreferencesState(DEFAULT_ALERT_PREFERENCES);
    setSiteFeedbacks(INITIAL_SITE_FEEDBACKS);
    setSitesList(INITIAL_SITES);
    showToast('System Reset', 'Demo shift, trade, user, site directory, feedback, and alert data restored to initial state.', 'info');
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
        setActiveView,
        setActiveGuard,
        setTheme,
        toggleTheme,
        setHideFilledShifts,
        dismissToast,
        showToast,
        logAdminAction,
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

