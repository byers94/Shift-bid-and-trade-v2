import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  AvailabilityChangeRequest, 
  AvailabilityRequestStatus, 
  DayOfWeek, 
  ScheduledShift 
} from '../../types/shift';
import {
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  ShieldCheck,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Info,
  Calendar,
  Sparkles,
  ArrowRight,
  Shield,
  FileText,
  Phone,
  CalendarDays,
  Send,
  Ban,
  UserCheck,
  AlertCircle
} from 'lucide-react';

const DAYS: { day: DayOfWeek; name: string; short: string }[] = [
  { day: 0, name: 'Sunday', short: 'Sun' },
  { day: 1, name: 'Monday', short: 'Mon' },
  { day: 2, name: 'Tuesday', short: 'Tue' },
  { day: 3, name: 'Wednesday', short: 'Wed' },
  { day: 4, name: 'Thursday', short: 'Thu' },
  { day: 5, name: 'Friday', short: 'Fri' },
  { day: 6, name: 'Saturday', short: 'Sat' }
];

interface AvailabilityChangeRequestQueueProps {
  onSelectGuardForMatrix?: (guardId: string) => void;
}

export const AvailabilityChangeRequestQueue: React.FC<AvailabilityChangeRequestQueueProps> = ({
  onSelectGuardForMatrix
}) => {
  const { 
    availabilityChangeRequests, 
    reviewAvailabilityChangeRequest,
    scheduledShifts,
    guardsList,
    showToast 
  } = useShiftOps();

  const [statusFilter, setStatusFilter] = useState<AvailabilityRequestStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Resolution modal / prompt state
  const [reviewModal, setReviewModal] = useState<{
    request: AvailabilityChangeRequest;
    action: 'approved' | 'denied';
  } | null>(null);
  const [supervisorNote, setSupervisorNote] = useState('');
  const [supervisorName, setSupervisorName] = useState("Lt. Mark O'Connor (OPS-01)");

  // Counts
  const pendingCount = useMemo(() => {
    return (availabilityChangeRequests || []).filter((r) => r.status === 'pending').length;
  }, [availabilityChangeRequests]);

  const approvedCount = useMemo(() => {
    return (availabilityChangeRequests || []).filter((r) => r.status === 'approved').length;
  }, [availabilityChangeRequests]);

  const deniedCount = useMemo(() => {
    return (availabilityChangeRequests || []).filter((r) => r.status === 'denied').length;
  }, [availabilityChangeRequests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return (availabilityChangeRequests || []).filter((req) => {
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        req.guardName.toLowerCase().includes(q) ||
        req.guardBadge.toLowerCase().includes(q) ||
        req.reasonForChange.toLowerCase().includes(q) ||
        (req.notes && req.notes.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [availabilityChangeRequests, statusFilter, searchQuery]);

  // Check scheduled shift conflicts for a given request
  const getConflictingShifts = (req: AvailabilityChangeRequest): ScheduledShift[] => {
    if (!req.proposedAvailability?.weeklyRules) return [];
    
    const today = new Date().toISOString().split('T')[0];
    const guardUpcomingShifts = scheduledShifts.filter(
      (s) => s.guardId === req.guardId && s.date >= (req.effectiveDate || today) && s.status !== 'cancelled'
    );

    const conflicts: ScheduledShift[] = [];

    guardUpcomingShifts.forEach((shift) => {
      try {
        const parts = shift.date.split('-');
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const dayOfWeek = d.getDay() as DayOfWeek;

        const proposedRule = req.proposedAvailability.weeklyRules.find((r) => r.dayOfWeek === dayOfWeek);
        if (proposedRule) {
          const isAvail = proposedRule.isAvailable && proposedRule.status !== 'unavailable';
          if (!isAvail) {
            conflicts.push(shift);
          }
        }
      } catch {
        // pass
      }
    });

    return conflicts;
  };

  // Handle Review Submission
  const handleConfirmReview = () => {
    if (!reviewModal) return;

    const { request, action } = reviewModal;
    const finalNote = supervisorNote.trim() || (action === 'approved' ? 'Approved by supervisor. Schedule updated.' : 'Request declined due to operational minimum staffing.');

    reviewAvailabilityChangeRequest(
      request.id,
      action,
      finalNote,
      supervisorName.trim() || "Operations Supervisor"
    );

    setReviewModal(null);
    setSupervisorNote('');
  };

  return (
    <div className="space-y-4" id="availability-change-request-queue">
      {/* Top Banner & Overview */}
      <div className="bg-slate-900/95 border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 ring-1 ring-purple-500/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3.5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                  <span>Guard Availability Change Requests</span>
                  {pendingCount > 0 ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/60 font-mono font-bold animate-pulse">
                      🚨 {pendingCount} Pending Supervisor Action
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-semibold">
                      All Caught Up
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Guards submit recurring availability updates via the terminal. Supervisor approval is required before changes take effect on the roster.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-stretch md:self-auto justify-between md:justify-start">
            <div className="px-3 py-1 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-400 block font-mono">Pending</span>
              <span className="text-sm font-black text-amber-300 font-mono">{pendingCount}</span>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div className="px-3 py-1 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block font-mono">Approved</span>
              <span className="text-sm font-black text-emerald-300 font-mono">{approvedCount}</span>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div className="px-3 py-1 text-center">
              <span className="text-[10px] uppercase font-bold text-rose-400 block font-mono">Denied</span>
              <span className="text-sm font-black text-rose-300 font-mono">{deniedCount}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Review ({pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'approved'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved ({approvedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('denied')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'denied'
                  ? 'bg-rose-600 text-white font-black shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Denied ({deniedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-purple-600 text-white font-black shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>All ({availabilityChangeRequests.length})</span>
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search officer name, badge, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h4 className="text-sm font-bold text-white">
            {statusFilter === 'pending' ? 'No Pending Availability Change Requests' : 'No Requests Match Your Filter'}
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {statusFilter === 'pending'
              ? 'All officer availability change proposals have been reviewed. When guards request schedule adjustments in the terminal, they will appear here.'
              : 'Try clearing your search query or selecting a different status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredRequests.map((req) => {
            const isExpanded = expandedRequestId === req.id;
            const conflicts = getConflictingShifts(req);
            const prevRules = req.previousAvailability?.weeklyRules || [];
            const propRules = req.proposedAvailability?.weeklyRules || [];

            // Detect day differences
            const dayDifferences: { day: DayOfWeek; name: string; from: string; to: string; isChanged: boolean }[] = [];
            DAYS.forEach(({ day, name }) => {
              const p = prevRules.find((r) => r.dayOfWeek === day);
              const n = propRules.find((r) => r.dayOfWeek === day);

              const pAvail = p ? (p.isAvailable && p.status !== 'unavailable') : false;
              const nAvail = n ? (n.isAvailable && n.status !== 'unavailable') : false;

              const pText = !pAvail ? 'Off-Duty' : `${p?.status === 'preferred' ? 'Preferred' : 'Available'} (${p?.preferredShift || 'Any'})`;
              const nText = !nAvail ? 'Off-Duty' : `${n?.status === 'preferred' ? 'Preferred' : 'Available'} (${n?.preferredShift || 'Any'})`;

              dayDifferences.push({
                day,
                name,
                from: pText,
                to: nText,
                isChanged: pText !== nText
              });
            });

            const hoursChanged = (req.previousAvailability?.maxWeeklyHours || 40) !== (req.proposedAvailability?.maxWeeklyHours || 40);
            const otChanged = (req.previousAvailability?.overtimeWilling ?? true) !== (req.proposedAvailability?.overtimeWilling ?? true);

            return (
              <div
                key={req.id}
                className={`bg-slate-900/90 border rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 transition-all ${
                  req.status === 'pending'
                    ? 'border-amber-500/40 ring-1 ring-amber-500/20'
                    : req.status === 'approved'
                    ? 'border-emerald-500/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Request Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-200 flex items-center justify-center font-black text-sm shrink-0">
                      {req.guardName.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base text-white">
                          {req.guardName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px] font-bold">
                          {req.guardBadge}
                        </span>
                        {req.guardPhone && (
                          <span className="text-slate-400 text-xs flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {req.guardPhone}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>Submitted: {new Date(req.requestedAt).toLocaleDateString()} at {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span className="text-purple-300 font-semibold">
                          Target Effective Date: {req.effectiveDate || 'Immediate'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Direct Matrix Link */}
                  <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
                    {onSelectGuardForMatrix && (
                      <button
                        type="button"
                        onClick={() => onSelectGuardForMatrix(req.guardId)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors cursor-pointer border border-slate-700 flex items-center gap-1"
                        title="View officer in weekly matrix"
                      >
                        <User className="w-3 h-3 text-purple-400" />
                        <span>Matrix</span>
                      </button>
                    )}

                    {req.status === 'pending' && (
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1.5 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pending Supervisor Review</span>
                      </span>
                    )}

                    {req.status === 'approved' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Approved & Applied</span>
                      </span>
                    )}

                    {req.status === 'denied' && (
                      <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Denied</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Stated Reason & Notes */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Stated Reason for Availability Change:</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium italic pl-5">
                    "{req.reasonForChange}"
                  </p>
                  {req.notes && (
                    <p className="text-[11px] text-slate-400 pl-5">
                      <strong>Guard Notes:</strong> {req.notes}
                    </p>
                  )}
                </div>

                {/* Conflict Alert with Existing Rostered Shifts */}
                {conflicts.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-100">
                        Staffing Warning: {conflicts.length} Upcoming Scheduled Shift{conflicts.length > 1 ? 's' : ''} Conflict with Proposed Off-Duty Days
                      </span>
                      <p className="text-rose-300 mt-0.5">
                        If approved, the guard will no longer be available for:{' '}
                        {conflicts.map((s) => `${s.date} (${s.siteName})`).join(', ')}. Dispatch relief or reassignment will be required.
                      </p>
                    </div>
                  </div>
                )}

                {/* Side-by-Side Visual Schedule Diff */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Weekly Schedule Modifications:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Collapse Table' : 'Expand All Days'}</span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* 7-Day Diff Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {dayDifferences.map(({ day, name, from, to, isChanged }) => (
                      <div
                        key={day}
                        className={`p-2.5 rounded-xl border transition-all text-xs ${
                          isChanged
                            ? 'bg-purple-950/40 border-purple-500/60 ring-1 ring-purple-500/30'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-black text-xs ${isChanged ? 'text-purple-200' : 'text-slate-300'}`}>
                            {name.slice(0, 3)}
                          </span>
                          {isChanged && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500 text-white font-black">
                              MODIFIED
                            </span>
                          )}
                        </div>

                        {isChanged ? (
                          <div className="space-y-0.5 text-[11px]">
                            <div className="text-slate-400 line-through truncate" title={from}>
                              {from}
                            </div>
                            <div className="font-bold text-emerald-300 truncate" title={to}>
                              ➔ {to}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 truncate" title={to}>
                            {to}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Additional Rules Comparison Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                    <div>
                      <span>Max Weekly Hours: </span>
                      <strong className={hoursChanged ? 'text-amber-300 font-black' : 'text-white'}>
                        {req.previousAvailability?.maxWeeklyHours || 40}h ➔ {req.proposedAvailability?.maxWeeklyHours || 40}h
                      </strong>
                    </div>

                    <div>
                      <span>Overtime Willing: </span>
                      <strong className={otChanged ? 'text-amber-300 font-black' : 'text-white'}>
                        {req.previousAvailability?.overtimeWilling ? 'Yes' : 'No'} ➔ {req.proposedAvailability?.overtimeWilling ? 'Yes' : 'No'}
                      </strong>
                    </div>

                    <div>
                      <span>Preferred Posts: </span>
                      <strong className="text-white">
                        {req.proposedAvailability?.preferredServiceTypes?.join(', ') || 'Dedicated, Roving'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Supervisor Resolution Callout (if already reviewed) */}
                {req.reviewedAt && (
                  <div className={`p-3 rounded-xl border text-xs ${
                    req.status === 'approved'
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  }`}>
                    <div className="flex items-center justify-between font-bold mb-0.5">
                      <span>Supervisor Action: {req.status.toUpperCase()}</span>
                      <span className="text-[10px] font-mono opacity-80">
                        {new Date(req.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="opacity-90">
                      Reviewed by {req.reviewedByAdminName || 'Operations Supervisor'}: "{req.resolutionNote}"
                    </p>
                  </div>
                )}

                {/* Supervisor Actions (Only for pending requests) */}
                {req.status === 'pending' && (
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewModal({ request: req, action: 'denied' });
                        setSupervisorNote('Request declined due to minimum staffing coverage constraints.');
                      }}
                      className="px-3.5 py-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-600/50 text-rose-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Ban className="w-3.5 h-3.5 text-rose-400" />
                      <span>Deny Proposal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReviewModal({ request: req, action: 'approved' });
                        setSupervisorNote('Approved by supervisor. Schedule and roster profile updated.');
                      }}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-900/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Apply to Guard Profile</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SUPERVISOR DECISION MODAL */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${
                  reviewModal.action === 'approved' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {reviewModal.action === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {reviewModal.action === 'approved' ? 'Approve Availability Changes' : 'Deny Availability Changes'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Officer: {reviewModal.request.guardName} ({reviewModal.request.guardBadge})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                {reviewModal.action === 'approved' ? (
                  <span>
                    Confirming approval will immediately commit the proposed weekly rules to{' '}
                    <strong>{reviewModal.request.guardName}'s</strong> official profile, updating scheduling constraints and dispatch rosters.
                  </span>
                ) : (
                  <span>
                    Denying will reject the proposed changes and notify the officer. The officer's existing availability rules will remain intact.
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Supervisor Name / Call-Sign
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Supervisor Resolution Note / Comments
                </label>
                <textarea
                  rows={3}
                  value={supervisorNote}
                  onChange={(e) => setSupervisorNote(e.target.value)}
                  placeholder="Enter feedback or instructions for dispatch and the guard..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReview}
                className={`px-4 py-2 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all ${
                  reviewModal.action === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                }`}
              >
                {reviewModal.action === 'approved' ? 'Confirm Approval & Apply' : 'Confirm Denial'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
