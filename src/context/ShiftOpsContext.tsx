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
  ShiftTemplate
} from '../types/shift';
import { 
  INITIAL_SHIFTS, 
  INITIAL_TRADES, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_ADMIN_ACTIONS,
  INITIAL_ADMIN_USERS,
  INITIAL_SHIFT_TEMPLATES,
  CURRENT_GUARD, 
  GUARDS_LIST,
  OPS_DISPATCH_PHONE 
} from '../data/mockData';
import { calculateHours, generateSmsLink } from '../utils/time';

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
  
  // Actions
  setActiveView: (view: 'dual' | 'guard' | 'ops') => void;
  setActiveGuard: (guard: GuardProfile) => void;
  setHideFilledShifts: (hide: boolean) => void;
  dismissToast: (id: string) => void;
  showToast: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger') => void;
  logAdminAction: (action: Omit<AdminAction, 'id' | 'timestamp'> & { timestamp?: string }) => void;
  
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
  }) => GuardProfile;
  updateGuard: (id: string, data: Partial<GuardProfile>) => void;
  deleteGuard: (id: string) => void;

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
  
  // Trade Operations
  postTradeRequest: (data: {
    siteName: string;
    address?: string;
    location?: string;
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
  }) => Trade;
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
  approveTradePost: (tradeId: string, note?: string) => void;
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

  // Persist state to localStorage
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
    category: 'shift' | 'trade' | 'swap' | 'system',
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

  // 7. Post Trade Request (Guard)
  const postTradeRequest = (data: {
    siteName: string;
    address?: string;
    location?: string;
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
  }): Trade => {
    const hours = calculateHours(data.startTime, data.endTime);
    const newTrade: Trade = {
      id: 'trade-' + Date.now().toString().slice(-4),
      type: 'giveaway',
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

    addAuditLog(
      'POST_REQUEST_SUBMITTED',
      'trade',
      `${activeGuard.name} requested to list shift ${data.siteName} (${data.date}) for trade/giveaway. Awaiting Ops approval.`,
      activeGuard.name,
      'warning'
    );

    showToast('Trade Request Submitted', 'Submitted to Ops Dispatch for review.', 'info');

    return newTrade;
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
  const approveTradePost = (tradeId: string, note?: string) => {
    setTrades((prev) =>
      prev.map((t) => {
        if (t.id === tradeId) {
          return {
            ...t,
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
    const details = `Trade listing #${tradeId} (${siteName}) APPROVED by Ops. Now live on Trade Board.`;
    
    addAuditLog('POST_APPROVED', 'trade', details, 'Ops Admin', 'success');
    
    logAdminAction({
      type: 'trade_approved',
      title: 'Trade Giveaway Approved',
      description: `Authorized shift giveaway for ${guardName} at ${siteName}`,
      adminName: 'Dispatcher Sarah Keller',
      adminBadge: 'OPS-DISP-04',
      badgeVariant: 'blue',
      metadata: { tradeId, guard: guardName, site: siteName }
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
  }): GuardProfile => {
    const newGuard: GuardProfile = {
      id: 'guard-' + Date.now().toString().slice(-4),
      name: data.name.trim(),
      badgeNumber: data.badgeNumber.trim().toUpperCase(),
      phone: data.phone.trim(),
      role: data.role,
      ojtSites: data.ojtSites || []
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
    setBids([]);
    localStorage.removeItem(STORAGE_KEY_SHIFTS);
    localStorage.removeItem(STORAGE_KEY_TRADES);
    localStorage.removeItem(STORAGE_KEY_LOGS);
    localStorage.removeItem(STORAGE_KEY_ADMIN_ACTIONS);
    localStorage.removeItem(STORAGE_KEY_ADMIN_USERS);
    localStorage.removeItem(STORAGE_KEY_GUARDS);
    localStorage.removeItem(STORAGE_KEY_TEMPLATES);
    localStorage.removeItem(STORAGE_KEY_BIDS);
    showToast('System Reset', 'Demo shift, trade, and user data restored to initial state.', 'info');
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
        setActiveView,
        setActiveGuard,
        setHideFilledShifts,
        dismissToast,
        showToast,
        logAdminAction,
        addShiftTemplate,
        updateShiftTemplate,
        deleteShiftTemplate,
        addAdminUser,
        updateAdminUser,
        deleteAdminUser,
        addGuard,
        updateGuard,
        deleteGuard,
        createShift,
        bulkImportShifts,
        markShiftFilled,
        reopenShift,
        deleteShift,
        submitBid,
        postTradeRequest,
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

