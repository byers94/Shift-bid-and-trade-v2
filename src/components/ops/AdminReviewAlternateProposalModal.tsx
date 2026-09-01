import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Check, 
  Ban, 
  ArrowRightLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Sparkles,
  Shield,
  MessageSquare,
  Send
} from 'lucide-react';
import { GuardProfile, GuardPerformanceStats, GuardCoachingSession } from '../../types/shift';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  validateCoachingScheduleSlot, 
  validateAlternateCoachingDate, 
  getRecommendedCoachingSlots 
} from '../../utils/coachingSchedule';

interface AdminReviewAlternateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: GuardCoachingSession | null;
  guard?: GuardProfile & Partial<GuardPerformanceStats>;
}

export const AdminReviewAlternateProposalModal: React.FC<AdminReviewAlternateProposalModalProps> = ({
  isOpen,
  onClose,
  session,
  guard
}) => {
  const { 
    scheduledShifts, 
    shifts, 
    acceptAlternateCoaching, 
    denyAlternateCoaching, 
    counterAlternateCoaching 
  } = useShiftOps();

  const [decisionMode, setDecisionMode] = useState<'accept' | 'deny' | 'counter'>('accept');

  // Accept state
  const [acceptNotes, setAcceptNotes] = useState('');

  // Deny state
  const [denyPresetReason, setDenyPresetReason] = useState('Operational post coverage requires original schedule');
  const [customDenyReason, setCustomDenyReason] = useState('');

  // Counter state
  const [counterDate, setCounterDate] = useState(() => {
    if (!session) return '';
    const d = new Date(session.scheduledDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [counterTime, setCounterTime] = useState('14:00');
  const [counterReason, setCounterReason] = useState('');
  const [counterError, setCounterError] = useState('');

  // Conflict validation for guard's proposed alternate slot
  const proposedValidation = useMemo(() => {
    if (!session || !session.proposedAlternateDate) {
      return { isValid: true, hasShiftOverlap: false, hasBufferViolation: false, minBufferObserved: 24 };
    }
    return validateCoachingScheduleSlot(
      session.guardId,
      session.proposedAlternateDate,
      session.proposedAlternateTime || session.scheduledTime,
      session.durationMinutes || 45,
      scheduledShifts,
      shifts,
      8
    );
  }, [session, scheduledShifts, shifts]);

  // Conflict validation for supervisor's counter-proposed slot
  const counterValidation = useMemo(() => {
    if (!session || !counterDate) {
      return { isValid: true, hasShiftOverlap: false, hasBufferViolation: false, minBufferObserved: 24 };
    }
    return validateCoachingScheduleSlot(
      session.guardId,
      counterDate,
      counterTime,
      session.durationMinutes || 45,
      scheduledShifts,
      shifts,
      8
    );
  }, [session, counterDate, counterTime, scheduledShifts, shifts]);

  // Recommended clear slots for supervisor counter date
  const recommendedSlots = useMemo(() => {
    if (!session || !counterDate) return [];
    return getRecommendedCoachingSlots(
      session.guardId,
      counterDate,
      scheduledShifts,
      shifts
    );
  }, [session, counterDate, scheduledShifts, shifts]);

  if (!isOpen || !session) return null;

  const originalDateFormatted = new Date(session.scheduledDate + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const proposedDateFormatted = session.proposedAlternateDate
    ? new Date(session.proposedAlternateDate + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'N/A';

  // Allowed 7-day range for counter proposals
  const origDateObj = new Date(session.scheduledDate + 'T12:00:00');
  const maxDateObj = new Date(origDateObj.getTime() + 7 * 24 * 60 * 60 * 1000);
  const minDateStr = new Date().toISOString().split('T')[0];
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  const handleAccept = () => {
    acceptAlternateCoaching(session.id, acceptNotes.trim() || undefined);
    onClose();
  };

  const handleDeny = () => {
    const finalReason = denyPresetReason === 'Custom' ? customDenyReason.trim() : denyPresetReason;
    denyAlternateCoaching(session.id, finalReason || 'Operational coverage requires original schedule.');
    onClose();
  };

  const handleCounter = () => {
    if (!counterDate) {
      setCounterError('Please choose a valid counter date.');
      return;
    }

    const dateVal = validateAlternateCoachingDate(session.scheduledDate, counterDate);
    if (!dateVal.isValid) {
      setCounterError(dateVal.errorMessage || 'Counter date must be within 1 week of original session.');
      return;
    }

    counterAlternateCoaching(
      session.id,
      counterDate,
      counterTime,
      counterReason.trim() || 'Command counter-proposed date and time.'
    );
    onClose();
  };

  return (
    <div 
      id="admin-review-alternate-proposal-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="admin-review-alternate-proposal-modal-container"
        className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Review Alternate Coaching Proposal
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Officer Requested
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Officer {session.guardName} ({session.guardBadge}) • Topic: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{session.topic}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-review-modal"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Overview Card */}
        <div className="p-5 space-y-4 max-h-[calc(85vh-200px)] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Original Dispatched Schedule */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  Original Command Schedule
                </span>
                <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-200/70 dark:bg-neutral-700 px-2 py-0.5 rounded-md">
                  Initial
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-200 font-medium">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{originalDateFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{session.scheduledTime} ({session.durationMinutes || 45} mins)</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-[11px]">
                  <User className="w-3.5 h-3.5 text-neutral-400" />
                  <span>By {session.scheduledBy || 'Command'}</span>
                </div>
              </div>
            </div>

            {/* Guard Proposed Alternate */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 ring-1 ring-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 tracking-wider">
                  Officer Proposed Alternate
                </span>
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md">
                  Pending Review
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-neutral-800 dark:text-neutral-100 font-medium">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-bold">{proposedDateFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-bold">{session.proposedAlternateTime || session.scheduledTime}</span>
                </div>
                {/* Proposed Slot Conflict Badge */}
                <div className="pt-1">
                  {proposedValidation.isValid ? (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Conflict-Free (≥8h rest buffer clear)</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>{proposedValidation.conflictDescription || 'Shift Proximity / Buffer Warning'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Officer's Stated Rationale */}
          {(session.proposedAlternateReason || session.guardResponseNotes) && (
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
              <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 font-semibold mb-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Officer's Explanation / Notes:</span>
              </div>
              <p className="text-neutral-800 dark:text-neutral-200 italic pl-5">
                "{session.proposedAlternateReason || session.guardResponseNotes}"
              </p>
            </div>
          )}

          {/* Decision Mode Selector (Accept / Deny / Counter) */}
          <div className="pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
              Select Command Action:
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* Accept Tab */}
              <button
                type="button"
                id="btn-mode-accept"
                onClick={() => setDecisionMode('accept')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  decisionMode === 'accept'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                    : 'bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <div className={`p-1.5 rounded-lg mb-1 ${decisionMode === 'accept' ? 'bg-emerald-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">1. Accept Proposal</span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Lock in officer's time</span>
              </button>

              {/* Deny Tab */}
              <button
                type="button"
                id="btn-mode-deny"
                onClick={() => setDecisionMode('deny')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  decisionMode === 'deny'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-800 dark:text-rose-200 ring-2 ring-rose-500/30'
                    : 'bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <div className={`p-1.5 rounded-lg mb-1 ${decisionMode === 'deny' ? 'bg-rose-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>
                  <Ban className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">2. Deny Proposal</span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Enforce original slot</span>
              </button>

              {/* Counter Tab */}
              <button
                type="button"
                id="btn-mode-counter"
                onClick={() => setDecisionMode('counter')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  decisionMode === 'counter'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-800 dark:text-blue-200 ring-2 ring-blue-500/30'
                    : 'bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <div className={`p-1.5 rounded-lg mb-1 ${decisionMode === 'counter' ? 'bg-blue-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'}`}>
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">3. Counter Proposal</span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Propose new slot</span>
              </button>
            </div>
          </div>

          {/* Tab Specific Content Panels */}
          {decisionMode === 'accept' && (
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl space-y-3 animate-in fade-in-50 duration-150">
              <div className="flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Accept & Confirm New Coaching Schedule</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    This will finalize the 1-on-1 coaching session for <strong>{proposedDateFormatted} at {session.proposedAlternateTime || session.scheduledTime}</strong>. 
                    The session will be marked as confirmed and added to Officer {session.guardName}'s shift calendar.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Supervisor Notes / Instructions (Optional):
                </label>
                <input
                  type="text"
                  value={acceptNotes}
                  onChange={(e) => setAcceptNotes(e.target.value)}
                  placeholder="e.g. Approved. Will meet at Main Security Operations Command room..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>
          )}

          {decisionMode === 'deny' && (
            <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-xl space-y-3 animate-in fade-in-50 duration-150">
              <div className="flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Decline Alternate & Enforce Original Schedule</p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                    The alternate date proposal will be rejected. Officer {session.guardName} will receive a high-priority alert stating that the original date (<strong>{originalDateFormatted} @ {session.scheduledTime}</strong>) stands.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Reason for Denial:
                </label>
                <select
                  value={denyPresetReason}
                  onChange={(e) => setDenyPresetReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-rose-500 outline-hidden font-medium mb-2"
                >
                  <option value="Operational post coverage requires original schedule">Operational post coverage requires original schedule</option>
                  <option value="Critical compliance review deadline requires prompt completion">Critical compliance review deadline requires prompt completion</option>
                  <option value="Shift supervisor unavailable during proposed alternate window">Shift supervisor unavailable during proposed alternate window</option>
                  <option value="Proposed slot conflicts with scheduled duty rotation">Proposed slot conflicts with scheduled duty rotation</option>
                  <option value="Custom">Custom Explanation...</option>
                </select>

                {denyPresetReason === 'Custom' && (
                  <input
                    type="text"
                    value={customDenyReason}
                    onChange={(e) => setCustomDenyReason(e.target.value)}
                    placeholder="Enter explicit reason for denial to show the guard..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                )}
              </div>
            </div>
          )}

          {decisionMode === 'counter' && (
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-xl space-y-3 animate-in fade-in-50 duration-150">
              <div className="flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Counter-Propose Alternate Coaching Slot</p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                    Propose a different time slot within 7 days of the original date. Officer {session.guardName} will receive a notification to review and accept your counter-proposal.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Counter Date */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Supervisor Counter Date:
                  </label>
                  <input
                    type="date"
                    min={minDateStr}
                    max={maxDateStr}
                    value={counterDate}
                    onChange={(e) => {
                      setCounterDate(e.target.value);
                      setCounterError('');
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                  />
                </div>

                {/* Counter Time */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Counter Time:
                  </label>
                  <input
                    type="time"
                    value={counterTime}
                    onChange={(e) => setCounterTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                  />
                </div>
              </div>

              {/* Quick Time Preset Buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Presets:</span>
                {['09:00', '11:00', '13:30', '15:00', '17:00'].map((time) => (
                  <button
                    type="button"
                    key={time}
                    onClick={() => setCounterTime(time)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                      counterTime === time
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              {/* Counter Conflict Check Feedback */}
              <div className="pt-1">
                {counterValidation.isValid ? (
                  <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Selected counter slot is conflict-free and satisfies the ≥8h rest buffer rule.</span>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{counterValidation.conflictDescription || 'Shift Proximity Conflict Detected'}</span>
                  </div>
                )}
              </div>

              {/* Counter Reason Note */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Directive / Rationale for Counter Time:
                </label>
                <input
                  type="text"
                  value={counterReason}
                  onChange={(e) => setCounterReason(e.target.value)}
                  placeholder="e.g. Adjusted to align with pre-shift briefing before Waterfront post..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {counterError && (
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs">
                  {counterError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/70">
          <button
            type="button"
            id="btn-cancel-review"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>

          {decisionMode === 'accept' && (
            <button
              type="button"
              id="btn-confirm-accept-proposal"
              onClick={handleAccept}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Accept & Confirm ({session.proposedAlternateDate || session.scheduledDate})</span>
            </button>
          )}

          {decisionMode === 'deny' && (
            <button
              type="button"
              id="btn-confirm-deny-proposal"
              onClick={handleDeny}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Ban className="w-4 h-4" />
              <span>Deny Proposal & Enforce Original Schedule</span>
            </button>
          )}

          {decisionMode === 'counter' && (
            <button
              type="button"
              id="btn-confirm-send-counter"
              onClick={handleCounter}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send Counter-Proposal to Officer</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
