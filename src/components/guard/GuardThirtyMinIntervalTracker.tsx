import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Wrench, 
  ShieldAlert, 
  Sparkles,
  Camera,
  ChevronRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { StandardShiftReport, GuardProfile, ScheduledShift } from '../../types/shift';

interface GuardThirtyMinIntervalTrackerProps {
  guard: GuardProfile;
  activeShift?: ScheduledShift;
  lastActivityReport?: StandardShiftReport;
  onOpenReportModal: (type: 'activity' | 'maintenance' | 'incident') => void;
}

export const GuardThirtyMinIntervalTracker: React.FC<GuardThirtyMinIntervalTrackerProps> = ({
  guard,
  activeShift,
  lastActivityReport,
  onOpenReportModal
}) => {
  const [minutesSinceCheckin, setMinutesSinceCheckin] = useState<number>(0);
  const [intervalProgressPct, setIntervalProgressPct] = useState<number>(0);

  useEffect(() => {
    const updateInterval = () => {
      let referenceTime = Date.now();
      if (lastActivityReport) {
        referenceTime = new Date(lastActivityReport.timestamp).getTime();
      } else if (activeShift?.clockInTime) {
        referenceTime = new Date(activeShift.clockInTime).getTime();
      } else {
        // Fallback to 15 mins ago
        referenceTime = Date.now() - 15 * 60 * 1000;
      }

      const diffMs = Math.max(0, Date.now() - referenceTime);
      const diffMins = Math.floor(diffMs / (1000 * 60));
      setMinutesSinceCheckin(diffMins);

      // 30-minute scale: 0 to 30 mins (can exceed 100% if overdue)
      const pct = Math.min(100, Math.round((diffMins / 30) * 100));
      setIntervalProgressPct(pct);
    };

    updateInterval();
    const interval = setInterval(updateInterval, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [lastActivityReport, activeShift]);

  const isOverdue = minutesSinceCheckin >= 30;
  const isDueSoon = minutesSinceCheckin >= 22 && minutesSinceCheckin < 30;

  return (
    <div 
      id="guard-30min-interval-tracker-card" 
      className={`rounded-2xl border transition-all p-4 ${
        isOverdue
          ? 'bg-red-950/40 border-red-500/80 shadow-lg shadow-red-950/40 ring-1 ring-red-500/50'
          : isDueSoon
            ? 'bg-amber-950/30 border-amber-500/70 shadow-lg shadow-amber-950/30'
            : 'bg-slate-900/90 border-slate-800 shadow-md'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            isOverdue
              ? 'bg-red-600/30 text-red-400 border border-red-500/50 animate-pulse'
              : isDueSoon
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
          }`}>
            <Clock className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                30-Minute Routine Patrol Check-In
              </h3>
              {isOverdue ? (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-red-600 text-white tracking-wider animate-pulse">
                  Overdue ({minutesSinceCheckin - 30}m)
                </span>
              ) : isDueSoon ? (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-600/30 text-amber-300 border border-amber-500/40">
                  Due Soon ({30 - minutesSinceCheckin}m Left)
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Compliant
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lastActivityReport ? (
                <>Last check-in: <span className="text-slate-200 font-medium">{new Date(lastActivityReport.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> ({lastActivityReport.activityDetails?.zoneChecked})</>
              ) : (
                <>Shift active • First interval patrol check-in required</>
              )}
            </p>
          </div>
        </div>

        {/* Quick Check-in CTA Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="quick-30min-checkin-cta-btn"
            onClick={() => onOpenReportModal('activity')}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
              isOverdue
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/40 animate-pulse'
                : isDueSoon
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>⚡ Quick 30-Min Patrol Check-in</span>
          </button>
        </div>
      </div>

      {/* 30-Minute Visual Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400">
            Elapsed: <span className={isOverdue ? 'text-red-400 font-bold' : isDueSoon ? 'text-amber-300 font-bold' : 'text-slate-200 font-bold'}>{minutesSinceCheckin}m</span> / 30m target
          </span>
          <span className={isOverdue ? 'text-red-400 font-bold' : isDueSoon ? 'text-amber-300' : 'text-slate-400'}>
            {isOverdue ? `${minutesSinceCheckin - 30}m past SLA` : `${30 - minutesSinceCheckin}m remaining`}
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/80">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isOverdue
                ? 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
                : isDueSoon
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-blue-500 to-emerald-500'
            }`}
            style={{ width: `${intervalProgressPct}%` }}
          ></div>
        </div>
      </div>

      {/* Quick Action Dock for All 3 Standard Report Types */}
      <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-slate-800/80">
        <button
          type="button"
          id="btn-open-activity-report"
          onClick={() => onOpenReportModal('activity')}
          className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 text-left transition-all hover:border-blue-500/50 group"
        >
          <div className="flex items-center gap-1.5 text-blue-400 mb-0.5">
            <FileText className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">Activity (DAR)</span>
          </div>
          <p className="text-[10px] text-slate-400 group-hover:text-slate-300 truncate">
            Routine 30m Patrol Log
          </p>
        </button>

        <button
          type="button"
          id="btn-open-maintenance-report"
          onClick={() => onOpenReportModal('maintenance')}
          className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 text-left transition-all hover:border-amber-500/50 group"
        >
          <div className="flex items-center gap-1.5 text-amber-400 mb-0.5">
            <Wrench className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">Maintenance</span>
          </div>
          <p className="text-[10px] text-slate-400 group-hover:text-slate-300 truncate">
            Facility Hazard / Work Order
          </p>
        </button>

        <button
          type="button"
          id="btn-open-incident-report"
          onClick={() => onOpenReportModal('incident')}
          className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 text-left transition-all hover:border-orange-500/50 group"
        >
          <div className="flex items-center gap-1.5 text-orange-400 mb-0.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">Incident / 911</span>
          </div>
          <p className="text-[10px] text-slate-400 group-hover:text-slate-300 truncate">
            Guard Action & Escalation
          </p>
        </button>
      </div>
    </div>
  );
};
