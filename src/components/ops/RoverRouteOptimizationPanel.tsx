import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  OptimizationMode, 
  TrafficCondition, 
  RoverVehicle, 
  RouteCheckpointStop, 
  AdHocInterception,
  SlaPriorityLevel
} from '../../types/roverRoute';
import { RovingGroup } from '../../types/shift';
import { 
  Navigation, 
  Route, 
  Car, 
  Compass, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Zap, 
  Radio, 
  Sliders, 
  Sparkles, 
  TrendingDown, 
  MapPin, 
  RefreshCw, 
  Play, 
  RotateCcw, 
  ArrowRight, 
  Flame, 
  Activity, 
  Eye, 
  EyeOff, 
  Crosshair, 
  Gauge, 
  Building2, 
  PhoneCall, 
  XCircle, 
  ChevronRight,
  Wifi,
  ChevronDown,
  Info,
  CheckCircle,
  Share2,
  Lock,
  Search,
  Filter,
  Check
} from 'lucide-react';

interface RoverRouteOptimizationPanelProps {
  onSelectSite?: (siteId: string) => void;
  onNavigateToMpuPerformance?: () => void;
}

export const RoverRouteOptimizationPanel: React.FC<RoverRouteOptimizationPanelProps> = ({ 
  onSelectSite,
  onNavigateToMpuPerformance
}) => {
  const {
    rovers,
    roverPlans,
    activeInterceptions,
    telemetryLogs,
    trafficCondition,
    optimizationMode,
    antiPredictabilityJitterPct,
    geoClusterSectors,
    sitesList,
    callsForService,
    setTrafficCondition,
    setOptimizationMode,
    setAntiPredictabilityJitterPct,
    reoptimizeRoverRoutes,
    dispatchAdHocInterception,
    clearAdHocInterception,
    advanceRoverCheckpoint,
    simulateRoverGpsMove,
    showToast
  } = useShiftOps();

  const [selectedRoverId, setSelectedRoverId] = useState<string>(() => rovers[0]?.id || 'rover-01');
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [isInterceptModalOpen, setIsInterceptModalOpen] = useState<boolean>(false);
  const [selectedCallIdForIntercept, setSelectedCallIdForIntercept] = useState<string>('');
  const [customInterceptAddress, setCustomInterceptAddress] = useState<string>('');
  const [selectedRoverOverride, setSelectedRoverOverride] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [resolvingInterceptId, setResolvingInterceptId] = useState<string | null>(null);
  const [telemetryFilterRover, setTelemetryFilterRover] = useState<string>('all');
  const [isSimulatingGps, setIsSimulatingGps] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'topology_map' | 'circuit_queue' | 'ad_hoc_intercept' | 'telemetry_stream'>('topology_map');

  const activeRover = useMemo(() => {
    return rovers.find(r => r.id === selectedRoverId) || rovers[0];
  }, [rovers, selectedRoverId]);

  const activePlan = useMemo(() => {
    return activeRover ? roverPlans[activeRover.id] : undefined;
  }, [roverPlans, activeRover]);

  const activeStop = useMemo(() => {
    if (!activePlan || !activeRover) return undefined;
    return activePlan.stops[activeRover.currentStopIndex] || activePlan.stops[0];
  }, [activePlan, activeRover]);

  // Overall Fleet Statistics
  const fleetStats = useMemo(() => {
    let totalDeadheadSaved = 0;
    let totalStops = 0;
    let totalDistance = 0;
    let completedStops = 0;
    let totalDriveMins = 0;

    Object.values(roverPlans).forEach(plan => {
      totalDeadheadSaved += plan.deadheadSavedMinutes || 0;
      totalStops += plan.stops.length;
      totalDistance += plan.totalDistanceKm || 0;
      totalDriveMins += plan.deadheadDriveMinutes || 0;
      completedStops += plan.stops.filter(s => s.status === 'completed').length;
    });

    return {
      totalDeadheadSaved,
      totalStops,
      totalDistance: +totalDistance.toFixed(1),
      completedStops,
      totalDriveMins,
      completionRatePct: totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0,
      activeInterceptionsCount: activeInterceptions.length
    };
  }, [roverPlans, activeInterceptions]);

  // Handle Dispatching Ad-Hoc Intercept
  const handleDispatchIntercept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCallIdForIntercept) {
      showToast('Select Call', 'Please select an active Call for Service to intercept.', 'warning');
      return;
    }

    const result = dispatchAdHocInterception(
      selectedCallIdForIntercept,
      customInterceptAddress || undefined,
      selectedRoverOverride || undefined
    );

    if (result) {
      setIsInterceptModalOpen(false);
      setSelectedCallIdForIntercept('');
      setCustomInterceptAddress('');
      setSelectedRoverOverride('');
      if (result.assignedRoverId) {
        setSelectedRoverId(result.assignedRoverId);
      }
    }
  };

  // Handle Resolving Intercept
  const handleResolveIntercept = (interceptId: string) => {
    clearAdHocInterception(interceptId, resolutionNotes || undefined);
    setResolvingInterceptId(null);
    setResolutionNotes('');
  };

  // Trigger GPS Geofence Simulation
  const handleSimulateGeofence = (roverId: string) => {
    const rover = rovers.find(r => r.id === roverId);
    const plan = roverPlans[roverId];
    if (!rover || !plan) return;

    const stop = plan.stops[rover.currentStopIndex];
    if (!stop) return;

    setIsSimulatingGps(true);

    if (rover.status === 'patrolling') {
      // Move GPS coordinates inside geofence centroid
      simulateRoverGpsMove(roverId, {
        latitude: stop.coords.latitude,
        longitude: stop.coords.longitude,
        speedKmh: 8
      });
      advanceRoverCheckpoint(roverId);
    } else {
      // Advance to next stop
      advanceRoverCheckpoint(roverId, 'finish_dwell');
    }

    setTimeout(() => {
      setIsSimulatingGps(false);
    }, 600);
  };

  // Available Calls for Interception Modal
  const openCalls = useMemo(() => {
    return callsForService.filter(c => c.status === 'dispatched' || c.status === 'en_route' || c.status === 'on_scene');
  }, [callsForService]);

  // Filtered Telemetry Logs
  const filteredTelemetry = useMemo(() => {
    if (telemetryFilterRover === 'all') return telemetryLogs;
    return telemetryLogs.filter(l => l.roverId === telemetryFilterRover);
  }, [telemetryLogs, telemetryFilterRover]);

  return (
    <div className="space-y-4">
      {/* Header Banner with High-Tech Fleet Dispatch Aesthetic */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600/20 border border-blue-500/40 rounded-lg text-blue-400">
                <Navigation className="w-5 h-5 animate-pulse text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  Dynamic Mobile Route Optimization
                  <span className="bg-blue-500/20 text-cyan-300 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border border-cyan-500/30">
                    SLA & Geo-Clustered
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time density routing, stochastic counter-surveillance jitter, contract SLA time-windows, and passive geofence verification.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Global Action Triggers */}
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToMpuPerformance && (
              <button
                id="view-mpu-performance-btn"
                type="button"
                onClick={onNavigateToMpuPerformance}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-bold rounded-lg border border-indigo-700/50 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                title="View shift coverage and sector fill rates across all 5 sectors"
              >
                <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                <span>MPU Performance</span>
              </button>
            )}

            <button
              id="reoptimize-fleet-btn"
              type="button"
              onClick={() => reoptimizeRoverRoutes()}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-blue-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Recalculate 2-Opt TSP & SLA windows across all mobile circuits"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Optimize Fleet</span>
            </button>

            <button
              id="open-adhoc-intercept-btn"
              type="button"
              onClick={() => setIsInterceptModalOpen(true)}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-lg shadow-md hover:shadow-rose-900/40 flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
              title="Reroute nearest mobile unit to emergency call or alarm drop"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Dispatch Emergency Intercept</span>
            </button>
          </div>
        </div>

        {/* Global Summary KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Car className="w-3 h-3 text-cyan-400" /> Active Mobile Units
            </span>
            <p className="text-base sm:text-lg font-black font-mono text-white mt-0.5">
              {rovers.length}{' '}
              <span className="text-[10px] font-sans text-emerald-400 font-normal">Units Patrolling</span>
            </p>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-emerald-400" /> Deadhead Saved
            </span>
            <p className="text-base sm:text-lg font-black font-mono text-emerald-400 mt-0.5">
              ~{fleetStats.totalDeadheadSaved} min{' '}
              <span className="text-[10px] font-sans text-slate-400 font-normal">City-wide</span>
            </p>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-blue-400" /> SLA Hit Compliance
            </span>
            <p className="text-base sm:text-lg font-black font-mono text-cyan-300 mt-0.5">
              98.4%{' '}
              <span className="text-[10px] font-sans text-slate-400 font-normal">On Window</span>
            </p>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <EyeOff className="w-3 h-3 text-purple-400" /> Anti-Predictability
            </span>
            <p className="text-base sm:text-lg font-black font-mono text-purple-300 mt-0.5">
              {optimizationMode === 'anti_predictability_stochastic' || optimizationMode === 'stealth_randomized' 
                ? 'High (Active)' 
                : 'Standard'}
            </p>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Circuit Progress
            </span>
            <p className="text-base sm:text-lg font-black font-mono text-amber-300 mt-0.5">
              {fleetStats.completedStops} / {fleetStats.totalStops}{' '}
              <span className="text-[10px] font-sans text-slate-400 font-normal">({fleetStats.completionRatePct}%)</span>
            </p>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-rose-400" /> Active Intercepts
            </span>
            <p className={`text-base sm:text-lg font-black font-mono mt-0.5 ${
              activeInterceptions.length > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'
            }`}>
              {activeInterceptions.length} Rerouted
            </p>
          </div>
        </div>
      </div>

      {/* Optimization Mode & Live Traffic Calibration Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Optimization Mode Selection */}
          <div className="space-y-1.5 flex-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Route Optimization Algorithm Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setOptimizationMode('traffic_density_optimal')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  optimizationMode === 'traffic_density_optimal'
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 dark:border-blue-400 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black flex items-center gap-1">
                    🚀 Geo-Clustering & Density
                  </span>
                  {optimizationMode === 'traffic_density_optimal' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  Minimizes deadhead drive time by grouping static checkpoints in tight spatial sectors.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOptimizationMode('anti_predictability_stochastic')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  optimizationMode === 'anti_predictability_stochastic'
                    ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-500 dark:border-purple-400 text-purple-900 dark:text-purple-100 shadow-xs ring-1 ring-purple-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black flex items-center gap-1">
                    🛡️ Anti-Predictability
                  </span>
                  {optimizationMode === 'anti_predictability_stochastic' && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  Stochastic interval jitter and randomized sequence loops prevent pattern recognition.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOptimizationMode('sla_priority_first')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  optimizationMode === 'sla_priority_first'
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 dark:border-amber-400 text-amber-900 dark:text-amber-100 shadow-xs ring-1 ring-amber-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black flex items-center gap-1">
                    ⏱️ Contract SLA Enforced
                  </span>
                  {optimizationMode === 'sla_priority_first' && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  Hard-locks mandatory contract time windows first before filling remaining windows.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOptimizationMode('stealth_randomized')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  optimizationMode === 'stealth_randomized'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-400 text-emerald-900 dark:text-emerald-100 shadow-xs ring-1 ring-emerald-400/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black flex items-center gap-1">
                    🥷 Stealth Randomization
                  </span>
                  {optimizationMode === 'stealth_randomized' && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  High-variance counter-reconnaissance traversal for maximum security unpredictability.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Controls: Jitter slider + Live Traffic */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Stochastic Jitter Variance Slider */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/70 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-500" />
              Stochastic Jitter:
              <span className="font-mono text-purple-600 dark:text-purple-400 font-black">{antiPredictabilityJitterPct}%</span>
            </span>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={antiPredictabilityJitterPct}
              onChange={(e) => setAntiPredictabilityJitterPct(Number(e.target.value))}
              className="w-28 sm:w-36 accent-purple-600 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              (±{Math.round((antiPredictabilityJitterPct / 100) * 15)}m arrival variance)
            </span>
          </div>

          {/* Traffic Condition Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-amber-500" /> Live Traffic Flow:
            </span>
            {(
              [
                { id: 'light', label: 'Light (1.0x)', color: 'emerald' },
                { id: 'moderate', label: 'Moderate (1.28x)', color: 'blue' },
                { id: 'heavy', label: 'Heavy (1.68x)', color: 'amber' },
                { id: 'incident_gridlock', label: 'Gridlock (2.2x)', color: 'rose' }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTrafficCondition(t.id as TrafficCondition)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer border ${
                  trafficCondition === t.id
                    ? t.id === 'incident_gridlock'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : t.id === 'heavy'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                      : t.id === 'moderate'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Interceptions Alert Strip if any */}
      {activeInterceptions.length > 0 && (
        <div className="bg-rose-950/80 border border-rose-500 text-rose-100 rounded-xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400 animate-bounce" />
              <h3 className="text-sm font-black uppercase tracking-wider text-rose-200 flex items-center gap-2">
                Active Dynamic Ad-Hoc Interceptions ({activeInterceptions.length})
                <span className="bg-rose-800 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                  Routine Patrols Postponed
                </span>
              </h3>
            </div>
            <span className="text-xs text-rose-300 font-mono">
              Live Intercept Queue
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeInterceptions.map((intercept) => (
              <div key={intercept.id} className="bg-rose-900/60 border border-rose-700/80 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="bg-rose-700 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                      {intercept.callPriority || 'URGENT'}
                    </span>
                    <h4 className="text-xs font-black text-white mt-1">
                      {intercept.callTitle || intercept.callSummary || 'Emergency Call Intercept'}
                    </h4>
                    <p className="text-[11px] text-rose-200 font-mono flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-rose-300" />
                      {intercept.locationAddress || intercept.targetAddress || intercept.siteName}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-rose-300 uppercase font-semibold">Assigned Unit</span>
                    <p className="text-xs font-black font-mono text-cyan-300">{intercept.assignedRoverUnit}</p>
                    <p className="text-[10px] text-rose-200">{intercept.assignedGuardName}</p>
                  </div>
                </div>

                <div className="bg-rose-950/60 p-2 rounded text-[11px] space-y-1 text-rose-200">
                  <div className="flex justify-between">
                    <span>Estimated Arrival:</span>
                    <span className="font-bold text-white font-mono">~{intercept.estimatedEtaMinutes || intercept.estimatedArrivalMinutes || 5} min</span>
                  </div>
                  {intercept.preemptedRoutineStopSiteName && (
                    <div className="flex justify-between text-amber-200">
                      <span>Postponed Checkpoint:</span>
                      <span className="font-semibold">{intercept.preemptedRoutineStopSiteName} (+15m)</span>
                    </div>
                  )}
                </div>

                {resolvingInterceptId === intercept.id ? (
                  <div className="pt-2 space-y-2 border-t border-rose-700/60">
                    <input
                      type="text"
                      placeholder="Resolution disposition notes (e.g. Alarm verified secure)..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded bg-rose-950 border border-rose-600 text-white placeholder-rose-400 focus:outline-none"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setResolvingInterceptId(null)}
                        className="px-2.5 py-1 text-xs text-rose-300 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveIntercept(intercept.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow cursor-pointer"
                      >
                        Confirm Call Cleared & Resume Circuit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-rose-300 italic">Officer en-route with priority sirens</span>
                    <button
                      type="button"
                      onClick={() => setResolvingInterceptId(intercept.id)}
                      className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white text-xs font-bold rounded border border-rose-600 transition-all cursor-pointer"
                    >
                      Clear & Resume Normal Rounds
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Interactive Fleet Grid & Inspection Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Rover Unit Selector & Circuit Stats (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Mobile Patrol Units ({rovers.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Live Status
              </span>
            </div>

            {/* Rover Unit Cards */}
            <div className="space-y-2">
              {rovers.map((rover) => {
                const plan = roverPlans[rover.id];
                const isSelected = rover.id === selectedRoverId;
                const completedCount = plan ? plan.stops.filter(s => s.status === 'completed').length : 0;
                const totalStopsCount = plan ? plan.stops.length : 0;

                const statusColor = 
                  rover.status === 'intercepting' ? 'bg-rose-600 text-white animate-pulse' :
                  rover.status === 'dwelling' ? 'bg-emerald-600 text-white' :
                  rover.status === 'break' ? 'bg-amber-600 text-white' :
                  'bg-blue-600 text-white';

                return (
                  <button
                    key={rover.id}
                    type="button"
                    onClick={() => {
                      setSelectedRoverId(rover.id);
                      setSelectedStopId(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-400 ring-2 ring-blue-400/30'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {rover.unitNumber}
                          </span>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full ${statusColor}`}>
                            {rover.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span>Officer: {rover.assignedGuardName}</span>
                          <span className="font-mono text-[10px] text-slate-400">({rover.assignedGuardBadge})</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Sector Group</span>
                        <p className="text-xs font-black font-mono text-blue-600 dark:text-blue-400">
                          {rover.rovingGroup}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar & Current Stop */}
                    {plan && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[180px]">
                            Stop {rover.currentStopIndex + 1}/{totalStopsCount}:{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {plan.stops[rover.currentStopIndex]?.siteName || 'En-route'}
                            </strong>
                          </span>
                          <span className="font-mono text-slate-500 font-bold">
                            {Math.round((completedCount / (totalStopsCount || 1)) * 100)}%
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 dark:bg-blue-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${(completedCount / (totalStopsCount || 1)) * 100}%` }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>Est. Drive: {plan.deadheadDriveMinutes}m</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Saved ~{plan.deadheadSavedMinutes}m
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Rover Inspection Card */}
          {activeRover && activePlan && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  Unit Telemetry: {activeRover.unitNumber}
                </h4>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Wifi className="w-3 h-3 animate-pulse" /> Live Ping
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase">Vehicle Model</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{activeRover.vehicleModel}</p>
                  <p className="text-[10px] font-mono text-slate-400">{activeRover.licensePlate}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase">Fuel & Battery</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Fuel: <span className="font-mono text-emerald-600">{activeRover.fuelLevelPct}%</span>
                  </p>
                  <p className="text-[10px] font-mono text-slate-400">Battery: {activeRover.batteryLevelPct}%</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase">Speed & Heading</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {activeRover.currentCoords.speedKmh || 32} km/h
                  </p>
                  <p className="text-[10px] text-slate-400">Heading: {activeRover.currentCoords.heading || 45}° NE</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase">GPS Accuracy</span>
                  <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">±3.2 meters</p>
                  <p className="text-[10px] text-slate-400">Passive OBD-II + App</p>
                </div>
              </div>

              {/* Quick Rover Simulation & Dispatch Controls */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isSimulatingGps}
                  onClick={() => handleSimulateGeofence(activeRover.id)}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 text-xs font-mono font-bold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Simulate vehicle moving inside geofence centroid to trigger auto-arrival"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${isSimulatingGps ? 'animate-spin' : 'animate-ping'}`} />
                  <span>
                    {activeRover.status === 'dwelling' 
                      ? 'Simulate Departure -> Next Stop' 
                      : 'Simulate GPS Geofence Auto-Arrival'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Circuit Workspace, Topology Map & Checkpoint Queue (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">
          {/* Sub-view Navigation Bar */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('topology_map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'topology_map'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Topological Circuit Map</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('circuit_queue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'circuit_queue'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                <span>Patrol Checkpoint Queue ({activePlan?.stops.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('telemetry_stream')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'telemetry_stream'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Telemetry & Geofence Logs</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">
                Active Circuit:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {activeRover?.rovingGroup || 'Group Alpha'}
                </strong>
              </span>
            </div>
          </div>

          {/* TAB 1: TOPOLOGY CIRCUIT MAP */}
          {activeTab === 'topology_map' && (
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 shadow-xl space-y-4 text-white">
              {/* Map Controls & Legend Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                    City Patrol Circuit Visualizer
                    <span className="bg-blue-900/60 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/30">
                      Sector Cluster: {activeRover?.rovingGroup}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    2-Opt Euclidean topological network. Radiuses show 100m–150m passive geofence detection zones.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-[10px]">
                  <span className="flex items-center gap-1 text-rose-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span> P1 SLA
                  </span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> P2 Window
                  </span>
                  <span className="flex items-center gap-1 text-blue-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> P3 Routine
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed
                  </span>
                </div>
              </div>

              {/* Interactive Vector Topology Canvas */}
              <div className="relative w-full h-80 sm:h-96 bg-slate-900/90 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center p-4">
                {/* Sector Grid Lines Background */}
                <div 
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #0f172a 1px)',
                    backgroundSize: '24px 24px',
                    backgroundPosition: '0 0, 12px 12px'
                  }}
                ></div>

                {/* SVG Circuit Routing Connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Route Paths between active plan stops */}
                  {activePlan && activePlan.stops.length > 1 && (
                    <polyline
                      points={activePlan.stops.map((stop, idx) => {
                        // Map lat/long to canvas coordinates
                        const total = activePlan.stops.length;
                        const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
                        const radiusX = 140;
                        const radiusY = 110;
                        const cx = 200 + Math.cos(angle) * radiusX;
                        const cy = 160 + Math.sin(angle) * radiusY;
                        return `${cx},${cy}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      strokeDasharray="6,4"
                      className="opacity-75"
                    />
                  )}
                </svg>

                {/* Render Checkpoint Nodes on Map */}
                <div className="relative w-full h-full max-w-lg max-h-80 mx-auto">
                  {activePlan && activePlan.stops.map((stop, idx) => {
                    const total = activePlan.stops.length;
                    const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 42; // Percentage from center
                    const radiusY = 40;
                    const leftPct = 50 + Math.cos(angle) * radiusX;
                    const topPct = 50 + Math.sin(angle) * radiusY;

                    const isCurrent = activeRover?.currentStopIndex === idx;
                    const isCompleted = stop.status === 'completed';
                    const isDwelling = stop.status === 'dwelling';
                    const isSelected = selectedStopId === stop.id;

                    const markerColor = 
                      stop.isAdHocIntercept ? 'bg-rose-600 border-rose-300 ring-4 ring-rose-500/40 text-white' :
                      isCompleted ? 'bg-emerald-600 border-emerald-400 text-white' :
                      isDwelling ? 'bg-emerald-500 border-emerald-300 ring-4 ring-emerald-400/40 text-slate-950 font-black animate-pulse' :
                      isCurrent ? 'bg-blue-600 border-cyan-300 ring-4 ring-cyan-400/40 text-white' :
                      stop.slaPriority === 'P1_MANDATORY_SLA' || stop.slaPriority === 'P1' ? 'bg-rose-700 border-rose-400 text-white' :
                      stop.slaPriority === 'P2_CONTRACTUAL_WINDOW' || stop.slaPriority === 'P2' ? 'bg-amber-600 border-amber-300 text-white' :
                      'bg-slate-800 border-slate-600 text-slate-200';

                    return (
                      <div
                        key={stop.id}
                        style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                      >
                        {/* Geofence Radar Pulse when Active */}
                        {(isCurrent || isDwelling) && (
                          <div className="absolute -inset-4 rounded-full border border-cyan-400/60 animate-ping pointer-events-none"></div>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedStopId(stop.id)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-transform cursor-pointer shadow-lg hover:scale-125 ${markerColor} ${
                            isSelected ? 'scale-125 ring-2 ring-white' : ''
                          }`}
                          title={`Stop ${idx + 1}: ${stop.siteName} (${stop.estimatedArrival})`}
                        >
                          {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </button>

                        {/* Node Label Tooltip */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 bg-slate-950/90 text-white border border-slate-700 px-2 py-1 rounded text-[10px] whitespace-nowrap shadow-xl opacity-90 group-hover:opacity-100 z-30 pointer-events-none">
                          <p className="font-bold flex items-center gap-1">
                            {stop.siteName}
                          </p>
                          <p className="text-[9px] font-mono text-cyan-300">
                            ETA: {stop.estimatedArrival} ({stop.targetDwellMinutes}m dwell)
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Central Sector Radar Centroid */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center pointer-events-none">
                    <div className="p-3 bg-blue-950/80 border border-blue-500/40 rounded-full inline-block shadow-2xl backdrop-blur-xs">
                      <Car className="w-5 h-5 text-cyan-400 animate-bounce" />
                    </div>
                    <p className="text-[10px] font-mono font-bold text-cyan-300 mt-1">
                      {activeRover?.unitNumber}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono">
                      {activeRover?.rovingGroup} Circuit
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Stop Details Popout */}
              {selectedStopId && (
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 space-y-2 animate-in fade-in">
                  {(() => {
                    const stop = activePlan?.stops.find(s => s.id === selectedStopId);
                    if (!stop) return null;

                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded font-mono">
                              Checkpoint #{stop.sequenceOrder + 1}
                            </span>
                            <h5 className="text-xs font-black text-white">{stop.siteName}</h5>
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-600/40">
                              {stop.slaPriority}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">{stop.siteAddress}</p>
                          {stop.postInstructions && (
                            <p className="text-[10px] text-slate-300 italic">{stop.postInstructions}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right text-[11px] font-mono">
                            <span className="text-slate-400">ETA Window:</span>{' '}
                            <strong className="text-cyan-300">{stop.estimatedArrival} - {stop.estimatedDeparture}</strong>
                          </div>
                          {onSelectSite && (
                            <button
                              type="button"
                              onClick={() => onSelectSite(stop.siteId)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded border border-slate-600"
                            >
                              Inspect Site
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PATROL CHECKPOINT QUEUE TABLE */}
          {activeTab === 'circuit_queue' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Route className="w-4 h-4 text-blue-600" />
                    Optimized Sequence Queue: {activeRover?.unitNumber}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Stops ordered via 2-opt TSP with mandatory contract SLA time-windows and jitter randomization.
                  </p>
                </div>

                <div className="text-right font-mono text-xs text-slate-500">
                  Total Deadhead: <strong className="text-slate-800 dark:text-slate-200">{activePlan?.deadheadDriveMinutes}m</strong>
                </div>
              </div>

              {/* Table of Checkpoints */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold border-y border-slate-200 dark:border-slate-700">
                      <th className="py-2 px-2.5">#</th>
                      <th className="py-2 px-2.5">Site Name & Address</th>
                      <th className="py-2 px-2.5">SLA Tier</th>
                      <th className="py-2 px-2.5">ETA Arrival</th>
                      <th className="py-2 px-2.5">Target Dwell</th>
                      <th className="py-2 px-2.5">Status</th>
                      <th className="py-2 px-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activePlan?.stops.map((stop, idx) => {
                      const isCurrent = activeRover?.currentStopIndex === idx;
                      const isCompleted = stop.status === 'completed';
                      const isDwelling = stop.status === 'dwelling';

                      return (
                        <tr
                          key={stop.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                            isCurrent ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                          }`}
                        >
                          <td className="py-2.5 px-2.5 font-mono font-bold text-slate-600 dark:text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-2.5">
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {stop.isAdHocIntercept && (
                                <span className="bg-rose-600 text-white text-[9px] px-1 py-0.2 rounded font-black">
                                  INTERCEPT
                                </span>
                              )}
                              {stop.siteName}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs">
                              {stop.siteAddress}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              stop.slaPriority === 'P1_MANDATORY_SLA' || stop.slaPriority === 'P1'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : stop.slaPriority === 'P2_CONTRACTUAL_WINDOW' || stop.slaPriority === 'P2'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {stop.slaPriority}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {stop.estimatedArrival}
                            {stop.stochasticJitterAppliedMinutes ? (
                              <span className="text-[9px] text-purple-600 dark:text-purple-400 ml-1">
                                (jitter {stop.stochasticJitterAppliedMinutes > 0 ? `+${stop.stochasticJitterAppliedMinutes}` : stop.stochasticJitterAppliedMinutes}m)
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2.5 px-2.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {stop.targetDwellMinutes} mins
                          </td>
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : isDwelling
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 animate-pulse font-black'
                                : isCurrent
                                ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {stop.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                            {isCurrent && (
                              <button
                                type="button"
                                onClick={() => handleSimulateGeofence(activeRover!.id)}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded shadow-xs cursor-pointer"
                              >
                                {isDwelling ? 'Complete Dwell' : 'Simulate Arrival'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TELEMETRY STREAM & PASSIVE GEOFENCE LOGS */}
          {activeTab === 'telemetry_stream' && (
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 shadow-xl space-y-3 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    Live Mobile Telemetry & Passive Geofence Stream
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Passive arrival/departure timestamps, dwell compliance meters, speed anomalies, and dispatch reroutes.
                  </p>
                </div>

                {/* Filter by Mobile Unit */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Unit Filter:</span>
                  <select
                    value={telemetryFilterRover}
                    onChange={(e) => setTelemetryFilterRover(e.target.value)}
                    className="text-xs bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white focus:outline-none"
                  >
                    <option value="all">All Mobile Units ({rovers.length})</option>
                    {rovers.map(r => (
                      <option key={r.id} value={r.id}>{r.unitNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Terminal Logs View */}
              <div className="space-y-1.5 max-h-96 overflow-y-auto font-mono text-xs pr-1">
                {filteredTelemetry.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    No telemetry events recorded yet.
                  </div>
                ) : (
                  filteredTelemetry.map((log) => {
                    const badgeColor = 
                      log.eventType === 'GEOFENCE_AUTO_ARRIVAL' ? 'bg-emerald-900/80 text-emerald-300 border-emerald-600' :
                      log.eventType === 'GEOFENCE_AUTO_DEPARTURE' ? 'bg-blue-900/80 text-blue-300 border-blue-600' :
                      log.eventType === 'DWELL_SLA_MET' ? 'bg-cyan-900/80 text-cyan-300 border-cyan-600' :
                      log.eventType === 'AD_HOC_INTERCEPT_DISPATCHED' ? 'bg-rose-900/80 text-rose-300 border-rose-600' :
                      log.eventType === 'STOCHASTIC_JITTER_APPLIED' ? 'bg-purple-900/80 text-purple-300 border-purple-600' :
                      'bg-slate-800 text-slate-300 border-slate-700';

                    return (
                      <div
                        key={log.id}
                        className="p-2.5 rounded bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-sans">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badgeColor}`}>
                              {log.eventType}
                            </span>
                            <span className="text-cyan-300 font-bold font-sans">
                              {log.roverUnit}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              ({log.guardName})
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {log.notes}
                          </p>
                        </div>

                        {log.coords && (
                          <div className="text-[10px] text-slate-500 text-right whitespace-nowrap hidden sm:block">
                            GPS: {log.coords.latitude.toFixed(4)}, {log.coords.longitude.toFixed(4)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AD-HOC INTERCEPTION DISPATCH MODAL */}
      {isInterceptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-rose-600/80 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-600/20 rounded-lg text-rose-400 border border-rose-500/40">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Dispatch Dynamic Ad-Hoc Interception
                  </h3>
                  <p className="text-xs text-slate-400">
                    Reroutes nearest available mobile unit to emergency call or alarm drop.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInterceptModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDispatchIntercept} className="space-y-3">
              {/* Select Active CFS Call */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Select Call for Service / Alarm Drop:
                </label>
                <select
                  required
                  value={selectedCallIdForIntercept}
                  onChange={(e) => setSelectedCallIdForIntercept(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="">-- Choose active pending call --</option>
                  {openCalls.map(call => (
                    <option key={call.id} value={call.id}>
                      [{call.priority}] {call.callType} - {call.siteName}: {call.summary.slice(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Address Details */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Target Location Address (Optional override):
                </label>
                <input
                  type="text"
                  placeholder="e.g. 400 Pine St - Building B Rear Loading Dock"
                  value={customInterceptAddress}
                  onChange={(e) => setCustomInterceptAddress(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                />
              </div>

              {/* Mobile Unit Override Option */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Assigned Mobile Unit (Default: Auto-Ranked Nearest by GPS ETA):
                </label>
                <select
                  value={selectedRoverOverride}
                  onChange={(e) => setSelectedRoverOverride(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                >
                  <option value="">⚡ Auto-Calculate Nearest Unit (Recommended)</option>
                  {rovers.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.unitNumber} - Officer {r.assignedGuardName} ({r.rovingGroup} - {r.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Dynamic Queue Realignment Impact:
                </p>
                <p className="text-[11px] text-rose-300">
                  Injects emergency intercept stop to position #1. Postpones remaining routine rounds down the queue (+15m SLA shift) automatically.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInterceptModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-lg shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Confirm Dispatch Intercept</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
