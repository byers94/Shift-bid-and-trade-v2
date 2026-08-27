import React from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  AlertTriangle, 
  Clock, 
  PhoneCall, 
  Building2, 
  User, 
  CheckCheck, 
  X, 
  ArrowRightLeft, 
  Radio, 
  ShieldAlert,
  Volume2
} from 'lucide-react';

interface LateShiftAlertModalProps {
  onReassignShift?: (shiftId: string) => void;
}

export const LateShiftAlertModal: React.FC<LateShiftAlertModalProps> = ({ onReassignShift }) => {
  const { lateShiftAlerts, acknowledgeLateAlert, opsPhone } = useShiftOps();

  // Find unacknowledged alerts
  const unacknowledgedAlerts = lateShiftAlerts.filter((a) => !a.acknowledged);

  if (unacknowledgedAlerts.length === 0) return null;

  return (
    <div 
      id="ops-late-shift-alert-overlay" 
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-4 duration-300 space-y-2 pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      {unacknowledgedAlerts.map((alert) => (
        <div 
          key={alert.id}
          className="bg-gradient-to-br from-rose-950 via-slate-900 to-rose-950 border-2 border-rose-500 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-md ring-2 ring-rose-500/40"
        >
          {/* Top Title */}
          <div className="flex items-start justify-between gap-2 border-b border-rose-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-600 rounded-xl shadow animate-bounce text-white">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded-full border border-rose-300">
                    ⚠️ OVERDUE SHIFT CLOCK-IN
                  </span>
                  <span className="text-[10px] font-mono text-rose-300 font-bold">
                    +{alert.minutesLate}m Late
                  </span>
                </div>
                <h4 className="text-xs font-black text-white mt-0.5">
                  {alert.guardName} ({alert.guardBadge})
                </h4>
              </div>
            </div>

            <button
              onClick={() => acknowledgeLateAlert(alert.shiftId, 'Dismissed from popup banner')}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Acknowledge Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details */}
          <div className="py-2.5 space-y-2 text-xs">
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-rose-900/60 space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[10px] font-bold uppercase text-slate-400">Scheduled Facility</span>
                <span className="font-bold text-blue-300 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-blue-400" />
                  {alert.siteName}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                <span className="text-[10px] font-sans font-bold uppercase text-slate-400">Shift Time</span>
                <span className="text-amber-300 font-bold">
                  {alert.scheduledStartTime} ({alert.minutesLate} min overdue)
                </span>
              </div>
            </div>

            <p className="text-[11px] text-rose-200">
              Officer has exceeded the 15-minute grace period without checking in or marking arrival.
            </p>
          </div>

          {/* Quick Action Footer */}
          <div className="pt-2 border-t border-rose-800/80 flex items-center justify-between gap-2">
            <a
              href={`tel:${alert.guardPhone}`}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Call Officer</span>
            </a>

            <div className="flex items-center gap-1.5">
              {onReassignShift && (
                <button
                  onClick={() => onReassignShift(alert.shiftId)}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Reassign</span>
                </button>
              )}

              <button
                onClick={() => acknowledgeLateAlert(alert.shiftId, 'Acknowledged by Ops Dispatcher')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Acknowledge</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
