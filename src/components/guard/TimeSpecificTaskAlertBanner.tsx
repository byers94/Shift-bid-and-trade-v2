import React, { useState } from 'react';
import { 
  BellRing, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Sparkles, 
  Lock, 
  Unlock, 
  Building2, 
  CheckSquare, 
  Camera, 
  FileText,
  Radio,
  Eye,
  RotateCcw
} from 'lucide-react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { TimeSpecificTask } from '../../types/shift';

export const TimeSpecificTaskAlertBanner: React.FC = () => {
  const { 
    activeTaskAlert, 
    dismissTaskAlert, 
    acknowledgeTaskAlert, 
    completeTimeSpecificTask, 
    activeGuard,
    sitesList 
  } = useShiftOps();

  const [isCompletingModalOpen, setIsCompletingModalOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!activeTaskAlert) {
    return null;
  }

  const { task, alertType, siteName } = activeTaskAlert;

  const isOverdue = alertType === 'overdue';
  const isDueNow = alertType === 'due_now';

  const handleAcknowledge = () => {
    acknowledgeTaskAlert(activeTaskAlert.id, activeGuard.id);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissTaskAlert();
  };

  const handleOpenCompletion = () => {
    setCompletionNotes(
      task.category === 'amenity_lock' || task.category === 'facility_closure' 
        ? `${task.title} verified and locked. Perimeter clear.`
        : `${task.title} executed per post orders.`
    );
    setIsCompletingModalOpen(true);
  };

  const handleSubmitCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      completeTimeSpecificTask(task.id, task.siteId, activeGuard, {
        notes: completionNotes || `${task.title} completed on schedule.`,
        status: 'completed'
      });
      setIsCompletingModalOpen(false);
      dismissTaskAlert();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickComplete = () => {
    completeTimeSpecificTask(task.id, task.siteId, activeGuard, {
      notes: `Quick completed from duty alert terminal. Verified locked/secured.`,
      status: 'completed'
    });
    dismissTaskAlert();
  };

  return (
    <>
      <section 
        aria-label="Time Specific Task Notification"
        className={`relative mb-3 overflow-hidden rounded-2xl border-2 shadow-2xl transition-all animate-fadeIn ${
          isOverdue
            ? 'border-rose-500 bg-gradient-to-br from-rose-950 via-slate-900 to-rose-950 text-white shadow-rose-950/50'
            : isDueNow
            ? 'border-amber-500 bg-gradient-to-br from-amber-950 via-slate-900 to-amber-950/80 text-white shadow-amber-950/40'
            : 'border-cyan-500 bg-gradient-to-br from-cyan-950 via-slate-900 to-blue-950 text-white shadow-cyan-950/30'
        }`}
      >
        {/* Header Alert Bar */}
        <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
          isOverdue 
            ? 'bg-rose-600/30 border-rose-500/50 text-rose-200' 
            : isDueNow 
            ? 'bg-amber-500/30 border-amber-500/50 text-amber-200' 
            : 'bg-cyan-500/30 border-cyan-500/50 text-cyan-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3.5 w-3.5">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isOverdue ? 'bg-rose-400 animate-ping' : 'bg-amber-400 animate-ping'
              }`} />
              <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${
                isOverdue ? 'bg-rose-500' : 'bg-amber-500'
              }`} />
            </span>
            <div className="flex items-center gap-1.5 font-mono text-xs font-black uppercase tracking-wider">
              <BellRing className={`w-4 h-4 ${
                isOverdue ? 'text-rose-400 animate-bounce' : isDueNow ? 'text-amber-400 animate-pulse' : 'text-cyan-400'
              }`} />
              <span>
                {isOverdue 
                  ? '⚠️ OVERDUE SCHEDULED TASK / LOCKOUT' 
                  : isDueNow 
                  ? '⏰ TIME-SPECIFIC TASK DUE NOW' 
                  : '🕒 UPCOMING SCHEDULED TASK'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAcknowledge}
              className="px-2.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700 cursor-pointer"
            >
              Acknowledge
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              title="Dismiss alert"
              className="rounded p-1 text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              aria-label="Dismiss task notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono ${
                  task.priority === 'mandatory_sla' || task.priority === 'priority'
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-500 text-slate-950 font-bold'
                }`}>
                  {task.category.replace(/_/g, ' ')}
                </span>

                <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-white bg-slate-900/90 px-2.5 py-0.5 rounded border border-slate-700">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Scheduled Time: {task.scheduledTime}</span>
                </span>

                {task.locationZone && (
                  <span className="text-[10px] bg-blue-900/60 text-blue-200 border border-blue-700/60 px-2 py-0.5 rounded font-mono">
                    📍 {task.locationZone}
                  </span>
                )}
              </div>

              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                {task.category === 'amenity_lock' || task.category === 'facility_closure' ? (
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
                <span>{task.title}</span>
              </h3>

              <p className="text-xs text-slate-300 font-mono flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{siteName || task.siteId}</span>
              </p>

              {task.instructions && (
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                    Post Orders / SOP Instructions:
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {task.instructions}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex sm:flex-col items-center sm:items-stretch gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <button
                type="button"
                onClick={handleOpenCompletion}
                className="flex-1 sm:flex-initial py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Log & Mark Completed</span>
              </button>

              <button
                type="button"
                onClick={handleQuickComplete}
                className="flex-1 sm:flex-initial py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>1-Click Complete</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* COMPLETE TASK MODAL */}
      {isCompletingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-4 space-y-4 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase">Log Task Completion</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {task.title} • {siteName}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCompletingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCompletion} className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheduled Time:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{task.scheduledTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Logging Officer:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeGuard.name} (#{activeGuard.badgeNumber})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location Zone:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{task.locationZone || 'Facility Post'}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Officer Action Log & SOP Confirmation
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Pool gates secured, deadbolt engaged, lights turned off, verified no patrons remaining inside."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Timestamp and digital badge watermark will be recorded to the client dispatch audit trail.</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompletingModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Logging...' : 'Confirm & Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
