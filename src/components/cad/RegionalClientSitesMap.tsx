import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { SiteProfile, GuardLiveTrackingItem } from '../../types/shift';
import {
  ensureLeafletLoaded,
  getTileLayerConfig
} from '../../utils/leafletLoader';
import {
  Building2,
  MapPin,
  PhoneCall,
  Search,
  Plus,
  Minus,
  RotateCcw,
  FileText,
  Wrench,
  X,
  Compass
} from 'lucide-react';

interface RegionalClientSitesMapProps {
  onOpenSiteDirectory?: (siteId?: string, siteName?: string) => void;
  onConfigurePortals?: (siteId: string) => void;
  onSwitchToLiveGuardMap?: () => void;
  embeddedInMapDashboard?: boolean;
}

export type SitePinStatus = 'COVERED_ON_POST' | 'UNASSIGNED_COVERAGE_NEEDED' | 'ACTIVE_BREACH_OR_INCIDENT';

export interface EnrichedSiteMapItem {
  site: SiteProfile;
  lat: number;
  lng: number;
  radiusMeters: number;
  pinStatus: SitePinStatus;
  onDutyGuards: GuardLiveTrackingItem[];
  hasBreach: boolean;
  hasActiveIncident: boolean;
  openShiftsCount: number;
  activePassDownNote: string;
  maintenanceContactName: string;
  maintenanceContactPhone: string;
  maintenanceContactTitle: string;
}

