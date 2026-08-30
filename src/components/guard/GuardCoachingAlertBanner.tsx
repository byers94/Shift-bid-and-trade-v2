import React, { useState } from 'react';
import { 
  CalendarCheck, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Send, 
  AlertCircle, 
  User, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert,
  Sparkles,
  Check,
  X
} from 'lucide-react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { GuardCoachingSession } from '../../types/shift';
import { validateAlternateCoachingDate } from '../../utils/coachingSchedule';

interface GuardCoachingAlertBannerProps {
  guardId?: string;
}

export const GuardCoachingAlertBanner: React.FC<GuardCoachingAlertBannerProps> = ({ guardId }) => {
  const { 
    activeGuard, 
    authenticatedGuard, 
    coachingSessions, 
    confirmGuardCoaching, 
    proposeAlternateCoaching 
  } = useShiftOps();

  // Strictly determine current guard ID from prop or active guard profile
  const currentGuardId = guardId || activeGuard?.id || authenticatedGuard?.id;

  // Find all active coaching sessions for this SPECIFIC guard ONLY
  const guardSessions = currentGuardId
    ? coachingSessions.filter(
        (s) => s.guardId === currentGuardId && s.status !== 'cancelled'
      )
    : [];

  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [proposingSessionId, setProposingSessionId] = useState<string | null>(null);

  // Proposal form state
  const [alternateDate, setAlternateDate] = useState<string>('');
  const [alternateTime, setAlternateTime] = useState<string>('11:00');
  const [proposalReason, setProposalReason] = useState<string>('');
  const [proposalError, setProposalError] = useState<string>('');

  if (guardSessions.length === 0) {
    return null;
  }

  const handleStartPropose = (session: GuardCoachingSession) => {
    // Default to +2 days from original, or tomorrow
    const orig = new Date(session.scheduledDate + 'T12:00:00');
    orig.setDate(orig.getDate() + 2);
    const defaultAlt = orig.toISOString().split('T')[0];

    setProposingSessionId(session.id);
    setAlternateDate(defaultAlt);
    setAlternateTime(session.scheduledTime || '11:00');
    setProposalReason('');
    setProposalError('');
  };

  const handleConfirm = (session: GuardCoachingSession) => {
    confirmGuardCoaching(session.id);
  };

  const handleSubmitProposal = (session: GuardCoachingSession) => {
    if (!alternateDate) {
      setProposalError('Please select an alternate date.');
      return;
    }

    const validation = validateAlternateCoachingDate(session.scheduledDate, alternateDate);
    if (!validation.isValid) {
      setProposalError(validation.errorMessage || 'Alternate date must be within 1 week of original session.');
      return;
    }

    const result = proposeAlternateCoaching(
      session.id,
      alternateDate,
      alternateTime,
      proposalReason.trim() || 'Schedule preference adjustment requested.'
    );

    if (result.success) {
      setProposingSessionId(null);
      setProposalError('');
    } else {
      setProposalError(result.message);
    }
  };

  return (
    <div className="space-y-3 mb-4" id="guard-coaching-notifications-wrapper">
      {guardSessions.map((session) => {
        const isPendingAction = session.status === 'pending_guard_action';
        const isAlternateProposed = session.status === 'alternate_proposed_by_guard';
        const isConfirmed = session.status === 'confirmed_by_guard';
        const isProposing = proposingSessionId === session.id;
        const isExpanded = expandedSessionId === session.id;

        // Calculate max date (1 week out)
        const origDateObj = new Date(session.scheduledDate + 'T12:00:00');
        const maxDateObj = new Date(origDateObj.getTime() + 7 * 24 * 60 * 60 * 1000);
        const maxDateStr = maxDateObj.toISOString().split('T')[0];
        const minDateStr = new Date().toISOString().split('T')[0];

        return (
          <div
            key={session.id}
            id={`coaching-card-${session.id}`}
            className={`rounded-2xl border transition-all overflow-hidden ${
              isPendingAction
                ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 dark:border-amber-500/40 shadow-md ring-1 ring-amber-500/20'
                : isAlternateProposed
                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60'
                : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
            }`}
          >
            {/* Top Priority Banner */}
            <div className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Left Info */}
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-xl shrink-0 mt-0.5 ${
                    isPendingAction
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                      : isAlternateProposed
                      ? 'bg-blue-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}>
                    <CalendarCheck className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isPendingAction
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                          : isAlternateProposed
                          ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                          : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      }`}>
                        {isPendingAction
                          ? 'Action Required: Confirm Coaching'
                          : isAlternateProposed
                          ? 'Alternate Proposed • Awaiting Command'
                          : 'Coaching Confirmed'}
                      </span>

                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        Officer: {session.guardName} ({session.guardBadge})
                      </span>

                      {session.overrideRestrictions && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          Command Override
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-neutral-900 dark:text-white mt-1">
                      1-on-1 Performance Coaching: {session.topic}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>
                          {new Date(session.scheduledDate + 'T12:00:00').toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{session.scheduledTime || '10:00'} ({session.durationMinutes || 45} Minutes)</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Supervisor: {session.scheduledBy || "Commander Mark O'Connor"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isPendingAction && !isProposing && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartPropose(session)}
                        className="px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-xl transition-all shadow-xs"
                      >
                        Propose Alternate Time
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConfirm(session)}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirm & Accept</span>
                      </button>
                    </>
                  )}

                  {isAlternateProposed && (
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block">
                        Proposed: {session.proposedAlternateDate} at {session.proposedAlternateTime}
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Awaiting Command Approval
                      </span>
                    </div>
                  )}

                  {isConfirmed && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Confirmed by You</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title={isExpanded ? 'Hide details' : 'Show details'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Session Details & Supervisor Directive */}
              {isExpanded && (
                <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
                  {session.notes && (
                    <div className="p-3 bg-white/80 dark:bg-neutral-900/80 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                      <span className="font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
                        Supervisor Directive / Action Plan:
                      </span>
                      <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {session.notes}
                      </p>
                    </div>
                  )}

                  {session.conflictDetails && (
                    <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-lg text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>{session.conflictDetails}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Propose Alternate Time Drawer */}
            {isProposing && (
              <div className="px-5 py-4 bg-neutral-100/90 dark:bg-neutral-900/90 border-t border-amber-500/20 text-neutral-900 dark:text-neutral-100 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                      Propose Alternate Date & Time (Max 1 Week Out)
                    </h5>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProposingSessionId(null)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
                  You can propose an alternate date up to <strong>1 week (7 days)</strong> from the original date ({session.scheduledDate}). 
                  Latest allowed: <strong>{maxDateStr}</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  {/* Alternate Date Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Alternate Date
                    </label>
                    <input
                      type="date"
                      min={minDateStr}
                      max={maxDateStr}
                      value={alternateDate}
                      onChange={(e) => {
                        setAlternateDate(e.target.value);
                        setProposalError('');
                      }}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 outline-hidden font-medium"
                    />
                  </div>

                  {/* Alternate Time Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Preferred Time
                    </label>
                    <input
                      type="time"
                      value={alternateTime}
                      onChange={(e) => setAlternateTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 outline-hidden font-medium"
                    />
                  </div>

                  {/* Quick Preset Time Slots */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Quick Time
                    </label>
                    <div className="flex gap-1">
                      {['09:00', '13:00', '16:00'].map((time) => (
                        <button
                          type="button"
                          key={time}
                          onClick={() => setAlternateTime(time)}
                          className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
                            alternateTime === time
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reason Note */}
                <div className="mb-3">
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Reason for Alternate Time (Optional):
                  </label>
                  <input
                    type="text"
                    value={proposalReason}
                    onChange={(e) => setProposalReason(e.target.value)}
                    placeholder="e.g. Seeking pre-shift coaching slot prior to Pier 7 post duty..."
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>

                {/* Validation Error */}
                {proposalError && (
                  <div className="p-2 mb-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{proposalError}</span>
                  </div>
                )}

                {/* Proposal Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setProposingSessionId(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubmitProposal(session)}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 active:scale-98 rounded-lg shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Proposal to Command</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
