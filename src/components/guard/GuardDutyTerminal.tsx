import React, { useState, useEffect } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { formatElapsedTimer, getShiftElapsedSeconds } from '../../utils/time';
import { 
  Clock, 
  MapPin, 
  Shield, 
  ShieldCheck, 
  Coffee, 
  Play, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Calendar, 
  Building2, 
  User, 
  FileText, 
  CheckSquare, 
  Compass, 
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  AlertCircle,
  Camera,
  Eye,
  X,
  Zap,
  Check,
  RotateCcw,
  Navigation,
  Car,
  Crosshair,
  Route,
  ShieldAlert,
  CloudRain,
  Gauge,
  CheckCheck,
  Flag,
  Layers,
  SlidersHorizontal,
  Timer,
  Bell,
  Lock,
  Unlock,
  CheckCircle,
  BellRing,
  AlertOctagon
} from 'lucide-react';
import { ScheduledShift, TimeSpecificTask, StandardReportType, DepartureReasonType, SiteProfile } from '../../types/shift';
import { VerificationCameraModal } from './VerificationCameraModal';
import { TimeSpecificTaskAlertBanner } from './TimeSpecificTaskAlertBanner';
import { GuardTimedTasksSection } from './GuardTimedTasksSection';
import { StandardReportingModal } from './StandardReportingModal';
import { GuardThirtyMinIntervalTracker } from './GuardThirtyMinIntervalTracker';
import { GuardReportsLogSection } from './GuardReportsLogSection';
import { GuardDeparturePromptModal } from './GuardDeparturePromptModal';
import { GuardSiteInfoModal } from './GuardSiteInfoModal';
import { getCurrentLocation, calculateDistance, GeoCoordinates, formatDistance, verifySiteGeofence } from '../../utils/geo';

interface GuardDutyTerminalProps {
  onOpenAlertPrefs?: () => void;
  onNavigateToCalendar?: () => void;
}

