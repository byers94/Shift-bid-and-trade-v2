import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  BellRing, 
  ChevronRight, 
  ChevronLeft, 
  MessageSquare, 
  Moon,
  Sparkles,
  Info
} from 'lucide-react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { PriorityShiftMatch } from '../../types/shift';
import { formatRestBuffer } from '../../utils/scheduling';

interface PriorityShiftPushBannerProps {
  onOpenAlertPrefs?: () => void;
}

export const PriorityShiftPushBanner: React.FC<PriorityShiftPushBannerProps> = ({
  onOpenAlertPrefs
}) => {
  const {
    eligiblePriorityShifts,
    dismissedPriorityShiftIds,
    activePriorityPush,
    dismissPriorityPush,
    snoozePriorityPush,
    claimPriorityShift,
    activeGuard,
    opsPhone
  } = useShiftOps();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Filter out any dismissed priority shifts so the guard is never blocked from viewing open shifts
  const unDismissedShifts = useMemo(() => {
    return (eligiblePriorityShifts || []).filter(
      (m) => !dismissedPriorityShiftIds?.includes(m.shift.id)
    );
  }, [eligiblePriorityShifts, dismissedPriorityShiftIds]);

  // If no un-dismissed eligible shifts in next 24h or alert is closed, return null
  if (!unDismissedShifts || unDismissedShifts.length === 0) {
    return null;
  }

  // Safe index within bounds
  const safeIndex = Math.min(currentIndex, unDismissedShifts.length - 1);
  const activeMatch: PriorityShiftMatch = unDismissedShifts[safeIndex] || unDismissedShifts[0];
  const { shift, startsInHours, startsInMinutes, restHoursBefore, restHoursAfter, adjacentShiftBefore, adjacentShiftAfter, surgeBonusRate } = activeMatch;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % unDismissedShifts.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + unDismissedShifts.length) % unDismissedShifts.length);
  };

  const handleClaim = () => {
    setIsClaiming(true);
    try {
      claimPriorityShift(shift.id, activeGuard.id);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleDismiss = () => {
    dismissPriorityPush(shift.id);
  };

  const handleTextDispatch = () => {
    const body = encodeURIComponent(
      `[PRIORITY 24H DISPATCH CLAIM]\nOfficer: ${activeGuard.name} (${activeGuard.badgeNumber})\nPhone: ${activeGuard.phone}\nClaiming Open Shift: ${shift.siteName}\nDate: ${shift.date} (${shift.startTime}-${shift.endTime}, ${shift.hours || 8}h)\nRest Buffer: ≥6h Verified (Zero Overlap)\nPlease confirm my roster assignment.`
    );
    window.open(`sms:${opsPhone}?&body=${body}`, '_blank');
  };

  const totalEligible = unDismissedShifts.length;

  return (
    <section 
      aria-label="Priority Unfilled Shift Notification"
      className="relative mb-3 overflow-hidden rounded-xl border-2 border-amber-500/80 bg-gradient-to-br from-amber-950 via-slate-900 to-blue-950 text-white shadow-xl shadow-amber-950/30 transition-all animate-fadeIn"
    >
      {/* Top Banner Alert Bar */}
      <div className="flex items-center justify-between border-b border-amber-500/40 bg-amber-500/20 px-3 py-2 text-amber-200">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"></span>
          </span>
          <div className="flex items-center gap-1.5 font-mono text-xs font-black uppercase tracking-wider text-amber-300">
            <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span>Priority Push: Unfilled Next 24h Shift</span>
          </div>
          {surgeBonusRate && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-400/40">
              <Sparkles className="h-3 w-3 text-amber-300" />
              +${surgeBonusRate.toFixed(2)}/hr Urgency Surge
            </span>
          )}
        </div>

        {/* Carousel indicator & Dismiss / Snooze */}
        <div className="flex items-center gap-2">
          {totalEligible > 1 && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300/90 mr-1">
              <button 
                onClick={handlePrev} 
                aria-label="Previous priority shift"
                className="rounded p-0.5 hover:bg-white/10 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span>{safeIndex + 1}/{totalEligible}</span>
              <button 
                onClick={handleNext} 
                aria-label="Next priority shift"
                className="rounded p-0.5 hover:bg-white/10 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => snoozePriorityPush(15)}
            title="Snooze for 15 minutes"
            className="flex items-center gap-1 rounded bg-slate-800/80 hover:bg-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300 cursor-pointer border border-slate-700"
          >
            <Moon className="h-3 w-3 text-slate-400" />
            <span className="hidden xs:inline">Snooze</span>
          </button>

          <button
            id="dismiss-priority-push-banner-btn"
            onClick={handleDismiss}
            title="Dismiss this priority push notification"
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Shift Details */}
      <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          {/* Left Column: Post & Site */}
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono ${
                shift.urgency === 'emergency' 
                  ? 'bg-rose-600 text-white animate-pulse' 
                  : 'bg-amber-500 text-slate-950 font-extrabold'
              }`}>
                {shift.urgency === 'emergency' ? '🚨 CRITICAL SHORTAGE' : '⚡ URGENT VACANCY'}
              </span>

              <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                <Clock className="h-3 w-3" />
                {startsInHours === 0 && startsInMinutes <= 0 
                  ? 'Starting Now' 
                  : `Starts in ${startsInHours > 0 ? `${startsInHours}h ` : ''}${startsInMinutes}m`}
              </span>

              {shift.requiredCertifications && shift.requiredCertifications.length > 0 && (
                <span className="text-[10px] bg-blue-900/60 text-blue-200 border border-blue-700/60 px-1.5 py-0.5 rounded font-mono">
                  {shift.requiredCertifications[0]}
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{shift.siteName}</span>
            </h3>

            <p className="text-xs text-slate-300 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{shift.location || shift.address}</span>
            </p>

            {/* Time & Duration Strip */}
            <div className="flex items-center gap-3 pt-1 text-xs text-slate-200 font-mono">
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                <span className="text-slate-400 font-sans">Date:</span>
                <span className="font-bold text-white">{shift.date}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                <span className="text-slate-400 font-sans">Duty Hours:</span>
                <span className="font-bold text-emerald-300">{shift.startTime} – {shift.endTime}</span>
                <span className="text-slate-400">({shift.hours || 8}h)</span>
              </div>
            </div>
          </div>

          {/* Right Column: Actions */}
          <div className="flex sm:flex-col items-center sm:items-stretch gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
            <button
              id={`claim-priority-shift-btn-${shift.id}`}
              onClick={handleClaim}
              disabled={isClaiming}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/50 cursor-pointer active:scale-98 transition-all disabled:opacity-50"
            >
              <Zap className="h-4 w-4 fill-slate-950 text-slate-950" />
              <span>{isClaiming ? 'Claiming...' : '1-Click Claim Shift'}</span>
            </button>

            <button
              id={`text-bid-priority-shift-btn-${shift.id}`}
              onClick={handleTextDispatch}
              className="flex-1 sm:flex-initial py-2 px-3 bg-blue-900/70 hover:bg-blue-800 text-blue-200 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-1.5 border border-blue-700/60 cursor-pointer transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Text Dispatch</span>
            </button>
          </div>
        </div>

        {/* Schedule Validation Guarantee Badge */}
        <div className="mt-3 rounded-lg bg-slate-950/70 border border-emerald-500/40 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-950 p-1 text-emerald-400 border border-emerald-600/60 shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Rest Buffer & Zero Overlap Verified</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Guaranteed no conflict with your scheduled shifts + minimum 6-hour mandatory rest period verified.
              </p>
            </div>
          </div>

          {/* Rest Gap Badges */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-mono text-[11px]">
            {restHoursBefore !== undefined && (
              <span className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-0.5 rounded">
                Gap Before: <strong className="text-emerald-400">{formatRestBuffer(restHoursBefore)}</strong>
              </span>
            )}
            {restHoursAfter !== undefined && (
              <span className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-0.5 rounded">
                Gap After: <strong className="text-emerald-400">{formatRestBuffer(restHoursAfter)}</strong>
              </span>
            )}
            {restHoursBefore === undefined && restHoursAfter === undefined && (
              <span className="bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 px-2 py-0.5 rounded">
                Full 24h Rest Window Clear
              </span>
            )}
          </div>
        </div>

        {/* Additional contextual notes if available */}
        {shift.notes && (
          <div className="mt-2 text-[11px] text-slate-300 italic flex items-center gap-1.5 pl-1">
            <Info className="h-3 w-3 text-slate-400 shrink-0" />
            <span>Note: {shift.notes}</span>
          </div>
        )}
      </div>
    </section>
  );
};
