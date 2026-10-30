import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SiteProfile,
  GeofenceParcel
} from '../../types/shift';
import {
  X,
  MapPin,
  Layers,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Crosshair,
  ShieldCheck,
  Compass,
  Sparkles,
  Info,
  Building2,
  Clock
} from 'lucide-react';
import {
  verifySiteGeofence,
  generatePresetPolygon,
  calculatePolygonCentroid,
  formatDistance,
  metersToLatDelta,
  metersToLonDelta
} from '../../utils/geo';
import {
  ensureLeafletLoaded,
  getTileLayerConfig
} from '../../utils/leafletLoader';

interface GeofenceBoundaryEditorModalProps {
  isOpen: boolean;
  site: SiteProfile | null;
  onClose: () => void;
  onSave: (updatedSite: Partial<SiteProfile>) => void;
}

const PRESET_PARCEL_COLORS = [
  '#0284c7', // Sky Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#14b8a6'  // Teal
];

export const GeofenceBoundaryEditorModal: React.FC<GeofenceBoundaryEditorModalProps> = ({
  isOpen,
  site,
  onClose,
  onSave
}) => {
  if (!isOpen || !site) return null;

  // Site Coordinates & Config
  const [centerLat, setCenterLat] = useState<number>(site.latitude || 47.6062);
  const [centerLng, setCenterLng] = useState<number>(site.longitude || -122.3321);
  const [geofenceType, setGeofenceType] = useState<'circle' | 'polygon' | 'multi_parcel'>(
    site.geofenceType || 'circle'
  );
  const [radiusMeters, setRadiusMeters] = useState<number>(site.geofenceRadiusMeters || 150);
  const [requireGeofence, setRequireGeofence] = useState<boolean>(site.requireGeofence ?? true);
  const [geofenceStrictEnforce, setGeofenceStrictEnforce] = useState<boolean>(
    site.geofenceStrictEnforce ?? false
  );
  const [departureDebounceMinutes, setDepartureDebounceMinutes] = useState<number>(
    site.departureDebounceMinutes || 3
  );

  // Polygon Vertices State
  const [polygonCoords, setPolygonCoords] = useState<Array<{ latitude: number; longitude: number }>>(() => {
    if (site.polygonCoordinates && site.polygonCoordinates.length >= 3) {
      return [...site.polygonCoordinates];
    }
    return generatePresetPolygon(
      site.latitude || 47.6062,
      site.longitude || -122.3321,
      'square',
      site.geofenceRadiusMeters || 120
    );
  });

  // Multi-Parcel State
  const [multiParcels, setMultiParcels] = useState<GeofenceParcel[]>(() => {
    if (site.multiParcels && site.multiParcels.length > 0) {
      return JSON.parse(JSON.stringify(site.multiParcels));
    }
    return [
      {
        id: `parcel-${Date.now()}-1`,
        name: 'Main Facility Perimeter',
        type: 'polygon',
        zoneType: 'primary',
        color: '#0284c7',
        coordinates: generatePresetPolygon(
          site.latitude || 47.6062,
          site.longitude || -122.3321,
          'square',
          100
        ),
        notes: 'Primary building structure & immediate access perimeter'
      },
      {
        id: `parcel-${Date.now()}-2`,
        name: 'Parking Structure & Annex',
        type: 'circle',
        zoneType: 'parking',
        color: '#10b981',
        center: {
          latitude: (site.latitude || 47.6062) + metersToLatDelta(70),
          longitude:
            (site.longitude || -122.3321) +
            metersToLonDelta(70, site.latitude || 47.6062)
        },
        radiusMeters: 60,
        notes: 'Visitor and staff parking lot'
      }
    ];
  });

  const [activeParcelIndex, setActiveParcelIndex] = useState<number>(0);

  // Hit-Test & GPS Simulator State
  const [testPoint, setTestPoint] = useState<{ latitude: number; longitude: number }>({
    latitude: site.latitude || 47.6062,
    longitude: site.longitude || -122.3321
  });
  const [canvasMode, setCanvasMode] = useState<'view' | 'add_point' | 'test_hit'>('view');
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);
  const [tileMode, setTileMode] = useState<'dark_matter' | 'satellite' | 'street_day'>('dark_matter');
  const [mapZoom, setMapZoom] = useState<number>(16);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Leaflet Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const overlayLayerGroupRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState<boolean>(false);

  // Latest state refs for Leaflet map click handler so it never uses stale closures
  const stateRef = useRef({
    canvasMode,
    geofenceType,
    activeParcelIndex,
    polygonCoords,
    multiParcels,
    centerLat,
    centerLng
  });

  useEffect(() => {
    stateRef.current = {
      canvasMode,
      geofenceType,
      activeParcelIndex,
      polygonCoords,
      multiParcels,
      centerLat,
      centerLng
    };
  }, [
    canvasMode,
    geofenceType,
    activeParcelIndex,
    polygonCoords,
    multiParcels,
    centerLat,
    centerLng
  ]);

  // Sync when site changes
  useEffect(() => {
    if (site) {
      const initLat = site.latitude || 47.6062;
      const initLng = site.longitude || -122.3321;
      setCenterLat(initLat);
      setCenterLng(initLng);
      setGeofenceType(site.geofenceType || 'circle');
      setRadiusMeters(site.geofenceRadiusMeters || 150);
      setRequireGeofence(site.requireGeofence ?? true);
      setGeofenceStrictEnforce(site.geofenceStrictEnforce ?? false);
      setDepartureDebounceMinutes(site.departureDebounceMinutes || 3);
      if (site.polygonCoordinates && site.polygonCoordinates.length >= 3) {
        setPolygonCoords([...site.polygonCoordinates]);
      } else {
        setPolygonCoords(
          generatePresetPolygon(initLat, initLng, 'square', site.geofenceRadiusMeters || 120)
        );
      }
      if (site.multiParcels && site.multiParcels.length > 0) {
        setMultiParcels(JSON.parse(JSON.stringify(site.multiParcels)));
      }
      setTestPoint({
        latitude: initLat,
        longitude: initLng
      });
    }
  }, [site]);

  // Construct draft site representation for real-time Ray-Casting validation testing
  const draftSite: Partial<SiteProfile> = useMemo(
    () => ({
      name: site.name,
      latitude: centerLat,
      longitude: centerLng,
      geofenceType,
      geofenceRadiusMeters: radiusMeters,
      polygonCoordinates: polygonCoords,
      multiParcels
    }),
    [site.name, centerLat, centerLng, geofenceType, radiusMeters, polygonCoords, multiParcels]
  );

  // Evaluate test point against draft geofence using Ray-Casting algorithm
  const hitResult = useMemo(() => {
    return verifySiteGeofence(
      { latitude: testPoint.latitude, longitude: testPoint.longitude, accuracy: 5 },
      draftSite,
      site.name
    );
  }, [testPoint, draftSite, site.name]);

  // Initialize Real Leaflet Interactive Map
  useEffect(() => {
    let mounted = true;
    ensureLeafletLoaded()
      .then((L) => {
        if (!mounted || !mapContainerRef.current) return;
        if (!leafletMapRef.current) {
          const map = L.map(mapContainerRef.current, {
            center: [centerLat, centerLng],
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

          map.on('zoomend', () => {
            setMapZoom(map.getZoom());
          });

          // Map Click Handler — Strictly respects canvasMode & activeParcelIndex without parcel collision
          map.on('click', (e: any) => {
            const clickedGeo = {
              latitude: parseFloat(e.latlng.lat.toFixed(6)),
              longitude: parseFloat(e.latlng.lng.toFixed(6))
            };
            const current = stateRef.current;

            if (current.canvasMode === 'test_hit') {
              setTestPoint(clickedGeo);
            } else if (current.canvasMode === 'add_point') {
              if (current.geofenceType === 'polygon') {
                setPolygonCoords((prev) => [...prev, clickedGeo]);
              } else if (current.geofenceType === 'multi_parcel') {
                // Always add vertex ONLY to the currently selected parcel — never switch activeParcelIndex!
                setMultiParcels((prev) => {
                  const idx = current.activeParcelIndex;
                  const targetParcel = prev[idx];
                  if (!targetParcel) return prev;
                  const updated = [...prev];
                  if (targetParcel.type === 'circle') {
                    // If user is in add_point mode on a circular parcel, move its center or convert to polygon
                    updated[idx] = {
                      ...targetParcel,
                      center: clickedGeo
                    };
                  } else {
                    const existingCoords = targetParcel.coordinates || [];
                    updated[idx] = {
                      ...targetParcel,
                      type: 'polygon',
                      coordinates: [...existingCoords, clickedGeo]
                    };
                  }
                  return updated;
                });
              }
            }
          });

          leafletMapRef.current = map;
          tileLayerRef.current = tileLayer;
          overlayLayerGroupRef.current = overlayGroup;

          setTimeout(() => {
            map.invalidateSize();
          }, 120);
        }
        setLeafletReady(true);
      })
      .catch((err) => {
        console.error('Failed to load Leaflet in GeofenceBoundaryEditorModal:', err);
      });

    return () => {
      mounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Switch tile layers when tileMode changes
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

  // Render Geofence Polygons, Circles, Vertices, Origin HQ, and Test Hit Point on Leaflet Map
  useEffect(() => {
    if (!leafletReady || !leafletMapRef.current || !window.L) return;
    const L = window.L;
    const overlayGroup = overlayLayerGroupRef.current;
    if (!overlayGroup) return;

    overlayGroup.clearLayers();

    // CRITICAL COLLISION FIX:
    // When canvasMode is 'add_point' or 'test_hit', set interactive: false on ALL polygons/circles
    // so clicks pass straight through to the map canvas and NEVER switch selectedParcelId!
    const isDrawingOrTesting = canvasMode === 'add_point' || canvasMode === 'test_hit';

    // 1. Circle Mode Geofence
    if (geofenceType === 'circle') {
      const circle = L.circle([centerLat, centerLng], {
        radius: radiusMeters,
        color: '#38bdf8',
        weight: 2.5,
        fillColor: '#0284c7',
        fillOpacity: 0.22,
        dashArray: '6, 4',
        interactive: false
      });
      circle.addTo(overlayGroup);
    }

    // 2. Polygon Mode Geofence
    if (geofenceType === 'polygon') {
      if (polygonCoords.length >= 2) {
        const latLngs = polygonCoords.map((pt) => [pt.latitude, pt.longitude]);
        if (polygonCoords.length >= 3) {
          const poly = L.polygon(latLngs, {
            color: '#38bdf8',
            weight: 2.5,
            fillColor: '#0284c7',
            fillOpacity: 0.25,
            interactive: false
          });
          poly.addTo(overlayGroup);
        } else {
          L.polyline(latLngs, {
            color: '#38bdf8',
            weight: 2.5,
            dashArray: '4, 4',
            interactive: false
          }).addTo(overlayGroup);
        }
      }

      // Render Polygon Vertices
      polygonCoords.forEach((pt, idx) => {
        const isSelected = selectedVertexIndex === idx;
        const vIcon = L.divIcon({
          html: `
            <div style="
              position: relative;
              transform: translate(-50%, -50%);
              display: flex;
              align-items: center;
              pointer-events: ${isDrawingOrTesting ? 'none' : 'auto'};
            ">
              <div style="
                width: ${isSelected ? '16px' : '12px'};
                height: ${isSelected ? '16px' : '12px'};
                border-radius: 9999px;
                background: ${isSelected ? '#f59e0b' : '#38bdf8'};
                border: 2px solid #020617;
                box-shadow: 0 2px 6px rgba(0,0,0,0.8);
              "></div>
              <span style="
                margin-left: 3px;
                background: rgba(2, 6, 23, 0.9);
                color: #f8fafc;
                font-family: 'JetBrains Mono', monospace;
                font-size: 9px;
                font-weight: 800;
                padding: 0 4px;
                border-radius: 4px;
                border: 1px solid #334155;
              ">P${idx + 1}</span>
            </div>
          `,
          className: 'geofence-vertex-marker',
          iconSize: [0, 0]
        });

        const marker = L.marker([pt.latitude, pt.longitude], {
          icon: vIcon,
          interactive: !isDrawingOrTesting
        });
        if (!isDrawingOrTesting) {
          marker.on('click', () => {
            setSelectedVertexIndex(idx);
          });
        }
        marker.addTo(overlayGroup);
      });
    }

    // 3. Multi-Parcel Mode Geofences (Collision-Proof!)
    if (geofenceType === 'multi_parcel') {
      multiParcels.forEach((parcel, pIdx) => {
        const isCurrentActive = pIdx === activeParcelIndex;
        const parcelColor =
          parcel.color || PRESET_PARCEL_COLORS[pIdx % PRESET_PARCEL_COLORS.length];

        // Non-selected parcels have interactive: false in ADD_POINT or vertex-editing modes
        // so tapping inside an overlapping neighbor parcel NEVER switches activeParcelIndex!
        const allowParcelClick = canvasMode === 'view' && !isCurrentActive;

        if (parcel.type === 'polygon' && parcel.coordinates && parcel.coordinates.length > 0) {
          const latLngs = parcel.coordinates.map((pt) => [pt.latitude, pt.longitude]);

          if (parcel.coordinates.length >= 3) {
            const poly = L.polygon(latLngs, {
              color: parcelColor,
              weight: isCurrentActive ? 3 : 1.5,
              fillColor: parcelColor,
              fillOpacity: isCurrentActive ? 0.32 : 0.14,
              dashArray: isCurrentActive ? undefined : '5, 3',
              interactive: allowParcelClick
            });

            if (allowParcelClick) {
              poly.on('click', () => {
                setActiveParcelIndex(pIdx);
              });
            }
            poly.addTo(overlayGroup);

            // Apply pointer-events: none directly to SVG path when in add_point / test_hit mode
            const pathEl = (poly as any)._path as SVGElement | undefined;
            if (pathEl && !allowParcelClick) {
              pathEl.style.pointerEvents = 'none';
            }

            // Parcel Centroid Label Badge (non-interactive so it never blocks vertex clicks)
            const centroid = calculatePolygonCentroid(parcel.coordinates);
            const badgeIcon = L.divIcon({
              html: `
                <div style="
                  transform: translate(-50%, -50%);
                  background: rgba(15, 23, 42, 0.9);
                  border: 1px solid ${parcelColor};
                  color: #f8fafc;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 9.5px;
                  font-weight: 800;
                  padding: 1px 6px;
                  border-radius: 4px;
                  white-space: nowrap;
                  pointer-events: none;
                ">
                  ${parcel.name}
                </div>
              `,
              className: 'geofence-parcel-label',
              iconSize: [0, 0]
            });
            L.marker([centroid.latitude, centroid.longitude], {
              icon: badgeIcon,
              interactive: false
            }).addTo(overlayGroup);
          } else if (parcel.coordinates.length >= 2) {
            L.polyline(latLngs, {
              color: parcelColor,
              weight: 2.5,
              dashArray: '4, 4',
              interactive: false
            }).addTo(overlayGroup);
          }

          // Render vertices for the currently active polygon parcel
          if (isCurrentActive) {
            parcel.coordinates.forEach((pt, vIdx) => {
              const vIcon = L.divIcon({
                html: `
                  <div style="
                    transform: translate(-50%, -50%);
                    display: flex;
                    align-items: center;
                    pointer-events: none;
                  ">
                    <div style="
                      width: 12px;
                      height: 12px;
                      border-radius: 9999px;
                      background: ${parcelColor};
                      border: 2px solid #ffffff;
                      box-shadow: 0 2px 6px rgba(0,0,0,0.85);
                    "></div>
                    <span style="
                      margin-left: 3px;
                      background: rgba(2, 6, 23, 0.9);
                      color: #ffffff;
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 8.5px;
                      font-weight: 800;
                      padding: 0 3.5px;
                      border-radius: 3px;
                    ">P${vIdx + 1}</span>
                  </div>
                `,
                className: 'geofence-active-parcel-vertex',
                iconSize: [0, 0]
              });
              L.marker([pt.latitude, pt.longitude], {
                icon: vIcon,
                interactive: false
              }).addTo(overlayGroup);
            });
          }
        } else if (parcel.type === 'circle' && parcel.center && parcel.radiusMeters) {
          const c = L.circle([parcel.center.latitude, parcel.center.longitude], {
            radius: parcel.radiusMeters,
            color: parcelColor,
            weight: isCurrentActive ? 3 : 1.5,
            fillColor: parcelColor,
            fillOpacity: isCurrentActive ? 0.32 : 0.14,
            interactive: allowParcelClick
          });
          if (allowParcelClick) {
            c.on('click', () => {
              setActiveParcelIndex(pIdx);
            });
          }
          c.addTo(overlayGroup);

          const pathEl = (c as any)._path as SVGElement | undefined;
          if (pathEl && !allowParcelClick) {
            pathEl.style.pointerEvents = 'none';
          }
        }
      });
    }

    // 4. Primary Facility Origin Pin (POST HQ)
    const hqIcon = L.divIcon({
      html: `
        <div style="
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          pointer-events: none;
        ">
          <div style="
            width: 14px;
            height: 14px;
            border-radius: 9999px;
            background: #ef4444;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.9);
          "></div>
          <span style="
            margin-left: 5px;
            background: rgba(2, 6, 23, 0.92);
            border: 1px solid #ef4444;
            color: #ffffff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            font-weight: 900;
            padding: 1px 5px;
            border-radius: 4px;
            white-space: nowrap;
          ">POST HQ</span>
        </div>
      `,
      className: 'geofence-post-hq-marker',
      iconSize: [0, 0]
    });
    L.marker([centerLat, centerLng], { icon: hqIcon, interactive: false }).addTo(overlayGroup);

    // 5. Simulated GPS Test Hit Marker
    const testColor = hitResult.inGeofence ? '#10b981' : '#f43f5e';
    const testPulseClass = hitResult.inGeofence ? 'cad-pin-green-pulse' : 'cad-pin-red-pulse';
    const testIcon = L.divIcon({
      html: `
        <div style="
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          pointer-events: none;
        ">
          <div class="${testPulseClass}" style="
            width: 16px;
            height: 16px;
            border-radius: 9999px;
            background: ${testColor};
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.9);
          "></div>
          <span style="
            margin-left: 5px;
            background: rgba(2, 6, 23, 0.92);
            border: 1px solid ${testColor};
            color: ${hitResult.inGeofence ? '#34d399' : '#fb7185'};
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            font-weight: 800;
            padding: 1px 5px;
            border-radius: 4px;
            white-space: nowrap;
          ">${hitResult.inGeofence ? 'ON SITE' : 'OUT-OF-BOUNDS'}</span>
        </div>
      `,
      className: 'geofence-test-hit-marker',
      iconSize: [0, 0]
    });
    L.marker([testPoint.latitude, testPoint.longitude], {
      icon: testIcon,
      interactive: false
    }).addTo(overlayGroup);
  }, [
    leafletReady,
    centerLat,
    centerLng,
    geofenceType,
    radiusMeters,
    polygonCoords,
    multiParcels,
    activeParcelIndex,
    selectedVertexIndex,
    testPoint,
    hitResult.inGeofence,
    canvasMode
  ]);

  // Handle Preset Shape Generation
  const handleApplyPreset = (
    shape: 'square' | 'rectangle_wharf' | 'hexagon' | 'l_shape' | 'campus_box'
  ) => {
    const newCoords = generatePresetPolygon(centerLat, centerLng, shape, radiusMeters);
    if (geofenceType === 'polygon') {
      setPolygonCoords(newCoords);
    } else if (geofenceType === 'multi_parcel' && multiParcels[activeParcelIndex]) {
      const updated = [...multiParcels];
      updated[activeParcelIndex] = {
        ...updated[activeParcelIndex],
        type: 'polygon',
        coordinates: newCoords
      };
      setMultiParcels(updated);
    }
  };

  // Recalculate Center from Polygon Centroid
  const handleRecalculateCenter = () => {
    if (geofenceType === 'polygon' && polygonCoords.length >= 3) {
      const centroid = calculatePolygonCentroid(polygonCoords);
      setCenterLat(centroid.latitude);
      setCenterLng(centroid.longitude);
      leafletMapRef.current?.panTo([centroid.latitude, centroid.longitude]);
    }
  };

  // Floating In-Canvas Drawing Actions: Undo Last Point, Clear Points, Complete Parcel
  const handleUndoLastPoint = () => {
    if (geofenceType === 'polygon') {
      setPolygonCoords((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
    } else if (geofenceType === 'multi_parcel' && multiParcels[activeParcelIndex]) {
      setMultiParcels((prev) => {
        const updated = [...prev];
        const coords = updated[activeParcelIndex].coordinates || [];
        updated[activeParcelIndex] = {
          ...updated[activeParcelIndex],
          coordinates: coords.slice(0, -1)
        };
        return updated;
      });
    }
  };

  const handleClearPoints = () => {
    if (geofenceType === 'polygon') {
      setPolygonCoords([]);
      setCanvasMode('add_point');
    } else if (geofenceType === 'multi_parcel' && multiParcels[activeParcelIndex]) {
      setMultiParcels((prev) => {
        const updated = [...prev];
        updated[activeParcelIndex] = {
          ...updated[activeParcelIndex],
          type: 'polygon',
          coordinates: []
        };
        return updated;
      });
      setCanvasMode('add_point');
    }
  };

  const handleCompleteParcel = () => {
    setCanvasMode('view');
    setStatusNotice('Parcel boundary locked. Switch to [ ➕ Add Point ] anytime to append vertices.');
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Add Vertex
  const handleAddVertex = () => {
    if (polygonCoords.length === 0) {
      setPolygonCoords([{ latitude: centerLat, longitude: centerLng }]);
      return;
    }
    const last = polygonCoords[polygonCoords.length - 1];
    setPolygonCoords([
      ...polygonCoords,
      {
        latitude: last.latitude + metersToLatDelta(20),
        longitude: last.longitude + metersToLonDelta(20, centerLat)
      }
    ]);
  };

  // Delete Vertex
  const handleDeleteVertex = (index: number) => {
    if (polygonCoords.length <= 3) {
      setStatusNotice('A completed polygon boundary requires at least 3 vertices.');
      setTimeout(() => setStatusNotice(null), 3000);
      return;
    }
    setPolygonCoords(polygonCoords.filter((_, i) => i !== index));
    if (selectedVertexIndex === index) setSelectedVertexIndex(null);
  };

  // Update Vertex coordinate
  const handleUpdateVertex = (index: number, field: 'latitude' | 'longitude', value: number) => {
    setPolygonCoords((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Multi-Parcel operations
  const handleAddParcel = () => {
    const newId = `parcel-${Date.now()}`;
    const newColor = PRESET_PARCEL_COLORS[multiParcels.length % PRESET_PARCEL_COLORS.length];
    const newParcel: GeofenceParcel = {
      id: newId,
      name: `Zone Parcel #${multiParcels.length + 1}`,
      type: 'polygon',
      zoneType: 'annex',
      color: newColor,
      coordinates: generatePresetPolygon(centerLat, centerLng, 'square', 80),
      notes: 'New parcel zone'
    };
    setMultiParcels([...multiParcels, newParcel]);
    setActiveParcelIndex(multiParcels.length);
  };

  const handleDeleteParcel = (index: number) => {
    if (multiParcels.length <= 1) {
      setStatusNotice('At least one parcel must remain defined in multi-parcel mode.');
      setTimeout(() => setStatusNotice(null), 3000);
      return;
    }
    const filtered = multiParcels.filter((_, i) => i !== index);
    setMultiParcels(filtered);
    setActiveParcelIndex(Math.max(0, activeParcelIndex - 1));
  };

  const handleUpdateActiveParcel = (field: keyof GeofenceParcel, value: any) => {
    if (!multiParcels[activeParcelIndex]) return;
    const updated = [...multiParcels];
    updated[activeParcelIndex] = {
      ...updated[activeParcelIndex],
      [field]: value
    };
    setMultiParcels(updated);
  };

  // Save handler
  const handleSaveAll = () => {
    onSave({
      latitude: centerLat,
      longitude: centerLng,
      geofenceType,
      geofenceRadiusMeters: radiusMeters,
      requireGeofence,
      geofenceStrictEnforce,
      departureDebounceMinutes,
      polygonCoordinates: geofenceType === 'polygon' ? polygonCoords : undefined,
      multiParcels: geofenceType === 'multi_parcel' ? multiParcels : undefined
    });
    onClose();
  };

  // Approximate grid scale label based on zoom
  const gridScaleMeters = Math.max(15, Math.round(120 * Math.pow(2, 16 - mapZoom)));

  return (
    <div
      id="geofence-boundary-editor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/80 rounded-2xl text-[#1e3a8a] dark:text-blue-400 shrink-0">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 truncate">
                  Geofence Boundary & Departure Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                  {site.code}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  Ray-Casting Validated
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Configure circular radius, custom polygons, or multi-parcel zones over live street & satellite imagery
              </p>
            </div>
          </div>

          <button
            id="close-geofence-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body — overflow-y-auto w-full pb-40 so sliders & checkboxes scroll clear of sticky bottom bar */}
        <div className="flex-1 overflow-y-auto w-full pb-40 p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Interactive Leaflet Map & Toolbar */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            {/* Clean Mobile-Responsive Top Toolbar Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-950/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              {/* Segmented Interaction Mode Toggle */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCanvasMode('view')}
                  className={`px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-xl transition-all cursor-pointer ${
                    canvasMode === 'view'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  [ ✋ Pan / Inspect ]
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasMode('test_hit')}
                  className={`px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-xl transition-all cursor-pointer ${
                    canvasMode === 'test_hit'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  [ 🎯 Test Hit ]
                </button>
                {(geofenceType === 'polygon' || geofenceType === 'multi_parcel') && (
                  <button
                    type="button"
                    onClick={() => setCanvasMode('add_point')}
                    className={`px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-xl transition-all cursor-pointer ${
                      canvasMode === 'add_point'
                        ? 'bg-emerald-600 text-white font-black shadow-xs'
                        : 'text-emerald-600 dark:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    [ ➕ Add Point ]
                  </button>
                )}
              </div>

              {/* Map Tile Layer Switcher (Dark Matter / Satellite / Street) */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setTileMode('dark_matter')}
                  className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                    tileMode === 'dark_matter'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  Dark Matter
                </button>
                <button
                  type="button"
                  onClick={() => setTileMode('satellite')}
                  className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                    tileMode === 'satellite'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  Satellite
                </button>
                <button
                  type="button"
                  onClick={() => setTileMode('street_day')}
                  className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                    tileMode === 'street_day'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  Street
                </button>
              </div>
            </div>

            {statusNotice && (
              <div className="px-3 py-2 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-200 text-xs font-mono">
                {statusNotice}
              </div>
            )}

            {/* Real Interactive Leaflet Map Canvas */}
            <div className="relative w-full h-[340px] sm:h-[400px] bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-inner select-none">
              <div
                ref={mapContainerRef}
                style={{ touchAction: 'pan-x pan-y' }}
                className={`w-full h-full z-10 ${
                  canvasMode !== 'view' ? 'cursor-crosshair' : 'cursor-grab'
                }`}
              />

              {/* Floating Top-Left Legend */}
              <div className="absolute top-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-2.5 rounded-xl text-[10px] font-mono space-y-1 pointer-events-none">
                <div className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />
                  <span>Primary Facility Origin</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span>Active Geofence Envelope</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-200">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      hitResult.inGeofence ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <span>Simulated GPS Position</span>
                </div>
              </div>

              {/* Floating Top-Right Compact Zoom Controls ([-], [+], [1x]) & Scale Pill */}
              <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5 pointer-events-auto">
                <div className="px-2 py-1 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700 text-[10px] font-mono font-bold text-slate-300 shadow-lg">
                  Scale: ~{gridScaleMeters}m grid
                </div>
                <div className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-lg text-xs font-mono font-bold">
                  <button
                    type="button"
                    onClick={() => leafletMapRef.current?.zoomOut()}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                    title="Zoom Out"
                  >
                    [-]
                  </button>
                  <button
                    type="button"
                    onClick={() => leafletMapRef.current?.zoomIn()}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                    title="Zoom In"
                  >
                    [+]
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      leafletMapRef.current?.setView([centerLat, centerLng], 16, {
                        animate: true
                      });
                    }}
                    className="px-2 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
                    title="Reset Zoom to 1x Origin"
                  >
                    [1x]
                  </button>
                </div>
              </div>

              {/* FLOATING IN-CANVAS ACTION BUTTONS WHILE DRAWING / EDITING POLYGONS */}
              {(geofenceType === 'polygon' || geofenceType === 'multi_parcel') && (
                <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-2xl">
                    <button
                      type="button"
                      onClick={handleUndoLastPoint}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold cursor-pointer"
                    >
                      [ ↩️ Undo Last Point ]
                    </button>
                    <button
                      type="button"
                      onClick={handleClearPoints}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold cursor-pointer"
                    >
                      [ ✕ Clear Points ]
                    </button>
                    <button
                      type="button"
                      onClick={handleCompleteParcel}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 text-[10px] font-mono font-black cursor-pointer"
                    >
                      [ ✓ Complete Parcel ]
                    </button>
                  </div>

                  <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-300">
                    Mode:{' '}
                    <span className="text-emerald-400 font-bold uppercase">
                      {canvasMode === 'add_point'
                        ? `ADD POINT (${
                            geofenceType === 'multi_parcel'
                              ? multiParcels[activeParcelIndex]?.name || 'Active Parcel'
                              : 'Polygon'
                          })`
                        : canvasMode.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Live Hit-Test Status Card */}
            <div
              className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                hitResult.inGeofence
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`p-2 rounded-xl text-white shrink-0 ${
                    hitResult.inGeofence ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {hitResult.inGeofence ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-tight">
                      {hitResult.inGeofence
                        ? 'Validation: Inside Authorized Geofence'
                        : 'Validation: Perimeter Departure Breach'}
                    </span>
                    {hitResult.matchedParcelName && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 rounded-md">
                        {hitResult.matchedParcelName}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-90 font-mono mt-0.5">
                    Test Point: {testPoint.latitude.toFixed(5)}, {testPoint.longitude.toFixed(5)} (
                    {formatDistance(hitResult.distanceMeters)} from origin) •{' '}
                    {hitResult.zoneDescription}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTestPoint({ latitude: centerLat, longitude: centerLng })}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              >
                Reset to Center
              </button>
            </div>
          </div>

          {/* Right Column: Configuration & Controls */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setGeofenceType('circle')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  geofenceType === 'circle'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500" />
                <span>Circular Radius</span>
              </button>

              <button
                type="button"
                onClick={() => setGeofenceType('polygon')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  geofenceType === 'polygon'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Polygon</span>
              </button>

              <button
                type="button"
                onClick={() => setGeofenceType('multi_parcel')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  geofenceType === 'multi_parcel'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Multi-Parcel ({multiParcels.length})</span>
              </button>
            </div>

            {/* General GPS Origin Center Coordinates */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Facility Origin Geopoint
                </span>
                {geofenceType === 'polygon' && (
                  <button
                    type="button"
                    onClick={handleRecalculateCenter}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Centroid</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={centerLat}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCenterLat(val);
                      leafletMapRef.current?.panTo([val, centerLng]);
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={centerLng}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCenterLng(val);
                      leafletMapRef.current?.panTo([centerLat, val]);
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* TAB 1: CIRCLE MODE CONTROLS */}
            {geofenceType === 'circle' && (
              <div className="space-y-3.5 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Geofence Radius Limit
                  </label>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                    {radiusMeters} meters ({Math.round(radiusMeters * 3.28)} ft)
                  </span>
                </div>

                <input
                  type="range"
                  min="25"
                  max="800"
                  step="25"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[50, 80, 100, 150, 200, 300, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRadiusMeters(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        radiusMeters === preset
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: POLYGON MODE CONTROLS */}
            {geofenceType === 'polygon' && (
              <div className="space-y-3.5 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Polygon Boundary Vertices ({polygonCoords.length} points)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVertex}
                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Vertex</span>
                  </button>
                </div>

                {/* Preset Shapes Generator */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Generate Preset Boundary
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('square')}
                      className="px-2 py-1.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-center cursor-pointer"
                    >
                      Square Campus
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('rectangle_wharf')}
                      className="px-2 py-1.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-center cursor-pointer"
                    >
                      Pier / Wharf
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('hexagon')}
                      className="px-2 py-1.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-center cursor-pointer"
                    >
                      Hexagon Yard
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('l_shape')}
                      className="px-2 py-1.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-center cursor-pointer"
                    >
                      L-Shape Complex
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('campus_box')}
                      className="px-2 py-1.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-center cursor-pointer"
                    >
                      Extended Box
                    </button>
                  </div>
                </div>

                {/* Vertices Coordinate List */}
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {polygonCoords.map((pt, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedVertexIndex(idx)}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs cursor-pointer ${
                        selectedVertexIndex === idx
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="number"
                            step="0.0001"
                            value={pt.latitude}
                            onChange={(e) =>
                              handleUpdateVertex(idx, 'latitude', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-1.5 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                          />
                          <input
                            type="number"
                            step="0.0001"
                            value={pt.longitude}
                            onChange={(e) =>
                              handleUpdateVertex(idx, 'longitude', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-1.5 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVertex(idx);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Vertex"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: MULTI-PARCEL CONTROLS */}
            {geofenceType === 'multi_parcel' && (
              <div className="space-y-3.5 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    Property Parcel Zones ({multiParcels.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddParcel}
                    className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Parcel</span>
                  </button>
                </div>

                {/* Parcel Selection Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {multiParcels.map((parcel, idx) => {
                    const isSelected = activeParcelIndex === idx;
                    return (
                      <button
                        key={parcel.id}
                        type="button"
                        onClick={() => setActiveParcelIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: parcel.color || '#0284c7' }}
                        />
                        <span>{parcel.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Parcel Configuration Panel */}
                {multiParcels[activeParcelIndex] && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Edit Selected Parcel ({multiParcels[activeParcelIndex].coordinates?.length || 0} vertices)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteParcel(activeParcelIndex)}
                        className="text-xs text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete Parcel</span>
                      </button>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Parcel Name
                      </label>
                      <input
                        type="text"
                        value={multiParcels[activeParcelIndex].name}
                        onChange={(e) => handleUpdateActiveParcel('name', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        placeholder="e.g. North Gate & Loading Bay"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                          Shape Type
                        </label>
                        <select
                          value={multiParcels[activeParcelIndex].type}
                          onChange={(e) => handleUpdateActiveParcel('type', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        >
                          <option value="polygon">Polygon Boundary</option>
                          <option value="circle">Circular Radius</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                          Zone Category
                        </label>
                        <select
                          value={multiParcels[activeParcelIndex].zoneType || 'primary'}
                          onChange={(e) => handleUpdateActiveParcel('zoneType', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        >
                          <option value="primary">Primary Building</option>
                          <option value="annex">Annex / Warehouse</option>
                          <option value="parking">Parking Structure</option>
                          <option value="perimeter">Perimeter Wharf / Gate</option>
                          <option value="restricted">Restricted / Hazmat</option>
                        </select>
                      </div>
                    </div>

                    {/* Color picker */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Theme Color
                      </label>
                      <div className="flex items-center gap-2">
                        {PRESET_PARCEL_COLORS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => handleUpdateActiveParcel('color', col)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                              multiParcels[activeParcelIndex].color === col
                                ? 'scale-125 border-white shadow-sm'
                                : 'border-transparent'
                            }`}
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Departure Debounce & Anti-Drift Jitter Buffer Settings */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Departure Anti-Drift Debounce Timer
                  </label>
                </div>
                <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                  {departureDebounceMinutes} Minutes ({departureDebounceMinutes * 60}s)
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={departureDebounceMinutes}
                onChange={(e) => setDepartureDebounceMinutes(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer"
              />

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Guard must remain consecutively out-of-bounds for {departureDebounceMinutes} minutes
                before escalating to an Off-Site Breach to prevent false GPS jitter alerts.
              </p>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireGeofence}
                    onChange={(e) => setRequireGeofence(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Require GPS Geofence Verification for Clock-In
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={geofenceStrictEnforce}
                    onChange={(e) => setGeofenceStrictEnforce(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Strict Enforce: Block out-of-bounds clock-ins completely
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Modal Footer / Save Bar */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/95 flex flex-wrap items-center justify-between gap-2 shrink-0 z-30">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Changes take effect immediately for active duty tracking and CAD breach monitors.</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              id="discard-geofence-changes-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-geofence-changes-btn"
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Apply & Save Boundary</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
