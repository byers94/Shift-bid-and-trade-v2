import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { AvailabilityChangeRequestQueue } from './AvailabilityChangeRequestQueue';
import { 
  GuardProfile, 
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
  Minus,
  Search, 
  Filter, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Info, 
  Sun, 
  Moon, 
  Sunset, 
  Coffee,
  HelpCircle,
  FileText,
  Sliders,
  Send,
  CalendarCheck,
  CalendarX,
  AlertCircle,
  Palmtree,
  Shield,
  Layers,
  Settings,
  Users,
  CheckSquare
} from 'lucide-react';

interface GuardAvailabilityTrackerProps {
  initialGuardId?: string | null;
}

export const GuardAvailabilityTracker: React.FC<GuardAvailabilityTrackerProps> = ({ initialGuardId }) => {
  const { 
    guardsList, 
    timeOffRequests, 
    availabilityChangeRequests,
    maxDailyApprovedTimeOff,
    dateSpecificMaxTimeOffOverrides,
    setMaxDailyApprovedTimeOff,
    setDateSpecificMaxTimeOff,
    getTimeOffStatsForDate,
    checkTimeOffApprovalCapacity,
    updateGuardAvailability, 
    updateGuardDailyRule,
    submitTimeOffRequest,
    reviewTimeOffRequest,
    cancelTimeOffRequest,
    reviewAvailabilityChangeRequest,
    cancelAvailabilityChangeRequest,
    scheduledShifts,
    showToast
  } = useShiftOps();

  // Active sub tab: 'time_off' | 'change_requests' | 'availability'
  const [activeTab, setActiveTab] = useState<'time_off' | 'change_requests' | 'availability'>('time_off');

  // Selected Guard for availability matrix
  const [selectedGuardId, setSelectedGuardId] = useState<string>(initialGuardId || guardsList[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Pending Availability Requests count
  const pendingAvailabilityRequestsCount = useMemo(() => {
    return (availabilityChangeRequests || []).filter((r) => r.status === 'pending').length;
  }, [availabilityChangeRequests]);

  // Selected guard pending availability change request
  const selectedGuardPendingChange = useMemo(() => {
    return (availabilityChangeRequests || []).find((r) => r.guardId === selectedGuardId && r.status === 'pending');
  }, [availabilityChangeRequests, selectedGuardId]);

  // Time off status filter
  const [timeOffStatusFilter, setTimeOffStatusFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');

  // Selected Date for Daily Quota Inspection (Default: today's date)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedQuotaDate, setSelectedQuotaDate] = useState<string>(todayStr);
  const [quotaStripStartOffset, setQuotaStripStartOffset] = useState<number>(0);

  // Custom date quota editing state
  const [isEditingCustomDateLimit, setIsEditingCustomDateLimit] = useState<boolean>(false);
  const [customDateLimitInput, setCustomDateLimitInput] = useState<number>(maxDailyApprovedTimeOff);

  // Over-Capacity Warning Modal
  const [overCapacityWarningModal, setOverCapacityWarningModal] = useState<{
    request: TimeOffRequest;
    capacityCheck: ReturnType<typeof checkTimeOffApprovalCapacity>;
  } | null>(null);

  // New Time Off Request Modal State
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [timeOffGuardId, setTimeOffGuardId] = useState(selectedGuardId || guardsList[0]?.id || '');
  const [timeOffReason, setTimeOffReason] = useState<TimeOffReason>('vacation');
  const [timeOffStartDate, setTimeOffStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeOffEndDate, setTimeOffEndDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
  const [timeOffNotes, setTimeOffNotes] = useState('');

  const selectedGuard = guardsList.find(g => g.id === selectedGuardId) || guardsList[0];

  // Helper date formatting
  const formatDateLabel = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatFullDateLabel = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Generate 7-day inspection strip starting from today + quotaStripStartOffset
  const quotaDateStrip = useMemo(() => {
    const dates: string[] = [];
    const base = new Date(todayStr + 'T00:00:00');
    base.setDate(base.getDate() + quotaStripStartOffset);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [todayStr, quotaStripStartOffset]);

  // Selected date statistics
  const selectedDateStats = useMemo(() => {
    return getTimeOffStatsForDate(selectedQuotaDate);
  }, [getTimeOffStatsForDate, selectedQuotaDate, timeOffRequests, maxDailyApprovedTimeOff, dateSpecificMaxTimeOffOverrides]);

  const isSelectedDateCustomOverride = selectedQuotaDate in dateSpecificMaxTimeOffOverrides;

  // Helper to toggle day availability status
  const handleToggleDayStatus = (day: DayOfWeek, currentStatus: 'available' | 'preferred' | 'unavailable') => {
    if (!selectedGuard) return;
    const nextStatus: 'available' | 'preferred' | 'unavailable' = 
      currentStatus === 'available' ? 'preferred' : currentStatus === 'preferred' ? 'unavailable' : 'available';

    updateGuardDailyRule(selectedGuard.id, day, {
      status: nextStatus,
      isAvailable: nextStatus !== 'unavailable'
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

  // Safe approval flow checking daily quota limit
  const handleAttemptApprove = (req: TimeOffRequest) => {
    const capacityCheck = checkTimeOffApprovalCapacity(req.id);
    if (!capacityCheck.canApproveWithoutExceeding) {
      setOverCapacityWarningModal({
        request: req,
        capacityCheck
      });
    } else {
      reviewTimeOffRequest(req.id, 'approved', "Lt. Mark O'Connor");
    }
  };

  const handleConfirmOverrideApprove = () => {
    if (!overCapacityWarningModal) return;
    reviewTimeOffRequest(
      overCapacityWarningModal.request.id,
      'approved',
      "Lt. Mark O'Connor",
      'OPS-CMD-01',
      'Approved via supervisor override exceeding standard daily quota limit.'
    );
    setOverCapacityWarningModal(null);
  };

  // Filter guards list
  const filteredGuards = guardsList.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.badgeNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter time off requests
  const filteredTimeOffRequests = timeOffRequests.filter(req => {
    const isDenied = req.status === 'denied' || (req.status as any) === 'rejected';
    const matchesStatus = 
      timeOffStatusFilter === 'all' || 
      req.status === timeOffStatusFilter ||
      (timeOffStatusFilter === 'denied' && isDenied);
    const matchesSearch = 
      req.guardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.guardBadge.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingRequestsCount = timeOffRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Top Banner & Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Guard Availability & Time-Off Management</span>
                {pendingRequestsCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/80 font-mono font-bold animate-pulse">
                    {pendingRequestsCount} Pending Approval
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set daily time-off approval thresholds, monitor live staffing capacity, and review officer leave requests.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs w-full md:w-auto">
            <button
              id="admin-tab-time-off-quota"
              type="button"
              onClick={() => setActiveTab('time_off')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 md:flex-initial ${
                activeTab === 'time_off'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Time-Off & Approval Quota</span>
              {pendingRequestsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              )}
            </button>

            <button
              id="admin-tab-availability-requests"
              type="button"
              onClick={() => setActiveTab('change_requests')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 md:flex-initial ${
                activeTab === 'change_requests'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Availability Requests</span>
              {pendingAvailabilityRequestsCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] animate-pulse">
                  {pendingAvailabilityRequestsCount}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px]">
                  {(availabilityChangeRequests || []).length}
                </span>
              )}
            </button>

            <button
              id="admin-tab-weekly-matrix"
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

      {activeTab === 'time_off' && (
        <div className="space-y-4">
          {/* DAILY APPROVAL LIMIT & ACTIVE CAPACITY COUNTER PANEL */}
          <div className="bg-slate-900/95 border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 ring-1 ring-purple-500/20">
            {/* Header with Global Daily Quota Controls */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3.5 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Daily Time-Off Approval Quota & Live Capacity
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure maximum guards permitted on leave per day. Selected date counters update dynamically in real time.
                </p>
              </div>

              {/* Global Daily Quota Stepper & Presets */}
              <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800/90 self-stretch lg:self-auto justify-between lg:justify-start">
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 pl-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Max Approved / Day:</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setMaxDailyApprovedTimeOff(Math.max(1, maxDailyApprovedTimeOff - 1))}
                    disabled={maxDailyApprovedTimeOff <= 1}
                    className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Decrease daily quota limit"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-8 text-center font-mono font-bold text-sm text-purple-300">
                    {maxDailyApprovedTimeOff}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaxDailyApprovedTimeOff(Math.min(20, maxDailyApprovedTimeOff + 1))}
                    disabled={maxDailyApprovedTimeOff >= 20}
                    className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Increase daily quota limit"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 font-mono pr-1 hidden sm:inline">
                  guards / day
                </span>
              </div>
            </div>

            {/* 7-DAY DATE STRIP CAROUSEL WITH LIVE COUNTERS */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Select Date to Inspect Active Capacity:</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuotaStripStartOffset(prev => prev - 7)}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    title="Previous 7 Days"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Prev 7d</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuotaStripStartOffset(0);
                      setSelectedQuotaDate(todayStr);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-purple-300 font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuotaStripStartOffset(prev => prev + 7)}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    title="Next 7 Days"
                  >
                    <span className="hidden sm:inline">Next 7d</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 7-Day Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {quotaDateStrip.map((dateStr) => {
                  const stats = getTimeOffStatsForDate(dateStr);
                  const isSelected = selectedQuotaDate === dateStr;
                  const isToday = dateStr === todayStr;
                  const hasCustomOverride = dateStr in dateSpecificMaxTimeOffOverrides;

                  // Status badge styling
                  let statusBg = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80';
                  let statusText = `${stats.remainingSlots} open`;
                  let barColor = 'bg-emerald-500';

                  if (stats.isOverCapacity) {
                    statusBg = 'bg-purple-950 text-purple-200 border-purple-700 font-bold';
                    statusText = `+${stats.approvedCount - stats.maxAllowed} Over`;
                    barColor = 'bg-purple-500';
                  } else if (stats.isAtCapacity) {
                    statusBg = 'bg-rose-950 text-rose-300 border-rose-800 font-bold';
                    statusText = `Full (0 left)`;
                    barColor = 'bg-rose-500';
                  } else if (stats.approvedCount > 0) {
                    statusBg = 'bg-amber-950/80 text-amber-300 border-amber-800/80';
                    statusText = `${stats.remainingSlots} left`;
                    barColor = 'bg-amber-500';
                  }

                  const fillPercent = Math.min(100, (stats.approvedCount / Math.max(1, stats.maxAllowed)) * 100);

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedQuotaDate(dateStr)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? 'bg-purple-950/70 border-purple-400 ring-2 ring-purple-400/60 shadow-lg'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div>
                        {/* Day Header */}
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {formatDateLabel(dateStr)}
                          </span>
                          {isToday && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-600 text-white font-mono font-bold">
                              TODAY
                            </span>
                          )}
                        </div>

                        {/* Approval Counter Badge */}
                        <div className="flex items-baseline gap-1 my-1">
                          <span className={`text-sm font-black font-mono ${
                            stats.isOverCapacity ? 'text-purple-300' : stats.isAtCapacity ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            {stats.approvedCount}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            / {stats.maxAllowed}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-auto">
                            Apprv
                          </span>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                          <div
                            className={`h-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Remaining Slots Pill */}
                      <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-slate-800/80">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBg}`}>
                          {statusText}
                        </span>
                        {hasCustomOverride && (
                          <span className="text-[9px] text-purple-400 font-mono" title="Custom limit set for this date">
                            ★ Custom
                          </span>
                        )}
                        {stats.pendingRequests.length > 0 && (
                          <span className="text-[9px] text-amber-400 font-bold font-mono" title={`${stats.pendingRequests.length} pending requests`}>
                            {stats.pendingRequests.length}p
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FOCUSED SELECTED DATE ACTIVE CAPACITY BREAKDOWN */}
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-white">
                        {formatFullDateLabel(selectedQuotaDate)}
                      </h4>
                      {selectedQuotaDate === todayStr && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-200 border border-purple-700 font-bold">
                          Today
                        </span>
                      )}
                      {isSelectedDateCustomOverride && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                          Custom Limit: {selectedDateStats.maxAllowed}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Live status, active approvals, and remaining slot quota for this specific day.
                    </p>
                  </div>
                </div>

                {/* Date-Specific Limit Override Controls */}
                <div className="flex items-center gap-2">
                  {!isEditingCustomDateLimit ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDateLimitInput(selectedDateStats.maxAllowed);
                        setIsEditingCustomDateLimit(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isSelectedDateCustomOverride ? 'Edit Custom Limit' : 'Set Custom Limit for this Date'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-purple-500/50">
                      <span className="text-xs text-slate-300 font-medium">Date Limit:</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={customDateLimitInput}
                        onChange={(e) => setCustomDateLimitInput(parseInt(e.target.value, 10) || 0)}
                        className="w-12 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-center text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDateSpecificMaxTimeOff(selectedQuotaDate, customDateLimitInput);
                          setIsEditingCustomDateLimit(false);
                        }}
                        className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold cursor-pointer"
                      >
                        Save
                      </button>
                      {isSelectedDateCustomOverride && (
                        <button
                          type="button"
                          onClick={() => {
                            setDateSpecificMaxTimeOff(selectedQuotaDate, null);
                            setIsEditingCustomDateLimit(false);
                          }}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
                          title="Reset back to default daily limit"
                        >
                          Reset
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditingCustomDateLimit(false)}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 3 Interactive Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Metric 1: Approvals on this date */}
                <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold">Approved Leaves</span>
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-white">
                      {selectedDateStats.approvedCount}
                    </span>
                    <span className="text-sm font-mono text-slate-400">
                      / {selectedDateStats.maxAllowed} Max Allowed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {selectedDateStats.approvedCount === 0
                      ? 'No guards off duty on this date'
                      : `${selectedDateStats.approvedCount} officer(s) authorized on leave`}
                  </p>
                </div>

                {/* Metric 2: Remaining Slots Can Be Approved */}
                <div className={`p-3.5 rounded-xl border space-y-1 ${
                  selectedDateStats.isOverCapacity
                    ? 'bg-purple-950/40 border-purple-700/80'
                    : selectedDateStats.isAtCapacity
                    ? 'bg-rose-950/40 border-rose-800/80'
                    : 'bg-emerald-950/30 border-emerald-800/80'
                }`}>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold">Remaining Approval Slots</span>
                    {selectedDateStats.isAtCapacity ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-black font-mono ${
                      selectedDateStats.isOverCapacity
                        ? 'text-purple-300'
                        : selectedDateStats.isAtCapacity
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}>
                      {selectedDateStats.remainingSlots}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      {selectedDateStats.remainingSlots === 1 ? 'more can be approved' : 'more can be approved'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {selectedDateStats.isOverCapacity
                      ? `Exceeds configured daily limit by ${selectedDateStats.approvedCount - selectedDateStats.maxAllowed}`
                      : selectedDateStats.isAtCapacity
                      ? 'Maximum capacity reached for this date'
                      : `${selectedDateStats.remainingSlots} additional time-off slot(s) open for approval`}
                  </p>
                </div>

                {/* Metric 3: Pending applications touching this date */}
                <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold">Pending Applications</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-amber-300">
                      {selectedDateStats.pendingRequests.length}
                    </span>
                    <span className="text-xs text-slate-400">
                      awaiting review for this date
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {selectedDateStats.pendingRequests.length === 0
                      ? 'No pending requests for this date'
                      : 'Review queue below to approve or deny'}
                  </p>
                </div>
              </div>

              {/* Breakdown of Approved Officers on Selected Date */}
              <div className="space-y-2 pt-1">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Officers on Approved Leave for {formatDateLabel(selectedQuotaDate)} ({selectedDateStats.approvedRequests.length})</span>
                  <span className="text-[11px] font-mono text-slate-400 font-normal">
                    {selectedDateStats.remainingSlots} approval slot(s) remaining
                  </span>
                </h5>

                {selectedDateStats.approvedRequests.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {selectedDateStats.approvedRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-xl bg-slate-900 border border-emerald-800/60 flex items-start justify-between gap-2 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span className="text-xs font-bold text-white">{req.guardName}</span>
                            <span className="text-[10px] font-mono text-slate-400">({req.guardBadge})</span>
                          </div>
                          <div className="text-[11px] text-emerald-300 font-mono font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-400" />
                            <span>{req.startDate} to {req.endDate}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            Reason: <span className="text-slate-200">{req.reason.replace('_', ' ')}</span>
                          </div>
                          {req.notes && (
                            <p className="text-[10px] text-slate-400 italic">"{req.notes}"</p>
                          )}
                        </div>

                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Approved
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>No officers approved for time off on {formatDateLabel(selectedQuotaDate)}. Full operational staffing available.</span>
                  </div>
                )}
              </div>

              {/* Pending Requests on Selected Date */}
              {selectedDateStats.pendingRequests.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending Requests Covering This Date ({selectedDateStats.pendingRequests.length})</span>
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {selectedDateStats.pendingRequests.map((req) => {
                      const capacityCheck = checkTimeOffApprovalCapacity(req.id);

                      return (
                        <div
                          key={req.id}
                          className="p-3 rounded-xl bg-slate-900 border border-amber-800/80 shadow-md ring-1 ring-amber-500/20 flex flex-col justify-between gap-2.5"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-white">
                                {req.guardName} <span className="text-[10px] font-mono text-slate-400">({req.guardBadge})</span>
                              </span>
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800">
                                Pending
                              </span>
                            </div>
                            <div className="text-xs text-purple-300 font-mono font-medium flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3 text-purple-400" />
                              <span>{req.startDate} to {req.endDate}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1 capitalize">
                              Reason: {req.reason.replace('_', ' ')}
                            </p>
                            {req.notes && (
                              <p className="text-[10px] text-slate-400 italic mt-0.5">"{req.notes}"</p>
                            )}

                            {/* Capacity status preview */}
                            <div className="mt-2">
                              {capacityCheck.canApproveWithoutExceeding ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 inline-flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Within daily limit ({selectedDateStats.approvedCount + 1}/{selectedDateStats.maxAllowed} upon approval)</span>
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 inline-flex items-center gap-1 font-bold">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Exceeds daily cap on {capacityCheck.datesExceeding.length} day(s)</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleAttemptApprove(req)}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => reviewTimeOffRequest(req.id, 'denied', "Lt. Mark O'Connor")}
                              className="flex-1 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Deny</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ALL TIME-OFF REQUESTS LIST SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>All Submitted Time-Off Applications ({timeOffRequests.length})</span>
              </h4>
            </div>

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
                // Check if guard has scheduled shifts in this range
                const conflictingShifts = scheduledShifts.filter(s => 
                  s.guardId === req.guardId &&
                  s.date >= req.startDate &&
                  s.date <= req.endDate &&
                  s.status !== 'cancelled'
                );

                // Capacity impact check for all days across this request
                const capacityCheck = checkTimeOffApprovalCapacity(req.id);

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
                        <button
                          type="button"
                          onClick={() => setSelectedQuotaDate(req.startDate)}
                          className="text-xs text-purple-300 hover:text-purple-200 font-mono font-semibold flex items-center gap-1 mt-1 cursor-pointer"
                          title="Click to inspect this date in daily quota counter"
                        >
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          <span>{req.startDate} to {req.endDate}</span>
                        </button>
                      </div>

                      {req.notes && (
                        <p className="text-xs text-slate-300 italic bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                          "{req.notes}"
                        </p>
                      )}

                      {/* Daily Quota Capacity Diagnostic Badge */}
                      {req.status === 'pending' && (
                        <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                          capacityCheck.canApproveWithoutExceeding
                            ? 'bg-emerald-950/50 border border-emerald-800/60 text-emerald-300'
                            : 'bg-rose-950/60 border border-rose-800/80 text-rose-200'
                        }`}>
                          {capacityCheck.canApproveWithoutExceeding ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Within daily capacity limits ({maxDailyApprovedTimeOff} max/day).</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>Exceeds daily cap on: {capacityCheck.datesExceeding.join(', ')}</span>
                            </>
                          )}
                        </div>
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
                          onClick={() => handleAttemptApprove(req)}
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
        </div>
      )}

      {/* AVAILABILITY CHANGE REQUESTS QUEUE */}
      {activeTab === 'change_requests' && (
        <AvailabilityChangeRequestQueue
          onSelectGuardForMatrix={(guardId) => {
            setSelectedGuardId(guardId);
            setActiveTab('availability');
          }}
        />
      )}

      {/* Weekly Availability Matrix Tab */}
      {activeTab === 'availability' && (
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
                const rulesList = avail?.weeklyRules || avail?.rules || [];
                const activeDaysCount = rulesList.filter(r => (r.status ? r.status !== 'unavailable' : r.isAvailable !== false)).length || 5;
                const guardHasPending = (availabilityChangeRequests || []).some(
                  (r) => r.guardId === g.id && r.status === 'pending'
                );

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
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-purple-300 shrink-0">
                        {g.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                          <span>{g.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({g.badgeNumber})</span>
                          {guardHasPending && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded-full animate-pulse">
                              Pending Review
                            </span>
                          )}
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
                {/* Pending Change Proposal Notice Banner */}
                {selectedGuardPendingChange && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200 ring-1 ring-amber-500/20">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950 shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-extrabold text-amber-100">
                          Pending Availability Change Request Awaiting Supervisor Approval
                        </span>
                        <p className="text-amber-300/90 text-[11px] mt-0.5">
                          {selectedGuard.name} requested recurring schedule modifications ("{selectedGuardPendingChange.reasonForChange}").
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('change_requests')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs whitespace-nowrap self-start sm:self-auto cursor-pointer transition-colors shadow-xs"
                    >
                      Review in Approvals Queue →
                    </button>
                  </div>
                )}

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
                    <span>Day of Week</span>
                    <span>Status & Shift Preferences</span>
                  </div>

                  <div className="space-y-2">
                    {DAYS_OF_WEEK.map((dayInfo) => {
                      const day = dayInfo.day;
                      const avail = selectedGuard.availability;
                      const rulesList = avail?.weeklyRules || avail?.rules || [];
                      const rule = rulesList.find(r => r.dayOfWeek === day) || {
                        dayOfWeek: day,
                        dayLabel: dayInfo.name,
                        isAvailable: true,
                        status: 'available',
                        preferredShift: 'any'
                      };

                      const status: 'available' | 'preferred' | 'unavailable' = 
                        rule.status || (rule.isAvailable === false ? 'unavailable' : 'available');

                      return (
                        <div
                          key={day}
                          className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            status === 'available'
                              ? 'bg-slate-950/60 border-slate-800/80'
                              : status === 'preferred'
                              ? 'bg-purple-950/30 border-purple-800/60 shadow-xs'
                              : 'bg-rose-950/20 border-rose-900/40 opacity-70'
                          }`}
                        >
                          {/* Day Status Toggle */}
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleDayStatus(day, status)}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                                status === 'available'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80 hover:bg-emerald-900'
                                  : status === 'preferred'
                                  ? 'bg-purple-900 text-purple-200 border border-purple-500 hover:bg-purple-850'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800/80 hover:bg-rose-900'
                              }`}
                              title="Click to toggle Available -> Preferred -> Unavailable"
                            >
                              {dayInfo.short}
                            </button>

                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{dayInfo.name}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                                  status === 'available'
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                    : status === 'preferred'
                                    ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                                    : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                }`}>
                                  {status}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {status === 'unavailable'
                                  ? 'Off-Duty (Will not be scheduled)'
                                  : status === 'preferred'
                                  ? 'Officer preferred shift day'
                                  : 'Standard available day'}
                              </p>
                            </div>
                          </div>

                          {/* Shift Preference Options */}
                          {status !== 'unavailable' && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <select
                                value={rule.preferredShift || 'any'}
                                onChange={(e) => handleUpdateShiftPref(day, e.target.value as any)}
                                className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-purple-300 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                              >
                                <option value="any">Any Shift Window</option>
                                <option value="morning">Morning (06:00 - 14:00)</option>
                                <option value="swing">Swing (14:00 - 22:00)</option>
                                <option value="graveyard">Graveyard (22:00 - 06:00)</option>
                                <option value="custom">Custom Hours</option>
                              </select>

                              {rule.preferredShift === 'custom' && (
                                <div className="flex items-center gap-1 text-xs">
                                  <input
                                    type="time"
                                    value={rule.startTime || '08:00'}
                                    onChange={(e) => handleUpdateTimeWindow(day, e.target.value, rule.endTime || '16:00')}
                                    className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs"
                                  />
                                  <span className="text-slate-500">-</span>
                                  <input
                                    type="time"
                                    value={rule.endTime || '16:00'}
                                    onChange={(e) => handleUpdateTimeWindow(day, rule.startTime || '08:00', e.target.value)}
                                    className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
      )}

      {/* OVER-CAPACITY APPROVAL WARNING MODAL */}
      {overCapacityWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-700/80 rounded-2xl shadow-2xl p-5 space-y-4 my-8 ring-1 ring-rose-500/30 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Daily Approval Quota Exceeded
                  </h3>
                  <p className="text-xs text-rose-300">
                    Capacity limit warning for requested date range
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOverCapacityWarningModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Approving this time-off request for <strong className="text-white">{overCapacityWarningModal.request.guardName}</strong> ({overCapacityWarningModal.request.guardBadge}) will cause the number of off-duty officers to exceed the daily limit of <strong className="text-purple-300">{maxDailyApprovedTimeOff} guard(s)</strong> on the following dates:
              </p>

              <div className="space-y-1.5 max-h-48 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800">
                {overCapacityWarningModal.capacityCheck.affectedDates.map((item) => (
                  <div
                    key={item.date}
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      item.wouldExceed
                        ? 'bg-rose-950/40 border-rose-800 text-rose-200 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="font-mono">{formatDateLabel(item.date)}</span>
                    <span>
                      {item.currentApproved} approved + 1 = <strong className="text-white">{item.currentApproved + 1}</strong> (Limit: {item.maxAllowed})
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      item.wouldExceed ? 'bg-rose-950 text-rose-300 border border-rose-700' : 'bg-emerald-950 text-emerald-300'
                    }`}>
                      {item.wouldExceed ? `Exceeds by ${item.currentApproved + 1 - item.maxAllowed}` : 'OK'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-amber-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  Operations supervisors may override this limit if alternate relief coverage or roving security units are assigned.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setOverCapacityWarningModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancel / Keep Pending
              </button>
              <button
                type="button"
                onClick={handleConfirmOverrideApprove}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/50 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Override Quota & Approve</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT TIME-OFF REQUEST */}
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
                  <p className="text-xs text-slate-400">
                    Create a scheduled leave application
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTimeOffModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTimeOff} className="space-y-3.5">
              {/* Select Guard */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Security Guard
                </label>
                <select
                  value={timeOffGuardId}
                  onChange={(e) => setTimeOffGuardId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {guardsList.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.badgeNumber}) - {g.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Time-Off
                </label>
                <select
                  value={timeOffReason}
                  onChange={(e) => setTimeOffReason(e.target.value as TimeOffReason)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="vacation">Vacation / Paid Time Off</option>
                  <option value="medical">Medical / Sick Leave</option>
                  <option value="family_emergency">Family Emergency</option>
                  <option value="personal">Personal Leave</option>
                  <option value="military_duty">Military / Reserve Duty</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={timeOffStartDate}
                    onChange={(e) => setTimeOffStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={timeOffEndDate}
                    onChange={(e) => setTimeOffEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Supervisor Notes / Context (Optional)
                </label>
                <textarea
                  rows={2}
                  value={timeOffNotes}
                  onChange={(e) => setTimeOffNotes(e.target.value)}
                  placeholder="e.g. Annual leave scheduled in advance with shift relief coverage."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTimeOffModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/40 cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
