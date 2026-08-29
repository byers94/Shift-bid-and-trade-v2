import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { Trade, ShiftClaimRequest } from '../../types/shift';
import { formatDateLabel, formatTimestamp, formatDateTime } from '../../utils/time';
import { ReasonModal } from './ReasonModal';
import { 
  ArrowRightLeft, 
  Check, 
  X as XIcon, 
  AlertTriangle, 
  Clock, 
  History, 
  User, 
  ShieldAlert, 
  Calendar,
  CheckCircle2,
  FileText,
  Info,
  Edit3,
  Save,
  Gift,
  MapPin,
  Zap,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface TradeApprovalsProps {
  onOpenGuardDirectory?: (guardId?: string) => void;
}

export const TradeApprovals: React.FC<TradeApprovalsProps> = ({ onOpenGuardDirectory }) => {
  const { 
    trades, 
    shiftClaims, 
    guardsList, 
    approveTradePost, 
    denyTradePost, 
    approveSwap, 
    denySwap, 
    updateTradePost,
    approveShiftClaim,
    denyShiftClaim
  } = useShiftOps();
  
  const [activeTab, setActiveTab] = useState<'claims' | 'pending_posts' | 'pending_swaps' | 'history'>('claims');
  const [historySubFilter, setHistorySubFilter] = useState<'all' | 'claims' | 'trades'>('all');
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState<string>('');
  const [editType, setEditType] = useState<'giveaway' | 'swap'>('giveaway');
  const [editLocation, setEditLocation] = useState<string>('');

  // Override note state for approving a claim with custom notes
  const [overrideClaimId, setOverrideClaimId] = useState<string | null>(null);
  const [overrideNote, setOverrideNote] = useState<string>('');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);

  // Denial modal config
  const [denialModalConfig, setDenialModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    targetId: string;
    type: 'post' | 'swap' | 'claim';
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    targetId: '',
    type: 'claim'
  });

  const handleStartEdit = (trade: Trade) => {
    setEditingTradeId(trade.id);
    setEditReason(trade.reason || '');
    setEditType(trade.type || 'giveaway');
    setEditLocation(trade.originalShift.location || '');
  };

  const handleCancelEdit = () => {
    setEditingTradeId(null);
    setEditReason('');
    setEditLocation('');
  };

  const handleSaveEdit = (tradeId: string) => {
    updateTradePost(tradeId, {
      reason: editReason,
      type: editType,
      location: editLocation
    });
    setEditingTradeId(null);
  };

  const handleApproveWithEdits = (tradeId: string) => {
    if (editingTradeId === tradeId) {
      approveTradePost(tradeId, undefined, editReason, editType);
      setEditingTradeId(null);
    } else {
      approveTradePost(tradeId);
    }
  };

  // 1. Pending 1-Click Shift Claims (Sorted oldest-first)
  const pendingClaims = (shiftClaims || [])
    .filter((c) => c.status === 'pending_approval')
    .sort((a, b) => new Date(a.claimTimestamp).getTime() - new Date(b.claimTimestamp).getTime());

  // 2. Pending Trade Posts (Sorted oldest-first)
  const pendingPosts = (trades || [])
    .filter((t) => t.status === 'pending_approval')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // 3. Pending Swaps (Sorted oldest-first)
  const pendingSwaps = (trades || [])
    .filter((t) => t.status === 'pending_swap')
    .sort((a, b) => {
      const timeA = new Date(a.swapOffer?.submittedAt || a.createdAt).getTime();
      const timeB = new Date(b.swapOffer?.submittedAt || b.createdAt).getTime();
      return timeA - timeB;
    });

  // 4. Resolved History Logs
  const historyTrades = (trades || [])
    .filter((t) => t.status === 'approved' || t.status === 'denied');

  const historyClaims = (shiftClaims || [])
    .filter((c) => c.status === 'approved' || c.status === 'denied' || c.status === 'auto_approved');

  const combinedHistory = [
    ...historyClaims.map((c) => ({
      id: c.id,
      kind: 'claim' as const,
      timestamp: c.resolvedAt || c.claimTimestamp,
      data: c
    })),
    ...historyTrades.map((t) => ({
      id: t.id,
      kind: 'trade' as const,
      timestamp: t.resolvedAt || t.createdAt,
      data: t
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredHistory = combinedHistory.filter((item) => {
    if (historySubFilter === 'all') return true;
    if (historySubFilter === 'claims') return item.kind === 'claim';
    if (historySubFilter === 'trades') return item.kind === 'trade';
    return true;
  });

  const handleOpenDenyModal = (item: Trade | ShiftClaimRequest, type: 'post' | 'swap' | 'claim') => {
    if (type === 'claim') {
      const claim = item as ShiftClaimRequest;
      setDenialModalConfig({
        isOpen: true,
        title: 'Deny Shift Claim Request',
        subtitle: `Reject 1-click claim for ${claim.guardName} at ${claim.shift.siteName} (${claim.shift.date})`,
        targetId: claim.id,
        type: 'claim'
      });
    } else if (type === 'post') {
      const trade = item as Trade;
      setDenialModalConfig({
        isOpen: true,
        title: 'Deny Shift Listing Request',
        subtitle: `Reject listing for ${trade.originalShift.siteName} (${trade.offeringGuard.name})`,
        targetId: trade.id,
        type: 'post'
      });
    } else {
      const trade = item as Trade;
      setDenialModalConfig({
        isOpen: true,
        title: 'Deny Proposed Shift Swap',
        subtitle: `Reject swap between ${trade.offeringGuard.name} and ${trade.swapOffer?.offeredByGuard.name}`,
        targetId: trade.id,
        type: 'swap'
      });
    }
  };

  const handleDenySubmit = (reason: string) => {
    if (denialModalConfig.type === 'claim') {
      denyShiftClaim(denialModalConfig.targetId, reason);
    } else if (denialModalConfig.type === 'post') {
      denyTradePost(denialModalConfig.targetId, reason);
    } else {
      denySwap(denialModalConfig.targetId, reason);
    }
  };

  const handleOpenApproveOverrideModal = (claim: ShiftClaimRequest) => {
    setOverrideClaimId(claim.id);
    const suggestedNote = claim.failedChecks.length > 0 
      ? `Supervisor authorized administrative override for flags: ${claim.failedChecks.join(', ')}.`
      : 'Approved for shift assignment.';
    setOverrideNote(suggestedNote);
    setIsOverrideModalOpen(true);
  };

  const handleConfirmApproveOverride = () => {
    if (overrideClaimId) {
      approveShiftClaim(overrideClaimId, overrideNote);
      setIsOverrideModalOpen(false);
      setOverrideClaimId(null);
      setOverrideNote('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
      {/* Sub-header Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-3 shrink-0">
        <div>
          <h2 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <span>Operational Approval Queue</span>
          </h2>
          <p className="text-[10px] text-slate-400">1-Click Claims, Trade Listings & Swap Reviews</p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {/* Shift Claims Tab */}
          <button
            id="tab-shift-claims-btn"
            onClick={() => setActiveTab('claims')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'claims'
                ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Shift Claims</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              pendingClaims.length > 0
                ? 'bg-amber-400 text-slate-950 font-black'
                : activeTab === 'claims'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {pendingClaims.length}
            </span>
          </button>

          {/* Pending Posts Tab */}
          <button
            id="tab-pending-posts-btn"
            onClick={() => setActiveTab('pending_posts')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pending_posts'
                ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Posts</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'pending_posts' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {pendingPosts.length}
            </span>
          </button>

          {/* Pending Swaps Tab */}
          <button
            id="tab-pending-swaps-btn"
            onClick={() => setActiveTab('pending_swaps')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pending_swaps'
                ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Swaps</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              pendingSwaps.length > 0 
                ? 'bg-amber-400 text-slate-900 font-black' 
                : activeTab === 'pending_swaps' 
                ? 'bg-white/20 text-white' 
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {pendingSwaps.length}
            </span>
          </button>

          {/* History Log Tab */}
          <button
            id="tab-trade-history-btn"
            onClick={() => setActiveTab('history')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {combinedHistory.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        {/* FEED 0: PENDING 1-CLICK SHIFT CLAIMS (FLAGGED FOR ADMIN REVIEW) */}
        {activeTab === 'claims' && (
          <div className="flex flex-col gap-3">
            {pendingClaims.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All 1-Click Shift Claims Cleared</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No flagged shift claims currently require administrative approval.
                </p>
              </div>
            ) : (
              pendingClaims.map((claim) => {
                const isTrained = claim.violationDetails?.isSiteTrained;
                const isRestBufferValid = claim.violationDetails?.isRestBufferValid;
                const isOvertimeCompliant = claim.violationDetails?.isOvertimeCompliant;
                const guardProfile = guardsList.find((g) => g.id === claim.guardId) || claim.guardProfile;

                return (
                  <div
                    key={claim.id}
                    id={`pending-claim-card-${claim.id}`}
                    className="p-4 rounded-xl border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20 border-y border-r border-amber-200/80 dark:border-amber-900/40 shadow-xs transition-all flex flex-col gap-3"
                  >
                    {/* Header: Title & Timestamp */}
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-slate-950 flex items-center gap-1 font-mono">
                            <Zap className="w-3 h-3 fill-slate-950" />
                            1-Click Claim Flagged
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            Admin Approval Required ({claim.failedChecks.length} Policy {claim.failedChecks.length === 1 ? 'Flag' : 'Flags'})
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {claim.shift.siteName} — {formatDateLabel(claim.shift.date)}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{claim.shift.startTime} – {claim.shift.endTime} ({claim.shift.hours || 8} Hours)</span>
                          {claim.shift.address && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="truncate">{claim.shift.address}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Submitted: {formatTimestamp(claim.claimTimestamp)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ID: #{claim.id}
                        </span>
                      </div>
                    </div>

                    {/* Guard Info Strip */}
                    <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-[#1e3a8a] dark:text-blue-300 flex items-center justify-center font-black text-xs shrink-0">
                          {claim.guardName.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            Officer {claim.guardName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            Badge: {claim.guardBadge} • Phone: {claim.guardPhone}
                          </p>
                        </div>
                      </div>

                      {onOpenGuardDirectory && (
                        <button
                          type="button"
                          onClick={() => onOpenGuardDirectory(claim.guardId)}
                          className="text-[11px] font-bold text-[#1e3a8a] dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <User className="w-3 h-3" />
                          <span>View in Guard Directory</span>
                        </button>
                      )}
                    </div>

                    {/* 3-Point Validation Diagnostic Matrix */}
                    <div className="flex flex-col gap-2">
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Pre-Claim Compliance Validation Matrix</span>
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {/* Check 1: Site Training / OJT */}
                        <div className={`p-2.5 rounded-lg border flex flex-col justify-between text-xs ${
                          isTrained
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300'
                        }`}>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold mb-1">
                              {isTrained ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                              )}
                              <span className="uppercase text-[10px] tracking-tight">1. Site Training (OJT)</span>
                            </div>
                            <p className="text-[11px] leading-tight font-medium">
                              {isTrained ? 'OJT Certified for this site' : 'Site Training Incomplete'}
                            </p>
                            <p className="text-[10px] opacity-80 mt-1">
                              {isTrained 
                                ? `Officer has completed verified OJT at ${claim.shift.siteName}.` 
                                : `Lacks verified OJT at ${claim.shift.siteName}. Guard qualified on: ${(guardProfile?.ojtSites || []).join(', ') || 'No logged sites'}.`}
                            </p>
                          </div>
                          {!isTrained && (
                            <span className="mt-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 w-fit">
                              Requires OJT Waiver
                            </span>
                          )}
                        </div>

                        {/* Check 2: Turnaround / Rest Time Buffer */}
                        <div className={`p-2.5 rounded-lg border flex flex-col justify-between text-xs ${
                          isRestBufferValid
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300'
                        }`}>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold mb-1">
                              {isRestBufferValid ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                              )}
                              <span className="uppercase text-[10px] tracking-tight">2. Rest & Turnaround</span>
                            </div>
                            <p className="text-[11px] leading-tight font-medium">
                              {isRestBufferValid ? '≥6h Rest Buffer Compliant' : 'Rest Buffer Violation'}
                            </p>
                            <p className="text-[10px] opacity-80 mt-1">
                              {isRestBufferValid
                                ? 'Complies with mandatory minimum turnaround gap (zero overlap, 6h+ rest).'
                                : claim.violationDetails?.restBufferDetails || 'Adjacent shift does not provide required 6h rest buffer.'}
                            </p>
                          </div>
                          {!isRestBufferValid && (
                            <span className="mt-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 w-fit">
                              Fatigue Waiver Required
                            </span>
                          )}
                        </div>

                        {/* Check 3: Overtime / 40-Hour Limit */}
                        <div className={`p-2.5 rounded-lg border flex flex-col justify-between text-xs ${
                          isOvertimeCompliant
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300'
                        }`}>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold mb-1">
                              {isOvertimeCompliant ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                              )}
                              <span className="uppercase text-[10px] tracking-tight">3. 40h Weekly Overtime</span>
                            </div>
                            <p className="text-[11px] leading-tight font-medium">
                              {isOvertimeCompliant 
                                ? `≤40h Regular Limit (${claim.violationDetails?.projectedWeeklyHours || 0}h Total)` 
                                : `Overtime Triggered (+${claim.violationDetails?.overtimeHours || 0}h OT)`}
                            </p>
                            <p className="text-[10px] opacity-80 mt-1">
                              {isOvertimeCompliant
                                ? `Current schedule: ${claim.violationDetails?.currentWeeklyHours || 0}h + ${claim.violationDetails?.shiftHours || 8}h shift = ${claim.violationDetails?.projectedWeeklyHours || 0}h (Monday–Sunday).`
                                : `Adding this ${claim.violationDetails?.shiftHours || 8}h shift pushes weekly hours from ${claim.violationDetails?.currentWeeklyHours || 0}h to ${claim.violationDetails?.projectedWeeklyHours || 0}h (+${claim.violationDetails?.overtimeHours || 0}h over 40h regular cap).`}
                            </p>
                          </div>
                          {!isOvertimeCompliant && (
                            <span className="mt-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 w-fit">
                              OT Budget Authorization Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Operational Action Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/80 dark:border-amber-900/40">
                      <div className="flex items-center gap-2">
                        <button
                          id={`approve-claim-btn-${claim.id}`}
                          onClick={() => handleOpenApproveOverrideModal(claim)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Claim (Override Flags)</span>
                        </button>

                        <button
                          id={`deny-claim-btn-${claim.id}`}
                          onClick={() => handleOpenDenyModal(claim, 'claim')}
                          className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                          <span>Deny Claim</span>
                        </button>
                      </div>

                      <span className="text-[11px] text-slate-500 italic">
                        Approving will assign guard, mark shift filled, and log the administrative override.
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* FEED 1: PENDING POSTS */}
        {activeTab === 'pending_posts' && (
          <div className="flex flex-col gap-3">
            {pendingPosts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">All Shift Listing Requests Cleared</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No pending guard shift posts require approval.</p>
              </div>
            ) : (
              pendingPosts.map((trade) => {
                const isEditing = editingTradeId === trade.id;
                const isGiveaway = trade.type === 'giveaway';

                return (
                  <div
                    key={trade.id}
                    id={`pending-post-card-${trade.id}`}
                    className={`p-3.5 rounded-r-xl border-y border-r shadow-xs transition-all ${
                      isEditing
                        ? 'border-l-4 border-blue-600 bg-blue-50/40 border-blue-200 dark:border-blue-800'
                        : isGiveaway
                        ? 'border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40'
                        : 'border-l-4 border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {isGiveaway ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1 border border-emerald-300/60 dark:border-emerald-700">
                            <Gift className="w-3 h-3 text-emerald-600" />
                            Give Up / Drop Shift (Giveaway)
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-300 flex items-center gap-1 border border-blue-300/60 dark:border-blue-700">
                            <ArrowRightLeft className="w-3 h-3 text-blue-700" />
                            Trade / Swap Request
                          </span>
                        )}

                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          Pending Review
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatTimestamp(trade.createdAt)}
                        </span>
                        {!isEditing ? (
                          <button
                            onClick={() => handleStartEdit(trade)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Reason or Type before approval"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={handleCancelEdit}
                            className="text-[10px] text-slate-500 hover:text-slate-800 underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Officer info */}
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      {trade.offeringGuard.name} ({trade.offeringGuard.badgeNumber}) — Phone: {trade.offeringGuard.phone}
                    </div>

                    {/* Shift details */}
                    <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{trade.originalShift.siteName}</span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {formatDateLabel(trade.originalShift.date)} • {trade.originalShift.startTime} - {trade.originalShift.endTime} ({trade.originalShift.hours}h)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{trade.originalShift.location || trade.originalShift.address || 'Address on file'}</span>
                      </div>
                    </div>

                    {/* Guard's Reason */}
                    {!isEditing ? (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white/60 dark:bg-slate-800/60 p-2 rounded border border-slate-200/80 dark:border-slate-700 mb-3">
                        "{trade.reason || 'No specific reason provided'}"
                      </p>
                    ) : (
                      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-blue-300 dark:border-blue-700 mb-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase">Operational Edit Mode</span>
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Type:</label>
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as 'giveaway' | 'swap')}
                              className="text-xs border rounded px-1.5 py-0.5 bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
                            >
                              <option value="giveaway">Giveaway (Drop)</option>
                              <option value="swap">Trade / Swap</option>
                            </select>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder="Refine or add administrative notes to the reason..."
                          className="w-full text-xs border rounded p-1.5 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(trade.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" /> Save Changes
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          id={`approve-post-btn-${trade.id}`}
                          onClick={() => handleApproveWithEdits(trade.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isEditing ? 'APPROVE WITH EDITS' : 'APPROVE LISTING'}
                        </button>
                        <button
                          id={`deny-post-btn-${trade.id}`}
                          onClick={() => handleOpenDenyModal(trade, 'post')}
                          className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                          DENY
                        </button>
                      </div>

                      {onOpenGuardDirectory && (
                        <button
                          type="button"
                          onClick={() => onOpenGuardDirectory(trade.offeringGuard.id)}
                          className="text-[11px] font-bold text-[#1e3a8a] dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer"
                          title="Open Guard Directory to review full profile"
                        >
                          <User className="w-3 h-3" />
                          <span>Guard Directory</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* FEED 2: PENDING SWAPS */}
        {activeTab === 'pending_swaps' && (
          <div className="flex flex-col gap-3">
            {pendingSwaps.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No Pending Swaps Requiring Action</p>
                <p className="text-[11px] text-slate-400 mt-0.5">When two guards agree on a 2-way shift exchange, it will appear here for dispatch authorization.</p>
              </div>
            ) : (
              pendingSwaps.map((trade) => {
                const guardA = trade.offeringGuard;
                const guardB = trade.swapOffer?.offeredByGuard;
                const shiftA = trade.originalShift;
                const shiftB = trade.swapOffer?.offeredShift;

                // Check OJT Site Qualification for Guard B at Site A
                const guardBProfile = guardsList.find((g) => g.id === guardB?.id);
                const isTrained = guardBProfile?.ojtSites?.some(
                  (site) => site.toLowerCase() === shiftA.siteName.toLowerCase() || shiftA.siteName.toLowerCase().includes(site.toLowerCase())
                );
                const needsOjt = !isTrained;

                return (
                  <div
                    key={trade.id}
                    id={`pending-swap-card-${trade.id}`}
                    className={`p-4 rounded-xl border-l-4 shadow-xs transition-all ${
                      needsOjt
                        ? 'border-l-red-600 bg-red-50/60 dark:bg-red-950/20 border-y border-r border-red-200 dark:border-red-900/40'
                        : 'border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20 border-y border-r border-amber-200 dark:border-amber-900/40'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                        <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        {needsOjt ? (
                          <span className="text-red-700 dark:text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            Proposed Swap: OJT Training Review Required
                          </span>
                        ) : (
                          <>
                            Proposed Swap: Standard Review
                          </>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatTimestamp(trade.swapOffer?.submittedAt || trade.createdAt)}
                      </span>
                    </div>

                    {/* Swap Breakdown comparison */}
                    <div className="bg-white dark:bg-slate-800/90 p-3 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-2">
                      <div className="border-r border-slate-100 dark:border-slate-700 pr-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Guard A (Listing Shift):</span>
                        <div className="font-bold text-[#1e3a8a] dark:text-blue-400">{guardA.name} ({guardA.badgeNumber})</div>
                        <div className="text-slate-700 dark:text-slate-300 font-medium">{shiftA.siteName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{formatDateLabel(shiftA.date)} • {shiftA.hours}h</div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Guard B (Offering Shift):</span>
                        <div className="font-bold text-[#1e3a8a] dark:text-blue-400">{guardB?.name} ({guardB?.badgeNumber})</div>
                        <div className="text-slate-700 dark:text-slate-300 font-medium">{shiftB?.siteName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{formatDateLabel(shiftB?.date || '')} • {shiftB?.hours}h</div>
                      </div>
                    </div>

                    {/* High-visibility OJT Warning Badge if Guard B needs training */}
                    {needsOjt ? (
                      <div className="bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 p-2 rounded-lg text-xs font-bold mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>OJT TRAINING REQUIRED: {guardB?.name} is NOT site-qualified for {shiftA.siteName}</span>
                        </span>
                        <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">
                          Supervisor Waiver Needed
                        </span>
                      </div>
                    ) : (
                      <div className="bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-1.5 rounded text-[11px] font-semibold mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Site Qualifications Verified: Both guards hold current OJT clearances.</span>
                      </div>
                    )}

                    {trade.swapOffer?.datesTimesNotes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 p-2 rounded border border-slate-200 dark:border-slate-700 mb-3">
                        <strong>Availability Notes:</strong> {trade.swapOffer.datesTimesNotes}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          id={`approve-swap-btn-${trade.id}`}
                          onClick={() => approveSwap(trade.id)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-xs flex items-center gap-1 transition-all cursor-pointer ${
                            needsOjt
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {needsOjt ? 'APPROVE WITH OJT WAIVER' : 'APPROVE SWAP'}
                        </button>
                        <button
                          id={`deny-swap-btn-${trade.id}`}
                          onClick={() => handleOpenDenyModal(trade, 'swap')}
                          className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                          DENY
                        </button>
                      </div>

                      {onOpenGuardDirectory && (
                        <button
                          type="button"
                          onClick={() => onOpenGuardDirectory(guardB?.id || guardA.id)}
                          className="text-[11px] font-bold text-[#1e3a8a] dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                          title="Open Guard Directory to review full site qualifications and contact info"
                        >
                          <User className="w-3 h-3" />
                          <span>Check Training in Guard Directory</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* FEED 3: HISTORY LOG (PERMANENT AUDIT TRAIL FOR CLAIMS & TRADES) */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-3">
            {/* History Filter Subtabs */}
            <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Filter:</span>
              <button
                onClick={() => setHistorySubFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                  historySubFilter === 'all'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                All Records ({combinedHistory.length})
              </button>
              <button
                onClick={() => setHistorySubFilter('claims')}
                className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                  historySubFilter === 'claims'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Shift Claims ({historyClaims.length})
              </button>
              <button
                onClick={() => setHistorySubFilter('trades')}
                className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                  historySubFilter === 'trades'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Trades & Swaps ({historyTrades.length})
              </button>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No Resolved Records Yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Approved and denied shift claims, giveaways, and swaps will appear in this permanent audit log.</p>
              </div>
            ) : (
              filteredHistory.map((item) => {
                if (item.kind === 'claim') {
                  const claim = item.data as ShiftClaimRequest;
                  const isApproved = claim.status === 'approved' || claim.status === 'auto_approved';
                  const isAuto = claim.status === 'auto_approved';

                  return (
                    <div
                      key={claim.id}
                      id={`history-claim-card-${claim.id}`}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isApproved 
                          ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
                          : 'border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase font-mono ${
                            isAuto 
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800' 
                              : isApproved 
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                              : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
                          }`}>
                            {isAuto ? '⚡ 1-CLICK AUTO-APPROVED' : isApproved ? '✓ CLAIM APPROVED BY ADMIN' : '✕ CLAIM DENIED BY ADMIN'}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Claim #{claim.id}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          {formatDateTime(claim.resolvedAt || claim.claimTimestamp)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 dark:text-slate-200 mb-1 font-medium">
                        <strong>Officer:</strong> {claim.guardName} ({claim.guardBadge}) —{' '}
                        <span>{claim.shift.siteName} ({formatDateLabel(claim.shift.date)}, {claim.shift.startTime}-{claim.shift.endTime})</span>
                      </p>

                      {claim.failedChecks && claim.failedChecks.length > 0 && (
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-2 rounded border border-amber-200 dark:border-amber-900/60 mb-2">
                          <strong>Triggered Validation Flags:</strong> {claim.failedChecks.join(', ')}
                        </div>
                      )}

                      {claim.adminResolutionNote && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                          <strong>Admin Resolution Log:</strong> {claim.adminResolutionNote} {claim.resolvedByAdminName && `(by ${claim.resolvedByAdminName})`}
                        </div>
                      )}
                    </div>
                  );
                } else {
                  const trade = item.data as Trade;
                  const isApproved = trade.status === 'approved';

                  return (
                    <div
                      key={trade.id}
                      id={`history-trade-card-${trade.id}`}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isApproved 
                          ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
                          : 'border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                            isApproved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}>
                            {isApproved ? 'APPROVED & FINALIZED' : 'DENIED BY OPS'}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Trade #{trade.id}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          {formatDateTime(trade.resolvedAt || '')}
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 dark:text-slate-200 mb-2 font-medium">
                        <strong>Listing Guard:</strong> {trade.offeringGuard.name} ({trade.offeringGuard.badgeNumber}) —{' '}
                        <span>{trade.originalShift.siteName} ({formatDateLabel(trade.originalShift.date)})</span>
                      </p>

                      {trade.swapOffer && (
                        <p className="text-xs text-slate-800 dark:text-slate-200 mb-2">
                          <strong>Swapped with:</strong> {trade.swapOffer.offeredByGuard.name} ({trade.swapOffer.offeredByGuard.badgeNumber}) —{' '}
                          <span>{trade.swapOffer.offeredShift.siteName}</span>
                        </p>
                      )}

                      {/* Auto-generated Timestamp Timeline */}
                      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 text-[11px] font-mono grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 dark:text-slate-400 mb-2">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase">1. Created</span>
                          {formatDateTime(trade.createdAt)}
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase">2. Bid/Swap Proposed</span>
                          {trade.bidAt ? formatDateTime(trade.bidAt) : 'Direct Post'}
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase">3. Ops Resolved</span>
                          {trade.resolvedAt ? formatDateTime(trade.resolvedAt) : 'Pending'}
                        </div>
                      </div>

                      {trade.resolutionNote && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                          <strong>Decision Log:</strong> {trade.resolutionNote}
                        </div>
                      )}
                    </div>
                  );
                }
              })
            )}
          </div>
        )}
      </div>

      {/* Denial Reason Modal */}
      <ReasonModal
        isOpen={denialModalConfig.isOpen}
        title={denialModalConfig.title}
        subtitle={denialModalConfig.subtitle}
        onClose={() => setDenialModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={handleDenySubmit}
      />

      {/* Administrative Approval Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="bg-emerald-700 text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide">Approve Shift Claim Override</h3>
                  <p className="text-[11px] text-emerald-100">Authorize roster assignment despite flagged policy checks</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOverrideModalOpen(false)} 
                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 bg-white dark:bg-slate-900">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                You are authorizing an administrative override for this shift claim. The guard will be immediately assigned to the schedule and the shift marked as filled.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Manager Override Note / Reason:
                </label>
                <textarea
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Authorized 4h overtime due to high client demand; supervisor on-site shadow verification."
                  className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproveOverride}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  Confirm & Assign Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
