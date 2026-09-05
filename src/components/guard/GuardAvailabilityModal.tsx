import React, { useState, useMemo, useEffect } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  GuardWeeklyAvailability, 
  DailyAvailabilityRule, 
  DayOfWeek, 
  AvailabilityChangeRequest 
} from '../../types/shift';
import {
  Calendar,
  Clock,
  CheckCircle2,
  X,
  AlertTriangle,
  Send,
  Shield,
  FileText,
  Info,
  Clock3,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Check,
  Ban,
  UserCheck
} from 'lucide-react';

interface GuardAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'manage_proposal' | 'request_history' | 'current_schedule';
}

const DAY_DEFINITIONS: { day: DayOfWeek; name: string; short: string }[] = [
  { day: 0, name: 'Sunday', short: 'Sun' },
  { day: 1, name: 'Monday', short: 'Mon' },
  { day: 2, name: 'Tuesday', short: 'Tue' },
  { day: 3, name: 'Wednesday', short: 'Wed' },
  { day: 4, name: 'Thursday', short: 'Thu' },
  { day: 5, name: 'Friday', short: 'Fri' },
  { day: 6, name: 'Saturday', short: 'Sat' }
];

const SHIFT_PRESETS = [
  { id: 'any', label: 'Any Shift', icon: Clock, desc: 'Available for any 24h operational shift', start: '00:00', end: '23:59' },
  { id: 'morning', label: 'Morning', icon: Sun, desc: 'Day post (06:00 - 14:00)', start: '06:00', end: '14:00' },
  { id: 'swing', label: 'Swing', icon: Sunset, desc: 'Evening post (14:00 - 22:00)', start: '14:00', end: '22:00' },
  { id: 'grave', label: 'Graveyard', icon: Moon, desc: 'Night post (22:00 - 06:00)', start: '22:00', end: '06:00' },
  { id: 'custom', label: 'Custom Hours', icon: Clock3, desc: 'Specify specific daily start & end times', start: '08:00', end: '17:00' }
];

