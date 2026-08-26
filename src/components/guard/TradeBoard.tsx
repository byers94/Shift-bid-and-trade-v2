import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { Trade } from '../../types/shift';
import { formatDateLabel, compareShiftsByDateSoonest, compareShiftsByDateFurthest } from '../../utils/time';
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
  MapPin,
  Gift,
  ArrowUpDown,
  Search
} from 'lucide-react';

interface TradeBoardProps {
  onOpenAlertPrefs?: () => void;
}

export const TradeBoard: React.FC<TradeBoardProps> = ({ onOpenAlertPrefs }) => {
  const { trades, activeGuard, sitesList } = useShiftOps();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedTradeForSwap, setSelectedTradeForSwap] = useState<Trade | null>(null);
  const [filterTab, setFilterTab] = useState<'active' | 'my_requests' | 'all'>('active');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'soonest' | 'furthest'>('soonest');

  // Filter trades
  const filteredTrades = trades.filter((t) => {
    if (filterTab === 'active') {
      if (t.status !== 'active' && t.status !== 'pending_swap') return false;
    } else if (filterTab === 'my_requests') {
      const isMine = t.offeringGuard.id === activeGuard.id || t.swapOffer?.offeredByGuard.id === activeGuard.id;
      if (!isMine) return false;
    }

    if (siteFilter !== 'all') {
      if (t.originalShift.siteName.toLowerCase() !== siteFilter.toLowerCase()) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSite = t.originalShift.siteName.toLowerCase().includes(q);
      const matchGuard = t.offeringGuard.name.toLowerCase().includes(q) || t.offeringGuard.badgeNumber.toLowerCase().includes(q);
      const matchNotes = t.reason?.toLowerCase().includes(q);
      if (!matchSite && !matchGuard && !matchNotes) return false;
    }

    return true;
  });

  // Sort trades by shift date (soonest to furthest by default)
  const visibleTrades = [...filteredTrades].sort((a, b) => {
    if (sortOrder === 'soonest') {
      return compareShiftsByDateSoonest(a.originalShift, b.originalShift);
    }
    return compareShiftsByDateFurthest(a.originalShift, b.originalShift);
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Top Filter and Actions */}
      <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 shrink-0 shadow-2xs">
        {/* Search & Post Action */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search site, guard, badge, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] dark:focus:ring-blue-400"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            id="post-trade-top-btn"
            onClick={() => setIsPostModalOpen(true)}
            className="bg-[#1e3a8a] dark:bg-blue-600 hover:bg-blue-900 dark:hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Post Shift / Trade</span>
            <span className="sm:hidden">Post</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterTab('active')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
                filterTab === 'active'
                  ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Active Trades
            </button>
            <button
              onClick={() => setFilterTab('my_requests')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
                filterTab === 'my_requests'
                  ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              My Listings
            </button>
            <button
              onClick={() => setFilterTab('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Site selector dropdown */}
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="all">All Sites ({sitesList.length})</option>
              {sitesList.map((site) => (
                <option key={site.id} value={site.name}>
                  {site.code} - {site.name}
                </option>
              ))}
            </select>

            {/* Sort toggle */}
            <button
              id="trade-sort-toggle-btn"
              onClick={() => setSortOrder(sortOrder === 'soonest' ? 'furthest' : 'soonest')}
              className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
              title="Toggle sort date order"
            >
              <ArrowUpDown className="w-3 h-3 text-[#1e3a8a] dark:text-blue-400" />
              <span>{sortOrder === 'soonest' ? '📅 Soonest' : '📅 Furthest'}</span>
            </button>

            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">
              {visibleTrades.length} Listed
            </span>
          </div>
        </div>
      </div>

      {/* Trades Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3">
        {visibleTrades.length === 0 ? (
          <div className="text-center py-10 px-4 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <ArrowRightLeft className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Active Shift Trades</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              Need coverage? Submit a shift to Ops for approval to list it here.
            </p>
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="bg-[#1e3a8a] dark:bg-blue-600 hover:bg-blue-900 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
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
                className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all flex flex-col gap-2.5"
              >
                {/* Header Status & Guard Info */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {trade.type === 'giveaway' ? (
                      <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 border border-emerald-300/60 dark:border-emerald-800">
                        <Gift className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Shift Drop (Giveaway)
                      </span>
                    ) : (
                      <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 text-[10px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 border border-blue-300/60 dark:border-blue-800">
                        <ArrowRightLeft className="w-3 h-3 text-blue-700 dark:text-blue-400" />
                        Swap Request
                      </span>
                    )}

                    {isPendingApproval ? (
                      <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-amber-300/60 dark:border-amber-800">
                        Pending Ops
                      </span>
                    ) : hasPendingSwap ? (
                      <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-purple-300/60 dark:border-purple-800">
                        Swap Under Review
                      </span>
                    ) : isApproved ? (
                      <span className="bg-green-100 dark:bg-emerald-950/80 text-green-800 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-green-300/60 dark:border-emerald-800">
                        Finalized
                      </span>
                    ) : isDenied ? (
                      <span className="bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-red-300/60 dark:border-red-800">
                        Denied
                      </span>
                    ) : (
                      <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        Active on Board
                      </span>
                    )}

                    {isMine && (
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        You Posted
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-mono">
                    {trade.originalShift.hours} HRS
                  </span>
                </div>

                {/* Offering Guard info */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>
                    Offered by: <strong className="text-slate-700 dark:text-slate-200">{trade.offeringGuard.name}</strong> ({trade.offeringGuard.badgeNumber})
                  </span>
                </div>

                {/* Target Shift Details */}
                <div className="bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {trade.originalShift.siteName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    {formatDateLabel(trade.originalShift.date)} • {trade.originalShift.startTime} - {trade.originalShift.endTime}
                  </p>
                  {trade.originalShift.address && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-[#1e3a8a] dark:text-blue-400 shrink-0" />
                      <span>{trade.originalShift.address}</span>
                    </p>
                  )}
                  {trade.reason && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 italic line-clamp-2">
                      "{trade.reason}"
                    </p>
                  )}
                </div>

                {/* If Swap Proposal Exists */}
                {trade.swapOffer && (
                  <div className="bg-amber-50/70 dark:bg-amber-950/50 p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-900/60 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-amber-900 dark:text-amber-300 text-[11px] uppercase tracking-wider">
                        Swap Offered By {trade.swapOffer.offeredByGuard.name}:
                      </span>
                      {trade.swapOffer.ojtStatus === 'needs_ojt' ? (
                        <span className="bg-red-100 dark:bg-red-950/90 text-red-700 dark:text-red-300 text-[9px] font-black px-1.5 py-0.2 rounded uppercase border border-red-200 dark:border-red-900/60">
                          Needs OJT
                        </span>
                      ) : (
                        <span className="bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 text-[9px] font-black px-1.5 py-0.2 rounded uppercase border border-emerald-200 dark:border-emerald-900/60">
                          OJT Verified
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {trade.swapOffer.offeredShift.siteName} ({formatDateLabel(trade.swapOffer.offeredShift.date)} • {trade.swapOffer.offeredShift.hours}h)
                    </p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Notes: {trade.swapOffer.datesTimesNotes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-1">
                  {isApproved || isDenied ? (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/80 p-2 rounded text-center">
                      Resolved: {trade.resolutionNote || 'Completed'}
                    </div>
                  ) : isPendingApproval ? (
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 p-2 rounded text-center font-medium">
                      Waiting for Ops Manager Approval
                    </div>
                  ) : hasPendingSwap ? (
                    <div className="text-[11px] text-purple-900 dark:text-purple-200 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900/60 p-2 rounded text-center font-medium">
                      Swap proposal pending Ops review
                    </div>
                  ) : isMine ? (
                    <div className="text-[11px] text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 p-2 rounded text-center font-medium">
                      Your listing is active. Awaiting swap offers.
                    </div>
                  ) : (
                    <button
                      id={`propose-swap-btn-${trade.id}`}
                      onClick={() => setSelectedTradeForSwap(trade)}
                      className="w-full bg-[#1e3a8a] dark:bg-blue-600 hover:bg-blue-900 dark:hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
        <div className="pt-2 sticky bottom-0 bg-gradient-to-t from-slate-50 dark:from-slate-900 via-slate-50/90 dark:via-slate-900/90 to-transparent pb-1">
          <button
            id="post-trade-request-cta-btn"
            onClick={() => setIsPostModalOpen(true)}
            className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-dashed border-[#1e3a8a] dark:border-blue-500 text-[#1e3a8a] dark:text-blue-300 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-blue-50/80 dark:hover:bg-slate-700/80 active:bg-blue-100 shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
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
