import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ShiftManager } from './ShiftManager';
import { TradeApprovals } from './TradeApprovals';
import { LiveAuditTerminal } from './LiveAuditTerminal';
import { RecentAdminActionsPanel } from './RecentAdminActionsPanel';
import { UserManagementModal } from './UserManagementModal';
import { ShiftBidsModal } from './ShiftBidsModal';
import { GuardDirectory } from './GuardDirectory';
import { EmergencyBroadcastModal } from './EmergencyBroadcastModal';
import { AutoFillShiftsModal } from './AutoFillShiftsModal';
import { TopPerformersWidget } from './TopPerformersWidget';
import { SiteDirectory } from './SiteDirectory';
import { CallsForServicePanel } from './CallsForServicePanel';
import { LiveGuardRosterBoard } from './LiveGuardRosterBoard';
import { ShiftSchedulingCalendar } from './ShiftSchedulingCalendar';
import { LateShiftAlertModal } from './LateShiftAlertModal';
import { RoverRouteOptimizationPanel } from './RoverRouteOptimizationPanel';
import { SiteTaskOverview } from './SiteTaskOverview';
import { StandardReportsHub } from './StandardReportsHub';
import { SetSchedulesManager } from './SetSchedulesManager';
import { GuardAvailabilityTracker } from './GuardAvailabilityTracker';
import { CallOffQueuePanel } from './CallOffQueuePanel';
import { CoachingPerformanceDashboard } from './CoachingPerformanceDashboard';
import { 
  ShieldCheck, 
  Activity, 
  Layers, 
  FileText, 
  AlertCircle,
  Bell,
  Lock,
  LogOut,
  UserCheck,
  History,
  Users,
  Building2,
  PanelRightClose,
  PanelRightOpen,
  Zap,
  Calendar,
  Terminal,
  ArrowRightLeft,
  Radio,
  AlertOctagon,
  Volume2,
  Sparkles,
  Trophy,
  PhoneCall,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Navigation,
  CheckSquare,
  PhoneOff,
  CalendarRange,
  BarChart3
} from 'lucide-react';

interface OpsAdminViewProps {
  onLock?: () => void;
  adminName?: string;
  adminBadge?: string;
}

const STORAGE_OPS_MAIN_TAB_KEY = 'secureshift_ops_main_tab_v1';

