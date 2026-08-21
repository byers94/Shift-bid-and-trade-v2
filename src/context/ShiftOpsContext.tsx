import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Shift, 
  Trade, 
  AuditLogEntry, 
  BidRecord, 
  GuardProfile, 
  TrainingStatus 
} from '../types/shift';
import { 
  INITIAL_SHIFTS, 
  INITIAL_TRADES, 
  INITIAL_AUDIT_LOGS, 
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
  bids: BidRecord[];
  activeGuard: GuardProfile;
  guardsList: GuardProfile[];
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
  
  // Shift Operations
  createShift: (data: {
    siteName: string;
    location?: string;
    date: string;
    startTime: string;
    endTime: string;
    urgency: 'standard' | 'emergency';
    hourlyRate?: number;
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
    location?: string;
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
  }) => Trade;
  proposeSwap: (tradeId: string, data: {
    siteName: string;
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

  const [bids, setBids] = useState<BidRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BIDS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeGuard, setActiveGuard] = useState<GuardProfile>(CURRENT_GUARD);
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
    location?: string;
    date: string;
    startTime: string;
    endTime: string;
    urgency: 'standard' | 'emergency';
    hourlyRate?: number;
    notes?: string;
    requiredCertifications?: string[];
  }): Shift => {
    const hours = calculateHours(data.startTime, data.endTime);
    const newShift: Shift = {
      id: 'shift-' + Date.now().toString().slice(-4),
      siteName: data.siteName.trim(),
      location: data.location?.trim() || 'Main Site Entrance',
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      hours: hours || 8,
      urgency: data.urgency,
      status: 'open',
      hourlyRate: data.hourlyRate || (data.urgency === 'emergency' ? 28 : 24),
      notes: data.notes?.trim() || '',
      requiredCertifications: data.requiredCertifications || [],
      createdAt: new Date().toISOString(),
      bidsCount: 0
    };

    setShifts((prev) => [newShift, ...prev]);
    
    const details = `New ${data.urgency.toUpperCase()} shift posted at ${data.siteName} (${data.date} • ${data.startTime}-${data.endTime}, ${hours}h)`;
    addAuditLog('SHIFT_CREATED', 'shift', details, 'Ops Admin', data.urgency === 'emergency' ? 'danger' : 'info');
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
        location: item.location || 'Assigned Post Area',
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        hours: item.hours || hours || 8,
        urgency: item.urgency === 'emergency' ? 'emergency' : 'standard',
        status: 'open',
        hourlyRate: Number(item.hourlyRate) || 25,
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
    showToast('Shift Reopened', `${siteLabel} is now accepting bids again.`, 'warning');
  };

  // 5. Delete Shift
  const deleteShift = (shiftId: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    addAuditLog('SHIFT_DELETED', 'shift', `Shift #${shiftId} removed from system.`, 'Ops Admin', 'danger');
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

    const smsBody = `[SECURESHIFT BID]\nGuard: ${activeGuard.name} (${activeGuard.badgeNumber})\nPhone: ${activeGuard.phone}\nShift: ${shift.siteName}\nDate: ${shift.date} (${shift.startTime}-${shift.endTime}, ${shift.hours}h)\nStatus: ${trainingText}\nPlease confirm assignment.`;

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
    const details = `Trade listing #${tradeId} (${trade?.originalShift.siteName}) APPROVED by Ops. Now live on Trade Board.`;
    addAuditLog('POST_APPROVED', 'trade', details, 'Ops Admin', 'success');
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
    const details = `Trade listing #${tradeId} (${trade?.originalShift.siteName}) DENIED. Reason: ${reason}`;
    addAuditLog('POST_DENIED', 'trade', details, 'Ops Admin', 'danger');
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
    showToast('Swap Proposal Denied', `Swap rejected: ${reason}`, 'danger');
  };

  // Reset to Defaults
  const resetToDefaults = () => {
    setShifts(INITIAL_SHIFTS);
    setTrades(INITIAL_TRADES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setBids([]);
    localStorage.removeItem(STORAGE_KEY_SHIFTS);
    localStorage.removeItem(STORAGE_KEY_TRADES);
    localStorage.removeItem(STORAGE_KEY_LOGS);
    localStorage.removeItem(STORAGE_KEY_BIDS);
    showToast('System Reset', 'Demo shift and trade data restored to initial state.', 'info');
  };

  return (
    <ShiftOpsContext.Provider
      value={{
        shifts,
        trades,
        auditLogs,
        bids,
        activeGuard,
        guardsList: GUARDS_LIST,
        activeView,
        opsPhone,
        hideFilledShifts,
        toasts,
        setActiveView,
        setActiveGuard,
        setHideFilledShifts,
        dismissToast,
        showToast,
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
