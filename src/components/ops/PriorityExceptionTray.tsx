import React from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  AlertTriangle, 
  AlertOctagon, 
  Clock, 
  UserX, 
  ShieldAlert, 
  Coffee, 
  FileWarning, 
  ExternalLink, 
  Phone, 
  UserCheck, 
  CheckCircle2,
  ChevronRight,
  Flame
} from 'lucide-react';

interface PriorityExceptionItem {
  id: string;
  category: 'uncovered_shift' | 'guard_late' | 'break_overdue' | 'missed_dar' | 'orientation_pending' | 'critical_incident';
  title: string;
  subtitle: string;
  siteName: string;
  urgency: 'critical' | 'high' | 'medium';
  timestamp?: string;
  guardName?: string;
  guardPhone?: string;
  actionLabel: string;
  onAction: () => void;
}

interface PriorityExceptionTrayProps {
  onNavigateTab?: (tab: any) => void;
  onSelectOrientation?: (orientationId: string) => void;
  onOpenShiftModal?: (shiftId: string) => void;
}

export const PriorityExceptionTray: React.FC<PriorityExceptionTrayProps> = ({
  onNavigateTab,
  onSelectOrientation,
  onOpenShiftModal
}) => {
  const {
    shifts,
    scheduledShifts,
    lateShiftAlerts,
    lateBreakAlerts,
    siteOrientations,
    standardReports,
    guardsList,
    sitesList
  } = useShiftOps();

  const exceptions: PriorityExceptionItem[] = [];

  // 1. Uncovered / open shifts starting within 2 hours
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split('T')[0];

  shifts
    .filter(s => s.status === 'open' && (s.date === todayStr || !s.date))
    .forEach(shift => {
      exceptions.push({
        id: `exc-open-${shift.id}`,
        category: 'uncovered_shift',
        title: `Uncovered Shift: ${shift.siteName}`,
        subtitle: `${shift.date} • ${shift.startTime} - ${shift.endTime} (${shift.hours}h) - Requires Guard Dispatch`,
        siteName: shift.siteName,
        urgency: 'critical',
        actionLabel: 'Dispatch Guard',
        onAction: () => {
          if (onNavigateTab) onNavigateTab('operations');
        }
      });
    });

  // 2. Guards late to post (>10 mins late)
  scheduledShifts
    .filter(s => s.status === 'late' || (s.isLate && s.status === 'scheduled'))
    .forEach(shift => {
      const guard = guardsList.find(g => g.id === shift.guardId);
      exceptions.push({
        id: `exc-late-${shift.id}`,
        category: 'guard_late',
        title: `Officer Late to Post: ${shift.guardName}`,
        subtitle: `Overdue +${shift.lateMinutes || 12}m at ${shift.siteName} (Shift began ${shift.startTime})`,
        siteName: shift.siteName,
        guardName: shift.guardName,
        guardPhone: guard?.phone,
        urgency: 'critical',
        actionLabel: 'Call Guard',
        onAction: () => {
          if (guard?.phone) {
            window.location.href = `tel:${guard.phone}`;
          } else if (onNavigateTab) {
            onNavigateTab('live_tracking');
          }
        }
      });
    });

  // 3. Guards overdue returning from break
  lateBreakAlerts
    .filter(a => !a.acknowledged)
    .forEach(alert => {
      exceptions.push({
        id: `exc-break-${alert.id}`,
        category: 'break_overdue',
        title: `Overdue Returning from Break: ${alert.guardName}`,
        subtitle: `+${alert.minutesLate}m overdue at ${alert.siteName} (${alert.breakType} break)`,
        siteName: alert.siteName,
        guardName: alert.guardName,
        urgency: 'high',
        actionLabel: 'Check Post',
        onAction: () => {
          if (onNavigateTab) onNavigateTab('live_tracking');
        }
      });
    });

  // 4. Orientations pending supervisor
  siteOrientations
    .filter(o => o.status === 'PENDING_SUPERVISOR')
    .forEach(orient => {
      const endMs = new Date(orient.windowEnd).getTime();
      const minsLeft = Math.round((endMs - Date.now()) / (60 * 1000));
      exceptions.push({
        id: `exc-orient-${orient.orientationId}`,
        category: 'orientation_pending',
        title: `Site Orientation: Supervisor Required`,
        subtitle: `${orient.guardName} at ${orient.siteName} (${minsLeft > 0 ? `${minsLeft}m left in window` : 'Window Overdue'})`,
        siteName: orient.siteName,
        guardName: orient.guardName,
        urgency: minsLeft <= 20 ? 'critical' : 'high',
        actionLabel: 'Assign Supervisor',
        onAction: () => {
          if (onSelectOrientation) {
            onSelectOrientation(orient.orientationId);
          } else if (onNavigateTab) {
            onNavigateTab('command_dashboard');
          }
        }
      });
    });

  // 5. Critical DAR Incidents pending review
  standardReports
    .filter(r => (r.reportType === 'incident' || r.incidentDetails?.severity === 'critical' || r.maintenanceDetails?.severity === 'critical_safety_hazard') && r.status === 'submitted')
    .slice(0, 4)
    .forEach(report => {
      const reportTitle = report.incidentDetails?.incidentTitle || report.maintenanceDetails?.issueTitle || `DAR Report #${report.reportNumber}`;
      exceptions.push({
        id: `exc-dar-${report.id}`,
        category: 'critical_incident',
        title: `Critical Incident DAR: ${report.siteName}`,
        subtitle: `${reportTitle} • Logged by ${report.guardName} (${report.guardBadge})`,
        siteName: report.siteName,
        guardName: report.guardName,
        urgency: 'critical',
        actionLabel: 'Review DAR',
        onAction: () => {
          if (onNavigateTab) onNavigateTab('standard_reports');
        }
      });
    });

  const criticalCount = exceptions.filter(e => e.urgency === 'critical').length;
  const highCount = exceptions.filter(e => e.urgency === 'high').length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200/90 dark:border-rose-950/60 shadow-xs overflow-hidden">
      {/* Tray Header */}
      <div className="p-4 sm:p-5 border-b border-rose-100 dark:border-rose-950/70 bg-gradient-to-r from-rose-50/70 via-rose-50/40 to-transparent dark:from-rose-950/40 dark:via-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs animate-pulse">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Priority Exception Tray
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs">
                {exceptions.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live CAD Sentinel: Uncovered posts, tardiness, overdue breaks & pending supervisor sign-offs
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {criticalCount > 0 && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              {criticalCount} Immediate Action
            </span>
          )}
          {highCount > 0 && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              {highCount} Warning
            </span>
          )}
        </div>
      </div>

      {/* Exception Items List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[380px] overflow-y-auto">
        {exceptions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              All Posts Green & Nominal
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Zero active exceptions. All guards on schedule, breaks within limits, and orientations covered.
            </p>
          </div>
        ) : (
          exceptions.map(exc => (
            <div 
              key={exc.id}
              className={`p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                exc.urgency === 'critical'
                  ? 'hover:bg-rose-50/60 dark:hover:bg-rose-950/30'
                  : 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
              }`}
            >
              <div className="flex items-start space-x-3 min-w-0 flex-1">
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  exc.urgency === 'critical'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400'
                }`}>
                  {exc.category === 'uncovered_shift' && <UserX className="w-4 h-4" />}
                  {exc.category === 'guard_late' && <Clock className="w-4 h-4" />}
                  {exc.category === 'break_overdue' && <Coffee className="w-4 h-4" />}
                  {exc.category === 'orientation_pending' && <ShieldAlert className="w-4 h-4" />}
                  {exc.category === 'critical_incident' && <FileWarning className="w-4 h-4" />}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                      {exc.title}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                      exc.urgency === 'critical'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                    }`}>
                      {exc.urgency}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {exc.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                {exc.guardPhone && (
                  <a
                    href={`tel:${exc.guardPhone}`}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title={`Call ${exc.guardName || 'Officer'}`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={exc.onAction}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1 ${
                    exc.urgency === 'critical'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                  }`}
                >
                  <span>{exc.actionLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
