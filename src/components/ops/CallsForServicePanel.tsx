import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  CallForService, 
  CallPriority, 
  CallStatus, 
  CallType, 
  CallDisposition,
  BoloSubjectInfo, 
  CallerInfo,
  CallReceiptNotification
} from '../../types/shift';
import { 
  PhoneCall, 
  Radio, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  ShieldAlert, 
  MapPin, 
  User, 
  Car, 
  Eye, 
  FileText, 
  X, 
  ChevronRight, 
  Volume2, 
  Check, 
  AlertOctagon, 
  Sparkles, 
  Trash2, 
  Ban, 
  Send,
  Building2,
  Calendar,
  MessageSquare,
  HelpCircle,
  CheckCheck,
  Zap,
  ExternalLink,
  RotateCcw,
  Navigation,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { ExportCallsModal } from './ExportCallsModal';
import { 
  playReceiptConfirmedSound,
  playOnSceneAlertSound,
  playAllClearAlertSound
} from '../../utils/audioAlert';

const ROUTINE_CALL_TYPES: { type: CallType; label: string; icon: string; defaultSummary: string }[] = [
  { type: 'noise_complaint', label: 'Noise Complaint', icon: '🔊', defaultSummary: 'Loud noise/music reported after quiet hours' },
  { type: 'suspicious_vehicle', label: 'Suspicious Vehicle', icon: '🚗', defaultSummary: 'Unrecognized vehicle idling with occupants' },
  { type: 'suspicious_person', label: 'Suspicious Person', icon: '👤', defaultSummary: 'Individual loitering in restricted perimeter' },
  { type: 'escort_request', label: 'Escort Request', icon: '🚶', defaultSummary: 'Staff employee requested security escort to vehicle' },
  { type: 'trespassing', label: 'Trespassing', icon: '🚫', defaultSummary: 'Unauthorized individual observed on property' },
  { type: 'parking_violation', label: 'Parking Violation', icon: '🅿️', defaultSummary: 'Vehicle blocking emergency exit / fire lane' },
  { type: 'access_assistance', label: 'Access Assistance', icon: '🔑', defaultSummary: 'Authorized personnel lock-out / door unlock request' },
  { type: 'perimeter_alarm', label: 'Perimeter Sensor Alarm', icon: '🚨', defaultSummary: 'Zone sensor trip detected on exterior boundary' },
  { type: 'welfare_check', label: 'Welfare Check', icon: '🩺', defaultSummary: 'Request to check well-being of employee/visitor' },
  { type: 'bolo_alert', label: 'BOLO Broadcast', icon: '🎯', defaultSummary: 'Be On the Look Out alert broadcast' },
  { type: 'other', label: 'Custom / Other', icon: '📋', defaultSummary: 'General security call for service' }
];

export const CallsForServicePanel: React.FC = () => {
  const { 
    callsForService, 
    sitesList, 
    dispatchCall, 
    cancelCall, 
    deleteCall, 
    updateCallStatus,
    guardsList,
    callReceipts,
    clearAllCallReceipts,
    acknowledgeCall,
    activeGuard,
    rovers,
    roverPlans,
    activeInterceptions,
    dispatchAdHocInterception,
    showToast
  } = useShiftOps();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | CallPriority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cleared' | 'cancelled'>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | CallType>('all');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [isReceiptsLogModalOpen, setIsReceiptsLogModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Dispatch Modal / Form State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedCallType, setSelectedCallType] = useState<CallType>('noise_complaint');
  const [customTypeLabel, setCustomTypeLabel] = useState('');
  const [priority, setPriority] = useState<CallPriority>('routine');
  const [siteName, setSiteName] = useState<string>(sitesList[0]?.name || 'Apex Tower HQ');
  const [locationDetails, setLocationDetails] = useState('');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [officerInstructions, setOfficerInstructions] = useState('');
  const [isBolo, setIsBolo] = useState(false);
  const [assignedRoverSelection, setAssignedRoverSelection] = useState<string>('unassigned');

  // Reassign Modal State
  const [reassigningCallId, setReassigningCallId] = useState<string | null>(null);
  const [reassignRoverId, setReassignRoverId] = useState<string>('nearest');

  // BOLO Subject Details
  const [boloName, setBoloName] = useState('');
  const [boloGender, setBoloGender] = useState('');
  const [boloRace, setBoloRace] = useState('');
  const [boloAge, setBoloAge] = useState('');
  const [boloHeight, setBoloHeight] = useState('');
  const [boloWeight, setBoloWeight] = useState('');
  const [boloClothing, setBoloClothing] = useState('');
  const [boloVehicle, setBoloVehicle] = useState('');
  const [boloArmed, setBoloArmed] = useState(false);
  const [boloLastSeen, setBoloLastSeen] = useState('');

  // Caller Info
  const [callerName, setCallerName] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [callerLocation, setCallerLocation] = useState('');

  // Cancel Modal State
  const [callToCancel, setCallToCancel] = useState<CallForService | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Selected Call for Detail Drawer
  const [activeCallDetail, setActiveCallDetail] = useState<CallForService | null>(null);

  // Counts
  const activeCalls = useMemo(() => {
    return callsForService.filter(c => c.status !== 'cleared' && c.status !== 'cancelled');
  }, [callsForService]);

  const urgentBolos = useMemo(() => {
    return activeCalls.filter(c => c.isBolo || c.priority === 'urgent_bolo');
  }, [activeCalls]);

  const enRouteOrOnScene = useMemo(() => {
    return activeCalls.filter(c => c.status === 'en_route' || c.status === 'on_scene');
  }, [activeCalls]);

  const clearedCalls = useMemo(() => {
    return callsForService.filter(c => c.status === 'cleared');
  }, [callsForService]);

  // Filtered List
  const filteredCalls = useMemo(() => {
    return callsForService.filter(call => {
      // Status filter
      if (statusFilter === 'active') {
        if (call.status === 'cleared' || call.status === 'cancelled') return false;
      } else if (statusFilter === 'cleared') {
        if (call.status !== 'cleared') return false;
      } else if (statusFilter === 'cancelled') {
        if (call.status !== 'cancelled') return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && call.priority !== priorityFilter) return false;

      // Type filter
      if (typeFilter !== 'all' && call.callType !== typeFilter) return false;

      // Site filter
      if (selectedSiteFilter !== 'all' && call.siteName !== selectedSiteFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = call.id.toLowerCase().includes(q);
        const matchSite = call.siteName.toLowerCase().includes(q);
        const matchLoc = call.locationDetails.toLowerCase().includes(q);
        const matchSum = call.summary.toLowerCase().includes(q);
        const matchDet = (call.details || '').toLowerCase().includes(q);
        const matchOfficer = (call.acknowledgedByGuard?.guardName || '').toLowerCase().includes(q);
        const matchCleared = (call.clearedByGuard?.guardName || '').toLowerCase().includes(q);
        const matchBolo = call.boloSubject ? (
          (call.boloSubject.name || '').toLowerCase().includes(q) ||
          (call.boloSubject.vehicleInfo || '').toLowerCase().includes(q) ||
          (call.boloSubject.clothingDescription || '').toLowerCase().includes(q)
        ) : false;

        return matchId || matchSite || matchLoc || matchSum || matchDet || matchOfficer || matchCleared || matchBolo;
      }

      return true;
    });
  }, [callsForService, statusFilter, priorityFilter, typeFilter, selectedSiteFilter, searchQuery]);

  const handleOpenDispatchModal = (presetType?: CallType) => {
    const targetType = presetType || 'noise_complaint';
    setSelectedCallType(targetType);
    const preset = ROUTINE_CALL_TYPES.find(p => p.type === targetType);
    setSummary(preset?.defaultSummary || '');
    setIsBolo(targetType === 'bolo_alert');
    setPriority(targetType === 'bolo_alert' ? 'urgent_bolo' : 'routine');
    setLocationDetails('');
    setDetails('');
    setOfficerInstructions('');
    setCustomTypeLabel('');
    setBoloName('');
    setBoloGender('');
    setBoloRace('');
    setBoloAge('');
    setBoloHeight('');
    setBoloWeight('');
    setBoloClothing('');
    setBoloVehicle('');
    setBoloArmed(false);
    setBoloLastSeen('');
    setCallerName('');
    setCallerPhone('');
    setCallerLocation('');
    setAssignedRoverSelection('unassigned');
    setIsDispatchModalOpen(true);
  };

  const handleSelectCallTypePreset = (t: CallType) => {
    setSelectedCallType(t);
    const preset = ROUTINE_CALL_TYPES.find(p => p.type === t);
    if (preset) {
      setSummary(preset.defaultSummary);
    }
    if (t === 'bolo_alert') {
      setIsBolo(true);
      setPriority('urgent_bolo');
    } else {
      setIsBolo(false);
      if (priority === 'urgent_bolo') setPriority('routine');
    }
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !siteName.trim() || !locationDetails.trim()) {
      return;
    }

    let boloSubject: BoloSubjectInfo | undefined = undefined;
    if (isBolo) {
      boloSubject = {
        name: boloName.trim() || undefined,
        gender: boloGender.trim() || undefined,
        race: boloRace.trim() || undefined,
        approxAge: boloAge.trim() || undefined,
        height: boloHeight.trim() || undefined,
        weight: boloWeight.trim() || undefined,
        clothingDescription: boloClothing.trim() || undefined,
        vehicleInfo: boloVehicle.trim() || undefined,
        armedAndDangerous: boloArmed,
        lastKnownDirection: boloLastSeen.trim() || undefined
      };
    }

    let callerInfo: CallerInfo | undefined = undefined;
    if (callerName.trim() || callerPhone.trim() || callerLocation.trim()) {
      callerInfo = {
        name: callerName.trim() || 'Anonymous Caller',
        phone: callerPhone.trim() || undefined,
        unitOrLocation: callerLocation.trim() || undefined
      };
    }

    dispatchCall({
      callType: selectedCallType,
      customTypeLabel: customTypeLabel.trim() || undefined,
      priority,
      siteName,
      locationDetails,
      summary,
      details: details.trim() || undefined,
      isBolo,
      boloSubject,
      callerInfo,
      officerInstructions: officerInstructions.trim() || undefined,
      assignedRoverId: assignedRoverSelection !== 'unassigned' ? assignedRoverSelection : undefined
    });

    setIsDispatchModalOpen(false);
  };

  const handleExecuteReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningCallId) return;

    const targetCall = callsForService.find(c => c.id === reassigningCallId);
    if (!targetCall) {
      setReassigningCallId(null);
      return;
    }

    let chosenRover = rovers.find(r => r.id === reassignRoverId);
    if (reassignRoverId === 'nearest' || !chosenRover) {
      chosenRover = rovers.find(r => r.status === 'patrolling' || r.status === 'dwelling') || rovers[0];
    }

    if (chosenRover) {
      dispatchAdHocInterception(targetCall.id, targetCall.locationDetails, chosenRover.id);
      showToast?.(
        'Mobile Unit Assigned & Intercept Pushed',
        `Call ${targetCall.id} assigned to ${chosenRover.unitNumber} (${chosenRover.assignedGuardName || 'Officer'}). Route order updated!`,
        'success'
      );
    }
    setReassigningCallId(null);
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callToCancel || !cancelReason.trim()) return;
    cancelCall(callToCancel.id, cancelReason);
    setCallToCancel(null);
    setCancelReason('');
  };

  return (
    <div id="calls-for-service-panel" className="space-y-4">
      {/* Header Stat Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 dark:text-slate-400">Active Queue</p>
            <p className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{activeCalls.length}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <PhoneCall className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 dark:text-slate-400">Urgent / BOLOs</p>
            <p className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{urgentBolos.length}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 dark:text-slate-400">Units Responding</p>
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{enRouteOrOnScene.length}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Radio className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 dark:text-slate-400">Cleared & Logged</p>
            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{clearedCalls.length}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Action Bar & Quick Presets Strip */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Calls for Service & BOLOs Dispatch
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Log routine calls, issue post-specific tasks, and broadcast BOLO subject alerts to guard terminals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="open-export-calls-btn"
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Export all call records with custom date range, dispatch times, acknowledgment latency, response times, and outcome dispositions"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Export Calls</span>
              <span className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                {callsForService.length}
              </span>
            </button>

            <button
              id="open-receipts-log-btn"
              type="button"
              onClick={() => setIsReceiptsLogModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="View all guard acknowledgment timestamps and latency audit trail"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Receipts Log</span>
              {callReceipts.length > 0 && (
                <span className="bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {callReceipts.length}
                </span>
              )}
            </button>

            <button
              id="open-bolo-dispatch-btn"
              type="button"
              onClick={() => handleOpenDispatchModal('bolo_alert')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>+ Broadcast BOLO</span>
            </button>

            <button
              id="open-cfs-dispatch-btn"
              type="button"
              onClick={() => handleOpenDispatchModal('noise_complaint')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Dispatch Routine Call</span>
            </button>
          </div>
        </div>

        {/* Quick Routine Dispatch Presets Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0 mr-1">
            Quick Log:
          </span>
          {ROUTINE_CALL_TYPES.map(preset => (
            <button
              key={preset.type}
              type="button"
              onClick={() => handleOpenDispatchModal(preset.type)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              title={`Quick dispatch ${preset.label}`}
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search CFS ID, location, subject, notes, guard name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                statusFilter === 'active' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Active ({activeCalls.length})
            </button>
            <button
              onClick={() => setStatusFilter('cleared')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                statusFilter === 'cleared' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cleared ({clearedCalls.length})
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                statusFilter === 'cancelled' 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cancelled
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                statusFilter === 'all' 
                  ? 'bg-slate-700 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Priorities</option>
            <option value="routine">Routine</option>
            <option value="priority">Priority</option>
            <option value="urgent_bolo">Urgent BOLO</option>
          </select>

          {/* Facility / Site Filter */}
          <select
            value={selectedSiteFilter}
            onChange={(e) => setSelectedSiteFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 dark:text-slate-200 max-w-[150px] truncate"
          >
            <option value="all">All Facilities</option>
            {sitesList.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calls List */}
      {filteredCalls.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <PhoneCall className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No calls found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {statusFilter === 'active' 
              ? 'There are no active or pending calls for service at this time. All posts are nominal.' 
              : 'No call records matched the selected filters and search query.'}
          </p>
          <button
            onClick={() => handleOpenDispatchModal()}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Dispatch New Call</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCalls.map(call => {
            const isBoloCall = call.isBolo || call.priority === 'urgent_bolo';
            const isCleared = call.status === 'cleared';
            const isCancelled = call.status === 'cancelled';
            const isResponding = call.status === 'en_route' || call.status === 'on_scene';

            return (
              <div
                key={call.id}
                id={`call-card-${call.id}`}
                className={`bg-white dark:bg-slate-900 rounded-xl border shadow-xs transition-all overflow-hidden ${
                  isBoloCall && !isCleared && !isCancelled
                    ? 'border-rose-400/80 dark:border-rose-800 ring-1 ring-rose-400/30'
                    : call.priority === 'priority' && !isCleared && !isCancelled
                    ? 'border-amber-400/80 dark:border-amber-800 ring-1 ring-amber-400/30'
                    : isCleared
                    ? 'border-slate-200 dark:border-slate-800/80 opacity-90'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
                }`}
              >
                {/* Top strip */}
                <div className={`px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 border-b text-xs ${
                  isBoloCall && !isCleared && !isCancelled
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                    : call.priority === 'priority' && !isCleared && !isCancelled
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                    : isCleared
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* CFS ID */}
                    <span className="font-black font-mono tracking-tight text-slate-900 dark:text-white">
                      {call.id}
                    </span>

                    {/* Priority Badge */}
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      call.priority === 'urgent_bolo'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : call.priority === 'priority'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {call.priority === 'urgent_bolo' ? '🚨 URGENT' : call.priority.toUpperCase()}
                    </span>

                    {/* Call Type Label */}
                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {call.customTypeLabel || call.callType.replace(/_/g, ' ').toUpperCase()}
                    </span>

                    {/* Status Badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                      call.status === 'dispatched'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 ring-1 ring-blue-400/40'
                        : call.status === 'en_route'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ring-1 ring-amber-400/40 animate-pulse'
                        : call.status === 'on_scene'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 ring-1 ring-purple-400/40'
                        : call.status === 'cleared'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-400/40'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {call.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3.5 space-y-3">
                  {/* Facility & Location Info */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>{call.siteName}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">{call.locationDetails}</span>
                      </div>
                      <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                        {call.summary}
                      </p>
                    </div>

                    {/* Officer Status Badge if responding */}
                    {call.acknowledgedByGuard && (
                      <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg text-right">
                        <p className="text-[9px] uppercase font-bold text-blue-600 dark:text-blue-400">Assigned Officer</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {call.acknowledgedByGuard.guardName} ({call.acknowledgedByGuard.badgeNumber})
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Detail text */}
                  {call.details && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 whitespace-pre-line">
                      {call.details}
                    </div>
                  )}

                  {/* BOLO Subject Details Grid if applicable */}
                  {call.isBolo && call.boloSubject && (
                    <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          BOLO Subject Profile
                        </p>
                        {call.boloSubject.armedAndDangerous && (
                          <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-bounce">
                            ⚠️ ARMED & DANGEROUS
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                        {call.boloSubject.name && (
                          <div className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-md border border-rose-100 dark:border-rose-900/40">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Subject:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{call.boloSubject.name}</span>
                          </div>
                        )}
                        {(call.boloSubject.gender || call.boloSubject.race || call.boloSubject.approxAge) && (
                          <div className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-md border border-rose-100 dark:border-rose-900/40">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Demographics:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {[call.boloSubject.gender, call.boloSubject.race, call.boloSubject.approxAge ? `~${call.boloSubject.approxAge}yo` : ''].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                        {(call.boloSubject.height || call.boloSubject.weight) && (
                          <div className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-md border border-rose-100 dark:border-rose-900/40">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Build:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {[call.boloSubject.height, call.boloSubject.weight].filter(Boolean).join(' / ')}
                            </span>
                          </div>
                        )}
                        {call.boloSubject.vehicleInfo && (
                          <div className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-md border border-rose-100 dark:border-rose-900/40">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Vehicle:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Car className="w-3 h-3 text-rose-500" />
                              {call.boloSubject.vehicleInfo}
                            </span>
                          </div>
                        )}
                        {call.boloSubject.clothingDescription && (
                          <div className="col-span-2 sm:col-span-3 bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-md border border-rose-100 dark:border-rose-900/40">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Clothing / Markings:</span>
                            <span className="text-slate-800 dark:text-slate-200">{call.boloSubject.clothingDescription}</span>
                          </div>
                        )}
                        {call.boloSubject.lastKnownDirection && (
                          <div className="col-span-2 sm:col-span-1 bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-md border border-rose-100 dark:border-rose-900/40">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Last Direction:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{call.boloSubject.lastKnownDirection}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ROVER FLEET ASSIGNMENT & INTERCEPT STATUS BOX */}
                  {call.assignedRoverUnit || call.assignedRoverId ? (() => {
                    const matchedRover = rovers.find(r => r.id === call.assignedRoverId || r.callSign === call.assignedRoverUnit);
                    const roverStatus = matchedRover?.status || 'intercepting';
                    
                    return (
                      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/80 to-slate-900 border border-cyan-500/50 rounded-xl p-3 text-white space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-cyan-600/30 text-cyan-400 rounded-lg border border-cyan-400/40 shrink-0">
                              <Car className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                                  Dispatched Mobile Unit:
                                </span>
                                <span className="bg-cyan-500 text-slate-950 text-[11px] font-mono font-black px-2 py-0.5 rounded-full shadow-xs">
                                  {call.assignedRoverUnit || matchedRover?.callSign || 'MOBILE UNIT'}
                                </span>
                                {call.assignedRovingGroup && (
                                  <span className="bg-cyan-950 text-cyan-200 border border-cyan-700/80 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    {call.assignedRovingGroup}
                                  </span>
                                )}

                                {/* Visual Mobile Unit Assignment & Status Indicator */}
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                                  roverStatus === 'intercepting' || call.status === 'dispatched'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 animate-pulse'
                                    : call.status === 'en_route'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                                    : roverStatus === 'dwelling' || call.status === 'on_scene'
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/60'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    roverStatus === 'intercepting' ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'
                                  }`} />
                                  <span>
                                    {roverStatus === 'intercepting' 
                                      ? '🚨 CFS Priority Intercept' 
                                      : call.status === 'en_route'
                                      ? '🚙 En Route to Incident'
                                      : roverStatus === 'dwelling'
                                      ? '🏢 On Scene Dwelling'
                                      : '📡 Active Patrol'}
                                  </span>
                                </span>
                              </div>
                              
                              <p className="text-xs font-bold text-slate-100 mt-1 flex items-center gap-1.5">
                                <User className="w-3 h-3 text-cyan-400" />
                                <span>Responding Officer: <strong>{call.assignedGuardName || matchedRover?.assignedGuardName || 'Mobile Patrol Officer'}</strong> {call.assignedGuardBadge || matchedRover?.assignedGuardBadge ? `(${call.assignedGuardBadge || matchedRover?.assignedGuardBadge})` : ''}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="bg-rose-950 text-rose-200 border border-rose-500/80 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
                              ⚡ Stop #1 in Route Queue
                            </span>
                            {!isCleared && !isCancelled && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReassigningCallId(call.id);
                                  setReassignRoverId(call.assignedRoverId || 'nearest');
                                }}
                                className="px-2 py-1 bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 text-[10px] font-bold rounded-lg border border-cyan-600/60 cursor-pointer transition-colors"
                              >
                                Reassign
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Live Mobile Telemetry Grid */}
                        {matchedRover && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono bg-slate-950/80 p-2 rounded-lg border border-cyan-900/60">
                            <div>
                              <span className="text-slate-400 block">Current Location:</span>
                              <span className="font-bold text-cyan-200 truncate block">
                                {matchedRover.currentSiteName || 'Downtown Sector'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Speed / Telemetry:</span>
                              <span className="font-bold text-white">
                                {matchedRover.currentCoords?.speedKmh ? Math.round(matchedRover.currentCoords.speedKmh * 0.621371) : 18} MPH • Heading {matchedRover.currentCoords?.heading || 'NW'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Fleet Power:</span>
                              <span className="font-bold text-emerald-400">
                                🔋 {matchedRover.batteryLevelPct || matchedRover.fuelLevelPct || 88}% Level
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Route Sector:</span>
                              <span className="font-bold text-cyan-300">
                                {matchedRover.rovingGroup}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="p-2 bg-slate-950/70 rounded-lg border border-cyan-900/60 text-[11px] text-cyan-200/90 font-mono flex items-center gap-2">
                          <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>Dynamic Reroute Active: Priority stop injected at index #0 of {call.assignedRoverUnit || matchedRover?.callSign}&apos;s live route sequence.</span>
                        </div>
                      </div>
                    );
                  })() : !isCleared && !isCancelled ? (
                    <div className="bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-300 dark:border-slate-700/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Car className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Static Post Call • No Mobile Unit Assigned</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReassigningCallId(call.id);
                          setReassignRoverId('nearest');
                        }}
                        className="px-2.5 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Zap className="w-3 h-3 text-slate-950" />
                        <span>Dispatch to MPU</span>
                      </button>
                    </div>
                  ) : null}

                  {/* Guard Acknowledgment Receipt Status Box */}
                  {call.acknowledgedByGuard ? (
                    <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0">
                          <CheckCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-200 tracking-wide">
                              {call.isBolo ? '🎯 BOLO Read & Confirmed' : '✓ Guard Acknowledged Receipt'}
                            </span>
                            {call.timeToAcknowledgeSec !== undefined && (
                              <span className="bg-emerald-200 dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-500" />
                                {call.timeToAcknowledgeSec}s latency
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium mt-0.5">
                            Officer <strong>{call.acknowledgedByGuard.guardName}</strong> ({call.acknowledgedByGuard.badgeNumber}) confirmed receipt
                            {call.acknowledgedByGuard.receiptChannel === 'alert_modal' ? ' via Terminal Alert Popup' : ' via Active Queue'}
                          </p>
                          {call.acknowledgedByGuard.notes && (
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 italic mt-1 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                              &ldquo;{call.acknowledgedByGuard.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-emerald-800 dark:text-emerald-300 font-mono shrink-0">
                        <div className="flex items-center sm:justify-end gap-1 font-bold text-xs text-emerald-900 dark:text-emerald-200">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{new Date(call.acknowledgedByGuard.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {new Date(call.acknowledgedByGuard.acknowledgedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ) : !isCleared && !isCancelled && call.status === 'dispatched' ? (
                    <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-800 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                        <span className="font-bold">⏱ Awaiting Guard Acknowledgment</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-[11px] font-mono text-slate-500">Pushed to post terminals</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => acknowledgeCall(call.id, guardsList[0] || activeGuard, { channel: 'queue_action' })}
                        className="text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/80 cursor-pointer bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 transition-colors"
                        title="Simulate guard receipt acknowledgment"
                      >
                        Simulate Guard ACK
                      </button>
                    </div>
                  ) : null}

                  {/* Safety / Officer Instructions */}
                  {call.officerInstructions && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-2.5 rounded-lg flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold">Dispatcher Safety Note: </strong>
                        <span>{call.officerInstructions}</span>
                      </div>
                    </div>
                  )}

                  {/* Cleared / Disposition Record Box if resolved */}
                  {isCleared && call.clearedByGuard && (
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-200">
                            Disposition: [{call.disposition || 'Resolved'}]
                          </span>
                        </div>
                        {call.resolutionNote && (
                          <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 font-sans">
                            &ldquo;{call.resolutionNote}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="text-right text-[11px] text-emerald-700 dark:text-emerald-300 font-mono shrink-0">
                        <span>Cleared by: <strong>{call.clearedByGuard.guardName}</strong> ({call.clearedByGuard.badgeNumber})</span>
                        <span className="block text-[10px] text-slate-500">
                          {call.clearedAt ? new Date(call.clearedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cancelled Box if cancelled */}
                  {isCancelled && (
                    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-rose-600 dark:text-rose-400 uppercase">Cancelled: </span>
                        <span>{call.cancellationReason || 'Call cancelled by dispatcher'}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {call.cancelledAt ? new Date(call.cancelledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  )}

                  {/* Footer Action Bar for Dispatcher */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="text-[11px] text-slate-400 font-mono">
                      Dispatched by {call.dispatchedBy.name} ({call.dispatchedBy.badge})
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isCleared && !isCancelled && (
                        <>
                          {call.status === 'dispatched' && (
                            <button
                              onClick={() => updateCallStatus(call.id, 'en_route', 'Dispatcher updated status')}
                              className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 rounded-md font-bold text-[11px] border border-amber-300/60 transition-colors cursor-pointer"
                            >
                              Set En Route
                            </button>
                          )}
                          {call.status === 'en_route' && (
                            <button
                              onClick={() => updateCallStatus(call.id, 'on_scene', 'Officer arrived on scene')}
                              className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 rounded-md font-bold text-[11px] border border-purple-300/60 transition-colors cursor-pointer"
                            >
                              Set On Scene
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setCallToCancel(call);
                              setCancelReason('');
                            }}
                            className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            Cancel Call
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => deleteCall(call.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        title="Delete call log record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DISPATCH NEW CALL / BOLO MODAL */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  {isBolo ? (
                    <>
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                      Broadcast BOLO Subject Alert
                    </>
                  ) : (
                    <>
                      <PhoneCall className="w-5 h-5 text-blue-600" />
                      Dispatch Call for Service (CFS)
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sends live alert notification & task card to guard terminals at assigned facility.
                </p>
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
              {/* Call Type Presets Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Call Category / Routine Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {ROUTINE_CALL_TYPES.map(preset => (
                    <button
                      key={preset.type}
                      type="button"
                      onClick={() => handleSelectCallTypePreset(preset.type)}
                      className={`p-2 rounded-lg border text-left font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                        selectedCallType === preset.type
                          ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/40 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm">{preset.icon}</span>
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedCallType === 'other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Call Type Label
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP Arrival, Package Courier Escort"
                    value={customTypeLabel}
                    onChange={(e) => setCustomTypeLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              {/* Priority & BOLO Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dispatch Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as CallPriority)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-slate-100"
                  >
                    <option value="routine">Routine (Standard Queue)</option>
                    <option value="priority">Priority (Urgent Response)</option>
                    <option value="urgent_bolo">Urgent (Critical Audio Siren & Pop-up)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isBolo}
                      onChange={(e) => {
                        setIsBolo(e.target.checked);
                        if (e.target.checked && priority === 'routine') {
                          setPriority('urgent_bolo');
                        }
                      }}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Enable BOLO Subject Descriptors
                    </span>
                  </label>
                </div>
              </div>

              {/* Target Facility & Exact Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Facility / Post <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-slate-100"
                  >
                    {sitesList.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.category.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Exact Location / Post Area <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. North Parking Level 2, West Gate, Lobby Desk"
                    value={locationDetails}
                    onChange={(e) => setLocationDetails(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Call Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Call Summary Header <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silver sedan idling with loud music in visitor lot"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>

              {/* BOLO Subject Details Form (Accordion / Box) */}
              {isBolo && (
                <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      BOLO Subject Descriptors
                    </p>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-rose-700 dark:text-rose-300">
                      <input
                        type="checkbox"
                        checked={boloArmed}
                        onChange={(e) => setBoloArmed(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500"
                      />
                      Armed & Dangerous Caution
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Subject Name / Alias
                      </label>
                      <input
                        type="text"
                        placeholder="Unknown / 'John'"
                        value={boloName}
                        onChange={(e) => setBoloName(e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Gender / Sex
                      </label>
                      <input
                        type="text"
                        placeholder="Male / Female"
                        value={boloGender}
                        onChange={(e) => setBoloGender(e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Race / Ethnicity
                      </label>
                      <input
                        type="text"
                        placeholder="White, Black, Hispanic..."
                        value={boloRace}
                        onChange={(e) => setBoloRace(e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Approx. Age
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 25-30"
                        value={boloAge}
                        onChange={(e) => setBoloAge(e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Height & Weight / Build
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 5'10, 180 lbs, athletic"
                        value={boloHeight}
                        onChange={(e) => setBoloHeight(e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Vehicle (Make/Model/Color/Plate)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Black Honda Civic WA#7ABC123"
                        value={boloVehicle}
                        onChange={(e) => setBoloVehicle(e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Last Seen Direction
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Fled East toward 4th Ave"
                        value={boloLastSeen}
                        onChange={(e) => setBoloLastSeen(e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                      Clothing & Distinguishing Features (Tattoos, Scars, Hat)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dark hoodie with neon logo, baseball cap, dragon tattoo on right forearm"
                      value={boloClothing}
                      onChange={(e) => setBoloClothing(e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                    />
                  </div>
                </div>
              )}

              {/* Mobile Patrol Unit Assignment & Dynamic Interception Selector */}
              <div className="p-3.5 bg-gradient-to-r from-slate-900 to-cyan-950/90 rounded-xl border border-cyan-500/40 text-white space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-cyan-400" />
                    <span>Assign to Mobile Patrol Unit (Dynamic Intercept)</span>
                  </label>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-700/60">
                    Live Route Queue Sync
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-300 uppercase font-bold mb-1">
                      Target Mobile Unit / Sector
                    </label>
                    <select
                      value={assignedRoverSelection}
                      onChange={(e) => setAssignedRoverSelection(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-cyan-500/50 rounded-lg text-white font-semibold text-xs focus:ring-1 focus:ring-cyan-400 focus:outline-hidden"
                    >
                      <option value="unassigned">Broadcast to Static Facility Post (No Mobile Unit Assigned)</option>
                      <option value="nearest">⚡ Nearest Available Mobile Unit (Auto-Calculate Distance & Traffic)</option>
                      {rovers.map(rover => (
                        <option key={rover.id} value={rover.id}>
                          {rover.unitNumber} ({rover.rovingGroup}) • {rover.assignedGuardName || 'Unassigned'} [{rover.status.toUpperCase()}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800 flex flex-col justify-center text-[11px] text-slate-300">
                    {assignedRoverSelection === 'unassigned' ? (
                      <span className="text-slate-400">
                        Will appear on general post terminals and static guard queues.
                      </span>
                    ) : (
                      <span className="text-cyan-300 font-mono">
                        ⚡ <strong>Dynamic Intercept:</strong> Immediately injects as #1 priority stop on the mobile unit's route and alerts the on-duty guard.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Narrative & Caller Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Detailed Notes / Call Narrative
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide additional background, suspect behavior, or access codes..."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Officer Safety / Tactical Instructions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Do not approach alone; verify badge credentials before unlocking..."
                    value={officerInstructions}
                    onChange={(e) => setOfficerInstructions(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Reporting Party Info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                  Reporting Party / Caller Info (Optional)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Caller Name (e.g. Jane Doe - Tenant)"
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Phone (e.g. 555-0144)"
                    value={callerPhone}
                    onChange={(e) => setCallerPhone(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Unit / Suite # (e.g. Ste 402)"
                    value={callerLocation}
                    onChange={(e) => setCallerLocation(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-lg text-xs font-black text-white flex items-center gap-1.5 shadow-md cursor-pointer ${
                    isBolo 
                      ? 'bg-rose-600 hover:bg-rose-500' 
                      : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isBolo ? 'BROADCAST BOLO TO UNITS' : 'DISPATCH CALL TO POST'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL REASON MODAL */}
      {callToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                Cancel Call {callToCancel.id}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Provide a mandatory reason for cancelling this call. This will be logged in the audit ledger.
              </p>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="Reason for cancellation (e.g. False alarm confirmed by property manager, duplicate dispatch)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCallToCancel(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                >
                  Confirm Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REASSIGN ROVER MODAL */}
      {reassigningCallId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/40 rounded-xl">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Dispatch / Reassign to Mobile Unit
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select a mobile patrol unit. The call will be immediately injected into the mobile unit&apos;s active circuit route queue.
                </p>
              </div>
            </div>

            <form onSubmit={handleExecuteReassign} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Target Mobile Patrol Unit
                </label>
                <select
                  value={reassignRoverId}
                  onChange={(e) => setReassignRoverId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="nearest">⚡ Auto-Calculate Nearest Available Mobile Unit</option>
                  {rovers.map(rover => (
                    <option key={rover.id} value={rover.id}>
                      {rover.unitNumber} ({rover.rovingGroup}) — Officer {rover.assignedGuardName || 'Unassigned'} [{rover.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-xl text-xs text-cyan-900 dark:text-cyan-200 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Dynamic Interception & Route Re-Calculation:
                </p>
                <p className="text-[11px] text-cyan-800 dark:text-cyan-300">
                  The target mobile unit&apos;s turn-by-turn itinerary will instantly reprioritize this emergency stop. The assigned guard will receive a real-time priority notification.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReassigningCallId(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute Intercept Dispatch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPTS AUDIT LOG MODAL */}
      {isReceiptsLogModalOpen && (
        <div 
          id="receipts-audit-log-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Guard Activity & Receipts Log
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time confirmation records verifying acknowledgments, on-scene arrivals, and call clearances.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => playReceiptConfirmedSound()}
                  className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  title="Test ACK chime"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">ACK Sound</span>
                </button>

                <button
                  type="button"
                  onClick={() => playOnSceneAlertSound()}
                  className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  title="Test On Scene chime"
                >
                  <Volume2 className="w-3.5 h-3.5 text-purple-600" />
                  <span className="hidden sm:inline">On Scene</span>
                </button>

                <button
                  type="button"
                  onClick={() => playAllClearAlertSound()}
                  className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  title="Test All Clear chime"
                >
                  <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                  <span className="hidden sm:inline">All Clear</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsReceiptsLogModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {callReceipts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <CheckCheck className="w-12 h-12 mx-auto mb-2 opacity-30 text-emerald-500" />
                  <p className="text-sm font-bold">No Activity Receipts Logged Yet</p>
                  <p className="text-xs mt-1">When guards acknowledge, arrive on scene, or clear calls, real-time activity stamps are logged here.</p>
                </div>
              ) : (
                callReceipts.map(receipt => {
                  const evType = receipt.eventType || 'acknowledged';
                  return (
                    <div
                      key={receipt.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl text-white shrink-0 mt-0.5 ${
                          evType === 'on_scene' ? 'bg-purple-600' :
                          evType === 'cleared' ? 'bg-teal-600' :
                          receipt.isBolo ? 'bg-rose-600' : 'bg-emerald-600'
                        }`}>
                          {evType === 'on_scene' ? <MapPin className="w-4 h-4" /> :
                           evType === 'cleared' ? <CheckCircle2 className="w-4 h-4" /> :
                           receipt.isBolo ? <ShieldAlert className="w-4 h-4" /> : <CheckCheck className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                              {receipt.callId}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              evType === 'on_scene' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                              evType === 'cleared' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' :
                              receipt.isBolo ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                              {evType === 'on_scene' ? '📍 ON SCENE' :
                               evType === 'cleared' ? `✅ ALL CLEAR [${receipt.disposition || 'RESOLVED'}]` :
                               receipt.isBolo ? '🚨 BOLO Broadcast' : receipt.callType.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            {evType === 'acknowledged' && receipt.latencySeconds !== undefined && (
                              <span className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-500" />
                                {receipt.latencySeconds}s latency
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                            {receipt.callSummary}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                            <span>
                              Officer: <strong className="text-slate-800 dark:text-slate-200">{receipt.guardName}</strong> ({receipt.guardBadge})
                            </span>
                            <span>•</span>
                            <span>{receipt.siteName}</span>
                            {(receipt.assignedRoverUnit || receipt.assignedRovingGroup) && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-300 dark:border-cyan-800">
                                  <Car className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                                  <span>{receipt.assignedRoverUnit || 'MOBILE UNIT'}</span>
                                  {receipt.assignedRovingGroup && (
                                    <span className="opacity-75 font-sans">({receipt.assignedRovingGroup})</span>
                                  )}
                                </span>
                              </>
                            )}
                            {evType === 'acknowledged' && (
                              <>
                                <span>•</span>
                                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                  {receipt.receiptChannel === 'alert_modal' ? 'Terminal Alert Popup' : 'Active Queue Action'}
                                </span>
                              </>
                            )}
                          </div>

                          {(receipt.resolutionNote || receipt.notes) && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-1.5 bg-white/70 dark:bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                              &ldquo;{receipt.resolutionNote || receipt.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-xs text-slate-500 dark:text-slate-400 font-mono shrink-0 sm:self-center">
                        <div className="flex items-center sm:justify-end gap-1 font-bold text-slate-900 dark:text-slate-200">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{new Date(receipt.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {new Date(receipt.acknowledgedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500 font-mono">
                Total Receipts: {callReceipts.length}
              </span>

              <div className="flex items-center gap-2">
                {callReceipts.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllCallReceipts}
                    className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    Clear Receipts Log
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsReceiptsLogModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Calls for Service Modal */}
      <ExportCallsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        calls={callsForService}
        sitesList={sitesList}
        onNotify={showToast}
      />
    </div>
  );
};
