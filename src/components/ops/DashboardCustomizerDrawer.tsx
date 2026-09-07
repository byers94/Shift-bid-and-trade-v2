import React from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { DashboardPreset, DashboardTileVisibility } from '../../types/shift';
import { 
  Sliders, 
  X, 
  Check, 
  RotateCcw, 
  Monitor, 
  ShieldAlert, 
  Briefcase, 
  BarChart3, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff,
  Layers,
  Sparkles
} from 'lucide-react';

interface DashboardCustomizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TileMeta {
  key: keyof DashboardTileVisibility;
  label: string;
  description: string;
  category: 'core' | 'orientations' | 'cad' | 'executive';
}

const TILE_DEFINITIONS: TileMeta[] = [
  {
    key: 'exceptionsTray',
    label: 'Priority Exception Tray',
    description: 'Instant alerts for uncovered shifts, guard tardiness, and overdue breaks',
    category: 'core'
  },
  {
    key: 'liveOnDutyFieldStatus',
    label: 'Live On-Duty Field Status',
    description: 'Real-time on-duty guard grid, post roles, telemetry, and battery levels',
    category: 'core'
  },
  {
    key: 'upcomingSiteOrientations',
    label: 'Upcoming Site Orientations',
    description: '90-min qualification window, supervisor dispatch & mobile sign-off',
    category: 'orientations'
  },
  {
    key: 'criticalIncidentFeed',
    label: 'Critical Incident & DAR Feed',
    description: 'High-severity field reports, maintenance orders, and review status',
    category: 'cad'
  },
  {
    key: 'liveMap',
    label: 'Live Guard Map & Geofence Radar',
    description: 'Spatial geospatial view of on-duty guards, sites, and rover routes',
    category: 'cad'
  },
  {
    key: 'openShiftsBidding',
    label: 'Open Shifts CAD Queue',
    description: 'Immediate open shifts and unassigned post dispatch queue',
    category: 'cad'
  },
  {
    key: 'asrExecutiveMetrics',
    label: 'Executive 48h Rollup & ASR Metrics',
    description: 'Incident rollup trends, SLA compliance, and contract renewal watch',
    category: 'executive'
  },
  {
    key: 'contractExpirations',
    label: 'Contract Expirations & Lifecycle Watch',
    description: 'Facility contract expiration warnings, renewal dates, and terms',
    category: 'executive'
  }
];

export const DashboardCustomizerDrawer: React.FC<DashboardCustomizerDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const {
    dashboardConfig,
    updateDashboardConfig,
    setDashboardPreset,
    toggleDashboardTile,
    setDashboardTileOrder
  } = useShiftOps();

  if (!isOpen) return null;

  const currentPreset = dashboardConfig.preset;
  const tiles = dashboardConfig.tiles;
  const tileOrder = dashboardConfig.tileOrder;

  const handleSelectPreset = (preset: DashboardPreset) => {
    setDashboardPreset(preset);
  };

  const moveTile = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tileOrder.length) return;

    const newOrder = [...tileOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setDashboardTileOrder(newOrder);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Customize Command Dashboard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preset layouts, visibility toggles & tile priority ordering
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Preset Buttons */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              Operational Role Presets
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectPreset('WATCH_DESK')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                  currentPreset === 'WATCH_DESK'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-sm">WATCH_DESK</span>
                    {currentPreset === 'WATCH_DESK' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Exceptions Tray • Live Guard Map • Live Guard Status • Open Shifts CAD
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('FIELD_SUPERVISOR')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                  currentPreset === 'FIELD_SUPERVISOR'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-bold text-sm">FIELD_SUPERVISOR</span>
                    {currentPreset === 'FIELD_SUPERVISOR' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upcoming Orientations • Live Field Status • Incident DARs • GPS Proximity
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('EXECUTIVE')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                  currentPreset === 'EXECUTIVE'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-sm">EXECUTIVE</span>
                    {currentPreset === 'EXECUTIVE' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    48h Incident Rollup • ASR SLA Metrics • Contract Expiration Watch
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Granular Tile Toggles & Ordering */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Dashboard Tiles & Ordering
              </span>
              <span className="text-xs text-slate-400">
                {Object.values(tiles).filter(Boolean).length} / 7 Active
              </span>
            </div>

            <div className="space-y-2">
              {tileOrder.map((tileKey, index) => {
                const meta = TILE_DEFINITIONS.find(t => t.key === tileKey);
                if (!meta) return null;
                const isVisible = tiles[meta.key];

                return (
                  <div
                    key={meta.key}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                      isVisible
                        ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                        : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleDashboardTile(meta.key)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isVisible
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                            : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                        }`}
                        title={isVisible ? 'Hide tile' : 'Show tile'}
                      >
                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                          {meta.description}
                        </span>
                      </div>
                    </div>

                    {/* Reorder Buttons */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveTile(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTile(index, 'down')}
                        disabled={index === tileOrder.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleSelectPreset('WATCH_DESK')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Watch Desk</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
