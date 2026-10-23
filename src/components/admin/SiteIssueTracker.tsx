import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  Search,
  ShieldAlert,
  Sparkles,
  User,
  Volume2,
  Wrench,
  X,
  Zap,
  Camera,
  ExternalLink,
  Check
} from 'lucide-react';
import {
  IssueCategory,
  IssueStatus,
  InfractionMatchKey,
  DARLogReference,
  SiteIssue,
  SiteIssueUpdate
} from '../../types/siteIssues';
import {
  normalizeInfractionKey,
  inferMatchKeyType
} from '../../utils/chronicDetectionEngine';
import {
  useSiteIssuesStore,
  CATEGORY_LABELS
} from '../guard/GuardSiteIssues';
import { useShiftOps } from '../../context/ShiftOpsContext';

interface SiteIssueTrackerProps {
  adminName?: string;
  adminBadge?: string;
}

type CategoryFilterOption =
  | 'ALL'
  | 'MAINTENANCE'
  | 'SAFETY_HAZARD'
  | 'CHRONIC_LEASE_VIOLATION'
  | 'PARKING_VIOLATION'
  | 'NOISE_COMPLAINT';

type LifecycleTabOption =
  | 'OPEN'
  | 'CLIENT_NOTIFIED'
  | 'PENDING_VERIFICATION'
  | 'RESOLVED';

