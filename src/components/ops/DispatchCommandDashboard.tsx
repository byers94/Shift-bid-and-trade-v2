import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { DashboardPreset, SiteOrientation } from '../../types/shift';
import { PriorityExceptionTray } from './PriorityExceptionTray';
import { UpcomingSiteOrientationsTile } from './UpcomingSiteOrientationsTile';
import { LiveOnDutyStatusTile } from './LiveOnDutyStatusTile';
import { CriticalIncidentFeedTile } from './CriticalIncidentFeedTile';
import { ExecutiveRollupTile } from './ExecutiveRollupTile';
import { DashboardCustomizerDrawer } from './DashboardCustomizerDrawer';
import { SupervisorSignOffModal } from './SupervisorSignOffModal';
import { GuardMapDashboard } from './GuardMapDashboard';
import { MpuPerformance } from './MpuPerformance';
import { 
  LayoutDashboard, 
  Sliders, 
  Monitor, 
  ShieldAlert, 
  BarChart3, 
  Radio, 
  Clock, 
  AlertTriangle, 
  Users, 
  Maximize2, 
  Minimize2,
  Sparkles,
  RefreshCw,
  Plus
} from 'lucide-react';

interface DispatchCommandDashboardProps {
  onNavigateTab?: (tab: any) => void;
  adminName?: string;
  adminBadge?: string;
}

