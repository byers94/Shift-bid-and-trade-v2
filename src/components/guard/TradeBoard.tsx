import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { Trade } from '../../types/shift';
import { formatDateLabel } from '../../utils/time';
import { PostShiftModal } from './PostShiftModal';
import { ProposeSwapModal } from './ProposeSwapModal';
import { 
  ArrowRightLeft, 
  Clock, 
  Plus, 
  Shield, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  Sparkles,
  MapPin
} from 'lucide-react';

export const TradeBoard: React.FC = () => {
  const { trades, activeGuard } = useShiftOps();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedTradeForSwap, setSelectedTradeForSwap] = useState<Trade | null>(null);
  const [filterTab, setFilterTab] = useState<'active' | 'my_requests' | 'all'>('active');

  // Filter trades
  const visibleTrades = trades.filter((t) => {
    if (filterTab === 'active') {
      return t.status === 'active' || t.status === 'pending_swap';
    }
    if (filterTab === 'my_requests') {
      return t.offeringGuard.id === activeGuard.id || t.swapOffer?.offeredByGuard.id === activeGuard.id;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Top Filter and Actions */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterTab('active')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all ${
                filterTab === 'active'
                  ? 'bg-[#1e3a8a] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Active Trades
            </button>
            <button
              onClick={() => setFilterTab('my_requests')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all ${
                filterTab === 'my_requests'
                  ? 'bg-[#1e3a8a] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              My Listings
            </button>
            <button
              onClick={() => setFilterTab('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all ${
                filterTab === 'all'
                  ? 'bg-[#1e3a8a] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
          </div>

          <span className="text-[10px] font-mono text-slate-400 font-semibold">
            {visibleTrades.length} Listed
          </span>
        </div>
      </div>

      {/* Trades Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3">
        {visibleTrades.length === 0 ? (
          <div className="text-center py-10 px-4 bg-white rounded-xl border border-dashed border-slate-300">
            <ArrowRightLeft className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 text-sm">No Active Shift Trades</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Need coverage? Submit a shift to Ops for approval to list it here.
            </p>
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-900"
            >
              + Post Trade Request
            </button>
          </div>
        ) : (
          visibleTrades.map((trade) => {
            const isMine = trade.offeringGuard.id === activeGuard.id;
            const hasPendingSwap = trade.status === 'pending_swap';
            const isPendingApproval = trade.status === 'pending_approval';
            const isApproved = trade.status === 'approved';
            const isDenied = trade.status === 'denied';

            return (
              <div
                key={trade.id}
                id={`trade-card-${trade.id}`}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col gap-2.5"
              >
                {/* Header Status & Guard Info */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    {isPendingApproval ? (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                        Pending Ops Approval
                      </span>
                    ) : hasPendingSwap ? (
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                        Swap Under Review
                      </span>
                    ) : isApproved ? (
                      <span className="bg-green-100 text-green-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                        Swap Finalized
                      </span>
                    ) : isDenied ? (
                      <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                        Denied by Ops
                      </span>
                    ) : (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                        Open for Swap
                      </span>
                    )}

                    {isMine && (
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        You Posted
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                    {trade.originalShift.hours} HRS
                  </span>
                </div>

                {/* Offering Guard info */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Offered by: <strong className="text-slate-700">{trade.offeringGuard.name}</strong> ({trade.offeringGuard.badgeNumber})
                  </span>
                </div>

                {/* Target Shift Details */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm">
                    {trade.originalShift.siteName}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatDateLabel(trade.originalShift.date)} • {trade.originalShift.startTime} - {trade.originalShift.endTime}
                  </p>
                  {trade.originalShift.address && (
                    <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-[#1e3a8a] shrink-0" />
                      <span>{trade.originalShift.address}</span>
                    </p>
                  )}
                  {trade.reason && (
                    <p className="text-[11px] text-slate-600 mt-1 italic line-clamp-2">
                      "{trade.reason}"
                    </p>
                  )}
                </div>

                {/* If Swap Proposal Exists */}
                {trade.swapOffer && (
                  <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/80 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-amber-900 text-[11px] uppercase tracking-wider">
                        Swap Offered By {trade.swapOffer.offeredByGuard.name}:
                      </span>
                      {trade.swapOffer.ojtStatus === 'needs_ojt' ? (
                        <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                          Needs OJT
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                          OJT Verified
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-800">
                      {trade.swapOffer.offeredShift.siteName} ({formatDateLabel(trade.swapOffer.offeredShift.date)} • {trade.swapOffer.offeredShift.hours}h)
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      Notes: {trade.swapOffer.datesTimesNotes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-1">
                  {isApproved || isDenied ? (
                    <div className="text-[11px] text-slate-500 bg-slate-100 p-2 rounded text-center">
                      Resolved: {trade.resolutionNote || 'Completed'}
                    </div>
                  ) : isPendingApproval ? (
                    <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded text-center font-medium">
                      Waiting for Ops Manager Approval
                    </div>
                  ) : hasPendingSwap ? (
                    <div className="text-[11px] text-purple-900 bg-purple-50 border border-purple-200 p-2 rounded text-center font-medium">
                      Swap proposal pending Ops review
                    </div>
                  ) : isMine ? (
                    <div className="text-[11px] text-blue-900 bg-blue-50 border border-blue-200 p-2 rounded text-center font-medium">
                      Your listing is active. Awaiting swap offers.
                    </div>
                  ) : (
                    <button
                      id={`propose-swap-btn-${trade.id}`}
                      onClick={() => setSelectedTradeForSwap(trade)}
                      className="w-full bg-[#1e3a8a] text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-900 shadow-sm flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      PROPOSE SWAP
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Bottom Sticky Action: + POST TRADE REQUEST */}
        <div className="pt-2 sticky bottom-0 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent pb-1">
          <button
            id="post-trade-request-cta-btn"
            onClick={() => setIsPostModalOpen(true)}
            className="w-full py-3 bg-white border-2 border-dashed border-[#1e3a8a] text-[#1e3a8a] font-black text-xs uppercase tracking-wider rounded-xl hover:bg-blue-50/80 active:bg-blue-100 shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            + POST TRADE REQUEST
          </button>
        </div>
      </div>

      {/* Modals */}
      <PostShiftModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
      />

      <ProposeSwapModal
        trade={selectedTradeForSwap}
        isOpen={!!selectedTradeForSwap}
        onClose={() => setSelectedTradeForSwap(null)}
      />
    </div>
  );
};
