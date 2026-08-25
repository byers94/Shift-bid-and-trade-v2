import React, { useState, useEffect } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { playEmergencyAlertSound } from '../../utils/audioAlert';
import { 
  AlertTriangle, 
  Radio, 
  ShieldAlert, 
  Volume2, 
  CheckCircle2, 
  Lock, 
  Crosshair, 
  Flame, 
  CloudLightning, 
  HeartPulse, 
  CheckCheck,
  ChevronUp,
  ChevronDown,
  Building2,
  Send,
  AlertOctagon
} from 'lucide-react';
import { AlertType } from '../../types/shift';

export const EmergencyAlertOverlay: React.FC = () => {
  const { activeBroadcast, activeGuard, acknowledgeBroadcast } = useShiftOps();
  const [locationNote, setLocationNote] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasTriggeredInitialAudio, setHasTriggeredInitialAudio] = useState(false);

  // Check if current active guard has acknowledged
  const guardAck = activeBroadcast?.acknowledgedBy?.find(
    (a) => a.guardId === activeGuard.id
  );
  const isAcknowledged = Boolean(guardAck);

  // Trigger sound once per new broadcast
  useEffect(() => {
    if (activeBroadcast && activeBroadcast.active && !hasTriggeredInitialAudio) {
      playEmergencyAlertSound(activeBroadcast.severity);
      setHasTriggeredInitialAudio(true);
    } else if (!activeBroadcast) {
      setHasTriggeredInitialAudio(false);
      setIsMinimized(false);
      setLocationNote('');
    }
  }, [activeBroadcast, hasTriggeredInitialAudio]);

  if (!activeBroadcast || !activeBroadcast.active) return null;

  // Check if the guard's facility is covered by this broadcast
  const isTargeted =
    activeBroadcast.targetSites.includes('ALL SITES') ||
    activeBroadcast.targetSites.includes('ALL') ||
    activeBroadcast.targetSites.some((site) =>
      activeGuard.ojtSites.includes(site)
    );

  const handleAcknowledge = (e: React.FormEvent) => {
    e.preventDefault();
    acknowledgeBroadcast(
      activeGuard.id,
      activeGuard.name,
      activeGuard.badgeNumber,
      locationNote
    );
  };

  const renderAlertIcon = (type: AlertType, className: string = "w-6 h-6") => {
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

  const isCritical = activeBroadcast.severity === 'critical';
  const isWarning = activeBroadcast.severity === 'warning';

  // If guard is acknowledged and chose to minimize, show persistent top sticky bar
  if (isMinimized && isAcknowledged) {
    return (
      <div 
        id="guard-minimized-alert-banner"
        className={`w-full p-2.5 px-3 border-b flex items-center justify-between z-40 transition-all text-white shrink-0 ${
          isCritical
            ? 'bg-red-950 border-red-600 shadow-md'
            : isWarning
            ? 'bg-amber-950 border-amber-600 shadow-md'
            : 'bg-blue-950 border-blue-600 shadow-md'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden pr-2">
          <div className="p-1 bg-red-600 rounded-md shrink-0 animate-pulse">
            <Radio className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="truncate">
            <div className="text-[11px] font-black uppercase tracking-wider text-white truncate flex items-center gap-1.5">
              <span>{activeBroadcast.title}</span>
              <span className="bg-emerald-500 text-slate-950 text-[9px] font-mono px-1 py-0.2 rounded font-black">
                ACKNOWLEDGED
              </span>
            </div>
            <div className="text-[10px] text-red-200 truncate font-mono">
              {activeBroadcast.message}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsMinimized(false)}
          className="px-2.5 py-1 bg-red-800 hover:bg-red-700 active:bg-red-900 text-white font-bold text-[10px] uppercase rounded-lg transition-colors shrink-0 flex items-center gap-1 cursor-pointer border border-red-500"
        >
          <span>Expand Orders</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div 
      id="guard-emergency-fullscreen-overlay"
      className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between overflow-y-auto animate-in fade-in duration-200 border-x border-red-700"
    >
      {/* Flashing Hazard Stripes / Top Bar */}
      <div className={`p-3 text-white flex items-center justify-between shrink-0 shadow-lg border-b-2 ${
        isCritical
          ? 'bg-red-950 border-red-600'
          : isWarning
          ? 'bg-amber-950 border-amber-600'
          : 'bg-blue-950 border-blue-600'
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
          <span className="text-xs font-black uppercase tracking-widest text-red-200 font-mono">
            CRITICAL OPS DISPATCH TRANSMISSION
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => playEmergencyAlertSound(activeBroadcast.severity)}
            className="p-1.5 bg-red-900/80 hover:bg-red-800 rounded-lg text-amber-300 transition-colors cursor-pointer border border-red-600"
            title="Sound Siren Audio"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          
          {isAcknowledged && (
            <button
              onClick={() => setIsMinimized(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-mono flex items-center gap-1 cursor-pointer border border-slate-600"
              title="Minimize to top bar"
            >
              <span>Minimize</span>
              <ChevronUp className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Alert Content Frame */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center max-w-lg mx-auto w-full text-white">
        {/* Threat Header Pill */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className={`p-2.5 rounded-xl shadow-xl border ${
            isCritical
              ? 'bg-red-600 text-white border-red-400 animate-bounce'
              : 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
          }`}>
            {renderAlertIcon(activeBroadcast.alertType, "w-7 h-7")}
          </div>
        </div>

        <div className="text-center mb-4">
          <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-2 border ${
            isCritical
              ? 'bg-red-950 border-red-500 text-red-400'
              : 'bg-amber-950 border-amber-500 text-amber-400'
          }`}>
            {activeBroadcast.severity.toUpperCase()} ALERT • {activeBroadcast.alertType.toUpperCase()}
          </span>

          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-tight">
            {activeBroadcast.title}
          </h2>

          <p className="text-[11px] text-slate-400 font-mono mt-1">
            Issued by {activeBroadcast.initiatedBy} • {new Date(activeBroadcast.createdAt).toLocaleTimeString()}
          </p>
        </div>

        {/* Highlighted Directives Box */}
        <div className="bg-slate-900 border-2 border-red-600/80 rounded-2xl p-4 sm:p-5 shadow-2xl mb-4 text-left">
          <div className="text-[10px] font-extrabold text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>MANDATORY OFFICER INSTRUCTIONS:</span>
          </div>

          <p className="text-xs sm:text-sm font-mono text-slate-100 leading-relaxed font-bold bg-black/50 p-3 rounded-xl border border-slate-800">
            {activeBroadcast.message}
          </p>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3 text-red-400" />
              Scope: {activeBroadcast.targetSites.join(', ')}
            </span>
            <span>
              {activeBroadcast.acknowledgedBy.length} Guards Verified
            </span>
          </div>
        </div>

        {/* ACKNOWLEDGMENT FORM OR CONFIRMED BADGE */}
        {!isAcknowledged ? (
          <form onSubmit={handleAcknowledge} className="space-y-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Post / Checkpoint Status (Optional):
              </label>
              <input
                type="text"
                value={locationNote}
                onChange={(e) => setLocationNote(e.target.value)}
                placeholder="e.g. Post 3 secure, gate locked, standing by"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:bg-red-800 text-white font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-red-400/50"
            >
              <CheckCheck className="w-4 h-4" />
              <span>ACKNOWLEDGE & CONFIRM EMERGENCY ORDERS</span>
            </button>

            <p className="text-[10px] text-center text-slate-400 font-mono">
              Acknowledging logs your badge ({activeGuard.badgeNumber}) and timestamp to Ops Dispatch.
            </p>
          </form>
        ) : (
          <div className="bg-emerald-950/80 border-2 border-emerald-500/80 rounded-2xl p-4 text-center shadow-xl">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>RECEIPT VERIFIED WITH OPS DISPATCH</span>
            </div>
            <p className="text-[11px] text-emerald-200 font-mono mb-2">
              Officer {activeGuard.name} ({activeGuard.badgeNumber}) acknowledged at{' '}
              {new Date(guardAck.timestamp).toLocaleTimeString()}
            </p>
            {guardAck.locationNote && (
              <div className="text-[10px] text-emerald-300 font-mono bg-emerald-950 p-1.5 rounded border border-emerald-700/60 mb-3">
                Post Note: "{guardAck.locationNote}"
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer w-full"
            >
              Proceed with Duty / Minimize Alert
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[10px] font-mono text-slate-400 shrink-0">
        Officer Terminal: <strong>{activeGuard.name}</strong> • Badge: <strong>{activeGuard.badgeNumber}</strong>
      </div>
    </div>
  );
};
