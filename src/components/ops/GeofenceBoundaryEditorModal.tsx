import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  SiteProfile, 
  GeofenceParcel 
} from '../../types/shift';
import { 
  X, 
  MapPin, 
  Layers, 
  Sliders, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  Crosshair, 
  Navigation, 
  Eye, 
  ShieldCheck, 
  Compass, 
  Maximize2, 
  Minimize2,
  Sparkles,
  Info,
  Building2,
  HelpCircle,
  Clock
} from 'lucide-react';
import { 
  calculateDistanceMeters, 
  isPointInPolygon, 
  isPointInCircle,
  verifySiteGeofence, 
  generatePresetPolygon, 
  calculatePolygonCentroid,
  formatDistance,
  metersToLatDelta,
  metersToLonDelta
} from '../../utils/geo';

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
    return generatePresetPolygon(site.latitude || 47.6062, site.longitude || -122.3321, 'square', site.geofenceRadiusMeters || 120);
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
        coordinates: generatePresetPolygon(site.latitude || 47.6062, site.longitude || -122.3321, 'square', 100),
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
          longitude: (site.longitude || -122.3321) + metersToLonDelta(70, site.latitude || 47.6062)
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
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [canvasMode, setCanvasMode] = useState<'view' | 'add_point' | 'test_hit'>('view');
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);

  // Sync when site changes
  useEffect(() => {
    if (site) {
      setCenterLat(site.latitude || 47.6062);
      setCenterLng(site.longitude || -122.3321);
      setGeofenceType(site.geofenceType || 'circle');
      setRadiusMeters(site.geofenceRadiusMeters || 150);
      setRequireGeofence(site.requireGeofence ?? true);
      setGeofenceStrictEnforce(site.geofenceStrictEnforce ?? false);
      setDepartureDebounceMinutes(site.departureDebounceMinutes || 3);
      if (site.polygonCoordinates && site.polygonCoordinates.length >= 3) {
        setPolygonCoords([...site.polygonCoordinates]);
      } else {
        setPolygonCoords(generatePresetPolygon(site.latitude || 47.6062, site.longitude || -122.3321, 'square', site.geofenceRadiusMeters || 120));
      }
      if (site.multiParcels && site.multiParcels.length > 0) {
        setMultiParcels(JSON.parse(JSON.stringify(site.multiParcels)));
      }
      setTestPoint({
        latitude: site.latitude || 47.6062,
        longitude: site.longitude || -122.3321
      });
    }
  }, [site]);

  // Construct draft site representation for real-time validation testing
  const draftSite: Partial<SiteProfile> = useMemo(() => ({
    name: site.name,
    latitude: centerLat,
    longitude: centerLng,
    geofenceType,
    geofenceRadiusMeters: radiusMeters,
    polygonCoordinates: polygonCoords,
    multiParcels
  }), [site.name, centerLat, centerLng, geofenceType, radiusMeters, polygonCoords, multiParcels]);

  // Evaluate test point against draft geofence
  const hitResult = useMemo(() => {
    return verifySiteGeofence(
      { latitude: testPoint.latitude, longitude: testPoint.longitude, accuracy: 5 },
      draftSite,
      site.name
    );
  }, [testPoint, draftSite, site.name]);

  // Handle Preset Shape Generation
  const handleApplyPreset = (shape: 'square' | 'rectangle_wharf' | 'hexagon' | 'l_shape' | 'campus_box') => {
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
    }
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
      alert('A polygon boundary requires at least 3 vertices.');
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
      alert('You must have at least one parcel defined in multi-parcel mode.');
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

  // SVG Canvas Dimension & Math
  const CANVAS_WIDTH = 480;
  const CANVAS_HEIGHT = 380;
  const CANVAS_CENTER_X = CANVAS_WIDTH / 2;
  const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2;
  // Scale: pixels per meter (adjusted with zoom)
  const pxPerMeter = (1.1 * zoomLevel);

  // Conversion from geo (lat, lon) to SVG canvas (x, y) relative to centerLat, centerLng
  const geoToSvg = (lat: number, lon: number) => {
    const dLatMeters = (lat - centerLat) * 111139;
    const dLonMeters = (lon - centerLng) * 111139 * Math.cos((centerLat * Math.PI) / 180);
    const x = CANVAS_CENTER_X + dLonMeters * pxPerMeter;
    const y = CANVAS_CENTER_Y - dLatMeters * pxPerMeter; // Invert Y for screen coordinates
    return { x, y };
  };

  const svgToGeo = (x: number, y: number) => {
    const dLonMeters = (x - CANVAS_CENTER_X) / pxPerMeter;
    const dLatMeters = -(y - CANVAS_CENTER_Y) / pxPerMeter;
    const lat = centerLat + dLatMeters / 111139;
    const lon = centerLng + dLonMeters / (111139 * Math.cos((centerLat * Math.PI) / 180));
    return { latitude: parseFloat(lat.toFixed(6)), longitude: parseFloat(lon.toFixed(6)) };
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    const clickedGeo = svgToGeo(x, y);

    if (canvasMode === 'test_hit') {
      setTestPoint(clickedGeo);
    } else if (canvasMode === 'add_point' && geofenceType === 'polygon') {
      setPolygonCoords([...polygonCoords, clickedGeo]);
    } else if (canvasMode === 'add_point' && geofenceType === 'multi_parcel' && multiParcels[activeParcelIndex]?.type === 'polygon') {
      const activeP = multiParcels[activeParcelIndex];
      const existing = activeP.coordinates || [];
      const updated = [...multiParcels];
      updated[activeParcelIndex] = {
        ...activeP,
        coordinates: [...existing, clickedGeo]
      };
      setMultiParcels(updated);
    }
  };

  return (
    <div id="geofence-boundary-editor-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-950/80 rounded-2xl text-[#1e3a8a] dark:text-blue-400">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Geofence Boundary & Departure Engine
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold tracking-wider uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                  {site.code}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold tracking-wider uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  Ray-Casting Validated
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure circular radius, custom polygons, or multi-parcel zones with 3-minute dwell anti-drift debouncing
              </p>
            </div>
          </div>

          <button
            id="close-geofence-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Visual Map / Canvas Radar */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Interactive Boundary Canvas
                </span>
                <span className="text-2xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300">
                  Scale: {Math.round(100 / pxPerMeter)}m grid
                </span>
              </div>

              {/* Canvas Action Mode Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCanvasMode('view')}
                  className={`px-2.5 py-1 text-2xs font-bold rounded-lg border transition-all cursor-pointer ${
                    canvasMode === 'view'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Pan / Inspect
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasMode('test_hit')}
                  className={`px-2.5 py-1 text-2xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    canvasMode === 'test_hit'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Test Hit Location</span>
                </button>
                {(geofenceType === 'polygon' || geofenceType === 'multi_parcel') && (
                  <button
                    type="button"
                    onClick={() => setCanvasMode('add_point')}
                    className={`px-2.5 py-1 text-2xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                      canvasMode === 'add_point'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Click to Add Point</span>
                  </button>
                )}
                
                {/* Zoom */}
                <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.4, parseFloat((z - 0.2).toFixed(1))))}
                    className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(2.5, parseFloat((z + 0.2).toFixed(1))))}
                    className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="px-1.5 h-6 text-2xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                    title="Reset Zoom"
                  >
                    1x
                  </button>
                </div>
              </div>
            </div>

            {/* SVG Visual Canvas */}
            <div className="relative w-full aspect-4/3 bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-inner flex items-center justify-center select-none">
              <svg
                viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                className="w-full h-full cursor-crosshair"
                onClick={handleCanvasClick}
              >
                {/* Background Grid Pattern */}
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                  </pattern>
                  <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <rect width="100%" height="100%" fill="url(#grid)" />
                <circle cx={CANVAS_CENTER_X} cy={CANVAS_CENTER_Y} r={180} fill="url(#radarGlow)" />

                {/* Range Concentric Guide Rings */}
                {[50, 100, 200, 300].map((dist) => {
                  const r = dist * pxPerMeter;
                  return (
                    <g key={dist}>
                      <circle
                        cx={CANVAS_CENTER_X}
                        cy={CANVAS_CENTER_Y}
                        r={r}
                        fill="none"
                        stroke="#334155"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                      <text
                        x={CANVAS_CENTER_X + 4}
                        y={CANVAS_CENTER_Y - r + 12}
                        fill="#64748b"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        {dist}m
                      </text>
                    </g>
                  );
                })}

                {/* Crosshairs & Center Axis */}
                <line x1={CANVAS_CENTER_X} y1={0} x2={CANVAS_CENTER_X} y2={CANVAS_HEIGHT} stroke="#1e293b" strokeWidth="1.5" />
                <line x1={0} y1={CANVAS_CENTER_Y} x2={CANVAS_WIDTH} y2={CANVAS_CENTER_Y} stroke="#1e293b" strokeWidth="1.5" />

                {/* 1. Render Circle Mode Geofence */}
                {geofenceType === 'circle' && (
                  <g id="svg-circle-geofence">
                    <circle
                      cx={CANVAS_CENTER_X}
                      cy={CANVAS_CENTER_Y}
                      r={radiusMeters * pxPerMeter}
                      fill="#0284c7"
                      fillOpacity="0.22"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeDasharray="6,3"
                    />
                    <circle
                      cx={CANVAS_CENTER_X}
                      cy={CANVAS_CENTER_Y}
                      r={radiusMeters * pxPerMeter}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="1"
                    />
                  </g>
                )}

                {/* 2. Render Polygon Mode Geofence */}
                {geofenceType === 'polygon' && polygonCoords.length >= 3 && (
                  <g id="svg-polygon-geofence">
                    <polygon
                      points={polygonCoords
                        .map((pt) => {
                          const p = geoToSvg(pt.latitude, pt.longitude);
                          return `${p.x},${p.y}`;
                        })
                        .join(' ')}
                      fill="#0284c7"
                      fillOpacity="0.25"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                    />
                    {/* Polygon Vertices */}
                    {polygonCoords.map((pt, idx) => {
                      const p = geoToSvg(pt.latitude, pt.longitude);
                      const isSelected = selectedVertexIndex === idx;
                      return (
                        <g key={idx} className="cursor-pointer" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVertexIndex(idx);
                        }}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isSelected ? 7 : 5}
                            fill={isSelected ? '#f59e0b' : '#38bdf8'}
                            stroke="#0f172a"
                            strokeWidth="2"
                          />
                          <text
                            x={p.x + 8}
                            y={p.y - 6}
                            fill="#cbd5e1"
                            fontSize="10"
                            fontWeight="bold"
                          >
                            P{idx + 1}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* 3. Render Multi-Parcel Mode Geofences */}
                {geofenceType === 'multi_parcel' && multiParcels.map((parcel, pIdx) => {
                  const isCurrentActive = pIdx === activeParcelIndex;
                  const parcelColor = parcel.color || PRESET_PARCEL_COLORS[pIdx % PRESET_PARCEL_COLORS.length];

                  if (parcel.type === 'polygon' && parcel.coordinates && parcel.coordinates.length >= 3) {
                    const pointsStr = parcel.coordinates
                      .map((pt) => {
                        const p = geoToSvg(pt.latitude, pt.longitude);
                        return `${p.x},${p.y}`;
                      })
                      .join(' ');

                    const centroid = calculatePolygonCentroid(parcel.coordinates);
                    const centroidSvg = geoToSvg(centroid.latitude, centroid.longitude);

                    return (
                      <g key={parcel.id} onClick={(e) => { e.stopPropagation(); setActiveParcelIndex(pIdx); }}>
                        <polygon
                          points={pointsStr}
                          fill={parcelColor}
                          fillOpacity={isCurrentActive ? 0.35 : 0.18}
                          stroke={parcelColor}
                          strokeWidth={isCurrentActive ? 3 : 1.5}
                          strokeDasharray={isCurrentActive ? undefined : '4,2'}
                        />
                        {/* Parcel Label Tag */}
                        <rect
                          x={centroidSvg.x - 45}
                          y={centroidSvg.y - 10}
                          width="90"
                          height="20"
                          rx="4"
                          fill="#0f172a"
                          fillOpacity="0.8"
                          stroke={parcelColor}
                          strokeWidth="1"
                        />
                        <text
                          x={centroidSvg.x}
                          y={centroidSvg.y + 3}
                          fill="#f8fafc"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {parcel.name.length > 14 ? parcel.name.slice(0, 14) + '…' : parcel.name}
                        </text>
                      </g>
                    );
                  } else if (parcel.center && parcel.radiusMeters) {
                    const centerSvg = geoToSvg(parcel.center.latitude, parcel.center.longitude);
                    return (
                      <g key={parcel.id} onClick={(e) => { e.stopPropagation(); setActiveParcelIndex(pIdx); }}>
                        <circle
                          cx={centerSvg.x}
                          cy={centerSvg.y}
                          r={parcel.radiusMeters * pxPerMeter}
                          fill={parcelColor}
                          fillOpacity={isCurrentActive ? 0.35 : 0.18}
                          stroke={parcelColor}
                          strokeWidth={isCurrentActive ? 3 : 1.5}
                        />
                        <text
                          x={centerSvg.x}
                          y={centerSvg.y + 3}
                          fill="#f8fafc"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {parcel.name}
                        </text>
                      </g>
                    );
                  }
                  return null;
                })}

                {/* Primary Site Center Pin */}
                <g id="svg-site-center">
                  <circle cx={CANVAS_CENTER_X} cy={CANVAS_CENTER_Y} r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                  <circle cx={CANVAS_CENTER_X} cy={CANVAS_CENTER_Y} r="3" fill="#ffffff" />
                  <text
                    x={CANVAS_CENTER_X + 12}
                    y={CANVAS_CENTER_Y + 4}
                    fill="#f8fafc"
                    fontSize="11"
                    fontWeight="black"
                  >
                    POST HQ
                  </text>
                </g>

                {/* Test Hit Point Marker */}
                {(() => {
                  const testSvg = geoToSvg(testPoint.latitude, testPoint.longitude);
                  return (
                    <g id="svg-test-hit-marker">
                      <circle
                        cx={testSvg.x}
                        cy={testSvg.y}
                        r="14"
                        fill={hitResult.inGeofence ? '#10b981' : '#f43f5e'}
                        fillOpacity="0.3"
                        className="animate-ping"
                      />
                      <circle
                        cx={testSvg.x}
                        cy={testSvg.y}
                        r="6"
                        fill={hitResult.inGeofence ? '#10b981' : '#f43f5e'}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={testSvg.x + 10}
                        y={testSvg.y + 4}
                        fill={hitResult.inGeofence ? '#34d399' : '#fb7185'}
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {hitResult.inGeofence ? 'ON SITE' : 'OUT-OF-BOUNDS'}
                      </text>
                    </g>
                  );
                })()}
              </svg>

              {/* Canvas Overlay Legend */}
              <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 p-2.5 rounded-xl text-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white"></span>
                  <span>Primary Facility Origin</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span>Active Geofence Envelope</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-200">
                  <span className={`w-2.5 h-2.5 rounded-full ${hitResult.inGeofence ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span>Simulated GPS Position</span>
                </div>
              </div>

              {/* Canvas Control Hint */}
              <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 px-2.5 py-1 rounded-lg text-2xs text-slate-400">
                Mode: <span className="text-blue-400 font-bold uppercase">{canvasMode}</span> (Click to interact)
              </div>
            </div>

            {/* Live Hit-Test Status Card */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              hitResult.inGeofence
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70 text-rose-900 dark:text-rose-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl text-white ${hitResult.inGeofence ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                  {hitResult.inGeofence ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-tight">
                      {hitResult.inGeofence ? 'Validation: Inside Authorized Geofence' : 'Validation: Perimeter Departure Breach'}
                    </span>
                    {hitResult.matchedParcelName && (
                      <span className="text-2xs font-bold px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 rounded-md">
                        {hitResult.matchedParcelName}
                      </span>
                    )}
                  </div>
                  <p className="text-2xs opacity-90">
                    Test Point: {testPoint.latitude.toFixed(5)}, {testPoint.longitude.toFixed(5)} ({formatDistance(hitResult.distanceMeters)} from post origin) • {hitResult.zoneDescription}
                  </p>
                </div>
              </div>

              {/* Move Test Point to Center */}
              <button
                type="button"
                onClick={() => setTestPoint({ latitude: centerLat, longitude: centerLng })}
                className="px-3 py-1.5 text-2xs font-bold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
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
                <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500"></div>
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
                <span>Polygon Multi-Point</span>
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
                    className="text-2xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Centroid</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-2xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={centerLat}
                    onChange={(e) => setCenterLat(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-2xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={centerLng}
                    onChange={(e) => setCenterLng(parseFloat(e.target.value) || 0)}
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

                {/* Slider */}
                <input
                  type="range"
                  min="25"
                  max="800"
                  step="25"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[50, 80, 100, 150, 200, 300, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRadiusMeters(preset)}
                      className={`px-2.5 py-1 rounded-lg text-2xs font-bold border transition-colors cursor-pointer ${
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
                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-2xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Vertex</span>
                  </button>
                </div>

                {/* Preset Shapes Generator */}
                <div className="space-y-1.5">
                  <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Generate Preset Boundary</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('square')}
                      className="px-2 py-1.5 text-2xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-center cursor-pointer"
                    >
                      Square Campus
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('rectangle_wharf')}
                      className="px-2 py-1.5 text-2xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-center cursor-pointer"
                    >
                      Pier / Wharf
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('hexagon')}
                      className="px-2 py-1.5 text-2xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-center cursor-pointer"
                    >
                      Hexagon Yard
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('l_shape')}
                      className="px-2 py-1.5 text-2xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-center cursor-pointer"
                    >
                      L-Shape Complex
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('campus_box')}
                      className="px-2 py-1.5 text-2xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-center cursor-pointer"
                    >
                      Extended Box
                    </button>
                  </div>
                </div>

                {/* Vertices Coordinate List */}
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
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
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-2xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="number"
                            step="0.0001"
                            value={pt.latitude}
                            onChange={(e) => handleUpdateVertex(idx, 'latitude', parseFloat(e.target.value) || 0)}
                            className="w-24 px-1.5 py-0.5 text-2xs rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                          />
                          <input
                            type="number"
                            step="0.0001"
                            value={pt.longitude}
                            onChange={(e) => handleUpdateVertex(idx, 'longitude', parseFloat(e.target.value) || 0)}
                            className="w-24 px-1.5 py-0.5 text-2xs rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteVertex(idx); }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
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
                    className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-2xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Parcel</span>
                  </button>
                </div>

                {/* Parcel Selection Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
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
                        ></span>
                        <span>{parcel.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Parcel Configuration Panel */}
                {multiParcels[activeParcelIndex] && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Edit Selected Parcel</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteParcel(activeParcelIndex)}
                        className="text-2xs text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete Parcel</span>
                      </button>
                    </div>

                    <div>
                      <label className="text-2xs font-semibold text-slate-500 block mb-1">Parcel Name</label>
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
                        <label className="text-2xs font-semibold text-slate-500 block mb-1">Shape Type</label>
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
                        <label className="text-2xs font-semibold text-slate-500 block mb-1">Zone Category</label>
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
                      <label className="text-2xs font-semibold text-slate-500 block mb-1">Theme Color</label>
                      <div className="flex items-center gap-2">
                        {PRESET_PARCEL_COLORS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => handleUpdateActiveParcel('color', col)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                              multiParcels[activeParcelIndex].color === col ? 'scale-125 border-white shadow-sm' : 'border-transparent'
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
                <span className="px-2 py-0.5 rounded-md text-2xs font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
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

              <p className="text-2xs text-slate-500 dark:text-slate-400">
                Guard must remain consecutively out-of-bounds for {departureDebounceMinutes} minutes before escalating to an Off-Site Breach to prevent false GPS jitter alerts.
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

        {/* Modal Footer / Save Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Changes take effect immediately for active duty tracking and CAD breach monitors.</span>
          </div>

          <div className="flex items-center gap-2">
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
