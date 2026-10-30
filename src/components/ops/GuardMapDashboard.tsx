import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { GuardLiveTrackingItem, DepartureReasonType } from '../../types/shift';
import { getCurrentLocation, calculateDistanceMeters, GeoCoordinates } from '../../utils/geo';
import {
  ensureLeafletLoaded,
  getTileLayerConfig
} from '../../utils/leafletLoader';
import { RegionalClientSitesMap } from '../cad/RegionalClientSitesMap';
import {
  Compass,
  MapPin,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Timer,
  PhoneCall,
  Building2,
  Search,
  Plus,
  Minus,
  RotateCcw,
  Navigation,
  Crosshair,
  Check,
  X,
  SlidersHorizontal
} from 'lucide-react';

interface GuardMapDashboardProps {
  onScheduleShift?: (guardId?: string) => void;
  onSelectSite?: (siteName: string) => void;
  onConfigurePortals?: (siteId: string) => void;
  initialSelectedGuardId?: string | null;
  initialMapViewMode?: 'live_guard_gps' | 'regional_client_sites';
}

export const GuardMapDashboard: React.FC<GuardMapDashboardProps> = ({
  onScheduleShift,
  onSelectSite,
  onConfigurePortals,
  initialSelectedGuardId = null,
  initialMapViewMode = 'live_guard_gps'
}) => {
  const {
    getGuardsLiveTracking,
    sitesList,
    opsPhone,
    showToast,
    excuseGeofenceDepartureByOps,
    clearGeofenceBreach,
    updateGuardGeofenceState
  } = useShiftOps();

  // Map View Mode Toggle: Live Guard GPS Radar vs Regional Client Sites Map
  const [mapViewMode, setMapViewMode] = useState<'live_guard_gps' | 'regional_client_sites'>(
    initialMapViewMode
  );

  useEffect(() => {
    setMapViewMode(initialMapViewMode);
  }, [initialMapViewMode]);

  // 1-second live ticker for real-time timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Leaflet Map refs & state
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const sitesLayerGroupRef = useRef<any>(null);
  const guardsLayerGroupRef = useRef<any>(null);
  const deviceLayerGroupRef = useRef<any>(null);

  const [leafletReady, setLeafletReady] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(13);
  const [mapStyle, setMapStyle] = useState<'tactical' | 'satellite' | 'high_contrast'>('tactical');
  const [isMapPanActive, setIsMapPanActive] = useState<boolean>(false);

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

  // Supervisor Excusal Modal
  const [excusalModalGuard, setExcusalModalGuard] = useState<GuardLiveTrackingItem | null>(null);
  const [excusalReasonInput, setExcusalReasonInput] = useState<DepartureReasonType>('Authorized Meal Break');
  const [excusalNotesInput, setExcusalNotesInput] = useState('');

  // Fetch device GPS on mount using Geolocation API
  const requestDeviceGeolocation = () => {
    setGeoApiStatus('requesting');
    getCurrentLocation({ latitude: 47.6117, longitude: -122.3533, accuracy: 12 })
      .then((coords) => {
        setDeviceLocation(coords);
        setGeoApiAccuracy(coords.accuracy || 10);
        setGeoApiStatus('active');
        showToast('Device GPS Connected', `Location locked (±${coords.accuracy || 10}m accuracy).`, 'info');
      })
      .catch(() => {
        setGeoApiStatus('fallback');
        const fallback = { latitude: 47.6117, longitude: -122.3533, accuracy: 25 };
        setDeviceLocation(fallback);
        setGeoApiAccuracy(25);
      });
  };

  useEffect(() => {
    requestDeviceGeolocation();
  }, []);

  // Get active guards
  const allLiveGuards = getGuardsLiveTracking();

  const activeGuards = useMemo(() => {
    return allLiveGuards.filter((g) => {
      return (
        g.currentStatus === 'on_duty' ||
        g.currentStatus === 'on_break' ||
        g.currentStatus === 'late' ||
        (g.activeShift && g.activeShift.status !== 'completed')
      );
    });
  }, [allLiveGuards]);

  const breachGuards = useMemo(() => {
    return activeGuards.filter(
      (g) =>
        g.offSiteBreachStatus === 'breached_unacknowledged' ||
        g.offSiteBreachStatus === 'debounce_pending'
    );
  }, [activeGuards]);

  const displayedGuards = useMemo(() => {
    return activeGuards.filter((guard) => {
      const matchesSearch =
        !searchQuery ||
        guard.guardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guard.guardBadge.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (guard.currentSiteName &&
          guard.currentSiteName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'on_duty') return guard.currentStatus === 'on_duty';
      if (statusFilter === 'on_break') return guard.currentStatus === 'on_break';
      if (statusFilter === 'breach_only') {
        return (
          guard.offSiteBreachStatus === 'breached_unacknowledged' ||
          guard.offSiteBreachStatus === 'debounce_pending'
        );
      }

      return true;
    });
  }, [activeGuards, searchQuery, statusFilter]);

  const selectedGuard = useMemo(() => {
    if (!selectedGuardId) return activeGuards[0] || null;
    return activeGuards.find((g) => g.guardId === selectedGuardId) || activeGuards[0] || null;
  }, [selectedGuardId, activeGuards]);

  // Initialize Leaflet Map for Live Guard GPS Mode (Esri World Dark Gray Canvas default)
  useEffect(() => {
    if (mapViewMode !== 'live_guard_gps') return;

    let mounted = true;
    ensureLeafletLoaded()
      .then((L) => {
        if (!mounted || !mapContainerRef.current) return;
        if (!leafletMapRef.current) {
          const map = L.map(mapContainerRef.current, {
            center: [47.6117, -122.342],
            zoom: 13,
            zoomControl: false,
            attributionControl: true
          });

          const tileCfg = getTileLayerConfig('tactical');
          const tileLayer = L.tileLayer(tileCfg.url, {
            attribution: tileCfg.attribution,
            ...tileCfg.options
          }).addTo(map);

          const sitesGroup = L.layerGroup().addTo(map);
          const deviceGroup = L.layerGroup().addTo(map);
          const guardsGroup = L.layerGroup().addTo(map);

          map.on('zoomend', () => {
            setZoomLevel(map.getZoom());
          });

          leafletMapRef.current = map;
          tileLayerRef.current = tileLayer;
          sitesLayerGroupRef.current = sitesGroup;
          deviceLayerGroupRef.current = deviceGroup;
          guardsLayerGroupRef.current = guardsGroup;

          // Fit bounds initially to all active guards and sites
          const coords: [number, number][] = [];
          sitesList.forEach((s) => {
            if (s.latitude && s.longitude) coords.push([s.latitude, s.longitude]);
          });
          activeGuards.forEach((g) => {
            if (g.gpsCoordinates?.latitude && g.gpsCoordinates?.longitude) {
              coords.push([g.gpsCoordinates.latitude, g.gpsCoordinates.longitude]);
            }
          });
          if (coords.length > 0) {
            map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 15 });
          }
        } else {
          setTimeout(() => {
            leafletMapRef.current?.invalidateSize();
          }, 100);
        }
        setLeafletReady(true);
      })
      .catch((err) => {
        console.error('Failed to load Leaflet in GuardMapDashboard:', err);
      });

    return () => {
      mounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [mapViewMode]);

  // Switch tile layers when mapStyle changes (Dark Matter = Esri Dark Gray, Satellite = Esri Imagery, Street Day = OSM)
  useEffect(() => {
    if (!leafletReady || !leafletMapRef.current || !window.L) return;
    const L = window.L;
    if (tileLayerRef.current) {
      leafletMapRef.current.removeLayer(tileLayerRef.current);
    }
    const tileCfg = getTileLayerConfig(mapStyle);
    tileLayerRef.current = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      ...tileCfg.options
    }).addTo(leafletMapRef.current);
  }, [mapStyle, leafletReady]);

  // Render Sites & Geofence Boundaries on Street Map
  useEffect(() => {
    if (!leafletReady || !leafletMapRef.current || !window.L) return;
    const L = window.L;
    const sitesGroup = sitesLayerGroupRef.current;
    if (!sitesGroup) return;

    sitesGroup.clearLayers();

    sitesList.forEach((site) => {
      if (!site.latitude || !site.longitude) return;
      const radiusMeters = site.geofenceRadiusMeters || 180;
      const isSiteOfSelectedGuard = selectedGuard?.currentSiteName === site.name;

      // Multi-Parcel Polygons if configured
      if (site.multiParcels && site.multiParcels.length > 0) {
        site.multiParcels.forEach((parcel) => {
          if (parcel.coordinates && parcel.coordinates.length >= 3) {
            const polyCoords = parcel.coordinates.map((c) => [c.latitude, c.longitude]);
            L.polygon(polyCoords, {
              color: parcel.color || '#38bdf8',
              weight: 1.5,
              fillColor: parcel.color || '#0284c7',
              fillOpacity: 0.14,
              dashArray: '3, 3'
            })
              .bindTooltip(`${site.name} — ${parcel.name}`)
              .addTo(sitesGroup);
          }
        });
      }

      // Circular Geofence Perimeter
      const circle = L.circle([site.latitude, site.longitude], {
        radius: radiusMeters,
        color: isSiteOfSelectedGuard ? '#38bdf8' : '#475569',
        weight: isSiteOfSelectedGuard ? 2.5 : 1.5,
        fillColor: isSiteOfSelectedGuard ? '#1e3a8a' : '#0f172a',
        fillOpacity: isSiteOfSelectedGuard ? 0.2 : 0.1,
        dashArray: '6, 4'
      });
      circle.bindTooltip(`${site.name} (${radiusMeters}m Geofence)`, { direction: 'top' });
      circle.on('click', () => {
        onSelectSite?.(site.name);
      });
      circle.addTo(sitesGroup);

      // Compact Facility Center Origin Dot (no permanent text banner to avoid mobile marker stacking)
      const siteDotIcon = L.divIcon({
        html: `
          <div style="
            width: 10px;
            height: 10px;
            transform: translate(-50%, -50%);
            border-radius: 9999px;
            background: ${isSiteOfSelectedGuard ? '#38bdf8' : '#475569'};
            border: 2px solid #020617;
            cursor: pointer;
          "></div>
        `,
        className: 'cad-site-center-dot',
        iconSize: [0, 0]
      });

      const siteMarker = L.marker([site.latitude, site.longitude], { icon: siteDotIcon });
      siteMarker.bindTooltip(`${site.name} (${radiusMeters}m Perimeter)`, { direction: 'top' });
      siteMarker.on('click', () => {
        onSelectSite?.(site.name);
      });
      siteMarker.addTo(sitesGroup);
    });
  }, [sitesList, selectedGuard?.currentSiteName, leafletReady]);

  // Render Device GPS Marker
  useEffect(() => {
    if (!leafletReady || !leafletMapRef.current || !window.L) return;
    const L = window.L;
    const deviceGroup = deviceLayerGroupRef.current;
    if (!deviceGroup) return;

    deviceGroup.clearLayers();
    if (!deviceLocation) return;

    // Accuracy halo circle
    L.circle([deviceLocation.latitude, deviceLocation.longitude], {
      radius: geoApiAccuracy || 15,
      color: '#22d3ee',
      weight: 1.5,
      fillColor: '#06b6d4',
      fillOpacity: 0.18
    }).addTo(deviceGroup);

    const devIcon = L.divIcon({
      html: `
        <div style="position: relative; transform: translate(-50%, -50%); display: flex; align-items: center;">
          <div style="width: 12px; height: 12px; border-radius: 9999px; background: #22d3ee; border: 2px solid #ffffff; box-shadow: 0 0 10px #06b6d4;"></div>
          <span style="margin-left: 6px; background: #083344; border: 1px solid #06b6d4; color: #67e8f9; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px; white-space: nowrap;">
            MY DEVICE (±${geoApiAccuracy || 12}m)
          </span>
        </div>
      `,
      className: 'cad-device-gps-icon',
      iconSize: [0, 0]
    });

    L.marker([deviceLocation.latitude, deviceLocation.longitude], { icon: devIcon }).addTo(deviceGroup);
  }, [deviceLocation, geoApiAccuracy, leafletReady]);

  // Render Active Guard Markers, Accuracy Halos & Breach Vectors on Real Street Map
  useEffect(() => {
    if (!leafletReady || !leafletMapRef.current || !window.L) return;
    const L = window.L;
    const guardsGroup = guardsLayerGroupRef.current;
    if (!guardsGroup) return;

    guardsGroup.clearLayers();

    displayedGuards.forEach((guard) => {
      if (!guard.gpsCoordinates) return;
      const lat = guard.gpsCoordinates.latitude;
      const lng = guard.gpsCoordinates.longitude;
      const accuracyMeters = guard.gpsCoordinates.accuracy || 8;
      const isSelected = selectedGuard?.guardId === guard.guardId;

      const isBreached = guard.offSiteBreachStatus === 'breached_unacknowledged';
      const isDebounce = guard.offSiteBreachStatus === 'debounce_pending';
      const isExcused = guard.offSiteBreachStatus === 'excused';
      const isLate = guard.currentStatus === 'late' || guard.activeShift?.isLate;
      const isEmergency = isBreached || isDebounce || isLate;
      const isDimmed = emergencyHighlightMode && !isEmergency;

      const markerColor = isBreached
        ? '#f43f5e'
        : isDebounce
        ? '#f59e0b'
        : isExcused
        ? '#38bdf8'
        : guard.currentStatus === 'on_break'
        ? '#a855f7'
        : '#10b981';

      // 1. GPS Accuracy Halo Circle on Street Map
      L.circle([lat, lng], {
        radius: Math.max(12, accuracyMeters * 2.2),
        color: markerColor,
        weight: isSelected ? 2 : 1,
        opacity: isDimmed ? 0.25 : 0.65,
        fillColor: markerColor,
        fillOpacity: isDimmed ? 0.05 : isSelected ? 0.22 : 0.12
      }).addTo(guardsGroup);

      // 2. If outside geofence: draw connecting vector line to site center
      const matchedSite = sitesList.find((s) => s.name === guard.currentSiteName);
      if (matchedSite?.latitude && matchedSite?.longitude && (isBreached || isDebounce)) {
        const vectorLine = L.polyline(
          [
            [matchedSite.latitude, matchedSite.longitude],
            [lat, lng]
          ],
          {
            color: isBreached ? '#f43f5e' : '#f59e0b',
            weight: 2.5,
            dashArray: '6, 5',
            opacity: 0.9
          }
        );
        vectorLine.addTo(guardsGroup);

        // Midpoint distance badge
        const midLat = (matchedSite.latitude + lat) / 2;
        const midLng = (matchedSite.longitude + lng) / 2;
        const distBadge = L.divIcon({
          html: `
            <div style="
              transform: translate(-50%, -50%);
              background: #020617;
              border: 1px solid ${isBreached ? '#f43f5e' : '#f59e0b'};
              color: ${isBreached ? '#fca5a5' : '#fde68a'};
              font-family: 'JetBrains Mono', monospace;
              font-size: 9px;
              font-weight: 800;
              padding: 1px 6px;
              border-radius: 4px;
              white-space: nowrap;
            ">
              ${guard.currentGeofenceDistanceMeters || 350}m OUT
            </div>
          `,
          className: 'cad-breach-dist-icon',
          iconSize: [0, 0]
        });
        L.marker([midLat, midLng], { icon: distBadge }).addTo(guardsGroup);
      }

      // 3. Guard Tactical Street Marker with Pulsing Status Ring
      const pulseClass = isBreached
        ? 'cad-pin-red-pulse'
        : isDebounce
        ? 'cad-pin-amber-pulse'
        : 'cad-pin-green-pulse';

      const statusLabel = isBreached
        ? '🚨 BREACH'
        : isDebounce
        ? `⏱️ ${guard.debounceSecondsRemaining || 180}s`
        : guard.currentStatus === 'on_break'
        ? '☕ BREAK'
        : '✓ ON POST';

      const guardHtml = `
        <div style="
          position: relative;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          opacity: ${isDimmed ? '0.35' : '1'};
          cursor: pointer;
        ">
          <div class="${pulseClass}" style="
            width: ${isSelected ? '26px' : '22px'};
            height: ${isSelected ? '26px' : '22px'};
            border-radius: 9999px;
            background: #0f172a;
            border: ${isSelected ? '3px solid #38bdf8' : `2.5px solid ${markerColor}`};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 12px rgba(0,0,0,0.85);
          ">
            <div style="
              width: ${isSelected ? '10px' : '8px'};
              height: ${isSelected ? '10px' : '8px'};
              border-radius: 9999px;
              background: ${markerColor};
            "></div>
          </div>

          <div style="
            margin-left: 6px;
            background: rgba(9, 13, 22, 0.95);
            border: ${isSelected ? '1.5px solid #38bdf8' : `1px solid ${markerColor}`};
            border-radius: 6px;
            padding: 2px 7px;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0,0,0,0.75);
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 800; color: #ffffff;">
              ${guard.guardName}
            </span>
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 800; color: ${markerColor};">
              ${statusLabel}
            </span>
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 8.5px; color: #64748b;">
              ±${accuracyMeters}m
            </span>
          </div>
        </div>
      `;

      const guardIcon = L.divIcon({
        html: guardHtml,
        className: 'cad-live-guard-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -16]
      });

      const marker = L.marker([lat, lng], { icon: guardIcon });
      marker.on('click', () => {
        setSelectedGuardId(guard.guardId);
      });
      marker.addTo(guardsGroup);
    });
  }, [displayedGuards, selectedGuard?.guardId, emergencyHighlightMode, sitesList, leafletReady]);

  const handleResetView = () => {
    if (!leafletMapRef.current || !window.L) return;
    const L = window.L;
    const coords: [number, number][] = [];
    sitesList.forEach((s) => {
      if (s.latitude && s.longitude) coords.push([s.latitude, s.longitude]);
    });
    activeGuards.forEach((g) => {
      if (g.gpsCoordinates?.latitude && g.gpsCoordinates?.longitude) {
        coords.push([g.gpsCoordinates.latitude, g.gpsCoordinates.longitude]);
      }
    });
    if (coords.length > 0) {
      leafletMapRef.current.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 15 });
    }
  };

  const handleCenterOnGuard = (guard: GuardLiveTrackingItem) => {
    setSelectedGuardId(guard.guardId);
    if (!guard.gpsCoordinates || !leafletMapRef.current) return;
    leafletMapRef.current.flyTo(
      [guard.gpsCoordinates.latitude, guard.gpsCoordinates.longitude],
      16,
      { duration: 0.6 }
    );
  };

  const handleCenterOnDevice = () => {
    if (!deviceLocation) {
      requestDeviceGeolocation();
      return;
    }
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([deviceLocation.latitude, deviceLocation.longitude], 16, {
        duration: 0.6
      });
    }
    showToast(
      'Centered on Device GPS',
      `Coordinates: ${deviceLocation.latitude.toFixed(4)}°N, ${deviceLocation.longitude.toFixed(4)}°W`,
      'info'
    );
  };

  // Simulate Guard Departure (>350m outside geofence to test debounce countdown)
  const handleSimulateDeparture = (guard: GuardLiveTrackingItem) => {
    if (!guard.activeShift) return;
    const site = sitesList.find(
      (s) => s.name === guard.currentSiteName || s.id === guard.activeShift?.siteId
    );
    const baseLat = site?.latitude || 47.6117;
    const baseLng = site?.longitude || -122.3533;
    const distanceMeters = 380; // 380m outside boundary
    const simulatedGps = {
      latitude: Number((baseLat + distanceMeters / 111111).toFixed(6)),
      longitude: Number(
        (baseLng - distanceMeters / (111111 * Math.cos((baseLat * Math.PI) / 180))).toFixed(6)
      ),
      accuracy: 5
    };

    updateGuardGeofenceState(guard.activeShift.id, {
      inGeofence: false,
      distanceMeters,
      currentGps: simulatedGps
    });
    showToast(
      'Perimeter Departure Triggered',
      `Officer ${guard.guardName} moved 380m outside ${guard.currentSiteName}. 3-minute debounce active.`,
      'warning'
    );
  };

  // Simulate Guard Return (<20m inside site geofence)
  const handleSimulateReturn = (guard: GuardLiveTrackingItem) => {
    if (!guard.activeShift) return;
    const site = sitesList.find(
      (s) => s.name === guard.currentSiteName || s.id === guard.activeShift?.siteId
    );
    const baseLat = site?.latitude || 47.6117;
    const baseLng = site?.longitude || -122.3533;

    updateGuardGeofenceState(guard.activeShift.id, {
      inGeofence: true,
      distanceMeters: 14,
      matchedParcelName: site?.multiParcels?.[0]?.name || 'Primary Facility Perimeter',
      currentGps: { latitude: baseLat, longitude: baseLng, accuracy: 4 }
    });
    showToast(
      'Returned Inside Perimeter',
      `Officer ${guard.guardName} returned inside ${guard.currentSiteName}. Geofence compliant.`,
      'success'
    );
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
    const site = sitesList.find(
      (s) => s.name === guard.currentSiteName || s.id === guard.activeShift?.siteId
    );
    let inGeofence = true;
    let dist = 15;

    if (site && site.latitude && site.longitude) {
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
    showToast(
      'GPS Synchronized',
      `Assigned live device GPS to ${guard.guardName} (${dist}m from ${guard.currentSiteName}).`,
      'success'
    );
  };

  return (
    <div
      id="guard-map-dashboard-container"
      className="flex flex-col md:h-full w-full bg-slate-950 text-slate-100 md:overflow-hidden relative font-sans select-none"
    >
      {/* TOP HEADER CONTROLS BAR WITH MODE SWITCHER */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20 shadow-md">
        {/* Left: Title & Dual-Mode Map Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-xs">
            <Compass className="w-4 h-4 text-white animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                Command CAD GIS Street Map & Geofence Telemetry
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              CartoDB Dark Matter Street Tiles • {activeGuards.length} Guards Active • {sitesList.length} Client Properties
            </p>
          </div>

          {/* Dedicated View Toggle alongside Live Guard Map */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 ml-1">
            <button
              id="switch-live-guard-gps-map-btn"
              type="button"
              onClick={() => setMapViewMode('live_guard_gps')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                mapViewMode === 'live_guard_gps'
                  ? 'bg-blue-600 text-white font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              [ 📡 Live Guard GPS Map ]
            </button>
            <button
              id="switch-regional-client-sites-map-btn"
              type="button"
              onClick={() => setMapViewMode('regional_client_sites')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                mapViewMode === 'regional_client_sites'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              [ 🗺️ Regional Client Sites Map ]
            </button>
          </div>
        </div>

        {/* Right: Emergency Toggle & Geolocation API Status (Shown in Live Guard GPS Mode) */}
        {mapViewMode === 'live_guard_gps' && (
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
              <ShieldAlert
                className={`w-4 h-4 ${
                  emergencyHighlightMode || breachGuards.length > 0
                    ? 'text-amber-300'
                    : 'text-slate-400'
                }`}
              />
              <span>Emergency Highlight: {emergencyHighlightMode ? 'ON' : 'OFF'}</span>
              {breachGuards.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full">
                  {breachGuards.length} Breach
                </span>
              )}
            </button>

            {/* Browser Geolocation API Status Pill */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-mono">
              <Crosshair
                className={`w-3.5 h-3.5 ${
                  geoApiStatus === 'active' ? 'text-cyan-400 animate-pulse' : 'text-amber-400'
                }`}
              />
              <span className="text-slate-400 hidden sm:inline">Device GPS:</span>
              {geoApiStatus === 'active' && deviceLocation ? (
                <span className="text-cyan-300 font-bold">
                  ±{geoApiAccuracy}m ({deviceLocation.latitude.toFixed(3)}°,{' '}
                  {deviceLocation.longitude.toFixed(3)}°)
                </span>
              ) : geoApiStatus === 'requesting' ? (
                <span className="text-amber-300">Locking Fix...</span>
              ) : (
                <span className="text-slate-400">Default Sector</span>
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
        )}
      </div>

      {/* IF REGIONAL CLIENT SITES MAP MODE IS SELECTED */}
      {mapViewMode === 'regional_client_sites' ? (
        <RegionalClientSitesMap
          embeddedInMapDashboard={true}
          onOpenSiteDirectory={(siteId, siteName) => {
            onSelectSite?.(siteName || siteId || '');
          }}
          onConfigurePortals={(siteId) => {
            if (onConfigurePortals) {
              onConfigurePortals(siteId);
            } else {
              onSelectSite?.(siteId);
            }
          }}
          onSwitchToLiveGuardMap={() => setMapViewMode('live_guard_gps')}
        />
      ) : (
        <>
          {/* EMERGENCY HIGH PRIORITY BANNER (Shown when Breaches or Emergency Highlight is Active) */}
          {(emergencyHighlightMode || breachGuards.length > 0) && (
            <div
              className={`px-4 py-2 border-b flex items-center justify-between gap-3 text-xs z-20 animate-in fade-in transition-all ${
                breachGuards.length > 0
                  ? 'bg-rose-950/95 border-rose-500/80 text-rose-100'
                  : 'bg-amber-950/90 border-amber-500/60 text-amber-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
                <div className="truncate">
                  <span className="font-black uppercase tracking-wider text-rose-300 mr-2">
                    {breachGuards.length > 0
                      ? 'CRITICAL GEOFENCE BREACH ALERT'
                      : 'EMERGENCY HIGHLIGHT MODE ENGAGED'}
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

          {/* MAIN WORKSPACE: INTERACTIVE LEAFLET STREET MAP + TELEMETRY SIDEBAR */}
          <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden relative">
            {/* INTERACTIVE LEAFLET STREET MAP CANVAS CONTAINER */}
            <div className="h-[340px] sm:h-[400px] md:h-[500px] lg:h-full w-full md:flex-1 relative overflow-hidden bg-slate-950 shrink-0">
              <div
                ref={mapContainerRef}
                style={{ touchAction: 'pan-x pan-y' }}
                className="w-full h-full z-10"
              />

              {/* FLOATING MAP VIEW CONTROLS (Zoom, Layers, Reset) */}
              <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
                <button
                  id="map-zoom-in-btn"
                  type="button"
                  onClick={() => leafletMapRef.current?.zoomIn()}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                  title="Zoom In"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  id="map-zoom-out-btn"
                  type="button"
                  onClick={() => leafletMapRef.current?.zoomOut()}
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
                  title="Reset View to Fit All Guards & Sites"
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

              {/* TOP-RIGHT MAP CONTROLS: TILE LAYER STYLE SWITCHER */}
              <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
                <button
                  id="mobile-map-touch-shield-toggle-btn"
                  type="button"
                  onClick={() => setIsMapPanActive((prev) => !prev)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-black tracking-wide backdrop-blur-md border shadow-xl transition-all cursor-pointer ${
                    isMapPanActive
                      ? 'bg-emerald-600/90 border-emerald-400 text-white ring-2 ring-emerald-400/50'
                      : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-100'
                  }`}
                >
                  [ 🖐️ Two-Finger / Touch Pan Ready ]
                </button>

                <div className="hidden sm:flex items-center gap-1 bg-slate-900/95 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl text-xs">
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
                      {style === 'tactical'
                        ? 'Dark Matter'
                        : style === 'satellite'
                        ? 'Satellite'
                        : 'Street Day'}
                    </button>
                  ))}
                </div>
              </div>

              {/* FLOATING MAP STATUS BAR / COORDINATE TICKER (Bottom Left of Canvas) */}
              <div className="absolute bottom-3 left-3 z-20 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-xl flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Zoom: z{zoomLevel}</span>
                </span>
                <span>•</span>
                <span>Active Sector: Seattle Metro & Waterfront</span>
                {selectedGuard?.gpsCoordinates && (
                  <>
                    <span>•</span>
                    <span className="text-cyan-300 font-bold">
                      {selectedGuard.guardName}:{' '}
                      {selectedGuard.gpsCoordinates.latitude.toFixed(4)}°N,{' '}
                      {selectedGuard.gpsCoordinates.longitude.toFixed(4)}°W (±
                      {selectedGuard.gpsCoordinates.accuracy || 5}m)
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
                          <span className="truncate">
                            {selectedGuard.currentSiteName || 'Unassigned Post'}
                          </span>
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
                    <div
                      className={`p-3 rounded-xl border transition-all ${
                        selectedGuard.offSiteBreachStatus === 'breached_unacknowledged'
                          ? 'bg-rose-950/80 border-rose-500/80 shadow-lg shadow-rose-950/50'
                          : selectedGuard.offSiteBreachStatus === 'debounce_pending'
                          ? 'bg-amber-950/80 border-amber-500/80 animate-pulse shadow-lg shadow-amber-950/50'
                          : selectedGuard.offSiteBreachStatus === 'excused'
                          ? 'bg-blue-950/70 border-blue-500/60'
                          : 'bg-emerald-950/40 border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-mono uppercase font-black flex items-center gap-1.5 ${
                            selectedGuard.offSiteBreachStatus === 'breached_unacknowledged'
                              ? 'text-rose-400'
                              : selectedGuard.offSiteBreachStatus === 'debounce_pending'
                              ? 'text-amber-400'
                              : selectedGuard.offSiteBreachStatus === 'excused'
                              ? 'text-blue-400'
                              : 'text-emerald-400'
                          }`}
                        >
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
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className="bg-gradient-to-r from-amber-500 to-rose-500 h-full transition-all duration-1000"
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      ((selectedGuard.debounceSecondsRemaining || 180) / 180) * 100
                                    )
                                  )}%`
                                }}
                              />
                            </div>
                          </div>

                          <div className="text-[11px] font-mono text-slate-300 flex items-center justify-between px-1">
                            <span className="text-slate-400">Time Outside Geofence:</span>
                            <span className="text-amber-200 font-bold">
                              {selectedGuard.outOfBoundsSince
                                ? `${Math.floor(
                                    (Date.now() -
                                      new Date(selectedGuard.outOfBoundsSince).getTime()) /
                                      1000 /
                                      60
                                  )}m ${Math.floor(
                                    ((Date.now() -
                                      new Date(selectedGuard.outOfBoundsSince).getTime()) /
                                      1000) %
                                      60
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
                                    (Date.now() -
                                      new Date(selectedGuard.outOfBoundsSince).getTime()) /
                                      1000 /
                                      60
                                  )}m ${Math.floor(
                                    ((Date.now() -
                                      new Date(selectedGuard.outOfBoundsSince).getTime()) /
                                      1000) %
                                      60
                                  )}s`
                                : 'Exceeded 3m'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-300 font-mono mt-1">
                          Officer verified inside{' '}
                          {selectedGuard.matchedParcelName || selectedGuard.currentSiteName}.
                          Continuous GPS polling verified.
                        </p>
                      )}

                      {/* Action Controls on Breach Card */}
                      <div className="pt-2 mt-2 border-t border-white/10 flex items-center gap-1.5 flex-wrap">
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
                              onClick={() =>
                                selectedGuard.activeShift &&
                                clearGeofenceBreach(selectedGuard.activeShift.id)
                              }
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
                        <span
                          className={`font-bold uppercase ${
                            selectedGuard.currentStatus === 'on_duty'
                              ? 'text-emerald-400'
                              : 'text-purple-400'
                          }`}
                        >
                          {selectedGuard.currentStatus.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">
                          GPS Accuracy
                        </span>
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
                        {mode === 'on_duty' &&
                          `On Duty (${
                            activeGuards.filter((g) => g.currentStatus === 'on_duty').length
                          })`}
                        {mode === 'breach_only' && `Breaches (${breachGuards.length})`}
                        {mode === 'on_break' &&
                          `Break (${
                            activeGuards.filter((g) => g.currentStatus === 'on_break').length
                          })`}
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
                            <div
                              className={`w-3 h-3 rounded-full shrink-0 ${
                                isBreached
                                  ? 'bg-rose-500 animate-ping'
                                  : isDebounce
                                  ? 'bg-amber-400 animate-pulse'
                                  : guard.currentStatus === 'on_break'
                                  ? 'bg-purple-400'
                                  : 'bg-emerald-400'
                              }`}
                            />
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
        </>
      )}

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
                Officer: <strong className="text-white">{excusalModalGuard.guardName}</strong> (
                {excusalModalGuard.guardBadge})
              </p>
              <p className="text-slate-300">
                Facility:{' '}
                <strong className="text-blue-300">{excusalModalGuard.currentSiteName}</strong>
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
                <option value="Authorized Break">Authorized Break</option>
                <option value="Perimeter Sweep">Perimeter Sweep</option>
                <option value="Incident Escort">Incident Escort</option>
                <option value="Emergency Response">Emergency Response</option>
                <option value="Other">Other</option>
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
