import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { SiteOrientation, SiteOrientationCheckpoints } from '../../types/shift';
import { 
  ShieldCheck, 
  MapPin, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Phone, 
  Radio, 
  FileText, 
  Key, 
  Compass, 
  Send, 
  AlertOctagon,
  UserCheck,
  Check,
  ChevronRight,
  Navigation
} from 'lucide-react';

interface SupervisorSignOffModalProps {
  orientation: SiteOrientation | null;
  isOpen: boolean;
  onClose: () => void;
  currentSupervisorName?: string;
  currentSupervisorBadge?: string;
}

export const SupervisorSignOffModal: React.FC<SupervisorSignOffModalProps> = ({
  orientation,
  isOpen,
  onClose,
  currentSupervisorName = "Field Supervisor",
  currentSupervisorBadge = "SUP-01"
}) => {
  const {
    guardsList,
    sitesList,
    assignSupervisorToOrientation,
    verifySupervisorArrivalGps,
    approveAndReleaseSolo,
    failAndEscalateOrientation
  } = useShiftOps();

  const [checkpoints, setCheckpoints] = useState<SiteOrientationCheckpoints>({
    postOrdersReviewed: orientation?.checkpoints.postOrdersReviewed ?? false,
    accessKeysVerified: orientation?.checkpoints.accessKeysVerified ?? false,
    perimeterGeofenceWalked: orientation?.checkpoints.perimeterGeofenceWalked ?? false,
    emergencyPocConfirmed: orientation?.checkpoints.emergencyPocConfirmed ?? false
  });

  const [notes, setNotes] = useState(orientation?.supervisorNotes || '');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(orientation?.supervisorId || '');
  const [gpsVerifying, setGpsVerifying] = useState(false);
  const [gpsResult, setGpsResult] = useState<{ inGeofence: boolean; distanceMeters: number } | null>(
    orientation?.gpsVerifiedAtSite !== undefined 
      ? { inGeofence: orientation.gpsVerifiedAtSite, distanceMeters: orientation.distanceMetersFromSite || 15 }
      : null
  );
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');

  if (!isOpen || !orientation) return null;

  const traineeGuard = guardsList.find(g => g.id === orientation.guardId);
  const site = sitesList.find(s => s.id === orientation.siteId || s.name === orientation.siteName);
  const availableSupervisors = guardsList.filter(g => g.role === 'supervisor' || g.role === 'lead');

  // Compute 90-minute window remaining
  const endMs = new Date(orientation.windowEnd).getTime();
  const nowMs = Date.now();
  const remainingMins = Math.round((endMs - nowMs) / (60 * 1000));
  const isWindowExpired = remainingMins <= 0;
  const isWindowUrgent = remainingMins > 0 && remainingMins <= 20;

  const allCheckpointsChecked = 
    checkpoints.postOrdersReviewed && 
    checkpoints.accessKeysVerified && 
    checkpoints.perimeterGeofenceWalked && 
    checkpoints.emergencyPocConfirmed;

  const canApprove = allCheckpointsChecked && (gpsResult?.inGeofence ?? orientation.gpsVerifiedAtSite);

  const handleToggleCheckpoint = (key: keyof SiteOrientationCheckpoints) => {
    setCheckpoints(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleVerifyGps = () => {
    setGpsVerifying(true);
    setTimeout(() => {
      const res = verifySupervisorArrivalGps(orientation.orientationId);
      setGpsResult(res);
      setGpsVerifying(false);
    }, 600);
  };

  const handleAssignSupervisor = () => {
    if (!selectedSupervisorId) return;
    const sup = guardsList.find(g => g.id === selectedSupervisorId);
    assignSupervisorToOrientation(orientation.orientationId, selectedSupervisorId, sup?.name);
  };

  const handleApprove = () => {
    approveAndReleaseSolo(orientation.orientationId, notes, checkpoints);
    onClose();
  };

  const handleEscalate = () => {
    if (!escalationReason.trim()) return;
    failAndEscalateOrientation(orientation.orientationId, escalationReason, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Site Training & Supervisor Sign-Off
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Orientation Protocol #{orientation.orientationId} • 90-Min Qualification Window
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status & Window Bar */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isWindowExpired
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
              : isWindowUrgent
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
              : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300'
          }`}>
            <div className="flex items-center space-x-2.5">
              <Clock className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-semibold text-sm">
                  {isWindowExpired 
                    ? '90-Minute Orientation Window Overdue'
                    : `Orientation Window: ${remainingMins} mins remaining`}
                </span>
                <p className="text-xs opacity-80">
                  Window: {new Date(orientation.windowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(orientation.windowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/80 dark:bg-slate-900/80 border border-current shadow-xs">
              {orientation.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Trainee & Site Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Trainee Officer</span>
              <div className="flex items-center space-x-3 mt-2">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {orientation.guardName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    {orientation.guardName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Badge: <span className="font-mono font-medium">{orientation.guardBadge}</span>
                    {orientation.guardPhone && ` • ${orientation.guardPhone}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Post Location</span>
              <div className="flex items-center space-x-3 mt-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                    {orientation.siteName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {orientation.siteAddress || site?.address || 'Primary Facility Entrance'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Supervisor Dispatch / Assignment */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Field Supervisor Assignment
                </span>
              </div>
              {orientation.supervisorName && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  Assigned: {orientation.supervisorName} ({orientation.supervisorBadge})
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <select
                value={selectedSupervisorId}
                onChange={(e) => setSelectedSupervisorId(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Field Supervisor to Dispatch --</option>
                {availableSupervisors.map(sup => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name} ({sup.badgeNumber}) - {sup.role.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAssignSupervisor}
                disabled={!selectedSupervisorId || selectedSupervisorId === orientation.supervisorId}
                className="w-full sm:w-auto shrink-0 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors flex items-center justify-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Supervisor</span>
              </button>
            </div>
          </div>

          {/* Supervisor GPS Arrival Verification */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  On-Site GPS Proximity Check
                </span>
              </div>
              <button
                type="button"
                onClick={handleVerifyGps}
                disabled={gpsVerifying}
                className="px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 hover:bg-blue-200 dark:hover:bg-blue-900/60 rounded-md transition-colors"
              >
                {gpsVerifying ? 'Pinging GPS...' : 'Verify Proximity'}
              </button>
            </div>

            {gpsResult ? (
              <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                gpsResult.inGeofence
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                <div className="flex items-center space-x-2">
                  {gpsResult.inGeofence ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>
                    {gpsResult.inGeofence 
                      ? `Supervisor Confirmed On-Site (${gpsResult.distanceMeters}m from geofence center)`
                      : `Supervisor Off-Site: ${gpsResult.distanceMeters}m away (must be <120m)`}
                  </span>
                </div>
                <span className="font-bold uppercase tracking-wider">
                  {gpsResult.inGeofence ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supervisor must ping location to verify on-site presence prior to completing the qualification sign-off.
              </p>
            )}
          </div>

          {/* 4-Point Checkpoints Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Mandatory 4-Point Site Verification Checkpoints
              </span>
              <span className="text-xs text-slate-500">
                {[
                  checkpoints.postOrdersReviewed,
                  checkpoints.accessKeysVerified,
                  checkpoints.perimeterGeofenceWalked,
                  checkpoints.emergencyPocConfirmed
                ].filter(Boolean).length} / 4 Complete
              </span>
            </div>

            <div className="space-y-2">
              <label 
                onClick={() => handleToggleCheckpoint('postOrdersReviewed')}
                className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  checkpoints.postOrdersReviewed
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                  checkpoints.postOrdersReviewed
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                }`}>
                  {checkpoints.postOrdersReviewed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold block">1. Post Orders & Specific Site Protocols Reviewed</span>
                  <p className="text-slate-500 dark:text-slate-400">
                    Walked through post duties, access hours, prohibited zones, and tenant interaction rules.
                  </p>
                </div>
              </label>

              <label 
                onClick={() => handleToggleCheckpoint('accessKeysVerified')}
                className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  checkpoints.accessKeysVerified
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                  checkpoints.accessKeysVerified
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                }`}>
                  {checkpoints.accessKeysVerified && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold block">2. Access Keys, Knox Box & Gate Codes Verified</span>
                  <p className="text-slate-500 dark:text-slate-400">
                    Tested physical brass keys, RFID keyfobs, and alarm panel disarm PINs.
                  </p>
                </div>
              </label>

              <label 
                onClick={() => handleToggleCheckpoint('perimeterGeofenceWalked')}
                className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  checkpoints.perimeterGeofenceWalked
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                  checkpoints.perimeterGeofenceWalked
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                }`}>
                  {checkpoints.perimeterGeofenceWalked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold block">3. Perimeter Geofence & Checkpoint Route Walked</span>
                  <p className="text-slate-500 dark:text-slate-400">
                    Physically surveyed all perimeter boundaries, blind spots, CCTV coverage, and emergency egresses.
                  </p>
                </div>
              </label>

              <label 
                onClick={() => handleToggleCheckpoint('emergencyPocConfirmed')}
                className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  checkpoints.emergencyPocConfirmed
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                  checkpoints.emergencyPocConfirmed
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                }`}>
                  {checkpoints.emergencyPocConfirmed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold block">4. Emergency POC & CAD Dispatch Escalation Confirmed</span>
                  <p className="text-slate-500 dark:text-slate-400">
                    Confirmed local emergency contacts, building management escalation desk, and CAD dispatch hotlines.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Supervisor Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Field Supervisor Evaluation Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide qualitative feedback on post orders understanding, uniform inspection, and post readiness..."
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Remediation / Escalation Section */}
          {isEscalating && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
              <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400">
                <AlertOctagon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Escalate Failed Qualification
                </span>
              </div>
              <input
                type="text"
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Reason for escalation (e.g., failed post test, late arrival, uniform non-compliance)"
                className="w-full text-xs bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-lg p-2.5 text-rose-900 dark:text-rose-100 placeholder:text-rose-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEscalating(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEscalate}
                  disabled={!escalationReason.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-40"
                >
                  Confirm Escalation
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsEscalating(!isEscalating)}
            className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
          >
            Fail & Escalate
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={!canApprove}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Release Solo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
