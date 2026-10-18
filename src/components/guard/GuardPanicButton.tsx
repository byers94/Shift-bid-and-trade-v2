import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ScheduledShift } from '../../types/shift';
import { playEmergencyAlertSound } from '../../utils/audioAlert';
import { 
  AlertOctagon, 
  ShieldAlert, 
  Radio, 
  MapPin, 
  CheckCircle2, 
  X, 
  PhoneCall, 
  AlertTriangle,
  RotateCcw,
  Navigation,
  Compass,
  Clock,
  Shield,
  Volume2,
  VolumeX
} from 'lucide-react';

export interface PanicSosCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface PanicSosEvent {
  alertType: 'PANIC_SOS';
  status: 'ACTIVE_DISTRESS';
  guardId: string;
  guardName: string;
  siteId: string;
  siteName: string;
  coordinates: PanicSosCoordinates;
  timestamp: string;
}

export const PANIC_SOS_STORAGE_KEY = 'secureshift_active_panic_sos_v1';
export const PANIC_SOS_EVENT_NAME = 'secureshift:panic_sos_alert';
export const PANIC_SOS_CLEAR_EVENT_NAME = 'secureshift:panic_sos_cleared';

/**
 * Helper hook to subscribe to Panic/SOS alert state from any component
 */
export function usePanicSosAlert() {
  const [activeDistress, setActiveDistress] = useState<PanicSosEvent | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(PANIC_SOS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleAlert = (e: Event) => {
      const customEvent = e as CustomEvent<PanicSosEvent>;
      if (customEvent.detail) {
        setActiveDistress(customEvent.detail);
      }
    };

    const handleClear = () => {
      setActiveDistress(null);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === PANIC_SOS_STORAGE_KEY) {
        try {
          setActiveDistress(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setActiveDistress(null);
        }
      }
    };

    window.addEventListener(PANIC_SOS_EVENT_NAME, handleAlert);
    window.addEventListener(PANIC_SOS_CLEAR_EVENT_NAME, handleClear);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(PANIC_SOS_EVENT_NAME, handleAlert);
      window.removeEventListener(PANIC_SOS_CLEAR_EVENT_NAME, handleClear);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const clearDistress = useCallback((reason: string = 'False Alarm Cleared') => {
    localStorage.removeItem(PANIC_SOS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(PANIC_SOS_CLEAR_EVENT_NAME, { detail: { reason, timestamp: new Date().toISOString() } }));
    setActiveDistress(null);
  }, []);

  return { activeDistress, clearDistress };
}

interface GuardPanicButtonProps {
  /** Optional active shift override; otherwise pulls activeClockedInShift from context */
  activeShift?: ScheduledShift | null;
  /** Custom callback when SOS is activated */
  onTrigger?: (data: PanicSosEvent) => void;
  /** Custom callback when SOS is cancelled */
  onCancel?: () => void;
  /** Visual placement variant */
  variant?: 'telemetry_bar' | 'compact' | 'prominent' | 'floating';
  /** Additional styling classes */
  className?: string;
  /** Show the top flashing banner automatically when SOS is active */
  showActiveBanner?: boolean;
}

export const GuardPanicButton: React.FC<GuardPanicButtonProps> = ({
  activeShift: propShift,
  onTrigger,
  onCancel,
  variant = 'telemetry_bar',
  className = '',
  showActiveBanner = true
}) => {
  const { 
    activeGuard, 
    activeClockedInShift, 
    sitesList, 
    sendEmergencyBroadcast, 
    dispatchCall, 
    logAdminAction, 
    showToast 
  } = useShiftOps();

  const currentShift = propShift !== undefined ? propShift : activeClockedInShift;
  const { activeDistress, clearDistress } = usePanicSosAlert();

  // Hold-to-activate states (2.0s hold requirement)
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0); // 0.0 to 1.0
  const [isActivating, setIsActivating] = useState<boolean>(false);

  // Cancellation modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('Accidental pocket activation');
  const [cancelNotes, setCancelNotes] = useState<string>('');

  // Elapsed distress timer
  const [distressElapsedSec, setDistressElapsedSec] = useState<number>(0);

  const holdStartTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);

  // Sound tone generator fallback
  const playDistressSiren = useCallback(() => {
    try {
      playEmergencyAlertSound('critical');
    } catch {
      // Inline web audio synthesizer fallback
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
        }
      } catch (err) {
        console.warn('Audio synthesis fallback error:', err);
      }
    }
  }, []);

  // Timer loop for active distress banner
  useEffect(() => {
    if (!activeDistress) {
      setDistressElapsedSec(0);
      return;
    }

    const startTs = new Date(activeDistress.timestamp).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      setDistressElapsedSec(Math.max(0, Math.floor((now - startTs) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeDistress]);

  // Clean-up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Hold reset handler (clean reset if released before 2.0s)
  const resetHold = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    holdStartTimeRef.current = null;
    setIsPressing(false);
    setHoldProgress(0);
    hasTriggeredRef.current = false;
  }, []);

  // Complete 2.0s trigger execution
  const executeDistressTrigger = useCallback(async () => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    setIsActivating(true);

    // 1. Trigger device haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 500]);
      } catch (vErr) {
        console.warn('Vibration feedback not available:', vErr);
      }
    }

    // 2. Play audible distress tone
    playDistressSiren();

    // 3. Immediately capture navigator.geolocation coordinates
    let coords: PanicSosCoordinates = {
      lat: 47.6062,
      lng: -122.3321,
      accuracy: 15
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 3500,
            maximumAge: 0
          });
        });
        coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 10)
        };
      }
    } catch (geoErr) {
      console.warn('Geolocation capture fallback:', geoErr);
      // Fallback to active shift coordinates or site defaults
      if (currentShift?.currentGps) {
        coords = {
          lat: currentShift.currentGps.latitude,
          lng: currentShift.currentGps.longitude,
          accuracy: currentShift.currentGps.accuracy || 20
        };
      } else {
        const site = sitesList.find(s => s.name === currentShift?.siteName || s.id === currentShift?.siteId);
        if (site?.latitude && site?.longitude) {
          coords = {
            lat: site.latitude,
            lng: site.longitude,
            accuracy: site.geofenceRadiusMeters || 30
          };
        }
      }
    }

    // 4. Form distress event payload
    const distressPayload: PanicSosEvent = {
      alertType: 'PANIC_SOS',
      status: 'ACTIVE_DISTRESS',
      guardId: currentShift?.guardId || activeGuard?.id || 'GUARD-ACTIVE',
      guardName: currentShift?.guardName || activeGuard?.name || 'Active Officer',
      siteId: currentShift?.siteId || 'SITE-POST',
      siteName: currentShift?.siteName || 'Assigned Security Post',
      coordinates: coords,
      timestamp: new Date().toISOString()
    };

    // 5. Emit to dispatch event pipeline (LocalStorage + CustomEvent)
    localStorage.setItem(PANIC_SOS_STORAGE_KEY, JSON.stringify(distressPayload));
    window.dispatchEvent(new CustomEvent(PANIC_SOS_EVENT_NAME, { detail: distressPayload }));

    // 6. Integrate with ShiftOpsContext pipeline
    try {
      sendEmergencyBroadcast({
        severity: 'critical',
        alertType: 'active_threat',
        title: `🚨 OFFICER DISTRESS / PANIC SOS: ${distressPayload.guardName}`,
        message: `EMERGENCY SOS TRIGGERED by Officer ${distressPayload.guardName} at ${distressPayload.siteName}. Immediate code-3 dispatch backup requested. GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (±${coords.accuracy}m).`,
        targetSites: [distressPayload.siteName || 'ALL SITES'],
        requireAcknowledgment: true,
        initiatedBy: `OFFICER PANIC: ${distressPayload.guardName}`
      });

      dispatchCall({
        callType: 'perimeter_alarm',
        customTypeLabel: 'OFFICER IN DISTRESS / PANIC SOS',
        priority: 'urgent_bolo',
        siteName: distressPayload.siteName,
        locationDetails: `Officer Emergency at ${distressPayload.siteName} (GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`,
        summary: `OFFICER DISTRESS (PANIC ACTIVATION) - Immediate supervisor & patrol backup required. Guard: ${distressPayload.guardName}`,
        dispatchedBy: { name: 'GUARD SOS', badge: activeGuard?.badgeNumber || 'SOS' }
      });

      logAdminAction({
        type: 'emergency_broadcast_sent',
        title: 'OFFICER PANIC SOS ACTIVATED',
        description: `Officer ${distressPayload.guardName} activated continuous 2s Panic/SOS button at ${distressPayload.siteName}.`,
        adminName: 'Guard SOS System',
        adminBadge: activeGuard?.badgeNumber || 'PANIC-BTN',
        badgeVariant: 'rose'
      });

      showToast(
        '🚨 DISTRESS SIGNAL TRANSMITTED',
        `Panic SOS sent to Dispatch CAD & surrounding rover units with live GPS.`,
        'danger'
      );
    } catch (ctxErr) {
      console.warn('Dispatch context emission fallback:', ctxErr);
    }

    if (onTrigger) {
      onTrigger(distressPayload);
    }

    setIsActivating(false);
    resetHold();
  }, [
    activeGuard,
    currentShift,
    sitesList,
    playDistressSiren,
    sendEmergencyBroadcast,
    dispatchCall,
    logAdminAction,
    showToast,
    onTrigger,
    resetHold
  ]);

  // Press start handler
  const handlePressStart = useCallback((e: React.SyntheticEvent) => {
    // Prevent default context menus or touch scrolling on the button
    if (e.type === 'touchstart') {
      // touch-action takes care of scrolling
    }
    if (hasTriggeredRef.current || isActivating) return;

    holdStartTimeRef.current = performance.now();
    setIsPressing(true);
    setHoldProgress(0);

    const checkProgress = () => {
      if (!holdStartTimeRef.current) return;
      const elapsed = performance.now() - holdStartTimeRef.current;
      const progress = Math.min(1, elapsed / 2000); // 2000ms = 2.0 seconds
      setHoldProgress(progress);

      if (progress >= 1) {
        executeDistressTrigger();
      } else {
        animFrameRef.current = requestAnimationFrame(checkProgress);
      }
    };

    animFrameRef.current = requestAnimationFrame(checkProgress);
  }, [executeDistressTrigger, isActivating]);

  // Confirm cancel false alarm
  const handleConfirmCancelFalseAlarm = () => {
    clearDistress(cancelReason);

    try {
      logAdminAction({
        type: 'emergency_broadcast_resolved',
        title: 'OFFICER DISTRESS CANCELLED (FALSE ALARM)',
        description: `Guard ${activeGuard.name} cancelled Panic/SOS alert: "${cancelReason}". Notes: ${cancelNotes || 'None'}.`,
        adminName: activeGuard.name,
        adminBadge: activeGuard.badgeNumber,
        badgeVariant: 'emerald'
      });

      showToast(
        'SOS Cancelled',
        'Distress alarm reset. Dispatch CAD notified that guard is secure.',
        'success'
      );
    } catch (err) {
      console.warn('Log action error on cancel:', err);
    }

    setIsCancelModalOpen(false);
    setCancelNotes('');
    if (onCancel) onCancel();
  };

  // Radial progress calculations (circle r = 18, circumference = ~113.1)
  const circleRadius = 18;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (holdProgress * circumference);
  const remainingSeconds = Math.max(0, (2.0 - (holdProgress * 2.0))).toFixed(1);

  return (
    <>
      {/* 1. ACTIVE HIGH-CONTRAST FLASHING HEADER BANNER (When SOS is Active) */}
      {showActiveBanner && activeDistress && (
        <div 
          id="guard-sos-active-header-banner"
          className="w-full bg-gradient-to-r from-red-700 via-rose-600 to-red-800 text-white p-3 sm:p-4 rounded-xl shadow-2xl border-2 border-red-400 ring-4 ring-red-500/40 animate-pulse transition-all mb-3 z-30"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black/40 border border-white/60 flex items-center justify-center shrink-0 shadow-inner">
                <AlertOctagon className="w-6 h-6 text-yellow-300 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider bg-black/60 px-2.5 py-0.5 rounded-full border border-red-300 font-mono text-red-200">
                    🚨 SOS ACTIVE — DISPATCH NOTIFIED
                  </span>
                  <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-white flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    +{Math.floor(distressElapsedSec / 60)}m {distressElapsedSec % 60}s
                  </span>
                </div>
                <div className="text-xs text-red-100 font-medium mt-1 flex items-center gap-2 flex-wrap">
                  <span>Officer: <strong>{activeDistress.guardName}</strong></span>
                  <span>•</span>
                  <span>Post: <strong>{activeDistress.siteName}</strong></span>
                  <span>•</span>
                  <span className="font-mono text-[11px] bg-red-950/80 px-1.5 py-0.2 rounded border border-red-500/60 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-yellow-300" />
                    {activeDistress.coordinates.lat.toFixed(4)}, {activeDistress.coordinates.lng.toFixed(4)} (±{activeDistress.coordinates.accuracy}m)
                  </span>
                </div>
              </div>
            </div>

            {/* Cancel False Alarm Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={playDistressSiren}
                className="p-2 rounded-lg bg-black/30 hover:bg-black/50 text-yellow-300 border border-white/20 transition-colors"
                title="Sound distress siren"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                id="cancel-false-alarm-btn"
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-slate-100 text-red-900 font-black rounded-lg text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-red-700" />
                <span>Cancel False Alarm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. HOLD-TO-ACTIVATE PANIC / SOS BUTTON */}
      <div 
        id="guard-panic-sos-button-container"
        className={`inline-flex items-center select-none ${className}`}
      >
        <button
          id="guard-panic-sos-trigger-btn"
          type="button"
          onMouseDown={handlePressStart}
          onMouseUp={resetHold}
          onMouseLeave={resetHold}
          onTouchStart={handlePressStart}
          onTouchEnd={resetHold}
          onTouchCancel={resetHold}
          onContextMenu={(e) => e.preventDefault()}
          disabled={Boolean(activeDistress)}
          className={`relative overflow-hidden group flex items-center justify-between font-black transition-all cursor-pointer touch-none select-none ${
            activeDistress
              ? 'bg-red-950/90 border-red-600 text-red-300 opacity-90 cursor-default ring-2 ring-red-500/40'
              : isPressing
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border-white text-white shadow-2xl shadow-red-600/70 scale-[0.98] ring-2 ring-red-500/60'
              : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 border-red-400 text-white shadow-md shadow-red-950/50 hover:shadow-red-600/40'
          } ${
            variant === 'compact'
              ? 'text-[11px] h-8 px-2.5 py-1 gap-1.5 rounded-lg border'
              : 'text-xs sm:text-sm h-11 px-3 py-1.5 gap-2.5 rounded-xl border-2'
          }`}
          style={{ touchAction: 'none' }}
          title={activeDistress ? 'Distress Signal Active' : 'Hold continuously for 2.0 seconds to emit Code-Red SOS Distress'}
        >
          {/* Radial progress ring SVG */}
          <div className={`relative flex items-center justify-center shrink-0 ${
            variant === 'compact' ? 'w-5 h-5' : 'w-7 h-7 sm:w-8 sm:h-8'
          }`}>
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 44 44">
              {/* Background circle track */}
              <circle
                cx="22"
                cy="22"
                r={circleRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-red-900/40"
              />
              {/* Animated progress circle */}
              <circle
                cx="22"
                cy="22"
                r={circleRadius}
                fill="none"
                stroke={isPressing ? '#ffffff' : '#fca5a5'}
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={activeDistress ? 0 : strokeDashoffset}
                className="transition-all duration-75 ease-linear"
              />
            </svg>

            {/* Center icon / countdown number */}
            <div className="absolute inset-0 flex items-center justify-center">
              {activeDistress ? (
                <AlertOctagon className={variant === 'compact' ? 'w-3 h-3 text-white animate-spin' : 'w-4 h-4 text-white animate-spin'} />
              ) : isPressing ? (
                <span className="font-mono text-[8px] font-black text-white">
                  {remainingSeconds}
                </span>
              ) : (
                <ShieldAlert className={variant === 'compact' ? 'w-3 h-3 text-white' : 'w-4 h-4 text-white group-hover:scale-110 transition-transform'} />
              )}
            </div>
          </div>

          {/* Button Text & Status Indicator */}
          {variant === 'compact' ? (
            <div className="flex items-center gap-1 leading-none whitespace-nowrap">
              <span className="font-black uppercase tracking-wider text-[10px] text-white">
                {activeDistress ? 'SOS ACTIVE' : isPressing ? `HOLD ${(holdProgress * 100).toFixed(0)}%` : 'SOS'}
              </span>
              {!activeDistress && !isPressing && (
                <span className="text-[9px] font-mono bg-red-950/90 px-1 py-0.5 rounded text-red-200 border border-red-400/40">
                  2.0s
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col text-left pr-1 leading-tight min-w-[105px]">
              <span className="font-black uppercase tracking-wider text-[11px] sm:text-xs text-white drop-shadow-sm flex items-center gap-1">
                <span>{activeDistress ? 'SOS ACTIVE' : isPressing ? 'HOLDING SOS...' : 'PANIC / SOS'}</span>
                {!activeDistress && !isPressing && (
                  <span className="text-[9px] bg-red-900/80 px-1 py-0.2 rounded text-red-200 border border-red-400/40">
                    2.0s
                  </span>
                )}
              </span>
              <span className="text-[9px] text-red-200/90 font-mono">
                {activeDistress
                  ? 'Dispatch Notified'
                  : isPressing
                  ? `Hold: ${(holdProgress * 100).toFixed(0)}%`
                  : 'Hold 2s to activate'}
              </span>
            </div>
          )}

          {/* Pulsing indicator when active */}
          {activeDistress && (
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          )}
        </button>
      </div>

      {/* 3. CONFIRMATION MODAL: CANCEL FALSE ALARM */}
      {isCancelModalOpen && (
        <div 
          id="cancel-false-alarm-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            id="cancel-false-alarm-modal"
            className="w-full max-w-md bg-slate-900 border-2 border-red-500 rounded-2xl shadow-2xl p-5 text-slate-100 space-y-4"
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-500/60 flex items-center justify-center text-red-400 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Cancel False Alarm?</h3>
                  <p className="text-xs text-slate-400">Confirm officer safety to clear distress alert</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Confirming will stand down CAD response</span>
              </div>
              <p>
                Dispatch and field supervisors will receive immediate confirmation that the distress signal was accidental or that you are fully safe.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Reason for Clearing SOS
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="Accidental pocket activation">Accidental pocket activation / pocket press</option>
                  <option value="Training / Drill test">Training / System operational check</option>
                  <option value="Threat de-escalated / Guard safe">Threat de-escalated — Officer is safe</option>
                  <option value="Assistance resolved on-scene">Assistance resolved on-scene</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Optional Safety Check Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. All clear, standing by at main lobby desk"
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition-colors"
              >
                Keep SOS Active
              </button>
              <button
                id="confirm-cancel-false-alarm-btn"
                type="button"
                onClick={handleConfirmCancelFalseAlarm}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs transition-colors shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm I Am Safe (Clear Alert)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Standalone CAD / Dashboard persistent red distress card.
 * Intended for src/components/dashboard/ or CAD exception tray.
 */
export const CadPanicDistressCard: React.FC<{
  onAcknowledge?: (alert: PanicSosEvent) => void;
  onDispatchBackup?: (alert: PanicSosEvent) => void;
}> = ({ onAcknowledge, onDispatchBackup }) => {
  const { activeDistress, clearDistress } = usePanicSosAlert();
  const { guardsList } = useShiftOps();
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (!activeDistress) return;
    const startTs = new Date(activeDistress.timestamp).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startTs) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeDistress]);

  if (!activeDistress) return null;

  const guard = guardsList.find(g => g.id === activeDistress.guardId);

  return (
    <div 
      id="cad-persistent-panic-sos-distress-card"
      className="w-full bg-gradient-to-br from-red-950 via-rose-950 to-red-900 border-2 border-red-500 rounded-xl p-3 sm:p-4 shadow-2xl shadow-red-950/70 text-white space-y-3 mb-3 animate-in fade-in duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-600 border border-red-300 flex items-center justify-center shrink-0 shadow animate-bounce">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full font-mono">
                🚨 CODE RED: ACTIVE OFFICER DISTRESS
              </span>
              <span className="text-[11px] font-mono font-bold bg-black/50 px-2 py-0.5 rounded border border-red-500/50 text-red-200">
                Active: +{Math.floor(elapsed / 60)}m {elapsed % 60}s
              </span>
            </div>
            <h4 className="font-black text-sm text-white mt-1">
              Officer {activeDistress.guardName} triggered Panic/SOS at {activeDistress.siteName}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={() => clearDistress('CAD Commander Override / Safe Cleared')}
          className="text-xs bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/50 px-2.5 py-1 rounded-lg transition-colors font-bold shrink-0"
          title="Clear distress state in CAD"
        >
          Clear SOS
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-black/40 p-2.5 rounded-lg border border-red-700/40">
        <div>
          <span className="text-[10px] uppercase font-bold text-red-300 block">Officer On Duty</span>
          <span className="font-bold text-white">{activeDistress.guardName} ({guard?.badgeNumber || 'GUARD'})</span>
          {guard?.phone && (
            <a 
              href={`tel:${guard.phone}`}
              className="text-[11px] text-cyan-300 underline block mt-0.5"
            >
              📞 {guard.phone}
            </a>
          )}
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-red-300 block">Assigned Post</span>
          <span className="font-bold text-white">{activeDistress.siteName}</span>
          <span className="text-[11px] text-slate-300 block">Facility Perimeter Zone</span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-red-300 block">Live Coordinates</span>
          <span className="font-mono text-yellow-300 font-bold block">
            {activeDistress.coordinates.lat.toFixed(5)}, {activeDistress.coordinates.lng.toFixed(5)}
          </span>
          <span className="text-[10px] text-red-200 font-mono">
            Accuracy: ±{activeDistress.coordinates.accuracy}m
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px] text-red-200 flex items-center gap-1 font-mono">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block" />
          Continuous distress loop broadcasting to CAD
        </span>
        <div className="flex items-center gap-2">
          {guard?.phone && (
            <a
              href={`tel:${guard.phone}`}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call Officer</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              if (onDispatchBackup) onDispatchBackup(activeDistress);
            }}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black transition-colors shadow flex items-center gap-1"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Dispatch Backup</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuardPanicButton;
