import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  FileText, 
  UserCheck, 
  Info,
  CalendarCheck,
  Zap,
  Lock,
  Unlock
} from 'lucide-react';
import { GuardProfile, GuardPerformanceStats, ScheduledShift, Shift } from '../../types/shift';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  validateCoachingScheduleSlot, 
  getRecommendedCoachingSlots,
  formatCoachingDateTime 
} from '../../utils/coachingSchedule';

interface CoachingSchedulingCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  guard: GuardProfile | null;
  guardStats?: GuardPerformanceStats | null;
  initialTopic?: string;
}

const COACHING_TOPICS = [
  'Geofence Post Integrity & SLA Checkpoints',
  'Punctuality, Shift Arrival & Attendance Remediation',
  'DAR Report Quality & Mandatory SLA Photos',
  'Client Experience & De-escalation Standards',
  'Incident Reporting & Evidence Documentation',
  'Roving Route Interval & Checkpoint Compliance',
  'Custom Focus Topic...'
];

export const CoachingSchedulingCalendarModal: React.FC<CoachingSchedulingCalendarModalProps> = ({
  isOpen,
  onClose,
  guard,
  guardStats,
  initialTopic = 'Geofence Post Integrity & SLA Checkpoints'
}) => {
  const { scheduledShifts, shifts, scheduleGuardCoaching } = useShiftOps();

  // Selected date defaults to tomorrow
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic);
  const [customTopic, setCustomTopic] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [overrideRestrictions, setOverrideRestrictions] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Calendar month view navigation state
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const guardId = guard?.id || '';

  const topicToSave = selectedTopic === 'Custom Focus Topic...' ? (customTopic.trim() || 'General Remediation') : selectedTopic;

  // Real-time schedule conflict & rest buffer validation
  const validation = useMemo(() => {
    if (!guard) {
      return {
        isValid: true,
        hasConflict: false,
        hasShiftOverlap: false,
        hasBufferViolation: false,
        conflictDescription: undefined,
        conflictingShifts: [],
        minBufferObserved: 24
      };
    }
    return validateCoachingScheduleSlot(
      guard.id,
      selectedDate,
      selectedTime,
      durationMinutes,
      scheduledShifts,
      shifts,
      8
    );
  }, [selectedDate, selectedTime, durationMinutes, guard, scheduledShifts, shifts]);

  // Recommended clear slots for the selected date
  const recommendedSlots = useMemo(() => {
    if (!guard) return [];
    return getRecommendedCoachingSlots(
      guard.id,
      selectedDate,
      scheduledShifts,
      shifts
    );
  }, [selectedDate, guard, scheduledShifts, shifts]);

  // Guard's scheduled shifts on the selected date & neighboring dates
  const nearbyShifts = useMemo(() => {
    if (!guard) return [];
    const targetDateObj = new Date(selectedDate + 'T12:00:00');
    const dayBefore = new Date(targetDateObj.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dayAfter = new Date(targetDateObj.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const targetDates = [dayBefore, selectedDate, dayAfter];

    return scheduledShifts.filter(
      (s) => s.guardId === guard.id && targetDates.includes(s.date) && s.status !== 'cancelled'
    );
  }, [scheduledShifts, guard, selectedDate]);

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean; hasShift: boolean }[] = [];

    // Today's date string
    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      const hasShift = guard ? scheduledShifts.some((s) => s.guardId === guard.id && s.date === dateStr && s.status !== 'cancelled') : false;
      days.push({ dateStr, dayNum, isCurrentMonth: false, isToday: dateStr === todayStr, hasShift });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      // Format as YYYY-MM-DD in local time
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasShift = guard ? scheduledShifts.some((s) => s.guardId === guard.id && s.date === dateStr && s.status !== 'cancelled') : false;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true, isToday: dateStr === todayStr, hasShift });
    }

    // Next month padding to fill 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = nextDate.toISOString().split('T')[0];
      const hasShift = guard ? scheduledShifts.some((s) => s.guardId === guard.id && s.date === dateStr && s.status !== 'cancelled') : false;
      days.push({ dateStr, dayNum: i, isCurrentMonth: false, isToday: dateStr === todayStr, hasShift });
    }

    return days;
  }, [currentMonthDate, scheduledShifts, guard]);

  if (!isOpen || !guard) return null;

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleQuickDate = (offsetDays: number) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const dateStr = target.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setCurrentMonthDate(new Date(target.getFullYear(), target.getMonth(), 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validation.hasConflict && !overrideRestrictions) {
      return;
    }

    scheduleGuardCoaching({
      guardId: guard.id,
      topic: topicToSave,
      scheduledDate: selectedDate,
      scheduledTime: selectedTime,
      durationMinutes,
      notes: notes.trim(),
      overrideRestrictions,
      overrideReason: overrideRestrictions ? (overrideReason.trim() || 'Supervisor Administrative Override') : undefined,
      hasShiftConflict: validation.hasShiftOverlap,
      hasRestBufferConflict: validation.hasBufferViolation,
      conflictDetails: validation.conflictDescription
    });

    onClose();
  };

  const isFormBlocked = validation.hasConflict && !overrideRestrictions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100"
        id="coaching-schedule-calendar-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Schedule 1-on-1 Performance Coaching
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Buffer Enforced (8h)
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Officer: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{guard.name}</span> ({guard.badgeNumber}) • 
                Oculus Score: <span className="font-bold text-amber-600 dark:text-amber-400">{guardStats?.oculusScore?.toFixed(1) || 'N/A'} / 100</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Coaching Topic Selection */}
          <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
              1. Remediation Focus & Coaching Topic
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COACHING_TOPICS.map((topic) => (
                <button
                  type="button"
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`text-left px-3 py-2 text-xs rounded-lg font-medium transition-all flex items-center justify-between border ${
                    selectedTopic === topic
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-amber-400'
                  }`}
                >
                  <span className="truncate">{topic}</span>
                  {selectedTopic === topic && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1.5" />}
                </button>
              ))}
            </div>
            {selectedTopic === 'Custom Focus Topic...' && (
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Enter custom coaching directive or performance remediation area..."
                className="mt-2 w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            )}
          </div>

          {/* Calendar & Time Selection Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Interactive Calendar (7 Cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-amber-500" />
                  <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    {currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h4>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => handleQuickDate(1)}
                  className="px-2 py-1 text-[11px] font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(2)}
                  className="px-2 py-1 text-[11px] font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  +2 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(3)}
                  className="px-2 py-1 text-[11px] font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(7)}
                  className="px-2 py-1 text-[11px] font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  Next Week
                </button>
              </div>

              {/* Day Labels Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Calendar Days Matrix */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((d, idx) => {
                  const isSelected = d.dateStr === selectedDate;
                  const isPast = new Date(d.dateStr + 'T23:59:59') < new Date();

                  return (
                    <button
                      type="button"
                      key={`${d.dateStr}-${idx}`}
                      onClick={() => setSelectedDate(d.dateStr)}
                      className={`relative h-11 rounded-lg text-xs font-medium flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-white font-bold shadow-xs'
                          : d.isCurrentMonth
                          ? 'bg-neutral-50 dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200 hover:bg-amber-50 dark:hover:bg-neutral-700/60 border border-neutral-200/60 dark:border-neutral-700/40'
                          : 'bg-transparent text-neutral-300 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800/30'
                      } ${d.isToday ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-neutral-900' : ''}`}
                    >
                      <span>{d.dayNum}</span>
                      
                      {/* Shift Duty Indicator */}
                      {d.hasShift && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} title="Guard Scheduled for Duty on this Day" />
                          <span className={`text-[8px] font-semibold ${isSelected ? 'text-amber-100' : 'text-blue-600 dark:text-blue-400'}`}>Shift</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Guard On Duty</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full ring-2 ring-amber-400" />
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2 rounded-sm bg-amber-500" />
                  <span>Selected Date</span>
                </div>
              </div>
            </div>

            {/* Right: Time, Duration & Slot Recommendation (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Selected Date Summary & Time Input */}
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    2. Select Time & Duration
                  </label>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
                      Start Time
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 absolute left-2.5 top-2.5 text-neutral-400" />
                      <input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
                      Duration
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 outline-hidden"
                    >
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes (Standard)</option>
                      <option value={60}>60 Minutes (Deep Dive)</option>
                      <option value={90}>90 Minutes (Remediation)</option>
                    </select>
                  </div>
                </div>

                {/* Recommended Conflict-Free Slots */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                      Recommended Clear Slots ({selectedDate}):
                    </span>
                  </div>

                  {recommendedSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {recommendedSlots.slice(0, 4).map((slot) => (
                        <button
                          type="button"
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold flex items-center justify-between border transition-all ${
                            selectedTime === slot.time
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-emerald-400'
                          }`}
                        >
                          <span>{slot.label}</span>
                          <span className={`text-[10px] ${slot.isClear ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {slot.isClear ? 'Clear' : 'Conflict'}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-[11px] text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                      High shift density on this date. Choose another day or apply manual Command override below.
                    </div>
                  )}
                </div>
              </div>

              {/* Live Conflict & Rest Buffer Status Box */}
              <div className={`p-4 rounded-xl border transition-all ${
                !validation.hasConflict
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
                  : validation.hasShiftOverlap
                  ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-300'
                  : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300'
              }`}>
                <div className="flex items-start gap-2.5">
                  {!validation.hasConflict ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : validation.hasShiftOverlap ? (
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase tracking-wider">
                        {!validation.hasConflict
                          ? 'Schedule Clear • 8-Hour Rest Enforced'
                          : validation.hasShiftOverlap
                          ? 'Direct Shift Conflict'
                          : 'Insufficient Rest Buffer (< 8h)'}
                      </h5>
                      <span className="text-[10px] font-mono font-bold">
                        {validation.minBufferObserved !== undefined ? `${validation.minBufferObserved.toFixed(1)}h Buffer` : ''}
                      </span>
                    </div>

                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {validation.conflictDescription || 'Session slot satisfies all shift separation and 8-hour rest policies.'}
                    </p>

                    {nearbyShifts.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-current/10 space-y-1">
                        <span className="text-[10px] font-bold block uppercase tracking-wider opacity-75">
                          Officer Duty Assignments in Window:
                        </span>
                        {nearbyShifts.map((s) => (
                          <div key={s.id} className="text-[11px] font-mono flex items-center justify-between">
                            <span>{s.date} ({s.startTime} - {s.endTime})</span>
                            <span className="truncate max-w-[140px] opacity-80">{s.siteName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Supervisor Override Controls */}
          {(validation.hasConflict || overrideRestrictions) && (
            <div className={`p-4 rounded-xl border transition-all ${
              overrideRestrictions 
                ? 'bg-amber-500/10 border-amber-500/30' 
                : 'bg-neutral-100 dark:bg-neutral-800/60 border-neutral-300 dark:border-neutral-700'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5">
                    {overrideRestrictions ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <label 
                      htmlFor="override-toggle" 
                      className="text-xs font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer flex items-center gap-2"
                    >
                      <span>Override Schedule Conflict & 8-Hour Rest Buffer Policy</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-semibold">
                        Command Authority
                      </span>
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Check to authorize scheduling this coaching session despite active shift proximity or buffer constraints.
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  id="override-toggle"
                  checked={overrideRestrictions}
                  onChange={(e) => setOverrideRestrictions(e.target.checked)}
                  className="w-5 h-5 rounded-md text-amber-600 focus:ring-amber-500 border-neutral-300 dark:border-neutral-600 cursor-pointer"
                />
              </div>

              {overrideRestrictions && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                  <label className="block text-[11px] font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    Command Override Justification / Authorization Note (Required):
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Approved 15m pre-shift briefing with Commander O'Connor..."
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-amber-300 dark:border-amber-700/60 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>
              )}
            </div>
          )}

          {/* Supervisor Notes & Directives */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              3. Supervisor Instructions & Remediation Directive
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail specific performance areas to cover (e.g. Geofence breach timeline, SLA checkpoint logging, photo verification procedures)..."
              className="w-full p-3 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          {/* Warning Banner if blocked */}
          {isFormBlocked && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>
                <strong>Scheduling Blocked:</strong> The selected time violates the guard's 8-hour rest buffer or scheduled shift. Either pick a recommended clear time slot above or check the Command Override box to bypass.
              </span>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isFormBlocked}
              className={`px-6 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all ${
                isFormBlocked
                  ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 active:scale-98 text-white shadow-amber-500/20'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Dispatch Coaching Session to Guard Terminal</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
