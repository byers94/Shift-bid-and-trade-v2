import React from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  AlertTriangle, 
  Coffee, 
  PhoneCall, 
  Building2, 
  User, 
  Check, 
  X, 
  Radio, 
  ShieldAlert,
  Clock,
  Volume2
} from 'lucide-react';
import { playLateBreakAdminAlertSound } from '../../utils/audioAlert';

export interface LateBreakAlertModalProps {
  onConfigureBreakPolicy?: () => void;
}

export const LateBreakAlertModal: React.FC<LateBreakAlertModalProps> = ({
  onConfigureBreakPolicy
}) => {
  const { lateBreakAlerts, acknowledgeLateBreakAlert, dismissLateBreakAlert, opsPhone } = useShiftOps();

  // Find unacknowledged late break alerts
  const unacknowledgedAlerts = lateBreakAlerts.filter((a) => !a.acknowledged);

  if (unacknowledgedAlerts.length === 0) return null;

  return (
    <div 
      id="ops-late-break-alert-overlay" 
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-4 duration-300 space-y-3 pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      {unacknowledgedAlerts.map((alert) => (
        <div 
          key={alert.id}
          className="bg-gradient-to-br from-rose-950 via-slate-900 to-amber-950 border-2 border-rose-500 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-md ring-2 ring-rose-500/50"
        >
          {/* Header Title */}
          <div className="flex items-start justify-between gap-2 border-b border-rose-800/80 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-600 rounded-xl shadow-md animate-bounce text-white">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded-full border border-rose-300">
                    🚨 OVERDUE BREAK RETURN
                  </span>
                  <span className="text-[10px] font-mono text-rose-300 font-black bg-rose-900/80 px-2 py-0.5 rounded-full">
                    +{alert.minutesLate}m Overdue
                  </span>
                </div>
                <h4 className="text-xs font-black text-white mt-1">
                  Officer {alert.guardName} ({alert.guardBadge})
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => playLateBreakAdminAlertSound()}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Replay Alert Tone"
              >
                <Volume2 className="w-4 h-4 text-amber-400" />
              </button>
              <button
                type="button"
                onClick={() => dismissLateBreakAlert(alert.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Dismiss from Banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Alert Body Details */}
          <div className="py-2.5 space-y-2 text-xs">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-rose-900/60 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[10px] font-bold uppercase text-slate-400">Post Facility</span>
                <span className="font-bold text-blue-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  {alert.siteName}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[10px] font-bold uppercase text-slate-400">Break Type</span>
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5 text-amber-400" />
                  {alert.breakType === 'meal' ? `${alert.allocatedMinutes}-min Meal Break` : '10-min Rest Break'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                <span className="text-[10px] font-sans font-bold uppercase text-slate-400">Time Overdue</span>
                <span className="text-rose-400 font-black">
                  Exceeded by +{alert.minutesLate} minutes (&gt; 5 min grace limit)
                </span>
              </div>
            </div>

            <p className="text-[11px] text-rose-200 leading-tight">
              Officer has not clocked back from their {alert.breakType === 'meal' ? 'meal' : '10-min rest'} break and is more than 5 minutes late returning to their post.
            </p>
          </div>

          {/* Quick Action Footer */}
          <div className="pt-2 border-t border-rose-800/80 flex items-center justify-between gap-2">
            <a
              href={`tel:${alert.guardPhone}`}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call Guard</span>
            </a>

            <button
              type="button"
              onClick={() => acknowledgeLateBreakAlert(alert.id, 'Dispatcher confirmed officer contacted')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Acknowledge</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
