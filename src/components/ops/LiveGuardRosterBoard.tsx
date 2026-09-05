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
  Sparkles,
  AlertOctagon,
  Timer,
  Check,
  X,
  Compass
} from 'lucide-react';
import { ShiftDutyStatus } from '../../types/shift';
import { GuardMapDashboard } from './GuardMapDashboard';

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
    showToast,
    excuseGeofenceDepartureByOps,
    clearGeofenceBreach
  } = useShiftOps();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [selectedGuardForMap, setSelectedGuardForMap] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Modal state for excusing departure as supervisor
  const [excusalModalShiftId, setExcusalModalShiftId] = useState<string | null>(null);
  const [excusalReasonInput, setExcusalReasonInput] = useState<string>('Authorized Meal Break');
  const [excusalNotesInput, setExcusalNotesInput] = useState<string>('');

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
  const breachCount = liveGuards.filter((g) => g.offSiteBreachStatus === 'breached_unacknowledged' || g.offSiteBreachStatus === 'debounce_pending').length;
  const scheduledTodayCount = liveGuards.filter((g) => g.currentStatus === 'scheduled').length;

  const filteredGuards = liveGuards.filter((item) => {
    const matchesSearch = 
      item.guardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.guardBadge.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.currentSiteName && item.currentSiteName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.postRole && item.postRole.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      filterStatus === 'all' ? true :
      filterStatus === 'breach' ? (item.offSiteBreachStatus === 'breached_unacknowledged' || item.offSiteBreachStatus === 'debounce_pending') :
      filterStatus === 'on_duty' ? item.currentStatus === 'on_duty' :
      filterStatus === 'on_break' ? item.currentStatus === 'on_break' :
      filterStatus === 'late' ? (item.currentStatus === 'late' || item.activeShift?.isLate) :
      filterStatus === 'scheduled' ? item.currentStatus === 'scheduled' :
      filterStatus === 'off_duty' ? item.currentStatus === 'off_duty' : true;

    const matchesSite = 
      filterSite === 'all' ? true : item.currentSiteName === filterSite;

    return matchesSearch && matchesStatus && matchesSite;
  });

  const handleExecuteExcuseDeparture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excusalModalShiftId) return;
    const finalReason = excusalNotesInput.trim() 
      ? `${excusalReasonInput} - ${excusalNotesInput.trim()}`
      : excusalReasonInput;

    excuseGeofenceDepartureByOps(excusalModalShiftId, finalReason, 'OPS-CMD-01');
    setExcusalModalShiftId(null);
    setExcusalNotesInput('');
  };

  return (
    <div id="live-guard-roster-board" className="space-y-4">
      {/* Top Header & Metrics Strip */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

          {/* View Mode Switcher: Table Grid vs Live GPS Map */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto shrink-0">
            <button
              type="button"
              id="roster-view-grid-btn"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Table Roster</span>
            </button>
            <button
              type="button"
              id="roster-view-map-btn"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Live GPS Map</span>
              {breachCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                  {breachCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {breachCount > 0 && (
            <button
              onClick={() => setFilterStatus('breach')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 animate-pulse ${
                filterStatus === 'breach'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-400 dark:border-rose-700'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>🚨 {breachCount} Off-Site Breaches</span>
            </button>
          )}

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

      {viewMode === 'map' ? (
        <div className="h-[760px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
          <GuardMapDashboard
            onScheduleShift={onScheduleShift}
            onSelectSite={onSelectSite}
            initialSelectedGuardId={selectedGuardForMap}
          />
        </div>
      ) : (
        <>
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
            {breachCount > 0 && <option value="breach">🚨 Off-Site Breaches ({breachCount})</option>}
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
          const isBreached = item.offSiteBreachStatus === 'breached_unacknowledged';
          const isDebouncing = item.offSiteBreachStatus === 'debounce_pending';
          const isExcused = item.offSiteBreachStatus === 'excused';

          return (
            <div
              key={item.guardId}
              className={`rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
                isBreached
                  ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/50 shadow-md shadow-rose-950/20'
                  : isDebouncing
                  ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/40 animate-pulse'
                  : isLate
                  ? 'bg-rose-50/40 dark:bg-rose-950/30 border-rose-400 dark:border-rose-800 ring-2 ring-rose-500/30'
                  : isOnDuty
                  ? 'bg-white dark:bg-slate-900 border-emerald-400/80 dark:border-emerald-800/80 ring-1 ring-emerald-500/20'
                  : isOnBreak
                  ? 'bg-white dark:bg-slate-900 border-amber-400/80 dark:border-amber-800/80 ring-1 ring-amber-500/20'
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
                      isBreached ? 'bg-rose-700 animate-bounce' :
                      isDebouncing ? 'bg-amber-600' :
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
                  <div className="flex flex-col items-end gap-1">
                    {isBreached && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm animate-pulse">
                        <AlertOctagon className="w-3 h-3" />
                        Off-Site Breach
                      </span>
                    )}
                    {isDebouncing && !isBreached && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-sm animate-pulse">
                        <Timer className="w-3 h-3" />
                        Buffer: {Math.floor((item.debounceSecondsRemaining || 180) / 60)}m {(item.debounceSecondsRemaining || 180) % 60}s
                      </span>
                    )}
                    {isExcused && !isBreached && !isDebouncing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-400">
                        <Check className="w-3 h-3" />
                        Excused
                      </span>
                    )}
                    {!isBreached && !isDebouncing && isOnDuty && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        On Duty
                      </span>
                    )}
                    {!isBreached && !isDebouncing && isOnBreak && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        <Coffee className="w-3 h-3" />
                        On Break
                      </span>
                    )}
                    {isLate && !isBreached && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Late (+{item.activeShift?.lateMinutes || 15}m)
                      </span>
                    )}
                    {isScheduled && !isLate && !isOnDuty && !isOnBreak && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                        Scheduled
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Completed
                      </span>
                    )}
                    {!isOnDuty && !isOnBreak && !isLate && !isScheduled && !isCompleted && !isBreached && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800">
                        Off Duty
                      </span>
                    )}
                  </div>
                </div>

                {/* CAD Breach Escalation Alert Banner */}
                {isBreached && item.activeShift && (
                  <div className="mt-2.5 p-2.5 bg-rose-950/80 border border-rose-600/80 rounded-xl text-xs text-rose-100 space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-rose-300 text-[11px] uppercase tracking-wide">
                        <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>CAD Critical: Perimeter Breach</span>
                      </div>
                      <span className="text-[10px] font-mono text-rose-300 font-bold bg-rose-900/90 px-1.5 py-0.5 rounded">
                        +{item.currentGeofenceDistanceMeters || 250}m Outside
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-200">
                      Officer departed designated boundary at {item.currentSiteName}. 3-minute dwell grace period elapsed with no verified excuse.
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setExcusalModalShiftId(item.activeShift!.id);
                          setExcusalReasonInput('Authorized Meal Break');
                          setExcusalNotesInput('');
                        }}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] transition-colors"
                      >
                        Excuse Departure
                      </button>
                      <button
                        type="button"
                        onClick={() => clearGeofenceBreach(item.activeShift!.id, 'Cleared by Dispatcher CAD')}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-[10px] border border-slate-700 transition-colors"
                      >
                        Clear Breach
                      </button>
                    </div>
                  </div>
                )}

                {/* Debounce Buffer Pending Warning Banner */}
                {isDebouncing && item.activeShift && (
                  <div className="mt-2.5 p-2.5 bg-amber-950/80 border border-amber-600/80 rounded-xl text-xs text-amber-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px] uppercase tracking-wide">
                        <Timer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Perimeter Departure Buffer</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-900/90 px-1.5 py-0.5 rounded">
                        {Math.floor((item.debounceSecondsRemaining || 180) / 60)}m {(item.debounceSecondsRemaining || 180) % 60}s
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200">
                      Officer is outside perimeter. Escalating to Breach in {item.debounceSecondsRemaining || 180}s unless acknowledged.
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setExcusalModalShiftId(item.activeShift!.id);
                          setExcusalReasonInput('Authorized Perimeter Patrol');
                          setExcusalNotesInput('');
                        }}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] transition-colors"
                      >
                        Grant Excusal
                      </button>
                    </div>
                  </div>
                )}

                {/* Excused Departure Details */}
                {isExcused && item.lastDepartureReason && (
                  <div className="mt-2.5 p-2 bg-blue-950/60 border border-blue-600/40 rounded-xl text-xs text-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="text-[11px] font-medium truncate">
                        Excused: <strong className="text-white">{item.lastDepartureReason}</strong>
                      </span>
                    </div>
                    {item.activeShift && (
                      <button
                        type="button"
                        onClick={() => clearGeofenceBreach(item.activeShift!.id, 'Reset by Dispatcher')}
                        className="text-[10px] text-blue-400 hover:text-blue-300 underline font-mono shrink-0 ml-2"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}

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
                            ✓ GPS Verified {item.matchedParcelName ? `(${item.matchedParcelName})` : ''}
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

                <button
                  type="button"
                  onClick={() => {
                    setSelectedGuardForMap(item.guardId);
                    setViewMode('map');
                  }}
                  className="px-2.5 py-1 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="Track guard on Live GPS Map"
                >
                  <Compass className="w-3 h-3 text-blue-500" />
                  <span>GPS Map</span>
                </button>

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
        </>
      )}

      {/* SUPERVISOR CAD EXCUSAL MODAL */}
      {excusalModalShiftId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 text-white shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Authorize Perimeter Departure</h3>
                  <p className="text-xs text-slate-400 font-mono">CAD Supervisor Override</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExcusalModalShiftId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteExcuseDeparture} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Departure Category
                </label>
                <select
                  value={excusalReasonInput}
                  onChange={(e) => setExcusalReasonInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                >
                  <option value="Authorized Meal Break">Authorized Meal Break / Rest Period</option>
                  <option value="Incident Response / Pursuit">Incident Response / Exterior Pursuit</option>
                  <option value="Client / VIP Escort">Client / VIP Escort to Vehicle/Transit</option>
                  <option value="Perimeter Fence Line Inspection">Perimeter Fence Line / Outer Boundary Patrol</option>
                  <option value="Medical / Emergency Support">Medical / Emergency First Responder Support</option>
                  <option value="Equipment / Supply Retrieval">Equipment / Supply Retrieval</option>
                  <option value="Supervisor Authorized Task">Supervisor Authorized Task</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Supervisor CAD Notes (Optional)
                </label>
                <textarea
                  value={excusalNotesInput}
                  onChange={(e) => setExcusalNotesInput(e.target.value)}
                  placeholder="e.g. Authorized by Ops Mgr via Radio Channel 2. Expected return in 20m."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setExcusalModalShiftId(null)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-md"
                >
                  Confirm & Excuse Departure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
