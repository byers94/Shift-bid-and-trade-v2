import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import {
  ShiftRecord,
  ShiftRecordBreadcrumb,
  StandardShiftReport
} from '../../types/shift';
import { formatTimeAmPm } from '../../utils/shiftMonitor';
import { ShiftBreadcrumbLeafletMap } from './ShiftBreadcrumbLeafletMap';
import {
  Search,
  Calendar,
  User,
  Building2,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Wrench,
  ShieldAlert,
  MapPin,
  Navigation,
  X,
  Edit3,
  Printer,
  Download,
  Eye,
  Coffee,
  ArrowRight,
  Check,
  AlertOctagon,
  Compass,
  Phone,
  Camera,
  RotateCcw,
  Layers
} from 'lucide-react';

type QuickDateRange = 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM';
type ShiftStatusFilter = 'ALL' | 'NORMAL_COMPLETED' | 'AUTO_CLOCK_OUT' | 'OFF_SITE_ROLLBACK' | 'OVERTIME_FLAGGED';
type ReportTypeFilter = 'ALL' | 'DAR' | 'MAINTENANCE' | 'INCIDENT' | 'UOF';

function getLocalYYYYMMDD(daysOffset: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const ShiftAuditArchive: React.FC = () => {
  const {
    shiftRecords,
    scheduledShifts,
    standardReports,
    guardsList,
    sitesList,
    overrideShiftRecordPayroll,
    showToast
  } = useShiftOps();

  // Merge shiftRecords with any completed/rolled-back scheduledShifts that aren't already in shiftRecords
  const allArchiveShifts: ShiftRecord[] = useMemo(() => {
    const map = new Map<string, ShiftRecord>();
    shiftRecords.forEach((rec) => map.set(rec.id, rec));

    scheduledShifts.forEach((s) => {
      if (
        (s.status === 'completed' ||
          s.status === 'auto_clocked_out' ||
          s.status === 'off_site_clockout_rollback') &&
        !map.has(s.id)
      ) {
        const linkedIds = standardReports
          .filter((r) => r.shiftId === s.id)
          .map((r) => r.id);
        map.set(s.id, {
          id: s.id,
          guardId: s.guardId,
          guardName: s.guardName,
          guardBadge: s.guardBadge,
          guardPhone: s.guardPhone,
          siteId: s.siteId || 'site-1',
          siteName: s.siteName,
          siteCode: s.siteCode,
          siteAddress: s.siteAddress,
          date: s.date,
          postRole: s.postRole,
          scheduledStartTime: s.scheduledStartTime || `${s.date}T${s.startTime}:00`,
          scheduledEndTime: s.scheduledEndTime || `${s.date}T${s.endTime}:00`,
          actualClockInTime: s.actualClockInTime || s.clockInTime || `${s.date}T${s.startTime}:00`,
          actualClockOutTime: s.actualClockOutTime || s.clockOutTime || `${s.date}T${s.endTime}:00`,
          clockInLocation: s.clockInLocation || {
            lat: s.gpsCoordinates?.latitude || 47.6062,
            lng: s.gpsCoordinates?.longitude || -122.3321,
            insideGeofence: true,
            accuracy: 4.2
          },
          clockOutLocation: s.clockOutLocation || {
            lat: s.gpsCoordinates?.latitude || 47.6062,
            lng: s.gpsCoordinates?.longitude || -122.3321,
            insideGeofence: s.status !== 'off_site_clockout_rollback',
            accuracy: 4.5
          },
          lastOnSitePingTimestamp:
            s.lastOnSitePingTimestamp || s.clockOutTime || s.clockInTime || null,
          breaks: (s.breaks || []).map((b) => ({
            id: b.id,
            startTime: b.startedAt,
            endTime: b.endedAt || null,
            durationMinutes: b.durationMinutes || 15,
            type: b.type === 'rest' ? 'REST' : 'MEAL',
            note: b.note
          })),
          gpsBreadcrumbs:
            s.gpsBreadcrumbs && s.gpsBreadcrumbs.length > 0
              ? s.gpsBreadcrumbs
              : (s.breadcrumbs || []).map((c, idx, arr) => ({
                  timestamp: c.timestamp,
                  lat: c.latitude,
                  lng: c.longitude,
                  accuracy: c.accuracy || 5,
                  insideGeofence: c.inGeofence,
                  distanceMeters: c.distanceMeters,
                  event:
                    idx === 0
                      ? 'CLOCK_IN'
                      : !c.inGeofence
                      ? 'PERIMETER_EXIT'
                      : c.status === 'on_break'
                      ? 'BREAK'
                      : idx === arr.length - 1
                      ? 'CLOCK_OUT'
                      : 'PATROL_PING',
                  label: c.parcelOrCheckpointName
                })),
          linkedReportIds: s.linkedReportIds || linkedIds,
          status:
            s.status === 'off_site_clockout_rollback'
              ? 'OFF_SITE_CLOCKOUT_ROLLBACK'
              : s.status === 'auto_clocked_out'
              ? 'AUTO_CLOCKED_OUT'
              : 'COMPLETED',
          timeAdjustmentAudit: s.timeAdjustmentAudit,
          scheduledHours: s.hours || 8,
          actualPayableHours: s.actualHoursWorked || s.hours || 8
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      b.date.localeCompare(a.date) ||
      (b.actualClockInTime || '').localeCompare(a.actualClockInTime || '')
    );
  }, [shiftRecords, scheduledShifts, standardReports]);

  // Filter States
  const [quickDateRange, setQuickDateRange] = useState<QuickDateRange>('LAST_7_DAYS');
  const [dateFrom, setDateFrom] = useState<string>(getLocalYYYYMMDD(-7));
  const [dateTo, setDateTo] = useState<string>(getLocalYYYYMMDD(0));
  const [selectedGuardId, setSelectedGuardId] = useState<string>('ALL');
  const [guardSearchQuery, setGuardSearchQuery] = useState<string>('');
  const [selectedSiteName, setSelectedSiteName] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<ShiftStatusFilter>('ALL');
  const [reportTypeFilter, setReportTypeFilter] = useState<ReportTypeFilter>('ALL');
  const [textSearch, setTextSearch] = useState<string>('');

  // Selected Dossier Modal State
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [selectedBreadcrumbIndex, setSelectedBreadcrumbIndex] = useState<number>(0);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Supervisor Payroll Override Modal State
  const [isOverrideFormOpen, setIsOverrideFormOpen] = useState<boolean>(false);
  const [overrideRestoreOriginal, setOverrideRestoreOriginal] = useState<boolean>(true);
  const [overrideCustomClockOutTime, setOverrideCustomClockOutTime] = useState<string>('');
  const [overrideSupervisorName, setOverrideSupervisorName] = useState<string>('Cmdr. Vance Sterling (OPS-001)');
  const [overrideNote, setOverrideNote] = useState<string>(
    'Approved by Supervisor: Guard was escorting hospital/facility staff to off-site parking annex prior to clock-out.'
  );

  // Print-Ready Export Dossier Preview Modal
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState<boolean>(false);

  const selectedShift = useMemo(
    () => allArchiveShifts.find((s) => s.id === selectedShiftId) || null,
    [allArchiveShifts, selectedShiftId]
  );

  // Helper to get linked reports for any shift record
  const getLinkedReportsForShift = (shift: ShiftRecord): StandardShiftReport[] => {
    const idSet = new Set(shift.linkedReportIds || []);
    return standardReports.filter(
      (r) => idSet.has(r.id) || r.shiftId === shift.id
    );
  };

  // Handle Quick Date Selection
  const handleSelectQuickDate = (mode: QuickDateRange) => {
    setQuickDateRange(mode);
    const today = getLocalYYYYMMDD(0);
    if (mode === 'TODAY') {
      setDateFrom(today);
      setDateTo(today);
    } else if (mode === 'YESTERDAY') {
      const yest = getLocalYYYYMMDD(-1);
      setDateFrom(yest);
      setDateTo(yest);
    } else if (mode === 'LAST_7_DAYS') {
      setDateFrom(getLocalYYYYMMDD(-7));
      setDateTo(today);
    } else if (mode === 'THIS_MONTH') {
      const d = new Date();
      const firstOfMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      setDateFrom(firstOfMonth);
      setDateTo(today);
    }
  };

  // Filtered Shift Records
  const filteredShifts = useMemo(() => {
    return allArchiveShifts.filter((shift) => {
      // 1. Date Range
      if (quickDateRange !== 'ALL') {
        if (dateFrom && shift.date < dateFrom) return false;
        if (dateTo && shift.date > dateTo) return false;
      }

      // 2. Guard Dropdown Filter
      if (selectedGuardId !== 'ALL' && shift.guardId !== selectedGuardId && shift.guardName !== selectedGuardId) {
        return false;
      }

      // 3. Guard Name / Badge Quick Search
      if (guardSearchQuery.trim()) {
        const q = guardSearchQuery.toLowerCase().trim();
        const matchGuard =
          shift.guardName.toLowerCase().includes(q) ||
          shift.guardBadge.toLowerCase().includes(q);
        if (!matchGuard) return false;
      }

      // 4. Site Filter
      if (selectedSiteName !== 'ALL' && shift.siteName !== selectedSiteName) {
        return false;
      }

      // 5. Status Filter
      const scheduledHrs = shift.scheduledHours || 8;
      const actualHrs = shift.actualPayableHours ?? scheduledHrs;
      const isOvertime = Boolean(
        shift.isOvertimeFlagged ||
        (shift.overtimeMinutes && shift.overtimeMinutes > 0) ||
        actualHrs > scheduledHrs + 0.1
      );

      if (statusFilter === 'NORMAL_COMPLETED' && shift.status !== 'COMPLETED') return false;
      if (statusFilter === 'AUTO_CLOCK_OUT' && shift.status !== 'AUTO_CLOCKED_OUT') return false;
      if (statusFilter === 'OFF_SITE_ROLLBACK' && shift.status !== 'OFF_SITE_CLOCKOUT_ROLLBACK') return false;
      if (statusFilter === 'OVERTIME_FLAGGED' && !isOvertime) return false;

      // 6. Report Type Filter
      const linkedReports = getLinkedReportsForShift(shift);
      if (reportTypeFilter === 'DAR') {
        if (!linkedReports.some((r) => r.reportType === 'activity')) return false;
      } else if (reportTypeFilter === 'MAINTENANCE') {
        if (!linkedReports.some((r) => r.reportType === 'maintenance')) return false;
      } else if (reportTypeFilter === 'INCIDENT') {
        if (!linkedReports.some((r) => r.reportType === 'incident')) return false;
      } else if (reportTypeFilter === 'UOF') {
        if (
          !linkedReports.some(
            (r) =>
              r.useOfForce ||
              r.incidentDetails?.useOfForce ||
              Boolean(r.incidentDetails?.useOfForceSupplement)
          )
        ) {
          return false;
        }
      }

      // 7. Full Text Search across narratives, report numbers, license plates, subject names
      if (textSearch.trim()) {
        const q = textSearch.toLowerCase().trim();
        const shiftHaystack = [
          shift.id,
          shift.guardName,
          shift.guardBadge,
          shift.siteName,
          shift.postRole,
          shift.timeAdjustmentAudit?.reason,
          shift.timeAdjustmentAudit?.supervisorOverride?.note
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const reportsHaystack = linkedReports
          .map((r) => {
            const parties = (r.incidentDetails?.partiesInvolved || [])
              .map((p) => `${p.name || ''} ${p.vehicleInfo || ''} ${p.idNumber || ''} ${p.statementOrNotes || ''}`)
              .join(' ');
            const uof = r.incidentDetails?.useOfForceSupplement
              ? `${r.incidentDetails.useOfForceSupplement.justificationNarrative} ${r.incidentDetails.useOfForceSupplement.forceOptionsUtilized.join(' ')}`
              : '';
            return [
              r.reportNumber,
              r.activityDetails?.zoneChecked,
              r.activityDetails?.observationNotes,
              r.maintenanceDetails?.issueTitle,
              r.maintenanceDetails?.detailedDescription,
              r.maintenanceDetails?.workOrderNumber,
              r.maintenanceDetails?.contactedPersonOrVendorName,
              r.incidentDetails?.incidentTitle,
              r.incidentDetails?.summary,
              r.incidentDetails?.detailedTimeline,
              r.incidentDetails?.actionTakenByGuard,
              r.incidentDetails?.policeReportNumber,
              r.incidentDetails?.cadIncidentNumber,
              parties,
              uof
            ]
              .filter(Boolean)
              .join(' ');
          })
          .join(' ')
          .toLowerCase();

        if (!shiftHaystack.includes(q) && !reportsHaystack.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [
    allArchiveShifts,
    quickDateRange,
    dateFrom,
    dateTo,
    selectedGuardId,
    guardSearchQuery,
    selectedSiteName,
    statusFilter,
    reportTypeFilter,
    textSearch,
    standardReports
  ]);

  // Summary KPIs
  const summaryStats = useMemo(() => {
    const totalShifts = filteredShifts.length;
    const rollbackCount = filteredShifts.filter((s) => s.status === 'OFF_SITE_CLOCKOUT_ROLLBACK').length;
    const autoClockOutCount = filteredShifts.filter((s) => s.status === 'AUTO_CLOCKED_OUT').length;
    const totalMinutesDeducted = filteredShifts.reduce(
      (sum, s) => sum + (s.timeAdjustmentAudit?.deductedMinutes || 0),
      0
    );
    const totalLinkedReports = filteredShifts.reduce(
      (sum, s) => sum + getLinkedReportsForShift(s).length,
      0
    );
    return {
      totalShifts,
      rollbackCount,
      autoClockOutCount,
      totalMinutesDeducted,
      totalLinkedReports
    };
  }, [filteredShifts, standardReports]);

  const handleOpenDossier = (shift: ShiftRecord) => {
    setSelectedShiftId(shift.id);
    const lastIdx = Math.max(0, (shift.gpsBreadcrumbs?.length || 1) - 1);
    setSelectedBreadcrumbIndex(lastIdx);
    const linked = getLinkedReportsForShift(shift);
    setExpandedReportId(linked[0]?.id || null);
    setIsOverrideFormOpen(false);
    setOverrideCustomClockOutTime(
      shift.timeAdjustmentAudit?.originalClockOutTime ||
      shift.scheduledEndTime ||
      shift.actualClockOutTime ||
      ''
    );
  };

  const handleSaveSupervisorOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShift) return;
    if (!overrideNote.trim()) {
      showToast('Audit Note Required', 'Please enter a mandatory supervisor justification note.', 'warning');
      return;
    }

    const targetClockOut = overrideRestoreOriginal
      ? selectedShift.timeAdjustmentAudit?.originalClockOutTime || selectedShift.scheduledEndTime
      : overrideCustomClockOutTime || selectedShift.scheduledEndTime;

    overrideShiftRecordPayroll(selectedShift.id, {
      adjustedClockOutTime: targetClockOut,
      originalHoursRestored: overrideRestoreOriginal,
      note: overrideNote.trim(),
      approvedBy: overrideSupervisorName.trim() || 'Cmdr. Vance Sterling',
      approvedByBadge: 'OPS-001'
    });

    setIsOverrideFormOpen(false);
  };

  return (
    <div id="shift-audit-archive-view" className="space-y-5">
      {/* Header Banner & Rollback Engine Telemetry Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-mono font-black uppercase tracking-wider">
                COMMAND CAD • PAYROLL & TELEMETRY AUDIT VAULT
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold">
                Off-Site Termination Rollback Active
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5 flex items-center gap-2">
              <span>🗄️ Master Historical Shift & Report Audit Archive</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Granular shift timekeeping, continuous on-site GPS ping verification, automated +30m expiration clock-outs, off-site payroll rollbacks, and linked DAR / Maintenance / Incident / UoF dossiers.
            </p>
          </div>

          {/* Top Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Archived Shifts</span>
              <span className="text-lg font-mono font-black text-white">{summaryStats.totalShifts}</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40">
              <span className="text-[10px] font-mono uppercase text-rose-300 block">Off-Site Rollbacks</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-mono font-black text-rose-400">{summaryStats.rollbackCount}</span>
                <span className="text-[10px] font-mono font-bold text-rose-300">
                  (-{summaryStats.totalMinutesDeducted}m clipped)
                </span>
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40">
              <span className="text-[10px] font-mono uppercase text-amber-300 block">Auto Clock-Outs</span>
              <span className="text-lg font-mono font-black text-amber-400">{summaryStats.autoClockOutCount}</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
              <span className="text-[10px] font-mono uppercase text-emerald-300 block">Linked Reports</span>
              <span className="text-lg font-mono font-black text-emerald-400">{summaryStats.totalLinkedReports}</span>
            </div>
          </div>
        </div>

        {/* Comprehensive Search & Filter Bar */}
        <div className="pt-4 space-y-3">
          {/* Row 1: Date Range Quick Selectors + Custom Date Inputs + Full-Text Search */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Window:</span>
              </span>
              {(
                [
                  { id: 'TODAY', label: 'Today' },
                  { id: 'YESTERDAY', label: 'Yesterday' },
                  { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
                  { id: 'THIS_MONTH', label: 'This Month' },
                  { id: 'ALL', label: 'All History' }
                ] as { id: QuickDateRange; label: string }[]
              ).map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => handleSelectQuickDate(btn.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                    quickDateRange === btn.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}

              {/* Custom Date Range Inputs */}
              <div className="flex items-center gap-1.5 ml-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setQuickDateRange('CUSTOM');
                  }}
                  className="bg-transparent text-xs font-mono text-white focus:outline-none"
                />
                <span className="text-[10px] font-mono text-slate-400">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setQuickDateRange('CUSTOM');
                  }}
                  className="bg-transparent text-xs font-mono text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Text Search across narratives, report #, license plates, subject names */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="archive-text-search-input"
                type="text"
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
                placeholder="Search narratives, report # (INC-2026-7731), plates (WA-789-XTR), or subjects (Devon Vance)..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              {textSearch && (
                <button
                  type="button"
                  onClick={() => setTextSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Guard Filter, Site Filter, Status Filter, Report Type Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
            {/* Guard Dropdown */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 block">
                Officer / Guard Filter
              </label>
              <select
                value={selectedGuardId}
                onChange={(e) => setSelectedGuardId(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-white focus:outline-none mt-0.5"
              >
                <option value="ALL" className="bg-slate-900">All Officers ({guardsList.length})</option>
                {guardsList.map((g) => (
                  <option key={g.id} value={g.id} className="bg-slate-900">
                    {g.name} ({g.badgeNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Guard Badge / Name Quick Input */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 block">
                Search Officer Name / Badge #
              </label>
              <input
                type="text"
                value={guardSearchQuery}
                onChange={(e) => setGuardSearchQuery(e.target.value)}
                placeholder="e.g. SEC-8842 or Alex Mercer"
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none mt-0.5 font-mono"
              />
            </div>

            {/* Facility / Site Filter */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 block">
                Facility / Site Filter
              </label>
              <select
                value={selectedSiteName}
                onChange={(e) => setSelectedSiteName(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-white focus:outline-none mt-0.5"
              >
                <option value="ALL" className="bg-slate-900">All Properties</option>
                {Array.from(
                  new Set([
                    ...sitesList.map((s) => s.name),
                    ...allArchiveShifts.map((s) => s.siteName)
                  ])
                ).map((siteName) => (
                  <option key={siteName} value={siteName} className="bg-slate-900">
                    {siteName}
                  </option>
                ))}
              </select>
            </div>

            {/* Shift Status Filter */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 block">
                Shift Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ShiftStatusFilter)}
                className="w-full bg-transparent text-xs font-bold text-white focus:outline-none mt-0.5"
              >
                <option value="ALL" className="bg-slate-900">All Shifts</option>
                <option value="NORMAL_COMPLETED" className="bg-slate-900">Normal Completed</option>
                <option value="AUTO_CLOCK_OUT" className="bg-slate-900">Auto Clock-Out (+30m)</option>
                <option value="OFF_SITE_ROLLBACK" className="bg-slate-900">Off-Site Rollback</option>
                <option value="OVERTIME_FLAGGED" className="bg-slate-900">Overtime Flagged</option>
              </select>
            </div>

            {/* Report Type Filter */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 block">
                Linked Report Type Filter
              </label>
              <select
                value={reportTypeFilter}
                onChange={(e) => setReportTypeFilter(e.target.value as ReportTypeFilter)}
                className="w-full bg-transparent text-xs font-bold text-white focus:outline-none mt-0.5"
              >
                <option value="ALL" className="bg-slate-900">All Reports</option>
                <option value="DAR" className="bg-slate-900">Daily Activity Report (DAR)</option>
                <option value="MAINTENANCE" className="bg-slate-900">Maintenance Requests</option>
                <option value="INCIDENT" className="bg-slate-900">Flagged / Incident</option>
                <option value="UOF" className="bg-slate-900">Use of Force (UoF)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Archive Shift Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Historical Shift & Timekeeping Audit Ledger ({filteredShifts.length})
            </h3>
          </div>
          {(selectedGuardId !== 'ALL' ||
            guardSearchQuery ||
            selectedSiteName !== 'ALL' ||
            statusFilter !== 'ALL' ||
            reportTypeFilter !== 'ALL' ||
            textSearch) && (
            <button
              type="button"
              onClick={() => {
                handleSelectQuickDate('LAST_7_DAYS');
                setSelectedGuardId('ALL');
                setGuardSearchQuery('');
                setSelectedSiteName('ALL');
                setStatusFilter('ALL');
                setReportTypeFilter('ALL');
                setTextSearch('');
              }}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                <th className="py-3 px-4">Date & Time Window</th>
                <th className="py-3 px-4">Guard / Officer</th>
                <th className="py-3 px-4">Site / Property</th>
                <th className="py-3 px-4">Scheduled vs. Actual Hours</th>
                <th className="py-3 px-4">Breaks Logged</th>
                <th className="py-3 px-4">Reports Filed</th>
                <th className="py-3 px-4">Audit Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No archived shifts match your current filter criteria. Try expanding the date window or clearing filters.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => {
                  const linkedReports = getLinkedReportsForShift(shift);
                  const darCount = linkedReports.filter((r) => r.reportType === 'activity').length;
                  const maintCount = linkedReports.filter((r) => r.reportType === 'maintenance').length;
                  const incCount = linkedReports.filter((r) => r.reportType === 'incident').length;
                  const uofCount = linkedReports.filter(
                    (r) =>
                      r.useOfForce ||
                      r.incidentDetails?.useOfForce ||
                      Boolean(r.incidentDetails?.useOfForceSupplement)
                  ).length;

                  const totalBreakMins = (shift.breaks || []).reduce(
                    (acc, b) => acc + (b.durationMinutes || 0),
                    0
                  );

                  const schedHrs = shift.scheduledHours || 8.0;
                  const actualHrs = shift.actualPayableHours ?? schedHrs;
                  const deductedMins = shift.timeAdjustmentAudit?.deductedMinutes || 0;
                  const isRestored = Boolean(
                    shift.timeAdjustmentAudit?.supervisorOverride?.originalHoursRestored
                  );

                  return (
                    <tr
                      key={shift.id}
                      className={`transition-colors hover:bg-slate-800/50 ${
                        shift.status === 'OFF_SITE_CLOCKOUT_ROLLBACK' && !isRestored
                          ? 'bg-rose-950/20'
                          : shift.status === 'AUTO_CLOCKED_OUT'
                          ? 'bg-amber-950/15'
                          : ''
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-white">{shift.date}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          Sched: {formatTimeAmPm(shift.scheduledStartTime)} – {formatTimeAmPm(shift.scheduledEndTime)}
                        </div>
                        <div className="text-[11px] font-mono text-blue-300 mt-0.5">
                          Actual: {formatTimeAmPm(shift.actualClockInTime)} – {formatTimeAmPm(shift.actualClockOutTime)}
                        </div>
                      </td>

                      {/* Guard */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-blue-300 text-xs shrink-0">
                            {shift.guardName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <div>
                            <div className="font-bold text-white">{shift.guardName}</div>
                            <div className="text-[11px] font-mono text-slate-400">{shift.guardBadge}</div>
                          </div>
                        </div>
                      </td>

                      {/* Site */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-200">{shift.siteName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {shift.postRole || 'Facility Security Post'}
                        </div>
                      </td>

                      {/* Scheduled vs. Actual Hours */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400">{schedHrs.toFixed(1)}h</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="font-mono font-black text-white">{actualHrs.toFixed(2)}h</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          {shift.status === 'OFF_SITE_CLOCKOUT_ROLLBACK' && !isRestored ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 font-mono font-black text-[10px]">
                              -{deductedMins || 28}m Rollback
                            </span>
                          ) : isRestored ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-[10px]">
                              ✓ Override Restored ({schedHrs.toFixed(1)}h)
                            </span>
                          ) : shift.isOvertimeFlagged || (shift.overtimeMinutes && shift.overtimeMinutes > 0) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono font-black text-[10px]">
                              +{shift.overtimeMinutes || Math.round((actualHrs - schedHrs) * 60)}m OT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[10px]">
                              On-Target
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Break Duration */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-200">{totalBreakMins}m Total</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {(shift.breaks || []).length} break(s) logged
                        </div>
                      </td>

                      {/* Reports Filed */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {darCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 font-mono font-bold text-[10px]">
                              {darCount} DAR
                            </span>
                          )}
                          {maintCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-[10px]">
                              {maintCount} Maint
                            </span>
                          )}
                          {incCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono font-bold text-[10px]">
                              {incCount} Incident
                            </span>
                          )}
                          {uofCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-black text-[10px]">
                              ⚠️ {uofCount} UoF
                            </span>
                          )}
                          {linkedReports.length === 0 && (
                            <span className="text-[11px] font-mono text-slate-500">0 Filed</span>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {shift.status === 'OFF_SITE_CLOCKOUT_ROLLBACK' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/20 border border-rose-500/60 text-rose-300 font-mono font-black text-[10px]">
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                            <span>OFF_SITE_CLOCKOUT_ROLLBACK</span>
                          </span>
                        ) : shift.status === 'AUTO_CLOCKED_OUT' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/60 text-amber-300 font-mono font-black text-[10px]">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>AUTO_CLOCKED_OUT</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-mono font-black text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>COMPLETED</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenDossier(shift)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                        >
                          [ 🔍 View Audit Dossier ]
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* DETAILED SHIFT AUDIT & GPS BREADCRUMB DOSSIER MODAL                   */}
      {/* ===================================================================== */}
      {selectedShift && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300">
                    SHIFT AUDIT DOSSIER • #{selectedShift.id}
                  </span>
                  {selectedShift.status === 'OFF_SITE_CLOCKOUT_ROLLBACK' ? (
                    <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded bg-rose-600 text-white">
                      🚨 OFF_SITE_CLOCKOUT_ROLLBACK
                    </span>
                  ) : selectedShift.status === 'AUTO_CLOCKED_OUT' ? (
                    <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded bg-amber-500 text-slate-950">
                      ⏱️ AUTO_CLOCKED_OUT (+30M TIMEOUT)
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded bg-emerald-600 text-white">
                      ✓ VERIFIED ON-SITE COMPLETION
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                  {selectedShift.guardName} ({selectedShift.guardBadge}) — {selectedShift.siteName}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Shift Date: {selectedShift.date} • Post: {selectedShift.postRole || 'Security Patrol'} • Last Verified On-Site Ping:{' '}
                  <span className="text-emerald-300 font-bold">
                    {formatTimeAmPm(selectedShift.lastOnSitePingTimestamp)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintPreviewOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>[ 📄 Export Shift Audit & Reports (PDF / Print-Ready) ]</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShiftId(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* 1. ROLLBACK / EXCEPTION AUDIT BANNER & SUPERVISOR PAYROLL OVERRIDE */}
              {(selectedShift.status === 'OFF_SITE_CLOCKOUT_ROLLBACK' ||
                selectedShift.status === 'AUTO_CLOCKED_OUT' ||
                selectedShift.timeAdjustmentAudit) && (
                <div
                  className={`p-4 rounded-2xl border-2 space-y-3 ${
                    selectedShift.status === 'OFF_SITE_CLOCKOUT_ROLLBACK'
                      ? 'bg-rose-950/40 border-rose-500/70 text-rose-100'
                      : 'bg-amber-950/40 border-amber-500/70 text-amber-100'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
                        <span className="text-xs font-mono font-black uppercase tracking-wider text-rose-300">
                          {selectedShift.status === 'OFF_SITE_CLOCKOUT_ROLLBACK'
                            ? 'OFF-SITE CLOCK-OUT PAYROLL ROLLBACK APPLIED'
                            : 'AUTOMATED +30M SHIFT EXPIRATION AUDIT'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                        {selectedShift.timeAdjustmentAudit?.reason ||
                          `Off-Site Clock-Out Rollback: Guard terminated shift while outside property geofence. Paid time rolled back to last on-site ping at ${formatTimeAmPm(
                            selectedShift.lastOnSitePingTimestamp
                          )}.`}
                      </p>

                      {/* Detailed Rollback Telemetry Metrics */}
                      {selectedShift.timeAdjustmentAudit && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10">
                            <span className="text-[10px] font-mono uppercase text-slate-400 block">
                              Attempted Clock-Out
                            </span>
                            <span className="text-xs font-mono font-bold text-rose-300">
                              {formatTimeAmPm(selectedShift.timeAdjustmentAudit.originalClockOutTime)}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10">
                            <span className="text-[10px] font-mono uppercase text-slate-400 block">
                              Rolled-Back Payable Time
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-300">
                              {formatTimeAmPm(selectedShift.timeAdjustmentAudit.adjustedClockOutTime)}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10">
                            <span className="text-[10px] font-mono uppercase text-slate-400 block">
                              Deducted Payroll Time
                            </span>
                            <span className="text-xs font-mono font-black text-rose-400">
                              -{selectedShift.timeAdjustmentAudit.deductedMinutes} mins
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10">
                            <span className="text-[10px] font-mono uppercase text-slate-400 block">
                              Off-Site Exit Coordinates
                            </span>
                            <span className="text-xs font-mono text-slate-200">
                              {selectedShift.clockOutLocation
                                ? `${selectedShift.clockOutLocation.lat.toFixed(4)}, ${selectedShift.clockOutLocation.lng.toFixed(4)} (${selectedShift.clockOutLocation.distanceMeters || 420}m out)`
                                : 'Verified On-Site'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Existing Supervisor Override Record */}
                      {selectedShift.timeAdjustmentAudit?.supervisorOverride && (
                        <div className="mt-2 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-100 text-xs space-y-1">
                          <div className="font-mono font-black text-emerald-300 uppercase">
                            ✓ SUPERVISOR PAYROLL OVERRIDE LOGGED BY {selectedShift.timeAdjustmentAudit.supervisorOverride.approvedBy}
                          </div>
                          <p>
                            {selectedShift.timeAdjustmentAudit.supervisorOverride.originalHoursRestored
                              ? 'Original scheduled hours restored in full.'
                              : `Adjusted payable clock-out to ${formatTimeAmPm(
                                  selectedShift.timeAdjustmentAudit.supervisorOverride.adjustedPayableClockOutTime
                                )}.`}{' '}
                            Audit Note: "{selectedShift.timeAdjustmentAudit.supervisorOverride.note}"
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsOverrideFormOpen((prev) => !prev)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
                      >
                        [ ✏️ Supervisor Override / Adjust Timecard ]
                      </button>
                    </div>
                  </div>

                  {/* Supervisor Payroll Override Form */}
                  {isOverrideFormOpen && (
                    <form
                      onSubmit={handleSaveSupervisorOverride}
                      className="p-4 rounded-xl bg-slate-950/95 border border-amber-500/50 space-y-3 mt-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-black uppercase text-amber-300">
                          Supervisor Timecard & Payroll Override Authorization
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsOverrideFormOpen(false)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Close
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                            Adjustment Action
                          </label>
                          <div className="space-y-1 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer text-white">
                              <input
                                type="radio"
                                checked={overrideRestoreOriginal}
                                onChange={() => setOverrideRestoreOriginal(true)}
                              />
                              <span>Restore Original Scheduled Hours ({selectedShift.scheduledHours || 8}h)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                              <input
                                type="radio"
                                checked={!overrideRestoreOriginal}
                                onChange={() => setOverrideRestoreOriginal(false)}
                              />
                              <span>Set Custom Payable Clock-Out Timestamp</span>
                            </label>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                            Approving Supervisor
                          </label>
                          <input
                            type="text"
                            value={overrideSupervisorName}
                            onChange={(e) => setOverrideSupervisorName(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                            required
                          />
                          {!overrideRestoreOriginal && (
                            <div className="mt-2">
                              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                                Custom Payable Clock-Out (ISO)
                              </label>
                              <input
                                type="text"
                                value={overrideCustomClockOutTime}
                                onChange={(e) => setOverrideCustomClockOutTime(e.target.value)}
                                className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                              />
                            </div>
                          )}
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <label className="text-[10px] font-mono uppercase text-amber-300 block mb-1">
                            Mandatory Supervisor Audit Note *
                          </label>
                          <textarea
                            rows={2}
                            value={overrideNote}
                            onChange={(e) => setOverrideNote(e.target.value)}
                            placeholder="Approved by Supervisor: Guard was escorting staff to off-site parking garage..."
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsOverrideFormOpen(false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer"
                        >
                          Authorize & Commit Payroll Override
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* 2. TIMECARD & PAYROLL BREAKDOWN + BREAK LOG TABLE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <h4 className="text-xs font-mono font-black uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Timecard & Payroll Calculation Breakdown</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsOverrideFormOpen((prev) => !prev)}
                      className="text-[11px] font-mono font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      [ ✏️ Supervisor Override / Adjust Timecard ]
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Scheduled Window</span>
                      <span className="font-mono font-bold text-white block mt-0.5">
                        {formatTimeAmPm(selectedShift.scheduledStartTime)} – {formatTimeAmPm(selectedShift.scheduledEndTime)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ({(selectedShift.scheduledHours || 8).toFixed(2)}h Scheduled)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Actual Clock-In</span>
                      <span className="font-mono font-bold text-emerald-300 block mt-0.5">
                        {formatTimeAmPm(selectedShift.actualClockInTime)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {selectedShift.clockInLocation.insideGeofence ? '✓ Inside Geofence' : '⚠️ Outside Geofence'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Payable Clock-Out</span>
                      <span className="font-mono font-bold text-blue-300 block mt-0.5">
                        {formatTimeAmPm(selectedShift.actualClockOutTime)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Last On-Site: {formatTimeAmPm(selectedShift.lastOnSitePingTimestamp)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/40">
                      <span className="text-[10px] font-mono uppercase text-blue-300 block">Net Payable Hours</span>
                      <span className="text-lg font-mono font-black text-white block mt-0.5">
                        {(selectedShift.actualPayableHours ?? selectedShift.scheduledHours ?? 8).toFixed(2)} hrs
                      </span>
                      {selectedShift.timeAdjustmentAudit?.deductedMinutes ? (
                        <span className="text-[10px] font-mono font-bold text-rose-400">
                          -{selectedShift.timeAdjustmentAudit.deductedMinutes}m Off-Site Rollback
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-400">100% Verified On-Site</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Break Log Table */}
                <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-xs font-mono font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5 border-b border-slate-800 pb-2.5">
                    <Coffee className="w-4 h-4" />
                    <span>Break Log Table ({(selectedShift.breaks || []).length})</span>
                  </h4>

                  {(selectedShift.breaks || []).length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center font-mono">
                      No rest or meal breaks logged during this shift.
                    </p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                          <th className="pb-1.5">Type</th>
                          <th className="pb-1.5">Start</th>
                          <th className="pb-1.5">End</th>
                          <th className="pb-1.5 text-right">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {selectedShift.breaks.map((brk) => (
                          <tr key={brk.id}>
                            <td className="py-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  brk.type === 'MEAL'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                }`}
                              >
                                {brk.type}
                              </span>
                            </td>
                            <td className="py-2 text-slate-200">{formatTimeAmPm(brk.startTime)}</td>
                            <td className="py-2 text-slate-200">{formatTimeAmPm(brk.endTime)}</td>
                            <td className="py-2 text-right font-bold text-white">{brk.durationMinutes}m</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* 3. INTERACTIVE GPS BREADCRUMB MAP & TRAIL VIEWER */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-mono font-black uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-emerald-400" />
                      <span>Interactive GPS Breadcrumb Map & Telemetry Trail ({selectedShift.gpsBreadcrumbs.length} Pings)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click any waypoint on the radar map or timeline to inspect exact timestamp, coordinates, geofence compliance, and event tag.
                    </p>
                  </div>

                  {/* Color Legend */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                      🟢 On-Site Patrol / Checkpoint
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                      🟡 Authorized Meal/Rest Break
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      🔴 Off-Site Breach / Termination
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Real Interactive Leaflet Street Map & Geofence Breadcrumb Plotter */}
                  <div className="lg:col-span-7 relative bg-slate-900 rounded-xl border border-slate-800 p-3.5 min-h-[340px] flex flex-col justify-between overflow-hidden">
                    <ShiftBreadcrumbLeafletMap
                      shift={selectedShift}
                      geofenceRadiusMeters={
                        sitesList.find(
                          (s) => s.id === selectedShift.siteId || s.name === selectedShift.siteName
                        )?.geofenceRadiusMeters || 180
                      }
                      selectedBreadcrumbIndex={selectedBreadcrumbIndex}
                      onSelectBreadcrumbIndex={setSelectedBreadcrumbIndex}
                      formatTimeAmPm={formatTimeAmPm}
                    />
                  </div>

                  {/* Chronological Breadcrumb Waypoint List */}
                  <div className="lg:col-span-5 bg-slate-900 rounded-xl border border-slate-800 p-3 max-h-[340px] overflow-y-auto space-y-1.5">
                    {selectedShift.gpsBreadcrumbs.map((crumb, idx) => {
                      const isOffSite = !crumb.insideGeofence || crumb.event === 'PERIMETER_EXIT';
                      const isBreak = crumb.event === 'BREAK';
                      const isSelected = idx === selectedBreadcrumbIndex;

                      return (
                        <button
                          key={`${crumb.timestamp}-${idx}`}
                          type="button"
                          onClick={() => setSelectedBreadcrumbIndex(idx)}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                            isSelected
                              ? 'bg-blue-950/60 border-blue-500 shadow-xs'
                              : isOffSite
                              ? 'bg-rose-950/30 border-rose-500/40 hover:bg-rose-950/50'
                              : isBreak
                              ? 'bg-amber-950/25 border-amber-500/30 hover:bg-amber-950/40'
                              : 'bg-slate-950/80 border-slate-800 hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span>{isOffSite ? '🔴' : isBreak ? '🟡' : '🟢'}</span>
                              <span className="font-mono font-black text-[10px] uppercase text-white">
                                [{crumb.event || 'PATROL_PING'}]
                              </span>
                              <span className="font-mono text-[11px] font-bold text-blue-300">
                                {formatTimeAmPm(crumb.timestamp)}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-200 truncate mt-0.5">
                              {crumb.label || `Telemetry Ping #${idx + 1}`}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {crumb.lat.toFixed(5)}, {crumb.lng.toFixed(5)} • ±{crumb.accuracy}m
                              {crumb.distanceMeters !== undefined ? ` • ${crumb.distanceMeters}m from center` : ''}
                            </p>
                          </div>
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isOffSite
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {isOffSite ? 'OFF-SITE' : 'ON-SITE'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. LINKED DUTY REPORTS SECTION */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <h4 className="text-xs font-mono font-black uppercase tracking-wider text-blue-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>
                      Linked Duty Reports Filed During Shift ({getLinkedReportsForShift(selectedShift).length})
                    </span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    Click any report card to inspect full narrative, photos, emergency call-outs, and Use of Force supplements
                  </span>
                </div>

                {(() => {
                  const linkedReports = getLinkedReportsForShift(selectedShift);
                  if (linkedReports.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs text-slate-500 font-mono">
                        No DAR, Maintenance, or Incident reports were linked to this shift.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {linkedReports.map((rpt) => {
                        const isExpanded = expandedReportId === rpt.id;
                        const hasUof = Boolean(
                          rpt.useOfForce ||
                          rpt.incidentDetails?.useOfForce ||
                          rpt.incidentDetails?.useOfForceSupplement
                        );

                        return (
                          <div
                            key={rpt.id}
                            className={`rounded-xl border transition-all overflow-hidden ${
                              hasUof
                                ? 'border-rose-500/70 bg-rose-950/20'
                                : rpt.reportType === 'incident'
                                ? 'border-rose-500/40 bg-slate-900'
                                : rpt.reportType === 'maintenance'
                                ? 'border-amber-500/40 bg-slate-900'
                                : 'border-slate-800 bg-slate-900'
                            }`}
                          >
                            {/* Interactive Card Header */}
                            <div
                              onClick={() => setExpandedReportId(isExpanded ? null : rpt.id)}
                              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-800/60"
                            >
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span
                                  className={`px-2.5 py-0.5 rounded font-mono font-black text-[10px] uppercase ${
                                    rpt.reportType === 'incident'
                                      ? 'bg-rose-600 text-white'
                                      : rpt.reportType === 'maintenance'
                                      ? 'bg-amber-500 text-slate-950'
                                      : 'bg-blue-600 text-white'
                                  }`}
                                >
                                  {rpt.reportType === 'activity'
                                    ? 'DAR PATROL'
                                    : rpt.reportType === 'maintenance'
                                    ? 'MAINTENANCE'
                                    : 'INCIDENT'}
                                </span>
                                {hasUof && (
                                  <span className="px-2.5 py-0.5 rounded bg-rose-500/30 border border-rose-400 text-rose-200 font-mono font-black text-[10px]">
                                    🚨 USE OF FORCE SUPPLEMENT ATTACHED
                                  </span>
                                )}
                                <span className="font-mono font-bold text-xs text-blue-300">
                                  #{rpt.reportNumber}
                                </span>
                                <span className="font-bold text-xs text-white">
                                  {rpt.incidentDetails?.incidentTitle ||
                                    rpt.maintenanceDetails?.issueTitle ||
                                    rpt.activityDetails?.zoneChecked}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                                <span>{formatTimeAmPm(rpt.timestamp)}</span>
                                <span className="text-blue-400 font-bold">
                                  {isExpanded ? 'Hide Details ▲' : 'Inspect Full Report ▼'}
                                </span>
                              </div>
                            </div>

                            {/* Expanded Full Report Details */}
                            {isExpanded && (
                              <div className="p-4 border-t border-slate-800 bg-slate-950/90 space-y-4 text-xs">
                                {/* Activity DAR Details */}
                                {rpt.activityDetails && (
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
                                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 block">ZONE CHECKED</span>
                                        <span className="text-white font-bold">{rpt.activityDetails.zoneChecked}</span>
                                      </div>
                                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 block">PATROL TYPE & STATUS</span>
                                        <span className="text-emerald-300 font-bold uppercase">
                                          {rpt.activityDetails.patrolType.replace(/_/g, ' ')} • {rpt.activityDetails.status.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 block">DOORS / LIGHTS VERIFIED</span>
                                        <span className="text-white font-bold">
                                          {rpt.activityDetails.doorsCheckedCount || 0} Doors / {rpt.activityDetails.lightsCheckedCount || 0} Lights
                                        </span>
                                      </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 leading-relaxed">
                                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                                        Officer Observation Narrative:
                                      </span>
                                      {rpt.activityDetails.observationNotes}
                                    </div>
                                  </div>
                                )}

                                {/* Maintenance Details */}
                                {rpt.maintenanceDetails && (
                                  <div className="space-y-2.5">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
                                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 block">SPECIFIC LOCATION</span>
                                        <span className="text-white font-bold">{rpt.maintenanceDetails.specificLocation}</span>
                                      </div>
                                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 block">SEVERITY & WORK ORDER</span>
                                        <span className="text-amber-300 font-bold uppercase">
                                          {rpt.maintenanceDetails.severity} • {rpt.maintenanceDetails.workOrderNumber || rpt.maintenanceDetails.workOrderStatus}
                                        </span>
                                      </div>
                                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 block">EMERGENCY CALL-OUT LOG</span>
                                        <span className="text-emerald-300 font-bold">
                                          {rpt.maintenanceDetails.contactedPersonOrVendorName || rpt.maintenanceDetails.notifiedPersonName || 'Logged'} ({rpt.maintenanceDetails.timeCalled || 'On Shift'})
                                        </span>
                                      </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 leading-relaxed">
                                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                                        Maintenance Hazard & Call Outcome:
                                      </span>
                                      <p>{rpt.maintenanceDetails.detailedDescription}</p>
                                      {rpt.maintenanceDetails.callOutcomeOrTechEta && (
                                        <p className="mt-1.5 text-emerald-300 font-mono">
                                          Tech Response / Outcome: {rpt.maintenanceDetails.callOutcomeOrTechEta}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Incident & Use of Force Supplement Details */}
                                {rpt.incidentDetails && (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
                                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 block">CATEGORY & SEVERITY</span>
                                        <span className="text-rose-400 font-bold uppercase">
                                          {rpt.incidentDetails.incidentCategory.replace(/_/g, ' ')} • {rpt.incidentDetails.severity}
                                        </span>
                                      </div>
                                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 block">POLICE / CAD CASE #</span>
                                        <span className="text-white font-bold">
                                          {rpt.incidentDetails.policeReportNumber || 'N/A'} • {rpt.incidentDetails.cadIncidentNumber || 'CAD Logged'}
                                        </span>
                                      </div>
                                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                                        <span className="text-[10px] text-slate-400 block">RESPONDING UNITS</span>
                                        <span className="text-blue-300 font-bold">
                                          {rpt.incidentDetails.respondingUnits || 'Supervisor Notified'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                                        Incident Summary & Chronological Timeline:
                                      </span>
                                      <p className="text-white font-semibold">{rpt.incidentDetails.summary}</p>
                                      <p className="text-slate-300 font-mono text-[11px]">{rpt.incidentDetails.detailedTimeline}</p>
                                      <p className="text-emerald-300 text-[11px] pt-1">
                                        <strong>Guard Action:</strong> {rpt.incidentDetails.actionTakenByGuard}
                                      </p>
                                    </div>

                                    {/* Parties / Vehicles / OCR Scanned IDs */}
                                    {rpt.incidentDetails.partiesInvolved && rpt.incidentDetails.partiesInvolved.length > 0 && (
                                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                                        <span className="text-[10px] font-mono uppercase text-blue-300 font-bold block">
                                          Subjects, Scanned IDs & Vehicles Involved:
                                        </span>
                                        {rpt.incidentDetails.partiesInvolved.map((pty) => (
                                          <div key={pty.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                                            <div>
                                              <span className="text-white font-bold">{pty.name || 'Subject'}</span>{' '}
                                              <span className="text-rose-300 uppercase">({pty.role})</span>
                                              {pty.idNumber && (
                                                <span className="text-slate-400 ml-2">
                                                  ID: {pty.idNumber} ({pty.idStateOrIssuer || 'State'})
                                                </span>
                                              )}
                                            </div>
                                            {pty.vehicleInfo && (
                                              <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold">
                                                🚗 {pty.vehicleInfo}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Use of Force Supplement */}
                                    {rpt.incidentDetails.useOfForceSupplement && (
                                      <div className="p-3.5 rounded-xl bg-rose-950/50 border-2 border-rose-500/70 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-mono font-black uppercase text-rose-300">
                                            🛡️ USE OF FORCE (UoF) COMPLIANCE SUPPLEMENT
                                          </span>
                                          <span className="text-[11px] font-mono font-bold text-emerald-300">
                                            BWC: {rpt.incidentDetails.useOfForceSupplement.bwcActiveStatus}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
                                          <div className="p-2 rounded bg-slate-950/80 border border-rose-500/30">
                                            <span className="text-slate-400 block text-[10px]">DE-ESCALATION ATTEMPTED</span>
                                            <span className="text-white">
                                              {rpt.incidentDetails.useOfForceSupplement.deEscalationAttempted.join(', ')}
                                            </span>
                                          </div>
                                          <div className="p-2 rounded bg-slate-950/80 border border-rose-500/30">
                                            <span className="text-slate-400 block text-[10px]">FORCE OPTIONS UTILIZED</span>
                                            <span className="text-rose-200 font-bold">
                                              {rpt.incidentDetails.useOfForceSupplement.forceOptionsUtilized.join(', ')}
                                            </span>
                                          </div>
                                          <div className="p-2 rounded bg-slate-950/80 border border-rose-500/30">
                                            <span className="text-slate-400 block text-[10px]">RESTRAINTS & COMPLIANCE</span>
                                            <span className="text-emerald-300">
                                              Double-Locked: {rpt.incidentDetails.useOfForceSupplement.handcuffsDoubleLocked ? 'YES' : 'N/A'} • Gauge Checked:{' '}
                                              {rpt.incidentDetails.useOfForceSupplement.gaugeTightnessChecked ? 'YES' : 'N/A'}
                                            </span>
                                          </div>
                                        </div>
                                        <p className="text-xs text-rose-100 leading-relaxed">
                                          <strong>Justification Narrative:</strong>{' '}
                                          {rpt.incidentDetails.useOfForceSupplement.justificationNarrative}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Attached Evidence Media */}
                                {rpt.media && rpt.media.length > 0 && (
                                  <div className="flex flex-wrap gap-3 pt-1">
                                    {rpt.media.map((m) => (
                                      <div
                                        key={m.id}
                                        className="w-48 rounded-lg overflow-hidden border border-slate-700 bg-slate-900"
                                      >
                                        <img
                                          src={m.url}
                                          alt={m.caption || 'Evidence'}
                                          className="w-full h-28 object-cover"
                                        />
                                        <div className="p-1.5 text-[10px] text-slate-300 truncate">
                                          {m.caption || m.fileName || 'Verified Evidence Photo'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PRINT-READY / PDF EXPORT SHIFT AUDIT DOSSIER MODAL                    */}
      {/* ===================================================================== */}
      {isPrintPreviewOpen && selectedShift && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 block">
                  OFFICIAL PAYROLL & TELEMETRY AUDIT EXPORT
                </span>
                <h3 className="text-base font-black">
                  Printable Shift Audit & Linked Reports Dossier — #{selectedShift.id}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintPreviewOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-black uppercase">SECURESHIFT COMMAND CAD — SHIFT AUDIT DOSSIER</h2>
                  <p className="font-mono text-slate-600">
                    Shift ID: {selectedShift.id} • Facility: {selectedShift.siteName} ({selectedShift.siteAddress || 'Verified Site'})
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold">Status: {selectedShift.status}</div>
                  <div>Date: {selectedShift.date}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100 p-3.5 rounded-xl font-mono">
                <div>
                  <div className="text-[10px] text-slate-500">OFFICER</div>
                  <div className="font-bold">{selectedShift.guardName} ({selectedShift.guardBadge})</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">SCHEDULED</div>
                  <div className="font-bold">
                    {formatTimeAmPm(selectedShift.scheduledStartTime)} - {formatTimeAmPm(selectedShift.scheduledEndTime)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">ACTUAL / PAYABLE</div>
                  <div className="font-bold">
                    {formatTimeAmPm(selectedShift.actualClockInTime)} - {formatTimeAmPm(selectedShift.actualClockOutTime)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">NET PAYABLE HOURS</div>
                  <div className="font-black text-sm">
                    {(selectedShift.actualPayableHours ?? 8).toFixed(2)} hrs
                  </div>
                </div>
              </div>

              {selectedShift.timeAdjustmentAudit && (
                <div className="p-3.5 rounded-xl border-2 border-rose-600 bg-rose-50 text-rose-950 space-y-1">
                  <div className="font-mono font-black uppercase">
                    Payroll Rollback / Time Adjustment Audit Record
                  </div>
                  <p>{selectedShift.timeAdjustmentAudit.reason}</p>
                  {selectedShift.timeAdjustmentAudit.supervisorOverride && (
                    <p className="font-bold text-emerald-800 pt-1">
                      Supervisor Override ({selectedShift.timeAdjustmentAudit.supervisorOverride.approvedBy}):{' '}
                      {selectedShift.timeAdjustmentAudit.supervisorOverride.note}
                    </p>
                  )}
                </div>
              )}

              <div>
                <h4 className="font-mono font-black uppercase mb-2">
                  GPS Breadcrumb Trail ({selectedShift.gpsBreadcrumbs.length} Verified Waypoints)
                </h4>
                <table className="w-full border-collapse border border-slate-300 font-mono text-[11px]">
                  <thead>
                    <tr className="bg-slate-200">
                      <th className="border border-slate-300 p-1.5 text-left">Time</th>
                      <th className="border border-slate-300 p-1.5 text-left">Event</th>
                      <th className="border border-slate-300 p-1.5 text-left">Coordinates</th>
                      <th className="border border-slate-300 p-1.5 text-left">Geofence</th>
                      <th className="border border-slate-300 p-1.5 text-left">Waypoint Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedShift.gpsBreadcrumbs.map((c, i) => (
                      <tr key={i}>
                        <td className="border border-slate-300 p-1.5">{formatTimeAmPm(c.timestamp)}</td>
                        <td className="border border-slate-300 p-1.5 font-bold">{c.event || 'PATROL_PING'}</td>
                        <td className="border border-slate-300 p-1.5">{c.lat.toFixed(5)}, {c.lng.toFixed(5)}</td>
                        <td className="border border-slate-300 p-1.5">
                          {c.insideGeofence ? 'ON-SITE' : 'OFF-SITE'}
                        </td>
                        <td className="border border-slate-300 p-1.5">{c.label || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="font-mono font-black uppercase mb-2">
                  Linked Shift Reports ({getLinkedReportsForShift(selectedShift).length})
                </h4>
                {getLinkedReportsForShift(selectedShift).map((r) => (
                  <div key={r.id} className="p-3 mb-2 rounded-lg border border-slate-300 space-y-1">
                    <div className="font-mono font-bold">
                      #{r.reportNumber} [{r.reportType.toUpperCase()}] — {formatTimeAmPm(r.timestamp)}
                    </div>
                    <p>
                      {r.incidentDetails?.summary ||
                        r.maintenanceDetails?.detailedDescription ||
                        r.activityDetails?.observationNotes}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
