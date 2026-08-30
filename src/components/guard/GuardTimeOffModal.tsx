import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { TimeOffType, TimeOffRequest } from '../../types/shift';
import {
  Calendar,
  Clock,
  CheckCircle2,
  X,
  AlertTriangle,
  Send,
  Palmtree,
  HeartPulse,
  UserCheck,
  Shield,
  HelpCircle,
  FileText,
  CalendarDays,
  Info,
  Clock3,
  Check
} from 'lucide-react';

interface GuardTimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'request_form' | 'my_requests';
  initialStartDate?: string;
  initialEndDate?: string;
}

const LEAVE_TYPES: { id: TimeOffType; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  {
    id: 'vacation',
    label: 'Vacation / PTO',
    icon: <Palmtree className="w-4 h-4 text-emerald-500" />,
    color: 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    desc: 'Scheduled paid/unpaid personal holiday or planned vacation'
  },
  {
    id: 'sick',
    label: 'Sick / Medical',
    icon: <HeartPulse className="w-4 h-4 text-rose-500" />,
    color: 'border-rose-500/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300',
    desc: 'Medical appointment, illness recovery, or health treatment'
  },
  {
    id: 'personal',
    label: 'Personal Leave',
    icon: <UserCheck className="w-4 h-4 text-blue-500" />,
    color: 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
    desc: 'Personal appointments, family commitments, or pressing affairs'
  },
  {
    id: 'bereavement',
    label: 'Bereavement',
    icon: <Clock3 className="w-4 h-4 text-purple-500" />,
    color: 'border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300',
    desc: 'Family bereavement and memorial attendance'
  },
  {
    id: 'military',
    label: 'Military / Drill',
    icon: <Shield className="w-4 h-4 text-amber-500" />,
    color: 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
    desc: 'National Guard or reserve military drills and activation orders'
  },
  {
    id: 'training',
    label: 'Training / Guard Card',
    icon: <FileText className="w-4 h-4 text-cyan-500" />,
    color: 'border-cyan-500/50 bg-cyan-50/50 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-300',
    desc: 'State security licensing, firearm recertification, or mandatory CE'
  },
  {
    id: 'other',
    label: 'Other Special Request',
    icon: <HelpCircle className="w-4 h-4 text-slate-500" />,
    color: 'border-slate-500/50 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300',
    desc: 'Jury duty, court subpoena, or special circumstance'
  }
];

