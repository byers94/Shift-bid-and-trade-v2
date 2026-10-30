import React, { useEffect, useRef, useState } from 'react';
import { ShiftRecord } from '../../types/shift';
import {
  ensureLeafletLoaded,
  getTileLayerConfig
} from '../../utils/leafletLoader';
import { calculateDistanceMeters } from '../../utils/geo';
import { Plus, Minus, RotateCcw } from 'lucide-react';

interface ShiftBreadcrumbLeafletMapProps {
  shift: ShiftRecord;
  geofenceRadiusMeters?: number;
  selectedBreadcrumbIndex: number;
  onSelectBreadcrumbIndex: (idx: number) => void;
  formatTimeAmPm: (ts: string | null | undefined) => string;
}

export const ShiftBreadcrumbLeafletMap: React.FC<ShiftBreadcrumbLeafletMapProps> = ({
  shift,
  geofenceRadiusMeters = 180,
  selectedBreadcrumbIndex,
  onSelectBreadcrumbIndex,
  formatTimeAmPm
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const overlayGroupRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [leafletReady, setLeafletReady] = useState(false);
  const [tileStyle, setTileStyle] = useState<'dark_matter' | 'satellite' | 'street_day'>('dark_matter');

  const crumbs = shift.gpsBreadcrumbs || [];
  const siteCenterLat = shift.clockInLocation?.lat || crumbs[0]?.lat || 47.6101;
  const siteCenterLng = shift.clockInLocation?.lng || crumbs[0]?.lng || -122.3421;

  // Initialize Leaflet Map with Esri World Dark Gray Canvas (zero API key, zero watermarks)
  useEffect(() => {
    let mounted = true;
    ensureLeafletLoaded()
      .then((L) => {
        if (!mounted || !mapContainerRef.current) return;
        if (!mapInstanceRef.current) {
          const map = L.map(mapContainerRef.current, {
            center: [siteCenterLat, siteCenterLng],
            zoom: 16,
            zoomControl: false,
            attributionControl: true
          });

          const tileCfg = getTileLayerConfig('dark_matter');
          const tileLayer = L.tileLayer(tileCfg.url, {
            attribution: tileCfg.attribution,
            ...tileCfg.options
          }).addTo(map);

          const overlayGroup = L.layerGroup().addTo(map);

          mapInstanceRef.current = map;
          tileLayerRef.current = tileLayer;
          overlayGroupRef.current = overlayGroup;
        }
        setLeafletReady(true);
      })
      .catch((err) => {
        console.error('Failed to load Leaflet in ShiftBreadcrumbLeafletMap:', err);
      });

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Switch between Dark Matter (Esri Dark Gray), Satellite (Esri Imagery), and Street Day (OSM)
  useEffect(() => {
    if (!leafletReady || !mapInstanceRef.current || !window.L) return;
    const L = window.L;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const tileCfg = getTileLayerConfig(tileStyle);
    tileLayerRef.current = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      ...tileCfg.options
    }).addTo(mapInstanceRef.current);
  }, [tileStyle, leafletReady]);

  // Fit bounds helper
  const fitShiftBounds = () => {
    if (!leafletReady || !mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    const latLngPoints: [number, number][] = [
      [siteCenterLat, siteCenterLng],
      [siteCenterLat + geofenceRadiusMeters / 111111, siteCenterLng],
      [siteCenterLat - geofenceRadiusMeters / 111111, siteCenterLng],
      [siteCenterLat, siteCenterLng + geofenceRadiusMeters / 85000],
      [siteCenterLat, siteCenterLng - geofenceRadiusMeters / 85000]
    ];

    crumbs.forEach((c) => {
      if (c.lat && c.lng) {
        latLngPoints.push([c.lat, c.lng]);
      }
    });

    if (shift.clockOutLocation?.lat && shift.clockOutLocation?.lng) {
      latLngPoints.push([shift.clockOutLocation.lat, shift.clockOutLocation.lng]);
    }

    if (latLngPoints.length > 0) {
      const bounds = L.latLngBounds(latLngPoints);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
    }
  };

  // Render Geofence, Polylines, and Waypoints when shift changes
  useEffect(() => {
    if (!leafletReady || !mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const overlayGroup = overlayGroupRef.current;
    if (!overlayGroup) return;

    overlayGroup.clearLayers();
    markersRef.current = [];

    // 1. Draw Site Geofence Boundary over real streets
    const geofenceCircle = L.circle([siteCenterLat, siteCenterLng], {
      radius: geofenceRadiusMeters,
      color: '#10b981',
      weight: 2,
      opacity: 0.9,
      fillColor: '#10b981',
      fillOpacity: 0.12,
      dashArray: '6, 4'
    });
    geofenceCircle.bindTooltip(
      `Property Geofence Perimeter: ${shift.siteName} (${geofenceRadiusMeters}m radius)`,
      { direction: 'top' }
    );
    geofenceCircle.addTo(overlayGroup);

    // 2. Plot Chronological Patrol Breadcrumbs as Green Connected Polyline Paths
    const onSiteCoords: [number, number][] = [];
    const allCoords: [number, number][] = [];

    crumbs.forEach((c) => {
      allCoords.push([c.lat, c.lng]);
      if (c.insideGeofence && c.event !== 'PERIMETER_EXIT') {
        onSiteCoords.push([c.lat, c.lng]);
      }
    });

    if (onSiteCoords.length >= 2) {
      L.polyline(onSiteCoords, {
        color: '#10b981',
        weight: 3.5,
        opacity: 0.9
      }).addTo(overlayGroup);
    }

    // If any off-site breadcrumbs exist, connect the departure path in dashed crimson red
    if (allCoords.length >= 2 && allCoords.length > onSiteCoords.length) {
      L.polyline(allCoords, {
        color: '#f43f5e',
        weight: 2.5,
        opacity: 0.85,
        dashArray: '6, 5'
      }).addTo(overlayGroup);
    }

    // 3. Render Individual Breadcrumb Waypoints
    crumbs.forEach((crumb, idx) => {
      const isOffSite = !crumb.insideGeofence || crumb.event === 'PERIMETER_EXIT';
      const isBreak = crumb.event === 'BREAK';
      const isSelected = idx === selectedBreadcrumbIndex;
      const isRollbackOffSiteClockOut =
        shift.status === 'OFF_SITE_CLOCKOUT_ROLLBACK' &&
        (crumb.event === 'CLOCK_OUT' || idx === crumbs.length - 1) &&
        isOffSite;

      // Calculate distance from perimeter for off-site points
      const distFromCenter =
        crumb.distanceMeters ??
        Math.round(
          calculateDistanceMeters(siteCenterLat, siteCenterLng, crumb.lat, crumb.lng)
        );
      const distFromPerimeter = Math.max(15, distFromCenter - geofenceRadiusMeters);

      const dotColor = isOffSite ? '#f43f5e' : isBreak ? '#f59e0b' : '#10b981';

      const iconHtml = isRollbackOffSiteClockOut
        ? `
          <div style="position: relative; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center;">
            <div class="cad-pin-red-pulse" style="
              width: 26px;
              height: 26px;
              border-radius: 9999px;
              background: #881337;
              border: 2.5px solid #fda4af;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              font-weight: 900;
              box-shadow: 0 0 14px rgba(244,63,94,0.9);
            ">!</div>
            <div style="
              margin-top: 3px;
              background: #9f1239;
              border: 1px solid #fb7185;
              color: #ffffff;
              font-family: 'JetBrains Mono', monospace;
              font-size: 9px;
              font-weight: 800;
              padding: 1px 5px;
              border-radius: 4px;
              white-space: nowrap;
            ">OFF-SITE CLOCK-OUT</div>
          </div>
        `
        : `
          <div style="position: relative; transform: translate(-50%, -50%); display: flex; align-items: center;">
            <div style="
              width: ${isSelected ? '18px' : '14px'};
              height: ${isSelected ? '18px' : '14px'};
              border-radius: 9999px;
              background: ${dotColor};
              border: ${isSelected ? '2.5px solid #ffffff' : '2px solid #020617'};
              box-shadow: 0 2px 6px rgba(0,0,0,0.85);
            "></div>
            <span style="
              margin-left: 3px;
              background: rgba(2, 6, 23, 0.9);
              border: 1px solid ${isSelected ? '#ffffff' : dotColor};
              color: #f8fafc;
              font-family: 'JetBrains Mono', monospace;
              font-size: 8.5px;
              font-weight: 700;
              padding: 0px 3.5px;
              border-radius: 4px;
            ">#${idx + 1}</span>
          </div>
        `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'shift-audit-crumb-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -14]
      });

      const marker = L.marker([crumb.lat, crumb.lng], { icon: customIcon });

      const distanceLabel =
        distFromPerimeter >= 1000
          ? `${(distFromPerimeter / 1000).toFixed(2)} km`
          : `${distFromPerimeter}m`;

      const popupHtml = isRollbackOffSiteClockOut
        ? `
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 230px;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 800; color: #fda4af; background: rgba(244,63,94,0.2); border: 1px solid rgba(244,63,94,0.5); padding: 2px 6px; border-radius: 4px; margin-bottom: 5px;">
              🚨 OFF-SITE CLOCK-OUT ROLLBACK WAYPOINT
            </div>
            <div style="font-size: 12px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
              Off-Site Clock-Out: ${formatTimeAmPm(crumb.timestamp)} — ${distanceLabel} from perimeter
            </div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #cbd5e1;">
              Coords: ${crumb.lat.toFixed(5)}, ${crumb.lng.toFixed(5)} (±${crumb.accuracy}m)<br/>
              Rolled Back To Last On-Site Ping: <strong style="color: #34d399;">${formatTimeAmPm(shift.lastOnSitePingTimestamp)}</strong>
            </div>
          </div>
        `
        : `
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 200px;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 800; color: ${dotColor}; margin-bottom: 3px;">
              [${crumb.event || 'PATROL_PING'}] • #${idx + 1} • ${formatTimeAmPm(crumb.timestamp)}
            </div>
            <div style="font-size: 12px; font-weight: 700; color: #ffffff; margin-bottom: 3px;">
              ${crumb.label || `Patrol Telemetry Waypoint #${idx + 1}`}
            </div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #94a3b8;">
              GPS: ${crumb.lat.toFixed(5)}, ${crumb.lng.toFixed(5)} (±${crumb.accuracy}m)<br/>
              Status: <strong style="color: ${dotColor};">${isOffSite ? `OFF-SITE (${distanceLabel} from perimeter)` : 'INSIDE GEOFENCE'}</strong>
            </div>
          </div>
        `;

      marker.bindPopup(popupHtml, { maxWidth: 290 });
      marker.on('click', () => {
        onSelectBreadcrumbIndex(idx);
      });

      marker.addTo(overlayGroup);
      markersRef.current.push(marker);
    });

    fitShiftBounds();

    // Automatically open popup on rollback off-site waypoint if this shift had an off-site rollback
    if (shift.status === 'OFF_SITE_CLOCKOUT_ROLLBACK' && markersRef.current.length > 0) {
      const lastMarker = markersRef.current[markersRef.current.length - 1];
      setTimeout(() => {
        try {
          lastMarker?.openPopup();
        } catch {}
      }, 250);
    }
  }, [shift.id, leafletReady]);

  // Update visual selection and open popup when selectedBreadcrumbIndex changes
  useEffect(() => {
    if (!leafletReady || !mapInstanceRef.current) return;
    const marker = markersRef.current[selectedBreadcrumbIndex];
    const crumb = crumbs[selectedBreadcrumbIndex];
    if (marker && crumb) {
      try {
        marker.openPopup();
      } catch {}
    }
  }, [selectedBreadcrumbIndex, leafletReady]);

  const activeCrumb = crumbs[selectedBreadcrumbIndex] || crumbs[crumbs.length - 1];

  return (
    <div className="flex flex-col h-full justify-between space-y-2.5">
      {/* Top Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200 font-bold">
            Street Map Geofence: {shift.siteName} ({geofenceRadiusMeters}m)
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-emerald-500/40 text-emerald-300">
            Last On-Site Ping: {formatTimeAmPm(shift.lastOnSitePingTimestamp)}
          </span>
        </div>

        {/* Tile Layer Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
          <button
            type="button"
            onClick={() => setTileStyle('dark_matter')}
            className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
              tileStyle === 'dark_matter' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Dark Matter
          </button>
          <button
            type="button"
            onClick={() => setTileStyle('satellite')}
            className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
              tileStyle === 'satellite' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setTileStyle('street_day')}
            className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
              tileStyle === 'street_day' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Street Day
          </button>
        </div>
      </div>

      {/* Real Leaflet Street Map Container */}
      <div className="relative w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
        <div
          ref={mapContainerRef}
          style={{ touchAction: 'pan-x pan-y' }}
          className="w-full h-full z-10"
        />

        {/* Floating Zoom & Fit Bounds Controls */}
        <div className="absolute top-2.5 right-2.5 z-20 flex flex-col gap-1 bg-slate-900/95 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-lg">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={fitShiftBounds}
            className="p-1.5 text-cyan-400 hover:text-cyan-200 hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Fit All Breadcrumbs & Geofence"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selected Waypoint Inspector Bar */}
      {activeCrumb && (
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded font-mono font-black text-[10px] ${
                !activeCrumb.insideGeofence
                  ? 'bg-rose-600 text-white'
                  : activeCrumb.event === 'BREAK'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {activeCrumb.event || 'PATROL_PING'}
            </span>
            <span className="font-bold text-white">
              {activeCrumb.label || `Telemetry Fix #${selectedBreadcrumbIndex + 1}`}
            </span>
          </div>
          <div className="font-mono text-[11px] text-slate-300 flex flex-wrap items-center gap-3">
            <span>Time: {formatTimeAmPm(activeCrumb.timestamp)}</span>
            <span>
              GPS: {activeCrumb.lat.toFixed(5)}, {activeCrumb.lng.toFixed(5)} (±{activeCrumb.accuracy}m)
            </span>
            <span
              className={
                activeCrumb.insideGeofence ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
              }
            >
              {activeCrumb.insideGeofence ? '🟢 INSIDE GEOFENCE' : '🔴 OUTSIDE GEOFENCE'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
