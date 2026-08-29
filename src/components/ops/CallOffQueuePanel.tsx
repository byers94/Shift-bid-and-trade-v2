import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { CallOffRecord } from '../../types/shift';
import { 
  PhoneOff, 
  AlertTriangle, 
  Zap, 
  Radio, 
  CheckCircle2, 
  Clock, 
  Building2, 
  User, 
  UserX, 
  Plus, 
  Search, 
  Filter, 
  Check, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { GuardCallOffModal } from './GuardCallOffModal';

export const CallOffQueuePanel: React.FC = () => {
  const { 
    callOffRecords, 
    quickAddCallOffToBiddingQueue,
    shifts,
    scheduledShifts,
    showToast 
  } = useShiftOps();

  const [isCallOffModalOpen, setIsCallOffModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unreplaced' | 'replaced'>('all');

  const filteredRecords = callOffRecords.filter(rec => {
    const matchesSearch = 
      rec.guardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.guardBadge.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.reason.toLowerCase().includes(searchQuery.toLowerCase());

    const isReplaced = !!rec.replacementGuardName || !!rec.replacementShiftId;
    const matchesStatus = 
      statusFilter === 'all' ? true : statusFilter === 'replaced' ? isReplaced : !isReplaced;

    return matchesSearch && matchesStatus;
  });

  const unreplacedCount = callOffRecords.filter(r => !r.replacementGuardName).length;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400">
              <PhoneOff className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Call-Offs & Emergency Relief Queue
                {unreplacedCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-mono animate-pulse">
                    {unreplacedCount} Uncovered Call-Offs
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor guard sick calls, no-shows, and quickly dispatch urgent open shifts to the bidding queue.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCallOffModalOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Guard Call-Off</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search call-offs by guard, site, or reason..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
        >
          <option value="all">All Records ({callOffRecords.length})</option>
          <option value="unreplaced">⚠️ Uncovered Relief Shifts ({unreplacedCount})</option>
          <option value="replaced">✓ Replaced / Covered</option>
        </select>
      </div>

      {/* Records List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredRecords.map((rec) => {
          const isReplaced = !!rec.replacementGuardName;
          
          return (
            <div
              key={rec.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                !isReplaced
                  ? 'bg-slate-900 border-rose-800/80 shadow-md ring-1 ring-rose-500/20'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="space-y-2.5">
                {/* Header with Reason Badge & Timestamp */}
                <div className="flex items-start justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    rec.reason === 'no_show_unresponsive'
                      ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    {rec.reason.replace(/_/g, ' ')}
                  </span>

                  <span className="text-[10px] font-mono text-slate-400">
                    Logged: {(rec.loggedAt || rec.calledOffAt || '').slice(11, 16)}
                  </span>
                </div>

                {/* Guard and Site Details */}
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5 text-rose-400" />
                    <span>{rec.guardName}</span>
                    <span className="text-xs font-mono text-slate-400">({rec.guardBadge})</span>
                  </h4>
                  <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>{rec.siteName}</span>
                  </p>
                </div>

                {/* Date and Time */}
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
                  <span>Date: <strong>{rec.shiftDate}</strong></span>
                  <span className="text-blue-300">{rec.startTime || rec.shiftStartTime} - {rec.endTime || rec.shiftEndTime}</span>
                </div>

                {/* Notes */}
                {rec.notes && (
                  <p className="text-xs text-slate-400 italic bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                    "{rec.notes}"
                  </p>
                )}

                {/* Replacement Status Badge */}
                {isReplaced ? (
                  <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Covered by Officer <strong>{rec.replacementGuardName}</strong></span>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Awaiting replacement officer assignment</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!isReplaced && (
                <div className="pt-3 border-t border-slate-800 mt-3">
                  <button
                    type="button"
                    onClick={() => quickAddCallOffToBiddingQueue(rec.id)}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Quick-Add to Bidding Queue & Push Alert</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredRecords.length === 0 && (
        <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Call-Offs Reported</h3>
          <p className="text-xs text-slate-500">
            All scheduled security guard shifts are currently active and staffed.
          </p>
        </div>
      )}

      {/* Record Call Off Modal */}
      <GuardCallOffModal
        isOpen={isCallOffModalOpen}
        onClose={() => setIsCallOffModalOpen(false)}
      />
    </div>
  );
};
