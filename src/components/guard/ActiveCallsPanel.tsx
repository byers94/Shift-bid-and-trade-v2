import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  CallForService, 
  CallDisposition, 
  CallPriority, 
  CallStatus 
} from '../../types/shift';
import { 
  PhoneCall, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Building2, 
  Car, 
  Eye, 
  Navigation, 
  ShieldAlert, 
  Check, 
  X, 
  FileText, 
  Radio, 
  MessageSquare,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';

const DISPOSITIONS: { value: CallDisposition; label: string; icon: string; description: string; badgeColor: string }[] = [
  { 
    value: 'Resolved', 
    label: 'Resolved', 
    icon: '✅', 
    description: 'Standard resolution, situation handled safely on scene',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' 
  },
  { 
    value: 'Unfounded', 
    label: 'Unfounded', 
    icon: '🔍', 
    description: 'Area checked thoroughly, no suspicious activity / false alarm',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300' 
  },
  { 
    value: 'Escalated', 
    label: 'Escalated', 
    icon: '🚨', 
    description: 'Escalated to Police / Emergency / Property Management',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300' 
  },
  { 
    value: 'Assistance Rendered', 
    label: 'Assistance Rendered', 
    icon: '🤝', 
    description: 'Security escort / access unlock / guest assistance completed',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300' 
  },
  { 
    value: 'Gone on Arrival (GOA)', 
    label: 'Gone on Arrival (GOA)', 
    icon: '💨', 
    description: 'Individual or vehicle departed before officer arrival',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300' 
  },
  { 
    value: 'Warning Issued', 
    label: 'Warning Issued', 
    icon: '⚠️', 
    description: 'Verbal or written warning issued to violator',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300' 
  },
  { 
    value: 'Referred to Emergency Services', 
    label: 'Referred to Emergency Services', 
    icon: '🚑', 
    description: 'Local 911 / Police / Fire / EMS contacted for response',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300' 
  },
  { 
    value: 'Report Filed', 
    label: 'Report Filed', 
    icon: '📝', 
    description: 'Full formal incident report completed & filed',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300' 
  }
];

export const ActiveCallsPanel: React.FC = () => {
  const { 
    callsForService, 
    activeGuard, 
    acknowledgeCall, 
    markCallOnScene,
    updateCallStatus, 
    clearCall 
  } = useShiftOps();

  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Clear Call Modal State
  const [clearingCall, setClearingCall] = useState<CallForService | null>(null);
  const [selectedDisposition, setSelectedDisposition] = useState<CallDisposition>('Resolved');
  const [resolutionNote, setResolutionNote] = useState('');

  // Filter Active Calls
  const activeCalls = useMemo(() => {
    return callsForService.filter(c => c.status !== 'cleared' && c.status !== 'cancelled');
  }, [callsForService]);

  // Cleared Calls History
  const clearedCalls = useMemo(() => {
    return callsForService.filter(c => c.status === 'cleared');
  }, [callsForService]);

  // Current Display List
  const displayedCalls = useMemo(() => {
    const list = activeTab === 'queue' ? activeCalls : clearedCalls;
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(call => {
      const matchId = call.id.toLowerCase().includes(q);
      const matchSite = call.siteName.toLowerCase().includes(q);
      const matchLoc = call.locationDetails.toLowerCase().includes(q);
      const matchSum = call.summary.toLowerCase().includes(q);
      const matchDet = (call.details || '').toLowerCase().includes(q);
      const matchBolo = call.boloSubject ? (
        (call.boloSubject.name || '').toLowerCase().includes(q) ||
        (call.boloSubject.vehicleInfo || '').toLowerCase().includes(q)
      ) : false;

      return matchId || matchSite || matchLoc || matchSum || matchDet || matchBolo;
    });
  }, [activeTab, activeCalls, clearedCalls, searchQuery]);

  const handleOpenClearModal = (call: CallForService) => {
    setClearingCall(call);
    setSelectedDisposition('Resolved');
    setResolutionNote('');
  };

  const handleConfirmClear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearingCall) return;

    clearCall(
      clearingCall.id, 
      activeGuard, 
      selectedDisposition, 
      resolutionNote.trim() || undefined
    );

    setClearingCall(null);
    setResolutionNote('');
  };

  return (
    <div id="guard-active-calls-panel" className="space-y-4">
      {/* Top Banner & Status Tracker */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Calls for Service & BOLOs
              </h2>
              {activeCalls.length > 0 && (
                <span className="bg-blue-600 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
                  {activeCalls.length} Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Receive routine facility dispatches, acknowledge assignments, and submit clear dispositions.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <button
            id="guard-calls-tab-queue"
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Active Queue</span>
            <span className="bg-blue-900/60 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
              {activeCalls.length}
            </span>
          </button>

          <button
            id="guard-calls-tab-history"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Resolved History</span>
            <span className="bg-emerald-900/60 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
              {clearedCalls.length}
            </span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search active calls, location, BOLO subject details, or notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 shadow-xs focus:ring-1 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* List of Calls */}
      {displayedCalls.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {activeTab === 'queue' ? 'Active Calls Queue is Clear' : 'No Resolved Calls in History'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {activeTab === 'queue'
              ? 'No pending calls for service or active BOLOs currently assigned to your post.'
              : 'Cleared calls with dispositions and notes will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedCalls.map(call => {
            const isBolo = call.isBolo || call.priority === 'urgent_bolo';
            const isCleared = call.status === 'cleared';
            const isEnRoute = call.status === 'en_route';
            const isOnScene = call.status === 'on_scene';

            return (
              <div
                key={call.id}
                id={`guard-call-item-${call.id}`}
                className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-xs transition-all overflow-hidden ${
                  isBolo && !isCleared
                    ? 'border-rose-400 dark:border-rose-800 ring-2 ring-rose-400/20'
                    : call.priority === 'priority' && !isCleared
                    ? 'border-amber-400 dark:border-amber-800 ring-1 ring-amber-400/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                {/* Header Strip */}
                <div className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b text-xs ${
                  isBolo && !isCleared
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                    : call.priority === 'priority' && !isCleared
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60'
                    : isCleared
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-slate-900 dark:text-white">
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

                    {/* Type Label */}
                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {call.customTypeLabel || call.callType.replace(/_/g, ' ').toUpperCase()}
                    </span>

                    {/* Status Badge */}
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      call.status === 'dispatched'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 ring-1 ring-blue-400'
                        : call.status === 'en_route'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ring-1 ring-amber-400 animate-pulse'
                        : call.status === 'on_scene'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 ring-1 ring-purple-400'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-400'
                    }`}>
                      {call.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-3">
                  {/* Facility and Location */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <span>{call.siteName}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">{call.locationDetails}</span>
                      </div>
                      <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1">
                        {call.summary}
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      <span>Dispatched by: {call.dispatchedBy.name}</span>
                    </div>
                  </div>

                  {/* Details Narrative */}
                  {call.details && (
                    <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 whitespace-pre-line">
                      {call.details}
                    </div>
                  )}

                  {/* BOLO Subject Details Grid */}
                  {call.isBolo && call.boloSubject && (
                    <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Eye className="w-4 h-4" />
                          BOLO Subject Profile
                        </p>
                        {call.boloSubject.armedAndDangerous && (
                          <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-bounce">
                            ⚠️ ARMED & DANGEROUS
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {call.boloSubject.name && (
                          <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-rose-100 dark:border-rose-900/40">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Subject Name:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{call.boloSubject.name}</span>
                          </div>
                        )}
                        {(call.boloSubject.gender || call.boloSubject.race || call.boloSubject.approxAge) && (
                          <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-rose-100 dark:border-rose-900/40">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Demographics:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {[call.boloSubject.gender, call.boloSubject.race, call.boloSubject.approxAge ? `~${call.boloSubject.approxAge}yo` : ''].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                        {(call.boloSubject.height || call.boloSubject.weight) && (
                          <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-rose-100 dark:border-rose-900/40">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Build:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {[call.boloSubject.height, call.boloSubject.weight].filter(Boolean).join(' / ')}
                            </span>
                          </div>
                        )}
                        {call.boloSubject.vehicleInfo && (
                          <div className="col-span-2 bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-rose-100 dark:border-rose-900/40">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Vehicle:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Car className="w-3.5 h-3.5 text-rose-500" />
                              {call.boloSubject.vehicleInfo}
                            </span>
                          </div>
                        )}
                        {call.boloSubject.clothingDescription && (
                          <div className="col-span-2 sm:col-span-3 bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-rose-100 dark:border-rose-900/40">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Clothing / Appearance:</span>
                            <span className="text-slate-800 dark:text-slate-200">{call.boloSubject.clothingDescription}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Safety Instructions */}
                  {call.officerInstructions && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-2.5 rounded-xl flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold">Tactical Precaution: </strong>
                        <span>{call.officerInstructions}</span>
                      </div>
                    </div>
                  )}

                  {/* Cleared Disposition Box if cleared */}
                  {isCleared && call.clearedByGuard && (
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-emerald-900 dark:text-emerald-200 uppercase flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Disposition: [{call.disposition || 'Resolved'}]
                        </span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                          Cleared by {call.clearedByGuard.guardName} ({call.clearedByGuard.badgeNumber})
                        </span>
                      </div>
                      {call.resolutionNote && (
                        <p className="text-emerald-800 dark:text-emerald-300 font-sans italic">
                          &ldquo;{call.resolutionNote}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {/* Acknowledged Receipt notice on guard card */}
                  {call.acknowledgedByGuard && !isCleared && (
                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl px-3 py-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Acknowledged by {call.acknowledgedByGuard.guardName}</span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                        {new Date(call.acknowledgedByGuard.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* ACTION CONTROLS FOR GUARD */}
                  {!isCleared && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {call.status === 'dispatched' && (
                          <button
                            id={`ack-call-btn-${call.id}`}
                            onClick={() => acknowledgeCall(call.id, activeGuard, { channel: 'queue_action' })}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Acknowledge & Mark En Route</span>
                          </button>
                        )}

                        {isEnRoute && (
                          <button
                            id={`onscene-call-btn-${call.id}`}
                            onClick={() => markCallOnScene(call.id, activeGuard)}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Mark On Scene</span>
                          </button>
                        )}
                      </div>

                      {/* CLEAR CALL BUTTON */}
                      <button
                        id={`clear-call-btn-${call.id}`}
                        onClick={() => handleOpenClearModal(call)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Clear Call</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CLEAR CALL DISPOSITION MODAL */}
      {clearingCall && (
        <div 
          id="guard-clear-call-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Clear Call: {clearingCall.id}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select resolution disposition and submit officer notes to Ops dispatch records.
                </p>
              </div>
              <button
                onClick={() => setClearingCall(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmClear} className="space-y-4 text-xs">
              {/* Call Summary Banner */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Incident:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {clearingCall.summary} @ {clearingCall.locationDetails}
                </span>
              </div>

              {/* Disposition Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Select Quick Disposition <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DISPOSITIONS.map(disp => (
                    <button
                      key={disp.value}
                      type="button"
                      onClick={() => setSelectedDisposition(disp.value)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                        selectedDisposition === disp.value
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-400/40 text-emerald-900 dark:text-emerald-200'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-base shrink-0">{disp.icon}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-xs leading-tight">{disp.label}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {disp.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Brief Note Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Brief Officer Resolution Note (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Spoke with resident, volume lowered immediately; area quiet upon departure..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Submit / Confirm */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setClearingCall(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Log Disposition</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