export const GuardDutyTerminal: React.FC<GuardDutyTerminalProps> = ({ onNavigateToCalendar }) => {
  const { 
    activeGuard, 
    scheduledShifts, 
    activeClockedInShift, 
    clockInGuard, 
    clockOutGuard, 
    startGuardBreak, 
    endGuardBreak,
    sitesList,
    opsPhone,
    showToast,
    rovers,
    getRoverForGuard,
    getRoverByGroup,
    roverPlans,
    advanceRoverCheckpoint,
    simulateRoverGpsMove,
    activeInterceptions,
    trafficCondition,
    optimizationMode,
    clearAdHocInterception,
    standardReports,
    submitStandardReport,
    getLastActivityReportForGuard,
    updateGuardGeofenceState,
    submitDepartureReason,
    clearGeofenceBreach,
    escalateGeofenceBreach
  } = useShiftOps();

  // Geofence Departure Reason Prompt Modal State
  const [isDeparturePromptOpen, setIsDeparturePromptOpen] = useState<boolean>(false);

  // Standard Shift Reporting Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportModalType, setReportModalType] = useState<StandardReportType>('activity');
  const [reportInitialZone, setReportInitialZone] = useState<string>('North Facility Perimeter & Access Gate');

  // Most recent activity DAR check-in for current guard
  const lastActivityReport = getLastActivityReportForGuard(activeGuard.id);

  // Find assigned rover vehicle and dynamic route plan (support active shift, guard profile, or group assignment)
  const assignedRover = getRoverForGuard(activeGuard.id) || (
    activeClockedInShift?.assignedRoverId ? rovers.find(r => r.id === activeClockedInShift.assignedRoverId) : undefined
  ) || (
    activeClockedInShift?.rovingGroup ? getRoverByGroup(activeClockedInShift.rovingGroup) : undefined
  ) || (
    activeGuard.isRovingGuard ? getRoverByGroup(activeGuard.rovingGroup || 'Metro') : undefined
  );
  const activeRoverPlan = assignedRover ? roverPlans[assignedRover.id] : undefined;
  const currentRoverStop = activeRoverPlan && assignedRover 
    ? activeRoverPlan.stops[assignedRover.currentStopIndex] 
    : undefined;
  const nextRoverStop = activeRoverPlan && assignedRover
    ? activeRoverPlan.stops[assignedRover.currentStopIndex + 1]
    : undefined;

  // Active emergency intercept assigned to this guard's rover unit
  const activeUnitIntercept = assignedRover
    ? activeInterceptions.find(i => i.assignedRoverId === assignedRover.id && i.status === 'dispatched')
    : undefined;

  const [showFullItinerary, setShowFullItinerary] = useState<boolean>(true);
  const [itineraryFilter, setItineraryFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Clock-in form state
  const [selectedSiteName, setSelectedSiteName] = useState<string>(
    activeGuard.ojtSites[0] || (sitesList[0]?.name || 'Skyline Tower & Plaza')
  );
  const [selectedScheduledShiftId, setSelectedScheduledShiftId] = useState<string>('');
  const [postRoleInput, setPostRoleInput] = useState<string>('Access Control & Lobby Desk');
  const [clockInNotes, setClockInNotes] = useState<string>('');
  const [selectedGear, setSelectedGear] = useState<string[]>([
    'Radio CH-1 (Ops Dispatch)',
    'Body-Worn Camera #07',
    'Facility Master Key Card',
    'High-Vis Security Vest'
  ]);

  // GPS & Verification States
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);
  const [isCheckingGps, setIsCheckingGps] = useState<boolean>(false);
  const [pendingGpsCoords, setPendingGpsCoords] = useState<GeoCoordinates | null>(null);
  const [pendingGeofenceDistance, setPendingGeofenceDistance] = useState<number | undefined>(undefined);
  const [pendingGeofencePassed, setPendingGeofencePassed] = useState<boolean>(true);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{ title: string; url: string } | null>(null);

  // Break modal state
  const [isBreakModalOpen, setIsBreakModalOpen] = useState<boolean>(false);
  const [breakType, setBreakType] = useState<'meal' | 'rest'>('meal');
  const [breakNote, setBreakNote] = useState<string>('');

  // Clock-out modal state
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState<boolean>(false);
  const [clockOutNotes, setClockOutNotes] = useState<string>('');
  const [handoverSummary, setHandoverSummary] = useState<string>('All posts inspected and clear. Handover log completed.');
  const [gearReturnedConfirmed, setGearReturnedConfirmed] = useState<boolean>(true);

  // Live timer state
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Guard Site Info & POCs Modal state
  const [isSiteInfoModalOpen, setIsSiteInfoModalOpen] = useState<boolean>(false);
  const [siteInfoTargetSite, setSiteInfoTargetSite] = useState<SiteProfile | undefined>(undefined);

  // Update timer every second when clocked in
  useEffect(() => {
    if (!activeClockedInShift || !activeClockedInShift.clockInTime) {
      setElapsedSec(0);
      return;
    }

    const updateTimer = () => {
      const sec = getShiftElapsedSeconds(activeClockedInShift.clockInTime, undefined, activeClockedInShift.breaks);
      setElapsedSec(sec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeClockedInShift]);

  // Find upcoming scheduled shifts for today
  const todayStr = new Date().toISOString().split('T')[0];
  const guardTodayShifts = scheduledShifts.filter(
    (s) => s.guardId === activeGuard.id && s.date === todayStr
  );
  const guardUpcomingShifts = scheduledShifts
    .filter((s) => s.guardId === activeGuard.id && s.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const availableGearOptions = [
    'Radio CH-1 (Ops Dispatch)',
    'Body-Worn Camera #07',
    'Facility Master Key Card',
    'High-Vis Security Vest',
    'Flashlight (Rechargeable)',
    'Patrol Guard Tour Wand',
    'First Aid Trauma Kit'
  ];

  const handleToggleGear = (gear: string) => {
    setSelectedGear((prev) => 
      prev.includes(gear) ? prev.filter((g) => g !== gear) : [...prev, gear]
    );
  };

  const handleInitiateClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteName) {
      showToast('Site Required', 'Please select a facility to clock in.', 'warning');
      return;
    }

    setIsCheckingGps(true);

    try {
      // 1. Get current GPS Location
      const targetSite = sitesList.find((s) => s.name === selectedSiteName);
      const targetSiteCoords: GeoCoordinates | undefined = 
        targetSite?.latitude && targetSite?.longitude
          ? { latitude: targetSite.latitude, longitude: targetSite.longitude }
          : undefined;

      const coords = await getCurrentLocation(targetSiteCoords);
      setPendingGpsCoords(coords);

      // 2. Compute Geofence distance
      let distanceM = 24; // Default close proximity
      let passed = true;
      const allowedRadius = targetSite?.geofenceRadiusMeters || 150;

      if (targetSiteCoords) {
        distanceM = calculateDistance(coords, targetSiteCoords);
        passed = distanceM <= allowedRadius;
      }

      setPendingGeofenceDistance(distanceM);
      setPendingGeofencePassed(passed);

      if (!passed && targetSite?.geofenceStrictEnforce) {
        showToast(
          'Geofence Perimeter Breach',
          `You are ${formatDistance(distanceM)} away from ${selectedSiteName} (Radius limit: ${allowedRadius}m). Move on-site before clocking in.`,
          'danger'
        );
        setIsCheckingGps(false);
        return;
      }

      // 3. Open Verification Camera Modal (Selfie & Equipment photos)
      setIsCheckingGps(false);
      setIsVerificationModalOpen(true);
    } catch (err: any) {
      console.warn('GPS Verification fallback:', err);
      // Fallback location for demo
      const fallbackCoords = { latitude: 47.6062, longitude: -122.3321 };
      setPendingGpsCoords(fallbackCoords);
      setPendingGeofenceDistance(32);
      setPendingGeofencePassed(true);
      setIsCheckingGps(false);
      setIsVerificationModalOpen(true);
    }
  };

  const handleCompleteVerification = (data: {
    selfiePhotoUrl: string;
    equipmentPhotoUrl: string;
  }) => {
    setIsVerificationModalOpen(false);

    clockInGuard(activeGuard.id, selectedSiteName, {
      scheduledShiftId: selectedScheduledShiftId || undefined,
      postRole: postRoleInput,
      notes: clockInNotes,
      equipmentIssued: selectedGear,
      gpsCoordinates: pendingGpsCoords,
      geofencePassed: pendingGeofencePassed,
      geofenceDistanceMeters: pendingGeofenceDistance,
      selfiePhotoUrl: data.selfiePhotoUrl,
      equipmentPhotoUrl: data.equipmentPhotoUrl,
      verifiedByMethod: 'camera_gps'
    });
  };

  const handleExecuteClockOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gearReturnedConfirmed) {
      showToast('Gear Check Required', 'Please confirm all issued gear is secured or handed over.', 'warning');
      return;
    }

    clockOutGuard(activeGuard.id, {
      notes: clockOutNotes,
      handoverSummary: handoverSummary,
      equipmentReturned: true
    });
    setIsClockOutModalOpen(false);
  };

  // Handle guard submitting departure reason from mobile prompt
  const handleSubmitDepartureReason = (reason: DepartureReasonType, notes: string) => {
    if (!activeClockedInShift) return;
    submitDepartureReason(activeClockedInShift.id, reason, notes);
    setIsDeparturePromptOpen(false);
  };

  // Handle manual "Verify I'm Back On-Site"
  const handleVerifyReturnOnSite = async () => {
    if (!activeClockedInShift) return;
    const site = sitesList.find((s) => s.name === activeClockedInShift.siteName || s.id === activeClockedInShift.siteId);
    if (!site) return;

    try {
      const coords = await getCurrentLocation(
        site.latitude && site.longitude ? { latitude: site.latitude, longitude: site.longitude } : undefined
      );
      const result = verifySiteGeofence(coords, site, site.name);
      updateGuardGeofenceState(activeClockedInShift.id, {
        inGeofence: result.inGeofence,
        distanceMeters: result.distanceMeters,
        matchedParcelName: result.matchedParcelName,
        currentGps: coords
      });

      if (result.inGeofence) {
        showToast('On-Site Verified', `Verified inside ${site.name} boundary (${result.matchedParcelName || 'Main Zone'}).`, 'success');
        setIsDeparturePromptOpen(false);
      } else {
        showToast('Still Outside Perimeter', `Current GPS is still ${formatDistance(result.distanceMeters)} outside ${site.name}.`, 'warning');
      }
    } catch (err: any) {
      showToast('GPS Check Error', err.message || 'Unable to fetch coordinates', 'danger');
    }
  };

  // Quick simulation controls for testing
  const handleSimulateMoveOffSite = (distanceMeters: number = 280) => {
    if (!activeClockedInShift) return;
    const site = sitesList.find((s) => s.name === activeClockedInShift.siteName || s.id === activeClockedInShift.siteId);
    const baseLat = site?.latitude || 47.6062;
    const baseLng = site?.longitude || -122.3321;
    // Offset ~280 meters north-west
    const simulatedGps = {
      latitude: baseLat + (distanceMeters / 111111),
      longitude: baseLng - (distanceMeters / (111111 * Math.cos(baseLat * Math.PI / 180)))
    };

    updateGuardGeofenceState(activeClockedInShift.id, {
      inGeofence: false,
      distanceMeters,
      currentGps: simulatedGps
    });
    setIsDeparturePromptOpen(true);
  };

  const handleSimulateReturnOnSite = () => {
    if (!activeClockedInShift) return;
    const site = sitesList.find((s) => s.name === activeClockedInShift.siteName || s.id === activeClockedInShift.siteId);
    const baseLat = site?.latitude || 47.6062;
    const baseLng = site?.longitude || -122.3321;
    const simulatedGps = { latitude: baseLat, longitude: baseLng };

    updateGuardGeofenceState(activeClockedInShift.id, {
      inGeofence: true,
      distanceMeters: 12,
      matchedParcelName: site?.multiParcels?.[0]?.name || 'Primary Facility Perimeter',
      currentGps: simulatedGps
    });
    setIsDeparturePromptOpen(false);
  };

  const handleExecuteStartBreak = (e: React.FormEvent) => {
    e.preventDefault();
    startGuardBreak(activeGuard.id, breakType, breakNote);
    setIsBreakModalOpen(false);
    setBreakNote('');
  };

  return (
    <div id="guard-duty-terminal" className="space-y-4 pb-4">
      {/* Time-Specific Task / Amenity Lockout Live Alert Banner */}
      <TimeSpecificTaskAlertBanner />

      {/* ACTIVE CLOCKED IN VIEW */}
      {activeClockedInShift ? (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Main Duty Status Banner */}
          <div className={`p-4 rounded-2xl border-2 shadow-lg transition-all ${
            activeClockedInShift.status === 'on_break'
              ? 'bg-gradient-to-br from-amber-950/80 via-slate-900 to-amber-950/40 border-amber-500 text-amber-100'
              : 'bg-gradient-to-br from-slate-900 via-blue-950/90 to-slate-950 border-emerald-500 text-white shadow-emerald-950/30'
          }`}>
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-3.5 h-3.5 rounded-full ${
                  activeClockedInShift.status === 'on_break' 
                    ? 'bg-amber-400 animate-pulse' 
                    : 'bg-emerald-400 animate-ping'
                }`} />
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    activeClockedInShift.status === 'on_break'
                      ? 'bg-amber-500/30 text-amber-300 border-amber-400/50'
                      : 'bg-emerald-500/30 text-emerald-300 border-emerald-400/50'
                  }`}>
                    {activeClockedInShift.status === 'on_break' ? '☕ ON REST BREAK' : '● ACTIVE ON-DUTY POST'}
                  </span>
                  <p className="text-xs font-bold text-slate-300 mt-0.5">
                    Officer {activeGuard.name} ({activeGuard.badgeNumber})
                  </p>
                </div>
              </div>

              {/* GPS Verified Status Badge */}
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-600/40">
                <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span>GPS Verified</span>
              </div>
            </div>

            {/* Live Elapsed Time Block */}
            <div className="py-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                {activeClockedInShift.status === 'on_break' ? 'Duty Clock (Break Paused)' : 'Active Shift Elapsed Time'}
              </span>
              <div className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-white flex items-center justify-center gap-2">
                <Clock className="w-6 h-6 text-blue-400 animate-pulse" />
                <span>{formatElapsedTimer(elapsedSec)}</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono mt-1">
                Clocked In: {new Date(activeClockedInShift.clockInTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>

            {/* Facility & Post Specifications */}
            <div className="bg-slate-950/70 rounded-xl p-3 border border-white/10 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Facility</span>
                  <div className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>{activeClockedInShift.siteName}</span>
                  </div>
                  {activeClockedInShift.siteAddress && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{activeClockedInShift.siteAddress}</span>
                    </p>
                  )}
                </div>

                <div className="text-right flex flex-col items-end gap-1.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Post Assignment</span>
                    <span className="font-mono font-bold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60 block mt-0.5">
                      {activeClockedInShift.postRole}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const site = sitesList.find((s) => s.name === activeClockedInShift.siteName || s.id === activeClockedInShift.siteId);
                      setSiteInfoTargetSite(site);
                      setIsSiteInfoModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 transition-colors cursor-pointer"
                    title="View Property Info, Persons of Contact (POCs), and Emergency Lines"
                  >
                    <PhoneCall className="w-3 h-3 text-blue-300" />
                    <span>Site POCs</span>
                  </button>
                </div>
              </div>

              {/* Verification Badges & Evidence Photos */}
              <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* GPS & Geofence Departure Monitoring */}
                <div className={`p-2.5 rounded-lg border transition-all ${
                  activeClockedInShift.offSiteBreachStatus === 'breached_unacknowledged'
                    ? 'bg-rose-950/60 border-rose-500/60 shadow-lg shadow-rose-950/40'
                    : activeClockedInShift.offSiteBreachStatus === 'debounce_pending'
                    ? 'bg-amber-950/60 border-amber-500/60 animate-pulse shadow-lg shadow-amber-950/40'
                    : activeClockedInShift.offSiteBreachStatus === 'excused'
                    ? 'bg-blue-950/60 border-blue-500/50'
                    : 'bg-slate-900/90 border-emerald-500/30'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                        activeClockedInShift.offSiteBreachStatus === 'breached_unacknowledged'
                          ? 'bg-rose-900 border-rose-400 text-rose-200'
                          : activeClockedInShift.offSiteBreachStatus === 'debounce_pending'
                          ? 'bg-amber-900 border-amber-400 text-amber-200'
                          : activeClockedInShift.offSiteBreachStatus === 'excused'
                          ? 'bg-blue-900 border-blue-400 text-blue-200'
                          : 'bg-emerald-950 border-emerald-500/50 text-emerald-400'
                      }`}>
                        {activeClockedInShift.offSiteBreachStatus === 'breached_unacknowledged' ? (
                          <AlertOctagon className="w-3.5 h-3.5" />
                        ) : activeClockedInShift.offSiteBreachStatus === 'debounce_pending' ? (
                          <Timer className="w-3.5 h-3.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-mono uppercase font-bold ${
                            activeClockedInShift.offSiteBreachStatus === 'breached_unacknowledged'
                              ? 'text-rose-400'
                              : activeClockedInShift.offSiteBreachStatus === 'debounce_pending'
                              ? 'text-amber-400'
                              : activeClockedInShift.offSiteBreachStatus === 'excused'
                              ? 'text-blue-400'
                              : 'text-emerald-400'
                          }`}>
                            {activeClockedInShift.offSiteBreachStatus === 'breached_unacknowledged'
                              ? '🚨 Off-Site Breach'
                              : activeClockedInShift.offSiteBreachStatus === 'debounce_pending'
                              ? '⚠️ Perimeter Departure'
                              : activeClockedInShift.offSiteBreachStatus === 'excused'
                              ? '✓ Excused Departure'
                              : 'Geofence Compliance'}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-200 block truncate">
                          {activeClockedInShift.offSiteBreachStatus === 'debounce_pending'
                            ? `Buffer: ${Math.floor((activeClockedInShift.debounceSecondsRemaining || 180) / 60)}m ${(activeClockedInShift.debounceSecondsRemaining || 180) % 60}s remaining`
                            : activeClockedInShift.offSiteBreachStatus === 'breached_unacknowledged'
                            ? `Outside boundary (${activeClockedInShift.currentGeofenceDistanceMeters || 250}m) - Escalated`
                            : activeClockedInShift.offSiteBreachStatus === 'excused'
                            ? `${activeClockedInShift.lastDepartureReason || 'Authorized Excusal'}`
                            : activeClockedInShift.currentMatchedParcelName
                            ? `Inside ${activeClockedInShift.currentMatchedParcelName}`
                            : `${activeClockedInShift.currentGeofenceDistanceMeters || 20}m from site center (Inside)`}
                        </span>
                      </div>
                    </div>

                    {/* Action button */}
                    {(activeClockedInShift.offSiteBreachStatus === 'debounce_pending' || 
                      activeClockedInShift.offSiteBreachStatus === 'breached_unacknowledged' || 
                      activeClockedInShift.offSiteBreachStatus === 'excused') ? (
                      <button
                        type="button"
                        onClick={() => setIsDeparturePromptOpen(true)}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] shrink-0 shadow transition-colors"
                      >
                        {activeClockedInShift.offSiteBreachStatus === 'excused' ? 'Edit Reason' : 'Log Reason'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeparturePromptOpen(true)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-[10px] shrink-0 border border-slate-700 transition-colors"
                        title="Manually log an authorized departure"
                      >
                        Log Departure
                      </button>
                    )}
                  </div>

                  {/* Quick test simulation pills for demo verification */}
                  <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1 text-[9px]">
                    <span className="text-slate-400 font-mono">GPS Test:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSimulateMoveOffSite(320)}
                        className="px-1.5 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 font-mono"
                        title="Simulate guard stepping 320m outside site perimeter"
                      >
                        Walk Off-Site (320m)
                      </button>
                      <button
                        type="button"
                        onClick={handleSimulateReturnOnSite}
                        className="px-1.5 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-mono"
                        title="Simulate guard returning inside site perimeter"
                      >
                        Return On-Site
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyReturnOnSite}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono"
                        title="Poll live device GPS to verify location"
                      >
                        Check GPS
                      </button>
                    </div>
                  </div>
                </div>

                {/* Verification Photos Thumbnails */}
                <div className="p-2 rounded-lg bg-slate-900/90 border border-blue-500/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase text-blue-400 font-bold block">Visual Check</span>
                      <span className="text-[11px] font-semibold text-slate-200 block">Selfie & Gear Logged</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {activeClockedInShift.selfiePhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoModal({ title: 'Officer Uniform Selfie Verification', url: activeClockedInShift.selfiePhotoUrl! })}
                        className="w-7 h-7 rounded-md overflow-hidden border border-blue-400/60 hover:scale-105 transition-transform cursor-pointer relative group"
                        title="View Uniform Selfie"
                      >
                        <img src={activeClockedInShift.selfiePhotoUrl} alt="Selfie" className="w-full h-full object-cover" />
                      </button>
                    )}
                    {activeClockedInShift.equipmentPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoModal({ title: 'Equipment Inspection Verification', url: activeClockedInShift.equipmentPhotoUrl! })}
                        className="w-7 h-7 rounded-md overflow-hidden border border-emerald-400/60 hover:scale-105 transition-transform cursor-pointer relative group"
                        title="View Equipment Photo"
                      >
                        <img src={activeClockedInShift.equipmentPhotoUrl} alt="Gear" className="w-full h-full object-cover" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Equipment Issued */}
              {activeClockedInShift.equipmentIssued && activeClockedInShift.equipmentIssued.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Equipped Gear:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {activeClockedInShift.equipmentIssued.map((item, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md border border-slate-700 font-mono">
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Shift Duty Action Buttons */}
            <div className="pt-4 grid grid-cols-2 gap-2">
              {activeClockedInShift.status === 'on_duty' ? (
                <button
                  id="guard-start-break-btn"
                  type="button"
                  onClick={() => setIsBreakModalOpen(true)}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Coffee className="w-4 h-4" />
                  <span>Start Break</span>
                </button>
              ) : (
                <button
                  id="guard-end-break-btn"
                  type="button"
                  onClick={() => endGuardBreak(activeGuard.id)}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume Duty</span>
                </button>
              )}

              <button
                id="guard-clock-out-btn"
                type="button"
                onClick={() => setIsClockOutModalOpen(true)}
                className="py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Clock Out</span>
              </button>
            </div>
          </div>

          {/* 30-Minute Routine Patrol Check-in & Standard Reporting Tracker */}
          <GuardThirtyMinIntervalTracker
            guard={activeGuard}
            activeShift={activeClockedInShift}
            lastActivityReport={lastActivityReport}
            onOpenReportModal={(type) => {
              setReportModalType(type);
              setIsReportModalOpen(true);
            }}
          />

          {/* Time-Specific Tasks & Amenity Lockouts Schedule */}
          <GuardTimedTasksSection 
            currentSiteName={activeClockedInShift.siteName} 
            isRoverGuard={Boolean(assignedRover)} 
          />

          {/* ROVER DYNAMIC ROUTE & GEOFENCE CIRCUIT (If Guard is assigned to a Rover) */}
          {assignedRover && activeRoverPlan && (
            <div className="bg-slate-900 text-white rounded-2xl p-4 border border-cyan-500/40 shadow-xl space-y-3.5">
              {/* Emergency Intercept High-Priority Alert */}
              {activeUnitIntercept && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-2 border-rose-500 text-rose-100 space-y-2 shadow-lg animate-pulse">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-rose-600 text-white rounded-lg shrink-0">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-rose-700 text-white px-2 py-0.5 rounded font-mono">
                            🚨 PRIORITY CFS INTERCEPT ORDER
                          </span>
                          <span className="text-[10px] font-bold text-rose-200 font-mono">
                            Assigned to: {assignedRover.unitNumber}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white mt-1">
                          {activeUnitIntercept.callTitle || activeUnitIntercept.callSummary}
                        </h4>
                        <p className="text-xs text-rose-200 font-mono flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                          <span>{activeUnitIntercept.locationAddress || activeUnitIntercept.targetAddress}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 bg-rose-900/80 p-2 rounded-lg border border-rose-600/60 font-mono">
                      <span className="text-[9px] text-rose-300 uppercase block font-sans">Target ETA</span>
                      <span className="text-sm font-black text-white">~{activeUnitIntercept.estimatedEtaMinutes || 5} min</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-rose-800/80 text-[11px]">
                    <span className="text-rose-300 italic">
                      Routine rounds automatically reprioritized. Proceed immediately.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        clearAdHocInterception(activeUnitIntercept.id, 'Officer responded on-scene');
                        showToast('Intercept Acknowledged', 'Dispatched intercept resolved on-scene.', 'success');
                      }}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer transition-colors"
                    >
                      Acknowledge & Mark On-Scene
                    </button>
                  </div>
                </div>
              )}

              {/* Circuit Header & Optimization Condition Badges */}
              <div className="space-y-2 pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-cyan-600/20 border border-cyan-500/40 rounded-xl text-cyan-400">
                      <Car className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                        <span>Mobile Patrol Circuit: {assignedRover.unitNumber}</span>
                        <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-2 py-0.2 rounded font-mono font-bold">
                          {assignedRover.rovingGroup}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Assigned Officer: <strong className="text-slate-200">{activeGuard.name}</strong> • Mobile Unit ID: {assignedRover.id}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Circuit Progress</span>
                    <p className="text-xs font-black text-cyan-300">
                      Stop {assignedRover.currentStopIndex + 1} of {activeRoverPlan.stops.length} ({Math.round(((assignedRover.currentStopIndex) / activeRoverPlan.stops.length) * 100)}% Complete)
                    </p>
                  </div>
                </div>

                {/* Real-time route optimization factors bar */}
                <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 font-mono text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-slate-400">Route Logic:</span>
                    <span className="font-bold text-cyan-300 capitalize">{(activeRoverPlan.optimizationMode || 'traffic_density_optimal').replace(/_/g, ' ')}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                    <span className="px-2 py-0.5 bg-blue-950/80 text-blue-300 rounded border border-blue-800/60 flex items-center gap-1">
                      <CloudRain className="w-3 h-3 text-blue-400" />
                      <span>Traffic: {trafficCondition}</span>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 rounded border border-emerald-800/60 font-bold">
                      Saved ~{activeRoverPlan.deadheadSavedMinutes}m Deadhead
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Active Target Checkpoint */}
              {currentRoverStop && (
                <div className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl p-3.5 border-2 border-cyan-500/50 shadow-md space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] uppercase font-black tracking-wider text-cyan-400 flex items-center gap-1">
                        <Crosshair className="w-3 h-3 text-cyan-400 animate-spin" />
                        <span>Current Target #{assignedRover.currentStopIndex + 1}</span>
                      </span>
                      <h4 className="text-sm font-black text-white mt-0.5 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{currentRoverStop.siteName}</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{currentRoverStop.siteAddress}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block ${
                        currentRoverStop.slaPriority === 'P1_MANDATORY_SLA' || currentRoverStop.slaPriority === 'P1'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700 font-mono'
                          : 'bg-amber-950 text-amber-300 border border-amber-700 font-mono'
                      }`}>
                        {currentRoverStop.slaPriority}
                      </span>
                    </div>
                  </div>

                  {/* SLA Window & Dwell Timer Details */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Target Window</span>
                      <p className="font-mono font-bold text-slate-200">
                        {currentRoverStop.estimatedArrival} - {currentRoverStop.estimatedDeparture}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Mandatory Dwell</span>
                      <p className="font-mono font-bold text-amber-300">
                        {currentRoverStop.targetDwellMinutes} mins on-site
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Geofence Status</span>
                      <p className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{assignedRover.isInsideGeofence ? 'Inside Geofence' : 'Radar Scanning'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Action Button to Simulate/Log Checkpoint Arrival */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (assignedRover.status === 'patrolling') {
                          simulateRoverGpsMove(assignedRover.id, {
                            latitude: currentRoverStop.coords.latitude,
                            longitude: currentRoverStop.coords.longitude,
                            speedKmh: 5
                          });
                          advanceRoverCheckpoint(assignedRover.id);
                        } else {
                          advanceRoverCheckpoint(assignedRover.id, 'finish_dwell');
                        }
                      }}
                      className="flex-1 py-2.5 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <Crosshair className="w-4 h-4 text-slate-950" />
                      <span>
                        {assignedRover.status === 'dwelling'
                          ? 'Complete Site Dwell -> Depart to Next Checkpoint'
                          : 'Log Geofence Arrival & Start Dwell Timer'}
                      </span>
                    </button>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentRoverStop.siteAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                      title="Open GPS Navigation in Google Maps"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>GPS</span>
                    </a>
                  </div>
                </div>
              )}

              {/* COMPLETE OPTIMIZED ITINERARY LIST ACCORDION */}
              <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-3 flex items-center justify-between border-b border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowFullItinerary(!showFullItinerary)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-white cursor-pointer"
                  >
                    <Route className="w-4 h-4 text-cyan-400" />
                    <span>Optimized Circuit Itinerary ({activeRoverPlan.stops.length} Locations)</span>
                    {showFullItinerary ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </button>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1">
                    {(['all', 'pending', 'completed'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setItineraryFilter(filter)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors cursor-pointer ${
                          itineraryFilter === filter
                            ? 'bg-cyan-600 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {showFullItinerary && (
                  <div className="p-2 space-y-1.5 max-h-[300px] overflow-y-auto no-scrollbar">
                    {activeRoverPlan.stops
                      .map((stop, idx) => ({ stop, idx }))
                      .filter(({ idx }) => {
                        if (itineraryFilter === 'completed') return idx < assignedRover.currentStopIndex;
                        if (itineraryFilter === 'pending') return idx >= assignedRover.currentStopIndex;
                        return true;
                      })
                      .map(({ stop, idx }) => {
                        const isCompleted = idx < assignedRover.currentStopIndex;
                        const isCurrent = idx === assignedRover.currentStopIndex;
                        const isUpcoming = idx > assignedRover.currentStopIndex;

                        return (
                          <div
                            key={stop.id || idx}
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2.5 transition-all ${
                              isCurrent
                                ? 'bg-cyan-950/80 border-cyan-500/80 text-white ring-1 ring-cyan-500/30'
                                : isCompleted
                                ? 'bg-slate-900/40 border-slate-800/60 text-slate-400 opacity-60'
                                : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Step sequence badge */}
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${
                                isCurrent
                                  ? 'bg-cyan-500 text-slate-950 font-black'
                                  : isCompleted
                                  ? 'bg-emerald-800 text-emerald-100'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}>
                                {isCompleted ? '✓' : idx + 1}
                              </div>

                              <div className="min-w-0">
                                <div className="font-bold truncate flex items-center gap-1.5">
                                  <span className={isCurrent ? 'text-cyan-200' : isCompleted ? 'line-through text-slate-400' : 'text-white'}>
                                    {stop.siteName}
                                  </span>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.2 bg-cyan-600 text-slate-950 rounded text-[9px] font-mono font-black uppercase">
                                      CURRENT
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono truncate">
                                  {stop.siteAddress}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0 font-mono text-[11px]">
                              <div className="font-bold text-slate-300">
                                {stop.estimatedArrival} - {stop.estimatedDeparture}
                              </div>
                              <span className="text-[9px] text-slate-500">
                                {stop.targetDwellMinutes}m dwell • {stop.slaPriority.replace('_MANDATORY_SLA', '')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Guard Standard Reports & DAR Log Section */}
          <GuardReportsLogSection
            guard={activeGuard}
            reports={standardReports}
            onOpenNewReportModal={(type) => {
              setReportModalType(type || 'activity');
              setIsReportModalOpen(true);
            }}
          />

          {/* Quick Ops Dispatch Link Card */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Ops Command Dispatch</div>
                <div className="text-[10px] text-slate-500 font-mono">Channel 1 Priority Line • {opsPhone}</div>
              </div>
            </div>

            <a
              href={`tel:${opsPhone}`}
              className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Call Ops</span>
            </a>
          </div>
        </div>
      ) : (
        /* CLOCK IN TERMINAL (NOT CURRENTLY ON DUTY) */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Welcome Status Card */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-2xl shadow-md border border-blue-700">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-700 border border-blue-400 flex items-center justify-center text-white font-black text-sm">
                  {activeGuard.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-tight">{activeGuard.name}</h2>
                  <p className="text-[10px] text-blue-200 font-mono">Badge #{activeGuard.badgeNumber} • Off-Duty</p>
                </div>
              </div>

              <span className="text-[10px] font-bold bg-blue-950/80 px-2 py-1 rounded-full text-blue-200 border border-blue-500/40">
                Ready for Duty
              </span>
            </div>
          </div>

          {/* Today's Scheduled Shifts Quick-Select (if any) */}
          {guardTodayShifts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Scheduled Shifts for Today</span>
                </span>
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                  {guardTodayShifts.length} Assigned
                </span>
              </div>

              <div className="space-y-1.5">
                {guardTodayShifts.map((shift) => (
                  <div 
                    key={shift.id}
                    onClick={() => {
                      setSelectedScheduledShiftId(shift.id);
                      setSelectedSiteName(shift.siteName);
                      setPostRoleInput(shift.postRole);
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      selectedScheduledShiftId === shift.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>{shift.siteName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {shift.startTime} - {shift.endTime} ({shift.hours}h) • {shift.postRole}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clockInGuard(activeGuard.id, shift.siteName, {
                          scheduledShiftId: shift.id,
                          postRole: shift.postRole,
                          gpsVerified: true
                        });
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      Clock In Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clock-In Setup Form */}
          <form 
            onSubmit={handleInitiateClockIn}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <span>Duty Post Clock-In</span>
              </h3>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> GPS & Photo Verification Required
              </span>
            </div>

            {/* Verification Requirement Banner */}
            <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Mandatory Guard On-Site Verification Protocol</span>
                <span className="text-[11px] text-blue-700 dark:text-blue-300">
                  Clock-in requires GPS Geofencing perimeter check, a uniform selfie photo, and gear inventory verification.
                </span>
              </div>
            </div>

            {/* Select Site */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Select Facility / Post Location
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const currentSite = sitesList.find(s => s.name === selectedSiteName);
                      setSiteInfoTargetSite(currentSite);
                      setIsSiteInfoModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <PhoneCall className="w-2.5 h-2.5" />
                    <span>View POCs</span>
                  </button>
                  {(() => {
                    const currentSite = sitesList.find(s => s.name === selectedSiteName);
                    if (currentSite?.requireGeofence ?? true) {
                      return (
                        <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Compass className="w-2.5 h-2.5" /> Geofence {currentSite?.geofenceRadiusMeters || 150}m
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              <select
                id="guard-clockin-site-select"
                value={selectedSiteName}
                onChange={(e) => setSelectedSiteName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <optgroup label="Officer Qualified Sites (OJT Verified)">
                  {activeGuard.ojtSites.map((site) => (
                    <option key={site} value={site}>★ {site}</option>
                  ))}
                </optgroup>
                <optgroup label="Other Client Locations">
                  {sitesList
                    .filter((s) => !activeGuard.ojtSites.includes(s.name))
                    .map((s) => (
                      <option key={s.id} value={s.name}>{s.name} ({s.city || s.zone})</option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Post Role */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Post Assignment Role
              </label>
              <select
                id="guard-clockin-post-role"
                value={postRoleInput}
                onChange={(e) => setPostRoleInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Access Control & Lobby Desk">Access Control & Main Lobby</option>
                <option value="Perimeter Foot Patrol & Lockup">Perimeter Foot Patrol & Lockup</option>
                <option value="Gate 4 Checkpoint & Loading Dock">Gate Checkpoint & Truck Bay Inspection</option>
                <option value="CCTV Security Operations Console">CCTV Operations Console</option>
                <option value="Mobile Security Vehicle Patrol">Mobile Vehicle Security Patrol</option>
                <option value="Event Crowd & Badge Verification">Event Access & Badge Verification</option>
              </select>
            </div>

            {/* Equipment Issued Checklist */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Gear Inspection & Inventory Checklist
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
                {availableGearOptions.map((gear) => {
                  const isChecked = selectedGear.includes(gear);
                  return (
                    <label 
                      key={gear}
                      className={`flex items-center gap-2 p-1.5 rounded-lg text-[11px] cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-blue-100/70 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleGear(gear)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{gear}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Optional Clock-in Notes */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Officer Notes / Shift Observations (Optional)
              </label>
              <input
                id="guard-clockin-notes-input"
                type="text"
                value={clockInNotes}
                onChange={(e) => setClockInNotes(e.target.value)}
                placeholder="e.g. Relieved Officer Jones on time. Radio tested."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Submit Clock In Button */}
            <button
              id="guard-submit-clockin-btn"
              type="submit"
              disabled={isCheckingGps}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white rounded-xl font-extrabold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-emerald-900/30"
            >
              {isCheckingGps ? (
                <>
                  <Compass className="w-4 h-4 animate-spin text-white" />
                  <span>Checking GPS Geofence...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Verify Location & Clock In</span>
                </>
              )}
            </button>
          </form>

          {/* Upcoming Schedule Roster */}
          {guardUpcomingShifts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#1e3a8a] dark:text-blue-400" />
                  <span>Your Upcoming Schedule</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    {guardUpcomingShifts.length} Shifts Booked
                  </span>
                  {onNavigateToCalendar && (
                    <button
                      type="button"
                      onClick={onNavigateToCalendar}
                      className="text-[10px] font-bold text-[#1e3a8a] dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Calendar</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {guardUpcomingShifts.map((shift) => (
                  <div key={shift.id} className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{shift.siteName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {shift.date} • {shift.startTime} - {shift.endTime} ({shift.hours}h)
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono">
                      {shift.postRole.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* START BREAK MODAL */}
      {isBreakModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-4 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Start Break</h3>
              </div>
              <button 
                onClick={() => setIsBreakModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteStartBreak} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Break Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBreakType('meal')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      breakType === 'meal'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🍱 30-min Meal Break
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreakType('rest')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      breakType === 'rest'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ☕ 15-min Rest Break
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Break Location / Note (Optional)
                </label>
                <input
                  type="text"
                  value={breakNote}
                  onChange={(e) => setBreakNote(e.target.value)}
                  placeholder="e.g. Guard break room #2. Relief officer on post."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBreakModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Begin Break
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOCK OUT & HANDOVER MODAL */}
      {isClockOutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-4 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <LogOut className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Shift Clock-Out & Handover</h3>
              </div>
              <button 
                onClick={() => setIsClockOutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteClockOut} className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-mono">
                  <span>Shift Duration:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatElapsedTimer(elapsedSec)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-mono mt-1">
                  <span>Facility:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{activeClockedInShift?.siteName}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Handover Summary to Relief Guard / Ops
                </label>
                <textarea
                  rows={2}
                  value={handoverSummary}
                  onChange={(e) => setHandoverSummary(e.target.value)}
                  placeholder="e.g. Handed keys to Officer Davies. All exterior gates secured. No active incidents."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gearReturnedConfirmed}
                  onChange={(e) => setGearReturnedConfirmed(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold">All issued equipment returned to lockbox / handed over</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClockOutModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Confirm Clock-Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY UNIFORM & GEAR VERIFICATION MODAL */}
      <VerificationCameraModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        onCompleteVerification={handleCompleteVerification}
        guard={activeGuard}
        siteName={selectedSiteName}
        postRole={postRoleInput}
        requiredGear={selectedGear}
        gpsCoordinates={pendingGpsCoords}
        geofenceDistance={pendingGeofenceDistance}
      />

      {/* PHOTO LIGHTBOX PREVIEW MODAL */}
      {previewPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase">{previewPhotoModal.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex flex-col items-center justify-center bg-black/50">
              <img
                src={previewPhotoModal.url}
                alt={previewPhotoModal.title}
                className="max-h-80 w-auto rounded-xl border border-slate-700 object-contain shadow-lg"
              />
              <div className="mt-3 flex items-center justify-between w-full text-[11px] text-slate-400 font-mono">
                <span>Officer: {activeGuard.name} ({activeGuard.badgeNumber})</span>
                <span className="text-emerald-400 font-bold">✓ Verified Compliance</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STANDARD SHIFT REPORTING MODAL (ACTIVITY, MAINTENANCE, INCIDENT) */}
      <StandardReportingModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        guard={activeGuard}
        activeShift={activeClockedInShift}
        siteName={activeClockedInShift?.siteName || selectedSiteName}
        siteAddress={activeClockedInShift?.siteAddress}
        gpsCoordinates={pendingGpsCoords}
        initialReportType={reportModalType}
        initialActivityZone={reportInitialZone}
        intervalSequence={lastActivityReport?.activityDetails?.intervalSequence ? lastActivityReport.activityDetails.intervalSequence + 1 : 1}
        onSubmitReport={(reportData) => {
          submitStandardReport(reportData);
        }}
      />

      {/* GEOFENCE DEPARTURE REASON PROMPT MODAL */}
      {activeClockedInShift && (
        <GuardDeparturePromptModal
          isOpen={isDeparturePromptOpen || activeClockedInShift.offSiteBreachStatus === 'debounce_pending'}
          activeShift={activeClockedInShift}
          site={sitesList.find((s) => s.name === activeClockedInShift.siteName || s.id === activeClockedInShift.siteId)}
          currentDistanceMeters={activeClockedInShift.currentGeofenceDistanceMeters || 180}
          debounceSecondsRemaining={activeClockedInShift.debounceSecondsRemaining ?? 180}
          onSubmitReason={handleSubmitDepartureReason}
          onCheckReturnOnSite={handleVerifyReturnOnSite}
          onDismissAlert={() => setIsDeparturePromptOpen(false)}
        />
      )}

      {/* GUARD PROPERTY DIRECTORY & CONTACTS MODAL */}
      <GuardSiteInfoModal
        isOpen={isSiteInfoModalOpen}
        onClose={() => setIsSiteInfoModalOpen(false)}
        site={siteInfoTargetSite}
      />
    </div>
  );
};
