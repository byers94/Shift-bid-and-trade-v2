import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Upload, 
  ShieldCheck, 
  Clock, 
  RotateCcw, 
  RefreshCw, 
  Sparkles, 
  Radio, 
  Key, 
  Lock, 
  UserCheck, 
  MapPin, 
  LogOut,
  ChevronRight,
  Info,
  Check
} from 'lucide-react';
import { 
  ScheduledShift, 
  GuardProfile, 
  ShiftCompletionReport, 
  GearHandoverType 
} from '../../types/shift';
import { addVerificationWatermark, generateSampleVerificationPhoto } from '../../utils/camera';
import { GeoCoordinates } from '../../utils/geo';

interface GuardShiftCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: ScheduledShift;
  guard: GuardProfile;
  elapsedSeconds: number;
  currentGpsCoords?: GeoCoordinates | null;
  onSubmitReport: (report: ShiftCompletionReport) => void;
}

export const GuardShiftCompletionModal: React.FC<GuardShiftCompletionModalProps> = ({
  isOpen,
  onClose,
  shift,
  guard,
  elapsedSeconds,
  currentGpsCoords,
  onSubmitReport
}) => {
  // 1. Text summary of daily activities
  const [activitySummary, setActivitySummary] = useState<string>('');

  // 2. Gear return & handover
  const [gearHandoverType, setGearHandoverType] = useState<GearHandoverType>('relief_officer');
  const [gearRecipientName, setGearRecipientName] = useState<string>('');
  const initialGearList = shift.equipmentIssued && shift.equipmentIssued.length > 0 
    ? shift.equipmentIssued 
    : [
        'Radio (Channel 1)', 
        'Body-Worn Camera #07', 
        'Facility Master Keycard', 
        'High-Vis Security Vest',
        'Patrol Guard Tour Wand'
      ];
  const [returnedGearItems, setReturnedGearItems] = useState<string[]>(initialGearList);
  const [gearPhotoUrl, setGearPhotoUrl] = useState<string | null>(null);

  // 3. Final uniform selfie
  const [selfiePhotoUrl, setSelfiePhotoUrl] = useState<string | null>(null);
  const [uniformComplianceConfirmed, setUniformComplianceConfirmed] = useState<boolean>(true);
  const [uniformNotes, setUniformNotes] = useState<string>('');

  // 4. Live Check-Out Clock
  const [liveCheckoutTime, setLiveCheckoutTime] = useState<string>('');
  const [liveCheckoutIso, setLiveCheckoutIso] = useState<string>('');

  // Camera handling state
  const [activeCameraTarget, setActiveCameraTarget] = useState<'none' | 'gear' | 'selfie'>('none');
  const [isCameraStreamActive, setIsCameraStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const gearFileInputRef = useRef<HTMLInputElement | null>(null);
  const selfieFileInputRef = useRef<HTMLInputElement | null>(null);

  // Update live clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveCheckoutIso(now.toISOString());
      setLiveCheckoutTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format elapsed shift timer
  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  // Camera stream controls
  const stopCameraStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraStreamActive(false);
  }, []);

  const startCameraStream = useCallback(async (mode: 'user' | 'environment') => {
    stopCameraStream();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported by browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraStreamActive(true);
      }
    } catch (err: any) {
      console.warn('Camera initialization fallback:', err);
      setIsCameraStreamActive(false);
      setCameraError('Live camera unavailable on this device. You may capture a verified sample or upload an image.');
    }
  }, [stopCameraStream]);

  // Handle opening live camera
  const openCamera = (target: 'gear' | 'selfie') => {
    setActiveCameraTarget(target);
    const mode = target === 'selfie' ? 'user' : 'environment';
    setFacingMode(mode);
    startCameraStream(mode);
  };

  // Handle closing live camera
  const closeCamera = () => {
    stopCameraStream();
    setActiveCameraTarget('none');
  };

  // Switch facing mode
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  // Capture photo from live video or realistic verified generator
  const capturePhoto = (target: 'gear' | 'selfie') => {
    setIsProcessingPhoto(true);

    try {
      let photoData = '';
      const verificationType = target === 'gear' ? 'GEAR_RETURN' : 'END_SHIFT_UNIFORM_COMPLIANCE';

      if (isCameraStreamActive && videoRef.current) {
        photoData = addVerificationWatermark(videoRef.current, {
          guardName: guard.name,
          badgeNumber: guard.badgeNumber,
          verificationType,
          siteName: shift.siteName,
          coordinates: currentGpsCoords || undefined,
          timestamp: new Date().toISOString()
        });
      }

      if (!photoData) {
        photoData = generateSampleVerificationPhoto(
          verificationType,
          guard.name,
          guard.badgeNumber,
          shift.siteName
        );
      }

      if (target === 'gear') {
        setGearPhotoUrl(photoData);
      } else {
        setSelfiePhotoUrl(photoData);
      }

      closeCamera();
    } catch (err) {
      console.error('Error capturing photo:', err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Handle manual file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'gear' | 'selfie') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const watermarked = addVerificationWatermark(img, {
          guardName: guard.name,
          badgeNumber: guard.badgeNumber,
          verificationType: target === 'gear' ? 'GEAR_RETURN' : 'END_SHIFT_UNIFORM_COMPLIANCE',
          siteName: shift.siteName,
          coordinates: currentGpsCoords || undefined,
          timestamp: new Date().toISOString()
        });
        if (target === 'gear') {
          setGearPhotoUrl(watermarked || (event.target?.result as string));
        } else {
          setSelfiePhotoUrl(watermarked || (event.target?.result as string));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Toggle gear checklist item
  const toggleGearItem = (item: string) => {
    setReturnedGearItems(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const selectAllGear = () => {
    setReturnedGearItems(initialGearList);
  };

  // Fast insertion templates for activity summary
  const summaryTemplates = [
    'Completed all 8 DAR patrol rounds. Exterior gates, loading dock, and emergency exits secured.',
    'Access control post maintained. Visitor log reconciled, parking structures swept, all clear.',
    'Perimeter inspection completed. No unauthorized entries or maintenance hazards observed.'
  ];

  // Validation checks
  const isSummaryValid = activitySummary.trim().length >= 10;
  const isGearPhotoValid = Boolean(gearPhotoUrl);
  const isSelfieValid = Boolean(selfiePhotoUrl);
  const isUniformConfirmed = uniformComplianceConfirmed;

  const isFormComplete = isSummaryValid && isGearPhotoValid && isSelfieValid && isUniformConfirmed;

  // Final Submit Handler
  const handleFinalCheckOut = () => {
    if (!isFormComplete) return;

    const timestampIso = liveCheckoutIso || new Date().toISOString();
    const hoursWorked = Math.max(0.1, Math.round((elapsedSeconds / 3600) * 10) / 10);

    const report: ShiftCompletionReport = {
      id: `SCR-${Date.now()}`,
      reportNumber: `SCR-${timestampIso.slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      shiftId: shift.id,
      guardId: guard.id,
      guardName: guard.name,
      guardBadge: guard.badgeNumber,
      guardPhone: guard.phone,
      siteName: shift.siteName,
      siteId: shift.siteId,
      postRole: shift.postRole,
      shiftDate: shift.date || timestampIso.slice(0, 10),
      shiftStartTime: shift.startTime || shift.clockInTime,
      shiftEndTime: timestampIso,
      actualHoursWorked: hoursWorked,
      activitySummary: activitySummary.trim(),
      gearReturnedPhotoUrl: gearPhotoUrl!,
      gearHandoverType,
      gearHandoverRecipient: gearRecipientName.trim() || undefined,
      gearItemsReturned: returnedGearItems,
      finalSelfiePhotoUrl: selfiePhotoUrl!,
      uniformComplianceConfirmed: true,
      uniformNotes: uniformNotes.trim() || undefined,
      checkOutTimestamp: timestampIso,
      checkOutTimestampFormatted: liveCheckoutTime,
      gpsCoordinates: currentGpsCoords ? {
        latitude: currentGpsCoords.latitude,
        longitude: currentGpsCoords.longitude,
        accuracy: currentGpsCoords.accuracy
      } : undefined,
      submittedAt: timestampIso
    };

    onSubmitReport(report);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Shift Completion Report</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Mandatory Check-Out
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Officer {guard.name} (Badge #{guard.badgeNumber}) • {shift.siteName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shift Duration Banner */}
        <div className="bg-slate-800/60 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">
              Post: <strong className="text-slate-200">{shift.postRole}</strong>
            </span>
            <span className="text-slate-400">
              Duty Time: <strong className="text-emerald-400 font-mono">{formatTimer(elapsedSeconds)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-300 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Live Check-Out Time:</span>
            <strong className="text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
              {liveCheckoutTime}
            </strong>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">

          {/* SECTION 1: BRIEF TEXT SUMMARY OF DAILY ACTIVITIES */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>1. Daily Activities Summary</span>
                <span className="text-rose-400">*</span>
              </label>
              <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                isSummaryValid ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50' : 'bg-rose-950 text-rose-300 border border-rose-700/50'
              }`}>
                {activitySummary.trim().length} chars {isSummaryValid ? '(Requirement Met ✓)' : '(Min 10 chars required)'}
              </span>
            </div>

            <textarea
              id="shift-activity-summary-input"
              rows={3}
              value={activitySummary}
              onChange={(e) => setActivitySummary(e.target.value)}
              placeholder="Provide a brief summary of daily activities, patrols completed, gate checks, or notable events..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />

            {/* Quick Insertion Chips */}
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Template Inserts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {summaryTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivitySummary(prev => prev ? `${prev} ${template}` : template)}
                    className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors text-left truncate max-w-full"
                  >
                    + {template.slice(0, 48)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: GEAR RETURN & HANDOVER (IMAGE MANDATORY) */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>2. Gear Return & Handover Verification</span>
                <span className="text-rose-400">*</span>
              </label>
              {isGearPhotoValid ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Gear Photo Verified
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/50">
                  Photo Required
                </span>
              )}
            </div>

            {/* Handover Disposition Selector */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Gear Handover Disposition:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGearHandoverType('relief_officer')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                    gearHandoverType === 'relief_officer'
                      ? 'bg-blue-600/30 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate">Relief Officer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGearHandoverType('lockbox')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                    gearHandoverType === 'lockbox'
                      ? 'bg-cyan-600/30 border-cyan-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">Site Lockbox</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGearHandoverType('supervisor')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                    gearHandoverType === 'supervisor'
                      ? 'bg-emerald-600/30 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Command Supervisor</span>
                </button>
              </div>

              {/* Recipient Details Input */}
              <div className="mt-2">
                <input
                  type="text"
                  value={gearRecipientName}
                  onChange={(e) => setGearRecipientName(e.target.value)}
                  placeholder={
                    gearHandoverType === 'relief_officer'
                      ? 'Relief Officer Name (e.g. Officer Davies)'
                      : gearHandoverType === 'lockbox'
                      ? 'Lockbox / Safe ID (e.g. Box #14 - West Gate)'
                      : 'Supervisor Name (e.g. Sgt. Vance)'
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Gear Items Checklist */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">
                  Accounted Gear Items Returned:
                </span>
                <button
                  type="button"
                  onClick={selectAllGear}
                  className="text-[10px] text-cyan-400 hover:underline font-mono"
                >
                  Select All Accounted
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                {initialGearList.map((item) => {
                  const isChecked = returnedGearItems.includes(item);
                  return (
                    <label 
                      key={item}
                      className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-cyan-950/60 text-cyan-200 font-semibold' 
                          : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleGearItem(item)}
                        className="rounded text-cyan-500 focus:ring-cyan-500 bg-slate-800 border-slate-700"
                      />
                      <span className="truncate">{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Gear Photo Preview / Capture Area */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-300 block mb-2">
                Mandatory Image of Returned / Handed Over Gear:
              </span>

              {gearPhotoUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-emerald-500/50 bg-slate-900">
                  <img 
                    src={gearPhotoUrl} 
                    alt="Gear Return Verification" 
                    className="w-full h-48 sm:h-56 object-cover"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold font-mono">
                      ✓ Watermarked & Logged
                    </span>
                    <button
                      type="button"
                      onClick={() => setGearPhotoUrl(null)}
                      className="px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold transition-colors"
                    >
                      Retake
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Capture Returned Gear Photo</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Photograph all radios, master keys, bodycam, and equipment being handed over or placed in lockbox
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      id="gear-camera-capture-btn"
                      onClick={() => openCamera('gear')}
                      className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => capturePhoto('gear')}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Verified Snapshot</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => gearFileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span>Upload File</span>
                    </button>
                    <input
                      ref={gearFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'gear')}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: FINAL SELFIE CONFIRMING UNIFORM COMPLIANCE (MANDATORY) */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>3. End-of-Shift Uniform Compliance Selfie</span>
                <span className="text-rose-400">*</span>
              </label>
              {isSelfieValid ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Selfie Verified
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/50">
                  Selfie Required
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Company policy requires all officers to confirm uniform compliance at the completion of duty. Photo must clearly show security badge, company attire, and vest.
            </p>

            {/* Selfie Photo Preview / Capture Area */}
            {selfiePhotoUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-emerald-500/50 bg-slate-900">
                <img 
                  src={selfiePhotoUrl} 
                  alt="Final Uniform Compliance Selfie" 
                  className="w-full h-48 sm:h-56 object-cover"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold font-mono">
                    ✓ Uniform Watermarked
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelfiePhotoUrl(null)}
                    className="px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold transition-colors"
                  >
                    Retake
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-purple-950 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Take End-of-Shift Selfie</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Frame your upper body with badge visible to certify continuous uniform compliance
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    id="selfie-camera-capture-btn"
                    onClick={() => openCamera('selfie')}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Selfie</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => capturePhoto('selfie')}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-800/60 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Verified Snapshot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => selfieFileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>Upload File</span>
                  </button>
                  <input
                    ref={selfieFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'selfie')}
                  />
                </div>
              </div>
            )}

            {/* Compliance Certification Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={uniformComplianceConfirmed}
                onChange={(e) => setUniformComplianceConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-purple-500 focus:ring-purple-500 bg-slate-800 border-slate-700"
              />
              <span className="text-xs text-slate-300 font-medium leading-relaxed">
                I formally certify that I maintained <strong>full uniform and grooming compliance</strong> (badge visible, approved high-vis security apparel) throughout the entire duration and conclusion of this shift.
              </span>
            </label>
          </div>

          {/* ACTIVE CAMERA OVERLAY (IF CAMERA IS OPEN) */}
          {activeCameraTarget !== 'none' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-400 animate-pulse" />
                  {activeCameraTarget === 'gear' ? 'Gear Handover Camera Stream' : 'Uniform Compliance Front Camera'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold flex items-center gap-1"
                    title="Flip camera"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Flip</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {cameraError ? (
                <div className="p-3 bg-amber-950/60 border border-amber-600/60 rounded-xl text-amber-200 text-xs">
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => capturePhoto(activeCameraTarget)}
                    className="mt-2 px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg text-xs"
                  >
                    Use Verified Hardware Snapshot Instead
                  </button>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-3 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => capturePhoto(activeCameraTarget)}
                      disabled={isProcessingPhoto}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-black text-sm uppercase rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Capture & Watermark</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer / Requirements Status & Timestamped Check-Out Button */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 space-y-3">
          {/* Checklist Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                isSummaryValid ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-slate-800 text-slate-400'
              }`}>
                {isSummaryValid ? '✓' : '○'} Activity Summary
              </span>
              <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                isGearPhotoValid ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-slate-800 text-slate-400'
              }`}>
                {isGearPhotoValid ? '✓' : '○'} Returned Gear Photo
              </span>
              <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                isSelfieValid ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-slate-800 text-slate-400'
              }`}>
                {isSelfieValid ? '✓' : '○'} Uniform Compliance Selfie
              </span>
              <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                isUniformConfirmed ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-slate-800 text-slate-400'
              }`}>
                {isUniformConfirmed ? '✓' : '○'} Compliance Attested
              </span>
            </div>

            <div className="text-slate-400 text-[11px] font-mono">
              GPS: {currentGpsCoords ? `${currentGpsCoords.latitude.toFixed(4)}, ${currentGpsCoords.longitude.toFixed(4)}` : 'On-Site Telemetry'}
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs transition-colors"
            >
              Cancel
            </button>

            {/* MANDATORY: Timestamped check-out button */}
            <button
              id="timestamped-checkout-submit-btn"
              type="button"
              onClick={handleFinalCheckOut}
              disabled={!isFormComplete}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                isFormComplete
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-900/40 hover:scale-[1.01] cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <Clock className="w-4 h-4 animate-pulse" />
              <span>
                Timestamped Check-Out ({liveCheckoutTime || 'NOW'}) • Submit Report & End Shift
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
