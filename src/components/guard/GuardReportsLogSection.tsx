import React, { useState } from 'react';
import { 
  FileText, 
  Wrench, 
  ShieldAlert, 
  Camera, 
  Video, 
  Clock, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Plus,
  Siren,
  Building,
  Check,
  CreditCard,
  Car,
  Phone,
  Eye,
  UserX,
  Cloud,
  CloudOff,
  Database,
  RefreshCw
} from 'lucide-react';
import { StandardShiftReport, StandardReportType, GuardProfile, ReportMediaAttachment } from '../../types/shift';

interface GuardReportsLogSectionProps {
  guard: GuardProfile;
  reports: StandardShiftReport[];
  onOpenNewReportModal: (type?: StandardReportType) => void;
  onViewMedia?: (media: ReportMediaAttachment) => void;
}

export const GuardReportsLogSection: React.FC<GuardReportsLogSectionProps> = ({
  guard,
  reports,
  onOpenNewReportModal,
  onViewMedia
}) => {
  const [filterType, setFilterType] = useState<StandardReportType | 'all'>('all');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<ReportMediaAttachment | null>(null);

  // Filter guard's reports
  const guardReports = reports
    .filter((r) => r.guardId === guard.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredReports = filterType === 'all'
    ? guardReports
    : guardReports.filter((r) => r.reportType === filterType);

  const toggleExpand = (id: string) => {
    setExpandedReportId((prev) => (prev === id ? null : id));
  };

  return (
    <div id="guard-reports-log-section" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              My Shift Reports & DAR Logs
            </h3>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {guardReports.length} Filed Today
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Activity patrols (30m DAR), Maintenance work orders, and Flagged Incidents
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              id="filter-all-reports-btn"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                filterType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({guardReports.length})
            </button>
            <button
              type="button"
              id="filter-activity-reports-btn"
              onClick={() => setFilterType('activity')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                filterType === 'activity' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Activity ({guardReports.filter((r) => r.reportType === 'activity').length})
            </button>
            <button
              type="button"
              id="filter-maint-reports-btn"
              onClick={() => setFilterType('maintenance')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                filterType === 'maintenance' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Maintenance ({guardReports.filter((r) => r.reportType === 'maintenance').length})
            </button>
            <button
              type="button"
              id="filter-incident-reports-btn"
              onClick={() => setFilterType('incident')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                filterType === 'incident' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Incident ({guardReports.filter((r) => r.reportType === 'incident').length})
            </button>
          </div>

          <button
            type="button"
            id="file-new-report-header-btn"
            onClick={() => onOpenNewReportModal('activity')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>File New Report</span>
          </button>
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 space-y-2">
          <FileText className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No reports filed in this category yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Use the "File New Report" button to log 30-min activity DAR sweeps, maintenance hazards, or security incidents.
          </p>
          <button
            type="button"
            onClick={() => onOpenNewReportModal('activity')}
            className="mt-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
          >
            + File 30-Min DAR Check-in
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const isExpanded = expandedReportId === report.id;
            const isEscalated = report.reportType === 'incident' && report.incidentDetails?.escalatedToEmergencyServices;

            return (
              <div
                key={report.id}
                id={`report-item-${report.id}`}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isEscalated
                    ? 'bg-red-950/20 border-red-500/60 shadow-lg shadow-red-950/20'
                    : report.reportType === 'activity'
                      ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      : report.reportType === 'maintenance'
                        ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40'
                        : 'bg-slate-900/90 border-slate-800 hover:border-orange-500/40'
                }`}
              >
                {/* Header Card Row */}
                <div 
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => toggleExpand(report.id)}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      report.reportType === 'activity'
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : report.reportType === 'maintenance'
                          ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                          : isEscalated
                            ? 'bg-red-600/30 text-red-400 border border-red-500/50 animate-pulse'
                            : 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                    }`}>
                      {report.reportType === 'activity' && <FileText className="w-5 h-5" />}
                      {report.reportType === 'maintenance' && <Wrench className="w-5 h-5" />}
                      {report.reportType === 'incident' && (isEscalated ? <Siren className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />)}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-300">
                          {report.reportNumber}
                        </span>

                        {report.reportType === 'activity' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-900/50 text-blue-300 border border-blue-700/50">
                            Activity DAR • {report.activityDetails?.status?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        )}

                        {report.reportType === 'maintenance' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-900/50 text-amber-300 border border-amber-700/50">
                            Maintenance • {report.maintenanceDetails?.severity?.toUpperCase()}
                          </span>
                        )}

                        {report.reportType === 'incident' && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            isEscalated 
                              ? 'bg-red-600 text-white animate-pulse' 
                              : 'bg-orange-900/50 text-orange-300 border border-orange-700/50'
                          }`}>
                            {isEscalated ? '🚨 911 / EMS Escalated' : `Incident • ${report.incidentDetails?.severity}`}
                          </span>
                        )}

                        {report.status === 'reviewed' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ops Reviewed
                          </span>
                        )}

                        {/* Sync status tag */}
                        {report.syncStatus === 'pending_sync' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-600/50 flex items-center gap-1">
                            <Database className="w-3 h-3 text-amber-400" /> Offline Buffer
                          </span>
                        ) : report.syncStatus === 'syncing' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-600/50 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" /> Syncing...
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 flex items-center gap-1">
                            <Cloud className="w-3 h-3 text-emerald-400" /> Cloud Storage Synced
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white mt-1">
                        {report.reportType === 'activity' && report.activityDetails?.zoneChecked}
                        {report.reportType === 'maintenance' && report.maintenanceDetails?.issueTitle}
                        {report.reportType === 'incident' && report.incidentDetails?.incidentTitle}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-500" />
                          {report.siteName}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400 font-mono">
                          <Camera className="w-3.5 h-3.5" />
                          {report.media.length} Evidence {report.media.length === 1 ? 'file' : 'files'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/80"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-800 space-y-4 bg-slate-950/40 text-xs">
                    {/* Specific Details Rendering */}
                    {report.reportType === 'activity' && report.activityDetails && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Patrol Type</span>
                            <span className="font-semibold text-slate-200 capitalize">
                              {report.activityDetails.patrolType.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Doors Verified</span>
                            <span className="font-semibold text-slate-200 font-mono">
                              {report.activityDetails.doorsCheckedCount || 0} Locked
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Lighting Units</span>
                            <span className="font-semibold text-slate-200 font-mono">
                              {report.activityDetails.lightsCheckedCount || 0} Operational
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Interval</span>
                            <span className="font-semibold text-blue-400 font-mono">
                              30-Min Interval #{report.activityDetails.intervalSequence || 1}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                            Guard Observation Notes
                          </span>
                          <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {report.activityDetails.observationNotes}
                          </p>
                        </div>
                      </div>
                    )}

                    {report.reportType === 'maintenance' && report.maintenanceDetails && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Issue Category</span>
                            <span className="font-semibold text-amber-300 capitalize">
                              {report.maintenanceDetails.issueCategory.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Work Order #</span>
                            <span className="font-semibold text-slate-200 font-mono">
                              {report.maintenanceDetails.workOrderNumber || 'WO-PENDING'}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-500 block text-[10px]">Location</span>
                            <span className="font-semibold text-slate-200 truncate block">
                              {report.maintenanceDetails.specificLocation}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                            Detailed Description & Safety Impact
                          </span>
                          <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {report.maintenanceDetails.detailedDescription}
                          </p>
                          {report.maintenanceDetails.suggestedAction && (
                            <p className="text-amber-300 mt-2 font-medium">
                              💡 Suggested Action: {report.maintenanceDetails.suggestedAction}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {report.reportType === 'incident' && report.incidentDetails && (
                      <div className="space-y-3">
                        {isEscalated && (
                          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/70 text-red-200 space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-red-300">
                              <Siren className="w-4 h-4 animate-pulse" />
                              <span>Emergency Services Escalation Details (911 / EMS)</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                              <div>
                                <span className="text-red-400 font-mono">CAD Incident #: </span>
                                <span className="text-white font-mono font-bold">{report.incidentDetails.cadIncidentNumber || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-red-400">Responding Units: </span>
                                <span className="text-white font-medium">{report.incidentDetails.respondingUnits || 'SPD / Medic Unit'}</span>
                              </div>
                            </div>
                            {report.incidentDetails.emergencyOutcome && (
                              <p className="text-[11px] text-red-200 pt-1">
                                <span className="font-semibold">Outcome: </span>
                                {report.incidentDetails.emergencyOutcome}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                            Security Action Taken by Officer
                          </span>
                          <p className="text-slate-200 leading-relaxed">
                            {report.incidentDetails.actionTakenByGuard}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                            Chronological Timeline
                          </span>
                          <p className="text-slate-300 font-mono text-[11px] whitespace-pre-wrap">
                            {report.incidentDetails.detailedTimeline}
                          </p>
                        </div>

                        {report.incidentDetails.partiesInvolved && report.incidentDetails.partiesInvolved.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-slate-400 block text-[11px] font-bold">
                              Documented Parties Involved ({report.incidentDetails.partiesInvolved.length}):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {report.incidentDetails.partiesInvolved.map((pty) => (
                                <div key={pty.id} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-1.5">
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
                                          {pty.idType?.toUpperCase()}: #{pty.idNumber}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  {/* Physical info chips */}
                                  {(pty.ageApprox || pty.gender || pty.height || pty.weightBuild || pty.hairEyes) && (
                                    <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
                                      {pty.ageApprox && <span>Age: ~{pty.ageApprox} •</span>}
                                      {pty.gender && pty.gender !== 'unknown' && <span className="capitalize">{pty.gender} •</span>}
                                      {pty.height && <span>{pty.height} •</span>}
                                      {pty.weightBuild && <span>{pty.weightBuild}</span>}
                                    </div>
                                  )}

                                  {pty.clothingDescription && (
                                    <p className="text-slate-300 text-[11px]">
                                      <strong className="text-slate-400 font-medium">Attire: </strong>{pty.clothingDescription}
                                    </p>
                                  )}

                                  {pty.distinguishingFeatures && (
                                    <p className="text-amber-200/90 text-[10px]">
                                      <strong className="text-amber-400 font-medium">Marks: </strong>{pty.distinguishingFeatures}
                                    </p>
                                  )}

                                  {/* Vehicle & Contact */}
                                  {(pty.vehicleInfo || pty.phoneOrContact) && (
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

                    {/* Attached Photo/Video Media Gallery */}
                    <div className="pt-2">
                      <span className="text-slate-400 block text-[11px] font-bold mb-2">
                        Attached Photo & Video Verification ({report.media.length}):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {report.media.map((med) => (
                          <div
                            key={med.id}
                            onClick={() => setLightboxMedia(med)}
                            className="group relative rounded-xl overflow-hidden bg-black border border-slate-700 aspect-video cursor-pointer hover:border-blue-400 transition-colors"
                          >
                            <img
                              src={med.url}
                              alt={med.caption || 'Report media'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
                            
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-black/70 text-white">
                              {med.type === 'video' ? '▶ Video' : '📷 Photo'}
                            </div>

                            <div className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] text-slate-200 truncate font-medium">
                              {med.caption || 'Evidence'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reviewer Note if signed off */}
                    {report.reviewedByAdmin && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Reviewed by {report.reviewedByAdmin.adminName} ({report.reviewedByAdmin.adminBadge}): </span>
                          <span>{report.reviewedByAdmin.notes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Media Lightbox Viewer */}
      {lightboxMedia && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxMedia(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-white">
                  {lightboxMedia.caption || 'Report Evidence Verification'}
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Captured at {new Date(lightboxMedia.capturedAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-2 bg-black flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={lightboxMedia.url}
                alt="Full preview"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