export const OpsAdminView: React.FC<OpsAdminViewProps> = ({ 
  onLock, 
  adminName = "Lt. Mark O'Connor", 
  adminBadge = "OPS-CMD-01" 
}) => {
  const { 
    shifts, 
    trades, 
    bids, 
    callsForService, 
    recentAdminActions, 
    adminUsers, 
    guardsList, 
    sitesList, 
    activeBroadcast,
    scheduledShifts,
    shiftClaims,
    getGuardsLiveTracking,
    lateShiftAlerts,
    rovers,
    activeInterceptions,
    taskCompletionLogs,
    standardReports,
    setSchedules,
    timeOffRequests,
    callOffRecords
  } = useShiftOps();

  const [activeMainTab, setActiveMainTabState] = useState<
    'operations' | 'live_tracking' | 'rover_routing' | 'calendar_schedule' | 'set_schedules' | 'guard_availability' | 'call_off_queue' | 'calls_for_service' | 'standard_reports' | 'site_tasks' | 'site_directory' | 'guard_directory' | 'top_performers' | 'coaching_analytics' | 'audit_terminal'
  >(() => {
    try {
      const saved = localStorage.getItem(STORAGE_OPS_MAIN_TAB_KEY);
      if (
        saved === 'operations' || 
        saved === 'live_tracking' || 
        saved === 'rover_routing' || 
        saved === 'calendar_schedule' || 
        saved === 'set_schedules' ||
        saved === 'guard_availability' ||
        saved === 'call_off_queue' ||
        saved === 'calls_for_service' || 
        saved === 'standard_reports' || 
        saved === 'site_tasks' ||
        saved === 'site_directory' || 
        saved === 'guard_directory' || 
        saved === 'top_performers' || 
        saved === 'coaching_analytics' ||
        saved === 'audit_terminal'
      ) {
        return saved as any;
      }
    } catch {}
    return 'operations';
  });

  const setActiveMainTab = (tab: 'operations' | 'live_tracking' | 'rover_routing' | 'calendar_schedule' | 'set_schedules' | 'guard_availability' | 'call_off_queue' | 'calls_for_service' | 'standard_reports' | 'site_tasks' | 'site_directory' | 'guard_directory' | 'top_performers' | 'coaching_analytics' | 'audit_terminal') => {
    setActiveMainTabState(tab);
    try {
      localStorage.setItem(STORAGE_OPS_MAIN_TAB_KEY, tab);
    } catch {}
  };
  const [operationsSubTab, setOperationsSubTab] = useState<'shifts' | 'approvals' | 'actions'>('shifts');
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [userManagementTab, setUserManagementTab] = useState<'admins' | 'guards'>('admins');
  const [isBidsModalOpen, setIsBidsModalOpen] = useState(false);
  const [selectedBidsShiftId, setSelectedBidsShiftId] = useState<string | null>(null);
  const [isAutoFillModalOpen, setIsAutoFillModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [calendarTargetGuardId, setCalendarTargetGuardId] = useState<string | null>(null);

  const activeShiftsCount = shifts.filter((s) => s.status === 'open').length;
  const pendingClaimsCount = (shiftClaims || []).filter((c) => c.status === 'pending_approval').length;
  const pendingSwapsCount = trades.filter((t) => t.status === 'pending_swap').length;
  const pendingPostsCount = trades.filter((t) => t.status === 'pending_approval').length;
  const totalPendingApprovals = pendingClaimsCount + pendingSwapsCount + pendingPostsCount;
  const emergencyCount = shifts.filter((s) => s.status === 'open' && s.urgency === 'emergency').length;
  const activeBidsCount = bids.length;
  const activeCallsCount = callsForService.filter((c) => c.status !== 'cleared' && c.status !== 'cancelled').length;
  const activeBoloCount = callsForService.filter((c) => (c.isBolo || c.priority === 'urgent_bolo') && c.status !== 'cleared' && c.status !== 'cancelled').length;

  const liveGuards = getGuardsLiveTracking();
  const onDutyGuardsCount = liveGuards.filter((g) => g.currentStatus === 'on_duty' || g.currentStatus === 'on_break').length;
  const lateGuardsCount = liveGuards.filter((g) => g.currentStatus === 'late' || g.activeShift?.isLate).length;

  const allSiteTasksCount = sitesList.reduce((acc, s) => acc + (s.timeSpecificTasks?.length || 0), 0);
  const todayTaskLogsCount = (taskCompletionLogs || []).filter(l => l.completedAt?.startsWith(new Date().toISOString().slice(0, 10))).length;
  const pendingStandardReportsCount = (standardReports || []).filter(r => r.status === 'submitted').length;
  const emergencyEscalatedReportsCount = (standardReports || []).filter(r => r.reportType === 'incident' && r.incidentDetails?.escalatedToEmergencyServices).length;
  const pendingTimeOffCount = (timeOffRequests || []).filter(r => r.status === 'pending').length;
  const uncoveredCallOffsCount = (callOffRecords || []).filter(r => !r.replacementGuardName).length;
  const setSchedulesCount = (setSchedules || []).length;

  return (
    <main 
      id="ops-admin-container"
      className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-full overflow-y-auto min-h-0 transition-colors"
    >
      {/* Header matching High Density theme */}
      <header className="bg-[#1e3a8a] dark:bg-slate-950 text-white p-3 sm:p-4 lg:p-5 flex flex-col gap-3 shadow-md shrink-0 border-b dark:border-slate-800">
        {/* Top row: Title and Admin Profile / Lock */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 sm:p-2 bg-blue-900/80 dark:bg-slate-900 rounded-lg border border-blue-700 dark:border-slate-700">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base lg:text-lg font-extrabold tracking-tight uppercase">
                Ops Admin Dashboard
              </h1>
              <p className="text-[9px] sm:text-[10px] lg:text-xs text-blue-200 dark:text-blue-300 uppercase tracking-widest font-semibold">
                Shift & Trade Command Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* User & Access Management Button */}
            <button
              id="open-user-management-btn"
              onClick={() => {
                setUserManagementTab('admins');
                setIsUserManagementOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-blue-900 dark:bg-slate-800 border border-blue-500 dark:border-slate-700 hover:bg-blue-800 dark:hover:bg-slate-700 text-white shadow-xs cursor-pointer"
              title="Manage Dispatchers, Admin PINs, and System Credentials"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-300" />
              <span className="hidden sm:inline">Admin Access</span>
            </button>

            {/* Authenticated Dispatcher Badge & Lock Button */}
            <div className="flex items-center gap-2 bg-blue-950/80 dark:bg-slate-900 border border-blue-700/80 dark:border-slate-800 px-2.5 py-1 rounded-xl">
              <div className="text-right">
                <div className="text-[10px] sm:text-[11px] font-bold text-white flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="truncate max-w-[100px] sm:max-w-none">{adminName}</span>
                </div>
                <div className="text-[8px] sm:text-[9px] text-blue-200 dark:text-blue-300 font-mono">
                  {adminBadge}
                </div>
              </div>
              {onLock && (
                <button
                  id="ops-admin-lock-btn"
                  onClick={onLock}
                  title="Lock Ops Console"
                  className="p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span className="hidden sm:inline">Lock</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Metric Indicators & Quick Actions Toolbar */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-blue-800/60 dark:border-slate-800/80 pt-2.5">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live on Duty Guards Quick Indicator */}
            <button
              id="header-live-tracking-btn"
              type="button"
              onClick={() => setActiveMainTab('live_tracking')}
              className={`hover:opacity-95 transition-all cursor-pointer group px-2.5 py-1 rounded-lg border text-left ${
                activeMainTab === 'live_tracking'
                  ? 'bg-emerald-900/90 border-emerald-400 ring-2 ring-emerald-500/40'
                  : 'bg-blue-900/60 dark:bg-slate-900/80 hover:bg-emerald-950/50 border-emerald-400/40 dark:border-emerald-800'
              }`}
              title="Click to view Live Guard Duty Roster & Post Locations"
            >
              <p className="text-[8px] sm:text-[9px] text-emerald-300 uppercase font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Live on Duty
              </p>
              <p className="text-xs sm:text-sm font-black font-mono text-emerald-200 group-hover:text-emerald-100">
                {onDutyGuardsCount.toString().padStart(2, '0')}{' '}
                <span className="text-[10px] font-normal font-sans">Guards</span>
              </p>
            </button>

            {/* Overdue/Late Shift Warning Chip */}
            {lateGuardsCount > 0 && (
              <button
                id="header-late-shifts-btn"
                type="button"
                onClick={() => setActiveMainTab('live_tracking')}
                className="hover:opacity-95 transition-all cursor-pointer group px-2.5 py-1 rounded-lg border border-rose-400/80 bg-rose-950/90 text-left ring-2 ring-rose-500/40 animate-pulse"
                title="Click to inspect overdue guards"
              >
                <p className="text-[8px] sm:text-[9px] text-rose-300 uppercase font-bold flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                  Late Clock-in
                </p>
                <p className="text-xs sm:text-sm font-black font-mono text-rose-100">
                  {lateGuardsCount} Overdue
                </p>
              </button>
            )}

            {/* Active Shifts Indicator / Auto-Fill Trigger */}
            <button
              id="header-active-shifts-autofill-btn"
              type="button"
              onClick={() => setIsAutoFillModalOpen(true)}
              className="hover:opacity-95 transition-all cursor-pointer group bg-blue-900/60 dark:bg-slate-900/80 hover:bg-emerald-950/50 dark:hover:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-400/40 dark:border-emerald-800 text-left"
              title="Click to launch Auto-Fill Shifts Heuristic Engine"
            >
              <p className="text-[8px] sm:text-[9px] text-emerald-300 uppercase font-bold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400 fill-emerald-300/40" />
                Auto-Fill Engine
              </p>
              <p className="text-xs sm:text-sm font-black font-mono text-emerald-200 group-hover:text-emerald-100">
                {activeShiftsCount} <span className="text-[10px] font-normal font-sans">Open Shifts</span>
              </p>
            </button>

            {/* Active Guard Bids Indicator Button */}
            <button
              id="header-active-bids-btn"
              type="button"
              onClick={() => {
                setSelectedBidsShiftId(null);
                setIsBidsModalOpen(true);
              }}
              className="hover:opacity-90 transition-all cursor-pointer group bg-blue-900/60 dark:bg-slate-900/80 hover:bg-blue-800/80 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-amber-400/50 dark:border-slate-700 text-left"
              title="Click to view and manage all active guard bids"
            >
              <p className="text-[8px] sm:text-[9px] text-amber-300 uppercase font-bold flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-300" />
                Active Bids
              </p>
              <p className="text-xs sm:text-sm font-black font-mono text-amber-300 group-hover:text-amber-200">
                {activeBidsCount.toString().padStart(2, '0')}
              </p>
            </button>

            {/* Pending Approvals */}
            <div className="bg-blue-900/40 dark:bg-slate-900/60 border border-blue-700/40 dark:border-slate-800 px-2.5 py-1 rounded-lg text-left">
              <p className="text-[8px] sm:text-[9px] text-blue-200 dark:text-blue-300 uppercase font-semibold">Approvals & Swaps</p>
              <p className="text-xs sm:text-sm font-black font-mono text-amber-400">
                {totalPendingApprovals.toString().padStart(2, '0')}
              </p>
            </div>

            {/* Calls for Service / Active Calls Quick Indicator */}
            <button
              id="header-calls-for-service-btn"
              type="button"
              onClick={() => setActiveMainTab('calls_for_service')}
              className={`hover:opacity-95 transition-all cursor-pointer group px-2.5 py-1 rounded-lg border text-left ${
                activeBoloCount > 0
                  ? 'bg-rose-950/80 border-rose-500/80 ring-1 ring-rose-400/40'
                  : 'bg-blue-900/60 dark:bg-slate-900/80 hover:bg-blue-800/80 border-blue-400/40 dark:border-slate-700'
              }`}
              title="Click to open Calls for Service & BOLOs Dispatch"
            >
              <p className={`text-[8px] sm:text-[9px] uppercase font-bold flex items-center gap-1 ${
                activeBoloCount > 0 ? 'text-rose-300' : 'text-blue-300'
              }`}>
                {activeBoloCount > 0 ? (
                  <ShieldAlert className="w-2.5 h-2.5 text-rose-400 fill-rose-300/40 animate-pulse" />
                ) : (
                  <PhoneCall className="w-2.5 h-2.5 text-blue-300" />
                )}
                Calls & BOLOs
              </p>
              <p className={`text-xs sm:text-sm font-black font-mono ${
                activeBoloCount > 0 ? 'text-rose-200 animate-pulse' : 'text-blue-200 group-hover:text-white'
              }`}>
                {activeCallsCount.toString().padStart(2, '0')}{' '}
                <span className="text-[10px] font-normal font-sans">Active</span>
              </p>
            </button>

            {emergencyCount > 0 && (
              <div className="text-left bg-red-950/80 border border-red-500/50 px-2.5 py-1 rounded-lg">
                <p className="text-[8px] sm:text-[9px] text-red-200 uppercase font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                  Emergency
                </p>
                <p className="text-xs sm:text-sm font-black font-mono text-red-300">
                  {emergencyCount} Shifts
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Emergency Broadcast Trigger Button */}
            <button
              id="open-emergency-broadcast-btn"
              type="button"
              onClick={() => setIsBroadcastModalOpen(true)}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border shadow-md cursor-pointer ${
                activeBroadcast
                  ? 'bg-red-600 hover:bg-red-500 text-white border-red-300 ring-2 ring-red-400/80 animate-pulse'
                  : 'bg-red-700 hover:bg-red-600 border-red-500 text-white hover:shadow-red-900/40'
              }`}
              title="Trigger or Monitor Site-Wide Emergency Broadcasts to Guard Terminals"
            >
              <Radio className={`w-3.5 h-3.5 ${activeBroadcast ? 'animate-bounce text-amber-300' : 'text-red-200'}`} />
              <span className="hidden sm:inline">{activeBroadcast ? 'BROADCAST ACTIVE' : 'Emergency Broadcast'}</span>
              <span className="sm:hidden">{activeBroadcast ? 'BROADCAST' : 'Alert'}</span>
              {activeBroadcast && (
                <span className="bg-white text-red-700 text-[9px] font-mono font-black px-1.5 py-0.2 rounded-full">
                  {activeBroadcast.acknowledgedBy.length}/{guardsList.length}
                </span>
              )}
            </button>

            {/* Toggle Recent Actions Panel Button on Desktop */}
            {activeMainTab === 'operations' && (
              <button
                id="toggle-recent-actions-panel-btn"
                onClick={() => setShowSidePanel(!showSidePanel)}
                className={`hidden xl:flex px-2.5 py-1 rounded-lg text-xs font-bold transition-all items-center gap-1.5 border cursor-pointer ${
                  showSidePanel 
                    ? 'bg-blue-900 dark:bg-blue-600 border-blue-500 text-white shadow-inner' 
                    : 'bg-blue-950/60 dark:bg-slate-800 border-blue-700/60 dark:border-slate-700 text-blue-200 dark:text-slate-300 hover:text-white'
                }`}
                title={showSidePanel ? "Hide Recent Admin Actions side panel" : "Show Recent Admin Actions side panel"}
              >
                <History className="w-3.5 h-3.5 text-blue-300" />
                <span>Actions Feed</span>
                <span className="bg-[#1e3a8a] dark:bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                  {recentAdminActions.length}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Sub-Nav Tabs Strip */}
      <div className="bg-slate-800 dark:bg-slate-900 text-white px-3 sm:px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full pb-0.5 no-scrollbar">
          <button
            id="tab-operations-btn"
            type="button"
            onClick={() => setActiveMainTab('operations')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'operations'
                ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Shift & Trade Operations</span>
            {totalPendingApprovals > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {totalPendingApprovals}
              </span>
            )}
          </button>

          {/* Live Guard Duty Roster & Site Tracking Sub-Nav Tab */}
          <button
            id="tab-live-tracking-btn"
            type="button"
            onClick={() => setActiveMainTab('live_tracking')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'live_tracking'
                ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-xs font-black'
                : 'text-emerald-300 hover:text-white hover:bg-emerald-950/60 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Live Guard Roster & Tracking</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              lateGuardsCount > 0
                ? 'bg-rose-500 text-white animate-pulse'
                : onDutyGuardsCount > 0
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-700 text-slate-300'
            }`}>
              {onDutyGuardsCount} On Duty {lateGuardsCount > 0 ? `(${lateGuardsCount} Late)` : ''}
            </span>
          </button>

          {/* Rover Fleet Route Optimization & Dispatch Sub-Nav Tab */}
          <button
            id="tab-rover-routing-btn"
            type="button"
            onClick={() => setActiveMainTab('rover_routing')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'rover_routing'
                ? 'bg-cyan-600 dark:bg-cyan-600 text-slate-950 font-black shadow-xs'
                : 'text-cyan-300 hover:text-white hover:bg-cyan-950/60 dark:hover:bg-slate-800'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Rover Route Optimization</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              activeInterceptions.length > 0
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-cyan-950 text-cyan-300 border border-cyan-400/40'
            }`}>
              {rovers.length} Units {activeInterceptions.length > 0 ? `(${activeInterceptions.length} Intercept)` : ''}
            </span>
          </button>

          {/* Master Shift Scheduling Calendar Sub-Nav Tab */}
          <button
            id="tab-calendar-schedule-btn"
            type="button"
            onClick={() => setActiveMainTab('calendar_schedule')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'calendar_schedule'
                ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-300" />
            <span>Shift Calendar & Schedule</span>
            <span className="bg-blue-900/80 border border-blue-400/40 text-blue-200 text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
              {scheduledShifts.length}
            </span>
          </button>

          {/* Set & Long-Term Schedules Sub-Nav Tab */}
          <button
            id="tab-set-schedules-btn"
            type="button"
            onClick={() => setActiveMainTab('set_schedules')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'set_schedules'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-blue-300 hover:text-white hover:bg-blue-950/60 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 text-blue-300" />
            <span>Set Schedules</span>
            <span className="bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
              {setSchedulesCount}
            </span>
          </button>

          {/* Guard Availability Tracker & Time Off Sub-Nav Tab */}
          <button
            id="tab-guard-availability-btn"
            type="button"
            onClick={() => setActiveMainTab('guard_availability')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'guard_availability'
                ? 'bg-purple-600 text-white shadow-xs font-black'
                : 'text-purple-300 hover:text-white hover:bg-purple-950/60 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-purple-300" />
            <span>Availability & Time-Off</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono ${
              pendingTimeOffCount > 0
                ? 'bg-amber-400 text-slate-950 animate-pulse'
                : 'bg-purple-950 text-purple-300 border border-purple-800'
            }`}>
              {pendingTimeOffCount > 0 ? `🚨 ${pendingTimeOffCount} New` : `${guardsList.length} Guards`}
            </span>
          </button>

          {/* Call-Offs & Emergency Relief Queue Sub-Nav Tab */}
          <button
            id="tab-call-off-queue-btn"
            type="button"
            onClick={() => setActiveMainTab('call_off_queue')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'call_off_queue'
                ? 'bg-rose-600 text-white shadow-xs font-black'
                : 'text-rose-300 hover:text-white hover:bg-rose-950/60 dark:hover:bg-slate-800'
            }`}
          >
            <PhoneOff className="w-3.5 h-3.5 text-rose-300" />
            <span>Call-Offs & Relief</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono ${
              uncoveredCallOffsCount > 0
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-slate-700 text-slate-300'
            }`}>
              {uncoveredCallOffsCount > 0 ? `⚠️ ${uncoveredCallOffsCount} Open` : `${callOffRecords.length}`}
            </span>
          </button>

          {/* Calls for Service & BOLOs Sub-Nav Tab */}
          <button
            id="tab-calls-for-service-btn"
            type="button"
            onClick={() => setActiveMainTab('calls_for_service')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'calls_for_service'
                ? 'bg-rose-600 dark:bg-rose-600 text-white shadow-xs font-black'
                : 'text-rose-300 hover:text-white hover:bg-rose-950/60 dark:hover:bg-slate-800'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Calls for Service & BOLOs</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              activeBoloCount > 0
                ? 'bg-white text-rose-700 animate-pulse'
                : activeCallsCount > 0
                ? 'bg-rose-500 text-white'
                : 'bg-slate-700 text-slate-300'
            }`}>
              {activeCallsCount}
            </span>
          </button>

          {/* Site Tasks Overview & Compliance Dashboard Sub-Nav Tab */}
          <button
            id="tab-site-tasks-btn"
            type="button"
            onClick={() => setActiveMainTab('site_tasks')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'site_tasks'
                ? 'bg-purple-600 dark:bg-purple-600 text-white shadow-xs font-black'
                : 'text-purple-300 hover:text-white hover:bg-purple-950/60 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-purple-300" />
            <span>Site Tasks Overview</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              todayTaskLogsCount > 0 
                ? 'bg-purple-200 text-purple-950 font-mono' 
                : 'bg-slate-700 text-slate-300 font-mono'
            }`}>
              {todayTaskLogsCount}/{allSiteTasksCount}
            </span>
          </button>

          {/* Guard Duty DAR, Maintenance & Incident Reports Hub Sub-Nav Tab */}
          <button
            id="tab-standard-reports-btn"
            type="button"
            onClick={() => setActiveMainTab('standard_reports')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'standard_reports'
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-xs font-black'
                : 'text-indigo-300 hover:text-white hover:bg-indigo-950/60 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-300" />
            <span>Duty & DAR Reports</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono ${
              emergencyEscalatedReportsCount > 0
                ? 'bg-red-500 text-white animate-pulse'
                : pendingStandardReportsCount > 0
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-700 text-slate-300'
            }`}>
              {standardReports.length} {emergencyEscalatedReportsCount > 0 ? `(🚨 ${emergencyEscalatedReportsCount})` : pendingStandardReportsCount > 0 ? `(${pendingStandardReportsCount} New)` : ''}
            </span>
          </button>

          <button
            id="tab-guard-directory-btn"
            type="button"
            onClick={() => setActiveMainTab('guard_directory')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'guard_directory'
                ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Guard Directory</span>
            <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {guardsList.length}
            </span>
          </button>

          <button
            id="tab-site-directory-btn"
            type="button"
            onClick={() => setActiveMainTab('site_directory')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'site_directory'
                ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Site Directory</span>
            <span className="bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {sitesList.length}
            </span>
          </button>

          <button
            id="tab-top-performers-btn"
            type="button"
            onClick={() => setActiveMainTab('top_performers')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'top_performers'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-amber-300 hover:text-amber-200 hover:bg-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Top Performers</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              activeMainTab === 'top_performers'
                ? 'bg-slate-950 text-amber-300'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
            }`}>
              ★ Live
            </span>
          </button>

          {/* Coaching & Analytics Sub-Nav Tab */}
          <button
            id="tab-coaching-analytics-btn"
            type="button"
            onClick={() => setActiveMainTab('coaching_analytics')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'coaching_analytics'
                ? 'bg-indigo-600 text-white font-black shadow-xs'
                : 'text-indigo-300 hover:text-white hover:bg-indigo-950/60 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-300" />
            <span>Coaching & Analytics</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono ${
              activeMainTab === 'coaching_analytics'
                ? 'bg-white text-indigo-900'
                : 'bg-indigo-950 text-indigo-300 border border-indigo-700/60'
            }`}>
              Analytics
            </span>
          </button>

          <button
            id="tab-audit-terminal-btn"
            type="button"
            onClick={() => setActiveMainTab('audit_terminal')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeMainTab === 'audit_terminal'
                ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>Live Audit Terminal</span>
          </button>
        </div>

        {/* Status Hint */}
        <div className="hidden lg:flex items-center gap-2 text-slate-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>System Online: <strong>{guardsList.length}</strong> Registered Officers</span>
        </div>
      </div>

      {/* Active Broadcast Alert Ribbon (if one is currently active) */}
      {activeBroadcast && (
        <div 
          id="ops-active-broadcast-ribbon"
          className="bg-gradient-to-r from-red-900 via-red-800 to-red-950 text-white px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-red-500 shadow-md shrink-0 animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-600 rounded-lg shadow animate-bounce text-white">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-500 text-white px-2 py-0.2 rounded-full">
                  LIVE EMERGENCY BROADCAST
                </span>
                <span className="text-xs font-bold uppercase text-white font-mono">
                  {activeBroadcast.title}
                </span>
              </div>
              <p className="text-[11px] text-red-200 font-mono line-clamp-1">
                Target: {activeBroadcast.targetSites.join(', ')} • Initiator: {activeBroadcast.initiatedBy}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right font-mono text-xs hidden sm:block">
              <span className="text-red-200">Compliance:</span>{' '}
              <strong className="text-emerald-300 font-black">
                {activeBroadcast.acknowledgedBy.length} / {guardsList.length} Guards Verified
              </strong>
            </div>

            <button
              type="button"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="px-3 py-1 bg-white text-red-900 hover:bg-red-50 font-black text-xs uppercase rounded-lg shadow transition-colors cursor-pointer border border-white"
            >
              Monitor & Stand Down
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area Based on Active Tab */}
      {activeMainTab === 'operations' && (
        <div className="flex-1 p-3 sm:p-4 lg:p-6 flex flex-col min-h-0 overflow-y-auto">
          {/* Mobile/Tablet Operational Section Switcher (Visible on screens smaller than xl) */}
          <div className="xl:hidden mb-3 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs grid grid-cols-3 gap-1.5 shrink-0">
            <button
              type="button"
              id="mobile-subtab-shifts-btn"
              onClick={() => setOperationsSubTab('shifts')}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                operationsSubTab === 'shifts'
                  ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Post & Shifts</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                operationsSubTab === 'shifts' ? 'bg-blue-900 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {activeShiftsCount}
              </span>
            </button>

            <button
              type="button"
              id="mobile-subtab-approvals-btn"
              onClick={() => setOperationsSubTab('approvals')}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                operationsSubTab === 'approvals'
                  ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Approvals</span>
              {totalPendingApprovals > 0 && (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                  {totalPendingApprovals}
                </span>
              )}
            </button>

            <button
              type="button"
              id="mobile-subtab-actions-btn"
              onClick={() => setOperationsSubTab('actions')}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                operationsSubTab === 'actions'
                  ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Admin Feed</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                operationsSubTab === 'actions' ? 'bg-blue-900 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {recentAdminActions.length}
              </span>
            </button>
          </div>

          {/* Desktop Multi-Column Grid or Mobile Single-Tab View */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 lg:gap-6 min-h-0 items-start">
            {/* Shift Creation & Active Shifts Feed (Posting Tools) */}
            <section className={`flex flex-col gap-4 min-h-0 ${
              operationsSubTab !== 'shifts' ? 'hidden xl:flex' : 'flex'
            } ${showSidePanel ? 'xl:col-span-5' : 'xl:col-span-6'}`}>
              <ShiftManager />
            </section>

            {/* Pending Swaps/Trades Review */}
            <section className={`flex flex-col gap-4 min-h-0 ${
              operationsSubTab !== 'approvals' ? 'hidden xl:flex' : 'flex'
            } ${showSidePanel ? 'xl:col-span-4' : 'xl:col-span-6'}`}>
              <TradeApprovals 
                onOpenGuardDirectory={(guardId) => {
                  setActiveMainTab('guard_directory');
                }}
              />
            </section>

            {/* Recent Admin Actions Side-Panel */}
            {showSidePanel && (
              <section className={`flex flex-col gap-4 min-h-0 ${
                operationsSubTab !== 'actions' ? 'hidden xl:flex' : 'flex'
              } xl:col-span-3`}>
                <RecentAdminActionsPanel 
                  isCollapsed={false}
                  onToggleCollapse={() => setShowSidePanel(false)}
                />
              </section>
            )}
          </div>
        </div>
      )}

      {activeMainTab === 'live_tracking' && (
        <div className="flex-1 p-3 sm:p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <LiveGuardRosterBoard 
            onOpenCalendar={(guardId) => {
              setCalendarTargetGuardId(guardId || null);
              setActiveMainTab('calendar_schedule');
            }}
          />
        </div>
      )}

      {activeMainTab === 'rover_routing' && (
        <div className="flex-1 p-3 sm:p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <RoverRouteOptimizationPanel 
            onSelectSite={(siteId) => {
              setActiveMainTab('site_directory');
            }}
          />
        </div>
      )}

      {activeMainTab === 'calendar_schedule' && (
        <div className="flex-1 p-3 sm:p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <ShiftSchedulingCalendar 
            initialGuardFilter={calendarTargetGuardId || undefined}
          />
        </div>
      )}

      {activeMainTab === 'set_schedules' && (
        <div className="flex-1 p-3 sm:p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <SetSchedulesManager 
            onOpenCalendar={() => setActiveMainTab('calendar_schedule')}
          />
        </div>
      )}

      {activeMainTab === 'guard_availability' && (
        <div className="flex-1 p-3 sm:p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <GuardAvailabilityTracker />
        </div>
      )}

      {activeMainTab === 'call_off_queue' && (
        <div className="flex-1 p-3 sm:p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <CallOffQueuePanel />
        </div>
      )}

      {activeMainTab === 'calls_for_service' && (
        <div className="flex-1 p-3 sm:p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <CallsForServicePanel />
        </div>
      )}

      {activeMainTab === 'site_tasks' && (
        <div className="flex-1 p-3 sm:p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <SiteTaskOverview 
            onNavigateToSiteDirectory={(siteId) => {
              setActiveMainTab('site_directory');
            }}
            onNavigateToSchedule={(siteId) => {
              setActiveMainTab('calendar_schedule');
            }}
          />
        </div>
      )}

      {activeMainTab === 'standard_reports' && (
        <div className="flex-1 p-3 sm:p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <StandardReportsHub />
        </div>
      )}

      {activeMainTab === 'site_directory' && (
        <div className="flex-1 p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <SiteDirectory 
            onNavigateToShifts={() => setActiveMainTab('operations')}
            onNavigateToGuards={() => setActiveMainTab('guard_directory')}
          />
        </div>
      )}

      {activeMainTab === 'guard_directory' && (
        <div className="flex-1 p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <GuardDirectory 
            onNavigateToTrades={() => setActiveMainTab('operations')}
            onNavigateToLeaderboard={() => setActiveMainTab('top_performers')}
          />
        </div>
      )}

      {activeMainTab === 'top_performers' && (
        <div className="flex-1 p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <TopPerformersWidget 
            onNavigateToGuardDirectory={() => setActiveMainTab('guard_directory')}
          />
        </div>
      )}

      {activeMainTab === 'coaching_analytics' && (
        <div className="flex-1 p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <CoachingPerformanceDashboard 
            onScheduleCoachingClick={() => {
              setActiveMainTab('top_performers');
            }}
          />
        </div>
      )}

      {activeMainTab === 'audit_terminal' && (
        <div className="flex-1 p-4 lg:p-6 min-h-0 overflow-y-auto max-w-6xl mx-auto w-full">
          <LiveAuditTerminal />
        </div>
      )}

      {/* User & Access Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        initialTab={userManagementTab}
      />

      {/* Shift Bids & Candidate Assignment Modal (Accessible from Header Counter) */}
      <ShiftBidsModal
        isOpen={isBidsModalOpen}
        onClose={() => {
          setIsBidsModalOpen(false);
          setSelectedBidsShiftId(null);
        }}
        selectedShiftId={selectedBidsShiftId}
        onSelectShiftId={(newShiftId) => setSelectedBidsShiftId(newShiftId || null)}
      />

      {/* Emergency Broadcast & Live Monitor Modal */}
      <EmergencyBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        adminName={adminName}
        adminBadge={adminBadge}
      />

      {/* Auto-Fill Shifts Heuristic Engine Modal */}
      <AutoFillShiftsModal
        isOpen={isAutoFillModalOpen}
        onClose={() => setIsAutoFillModalOpen(false)}
      />

      {/* Late Shift Clock-In Overdue Alert Banner / Modal (Audible Alert) */}
      <LateShiftAlertModal
        onReassignShift={(shiftId) => {
          setCalendarTargetGuardId(null);
          setActiveMainTab('calendar_schedule');
        }}
      />
    </main>
  );
};


