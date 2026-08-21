import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { Shift } from '../../types/shift';
import { formatDateLabel } from '../../utils/time';
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
  Sparkles
} from 'lucide-react';

export const OpenShiftBoard: React.FC = () => {
  const { shifts, activeGuard } = useShiftOps();
  const [selectedShiftForBid, setSelectedShiftForBid] = useState<Shift | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'emergency' | 'standard'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const openShiftsCount = shifts.filter((s) => s.status === 'open').length;
  const emergencyShiftsCount = shifts.filter((s) => s.status === 'open' && s.urgency === 'emergency').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Top Filter and Search Bar */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search site, post, date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-1"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setUrgencyFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all ${
                urgencyFilter === 'all'
                  ? 'bg-[#1e3a8a] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({openShiftsCount})
            </button>
            <button
              onClick={() => setUrgencyFilter('emergency')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all ${
                urgencyFilter === 'emergency'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Emergency ({emergencyShiftsCount})
            </button>
            <button
              onClick={() => setUrgencyFilter('standard')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all ${
                urgencyFilter === 'standard'
                  ? 'bg-green-700 text-white shadow-xs'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Standard
            </button>
          </div>

          <span className="text-[10px] font-mono text-slate-400 font-semibold">
            {filteredShifts.length} Visible
          </span>
        </div>
      </div>

      {/* Feed Cards List */}
      <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3">
        {filteredShifts.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white rounded-xl border border-dashed border-slate-300">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 text-sm">No Matching Shifts Found</h4>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your urgency filters or search criteria.
            </p>
          </div>
        ) : (
          filteredShifts.map((shift) => {
            const isFilled = shift.status === 'filled';
            const isEmergency = shift.urgency === 'emergency';
            const isTrained = activeGuard.ojtSites.some((s) =>
              shift.siteName.toLowerCase().includes(s.toLowerCase())
            );

            return (
              <div
                key={shift.id}
                id={`guard-shift-card-${shift.id}`}
                className={`bg-white p-4 rounded-xl border transition-all shadow-xs relative ${
                  isFilled
                    ? 'border-slate-200 opacity-60 bg-slate-50/70'
                    : isEmergency
                    ? 'border-red-200 hover:border-red-400 hover:shadow-md'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {/* Status Badges Header */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    {isFilled ? (
                      <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        Filled
                      </span>
                    ) : isEmergency ? (
                      <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                        Emergency
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        Standard
                      </span>
                    )}

                    {isTrained && !isFilled && (
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                        OJT Verified
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                    {shift.hours} HRS
                  </span>
                </div>

                {/* Site Title */}
                <h3 className="font-bold text-slate-800 text-sm leading-snug">
                  {shift.siteName}
                </h3>

                {/* Shift Details */}
                <p className="text-xs text-slate-500 mt-1 mb-2.5 flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {formatDateLabel(shift.date)} • {shift.startTime} - {shift.endTime}
                  </span>
                </p>

                {shift.location && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mb-2 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {shift.location}
                  </p>
                )}

                {/* Pay & Certs bar */}
                <div className="flex items-center justify-between text-[11px] text-slate-600 mb-3 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-700 flex items-center gap-0.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 -mr-0.5" />
                    {shift.hourlyRate?.toFixed(2)} / hr
                  </span>

                  {shift.bidsCount > 0 && !isFilled && (
                    <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      {shift.bidsCount} Bid{shift.bidsCount > 1 ? 's' : ''} Active
                    </span>
                  )}
                  {isFilled && (
                    <span className="text-[10px] text-slate-500 italic">
                      Guard: {shift.assignedGuardName || 'Assigned'}
                    </span>
                  )}
                </div>

                {/* Action button */}
                {isFilled ? (
                  <div className="w-full py-2 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold text-center uppercase tracking-wider cursor-not-allowed">
                    Position Filled
                  </div>
                ) : (
                  <button
                    id={`text-to-bid-btn-${shift.id}`}
                    onClick={() => setSelectedShiftForBid(shift)}
                    className="w-full bg-[#1e3a8a] text-white py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider hover:bg-blue-900 active:bg-blue-950 shadow-md transition-all flex items-center justify-center gap-1.5"
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
