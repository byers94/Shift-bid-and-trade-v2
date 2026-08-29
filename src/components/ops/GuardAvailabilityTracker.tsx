import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  GuardProfile, 
  GuardAvailability, 
  DailyAvailabilityRule, 
  TimeOffRequest, 
  TimeOffReason, 
  DayOfWeek, 
  DAYS_OF_WEEK, 
  DAY_NAMES 
} from '../../types/shift';
import { 
  Clock, 
  Calendar, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  X, 
  ChevronRight, 
  Info, 
  Sun, 
  Moon, 
  Sunset, 
  Coffee,
  HelpCircle,
  FileText,
  Sliders,
  Send
} from 'lucide-react';

interface GuardAvailabilityTrackerProps {
  initialGuardId?: string | null;
}

export const GuardAvailabilityTracker: React.FC<GuardAvailabilityTrackerProps> = ({ initialGuardId }) => {
  const { 
    guardsList, 
    timeOffRequests, 
    updateGuardAvailability, 
    updateGuardDailyRule,
    submitTimeOffRequest,
    reviewTimeOffRequest,
    cancelTimeOffRequest,
    scheduledShifts,
    setSchedules,
    showToast
  } = useShiftOps();

  // Active sub tab: 'availability' | 'time_off'
  const [activeTab, setActiveTab] = useState<'availability' | 'time_off'>('availability');

  // Selected Guard for editing/viewing
  const [selectedGuardId, setSelectedGuardId] = useState<string>(initialGuardId || guardsList[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Time off filter
  const [timeOffStatusFilter, setTimeOffStatusFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');

  // New Time Off Request Modal State
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [timeOffGuardId, setTimeOffGuardId] = useState(selectedGuardId || guardsList[0]?.id || '');
  const [timeOffReason, setTimeOffReason] = useState<TimeOffReason>('vacation');
  const [timeOffStartDate, setTimeOffStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeOffEndDate, setTimeOffEndDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
  const [timeOffNotes, setTimeOffNotes] = useState('');

  const selectedGuard = guardsList.find(g => g.id === selectedGuardId) || guardsList[0];

  // Helper to toggle day availability status
  const handleToggleDayStatus = (day: DayOfWeek, currentStatus: 'available' | 'preferred' | 'unavailable') => {
    if (!selectedGuard) return;
    const nextStatus = 
      currentStatus === 'available' ? 'preferred' : currentStatus === 'preferred' ? 'unavailable' : 'available';

    updateGuardDailyRule(selectedGuard.id, day, {
      status: nextStatus
    });
  };

  // Helper to update day shift preference
  const handleUpdateShiftPref = (day: DayOfWeek, pref: 'any' | 'morning' | 'swing' | 'graveyard' | 'custom') => {
    if (!selectedGuard) return;
    updateGuardDailyRule(selectedGuard.id, day, {
      preferredShift: pref
    });
  };

  // Helper to update custom start/end time window
  const handleUpdateTimeWindow = (day: DayOfWeek, startTime: string, endTime: string) => {
    if (!selectedGuard) return;
    updateGuardDailyRule(selectedGuard.id, day, {
      startTime,
      endTime
    });
  };

  const handleMaxHoursChange = (maxHours: number) => {
    if (!selectedGuard) return;
    updateGuardAvailability(selectedGuard.id, {
      maxWeeklyHours: maxHours
    });
  };

  const handleOvertimeToggle = (overtimeWilling: boolean) => {
    if (!selectedGuard) return;
    updateGuardAvailability(selectedGuard.id, {
      overtimeWilling
    });
  };

  const handleCreateTimeOff = (e: React.FormEvent) => {
    e.preventDefault();
    const guard = guardsList.find(g => g.id === timeOffGuardId);
    if (!guard) return;

    submitTimeOffRequest({
      guardId: guard.id,
      guardName: guard.name,
      guardBadge: guard.badgeNumber,
      startDate: timeOffStartDate,
      endDate: timeOffEndDate,
      type: 'vacation',
      reason: timeOffReason,
      notes: timeOffNotes
    });

    setIsTimeOffModalOpen(false);
    setTimeOffNotes('');
    setActiveTab('time_off');
  };

  // Filter guards list
  const filteredGuards = guardsList.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.badgeNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter time off requests
  const filteredTimeOffRequests = timeOffRequests.filter(req => {
    const matchesStatus = timeOffStatusFilter === 'all' || req.status === timeOffStatusFilter;
    const matchesSearch = 
      req.guardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.guardBadge.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingRequestsCount = timeOffRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Guard Availability & Time-Off Tracker
                {pendingRequestsCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono animate-pulse">
                    {pendingRequestsCount} Pending Requests
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage guard work windows, weekly day-off preferences, and review time-off requests.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('availability')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex-1 md:flex-initial ${
                activeTab === 'availability'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weekly Availability Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('time_off')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 md:flex-initial ${
                activeTab === 'time_off'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Time-Off Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setTimeOffGuardId(selectedGuardId || guardsList[0]?.id || '');
              setIsTimeOffModalOpen(true);
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Time-Off</span>
          </button>
        </div>
      </div>

      {activeTab === 'availability' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Guard Selector List */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Guard ({guardsList.length})
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guards..."
                className="w-full pl-7 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredGuards.map((g) => {
                const isSelected = g.id === selectedGuardId;
                const avail = g.availability;
                const activeDaysCount = avail?.rules?.filter(r => r.status !== 'unavailable').length ?? 5;

                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGuardId(g.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-purple-950/60 border-purple-500 ring-1 ring-purple-400/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-purple-300">
                        {g.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{g.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({g.badgeNumber})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{activeDaysCount} Days Avail</span>
                          <span>•</span>
                          <span>Max {avail?.maxWeeklyHours || 40}h/wk</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-400' : 'text-slate-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Weekly Availability Grid for Selected Guard */}
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            {selectedGuard ? (
              <>
                {/* Guard Profile Summary Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-900/50 border border-purple-600/60 flex items-center justify-center font-black text-base text-purple-200">
                      {selectedGuard.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        {selectedGuard.name}
                        <span className="text-xs font-mono text-slate-400">({selectedGuard.badgeNumber})</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 uppercase font-semibold">
                          {selectedGuard.role}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedGuard.phone} • {selectedGuard.email}
                      </p>
                    </div>
                  </div>

                  {/* Overtime and Max Hours Controls */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <span className="text-slate-400 font-medium">Max Weekly Hours:</span>
                      <select
                        value={selectedGuard.availability?.maxWeeklyHours || 40}
                        onChange={(e) => handleMaxHoursChange(parseInt(e.target.value, 10))}
                        className="bg-transparent text-purple-300 font-bold font-mono focus:outline-none cursor-pointer"
                      >
                        <option value={20}>20h (Part Time)</option>
                        <option value={30}>30h</option>
                        <option value={40}>40h (Standard Full Time)</option>
                        <option value={48}>48h (Extended)</option>
                        <option value={60}>60h (Max OT)</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs cursor-pointer hover:bg-slate-850">
                      <input
                        type="checkbox"
                        checked={selectedGuard.availability?.overtimeWilling ?? true}
                        onChange={(e) => handleOvertimeToggle(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-purple-500 bg-slate-900 border-slate-700 focus:ring-purple-500"
                      />
                      <span className="text-slate-300 font-semibold">Overtime Willing</span>
                    </label>
                  </div>
                </div>

                {/* Day-by-Day Interactive Availability Schedule */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                    <span>Day of Week & Status (Click badge to cycle status)</span>
                    <span className="hidden sm:inline">Preferred Shift Window & Working Hours</span>
                  </div>

                  {DAYS_OF_WEEK.map((d) => {
                    const rule = selectedGuard.availability?.rules?.find(r => r.dayOfWeek === d.day) || {
                      dayOfWeek: d.day,
                      status: d.day >= 1 && d.day <= 5 ? 'available' : 'unavailable',
                      preferredShift: 'any'
                    };

                    const isAvailable = rule.status === 'available';
                    const isPreferred = rule.status === 'preferred';
                    const isUnavailable = rule.status === 'unavailable';

                    return (
                      <div
                        key={d.day}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                          isPreferred
                            ? 'bg-emerald-950/30 border-emerald-800/80 shadow-xs'
                            : isAvailable
                            ? 'bg-slate-950 border-slate-800'
                            : 'bg-slate-950/40 border-slate-850 opacity-70'
                        }`}
                      >
                        {/* Day Name & Interactive Status Badge */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="w-24 font-bold text-xs text-white flex items-center gap-1.5">
                            <span className="font-mono text-slate-400 text-[11px]">{d.short}</span>
                            <span>{d.name}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleDayStatus(d.day, rule.status)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                              isPreferred
                                ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-600 hover:bg-emerald-800'
                                : isAvailable
                                ? 'bg-blue-900/80 text-blue-200 border border-blue-600 hover:bg-blue-800'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900'
                            }`}
                            title="Click to cycle: Available -> Preferred -> Unavailable"
                          >
                            {isPreferred ? (
                              <>
                                <Sparkles className="w-3 h-3 text-emerald-300" />
                                <span>Preferred Day</span>
                              </>
                            ) : isAvailable ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-blue-300" />
                                <span>Available</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-400" />
                                <span>Unavailable</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Shift Preference Selector and Time Windows */}
                        {!isUnavailable ? (
                          <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-between sm:justify-end">
                            <select
                              value={rule.preferredShift || 'any'}
                              onChange={(e) => handleUpdateShiftPref(d.day, e.target.value as any)}
                              className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="any">☀️ Any Shift Time</option>
                              <option value="morning">🌅 Morning (06:00 - 14:00)</option>
                              <option value="swing">🌇 Swing / Evening (14:00 - 22:00)</option>
                              <option value="graveyard">🌙 Graveyard / Overnight (22:00 - 06:00)</option>
                              <option value="custom">⚙️ Custom Hours Window</option>
                            </select>

                            {rule.preferredShift === 'custom' && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="time"
                                  value={rule.startTime || '08:00'}
                                  onChange={(e) => handleUpdateTimeWindow(d.day, e.target.value, rule.endTime || '16:00')}
                                  className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[11px] text-white font-mono"
                                />
                                <span className="text-slate-500">-</span>
                                <input
                                  type="time"
                                  value={rule.endTime || '16:00'}
                                  onChange={(e) => handleUpdateTimeWindow(d.day, rule.startTime || '08:00', e.target.value)}
                                  className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[11px] text-white font-mono"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Off duty / Not scheduled</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Assigned Set Schedules for this Guard */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Long-Term Standing Set Schedules Assigned ({
                      setSchedules.filter(s => s.assignedGuardId === selectedGuard.id).length
                    })
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {setSchedules.filter(s => s.assignedGuardId === selectedGuard.id).map(s => (
                      <div key={s.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="font-bold text-white line-clamp-1">{s.name}</div>
                        <div className="text-slate-400 flex items-center justify-between text-[11px]">
                          <span>{s.siteName}</span>
                          <span className="font-mono text-blue-300">{s.startTime}-{s.endTime}</span>
                        </div>
                      </div>
                    ))}
                    {setSchedules.filter(s => s.assignedGuardId === selectedGuard.id).length === 0 && (
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-xs text-slate-500 italic sm:col-span-2">
                        No recurring set schedules currently assigned to {selectedGuard.name}.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500">
                Please select a security officer from the list.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Time-Off Requests Tab */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search time-off by guard name or reason..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={timeOffStatusFilter}
                onChange={(e) => setTimeOffStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
              >
                <option value="all">All Request Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
              </select>
            </div>
          </div>

          {/* Time Off Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredTimeOffRequests.map((req) => {
              const guard = guardsList.find(g => g.id === req.guardId);
              
              // Check if guard has scheduled shifts in this range
              const conflictingShifts = scheduledShifts.filter(s => 
                s.guardId === req.guardId &&
                s.date >= req.startDate &&
                s.date <= req.endDate &&
                s.status !== 'cancelled'
              );

              return (
                <div
                  key={req.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    req.status === 'pending'
                      ? 'bg-slate-900 border-amber-800/80 shadow-md ring-1 ring-amber-500/20'
                      : req.status === 'approved'
                      ? 'bg-slate-900/90 border-slate-800'
                      : 'bg-slate-900/50 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header with Reason Badge & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        req.reason === 'medical'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : req.reason === 'vacation'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : req.reason === 'family_emergency'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {req.reason.replace('_', ' ')}
                      </span>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        req.status === 'approved'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : req.status === 'pending'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    {/* Guard Name and Date Range */}
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{req.guardName}</span>
                        <span className="text-xs font-mono text-slate-400">({req.guardBadge})</span>
                      </h4>
                      <p className="text-xs text-purple-300 font-mono font-semibold flex items-center gap-1 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span>{req.startDate} to {req.endDate}</span>
                      </p>
                    </div>

                    {req.notes && (
                      <p className="text-xs text-slate-300 italic bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                        "{req.notes}"
                      </p>
                    )}

                    {/* Shift Conflict Warning */}
                    {conflictingShifts.length > 0 && req.status === 'pending' && (
                      <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/80 text-[11px] text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{conflictingShifts.length} scheduled shift(s) will need relief coverage upon approval.</span>
                      </div>
                    )}

                    {req.reviewedBy && (
                      <div className="text-[10px] text-slate-500">
                        Reviewed by {req.reviewedBy} on {req.reviewedAt?.slice(0, 10)}
                      </div>
                    )}
                  </div>

                  {/* Actions for Pending Requests */}
                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800 mt-3">
                      <button
                        type="button"
                        onClick={() => reviewTimeOffRequest(req.id, 'approved', "Lt. Mark O'Connor")}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-950/40 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => reviewTimeOffRequest(req.id, 'denied', "Lt. Mark O'Connor")}
                        className="flex-1 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Deny</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredTimeOffRequests.length === 0 && (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">No Time-Off Requests Found</h3>
              <p className="text-xs text-slate-500">
                Guard time-off applications will appear here for supervisor approval and schedule adjustments.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Submit Time-Off Request */}
      {isTimeOffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Submit Time-Off Request
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Log vacation, medical, or emergency leave for a security officer.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTimeOffModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTimeOff} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Security Officer
                </label>
                <select
                  value={timeOffGuardId}
                  onChange={(e) => setTimeOffGuardId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {guardsList.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.badgeNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Leave Reason / Category
                </label>
                <select
                  value={timeOffReason}
                  onChange={(e) => setTimeOffReason(e.target.value as TimeOffReason)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="vacation">🌴 Scheduled Vacation / PTO</option>
                  <option value="medical">🩺 Medical / Sick Leave</option>
                  <option value="family_emergency">🚨 Family Emergency</option>
                  <option value="personal">👤 Personal Obligation</option>
                  <option value="military_duty">🎖️ Military / Training Duty</option>
                  <option value="bereavement">🕊️ Bereavement</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={timeOffStartDate}
                    onChange={(e) => setTimeOffStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={timeOffEndDate}
                    onChange={(e) => setTimeOffEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Notes & Details
                </label>
                <textarea
                  rows={2}
                  value={timeOffNotes}
                  onChange={(e) => setTimeOffNotes(e.target.value)}
                  placeholder="Provide any additional supervisor notes or advance notice information..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTimeOffModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
