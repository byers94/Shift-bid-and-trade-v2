import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ScheduledShift, StandardShiftReport } from '../../types/shift';
import { useClientDirectivesStore } from '../client/ClientPortal';
import {
  ShieldAlert,
  Wrench,
  FileText,
  Clock,
  CheckCircle2,
  Building2,
  User,
  AlertTriangle,
  Sparkles,
  CheckCheck,
  X,
  Calendar,
  MapPin,
  Radio,
  Filter
} from 'lucide-react';

export interface ShiftHandoffAcknowledgment {
  shiftId: string;
  officerId: string;
  acknowledgedAt: string;
}

export interface ShiftHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShift?: ScheduledShift | null;
  /** Optional fallback siteId/siteName if previewing prior to clock-in */
  fallbackSiteId?: string;
  fallbackSiteName?: string;
  /** Optional override list of reports; defaults to ShiftOpsContext standardReports */
  reports?: StandardShiftReport[];
  onAcknowledge: (payload: ShiftHandoffAcknowledgment) => void;
}

type HandoffCategory = 'critical_incident' | 'maintenance_hazard' | 'routine_dar';

interface NormalizedHandoffEntry {
  id: string;
  reportNumber: string;
  category: HandoffCategory;
  categoryLabel: string;
  timestamp: string;
  timestampMs: number;
  relativeTimestamp: string;
  officerName: string;
  officerCallsign: string;
  title: string;
  narrative: string;
  locationZone?: string;
  metadataTag?: string;
}

/**
 * Formats an ISO timestamp into a tactical relative string (e.g., "Yesterday at 22:15", "Today at 08:30")
 */
function formatRelativePassDownTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Recent';

  const now = new Date();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const targetDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const diffMinutes = Math.max(1, Math.round((now.getTime() - date.getTime()) / (60 * 1000)));

  if (targetDayStart === todayStart) {
    if (diffMinutes < 60) {
      return `Today at ${timeStr} (${diffMinutes}m ago)`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    return `Today at ${timeStr} (${diffHours}h ago)`;
  }

  if (targetDayStart === yesterdayStart) {
    return `Yesterday at ${timeStr}`;
  }

  const monthDay = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${monthDay} at ${timeStr}`;
}

export const ShiftHandoffModal: React.FC<ShiftHandoffModalProps> = ({
  isOpen,
  onClose,
  activeShift: propActiveShift,
  fallbackSiteId,
  fallbackSiteName,
  reports: propReports,
  onAcknowledge
}) => {
  const {
    activeClockedInShift,
    activeGuard,
    standardReports,
    sitesList
  } = useShiftOps();
  const { directives, acknowledgeDirective } = useClientDirectivesStore();

  const [selectedFilter, setSelectedFilter] = useState<'all' | HandoffCategory>('all');

  const activeShift = propActiveShift !== undefined ? propActiveShift : activeClockedInShift;
  const allReports = propReports || standardReports;

  // Resolve target site ID & Name
  const targetSite = useMemo(() => {
    const rawSiteId = activeShift?.siteId || fallbackSiteId;
    const rawSiteName = activeShift?.siteName || fallbackSiteName;

    const matchedSite = sitesList.find(
      (s) =>
        (rawSiteId && s.id === rawSiteId) ||
        (rawSiteName && s.name.toLowerCase() === rawSiteName.toLowerCase())
    );

    return {
      siteId: matchedSite?.id || rawSiteId || 'site-1',
      siteName: matchedSite?.name || rawSiteName || 'Assigned Post'
    };
  }, [activeShift, fallbackSiteId, fallbackSiteName, sitesList]);

  // Filter and normalize 48-hour site intelligence entries
  const handoffEntries = useMemo<NormalizedHandoffEntry[]>(() => {
    const cutoffMs = Date.now() - 48 * 60 * 60 * 1000;

    const matchingReports = allReports.filter((rpt) => {
      const rptMs = new Date(rpt.timestamp).getTime();
      if (isNaN(rptMs) || rptMs < cutoffMs) return false;

      // Match by siteId or siteName
      const idMatch = Boolean(targetSite.siteId && rpt.siteId && rpt.siteId === targetSite.siteId);
      const nameMatch = Boolean(
        targetSite.siteName &&
          rpt.siteName &&
          (rpt.siteName.toLowerCase() === targetSite.siteName.toLowerCase() ||
            rpt.siteName.toLowerCase().includes(targetSite.siteName.toLowerCase()) ||
            targetSite.siteName.toLowerCase().includes(rpt.siteName.toLowerCase()))
      );

      return idMatch || nameMatch;
    });

    const normalized: NormalizedHandoffEntry[] = matchingReports.map((rpt) => {
      const tsMs = new Date(rpt.timestamp).getTime();
      const relativeTimestamp = formatRelativePassDownTime(rpt.timestamp);

      if (rpt.reportType === 'incident' && rpt.incidentDetails) {
        const inc = rpt.incidentDetails;
        return {
          id: rpt.id,
          reportNumber: rpt.reportNumber,
          category: 'critical_incident',
          categoryLabel: 'Critical Incident',
          timestamp: rpt.timestamp,
          timestampMs: tsMs,
          relativeTimestamp,
          officerName: rpt.guardName,
          officerCallsign: rpt.guardBadge || 'SEC-UNIT',
          title: inc.incidentTitle || 'Security Incident Logged',
          narrative: `${inc.summary}${inc.actionTakenByGuard ? ` — Action: ${inc.actionTakenByGuard}` : ''}`,
          locationZone: inc.incidentCategory?.replace(/_/g, ' ').toUpperCase(),
          metadataTag: inc.policeReportNumber
            ? `PD #${inc.policeReportNumber}`
            : inc.cadIncidentNumber
            ? `CAD #${inc.cadIncidentNumber}`
            : inc.severity.toUpperCase()
        };
      }

      if (rpt.reportType === 'maintenance' && rpt.maintenanceDetails) {
        const mnt = rpt.maintenanceDetails;
        return {
          id: rpt.id,
          reportNumber: rpt.reportNumber,
          category: 'maintenance_hazard',
          categoryLabel: 'Maintenance Hazard',
          timestamp: rpt.timestamp,
          timestampMs: tsMs,
          relativeTimestamp,
          officerName: rpt.guardName,
          officerCallsign: rpt.guardBadge || 'SEC-UNIT',
          title: mnt.issueTitle || 'Facility Maintenance Issue',
          narrative: `${mnt.detailedDescription}${mnt.suggestedAction ? ` — Next Step: ${mnt.suggestedAction}` : ''}`,
          locationZone: mnt.specificLocation,
          metadataTag: mnt.workOrderNumber ? `WO #${mnt.workOrderNumber}` : mnt.severity.replace(/_/g, ' ').toUpperCase()
        };
      }

      // Routine DAR / Pass-Down Note
      const act = rpt.activityDetails;
      const cmp = rpt.completionDetails;
      return {
        id: rpt.id,
        reportNumber: rpt.reportNumber,
        category: 'routine_dar',
        categoryLabel: 'Routine DAR / Pass-Down',
        timestamp: rpt.timestamp,
        timestampMs: tsMs,
        relativeTimestamp,
        officerName: rpt.guardName,
        officerCallsign: rpt.guardBadge || 'SEC-UNIT',
        title: act?.zoneChecked || (cmp ? 'Shift Handover Summary' : 'Routine Patrol Check-In'),
        narrative:
          act?.observationNotes ||
          cmp?.handoverNotes ||
          'Routine patrol sweep and access control verification completed. No anomalies observed.',
        locationZone: act?.patrolType ? act.patrolType.replace(/_/g, ' ').toUpperCase() : 'POST LOG',
        metadataTag: act?.status ? act.status.replace(/_/g, ' ').toUpperCase() : 'ALL CLEAR'
      };
    });

    // Merge active Client Portal Special Watch Directives for this site
    const activeClientDirectives = directives.filter(
      (dir) =>
        dir.status === 'ACTIVE' &&
        (dir.siteId === targetSite.siteId ||
          dir.siteName.toLowerCase() === targetSite.siteName.toLowerCase())
    );

    activeClientDirectives.forEach((dir) => {
      const tsMs = new Date(dir.createdAt).getTime();
      normalized.push({
        id: `client-dir-${dir.id}`,
        reportNumber: dir.id,
        category: dir.priority === 'High Alert' ? 'critical_incident' : 'routine_dar',
        categoryLabel: `Client Watch (${dir.priority})`,
        timestamp: dir.createdAt,
        timestampMs: tsMs,
        relativeTimestamp: formatRelativePassDownTime(dir.createdAt),
        officerName: dir.postedBy,
        officerCallsign: 'CLIENT-PM',
        title: `[Special Watch] ${dir.targetArea}`,
        narrative: dir.instructions,
        locationZone: dir.targetArea,
        metadataTag: `EXP: ${dir.expirationWindow}`
      });
    });

    // Sort newest first
    return normalized.sort((a, b) => b.timestampMs - a.timestampMs);
  }, [allReports, targetSite, directives]);

  if (!isOpen) return null;

  const criticalCount = handoffEntries.filter((e) => e.category === 'critical_incident').length;
  const maintenanceCount = handoffEntries.filter((e) => e.category === 'maintenance_hazard').length;
  const routineCount = handoffEntries.filter((e) => e.category === 'routine_dar').length;

  const filteredEntries =
    selectedFilter === 'all'
      ? handoffEntries
      : handoffEntries.filter((e) => e.category === selectedFilter);

  const handleConfirmAcknowledge = () => {
    // Also record acknowledgment on any active client directives for this site
    directives
      .filter(
        (dir) =>
          dir.status === 'ACTIVE' &&
          (dir.siteId === targetSite.siteId ||
            dir.siteName.toLowerCase() === targetSite.siteName.toLowerCase())
      )
      .forEach((dir) => {
        acknowledgeDirective(dir.id, {
          id: activeGuard.id,
          name: activeGuard.name,
          badgeNumber: activeGuard.badgeNumber
        });
      });

    const payload: ShiftHandoffAcknowledgment = {
      shiftId: activeShift?.id || `shift-${Date.now()}`,
      officerId: activeShift?.guardId || activeGuard.id,
      acknowledgedAt: new Date().toISOString()
    };
    onAcknowledge(payload);
    onClose();
  };

  const renderCategoryBadge = (category: HandoffCategory, label: string) => {
    switch (category) {
      case 'critical_incident':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/50 font-mono">
            <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case 'maintenance_hazard':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 font-mono">
            <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case 'routine_dar':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-700/70 text-slate-300 border border-slate-600 font-mono">
            <FileText className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{label}</span>
          </span>
        );
    }
  };

  return (
    <div
      id="shift-handoff-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        id="shift-handoff-modal"
        className="w-full max-w-2xl bg-slate-900 border-2 border-blue-500/50 rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-blue-950/90 to-slate-950 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/50 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  48-Hour Site Pass-Down Briefing
                </span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  Rolling 48h Intelligence Window
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{targetSite.siteName}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Review active BOLO alerts, unresolved maintenance hazards, and prior shift DAR notes before assuming post.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close Pass-Down Briefing"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Counters & Category Filter Bar */}
        <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>All Entries</span>
              <span className="px-1.5 py-0.2 rounded bg-black/30 font-mono text-[10px]">
                {handoffEntries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('critical_incident')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'critical_incident'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-950/40 text-rose-300 hover:bg-rose-950/70 border border-rose-800/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Critical Incidents</span>
              <span className="px-1.5 py-0.2 rounded bg-black/30 font-mono text-[10px]">
                {criticalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('maintenance_hazard')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'maintenance_hazard'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-amber-950/40 text-amber-300 hover:bg-amber-950/70 border border-amber-800/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Maintenance</span>
              <span className="px-1.5 py-0.2 rounded bg-black/30 font-mono text-[10px]">
                {maintenanceCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('routine_dar')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === 'routine_dar'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Routine DAR</span>
              <span className="px-1.5 py-0.2 rounded bg-black/30 font-mono text-[10px]">
                {routineCount}
              </span>
            </button>
          </div>
        </div>

        {/* Pass-Down Feed Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-900/60">
          {handoffEntries.length === 0 ? (
            <div
              id="shift-handoff-empty-state"
              className="py-12 px-6 text-center bg-slate-950/60 rounded-2xl border border-emerald-500/30 space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/50">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm font-black text-emerald-300 uppercase tracking-wider font-mono">
                  48-Hour Log Clear • Nominal Post Status
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                  No critical incidents or maintenance issues logged in the last 48 hours. Post is all clear.
                </p>
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-8 px-4 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-400">
              No entries match the selected category filter in the last 48 hours.
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const borderClass =
                entry.category === 'critical_incident'
                  ? 'border-rose-500/60 bg-gradient-to-br from-rose-950/35 via-slate-900 to-slate-950'
                  : entry.category === 'maintenance_hazard'
                  ? 'border-amber-500/60 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950'
                  : 'border-slate-700/80 bg-slate-950/80';

              return (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-xl border ${borderClass} shadow-md space-y-2 transition-all`}
                >
                  {/* Entry Top Bar: Category Badge & Relative Timestamp */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderCategoryBadge(entry.category, entry.categoryLabel)}
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        #{entry.reportNumber}
                      </span>
                      {entry.metadataTag && (
                        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-800/50">
                          {entry.metadataTag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-300">
                      <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                      <span>{entry.relativeTimestamp}</span>
                    </div>
                  </div>

                  {/* Narrative Title & Body */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      {entry.title}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">
                      {entry.narrative}
                    </p>
                  </div>

                  {/* Footer: Reporting Officer Callsign/Name & Zone */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-slate-400 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>
                        Logged by: <strong className="text-slate-200">{entry.officerName}</strong>
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
                        {entry.officerCallsign}
                      </span>
                    </div>

                    {entry.locationZone && (
                      <div className="flex items-center gap-1 font-mono text-[10px] text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{entry.locationZone}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Officer Acknowledgment Action */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Officer <strong className="text-white">{activeGuard.name}</strong> ({activeGuard.badgeNumber}) — Post Intelligence Briefing
            </span>
          </div>

          <button
            id="acknowledge-shift-handoff-btn"
            type="button"
            onClick={handleConfirmAcknowledge}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Acknowledge & Begin Shift</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftHandoffModal;
