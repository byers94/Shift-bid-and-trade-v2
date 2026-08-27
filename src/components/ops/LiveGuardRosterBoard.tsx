import React, { useState, useEffect } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { formatElapsedTimer } from '../../utils/time';
import { 
  Users, 
  Building2, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  PhoneCall, 
  Search, 
  Filter, 
  Coffee, 
  Play, 
  Radio, 
  UserCheck, 
  Calendar, 
  RefreshCw, 
  CheckCircle2, 
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  Shield,
  Sparkles
} from 'lucide-react';
import { ShiftDutyStatus } from '../../types/shift';

interface LiveGuardRosterBoardProps {
  onScheduleShift?: (guardId?: string) => void;
  onSelectSite?: (siteName: string) => void;
}

export const LiveGuardRosterBoard: React.FC<LiveGuardRosterBoardProps> = ({
  onScheduleShift,
  onSelectSite
}) => {
  const { 
    getGuardsLiveTracking, 
    scheduledShifts, 
    lateShiftAlerts, 
    acknowledgeLateAlert, 
    reassignScheduledShift,
    clockOutGuard,
    sitesList,
    guardsList,
    opsPhone,
    showToast
  } = useShiftOps();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [tick, setTick] = useState(0);

  // Live timer tick every second for real-time elapsed seconds
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const liveGuards = getGuardsLiveTracking();

  // Metric counts
  const onDutyCount = liveGuards.filter((g) => g.currentStatus === 'on_duty').length;
  const onBreakCount = liveGuards.filter((g) => g.currentStatus === 'on_break').length;
  const lateCount = liveGuards.filter((g) => g.currentStatus === 'late' || (g.activeShift?.isLate && g.currentStatus === 'scheduled')).length;
  const scheduledTodayCount = liveGuards.filter((g) => g.currentStatus === 'scheduled').length;

  const filteredGuards = liveGuards.filter((item) => {
    const matchesSearch = 
      item.guardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.guardBadge.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.currentSiteName && item.currentSiteName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.postRole && item.postRole.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      filterStatus === 'all' ? true :
      filterStatus === 'on_duty' ? item.currentStatus === 'on_duty' :
      filterStatus === 'on_break' ? item.currentStatus === 'on_break' :
      filterStatus === 'late' ? (item.currentStatus === 'late' || item.activeShift?.isLate) :
      filterStatus === 'scheduled' ? item.currentStatus === 'scheduled' :
      filterStatus === 'off_duty' ? item.currentStatus === 'off_duty' : true;

    const matchesSite = 
      filterSite === 'all' ? true : item.currentSiteName === filterSite;

    return matchesSearch && matchesStatus && matchesSite;
  });

  return (
    <div id="live-guard-roster-board" className="space-y-4">
      {/* Top Header & Metrics Strip */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/80 rounded-xl text-[#1e3a8a] dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900 dark:text-slate-100">
                Live Guard Duty & Site Tracking Board
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time active duty monitoring, site locations, break statuses, and attendance tracking
              </p>
            </div>
          </div>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilterStatus('on_duty')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              filterStatus === 'on_duty'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{onDutyCount} On Duty</span>
          </button>

          <button
            onClick={() => setFilterStatus('on_break')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              filterStatus === 'on_break'
                ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>{onBreakCount} On Break</span>
          </button>

          <button
            onClick={() => setFilterStatus('late')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              filterStatus === 'late'
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{lateCount} Late / Overdue</span>
          </button>

          <button
            onClick={() => setFilterStatus('scheduled')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              filterStatus === 'scheduled'
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{scheduledTodayCount} Upcoming</span>
          </button>

          {onScheduleShift && (
            <button
              onClick={() => onScheduleShift()}
              className="px-3.5 py-1.5 bg-[#1e3a8a] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
            >
              <span>+ Schedule Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="guard-roster-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by guard name, badge #, assigned site, or post role..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status Filter Dropdown */}
          <select
            id="guard-roster-status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Statuses ({liveGuards.length})</option>
            <option value="on_duty">● Active On Duty ({onDutyCount})</option>
            <option value="on_break">☕ On Break ({onBreakCount})</option>
            <option value="late">⚠️ Late / Overdue ({lateCount})</option>
            <option value="scheduled">📅 Scheduled Today ({scheduledTodayCount})</option>
            <option value="off_duty">Off Duty</option>
          </select>

          {/* Site Filter Dropdown */}
          <select
            id="guard-roster-site-filter"
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden truncate max-w-[160px]"
          >
            <option value="all">All Facilities</option>
            {sitesList.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Roster Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredGuards.map((item) => {
          const isOnDuty = item.currentStatus === 'on_duty';
          const isOnBreak = item.currentStatus === 'on_break';
          const isLate = item.currentStatus === 'late' || item.activeShift?.isLate;
          const isScheduled = item.currentStatus === 'scheduled';
          const isCompleted = item.currentStatus === 'completed';

          return (
            <div
              key={item.guardId}
              className={`rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
                isOnDuty
                  ? 'bg-white dark:bg-slate-900 border-emerald-400/80 dark:border-emerald-800/80 ring-1 ring-emerald-500/20'
                  : isOnBreak
                  ? 'bg-white dark:bg-slate-900 border-amber-400/80 dark:border-amber-800/80 ring-1 ring-amber-500/20'
                  : isLate
                  ? 'bg-rose-50/40 dark:bg-rose-950/30 border-rose-400 dark:border-rose-800 ring-2 ring-rose-500/30'
                  : isScheduled
                  ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-slate-800'
                  : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-85'
              }`}
            >
              {/* Header: Guard Profile & Duty Status Chip */}
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white ${
                      isOnDuty ? 'bg-emerald-600' :
                      isOnBreak ? 'bg-amber-600' :
                      isLate ? 'bg-rose-600' :
                      'bg-[#1e3a8a]'
                    }`}>
                      {item.guardName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{item.guardName}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-normal">
                          ({item.guardBadge})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                        <span>{item.guardPhone}</span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="capitalize">{item.role}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isOnDuty && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        On Duty
                      </span>
                    )}
                    {isOnBreak && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        <Coffee className="w-3 h-3" />
                        On Break
                      </span>
                    )}
                    {isLate && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Late (+{item.activeShift?.lateMinutes || 15}m)
                      </span>
                    )}
                    {isScheduled && !isLate && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                        Scheduled
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Completed
                      </span>
                    )}
                    {!isOnDuty && !isOnBreak && !isLate && !isScheduled && !isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800">
                        Off Duty
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="py-2.5 space-y-2 text-xs">
                  {/* Site & Post info */}
                  {item.currentSiteName ? (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Facility Post
                        </span>
                        {item.activeShift?.gpsVerified && (
                          <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ GPS Verified
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="truncate">{item.currentSiteName}</span>
                      </div>
                      {item.postRole && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {item.postRole}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
                      No active shift post assigned right now
                    </div>
                  )}

                  {/* Duty Time & Clock Telemetry */}
                  {(isOnDuty || isOnBreak) && (
                    <div className="flex items-center justify-between bg-slate-950 text-white p-2 rounded-xl border border-slate-800 font-mono text-xs">
                      <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Time On Post:</span>
                      <span className="font-black text-emerald-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400 animate-pulse" />
                        {formatElapsedTimer(item.elapsedSeconds || 0)}
                      </span>
                    </div>
                  )}

                  {/* Scheduled Times */}
                  {item.activeShift && (
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>Shift Hours:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {item.activeShift.startTime} - {item.activeShift.endTime} ({item.activeShift.hours}h)
                      </span>
                    </div>
                  )}

                  {/* Equipment List Tags */}
                  {item.equipmentList && item.equipmentList.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.equipmentList.slice(0, 3).map((eq, i) => (
                        <span key={i} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">
                          {eq.split(' ')[0]}
                        </span>
                      ))}
                      {item.equipmentList.length > 3 && (
                        <span className="text-[9px] text-slate-400 font-mono">+{item.equipmentList.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                <a
                  href={`tel:${item.guardPhone}`}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors"
                  title={`Call ${item.guardName}`}
                >
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Call</span>
                </a>

                {isLate && item.activeShift && (
                  <button
                    onClick={() => acknowledgeLateAlert(item.activeShift!.id, 'Contacted guard via radio')}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Acknowledge
                  </button>
                )}

                {isOnDuty && (
                  <button
                    onClick={() => clockOutGuard(item.guardId, { notes: 'Clocked out by Ops Admin Override' })}
                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                    title="Clock out officer on behalf of Ops"
                  >
                    End Shift
                  </button>
                )}

                {onScheduleShift && (
                  <button
                    onClick={() => onScheduleShift(item.guardId)}
                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-[#1e3a8a] dark:text-blue-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ml-auto"
                  >
                    + Assign Shift
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredGuards.length === 0 && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Guards Match Filter</h3>
          <p className="text-xs text-slate-500">Try adjusting your search keywords or status filter</p>
        </div>
      )}
    </div>
  );
};
