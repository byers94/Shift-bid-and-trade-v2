import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  StandardShiftReport, 
  StandardReportType, 
  ReportMediaAttachment, 
  MaintenanceWorkOrderStatus,
  IncidentSeverity 
} from '../../types/shift';
import { 
  FileText, 
  Wrench, 
  ShieldAlert, 
  Siren, 
  Camera, 
  Video, 
  CheckCircle2, 
  Clock, 
  Building, 
  User, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  PhoneCall,
  Check,
  AlertTriangle,
  MapPin,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  CreditCard,
  Car,
  Phone,
  Eye,
  UserX,
  Cloud,
  CloudOff,
  Database,
  UploadCloud,
  Wifi,
  WifiOff,
  Navigation
} from 'lucide-react';
import { StandardReportingModal } from '../guard/StandardReportingModal';
import { ShiftBreadcrumbsModal } from './ShiftBreadcrumbsModal';

export const StandardReportsHub: React.FC = () => {
  const { 
    standardReports, 
    offlineReportQueue,
    isOnline,
    isSyncingReports,
    syncQueuedReports,
    retryReportSync,
    reviewStandardReport, 
    updateMaintenanceWorkOrder, 
    submitStandardReport,
    activeGuard,
    sitesList,
    showToast,
    getBreadcrumbsForReport
  } = useShiftOps();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<StandardReportType | 'all' | 'escalated'>('all');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'submitted' | 'reviewed'>('all');
  const [selectedReportForBreadcrumbs, setSelectedReportForBreadcrumbs] = useState<StandardShiftReport | null>(null);

  // Lightbox Media State
  const [activeLightboxMedia, setActiveLightboxMedia] = useState<{
    media: ReportMediaAttachment;
    report: StandardShiftReport;
  } | null>(null);

  // Review / Sign-off Modal State
  const [reviewModalReport, setReviewModalReport] = useState<StandardShiftReport | null>(null);
  const [reviewerAdminName, setReviewerAdminName] = useState<string>('Dispatcher Marcus Vance');
  const [reviewerBadge, setReviewerBadge] = useState<string>('OPS-702');
  const [reviewNotes, setReviewNotes] = useState<string>('Report verified against video telemetry & site GPS. Compliance confirmed.');

  // Work Order Edit Modal State
  const [editWorkOrderReport, setEditWorkOrderReport] = useState<StandardShiftReport | null>(null);
  const [woStatus, setWoStatus] = useState<MaintenanceWorkOrderStatus>('in_progress');
  const [woNumber, setWoNumber] = useState<string>('');

  // Dispatcher "File Report on Behalf of Guard" Modal
  const [isDispatcherFilingModalOpen, setIsDispatcherFilingModalOpen] = useState<boolean>(false);
  const [dispatcherFilingType, setDispatcherFilingType] = useState<StandardReportType>('activity');

  // Filtered Reports
  const filteredReports = standardReports
    .filter((r) => {
      // Type or Escalated Filter
      if (selectedTypeFilter === 'escalated') {
        if (r.reportType !== 'incident' || !r.incidentDetails?.escalatedToEmergencyServices) {
          return false;
        }
      } else if (selectedTypeFilter !== 'all' && r.reportType !== selectedTypeFilter) {
        return false;
      }

      // Site filter
      if (selectedSiteFilter !== 'all' && r.siteName !== selectedSiteFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all' && r.status !== selectedStatusFilter) {
        return false;
      }

      // Search Query (Report#, Guard Name, Site Name, Notes, Title)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = r.reportNumber.toLowerCase().includes(q);
        const matchesGuard = r.guardName.toLowerCase().includes(q) || r.guardBadge.toLowerCase().includes(q);
        const matchesSite = r.siteName.toLowerCase().includes(q);
        const matchesTitle = 
          (r.activityDetails?.zoneChecked || '').toLowerCase().includes(q) ||
          (r.maintenanceDetails?.issueTitle || '').toLowerCase().includes(q) ||
          (r.incidentDetails?.incidentTitle || '').toLowerCase().includes(q);
        const matchesDesc = 
          (r.activityDetails?.observationNotes || '').toLowerCase().includes(q) ||
          (r.maintenanceDetails?.detailedDescription || '').toLowerCase().includes(q) ||
          (r.incidentDetails?.summary || '').toLowerCase().includes(q);

        if (!matchesNum && !matchesGuard && !matchesSite && !matchesTitle && !matchesDesc) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Statistics Summary
  const totalReports = standardReports.length;
  const activityCount = standardReports.filter((r) => r.reportType === 'activity').length;
  const maintenanceCount = standardReports.filter((r) => r.reportType === 'maintenance').length;
  const incidentCount = standardReports.filter((r) => r.reportType === 'incident').length;
  const emergencyEscalatedCount = standardReports.filter(
    (r) => r.reportType === 'incident' && r.incidentDetails?.escalatedToEmergencyServices
  ).length;
  const pendingReviewCount = standardReports.filter((r) => r.status === 'submitted').length;

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalReport) return;

    reviewStandardReport(reviewModalReport.id, {
      adminId: 'adm-01',
      adminName: reviewerAdminName,
      adminBadge: reviewerBadge,
      notes: reviewNotes
    });

    showToast('Report Sign-Off Recorded', `Report ${reviewModalReport.reportNumber} has been officially reviewed.`, 'success');
    setReviewModalReport(null);
  };

  const handleWorkOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWorkOrderReport) return;

    updateMaintenanceWorkOrder(
      editWorkOrderReport.id,
      woStatus,
      woNumber || `WO-${Math.floor(1000 + Math.random() * 9000)}`
    );

    showToast('Work Order Updated', `Work order status for report ${editWorkOrderReport.reportNumber} updated.`, 'success');
    setEditWorkOrderReport(null);
  };

  const handleExportDAR = () => {
    const jsonStr = JSON.stringify(standardReports, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SecureShift_DAR_Reports_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('DAR Export Generated', 'Official shift duty logs exported successfully.', 'success');
  };

  return (
    <div id="standard-reports-hub" className="space-y-6">
      {/* Top Header & Quick Metrics */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        {/* Offline Queue & Firebase Cloud Storage Sync Banner */}
        <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
          !isOnline 
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' 
            : offlineReportQueue.length > 0
              ? 'bg-blue-950/40 border-blue-500/50 text-blue-200'
              : 'bg-slate-950/60 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${
              !isOnline 
                ? 'bg-amber-500/20 text-amber-400' 
                : offlineReportQueue.length > 0 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {!isOnline ? (
                <CloudOff className="w-5 h-5" />
              ) : offlineReportQueue.length > 0 ? (
                <Database className="w-5 h-5 animate-pulse" />
              ) : (
                <Cloud className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>Cloud Storage & Offline Queue Engine</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                  isOnline 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50' 
                    : 'bg-amber-950 text-amber-300 border border-amber-700/50'
                }`}>
                  {isOnline ? '🟢 Online' : '🟠 Offline Mode'}
                </span>
                {offlineReportQueue.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900 text-blue-200 border border-blue-700">
                    {offlineReportQueue.length} Pending Sync
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {!isOnline 
                  ? 'Guard reports filed offline are preserved in Local Storage and will automatically push media to Firebase Cloud Storage upon reconnection.'
                  : offlineReportQueue.length > 0
                    ? `${offlineReportQueue.length} report(s) buffered locally. Auto-sync is active.`
                    : 'All incident reports and media attachments are synchronized in Cloud Storage for Firebase and Firestore.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {offlineReportQueue.length > 0 && (
              <button
                type="button"
                id="manual-sync-offline-reports-btn"
                onClick={() => syncQueuedReports()}
                disabled={!isOnline || isSyncingReports}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingReports ? 'animate-spin' : ''}`} />
                <span>{isSyncingReports ? 'Syncing...' : 'Sync Offline Queue Now'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Shift Duty Reports Hub
                  <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                    Live Telemetry
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Daily Activity Reports (30m DAR), Property Maintenance Work Orders, and Flagged Incidents with 911 Escalations
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="export-dar-json-btn"
              onClick={handleExportDAR}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Export DAR Log (JSON)</span>
            </button>

            <button
              type="button"
              id="ops-file-report-btn"
              onClick={() => {
                setDispatcherFilingType('activity');
                setIsDispatcherFilingModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Standard Report</span>
            </button>
          </div>
        </div>

        {/* 5-Column Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div 
            onClick={() => setSelectedTypeFilter('all')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedTypeFilter === 'all' 
                ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/50' 
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Reports</span>
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">{totalReports}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{pendingReviewCount} pending sign-off</div>
          </div>

          <div 
            onClick={() => setSelectedTypeFilter('activity')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedTypeFilter === 'activity' 
                ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/50' 
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>30m DAR Sweeps</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-300 font-mono mt-1">{activityCount}</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">✓ 100% Photo Verified</div>
          </div>

          <div 
            onClick={() => setSelectedTypeFilter('maintenance')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedTypeFilter === 'maintenance' 
                ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/50' 
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Maintenance</span>
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-300 font-mono mt-1">{maintenanceCount}</div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">Facility work orders</div>
          </div>

          <div 
            onClick={() => setSelectedTypeFilter('incident')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedTypeFilter === 'incident' 
                ? 'bg-orange-950/40 border-orange-500/60 ring-1 ring-orange-500/50' 
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Guard Incidents</span>
              <ShieldAlert className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-black text-orange-300 font-mono mt-1">{incidentCount}</div>
            <div className="text-[10px] text-orange-400/80 mt-0.5">Security actions logged</div>
          </div>

          <div 
            onClick={() => setSelectedTypeFilter('escalated')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedTypeFilter === 'escalated' 
                ? 'bg-red-950/60 border-red-500 ring-2 ring-red-500 animate-pulse' 
                : 'bg-slate-950/60 border-slate-800 hover:border-red-500/50'
            }`}
          >
            <div className="flex items-center justify-between text-red-300 text-xs">
              <span className="font-bold">911 / EMS Escalated</span>
              <Siren className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-red-400 font-mono mt-1">{emergencyEscalatedCount}</div>
            <div className="text-[10px] text-red-300 font-bold mt-0.5">
              {emergencyEscalatedCount > 0 ? '🚨 Critical Dispatch Active' : 'No Active 911 Calls'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            id="search-standard-reports-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search report #, guard, site, notes, keyword..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Site Filter */}
          <select
            id="filter-site-select"
            value={selectedSiteFilter}
            onChange={(e) => setSelectedSiteFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Sites & Facilities</option>
            {sitesList.map((site) => (
              <option key={site.id} value={site.name}>{site.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            id="filter-status-select"
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Pending Review ({pendingReviewCount})</option>
            <option value="reviewed">Signed-Off / Reviewed</option>
          </select>

          {/* Reset Filters */}
          {(selectedTypeFilter !== 'all' || selectedSiteFilter !== 'all' || selectedStatusFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedTypeFilter('all');
                setSelectedSiteFilter('all');
                setSelectedStatusFilter('all');
                setSearchQuery('');
              }}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              title="Reset all filters"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Reports Table / Card Feed */}
      <div className="space-y-3">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-300">No shift reports match your filter criteria</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try adjusting your search query, selecting "All Sites", or clear active filters to view all standard shift duty records.
            </p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const isEscalated = report.reportType === 'incident' && report.incidentDetails?.escalatedToEmergencyServices;

            return (
              <div
                key={report.id}
                id={`admin-report-card-${report.id}`}
                className={`rounded-2xl border transition-all overflow-hidden p-5 ${
                  isEscalated
                    ? 'bg-red-950/25 border-red-500/70 shadow-lg shadow-red-950/30'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Report Core Metadata */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-sm text-white px-2.5 py-0.5 bg-slate-950 rounded-lg border border-slate-800">
                        {report.reportNumber}
                      </span>

                      {/* Type Badge */}
                      {report.reportType === 'activity' && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-900/60 text-blue-300 border border-blue-700/60 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          Activity DAR (30m Interval #{report.activityDetails?.intervalSequence || 1})
                        </span>
                      )}

                      {report.reportType === 'maintenance' && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-900/60 text-amber-300 border border-amber-700/60 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5" />
                          Maintenance • {report.maintenanceDetails?.severity?.toUpperCase()}
                        </span>
                      )}

                      {report.reportType === 'incident' && (
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 ${
                          isEscalated
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-orange-900/60 text-orange-300 border border-orange-700/60'
                        }`}>
                          {isEscalated ? <Siren className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                          {isEscalated ? '🚨 911 / EMS ESCALATED' : `INCIDENT • ${report.incidentDetails?.severity}`}
                        </span>
                      )}

                      {/* Review Status & Sync Status Badges */}
                      {report.status === 'reviewed' ? (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed by {report.reviewedByAdmin?.adminName}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Pending Dispatch Sign-Off
                        </span>
                      )}

                      {/* Cloud Sync Status Indicator */}
                      {report.syncStatus === 'pending_sync' ? (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50 flex items-center gap-1">
                          <Database className="w-3 h-3 text-amber-400" /> Queued in Offline Storage
                        </span>
                      ) : report.syncStatus === 'syncing' ? (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-600/50 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" /> Uploading to Cloud Storage...
                        </span>
                      ) : report.syncStatus === 'failed' ? (
                        <button
                          type="button"
                          onClick={() => retryReportSync(report.id)}
                          className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-red-950/80 text-red-300 border border-red-600/50 flex items-center gap-1 hover:bg-red-900/80 cursor-pointer"
                        >
                          <AlertTriangle className="w-3 h-3 text-red-400" /> Sync Failed • Click to Retry
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 flex items-center gap-1">
                          <Cloud className="w-3 h-3 text-emerald-400" /> Cloud Storage & Firestore Synced
                        </span>
                      )}
                    </div>

                    {/* Headline Title */}
                    <h3 className="text-base font-bold text-white">
                      {report.reportType === 'activity' && (report.activityDetails?.zoneChecked || 'Routine Patrol')}
                      {report.reportType === 'maintenance' && report.maintenanceDetails?.issueTitle}
                      {report.reportType === 'incident' && report.incidentDetails?.incidentTitle}
                    </h3>

                    {/* Meta location, guard and time strip */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1 text-slate-200">
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        Officer: <strong>{report.guardName}</strong> ({report.guardBadge})
                      </span>
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        {report.siteName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(report.timestamp).toLocaleString()}
                      </span>
                      {report.gpsCoordinates && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <MapPin className="w-3.5 h-3.5" />
                          GPS Verified ({report.gpsCoordinates.latitude.toFixed(4)}, {report.gpsCoordinates.longitude.toFixed(4)})
                        </span>
                      )}
                      {(report.shiftBreadcrumbs?.length || report.breadcrumbsCount || report.shiftId) && (
                        <button
                          type="button"
                          onClick={() => setSelectedReportForBreadcrumbs(report)}
                          className="px-2 py-0.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-mono text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm ml-auto sm:ml-0"
                          title="Review guard continuous 30s GPS breadcrumbs trail logged during this shift"
                        >
                          <Navigation className="w-3 h-3 text-cyan-400" />
                          <span>Review Shift GPS Trail ({report.shiftBreadcrumbs?.length || report.breadcrumbsCount || (report.shiftId ? 30 : 0)} fixes)</span>
                        </button>
                      )}
                    </div>

                    {/* Detailed Content Narrative */}
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 space-y-2">
                      {report.reportType === 'activity' && report.activityDetails && (
                        <div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mb-1.5">
                            <span className="capitalize text-blue-300 font-bold">
                              Method: {report.activityDetails.patrolType.replace(/_/g, ' ')}
                            </span>
                            <span>•</span>
                            <span className="text-emerald-300">
                              Doors Verified: {report.activityDetails.doorsCheckedCount || 0}
                            </span>
                            <span>•</span>
                            <span className="text-amber-300">
                              Lighting Units: {report.activityDetails.lightsCheckedCount || 0}
                            </span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{report.activityDetails.observationNotes}</p>
                        </div>
                      )}

                      {report.reportType === 'maintenance' && report.maintenanceDetails && (
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-amber-300 font-mono mb-1.5">
                            <span>Location: {report.maintenanceDetails.specificLocation}</span>
                            <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700 font-bold">
                              WO: {report.maintenanceDetails.workOrderNumber || 'PENDING'} • Status: {report.maintenanceDetails.workOrderStatus?.toUpperCase()}
                            </span>
                          </div>
                          <p className="leading-relaxed">{report.maintenanceDetails.detailedDescription}</p>
                          {report.maintenanceDetails.suggestedAction && (
                            <p className="text-amber-300/90 mt-1.5 text-[11px]">
                              <strong>Remediation: </strong> {report.maintenanceDetails.suggestedAction}
                            </p>
                          )}
                        </div>
                      )}

                      {report.reportType === 'incident' && report.incidentDetails && (
                        <div className="space-y-2">
                          {isEscalated && (
                            <div className="p-2.5 rounded-lg bg-red-950 border border-red-500/80 text-red-200 space-y-1">
                              <div className="flex items-center gap-2 font-bold text-red-300 text-xs">
                                <Siren className="w-4 h-4 animate-pulse" />
                                <span>CAD Dispatch: {report.incidentDetails.cadIncidentNumber || 'CAD-911-ACTIVE'}</span>
                              </div>
                              <p className="text-[11px]">
                                <strong>Responding Units: </strong> {report.incidentDetails.respondingUnits || 'Police / Paramedics'}
                              </p>
                              {report.incidentDetails.emergencyOutcome && (
                                <p className="text-[11px]">
                                  <strong>Resolution: </strong> {report.incidentDetails.emergencyOutcome}
                                </p>
                              )}
                            </div>
                          )}

                          <p className="leading-relaxed">
                            <strong className="text-slate-100">Guard Action: </strong>
                            {report.incidentDetails.actionTakenByGuard}
                          </p>

                          <div className="p-2 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
                            {report.incidentDetails.detailedTimeline}
                          </div>

                          {/* Documented Parties Involved with full details */}
                          {report.incidentDetails.partiesInvolved && report.incidentDetails.partiesInvolved.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-850">
                              <span className="text-slate-400 block text-[11px] font-bold">
                                Documented Parties Involved ({report.incidentDetails.partiesInvolved.length}):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {report.incidentDetails.partiesInvolved.map((pty) => (
                                  <div key={pty.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className="font-bold text-white text-xs">{pty.name || 'Unnamed Subject'}</span>
                                      <div className="flex items-center gap-1">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                                          pty.role === 'suspect' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-slate-800 text-slate-300'
                                        }`}>
                                          {pty.role}
                                        </span>
                                        {pty.refusedIdentification ? (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-0.5">
                                            <UserX className="w-2.5 h-2.5" /> Refused ID
                                          </span>
                                        ) : pty.idNumber ? (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                                            {pty.idType?.toUpperCase().replace('_', ' ')}: {pty.idStateOrIssuer ? `${pty.idStateOrIssuer} ` : ''}#{pty.idNumber}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>

                                    {(pty.ageApprox || pty.gender || pty.height || pty.weightBuild || pty.hairEyes) && (
                                      <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
                                        {pty.ageApprox && <span>Age: ~{pty.ageApprox} •</span>}
                                        {pty.gender && pty.gender !== 'unknown' && <span className="capitalize">{pty.gender.replace('_', ' ')} •</span>}
                                        {pty.height && <span>{pty.height} •</span>}
                                        {pty.weightBuild && <span>{pty.weightBuild}</span>}
                                      </div>
                                    )}

                                    {pty.clothingDescription && (
                                      <p className="text-slate-300 text-[11px]">
                                        <strong className="text-slate-400 font-medium">Clothing: </strong>{pty.clothingDescription}
                                      </p>
                                    )}

                                    {pty.distinguishingFeatures && (
                                      <p className="text-amber-200/90 text-[10px]">
                                        <strong className="text-amber-400 font-medium">Marks: </strong>{pty.distinguishingFeatures}
                                      </p>
                                    )}

                                    {(pty.vehicleInfo || pty.phoneOrContact || pty.address) && (
                                      <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] text-slate-300">
                                        {pty.vehicleInfo && (
                                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                                            <Car className="w-3 h-3 text-amber-400" /> {pty.vehicleInfo}
                                          </span>
                                        )}
                                        {pty.phoneOrContact && (
                                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                                            <Phone className="w-3 h-3 text-emerald-400" /> {pty.phoneOrContact}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {pty.statementOrNotes && (
                                      <p className="text-slate-400 text-[10px] italic border-l-2 border-slate-700 pl-1.5 mt-1">
                                        "{pty.statementOrNotes}"
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Photo/Video Evidence & Dispatcher Actions */}
                  <div className="w-full lg:w-72 space-y-3 shrink-0">
                    {/* Media Attachments Preview */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-emerald-400" />
                          Evidence Proof ({report.media.length})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Click to enlarge</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {report.media.map((med) => (
                          <div
                            key={med.id}
                            onClick={() => setActiveLightboxMedia({ media: med, report })}
                            className="group relative rounded-xl overflow-hidden bg-black border border-slate-700 aspect-video cursor-pointer hover:border-blue-400 transition-colors"
                          >
                            <img
                              src={med.url}
                              alt={med.caption || 'Evidence'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"></div>
                            
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-black/80 text-white">
                              {med.type === 'video' ? '▶ Video' : '📷 Photo'}
                            </div>

                            <div className="absolute bottom-1 left-1 right-1 text-[9px] text-white truncate font-medium">
                              {med.caption || 'Evidence'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dispatcher Actions */}
                    <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                      {report.status !== 'reviewed' ? (
                        <button
                          type="button"
                          id={`review-report-btn-${report.id}`}
                          onClick={() => {
                            setReviewModalReport(report);
                            setReviewNotes(`Report verified against duty post telemetry for Officer ${report.guardName}. Signed off.`);
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Review & Sign-Off Report</span>
                        </button>
                      ) : (
                        <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px] flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-bold block">Officially Signed Off</span>
                            <span className="text-[10px] text-emerald-400/80">
                              {report.reviewedByAdmin?.adminName} • {new Date(report.reviewedByAdmin?.reviewedAt || '').toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      )}

                      {report.reportType === 'maintenance' && (
                        <button
                          type="button"
                          id={`manage-wo-btn-${report.id}`}
                          onClick={() => {
                            setEditWorkOrderReport(report);
                            setWoStatus(report.maintenanceDetails?.workOrderStatus || 'in_progress');
                            setWoNumber(report.maintenanceDetails?.workOrderNumber || 'WO-4481');
                          }}
                          className="w-full py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Manage Work Order</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* REVIEW & SIGN-OFF MODAL */}
      {reviewModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">Ops Dispatcher Sign-Off</h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalReport(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Report</span>
                <p className="font-bold text-white font-mono">{reviewModalReport.reportNumber} • {reviewModalReport.reportType.toUpperCase()}</p>
                <p className="text-slate-400">{reviewModalReport.guardName} ({reviewModalReport.guardBadge}) @ {reviewModalReport.siteName}</p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Dispatcher Reviewer Name</label>
                <input
                  type="text"
                  value={reviewerAdminName}
                  onChange={(e) => setReviewerAdminName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Admin Badge ID</label>
                <input
                  type="text"
                  value={reviewerBadge}
                  onChange={(e) => setReviewerBadge(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Review & Telemetry Sign-off Notes</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewModalReport(null)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md"
                >
                  Confirm Official Sign-Off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORK ORDER MANAGEMENT MODAL */}
      {editWorkOrderReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">Property Maintenance Work Order</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditWorkOrderReport(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWorkOrderSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Issue Headline</span>
                <p className="font-bold text-amber-300">{editWorkOrderReport.maintenanceDetails?.issueTitle}</p>
                <p className="text-slate-400">{editWorkOrderReport.siteName} • {editWorkOrderReport.maintenanceDetails?.specificLocation}</p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Work Order / Ticket #</label>
                <input
                  type="text"
                  value={woNumber}
                  onChange={(e) => setWoNumber(e.target.value)}
                  placeholder="e.g. WO-2026-9812"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Work Order Status</label>
                <select
                  value={woStatus}
                  onChange={(e) => setWoStatus(e.target.value as MaintenanceWorkOrderStatus)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                >
                  <option value="reported">Reported (Awaiting Vendor / Super)</option>
                  <option value="in_progress">In Progress (Tech Dispatched)</option>
                  <option value="resolved">Resolved / Hazard Cleared</option>
                  <option value="escalated_to_property_management">Escalated to Property Management</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditWorkOrderReport(null)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-md"
                >
                  Save Work Order Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL LIGHTBOX MEDIA VIEWER */}
      {activeLightboxMedia && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setActiveLightboxMedia(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl p-2 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  {activeLightboxMedia.media.type === 'video' ? <Video className="w-4 h-4 text-purple-400" /> : <Camera className="w-4 h-4 text-emerald-400" />}
                  <span>{activeLightboxMedia.media.caption || 'Duty Evidence Photo'}</span>
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Report #{activeLightboxMedia.report.reportNumber} • Officer {activeLightboxMedia.report.guardName} @ {activeLightboxMedia.report.siteName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLightboxMedia(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-2 bg-black flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={activeLightboxMedia.media.url}
                alt="Enlarged Evidence"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-2xl"
              />
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Timestamp: {new Date(activeLightboxMedia.media.capturedAt).toLocaleString()}</span>
              {activeLightboxMedia.media.gpsCoordinates && (
                <span className="text-emerald-400">
                  GPS: {activeLightboxMedia.media.gpsCoordinates.latitude.toFixed(5)}, {activeLightboxMedia.media.gpsCoordinates.longitude.toFixed(5)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DISPATCHER STANDARD REPORTING MODAL */}
      {isDispatcherFilingModalOpen && (
        <StandardReportingModal
          isOpen={isDispatcherFilingModalOpen}
          onClose={() => setIsDispatcherFilingModalOpen(false)}
          guard={activeGuard}
          siteName={sitesList[0]?.name || 'Port Authority - Pier 7'}
          initialReportType={dispatcherFilingType}
          onSubmitReport={(reportData) => {
            submitStandardReport(reportData);
          }}
        />
      )}

      {/* POST-SHIFT REPORT GPS BREADCRUMBS REVIEW MODAL */}
      {selectedReportForBreadcrumbs && (
        <ShiftBreadcrumbsModal
          isOpen={Boolean(selectedReportForBreadcrumbs)}
          onClose={() => setSelectedReportForBreadcrumbs(null)}
          breadcrumbs={
            selectedReportForBreadcrumbs.shiftBreadcrumbs && selectedReportForBreadcrumbs.shiftBreadcrumbs.length > 0
              ? selectedReportForBreadcrumbs.shiftBreadcrumbs
              : getBreadcrumbsForReport(selectedReportForBreadcrumbs.id)
          }
          report={selectedReportForBreadcrumbs}
          site={sitesList.find(
            (s) =>
              s.id === selectedReportForBreadcrumbs.siteId ||
              s.name === selectedReportForBreadcrumbs.siteName
          )}
          guardName={selectedReportForBreadcrumbs.guardName}
          guardBadge={selectedReportForBreadcrumbs.guardBadge}
        />
      )}
    </div>
  );
};
