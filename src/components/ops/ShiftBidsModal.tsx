import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { Shift, BidRecord } from '../../types/shift';
import { formatDateLabel, formatTimestamp, compareShiftsByDateSoonest } from '../../utils/time';
import { 
  X, 
  CheckCircle, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  Phone, 
  MessageSquare, 
  Award, 
  Search, 
  UserCheck, 
  Sparkles,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

interface ShiftBidsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedShiftId: string | null;
  onSelectShiftId?: (shiftId: string) => void;
}

export const ShiftBidsModal: React.FC<ShiftBidsModalProps> = ({
  isOpen,
  onClose,
  selectedShiftId,
  onSelectShiftId
}) => {
  const { shifts, bids, awardShiftBid, markShiftFilled, guardsList } = useShiftOps();
  const [filterMode, setFilterMode] = useState<'all' | 'trained' | 'needs_ojt'>('all');
  const [expandedSmsBidId, setExpandedSmsBidId] = useState<string | null>(null);
  const [assigningBidId, setAssigningBidId] = useState<string | null>(null);
  const [searchGuardQuery, setSearchGuardQuery] = useState('');

  if (!isOpen) return null;

  // Selected shift if any
  const targetShift = selectedShiftId 
    ? shifts.find((s) => s.id === selectedShiftId) 
    : null;

  // Open shifts with bids for the selector dropdown, sorted by date soonest to furthest
  const shiftsWithBids = shifts
    .filter((s) => {
      const shiftBids = bids.filter((b) => b.shiftId === s.id);
      return shiftBids.length > 0 || s.bidsCount > 0;
    })
    .sort(compareShiftsByDateSoonest);

  // Current active bids for this shift, or all bids if no specific shift selected
  const activeBidsForView = bids.filter((b) => {
    if (selectedShiftId) {
      return b.shiftId === selectedShiftId;
    }
    return true;
  });

  // Apply qualification and search filters
  const filteredBids = activeBidsForView.filter((b) => {
    if (filterMode === 'trained' && b.trainingStatus !== 'trained') return false;
    if (filterMode === 'needs_ojt' && b.trainingStatus !== 'needs_ojt') return false;

    if (searchGuardQuery.trim()) {
      const q = searchGuardQuery.toLowerCase();
      return (
        b.guardName.toLowerCase().includes(q) ||
        b.guardPhone.includes(q) ||
        b.siteName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const trainedBidsCount = activeBidsForView.filter((b) => b.trainingStatus === 'trained').length;
  const ojtBidsCount = activeBidsForView.filter((b) => b.trainingStatus === 'needs_ojt').length;

  const handleAwardBid = (bid: BidRecord) => {
    setAssigningBidId(bid.id);
    awardShiftBid(bid.shiftId, bid.id, bid.guardName, bid.guardPhone);
    setTimeout(() => {
      setAssigningBidId(null);
    }, 400);
  };

  return (
    <div 
      id="shift-bids-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div 
        id="shift-bids-modal-container"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-[#1e3a8a] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-900/80 rounded-xl border border-blue-700">
              <UserCheck className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg uppercase tracking-tight">
                  Guard Shift Bids & Assignment
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black font-mono px-2 py-0.5 rounded-full">
                  {activeBidsForView.length} {activeBidsForView.length === 1 ? 'Bid' : 'Bids'}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Review active guard bids, inspect site qualification status, and award shift coverage
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-shift-bids-modal-btn"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shift Selector Bar (Switch between shifts or View All) */}
        <div className="bg-slate-100 dark:bg-slate-800/80 p-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <span className="font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] whitespace-nowrap">
              Shift Focus:
            </span>
            <select
              id="shift-bids-selector-dropdown"
              value={selectedShiftId || 'ALL'}
              onChange={(e) => {
                const val = e.target.value;
                if (onSelectShiftId) {
                  onSelectShiftId(val === 'ALL' ? '' : val);
                }
              }}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-lg px-2.5 py-1.5 font-bold text-xs focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-blue-500 focus:outline-none flex-1 truncate"
            >
              <option value="ALL" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">🌐 All Active Bids ({bids.length} across entire schedule)</option>
              {shifts.map((s) => {
                const count = bids.filter((b) => b.shiftId === s.id).length;
                return (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                    {s.siteName} • {formatDateLabel(s.date)} ({s.startTime}-{s.endTime}) — {count} Bid{count !== 1 ? 's' : ''} {s.status === 'filled' ? '[FILLED]' : '[OPEN]'}
                  </option>
                );
              })}
            </select>
          </div>

          {targetShift && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                targetShift.status === 'filled'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : targetShift.urgency === 'emergency'
                  ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
              }`}>
                {targetShift.status === 'filled' ? '✅ Filled' : targetShift.urgency === 'emergency' ? '🚨 Emergency Open' : 'Open for Bids'}
              </span>
            </div>
          )}
        </div>

        {/* Shift Details Hero Card (If a specific shift is selected) */}
        {targetShift && (
          <div className="p-3.5 bg-blue-50/70 dark:bg-slate-800/60 border-b border-blue-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-[#1e3a8a] dark:text-blue-400">{targetShift.siteName}</span>
                {targetShift.location && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">({targetShift.location})</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300 text-[11px]">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  {formatDateLabel(targetShift.date)}
                </span>
                <span className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                  <Clock className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  {targetShift.startTime} - {targetShift.endTime} ({targetShift.hours}h)
                </span>
                {targetShift.address && (
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {targetShift.address}
                  </span>
                )}
              </div>
            </div>

            {targetShift.status === 'filled' ? (
              <div className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Assigned Guard: {targetShift.assignedGuardName || 'Assigned'}</span>
              </div>
            ) : (
              <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-xl text-center shadow-2xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Bidding Status</p>
                <p className="text-xs font-black text-blue-900">
                  {activeBidsForView.length} Candidate{activeBidsForView.length !== 1 ? 's' : ''} Awaiting Review
                </p>
              </div>
            )}
          </div>
        )}

        {/* Filter and Search Sub-bar */}
        <div className="p-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#1e3a8a] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Bidders ({activeBidsForView.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('trained')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterMode === 'trained'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Trained Only ({trainedBidsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('needs_ojt')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterMode === 'needs_ojt'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Needs OJT ({ojtBidsCount})
            </button>
          </div>

          {/* Search Guard */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search guard name..."
              value={searchGuardQuery}
              onChange={(e) => setSearchGuardQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#1e3a8a] focus:outline-none"
            />
          </div>
        </div>

        {/* Modal Body: List of Guard Bids */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50 space-y-3">
          {filteredBids.length === 0 ? (
            <div className="text-center py-10 px-4 bg-white rounded-xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1e3a8a] flex items-center justify-center mx-auto mb-2.5">
                <UserCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {activeBidsForView.length === 0 
                  ? 'No bids received for this shift yet'
                  : 'No bids match the active filters'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {activeBidsForView.length === 0
                  ? 'When guards view this open shift on their mobile board and submit a bid, their application details and OJT qualification status will appear here in real time.'
                  : 'Try resetting the qualification filter or clearing the search query.'}
              </p>
            </div>
          ) : (
            filteredBids.map((bid) => {
              const isTrained = bid.trainingStatus === 'trained';
              const isExpandedSms = expandedSmsBidId === bid.id;
              const associatedShift = shifts.find((s) => s.id === bid.shiftId);
              const isShiftFilled = associatedShift?.status === 'filled';
              const isAssignedToThisBidder = isShiftFilled && associatedShift?.assignedGuardName?.toLowerCase() === bid.guardName.toLowerCase();

              return (
                <div
                  key={bid.id}
                  id={`bid-card-${bid.id}`}
                  className={`bg-white rounded-xl border p-4 shadow-xs transition-all ${
                    isAssignedToThisBidder
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30'
                      : isTrained
                      ? 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                      : 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Guard Info & Status */}
                    <div className="flex items-start gap-3 flex-1 min-w-[240px]">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                        isAssignedToThisBidder
                          ? 'bg-emerald-600 text-white'
                          : isTrained
                          ? 'bg-blue-100 text-[#1e3a8a] border border-blue-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {bid.guardName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{bid.guardName}</h4>

                          {isAssignedToThisBidder ? (
                            <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <CheckCircle className="w-3 h-3" />
                              Awarded & Assigned
                            </span>
                          ) : isTrained ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Trained & Site Qualified
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Needs Site OJT
                            </span>
                          )}
                        </div>

                        {/* Shift context if viewing all shifts */}
                        {!selectedShiftId && (
                          <div className="text-xs text-slate-700 font-semibold flex items-center gap-1">
                            <span className="text-[#1e3a8a]">{bid.siteName}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">{formatDateLabel(bid.shiftDate)} ({bid.shiftTime})</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                          <a
                            href={`tel:${bid.guardPhone}`}
                            className="flex items-center gap-1 text-blue-700 hover:text-blue-900 font-mono font-medium hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {bid.guardPhone}
                          </a>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Bid placed {formatTimestamp(bid.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Award Shift Button & SMS Toggle */}
                    <div className="flex flex-wrap items-center gap-2 self-center sm:self-start">
                      <button
                        type="button"
                        onClick={() => setExpandedSmsBidId(isExpandedSms ? null : bid.id)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="View raw SMS dispatch payload"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold hidden sm:inline">SMS Text</span>
                        {isExpandedSms ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isAssignedToThisBidder ? (
                        <div className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Position Filled
                        </div>
                      ) : (
                        <button
                          id={`award-shift-btn-${bid.id}`}
                          type="button"
                          disabled={assigningBidId === bid.id}
                          onClick={() => handleAwardBid(bid)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wide px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Award className="w-3.5 h-3.5" />
                          {isShiftFilled ? 'Reassign to this Guard' : 'Award Shift'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Collapsible SMS Payload */}
                  {isExpandedSms && (
                    <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-lg text-xs font-mono text-slate-700 whitespace-pre-wrap">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-sans">
                        Raw Dispatch SMS Body
                      </div>
                      {bid.smsBody}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredBids.length}</strong> of {activeBidsForView.length} bids
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