export const GuardAvailabilityModal: React.FC<GuardAvailabilityModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'manage_proposal'
}) => {
  const { 
    activeGuard, 
    availabilityChangeRequests, 
    submitAvailabilityChangeRequest, 
    cancelAvailabilityChangeRequest 
  } = useShiftOps();

  const [activeTab, setActiveTab] = useState<'manage_proposal' | 'request_history' | 'current_schedule'>(initialTab);

  // Compute next Monday as sensible default effective date
  const defaultEffectiveDate = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (7 - day + 1) % 7 || 7; // days until next Monday
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  }, []);

  // Guard's own requests
  const guardRequests = useMemo(() => {
    return availabilityChangeRequests.filter((r) => r.guardId === activeGuard.id);
  }, [availabilityChangeRequests, activeGuard.id]);

  const pendingRequest = useMemo(() => {
    return guardRequests.find((r) => r.status === 'pending');
  }, [guardRequests]);

  // Current live availability baseline
  const baselineRules = useMemo(() => {
    const currentRules = activeGuard.availability?.weeklyRules || activeGuard.availability?.rules || [];
    return DAY_DEFINITIONS.map(({ day, name }) => {
      const match = currentRules.find((r) => r.dayOfWeek === day);
      if (match) {
        return {
          dayOfWeek: day,
          dayLabel: name,
          isAvailable: match.isAvailable ?? (match.status !== 'unavailable'),
          status: match.status || (match.isAvailable ? 'available' : 'unavailable'),
          preferredShift: match.preferredShift || 'any',
          startTime: match.startTime || '00:00',
          endTime: match.endTime || '23:59',
          preferredShiftTypes: match.preferredShiftTypes || []
        } as DailyAvailabilityRule;
      }
      // default: Mon-Fri available
      const isWeekday = day >= 1 && day <= 5;
      return {
        dayOfWeek: day,
        dayLabel: name,
        isAvailable: isWeekday,
        status: isWeekday ? 'available' : 'unavailable',
        preferredShift: 'any',
        startTime: '00:00',
        endTime: '23:59'
      } as DailyAvailabilityRule;
    });
  }, [activeGuard.availability]);

  // Form State for proposed changes
  const [proposedRules, setProposedRules] = useState<DailyAvailabilityRule[]>(baselineRules);
  const [maxWeeklyHours, setMaxWeeklyHours] = useState<number>(activeGuard.availability?.maxWeeklyHours || 40);
  const [overtimeWilling, setOvertimeWilling] = useState<boolean>(activeGuard.availability?.overtimeWilling ?? true);
  const [preferredServiceTypes, setPreferredServiceTypes] = useState<('dedicated' | 'roving')[]>(
    activeGuard.availability?.preferredServiceTypes || ['dedicated', 'roving']
  );
  const [effectiveDate, setEffectiveDate] = useState<string>(defaultEffectiveDate);
  const [reasonForChange, setReasonForChange] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync state whenever activeGuard changes
  useEffect(() => {
    setProposedRules(baselineRules);
    setMaxWeeklyHours(activeGuard.availability?.maxWeeklyHours || 40);
    setOvertimeWilling(activeGuard.availability?.overtimeWilling ?? true);
    setPreferredServiceTypes(activeGuard.availability?.preferredServiceTypes || ['dedicated', 'roving']);
  }, [baselineRules, activeGuard.availability]);

  // Update a single day rule
  const handleUpdateDayRule = (dayOfWeek: DayOfWeek, updates: Partial<DailyAvailabilityRule>) => {
    setProposedRules((prev) =>
      prev.map((r) => {
        if (r.dayOfWeek !== dayOfWeek) return r;
        const updated = { ...r, ...updates };
        if (updates.status) {
          updated.isAvailable = updates.status !== 'unavailable';
        }
        return updated;
      })
    );
  };

  // Quick preset template applicators
  const applyTemplate = (type: 'standard_ft' | 'morning_pref' | 'swing_pref' | 'weekend_warrior') => {
    setProposedRules((prev) =>
      prev.map((r) => {
        const isWeekday = r.dayOfWeek >= 1 && r.dayOfWeek <= 5;
        const isWeekend = r.dayOfWeek === 0 || r.dayOfWeek === 6;

        if (type === 'standard_ft') {
          return {
            ...r,
            isAvailable: isWeekday,
            status: isWeekday ? 'available' : 'unavailable',
            preferredShift: 'any',
            startTime: '00:00',
            endTime: '23:59'
          };
        }
        if (type === 'morning_pref') {
          return {
            ...r,
            isAvailable: isWeekday,
            status: isWeekday ? 'preferred' : 'unavailable',
            preferredShift: 'morning',
            startTime: '06:00',
            endTime: '14:00'
          };
        }
        if (type === 'swing_pref') {
          return {
            ...r,
            isAvailable: isWeekday,
            status: isWeekday ? 'preferred' : 'unavailable',
            preferredShift: 'swing',
            startTime: '14:00',
            endTime: '22:00'
          };
        }
        if (type === 'weekend_warrior') {
          return {
            ...r,
            isAvailable: isWeekend,
            status: isWeekend ? 'available' : 'unavailable',
            preferredShift: 'any',
            startTime: '00:00',
            endTime: '23:59'
          };
        }
        return r;
      })
    );
  };

  // Calculate differences between baseline and proposed
  const differences = useMemo(() => {
    const dayDiffs: { dayName: string; from: string; to: string }[] = [];
    proposedRules.forEach((p) => {
      const b = baselineRules.find((r) => r.dayOfWeek === p.dayOfWeek);
      if (!b) return;

      const baselineDesc = !b.isAvailable 
        ? 'Off-Duty (Unavailable)' 
        : `${b.status === 'preferred' ? 'Preferred' : 'Available'} (${b.preferredShift || 'any'})`;

      const proposedDesc = !p.isAvailable 
        ? 'Off-Duty (Unavailable)' 
        : `${p.status === 'preferred' ? 'Preferred' : 'Available'} (${p.preferredShift || 'any'})`;

      if (baselineDesc !== proposedDesc) {
        dayDiffs.push({
          dayName: p.dayLabel || DAY_DEFINITIONS[p.dayOfWeek].name,
          from: baselineDesc,
          to: proposedDesc
        });
      }
    });

    const hoursChanged = maxWeeklyHours !== (activeGuard.availability?.maxWeeklyHours || 40);
    const otChanged = overtimeWilling !== (activeGuard.availability?.overtimeWilling ?? true);

    return {
      dayDiffs,
      hoursChanged,
      otChanged,
      totalChanges: dayDiffs.length + (hoursChanged ? 1 : 0) + (otChanged ? 1 : 0)
    };
  }, [proposedRules, baselineRules, maxWeeklyHours, overtimeWilling, activeGuard.availability]);

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonForChange.trim()) {
      return;
    }

    setIsSubmitting(true);

    const proposedAvailability: GuardWeeklyAvailability = {
      guardId: activeGuard.id,
      weeklyRules: proposedRules,
      maxWeeklyHours,
      overtimeWilling,
      preferredServiceTypes,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    const previousAvailability: GuardWeeklyAvailability = {
      guardId: activeGuard.id,
      weeklyRules: baselineRules,
      maxWeeklyHours: activeGuard.availability?.maxWeeklyHours || 40,
      overtimeWilling: activeGuard.availability?.overtimeWilling ?? true,
      preferredServiceTypes: activeGuard.availability?.preferredServiceTypes || ['dedicated', 'roving'],
      notes: activeGuard.availability?.notes
    };

    submitAvailabilityChangeRequest({
      guardId: activeGuard.id,
      guardName: activeGuard.name,
      guardBadge: activeGuard.badgeNumber,
      guardPhone: activeGuard.phone,
      proposedAvailability,
      previousAvailability,
      reasonForChange: reasonForChange.trim(),
      effectiveDate,
      notes: notes.trim() || undefined
    });

    setIsSubmitting(false);
    setActiveTab('request_history');
  };

  if (!isOpen) return null;

  return (
    <div 
      id="guard-availability-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div 
        id="guard-availability-modal-card"
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-blue-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-200">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Manage Weekly Availability
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[10px] font-mono font-bold">
                  {activeGuard.badgeNumber}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Propose recurring weekly hours, shifts, and post preferences for supervisor approval.
              </p>
            </div>
          </div>

          <button
            id="guard-availability-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Supervisor Approval Required Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-semibold">
              Supervisor Approval Required: Proposed changes do not take effect until approved by an Operations Supervisor.
            </span>
          </div>
          {pendingRequest && (
            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full whitespace-nowrap animate-pulse">
              1 Request Pending Review
            </span>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 pt-2 gap-2 shrink-0">
          <button
            id="guard-avail-tab-propose"
            type="button"
            onClick={() => setActiveTab('manage_proposal')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'manage_proposal'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Propose Changes</span>
          </button>

          <button
            id="guard-avail-tab-history"
            type="button"
            onClick={() => setActiveTab('request_history')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'request_history'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>My Requests & History</span>
            {guardRequests.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                pendingRequest 
                  ? 'bg-amber-400 text-slate-950' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {guardRequests.length}
              </span>
            )}
          </button>

          <button
            id="guard-avail-tab-current"
            type="button"
            onClick={() => setActiveTab('current_schedule')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'current_schedule'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Approved Baseline</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* 1. PROPOSE CHANGES TAB */}
          {activeTab === 'manage_proposal' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Existing Pending Request Warning */}
              {pendingRequest && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-950 dark:text-amber-200">
                        You have an active request pending review
                      </span>
                      <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                        Submitted on {new Date(pendingRequest.requestedAt).toLocaleDateString()} for effective date {pendingRequest.effectiveDate}. Reason: "{pendingRequest.reasonForChange}".
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('request_history')}
                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-200 rounded-lg font-bold text-[11px] shrink-0 cursor-pointer"
                  >
                    View Status
                  </button>
                </div>
              )}

              {/* Quick Preset Buttons */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Quick Schedule Presets:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyTemplate('standard_ft')}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-lg text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Mon-Fri Any
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('morning_pref')}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-lg text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Morning (06-14)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('swing_pref')}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-purple-500 rounded-lg text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Swing (14-22)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('weekend_warrior')}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-lg text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Weekend Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setProposedRules(baselineRules)}
                    className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    title="Reset to current baseline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Day-by-Day Interactive Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Weekly Days & Shift Windows
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Click day status or shift type to customize
                  </span>
                </div>

                <div className="space-y-2">
                  {proposedRules.map((rule) => {
                    const isAvailable = rule.isAvailable && rule.status !== 'unavailable';
                    const isPreferred = rule.status === 'preferred';
                    const dayDef = DAY_DEFINITIONS.find((d) => d.day === rule.dayOfWeek) || DAY_DEFINITIONS[0];

                    return (
                      <div
                        key={rule.dayOfWeek}
                        className={`p-3 rounded-xl border transition-all ${
                          !isAvailable
                            ? 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-75'
                            : isPreferred
                            ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-300/80 dark:border-purple-800/60 shadow-xs'
                            : 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          {/* Day Label & Quick Status Pill */}
                          <div className="flex items-center gap-2.5 min-w-[140px]">
                            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                              {dayDef.short}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                {dayDef.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {!isAvailable ? 'Off-Duty' : isPreferred ? 'Preferred Hours' : 'Open Availability'}
                              </div>
                            </div>
                          </div>

                          {/* Availability Status Selector */}
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleUpdateDayRule(rule.dayOfWeek, { status: 'available', isAvailable: true })}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                isAvailable && !isPreferred
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              Available
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateDayRule(rule.dayOfWeek, { status: 'preferred', isAvailable: true })}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                isPreferred
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400'
                              }`}
                            >
                              <Sparkles className="w-3 h-3" />
                              Preferred
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateDayRule(rule.dayOfWeek, { status: 'unavailable', isAvailable: false })}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                !isAvailable
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                              }`}
                            >
                              <Ban className="w-3 h-3" />
                              Off
                            </button>
                          </div>

                          {/* Shift Window Preset / Custom selector */}
                          {isAvailable ? (
                            <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
                              <select
                                value={rule.preferredShift || 'any'}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  const preset = SHIFT_PRESETS.find((p) => p.id === val);
                                  handleUpdateDayRule(rule.dayOfWeek, {
                                    preferredShift: val,
                                    startTime: preset ? preset.start : rule.startTime,
                                    endTime: preset ? preset.end : rule.endTime
                                  });
                                }}
                                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-lg px-2.5 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                              >
                                {SHIFT_PRESETS.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.label} {p.id !== 'any' && p.id !== 'custom' ? `(${p.start}-${p.end})` : ''}
                                  </option>
                                ))}
                              </select>

                              {rule.preferredShift === 'custom' && (
                                <div className="flex items-center gap-1 text-xs">
                                  <input
                                    type="time"
                                    value={rule.startTime || '08:00'}
                                    onChange={(e) => handleUpdateDayRule(rule.dayOfWeek, { startTime: e.target.value })}
                                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-100 font-mono"
                                  />
                                  <span className="text-slate-400">to</span>
                                  <input
                                    type="time"
                                    value={rule.endTime || '17:00'}
                                    onChange={(e) => handleUpdateDayRule(rule.dayOfWeek, { endTime: e.target.value })}
                                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-100 font-mono"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">
                              Not available for dispatch scheduling
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hours & Overtime Preferences */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Max Weekly Hours
                  </label>
                  <select
                    value={maxWeeklyHours}
                    onChange={(e) => setMaxWeeklyHours(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    <option value={20}>20 Hours (Part-time)</option>
                    <option value={30}>30 Hours</option>
                    <option value={32}>32 Hours (4-day x 8h)</option>
                    <option value={40}>40 Hours (Standard Full-Time)</option>
                    <option value={48}>48 Hours (Extended)</option>
                    <option value={60}>60 Hours (Max Overtime)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Overtime Willingness
                  </label>
                  <button
                    type="button"
                    onClick={() => setOvertimeWilling(!overtimeWilling)}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      overtimeWilling
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {overtimeWilling ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Ban className="w-3.5 h-3.5" />}
                    <span>{overtimeWilling ? 'Willing to work OT' : 'No Overtime'}</span>
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Requested Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                  />
                </div>
              </div>

              {/* Service Type Preference */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Deployment Preference
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (preferredServiceTypes.includes('dedicated')) {
                        if (preferredServiceTypes.length > 1) {
                          setPreferredServiceTypes(preferredServiceTypes.filter((t) => t !== 'dedicated'));
                        }
                      } else {
                        setPreferredServiceTypes([...preferredServiceTypes, 'dedicated']);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                      preferredServiceTypes.includes('dedicated')
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-800 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <span>Dedicated Standing Site Post</span>
                    {preferredServiceTypes.includes('dedicated') && <Check className="w-4 h-4 text-blue-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (preferredServiceTypes.includes('roving')) {
                        if (preferredServiceTypes.length > 1) {
                          setPreferredServiceTypes(preferredServiceTypes.filter((t) => t !== 'roving'));
                        }
                      } else {
                        setPreferredServiceTypes([...preferredServiceTypes, 'roving']);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                      preferredServiceTypes.includes('roving')
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-800 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <span>Mobile Roving Patrol</span>
                    {preferredServiceTypes.includes('roving') && <Check className="w-4 h-4 text-blue-500" />}
                  </button>
                </div>
              </div>

              {/* Reason for Request (Required) */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Reason for Availability Change <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reasonForChange}
                  onChange={(e) => setReasonForChange(e.target.value)}
                  placeholder="e.g., Enrolled in university night classes; Family childcare commitment; Second job schedule shift..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-slate-100"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Supervisors consider your explanation during roster re-allocation.
                </p>
              </div>

              {/* Additional Notes (Optional) */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Additional Notes for Operations (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any details on transit flexibility, site proximity, or temporary adjustments..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Summary of Changes */}
              {differences.totalChanges > 0 && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Summary of Proposed Modifications ({differences.totalChanges}):</span>
                  </div>
                  <ul className="text-xs text-blue-900/80 dark:text-blue-300/80 space-y-1 pl-5 list-disc">
                    {differences.dayDiffs.map((d, i) => (
                      <li key={i}>
                        <span className="font-semibold">{d.dayName}:</span> {d.from} <ArrowRight className="inline w-3 h-3 mx-0.5" /> <span className="font-bold text-blue-950 dark:text-white">{d.to}</span>
                      </li>
                    ))}
                    {differences.hoursChanged && (
                      <li>
                        Target Max Weekly Hours: {activeGuard.availability?.maxWeeklyHours || 40}h <ArrowRight className="inline w-3 h-3 mx-0.5" /> <span className="font-bold text-blue-950 dark:text-white">{maxWeeklyHours}h</span>
                      </li>
                    )}
                    {differences.otChanged && (
                      <li>
                        Overtime: {activeGuard.availability?.overtimeWilling ? 'Willing' : 'None'} <ArrowRight className="inline w-3 h-3 mx-0.5" /> <span className="font-bold text-blue-950 dark:text-white">{overtimeWilling ? 'Willing' : 'None'}</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Form Action Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  id="guard-submit-availability-proposal-btn"
                  type="submit"
                  disabled={isSubmitting || !reasonForChange.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md shadow-blue-900/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit for Supervisor Approval</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. MY REQUESTS & HISTORY TAB */}
          {activeTab === 'request_history' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('all')}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      historyFilter === 'all'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    All ({guardRequests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('pending')}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      historyFilter === 'pending'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Pending ({guardRequests.filter((r) => r.status === 'pending').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('approved')}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      historyFilter === 'approved'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Approved ({guardRequests.filter((r) => r.status === 'approved').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('denied')}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      historyFilter === 'denied'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Denied ({guardRequests.filter((r) => r.status === 'denied').length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('manage_proposal')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>New Request</span>
                </button>
              </div>

              {guardRequests.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                  <Clock className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    No Availability Requests Submitted Yet
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-3">
                    Need to change your regular weekly days or hours? Submit a proposal for supervisor approval.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manage_proposal')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Propose Availability Change
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {guardRequests
                    .filter((r) => historyFilter === 'all' || r.status === historyFilter)
                    .map((req) => {
                      const isExpanded = expandedRequestId === req.id;
                      const statusBadges = {
                        pending: {
                          label: 'Pending Review',
                          color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700',
                          icon: Clock
                        },
                        approved: {
                          label: 'Approved & Applied',
                          color: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
                          icon: CheckCircle2
                        },
                        denied: {
                          label: 'Denied',
                          color: 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-700',
                          icon: Ban
                        },
                        cancelled: {
                          label: 'Cancelled',
                          color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
                          icon: X
                        }
                      };

                      const currentBadge = statusBadges[req.status] || statusBadges.pending;
                      const BadgeIcon = currentBadge.icon;

                      return (
                        <div
                          key={req.id}
                          className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 ${currentBadge.color}`}>
                                <BadgeIcon className="w-3.5 h-3.5" />
                                {currentBadge.label}
                              </span>
                              <span className="text-xs text-slate-500 font-mono">
                                {req.id}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <span>Submitted: {new Date(req.requestedAt).toLocaleDateString()}</span>
                              {req.effectiveDate && (
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                  Effective: {req.effectiveDate}
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Stated Reason:
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 italic">
                              "{req.reasonForChange}"
                            </p>
                          </div>

                          {/* Supervisor Resolution Callout */}
                          {req.reviewedAt && (
                            <div className={`p-3 rounded-xl border text-xs ${
                              req.status === 'approved' 
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                            }`}>
                              <div className="flex items-center justify-between gap-2 font-bold mb-0.5">
                                <span>Supervisor Decision: {req.status.toUpperCase()}</span>
                                <span className="text-[10px] font-mono opacity-80">
                                  {new Date(req.reviewedAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="opacity-90">
                                Note from {req.reviewedByAdminName || 'Operations'}: "{req.resolutionNote}"
                              </p>
                            </div>
                          )}

                          {/* Action Bar */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Schedule Preview' : 'View Proposed Schedule'}</span>
                            </button>

                            {req.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => cancelAvailabilityChangeRequest(req.id)}
                                className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/60"
                              >
                                Withdraw Request
                              </button>
                            )}
                          </div>

                          {/* Expanded Day-by-Day Preview */}
                          {isExpanded && req.proposedAvailability && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                {DAY_DEFINITIONS.map(({ day, short }) => {
                                  const r = req.proposedAvailability.weeklyRules?.find((x) => x.dayOfWeek === day);
                                  const isAvail = r?.isAvailable && r?.status !== 'unavailable';
                                  return (
                                    <div
                                      key={day}
                                      className={`p-2 rounded-lg border ${
                                        !isAvail 
                                          ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500' 
                                          : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                                      }`}
                                    >
                                      <div className="font-bold">{short}</div>
                                      <div className="text-[11px]">
                                        {!isAvail ? 'Off' : `${r?.status === 'preferred' ? '★ ' : ''}${r?.preferredShift || 'Any'}`}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                <span>Max Hours: {req.proposedAvailability.maxWeeklyHours || 40}h</span>
                                <span>Overtime: {req.proposedAvailability.overtimeWilling ? 'Yes' : 'No'}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* 3. CURRENT APPROVED SCHEDULE TAB */}
          {activeTab === 'current_schedule' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Current Active Schedule in Dispatch
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This is the weekly baseline currently recognized for {activeGuard.name}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('manage_proposal')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Propose Change
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {baselineRules.map((rule) => {
                  const isAvail = rule.isAvailable && rule.status !== 'unavailable';
                  const isPref = rule.status === 'preferred';
                  const dayDef = DAY_DEFINITIONS.find((d) => d.day === rule.dayOfWeek) || DAY_DEFINITIONS[0];

                  return (
                    <div
                      key={rule.dayOfWeek}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        !isAvail
                          ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-400'
                          : isPref
                          ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 text-purple-950 dark:text-purple-200'
                          : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs w-10 text-slate-700 dark:text-slate-300">
                          {dayDef.short}
                        </span>
                        <span className="text-xs font-semibold">
                          {!isAvail ? 'Off-Duty' : isPref ? 'Preferred Shift' : 'Available'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold">
                        {!isAvail ? '—' : rule.preferredShift || 'Any 24h'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between flex-wrap gap-2">
                <span>
                  Max Weekly Hours: <strong className="text-slate-900 dark:text-white">{activeGuard.availability?.maxWeeklyHours || 40}h</strong>
                </span>
                <span>
                  Overtime: <strong className="text-slate-900 dark:text-white">{activeGuard.availability?.overtimeWilling ? 'Willing' : 'No'}</strong>
                </span>
                <span>
                  Status: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Active in Roster</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