export const SiteIssueTracker: React.FC<SiteIssueTrackerProps> = ({
  adminName = "Lt. Mark O'Connor",
  adminBadge = 'OPS-CMD-01'
}) => {
  const { sitesList, addAuditLog, showToast } = useShiftOps();
  const { siteIssues, darLogs, updateSiteIssues, updateDarLogs } = useSiteIssuesStore();

  // Top Controls & Filter States
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<CategoryFilterOption>('ALL');
  const [activeStatusTab, setActiveStatusTab] = useState<LifecycleTabOption>('OPEN');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Ticket for Detail & Cross-Shift Audit Modal
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const selectedIssue = useMemo(
    () => siteIssues.find((i) => i.id === selectedIssueId) || null,
    [siteIssues, selectedIssueId]
  );

  // Client Outreach & Work Order Form State inside Detail Modal
  const [pmContactName, setPmContactName] = useState<string>('PM Sarah Miller');
  const [pmContactMethod, setPmContactMethod] = useState<'EMAIL' | 'PHONE' | 'PORTAL'>('EMAIL');
  const [pmExternalTicketRef, setPmExternalTicketRef] = useState<string>('WO-2026-4410');
  const [pmContactTimestamp, setPmContactTimestamp] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [pmContactNotes, setPmContactNotes] = useState<string>(
    'Forwarded multi-shift incident chronology and officer photo evidence to Property Management.'
  );

  // Create Issue Ticket Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newSiteId, setNewSiteId] = useState<string>(sitesList[0]?.id || 'site-1');
  const [newCategory, setNewCategory] = useState<IssueCategory>('MAINTENANCE');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newUnitOrLocation, setNewUnitOrLocation] = useState<string>('');
  const [newVehicleDetails, setNewVehicleDetails] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');

  // Export Site Issue Digest Modal State
  const [isDigestModalOpen, setIsDigestModalOpen] = useState<boolean>(false);
  const [digestTimeframe, setDigestTimeframe] = useState<'7D' | '30D' | '90D' | 'ALL' | 'CUSTOM'>('7D');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [printFeedbackBanner, setPrintFeedbackBanner] = useState<string | null>(null);

  // Export PM Violation Notice Modal State
  const [pmNoticePreviewIssue, setPmNoticePreviewIssue] = useState<SiteIssue | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  // Open Detail Modal & Hydrate PM Form
  const handleSelectIssue = (issue: SiteIssue) => {
    setSelectedIssueId(issue.id);
    const siteObj = sitesList.find((s) => s.id === issue.siteId || s.name === issue.siteName);
    setPmContactName(
      issue.clientContactLog?.contactName ||
        siteObj?.primaryContactName ||
        'PM Sarah Miller'
    );
    setPmContactMethod(issue.clientContactLog?.method || 'EMAIL');
    setPmExternalTicketRef(
      issue.clientContactLog?.externalTicketRef ||
        `WO-${Math.floor(1000 + Math.random() * 9000)}`
    );
    setPmContactTimestamp(
      issue.clientContactLog?.notifiedDate
        ? issue.clientContactLog.notifiedDate.slice(0, 16)
        : new Date().toISOString().slice(0, 16)
    );
    setPmContactNotes(
      issue.clientContactLog?.notes ||
        'Notified Property Manager with cross-shift officer DAR timestamps and photos.'
    );
  };

  // Filtered Issues for Table/Cards
  const filteredIssues = useMemo(() => {
    return siteIssues.filter((issue) => {
      // Facility Filter
      if (selectedSiteFilter !== 'ALL') {
        const matchesSite =
          issue.siteId === selectedSiteFilter ||
          issue.siteName.toLowerCase() === selectedSiteFilter.toLowerCase();
        if (!matchesSite) return false;
      }

      // Category Filter
      if (selectedCategoryFilter !== 'ALL') {
        if (selectedCategoryFilter === 'CHRONIC_LEASE_VIOLATION') {
          if (
            issue.category !== 'CHRONIC_LEASE_VIOLATION' &&
            issue.category !== 'UNAUTHORIZED_OCCUPANT' &&
            issue.category !== 'TRASH_DUMPING'
          ) {
            return false;
          }
        } else if (issue.category !== selectedCategoryFilter) {
          return false;
        }
      }

      // Status Tab
      if (issue.status !== activeStatusTab) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${issue.id} ${issue.title} ${issue.unitOrLocation} ${issue.matchKeyValue} ${issue.siteName} ${issue.vehicleDetails || ''} ${issue.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [siteIssues, selectedSiteFilter, selectedCategoryFilter, activeStatusTab, searchQuery]);

  // Counts per Lifecycle Tab (scoped to selected site & category)
  const tabCounts = useMemo(() => {
    const counts: Record<LifecycleTabOption, number> = {
      OPEN: 0,
      CLIENT_NOTIFIED: 0,
      PENDING_VERIFICATION: 0,
      RESOLVED: 0
    };
    siteIssues.forEach((issue) => {
      if (
        selectedSiteFilter !== 'ALL' &&
        issue.siteId !== selectedSiteFilter &&
        issue.siteName.toLowerCase() !== selectedSiteFilter.toLowerCase()
      ) {
        return;
      }
      if (selectedCategoryFilter !== 'ALL' && issue.category !== selectedCategoryFilter) {
        return;
      }
      counts[issue.status] = (counts[issue.status] || 0) + 1;
    });
    return counts;
  }, [siteIssues, selectedSiteFilter, selectedCategoryFilter]);

  // Create Manual Issue Ticket Handler
  const handleCreateIssueTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUnitOrLocation.trim()) return;

    const siteObj =
      sitesList.find((s) => s.id === newSiteId) || {
        id: 'site-1',
        name: 'Port Authority - Pier 7'
      };
    const nowIso = new Date().toISOString();
    const ticketId = `ISS-${Math.floor(1050 + Math.random() * 8900)}`;
    const matchKeyValue = normalizeInfractionKey(newUnitOrLocation);
    const matchKeyType: InfractionMatchKey = inferMatchKeyType(newUnitOrLocation, newCategory);

    const initialDar: DARLogReference = {
      darId: `dar-${Date.now()}`,
      shiftId: `cad-${Date.now()}`,
      shiftName: 'Command CAD Dispatch',
      timestamp: nowIso,
      guardName: adminName,
      badgeNumber: adminBadge,
      category: newCategory,
      notes: newDescription.trim() || newTitle.trim(),
      siteId: siteObj.id,
      siteName: siteObj.name,
      unitOrLocation: newUnitOrLocation.trim(),
      matchKeyType,
      matchKeyValue
    };

    const createdIssue: SiteIssue = {
      id: ticketId,
      siteId: siteObj.id,
      siteName: siteObj.name,
      category: newCategory,
      status: 'OPEN',
      title: newTitle.trim(),
      unitOrLocation: newUnitOrLocation.trim(),
      vehicleDetails: newVehicleDetails.trim() || undefined,
      matchKeyType,
      matchKeyValue,
      description: newDescription.trim() || newTitle.trim(),
      initialReportDate: nowIso,
      reportedBy: `${adminName} (${adminBadge})`,
      priority: newPriority,
      recurrenceCount: 1,
      isAutoEscalated: false,
      linkedDarLogs: [initialDar],
      history: [
        {
          id: `upd-${Date.now()}`,
          timestamp: nowIso,
          authorName: adminName,
          authorBadge: adminBadge,
          authorRole: 'DISPATCHER',
          shiftContext: 'Command CAD',
          notes: `Ticket manually created by Command CAD: ${newDescription.trim() || newTitle.trim()}`
        }
      ]
    };

    updateDarLogs((prev) => [...prev, initialDar]);
    updateSiteIssues((prev) => [createdIssue, ...prev]);

    const auditEntry = `[SITE ISSUE] OPEN — ${createdIssue.title} (${createdIssue.unitOrLocation}) at ${createdIssue.siteName} by ${adminName}`;
    addAuditLog(
      auditEntry,
      'system',
      auditEntry,
      `${adminName} (${adminBadge})`,
      'info'
    );

    showToast(
      `Created Ticket #${ticketId}`,
      `${createdIssue.title} logged at ${createdIssue.siteName}.`,
      'success'
    );

    setNewTitle('');
    setNewUnitOrLocation('');
    setNewVehicleDetails('');
    setNewDescription('');
    setIsCreateModalOpen(false);
    setActiveStatusTab('OPEN');
  };

  // Save Client Outreach & Flip to CLIENT_NOTIFIED
  const handleSaveClientOutreach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    const nowIso = new Date().toISOString();
    const notifiedIso = pmContactTimestamp
      ? new Date(pmContactTimestamp).toISOString()
      : nowIso;

    const updatedIssue: SiteIssue = {
      ...selectedIssue,
      status: 'CLIENT_NOTIFIED',
      clientContactLog: {
        notifiedDate: notifiedIso,
        contactName: pmContactName.trim(),
        method: pmContactMethod,
        externalTicketRef: pmExternalTicketRef.trim(),
        notes: pmContactNotes.trim()
      },
      history: [
        ...selectedIssue.history,
        {
          id: `upd-${Date.now()}`,
          timestamp: nowIso,
          authorName: adminName,
          authorBadge: adminBadge,
          authorRole: 'DISPATCHER',
          shiftContext: 'Command CAD',
          notes: `Client Notified: Contacted ${pmContactName.trim()} via ${pmContactMethod} (Work Order / Ref #${pmExternalTicketRef.trim()}). ${pmContactNotes.trim()}`
        }
      ]
    };

    updateSiteIssues((prev) =>
      prev.map((item) => (item.id === selectedIssue.id ? updatedIssue : item))
    );

    const auditEntry = `[SITE ISSUE] CLIENT_NOTIFIED — ${selectedIssue.title} (${selectedIssue.unitOrLocation}) at ${selectedIssue.siteName} by ${adminName}`;
    addAuditLog(
      auditEntry,
      'system',
      `${auditEntry} • Contact: ${pmContactName.trim()} (${pmContactMethod}) • Ref: ${pmExternalTicketRef.trim()}`,
      `${adminName} (${adminBadge})`,
      'info'
    );

    showToast(
      'Property Manager Notified',
      `Ticket #${selectedIssue.id} status updated to CLIENT_NOTIFIED.`,
      'success'
    );
  };

  // Request Guard Field Verification -> Flips to PENDING_VERIFICATION
  const handleRequestGuardVerification = (issue: SiteIssue) => {
    const nowIso = new Date().toISOString();
    const updatedIssue: SiteIssue = {
      ...issue,
      status: 'PENDING_VERIFICATION',
      history: [
        ...issue.history,
        {
          id: `upd-${Date.now()}`,
          timestamp: nowIso,
          authorName: adminName,
          authorBadge: adminBadge,
          authorRole: 'SUPERVISOR',
          shiftContext: 'Command CAD',
          notes: `Requested Guard Field Verification on next active shift patrol at ${issue.siteName}.`
        }
      ]
    };

    updateSiteIssues((prev) =>
      prev.map((item) => (item.id === issue.id ? updatedIssue : item))
    );

    const auditEntry = `[SITE ISSUE] PENDING_VERIFICATION — ${issue.title} (${issue.unitOrLocation}) at ${issue.siteName} by ${adminName}`;
    addAuditLog(
      auditEntry,
      'system',
      `${auditEntry} — Pushed field verification prompt to Guard Terminal.`,
      `${adminName} (${adminBadge})`,
      'warning'
    );

    showToast(
      'Field Verification Dispatched',
      `Pushed Ticket #${issue.id} to ${issue.siteName} Guard Terminal for on-shift photo verification.`,
      'info'
    );
  };

  // Build Unified Chronological Audit Timeline for Selected Ticket
  const unifiedAuditTimeline = useMemo(() => {
    if (!selectedIssue) return [];

    const items: Array<{
      id: string;
      timestamp: string;
      shiftName: string;
      officerName: string;
      officerBadge: string;
      sourceType: 'DAR_LOG' | 'WORKFLOW_UPDATE';
      notes: string;
      photoUrl?: string;
    }> = [];

    selectedIssue.linkedDarLogs.forEach((dar) => {
      items.push({
        id: `dar-${dar.darId}`,
        timestamp: dar.timestamp,
        shiftName: dar.shiftName || 'Field Patrol Shift',
        officerName: dar.guardName,
        officerBadge: dar.badgeNumber,
        sourceType: 'DAR_LOG',
        notes: dar.notes,
        photoUrl: dar.photoUrl
      });
    });

    selectedIssue.history.forEach((upd) => {
      items.push({
        id: `upd-${upd.id}`,
        timestamp: upd.timestamp,
        shiftName: upd.shiftContext || upd.authorRole,
        officerName: upd.authorName,
        officerBadge: upd.authorBadge || upd.authorRole,
        sourceType: 'WORKFLOW_UPDATE',
        notes: upd.notes,
        photoUrl: upd.photoUrl
      });
    });

    return items.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [selectedIssue]);

  // Generate Formatted PM Violation Notice Report Text
  const generatePmViolationNoticeText = (issue: SiteIssue): string => {
    const lines: string[] = [
      '========================================================================',
      'FORMAL PROPERTY MANAGEMENT INCIDENT & LEASE VIOLATION CHRONOLOGY NOTICE',
      '========================================================================',
      `Ticket Reference     : #${issue.id}`,
      `Property / Facility  : ${issue.siteName}`,
      `Unit / Location / ID : ${issue.unitOrLocation} (Match Key: ${issue.matchKeyValue})`,
      ...(issue.vehicleDetails ? [`Vehicle Description  : ${issue.vehicleDetails}`] : []),
      `Violation Category   : ${CATEGORY_LABELS[issue.category]}`,
      `Total Recurrences    : ${issue.recurrenceCount} Documented Shift Sightings`,
      `Escalation Type      : ${issue.isAutoEscalated ? 'AUTOMATED CROSS-SHIFT CHRONIC DETECTION' : 'COMMAND ESCALATION'}`,
      `Generated By         : ${adminName} (${adminBadge}) on ${new Date().toLocaleString()}`,
      '------------------------------------------------------------------------',
      'EXECUTIVE SUMMARY:',
      issue.description,
      '------------------------------------------------------------------------',
      'CHRONOLOGICAL CROSS-SHIFT OFFICER OBSERVATION LOG:',
      ''
    ];

    issue.linkedDarLogs.forEach((log, idx) => {
      lines.push(
        `[Sighting #${idx + 1}] ${new Date(log.timestamp).toLocaleString()} | ${log.shiftName || 'Patrol Shift'}`
      );
      lines.push(
        `  Reporting Officer : ${log.guardName} (Badge #${log.badgeNumber})`
      );
      lines.push(`  Category          : ${log.category}`);
      lines.push(`  Observation Notes : "${log.notes}"`);
      if (log.photoUrl) {
        lines.push(`  Evidence Attached : Verified Timestamped Photo on File`);
      }
      lines.push('');
    });

    if (issue.clientContactLog) {
      lines.push('------------------------------------------------------------------------');
      lines.push('CLIENT OUTREACH & WORK ORDER RECORD:');
      lines.push(`  Contact Notified  : ${issue.clientContactLog.contactName || 'N/A'}`);
      lines.push(`  Method            : ${issue.clientContactLog.method || 'N/A'}`);
      lines.push(`  Work Order / Ref  : ${issue.clientContactLog.externalTicketRef || 'N/A'}`);
      lines.push(`  Notes             : ${issue.clientContactLog.notes || 'N/A'}`);
    }

    lines.push('========================================================================');
    return lines.join('\n');
  };

  const handleDownloadPmViolationNotice = (issue: SiteIssue) => {
    const content = generatePmViolationNoticeText(issue);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PM_Violation_Notice_${issue.id}_${issue.matchKeyValue}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      'PM Violation Notice Exported',
      `Downloaded chronological violation notice for ${issue.unitOrLocation}.`,
      'success'
    );
  };

  // Digest Date Filtering Engine (7D, 30D, 90D, ALL, CUSTOM)
  const digestFilteredIssues = useMemo(() => {
    const nowMs = Date.now();
    return siteIssues.filter((issue) => {
      if (
        selectedSiteFilter !== 'ALL' &&
        issue.siteId !== selectedSiteFilter &&
        issue.siteName.toLowerCase() !== selectedSiteFilter.toLowerCase()
      ) {
        return false;
      }

      if (digestTimeframe === 'ALL') {
        return true;
      }

      const ts = new Date(issue.initialReportDate).getTime();
      if (Number.isNaN(ts)) return true;

      if (digestTimeframe === '7D') {
        return ts >= nowMs - 7 * 24 * 3600 * 1000;
      }
      if (digestTimeframe === '30D') {
        return ts >= nowMs - 30 * 24 * 3600 * 1000;
      }
      if (digestTimeframe === '90D') {
        return ts >= nowMs - 90 * 24 * 3600 * 1000;
      }
      if (digestTimeframe === 'CUSTOM') {
        const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : -Infinity;
        const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;
        return ts >= startMs && ts <= endMs;
      }

      return true;
    });
  }, [siteIssues, selectedSiteFilter, digestTimeframe, startDate, endDate]);

  const handleDownloadDigestCsv = () => {
    const headers = [
      'Ticket ID',
      'Site Name',
      'Unit/Location',
      'Match Key',
      'Category',
      'Priority',
      'Status',
      'Recurrence Count',
      'Auto-Escalated',
      'Initial Report Date',
      'Client Work Order Ref',
      'Description'
    ];
    const rows = digestFilteredIssues.map((i) => [
      i.id,
      `"${i.siteName.replace(/"/g, '""')}"`,
      `"${i.unitOrLocation.replace(/"/g, '""')}"`,
      i.matchKeyValue,
      i.category,
      i.priority,
      i.status,
      i.recurrenceCount,
      i.isAutoEscalated ? 'YES' : 'NO',
      i.initialReportDate,
      `"${(i.clientContactLog?.externalTicketRef || '').replace(/"/g, '""')}"`,
      `"${i.description.replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const windowTag =
      digestTimeframe === 'CUSTOM' ? `${startDate}_to_${endDate}` : digestTimeframe.toLowerCase();
    a.download = `Site_Issue_Digest_${selectedSiteFilter}_${windowTag}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      'Site Issue Digest Exported',
      `Exported ${digestFilteredIssues.length} issues (${digestTimeframe}) to CSV.`,
      'success'
    );
  };

  const selectedSiteName = useMemo(() => {
    if (selectedSiteFilter === 'ALL') return '';
    const found = sitesList.find(
      (s) => s.id === selectedSiteFilter || s.name.toLowerCase() === selectedSiteFilter.toLowerCase()
    );
    return found ? found.name : selectedSiteFilter;
  }, [selectedSiteFilter, sitesList]);

  // Safe Variable Derivation for Digest & Print Engine
  const timeRange = digestTimeframe;
  const customStartDate = startDate;
  const customEndDate = endDate;
  const filteredList = digestFilteredIssues || [];
  const totalCount = filteredList.length;
  const openCount = filteredList.filter((i) => i.status === 'OPEN').length;
  const pendingCount = filteredList.filter((i) => i.status === 'PENDING_VERIFICATION').length;
  const resolvedCount = filteredList.filter((i) => i.status === 'RESOLVED').length;
  const chronicCount = filteredList.filter(
    (i) => (i.recurrenceCount || 1) > 1 || i.isAutoEscalated
  ).length;

  const timeframeLabel =
    timeRange === '7D'
      ? 'Last 7 Days'
      : timeRange === '30D'
      ? 'Last 30 Days'
      : timeRange === '90D'
      ? 'Last 90 Days'
      : timeRange === 'ALL'
      ? 'All-Time Record'
      : `Custom: ${customStartDate || 'Start'} to ${customEndDate || 'Current'}`;

  const digestSummaryCounts = {
    count: totalCount,
    openCount,
    chronicCount,
    resolvedCount
  };

  // Standalone Tab + Blob HTML Download Fail-Safe Print Engine
  const handlePrint = () => {
    console.log('[SiteIssueTracker] Initiating Print Digest...', {
      site: selectedSiteName || 'All Enterprise Facilities',
      timeframe: timeframeLabel,
      totalCount
    });

    // Generate self-contained, high-contrast black-and-white printable HTML
    const reportHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SecureShift Property Digest - ${selectedSiteName || 'All Sites'}</title>
    <style>
      @page { size: letter portrait; margin: 0.6in; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111; background: #fff; margin: 0; padding: 20px; font-size: 11pt; line-height: 1.4; }
      .no-print-bar { background: #0f172a; color: #f8fafc; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 10pt; }
      .no-print-btn { background: #10b981; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 10pt; }
      @media print {
        body { padding: 0; }
        .no-print-bar { display: none !important; }
      }
      .header { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
      .title { font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
      .subtitle { font-size: 9pt; color: #555; text-align: right; }
      .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; background: #f8f8f8; border: 1px solid #ddd; padding: 10px; margin-bottom: 16px; font-size: 9.5pt; }
      .meta-item strong { color: #222; }
      .issue-card { border: 1px solid #ccc; border-radius: 4px; padding: 10px 12px; margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid; }
      .issue-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 6px; flex-wrap: wrap; gap: 6px; }
      .issue-id { font-weight: bold; font-size: 10.5pt; }
      .badge { display: inline-block; padding: 2px 6px; font-size: 8pt; font-weight: bold; border-radius: 3px; border: 1px solid #888; text-transform: uppercase; }
      .location { font-weight: bold; color: #222; margin-bottom: 4px; font-size: 10pt; }
      .desc { color: #333; margin-bottom: 6px; font-size: 9.5pt; }
      .log-history { font-size: 8.5pt; color: #555; background: #fafafa; border-left: 2px solid #999; padding: 4px 8px; margin-top: 6px; }
      .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 6px; font-size: 8pt; color: #775; display: flex; justify-content: space-between; }
    </style>
  </head>
  <body>
    <div class="no-print-bar">
      <span><strong>SecureShift Executive Digest</strong> (${totalCount} Issues • ${timeframeLabel})</span>
      <button class="no-print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    <div class="header">
      <div>
        <div class="title">SECURESHIFT DISPATCH &amp; OPERATIONS</div>
        <div style="font-size: 10pt; color: #333;">Site Issue &amp; Compliance Audit Digest</div>
      </div>
      <div class="subtitle">
        CONFIDENTIAL PROPERTY RECORD<br>
        Generated: ${new Date().toLocaleString()}
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><strong>Facility:</strong> ${selectedSiteName || 'All Enterprise Facilities'}</div>
      <div class="meta-item"><strong>Audit Window:</strong> ${timeframeLabel}</div>
      <div class="meta-item"><strong>Summary:</strong> ${totalCount} Total Issues (${openCount} Open, ${chronicCount} Chronic/Repeat)</div>
      <div class="meta-item"><strong>Resolution Status:</strong> ${pendingCount} Pending Verification, ${resolvedCount} Resolved</div>
    </div>

    <div class="issues-list">
      ${filteredList
        .map(
          (issue) => `
        <div class="issue-card">
          <div class="issue-header">
            <span class="issue-id">#${issue.id} • ${issue.siteName || ''}</span>
            <div>
              <span class="badge">${issue.category}</span>
              <span class="badge" style="margin-left: 4px;">${issue.status}</span>${
                (issue.recurrenceCount || 1) > 1
                  ? `<span class="badge" style="margin-left: 4px; background: #eee;">Repeat x${issue.recurrenceCount}</span>`
                  : ''
              }
            </div>
          </div>
          <div class="location">Location: ${issue.unitOrLocation || 'General Post Area'} — ${issue.title || ''}</div>
          <div class="desc">${issue.description || ''}</div>${
            issue.clientContactLog
              ? `
            <div class="log-history">
              <strong>Client Outreach:</strong> Notified ${issue.clientContactLog.contactName || 'PM'} on ${issue.clientContactLog.notifiedDate || ''} via ${issue.clientContactLog.method || 'System'}
            </div>
          `
              : ''
          }
          ${
            issue.verificationDetails
              ? `
            <div class="log-history">
              <strong>Field Verification:</strong> Signed off by ${issue.verificationDetails.verifiedBy || 'Officer'} on ${issue.verificationDetails.verifiedDate || ''} — Notes: ${issue.verificationDetails.resolutionNotes || 'None'}
            </div>
          `
              : ''
          }
        </div>
      `
        )
        .join('')}
    </div>

    <div class="footer">
      <span>SecureShift CAD Logistics Platform</span>
      <span>Official Security Operations Record</span>
    </div>

    <script>
      window.onload = function() {
        setTimeout(function() {
          try { window.print(); } catch (e) { console.warn('Auto-print blocked:', e); }
        }, 250);
      };
    </script>
  </body>
</html>`;

    const downloadHtmlDigestFallback = (reason: string) => {
      console.log(
        '[SiteIssueTracker] Fallback triggered — downloading self-contained Site_Issue_Digest.html. Reason:',
        reason
      );
      try {
        const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'Site_Issue_Digest.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

        const msg =
          'Sandbox/browser blocked direct print popup — downloaded "Site_Issue_Digest.html" so you can open and print it directly from your device.';
        setPrintFeedbackBanner(msg);
        showToast('Printable HTML Digest Downloaded', msg, 'warning');
      } catch (dlErr) {
        console.error('[SiteIssueTracker] HTML fallback download failed:', dlErr);
        const errMsg = 'Unable to open print dialog or download digest in this browser sandbox.';
        setPrintFeedbackBanner(errMsg);
        showToast('Print Action Blocked', errMsg, 'error');
      }
    };

    try {
      // 1. Try opening a fresh standalone tab to escape the sandboxed iframe
      const printWindow = window.open('', '_blank');

      if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
        // 2. Popup/tab was blocked by mobile browser or iframe sandbox -> fallback to Blob download
        downloadHtmlDigestFallback('window.open returned null or was blocked by mobile popup blocker');
        return;
      }

      printWindow.document.open();
      printWindow.document.write(reportHtml);
      printWindow.document.close();

      console.log('[SiteIssueTracker] Successfully wrote printable digest to standalone tab.');
      setPrintFeedbackBanner(
        'Opened printable digest in a new tab. If your mobile browser suppressed the tab, tap again or use the downloaded HTML report.'
      );
      showToast(
        'Print Tab Opened',
        'Opened printable Site Issue Digest in a standalone tab.',
        'success'
      );

      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (printErr) {
          console.warn('[SiteIssueTracker] Standalone window.print() threw error:', printErr);
          downloadHtmlDigestFallback(String(printErr));
        }
      }, 250);
    } catch (err) {
      console.error('[SiteIssueTracker] Print failed, falling back to HTML file download:', err);
      downloadHtmlDigestFallback(String(err));
    }
  };

  return (
    <div id="site-issue-tracker-console" className="space-y-5">
      <style>{`
        @media print {
          @page {
            margin: 0.5in;
            size: letter portrait;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          /* Ensure issue cards do not split awkwardly across page breaks */
          .issue-print-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* =================================================================== */}
      {/* HEADER & PRIMARY ACTIONS                                            */}
      {/* =================================================================== */}
      <div className="print:hidden bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-300 text-[10px] font-mono font-black uppercase">
                Cross-Shift Chronic Correlation Engine
              </span>
              <span className="text-xs font-mono text-slate-400">
                {siteIssues.filter((i) => i.status !== 'RESOLVED').length} Active Tickets •{' '}
                {siteIssues.filter((i) => i.isAutoEscalated).length} Auto-Escalated
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Site Issue &amp; Chronic Resolution Console</span>
            </h2>
            <p className="text-xs text-slate-400">
              Track property maintenance, safety hazards, chronic lease/noise hotspots, client work orders, and guard field verification.
            </p>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-xs shadow-md cursor-pointer transition-colors"
            >
              [ + Create Issue Ticket ]
            </button>
            <button
              type="button"
              onClick={() => setIsDigestModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono font-bold text-xs cursor-pointer transition-colors"
            >
              [ 📄 Export Site Issue Digest ]
            </button>
          </div>
        </div>

        {/* Top Controls: Facility Selector Dropdown + Search */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-800">
          <div className="md:col-span-5">
            <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
              Facility Selector
            </label>
            <select
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Enterprise Sites ({sitesList.length} Properties)</option>
              {sitesList.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.code})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-7">
            <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
              Search Unit #, License Plate, Ticket ID, or Asset Location
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search "304", "ABC123", "Gate 2", "ISS-1041"...'
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 mr-1">Category:</span>
          {(
            [
              { key: 'ALL', label: '[ All ]' },
              { key: 'MAINTENANCE', label: '[ Maintenance ]' },
              { key: 'SAFETY_HAZARD', label: '[ Safety Hazards ]' },
              { key: 'CHRONIC_LEASE_VIOLATION', label: '[ Chronic Lease ]' },
              { key: 'PARKING_VIOLATION', label: '[ Parking ]' },
              { key: 'NOISE_COMPLAINT', label: '[ Noise ]' }
            ] as const
          ).map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setSelectedCategoryFilter(pill.key)}
              className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                selectedCategoryFilter === pill.key
                  ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Lifecycle Status Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
          {(
            [
              {
                key: 'OPEN',
                label: '[ Open / Active ]',
                badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              },
              {
                key: 'CLIENT_NOTIFIED',
                label: '[ Client Notified ]',
                badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              },
              {
                key: 'PENDING_VERIFICATION',
                label: '[ Pending Guard Verification ]',
                badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              },
              {
                key: 'RESOLVED',
                label: '[ Resolved Archive ]',
                badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveStatusTab(tab.key)}
              className={`p-2.5 rounded-xl border font-mono text-xs font-black flex items-center justify-between transition-all cursor-pointer ${
                activeStatusTab === tab.key
                  ? 'bg-slate-800 border-blue-500 text-white ring-1 ring-blue-400/50 shadow-sm'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] border ${tab.badgeColor}`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* =================================================================== */}
      {/* ISSUE TABLE / CARDS                                                 */}
      {/* =================================================================== */}
      <div className="print:hidden space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-slate-200">
              No site issues matching the current filter criteria.
            </p>
            <p className="text-xs text-slate-400">
              Switch lifecycle tabs above or click [ + Create Issue Ticket ] to log a new property issue.
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => handleSelectIssue(issue)}
              className="bg-slate-900 hover:bg-slate-900/90 text-slate-100 rounded-2xl p-4 border border-slate-800 hover:border-blue-500/60 shadow-md transition-all cursor-pointer space-y-3"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                    #{issue.id}
                  </span>

                  {/* Site Name */}
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>{issue.siteName}</span>
                  </span>

                  {/* Unit/Location/Plate */}
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs">
                    {issue.unitOrLocation}
                  </span>

                  {/* Category Badge */}
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px] font-bold">
                    {CATEGORY_LABELS[issue.category]}
                  </span>

                  {/* Priority Pill */}
                  <span
                    className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black uppercase ${
                      issue.priority === 'URGENT'
                        ? 'bg-rose-600 text-white'
                        : issue.priority === 'HIGH'
                        ? 'bg-amber-500 text-slate-950'
                        : issue.priority === 'MEDIUM'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {issue.priority}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-black uppercase border ${
                      issue.status === 'OPEN'
                        ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                        : issue.status === 'CLIENT_NOTIFIED'
                        ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                        : issue.status === 'PENDING_VERIFICATION'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 animate-pulse'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                    }`}
                  >
                    {issue.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Right Badges: Recurrence Pill & Auto-Escalated Purple Badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-amber-300 font-mono font-black text-xs">
                    [ Repeat x{issue.recurrenceCount} ]
                  </span>

                  {issue.isAutoEscalated && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-purple-950 text-purple-200 border border-purple-500/70 font-mono font-black text-xs shadow-sm">
                      [ ⚡ AUTO-ESCALATED ({issue.recurrenceCount}x) ]
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <div>
                  <h3 className="text-sm font-black text-white">{issue.title}</h3>
                  {issue.vehicleDetails && (
                    <p className="text-xs font-mono text-cyan-300 mt-0.5">
                      Vehicle: {issue.vehicleDetails}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{issue.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {issue.status !== 'PENDING_VERIFICATION' && issue.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestGuardVerification(issue);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 font-mono font-bold text-[11px] cursor-pointer"
                    >
                      [ Request Guard Field Verification ]
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPmNoticePreviewIssue(issue);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-500/50 font-mono font-bold text-[11px] cursor-pointer"
                  >
                    [ 📄 Export PM Violation Notice ]
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* =================================================================== */}
      {/* TICKET DETAIL & CROSS-SHIFT AUDIT MODAL                             */}
      {/* =================================================================== */}
      {selectedIssue && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setSelectedIssueId(null)}
        >
          <div
            className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl text-slate-100 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700">
                    Ticket #{selectedIssue.id}
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-300">
                    {selectedIssue.unitOrLocation} (Key: {selectedIssue.matchKeyValue})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                    [ Repeat x{selectedIssue.recurrenceCount} ]
                  </span>
                  {selectedIssue.isAutoEscalated && (
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/60 font-mono text-[11px] font-black">
                      [ ⚡ AUTO-ESCALATED ({selectedIssue.recurrenceCount}x) ]
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">{selectedIssue.title}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedIssue.siteName} • Category: {CATEGORY_LABELS[selectedIssue.category]} • Status:{' '}
                  <strong className="text-cyan-300">{selectedIssue.status}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIssueId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Workflow State Controls Bar */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-slate-400 font-mono uppercase block text-[10px]">
                    Workflow State Controls
                  </span>
                  <span className="font-bold text-slate-200">
                    Dispatch on-shift guard verification or generate formal PM Lease Violation packet
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRequestGuardVerification(selectedIssue)}
                    className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-black text-xs cursor-pointer shadow-md transition-colors"
                  >
                    [ Request Guard Field Verification ]
                  </button>
                  <button
                    type="button"
                    onClick={() => setPmNoticePreviewIssue(selectedIssue)}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-black text-xs cursor-pointer shadow-md transition-colors"
                  >
                    [ 📄 Export PM Violation Notice ]
                  </button>
                </div>
              </div>

              {/* Verification Details (If Resolved) */}
              {selectedIssue.verificationDetails && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-2 text-xs">
                  <div className="font-mono font-black text-emerald-300 uppercase">
                    ✓ Guard Field Verification Completed
                  </div>
                  <p className="text-slate-200">
                    Verified by <strong>{selectedIssue.verificationDetails.verifiedBy}</strong> (
                    {selectedIssue.verificationDetails.verifiedBadge}) on{' '}
                    {selectedIssue.verificationDetails.verifiedDate
                      ? new Date(selectedIssue.verificationDetails.verifiedDate).toLocaleString()
                      : 'N/A'}
                  </p>
                  <p className="text-emerald-200 italic">
                    "{selectedIssue.verificationDetails.resolutionNotes}"
                  </p>
                  {selectedIssue.verificationDetails.verificationPhotoUrl && (
                    <img
                      src={selectedIssue.verificationDetails.verificationPhotoUrl}
                      alt="Verification Evidence"
                      className="h-36 rounded-lg border border-emerald-500/40 object-cover mt-2"
                    />
                  )}
                </div>
              )}

              {/* 1. CROSS-SHIFT AUDIT TIMELINE */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 font-mono flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>
                    Cross-Shift Audit Timeline ({unifiedAuditTimeline.length} Chronological Entries)
                  </span>
                </h4>

                <div className="space-y-2.5">
                  {unifiedAuditTimeline.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-xl border text-xs ${
                        entry.sourceType === 'DAR_LOG'
                          ? 'bg-slate-950/90 border-amber-500/40'
                          : 'bg-slate-950/50 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-amber-300 border-b border-slate-800/80 pb-1.5 mb-1.5">
                        <span>
                          {new Date(entry.timestamp).toLocaleString()} | {entry.shiftName} |{' '}
                          <strong className="text-white">
                            {entry.officerName} ({entry.officerBadge})
                          </strong>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            entry.sourceType === 'DAR_LOG'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}
                        >
                          {entry.sourceType === 'DAR_LOG' ? 'FIELD DAR LOG' : 'CAD WORKFLOW'}
                        </span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{entry.notes}</p>
                      {entry.photoUrl && (
                        <div className="mt-2">
                          <img
                            src={entry.photoUrl}
                            alt="Shift DAR Evidence"
                            className="h-28 rounded-lg border border-slate-700 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. CLIENT OUTREACH & WORK ORDER LOG (PRE-CLIENT PORTAL MANAGEMENT) */}
              <form
                onSubmit={handleSaveClientOutreach}
                className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 font-mono">
                    Client Outreach &amp; Work Order Log (Pre-Client Portal Management)
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Saving flips status to CLIENT_NOTIFIED
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Property Manager / Contact Name
                    </label>
                    <input
                      type="text"
                      value={pmContactName}
                      onChange={(e) => setPmContactName(e.target.value)}
                      placeholder='e.g. "PM Sarah Miller"'
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Outreach Method
                    </label>
                    <select
                      value={pmContactMethod}
                      onChange={(e) =>
                        setPmContactMethod(e.target.value as 'EMAIL' | 'PHONE' | 'PORTAL')
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="EMAIL">EMAIL</option>
                      <option value="PHONE">PHONE</option>
                      <option value="PORTAL">PORTAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      External Work Order #
                    </label>
                    <input
                      type="text"
                      value={pmExternalTicketRef}
                      onChange={(e) => setPmExternalTicketRef(e.target.value)}
                      placeholder="e.g. WO-PORT-8841"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Notification Timestamp
                    </label>
                    <input
                      type="datetime-local"
                      value={pmContactTimestamp}
                      onChange={(e) => setPmContactTimestamp(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Outreach Summary &amp; Work Order Notes
                  </label>
                  <textarea
                    rows={2}
                    value={pmContactNotes}
                    onChange={(e) => setPmContactNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-black text-xs cursor-pointer shadow-md"
                  >
                    Save Client Outreach &amp; Flip Status → CLIENT_NOTIFIED
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* CREATE ISSUE TICKET MODAL ([ + Create Issue Ticket ])               */}
      {/* =================================================================== */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <form
            onSubmit={handleCreateIssueTicket}
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 text-slate-100 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-blue-400 font-bold block">
                  Command CAD Manual Issue Dispatch
                </span>
                <h3 className="text-base font-black text-white">Create Site Issue Ticket</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Property / Site</label>
                <select
                  value={newSiteId}
                  onChange={(e) => setNewSiteId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                >
                  {sitesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as IssueCategory)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="SAFETY_HAZARD">Safety Hazard</option>
                  <option value="CHRONIC_LEASE_VIOLATION">Chronic Lease Violation</option>
                  <option value="PARKING_VIOLATION">Parking Violation</option>
                  <option value="NOISE_COMPLAINT">Noise Complaint</option>
                  <option value="UNAUTHORIZED_OCCUPANT">Unauthorized Occupant</option>
                  <option value="TRASH_DUMPING">Trash Dumping</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Unit / Location / License Plate
                </label>
                <input
                  type="text"
                  value={newUnitOrLocation}
                  onChange={(e) => setNewUnitOrLocation(e.target.value)}
                  placeholder='e.g. "Apt 304", "Gate 2", "Plate ABC-123"'
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) =>
                    setNewPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Issue Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder='e.g. "Broken Maglock on South Pedestrian Gate"'
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            {newCategory === 'PARKING_VIOLATION' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Vehicle Details (Make / Model / Color / Plate)
                </label>
                <input
                  type="text"
                  value={newVehicleDetails}
                  onChange={(e) => setNewVehicleDetails(e.target.value)}
                  placeholder="e.g. Silver Honda Accord [Plate: ABC-123]"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Detailed Description &amp; Post Order Instructions
              </label>
              <textarea
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe the maintenance hazard or chronic infraction for oncoming shifts..."
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs cursor-pointer shadow-md"
              >
                Create Ticket &amp; Broadcast to Watchlist
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* EXPORT SITE ISSUE DIGEST MODAL ([ 📄 Export Site Issue Digest ])    */}
      {/* =================================================================== */}
      {isDigestModalOpen && (
        <div
          className="print:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsDigestModalOpen(false)}
        >
          <div
            className="print:hidden w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5 text-slate-100 shadow-2xl space-y-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="print:hidden flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">
                  Printable &amp; CSV Executive Summary
                </span>
                <h3 className="text-base font-black text-white">
                  Export Site Issue Digest ({digestFilteredIssues.length} Issues)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDigestModalOpen(false)}
                className="print:hidden p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Responsive 2-Tier Digest Controls Bar */}
            <div className="print:hidden bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                {/* Tier 1: Timeframe Filters */}
                <div className="w-full sm:w-auto">
                  <span className="text-xs font-semibold text-slate-400 mb-1.5 block sm:inline sm:mr-2">
                    Timeframe:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 mb-3 sm:mb-0 sm:inline-flex">
                    {(
                      [
                        { key: '7D', label: '7 Days' },
                        { key: '30D', label: '30 Days' },
                        { key: '90D', label: '90 Days' },
                        { key: 'ALL', label: 'All-Time' },
                        { key: 'CUSTOM', label: '📅 Custom' }
                      ] as const
                    ).map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => setDigestTimeframe(preset.key)}
                        className={`px-2.5 py-1 rounded font-mono font-bold text-xs cursor-pointer transition-colors ${
                          digestTimeframe === preset.key
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tier 2: Action Buttons */}
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto mt-3 sm:mt-0 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full justify-center text-xs py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">🖨️ Print Digest</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDigestCsv}
                    className="w-full justify-center text-xs py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">📥 Download CSV</span>
                  </button>
                </div>
              </div>

              {/* Sub-Tier: Custom Date Range Inputs */}
              {digestTimeframe === 'CUSTOM' && (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mt-2 p-2 bg-slate-950/80 border border-slate-800 rounded text-xs w-full">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 min-w-[120px] px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-slate-400 font-mono">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 min-w-[120px] px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Visual Feedback Banner when Print / Fallback is triggered */}
              {printFeedbackBanner && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs flex items-start justify-between gap-2">
                  <span>{printFeedbackBanner}</span>
                  <button
                    type="button"
                    onClick={() => setPrintFeedbackBanner(null)}
                    className="text-amber-300 hover:text-white shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Digest Preview Item Row Layout (Stacked Header/Body Card) */}
            <div className="print:hidden max-h-72 overflow-y-auto divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 p-3 text-xs font-mono">
              {digestFilteredIssues.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  No site issues recorded within the selected timeframe window.
                </div>
              ) : (
                digestFilteredIssues.map((issue) => (
                  <div key={issue.id} className="py-2.5 first:pt-0.5 last:pb-0.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sky-400 font-bold text-xs">
                        #{issue.id} • {issue.siteName}
                      </span>
                      <span className="shrink-0 text-slate-400 text-[11px]">
                        {issue.status} (x{issue.recurrenceCount})
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-medium leading-relaxed w-full">
                      {issue.unitOrLocation} — {issue.title}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* DEDICATED PRINTABLE DOCUMENT CONTAINER                              */}
      {/* =================================================================== */}
      <div
        id="printable-site-digest"
        className="hidden print:block print:w-full print:bg-white print:text-black font-sans p-6 text-sm"
      >
        {/* Header Section */}
        <div className="flex items-center justify-between pb-3">
          <div className="font-bold tracking-wide text-xs uppercase text-black">
            SECURESHIFT DISPATCH &amp; SECURITY OPERATIONS
          </div>
          <div className="font-bold tracking-wide text-xs uppercase text-black text-right">
            EXECUTIVE PROPERTY AUDIT &amp; ISSUE DIGEST
          </div>
        </div>
        <hr className="border-t-2 border-black mb-4" />

        {/* Metadata Block (2-column grid) */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs border border-gray-300 rounded p-3 mb-5 bg-white">
          <div>
            <span className="font-semibold text-gray-700">Facility Name: </span>
            <span className="font-bold text-black">
              {selectedSiteName || 'All Enterprise Facilities'}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Audit Timeframe: </span>
            <span className="font-bold text-black">{timeframeLabel}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Report Generated: </span>
            <span className="text-black">{new Date().toLocaleString()}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Authorized By: </span>
            <span className="text-black">Operations Dispatch / Sentinel CAD</span>
          </div>
          <div className="col-span-2 pt-1.5 mt-1 border-t border-gray-200 font-semibold text-black">
            Summary Counts: Total Issues: {digestSummaryCounts.count} | Open:{' '}
            {digestSummaryCounts.openCount} | Chronic Repeat: {digestSummaryCounts.chronicCount} |
            Resolved: {digestSummaryCounts.resolvedCount}
          </div>
        </div>

        {/* Tabular / Card Issue Breakdown */}
        <div className="space-y-3">
          {digestFilteredIssues.length === 0 ? (
            <div className="border border-gray-300 rounded p-4 text-center text-gray-600 text-xs">
              No site issues recorded within the selected audit timeframe.
            </div>
          ) : (
            digestFilteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="issue-print-card border border-gray-400 rounded p-3 bg-white text-black shadow-none"
              >
                {/* Header Line */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-1.5 mb-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-black">#{issue.id}</span>
                    <span className="text-gray-700">
                      {new Date(issue.initialReportDate).toLocaleDateString()} • Priority:{' '}
                      <strong className="text-black">{issue.priority}</strong>
                    </span>
                    <span className="font-mono font-semibold text-black">
                      [{issue.category.replace(/_/g, ' ')}]
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold uppercase px-1.5 py-0.5 border border-gray-400 rounded text-[11px] text-black">
                      {issue.status.replace(/_/g, ' ')}
                    </span>
                    {issue.recurrenceCount > 1 && (
                      <span className="font-semibold text-gray-800">
                        (Repeat Infraction: {issue.recurrenceCount}x sightings)
                      </span>
                    )}
                  </div>
                </div>

                {/* Location / Asset */}
                <div className="font-bold text-xs text-black">
                  Location: {issue.siteName} — {issue.unitOrLocation}
                  {issue.vehicleDetails ? ` | Vehicle: ${issue.vehicleDetails}` : ''} —{' '}
                  {issue.title}
                </div>

                {/* Narrative Description */}
                <p className="text-gray-800 mt-1 leading-normal text-xs">{issue.description}</p>

                {/* Action & History Log */}
                {(issue.clientContactLog || issue.verificationDetails) && (
                  <div className="mt-2 pt-1.5 border-t border-gray-200 space-y-1 text-xs text-gray-800">
                    {issue.clientContactLog && (
                      <div>
                        <span className="font-semibold text-black">Client Notified: </span>
                        {issue.clientContactLog.notifiedDate
                          ? new Date(issue.clientContactLog.notifiedDate).toLocaleString()
                          : 'N/A'}{' '}
                        via {issue.clientContactLog.method || 'N/A'} - Ref #
                        {issue.clientContactLog.externalTicketRef || 'N/A'}
                      </div>
                    )}
                    {issue.verificationDetails && (
                      <div>
                        <span className="font-semibold text-black">Field Verified: </span>
                        {issue.verificationDetails.verifiedDate
                          ? new Date(issue.verificationDetails.verifiedDate).toLocaleString()
                          : 'N/A'}{' '}
                        by {issue.verificationDetails.verifiedBy || 'On-Duty Officer'} - Notes:{' '}
                        {issue.verificationDetails.resolutionNotes || 'Verified resolved on site.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Document Footer */}
        <div className="mt-6 pt-3 border-t border-gray-400 text-center text-[11px] font-semibold tracking-wider text-gray-700 uppercase">
          CONFIDENTIAL PROPERTY MANAGEMENT RECORD • SECURESHIFT AUTOMATED LOGISTICS • PAGE 1 OF 1
        </div>
      </div>

      {/* =================================================================== */}
      {/* EXPORT PM VIOLATION NOTICE MODAL ([ 📄 Export PM Violation Notice ]) */}
      {/* =================================================================== */}
      {pmNoticePreviewIssue && (
        <div
          className="print:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPmNoticePreviewIssue(null)}
        >
          <div
            className="w-full max-w-2xl bg-slate-900 border border-purple-500/60 rounded-2xl p-5 text-slate-100 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block">
                  Property Manager Formal Lease Violation Attachment
                </span>
                <h3 className="text-base font-black text-white">
                  Incident Chronology Report — Ticket #{pmNoticePreviewIssue.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPmNoticePreviewIssue(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-80 whitespace-pre-wrap leading-relaxed">
              {generatePmViolationNoticeText(pmNoticePreviewIssue)}
            </pre>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    generatePmViolationNoticeText(pmNoticePreviewIssue)
                  );
                  setCopiedNotice(true);
                  setTimeout(() => setCopiedNotice(false), 2000);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold cursor-pointer"
              >
                {copiedNotice ? '✓ Copied to Clipboard' : 'Copy Formatted Notice'}
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPmViolationNotice(pmNoticePreviewIssue)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download PM Violation Notice (.txt)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteIssueTracker;
