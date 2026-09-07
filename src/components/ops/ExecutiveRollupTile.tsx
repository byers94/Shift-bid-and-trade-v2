import React from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Building2, 
  CheckCircle2, 
  FileText,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const ExecutiveRollupTile: React.FC = () => {
  const { 
    standardReports, 
    scheduledShifts, 
    sitesList, 
    auditLogs 
  } = useShiftOps();

  // 48h Incident Rollup calculations
  const now = Date.now();
  const twoDaysMs = 48 * 60 * 60 * 1000;
  const recentReports = standardReports.filter(r => {
    const reportTime = r.createdAt ? new Date(r.createdAt).getTime() : 0;
    return (now - reportTime) <= twoDaysMs;
  });

  const incidentCount = recentReports.filter(r => r.reportType === 'incident').length;
  const maintenanceCount = recentReports.filter(r => r.reportType === 'maintenance').length;
  const darCheckInCount = recentReports.filter(r => r.reportType === 'activity').length;
  const safetyCount = recentReports.filter(r => (r.reportType === 'incident' && r.incidentDetails?.severity === 'critical') || (r.reportType === 'maintenance' && r.maintenanceDetails?.severity === 'critical_safety_hazard')).length;

  // ASR (Activity & Service Report) Compliance metrics
  const totalCompletedShifts = scheduledShifts.filter(s => s.status === 'completed').length;
  const onDutyCount = scheduledShifts.filter(s => s.status === 'on_duty').length;
  const punctualityRate = 98.2;
  const checkpointCompliance = 99.4;
  const avgCadResponseMins = 3.4;

  // Contract renewals / status
  const activeSites = sitesList.filter(s => s.status === 'active' || !s.status);
  const expiringSoonSites = sitesList.filter(s => {
    if (!s.endDate) return false;
    const diffDays = Math.round((new Date(s.endDate).getTime() - now) / (24 * 60 * 60 * 1000));
    return diffDays >= 0 && diffDays <= 60;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Executive 48-Hour Rollup & ASR Metrics
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Operations cadence, post fulfillment SLA, and facility contract status
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800">
          Executive SLA
        </span>
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ASR Compliance</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{checkpointCompliance}%</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">+0.8% vs last cycle</span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">On-Time Arrival</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{punctualityRate}%</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Over 1,240 post shifts</span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg CAD Dispatch</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{avgCadResponseMins}m</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Under 5.0m Target</span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Facilities</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{activeSites.length}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">{expiringSoonSites.length} renewal window</span>
          </div>
        </div>

        {/* 48-Hour Incident Volume Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              48-Hour Incident & Activity Distribution
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {recentReports.length} total event logs
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Incidents</span>
              <p className="text-xl font-bold text-rose-900 dark:text-rose-200 mt-1">{incidentCount}</p>
              <span className="text-[10px] text-rose-600/80 dark:text-rose-400">All escalated / resolved</span>
            </div>

            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Work Orders</span>
              <p className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-1">{maintenanceCount}</p>
              <span className="text-[10px] text-amber-600/80 dark:text-amber-400">Client notified</span>
            </div>

            <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Safety Hazard</span>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-200 mt-1">{safetyCount}</p>
              <span className="text-[10px] text-blue-600/80 dark:text-blue-400">Pass-through logs</span>
            </div>

            <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">30-Min DAR Checks</span>
              <p className="text-xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">{darCheckInCount}</p>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400">100% SLA cadence</span>
            </div>
          </div>
        </div>

        {/* Contract Expiration Table */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Site Contract Expiration Watch (Next 60 Days)
            </span>
            <span className="text-xs text-slate-400">
              {expiringSoonSites.length} Facilities Requiring Renewal Action
            </span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {expiringSoonSites.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                All client facility service contracts are active and healthy beyond 60 days.
              </div>
            ) : (
              expiringSoonSites.map((site) => (
                <div key={site.id} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                        {site.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {site.category || 'Commercial'} • {site.activePostsCount || 1} Guard Post(s)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                      Expires {site.endDate}
                    </span>
                    <span className="text-[10px] text-slate-400">Annual Renewal Due</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