export const DispatchCommandDashboard: React.FC<DispatchCommandDashboardProps> = ({
  onNavigateTab,
  adminName = "Commander Mark O'Connor",
  adminBadge = "OPS-CMD-01"
}) => {
  const {
    dashboardConfig,
    setDashboardPreset,
    siteOrientations,
    scheduledShifts,
    shifts,
    standardReports
  } = useShiftOps();

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [selectedOrientation, setSelectedOrientation] = useState<SiteOrientation | null>(null);
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activePreset = dashboardConfig.preset;
  const tiles = dashboardConfig.tiles;
  const tileOrder = dashboardConfig.tileOrder;

  // Stats for the top ticker
  const activeGuardsCount = scheduledShifts.filter(s => s.status === 'on_duty' || s.status === 'on_break').length;
  const pendingOrientationsCount = siteOrientations.filter(o => o.status === 'PENDING_SUPERVISOR' || o.status === 'SUPERVISOR_EN_ROUTE').length;
  const openShiftsCount = shifts.filter(s => s.status === 'open').length;
  const urgentReportsCount = standardReports.filter(r => (r.reportType === 'incident' || r.incidentDetails?.severity === 'critical' || r.maintenanceDetails?.severity === 'critical_safety_hazard') && r.status === 'submitted').length;

  const handleOpenOrientationModal = (orientation: SiteOrientation) => {
    setSelectedOrientation(orientation);
    setIsSignOffModalOpen(true);
  };

  const handleSelectOrientationById = (orientationId: string) => {
    const orient = siteOrientations.find(o => o.orientationId === orientationId);
    if (orient) {
      handleOpenOrientationModal(orient);
    }
  };

  const renderTileComponent = (key: string) => {
    switch (key) {
      case 'exceptionsTray':
      case 'exceptions':
        if (!tiles.exceptionsTray && !(tiles as any).exceptions) return null;
        return (
          <div key="tile-exceptionsTray" className="w-full">
            <PriorityExceptionTray
              onNavigateTab={onNavigateTab}
              onSelectOrientation={handleSelectOrientationById}
            />
          </div>
        );

      case 'liveOnDutyFieldStatus':
      case 'liveGuardStatus':
        if (!tiles.liveOnDutyFieldStatus && !(tiles as any).liveGuardStatus) return null;
        return (
          <div key="tile-liveOnDutyFieldStatus" className="w-full h-full min-h-[420px]">
            <LiveOnDutyStatusTile
              onNavigateTracking={() => onNavigateTab && onNavigateTab('live_tracking')}
            />
          </div>
        );

      case 'upcomingSiteOrientations':
      case 'orientations':
        if (!tiles.upcomingSiteOrientations && !(tiles as any).orientations) return null;
        return (
          <div key="tile-upcomingSiteOrientations" className="w-full h-full min-h-[420px]">
            <UpcomingSiteOrientationsTile
              onOpenOrientationModal={handleOpenOrientationModal}
            />
          </div>
        );

      case 'criticalIncidentFeed':
      case 'criticalIncidents':
        if (!tiles.criticalIncidentFeed && !(tiles as any).criticalIncidents) return null;
        return (
          <div key="tile-criticalIncidentFeed" className="w-full h-full min-h-[420px]">
            <CriticalIncidentFeedTile
              onNavigateReports={() => onNavigateTab && onNavigateTab('standard_reports')}
            />
          </div>
        );

      case 'liveMap':
      case 'map':
        if (!tiles.liveMap && !(tiles as any).map) return null;
        return (
          <div key="tile-liveMap" className="w-full h-full min-h-[480px]">
            <GuardMapDashboard />
          </div>
        );

      case 'mobilePatrolUnits':
        if (!tiles.mobilePatrolUnits) return null;
        return (
          <div key="tile-mobilePatrolUnits" className="w-full h-full min-h-[420px]">
            <MpuPerformance
              onNavigateToSchedule={() => onNavigateTab && onNavigateTab('operations')}
              onNavigateToRouting={() => onNavigateTab && onNavigateTab('patrol_routes')}
            />
          </div>
        );

      case 'asrExecutiveMetrics':
        if (!tiles.asrExecutiveMetrics) return null;
        return (
          <div key="tile-asrExecutiveMetrics" className="w-full h-full min-h-[420px]">
            <ExecutiveRollupTile variant="metrics" />
          </div>
        );

      case 'contractExpirations':
        if (!tiles.contractExpirations) return null;
        return (
          <div key="tile-contractExpirations" className="w-full h-full min-h-[420px]">
            <ExecutiveRollupTile variant="contracts" />
          </div>
        );

      case 'executiveRollup':
        if (!tiles.asrExecutiveMetrics && !tiles.contractExpirations && !(tiles as any).executiveRollup) return null;
        return (
          <div key="tile-executiveRollup" className="w-full h-full min-h-[420px]">
            <ExecutiveRollupTile variant="all" />
          </div>
        );

      case 'openShiftsBidding':
      case 'openShifts':
        if (!tiles.openShiftsBidding && !(tiles as any).openShifts) return null;
        return (
          <div key="tile-openShiftsBidding" className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Open Shifts CAD Queue
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Unassigned and emergency shifts awaiting guard dispatch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('operations')}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Manage All Shifts
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto">
              {shifts.filter(s => s.status === 'open').slice(0, 5).map(shift => (
                <div key={shift.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      {shift.siteName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {shift.date} • {shift.startTime} - {shift.endTime} ({shift.hours}h) • {shift.urgency?.toUpperCase() || 'STANDARD'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab && onNavigateTab('operations')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                  >
                    Dispatch Guard
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-5 ${isFullscreen ? 'p-6 bg-slate-100 dark:bg-slate-950 min-h-screen' : ''}`}>
      {/* Dashboard Top Header & Preset Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Title & Dispatcher Info */}
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-xs">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Dispatch & Command Dashboard
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                LIVE CAD SENTINEL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active Shift Telemetry • Automated Site Orientations • Priority Exception Feeds
            </p>
          </div>
        </div>

        {/* Center: Quick Presets Bar */}
        <div className="flex items-center space-x-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-xl self-start lg:self-center overflow-x-auto">
          <button
            type="button"
            onClick={() => setDashboardPreset('WATCH_DESK')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shrink-0 ${
              activePreset === 'WATCH_DESK'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Watch Desk</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardPreset('FIELD_SUPERVISOR')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shrink-0 ${
              activePreset === 'FIELD_SUPERVISOR'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Field Supervisor</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardPreset('EXECUTIVE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shrink-0 ${
              activePreset === 'EXECUTIVE'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Executive SLA</span>
          </button>
        </div>

        {/* Right: Customizer Drawer Trigger */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsCustomizerOpen(true)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Customize Tiles</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Live Operational Metric Ticker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">On-Duty Officers</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{activeGuardsCount}</p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Active Posts</span>
          </div>
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 rounded-xl">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Site Orientations</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{pendingOrientationsCount}</p>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">90-Min Active Windows</span>
          </div>
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Open Shifts CAD</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{openShiftsCount}</p>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Ready for Dispatch</span>
          </div>
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Critical Incidents</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{urgentReportsCount}</p>
            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">Action Required</span>
          </div>
          <div className="p-2.5 bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Dynamic Ordered Tiles Grid */}
      <div className="space-y-5">
        {/* Exception Tray (always top priority if enabled) */}
        {(tileOrder.includes('exceptionsTray') || tileOrder.includes('exceptions')) && (tiles.exceptionsTray || (tiles as any).exceptions) && renderTileComponent('exceptionsTray')}

        {/* 2-Column Responsive Layout for Primary Tiles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from(new Set(tileOrder))
            .filter(key => key !== 'exceptionsTray' && key !== 'exceptions')
            .map(key => renderTileComponent(key))}
        </div>
      </div>

      {/* Customizer Slide-Over Drawer */}
      <DashboardCustomizerDrawer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
      />

      {/* Supervisor Sign-Off Modal */}
      {selectedOrientation && (
        <SupervisorSignOffModal
          isOpen={isSignOffModalOpen}
          onClose={() => {
            setIsSignOffModalOpen(false);
            setSelectedOrientation(null);
          }}
          orientation={siteOrientations.find(o => o.orientationId === selectedOrientation.orientationId) || selectedOrientation}
        />
      )}
    </div>
  );
};