export const GuardTimeOffModal: React.FC<GuardTimeOffModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'request_form',
  initialStartDate,
  initialEndDate
}) => {
  const { activeGuard, scheduledShifts, submitTimeOffRequest, timeOffRequests, cancelTimeOffRequest } = useShiftOps();

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [activeTab, setActiveTab] = useState<'request_form' | 'my_requests'>(initialTab);
  const [requestsFilter, setRequestsFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [selectedType, setSelectedType] = useState<TimeOffType>('vacation');
  const [startDate, setStartDate] = useState<string>(initialStartDate || tomorrowStr);
  const [endDate, setEndDate] = useState<string>(initialEndDate || initialStartDate || tomorrowStr);
  const [reasonText, setReasonText] = useState<string>('');
  const [notesText, setNotesText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync tab when prop changes
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Active guard's existing requests
  const guardRequests = useMemo(() => {
    return timeOffRequests.filter((r) => r.guardId === activeGuard.id);
  }, [timeOffRequests, activeGuard.id]);

  const pendingRequests = useMemo(() => {
    return guardRequests.filter((r) => r.status === 'pending');
  }, [guardRequests]);

  const approvedRequests = useMemo(() => {
    return guardRequests.filter((r) => r.status === 'approved');
  }, [guardRequests]);

  const deniedRequests = useMemo(() => {
    return guardRequests.filter((r) => r.status === 'denied' || (r.status as any) === 'rejected');
  }, [guardRequests]);

  const filteredGuardRequests = useMemo(() => {
    if (requestsFilter === 'pending') return pendingRequests;
    if (requestsFilter === 'approved') return approvedRequests;
    if (requestsFilter === 'denied') return deniedRequests;
    return guardRequests;
  }, [requestsFilter, guardRequests, pendingRequests, approvedRequests, deniedRequests]);

  // Calculate day count
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [startDate, endDate]);

  // Conflicting scheduled shifts
  const conflictingShifts = useMemo(() => {
    if (!startDate || !endDate) return [];
    return scheduledShifts.filter(
      (s) =>
        s.guardId === activeGuard.id &&
        s.date >= startDate &&
        s.date <= endDate &&
        s.status !== 'cancelled'
    );
  }, [scheduledShifts, activeGuard.id, startDate, endDate]);

  if (!isOpen) return null;

  // Preset Date Range buttons
  const applyPreset = (type: 'tomorrow' | 'weekend' | 'three_days' | 'full_week') => {
    const today = new Date();
    if (type === 'tomorrow') {
      const d = new Date();
      d.setDate(today.getDate() + 1);
      const str = d.toISOString().split('T')[0];
      setStartDate(str);
      setEndDate(str);
    } else if (type === 'weekend') {
      // Find next Saturday
      const sat = new Date();
      const day = sat.getDay();
      const diffToSat = (6 - day + 7) % 7 || 7;
      sat.setDate(sat.getDate() + diffToSat);
      const sun = new Date(sat);
      sun.setDate(sun.getDate() + 1);
      setStartDate(sat.toISOString().split('T')[0]);
      setEndDate(sun.toISOString().split('T')[0]);
    } else if (type === 'three_days') {
      const d1 = new Date();
      d1.setDate(today.getDate() + 2);
      const d2 = new Date(d1);
      d2.setDate(d1.getDate() + 2);
      setStartDate(d1.toISOString().split('T')[0]);
      setEndDate(d2.toISOString().split('T')[0]);
    } else if (type === 'full_week') {
      const d1 = new Date();
      d1.setDate(today.getDate() + 7);
      const d2 = new Date(d1);
      d2.setDate(d1.getDate() + 6);
      setStartDate(d1.toISOString().split('T')[0]);
      setEndDate(d2.toISOString().split('T')[0]);
    }
  };

  const handleReApply = (req: TimeOffRequest) => {
    setSelectedType(req.type);
    setReasonText(`Re-application: ${req.reason}`);
    setStartDate(req.startDate);
    setEndDate(req.endDate);
    setActiveTab('request_form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    if (new Date(endDate) < new Date(startDate)) {
      return;
    }

    setIsSubmitting(true);
    try {
      submitTimeOffRequest({
        guardId: activeGuard.id,
        guardName: activeGuard.name,
        guardBadge: activeGuard.badgeNumber,
        guardPhone: activeGuard.phone,
        startDate,
        endDate,
        type: selectedType,
        reason: reasonText.trim() || `${selectedType.toUpperCase()} leave request`,
        notes: notesText.trim() || undefined,
        totalDays: calculatedDays
      });

      // Switch to requests list to show newly submitted request
      setActiveTab('my_requests');
      setRequestsFilter('all');
      setReasonText('');
      notesText && setNotesText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-900 to-[#1e3a8a] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-blue-200">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <span>Request Time Off & Leave</span>
              </h3>
              <p className="text-xs text-blue-200 font-mono">
                Officer {activeGuard.name} ({activeGuard.badgeNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 pt-2">
          <button
            id="tab-new-timeoff-req"
            onClick={() => setActiveTab('request_form')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'request_form'
                ? 'border-[#1e3a8a] dark:border-blue-400 text-[#1e3a8a] dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>New Request</span>
          </button>

          <button
            id="tab-view-timeoff-reqs"
            onClick={() => setActiveTab('my_requests')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'my_requests'
                ? 'border-[#1e3a8a] dark:border-blue-400 text-[#1e3a8a] dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>My Submitted Requests</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {guardRequests.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Request Form */}
        {activeTab === 'request_form' && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Leave Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Select Leave Category</span>
                <span className="text-[10px] font-normal text-slate-400">Required</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LEAVE_TYPES.map((lt) => {
                  const isSelected = selectedType === lt.id;
                  return (
                    <button
                      key={lt.id}
                      type="button"
                      onClick={() => setSelectedType(lt.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {lt.icon}
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                          {lt.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Date Range Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('tomorrow')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#1e3a8a] dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  Tomorrow (1 Day)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('weekend')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#1e3a8a] dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  Upcoming Weekend
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('three_days')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#1e3a8a] dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  3-Day Block
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('full_week')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#1e3a8a] dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  Full Week (7 Days)
                </button>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#1e3a8a] dark:text-blue-400" />
                  <span>Start Date</span>
                </label>
                <input
                  id="timeoff-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (new Date(e.target.value) > new Date(endDate)) {
                      setEndDate(e.target.value);
                    }
                  }}
                  required
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#1e3a8a] dark:text-blue-400" />
                  <span>End Date</span>
                </label>
                <input
                  id="timeoff-end-date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between text-xs font-mono pt-1 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                <span>Requested Duration:</span>
                <span className="font-extrabold text-[#1e3a8a] dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded">
                  {calculatedDays} Calendar Day{calculatedDays !== 1 ? 's' : ''} (~{calculatedDays * 8} Shift Hours)
                </span>
              </div>
            </div>

            {/* Conflicting Shifts Warning */}
            {conflictingShifts.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Shift Overlap Detected ({conflictingShifts.length} scheduled shift{conflictingShifts.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                  You are currently scheduled for the following posts during this date range. Submitting this request will alert Ops Dispatch to arrange relief coverage upon approval:
                </p>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {conflictingShifts.map((s) => (
                    <div
                      key={s.id}
                      className="text-[11px] font-mono p-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-slate-800 dark:text-slate-200"
                    >
                      <span className="font-bold">{s.siteName}</span>
                      <span>
                        {s.date} ({s.startTime}-{s.endTime})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reason Text */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Reason / Purpose for Leave</span>
                <span className="text-[10px] text-slate-400">Brief Summary</span>
              </label>
              <input
                id="timeoff-reason-input"
                type="text"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="e.g. Annual family trip, Dental procedure, Personal appointment"
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Supervisor & Dispatch Notes (Optional)
              </label>
              <textarea
                id="timeoff-notes-input"
                rows={2}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Add any details regarding coverage handover, emergency contact info, or early return..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Submission notice */}
            <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                Your request is pushed directly to the Ops Admin and Dispatch supervisor desk. You will receive an in-app notification when approved or reviewed.
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="submit-time-off-btn"
                type="submit"
                disabled={isSubmitting || !startDate || !endDate}
                className="px-5 py-2 text-xs font-extrabold rounded-xl bg-[#1e3a8a] dark:bg-blue-600 hover:bg-blue-900 dark:hover:bg-blue-500 text-white shadow-md shadow-blue-950/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit to Operations</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: My Submitted Requests */}
        {activeTab === 'my_requests' && (
          <div className="p-4 sm:p-5 space-y-3 max-h-[75vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Your Time-Off Applications ({guardRequests.length})
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Real-time status synced with Operations Admin
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('request_form')}
                  className="text-xs font-bold text-[#1e3a8a] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>+ New Request</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setRequestsFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  requestsFilter === 'all'
                    ? 'bg-[#1e3a8a] text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>All</span>
                <span className="text-[10px] font-mono opacity-80 font-normal">({guardRequests.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRequestsFilter('pending')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  requestsFilter === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>Pending</span>
                <span className="text-[10px] font-mono font-bold">({pendingRequests.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRequestsFilter('approved')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  requestsFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>Approved</span>
                <span className="text-[10px] font-mono font-bold">({approvedRequests.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRequestsFilter('denied')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  requestsFilter === 'denied'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>Denied</span>
                <span className="text-[10px] font-mono font-bold">({deniedRequests.length})</span>
              </button>
            </div>

            {filteredGuardRequests.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No {requestsFilter !== 'all' ? requestsFilter : ''} Time-Off Requests Found
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {requestsFilter === 'all'
                    ? "Use the 'New Request' tab to apply for scheduled vacations, medical leave, or personal time off."
                    : `No requests with status '${requestsFilter}'.`}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredGuardRequests.map((req) => {
                  const isApproved = req.status === 'approved';
                  const isPending = req.status === 'pending';
                  const isDenied = req.status === 'denied' || (req.status as any) === 'rejected';

                  return (
                    <div
                      key={req.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isApproved
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-2xs'
                          : isPending
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-2xs'
                          : isDenied
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                                req.type === 'vacation'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                                  : req.type === 'sick'
                                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                                  : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300'
                              }`}
                            >
                              {req.type}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {req.reason}
                            </span>
                          </div>
                          <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            <span>
                              {req.startDate} to {req.endDate} ({req.totalDays || 1} day{req.totalDays !== 1 ? 's' : ''})
                            </span>
                          </p>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize font-mono shrink-0 ${
                            isApproved
                              ? 'bg-emerald-600 text-white'
                              : isPending
                              ? 'bg-amber-500 text-slate-950 font-black animate-pulse'
                              : isDenied
                              ? 'bg-rose-600 text-white font-black'
                              : 'bg-slate-600 text-white'
                          }`}
                        >
                          {isPending
                            ? '⏳ Pending Ops Review'
                            : isApproved
                            ? '✓ Approved (Off Duty)'
                            : isDenied
                            ? '✕ Denied by Ops'
                            : req.status}
                        </span>
                      </div>

                      {req.notes && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 bg-white/70 dark:bg-slate-950/70 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Guard Note:</span> "{req.notes}"
                        </p>
                      )}

                      {/* Status Details / Supervisor Notes */}
                      {isPending && (
                        <div className="mt-2 text-[11px] font-mono p-2 rounded-lg bg-amber-100/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Pending Review:</span> Submitted on {req.requestedAt?.slice(0, 10)}. Scheduled shifts remain active until approved.
                          </div>
                        </div>
                      )}

                      {isApproved && (
                        <div className="mt-2 text-[11px] font-mono p-2 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Approved by Operations:</span> {req.adminNotes || req.resolutionNote || 'Approved by Operations'}
                            {req.reviewedBy && (
                              <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                                Reviewed by {req.reviewedBy} on {req.reviewedAt?.slice(0, 10) || req.resolvedAt?.slice(0, 10)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {isDenied && (
                        <div className="mt-2 text-[11px] font-mono p-2.5 rounded-lg bg-rose-100/70 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-1.5">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Denial Notice:</span> {req.adminNotes || req.resolutionNote || 'Denied per staffing capacity & coverage availability.'}
                              {req.reviewedBy && (
                                <span className="block text-[10px] text-rose-700 dark:text-rose-300 mt-0.5">
                                  Reviewed by {req.reviewedBy} on {req.reviewedAt?.slice(0, 10) || req.resolvedAt?.slice(0, 10)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="pt-1.5 border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
                            <span className="text-[10px] text-rose-700 dark:text-rose-300 italic">
                              You remain scheduled for your assigned shifts.
                            </span>
                            <button
                              type="button"
                              onClick={() => handleReApply(req)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-2xs transition-colors"
                            >
                              Re-Apply / Edit
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Cancel button for pending */}
                      {isPending && (
                        <div className="flex justify-end pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => cancelTimeOffRequest(req.id)}
                            className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
                          >
                            Cancel Request
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