export const RegionalClientSitesMap: React.FC<RegionalClientSitesMapProps> = ({
  onOpenSiteDirectory,
  onConfigurePortals,
  onSwitchToLiveGuardMap,
  embeddedInMapDashboard = false
}) => {
  const {
    sitesList,
    getGuardsLiveTracking,
    shifts,
    scheduledShifts,
    callsForService,
    standardReports,
    siteIssues
  } = useShiftOps();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersLayerGroupRef = useRef<any>(null);
  const geofenceLayerGroupRef = useRef<any>(null);

  const [leafletReady, setLeafletReady] = useState<boolean>(false);
  const [tileMode, setTileMode] = useState<'dark_matter' | 'satellite' | 'street_day'>('dark_matter');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SitePinStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [showGeofenceCircles, setShowGeofenceCircles] = useState<boolean>(true);

  const liveGuards = getGuardsLiveTracking();

  // Enrich active client properties with live guard, breach, and maintenance telemetry
  const enrichedSites = useMemo<EnrichedSiteMapItem[]>(() => {
    const activeSites = sitesList.filter((s) => s.status !== 'inactive');

    return activeSites.map((site, idx) => {
      const lat =
        site.latitude ||
        site.coordinates?.latitude ||
        47.6062 + ((idx % 5) - 2) * 0.014 + Math.sin(idx * 1.7) * 0.008;
      const lng =
        site.longitude ||
        site.coordinates?.longitude ||
        -122.3321 + ((idx % 4) - 1.5) * 0.018 + Math.cos(idx * 1.3) * 0.009;
      const radiusMeters = site.geofenceRadiusMeters || 180;

      // Guards currently on duty / on break at this site
      const onDutyGuards = liveGuards.filter(
        (g) =>
          (g.currentStatus === 'on_duty' || g.currentStatus === 'on_break' || g.currentStatus === 'late') &&
          (g.currentSiteName === site.name || g.activeShift?.siteId === site.id || g.activeShift?.siteName === site.name)
      );

      // Check for active geofence breach on this site
      const hasBreach = onDutyGuards.some(
        (g) =>
          g.offSiteBreachStatus === 'breached_unacknowledged' ||
          g.offSiteBreachStatus === 'debounce_pending'
      );

      // Check for active urgent calls or flagged incidents at this site
      const hasUrgentCall = (callsForService || []).some(
        (c) =>
          c.status !== 'cleared' &&
          c.status !== 'cancelled' &&
          (c.siteName === site.name || c.siteId === site.id) &&
          (c.priority === 'emergency' || c.priority === 'urgent_bolo' || c.priority === 'high')
      );

      const hasRecentIncident = (standardReports || []).some(
        (r) =>
          r.reportType === 'incident' &&
          r.siteName === site.name &&
          r.status === 'submitted'
      );

      const hasCriticalChronicIssue = (siteIssues || []).some(
        (iss) =>
          (iss.siteId === site.id || iss.siteName === site.name) &&
          iss.status !== 'RESOLVED' &&
          (iss.severity === 'CRITICAL' || iss.isChronicEscalated)
      );

      const hasActiveIncident = hasUrgentCall || hasRecentIncident || hasCriticalChronicIssue;

      // Open / unassigned shifts for this site
      const openShiftsCount =
        (shifts || []).filter((s) => s.status === 'open' && s.site === site.name).length +
        (scheduledShifts || []).filter(
          (s) => (s.siteId === site.id || s.siteName === site.name) && !s.guardId
        ).length;

      // Determine Pin Status:
      // 🔴 Red Pulsating Halo: Active geofence breach, alarm, or flagged incident in progress
      // 🟢 Green Halo: Guard currently clocked in & on post
      // 🟡 Amber Halo: Active shift scheduled/open but unassigned / coverage needed
      let pinStatus: SitePinStatus = 'COVERED_ON_POST';
      if (hasBreach || hasActiveIncident) {
        pinStatus = 'ACTIVE_BREACH_OR_INCIDENT';
      } else if (onDutyGuards.length > 0) {
        pinStatus = 'COVERED_ON_POST';
      } else {
        pinStatus = 'UNASSIGNED_COVERAGE_NEEDED';
      }

      // Pass-down notes
      const activePassDownNote =
        site.postInstructions ||
        site.rovingNotes ||
        site.accessGateNotes ||
        'Maintain high-visibility perimeter patrol. Verify all exterior access doors and mechanical rooms every 30 minutes.';

      // Emergency Maintenance Contact
      const maintContact =
        site.contacts?.find(
          (c) =>
            c.title.toLowerCase().includes('maintenance') ||
            c.title.toLowerCase().includes('engineer') ||
            c.isEmergencyContact
        ) || site.contacts?.[0];

      const maintenanceContactName = maintContact?.name || site.primaryContactName || 'Facility Engineering Desk';
      const maintenanceContactTitle = maintContact?.title || '24/7 Emergency Maintenance & Facilities';
      const maintenanceContactPhone = maintContact?.phone || site.emergencyPhone || site.primaryContactPhone || '(206) 555-0199';

      return {
        site,
        lat,
        lng,
        radiusMeters,
        pinStatus,
        onDutyGuards,
        hasBreach,
        hasActiveIncident,
        openShiftsCount,
        activePassDownNote,
        maintenanceContactName,
        maintenanceContactPhone,
        maintenanceContactTitle
      };
    });
  }, [sitesList, liveGuards, shifts, scheduledShifts, callsForService, standardReports, siteIssues]);

  const filteredSites = useMemo(() => {
    return enrichedSites.filter((item) => {
      if (statusFilter !== 'ALL' && item.pinStatus !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.site.name.toLowerCase().includes(q);
        const matchCode = (item.site.code || '').toLowerCase().includes(q);
        const matchAddr = (item.site.address || '').toLowerCase().includes(q);
        const matchGuard = item.onDutyGuards.some(
          (g) => g.guardName.toLowerCase().includes(q) || g.guardBadge.toLowerCase().includes(q)
        );
        return matchName || matchCode || matchAddr || matchGuard;
      }
      return true;
    });
  }, [enrichedSites, statusFilter, searchQuery]);

  // Quick Metric Overlay KPIs
  const metrics = useMemo(() => {
    const totalProperties = enrichedSites.length;
    const guardsOnPost = enrichedSites.reduce((sum, s) => sum + s.onDutyGuards.length, 0);
    const coveredPropertiesCount = enrichedSites.filter((s) => s.onDutyGuards.length > 0).length;
    const coveragePercent =
      totalProperties > 0 ? Math.round((coveredPropertiesCount / totalProperties) * 100) : 100;
    const breachOrIncidentCount = enrichedSites.filter(
      (s) => s.pinStatus === 'ACTIVE_BREACH_OR_INCIDENT'
    ).length;
    const unassignedCount = enrichedSites.filter(
      (s) => s.pinStatus === 'UNASSIGNED_COVERAGE_NEEDED'
    ).length;

    return {
      totalProperties,
      guardsOnPost,
      coveredPropertiesCount,
      coveragePercent,
      breachOrIncidentCount,
      unassignedCount
    };
  }, [enrichedSites]);

  const selectedSiteItem = useMemo(() => {
    if (!selectedSiteId) return null;
    return enrichedSites.find((s) => s.site.id === selectedSiteId) || null;
  }, [selectedSiteId, enrichedSites]);

  // Load Leaflet & Initialize Map with Esri World Dark Gray Canvas (zero API key, zero watermarks)
  useEffect(() => {
    let isMounted = true;
    ensureLeafletLoaded()
      .then((L) => {
        if (!isMounted || !mapContainerRef.current) return;
        if (!leafletMapRef.current) {
          const map = L.map(mapContainerRef.current, {
            center: [47.6117, -122.342],
            zoom: 13,
            zoomControl: false,
            attributionControl: true
          });

          const tileCfg = getTileLayerConfig('dark_matter');
          const tileLayer = L.tileLayer(tileCfg.url, {
            attribution: tileCfg.attribution,
            ...tileCfg.options
          }).addTo(map);

          const geofenceGroup = L.layerGroup().addTo(map);
          const markersGroup = L.layerGroup().addTo(map);

          leafletMapRef.current = map;
          tileLayerRef.current = tileLayer;
          geofenceLayerGroupRef.current = geofenceGroup;
          markersLayerGroupRef.current = markersGroup;

          if (enrichedSites.length > 0) {
            const latLngs = enrichedSites.map((s) => [s.lat, s.lng]);
            const bounds = L.latLngBounds(latLngs);
            map.fitBounds(bounds, { padding: [55, 55], maxZoom: 14 });
          }
        }
        setLeafletReady(true);
      })
      .catch((err) => {
        console.error('Failed to load Leaflet:', err);
      });

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Handle tile style switch (Dark Matter = Esri World Dark Gray Canvas, Satellite = Esri World Imagery, Street Day = OpenStreetMap)
  useEffect(() => {
    if (!leafletReady || !leafletMapRef.current || !window.L) return;
    const L = window.L;
    if (tileLayerRef.current) {
      leafletMapRef.current.removeLayer(tileLayerRef.current);
    }
    const tileCfg = getTileLayerConfig(tileMode);
    tileLayerRef.current = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      ...tileCfg.options
    }).addTo(leafletMapRef.current);
  }, [tileMode, leafletReady]);

  // Render Geofence Circles & Compact 14px Tactical Radar Dots (NO permanent text banners stacking on mobile)
  useEffect(() => {
    if (!leafletReady || !leafletMapRef.current || !window.L) return;
    const L = window.L;
    const geofenceGroup = geofenceLayerGroupRef.current;
    const markersGroup = markersLayerGroupRef.current;
    if (!geofenceGroup || !markersGroup) return;

    geofenceGroup.clearLayers();
    markersGroup.clearLayers();

    filteredSites.forEach((item) => {
      const isSelected = item.site.id === selectedSiteId;

      const colorHex =
        item.pinStatus === 'ACTIVE_BREACH_OR_INCIDENT'
          ? '#f43f5e' // Red
          : item.pinStatus === 'UNASSIGNED_COVERAGE_NEEDED'
          ? '#f59e0b' // Amber
          : '#10b981'; // Green

      // 1. Real Geofence Perimeter Overlay Circle
      if (showGeofenceCircles) {
        const circle = L.circle([item.lat, item.lng], {
          radius: item.radiusMeters,
          color: isSelected ? '#38bdf8' : colorHex,
          weight: isSelected ? 2.5 : 1.5,
          opacity: isSelected ? 0.95 : 0.65,
          fillColor: colorHex,
          fillOpacity: isSelected ? 0.22 : 0.1,
          dashArray: item.pinStatus === 'ACTIVE_BREACH_OR_INCIDENT' ? '6, 4' : '4, 4'
        });
        circle.on('click', () => {
          setSelectedSiteId(item.site.id);
          leafletMapRef.current?.panTo([item.lat, item.lng], { animate: true });
        });
        circle.addTo(geofenceGroup);

        // Multi-parcel polygons if configured
        if (item.site.multiParcels && item.site.multiParcels.length > 0) {
          item.site.multiParcels.forEach((parcel) => {
            if (parcel.coordinates && parcel.coordinates.length >= 3) {
              const polyCoords = parcel.coordinates.map((c) => [c.latitude, c.longitude]);
              const poly = L.polygon(polyCoords, {
                color: parcel.color || '#38bdf8',
                weight: 1.5,
                fillColor: parcel.color || '#38bdf8',
                fillOpacity: 0.14,
                dashArray: '3, 3'
              });
              poly.addTo(geofenceGroup);
            }
          });
        }
      }

      // 2. Compact 14px Pulsing Tactical Radar Dot with Status Halo (Labels hidden by default to prevent stacking)
      const pulseClass =
        item.pinStatus === 'ACTIVE_BREACH_OR_INCIDENT'
          ? 'cad-pin-red-pulse'
          : item.pinStatus === 'UNASSIGNED_COVERAGE_NEEDED'
          ? 'cad-pin-amber-pulse'
          : 'cad-pin-green-pulse';

      const haloRgba =
        item.pinStatus === 'ACTIVE_BREACH_OR_INCIDENT'
          ? 'rgba(244, 63, 94, 0.35)'
          : item.pinStatus === 'UNASSIGNED_COVERAGE_NEEDED'
          ? 'rgba(245, 158, 11, 0.30)'
          : 'rgba(16, 185, 129, 0.28)';

      const iconHtml = `
        <div style="
          position: relative;
          width: ${isSelected ? '28px' : '24px'};
          height: ${isSelected ? '28px' : '24px'};
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <!-- Outer Status Halo Ring -->
          <div class="${pulseClass}" style="
            position: absolute;
            inset: 0;
            border-radius: 9999px;
            background: ${haloRgba};
            border: ${isSelected ? '2px solid #38bdf8' : `1.5px solid ${colorHex}`};
          "></div>
          <!-- Inner 14px Tactical Radar Dot -->
          <div style="
            position: relative;
            width: 14px;
            height: 14px;
            border-radius: 9999px;
            background: ${colorHex};
            border: 2px solid #020617;
            box-shadow: 0 2px 6px rgba(0,0,0,0.85);
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'regional-site-compact-dot',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -14]
      });

      const marker = L.marker([item.lat, item.lng], { icon: customIcon });

      const statusBadgeText =
        item.pinStatus === 'ACTIVE_BREACH_OR_INCIDENT'
          ? item.hasBreach
            ? '🚨 GEOFENCE BREACH'
            : '🚨 ACTIVE ALARM'
          : item.pinStatus === 'UNASSIGNED_COVERAGE_NEEDED'
          ? '⚠️ OPEN / UNASSIGNED'
          : `✓ ${item.onDutyGuards.length} ON POST`;

      const guardSummary =
        item.onDutyGuards.length > 0
          ? `${item.onDutyGuards[0].guardName} (${item.onDutyGuards[0].guardBadge})`
          : 'UNASSIGNED / OPEN';

      // Interactive Popup on Tap
      const popupContainer = document.createElement('div');
      popupContainer.style.minWidth = '250px';
      popupContainer.style.maxWidth = '300px';
      popupContainer.innerHTML = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #f8fafc;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; border-bottom: 1px solid #1e293b; padding-bottom: 5px; margin-bottom: 6px;">
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 800; color: #38bdf8; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); padding: 1px 6px; border-radius: 4px;">
              ID: ${item.site.code || item.site.id.toUpperCase()}
            </span>
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 800; color: ${colorHex};">
              ${statusBadgeText}
            </span>
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #ffffff; margin-bottom: 2px;">
            ${item.site.name}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">
            📍 ${item.site.address}, ${item.site.city || 'Seattle'} (${item.radiusMeters}m)
          </div>
          <div style="font-size: 11px; font-weight: 700; color: ${
            item.onDutyGuards.length > 0 ? '#34d399' : '#fbbf24'
          }; margin-bottom: 8px;">
            👮 ${guardSummary}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button
              type="button"
              data-action="open-site-directory"
              style="background: #2563eb; color: #ffffff; border: 1px solid #60a5fa; border-radius: 7px; padding: 5px 6px; font-size: 9.5px; font-family: 'JetBrains Mono', monospace; font-weight: 800; cursor: pointer; text-align: center;"
            >
              [ 🏢 Site Directory ]
            </button>
            <button
              type="button"
              data-action="configure-portals"
              style="background: #059669; color: #ffffff; border: 1px solid #34d399; border-radius: 7px; padding: 5px 6px; font-size: 9.5px; font-family: 'JetBrains Mono', monospace; font-weight: 800; cursor: pointer; text-align: center;"
            >
              [ ⚙️ Portals Config ]
            </button>
          </div>
        </div>
      `;

      const openDirBtn = popupContainer.querySelector('[data-action="open-site-directory"]');
      if (openDirBtn) {
        openDirBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          onOpenSiteDirectory?.(item.site.id, item.site.name);
        });
      }

      const configPortalsBtn = popupContainer.querySelector('[data-action="configure-portals"]');
      if (configPortalsBtn) {
        configPortalsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          onConfigurePortals?.(item.site.id);
        });
      }

      marker.bindPopup(popupContainer, {
        maxWidth: 310,
        closeButton: true
      });

      marker.on('click', () => {
        setSelectedSiteId(item.site.id);
        leafletMapRef.current?.panTo([item.lat, item.lng], { animate: true });
      });

      marker.addTo(markersGroup);
    });
  }, [filteredSites, selectedSiteId, showGeofenceCircles, leafletReady]);

  const handleFitAllSites = () => {
    if (!leafletMapRef.current || !window.L || filteredSites.length === 0) return;
    const L = window.L;
    const bounds = L.latLngBounds(filteredSites.map((s) => [s.lat, s.lng]));
    leafletMapRef.current.fitBounds(bounds, { padding: [55, 55], maxZoom: 15 });
  };

  const handleFocusSite = (item: EnrichedSiteMapItem) => {
    setSelectedSiteId(item.site.id);
    if (!leafletMapRef.current) return;
    leafletMapRef.current.flyTo([item.lat, item.lng], 16, { duration: 0.6 });
  };

  return (
    <div
      id="regional-client-sites-map-view"
      className={`flex flex-col w-full bg-slate-950 text-slate-100 select-none ${
        embeddedInMapDashboard
          ? 'flex-1 min-h-[560px] md:h-full'
          : 'min-h-[680px] h-[calc(100vh-140px)] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl'
      }`}
    >
      {/* Top Command Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-600/20 border border-emerald-500/40 rounded-xl text-emerald-400">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                🗺️ Master Regional Client Sites & Geofence Perimeter Map
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                LIVE CAD GIS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Esri Dark Gray Tactical Tiles • Compact Radar Pins • Real-Time Facility Coverage
            </p>
          </div>
        </div>

        {/* Filter Pills & View Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {onSwitchToLiveGuardMap && (
            <button
              type="button"
              onClick={onSwitchToLiveGuardMap}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-300 text-xs font-mono font-bold cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>[ 📡 Switch to Live Guard GPS Radar ]</span>
            </button>
          )}

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-mono overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({enrichedSites.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COVERED_ON_POST')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                statusFilter === 'COVERED_ON_POST'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400 hover:bg-slate-900'
              }`}
            >
              <span>🟢 On Post ({enrichedSites.filter((s) => s.pinStatus === 'COVERED_ON_POST').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('UNASSIGNED_COVERAGE_NEEDED')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                statusFilter === 'UNASSIGNED_COVERAGE_NEEDED'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-amber-400 hover:bg-slate-900'
              }`}
            >
              <span>🟡 Unassigned ({metrics.unassignedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE_BREACH_OR_INCIDENT')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                statusFilter === 'ACTIVE_BREACH_OR_INCIDENT'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-400 hover:bg-slate-900'
              }`}
            >
              <span>🔴 Breach ({metrics.breachOrIncidentCount})</span>
            </button>
          </div>

          {/* Toggle Geofence Circles */}
          <button
            type="button"
            onClick={() => setShowGeofenceCircles((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold border cursor-pointer transition-colors ${
              showGeofenceCircles
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            {showGeofenceCircles ? '◎ Geofences ON' : '○ Geofences OFF'}
          </button>
        </div>
      </div>

      {/* Main Map + Right-Hand Directory & Floating Bottom Drawer */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative overflow-hidden">
        {/* Interactive Leaflet Street Map Canvas */}
        <div className="flex-1 relative min-h-[420px] lg:h-full w-full bg-slate-950">
          <div
            ref={mapContainerRef}
            style={{ touchAction: 'pan-x pan-y' }}
            className="w-full h-full z-10"
          />

          {/* FLOATING QUICK METRIC OVERLAY (Top-Left of Map) */}
          <div
            id="regional-map-quick-metrics-overlay"
            className="absolute top-3 left-3 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex flex-wrap items-center gap-2.5 sm:gap-4 pointer-events-auto"
          >
            <div className="pr-2.5 sm:pr-3 border-r border-slate-800">
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block">
                Total Properties
              </span>
              <span className="text-base sm:text-lg font-mono font-black text-white">
                {metrics.totalProperties} <span className="text-[10px] font-normal text-slate-400">Sites</span>
              </span>
            </div>

            <div className="pr-2.5 sm:pr-3 border-r border-slate-800">
              <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 block">
                Guards On Post
              </span>
              <span className="text-base sm:text-lg font-mono font-black text-emerald-300">
                {metrics.guardsOnPost} <span className="text-[10px] font-normal text-emerald-400/80">Active</span>
              </span>
            </div>

            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-blue-400 block">
                Coverage %
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-mono font-black text-blue-300">
                  {metrics.coveragePercent}%
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ({metrics.coveredPropertiesCount}/{metrics.totalProperties})
                </span>
              </div>
            </div>
          </div>

          {/* FLOATING ZOOM & LAYER CONTROLS (Top-Right of Map) */}
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2 pointer-events-auto">
            {/* Tile Layer Switcher */}
            <div className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setTileMode('dark_matter')}
                className={`px-2 py-1 rounded-lg font-bold uppercase cursor-pointer ${
                  tileMode === 'dark_matter'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dark Matter
              </button>
              <button
                type="button"
                onClick={() => setTileMode('satellite')}
                className={`px-2 py-1 rounded-lg font-bold uppercase cursor-pointer ${
                  tileMode === 'satellite'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Satellite
              </button>
              <button
                type="button"
                onClick={() => setTileMode('street_day')}
                className={`px-2 py-1 rounded-lg font-bold uppercase cursor-pointer ${
                  tileMode === 'street_day'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Street Day
              </button>
            </div>

            {/* Zoom & Fit Controls */}
            <div className="flex flex-col gap-1 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
              <button
                type="button"
                onClick={() => leafletMapRef.current?.zoomIn()}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => leafletMapRef.current?.zoomOut()}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="h-px bg-slate-800 my-0.5" />
              <button
                type="button"
                onClick={handleFitAllSites}
                className="p-1.5 text-cyan-400 hover:text-cyan-200 hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Fit All Client Properties"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SLEEK FLOATING BOTTOM DRAWER ON MAP WHEN A PIN IS TAPPED */}
          {selectedSiteItem ? (
            <div
              id="regional-map-floating-site-drawer"
              className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 md:max-w-lg z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-3.5 shadow-2xl space-y-2.5 pointer-events-auto animate-in fade-in slide-in-from-bottom-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-mono font-black">
                      ID: {selectedSiteItem.site.code || selectedSiteItem.site.id.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                        selectedSiteItem.pinStatus === 'ACTIVE_BREACH_OR_INCIDENT'
                          ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
                          : selectedSiteItem.pinStatus === 'UNASSIGNED_COVERAGE_NEEDED'
                          ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                          : 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                      }`}
                    >
                      {selectedSiteItem.pinStatus === 'ACTIVE_BREACH_OR_INCIDENT'
                        ? '🔴 BREACH / INCIDENT'
                        : selectedSiteItem.pinStatus === 'UNASSIGNED_COVERAGE_NEEDED'
                        ? '🟡 COVERAGE NEEDED'
                        : '🟢 GUARD ON POST'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white mt-1 truncate">
                    {selectedSiteItem.site.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                    <span className="truncate">
                      {selectedSiteItem.site.address}, {selectedSiteItem.site.city || 'Seattle'} ({selectedSiteItem.radiusMeters}m Geofence)
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSiteId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
                  title="Close Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[9px] font-mono uppercase text-slate-400 block">
                    Current On-Duty Guard
                  </span>
                  {selectedSiteItem.onDutyGuards.length > 0 ? (
                    <span className="font-bold text-emerald-300 block mt-0.5 truncate">
                      👮 {selectedSiteItem.onDutyGuards[0].guardName} ({selectedSiteItem.onDutyGuards[0].guardBadge})
                    </span>
                  ) : (
                    <span className="font-mono font-black text-amber-400 block mt-0.5">
                      UNASSIGNED / OPEN
                    </span>
                  )}
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono uppercase text-amber-300 flex items-center gap-1">
                      <Wrench className="w-2.5 h-2.5" />
                      <span>Maintenance Contact</span>
                    </span>
                    <span className="font-bold text-white block mt-0.5 truncate">
                      {selectedSiteItem.maintenanceContactName}
                    </span>
                  </div>
                  <a
                    href={`tel:${selectedSiteItem.maintenanceContactPhone}`}
                    className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold shrink-0 flex items-center gap-1"
                  >
                    <PhoneCall className="w-2.5 h-2.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                <span className="text-[9px] font-mono uppercase text-blue-300 flex items-center gap-1 mb-0.5">
                  <FileText className="w-2.5 h-2.5" />
                  <span>Active Pass-Down Notes</span>
                </span>
                <p className="line-clamp-2">{selectedSiteItem.activePassDownNote}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onOpenSiteDirectory?.(selectedSiteItem.site.id, selectedSiteItem.site.name)
                  }
                  className="py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-[11px] border border-blue-400 shadow-xs cursor-pointer transition-colors"
                >
                  [ 🏢 Open Site Directory ]
                </button>
                <button
                  type="button"
                  onClick={() => onConfigurePortals?.(selectedSiteItem.site.id)}
                  className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-[11px] border border-emerald-400 shadow-xs cursor-pointer transition-colors"
                >
                  [ ⚙️ Configure Portals ]
                </button>
              </div>
            </div>
          ) : (
            /* BOTTOM LEGEND OVERLAY (When drawer is closed) */
            <div className="absolute bottom-3 left-3 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-xl flex flex-wrap items-center gap-3 text-[11px] font-mono pointer-events-auto">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                🟢 Guard Clocked In & Active
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                🟡 Unassigned / Coverage Needed
              </span>
              <span className="flex items-center gap-1.5 text-rose-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
                🔴 Active Breach / Incident
              </span>
            </div>
          )}
        </div>

        {/* Right-Hand Interactive Property Roster */}
        <aside className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col shrink-0 z-20 max-h-[360px] lg:max-h-none lg:h-full overflow-hidden">
          <div className="p-3 border-b border-slate-800 bg-slate-950/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search facility name, ID, address, or guard..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {filteredSites.map((item) => {
              const isSelected = item.site.id === selectedSiteId;
              return (
                <button
                  key={item.site.id}
                  type="button"
                  onClick={() => handleFocusSite(item)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-blue-950/70 border-blue-500 shadow-md'
                      : item.pinStatus === 'ACTIVE_BREACH_OR_INCIDENT'
                      ? 'bg-rose-950/30 border-rose-500/50 hover:bg-rose-950/50'
                      : item.pinStatus === 'UNASSIGNED_COVERAGE_NEEDED'
                      ? 'bg-amber-950/25 border-amber-500/40 hover:bg-amber-950/40'
                      : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span>
                        {item.pinStatus === 'ACTIVE_BREACH_OR_INCIDENT'
                          ? '🔴'
                          : item.pinStatus === 'UNASSIGNED_COVERAGE_NEEDED'
                          ? '🟡'
                          : '🟢'}
                      </span>
                      <span className="text-xs font-bold text-white truncate">
                        {item.site.name}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        ({item.site.code || item.site.id.toUpperCase()})
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {item.site.address} • {item.radiusMeters}m Geofence
                    </p>
                    <p className="text-[10px] font-mono mt-1">
                      {item.onDutyGuards.length > 0 ? (
                        <span className="text-emerald-400 font-bold">
                          👮 {item.onDutyGuards.map((g) => `${g.guardName} (${g.guardBadge})`).join(', ')}
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold">
                          ⚠️ UNASSIGNED / OPEN
                        </span>
                      )}
                    </p>
                  </div>

                  <span className="text-[9px] font-mono text-slate-400 shrink-0 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {item.site.serviceType === 'roving' ? 'ROVING' : 'DEDICATED'}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};
