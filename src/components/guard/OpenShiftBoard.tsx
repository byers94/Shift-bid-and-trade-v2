import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { Shift } from '../../types/shift';
import { formatDateLabel, compareShiftsByDateSoonest, compareShiftsByDateFurthest } from '../../utils/time';
import { BidModal } from './BidModal';
import { 
  AlertCircle, 
  Calendar, 
  Clock, 
  DollarSign, 
  Filter, 
  MapPin, 
  Search, 
  Shield, 
  UserCheck,
  CheckCircle,
  Sparkles,
  ArrowUpDown,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide
} from 'lucide-react';

export const OpenShiftBoard: React.FC = () => {
  const { shifts, activeGuard } = useShiftOps();
  const [selectedShiftForBid, setSelectedShiftForBid] = useState<Shift | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'emergency' | 'standard'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'soonest' | 'furthest' | 'emergency' | 'hours'>('soonest');

  const filteredShifts = shifts.filter((s) => {
    if (urgencyFilter !== 'all' && s.urgency !== urgencyFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.siteName.toLowerCase().includes(q) ||
        (s.location && s.location.toLowerCase().includes(q)) ||
        s.date.includes(q)
      );
    }
    return true;
  });

  const sortedShifts = [...filteredShifts].sort((a, b) => {
    if (sortOrder === 'soonest') {
      return compareShiftsByDateSoonest(a, b);
    }
    if (sortOrder === 'furthest') {
      return compareShiftsByDateFurthest(a, b);
    }
    if (sortOrder === 'urgency') {
      if (a.urgency === 'emergency' && b.urgency !== 'emergency') return -1;
      if (a.urgency !== 'emergency' && b.urgency === 'emergency') return 1;
      return compareShiftsByDateSoonest(a, b);
    }
    if (sortOrder === 'hours') {
      return b.hours - a.hours || compareShiftsByDateSoonest(a, b);
    }
    return compareShiftsByDateSoonest(a, b);
  });

  const openShiftsCount = shifts.filter((s) => s.status === 'open').length;
  const emergencyShiftsCount = shifts.filter((s) => s.status === 'open' && s.urgency === 'emergency').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Top Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search site, post, date..."
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
        </div>

        {/* Urgency Filter Pills */}
        <div className="flex items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setUrgencyFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
                urgencyFilter === 'all'
                  ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({openShiftsCount})
            </button>
            <button
              onClick={() => setUrgencyFilter('emergency')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
                urgencyFilter === 'emergency'
                  ? 'bg-red-600 dark:bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50'
              }`}
            >
              Emergency ({emergencyShiftsCount})
            </button>
            <button
              onClick={() => setUrgencyFilter('standard')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
                urgencyFilter === 'standard'
                  ? 'bg-green-700 dark:bg-emerald-600 text-white shadow-xs'
                  : 'bg-green-50 dark:bg-emerald-950/50 text-green-700 dark:text-emerald-300 hover:bg-green-100 dark:hover:bg-emerald-900/60 border border-green-200 dark:border-emerald-900/50'
              }`}
            >
              Standard
            </button>
          </div>

          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">
            {sortedShifts.length} Visible
          </span>
        </div>

        {/* Sort Controls Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
            <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            <span className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[10px]">Sort:</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="guard-sort-soonest-btn"
              onClick={() => setSortOrder('soonest')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortOrder === 'soonest'
                  ? 'bg-blue-100 dark:bg-blue-900/70 text-[#1e3a8a] dark:text-blue-200 border border-blue-300 dark:border-blue-700 shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Sort shifts starting from soonest upcoming date"
            >
              <span>📅 Soonest First</span>
            </button>
            <button
              id="guard-sort-furthest-btn"
              onClick={() => setSortOrder('furthest')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortOrder === 'furthest'
                  ? 'bg-blue-100 dark:bg-blue-900/70 text-[#1e3a8a] dark:text-blue-200 border border-blue-300 dark:border-blue-700 shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Sort shifts starting from furthest future date"
            >
              <span>Furthest</span>
            </button>
            <button
              id="guard-sort-urgency-btn"
              onClick={() => setSortOrder('urgency')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortOrder === 'urgency'
                  ? 'bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800 shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Sort high-priority emergency shifts first"
            >
              <span>🚨 Urgent</span>
            </button>
            <button
              id="guard-sort-hours-btn"
              onClick={() => setSortOrder('hours')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                sortOrder === 'hours'
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Sort longest shift duration first"
            >
              <span>Duration</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feed Cards List */}
      <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3">
        {sortedShifts.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <Shield className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Matching Shifts Found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your urgency filters or search criteria.
            </p>
          </div>
        ) : (
          sortedShifts.map((shift) => {
            const isFilled = shift.status === 'filled';
            const isEmergency = shift.urgency === 'emergency';
            const isTrained = activeGuard.ojtSites.some((s) =>
              shift.siteName.toLowerCase().includes(s.toLowerCase())
            );

            return (
              <div
                key={shift.id}
                id={`guard-shift-card-${shift.id}`}
                className={`bg-white dark:bg-slate-800/80 p-4 rounded-xl border transition-all shadow-xs relative ${
                  isFilled
                    ? 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/70 dark:bg-slate-900/60'
                    : isEmergency
                    ? 'border-red-200 dark:border-red-900/70 hover:border-red-400 dark:hover:border-red-700 hover:shadow-md'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md'
                }`}
              >
                {/* Status Badges Header */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    {isFilled ? (
                      <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        Filled
                      </span>
                    ) : isEmergency ? (
                      <span className="bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 border border-red-200 dark:border-red-900/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                        Emergency
                      </span>
                    ) : (
                      <span className="bg-green-100 dark:bg-emerald-950/80 text-green-700 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider border border-green-200 dark:border-emerald-900/60">
                        Standard
                      </span>
                    )}

                    {isTrained && !isFilled && (
                      <span className="bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        OJT Verified
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-mono">
                    {shift.hours} HRS
                  </span>
                </div>

                {/* Site Title */}
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">
                  {shift.siteName}
                </h3>

                {/* Shift Details */}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-2 flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>
                    {formatDateLabel(shift.date)} • {shift.startTime} - {shift.endTime}
                  </span>
                </p>

                {/* Site Address for Commute Planning */}
                <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700 rounded-lg p-2 mb-3 flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-[#1e3a8a] dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight text-slate-800 dark:text-slate-200">
                      {shift.address || '100 Main St, Seattle, WA'}
                    </p>
                    {shift.location && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
                        Post: {shift.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bids and Assignment status bar */}
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-3 pt-1 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Commute: In-District
                  </span>

                  {shift.bidsCount > 0 && !isFilled && (
                    <span className="text-[10px] font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-1.5 py-0.5 rounded font-semibold border border-blue-200 dark:border-blue-800">
                      {shift.bidsCount} Bid{shift.bidsCount > 1 ? 's' : ''} Active
                    </span>
                  )}
                  {isFilled && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      Guard: {shift.assignedGuardName || 'Assigned'}
                    </span>
                  )}
                </div>

                {/* Action button */}
                {isFilled ? (
                  <div className="w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 rounded-lg text-xs font-bold text-center uppercase tracking-wider cursor-not-allowed">
                    Position Filled
                  </div>
                ) : (
                  <button
                    id={`text-to-bid-btn-${shift.id}`}
                    onClick={() => setSelectedShiftForBid(shift)}
                    className="w-full bg-[#1e3a8a] dark:bg-blue-600 hover:bg-blue-900 dark:hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider active:bg-blue-950 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>TEXT TO BID</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bid Modal */}
      <BidModal
        shift={selectedShiftForBid}
        isOpen={!!selectedShiftForBid}
        onClose={() => setSelectedShiftForBid(null)}
      />
    </div>
  );
};
