import React, { useState, useMemo } from 'react';
import { 
  CallForService, 
  CallPriority, 
  CallStatus, 
  CallType, 
  CallDisposition 
} from '../../types/shift';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  Calendar, 
  Clock, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Copy, 
  Check, 
  Printer, 
  Car, 
  ShieldAlert, 
  FileText, 
  RefreshCw, 
  SlidersHorizontal, 
  Eye, 
  ArrowDownToLine,
  Building2,
  Radio,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { formatDateTime, formatTimestamp } from '../../utils/time';

export interface ExportCallsModalProps {
  isOpen: boolean;
  onClose: () => void;
  calls: CallForService[];
  sitesList: { name: string; id?: string }[];
  onNotify?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

type DateRangePreset = 'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'custom';

export const ExportCallsModal: React.FC<ExportCallsModalProps> = ({
  isOpen,
  onClose,
  calls,
  sitesList,
  onNotify
}) => {
  // Preset Selection
  const [datePreset, setDatePreset] = useState<DateRangePreset>('last_30_days');

  // Custom Dates
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState<string>(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Secondary Filters
  const [statusFilter, setStatusFilter] = useState<'all' | CallStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | CallPriority>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | CallType>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // UI state
  const [activeTab, setActiveTab] = useState<'preview' | 'fields' | 'summary'>('preview');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Column export options
  const [exportColumns, setExportColumns] = useState<{
    cfsId: boolean;
    date: boolean;
    dispatchedTime: boolean;
    dispatchedBy: boolean;
    priority: boolean;
    callType: boolean;
    isBolo: boolean;
    siteName: boolean;
    locationDetails: boolean;
    summary: boolean;
    details: boolean;
    callerInfo: boolean;
    officerInstructions: boolean;
    assignedRover: boolean;
    assignedGroup: boolean;
    assignedGuard: boolean;
    acknowledgedAt: boolean;
    ackLatencySec: boolean;
    ackChannel: boolean;
    onSceneTime: boolean;
    responseTimeMin: boolean;
    status: boolean;
    outcomeDisposition: boolean;
    resolutionNote: boolean;
    clearedAt: boolean;
    clearedBy: boolean;
    totalDurationMin: boolean;
    cancellationInfo: boolean;
    boloDetails: boolean;
  }>({
    cfsId: true,
    date: true,
    dispatchedTime: true,
    dispatchedBy: true,
    priority: true,
    callType: true,
    isBolo: true,
    siteName: true,
    locationDetails: true,
    summary: true,
    details: true,
    callerInfo: true,
    officerInstructions: true,
    assignedRover: true,
    assignedGroup: true,
    assignedGuard: true,
    acknowledgedAt: true,
    ackLatencySec: true,
    ackChannel: true,
    onSceneTime: true,
    responseTimeMin: true,
    status: true,
    outcomeDisposition: true,
    resolutionNote: true,
    clearedAt: true,
    clearedBy: true,
    totalDurationMin: true,
    cancellationInfo: true,
    boloDetails: true
  });

  // Apply Date Range Preset Helper
  const handleSelectPreset = (preset: DateRangePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'last_7_days') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      setStartDate(d7.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (preset === 'last_30_days') {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      setStartDate(d30.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (preset === 'this_month') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstOfMonth);
      setEndDate(today);
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate('2030-12-31');
    }
  };

  // Filtered Calls calculation
  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      // Date boundary check
      if (datePreset !== 'all') {
        const callDate = call.createdAt ? call.createdAt.split('T')[0] : '';
        if (startDate && callDate < startDate) return false;
        if (endDate && callDate > endDate) return false;
      }

      // Status
      if (statusFilter !== 'all' && call.status !== statusFilter) {
        return false;
      }

      // Priority
      if (priorityFilter !== 'all' && call.priority !== priorityFilter) {
        return false;
      }

      // Call Type
      if (typeFilter !== 'all' && call.callType !== typeFilter) {
        return false;
      }

      // Facility / Site
      if (siteFilter !== 'all' && call.siteName !== siteFilter) {
        return false;
      }

      // Search Query
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const match = 
          call.id.toLowerCase().includes(q) ||
          call.siteName.toLowerCase().includes(q) ||
          call.locationDetails.toLowerCase().includes(q) ||
          call.summary.toLowerCase().includes(q) ||
          (call.details && call.details.toLowerCase().includes(q)) ||
          (call.assignedGuardName && call.assignedGuardName.toLowerCase().includes(q)) ||
          (call.assignedRoverUnit && call.assignedRoverUnit.toLowerCase().includes(q)) ||
          (call.acknowledgedByGuard?.guardName && call.acknowledgedByGuard.guardName.toLowerCase().includes(q)) ||
          (call.disposition && call.disposition.toLowerCase().includes(q)) ||
          (call.resolutionNote && call.resolutionNote.toLowerCase().includes(q));

        if (!match) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [calls, datePreset, startDate, endDate, statusFilter, priorityFilter, typeFilter, siteFilter, searchFilter]);

  // Statistics calculation for the filtered calls
  const stats = useMemo(() => {
    const total = filteredCalls.length;
    if (total === 0) {
      return {
        total: 0,
        clearedCount: 0,
        activeCount: 0,
        cancelledCount: 0,
        boloCount: 0,
        avgAckLatencySec: 0,
        avgResponseTimeMin: 0,
        avgDurationMin: 0,
        dispositionBreakdown: {} as Record<string, number>,
        slaCompliantPct: 100
      };
    }

    let clearedCount = 0;
    let activeCount = 0;
    let cancelledCount = 0;
    let boloCount = 0;

    let totalAckLatencySec = 0;
    let ackCount = 0;

    let totalResponseTimeMin = 0;
    let responseCount = 0;

    let totalDurationMin = 0;
    let durationCount = 0;

    const dispositionBreakdown: Record<string, number> = {};
    let slaMetCount = 0;

    filteredCalls.forEach((call) => {
      if (call.status === 'cleared') clearedCount++;
      else if (call.status === 'cancelled') cancelledCount++;
      else activeCount++;

      if (call.isBolo || call.priority === 'urgent_bolo') boloCount++;

      // Acknowledgment Latency
      if (call.timeToAcknowledgeSec !== undefined && call.timeToAcknowledgeSec > 0) {
        totalAckLatencySec += call.timeToAcknowledgeSec;
        ackCount++;
        if (call.timeToAcknowledgeSec <= 120) slaMetCount++; // standard 2-min ack SLA
      } else if (call.acknowledgedByGuard?.acknowledgedAt && call.createdAt) {
        const diffSec = Math.max(0, Math.round((new Date(call.acknowledgedByGuard.acknowledgedAt).getTime() - new Date(call.createdAt).getTime()) / 1000));
        totalAckLatencySec += diffSec;
        ackCount++;
        if (diffSec <= 120) slaMetCount++;
      }

      // Response Time (Dispatch to On-Scene)
      if (call.onSceneAt && call.createdAt) {
        const diffMin = Math.max(0, (new Date(call.onSceneAt).getTime() - new Date(call.createdAt).getTime()) / 60000);
        totalResponseTimeMin += diffMin;
        responseCount++;
      }

      // Total Call Duration (Dispatch to Clear)
      if (call.clearedAt && call.createdAt) {
        const diffMin = Math.max(0, (new Date(call.clearedAt).getTime() - new Date(call.createdAt).getTime()) / 60000);
        totalDurationMin += diffMin;
        durationCount++;
      }

      // Disposition
      if (call.disposition) {
        dispositionBreakdown[call.disposition] = (dispositionBreakdown[call.disposition] || 0) + 1;
      }
    });

    return {
      total,
      clearedCount,
      activeCount,
      cancelledCount,
      boloCount,
      avgAckLatencySec: ackCount > 0 ? Math.round(totalAckLatencySec / ackCount) : 0,
      avgResponseTimeMin: responseCount > 0 ? Math.round((totalResponseTimeMin / responseCount) * 10) / 10 : 0,
      avgDurationMin: durationCount > 0 ? Math.round((totalDurationMin / durationCount) * 10) / 10 : 0,
      dispositionBreakdown,
      slaCompliantPct: ackCount > 0 ? Math.round((slaMetCount / ackCount) * 100) : 100
    };
  }, [filteredCalls]);

  // Format Helpers for Export Fields
  const formatLatency = (sec?: number) => {
    if (sec === undefined || sec === null) return 'N/A';
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const getResponseTimeMinutes = (call: CallForService): string => {
    if (!call.onSceneAt || !call.createdAt) return 'Pending';
    const diffMin = (new Date(call.onSceneAt).getTime() - new Date(call.createdAt).getTime()) / 60000;
    return `${(Math.max(0, diffMin)).toFixed(1)} min`;
  };

  const getTotalDurationMinutes = (call: CallForService): string => {
    if (!call.clearedAt || !call.createdAt) return 'In Progress';
    const diffMin = (new Date(call.clearedAt).getTime() - new Date(call.createdAt).getTime()) / 60000;
    return `${(Math.max(0, diffMin)).toFixed(1)} min`;
  };

  // Build CSV Row
  const escapeCsv = (val: any): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const generateCsvData = (): string => {
    const headers: string[] = [];
    
    if (exportColumns.cfsId) headers.push('CFS ID');
    if (exportColumns.date) headers.push('Call Date');
    if (exportColumns.dispatchedTime) {
      headers.push('Dispatched Time (ISO)');
      headers.push('Dispatched Time (Formatted)');
    }
    if (exportColumns.dispatchedBy) headers.push('Dispatched By');
    if (exportColumns.priority) headers.push('Priority');
    if (exportColumns.callType) headers.push('Call Type');
    if (exportColumns.isBolo) headers.push('Is BOLO');
    if (exportColumns.siteName) headers.push('Facility / Site Name');
    if (exportColumns.locationDetails) headers.push('Location / Post Details');
    if (exportColumns.summary) headers.push('Call Summary');
    if (exportColumns.details) headers.push('Full Incident Details');
    if (exportColumns.officerInstructions) headers.push('Officer Post Instructions');
    if (exportColumns.callerInfo) {
      headers.push('Caller Name');
      headers.push('Caller Phone');
      headers.push('Caller Location / Title');
    }
    if (exportColumns.assignedRover) headers.push('Assigned Mobile Unit');
    if (exportColumns.assignedGroup) headers.push('Assigned Mobile Sector');
    if (exportColumns.assignedGuard) {
      headers.push('Assigned Guard Name');
      headers.push('Assigned Guard Badge');
    }
    if (exportColumns.acknowledgedAt) {
      headers.push('Acknowledged At (ISO)');
      headers.push('Acknowledged At (Formatted)');
    }
    if (exportColumns.ackLatencySec) {
      headers.push('Ack Latency (Seconds)');
      headers.push('Ack Latency (Formatted)');
    }
    if (exportColumns.ackChannel) headers.push('Receipt Channel');
    if (exportColumns.onSceneTime) {
      headers.push('On-Scene Time (ISO)');
      headers.push('On-Scene Time (Formatted)');
    }
    if (exportColumns.responseTimeMin) headers.push('Response Time (Dispatch to On-Scene Minutes)');
    if (exportColumns.status) headers.push('Current Status');
    if (exportColumns.outcomeDisposition) headers.push('Outcome / Disposition');
    if (exportColumns.resolutionNote) headers.push('Resolution Notes / Clear Summary');
    if (exportColumns.clearedAt) {
      headers.push('Cleared At (ISO)');
      headers.push('Cleared At (Formatted)');
    }
    if (exportColumns.clearedBy) headers.push('Cleared By Guard');
    if (exportColumns.totalDurationMin) headers.push('Total Call Cycle Duration (Minutes)');
    if (exportColumns.cancellationInfo) {
      headers.push('Cancelled At');
      headers.push('Cancelled By');
      headers.push('Cancellation Reason');
    }
    if (exportColumns.boloDetails) {
      headers.push('BOLO Subject Name');
      headers.push('BOLO Subject Description');
      headers.push('BOLO Vehicle');
      headers.push('BOLO Armed & Dangerous');
    }

    const rows: string[] = [headers.map(escapeCsv).join(',')];

    filteredCalls.forEach((call) => {
      const row: string[] = [];
      const ackSec = call.timeToAcknowledgeSec ?? (
        call.acknowledgedByGuard?.acknowledgedAt && call.createdAt
          ? Math.max(0, Math.round((new Date(call.acknowledgedByGuard.acknowledgedAt).getTime() - new Date(call.createdAt).getTime()) / 1000))
          : undefined
      );

      if (exportColumns.cfsId) row.push(escapeCsv(call.id));
      if (exportColumns.date) row.push(escapeCsv(call.createdAt ? call.createdAt.split('T')[0] : ''));
      if (exportColumns.dispatchedTime) {
        row.push(escapeCsv(call.createdAt || ''));
        row.push(escapeCsv(call.createdAt ? formatDateTime(call.createdAt) : ''));
      }
      if (exportColumns.dispatchedBy) row.push(escapeCsv(`${call.dispatchedBy?.name || 'Dispatcher'} (${call.dispatchedBy?.badge || 'HQ'})`));
      if (exportColumns.priority) row.push(escapeCsv(call.priority));
      if (exportColumns.callType) row.push(escapeCsv(call.customTypeLabel || call.callType));
      if (exportColumns.isBolo) row.push(escapeCsv(call.isBolo || call.priority === 'urgent_bolo' ? 'YES' : 'NO'));
      if (exportColumns.siteName) row.push(escapeCsv(call.siteName));
      if (exportColumns.locationDetails) row.push(escapeCsv(call.locationDetails));
      if (exportColumns.summary) row.push(escapeCsv(call.summary));
      if (exportColumns.details) row.push(escapeCsv(call.details || ''));
      if (exportColumns.officerInstructions) row.push(escapeCsv(call.officerInstructions || ''));
      if (exportColumns.callerInfo) {
        row.push(escapeCsv(call.callerInfo?.name || ''));
        row.push(escapeCsv(call.callerInfo?.phone || ''));
        row.push(escapeCsv(call.callerInfo?.roleOrTitle || call.callerInfo?.unitOrLocation || ''));
      }
      if (exportColumns.assignedRover) row.push(escapeCsv(call.assignedRoverUnit || 'Unassigned'));
      if (exportColumns.assignedGroup) row.push(escapeCsv(call.assignedRovingGroup || 'N/A'));
      if (exportColumns.assignedGuard) {
        row.push(escapeCsv(call.assignedGuardName || call.acknowledgedByGuard?.guardName || 'Unassigned'));
        row.push(escapeCsv(call.assignedGuardBadge || call.acknowledgedByGuard?.badgeNumber || ''));
      }
      if (exportColumns.acknowledgedAt) {
        row.push(escapeCsv(call.acknowledgedByGuard?.acknowledgedAt || ''));
        row.push(escapeCsv(call.acknowledgedByGuard?.acknowledgedAt ? formatDateTime(call.acknowledgedByGuard.acknowledgedAt) : 'Pending'));
      }
      if (exportColumns.ackLatencySec) {
        row.push(escapeCsv(ackSec !== undefined ? ackSec : ''));
        row.push(escapeCsv(formatLatency(ackSec)));
      }
      if (exportColumns.ackChannel) row.push(escapeCsv(call.acknowledgedByGuard?.receiptChannel || 'N/A'));
      if (exportColumns.onSceneTime) {
        row.push(escapeCsv(call.onSceneAt || ''));
        row.push(escapeCsv(call.onSceneAt ? formatDateTime(call.onSceneAt) : 'Pending'));
      }
      if (exportColumns.responseTimeMin) row.push(escapeCsv(getResponseTimeMinutes(call)));
      if (exportColumns.status) row.push(escapeCsv(call.status));
      if (exportColumns.outcomeDisposition) row.push(escapeCsv(call.disposition || 'Pending Resolution'));
      if (exportColumns.resolutionNote) row.push(escapeCsv(call.resolutionNote || ''));
      if (exportColumns.clearedAt) {
        row.push(escapeCsv(call.clearedAt || ''));
        row.push(escapeCsv(call.clearedAt ? formatDateTime(call.clearedAt) : ''));
      }
      if (exportColumns.clearedBy) {
        row.push(escapeCsv(call.clearedByGuard ? `${call.clearedByGuard.guardName} (${call.clearedByGuard.badgeNumber})` : ''));
      }
      if (exportColumns.totalDurationMin) row.push(escapeCsv(getTotalDurationMinutes(call)));
      if (exportColumns.cancellationInfo) {
        row.push(escapeCsv(call.cancelledAt ? formatDateTime(call.cancelledAt) : ''));
        row.push(escapeCsv(call.cancelledBy || ''));
        row.push(escapeCsv(call.cancellationReason || ''));
      }
      if (exportColumns.boloDetails) {
        row.push(escapeCsv(call.boloSubject?.name || ''));
        row.push(escapeCsv(call.boloSubject?.clothingDescription || call.boloSubject?.description || ''));
        row.push(escapeCsv(call.boloSubject?.vehicleInfo || call.boloSubject?.licensePlate || ''));
        row.push(escapeCsv(call.boloSubject?.armedAndDangerous ? 'YES (ARMED)' : 'NO'));
      }

      rows.push(row.join(','));
    });

    return rows.join('\r\n');
  };

  // Export to CSV Download
  const handleDownloadCsv = () => {
    if (filteredCalls.length === 0) {
      if (onNotify) onNotify('No Calls to Export', 'There are no calls matching the selected date range and filters.', 'info');
      return;
    }

    setIsExporting(true);
    try {
      const csvString = generateCsvData();
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `Calls_For_Service_Export_${startDate || 'all'}_to_${endDate || 'now'}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onNotify) {
        onNotify('CSV Export Complete', `Exported ${filteredCalls.length} call records to ${filename}`, 'success');
      }
    } catch (e) {
      console.error(e);
      if (onNotify) onNotify('Export Failed', 'An error occurred while generating the CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to JSON Download
  const handleDownloadJson = () => {
    if (filteredCalls.length === 0) {
      if (onNotify) onNotify('No Calls to Export', 'There are no calls matching the selected date range and filters.', 'info');
      return;
    }

    setIsExporting(true);
    try {
      const exportPayload = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalRecords: filteredCalls.length,
          dateRange: {
            preset: datePreset,
            startDate: startDate || null,
            endDate: endDate || null
          },
          filters: {
            status: statusFilter,
            priority: priorityFilter,
            callType: typeFilter,
            site: siteFilter
          },
          summaryStats: stats
        },
        calls: filteredCalls
      };

      const jsonString = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `Calls_For_Service_Export_${startDate || 'all'}_to_${endDate || 'now'}.json`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onNotify) {
        onNotify('JSON Export Complete', `Exported ${filteredCalls.length} call records to ${filename}`, 'success');
      }
    } catch (e) {
      console.error(e);
      if (onNotify) onNotify('Export Failed', 'An error occurred while generating JSON.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Copy CSV to Clipboard
  const handleCopyClipboard = () => {
    if (filteredCalls.length === 0) return;
    try {
      const csv = generateCsvData();
      navigator.clipboard.writeText(csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      if (onNotify) onNotify('Copied to Clipboard', `Copied ${filteredCalls.length} CSV records to your clipboard.`, 'success');
    } catch (e) {
      console.error(e);
    }
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // Toggle all columns
  const handleToggleAllColumns = (val: boolean) => {
    setExportColumns({
      cfsId: val,
      date: val,
      dispatchedTime: val,
      dispatchedBy: val,
      priority: val,
      callType: val,
      isBolo: val,
      siteName: val,
      locationDetails: val,
      summary: val,
      details: val,
      callerInfo: val,
      officerInstructions: val,
      assignedRover: val,
      assignedGroup: val,
      assignedGuard: val,
      acknowledgedAt: val,
      ackLatencySec: val,
      ackChannel: val,
      onSceneTime: val,
      responseTimeMin: val,
      status: val,
      outcomeDisposition: val,
      resolutionNote: val,
      clearedAt: val,
      clearedBy: val,
      totalDurationMin: val,
      cancellationInfo: val,
      boloDetails: val
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        id="export-calls-modal-container"
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide">
                  Export Calls for Service & Dispatches
                </h2>
                <span className="bg-blue-500/20 text-blue-300 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                  {filteredCalls.length} of {calls.length} records
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Filter by custom date range, dispatch times, acknowledgment latency, on-scene response times, and disposition outcomes.
              </p>
            </div>
          </div>

          <button
            id="close-export-calls-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Export Tool"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 text-slate-800 dark:text-slate-200">
          
          {/* STEP 1: DATE RANGE SELECTION */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  1. Select Date Range
                </span>
              </div>

              {/* Date Presets */}
              <div className="flex items-center gap-1 flex-wrap">
                {(
                  [
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'last_7_days', label: 'Last 7 Days' },
                    { id: 'last_30_days', label: 'Last 30 Days' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'all', label: 'All Time' },
                    { id: 'custom', label: 'Custom' }
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    id={`date-preset-${preset.id}`}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      datePreset === preset.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Pickers (Shown for custom or visible to fine tune) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Start Date (From)
                </label>
                <input
                  id="export-start-date-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  End Date (To)
                </label>
                <input
                  id="export-end-date-input"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Filter by Status
                </label>
                <select
                  id="export-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="all">All Statuses</option>
                  <option value="cleared">Cleared Only</option>
                  <option value="dispatched">Dispatched / En Route</option>
                  <option value="on_scene">On Scene</option>
                  <option value="pending_acknowledgment">Pending Acknowledgment</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Filter by Facility
                </label>
                <select
                  id="export-site-filter"
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="all">All Facilities</option>
                  {sitesList.map((site) => (
                    <option key={site.name} value={site.name}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* KEY METRICS BANNER FOR SELECTED RANGE */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <span className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-400">Total Calls</span>
              <p className="text-lg sm:text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                {stats.total}
              </p>
              <span className="text-[10px] text-slate-500">Matching range</span>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <span className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400">Cleared / Done</span>
              <p className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {stats.clearedCount}
              </p>
              <span className="text-[10px] text-slate-500">{stats.total > 0 ? Math.round((stats.clearedCount / stats.total) * 100) : 0}% resolution</span>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <span className="text-[10px] uppercase font-black text-cyan-600 dark:text-cyan-400">Avg Ack Latency</span>
              <p className="text-lg sm:text-xl font-black font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                {formatLatency(stats.avgAckLatencySec)}
              </p>
              <span className="text-[10px] text-slate-500">Officer accept time</span>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <span className="text-[10px] uppercase font-black text-purple-600 dark:text-purple-400">Avg Response Time</span>
              <p className="text-lg sm:text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                {stats.avgResponseTimeMin > 0 ? `${stats.avgResponseTimeMin} min` : 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500">Time to on-scene</span>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <span className="text-[10px] uppercase font-black text-amber-600 dark:text-amber-400">Avg Total Cycle</span>
              <p className="text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {stats.avgDurationMin > 0 ? `${stats.avgDurationMin} min` : 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500">Dispatch to clear</span>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <span className="text-[10px] uppercase font-black text-rose-600 dark:text-rose-400">BOLOs / Active</span>
              <p className="text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                {stats.boloCount} / {stats.activeCount}
              </p>
              <span className="text-[10px] text-slate-500">High priority alerts</span>
            </div>
          </div>

          {/* VIEW TABS (PREVIEW TABLE / COLUMNS CUSTOMIZER / SUMMARY STATS) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Data Preview ({filteredCalls.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('fields')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'fields'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Field & Column Selector</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'summary'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Dispositions Breakdown</span>
                </button>
              </div>

              {/* In-table Search */}
              {activeTab === 'preview' && (
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search in preview..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* TAB CONTENT 1: PREVIEW TABLE */}
            {activeTab === 'preview' && (
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filteredCalls.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-sm">No Calls Match This Date Range & Filters</p>
                    <p className="text-xs mt-1">Try expanding the date preset to &quot;All Time&quot; or resetting the status/site filters.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-950/80 sticky top-0 z-10 text-[11px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">CFS ID</th>
                        <th className="py-2.5 px-3">Date & Dispatched</th>
                        <th className="py-2.5 px-3">Site / Location</th>
                        <th className="py-2.5 px-3">Type & Priority</th>
                        <th className="py-2.5 px-3">Assigned Mobile Unit / Guard</th>
                        <th className="py-2.5 px-3">Ack Latency</th>
                        <th className="py-2.5 px-3">Response Time</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Outcome / Disposition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                      {filteredCalls.map((call) => {
                        const ackSec = call.timeToAcknowledgeSec ?? (
                          call.acknowledgedByGuard?.acknowledgedAt && call.createdAt
                            ? Math.max(0, Math.round((new Date(call.acknowledgedByGuard.acknowledgedAt).getTime() - new Date(call.createdAt).getTime()) / 1000))
                            : undefined
                        );

                        return (
                          <tr key={call.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {call.id}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {call.createdAt ? formatTimestamp(call.createdAt) : 'N/A'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {call.createdAt ? call.createdAt.split('T')[0] : ''}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 max-w-[180px]">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate" title={call.siteName}>
                                {call.siteName}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate" title={call.locationDetails}>
                                {call.locationDetails}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
                                call.priority === 'urgent_bolo'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : call.priority === 'priority'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              }`}>
                                {call.isBolo && <ShieldAlert className="w-2.5 h-2.5" />}
                                <span>{call.customTypeLabel || call.callType}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {call.assignedRoverUnit || 'Unassigned'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {call.assignedGuardName || call.acknowledgedByGuard?.guardName || 'Pending'}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                              {ackSec !== undefined ? (
                                <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                  ackSec <= 60 
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                    : ackSec <= 180
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {formatLatency(ackSec)}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Unacked</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-purple-600 dark:text-purple-400 font-bold whitespace-nowrap">
                              {getResponseTimeMinutes(call)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                call.status === 'cleared'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : call.status === 'cancelled'
                                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  : call.status === 'on_scene'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {call.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 max-w-[180px]">
                              {call.disposition ? (
                                <div>
                                  <p className="font-bold text-emerald-700 dark:text-emerald-300 truncate" title={call.disposition}>
                                    ✓ {call.disposition}
                                  </p>
                                  {call.resolutionNote && (
                                    <p className="text-[10px] text-slate-400 truncate" title={call.resolutionNote}>
                                      {call.resolutionNote}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Pending disposition</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: FIELD & COLUMN SELECTOR */}
            {activeTab === 'fields' && (
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select which fields and metadata parameters to include in your CSV/JSON export files:
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAllColumns(true)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAllColumns(false)}
                      className="text-xs font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2">
                  {Object.entries(exportColumns).map(([key, isChecked]) => {
                    const fieldLabels: Record<string, string> = {
                      cfsId: 'CFS ID Identifier',
                      date: 'Call Date',
                      dispatchedTime: 'Dispatched Time (ISO & Local)',
                      dispatchedBy: 'Dispatched By Name/Badge',
                      priority: 'Call Priority',
                      callType: 'Call Type & Category',
                      isBolo: 'Is BOLO Flag',
                      siteName: 'Facility / Site Name',
                      locationDetails: 'Specific Post Location',
                      summary: 'Incident Headline / Summary',
                      details: 'Full Narrative Details',
                      callerInfo: 'Caller Details & Phone',
                      officerInstructions: 'Officer Instructions',
                      assignedRover: 'Assigned Mobile Patrol Vehicle',
                      assignedGroup: 'Assigned Mobile Sector',
                      assignedGuard: 'Assigned Guard Profile',
                      acknowledgedAt: 'Acknowledged Timestamp',
                      ackLatencySec: 'Ack Latency (Seconds)',
                      ackChannel: 'Receipt Channel (Modal/Queue)',
                      onSceneTime: 'On-Scene Arrival Time',
                      responseTimeMin: 'Response Time (Minutes)',
                      status: 'Current Status',
                      outcomeDisposition: 'Outcome / Disposition',
                      resolutionNote: 'Resolution Notes',
                      clearedAt: 'Cleared Timestamp',
                      clearedBy: 'Cleared By Guard',
                      totalDurationMin: 'Total Cycle Duration',
                      cancellationInfo: 'Cancellation Records',
                      boloDetails: 'BOLO Subject Demographics'
                    };

                    return (
                      <label 
                        key={key} 
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked 
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200 font-semibold' 
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setExportColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{fieldLabels[key] || key}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: DISPOSITIONS SUMMARY BREAKDOWN */}
            {activeTab === 'summary' && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-500 mb-2">
                    Resolution Dispositions Breakdown
                  </h4>
                  <div className="space-y-1.5">
                    {Object.entries(stats.dispositionBreakdown).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No dispositions recorded yet in this date range.</p>
                    ) : (
                      Object.entries(stats.dispositionBreakdown).map(([disp, count]) => {
                        const numCount = Number(count);
                        const pct = stats.clearedCount > 0 ? Math.round((numCount / stats.clearedCount) * 100) : 0;
                        return (
                          <div key={disp} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{disp}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{numCount} calls</span>
                              <span className="text-[10px] text-slate-400">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase text-slate-500 mb-2">
                    SLA Compliance & Response Health
                  </h4>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Acknowledgment SLA (&le;2 min):</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{stats.slaCompliantPct}% Compliant</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${stats.slaCompliantPct}%` }} />
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Average Acknowledgment:</span>
                      <span className="font-mono font-bold">{formatLatency(stats.avgAckLatencySec)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Average On-Scene Intercept:</span>
                      <span className="font-mono font-bold">{stats.avgResponseTimeMin > 0 ? `${stats.avgResponseTimeMin} min` : 'N/A'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Average Total Call Resolution:</span>
                      <span className="font-mono font-bold">{stats.avgDurationMin > 0 ? `${stats.avgDurationMin} min` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Action Toolbar */}
        <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Ready to export <strong>{filteredCalls.length}</strong> calls covering <strong>{datePreset === 'all' ? 'All Time' : `${startDate} to ${endDate}`}</strong>.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="copy-cfs-csv-clipboard-btn"
              type="button"
              onClick={handleCopyClipboard}
              disabled={filteredCalls.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Copy CSV to clipboard for quick paste into Excel"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied CSV!' : 'Copy to Clipboard'}</span>
            </button>

            <button
              id="download-cfs-json-btn"
              type="button"
              onClick={handleDownloadJson}
              disabled={filteredCalls.length === 0 || isExporting}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Download structured JSON dataset"
            >
              <FileJson className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Export JSON</span>
            </button>

            <button
              id="download-cfs-csv-btn"
              type="button"
              onClick={handleDownloadCsv}
              disabled={filteredCalls.length === 0 || isExporting}
              className="px-4 py-1.5 rounded-lg text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Download CSV spreadsheet file compatible with Excel, Numbers, and Google Sheets"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download CSV Spreadsheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
