import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Camera, 
  Video, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Wrench, 
  FileText, 
  MapPin, 
  Clock, 
  User, 
  Plus, 
  Trash2, 
  Eye, 
  Siren, 
  PhoneCall, 
  Sparkles,
  Info,
  Check,
  Building,
  RefreshCw,
  Play,
  CreditCard,
  Car,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Edit2,
  UserCheck,
  UserX,
  Sliders,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
  UploadCloud,
  Database
} from 'lucide-react';
import { 
  StandardReportType, 
  StandardShiftReport, 
  ReportMediaAttachment,
  ActivityPatrolType,
  ActivityStatusType,
  ActivityReportDetails,
  MaintenanceIssueCategory,
  MaintenanceSeverity,
  MaintenanceReportDetails,
  IncidentCategory,
  IncidentSeverity,
  IncidentReportDetails,
  IncidentPartyInvolved,
  PartyInvolvedRole,
  PartyIdType,
  EmergencyServiceAgency,
  GuardProfile,
  ScheduledShift
} from '../../types/shift';
import { addReportPhotoWatermark, generateSampleReportMedia } from '../../utils/camera';
import { GeoCoordinates } from '../../utils/geo';

interface StandardReportingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (reportData: Omit<StandardShiftReport, 'id' | 'reportNumber' | 'createdAt'>) => void;
  guard: GuardProfile;
  activeShift?: ScheduledShift;
  siteName?: string;
  siteAddress?: string;
  gpsCoordinates?: GeoCoordinates | null;
  initialReportType?: StandardReportType;
  initialActivityZone?: string;
  intervalSequence?: number;
}

