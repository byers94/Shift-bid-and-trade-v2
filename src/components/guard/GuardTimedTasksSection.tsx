import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  CheckSquare, 
  Sparkles, 
  FileText, 
  MapPin, 
  BellRing, 
  ChevronRight,
  RotateCcw,
  Zap,
  Info
} from 'lucide-react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { TimeSpecificTask, TaskCompletionLog } from '../../types/shift';

interface GuardTimedTasksSectionProps {
  currentSiteName?: string;
  isRoverGuard?: boolean;
}

export const GuardTimedTasksSection: React.FC<GuardTimedTasksSectionProps> = ({
  currentSiteName,
  isRoverGuard
}) => {
  const { 
    sitesList, 
    activeGuard, 
    completeTimeSpecificTask, 
    taskCompletionLogs, 
    triggerTestTaskAlert,
    getTaskCompletionStatus,
    showToast 
  } = useShiftOps();

  const [completingTask, setCompletingTask] = useState<{ task: TimeSpecificTask; siteName: string } | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'completed'>('all');

  // Find tasks: if clocked into a site, show tasks for that site. If rover, aggregate tasks across all sites in their sector.
  const activeSite = currentSiteName ? sitesList.find(s => s.name === currentSiteName) : undefined;
  
  const relevantTasksWithSite: { task: TimeSpecificTask; siteName: string; siteId: string }[] = [];

  if (activeSite && activeSite.timeSpecificTasks && activeSite.timeSpecificTasks.length > 0) {
    activeSite.timeSpecificTasks.forEach(task => {
      relevantTasksWithSite.push({
        task,
        siteName: activeSite.name,
        siteId: activeSite.id
      });
    });
  } else {
    // Show tasks across all assigned/OJT sites or all sites with tasks
    sitesList.forEach(site => {
      if (site.timeSpecificTasks && site.timeSpecificTasks.length > 0) {
        site.timeSpecificTasks.forEach(task => {
          relevantTasksWithSite.push({
            task,
            siteName: site.name,
            siteId: site.id
          });
        });
      }
    });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentTimeStr = new Date().toTimeString().slice(0, 5);

  const getTaskStatus = (task: TimeSpecificTask): { status: 'completed' | 'due_now' | 'approaching' | 'pending'; completion?: TaskCompletionLog; diffMinutes: number } => {
    const completion = getTaskCompletionStatus(task.id, todayStr);
    if (completion) {
      return { status: 'completed', completion, diffMinutes: 0 };
    }

    const [tH, tM] = task.scheduledTime.split(':').map(Number);
    const [cH, cM] = currentTimeStr.split(':').map(Number);
    const taskMinutes = tH * 60 + tM;
    const currentMinutes = cH * 60 + cM;
    const diff = taskMinutes - currentMinutes;

    if (diff <= 0 && diff >= -120) {
      return { status: 'due_now', diffMinutes: diff };
    } else if (diff > 0 && diff <= (task.leadTimeMinutes || 15)) {
      return { status: 'approaching', diffMinutes: diff };
    } else {
      return { status: 'pending', diffMinutes: diff };
    }
  };

  const filteredTasks = relevantTasksWithSite.filter(({ task }) => {
    const { status } = getTaskStatus(task);
    if (filterType === 'pending') return status !== 'completed';
    if (filterType === 'completed') return status === 'completed';
    return true;
  });

  const handleOpenCompleteModal = (task: TimeSpecificTask, siteName: string) => {
    setCompletingTask({ task, siteName });
    setCompletionNotes(
      task.category === 'amenity_lock' || task.category === 'facility_closure'
        ? `${task.title} verified and locked. Perimeter clear.`
        : `${task.title} executed per post orders.`
    );
  };

  const handleExecuteCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;
    setIsSubmitting(true);
    try {
      completeTimeSpecificTask(completingTask.task.id, completingTask.task.siteId, activeGuard, {
        notes: completionNotes || `${completingTask.task.title} completed on schedule.`,
        status: 'completed'
      });
      showToast('Task Completed', `${completingTask.task.title} logged to post audit trail.`, 'success');
      setCompletingTask(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickMarkComplete = (task: TimeSpecificTask, siteName: string) => {
    completeTimeSpecificTask(task.id, task.siteId, activeGuard, {
      notes: `Quick completed by ${activeGuard.name}. Verified locked/secured.`,
      status: 'completed'
    });
    showToast('Task Completed', `${task.title} completed.`, 'success');
  };

  if (relevantTasksWithSite.length === 0) {
    return (
      <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 text-white space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold flex items-center gap-1.5 text-slate-300">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>Time-Specific Tasks & Amenity Lockouts</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">0 Scheduled</span>
        </div>
        <p className="text-[11px] text-slate-400">
          No time-specific tasks (e.g. pool locks, laundry closures) are currently defined for this post. Add time-specific tasks in the Ops Site Directory under Post Orders.
        </p>
      </div>
    );
  }

  const completedCount = relevantTasksWithSite.filter(({ task }) => getTaskStatus(task).status === 'completed').length;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 border border-cyan-500/30 shadow-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
              <span>Time-Specific Post Tasks & Amenity Lockouts</span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-2 py-0.2 rounded font-mono">
                {completedCount}/{relevantTasksWithSite.length} Done
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 font-mono">
              Scheduled locks, amenity closures & time-sensitive SOPs
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'all' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({relevantTasksWithSite.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('pending')}
            className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'pending' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending ({relevantTasksWithSite.length - completedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('completed')}
            className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'completed' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Done ({completedCount})
          </button>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-2">
        {filteredTasks.map(({ task, siteName, siteId }) => {
          const { status, completion } = getTaskStatus(task);
          const isCompleted = status === 'completed';
          const isDueNow = status === 'due_now';
          const isApproaching = status === 'approaching';

          return (
            <div
              key={task.id}
              className={`p-3 rounded-xl border transition-all ${
                isCompleted
                  ? 'bg-slate-950/70 border-emerald-500/40 text-slate-300'
                  : isDueNow
                  ? 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/40 border-amber-500 shadow-md animate-pulse'
                  : isApproaching
                  ? 'bg-slate-950 border-cyan-500/60 shadow-xs'
                  : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    isCompleted 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/50' 
                      : isDueNow 
                      ? 'bg-amber-950 text-amber-400 border border-amber-500/80' 
                      : 'bg-slate-800 text-cyan-300 border border-slate-700'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : task.category === 'amenity_lock' || task.category === 'facility_closure' ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.2 rounded font-mono ${
                        isCompleted
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isDueNow
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      }`}>
                        {isCompleted ? '✓ COMPLETED' : isDueNow ? '⚠️ DUE NOW' : `${task.scheduledTime} DAILY`}
                      </span>

                      <span className="text-[10px] font-mono text-slate-400">
                        {task.category.replace(/_/g, ' ')}
                      </span>

                      {task.locationZone && (
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                          📍 {task.locationZone}
                        </span>
                      )}
                    </div>

                    <h5 className={`text-xs font-black tracking-tight truncate ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                      {task.title}
                    </h5>

                    <p className="text-[10px] text-slate-400 font-mono truncate flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{siteName}</span>
                    </p>

                    {task.instructions && (
                      <p className="text-[11px] text-slate-300 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/80 mt-1 line-clamp-2">
                        {task.instructions}
                      </p>
                    )}

                    {isCompleted && completion && (
                      <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 pt-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Logged by {completion.guardName} at {new Date(completion.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side actions */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="text-right font-mono text-xs">
                    <span className="font-black text-amber-300 block">{task.scheduledTime}</span>
                    <span className="text-[9px] text-slate-500">Alert lead: {task.leadTimeMinutes || 15}m</span>
                  </div>

                  {!isCompleted ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => triggerTestTaskAlert(task, 'due_now')}
                        title="Simulate Guard Notification Alert Chime & Pop-up"
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[10px] font-bold border border-slate-700 cursor-pointer flex items-center gap-1"
                      >
                        <BellRing className="w-3 h-3 text-amber-400" />
                        <span className="hidden sm:inline">Test Alert</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCompleteModal(task, siteName)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
                      >
                        <CheckSquare className="w-3 h-3" />
                        <span>Complete</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleQuickMarkComplete(task, siteName)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                      title="Re-verify or update task log"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Re-log</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* COMPLETE MODAL */}
      {completingTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-4 space-y-3.5 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase">Log SOP Execution</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {completingTask.task.title} • {completingTask.siteName}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setCompletingTask(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteCompletion} className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheduled Time:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{completingTask.task.scheduledTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Officer Badge:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeGuard.name} (#{activeGuard.badgeNumber})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location Zone:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{completingTask.task.locationZone || 'Facility Post'}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Officer Action Log / Verification Notes
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Verified doors locked, deadbolt engaged, lights turned off, area clear."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
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
                  <span>{isSubmitting ? 'Saving...' : 'Save & Log SOP'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
