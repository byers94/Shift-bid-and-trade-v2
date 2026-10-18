import React, { useState, useEffect } from 'react';
import {
  GuardProfile,
  SchedulingViolation,
  SchedulingViolationType,
  Shift,
} from '../../types/scheduling';
import { AlertTriangle, ShieldAlert, X, CheckCircle2, Lock, FileWarning } from 'lucide-react';

export interface SchedulingOverrideModalProps {
  isOpen: boolean;
  shift: Shift | null;
  guard: GuardProfile | null;
  violations: SchedulingViolation[];
  shiftLabel?: string;
  defaultSupervisor?: string;
  onCancel: () => void;
  onConfirmOverride: (overridePayload: {
    shift: Shift;
    guard: GuardProfile;
    authorizedBy: string;
    reason: string;
    timestamp: string;
    overrideTypes: SchedulingViolationType[];
    auditLogMessage: string;
  }) => void;
}

export const OVERRIDE_REASON_OPTIONS = [
  'Emergency Client Coverage / Mutual Aid',
  'Post Abandonment Immediate Mitigation',
  'Renewal Application In Progress (Excise & Licenses Pending)',
  'Authorized Overtime Pre-Approved by Operations',
] as const;

export const SchedulingOverrideModal: React.FC<SchedulingOverrideModalProps> = ({
  isOpen,
  shift,
  guard,
  violations,
  shiftLabel,
  defaultSupervisor = '',
  onCancel,
  onConfirmOverride,
}) => {
  const [supervisorName, setSupervisorName] = useState(defaultSupervisor);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSupervisorName(defaultSupervisor);
      setSelectedReason('');
      setLiabilityAccepted(false);
    }
  }, [isOpen, defaultSupervisor, shift?.id, guard?.id]);

  if (!isOpen || !shift || !guard) return null;

  const projectedHours =
    Math.round((guard.weeklyScheduledHours + shift.durationHours) * 10) / 10;
  const resolvedShiftName =
    shiftLabel || `${shift.siteCode} (${shift.startTime}-${shift.endTime})`;

  const canSubmit =
    supervisorName.trim().length > 0 &&
    selectedReason.trim().length > 0 &&
    liabilityAccepted;

  const formatViolationBadgeText = (v: SchedulingViolation): string => {
    switch (v.type) {
      case 'OVERTIME':
        return `[ OVERTIME WARNING: Pushes weekly total to ${projectedHours}h (Exceeds 40h limit) ]`;
      case 'JURISDICTION_LICENSE':
        return `[ MUNICIPAL VIOLATION: Site requires active Denver DSL. Guard license is lapsed/expired ]`;
      case 'RATING':
        return `[ RATING DEFICIT: Post requires Level ${shift.requiredRating}, Guard is Level ${guard.rating} ]`;
      case 'REST_TURNAROUND':
        return `[ REST VIOLATION: Less than 12h turnaround between consecutive shifts ]`;
      default:
        return `[ VIOLATION: ${v.message} ]`;
    }
  };

  const handleForceOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const timestamp = new Date().toISOString();
    const overrideTypes = violations.map((v) => v.type);
    const supervisorClean = supervisorName.trim();

    const updatedShift: Shift = {
      ...shift,
      assignedGuardId: guard.id,
      assignedGuardName: guard.name,
      status: 'filled',
      isOverride: true,
      overrideDetails: {
        authorizedBy: supervisorClean,
        reason: selectedReason,
        timestamp,
        overrideTypes,
      },
    };

    const auditLogMessage = `[SCHEDULING OVERRIDE] ${supervisorClean} authorized ${guard.name} for ${resolvedShiftName} at ${shift.siteName}. Bypassed: ${overrideTypes.join(', ')}. Reason: ${selectedReason}`;

    onConfirmOverride({
      shift: updatedShift,
      guard,
      authorizedBy: supervisorClean,
      reason: selectedReason,
      timestamp,
      overrideTypes,
      auditLogMessage,
    });
  };

  return (
    <div
      id="scheduling-override-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scheduling-override-modal-title"
    >
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-rose-500/80 rounded-xl shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-rose-950/90 border-b border-rose-500/50 px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-400/50 text-rose-300 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="scheduling-override-modal-title"
                className="text-sm sm:text-base font-black tracking-wide text-rose-100 uppercase"
              >
                ⚠️ SCHEDULING CONSTRAINT VIOLATION
              </h2>
              <p className="text-xs text-rose-300/90">
                Assignment blocked by automated compliance guardrails. Command authorization required to bypass.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900/60 transition-colors cursor-pointer"
            aria-label="Close Override Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleForceOverrideSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Summary Card: Shift details & Guard details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/90 border border-slate-800 rounded-lg p-3.5">
            {/* Shift Details */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Target Shift Details
              </div>
              <div className="text-sm font-bold text-white">{shift.siteName}</div>
              <div className="text-xs font-mono text-slate-300 tabular-nums">
                {shift.dayOfWeek} · {shift.startTime}–{shift.endTime} ({shift.durationHours.toFixed(1)}h)
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {shift.requiresDenverLicense ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">
                    [DENVER COUNTY - DSL REQ]
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    [REGIONAL - {shift.county}]
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Req Level {shift.requiredRating}
                </span>
              </div>
            </div>

            {/* Guard Details */}
            <div className="space-y-1.5 sm:border-l sm:border-slate-800 sm:pl-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Selected Personnel
              </div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{guard.name}</span>
                <span className="text-xs font-mono text-blue-400">({guard.badgeNumber})</span>
              </div>
              <div className="text-xs font-mono text-slate-300 tabular-nums">
                Rating: Level {guard.rating} · Current Week: {guard.weeklyScheduledHours.toFixed(1)}h
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    guard.licenseStatus === 'COMPLIANT'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : guard.licenseStatus === 'EXPIRING_SOON'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  }`}
                >
                  DSL: {guard.licenseStatus}
                  {guard.dslExpirationDate ? ` (${guard.dslExpirationDate})` : ' (NO CERT)'}
                </span>
              </div>
            </div>
          </div>

          {/* Detected Violations Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <FileWarning className="w-4 h-4 text-rose-400" />
                Detected Compliance & Scheduling Violations ({violations.length})
              </span>
              <span className="text-[11px] font-mono text-rose-400 font-semibold">
                SEVERITY: BLOCKING
              </span>
            </div>

            <div className="space-y-2 bg-rose-950/30 border border-rose-500/40 rounded-lg p-3">
              {violations.map((violation, index) => (
                <div
                  key={`${violation.type}-${index}`}
                  className="bg-rose-500/20 border border-rose-500 text-rose-200 font-mono text-xs font-bold px-3 py-2 rounded flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div>{formatViolationBadgeText(violation)}</div>
                    <div className="text-[11px] font-sans font-normal text-rose-300/90">
                      {violation.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supervisor Authorization Form */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Supervisor Override Authorization
            </div>

            {/* Authorizing Supervisor / Commander Badge & Name */}
            <div>
              <label
                htmlFor="override-supervisor-input"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Authorizing Supervisor / Commander Badge &amp; Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="override-supervisor-input"
                type="text"
                required
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                placeholder="e.g., Cmdr. M. O'Connor (OPS-CMD-01)"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            {/* Override Reason Dropdown */}
            <div>
              <label
                htmlFor="override-reason-select"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Override Reason <span className="text-rose-400">*</span>
              </label>
              <select
                id="override-reason-select"
                required
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="">-- Select Mandatory Override Justification --</option>
                {OVERRIDE_REASON_OPTIONS.map((reasonOption) => (
                  <option key={reasonOption} value={reasonOption}>
                    [ {reasonOption} ]
                  </option>
                ))}
              </select>
            </div>

            {/* Mandatory Liability Confirmation Checkbox */}
            <label
              htmlFor="override-liability-checkbox"
              className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 cursor-pointer select-none"
            >
              <input
                id="override-liability-checkbox"
                type="checkbox"
                checked={liabilityAccepted}
                onChange={(e) => setLiabilityAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span className="text-xs text-slate-200 leading-relaxed">
                I confirm and authorize this scheduling exemption. I accept compliance, billing, and labor liability for this assignment.
              </span>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              id="override-cancel-btn"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              [ Cancel / Keep Unassigned ]
            </button>

            <button
              type="submit"
              id="override-confirm-btn"
              disabled={!canSubmit}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                canSubmit
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-lg cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>[ Force Override &amp; Assign Shift ]</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchedulingOverrideModal;
