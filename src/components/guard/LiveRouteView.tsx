import React, { useState, useEffect, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  Navigation, 
  MapPin, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Car, 
  Zap, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Key, 
  Phone, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Gauge, 
  Crosshair, 
  SlidersHorizontal, 
  Radio, 
  Sparkles, 
  Camera, 
  ExternalLink,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
  Compass,
  AlertCircle,
  Route,
  Lock
} from 'lucide-react';
import { RouteCheckpointStop, RoverVehicle, DynamicRoutePlan, SlaPriorityLevel } from '../../types/roverRoute';
import { RovingGroup } from '../../types/shift';
import { VerificationCameraModal } from './VerificationCameraModal';

interface LiveRouteViewProps {
  onOpenAlertPrefs?: () => void;
  onNavigateToDuty?: () => void;
}

export const LiveRouteView: React.FC<LiveRouteViewProps> = ({ 
  onOpenAlertPrefs,
  onNavigateToDuty
}) => {
  const { 
    activeGuard, 
    activeClockedInShift,
    rovers, 
    roverPlans, 
    activeInterceptions, 
    trafficCondition, 
    optimizationMode,
    antiPredictabilityJitterPct,
    getRoverForGuard, 
    getRoverByGroup,
    advanceRoverCheckpoint,
    clearAdHocInterception,
    reoptimizeRoverRoutes,
    simulateRoverGpsMove,
    showToast,
    sitesList,
    opsPhone
  } = useShiftOps();

  // Selected rover fallback logic (Assigned -> Clocked in shift group -> Guard profile group -> Rover 1)
  const defaultAssignedRover = 
    getRoverForGuard(activeGuard.id) || 
    (activeClockedInShift?.assignedRoverId ? rovers.find(r => r.id === activeClockedInShift.assignedRoverId) : undefined) ||
    (activeClockedInShift?.rovingGroup ? getRoverByGroup(activeClockedInShift.rovingGroup) : undefined) ||
    (activeGuard.isRovingGuard ? getRoverByGroup(activeGuard.rovingGroup || 'Alpha Group') : undefined) ||
    rovers[0];

  const [selectedRoverId, setSelectedRoverId] = useState<string>(defaultAssignedRover?.id || rovers[0]?.id || 'rover-1');

  // Update selected rover when active guard changes
  useEffect(() => {
    if (defaultAssignedRover) {
      setSelectedRoverId(defaultAssignedRover.id);
    }
  }, [activeGuard.id, defaultAssignedRover?.id]);

  const activeRover: RoverVehicle | undefined = rovers.find(r => r.id === selectedRoverId) || defaultAssignedRover || rovers[0];
  const activePlan: DynamicRoutePlan | undefined = activeRover ? roverPlans[activeRover.id] : undefined;

  // Filter & tab controls
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed' | 'p1_only'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showMapTopology, setShowMapTopology] = useState<boolean>(true);
  const [showOpsFeed, setShowOpsFeed] = useState<boolean>(false);
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [isReoptimizing, setIsReoptimizing] = useState<boolean>(false);

  // Live timer for dwell simulation
  const [liveDwellSeconds, setLiveDwellSeconds] = useState<number>(activeRover?.currentDwellSeconds || 0);

  useEffect(() => {
    let interval: any = null;
    if (activeRover?.status === 'dwelling') {
      interval = setInterval(() => {
        setLiveDwellSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setLiveDwellSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeRover?.status]);

  // Priority CFS Interception Alert assigned to this unit
  const activeUnitIntercept = activeRover 
    ? activeInterceptions.find(i => i.assignedRoverId === activeRover.id && (i.status === 'dispatched' || i.status === 'en_route' || i.status === 'on_scene'))
    : undefined;

  const currentStopIndex = activeRover ? activeRover.currentStopIndex : 0;
  const currentStop: RouteCheckpointStop | undefined = activePlan?.stops ? activePlan.stops[currentStopIndex] : undefined;
  const nextStop: RouteCheckpointStop | undefined = activePlan?.stops ? activePlan.stops[currentStopIndex + 1] : undefined;

  // Filtered stops
  const displayedStops = useMemo(() => {
    if (!activePlan || !activePlan.stops) return [];
    return activePlan.stops
      .map((stop, idx) => ({ stop, idx }))
      .filter(({ stop, idx }) => {
        if (filterMode === 'completed') return idx < currentStopIndex;
        if (filterMode === 'pending') return idx >= currentStopIndex;
        if (filterMode === 'p1_only') return stop.slaPriority === 'P1_MANDATORY_SLA' || stop.slaPriority === 'P1';
        return true;
      })
      .filter(({ stop }) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return stop.siteName.toLowerCase().includes(q) || stop.siteAddress.toLowerCase().includes(q) || stop.slaPriority.toLowerCase().includes(q);
      });
  }, [activePlan, currentStopIndex, filterMode, searchQuery]);

  const handleManualReoptimize = () => {
    setIsReoptimizing(true);
    setTimeout(() => {
      reoptimizeRoverRoutes();
      setIsReoptimizing(false);
      showToast('Dynamic Route Updated', 'Live sequence re-optimized against real-time traffic and SLA hit windows.', 'success');
    }, 600);
  };

  const handleSimulateArrival = () => {
    if (!activeRover || !currentStop) return;
    if (activeRover.status === 'dwelling') {
      advanceRoverCheckpoint(activeRover.id, 'finish_dwell');
      showToast('Patrol Stop Completed', `Dwell complete at ${currentStop.siteName}. En-route to next checkpoint.`, 'info');
    } else {
      advanceRoverCheckpoint(activeRover.id, 'arrive');
      showToast('Geofence Verified', `Arrived on-site at ${currentStop.siteName}. Dwell timer started.`, 'success');
    }
  };

  if (!activeRover || !activePlan) {
    return (
      <div className="bg-slate-900 text-white rounded-2xl p-6 text-center space-y-4 border border-slate-800">
        <Car className="w-12 h-12 text-cyan-400 mx-auto animate-bounce" />
        <h3 className="text-base font-bold text-white">Initializing Mobile Patrol Route...</h3>
        <p className="text-xs text-slate-400">Loading GPS coordinates and site sequence from Ops Dispatch.</p>
        <button
          onClick={handleManualReoptimize}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
        >
          Load Live Route
        </button>
      </div>
    );
  }

  const completedStopsCount = currentStopIndex;
  const totalStopsCount = activePlan.stops.length;
  const progressPercent = totalStopsCount > 0 ? Math.round((completedStopsCount / totalStopsCount) * 100) : 0;

  return (
    <div id="live-route-view-root" className="space-y-3 pb-8">
      {/* Photo Checkpoint Verification Modal */}
      <VerificationCameraModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        guard={activeGuard}
        siteName={currentStop?.siteName || 'Roving Patrol Checkpoint'}
        gpsCoordinates={currentStop ? { latitude: currentStop.coords.latitude, longitude: currentStop.coords.longitude } : undefined}
        onCompleteVerification={() => {
          setIsPhotoModalOpen(false);
          showToast('Checkpoint Verified', 'GPS + Photo proof timestamped and synced to Ops.', 'success');
        }}
      />

      {/* TOP STATUS BAR: Active Unit, Dispatch Sync, & Group Selector */}
      <div className="bg-slate-950 text-white rounded-2xl p-3.5 border border-cyan-500/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/20 border border-cyan-400/40 rounded-xl text-cyan-300">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>{activeRover.unitNumber}</span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/50 px-2 py-0.5 rounded font-mono font-bold">
                    {activeRover.rovingGroup}
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span className="text-slate-300 font-bold">{activeGuard.name}</span>
                <span>•</span>
                <span className="text-slate-400">{activeRover.callSign}</span>
                <span>•</span>
                <span className="text-cyan-400 font-bold">{activeRover.vehicleModel}</span>
              </p>
            </div>
          </div>

          {/* Quick Roving Group Switcher */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedRoverId}
              onChange={(e) => setSelectedRoverId(e.target.value)}
              className="bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-300 rounded-lg px-2 py-1 text-xs font-mono font-bold cursor-pointer transition-colors"
              title="Select Roving Patrol Circuit"
            >
              {rovers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.unitNumber} ({r.rovingGroup})
                </option>
              ))}
            </select>

            <button
              onClick={handleManualReoptimize}
              disabled={isReoptimizing}
              className={`p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer ${
                isReoptimizing ? 'animate-spin text-cyan-400' : ''
              }`}
              title="Re-sync sequence from Ops Dispatch"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Real-time telemetry connection & optimization metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
          <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-400 uppercase block font-sans">Dispatch Sync</span>
            <div className="flex items-center gap-1 text-emerald-400 font-bold mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE 100%</span>
            </div>
          </div>

          <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-400 uppercase block font-sans">Traffic Factor</span>
            <div className="flex items-center gap-1 text-amber-300 font-bold mt-0.5 capitalize">
              <Gauge className="w-3 h-3 text-amber-400" />
              <span>{trafficCondition}</span>
            </div>
          </div>

          <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-400 uppercase block font-sans">Deadhead Saved</span>
            <div className="flex items-center gap-1 text-cyan-300 font-bold mt-0.5">
              <TrendingDown className="w-3 h-3 text-cyan-400" />
              <span>~{activePlan.deadheadSavedMinutes}m</span>
            </div>
          </div>

          <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-400 uppercase block font-sans">SLA Hit Window</span>
            <div className="flex items-center gap-1 text-emerald-300 font-bold mt-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{activePlan.slaComplianceScorePct || 98}%</span>
            </div>
          </div>
        </div>

        {/* Route optimization mode indicator */}
        <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 font-mono text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 font-sans">Strategy:</span>
            <span className="font-bold text-cyan-300 capitalize">
              {(activePlan.optimizationMode || 'traffic_density_optimal').replace(/_/g, ' ')}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Anti-Predictability Jitter: <strong className="text-amber-300">{antiPredictabilityJitterPct}%</strong>
          </div>
        </div>

        {/* Circuit Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-400">
              Circuit Progress: <strong className="text-white">Stop {currentStopIndex + 1} of {totalStopsCount}</strong>
            </span>
            <span className="text-cyan-400 font-bold">{progressPercent}% Completed</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* PRIORITY CFS INTERCEPT ORDER BANNER (If Dispatched by Ops) */}
      {activeUnitIntercept && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-2 border-rose-500 rounded-2xl p-4 text-white space-y-3 shadow-xl animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-rose-600 rounded-xl text-white shrink-0 mt-0.5">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded font-mono">
                    🚨 EMERGENCY DYNAMIC RE-ROUTE
                  </span>
                  <span className="text-[11px] font-bold text-rose-200 font-mono">
                    CFS #{activeUnitIntercept.callId || 'EMERGENCY'}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white mt-1">
                  {activeUnitIntercept.callTitle || activeUnitIntercept.callSummary}
                </h3>
                <p className="text-xs text-rose-200 font-mono flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                  <span>{activeUnitIntercept.locationAddress || activeUnitIntercept.targetAddress}</span>
                </p>
                <p className="text-[11px] text-rose-300 mt-1 italic">
                  Routine rounds postponed (+15m SLA window adjusted). High-priority on-scene response required.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 bg-rose-900/90 border border-rose-700/60 p-2.5 rounded-xl font-mono">
              <span className="text-[9px] text-rose-300 uppercase block font-sans">Target ETA</span>
              <span className="text-base font-black text-white">~{activeUnitIntercept.estimatedEtaMinutes || 5} min</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-800/80">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeUnitIntercept.locationAddress || activeUnitIntercept.targetAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-rose-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>GPS Navigate</span>
            </a>

            <button
              onClick={() => {
                clearAdHocInterception(activeUnitIntercept.id, 'Officer responded on-scene and resolved incident.');
                showToast('Intercept Resolved', 'CFS Call marked on-scene and resolved. Routine patrol circuit restored.', 'success');
              }}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer transition-colors"
            >
              Mark On-Scene & Clear
            </button>
          </div>
        </div>
      )}

      {/* CURRENT TARGET CHECKPOINT (HERO FOCUS CARD) */}
      {currentStop && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl p-4 border-2 border-cyan-500/60 shadow-2xl space-y-3.5 relative overflow-hidden">
          {/* Glowing accent corner */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>ACTIVE STOP #{currentStopIndex + 1} OF {totalStopsCount}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              </span>
              <h3 className="text-base font-black text-white mt-1 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{currentStop.siteName}</span>
              </h3>
              <p className="text-xs text-slate-300 font-mono flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{currentStop.siteAddress}</span>
              </p>
            </div>

            <div className="text-right">
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full inline-block font-mono ${
                currentStop.slaPriority === 'P1_MANDATORY_SLA' || currentStop.slaPriority === 'P1'
                  ? 'bg-rose-950 text-rose-300 border border-rose-700/80'
                  : currentStop.slaPriority === 'P2_CONTRACTUAL_WINDOW'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700/80'
                  : 'bg-blue-950 text-blue-300 border border-blue-700/80'
              }`}>
                {currentStop.slaPriority.replace('_MANDATORY_SLA', '')}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                Sector: {currentStop.clusterSectorId || 'CENTRAL'}
              </span>
            </div>
          </div>

          {/* Time Windows, Dwell Requirements & Geofence Status */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/90 p-3 rounded-xl border border-slate-800 text-[11px] font-mono">
            <div>
              <span className="text-[9px] text-slate-400 uppercase block font-sans">Target Window</span>
              <p className="font-bold text-white mt-0.5">
                {currentStop.estimatedArrival} - {currentStop.estimatedDeparture}
              </p>
              <span className="text-[9px] text-slate-500">
                ~{currentStop.estimatedDriveMinutes}m drive
              </span>
            </div>

            <div>
              <span className="text-[9px] text-slate-400 uppercase block font-sans">Mandatory Dwell</span>
              <p className="font-bold text-amber-300 mt-0.5">
                {currentStop.targetDwellMinutes} mins
              </p>
              {activeRover.status === 'dwelling' ? (
                <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5 animate-spin" />
                  {Math.floor(liveDwellSeconds / 60)}m {liveDwellSeconds % 60}s logged
                </span>
              ) : (
                <span className="text-[9px] text-slate-500">on-site verification</span>
              )}
            </div>

            <div>
              <span className="text-[9px] text-slate-400 uppercase block font-sans">Geofence Radar</span>
              <p className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{activeRover.isInsideGeofence ? 'Inside Geofence' : 'Radar Scanning'}</span>
              </p>
              <span className="text-[9px] text-slate-500">
                Radius: {currentStop.geofenceRadiusMeters || 100}m
              </span>
            </div>
          </div>

          {/* Access Codes & Security Instructions */}
          {(currentStop.postInstructions || currentStop.gateCode) && (
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start gap-2 text-xs">
              <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                {currentStop.gateCode && (
                  <span className="text-amber-300 font-mono font-bold mr-2">
                    Gate Code: {currentStop.gateCode}
                  </span>
                )}
                <span className="text-slate-300 text-[11px]">
                  {currentStop.postInstructions || 'Inspect perimeter doors, verify lockup, and conduct foot patrol.'}
                </span>
              </div>
            </div>
          )}

          {/* Time Specific Tasks & Lockouts on Current Site */}
          {(() => {
            const matchedSite = sitesList.find(s => s.name === currentStop.siteName || s.id === currentStop.siteId);
            if (!matchedSite?.timeSpecificTasks || matchedSite.timeSpecificTasks.length === 0) return null;
            return (
              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-amber-500/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-amber-300 font-bold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Scheduled Amenity Tasks ({matchedSite.timeSpecificTasks.length})</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchedSite.timeSpecificTasks.map((task) => (
                    <span key={task.id} className="text-[11px] bg-amber-950/60 text-amber-200 border border-amber-800/60 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <strong>{task.title}</strong> @ {task.scheduledTime}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleSimulateArrival}
              className="py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Crosshair className="w-4 h-4 text-slate-950" />
              <span>
                {activeRover.status === 'dwelling'
                  ? '✓ Complete Site Dwell & Depart to Next Stop'
                  : '📍 Log Geofence Arrival & Start Dwell'}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentStop.siteAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
              >
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>Turn-by-Turn GPS</span>
              </a>

              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                title="Photo checkpoint scan"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Photo Check</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER TABS & SEARCH BAR FOR OPTIMIZED TIMELINE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-[#1e3a8a] dark:text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Optimized Sequence of Sites ({activePlan.stops.length} Locations)
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowMapTopology(!showMapTopology)}
              className={`px-2 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                showMapTopology
                  ? 'bg-[#1e3a8a] dark:bg-cyan-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>Map Route</span>
            </button>

            <button
              onClick={() => setShowOpsFeed(!showOpsFeed)}
              className={`px-2 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                showOpsFeed
                  ? 'bg-[#1e3a8a] dark:bg-cyan-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>Ops Feed</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            {(['all', 'pending', 'completed', 'p1_only'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase font-bold transition-colors cursor-pointer shrink-0 ${
                  filterMode === mode
                    ? 'bg-[#1e3a8a] dark:bg-cyan-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mode === 'all' && `All (${activePlan.stops.length})`}
                {mode === 'pending' && `Pending (${totalStopsCount - completedStopsCount})`}
                {mode === 'completed' && `Done (${completedStopsCount})`}
                {mode === 'p1_only' && 'P1 SLAs'}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-28 sm:w-36"
          />
        </div>
      </div>

      {/* MAP TOPOLOGY SCHEMATIC / CIRCUIT VECTOR DIAGRAM */}
      {showMapTopology && (
        <div className="bg-slate-950 text-white rounded-2xl p-3.5 border border-slate-800 shadow-md space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Compass className="w-3.5 h-3.5" />
              <span>Circuit Route Topology: {activeRover.rovingGroup}</span>
            </span>
            <span>Total: {activePlan.totalDistanceKm || 18.4} km • ~{activePlan.totalEstimatedMinutes || 180}m circuit</span>
          </div>

          {/* Graphical Circuit Progression Schematic */}
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-max">
              {activePlan.stops.map((stop, idx) => {
                const isCurrent = idx === currentStopIndex;
                const isCompleted = idx < currentStopIndex;

                return (
                  <React.Fragment key={stop.id || idx}>
                    <div 
                      onClick={() => setExpandedStopId(expandedStopId === stop.id ? null : stop.id)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-cyan-950 border-cyan-400 text-white ring-2 ring-cyan-500/40 min-w-[110px]'
                          : isCompleted
                          ? 'bg-slate-900/60 border-emerald-700/60 text-slate-400 min-w-[95px] opacity-75'
                          : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700 min-w-[95px]'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold mb-1 ${
                        isCurrent
                          ? 'bg-cyan-400 text-slate-950 font-black animate-pulse'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <span className="text-[11px] font-bold truncate max-w-[90px] block">
                        {stop.siteName.replace(' - Patrol', '').replace(' Authority', '')}
                      </span>
                      <span className="text-[9px] font-mono text-cyan-300">
                        {stop.estimatedArrival}
                      </span>
                    </div>

                    {idx < activePlan.stops.length - 1 && (
                      <div className="flex items-center text-slate-600 font-mono text-[10px] px-0.5">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* OPS DISPATCH & RE-ROUTE LIVE LOG FEED */}
      {showOpsFeed && (
        <div className="bg-slate-900 text-white rounded-2xl p-3.5 border border-slate-800 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Radio className="w-3.5 h-3.5" />
              <span>Real-Time Ops Shift & Reroute Feed</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Channel: SECURE-OPS-DISPATCH</span>
          </div>

          <div className="space-y-1.5 text-[11px] font-mono max-h-48 overflow-y-auto no-scrollbar">
            <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-slate-300">
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span className="text-cyan-400 font-bold">● ROUTE RE-OPTIMIZED</span>
                <span>Just Now</span>
              </div>
              <p className="mt-0.5 text-white">
                Circuit calibrated for {trafficCondition} traffic conditions. ~{activePlan.deadheadSavedMinutes}m deadhead drive time reduction applied.
              </p>
            </div>

            <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-slate-300">
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span className="text-emerald-400 font-bold">● GEOFENCE TELEMETRY</span>
                <span>Active</span>
              </div>
              <p className="mt-0.5">
                Passive GPS telemetry polling every 10s. Dwell timer automatically engages upon boundary crossing.
              </p>
            </div>

            <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-slate-300">
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span className="text-blue-400 font-bold">● SHIFT ASSIGNMENT</span>
                <span>Shift #{activeClockedInShift?.id || '402'}</span>
              </div>
              <p className="mt-0.5">
                Officer {activeGuard.name} ({activeGuard.badgeNumber}) confirmed for {activeRover.unitNumber} roving patrol.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE OPTIMIZED SEQUENCE TIMELINE (LIST OF SITES TO VISIT) */}
      <div className="space-y-2">
        {displayedStops.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center text-slate-500 border border-slate-200 dark:border-slate-800">
            <Filter className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-bold">No patrol stops match your filter criteria.</p>
            <button
              onClick={() => { setFilterMode('all'); setSearchQuery(''); }}
              className="mt-2 text-xs text-blue-600 dark:text-cyan-400 font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          displayedStops.map(({ stop, idx }) => {
            const isCurrent = idx === currentStopIndex;
            const isCompleted = idx < currentStopIndex;
            const isExpanded = expandedStopId === stop.id;

            return (
              <div
                key={stop.id || idx}
                className={`rounded-2xl border transition-all shadow-sm ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-2 border-cyan-400 ring-2 ring-cyan-500/20'
                    : isCompleted
                    ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Main Card Header */}
                <div className="p-3.5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Sequence Badge */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 mt-0.5 ${
                      isCurrent
                        ? 'bg-cyan-400 text-slate-950 ring-2 ring-cyan-300 shadow-md animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                    }`}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className={`text-xs sm:text-sm font-bold truncate ${
                          isCurrent 
                            ? 'text-white font-black' 
                            : isCompleted 
                            ? 'line-through text-slate-400 dark:text-slate-500' 
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {stop.siteName}
                        </h4>

                        {isCurrent && (
                          <span className="px-1.5 py-0.2 bg-cyan-400 text-slate-950 rounded text-[9px] font-mono font-black uppercase">
                            TARGET NOW
                          </span>
                        )}

                        {stop.isAdHocIntercept && (
                          <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded text-[9px] font-mono font-bold uppercase">
                            🚨 CFS INTERCEPT
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                        <span>{stop.siteAddress}</span>
                      </p>

                      {/* SLA priority & drive metrics */}
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono mt-1">
                        <span className={`px-1.5 py-0.2 rounded font-bold ${
                          stop.slaPriority === 'P1_MANDATORY_SLA' || stop.slaPriority === 'P1'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}>
                          {stop.slaPriority.replace('_MANDATORY_SLA', '')}
                        </span>

                        <span className="text-slate-400">
                          {stop.targetDwellMinutes}m dwell req
                        </span>

                        {stop.estimatedDriveMinutes > 0 && (
                          <span className="text-slate-400">
                            • ~{stop.estimatedDriveMinutes}m drive
                          </span>
                        )}

                        {(() => {
                          const matched = sitesList.find(s => s.name === stop.siteName || s.id === stop.siteId);
                          if (!matched?.timeSpecificTasks || matched.timeSpecificTasks.length === 0) return null;
                          return (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-bold flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              {matched.timeSpecificTasks[0].title} @ {matched.timeSpecificTasks[0].scheduledTime}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Timing Pill & Accordion Button */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div className="font-mono text-xs">
                      <span className={`font-bold ${isCurrent ? 'text-cyan-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {stop.estimatedArrival}
                      </span>
                      <span className="text-slate-400 text-[10px] block">
                        until {stop.estimatedDeparture}
                      </span>
                    </div>

                    <button
                      onClick={() => setExpandedStopId(isExpanded ? null : stop.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Toggle Stop Details"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl text-[11px] font-mono">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-sans">Geofence Radius</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{stop.geofenceRadiusMeters || 100} meters</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-sans">SLA Window Description</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate block">
                          {stop.slaWindowDescription || 'Contract hit window 20:00 - 02:00'}
                        </span>
                      </div>
                    </div>

                    {stop.postInstructions && (
                      <div className="p-2 bg-slate-100 dark:bg-slate-950 rounded-xl text-slate-600 dark:text-slate-300 text-[11px]">
                        <strong className="text-slate-900 dark:text-white block mb-0.5">Post Directive:</strong>
                        {stop.postInstructions}
                      </div>
                    )}

                    {/* Quick GPS & Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.siteAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-cyan-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Navigate to this Site</span>
                      </a>

                      {!isCompleted && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => {
                            // Move vehicle coords to this site
                            simulateRoverGpsMove(activeRover.id, {
                              latitude: stop.coords.latitude,
                              longitude: stop.coords.longitude
                            });
                            showToast('GPS Telemetry Simulated', `Vehicle coordinates moved to ${stop.siteName}.`, 'info');
                          }}
                          className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-mono font-bold cursor-pointer"
                        >
                          Simulate GPS
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* QUICK FOOTER HELPER: Contact Ops Dispatch */}
      <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-950 text-[#1e3a8a] dark:text-blue-300 rounded-xl">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Need Route Reassignment?</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">Ops Dispatch: {opsPhone}</span>
          </div>
        </div>

        <button
          onClick={handleManualReoptimize}
          className="px-3 py-1.5 bg-[#1e3a8a] hover:bg-blue-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white dark:text-slate-950 rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-colors"
        >
          Re-Optimize Route
        </button>
      </div>
    </div>
  );
};
