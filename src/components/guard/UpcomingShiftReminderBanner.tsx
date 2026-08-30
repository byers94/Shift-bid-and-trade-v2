import React, { useState, useMemo, useEffect } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ScheduledShift } from '../../types/shift';
import {
  Bell,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  ArrowRightLeft,
  Navigation,
  FileText,
  Volume2,
  Calendar,
  Sparkles,
  Info,
  Check,
  Phone
} from 'lucide-react';
import { PostShiftModal } from './PostShiftModal';

interface UpcomingShiftReminderBannerProps {
  onNavigateToDuty?: () => void;
  onOpenAlertPrefs?: () => void;
}

export const UpcomingShiftReminderBanner: React.FC<UpcomingShiftReminderBannerProps> = ({
  onNavigateToDuty,
  onOpenAlertPrefs
}) => {
  const {
    activeGuard,
    scheduledShifts,
    confirmShiftAttendance,
    alertPreferences,
    showToast,
    opsPhone
  } = useShiftOps();

  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState<boolean>(false);
  const [hasPromptedBrowserPush, setHasPromptedBrowserPush] = useState<boolean>(false);

  // Time state for live countdown updating
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 30000); // 30s update interval
    return () => clearInterval(timer);
  }, []);

  // Find the next upcoming scheduled shift within 24 hours for the active guard
  const upcomingShiftMatch = useMemo(() => {
    if (alertPreferences.upcomingShift24hReminder === false) return null;

    const guardShifts = scheduledShifts
      .filter((s) => s.guardId === activeGuard.id && s.status === 'scheduled')
      .map((s) => {
        // Calculate start timestamp
        const [year, month, day] = s.date.split('-').map(Number);
        const [hour, min] = (s.startTime || '08:00').split(':').map(Number);
        const startDate = new Date(year, month - 1, day, hour, min, 0);
        const diffMs = startDate.getTime() - nowTime;
        const diffHours = diffMs / (1000 * 60 * 60);

        return {
          shift: s,
          startDate,
          diffMs,
          diffHours,
          isWithin24h: diffHours >= -1 && diffHours <= (alertPreferences.upcomingReminderLeadHours || 24)
        };
      })
      .filter((item) => item.isWithin24h)
      .sort((a, b) => a.diffMs - b.diffMs);

    return guardShifts[0] || null;
  }, [scheduledShifts, activeGuard.id, alertPreferences.upcomingShift24hReminder, alertPreferences.upcomingReminderLeadHours, nowTime]);

  // Request browser notification permission if enabled and supported
  useEffect(() => {
    if (
      upcomingShiftMatch &&
      !hasPromptedBrowserPush &&
      typeof window !== 'undefined' &&
      'Notification' in window
    ) {
      if (Notification.permission === 'granted') {
        try {
          const shift = upcomingShiftMatch.shift;
          const startsInText = upcomingShiftMatch.diffHours > 1 
            ? `starts in ${Math.round(upcomingShiftMatch.diffHours)} hours` 
            : `starts shortly (${shift.startTime})`;
          
          // Only show once per session
          const notificationKey = `notified_shift_${shift.id}_${shift.date}`;
          if (!sessionStorage.getItem(notificationKey)) {
            new Notification(`🔔 Shift Reminder: ${shift.siteName}`, {
              body: `Your scheduled shift (${shift.startTime} - ${shift.endTime}) ${startsInText}. Please confirm attendance.`,
              icon: '/favicon.ico'
            });
            sessionStorage.setItem(notificationKey, 'true');
          }
        } catch (e) {
          console.warn('Browser push notification error:', e);
        }
      }
      setHasPromptedBrowserPush(true);
    }
  }, [upcomingShiftMatch, hasPromptedBrowserPush]);

  if (!upcomingShiftMatch) return null;

  // Check if snoozed
  if (isDismissed || (snoozedUntil && Date.now() < snoozedUntil)) {
    return null;
  }

  const { shift, diffHours, diffMs } = upcomingShiftMatch;

  // Format countdown
  const hoursLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const minsLeft = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
  const isStartingVerySoon = diffHours <= 2;
  const isPastStart = diffHours < 0;

  const countdownText = isPastStart
    ? 'Report Time Reached (Ready to Clock In)'
    : hoursLeft > 0
    ? `Starts in ${hoursLeft}h ${minsLeft}m`
    : `Starts in ${minsLeft} minutes!`;

  const handleConfirmAttendance = (e: React.MouseEvent) => {
    e.stopPropagation();
    confirmShiftAttendance(shift.id);
  };

  const handleSnooze = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSnoozedUntil(Date.now() + 2 * 60 * 60 * 1000); // 2 hours snooze
    showToast('Reminder Snoozed', 'Will alert again in 2 hours.', 'info');
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
  };

  const handleEnablePush = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          showToast('Push Notifications Enabled', 'You will receive 24h pre-shift duty alerts.', 'success');
          try {
            new Notification(`🔔 Duty Alert Active`, {
              body: `Shift at ${shift.siteName} confirmed for ${shift.date} (${shift.startTime}).`,
              icon: '/favicon.ico'
            });
          } catch {}
        } else {
          showToast('Push Alerts Disabled', 'Browser notification permission was denied.', 'warning');
        }
      });
    }
  };

  return (
    <>
      <aside
        aria-label="24-Hour Pre-Shift Duty Reminder"
        className="relative mb-3 overflow-hidden rounded-2xl border-2 border-blue-600/80 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white shadow-xl shadow-blue-950/40 transition-all animate-fadeIn"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-blue-500/40 bg-blue-600/20 px-3.5 py-2 text-blue-200">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500"></span>
            </span>
            <div className="flex items-center gap-1.5 font-mono text-xs font-black uppercase tracking-wider text-blue-300">
              <Bell className="h-4 w-4 text-blue-400 fill-blue-400/30" />
              <span>24-Hour Pre-Shift Duty Push Alert</span>
            </div>
            <span className="rounded bg-blue-400/20 px-2 py-0.5 text-[10px] font-extrabold text-blue-300 border border-blue-400/40 font-mono">
              {countdownText}
            </span>
          </div>

          {/* Top Controls: Snooze / Dismiss */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={handleSnooze}
              title="Snooze 2 hours"
              className="px-2 py-0.5 text-[10px] font-bold text-blue-300 hover:text-white rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Snooze 2h
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss alert"
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  <span>{shift.siteName}</span>
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-900/80 text-blue-300 border border-blue-700/60 font-mono">
                  {shift.postRole}
                </span>
                {shift.attendanceConfirmed && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-500/60 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    Attendance Confirmed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-300 font-mono flex-wrap">
                <span className="flex items-center gap-1 text-blue-300 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  {shift.date}
                </span>
                <span className="flex items-center gap-1 font-bold">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  {shift.startTime} – {shift.endTime} ({shift.hours || 8}h Shift)
                </span>
                {shift.siteAddress && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {shift.siteAddress}
                  </span>
                )}
              </div>
            </div>

            {/* Attendance Status Badge / Clock in readiness */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {!shift.attendanceConfirmed ? (
                <button
                  id="btn-confirm-attendance"
                  onClick={handleConfirmAttendance}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-400/40 animate-bounce"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Confirm Attendance (I'll Be There)</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Acknowledged & Ready for Duty</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-900/60 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowDetailModal(true)}
                className="text-blue-300 hover:text-white font-bold flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-blue-400/30 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Post Orders & Instructions</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTradeModalOpen(true)}
                className="text-amber-300 hover:text-amber-100 font-bold flex items-center gap-1 bg-amber-950/40 hover:bg-amber-900/50 px-2.5 py-1 rounded-lg border border-amber-500/40 transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>Need Relief? Post Swap</span>
              </button>

              {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="text-cyan-300 hover:text-cyan-100 font-bold flex items-center gap-1 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/40 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Enable Browser Push</span>
                </button>
              )}
            </div>

            {onNavigateToDuty && (
              <button
                type="button"
                onClick={onNavigateToDuty}
                className="text-blue-300 hover:text-blue-100 font-bold flex items-center gap-1 ml-auto cursor-pointer"
              >
                <span>Go to Duty Terminal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Post Briefing Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-6 animate-fadeIn text-slate-100 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Pre-Shift Briefing: {shift.siteName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {shift.date} • {shift.startTime} - {shift.endTime} ({shift.hours}h)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Post Assignment & Role
                </span>
                <div className="text-sm font-bold text-white">{shift.postRole}</div>
                {shift.siteAddress && (
                  <div className="text-slate-300 flex items-center gap-1 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>{shift.siteAddress}</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Standing Orders & Protocol
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {shift.postInstructions ||
                    'Report to security dispatch 10 minutes prior to shift start for equipment issuance (Radio, bodycam, site keys). Perform initial perimeter check upon clock-in.'}
                </p>
              </div>

              {shift.equipmentIssued && shift.equipmentIssued.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Required Gear & Equipment
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {shift.equipmentIssued.map((eq, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800 text-[11px] font-mono"
                      >
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attendance Confirmation in Modal */}
              <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-800/80 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-white block">Attendance Acknowledgment</span>
                  <span className="text-[11px] text-blue-300">
                    {shift.attendanceConfirmed
                      ? `Confirmed on ${shift.attendanceConfirmedAt ? new Date(shift.attendanceConfirmedAt).toLocaleTimeString() : 'Today'}`
                      : 'Notify dispatch that you are ready for this assignment.'}
                  </span>
                </div>
                {!shift.attendanceConfirmed ? (
                  <button
                    onClick={(e) => {
                      handleConfirmAttendance(e);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    Confirm Now
                  </button>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                    <Check className="w-4 h-4" /> Confirmed
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <a
                href={`tel:${opsPhone}`}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>Contact Dispatch ({opsPhone})</span>
              </a>

              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade/Swap modal if requested */}
      {isTradeModalOpen && (
        <PostShiftModal
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          defaultShiftDate={shift.date}
          defaultSiteName={shift.siteName}
          defaultStartTime={shift.startTime}
          defaultEndTime={shift.endTime}
        />
      )}
    </>
  );
};
