import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { GuardLiveTrackingItem, ScheduledShift, SiteProfile, DepartureReasonType } from '../../types/shift';
import { getCurrentLocation, calculateDistanceMeters, GeoCoordinates, formatDistance } from '../../utils/geo';
import { formatElapsedTimer } from '../../utils/time';
import { 
  Compass, 
  MapPin, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  Clock, 
  Timer, 
  PhoneCall, 
  User, 
  Building2, 
  Search, 
  Filter, 
  Layers, 
  Maximize2, 
  Minimize2, 
  Plus, 
  Minus, 
  RotateCcw, 
  Radio, 
  Navigation, 
  Crosshair, 
  ExternalLink, 
  ChevronRight, 
  Check, 
  X, 
  Zap, 
  Bell, 
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';

interface GuardMapDashboardProps {
  onScheduleShift?: (guardId?: string) => void;
  onSelectSite?: (siteName: string) => void;
  initialSelectedGuardId?: string | null;
}

export const GuardMapDashboard: React.FC<GuardMapDashboardProps> = ({
  onScheduleShift,
  onSelectSite,
  initialSelectedGuardId = null
}) => {
  const { 
    getGuardsLiveTracking, 
    sitesList, 
    guardsList, 
    opsPhone, 
    showToast, 
    excuseGeofenceDepartureByOps, 
    clearGeofenceBreach, 
    updateGuardGeofenceState,
    escalateGeofenceBreach,
    theme
  } = useShiftOps();

  // 1-second live ticker for real-time timers
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Map viewport states
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mapStyle, setMapStyle] = useState<'tactical' | 'satellite' | 'high_contrast'>('tactical');

  // Emergency & Status Filters
  const [emergencyHighlightMode, setEmergencyHighlightMode] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_duty' | 'breach_only' | 'on_break'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuardId, setSelectedGuardId] = useState<string | null>(initialSelectedGuardId);
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState(true);

  // Geolocation API State
  const [deviceLocation, setDeviceLocation] = useState<GeoCoordinates | null>(null);
  const [geoApiStatus, setGeoApiStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'fallback'>('idle');
  const [geoApiAccuracy, setGeoApiAccuracy] = useState<number | null>(null);
  const [lastGeoFixTime, setLastGeoFixTime] = useState<Date | null>(null);
  const [syncToGuardModalOpen, setSyncToGuardModalOpen] = useState(false);

  // Supervisor Excusal Modal
  const [excusalModalGuard, setExcusalModalGuard] = useState<GuardLiveTrackingItem | null>(null);
  const [excusalReasonInput, setExcusalReasonInput] = useState<DepartureReasonType>('Authorized Meal Break');
  const [excusalNotesInput, setExcusalNotesInput] = useState('');

  // Container ref for responsive projection
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 550
  });

  // Observe container dimensions
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setContainerDimensions({
            width: Math.floor(entry.contentRect.width),
            height: Math.floor(entry.contentRect.height)
          });
        }
      }
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch device GPS on mount using Geolocation API
  const requestDeviceGeolocation = () => {
    setGeoApiStatus('requesting');
    getCurrentLocation({ latitude: 47.6117, longitude: -122.3533, accuracy: 12 })
      .then((coords) => {
        setDeviceLocation(coords);
        setGeoApiAccuracy(coords.accuracy || 10);
        setLastGeoFixTime(new Date());
        setGeoApiStatus('active');
        showToast('Device GPS Connected', `Location locked (±${coords.accuracy || 10}m accuracy).`, 'info');
      })
      .catch((err) => {
        setGeoApiStatus('fallback');
        // Seattle Maritime District baseline
        const fallback = { latitude: 47.6117, longitude: -122.3533, accuracy: 25 };
        setDeviceLocation(fallback);
        setGeoApiAccuracy(25);
        setLastGeoFixTime(new Date());
      });
  };

  useEffect(() => {
    requestDeviceGeolocation();
  }, []);

  // Get active guards
  const allLiveGuards = getGuardsLiveTracking();

  // Active guards filter
  const activeGuards = useMemo(() => {
    return allLiveGuards.filter((g) => {
      // Guard is on duty, on break, or has a scheduled shift today
      return g.currentStatus === 'on_duty' || g.currentStatus === 'on_break' || g.currentStatus === 'late' || (g.activeShift && g.activeShift.status !== 'completed');
    });
  }, [allLiveGuards]);

  // Breaching / departing guards
  const breachGuards = useMemo(() => {
    return activeGuards.filter(
      (g) => g.offSiteBreachStatus === 'breached_unacknowledged' || g.offSiteBreachStatus === 'debounce_pending'
    );
  }, [activeGuards]);

  // Overdue / Late guards
  const lateGuards = useMemo(() => {
    return activeGuards.filter((g) => g.currentStatus === 'late' || g.activeShift?.isLate);
  }, [activeGuards]);

  // Filtered guards by search and status
  const displayedGuards = useMemo(() => {
    return activeGuards.filter((guard) => {
      // Search
      const matchesSearch =
        !searchQuery ||
        guard.guardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guard.guardBadge.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (guard.currentSiteName && guard.currentSiteName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Status
      if (statusFilter === 'on_duty') return guard.currentStatus === 'on_duty';
      if (statusFilter === 'on_break') return guard.currentStatus === 'on_break';
      if (statusFilter === 'breach_only') {
        return guard.offSiteBreachStatus === 'breached_unacknowledged' || guard.offSiteBreachStatus === 'debounce_pending';
      }

      return true;
    });
  }, [activeGuards, searchQuery, statusFilter]);

  // Selected guard item
  const selectedGuard = useMemo(() => {
    if (!selectedGuardId) return activeGuards[0] || null;
    return activeGuards.find((g) => g.guardId === selectedGuardId) || activeGuards[0] || null;
  }, [selectedGuardId, activeGuards]);

  // Calculate Map Projection Bounding Box
  // All coordinates including guards, sites, and device location
  const mapBounds = useMemo(() => {
    const lats: number[] = [];
    const lngs: number[] = [];

    // Sites
    sitesList.forEach((s) => {
      if (s.latitude && s.longitude) {
        lats.push(s.latitude);
        lngs.push(s.longitude);
      }
    });

    // Guards
    activeGuards.forEach((g) => {
      if (g.gpsCoordinates?.latitude && g.gpsCoordinates?.longitude) {
        lats.push(g.gpsCoordinates.latitude);
        lngs.push(g.gpsCoordinates.longitude);
      }
    });

    // Device location
    if (deviceLocation) {
      lats.push(deviceLocation.latitude);
      lngs.push(deviceLocation.longitude);
    }

    if (lats.length === 0) {
      return { minLat: 47.58, maxLat: 47.65, minLng: -122.38, maxLng: -122.30 };
    }

    const minLat = Math.min(...lats) - 0.008;
    const maxLat = Math.max(...lats) + 0.008;
    const minLng = Math.min(...lngs) - 0.012;
    const maxLng = Math.max(...lngs) + 0.012;

    return { minLat, maxLat, minLng, maxLng };
  }, [sitesList, activeGuards, deviceLocation]);

  // Transform GPS Lat/Lng to SVG Canvas (X, Y) Coordinates
  const projectGpsToSvg = (lat: number, lng: number) => {
    const { minLat, maxLat, minLng, maxLng } = mapBounds;
    const width = containerDimensions.width;
    const height = containerDimensions.height;

    const normX = (lng - minLng) / (maxLng - minLng || 0.01);
    const normY = 1 - (lat - minLat) / (maxLat - minLat || 0.01); // Invert Y for screen

    // Apply zoom & pan centered
    const centerX = width / 2;
    const centerY = height / 2;

    const projectedX = centerX + (normX * width - centerX) * zoomLevel + panOffset.x;
    const projectedY = centerY + (normY * height - centerY) * zoomLevel + panOffset.y;

    return { x: projectedX, y: projectedY };
  };

  // Pan interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoomLevel(1.2);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleCenterOnGuard = (guard: GuardLiveTrackingItem) => {
    setSelectedGuardId(guard.guardId);
    if (!guard.gpsCoordinates) return;
    const { minLat, maxLat, minLng, maxLng } = mapBounds;
    const width = containerDimensions.width;
    const height = containerDimensions.height;

    const normX = (guard.gpsCoordinates.longitude - minLng) / (maxLng - minLng || 0.01);
    const normY = 1 - (guard.gpsCoordinates.latitude - minLat) / (maxLat - minLat || 0.01);

    const targetX = normX * width;
    const targetY = normY * height;

    const newZoom = 2.4;
    setZoomLevel(newZoom);
    setPanOffset({
      x: (width / 2 - targetX) * (newZoom / 1.2),
      y: (height / 2 - targetY) * (newZoom / 1.2)
    });
  };

  const handleCenterOnDevice = () => {
    if (!deviceLocation) {
      requestDeviceGeolocation();
      return;
    }
    const { minLat, maxLat, minLng, maxLng } = mapBounds;
    const width = containerDimensions.width;
    const height = containerDimensions.height;

    const normX = (deviceLocation.longitude - minLng) / (maxLng - minLng || 0.01);
    const normY = 1 - (deviceLocation.latitude - minLat) / (maxLat - minLat || 0.01);

    const targetX = normX * width;
    const targetY = normY * height;

    const newZoom = 2.2;
    setZoomLevel(newZoom);
    setPanOffset({
      x: (width / 2 - targetX) * (newZoom / 1.2),
      y: (height / 2 - targetY) * (newZoom / 1.2)
    });
    showToast('Centered on Device GPS', `Coordinates: ${deviceLocation.latitude.toFixed(4)}°N, ${deviceLocation.longitude.toFixed(4)}°W`, 'info');
  };

  // Simulate Guard Departure (>350m outside geofence to test debounce countdown)
  const handleSimulateDeparture = (guard: GuardLiveTrackingItem) => {
    if (!guard.activeShift) return;
    const site = sitesList.find((s) => s.name === guard.currentSiteName || s.id === guard.activeShift?.siteId);
    const baseLat = site?.latitude || 47.6117;
    const baseLng = site?.longitude || -122.3533;
    const distanceMeters = 380; // 380m outside boundary
    const simulatedGps = {
      latitude: Number((baseLat + distanceMeters / 111111).toFixed(6)),
      longitude: Number((baseLng - distanceMeters / (111111 * Math.cos((baseLat * Math.PI) / 180))).toFixed(6)),
      accuracy: 5
    };

    updateGuardGeofenceState(guard.activeShift.id, {
      inGeofence: false,
      distanceMeters,
      currentGps: simulatedGps
    });
    showToast('Perimeter Departure Triggered', `Officer ${guard.guardName} moved 380m outside ${guard.currentSiteName}. 3-minute debounce active.`, 'warning');
  };

  // Simulate Guard Return (<20m inside site geofence)
  const handleSimulateReturn = (guard: GuardLiveTrackingItem) => {
    if (!guard.activeShift) return;
    const site = sitesList.find((s) => s.name === guard.currentSiteName || s.id === guard.activeShift?.siteId);
    const baseLat = site?.latitude || 47.6117;
    const baseLng = site?.longitude || -122.3533;

    updateGuardGeofenceState(guard.activeShift.id, {
      inGeofence: true,
      distanceMeters: 14,
      matchedParcelName: site?.multiParcels?.[0]?.name || 'Primary Facility Perimeter',
      currentGps: { latitude: baseLat, longitude: baseLng, accuracy: 4 }
    });
    showToast('Returned Inside Perimeter', `Officer ${guard.guardName} returned inside ${guard.currentSiteName}. Geofence compliant.`, 'success');
  };

  // Submit Supervisor Excusal
  const handleConfirmExcusal = () => {
    if (!excusalModalGuard?.activeShift) return;
    excuseGeofenceDepartureByOps(
      excusalModalGuard.activeShift.id,
      `${excusalReasonInput}${excusalNotesInput ? ` - ${excusalNotesInput}` : ''}`,
      'OPS-CMD-01'
    );
    setExcusalModalGuard(null);
    setExcusalNotesInput('');
  };

  // Assign current browser GPS to selected guard
  const handleSyncGpsToActiveGuard = (guard: GuardLiveTrackingItem) => {
    if (!deviceLocation || !guard.activeShift) return;
    const site = sitesList.find((s) => s.name === guard.currentSiteName || s.id === guard.activeShift?.siteId);
    let inGeofence = true;
    let dist = 15;

    if (site) {
      dist = calculateDistanceMeters(
        deviceLocation.latitude,
        deviceLocation.longitude,
        site.latitude,
        site.longitude
      );
      inGeofence = dist <= (site.geofenceRadiusMeters || 180);
    }

    updateGuardGeofenceState(guard.activeShift.id, {
      inGeofence,
      distanceMeters: dist,
      currentGps: deviceLocation
    });
    showToast('GPS Synchronized', `Assigned live device GPS to ${guard.guardName} (${dist}m from ${guard.currentSiteName}).`, 'success');
    setSyncToGuardModalOpen(false);
  };

  return (
    <div id="guard-map-dashboard-container" className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden relative font-sans select-none">
      {/* TOP HEADER CONTROLS BAR */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20 shadow-md">
        {/* Title & Live Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-xs">
            <Compass className="w-4 h-4 text-white animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                Live Guard GPS Radar & Geofence Map
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Telemetry polling real-time coordinates • {activeGuards.length} Guards Active
            </p>
          </div>
        </div>

        {/* Emergency Toggle & Geolocation API Status */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* CRITICAL EMERGENCY HIGHLIGHT TOGGLE BUTTON */}
          <button
            id="emergency-highlight-toggle-btn"
            type="button"
            onClick={() => setEmergencyHighlightMode(!emergencyHighlightMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide flex items-center gap-2 border transition-all cursor-pointer shadow-md ${
              emergencyHighlightMode
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-300 ring-2 ring-rose-400/80 animate-pulse'
                : breachGuards.length > 0
                ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border-rose-700/80'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Toggle Emergency Status Highlight to immediately isolate guards with perimeter breaches, debounce countdowns, or critical alerts"
          >
            <ShieldAlert className={`w-4 h-4 ${emergencyHighlightMode || breachGuards.length > 0 ? 'text-amber-300' : 'text-slate-400'}`} />
            <span>Emergency Highlight: {emergencyHighlightMode ? 'ON' : 'OFF'}</span>
            {breachGuards.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full">
                {breachGuards.length} Breach
              </span>
            )}
          </button>

          {/* Browser Geolocation API Status Pill */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-mono">
            <Crosshair className={`w-3.5 h-3.5 ${geoApiStatus === 'active' ? 'text-cyan-400 animate-pulse' : 'text-amber-400'}`} />
            <span className="text-slate-400 hidden sm:inline">Device GPS:</span>
            {geoApiStatus === 'active' && deviceLocation ? (
              <span className="text-cyan-300 font-bold">
                ±{geoApiAccuracy}m ({deviceLocation.latitude.toFixed(3)}°, {deviceLocation.longitude.toFixed(3)}°)
              </span>
            ) : geoApiStatus === 'requesting' ? (
              <span className="text-amber-300">Locking Fix...</span>
            ) : (
              <span className="text-slate-400">Default Radar</span>
            )}
            <button
              id="geo-api-refresh-btn"
              type="button"
              onClick={requestDeviceGeolocation}
              className="ml-1 text-slate-400 hover:text-cyan-300 p-0.5 rounded cursor-pointer"
              title="Refresh Browser GPS Location"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Center on My Location */}
          <button
            id="center-my-gps-btn"
            type="button"
            onClick={handleCenterOnDevice}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer"
            title="Center Map View on Device Geolocation API Position"
          >
            <Navigation className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">My GPS</span>
          </button>

          {/* Toggle Telemetry Drawer Button */}
          <button
            id="toggle-telemetry-drawer-btn"
            type="button"
            onClick={() => setIsTelemetryDrawerOpen(!isTelemetryDrawerOpen)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer ${
              isTelemetryDrawerOpen
                ? 'bg-blue-900/80 text-blue-200 border-blue-600/60'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Toggle Guard Telemetry & Timer Sidebar"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Guards Roster</span>
          </button>
        </div>
      </div>

      {/* EMERGENCY HIGH PRIORITY BANNER (Shown when Breaches or Emergency Highlight is Active) */}
      {(emergencyHighlightMode || breachGuards.length > 0) && (
        <div className={`px-4 py-2 border-b flex items-center justify-between gap-3 text-xs z-20 animate-in fade-in transition-all ${
          breachGuards.length > 0
            ? 'bg-rose-950/95 border-rose-500/80 text-rose-100'
            : 'bg-amber-950/90 border-amber-500/60 text-amber-100'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
            <div className="truncate">
              <span className="font-black uppercase tracking-wider text-rose-300 mr-2">
                {breachGuards.length > 0 ? 'CRITICAL GEOFENCE BREACH ALERT' : 'EMERGENCY HIGHLIGHT MODE ENGAGED'}
              </span>
              <span className="text-slate-200 font-mono text-[11px]">
                {breachGuards.length > 0
                  ? `${breachGuards.length} guard(s) outside authorized perimeter fence. Debounce timers active.`
                  : 'Map highlights prioritized for critical status. Compliant officers dimmed.'}
              </span>
            </div>
          </div>

          {/* Quick Jump Buttons to Breaching Guards */}
          <div className="flex items-center gap-1.5 shrink-0">
            {breachGuards.map((bg) => (
              <button
                key={bg.guardId}
                type="button"
                onClick={() => handleCenterOnGuard(bg)}
                className="px-2.5 py-1 rounded-md text-[11px] font-mono font-black bg-rose-600 hover:bg-rose-500 text-white border border-rose-300 cursor-pointer flex items-center gap-1 transition-all"
                title={`Jump to ${bg.guardName} (${bg.currentSiteName})`}
              >
                <Crosshair className="w-3 h-3" />
                <span>{bg.guardName.split(' ')[0]}</span>
                <span className="bg-slate-950/80 px-1 py-0.2 rounded text-[9px]">
                  {bg.offSiteBreachStatus === 'debounce_pending'
                    ? `${bg.debounceSecondsRemaining || 180}s`
                    : 'BREACH'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE: MAP VIEW + TELEMETRY SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* INTERACTIVE VECTOR SVG MAP CANVAS CONTAINER */}
        <div 
          ref={mapContainerRef}
          className={`flex-1 relative overflow-hidden bg-slate-950 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* FLOATING MAP VIEW CONTROLS (Zoom, Layers, Reset) */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
            <button
              id="map-zoom-in-btn"
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(4.0, Number((z + 0.3).toFixed(1))))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              id="map-zoom-out-btn"
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.3).toFixed(1))))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="w-full h-px bg-slate-800 my-0.5" />
            <button
              id="map-reset-view-btn"
              type="button"
              onClick={handleResetView}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              title="Reset View to Fit All Guards"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              id="map-center-device-btn"
              type="button"
              onClick={handleCenterOnDevice}
              className="p-1.5 text-cyan-400 hover:text-cyan-200 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              title="Focus on My Location (Browser GPS)"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* MAP LAYER STYLE & LEGEND OVERLAY (Top Right of Canvas) */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl text-xs">
            {(['tactical', 'satellite', 'high_contrast'] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setMapStyle(style)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase font-bold transition-all cursor-pointer ${
                  mapStyle === style
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {style.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* SVG MAP CANVAS */}
          <svg 
            className="w-full h-full pointer-events-auto"
            viewBox={`0 0 ${containerDimensions.width} ${containerDimensions.height}`}
          >
            <defs>
              {/* Tactical Radar Grid Pattern */}
              <pattern id="radar-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.75" strokeOpacity="0.4" />
              </pattern>

              {/* Guard Active Concentric Pulse Rings */}
              <radialGradient id="guard-pulse-emerald" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>

              {/* Breach Emergency Pulse Gradient */}
              <radialGradient id="guard-pulse-rose" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </radialGradient>

              {/* Debounce Buffer Pulse Gradient */}
              <radialGradient id="guard-pulse-amber" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>

              {/* Device Location Pulse Gradient */}
              <radialGradient id="device-pulse-cyan" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Background Grid Layer */}
            <rect width="100%" height="100%" fill={mapStyle === 'satellite' ? '#070d19' : '#030712'} />
            <rect width="100%" height="100%" fill="url(#radar-grid)" />

            {/* Tactical Maritime Shoreline Vector Contours (Seattle Elliott Bay Simulation) */}
            <path
              d={`M ${projectGpsToSvg(47.63, -122.37).x} ${projectGpsToSvg(47.63, -122.37).y} 
                 Q ${projectGpsToSvg(47.61, -122.36).x} ${projectGpsToSvg(47.61, -122.36).y}, 
                   ${projectGpsToSvg(47.58, -122.35).x} ${projectGpsToSvg(47.58, -122.35).y} 
                 L 0 ${containerDimensions.height} L 0 0 Z`}
              fill={mapStyle === 'satellite' ? '#031024' : '#020b18'}
              stroke="#0e2a47"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              opacity="0.85"
            />
            <text
              x={projectGpsToSvg(47.615, -122.365).x}
              y={projectGpsToSvg(47.615, -122.365).y}
              fill="#1e3a8a"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
              opacity="0.6"
              letterSpacing="2"
            >
              PUGET SOUND / ELLIOTT BAY MARITIME BASIN
            </text>

            {/* SITES AND GEOFENCE BOUNDARIES */}
            {sitesList.map((site) => {
              if (!site.latitude || !site.longitude) return null;
              const center = projectGpsToSvg(site.latitude, site.longitude);
              const radiusMeters = site.geofenceRadiusMeters || 180;
              // Project an offset point to calculate pixel radius
              const edgeCoord = projectGpsToSvg(site.latitude + radiusMeters / 111111, site.longitude);
              const pixelRadius = Math.max(18, Math.abs(edgeCoord.y - center.y));

              const isSiteOfSelectedGuard = selectedGuard?.currentSiteName === site.name;

              return (
                <g key={site.id} id={`site-group-${site.id}`}>
                  {/* Multi-Parcel Polygons if configured */}
                  {site.multiParcels?.map((parcel) => {
                    if (!parcel.coordinates || parcel.coordinates.length < 3) return null;
                    const pointsStr = parcel.coordinates
                      .map((c) => {
                        const pt = projectGpsToSvg(c.latitude, c.longitude);
                        return `${pt.x},${pt.y}`;
                      })
                      .join(' ');

                    return (
                      <g key={parcel.id}>
                        <polygon
                          points={pointsStr}
                          fill={parcel.color || '#0284c7'}
                          fillOpacity="0.15"
                          stroke={parcel.color || '#38bdf8'}
                          strokeWidth="1.5"
                          strokeDasharray="3 2"
                        />
                        <text
                          x={projectGpsToSvg(parcel.coordinates[0].latitude, parcel.coordinates[0].longitude).x + 4}
                          y={projectGpsToSvg(parcel.coordinates[0].latitude, parcel.coordinates[0].longitude).y - 4}
                          fill="#38bdf8"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {parcel.name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Circular Geofence Perimeter */}
                  <circle
                    cx={center.x}
                    cy={center.y}
                    r={pixelRadius}
                    fill={isSiteOfSelectedGuard ? '#1e3a8a' : '#0f172a'}
                    fillOpacity={isSiteOfSelectedGuard ? '0.18' : '0.08'}
                    stroke={isSiteOfSelectedGuard ? '#38bdf8' : '#334155'}
                    strokeWidth={isSiteOfSelectedGuard ? '2' : '1'}
                    strokeDasharray="5 3"
                  />

                  {/* Geofence Perimeter Radius Label */}
                  <text
                    x={center.x + pixelRadius * 0.7}
                    y={center.y - pixelRadius * 0.7}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {radiusMeters}m Geofence
                  </text>

                  {/* Facility Center Marker */}
                  <circle
                    cx={center.x}
                    cy={center.y}
                    r="5"
                    fill="#1e293b"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                  />

                  {/* Facility Name Tag */}
                  <g 
                    transform={`translate(${center.x + 8}, ${center.y + 4})`} 
                    className="cursor-pointer"
                    onClick={() => onSelectSite?.(site.name)}
                  >
                    <rect
                      x="0"
                      y="-12"
                      width={site.name.length * 6 + 18}
                      height="16"
                      rx="4"
                      fill="#0f172a"
                      fillOpacity="0.85"
                      stroke="#334155"
                      strokeWidth="0.8"
                    />
                    <text
                      x="6"
                      y="0"
                      fill="#cbd5e1"
                      fontSize="9.5"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      {site.name}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* BROWSER GEOLOCATION API: MY DEVICE POSITION MARKER */}
            {deviceLocation && (
              <g id="device-location-marker">
                {(() => {
                  const pt = projectGpsToSvg(deviceLocation.latitude, deviceLocation.longitude);
                  return (
                    <>
                      {/* Pulse Radar Wave */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="24"
                        fill="url(#device-pulse-cyan)"
                        className="animate-ping"
                      />
                      {/* Outer Accuracy Radius */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="14"
                        fill="#06b6d4"
                        fillOpacity="0.2"
                        stroke="#22d3ee"
                        strokeWidth="1.5"
                      />
                      {/* Inner Dot */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill="#22d3ee"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      {/* Label */}
                      <g transform={`translate(${pt.x + 8}, ${pt.y - 8})`}>
                        <rect
                          x="0"
                          y="-10"
                          width="96"
                          height="14"
                          rx="3"
                          fill="#083344"
                          stroke="#06b6d4"
                          strokeWidth="0.8"
                        />
                        <text
                          x="4"
                          y="0"
                          fill="#67e8f9"
                          fontSize="8.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          MY DEVICE (±{geoApiAccuracy}m)
                        </text>
                      </g>
                    </>
                  );
                })()}
              </g>
            )}

            {/* ACTIVE GUARDS MARKERS AND TELEMETRY VECTORS */}
            {displayedGuards.map((guard) => {
              if (!guard.gpsCoordinates) return null;
              const pt = projectGpsToSvg(guard.gpsCoordinates.latitude, guard.gpsCoordinates.longitude);
              const isSelected = selectedGuard?.guardId === guard.guardId;

              // Determine breach & emergency status
              const isBreached = guard.offSiteBreachStatus === 'breached_unacknowledged';
              const isDebounce = guard.offSiteBreachStatus === 'debounce_pending';
              const isExcused = guard.offSiteBreachStatus === 'excused';
              const isLate = guard.currentStatus === 'late' || guard.activeShift?.isLate;
              const isEmergency = isBreached || isDebounce || isLate;

              // In Emergency Highlight Mode: dim non-emergency guards
              const isDimmed = emergencyHighlightMode && !isEmergency;

              // Color coding
              const markerColor = isBreached
                ? '#f43f5e'
                : isDebounce
                ? '#f59e0b'
                : isExcused
                ? '#38bdf8'
                : guard.currentStatus === 'on_break'
                ? '#a855f7'
                : '#10b981';

              // If outside geofence: draw connecting vector line to site center
              const matchedSite = sitesList.find((s) => s.name === guard.currentSiteName);
              const siteCenter = matchedSite?.latitude && matchedSite?.longitude
                ? projectGpsToSvg(matchedSite.latitude, matchedSite.longitude)
                : null;

              return (
                <g
                  key={guard.guardId}
                  id={`guard-marker-${guard.guardId}`}
                  className="cursor-pointer transition-opacity duration-200"
                  opacity={isDimmed ? 0.35 : 1}
                  onClick={() => setSelectedGuardId(guard.guardId)}
                >
                  {/* Vector Line to Facility if Outside Perimeter */}
                  {siteCenter && (isBreached || isDebounce) && (
                    <g>
                      <line
                        x1={siteCenter.x}
                        y1={siteCenter.y}
                        x2={pt.x}
                        y2={pt.y}
                        stroke={isBreached ? '#f43f5e' : '#f59e0b'}
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                      <rect
                        x={(siteCenter.x + pt.x) / 2 - 28}
                        y={(siteCenter.y + pt.y) / 2 - 8}
                        width="56"
                        height="14"
                        rx="3"
                        fill="#020617"
                        stroke={isBreached ? '#f43f5e' : '#f59e0b'}
                        strokeWidth="0.8"
                      />
                      <text
                        x={(siteCenter.x + pt.x) / 2}
                        y={(siteCenter.y + pt.y) / 2 + 2}
                        fill={isBreached ? '#fca5a5' : '#fde68a'}
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {guard.currentGeofenceDistanceMeters || 350}m OUT
                      </text>
                    </g>
                  )}

                  {/* Concentric Pulse Halo for Emergency / Debounce */}
                  {isBreached && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? '32' : '26'}
                      fill="url(#guard-pulse-rose)"
                      className="animate-ping"
                    />
                  )}
                  {isDebounce && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? '28' : '22'}
                      fill="url(#guard-pulse-amber)"
                      className="animate-pulse"
                    />
                  )}
                  {!isEmergency && isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="22"
                      fill="url(#guard-pulse-emerald)"
                      className="animate-pulse"
                    />
                  )}

                  {/* Selection Ring */}
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  )}

                  {/* Outer Marker Body */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? '11' : '9'}
                    fill="#0f172a"
                    stroke={markerColor}
                    strokeWidth={isSelected ? '2.5' : '2'}
                  />

                  {/* Inner Dot Indicator */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill={markerColor}
                  />

                  {/* Guard Callout Label Pill */}
                  <g transform={`translate(${pt.x + 12}, ${pt.y - 12})`}>
                    <rect
                      x="0"
                      y="-12"
                      width={guard.guardName.length * 6.5 + 46}
                      height="20"
                      rx="4"
                      fill="#090d16"
                      stroke={markerColor}
                      strokeWidth={isSelected ? '1.5' : '1'}
                      fillOpacity="0.95"
                    />
                    <text
                      x="6"
                      y="1"
                      fill="#ffffff"
                      fontSize="9.5"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      {guard.guardName}
                    </text>
                    <text
                      x={guard.guardName.length * 6.5 + 10}
                      y="1"
                      fill={markerColor}
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {isBreached
                        ? '🚨 BREACH'
                        : isDebounce
                        ? `⏱️ ${guard.debounceSecondsRemaining || 180}s`
                        : guard.currentStatus === 'on_break'
                        ? '☕ BREAK'
                        : '✓ ON POST'}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* FLOATING MAP STATUS BAR / COORDINATE TICKER (Bottom Left of Canvas) */}
          <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-xl flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Zoom: {zoomLevel}x</span>
            </span>
            <span>•</span>
            <span>Active Sector: Seattle Metro & Waterfront</span>
            {selectedGuard?.gpsCoordinates && (
              <>
                <span>•</span>
                <span className="text-cyan-300 font-bold">
                  {selectedGuard.guardName}: {selectedGuard.gpsCoordinates.latitude.toFixed(4)}°N, {selectedGuard.gpsCoordinates.longitude.toFixed(4)}°W
                </span>
              </>
            )}
          </div>
        </div>

        {/* TELEMETRY & BREACH TIMERS RIGHT SIDEBAR / DRAWER */}
        {isTelemetryDrawerOpen && (
          <aside 
            id="guard-telemetry-sidebar"
            className="w-full sm:w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 z-10 shadow-2xl overflow-hidden"
          >
            {/* Sidebar Header */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-black uppercase tracking-wide text-white">
                  Active Guard Telemetry ({activeGuards.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTelemetryDrawerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
                title="Minimize Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CRITICAL BREACH & DEBOUNCE TIMER HERO CARD */}
            {selectedGuard && (
              <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">
                        {selectedGuard.guardName}
                      </span>
                      <span className="text-[10px] font-mono text-blue-300 bg-blue-950 px-1.5 py-0.2 rounded border border-blue-800">
                        {selectedGuard.guardBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{selectedGuard.currentSiteName || 'Unassigned Post'}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCenterOnGuard(selectedGuard)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg border border-slate-700 cursor-pointer"
                    title="Center Map on this Guard"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* GEOFENCE BREACH & DEBOUNCE COUNTDOWN TIMER BOX */}
                <div className={`p-3 rounded-xl border transition-all ${
                  selectedGuard.offSiteBreachStatus === 'breached_unacknowledged'
                    ? 'bg-rose-950/80 border-rose-500/80 shadow-lg shadow-rose-950/50'
                    : selectedGuard.offSiteBreachStatus === 'debounce_pending'
                    ? 'bg-amber-950/80 border-amber-500/80 animate-pulse shadow-lg shadow-amber-950/50'
                    : selectedGuard.offSiteBreachStatus === 'excused'
                    ? 'bg-blue-950/70 border-blue-500/60'
                    : 'bg-emerald-950/40 border-emerald-500/40'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[10px] font-mono uppercase font-black flex items-center gap-1.5 ${
                      selectedGuard.offSiteBreachStatus === 'breached_unacknowledged'
                        ? 'text-rose-400'
                        : selectedGuard.offSiteBreachStatus === 'debounce_pending'
                        ? 'text-amber-400'
                        : selectedGuard.offSiteBreachStatus === 'excused'
                        ? 'text-blue-400'
                        : 'text-emerald-400'
                    }`}>
                      {selectedGuard.offSiteBreachStatus === 'breached_unacknowledged' ? (
                        <>
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                          <span>🚨 ACTIVE OFF-SITE BREACH</span>
                        </>
                      ) : selectedGuard.offSiteBreachStatus === 'debounce_pending' ? (
                        <>
                          <Timer className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          <span>⚠️ PERIMETER DEPARTURE BUFFER</span>
                        </>
                      ) : selectedGuard.offSiteBreachStatus === 'excused' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                          <span>✓ EXCUSED DEPARTURE</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>✓ INSIDE GEOFENCE COMPLIANT</span>
                        </>
                      )}
                    </span>

                    <span className="text-[10px] font-mono text-slate-300">
                      {selectedGuard.currentGeofenceDistanceMeters || 12}m from post
                    </span>
                  </div>

                  {/* TIME OUTSIDE GEOFENCE & COUNTDOWN TO BREACH ACTIVATION */}
                  {selectedGuard.offSiteBreachStatus === 'debounce_pending' ? (
                    <div className="space-y-2 pt-1">
                      {/* Live countdown timer until breach triggers */}
                      <div className="bg-slate-950/90 p-2.5 rounded-lg border border-amber-500/50 text-center">
                        <span className="text-[9px] text-amber-300 uppercase font-mono tracking-wider block">
                          Buffer Remaining Before Off-Site Breach Activates
                        </span>
                        <div className="text-2xl font-mono font-black text-amber-300 flex items-center justify-center gap-1.5 my-0.5">
                          <Timer className="w-5 h-5 animate-pulse text-amber-400" />
                          <span>
                            {Math.floor((selectedGuard.debounceSecondsRemaining || 180) / 60)
                              .toString()
                              .padStart(2, '0')}
                            :
                            {((selectedGuard.debounceSecondsRemaining || 180) % 60)
                              .toString()
                              .padStart(2, '0')}
                          </span>
                        </div>
                        {/* Progress Bar draining 180s down */}
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-rose-500 h-full transition-all duration-1000"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, ((selectedGuard.debounceSecondsRemaining || 180) / 180) * 100)
                              )}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Time outside geofence calculation */}
                      <div className="text-[11px] font-mono text-slate-300 flex items-center justify-between px-1">
                        <span className="text-slate-400">Time Outside Geofence:</span>
                        <span className="text-amber-200 font-bold">
                          {selectedGuard.outOfBoundsSince
                            ? `${Math.floor(
                                (Date.now() - new Date(selectedGuard.outOfBoundsSince).getTime()) / 1000 / 60
                              )}m ${Math.floor(
                                ((Date.now() - new Date(selectedGuard.outOfBoundsSince).getTime()) / 1000) % 60
                              )}s`
                            : `${180 - (selectedGuard.debounceSecondsRemaining || 180)}s`}
                        </span>
                      </div>
                    </div>
                  ) : selectedGuard.offSiteBreachStatus === 'breached_unacknowledged' ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="bg-slate-950/90 p-2.5 rounded-lg border border-rose-500/80 text-center">
                        <span className="text-[9px] text-rose-300 uppercase font-mono tracking-wider block">
                          3-Minute Debounce Expired • CAD Escalation Active
                        </span>
                        <div className="text-xl font-mono font-black text-rose-300 flex items-center justify-center gap-1.5 my-0.5">
                          <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
                          <span>OFF-SITE BREACH ESCALATED</span>
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-slate-300 flex items-center justify-between px-1">
                        <span className="text-slate-400">Total Outside Duration:</span>
                        <span className="text-rose-200 font-bold">
                          {selectedGuard.outOfBoundsSince
                            ? `${Math.floor(
                                (Date.now() - new Date(selectedGuard.outOfBoundsSince).getTime()) / 1000 / 60
                              )}m ${Math.floor(
                                ((Date.now() - new Date(selectedGuard.outOfBoundsSince).getTime()) / 1000) % 60
                              )}s`
                            : 'Exceeded 3m'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-300 font-mono mt-1">
                      Officer verified inside {selectedGuard.matchedParcelName || selectedGuard.currentSiteName}. Continuous GPS polling verified.
                    </p>
                  )}

                  {/* Action Controls on Breach Card */}
                  <div className="pt-2 mt-2 border-t border-white/10 flex items-center gap-1.5 flex-wrap">
                    {/* If in breach or debounce: Excuse or Clear */}
                    {(selectedGuard.offSiteBreachStatus === 'breached_unacknowledged' ||
                      selectedGuard.offSiteBreachStatus === 'debounce_pending') && (
                      <>
                        <button
                          type="button"
                          onClick={() => setExcusalModalGuard(selectedGuard)}
                          className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Excuse Departure
                        </button>
                        <button
                          type="button"
                          onClick={() => selectedGuard.activeShift && clearGeofenceBreach(selectedGuard.activeShift.id)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700 cursor-pointer transition-colors"
                        >
                          Clear Breach
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSimulateReturn(selectedGuard)}
                          className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Simulate Return
                        </button>
                      </>
                    )}

                    {/* If compliant: Test departure */}
                    {selectedGuard.offSiteBreachStatus !== 'breached_unacknowledged' &&
                      selectedGuard.offSiteBreachStatus !== 'debounce_pending' && (
                        <button
                          type="button"
                          onClick={() => handleSimulateDeparture(selectedGuard)}
                          className="px-2 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-700 text-[10px] font-bold cursor-pointer transition-colors"
                          title="Simulate Guard walking >350m outside geofence to test departure timer"
                        >
                          Test Departure Timer
                        </button>
                      )}

                    {/* Sync device location to guard */}
                    {deviceLocation && (
                      <button
                        type="button"
                        onClick={() => handleSyncGpsToActiveGuard(selectedGuard)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[10px] font-bold cursor-pointer transition-colors"
                        title="Assign real device GPS coordinates to this guard"
                      >
                        Sync My GPS
                      </button>
                    )}

                    <a
                      href={`tel:${selectedGuard.guardPhone || opsPhone}`}
                      className="ml-auto p-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded cursor-pointer"
                      title="Call Guard"
                    >
                      <PhoneCall className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Telemetry Detail Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Latitude</span>
                    <span className="text-white font-bold">
                      {selectedGuard.gpsCoordinates?.latitude?.toFixed(5) || '47.61170'}° N
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Longitude</span>
                    <span className="text-white font-bold">
                      {selectedGuard.gpsCoordinates?.longitude?.toFixed(5) || '-122.35330'}° W
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Duty Status</span>
                    <span className={`font-bold uppercase ${
                      selectedGuard.currentStatus === 'on_duty' ? 'text-emerald-400' : 'text-purple-400'
                    }`}>
                      {selectedGuard.currentStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">GPS Accuracy</span>
                    <span className="text-cyan-300 font-bold">
                      ±{selectedGuard.gpsCoordinates?.accuracy || 5}m (Dual-Band)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SEARCH & STATUS FILTER CONTROLS */}
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search guard or facility..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 text-[10px] font-mono uppercase overflow-x-auto pb-1 no-scrollbar">
                {(['all', 'on_duty', 'breach_only', 'on_break'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setStatusFilter(mode)}
                    className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      statusFilter === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode === 'all' && `All (${activeGuards.length})`}
                    {mode === 'on_duty' && `On Duty (${activeGuards.filter((g) => g.currentStatus === 'on_duty').length})`}
                    {mode === 'breach_only' && `Breaches (${breachGuards.length})`}
                    {mode === 'on_break' && `Break (${activeGuards.filter((g) => g.currentStatus === 'on_break').length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* ROSTER LIST OF ACTIVE GUARDS */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
              {displayedGuards.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No active guards match the current filter.
                </div>
              ) : (
                displayedGuards.map((guard) => {
                  const isSelected = selectedGuard?.guardId === guard.guardId;
                  const isBreached = guard.offSiteBreachStatus === 'breached_unacknowledged';
                  const isDebounce = guard.offSiteBreachStatus === 'debounce_pending';

                  return (
                    <div
                      key={guard.guardId}
                      onClick={() => handleCenterOnGuard(guard)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-blue-950/70 border-blue-500 shadow-md'
                          : isBreached
                          ? 'bg-rose-950/40 border-rose-800 hover:border-rose-600'
                          : isDebounce
                          ? 'bg-amber-950/40 border-amber-800 hover:border-amber-600'
                          : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${
                          isBreached
                            ? 'bg-rose-500 animate-ping'
                            : isDebounce
                            ? 'bg-amber-400 animate-pulse'
                            : guard.currentStatus === 'on_break'
                            ? 'bg-purple-400'
                            : 'bg-emerald-400'
                        }`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">
                              {guard.guardName}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">
                              {guard.guardBadge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            {guard.currentSiteName || 'Scheduled Post'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isBreached ? (
                          <span className="text-[9px] font-mono font-black text-rose-300 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-700">
                            BREACH
                          </span>
                        ) : isDebounce ? (
                          <span className="text-[9px] font-mono font-black text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-700 flex items-center gap-0.5">
                            <Timer className="w-2.5 h-2.5 animate-spin" />
                            {guard.debounceSecondsRemaining || 180}s
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                            OK
                          </span>
                        )}
                        <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                          {guard.gpsCoordinates
                            ? `${guard.gpsCoordinates.latitude.toFixed(2)}°, ${guard.gpsCoordinates.longitude.toFixed(2)}°`
                            : 'Fix Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>

      {/* SUPERVISOR GEOFENCE EXCUSAL MODAL */}
      {excusalModalGuard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-blue-400 uppercase font-bold">
                  Dispatcher CAD Protocol
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  Excuse Perimeter Departure
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExcusalModalGuard(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="text-slate-300">
                Officer: <strong className="text-white">{excusalModalGuard.guardName}</strong> ({excusalModalGuard.guardBadge})
              </p>
              <p className="text-slate-300">
                Facility: <strong className="text-blue-300">{excusalModalGuard.currentSiteName}</strong>
              </p>
              <p className="text-amber-300 font-mono text-[11px]">
                Distance Outside: ~{excusalModalGuard.currentGeofenceDistanceMeters || 350}m
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                Authorized Reason Category
              </label>
              <select
                value={excusalReasonInput}
                onChange={(e) => setExcusalReasonInput(e.target.value as DepartureReasonType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Authorized Meal Break">Authorized Meal Break</option>
                <option value="Perimeter Exterior Sweep">Perimeter Exterior Sweep</option>
                <option value="Bank / Cash Escort">Bank / Cash Escort</option>
                <option value="Emergency Assist Client">Emergency Assist Client</option>
                <option value="Property Access Gate Maintenance">Property Access Gate Maintenance</option>
                <option value="Restroom / Amenity Access">Restroom / Amenity Access</option>
                <option value="Other Authorized Reason">Other Authorized Reason</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                Supervisor Dispatch Note
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Officer instructed by dockmaster to verify Gate B exterior sensor..."
                value={excusalNotesInput}
                onChange={(e) => setExcusalNotesInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setExcusalModalGuard(null)}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExcusal}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Suppress CAD Alarm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
