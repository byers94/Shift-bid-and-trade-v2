import React, { useState, useEffect } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { EMERGENCY_PRESETS, EmergencyPreset } from '../../data/emergencyPresets';
import { AlertSeverity, AlertType, EmergencyBroadcast } from '../../types/shift';
import { playEmergencyAlertSound } from '../../utils/audioAlert';
import { 
  AlertTriangle, 
  Radio, 
  ShieldAlert, 
  Volume2, 
  CheckCircle2, 
  Clock, 
  Users, 
  X, 
  Flame, 
  Lock, 
  CloudLightning, 
  Crosshair, 
  HeartPulse, 
  Send, 
  CheckCheck,
  ShieldCheck,
  Building2,
  FileText,
  History,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';

interface EmergencyBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminName: string;
  adminBadge: string;
}

export const EmergencyBroadcastModal: React.FC<EmergencyBroadcastModalProps> = ({
  isOpen,
  onClose,
  adminName,
  adminBadge
}) => {
  const { 
    activeBroadcast, 
    broadcastHistory, 
    sendEmergencyBroadcast, 
    cancelOrResolveBroadcast, 
    guardsList,
    shifts
  } = useShiftOps();

  // Extract all unique sites from shifts and guards
  const availableSites = React.useMemo(() => {
    const siteSet = new Set<string>();
    shifts.forEach(s => siteSet.add(s.siteName));
    guardsList.forEach(g => g.ojtSites.forEach(s => siteSet.add(s)));
    return Array.from(siteSet).sort();
  }, [shifts, guardsList]);

  const [activeTab, setActiveTab] = useState<'create' | 'active_monitor' | 'history'>('create');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset-lockdown');
  const [severity, setSeverity] = useState<AlertSeverity>('critical');
  const [alertType, setAlertType] = useState<AlertType>('lockdown');
  const [title, setTitle] = useState<string>('CODE RED: IMMEDIATE FACILITY LOCKDOWN');
  const [message, setMessage] = useState<string>(
    'Immediate shelter in place ordered by Ops Dispatch. All exterior turnstiles, loading docks, and pedestrian access gates must be sealed and locked immediately. Secure all post perimeters and stand by on tactical radio Channel 1.'
  );
  const [targetAllSites, setTargetAllSites] = useState<boolean>(true);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [requireAck, setRequireAck] = useState<boolean>(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [resolutionNote, setResolutionNote] = useState<string>('All clear. Threat neutralized, normal operations resumed.');

  // If there is an active broadcast when opening, default to active_monitor
  useEffect(() => {
    if (activeBroadcast && isOpen) {
      setActiveTab('active_monitor');
    } else if (!activeBroadcast && isOpen) {
      setActiveTab('create');
    }
  }, [activeBroadcast, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: EmergencyPreset) => {
    setSelectedPresetId(preset.id);
    setSeverity(preset.severity);
    setAlertType(preset.alertType);
    setTitle(preset.title);
    setMessage(preset.message);
    setRequireAck(preset.requireAcknowledgment);
  };

  const handleToggleSite = (site: string) => {
    if (targetAllSites) {
      setTargetAllSites(false);
      setSelectedSites([site]);
    } else {
      if (selectedSites.includes(site)) {
        const next = selectedSites.filter(s => s !== site);
        if (next.length === 0) {
          setTargetAllSites(true);
        } else {
          setSelectedSites(next);
        }
      } else {
        setSelectedSites([...selectedSites, site]);
      }
    }
  };

  const handleTestAudio = () => {
    playEmergencyAlertSound(severity);
  };

  const handleTransmitBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const targets = targetAllSites || selectedSites.length === 0 ? ['ALL SITES'] : selectedSites;
    const initiator = `${adminName} (${adminBadge})`;

    sendEmergencyBroadcast({
      severity,
      alertType,
      title,
      message,
      targetSites: targets,
      requireAcknowledgment: requireAck,
      initiatedBy: initiator
    });

    setIsConfirmOpen(false);
    setActiveTab('active_monitor');
  };

  const handleResolve = () => {
    const resolver = `${adminName} (${adminBadge})`;
    cancelOrResolveBroadcast(activeBroadcast?.id, resolutionNote, resolver);
    setActiveTab('create');
  };

  const renderAlertIcon = (type: AlertType, className: string = "w-5 h-5") => {
    switch (type) {
      case 'lockdown':
        return <Lock className={className} />;
      case 'active_threat':
        return <Crosshair className={className} />;
      case 'fire_evac':
        return <Flame className={className} />;
      case 'severe_weather':
        return <CloudLightning className={className} />;
      case 'perimeter_breach':
        return <ShieldAlert className={className} />;
      case 'medical':
        return <HeartPulse className={className} />;
      default:
        return <AlertTriangle className={className} />;
    }
  };

  // Calculate acknowledgments statistics
  const acksCount = activeBroadcast?.acknowledgedBy?.length || 0;
  const totalGuards = guardsList.length;
  const ackPercentage = totalGuards > 0 ? Math.round((acksCount / totalGuards) * 100) : 0;

  return (
    <div 
      id="emergency-broadcast-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
    >
      <div 
        id="emergency-broadcast-modal-dialog"
        className="bg-slate-900 border-2 border-red-600/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col text-slate-100 overflow-hidden"
      >
        {/* Header with High-Alert Branding */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-slate-900 border-b border-red-700/60 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-lg border border-red-400 animate-pulse">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-white">
                  Emergency Broadcast Command
                </h2>
                {activeBroadcast && (
                  <span className="bg-red-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                    Broadcast Live
                  </span>
                )}
              </div>
              <p className="text-xs text-red-200 font-mono">
                Site-Wide Critical Alerts & Guard Terminal Intercom
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="emergency-modal-close-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close Emergency Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 px-4 shrink-0">
          <button
            id="tab-create-broadcast-btn"
            onClick={() => setActiveTab('create')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'create'
                ? 'border-red-500 text-red-400 bg-red-950/30 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Transmit New Alert</span>
          </button>

          <button
            id="tab-active-monitor-btn"
            onClick={() => setActiveTab('active_monitor')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'active_monitor'
                ? 'border-red-500 text-red-400 bg-red-950/30 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Live Monitor & Receipts</span>
            {activeBroadcast ? (
              <span className="bg-red-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                {acksCount}/{totalGuards}
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-mono">Idle</span>
            )}
          </button>

          <button
            id="tab-broadcast-history-btn"
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-red-500 text-red-400 bg-red-950/30 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Broadcast Logs</span>
            <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-1.5 py-0.2 rounded-full">
              {broadcastHistory.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0 bg-slate-900/90">
          {/* TAB 1: CREATE / TRANSMIT BROADCAST */}
          {activeTab === 'create' && (
            <div className="space-y-6">
              {/* Active Broadcast Alert Warning (if one is already live) */}
              {activeBroadcast && (
                <div className="bg-red-950/80 border border-red-600 rounded-xl p-4 flex items-center justify-between gap-4 text-red-200">
                  <div className="flex items-center gap-3">
                    <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-white">
                        An Emergency Broadcast is Currently Active:
                      </div>
                      <div className="text-xs text-red-300 font-mono">
                        "{activeBroadcast.title}" (Sent by {activeBroadcast.initiatedBy})
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('active_monitor')}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    View Live Tracker
                  </button>
                </div>
              )}

              {/* 1-Click Quick Preset Selector */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-red-400" />
                    1. Select Incident Preset or Custom Template
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Fast 1-click Dispatch Templates
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {EMERGENCY_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-red-950/80 border-red-500 text-white ring-2 ring-red-500/40 shadow-lg'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${
                              preset.severity === 'critical' 
                                ? 'bg-red-950 text-red-400 border border-red-800' 
                                : preset.severity === 'warning'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-blue-950 text-blue-400 border border-blue-800'
                            }`}>
                              {renderAlertIcon(preset.alertType, "w-4 h-4")}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white line-clamp-1">
                                {preset.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {preset.category}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono mt-1 pt-1.5 border-t border-slate-800/80">
                          <span className={`uppercase font-black px-1.5 py-0.2 rounded ${
                            preset.severity === 'critical'
                              ? 'bg-red-900/60 text-red-300'
                              : preset.severity === 'warning'
                              ? 'bg-amber-900/60 text-amber-300'
                              : 'bg-blue-900/60 text-blue-300'
                          }`}>
                            {preset.severity}
                          </span>
                          <span className="text-slate-400">ACK Req: {preset.requireAcknowledgment ? 'YES' : 'NO'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Details */}
              <form onSubmit={(e) => { e.preventDefault(); setIsConfirmOpen(true); }} className="space-y-4">
                {/* Severity & Alert Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Severity Level */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      2. Threat Severity Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSeverity('critical')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs flex flex-col items-center gap-1 ${
                          severity === 'critical'
                            ? 'bg-red-950 border-red-500 text-red-200 ring-2 ring-red-500/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                        <span>CRITICAL</span>
                        <span className="text-[9px] text-slate-400 font-normal">Code Red</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSeverity('warning')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs flex flex-col items-center gap-1 ${
                          severity === 'warning'
                            ? 'bg-amber-950 border-amber-500 text-amber-200 ring-2 ring-amber-500/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                        <span>WARNING</span>
                        <span className="text-[9px] text-slate-400 font-normal">Amber Alert</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSeverity('info')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs flex flex-col items-center gap-1 ${
                          severity === 'info'
                            ? 'bg-blue-950 border-blue-500 text-blue-200 ring-2 ring-blue-500/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                        <span>ADVISORY</span>
                        <span className="text-[9px] text-slate-400 font-normal">Ops Notice</span>
                      </button>
                    </div>
                  </div>

                  {/* Incident Type */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      3. Incident Classification
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'lockdown', label: 'Lockdown', icon: Lock },
                        { id: 'active_threat', label: 'Threat', icon: Crosshair },
                        { id: 'fire_evac', label: 'Evacuation', icon: Flame },
                        { id: 'perimeter_breach', label: 'Breach', icon: ShieldAlert },
                        { id: 'severe_weather', label: 'Weather', icon: CloudLightning },
                        { id: 'medical', label: 'Medical', icon: HeartPulse }
                      ].map((t) => {
                        const Icon = t.icon;
                        const isSelected = alertType === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setAlertType(t.id as AlertType)}
                            className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-red-900/60 border-red-500 text-white shadow-xs'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Broadcast Title */}
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    4. Emergency Broadcast Headline
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. CODE RED: IMMEDIATE FACILITY LOCKDOWN"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 uppercase"
                  />
                </div>

                {/* Mandatory Orders / Instructions */}
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    5. Mandatory Guard Directive / Emergency Orders
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Detailed security instructions for all on-duty guards..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs leading-relaxed focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono"
                  />
                </div>

                {/* Target Facilities Scope */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-red-400" />
                      6. Target Facility Coverage
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetAllSites(!targetAllSites);
                        if (!targetAllSites) setSelectedSites([]);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        targetAllSites
                          ? 'bg-red-950 border border-red-600 text-red-300'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {targetAllSites ? '✓ Target ALL Posts (Site-Wide)' : 'Target Specific Posts'}
                    </button>
                  </div>

                  {!targetAllSites && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {availableSites.map((site) => {
                        const isChecked = selectedSites.includes(site);
                        return (
                          <button
                            key={site}
                            type="button"
                            onClick={() => handleToggleSite(site)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-red-900 border-red-400 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {isChecked ? '✓ ' : '+ '}
                            {site}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 font-mono mt-2 flex items-center gap-1.5">
                    <span className="text-slate-300 font-bold">Scope:</span>
                    <span>
                      {targetAllSites || selectedSites.length === 0
                        ? 'Broadcast will display to ALL connected guards across every client facility.'
                        : `Targeted to: ${selectedSites.join(', ')}`}
                    </span>
                  </div>
                </div>

                {/* Sound Test & Mandatory Acknowledgment Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireAck}
                      onChange={(e) => setRequireAck(e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-slate-900 border-slate-700 rounded focus:ring-red-500"
                    />
                    <span className="text-xs text-slate-300 font-bold">
                      Require Guards to Confirm Receipt & Acknowledge Orders
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleTestAudio}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                    title="Play audible alert chime"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Test Siren Audio</span>
                  </button>
                </div>

                {/* Transmit Trigger Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-500 hover:to-red-700 active:bg-red-900 text-white font-black py-3.5 px-6 rounded-xl text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-red-400/50 hover:shadow-red-900/50"
                  >
                    <Radio className="w-5 h-5 animate-pulse" />
                    <span>TRANSMIT HIGH-PRIORITY EMERGENCY BROADCAST</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: ACTIVE BROADCAST MONITOR & LIVE RECEIPT TRACKER */}
          {activeTab === 'active_monitor' && (
            <div className="space-y-6">
              {activeBroadcast ? (
                <div className="space-y-5">
                  {/* Ongoing Alert Banner Box */}
                  <div className={`rounded-2xl p-5 border-2 shadow-2xl ${
                    activeBroadcast.severity === 'critical'
                      ? 'bg-red-950/80 border-red-500 text-red-100'
                      : activeBroadcast.severity === 'warning'
                      ? 'bg-amber-950/80 border-amber-500 text-amber-100'
                      : 'bg-blue-950/80 border-blue-500 text-blue-100'
                  }`}>
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-lg animate-bounce">
                          {renderAlertIcon(activeBroadcast.alertType, "w-6 h-6")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
                              LIVE {activeBroadcast.severity.toUpperCase()} ALERT
                            </span>
                            <span className="text-xs font-mono text-slate-300">
                              Issued: {new Date(activeBroadcast.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black uppercase text-white mt-1">
                            {activeBroadcast.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => playEmergencyAlertSound(activeBroadcast.severity)}
                          className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-red-500 transition-colors cursor-pointer"
                          title="Trigger siren chime again on all stations"
                        >
                          <Volume2 className="w-4 h-4 text-amber-300" />
                          <span>Re-Sound Siren</span>
                        </button>
                      </div>
                    </div>

                    {/* Orders Body */}
                    <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 mb-4 text-xs font-mono leading-relaxed text-slate-200">
                      <span className="text-red-400 font-bold block mb-1 uppercase text-[11px]">Directives in Effect:</span>
                      {activeBroadcast.message}
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-300 gap-2 border-t border-white/10 pt-3">
                      <div>
                        <strong>Target Facilities:</strong> {activeBroadcast.targetSites.join(', ')}
                      </div>
                      <div>
                        <strong>Issued By:</strong> {activeBroadcast.initiatedBy}
                      </div>
                    </div>
                  </div>

                  {/* Guard Terminal Receipts & Acknowledgment Roster */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <h4 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                          <CheckCheck className="w-4 h-4 text-emerald-400" />
                          Live Guard Compliance & Receipt Tracking
                        </h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          Monitors which officers have acknowledged the alert on their terminals
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">Acks Logged</span>
                          <span className="text-base font-black font-mono text-emerald-400">
                            {acksCount} / {totalGuards} <span className="text-xs text-slate-400">({ackPercentage}%)</span>
                          </span>
                        </div>
                        <div className="w-20 bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-500"
                            style={{ width: `${ackPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Guards Table / Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {guardsList.map((guard) => {
                        const ack = activeBroadcast.acknowledgedBy.find(a => a.guardId === guard.id);
                        return (
                          <div 
                            key={guard.id}
                            className={`p-3 rounded-xl border flex items-start justify-between gap-2 transition-all ${
                              ack
                                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-100'
                                : 'bg-slate-900/70 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`p-1 rounded-full mt-0.5 ${
                                ack ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                              }`}>
                                {ack ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <span>{guard.name}</span>
                                  <span className="text-[9px] font-mono text-slate-400">
                                    {guard.badgeNumber}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {guard.phone}
                                </div>
                                {ack?.locationNote && (
                                  <div className="text-[10px] text-emerald-300 font-mono mt-1 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/60">
                                    Post Note: "{ack.locationNote}"
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {ack ? (
                                <span className="text-[10px] font-mono font-bold text-emerald-400 block">
                                  ✓ {new Date(ack.timestamp).toLocaleTimeString()}
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 animate-pulse">
                                  Pending ACK
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stand Down / Resolve Controls */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Stand Down & Issue All-Clear
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mb-3">
                      Resolves the active broadcast, dismisses full-screen alerts on all guard terminals, and logs resolution to audit terminal.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder="Resolution summary / all-clear note..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleResolve}
                        className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shrink-0"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Issue All-Clear</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* No Active Broadcast */
                <div className="text-center py-12 px-4 bg-slate-950/40 border border-slate-800 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                    No Emergency Broadcast Currently Active
                  </h3>
                  <p className="text-xs text-slate-400 font-mono max-w-md mx-auto mb-4">
                    All connected guard terminals are running in normal shift & trade operations mode.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    + Transmit Emergency Broadcast
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BROADCAST HISTORY & LOGS */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-red-400" />
                  Historical Emergency Broadcasts & Audit Records
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {broadcastHistory.length} Total Alerts Transmitted
                </span>
              </div>

              {broadcastHistory.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-400 text-xs font-mono">
                  No emergency broadcasts have been logged in this session yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                  {broadcastHistory.map((b) => (
                    <div 
                      key={b.id}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-slate-200"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                            b.severity === 'critical'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : b.severity === 'warning'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-blue-950 text-blue-400 border border-blue-800'
                          }`}>
                            {b.severity}
                          </span>
                          <h4 className="text-xs font-bold text-white uppercase">
                            {b.title}
                          </h4>
                          {b.active ? (
                            <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase animate-pulse">
                              Active
                            </span>
                          ) : (
                            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                              Resolved
                            </span>
                          )}
                        </div>

                        <div className="text-right text-[11px] font-mono text-slate-400">
                          {new Date(b.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <p className="text-xs font-mono text-slate-300 mb-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                        {b.message}
                      </p>

                      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2 border-t border-slate-800 pt-2.5">
                        <div>
                          <strong>Targets:</strong> {b.targetSites.join(', ')} • <strong>Initiator:</strong> {b.initiatedBy}
                        </div>
                        <div className="text-emerald-400 font-bold">
                          {b.acknowledgedBy.length} Guard Receipts Confirmed
                        </div>
                      </div>

                      {b.resolvedAt && (
                        <div className="mt-2 text-[10px] font-mono text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <span>
                            <strong>All-Clear Issued:</strong> {new Date(b.resolvedAt).toLocaleTimeString()} by {b.resolvedBy}
                          </span>
                          {b.resolutionNote && <span>"{b.resolutionNote}"</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Authorized Dispatcher: <strong>{adminName}</strong> ({adminBadge})</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>

      {/* Confirmation Sub-Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-950 border-2 border-red-600 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-red-950 border-2 border-red-600 flex items-center justify-center mx-auto mb-4 text-red-500 animate-pulse">
              <Radio className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black uppercase text-white tracking-wider mb-2">
              Confirm Emergency Alert Transmission
            </h3>
            <p className="text-xs text-red-200 font-mono mb-4 leading-relaxed">
              This will interrupt connected guard terminals and push a full-screen high-priority alert banner for:
            </p>

            <div className="bg-red-950/60 border border-red-800/80 rounded-xl p-3 text-left mb-6 font-mono text-xs">
              <div className="text-white font-bold mb-1 uppercase">{title}</div>
              <div className="text-red-300 text-[11px] line-clamp-2">{message}</div>
              <div className="text-[10px] text-slate-400 mt-2 pt-1 border-t border-red-900/60">
                Scope: {targetAllSites ? 'ALL POSTS & FACILITIES' : selectedSites.join(', ')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTransmitBroadcast}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
              >
                Transmit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
