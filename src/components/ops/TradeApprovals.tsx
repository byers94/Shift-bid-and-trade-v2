import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { Trade } from '../../types/shift';
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
  MapPin
} from 'lucide-react';

interface TradeApprovalsProps {
  onOpenGuardDirectory?: (guardId?: string) => void;
}

export const TradeApprovals: React.FC<TradeApprovalsProps> = ({ onOpenGuardDirectory }) => {
  const { trades, guardsList, approveTradePost, denyTradePost, approveSwap, denySwap, updateTradePost } = useShiftOps();
  
  const [activeTab, setActiveTab] = useState<'pending_posts' | 'pending_swaps' | 'history'>('pending_posts');
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState<string>('');
  const [editType, setEditType] = useState<'giveaway' | 'swap'>('giveaway');
  const [editLocation, setEditLocation] = useState<string>('');

  const [denialModalConfig, setDenialModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    targetId: string;
    type: 'post' | 'swap';
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    targetId: '',
    type: 'post'
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

  // 1. Pending Posts (Sorted oldest-first)
  const pendingPosts = trades
    .filter((t) => t.status === 'pending_approval')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // 2. Pending Swaps (Sorted oldest-first)
  const pendingSwaps = trades
    .filter((t) => t.status === 'pending_swap')
    .sort((a, b) => {
      const timeA = new Date(a.swapOffer?.submittedAt || a.createdAt).getTime();
      const timeB = new Date(b.swapOffer?.submittedAt || b.createdAt).getTime();
      return timeA - timeB;
    });

  // 3. Resolved History Log (Sorted newest-resolved first)
  const historyTrades = trades
    .filter((t) => t.status === 'approved' || t.status === 'denied')
    .sort((a, b) => {
      const timeA = new Date(a.resolvedAt || a.createdAt).getTime();
      const timeB = new Date(b.resolvedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

  const handleOpenDenyModal = (trade: Trade, type: 'post' | 'swap') => {
    if (type === 'post') {
      setDenialModalConfig({
        isOpen: true,
        title: 'Deny Shift Listing Request',
        subtitle: `Reject listing for ${trade.originalShift.siteName} (${trade.offeringGuard.name})`,
        targetId: trade.id,
        type: 'post'
      });
    } else {
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
    if (denialModalConfig.type === 'post') {
      denyTradePost(denialModalConfig.targetId, reason);
    } else {
      denySwap(denialModalConfig.targetId, reason);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
      {/* Sub-header Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3 shrink-0">
        <div>
          <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Trade & Swap Approvals
          </h2>
          <p className="text-[10px] text-slate-400">Oldest-first operational queue</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {/* Pending Posts Tab */}
          <button
            id="tab-pending-posts-btn"
            onClick={() => setActiveTab('pending_posts')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'pending_posts'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending Posts</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'pending_posts' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {pendingPosts.length}
            </span>
          </button>

          {/* Pending Swaps Tab */}
          <button
            id="tab-pending-swaps-btn"
            onClick={() => setActiveTab('pending_swaps')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'pending_swaps'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending Swaps</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              pendingSwaps.length > 0 
                ? 'bg-amber-400 text-slate-900 font-black' 
                : activeTab === 'pending_swaps' 
                ? 'bg-white/20 text-white' 
                : 'bg-slate-200 text-slate-700'
            }`}>
              {pendingSwaps.length}
            </span>
          </button>

          {/* History Log Tab */}
          <button
            id="tab-trade-history-btn"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History Log</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {historyTrades.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        {/* FEED 1: PENDING POSTS */}
        {activeTab === 'pending_posts' && (
          <div className="flex flex-col gap-3">
            {pendingPosts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-600">All Shift Listing Requests Cleared</p>
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
                        ? 'border-l-4 border-blue-600 bg-blue-50/40 border-blue-200'
                        : isGiveaway
                        ? 'border-l-4 border-emerald-500 bg-emerald-50/50 border-emerald-200/60'
                        : 'border-l-4 border-amber-500 bg-amber-50/70 border-amber-200/60'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {isGiveaway ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-300/60">
                            <Gift className="w-3 h-3 text-emerald-600" />
                            Give Up / Drop Shift (Giveaway)
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900 flex items-center gap-1 border border-blue-300/60">
                            <ArrowRightLeft className="w-3 h-3 text-blue-700" />
                            Trade / Swap Request
                          </span>
                        )}

                        <span className="text-xs font-black text-slate-700 uppercase tracking-tight flex items-center gap-1">
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
                            type="button"
                            onClick={() => handleStartEdit(trade)}
                            className="text-[11px] font-bold text-[#1e3a8a] hover:text-blue-900 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 px-2 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer"
                            title="Edit Guard Notes & Parameters"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit Info
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 px-2 py-0.5 rounded transition-all cursor-pointer"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Shift & Guard Summary */}
                    <p className="text-sm text-slate-700 mt-1">
                      <strong className="text-[#1e3a8a]">Guard:</strong>{' '}
                      <span className="font-semibold">{trade.offeringGuard.name}</span> ({trade.offeringGuard.badgeNumber}){' '}
                      {isGiveaway ? 'wants to drop/give up' : 'requests trade for'}{' '}
                      <span className="underline font-bold text-slate-900">
                        {trade.originalShift.siteName} ({formatDateLabel(trade.originalShift.date)} • {trade.originalShift.startTime}-{trade.originalShift.endTime}, {trade.originalShift.hours}h)
                      </span>
                    </p>

                    {/* Normal View vs Edit Mode */}
                    {!isEditing ? (
                      <div>
                        {trade.originalShift.location && (
                          <p className="text-xs text-slate-600 flex items-center gap-1 mt-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            Post: {trade.originalShift.location}
                          </p>
                        )}

                        {trade.reason ? (
                          <div className="text-xs text-slate-700 bg-white/90 p-2.5 rounded-lg border border-slate-200 mt-2">
                            <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">
                              Guard Notes / Open Text:
                            </span>
                            <p className="italic text-slate-800">"{trade.reason}"</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 mt-1 italic">No extra notes provided by guard.</p>
                        )}
                      </div>
                    ) : (
                      /* Inline Dispatcher Editor */
                      <div className="bg-white p-3 rounded-lg border border-blue-300 shadow-xs mt-2.5 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-[11px] font-black text-[#1e3a8a] uppercase flex items-center gap-1">
                            <Edit3 className="w-3 h-3" />
                            Dispatcher Open Text & Information Editor
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Edit details before publishing to Guard Trade Board
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* Edit Intent / Type */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                              Listing Type / Intent
                            </label>
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as 'giveaway' | 'swap')}
                              className="w-full text-xs border border-slate-300 rounded p-1.5 font-medium focus:ring-1 focus:ring-[#1e3a8a]"
                            >
                              <option value="giveaway">🎁 Shift Giveaway / Drop (No swap needed)</option>
                              <option value="swap">🔄 Shift Swap Request (Exchange needed)</option>
                            </select>
                          </div>

                          {/* Edit Location */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                              Post Location / Gate
                            </label>
                            <input
                              type="text"
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                              placeholder="e.g. Main Lobby Desk"
                              className="w-full text-xs border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-[#1e3a8a]"
                            />
                          </div>
                        </div>

                        {/* Edit Guard Reason / Notes (Open text field) */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                            Guard Reason & Notes (Open Text Field) *
                          </label>
                          <textarea
                            rows={3}
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            placeholder="Clean up or refine guard reason and posting instructions..."
                            className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-2 focus:ring-[#1e3a8a] text-slate-800"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(trade.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded border border-slate-300 flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Save className="w-3 h-3 text-slate-600" />
                            Save Notes Only
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Decision Action Buttons */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        id={`approve-post-btn-${trade.id}`}
                        onClick={() => handleApproveWithEdits(trade.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isEditing ? 'Save & Approve' : 'Approve & Post'}
                      </button>
                      <button
                        id={`deny-post-btn-${trade.id}`}
                        onClick={() => handleOpenDenyModal(trade, 'post')}
                        className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                        Deny Request
                      </button>
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
              <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-600">No Pending Swaps Under Review</p>
                <p className="text-[11px] text-slate-400 mt-0.5">All guard-to-guard shift swap proposals have been processed.</p>
              </div>
            ) : (
              pendingSwaps.map((trade) => {
                const needsOjt = trade.swapOffer?.ojtStatus === 'needs_ojt';
                const guardA = trade.offeringGuard;
                const guardB = trade.swapOffer?.offeredByGuard;
                const shiftA = trade.originalShift;
                const shiftB = trade.swapOffer?.offeredShift;

                return (
                  <div
                    key={trade.id}
                    id={`pending-swap-card-${trade.id}`}
                    className={`p-3.5 rounded-r-xl border-y border-r shadow-xs ${
                      needsOjt
                        ? 'border-l-4 border-red-600 bg-red-50/70 border-red-200/80'
                        : 'border-l-4 border-amber-500 bg-amber-50/60 border-amber-200/80'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-1.5">
                      <span className={`text-xs font-black uppercase tracking-tight flex items-center gap-1.5 ${
                        needsOjt ? 'text-red-700' : 'text-amber-800'
                      }`}>
                        {needsOjt ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            Proposed Swap: Attention Required (Needs OJT)
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-amber-600" />
                            Proposed Swap: Standard Review
                          </>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatTimestamp(trade.swapOffer?.submittedAt || trade.createdAt)}
                      </span>
                    </div>

                    {/* Swap Breakdown comparison */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-2">
                      <div className="border-r border-slate-100 pr-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Guard A (Listing Shift):</span>
                        <div className="font-bold text-[#1e3a8a]">{guardA.name} ({guardA.badgeNumber})</div>
                        <div className="text-slate-700 font-medium">{shiftA.siteName}</div>
                        <div className="text-[11px] text-slate-500">{formatDateLabel(shiftA.date)} • {shiftA.hours}h</div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Guard B (Offering Shift):</span>
                        <div className="font-bold text-[#1e3a8a]">{guardB?.name} ({guardB?.badgeNumber})</div>
                        <div className="text-slate-700 font-medium">{shiftB?.siteName}</div>
                        <div className="text-[11px] text-slate-500">{formatDateLabel(shiftB?.date || '')} • {shiftB?.hours}h</div>
                      </div>
                    </div>

                    {/* High-visibility OJT Warning Badge if Guard B needs training */}
                    {needsOjt ? (
                      <div className="bg-red-100 border border-red-300 text-red-800 p-2 rounded-lg text-xs font-bold mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>OJT TRAINING REQUIRED: {guardB?.name} is NOT site-qualified for {shiftA.siteName}</span>
                        </span>
                        <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">
                          Supervisor Waiver Needed
                        </span>
                      </div>
                    ) : (
                      <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 p-1.5 rounded text-[11px] font-semibold mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Site Qualifications Verified: Both guards hold current OJT clearances.</span>
                      </div>
                    )}

                    {trade.swapOffer?.datesTimesNotes && (
                      <p className="text-xs text-slate-600 bg-white/70 p-2 rounded border border-slate-200 mb-3">
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
                          className="text-[11px] font-bold text-[#1e3a8a] hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                          title="Open Guard Directory to review full site qualifications and contact info"
                        >
                          <User className="w-3 h-3 text-[#1e3a8a]" />
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

        {/* FEED 3: HISTORY LOG (PERMANENT AUDIT TRAIL) */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-3">
            {historyTrades.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No Resolved Trades Yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Approved and denied shift trades will appear in this permanent audit log.</p>
              </div>
            ) : (
              historyTrades.map((trade) => {
                const isApproved = trade.status === 'approved';
                return (
                  <div
                    key={trade.id}
                    id={`history-trade-card-${trade.id}`}
                    className={`bg-slate-50 p-4 rounded-xl border transition-all ${
                      isApproved ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                          isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isApproved ? 'APPROVED & FINALIZED' : 'DENIED BY OPS'}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          Trade #{trade.id}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Resolved: {formatDateTime(trade.resolvedAt || '')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 mb-2 font-medium">
                      <strong>Listing Guard:</strong> {trade.offeringGuard.name} ({trade.offeringGuard.badgeNumber}) —{' '}
                      <span>{trade.originalShift.siteName} ({formatDateLabel(trade.originalShift.date)})</span>
                    </p>

                    {trade.swapOffer && (
                      <p className="text-xs text-slate-800 mb-2">
                        <strong>Swapped with:</strong> {trade.swapOffer.offeredByGuard.name} ({trade.swapOffer.offeredByGuard.badgeNumber}) —{' '}
                        <span>{trade.swapOffer.offeredShift.siteName}</span>
                      </p>
                    )}

                    {/* Auto-generated Timestamp Timeline */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-[11px] font-mono grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 mb-2">
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
                      <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                        <strong>Decision Log:</strong> {trade.resolutionNote}
                      </div>
                    )}
                  </div>
                );
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
    </div>
  );
};