export const StandardReportingModal: React.FC<StandardReportingModalProps> = ({
  isOpen,
  onClose,
  onSubmitReport,
  guard,
  activeShift,
  siteName = 'Port Authority - Pier 7',
  siteAddress = '2200 Alaskan Way, Seattle, WA',
  gpsCoordinates,
  initialReportType = 'activity',
  initialActivityZone = 'North Perimeter & Facility Access Gates',
  intervalSequence = 1
}) => {
  // Active Report Category
  const [reportType, setReportType] = useState<StandardReportType>(initialReportType);

  // Common metadata
  const [locationName, setLocationName] = useState<string>(siteName);
  const [reportTime, setReportTime] = useState<string>(new Date().toTimeString().slice(0, 5));
  
  // Mandatory Media State
  const [mediaList, setMediaList] = useState<ReportMediaAttachment[]>([]);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [activeMediaPreview, setActiveMediaPreview] = useState<ReportMediaAttachment | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [videoTimerSeconds, setVideoTimerSeconds] = useState<number>(0);
  const [mediaCaptionInput, setMediaCaptionInput] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Activity Report State
  const [patrolType, setPatrolType] = useState<ActivityPatrolType>('foot_patrol');
  const [zoneChecked, setZoneChecked] = useState<string>(initialActivityZone);
  const [activityStatus, setActivityStatus] = useState<ActivityStatusType>('all_clear');
  const [doorsChecked, setDoorsChecked] = useState<number>(4);
  const [lightsChecked, setLightsChecked] = useState<number>(8);
  const [activityNotes, setActivityNotes] = useState<string>(
    'Routine 30-minute interval patrol completed. All access doors locked and secured. Perimeter fence intact. No unauthorized activity detected.'
  );
  const [isThirtyMinCheckin, setIsThirtyMinCheckin] = useState<boolean>(true);

  // 2. Maintenance Report State
  const [maintCategory, setMaintCategory] = useState<MaintenanceIssueCategory>('lighting_electrical');
  const [maintSeverity, setMaintSeverity] = useState<MaintenanceSeverity>('urgent');
  const [maintLocation, setMaintLocation] = useState<string>('Building B, North Gate Entrance');
  const [maintTitle, setMaintTitle] = useState<string>('Broken Exterior Security Floodlight');
  const [maintDescription, setMaintDescription] = useState<string>(
    'High-mast floodlight fixture is out, leaving perimeter approach in darkness. Ballast buzzing loudly.'
  );
  const [maintSafetyHazard, setMaintSafetyHazard] = useState<boolean>(true);
  const [maintStaffNotified, setMaintStaffNotified] = useState<boolean>(true);
  const [maintStaffName, setMaintStaffName] = useState<string>('Night Facilities Lead');
  const [maintSuggestedAction, setMaintSuggestedAction] = useState<string>(
    'Requires electrician / ballast replacement to restore security lighting along dock apron.'
  );

  // 3. Incident Report State
  const [incCategory, setIncCategory] = useState<IncidentCategory>('trespassing');
  const [incSeverity, setIncSeverity] = useState<IncidentSeverity>('medium');
  const [incTitle, setIncTitle] = useState<string>('Unauthorized Subject Directed Off Premises');
  const [incSummary, setIncSummary] = useState<string>(
    'Non-authorized individual found loitering near restricted equipment staging bay.'
  );
  const [incTimeline, setIncTimeline] = useState<string>(
    `${new Date().toTimeString().slice(0, 5)} - Guard observed subject past warning signs.\n${new Date().toTimeString().slice(0, 5)} - Approached and requested identification.\n${new Date().toTimeString().slice(0, 5)} - Subject complied with trespass direction and exited premises.`
  );
  const [incActionTaken, setIncActionTaken] = useState<string>(
    'Officer contacted individual, advised property was closed to public, issued formal verbal warning against criminal trespass, and monitored departure.'
  );
  const [incTrespassIssued, setIncTrespassIssued] = useState<boolean>(true);
  const [incPoliceReportNum, setIncPoliceReportNum] = useState<string>('');
  
  // Parties Involved State
  const [partiesList, setPartiesList] = useState<IncidentPartyInvolved[]>([
    {
      id: 'pty-1',
      name: 'Unidentified Male',
      role: 'suspect',
      idType: 'none',
      refusedIdentification: true,
      ageApprox: '35-40',
      gender: 'male',
      height: '5\'10"',
      weightBuild: '180 lbs, Medium build',
      hairEyes: 'Short dark hair, brown eyes',
      clothingDescription: 'Dark Carhartt hooded jacket, blue jeans, black work boots, gray backpack',
      distinguishingFeatures: 'Tattoo on right forearm, small scar over left eyebrow',
      vehicleInfo: 'Silver 2014 Subaru Outback (Partial WA plate: 8XYZ...)',
      statementOrNotes: 'Claimed he was looking for lost keys. Refused to provide identification and exited towards North gate upon notice of SPD dispatch.',
      description: 'Approx 35-40 yrs, dark hooded jacket, jeans, carrying backpack (Refused ID)'
    }
  ]);

  // Active party form fields
  const [newPartyName, setNewPartyName] = useState<string>('');
  const [newPartyRole, setNewPartyRole] = useState<PartyInvolvedRole>('suspect');
  const [newPartyRefusedId, setNewPartyRefusedId] = useState<boolean>(false);
  const [newPartyIdType, setNewPartyIdType] = useState<PartyIdType>('drivers_license');
  const [newPartyIdNumber, setNewPartyIdNumber] = useState<string>('');
  const [newPartyIdState, setNewPartyIdState] = useState<string>('WA');
  const [newPartyAge, setNewPartyAge] = useState<string>('');
  const [newPartyGender, setNewPartyGender] = useState<string>('unknown');
  const [newPartyHeight, setNewPartyHeight] = useState<string>('');
  const [newPartyWeight, setNewPartyWeight] = useState<string>('');
  const [newPartyHairEyes, setNewPartyHairEyes] = useState<string>('');
  const [newPartyClothing, setNewPartyClothing] = useState<string>('');
  const [newPartyDistinguishing, setNewPartyDistinguishing] = useState<string>('');
  const [newPartyPhone, setNewPartyPhone] = useState<string>('');
  const [newPartyEmail, setNewPartyEmail] = useState<string>('');
  const [newPartyAddress, setNewPartyAddress] = useState<string>('');
  const [newPartyVehicle, setNewPartyVehicle] = useState<string>('');
  const [newPartyStatement, setNewPartyStatement] = useState<string>('');
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [isPartyDetailsExpanded, setIsPartyDetailsExpanded] = useState<boolean>(true);

  // Critical Escalation State
  const [escalatedToEmergency, setEscalatedToEmergency] = useState<boolean>(false);
  const [selectedAgencies, setSelectedAgencies] = useState<EmergencyServiceAgency[]>(['police_911']);
  const [cadIncidentNum, setCadIncidentNum] = useState<string>('CAD-911-' + Math.floor(100000 + Math.random() * 900000));
  const [emergencyContactTime, setEmergencyContactTime] = useState<string>(new Date().toTimeString().slice(0, 5));
  const [respondingUnits, setRespondingUnits] = useState<string>('Seattle Police Dept Unit 214 / Officer Henderson');
  const [emergencyOutcome, setEmergencyOutcome] = useState<string>(
    'Emergency services arrived on scene. Paramedics rendered aid and Law Enforcement documented the occurrence.'
  );
  const [supervisorNotified, setSupervisorNotified] = useState<boolean>(true);
  const [supervisorName, setSupervisorName] = useState<string>('Supervisor Marcus Vance');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitProgress, setSubmitProgress] = useState<string>('');
  
  // Real-time network status tracking
  const [networkOnline, setNetworkOnline] = useState<boolean>(() => 
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const captureSamplePhoto = useCallback(() => {
    const title = reportType === 'activity' ? zoneChecked : reportType === 'maintenance' ? maintTitle : incTitle;
    const sampleUrl = generateSampleReportMedia(
      reportType,
      title,
      locationName,
      guard.name,
      guard.badgeNumber,
      reportType === 'incident' && escalatedToEmergency
    );

    const newAttachment: ReportMediaAttachment = {
      id: `med-${Date.now()}`,
      type: 'photo',
      url: sampleUrl,
      caption: mediaCaptionInput || `${reportType.toUpperCase()} Verification Photo - ${title || locationName}`,
      capturedAt: new Date().toISOString(),
      fileName: `${reportType}_proof_${Date.now()}.jpg`,
      fileSizeMb: 1.4,
      gpsCoordinates: gpsCoordinates ? { latitude: gpsCoordinates.latitude, longitude: gpsCoordinates.longitude } : undefined
    };

    setMediaList((prev) => [newAttachment, ...prev]);
    setMediaCaptionInput('');
  }, [reportType, zoneChecked, maintTitle, incTitle, locationName, guard.name, guard.badgeNumber, escalatedToEmergency, mediaCaptionInput, gpsCoordinates]);

  // Camera handling
  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraFacing,
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
      } else {
        throw new Error('Camera not supported');
      }
    } catch {
      setIsCameraActive(false);
      // Generate sample media fallback directly if hardware unavailable
      captureSamplePhoto();
    }
  }, [cameraFacing, stopCamera, captureSamplePhoto]);

  // Sync initial report type
  useEffect(() => {
    if (isOpen) {
      setReportType(initialReportType);
      setLocationName(siteName);
      setZoneChecked(initialActivityZone);
      setFormError(null);
    }
  }, [isOpen, initialReportType, siteName, initialActivityZone]);

  // Clean up video recorder
  useEffect(() => {
    return () => {
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
      }
      stopCamera();
    };
  }, [stopCamera]);

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    try {
      const watermarked = addReportPhotoWatermark(videoRef.current, {
        reportType,
        guardName: guard.name,
        badgeNumber: guard.badgeNumber,
        siteName: locationName,
        zoneOrTitle: reportType === 'activity' ? zoneChecked : reportType === 'maintenance' ? maintTitle : incTitle,
        coordinates: gpsCoordinates ? { latitude: gpsCoordinates.latitude, longitude: gpsCoordinates.longitude } : undefined,
        isEscalatedEmergency: reportType === 'incident' && escalatedToEmergency
      });

      const newAttachment: ReportMediaAttachment = {
        id: `med-${Date.now()}`,
        type: 'photo',
        url: watermarked,
        caption: mediaCaptionInput || `${reportType.toUpperCase()} - Live Evidence Photo (${locationName})`,
        capturedAt: new Date().toISOString(),
        fileName: `${reportType}_photo_${Date.now()}.jpg`,
        fileSizeMb: 1.6,
        gpsCoordinates: gpsCoordinates ? { latitude: gpsCoordinates.latitude, longitude: gpsCoordinates.longitude } : undefined
      };

      setMediaList((prev) => [newAttachment, ...prev]);
      setMediaCaptionInput('');
      stopCamera();
    } catch {
      captureSamplePhoto();
    }
  };

  const handleSimulateVideoRecord = () => {
    setIsRecordingVideo(true);
    setVideoTimerSeconds(0);
    videoIntervalRef.current = setInterval(() => {
      setVideoTimerSeconds((prev) => {
        if (prev >= 6) {
          // Auto complete video record at 6s
          finishVideoRecording();
          return 6;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const finishVideoRecording = () => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    setIsRecordingVideo(false);

    const title = reportType === 'activity' ? zoneChecked : reportType === 'maintenance' ? maintTitle : incTitle;
    const sampleUrl = generateSampleReportMedia(
      reportType,
      `[VIDEO RECORDING: 00:06 SEC] ${title}`,
      locationName,
      guard.name,
      guard.badgeNumber,
      reportType === 'incident' && escalatedToEmergency
    );

    const newAttachment: ReportMediaAttachment = {
      id: `med-vid-${Date.now()}`,
      type: 'video',
      url: sampleUrl,
      durationSeconds: 6,
      caption: mediaCaptionInput || `Duty Bodycam / Mobile Video Evidence (00:06) - ${title}`,
      capturedAt: new Date().toISOString(),
      fileName: `${reportType}_clip_${Date.now()}.mp4`,
      fileSizeMb: 4.2,
      gpsCoordinates: gpsCoordinates ? { latitude: gpsCoordinates.latitude, longitude: gpsCoordinates.longitude } : undefined
    };

    setMediaList((prev) => [newAttachment, ...prev]);
    setMediaCaptionInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const isVideo = file.type.startsWith('video');
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        const newAttachment: ReportMediaAttachment = {
          id: `med-upload-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: isVideo ? 'video' : 'photo',
          url: resultUrl,
          caption: file.name,
          fileName: file.name,
          fileSizeMb: Number((file.size / (1024 * 1024)).toFixed(2)),
          capturedAt: new Date().toISOString(),
          gpsCoordinates: gpsCoordinates ? { latitude: gpsCoordinates.latitude, longitude: gpsCoordinates.longitude } : undefined
        };
        setMediaList((prev) => [newAttachment, ...prev]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMediaItem = (id: string) => {
    setMediaList((prev) => prev.filter((m) => m.id !== id));
  };

  const resetPartyForm = () => {
    setNewPartyName('');
    setNewPartyRole('suspect');
    setNewPartyRefusedId(false);
    setNewPartyIdType('drivers_license');
    setNewPartyIdNumber('');
    setNewPartyIdState('WA');
    setNewPartyAge('');
    setNewPartyGender('unknown');
    setNewPartyHeight('');
    setNewPartyWeight('');
    setNewPartyHairEyes('');
    setNewPartyClothing('');
    setNewPartyDistinguishing('');
    setNewPartyPhone('');
    setNewPartyEmail('');
    setNewPartyAddress('');
    setNewPartyVehicle('');
    setNewPartyStatement('');
    setEditingPartyId(null);
  };

  const startEditParty = (party: IncidentPartyInvolved) => {
    setEditingPartyId(party.id);
    setNewPartyName(party.name || '');
    setNewPartyRole(party.role);
    setNewPartyRefusedId(!!party.refusedIdentification);
    setNewPartyIdType(party.idType || (party.refusedIdentification ? 'none' : 'drivers_license'));
    setNewPartyIdNumber(party.idNumber || '');
    setNewPartyIdState(party.idStateOrIssuer || 'WA');
    setNewPartyAge(party.ageApprox || '');
    setNewPartyGender(party.gender || 'unknown');
    setNewPartyHeight(party.height || '');
    setNewPartyWeight(party.weightBuild || '');
    setNewPartyHairEyes(party.hairEyes || '');
    setNewPartyClothing(party.clothingDescription || '');
    setNewPartyDistinguishing(party.distinguishingFeatures || '');
    setNewPartyPhone(party.phoneOrContact || '');
    setNewPartyEmail(party.email || '');
    setNewPartyAddress(party.address || '');
    setNewPartyVehicle(party.vehicleInfo || '');
    setNewPartyStatement(party.statementOrNotes || '');
    setIsPartyDetailsExpanded(true);
  };

  const applyPartyPreset = (presetType: 'trespasser' | 'tenant' | 'witness' | 'vehicle_intruder') => {
    if (presetType === 'trespasser') {
      setNewPartyName('Unidentified Trespasser');
      setNewPartyRole('suspect');
      setNewPartyRefusedId(true);
      setNewPartyIdType('none');
      setNewPartyAge('30-40');
      setNewPartyGender('male');
      setNewPartyClothing('Dark hooded sweatshirt, baggy jeans, athletic sneakers');
      setNewPartyStatement('Refused to identify or provide justification for presence. Escorted off property.');
    } else if (presetType === 'tenant') {
      setNewPartyName('Resident / Tenant');
      setNewPartyRole('tenant');
      setNewPartyRefusedId(false);
      setNewPartyIdType('drivers_license');
      setNewPartyStatement('Resident reported security disturbance or unauthorized individuals.');
    } else if (presetType === 'witness') {
      setNewPartyName('Eyewitness');
      setNewPartyRole('witness');
      setNewPartyRefusedId(false);
      setNewPartyIdType('state_id');
      setNewPartyStatement('Observed incident unfold and provided verbal statement to officer.');
    } else if (presetType === 'vehicle_intruder') {
      setNewPartyName('Vehicle Operator');
      setNewPartyRole('suspect');
      setNewPartyRefusedId(false);
      setNewPartyVehicle('Dark Sedan (WA Plate #)');
      setNewPartyStatement('Vehicle entered gate without authorization badge.');
    }
    setIsPartyDetailsExpanded(true);
  };

  const saveParty = () => {
    const finalName = newPartyName.trim() || (newPartyRefusedId ? 'Unidentified Individual' : 'Party Involved');
    
    // Construct readable description summary for fallback
    const summaryParts: string[] = [];
    if (newPartyRefusedId) summaryParts.push('Refused ID');
    else if (newPartyIdNumber) summaryParts.push(`ID: ${newPartyIdType} (${newPartyIdState} #${newPartyIdNumber})`);
    
    if (newPartyAge) summaryParts.push(`Age ~${newPartyAge}`);
    if (newPartyGender && newPartyGender !== 'unknown') summaryParts.push(newPartyGender);
    if (newPartyHeight) summaryParts.push(newPartyHeight);
    if (newPartyWeight) summaryParts.push(newPartyWeight);
    if (newPartyClothing) summaryParts.push(`Wearing: ${newPartyClothing}`);
    if (newPartyDistinguishing) summaryParts.push(`Marks: ${newPartyDistinguishing}`);
    if (newPartyVehicle) summaryParts.push(`Vehicle: ${newPartyVehicle}`);

    const partyRecord: IncidentPartyInvolved = {
      id: editingPartyId || `pty-${Date.now()}`,
      name: finalName,
      role: newPartyRole,
      refusedIdentification: newPartyRefusedId,
      idType: newPartyRefusedId ? 'none' : newPartyIdType,
      idNumber: newPartyIdNumber.trim() || undefined,
      idStateOrIssuer: newPartyIdState.trim() || undefined,
      ageApprox: newPartyAge.trim() || undefined,
      gender: newPartyGender || undefined,
      height: newPartyHeight.trim() || undefined,
      weightBuild: newPartyWeight.trim() || undefined,
      hairEyes: newPartyHairEyes.trim() || undefined,
      clothingDescription: newPartyClothing.trim() || undefined,
      distinguishingFeatures: newPartyDistinguishing.trim() || undefined,
      phoneOrContact: newPartyPhone.trim() || undefined,
      email: newPartyEmail.trim() || undefined,
      address: newPartyAddress.trim() || undefined,
      vehicleInfo: newPartyVehicle.trim() || undefined,
      statementOrNotes: newPartyStatement.trim() || undefined,
      description: summaryParts.join(' • ') || undefined
    };

    if (editingPartyId) {
      setPartiesList((prev) => prev.map((p) => (p.id === editingPartyId ? partyRecord : p)));
    } else {
      setPartiesList((prev) => [...prev, partyRecord]);
    }

    resetPartyForm();
  };

  const removeParty = (id: string) => {
    setPartiesList((prev) => prev.filter((p) => p.id !== id));
    if (editingPartyId === id) {
      resetPartyForm();
    }
  };

  const toggleEmergencyAgency = (agency: EmergencyServiceAgency) => {
    setSelectedAgencies((prev) =>
      prev.includes(agency) ? prev.filter((a) => a !== agency) : [...prev, agency]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // STRICT MANDATORY VALIDATION: All reports must require at least one photo and/or video
    if (mediaList.length === 0) {
      setFormError('Mandatory Requirement: You must attach at least one photo or video before submitting any report.');
      return;
    }

    setFormError(null);

    let activityDetails: ActivityReportDetails | undefined;
    let maintenanceDetails: MaintenanceReportDetails | undefined;
    let incidentDetails: IncidentReportDetails | undefined;

    if (reportType === 'activity') {
      activityDetails = {
        patrolType,
        zoneChecked: zoneChecked.trim() || 'Assigned Site Zone',
        status: activityStatus,
        observationNotes: activityNotes.trim() || 'Patrol completed with no anomalies.',
        isThirtyMinCheckin,
        intervalSequence,
        doorsCheckedCount: doorsChecked,
        lightsCheckedCount: lightsChecked
      };
    } else if (reportType === 'maintenance') {
      maintenanceDetails = {
        issueCategory: maintCategory,
        severity: maintSeverity,
        specificLocation: maintLocation.trim() || locationName,
        issueTitle: maintTitle.trim() || 'Property Maintenance Issue',
        detailedDescription: maintDescription.trim(),
        safetyHazard: maintSafetyHazard,
        propertyStaffNotified: maintStaffNotified,
        notifiedPersonName: maintStaffNotified ? maintStaffName : undefined,
        suggestedAction: maintSuggestedAction.trim() || undefined,
        workOrderStatus: 'reported'
      };
    } else if (reportType === 'incident') {
      incidentDetails = {
        incidentCategory: incCategory,
        severity: incSeverity,
        incidentTitle: incTitle.trim() || 'Security Guard Action Log',
        summary: incSummary.trim(),
        detailedTimeline: incTimeline.trim(),
        actionTakenByGuard: incActionTaken.trim(),
        partiesInvolved: partiesList.length > 0 ? partiesList : undefined,
        trespassNoticeIssued: incTrespassIssued,
        policeReportNumber: incPoliceReportNum.trim() || undefined,
        escalatedToEmergencyServices: escalatedToEmergency,
        emergencyServicesContacted: escalatedToEmergency ? selectedAgencies : undefined,
        emergencyContactTime: escalatedToEmergency ? emergencyContactTime : undefined,
        cadIncidentNumber: escalatedToEmergency ? cadIncidentNum : undefined,
        respondingUnits: escalatedToEmergency ? respondingUnits : undefined,
        emergencyOutcome: escalatedToEmergency ? emergencyOutcome : undefined,
        supervisorNotified,
        supervisorName: supervisorNotified ? supervisorName : undefined
      };
    }

    setIsSubmitting(true);
    setSubmitProgress(networkOnline ? 'Uploading media to Cloud Storage & creating report...' : 'Buffering to offline queue...');

    const payload: Omit<StandardShiftReport, 'id' | 'reportNumber' | 'createdAt'> = {
      reportType,
      shiftId: activeShift?.id,
      siteId: activeShift?.siteId,
      siteName: locationName,
      siteAddress,
      guardId: guard.id,
      guardName: guard.name,
      guardBadge: guard.badgeNumber,
      guardPhone: guard.phone,
      timestamp: new Date().toISOString(),
      gpsCoordinates: gpsCoordinates
        ? {
            latitude: gpsCoordinates.latitude,
            longitude: gpsCoordinates.longitude,
            accuracy: gpsCoordinates.accuracy
          }
        : undefined,
      media: mediaList,
      activityDetails,
      maintenanceDetails,
      incidentDetails,
      status: 'submitted'
    };

    try {
      onSubmitReport(payload);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 400);
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err?.message || 'Failed to submit report. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div id="standard-reporting-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div 
        id="standard-reporting-modal-container" 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              reportType === 'activity' 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : reportType === 'maintenance' 
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' 
                  : escalatedToEmergency
                    ? 'bg-red-600/30 text-red-400 border border-red-500/50 animate-pulse'
                    : 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
            }`}>
              {reportType === 'activity' && <FileText className="w-5 h-5" />}
              {reportType === 'maintenance' && <Wrench className="w-5 h-5" />}
              {reportType === 'incident' && (escalatedToEmergency ? <Siren className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Officer Duty Report
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {guard.name} ({guard.badgeNumber})
                </span>
                {escalatedToEmergency && reportType === 'incident' && (
                  <span className="px-2 py-0.5 text-xs font-black rounded-md bg-red-600/30 text-red-300 border border-red-500/40 uppercase tracking-wide animate-pulse">
                    🚨 911 / EMS Escalated
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Standard shift duty log • Mandatory photo/video verification required
              </p>
            </div>
          </div>

          <button
            id="close-report-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Type Selector Tabs */}
        <div className="grid grid-cols-3 p-2 bg-slate-950/70 border-b border-slate-800 gap-1.5">
          <button
            type="button"
            id="report-type-tab-activity"
            onClick={() => setReportType('activity')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              reportType === 'activity'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Activity Report (DAR)</span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-bold rounded bg-blue-900/60 text-blue-200">
              30m Patrol
            </span>
          </button>

          <button
            type="button"
            id="report-type-tab-maintenance"
            onClick={() => setReportType('maintenance')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              reportType === 'maintenance'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 ring-1 ring-amber-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Maintenance Report</span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-900/60 text-amber-200">
              Property
            </span>
          </button>

          <button
            type="button"
            id="report-type-tab-incident"
            onClick={() => setReportType('incident')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              reportType === 'incident'
                ? escalatedToEmergency 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 ring-1 ring-red-400 animate-pulse'
                  : 'bg-orange-600 text-white shadow-lg shadow-orange-600/30 ring-1 ring-orange-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Flagged / Incident</span>
            <span className={`hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-bold rounded ${escalatedToEmergency ? 'bg-red-900 text-red-200' : 'bg-orange-900/60 text-orange-200'}`}>
              Escalation
            </span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-200">Validation Error</p>
                <p className="text-xs text-red-300 mt-0.5">{formError}</p>
              </div>
            </div>
          )}

          {/* Facility & Post Context Strip */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Facility / Site</span>
                <span className="font-medium text-slate-200">{locationName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Logged Time</span>
                <span className="font-mono text-slate-200">{reportTime} • {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">GPS Telemetry</span>
                <span className="text-emerald-300 font-mono">
                  {gpsCoordinates ? `${gpsCoordinates.latitude.toFixed(4)}, ${gpsCoordinates.longitude.toFixed(4)} (±${gpsCoordinates.accuracy?.toFixed(0) || 5}m)` : 'GPS Attached'}
                </span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* TAB 1: ACTIVITY REPORT (DAR 30-MIN PATROL)                     */}
          {/* ------------------------------------------------------------- */}
          {reportType === 'activity' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-blue-200 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-300">Routine Daily Activity Report (DAR): </span>
                  Log standard intervals (every 30 minutes) showing active duty performance with zero anomalies. Requires at least 1 photo verification.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Patrol Method / Type
                  </label>
                  <select
                    id="activity-patrol-type-select"
                    value={patrolType}
                    onChange={(e) => setPatrolType(e.target.value as ActivityPatrolType)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="foot_patrol">Foot Patrol / Perimeter Sweep</option>
                    <option value="interior_inspection">Interior Building Inspection</option>
                    <option value="vehicle_patrol">Vehicle / Rover Mobile Patrol</option>
                    <option value="access_checkpoint_check">Access Checkpoint & Gate Scan</option>
                    <option value="fixed_post_scan">Fixed Post Area Scan</option>
                    <option value="common_area_sweep">Courtyard / Common Area Sweep</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Patrol Status & Observation
                  </label>
                  <select
                    id="activity-status-select"
                    value={activityStatus}
                    onChange={(e) => setActivityStatus(e.target.value as ActivityStatusType)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all_clear">✅ All Clear & Secured</option>
                    <option value="routine_normal">🟢 Routine Normal - No Anomalies</option>
                    <option value="doors_secured">🔒 All Doors & Gates Verified Locked</option>
                    <option value="patrol_completed">🚶 Scheduled Sweep Completed</option>
                    <option value="no_anomalies_detected">🛡️ Zero Safety / Security Discrepancies</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Specific Zone / Sector Inspected
                </label>
                <input
                  type="text"
                  id="activity-zone-input"
                  value={zoneChecked}
                  onChange={(e) => setZoneChecked(e.target.value)}
                  placeholder="e.g. North Container Berth 4, Gate B, 2nd Floor Hallways"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <input
                    type="checkbox"
                    id="thirty-min-interval-chk"
                    checked={isThirtyMinCheckin}
                    onChange={(e) => setIsThirtyMinCheckin(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-600"
                  />
                  <label htmlFor="thirty-min-interval-chk" className="text-xs text-slate-200 font-medium cursor-pointer">
                    30-Min Duty Interval Check-in
                  </label>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-xs text-slate-400">Doors Checked:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDoorsChecked(Math.max(0, doorsChecked - 1))}
                      className="w-6 h-6 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-sm text-white">{doorsChecked}</span>
                    <button
                      type="button"
                      onClick={() => setDoorsChecked(doorsChecked + 1)}
                      className="w-6 h-6 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-xs text-slate-400">Lighting Units:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLightsChecked(Math.max(0, lightsChecked - 1))}
                      className="w-6 h-6 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-sm text-white">{lightsChecked}</span>
                    <button
                      type="button"
                      onClick={() => setLightsChecked(lightsChecked + 1)}
                      className="w-6 h-6 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Patrol Observation Notes
                </label>
                <textarea
                  id="activity-notes-textarea"
                  rows={3}
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  placeholder="Detail sweep observations, door verification, lighting conditions..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: MAINTENANCE REPORT                                     */}
          {/* ------------------------------------------------------------- */}
          {reportType === 'maintenance' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex items-start gap-2.5">
                <Wrench className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Property Maintenance & Hazard Reporting: </span>
                  Log facility issues (lighting, water leaks, broken locks, HVAC, safety hazards) for property management dispatch. Requires at least 1 photo/video evidence.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Issue Category
                  </label>
                  <select
                    id="maint-category-select"
                    value={maintCategory}
                    onChange={(e) => setMaintCategory(e.target.value as MaintenanceIssueCategory)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="lighting_electrical">💡 Lighting & Electrical Outage</option>
                    <option value="plumbing_leak">🚰 Plumbing Leak / Water Damage</option>
                    <option value="doors_locks_gates">🚪 Broken Doors, Locks, Gates or Latches</option>
                    <option value="hvac_climate">❄️ HVAC / Climate Control / Noise</option>
                    <option value="glass_drywall_damage">🪟 Broken Glass, Drywall or Vandalism</option>
                    <option value="trash_hazards">⚠️ Trash, Debris or Slip/Trip Hazard</option>
                    <option value="elevator_mechanical">🛗 Elevator / Mechanical Fault</option>
                    <option value="fire_safety_extinguisher">🧯 Fire Extinguisher / Exit Sign / Alarm</option>
                    <option value="landscaping_obstruction">🌳 Landscaping / Obstruction</option>
                    <option value="other">🔧 Other Facility Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Severity Level
                  </label>
                  <select
                    id="maint-severity-select"
                    value={maintSeverity}
                    onChange={(e) => setMaintSeverity(e.target.value as MaintenanceSeverity)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="routine">Routine (Next Business Day)</option>
                    <option value="moderate">Moderate (Needs Attention Today)</option>
                    <option value="urgent">Urgent (Immediate Night Action)</option>
                    <option value="critical_safety_hazard">🚨 Critical Safety Hazard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Issue Title / Headline
                  </label>
                  <input
                    type="text"
                    id="maint-title-input"
                    value={maintTitle}
                    onChange={(e) => setMaintTitle(e.target.value)}
                    placeholder="e.g. Overhead Light Ballast Sparks / Dark Zone"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Specific Location on Property
                  </label>
                  <input
                    type="text"
                    id="maint-location-input"
                    value={maintLocation}
                    onChange={(e) => setMaintLocation(e.target.value)}
                    placeholder="e.g. Building B, 2nd Floor near Suite 204"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Detailed Issue Description
                </label>
                <textarea
                  id="maint-desc-textarea"
                  rows={3}
                  value={maintDescription}
                  onChange={(e) => setMaintDescription(e.target.value)}
                  placeholder="Describe exact conditions, risk of damage, safety impact..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="maint-safety-hazard-chk"
                    checked={maintSafetyHazard}
                    onChange={(e) => setMaintSafetyHazard(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-slate-900 border-slate-600"
                  />
                  <label htmlFor="maint-safety-hazard-chk" className="text-xs text-slate-200 font-medium cursor-pointer">
                    Poses Direct Safety / Liability Hazard
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="maint-staff-notified-chk"
                    checked={maintStaffNotified}
                    onChange={(e) => setMaintStaffNotified(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-slate-900 border-slate-600"
                  />
                  <label htmlFor="maint-staff-notified-chk" className="text-xs text-slate-200 font-medium cursor-pointer">
                    Property Staff / Super Notified On-Duty
                  </label>
                </div>
              </div>

              {maintStaffNotified && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Name of Person / Lead Notified
                  </label>
                  <input
                    type="text"
                    id="maint-staff-name-input"
                    value={maintStaffName}
                    onChange={(e) => setMaintStaffName(e.target.value)}
                    placeholder="e.g. Building Manager John Doe (Phone: 555-0123)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Suggested Remediation / Action Needed
                </label>
                <input
                  type="text"
                  id="maint-suggested-input"
                  value={maintSuggestedAction}
                  onChange={(e) => setMaintSuggestedAction(e.target.value)}
                  placeholder="e.g. Schedule emergency plumber or place warning cones"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: FLAGGED / INCIDENT REPORT (WITH ESCALATION OPTION)      */}
          {/* ------------------------------------------------------------- */}
          {reportType === 'incident' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-orange-950/30 border border-orange-800/40 text-orange-200 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-orange-300">Flagged Security Incident Report: </span>
                  Document anytime security action was taken (trespassing, disturbances, suspicious activity, confrontations). Requires at least 1 photo/video evidence.
                </div>
              </div>

              {/* EMERGENCY ESCALATION TOGGLE BOX */}
              <div className={`p-4 rounded-xl border transition-all ${
                escalatedToEmergency 
                  ? 'bg-red-950/60 border-red-500/80 shadow-lg shadow-red-950/50 ring-2 ring-red-500/50' 
                  : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${escalatedToEmergency ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-700 text-slate-300'}`}>
                      <Siren className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Escalate to Emergency Services (911 / Police / Fire / EMS)
                        {escalatedToEmergency && (
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-red-600 text-white tracking-wider animate-pulse">
                            Active 911 Link
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Enable if the incident escalated to where 911 police, fire, or paramedic response was contacted or requested on scene.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      id="escalate-emergency-services-toggle"
                      checked={escalatedToEmergency}
                      onChange={(e) => {
                        setEscalatedToEmergency(e.target.checked);
                        if (e.target.checked) {
                          setIncSeverity('critical');
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                {/* Conditional Escalation Fields */}
                {escalatedToEmergency && (
                  <div className="mt-4 pt-4 border-t border-red-800/60 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-red-200 mb-2 uppercase tracking-wide">
                        Emergency Responding Agencies Contacted
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'police_911', label: '🚓 Police (911 / SPD)' },
                          { id: 'ems_paramedics', label: '🚑 EMS Paramedics' },
                          { id: 'fire_department', label: '🚒 Fire Department' },
                          { id: 'hazmat_team', label: '☣️ HazMat Team' },
                          { id: 'transit_police', label: '👮 Transit Police' },
                          { id: 'operations_supervisor_onscene', label: '🛡️ Supervisor On-Scene' }
                        ].map((agency) => (
                          <button
                            type="button"
                            key={agency.id}
                            id={`agency-btn-${agency.id}`}
                            onClick={() => toggleEmergencyAgency(agency.id as EmergencyServiceAgency)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between border text-left transition-all ${
                              selectedAgencies.includes(agency.id as EmergencyServiceAgency)
                                ? 'bg-red-600/30 text-white border-red-500 ring-1 ring-red-400'
                                : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            <span>{agency.label}</span>
                            {selectedAgencies.includes(agency.id as EmergencyServiceAgency) && (
                              <Check className="w-3.5 h-3.5 text-red-300" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-red-200 mb-1">
                          CAD / 911 Incident #
                        </label>
                        <input
                          type="text"
                          id="cad-incident-input"
                          value={cadIncidentNum}
                          onChange={(e) => setCadIncidentNum(e.target.value)}
                          placeholder="e.g. CAD-911-884321"
                          className="w-full px-3 py-2 bg-slate-900 border border-red-700/80 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-red-200 mb-1">
                          Responding Units & Badge #s
                        </label>
                        <input
                          type="text"
                          id="responding-units-input"
                          value={respondingUnits}
                          onChange={(e) => setRespondingUnits(e.target.value)}
                          placeholder="e.g. Seattle PD Unit 214 / Ofc. Henderson #7821"
                          className="w-full px-3 py-2 bg-slate-900 border border-red-700/80 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-red-200 mb-1">
                        Emergency Resolution / On-Scene Outcome
                      </label>
                      <textarea
                        id="emergency-outcome-textarea"
                        rows={2}
                        value={emergencyOutcome}
                        onChange={(e) => setEmergencyOutcome(e.target.value)}
                        placeholder="Detail the handoff to emergency personnel, patient transport, arrest or medical outcome..."
                        className="w-full px-3 py-2 bg-slate-900 border border-red-700/80 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Standard Incident Core Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Incident Category
                  </label>
                  <select
                    id="inc-category-select"
                    value={incCategory}
                    onChange={(e) => setIncCategory(e.target.value as IncidentCategory)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="trespassing">🚷 Trespassing / Unauthorized Entry</option>
                    <option value="suspicious_person">👤 Suspicious Person / Loitering</option>
                    <option value="suspicious_vehicle">🚗 Suspicious Vehicle</option>
                    <option value="altercation_verbal">🗣️ Verbal Altercation / Disturbance</option>
                    <option value="altercation_physical">👊 Physical Altercation / Assault</option>
                    <option value="theft_shoplifting">💰 Theft / Shoplifting / Tampering</option>
                    <option value="burglary_forced_entry">🚨 Burglary / Forced Entry</option>
                    <option value="property_damage">🔨 Vandalism / Property Damage</option>
                    <option value="medical_emergency">🩺 Medical Emergency / Injury</option>
                    <option value="fire_smoke_hazard">🔥 Fire / Smoke / Gas Hazard</option>
                    <option value="parking_violation">🅿️ Parking Violation / Impound</option>
                    <option value="other_guard_action">🛡️ Other Security Action</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Incident Severity
                  </label>
                  <select
                    id="inc-severity-select"
                    value={incSeverity}
                    onChange={(e) => setIncSeverity(e.target.value as IncidentSeverity)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="low">Low (Routine Verbal Direction)</option>
                    <option value="medium">Medium (Trespass Notice / Escort)</option>
                    <option value="high">High (Property Threat / Confrontation)</option>
                    <option value="critical">Critical (Safety Danger / 911 Call)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Incident Title / Headline
                </label>
                <input
                  type="text"
                  id="inc-title-input"
                  value={incTitle}
                  onChange={(e) => setIncTitle(e.target.value)}
                  placeholder="e.g. Trespasser Escorted Off Pier 7 Berth 4"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Action Taken by Security Guard (Detailed Response)
                </label>
                <textarea
                  id="inc-action-taken-textarea"
                  rows={2}
                  value={incActionTaken}
                  onChange={(e) => setIncActionTaken(e.target.value)}
                  placeholder="Describe your security confrontation, verbal commands, escort procedure, and safety actions..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Chronological Timeline & Summary
                </label>
                <textarea
                  id="inc-timeline-textarea"
                  rows={3}
                  value={incTimeline}
                  onChange={(e) => setIncTimeline(e.target.value)}
                  placeholder="HH:MM - Observed subject... HH:MM - Issued verbal notice... HH:MM - Subject departed..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none font-mono text-xs"
                  required
                />
              </div>

              {/* Parties Involved Section */}
              <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-400" />
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      Parties Involved (Suspects, Victims, Witnesses, Tenants)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono font-medium">
                      {partiesList.length} {partiesList.length === 1 ? 'Party' : 'Parties'} Documented
                    </span>
                  </div>
                </div>

                {/* List of currently documented parties */}
                {partiesList.length > 0 && (
                  <div className="space-y-2.5">
                    {partiesList.map((pty) => (
                      <div 
                        key={pty.id} 
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2 relative group hover:border-slate-600 transition-colors"
                      >
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {pty.name || 'Unnamed Subject'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                              pty.role === 'suspect' 
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : pty.role === 'victim'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : pty.role === 'witness'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {pty.role}
                            </span>

                            {pty.refusedIdentification ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80 flex items-center gap-1">
                                <UserX className="w-3 h-3" />
                                Refused Identification
                              </span>
                            ) : pty.idNumber ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1 font-mono">
                                <CreditCard className="w-3 h-3" />
                                {pty.idType?.toUpperCase().replace('_', ' ')}: {pty.idStateOrIssuer ? `${pty.idStateOrIssuer} ` : ''}#{pty.idNumber}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditParty(pty)}
                              className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Edit party details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeParty(pty.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Delete party record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Physical Description Badges */}
                        {(pty.ageApprox || pty.gender || pty.height || pty.weightBuild || pty.hairEyes || pty.clothingDescription || pty.distinguishingFeatures) && (
                          <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <Eye className="w-3 h-3 text-cyan-400" />
                              Physical & Attire Description
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 text-[11px]">
                              {pty.ageApprox && (
                                <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-200 border border-slate-700/60">
                                  Age: ~{pty.ageApprox}
                                </span>
                              )}
                              {pty.gender && pty.gender !== 'unknown' && (
                                <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-200 border border-slate-700/60 capitalize">
                                  Gender: {pty.gender.replace('_', ' ')}
                                </span>
                              )}
                              {pty.height && (
                                <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-200 border border-slate-700/60">
                                  Height: {pty.height}
                                </span>
                              )}
                              {pty.weightBuild && (
                                <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-200 border border-slate-700/60">
                                  Build: {pty.weightBuild}
                                </span>
                              )}
                              {pty.hairEyes && (
                                <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-200 border border-slate-700/60">
                                  Hair/Eyes: {pty.hairEyes}
                                </span>
                              )}
                            </div>

                            {pty.clothingDescription && (
                              <p className="text-slate-300 text-[11px] leading-relaxed">
                                <strong className="text-slate-400 font-medium">Clothing / Attire: </strong> 
                                {pty.clothingDescription}
                              </p>
                            )}

                            {pty.distinguishingFeatures && (
                              <p className="text-amber-200/90 text-[11px] leading-relaxed">
                                <strong className="text-amber-400 font-medium">Distinguishing Marks / Tattoos: </strong> 
                                {pty.distinguishingFeatures}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Vehicle & Contact Info */}
                        {(pty.vehicleInfo || pty.phoneOrContact || pty.email || pty.address) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {pty.vehicleInfo && (
                              <div className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 flex items-center gap-1.5 text-[11px]">
                                <Car className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>{pty.vehicleInfo}</span>
                              </div>
                            )}
                            {pty.phoneOrContact && (
                              <div className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 flex items-center gap-1.5 text-[11px]">
                                <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>{pty.phoneOrContact}</span>
                              </div>
                            )}
                            {pty.email && (
                              <div className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 flex items-center gap-1.5 text-[11px]">
                                <Mail className="w-3 h-3 text-blue-400 shrink-0" />
                                <span>{pty.email}</span>
                              </div>
                            )}
                            {pty.address && (
                              <div className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 flex items-center gap-1.5 text-[11px]">
                                <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                                <span>{pty.address}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Statement / Remarks */}
                        {pty.statementOrNotes && (
                          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/80 text-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                              Statement / Verbal Demeanor
                            </span>
                            <p className="text-slate-200 text-[11px] italic">
                              "{pty.statementOrNotes}"
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Form to Add or Edit a Party */}
                <div className="pt-3 border-t border-slate-700/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">
                        {editingPartyId ? 'Edit Party Record' : 'Add Party / Person of Interest'}
                      </span>
                      {editingPartyId && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700">
                          Editing Mode
                        </span>
                      )}
                    </div>

                    {/* Quick Presets for Rapid Guard Input */}
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-400 text-[10px] mr-1 hidden sm:inline">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => applyPartyPreset('trespasser')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-medium"
                      >
                        ⚡ Trespasser
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPartyPreset('tenant')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-medium"
                      >
                        ⚡ Tenant
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPartyPreset('witness')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-medium"
                      >
                        ⚡ Witness
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPartyPreset('vehicle_intruder')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-medium"
                      >
                        ⚡ Vehicle
                      </button>
                    </div>
                  </div>

                  {/* Identity Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Full Name / Subject Ref <span className="text-slate-400 font-normal">(or Alias)</span>
                      </label>
                      <input
                        type="text"
                        value={newPartyName}
                        onChange={(e) => setNewPartyName(e.target.value)}
                        placeholder="e.g. John Doe / Subject #1"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Party Role
                      </label>
                      <select
                        value={newPartyRole}
                        onChange={(e) => setNewPartyRole(e.target.value as PartyInvolvedRole)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
                      >
                        <option value="suspect">Suspect / Trespasser</option>
                        <option value="witness">Witness</option>
                        <option value="victim">Victim / Complainant</option>
                        <option value="tenant">Tenant / Resident</option>
                        <option value="contractor">Contractor / Visitor</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3 flex items-end">
                      <label className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-700 w-full cursor-pointer hover:bg-slate-850">
                        <input
                          type="checkbox"
                          checked={newPartyRefusedId}
                          onChange={(e) => {
                            setNewPartyRefusedId(e.target.checked);
                            if (e.target.checked) setNewPartyIdType('none');
                          }}
                          className="w-3.5 h-3.5 rounded text-amber-500 bg-slate-950 border-slate-600 focus:ring-amber-500"
                        />
                        <span className="text-[11px] font-medium text-amber-300 select-none">
                          Refused ID
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* ID Credentials Section */}
                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-850 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                        Identification Credentials & Documents
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                          ID Document Type
                        </label>
                        <select
                          value={newPartyIdType}
                          disabled={newPartyRefusedId}
                          onChange={(e) => setNewPartyIdType(e.target.value as PartyIdType)}
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-50 focus:outline-none"
                        >
                          <option value="drivers_license">Driver's License (DL)</option>
                          <option value="state_id">State ID Card</option>
                          <option value="passport">Passport</option>
                          <option value="employee_badge">Employee / Contractor Badge</option>
                          <option value="student_id">Student ID</option>
                          <option value="military_id">Military ID</option>
                          <option value="other">Other Official ID</option>
                          <option value="none">No ID / Refused</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                          ID / License / Badge Number
                        </label>
                        <input
                          type="text"
                          value={newPartyIdNumber}
                          disabled={newPartyRefusedId}
                          onChange={(e) => setNewPartyIdNumber(e.target.value)}
                          placeholder="e.g. WDL98210492"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-50 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                          State / Issuing Authority
                        </label>
                        <input
                          type="text"
                          value={newPartyIdState}
                          disabled={newPartyRefusedId}
                          onChange={(e) => setNewPartyIdState(e.target.value)}
                          placeholder="e.g. WA / CA / Company"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-50 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Physical Description Section */}
                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-850 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        Physical Description & Demographics
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                          Approx Age
                        </label>
                        <input
                          type="text"
                          value={newPartyAge}
                          onChange={(e) => setNewPartyAge(e.target.value)}
                          placeholder="e.g. 30-35"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                          Gender
                        </label>
                        <select
                          value={newPartyGender}
                          onChange={(e) => setNewPartyGender(e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                        >
                          <option value="unknown">Unknown</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="non_binary">Non-binary</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                          Height
                        </label>
                        <input
                          type="text"
                          value={newPartyHeight}
                          onChange={(e) => setNewPartyHeight(e.target.value)}
                          placeholder="e.g. 5'10&quot;"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                          Weight / Build
                        </label>
                        <input
                          type="text"
                          value={newPartyWeight}
                          onChange={(e) => setNewPartyWeight(e.target.value)}
                          placeholder="e.g. 180 lbs, Medium"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                          Hair / Eye Color
                        </label>
                        <input
                          type="text"
                          value={newPartyHairEyes}
                          onChange={(e) => setNewPartyHairEyes(e.target.value)}
                          placeholder="e.g. Dark Brown"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                          Clothing & Attire (Jacket, Pants, Footwear, Headwear, Bags)
                        </label>
                        <input
                          type="text"
                          value={newPartyClothing}
                          onChange={(e) => setNewPartyClothing(e.target.value)}
                          placeholder="e.g. Black North Face hoodie, blue denim jeans, white Nike shoes, black beanie"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                          Tattoos, Scars, Piercings & Distinguishing Marks
                        </label>
                        <input
                          type="text"
                          value={newPartyDistinguishing}
                          onChange={(e) => setNewPartyDistinguishing(e.target.value)}
                          placeholder="e.g. Skull tattoo on right forearm, eyebrow scar, limps on right leg"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vehicle, Contact & Statement Section */}
                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-850 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5 flex items-center gap-1">
                          <Car className="w-3 h-3 text-amber-400" />
                          Vehicle Make / Model / Plate #
                        </label>
                        <input
                          type="text"
                          value={newPartyVehicle}
                          onChange={(e) => setNewPartyVehicle(e.target.value)}
                          placeholder="e.g. 2018 Silver Honda Civic, WA #ABC-1234"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          Phone Number / Contact
                        </label>
                        <input
                          type="text"
                          value={newPartyPhone}
                          onChange={(e) => setNewPartyPhone(e.target.value)}
                          placeholder="e.g. (206) 555-0192"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-purple-400" />
                          Unit / Resident Address
                        </label>
                        <input
                          type="text"
                          value={newPartyAddress}
                          onChange={(e) => setNewPartyAddress(e.target.value)}
                          placeholder="e.g. Apt #402 / Bldg 3"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-0.5 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-400" />
                        Party Statement, Demeanor & Verbal Notes
                      </label>
                      <textarea
                        rows={2}
                        value={newPartyStatement}
                        onChange={(e) => setNewPartyStatement(e.target.value)}
                        placeholder="Document what the party stated, their attitude/demeanor, claims made, or refusal reasons..."
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {editingPartyId && (
                      <button
                        type="button"
                        onClick={resetPartyForm}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={saveParty}
                      className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-950/50"
                    >
                      {editingPartyId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {editingPartyId ? 'Update Party Record' : 'Add Party to Incident Report'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Extra Incident Checks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <input
                    type="checkbox"
                    id="inc-trespass-chk"
                    checked={incTrespassIssued}
                    onChange={(e) => setIncTrespassIssued(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-slate-900 border-slate-600"
                  />
                  <label htmlFor="inc-trespass-chk" className="text-xs text-slate-200 font-medium cursor-pointer">
                    Formal Verbal Trespass Notice Issued
                  </label>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <input
                    type="checkbox"
                    id="inc-sup-notified-chk"
                    checked={supervisorNotified}
                    onChange={(e) => setSupervisorNotified(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-slate-900 border-slate-600"
                  />
                  <label htmlFor="inc-sup-notified-chk" className="text-xs text-slate-200 font-medium cursor-pointer">
                    Shift Supervisor Notified ({supervisorName})
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* MANDATORY MEDIA ATTACHMENTS SECTION (PHOTOS & VIDEOS)         */}
          {/* ------------------------------------------------------------- */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  Mandatory Media Verification (Photo or Video)
                  <span className="text-red-400 font-black">*Required</span>
                </h3>
                <p className="text-xs text-slate-400">
                  All reports require at least one photographic or video proof with GPS and timestamp.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                  mediaList.length > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse'
                }`}>
                  {mediaList.length} / 1 Minimum Media
                </span>
              </div>
            </div>

            {/* Live Camera Viewfinder Overlay when camera is active */}
            {isCameraActive && (
              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/60 p-2 flex flex-col items-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-64 object-cover rounded-xl bg-slate-950"
                />
                
                <div className="absolute top-4 left-4 px-2 py-1 rounded-md bg-black/70 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  LIVE CAMERA VIEWFINDER
                </div>

                <div className="flex items-center justify-center gap-3 mt-3 w-full">
                  <button
                    type="button"
                    onClick={captureCameraPhoto}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/40"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Photo With Watermark
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
                      startCamera();
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Switch camera lens"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Recording Video Timer Indicator */}
            {isRecordingVideo && (
              <div className="p-4 rounded-xl bg-red-950/80 border-2 border-red-500 text-center space-y-2 animate-pulse">
                <div className="flex items-center justify-center gap-2 text-red-400 font-bold text-sm">
                  <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
                  RECORDING DUTY EVIDENCE VIDEO: 00:0{videoTimerSeconds} / 00:06
                </div>
                <p className="text-xs text-red-200">
                  Capturing optical sequence, audio telemetry, and location verification...
                </p>
                <button
                  type="button"
                  onClick={finishVideoRecording}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
                >
                  Finish Recording Now
                </button>
              </div>
            )}

            {/* Action Buttons to Attach Photos or Videos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                id="btn-take-live-photo"
                onClick={startCamera}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 flex flex-col items-center justify-center text-center gap-1.5 text-slate-200 transition-all hover:scale-[1.02]"
              >
                <Camera className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-semibold">Live Camera</span>
                <span className="text-[10px] text-slate-400">Device Camera</span>
              </button>

              <button
                type="button"
                id="btn-quick-sample-photo"
                onClick={captureSamplePhoto}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 flex flex-col items-center justify-center text-center gap-1.5 text-slate-200 transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-semibold">Snap Verified Photo</span>
                <span className="text-[10px] text-slate-400">Auto Watermarked</span>
              </button>

              <button
                type="button"
                id="btn-record-video"
                onClick={handleSimulateVideoRecord}
                disabled={isRecordingVideo}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 flex flex-col items-center justify-center text-center gap-1.5 text-slate-200 transition-all hover:scale-[1.02]"
              >
                <Video className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-semibold">Record Video</span>
                <span className="text-[10px] text-slate-400">Clip with Telemetry</span>
              </button>

              <label 
                htmlFor="file-upload-media-input"
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 flex flex-col items-center justify-center text-center gap-1.5 text-slate-200 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Upload className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-semibold">Upload Media</span>
                <span className="text-[10px] text-slate-400">JPG, PNG, MP4</span>
                <input
                  id="file-upload-media-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Attached Media Gallery */}
            {mediaList.length > 0 ? (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-slate-300">
                  Attached Media ({mediaList.length}):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {mediaList.map((item, idx) => (
                    <div 
                      key={item.id} 
                      className="group relative rounded-xl overflow-hidden bg-slate-950 border border-slate-700 aspect-video flex flex-col justify-end"
                    >
                      <img
                        src={item.url}
                        alt={item.caption || 'Evidence'}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/40"></div>

                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          item.type === 'video' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          {item.type === 'video' ? '▶ Video' : '📷 Photo'}
                        </span>
                        {item.fileSizeMb && (
                          <span className="px-1 py-0.5 rounded text-[9px] font-mono bg-black/60 text-slate-300">
                            {item.fileSizeMb}MB
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeMediaItem(item.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-red-600/80 text-white opacity-90 hover:opacity-100 hover:bg-red-600 transition-opacity"
                        title="Remove attachment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <div className="relative p-2 z-10">
                        <p className="text-[10px] text-white font-medium truncate">
                          {item.caption || `Evidence #${idx + 1}`}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">
                          {new Date(item.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-red-500/40 bg-red-950/10 text-center space-y-1">
                <p className="text-xs font-bold text-red-300">
                  ⚠️ No Photos or Videos Attached Yet
                </p>
                <p className="text-[11px] text-slate-400">
                  Use "Live Camera", "Snap Verified Photo", "Record Video", or "Upload Media" above. At least 1 item is required to submit.
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
              {mediaList.length > 0 ? (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> {mediaList.length} evidence attachment{mediaList.length > 1 ? 's' : ''} ready
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Photo or video required
                </span>
              )}

              {/* Real-time Connectivity & Sync Status Pill */}
              <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border transition-all ${
                networkOnline
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/40 animate-pulse'
              }`}>
                {networkOnline ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Online • Cloud Storage + Firestore Sync</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Offline Mode • Local Queue Buffer</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                id="cancel-report-btn"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                id="submit-standard-report-btn"
                disabled={mediaList.length === 0 || isSubmitting}
                className={`px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all relative overflow-hidden ${
                  mediaList.length === 0 || isSubmitting
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : !networkOnline
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-900/40 ring-1 ring-amber-400/40'
                      : reportType === 'activity'
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                        : reportType === 'maintenance'
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                          : escalatedToEmergency
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/40 animate-pulse'
                            : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>{submitProgress || 'Processing Report...'}</span>
                  </>
                ) : !networkOnline ? (
                  <>
                    <Database className="w-4 h-4 text-amber-200" />
                    <span>
                      {reportType === 'incident' ? 'Queue Incident Report Offline' : 'Queue Report Offline'}
                    </span>
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-950/80 text-amber-200 border border-amber-500/30 uppercase">
                      Auto-Sync
                    </span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-white" />
                    <span>
                      {reportType === 'activity' && 'Submit 30-Min Activity DAR'}
                      {reportType === 'maintenance' && 'Submit Maintenance Report'}
                      {reportType === 'incident' && (escalatedToEmergency ? '🚨 File & Escalate Incident' : 'File Incident Report')}
                    </span>
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-white/20 text-white">
                      Cloud Sync
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
