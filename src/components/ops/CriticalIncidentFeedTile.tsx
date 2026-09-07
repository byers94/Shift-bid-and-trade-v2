import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { StandardShiftReport } from '../../types/shift';
import { 
  AlertTriangle, 
  FileText, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  ExternalLink, 
  Filter, 
  Search, 
  Wrench, 
  ShieldAlert, 
  ChevronRight,
  Flame,
  Send
} from 'lucide-react';

interface CriticalIncidentFeedTileProps {
  onNavigateReports?: () => void;
  onOpenReportModal?: (report: StandardShiftReport) => void;
}

export const CriticalIncidentFeedTile: React.FC<CriticalIncidentFeedTileProps> = ({
  onNavigateReports,
  onOpenReportModal
}) => {
  const { standardReports, reviewStandardReport } = useShiftOps();
  const [filterType, setFilterType] = useState<'all' | 'incident' | 'maintenance' | 'safety'>('all');
  const [search, setSearch] = useState('');

  // Helper accessors for polymorphic StandardShiftReport
  const getReportTitle = (rpt: StandardShiftReport) => {
    if (rpt.reportType === 'incident' && rpt.incidentDetails) {
      return rpt.incidentDetails.incidentTitle;
    }
    if (rpt.reportType === 'maintenance' && rpt.maintenanceDetails) {
      return rpt.maintenanceDetails.issueTitle;
    }
    if (rpt.reportType === 'activity' && rpt.activityDetails) {
      return rpt.activityDetails.zoneChecked || 'Routine Patrol Check-in';
    }
    return `DAR Report #${rpt.reportNumber}`;
  };

  const getReportDescription = (rpt: StandardShiftReport) => {
    if (rpt.reportType === 'incident' && rpt.incidentDetails) {
      return rpt.incidentDetails.summary;
    }
    if (rpt.reportType === 'maintenance' && rpt.maintenanceDetails) {
      return rpt.maintenanceDetails.detailedDescription;
    }
    if (rpt.reportType === 'activity' && rpt.activityDetails) {
      return rpt.activityDetails.observationNotes;
    }
    return 'Routine site observation logged by active post officer.';
  };

  const getReportUrgency = (rpt: StandardShiftReport): 'critical' | 'urgent' | 'high' | 'moderate' | 'routine' => {
    if (rpt.reportType === 'incident') {
      if (rpt.incidentDetails?.severity === 'critical') return 'critical';
      if (rpt.incidentDetails?.severity === 'high') return 'high';
      return 'moderate';
    }
    if (rpt.reportType === 'maintenance') {
      if (rpt.maintenanceDetails?.severity === 'critical_safety_hazard') return 'critical';
      if (rpt.maintenanceDetails?.severity === 'urgent') return 'urgent';
      return 'moderate';
    }
    return 'routine';
  };

  // Filter for priority/incident reports
  const relevantReports = standardReports.filter(rpt => {
    const isPriorityType = rpt.reportType === 'incident' || rpt.reportType === 'maintenance';
    const urgency = getReportUrgency(rpt);
    const isHighUrgency = urgency === 'urgent' || urgency === 'high' || urgency === 'critical';
    if (!isPriorityType && !isHighUrgency) return false;

    if (filterType !== 'all' && rpt.reportType !== filterType) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const title = getReportTitle(rpt).toLowerCase();
      const desc = getReportDescription(rpt).toLowerCase();
      return (
        title.includes(q) ||
        rpt.siteName.toLowerCase().includes(q) ||
        rpt.guardName.toLowerCase().includes(q) ||
        desc.includes(q)
      );
    }
    return true;
  });

  const pendingReviewCount = relevantReports.filter(r => r.status === 'submitted').length;

  const handleQuickReview = (reportId: string) => {
    reviewStandardReport(reportId, {
      adminName: "Dispatch Command",
      adminBadge: "OPS-CMD-01",
      notes: "Incident acknowledged and logged via Central Dispatch Feed.",
      status: 'reviewed'
    });
  };

  const getUrgencyBadge = (urgency: 'critical' | 'urgent' | 'high' | 'moderate' | 'routine') => {
    switch (urgency) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900 animate-pulse">
            Critical
          </span>
        );
      case 'urgent':
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            High Priority
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Routine
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 rounded-xl">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Critical Incident & DAR Feed
              </h3>
              {pendingReviewCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs">
                  {pendingReviewCount} Needs Review
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live field incident logs, safety observations & urgent work orders
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              filterType === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('incident')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              filterType === 'incident'
                ? 'bg-rose-600 text-white'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            Incidents
          </button>
          <button
            onClick={() => setFilterType('maintenance')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              filterType === 'maintenance'
                ? 'bg-amber-600 text-white'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            Work Orders
          </button>
          <button
            onClick={() => setFilterType('safety')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              filterType === 'safety'
                ? 'bg-blue-600 text-white'
                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
            }`}
          >
            Safety
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search DAR logs, post titles, or officer remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Incident List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1 overflow-y-auto max-h-[460px]">
        {relevantReports.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No critical incidents reported
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Field officers submit incident DARs live from the mobile portal.
            </p>
          </div>
        ) : (
          relevantReports.map((report) => {
            const isReviewed = report.status === 'reviewed';
            const title = getReportTitle(report);
            const desc = getReportDescription(report);
            const urgency = getReportUrgency(report);
            const timeAgo = report.createdAt 
              ? Math.max(1, Math.round((Date.now() - new Date(report.createdAt).getTime()) / (60 * 1000)))
              : 5;

            return (
              <div
                key={report.id}
                className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {title}
                    </span>
                    {getUrgencyBadge(urgency)}
                    <span className="text-xs font-mono font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                      #{report.reportNumber || report.id.slice(-6)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {desc}
                  </p>

                  <div className="flex flex-wrap items-center text-xs text-slate-500 dark:text-slate-400 gap-x-4 gap-y-1 pt-0.5">
                    <div className="flex items-center space-x-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {report.siteName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{timeAgo}m ago</span>
                    </div>

                    <span>
                      Officer: <strong className="text-slate-700 dark:text-slate-200">{report.guardName}</strong> ({report.guardBadge})
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  {!isReviewed ? (
                    <button
                      type="button"
                      onClick={() => handleQuickReview(report.id)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors"
                    >
                      Acknowledge
                    </button>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Reviewed</span>
                    </span>
                  )}

                  {onNavigateReports && (
                    <button
                      type="button"
                      onClick={onNavigateReports}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="View in DAR Reports Hub"
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
