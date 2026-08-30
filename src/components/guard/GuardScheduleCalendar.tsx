import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ScheduledShift, ShiftDutyStatus, TimeOffRequest } from '../../types/shift';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Building2, 
  Shield, 
  ArrowRightLeft, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Navigation, 
  Car, 
  FileText, 
  X, 
  Coffee, 
  User, 
  Share2, 
  PhoneOff, 
  SlidersHorizontal,
  Search,
  Zap,
  CalendarDays,
  ListFilter,
  Check,
  Palmtree,
  Plus
} from 'lucide-react';
import { PostShiftModal } from './PostShiftModal';
import { GuardTimeOffModal } from './GuardTimeOffModal';

interface GuardScheduleCalendarProps {
  onNavigateToDuty?: () => void;
  onOpenAlertPrefs?: () => void;
}

type CalendarViewMode = 'month' | 'week' | 'agenda';

export const GuardScheduleCalendar: React.FC<GuardScheduleCalendarProps> = ({ 
  onNavigateToDuty,
  onOpenAlertPrefs
}) => {
  const { 
    activeGuard, 
    scheduledShifts, 
    activeClockedInShift, 
    timeOffRequests, 
    trades, 
    showToast 
  } = useShiftOps();

  // Navigation State
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Filtering
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'active_or_today' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Shift Modal / Detail Drawer
  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState<ScheduledShift | null>(null);
  const [isPostTradeModalOpen, setIsPostTradeModalOpen] = useState<boolean>(false);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState<boolean>(false);
  const [timeOffModalTab, setTimeOffModalTab] = useState<'request_form' | 'my_requests'>('request_form');
  const [timeOffInitialStart, setTimeOffInitialStart] = useState<string | undefined>(undefined);
  const [timeOffInitialEnd, setTimeOffInitialEnd] = useState<string | undefined>(undefined);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter shifts belonging to the active guard
  const guardShifts = useMemo(() => {
    return scheduledShifts.filter((s) => s.guardId === activeGuard.id);
  }, [scheduledShifts, activeGuard.id]);

  // Guard Time-Off Requests
  const guardTimeOff = useMemo(() => {
    return timeOffRequests.filter((r) => r.guardId === activeGuard.id);
  }, [timeOffRequests, activeGuard.id]);

  const pendingTimeOffCount = useMemo(() => {
    return guardTimeOff.filter((r) => r.status === 'pending').length;
  }, [guardTimeOff]);

  // Check approved time off for date
  const getApprovedTimeOffForDate = (dateStr: string): TimeOffRequest | undefined => {
    return guardTimeOff.find(
      (r) => r.startDate <= dateStr && r.endDate >= dateStr && r.status === 'approved'
    );
  };

  // Check pending time off for date
  const getPendingTimeOffForDate = (dateStr: string): TimeOffRequest | undefined => {
    return guardTimeOff.find(
      (r) => r.startDate <= dateStr && r.endDate >= dateStr && r.status === 'pending'
    );
  };

  // Check denied time off for date
  const getDeniedTimeOffForDate = (dateStr: string): TimeOffRequest | undefined => {
    return guardTimeOff.find(
      (r) => r.startDate <= dateStr && r.endDate >= dateStr && (r.status === 'denied' || (r.status as any) === 'rejected')
    );
  };

  // Helper date calculations
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // Month grid days (with padding)
  const monthCalendarDays = useMemo(() => {
    const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];
    const firstDayIndex = monthStart.getDay(); // 0 = Sunday

    // Previous month padding
    const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthLastDay - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: d, dateStr, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= monthEnd.getDate(); i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: d, dateStr, isCurrentMonth: true });
    }

    // Next month padding to round up to complete weeks (multiple of 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i);
        const dateStr = d.toISOString().split('T')[0];
        days.push({ date: d, dateStr, isCurrentMonth: false });
      }
    }

    return days;
  }, [currentDate]);

  // Week days (Sunday through Saturday around currentDate)
  const weekDays = useMemo(() => {
    const days: { date: Date; dateStr: string; dayName: string; dayNumber: number }[] = [];
    const dayOfWeek = currentDate.getDay(); // 0 = Sun
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate()
      });
    }
    return days;
  }, [currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 14);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 14);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().split('T')[0]);
  };

  // Weekly hours summary
  const currentWeekHours = useMemo(() => {
    const weekDateStrings = new Set(weekDays.map((w) => w.dateStr));
    const weekShifts = guardShifts.filter((s) => weekDateStrings.has(s.date) && s.status !== 'cancelled');
    return weekShifts.reduce((acc, curr) => acc + (curr.hours || 0), 0);
  }, [guardShifts, weekDays]);

  // Shifts for selected focused day
  const focusedDayShifts = useMemo(() => {
    return guardShifts.filter((s) => {
      const matchesDate = s.date === selectedDateStr;
      const matchesStatus = 
        statusFilter === 'all' 
          ? true 
          : statusFilter === 'scheduled' 
          ? s.status === 'scheduled' 
          : statusFilter === 'active_or_today'
          ? s.status === 'on_duty' || s.status === 'on_break' || s.date === todayStr
          : s.status === 'completed';
      
      const matchesSearch = 
        !searchQuery.trim() || 
        s.siteName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.postRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.siteAddress && s.siteAddress.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesDate && matchesStatus && matchesSearch;
    });
  }, [guardShifts, selectedDateStr, statusFilter, searchQuery, todayStr]);

  // Chronological agenda shifts (upcoming & recent)
  const agendaShifts = useMemo(() => {
    return [...guardShifts]
      .filter((s) => {
        const matchesStatus = 
          statusFilter === 'all' 
            ? true 
            : statusFilter === 'scheduled' 
            ? s.status === 'scheduled' 
            : statusFilter === 'active_or_today'
            ? s.status === 'on_duty' || s.status === 'on_break' || s.date === todayStr
            : s.status === 'completed';

        const matchesSearch = 
          !searchQuery.trim() || 
          s.siteName.toLowerCase().includes(searchQuery.toLowerCase()) || 
          s.postRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.siteAddress && s.siteAddress.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [guardShifts, statusFilter, searchQuery, todayStr]);

  // Group agenda shifts by date
  const groupedAgenda = useMemo(() => {
    const groups: { dateStr: string; shifts: ScheduledShift[] }[] = [];
    agendaShifts.forEach((s) => {
      const existing = groups.find((g) => g.dateStr === s.date);
      if (existing) {
        existing.shifts.push(s);
      } else {
        groups.push({ dateStr: s.date, shifts: [s] });
      }
    });
    return groups;
  }, [agendaShifts]);

  // Status Badge Helper
  const renderStatusBadge = (status: ShiftDutyStatus) => {
    switch (status) {
      case 'on_duty':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ON DUTY
          </span>
        );
      case 'on_break':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1 font-mono">
            <Coffee className="w-3 h-3 text-amber-500" />
            ON BREAK
          </span>
        );
      case 'completed':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 font-mono">
            COMPLETED
          </span>
        );
      case 'late':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-500/40 font-mono">
            LATE
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-400/40 font-mono">
            SCHEDULED
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Controls: Header & View Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-[#1e3a8a] dark:text-blue-400">
                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                My Schedule Calendar
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Assigned posts, roving circuits, and upcoming shifts for {activeGuard.name}.
            </p>
          </div>

          {/* View Mode Switcher & Time Off Action */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              id="guard-request-time-off-btn"
              type="button"
              onClick={() => {
                setTimeOffInitialStart(selectedDateStr || todayStr);
                setTimeOffInitialEnd(selectedDateStr || todayStr);
                setTimeOffModalTab('request_form');
                setIsTimeOffModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs shadow-sm shadow-emerald-950/20 flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-400/40"
            >
              <Palmtree className="w-3.5 h-3.5 text-emerald-200" />
              <span>Request Time Off</span>
            </button>

            <button
              id="guard-my-time-off-requests-btn"
              type="button"
              onClick={() => {
                setTimeOffModalTab('my_requests');
                setIsTimeOffModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300 dark:border-slate-700"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>My Requests</span>
              {pendingTimeOffCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
                  {pendingTimeOffCount} Pending
                </span>
              ) : guardTimeOff.length > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900 text-[#1e3a8a] dark:text-blue-200 font-mono text-[10px] font-bold">
                  {guardTimeOff.length}
                </span>
              ) : null}
            </button>

            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <button
                id="guard-cal-view-week"
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Week
              </button>
              <button
                id="guard-cal-view-month"
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Month
              </button>
              <button
                id="guard-cal-view-agenda"
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'agenda'
                    ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Timeline
              </button>
            </div>
          </div>
        </div>

        {/* Date Navigator Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              aria-label="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              aria-label="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#1e3a8a] dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer ml-1"
            >
              Today
            </button>
          </div>

          <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
            {viewMode === 'month' && (
              <span>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            )}
            {viewMode === 'week' && (
              <span>
                {weekDays[0]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                {weekDays[6]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {viewMode === 'agenda' && (
              <span>Upcoming Assignments ({agendaShifts.length})</span>
            )}
          </div>

          {/* Quick Hours Summary */}
          <div className="text-right">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">Week Booked</span>
            <span className="text-xs font-extrabold text-[#1e3a8a] dark:text-blue-400 font-mono">
              {currentWeekHours.toFixed(1)}h
            </span>
          </div>
        </div>
      </div>

      {/* Week View / Strip */}
      {viewMode === 'week' && (
        <div className="space-y-3">
          {/* 7-Day Interactive Strip */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {weekDays.map((w) => {
              const isSelected = w.dateStr === selectedDateStr;
              const isToday = w.dateStr === todayStr;
              const dayShifts = guardShifts.filter((s) => s.date === w.dateStr && s.status !== 'cancelled');
              const hasOnDuty = dayShifts.some((s) => s.status === 'on_duty' || s.status === 'on_break');
              const approvedLeave = getApprovedTimeOffForDate(w.dateStr);
              const pendingLeave = getPendingTimeOffForDate(w.dateStr);

              return (
                <button
                  key={w.dateStr}
                  onClick={() => setSelectedDateStr(w.dateStr)}
                  className={`p-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[70px] relative ${
                    isSelected
                      ? 'bg-[#1e3a8a] text-white shadow-md ring-2 ring-blue-400/50'
                      : isToday
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSelected ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {w.dayName}
                  </span>

                  <span className={`text-base font-black my-0.5 ${
                    isSelected ? 'text-white' : isToday ? 'text-blue-600 dark:text-blue-400' : ''
                  }`}>
                    {w.dayNumber}
                  </span>

                  {/* Dot/Badge Indicators */}
                  <div className="flex items-center gap-1 mt-auto">
                    {dayShifts.length > 0 && (
                      <span className={`text-[9px] font-bold font-mono px-1 rounded-full ${
                        isSelected 
                          ? 'bg-blue-900 text-white' 
                          : hasOnDuty 
                          ? 'bg-emerald-500 text-white animate-pulse' 
                          : 'bg-blue-100 dark:bg-blue-900 text-[#1e3a8a] dark:text-blue-200'
                      }`}>
                        {dayShifts.length}
                      </span>
                    )}
                    {approvedLeave && (
                      <span title={`Approved Leave: ${approvedLeave.reason} (Off Duty)`} className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                    {pendingLeave && !approvedLeave && (
                      <span title={`Pending Time-Off: ${pendingLeave.reason} (Awaiting Review)`} className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                    {dayShifts.length === 0 && !approvedLeave && !pendingLeave && (
                      <span className={`text-[9px] ${isSelected ? 'text-blue-300' : 'text-slate-400 dark:text-slate-600'}`}>–</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Focused Day Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Shifts for {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {selectedDateStr === todayStr && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold uppercase font-mono">
                    Today
                  </span>
                )}
              </div>

              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                {focusedDayShifts.length} {focusedDayShifts.length === 1 ? 'Shift' : 'Shifts'}
              </span>
            </div>

            {/* Approved Time-off banner */}
            {getApprovedTimeOffForDate(selectedDateStr) && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <Palmtree className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold uppercase text-[11px] tracking-wider text-emerald-800 dark:text-emerald-300">
                      ✓ Approved Leave ({getApprovedTimeOffForDate(selectedDateStr)?.type})
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded-full font-bold">
                      Off Duty
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-200/90 mt-0.5">
                    {getApprovedTimeOffForDate(selectedDateStr)?.reason}
                  </p>
                  {getApprovedTimeOffForDate(selectedDateStr)?.adminNotes && (
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300 italic mt-1 bg-emerald-100/50 dark:bg-emerald-900/30 p-1.5 rounded">
                      Note from Dispatch: "{getApprovedTimeOffForDate(selectedDateStr)?.adminNotes}"
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Pending Time-off banner (if not approved) */}
            {!getApprovedTimeOffForDate(selectedDateStr) && getPendingTimeOffForDate(selectedDateStr) && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 border-dashed text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold uppercase text-[11px] tracking-wider text-amber-800 dark:text-amber-300">
                      ⏳ Leave Request Pending Ops Review ({getPendingTimeOffForDate(selectedDateStr)?.type})
                    </span>
                    <span className="text-[10px] font-mono bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded-full font-bold">
                      Pending Approval
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-200/90 mt-0.5">
                    {getPendingTimeOffForDate(selectedDateStr)?.reason}
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold mt-1">
                    * Scheduled shifts below remain active and mandatory until Operations approves your request.
                  </p>
                </div>
              </div>
            )}

            {/* Shift Cards */}
            <div className="space-y-2.5">
              {focusedDayShifts.map((shift) => (
                <div
                  key={shift.id}
                  onClick={() => setSelectedShiftForDetail(shift)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 shadow-xs flex flex-col justify-between gap-3 ${
                    shift.status === 'on_duty' || shift.status === 'on_break'
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/60 ring-1 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-[#1e3a8a] dark:text-blue-400 shrink-0" />
                          <span>{shift.siteName}</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{shift.siteAddress || 'Authorized Client Facility Post'}</span>
                        </p>
                      </div>

                      {renderStatusBadge(shift.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span>{shift.startTime} – {shift.endTime}</span>
                        <span className="text-slate-400">({shift.hours} hrs)</span>
                      </div>

                      <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100/70 dark:bg-blue-900/40 text-[#1e3a8a] dark:text-blue-300 font-semibold">
                        {shift.postRole}
                      </span>

                      {shift.isRovingShift && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-semibold flex items-center gap-1">
                          <Car className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                          <span>Rover Circuit</span>
                        </span>
                      )}
                    </div>

                    {shift.postInstructions && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 italic mt-1">
                        Instructions: {shift.postInstructions}
                      </p>
                    )}
                  </div>

                  {/* Shift Quick Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <span className="text-[11px] text-[#1e3a8a] dark:text-blue-400 font-semibold underline underline-offset-2">
                      Tap for Full Post Details →
                    </span>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {shift.status === 'scheduled' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedShiftForDetail(shift);
                            setIsPostTradeModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Offer this shift on Trade Board"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-blue-500" />
                          <span>Trade / Swap</span>
                        </button>
                      )}

                      {shift.date === todayStr && shift.status === 'scheduled' && onNavigateToDuty && (
                        <button
                          type="button"
                          onClick={() => onNavigateToDuty()}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Go to Terminal</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {focusedDayShifts.length === 0 && (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-850/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-1.5">
                  <CalendarIcon className="w-7 h-7 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No Shifts Scheduled for this Day
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    You are off duty or scheduled for rest. Check the Open Board for open shift opportunities.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
          {/* Day Headers (Sun - Sat) */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthCalendarDays.map((cell) => {
              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = cell.dateStr === todayStr;
              const dayShifts = guardShifts.filter((s) => s.date === cell.dateStr && s.status !== 'cancelled');
              const hasOnDuty = dayShifts.some((s) => s.status === 'on_duty' || s.status === 'on_break');
              const approvedLeave = getApprovedTimeOffForDate(cell.dateStr);
              const pendingLeave = getPendingTimeOffForDate(cell.dateStr);

              return (
                <button
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`p-1.5 sm:p-2 min-h-[64px] sm:min-h-[76px] rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/80 border-[#1e3a8a] dark:border-blue-500 ring-2 ring-blue-400/40 shadow-xs'
                      : isToday
                      ? 'bg-blue-50/50 dark:bg-slate-850 border-blue-300 dark:border-blue-800'
                      : cell.isCurrentMonth
                      ? 'bg-slate-50/70 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      : 'bg-slate-100/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/40 opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      isSelected
                        ? 'text-[#1e3a8a] dark:text-blue-300'
                        : isToday
                        ? 'text-blue-600 dark:text-blue-400 font-black'
                        : cell.isCurrentMonth
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400'
                    }`}>
                      {cell.date.getDate()}
                    </span>

                    {approvedLeave && (
                      <span title={`Approved Leave: ${approvedLeave.reason} (Off Duty)`} className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                    {pendingLeave && !approvedLeave && (
                      <span title={`Pending Time-Off: ${pendingLeave.reason}`} className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>

                  {/* Mini Shift Pills on Grid */}
                  <div className="space-y-0.5 mt-1 overflow-hidden">
                    {approvedLeave && (
                      <div className="text-[9px] font-bold truncate px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        🌴 Approved Leave
                      </div>
                    )}
                    {pendingLeave && !approvedLeave && (
                      <div className="text-[9px] font-bold truncate px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 border-dashed">
                        ⏳ Pending Leave
                      </div>
                    )}
                    {dayShifts.slice(0, 2).map((s) => (
                      <div
                        key={s.id}
                        className={`text-[9px] font-semibold truncate px-1 py-0.2 rounded ${
                          s.status === 'on_duty'
                            ? 'bg-emerald-600 text-white font-bold'
                            : isSelected
                            ? 'bg-[#1e3a8a] text-white'
                            : 'bg-blue-100 dark:bg-blue-900 text-[#1e3a8a] dark:text-blue-200'
                        }`}
                        title={`${s.siteName} (${s.startTime}-${s.endTime})`}
                      >
                        {s.startTime} {s.siteName.split(' ')[0]}
                      </div>
                    ))}
                    {dayShifts.length > 2 && (
                      <div className="text-[8px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                        +{dayShifts.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Date Summary Drawer below Month Grid */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Selected Day: {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {focusedDayShifts.length} shift(s)
              </span>
            </div>

            {/* Approved / Pending Leave notice in Month summary */}
            {getApprovedTimeOffForDate(selectedDateStr) && (
              <div className="p-2.5 mb-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <Palmtree className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Approved Leave: {getApprovedTimeOffForDate(selectedDateStr)?.reason}</span>
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-200 dark:bg-emerald-900 px-1.5 py-0.5 rounded text-emerald-900 dark:text-emerald-100">
                  Off Duty
                </span>
              </div>
            )}

            {!getApprovedTimeOffForDate(selectedDateStr) && getPendingTimeOffForDate(selectedDateStr) && (
              <div className="p-2.5 mb-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 border-dashed text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pending Leave: {getPendingTimeOffForDate(selectedDateStr)?.reason}</span>
                </span>
                <span className="text-[10px] font-mono font-bold bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-100">
                  Pending Ops Approval
                </span>
              </div>
            )}

            <div className="space-y-2">
              {focusedDayShifts.map((shift) => (
                <div
                  key={shift.id}
                  onClick={() => setSelectedShiftForDetail(shift)}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between cursor-pointer hover:border-blue-400"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{shift.siteName}</span>
                      {shift.isRovingShift && <Car className="w-3 h-3 text-cyan-500" />}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {shift.startTime} - {shift.endTime} • {shift.postRole}
                    </div>
                  </div>
                  {renderStatusBadge(shift.status)}
                </div>
              ))}
              {focusedDayShifts.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  No shifts scheduled for this date.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Agenda / Timeline View */}
      {viewMode === 'agenda' && (
        <div className="space-y-3">
          {/* Search and Status Filters */}
          <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search site, post, address..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-semibold focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled Only</option>
              <option value="active_or_today">Today / Active</option>
              <option value="completed">Past / Completed</option>
            </select>
          </div>

          {/* Grouped Agenda Items */}
          <div className="space-y-3">
            {groupedAgenda.map((group) => {
              const isToday = group.dateStr === todayStr;
              const formattedDate = new Date(group.dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              });

              return (
                <div key={group.dateStr} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className={`text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                      isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      <span>{formattedDate}</span>
                      {isToday && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-bold">
                          TODAY
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {group.shifts.reduce((sum, s) => sum + s.hours, 0)} hrs
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.shifts.map((shift) => (
                      <div
                        key={shift.id}
                        onClick={() => setSelectedShiftForDetail(shift)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 shadow-xs flex flex-col justify-between gap-2 ${
                          shift.status === 'on_duty'
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-[#1e3a8a] dark:text-blue-400 shrink-0" />
                              <span>{shift.siteName}</span>
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{shift.siteAddress || 'Facility Main Gate'}</span>
                            </p>
                          </div>
                          {renderStatusBadge(shift.status)}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300 font-bold">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span>{shift.startTime} – {shift.endTime}</span>
                            <span className="text-slate-400">({shift.hours}h)</span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            {shift.postRole}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {groupedAgenda.length === 0 && (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <CalendarIcon className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Upcoming Shifts Match Criteria</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Try clearing search queries or switching to All Statuses filter.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shift Details Modal */}
      {selectedShiftForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 my-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-[#1e3a8a] dark:text-blue-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedShiftForDetail.siteName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Shift ID: #{selectedShiftForDetail.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedShiftForDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shift Info Grid */}
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Duty Status</span>
                  {renderStatusBadge(selectedShiftForDetail.status)}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Date</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {new Date(selectedShiftForDetail.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Working Hours</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {selectedShiftForDetail.startTime} – {selectedShiftForDetail.endTime} ({selectedShiftForDetail.hours} hrs)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Post Assignment</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">
                    {selectedShiftForDetail.postRole}
                  </span>
                </div>

                {selectedShiftForDetail.siteAddress && (
                  <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Facility Address</span>
                    <span className="text-right text-slate-800 dark:text-slate-200 font-medium max-w-[200px]">
                      {selectedShiftForDetail.siteAddress}
                    </span>
                  </div>
                )}
              </div>

              {/* Instructions & Standing Orders */}
              {selectedShiftForDetail.postInstructions && (
                <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-300 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Post Orders & Special Instructions</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {selectedShiftForDetail.postInstructions}
                  </p>
                </div>
              )}

              {/* Roving circuit specifics */}
              {selectedShiftForDetail.isRovingShift && (
                <div className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-900 dark:text-cyan-200 space-y-1">
                  <div className="text-[11px] font-bold uppercase flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Roving Patrol Circuit</span>
                  </div>
                  <p className="text-xs">
                    Assigned to Rover Unit ({selectedShiftForDetail.rovingGroup || 'Alpha Group'}). Follow mobile telemetry and complete digital checkpoints.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons in Modal */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {selectedShiftForDetail.date === todayStr && selectedShiftForDetail.status === 'scheduled' && onNavigateToDuty && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedShiftForDetail(null);
                    onNavigateToDuty();
                  }}
                  className="w-full sm:flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/30 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Clock In at Duty Terminal</span>
                </button>
              )}

              {selectedShiftForDetail.status === 'scheduled' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPostTradeModalOpen(true);
                    }}
                    className="w-full sm:flex-1 py-2 rounded-xl bg-[#1e3a8a] dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Offer Shift for Trade</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTimeOffInitialStart(selectedShiftForDetail.date);
                      setTimeOffInitialEnd(selectedShiftForDetail.date);
                      setTimeOffModalTab('request_form');
                      setIsTimeOffModalOpen(true);
                      setSelectedShiftForDetail(null);
                    }}
                    className="w-full sm:flex-1 py-2 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Palmtree className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Request Leave for Date</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setSelectedShiftForDetail(null)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time-Off Request Modal */}
      {isTimeOffModalOpen && (
        <GuardTimeOffModal
          isOpen={isTimeOffModalOpen}
          onClose={() => setIsTimeOffModalOpen(false)}
          initialStartDate={timeOffInitialStart}
          initialEndDate={timeOffInitialEnd}
          initialTab={timeOffModalTab}
        />
      )}

      {/* Trade Posting Modal */}
      {isPostTradeModalOpen && (
        <PostShiftModal 
          isOpen={isPostTradeModalOpen} 
          onClose={() => {
            setIsPostTradeModalOpen(false);
            setSelectedShiftForDetail(null);
          }} 
        />
      )}
    </div>
  );
};
