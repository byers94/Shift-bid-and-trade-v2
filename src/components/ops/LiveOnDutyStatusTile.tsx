import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  Users, 
  MapPin, 
  Battery, 
  BatteryCharging, 
  Compass, 
  Clock, 
  Coffee, 
  Phone, 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Radio,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface LiveOnDutyStatusTileProps {
  onNavigateTracking?: () => void;
}

export const LiveOnDutyStatusTile: React.FC<LiveOnDutyStatusTileProps> = ({
  onNavigateTracking
}) => {
  const { 
    scheduledShifts, 
    guardsList, 
    getGuardsLiveTracking 
  } = useShiftOps();

  const [search, setSearch] = useState('');
  const liveTracking = getGuardsLiveTracking();

  // Find all active on-duty or on-break shifts
  const onDutyShifts = scheduledShifts.filter(
    s => s.status === 'on_duty' || s.status === 'on_break'
  );

  const filteredShifts = onDutyShifts.filter(shift => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      shift.guardName.toLowerCase().includes(q) ||
      shift.guardBadge.toLowerCase().includes(q) ||
      shift.siteName.toLowerCase().includes(q) ||
      (shift.postRole && shift.postRole.toLowerCase().includes(q))
    );
  });

  const onBreakCount = onDutyShifts.filter(s => s.status === 'on_break' || (s.breaks && s.breaks.some(b => !b.endedAt))).length;
  const activePostCount = onDutyShifts.length - onBreakCount;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 rounded-xl">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Live On-Duty Field Status
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                {onDutyShifts.length} Officers
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active shifts, telemetry beacons, battery levels & post status
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
            {activePostCount} Active Post
          </span>
          {onBreakCount > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
              {onBreakCount} On Break
            </span>
          )}
        </div>
      </div>

      {/* Search Filter */}
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter on-duty guards, sites, or post roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1 overflow-y-auto max-h-[460px]">
        {filteredShifts.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No on-duty guards currently logged in
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Guards will appear here live when they clock in via the Guard Terminal.
            </p>
          </div>
        ) : (
          filteredShifts.map((shift) => {
            const guard = guardsList.find(g => g.id === shift.guardId);
            const tracking = liveTracking.find(t => t.guardId === shift.guardId);
            const activeBreak = (shift.breaks || []).find(b => !b.endedAt);
            const isOnBreak = Boolean(activeBreak);

            // Time clocked in
            const clockInTime = shift.clockInTime ? new Date(shift.clockInTime) : null;
            const elapsedHours = clockInTime 
              ? Math.max(0.1, Math.round(((Date.now() - clockInTime.getTime()) / (3600 * 1000)) * 10) / 10)
              : 0;

            const batteryPct = (tracking?.breadcrumbs && tracking.breadcrumbs[tracking.breadcrumbs.length - 1]?.batteryLevel) ?? 88;
            const isGeofenceOk = shift.geofencePassed ?? true;

            return (
              <div
                key={shift.id}
                className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2.5">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
                        {shift.guardName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        isOnBreak ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {shift.guardName}
                        </span>
                        <span className="text-xs font-mono font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                          {shift.guardBadge}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                        {shift.postRole || 'Primary Security Officer'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center text-xs text-slate-500 dark:text-slate-400 gap-x-4 gap-y-1 pt-0.5">
                    <div className="flex items-center space-x-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {shift.siteName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{elapsedHours}h on post</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Battery className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className={batteryPct < 20 ? 'text-rose-600 font-bold' : ''}>
                        {batteryPct}%
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className={isGeofenceOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 font-bold'}>
                        {isGeofenceOk ? 'Inside Geofence' : 'Geofence Breach'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  {isOnBreak ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200">
                      <Coffee className="w-3.5 h-3.5" />
                      <span>On {activeBreak?.type === 'meal' ? 'Meal' : 'Rest'} Break</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Active Post</span>
                    </span>
                  )}

                  {guard?.phone && (
                    <a
                      href={`tel:${guard.phone}`}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title={`Call ${shift.guardName}`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}

                  {onNavigateTracking && (
                    <button
                      type="button"
                      onClick={onNavigateTracking}
                      className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="View GPS Breadcrumb Trail"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
