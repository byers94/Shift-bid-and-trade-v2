import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  GpsBreadcrumb, 
  ScheduledShift, 
  StandardShiftReport, 
  SiteProfile 
} from '../../types/shift';
import { 
  calculateBreadcrumbMetrics, 
  BreadcrumbTrailMetrics 
} from '../../utils/breadcrumbHelper';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Battery,
  BatteryCharging,
  Smartphone,
  Eye,
  Download,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Navigation,
  List,
  Layers,
  Activity,
  Zap
} from 'lucide-react';

interface ShiftBreadcrumbsModalProps {
  isOpen: boolean;
  onClose: () => void;
  breadcrumbs: GpsBreadcrumb[];
  shift?: ScheduledShift | null;
  report?: StandardShiftReport | null;
  site?: SiteProfile | null;
  guardName?: string;
  guardBadge?: string;
  shiftTitle?: string;
}

export const ShiftBreadcrumbsModal: React.FC<ShiftBreadcrumbsModalProps> = ({
  isOpen,
  onClose,
  breadcrumbs = [],
  shift,
  report,
  site,
  guardName,
  guardBadge,
  shiftTitle
}) => {
  if (!isOpen) return null;

  const resolvedGuardName = guardName || shift?.guardName || report?.guardName || 'Security Officer';
  const resolvedGuardBadge = guardBadge || shift?.guardBadge || report?.guardBadge || 'SEC-000';
  const resolvedSiteName = site?.name || shift?.siteName || report?.siteName || 'Designated Facility';
  const resolvedShiftId = shift?.id || report?.shiftId || report?.reportNumber || 'SHIFT-SESSION';

  // Metrics calculation
  const metrics: BreadcrumbTrailMetrics = useMemo(() => {
    return calculateBreadcrumbMetrics(breadcrumbs);
  }, [breadcrumbs]);

  // View mode: Map + Scrubber vs Detailed Telemetry Log
  const [activeTab, setActiveTab] = useState<'map' | 'log'>('map');

  // Playback & Scrubber State
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    return breadcrumbs.length > 0 ? breadcrumbs.length - 1 : 0;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'geofence_only' | 'breaches_only' | 'background_only'>('all');

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying || breadcrumbs.length === 0) return;

    const intervalMs = Math.max(80, Math.round(1000 / playbackSpeed));
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= breadcrumbs.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, breadcrumbs.length]);

  // Keep selectedPoint synced with current scrubber index if playing
  useEffect(() => {
    if (isPlaying) {
      setSelectedPointIndex(currentIndex);
    }
  }, [currentIndex, isPlaying]);

  // Active point
  const activeCrumb: GpsBreadcrumb | undefined = breadcrumbs[selectedPointIndex ?? currentIndex] || breadcrumbs[breadcrumbs.length - 1];

  // SVG Coordinates Projection Math
  const mapData = useMemo(() => {
    if (breadcrumbs.length === 0) {
      return {
        points: [],
        minLat: 0,
        maxLat: 0,
        minLng: 0,
        maxLng: 0,
        centerLat: site?.latitude || 47.6062,
        centerLng: site?.longitude || -122.3321,
        pathD: '',
        currentPathD: ''
      };
    }

    const lats = breadcrumbs.map(b => b.latitude);
    const lngs = breadcrumbs.map(b => b.longitude);
    if (site?.latitude && site?.longitude) {
      lats.push(site.latitude);
      lngs.push(site.longitude);
    }

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = Math.max(maxLat - minLat, 0.001);
    const lngSpan = Math.max(maxLng - minLng, 0.001);

    // Padding in SVG space (width 700, height 420)
    const svgW = 700;
    const svgH = 420;
    const pad = 40;

    const project = (lat: number, lng: number) => {
      const x = pad + ((lng - minLng) / lngSpan) * (svgW - pad * 2);
      // Invert Y because latitude increases upwards but SVG Y increases downwards
      const y = pad + ((maxLat - lat) / latSpan) * (svgH - pad * 2);
      return { x, y };
    };

    const projectedPoints = breadcrumbs.map((b, idx) => {
      const { x, y } = project(b.latitude, b.longitude);
      return { ...b, x, y, index: idx };
    });

    const centerPoint = site?.latitude && site?.longitude 
      ? project(site.latitude, site.longitude)
      : project((minLat + maxLat) / 2, (minLng + maxLng) / 2);

    // Build SVG path for all breadcrumbs
    const pathSegments = projectedPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    const pathD = pathSegments.join(' ');

    // Build SVG path up to current scrubber index
    const activeSegments = projectedPoints
      .slice(0, currentIndex + 1)
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    const currentPathD = activeSegments.join(' ');

    return {
      points: projectedPoints,
      minLat,
      maxLat,
      minLng,
      maxLng,
      centerLat: site?.latitude || (minLat + maxLat) / 2,
      centerLng: site?.longitude || (minLng + maxLng) / 2,
      centerPoint,
      pathD,
      currentPathD
    };
  }, [breadcrumbs, site, currentIndex]);

  // Filtered list for detailed log
  const filteredLog = useMemo(() => {
    return breadcrumbs.filter(b => {
      if (filterMode === 'geofence_only') return b.inGeofence;
      if (filterMode === 'breaches_only') return !b.inGeofence || b.status === 'breached' || b.status === 'debounce_pending';
      if (filterMode === 'background_only') return b.isBackground;
      return true;
    });
  }, [breadcrumbs, filterMode]);

  // Export CSV handler
  const handleExportCsv = () => {
    if (breadcrumbs.length === 0) return;

    const headers = [
      'Index',
      'Timestamp (ISO)',
      'Time (Local)',
      'Latitude',
      'Longitude',
      'Accuracy (m)',
      'Speed (m/s)',
      'Distance to Center (m)',
      'Inside Geofence',
      'Status',
      'Battery (%)',
      'Background Mode',
      'Checkpoint'
    ];

    const rows = breadcrumbs.map((b, idx) => [
      idx + 1,
      b.timestamp,
      new Date(b.timestamp).toLocaleTimeString(),
      b.latitude,
      b.longitude,
      b.accuracy ?? 5,
      b.speed ?? 0,
      b.distanceMeters ?? 0,
      b.inGeofence ? 'YES' : 'NO',
      b.status,
      b.batteryLevel ?? 'N/A',
      b.isBackground ? 'BACKGROUND / SCREEN OFF' : 'FOREGROUND',
      `"${b.parcelOrCheckpointName || 'Patrol Waypoint'}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GPS-Breadcrumb-Trail-${resolvedGuardBadge}-${resolvedShiftId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      id="shift-breadcrumbs-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div 
        id="shift-breadcrumbs-modal-content"
        className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight truncate">
                  30s GPS Breadcrumb Telemetry Trail
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {breadcrumbs.length} Fixes (30s Intervals)
                </span>
                {shift?.status && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    shift.status === 'on_duty' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                      : 'bg-slate-700/40 text-slate-300 border border-slate-600'
                  }`}>
                    {shift.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Officer <span className="text-slate-200 font-semibold">{resolvedGuardName}</span> ({resolvedGuardBadge}) • {resolvedSiteName} • {shiftTitle || resolvedShiftId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="export-breadcrumb-csv-btn"
              onClick={handleExportCsv}
              disabled={breadcrumbs.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
              title="Export 30-second GPS breadcrumb telemetry log to CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export CSV</span>
            </button>
            <button
              id="close-breadcrumb-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800/80">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Trail Coverage</span>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">
              {metrics.totalDistanceFormatted}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {metrics.patrolDurationMinutes} min patrol • {metrics.averageSpeedKmh} km/h avg
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Geofence Compliance</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
              {metrics.complianceRatePct}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {metrics.inGeofencePoints} on-site / {metrics.outOfGeofencePoints} departures
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Continuous Telemetry</span>
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">
              {metrics.backgroundPercentage}% Background
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {metrics.backgroundPointsCount} fixes logged with screen off
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Device Power Health</span>
              <Battery className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
              {metrics.currentBatteryPct ?? 88}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              -{metrics.batteryDrainPct}% shift drain • WakeLock OK
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              id="tab-map-view"
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'map'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Interactive Trail Map</span>
            </button>
            <button
              id="tab-log-view"
              onClick={() => setActiveTab('log')}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'log'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>30s Telemetry Log Table ({breadcrumbs.length})</span>
            </button>
          </div>

          {activeTab === 'map' && (
            <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Inside Perimeter
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Dwell / Warning
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Perimeter Breach
              </span>
            </div>
          )}
        </div>

        {/* Content Body: Map or Table */}
        <div className="flex-1 overflow-y-auto min-h-[320px] p-3 sm:p-5">
          {activeTab === 'map' ? (
            <div className="space-y-3">
              {/* Tactical Radar / SVG Canvas Frame */}
              <div className="relative w-full h-[320px] sm:h-[400px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center select-none">
                {/* Background Grid Pattern */}
                <div 
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                  }}
                />

                {breadcrumbs.length === 0 ? (
                  <div className="text-center p-6 text-slate-400">
                    <Navigation className="w-12 h-12 text-slate-600 mx-auto mb-2 animate-bounce" />
                    <p className="text-sm font-semibold text-slate-300">No GPS breadcrumbs logged yet</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Breadcrumbs are automatically recorded every 30 seconds once the guard clocks in and continuous telemetry is active.
                    </p>
                  </div>
                ) : (
                  <svg 
                    viewBox="0 0 700 420" 
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Facility Perimeter Circle */}
                    {mapData.centerPoint && (
                      <g id="facility-perimeter-group">
                        <circle
                          cx={mapData.centerPoint.x}
                          cy={mapData.centerPoint.y}
                          r={130}
                          fill="#0284c7"
                          fillOpacity="0.05"
                          stroke="#0284c7"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                        />
                        <circle
                          cx={mapData.centerPoint.x}
                          cy={mapData.centerPoint.y}
                          r={170}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="1"
                          strokeDasharray="2 3"
                          strokeOpacity="0.35"
                        />
                        {/* Center Pin Marker */}
                        <circle
                          cx={mapData.centerPoint.x}
                          cy={mapData.centerPoint.y}
                          r={6}
                          fill="#0284c7"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <text
                          x={mapData.centerPoint.x}
                          y={mapData.centerPoint.y - 12}
                          fill="#7dd3fc"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {resolvedSiteName} (Perimeter Center)
                        </text>
                      </g>
                    )}

                    {/* Background Full Polyline Path (Dimmed) */}
                    {mapData.pathD && (
                      <path
                        d={mapData.pathD}
                        fill="none"
                        stroke="#334155"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Active Scrubbed Path (Glowing Cyan / Blue) */}
                    {mapData.currentPathD && (
                      <path
                        d={mapData.currentPathD}
                        fill="none"
                        stroke="url(#trailGrad)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#glow)"
                      />
                    )}

                    {/* All Breadcrumb Dots along the Trail */}
                    {mapData.points.map((pt, idx) => {
                      const isPastOrCurrent = idx <= currentIndex;
                      const isSelected = selectedPointIndex === idx || currentIndex === idx;
                      const isBreach = !pt.inGeofence || pt.status === 'breached' || pt.status === 'debounce_pending';
                      const dotColor = isBreach ? '#ef4444' : pt.isBackground ? '#06b6d4' : '#10b981';

                      return (
                        <g 
                          key={pt.id || idx}
                          onClick={() => {
                            setSelectedPointIndex(idx);
                            setCurrentIndex(idx);
                          }}
                          className="cursor-pointer group"
                        >
                          {/* Outer pulse ring for currently scrubbed fix */}
                          {isSelected && (
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={11}
                              fill="none"
                              stroke={dotColor}
                              strokeWidth="2"
                              className="animate-ping"
                              opacity={0.7}
                            />
                          )}

                          {/* Fix Dot */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isSelected ? 6.5 : isPastOrCurrent ? 3.5 : 2}
                            fill={isPastOrCurrent ? dotColor : '#475569'}
                            stroke="#0f172a"
                            strokeWidth={isSelected ? 2 : 1}
                            opacity={isPastOrCurrent ? 1 : 0.35}
                          />

                          {/* Interval Index Number on key points or when selected */}
                          {(isSelected || idx === 0 || idx === mapData.points.length - 1) && (
                            <text
                              x={pt.x}
                              y={pt.y + (isSelected ? 16 : 12)}
                              fill="#ffffff"
                              fontSize={isSelected ? '10' : '8'}
                              fontWeight="bold"
                              textAnchor="middle"
                              className="pointer-events-none drop-shadow"
                            >
                              #{idx + 1}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Start Position Marker */}
                    {mapData.points[0] && (
                      <g transform={`translate(${mapData.points[0].x - 10}, ${mapData.points[0].y - 24})`}>
                        <rect width="20" height="14" rx="3" fill="#10b981" />
                        <text x="10" y="10" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                          START
                        </text>
                      </g>
                    )}

                    {/* Current Scrubber Head Position Marker */}
                    {mapData.points[currentIndex] && (
                      <g transform={`translate(${mapData.points[currentIndex].x}, ${mapData.points[currentIndex].y})`}>
                        <circle r={9} fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                        <circle r={3} fill="#0f172a" />
                      </g>
                    )}
                  </svg>
                )}

                {/* Floating Map Overlay Info Box for Selected Fix */}
                {activeCrumb && (
                  <div className="absolute top-3 left-3 max-w-[280px] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 text-xs shadow-xl pointer-events-none">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        Fix #{currentIndex + 1} of {breadcrumbs.length}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(activeCrumb.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                      <div>
                        <span className="text-slate-400">Lat:</span>{' '}
                        <span className="font-mono text-slate-200">{activeCrumb.latitude.toFixed(5)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Lng:</span>{' '}
                        <span className="font-mono text-slate-200">{activeCrumb.longitude.toFixed(5)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Accuracy:</span>{' '}
                        <span className="text-slate-200">±{activeCrumb.accuracy ?? 5}m</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Speed:</span>{' '}
                        <span className="text-slate-200">{activeCrumb.speed ?? 1.1} m/s</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">Geofence:</span>
                        <span className={`font-semibold ${activeCrumb.inGeofence ? 'text-emerald-400' : 'text-red-400 font-bold'}`}>
                          {activeCrumb.inGeofence ? '✓ Inside Perimeter' : '⚠️ Outside Boundary'}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-slate-400">Telemetry:</span>
                        <span className="text-cyan-300 font-mono">
                          {activeCrumb.isBackground ? 'Screen-Off / Holster' : 'Foreground Screen'} • {activeCrumb.batteryLevel ?? 92}% Batt
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Playback Scrubber & Timeline Bar */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">Shift Trail Scrubber</span>
                    <span className="text-blue-400 font-mono">
                      {currentIndex + 1} / {breadcrumbs.length} fixes
                    </span>
                  </div>
                  <div className="font-mono text-slate-300 text-xs">
                    {breadcrumbs[0] && new Date(breadcrumbs[0].timestamp).toLocaleTimeString()}
                    {' → '}
                    {activeCrumb && new Date(activeCrumb.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  id="breadcrumb-timeline-slider"
                  type="range"
                  min={0}
                  max={Math.max(0, breadcrumbs.length - 1)}
                  value={currentIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setCurrentIndex(idx);
                    setSelectedPointIndex(idx);
                  }}
                  className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
                />

                {/* Scrubber Transport Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      id="scrubber-restart-btn"
                      onClick={() => {
                        setCurrentIndex(0);
                        setSelectedPointIndex(0);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                      title="Rewind to start of shift"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      id="scrubber-prev-btn"
                      onClick={() => {
                        setCurrentIndex(prev => Math.max(0, prev - 1));
                        setSelectedPointIndex(prev => Math.max(0, (prev ?? 0) - 1));
                      }}
                      disabled={currentIndex <= 0}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition disabled:opacity-40"
                      title="Previous 30-sec fix"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      id="scrubber-play-pause-btn"
                      onClick={() => {
                        if (currentIndex >= breadcrumbs.length - 1) {
                          setCurrentIndex(0);
                        }
                        setIsPlaying(!isPlaying);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition flex items-center gap-1.5 ${
                        isPlaying 
                          ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlaying ? 'Pause Playback' : 'Play Trail'}</span>
                    </button>
                    <button
                      id="scrubber-next-btn"
                      onClick={() => {
                        setCurrentIndex(prev => Math.min(breadcrumbs.length - 1, prev + 1));
                        setSelectedPointIndex(prev => Math.min(breadcrumbs.length - 1, (prev ?? 0) + 1));
                      }}
                      disabled={currentIndex >= breadcrumbs.length - 1}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition disabled:opacity-40"
                      title="Next 30-sec fix"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Playback speed selector */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-500 px-1 font-semibold uppercase">Speed:</span>
                    {[1, 2, 5, 10].map(speed => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition ${
                          playbackSpeed === speed
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Detailed 30s Telemetry Fix Log Table */
            <div className="space-y-3">
              {/* Filter Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-400 mr-1">Filter Fixes:</span>
                  {[
                    { id: 'all', label: `All (${breadcrumbs.length})` },
                    { id: 'geofence_only', label: `Inside (${metrics.inGeofencePoints})` },
                    { id: 'breaches_only', label: `Departures (${metrics.outOfGeofencePoints})` },
                    { id: 'background_only', label: `Screen-Off (${metrics.backgroundPointsCount})` }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilterMode(f.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        filterMode === f.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-slate-500">
                  Showing {filteredLog.length} of {breadcrumbs.length} telemetry records
                </span>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Fix #</th>
                      <th className="py-2.5 px-3">Timestamp (30s)</th>
                      <th className="py-2.5 px-3">GPS Coordinates</th>
                      <th className="py-2.5 px-3">Accuracy</th>
                      <th className="py-2.5 px-3">Speed</th>
                      <th className="py-2.5 px-3">Perimeter Status</th>
                      <th className="py-2.5 px-3">Battery</th>
                      <th className="py-2.5 px-3">Telemetry Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {filteredLog.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                          No breadcrumb fixes match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredLog.map((crumb, idx) => {
                        const isBreach = !crumb.inGeofence || crumb.status === 'breached';
                        return (
                          <tr 
                            key={crumb.id || idx}
                            className={`hover:bg-slate-900/70 transition cursor-pointer ${
                              isBreach ? 'bg-red-950/20' : ''
                            }`}
                            onClick={() => {
                              const originalIdx = breadcrumbs.findIndex(b => b.id === crumb.id);
                              if (originalIdx >= 0) {
                                setCurrentIndex(originalIdx);
                                setSelectedPointIndex(originalIdx);
                                setActiveTab('map');
                              }
                            }}
                          >
                            <td className="py-2 px-3 text-slate-400 font-bold">
                              #{idx + 1}
                            </td>
                            <td className="py-2 px-3 text-slate-200">
                              {new Date(crumb.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="py-2 px-3 text-cyan-300">
                              {crumb.latitude.toFixed(6)}, {crumb.longitude.toFixed(6)}
                            </td>
                            <td className="py-2 px-3 text-slate-400">
                              ±{crumb.accuracy ?? 5}m
                            </td>
                            <td className="py-2 px-3 text-slate-300">
                              {crumb.speed ?? 1.2} m/s
                            </td>
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold ${
                                crumb.inGeofence
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                  : 'bg-red-950/80 text-red-300 border border-red-800/60'
                              }`}>
                                {crumb.inGeofence ? 'Inside Site' : 'Outside Boundary'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-amber-300">
                              {crumb.batteryLevel ?? 90}%
                            </td>
                            <td className="py-2 px-3 text-slate-300 font-sans">
                              {crumb.isBackground ? (
                                <span className="text-cyan-400 flex items-center gap-1 text-[10px]">
                                  <Smartphone className="w-3 h-3" /> Screen-Off
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">Foreground</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>
              All coordinates continuously acquired via W3C Geolocation API at 30-second cadence.
            </span>
          </div>
          <button
            id="close-breadcrumbs-footer-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition ml-auto"
          >
            Close Telemetry Review
          </button>
        </div>
      </div>
    </div>
  );
};
