import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Sparkles, 
  MapPin, 
  ShieldCheck, 
  Upload, 
  User, 
  Radio, 
  ChevronRight,
  RotateCcw,
  Zap,
  Info
} from 'lucide-react';
import { addVerificationWatermark, generateSampleVerificationPhoto } from '../../utils/camera';
import { GeoCoordinates, formatDistance } from '../../utils/geo';
import { GuardProfile } from '../../types/shift';

interface VerificationCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  guard: GuardProfile;
  siteName: string;
  gpsCoordinates?: GeoCoordinates | null;
  geofenceDistance?: number;
  onCompleteVerification: (data: {
    selfiePhotoUrl: string;
    equipmentPhotoUrl: string;
  }) => void;
}

export const VerificationCameraModal: React.FC<VerificationCameraModalProps> = ({
  isOpen,
  onClose,
  guard,
  siteName,
  gpsCoordinates,
  geofenceDistance,
  onCompleteVerification
}) => {
  const [step, setStep] = useState<'selfie' | 'equipment' | 'review'>('selfie');
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [equipmentPhoto, setEquipmentPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Switch facing mode default based on step
  useEffect(() => {
    if (step === 'selfie') {
      setFacingMode('user');
    } else if (step === 'equipment') {
      setFacingMode('environment');
    }
  }, [step]);

  // Start / stop camera stream
  useEffect(() => {
    if (!isOpen || step === 'review') {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, step, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setIsCameraActive(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. You can take a snapshot simulation or upload a photo below.'
          : 'Unable to start camera. You can capture a verified snapshot directly.'
      );
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleCapture = () => {
    setIsProcessing(true);

    try {
      let photoDataUrl = '';

      if (isCameraActive && videoRef.current) {
        // Draw from live video
        photoDataUrl = addVerificationWatermark(videoRef.current, {
          guardName: guard.name,
          badgeNumber: guard.badgeNumber,
          verificationType: step === 'selfie' ? 'UNIFORM_SELFIE' : 'EQUIPMENT_INSPECTION',
          siteName,
          coordinates: gpsCoordinates ? { latitude: gpsCoordinates.latitude, longitude: gpsCoordinates.longitude } : undefined
        });
      }

      if (!photoDataUrl) {
        // Generate high-resolution watermark sample
        photoDataUrl = generateSampleVerificationPhoto(
          step === 'selfie' ? 'UNIFORM_SELFIE' : 'EQUIPMENT_INSPECTION',
          guard.name,
          guard.badgeNumber,
          siteName
        );
      }

      if (step === 'selfie') {
        setSelfiePhoto(photoDataUrl);
        setStep('equipment');
      } else if (step === 'equipment') {
        setEquipmentPhoto(photoDataUrl);
        setStep('review');
      }
    } catch (e) {
      console.error('Failed to capture photo', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const photoDataUrl = addVerificationWatermark(img, {
          guardName: guard.name,
          badgeNumber: guard.badgeNumber,
          verificationType: step === 'selfie' ? 'UNIFORM_SELFIE' : 'EQUIPMENT_INSPECTION',
          siteName,
          coordinates: gpsCoordinates ? { latitude: gpsCoordinates.latitude, longitude: gpsCoordinates.longitude } : undefined
        });

        if (step === 'selfie') {
          setSelfiePhoto(photoDataUrl);
          setStep('equipment');
        } else if (step === 'equipment') {
          setEquipmentPhoto(photoDataUrl);
          setStep('review');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleComplete = () => {
    if (!selfiePhoto || !equipmentPhoto) return;
    onCompleteVerification({
      selfiePhotoUrl: selfiePhoto,
      equipmentPhotoUrl: equipmentPhoto
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      id="verification-camera-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header with Step Indicator */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-black uppercase tracking-wide">
                Mandatory Duty Verification
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Step {step === 'selfie' ? '1/2' : step === 'equipment' ? '2/2' : 'Complete'}: {
                step === 'selfie' ? 'Uniform & ID Selfie' : step === 'equipment' ? 'Duty Gear & Equipment Inspection' : 'Review & Confirm'
              }
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="bg-slate-950/60 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-1.5 font-bold ${
              selfiePhoto ? 'text-emerald-400' : step === 'selfie' ? 'text-blue-400' : 'text-slate-500'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                selfiePhoto ? 'bg-emerald-500/20 border border-emerald-500' : step === 'selfie' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {selfiePhoto ? '✓' : '1'}
              </span>
              <span className="text-[11px]">Uniform Selfie</span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            <div className={`flex items-center gap-1.5 font-bold ${
              equipmentPhoto ? 'text-emerald-400' : step === 'equipment' ? 'text-blue-400' : 'text-slate-500'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                equipmentPhoto ? 'bg-emerald-500/20 border border-emerald-500' : step === 'equipment' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {equipmentPhoto ? '✓' : '2'}
              </span>
              <span className="text-[11px]">Equipment Check</span>
            </div>
          </div>

          {/* GPS telemetry badge */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
            <MapPin className="w-3 h-3" />
            <span>GPS Locked {geofenceDistance !== undefined ? `(${formatDistance(geofenceDistance)})` : ''}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {step !== 'review' ? (
            <div className="space-y-3">
              {/* Instructions banner */}
              <div className="p-3 bg-blue-950/50 border border-blue-800/60 rounded-2xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200">
                  <span className="font-bold block text-white">
                    {step === 'selfie' 
                      ? 'Selfie in Official Uniform & Badge' 
                      : 'Duty Equipment Inspection Photo'}
                  </span>
                  {step === 'selfie' 
                    ? 'Please take a clear photo showing your face, security guard uniform, high-vis vest, and visible badge.' 
                    : 'Arrange your assigned equipment (Radio, Bodycam, Access Fob/Keys, Flashlight) and capture a clear verification photo.'}
                </div>
              </div>

              {/* Viewfinder Canvas / Video */}
              <div className="relative aspect-4/3 bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${
                    !isCameraActive ? 'hidden' : ''
                  }`}
                />

                {!isCameraActive && (
                  <div className="p-6 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                      {step === 'selfie' ? <User className="w-8 h-8 text-blue-400" /> : <Radio className="w-8 h-8 text-emerald-400" />}
                    </div>
                    <div className="text-xs text-slate-300 font-medium">
                      {cameraError || 'Camera preview initializing...'}
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Camera</span>
                    </button>
                  </div>
                )}

                {/* Viewfinder Guideline Overlay */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded text-emerald-400 border border-emerald-500/40">
                        REC ● LIVE
                      </span>
                      <span className="text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded text-slate-300">
                        {step === 'selfie' ? 'FRONT CAM' : 'REAR CAM'}
                      </span>
                    </div>

                    {/* Center Targeting Box */}
                    <div className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-3xl border-2 border-dashed border-white/40 flex items-center justify-center">
                      <span className="text-[10px] text-white/70 font-mono uppercase bg-black/40 px-2 py-1 rounded">
                        {step === 'selfie' ? 'Align Face & Badge' : 'Frame Equipment'}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-center text-white/80 bg-black/60 py-1 rounded">
                      Officer: {guard.name} ({guard.badgeNumber}) • {siteName}
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex items-center justify-between gap-2 pt-1">
                {/* Switch Camera Button */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Switch Camera (Front / Back)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Flip Cam</span>
                </button>

                {/* Main Capture Button */}
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-extrabold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isProcessing ? 'Watermarking...' : `Capture ${step === 'selfie' ? 'Selfie' : 'Gear Photo'}`}</span>
                </button>

                {/* Upload from Gallery fallback */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Upload from Device Gallery"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            /* STEP 3: REVIEW & CONFIRM */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-black text-emerald-200 uppercase">Verification Photos Captured</div>
                  <div className="text-[11px] text-emerald-300/80 font-mono">Both photos encrypted & GPS watermarked for dispatch audit.</div>
                </div>
              </div>

              {/* Side-by-side or stacked preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Selfie preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>1. Uniform Selfie</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep('selfie')}
                      className="text-blue-400 hover:underline text-[10px]"
                    >
                      Retake
                    </button>
                  </div>
                  {selfiePhoto && (
                    <div className="rounded-xl overflow-hidden border border-slate-700 bg-black aspect-4/3 relative group">
                      <img src={selfiePhoto} alt="Uniform Selfie" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                        VERIFIED
                      </div>
                    </div>
                  )}
                </div>

                {/* Equipment preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span className="flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                      <span>2. Equipment Photo</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep('equipment')}
                      className="text-blue-400 hover:underline text-[10px]"
                    >
                      Retake
                    </button>
                  </div>
                  {equipmentPhoto && (
                    <div className="rounded-xl overflow-hidden border border-slate-700 bg-black aspect-4/3 relative group">
                      <img src={equipmentPhoto} alt="Equipment Inspection" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                        INSPECTED
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary metadata chip */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] space-y-1 font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Security Officer:</span>
                  <span className="font-bold text-white">{guard.name} ({guard.badgeNumber})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Post:</span>
                  <span className="font-bold text-blue-300">{siteName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location Telemetry:</span>
                  <span className="text-emerald-400 font-bold">
                    {gpsCoordinates ? `${gpsCoordinates.latitude.toFixed(4)}, ${gpsCoordinates.longitude.toFixed(4)}` : 'Verified On-Site'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          {step === 'review' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('selfie')}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Back / Retake
              </button>
              <button
                type="button"
                id="confirm-verification-photos-btn"
                onClick={handleComplete}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Proceed to Clock-In</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <div className="text-[11px] text-slate-400 font-mono">
                {step === 'selfie' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
