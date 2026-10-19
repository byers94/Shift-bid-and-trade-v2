import React, { useState, useEffect } from 'react';
import { GuardProfile } from '../../types/shift';
import { SecurityTier } from '../../types/scheduling';
import { calculateLicenseStatus } from '../../utils/complianceEngine';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ShieldCheck, Calendar, CheckCircle2, AlertTriangle, ShieldAlert, Award } from 'lucide-react';

export interface GuardCardCredentialBlockProps {
  guard: GuardProfile;
  onUpdateDsl?: (guardId: string, dslExpirationDate: string | null) => void;
}

export const GuardCardCredentialBlock: React.FC<GuardCardCredentialBlockProps> = ({
  guard,
  onUpdateDsl,
}) => {
  const { updateGuardDslCredentials, updateGuard } = useShiftOps();

  const resolveInitialTier = (): SecurityTier => {
    const raw = Number(guard.tier ?? guard.rating ?? 2);
    if (raw <= 1) return 1;
    if (raw === 2) return 2;
    if (raw === 3) return 3;
    return 4;
  };

  const initialDate = guard.licenseExpirationDate ?? guard.dslExpirationDate ?? null;
  const initialHasLicense =
    typeof guard.hasSecurityLicense === 'boolean'
      ? guard.hasSecurityLicense
      : !!initialDate && initialDate !== 'NO';

  const [selectedTier, setSelectedTier] = useState<SecurityTier>(resolveInitialTier());
  const [hasLicense, setHasLicense] = useState<boolean>(initialHasLicense);
  const [expirationDate, setExpirationDate] = useState<string>(
    initialHasLicense && initialDate ? initialDate : ''
  );
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Sync local state if central guard prop updates externally
  useEffect(() => {
    const rawDate = guard.licenseExpirationDate ?? guard.dslExpirationDate ?? null;
    const active =
      typeof guard.hasSecurityLicense === 'boolean'
        ? guard.hasSecurityLicense
        : !!rawDate && rawDate !== 'NO';
    setHasLicense(active);
    setExpirationDate(active && rawDate ? rawDate : '');
    setSelectedTier(resolveInitialTier());
  }, [guard.licenseExpirationDate, guard.dslExpirationDate, guard.hasSecurityLicense, guard.tier, guard.rating]);

  // Immediately evaluate compliance status whenever toggle or date changes
  const effectiveDate = hasLicense ? expirationDate || null : null;
  const licenseCalc = calculateLicenseStatus(effectiveDate);
  const { status, daysUntilExpiration, daysExpired } = licenseCalc;
  const isLicenseValidOrGrace = status === 'COMPLIANT' || status === 'EXPIRING_SOON';

  const commitCredentials = (targetDate: string | null, tierOverride?: SecurityTier) => {
    const normalized =
      targetDate && targetDate.trim() !== '' && targetDate.trim().toUpperCase() !== 'NO'
        ? targetDate.trim()
        : null;
    const nextTier = tierOverride ?? selectedTier;
    const calc = calculateLicenseStatus(normalized);

    if (onUpdateDsl) {
      onUpdateDsl(guard.id, normalized);
    } else {
      updateGuardDslCredentials(guard.id, normalized);
    }

    if (updateGuard) {
      updateGuard(guard.id, {
        tier: nextTier,
        rating: nextTier,
        hasSecurityLicense: !!normalized,
        licenseExpirationDate: normalized,
        dslExpirationDate: normalized,
        licenseStatus: calc.status,
        daysUntilExpiration: calc.daysUntilExpiration,
        daysExpired: calc.daysExpired,
        denverEligible: calc.denverEligible,
      });
    }

    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextTier = Number(e.target.value) as SecurityTier;
    setSelectedTier(nextTier);
    commitCredentials(hasLicense ? expirationDate || null : null, nextTier);
  };

  const handleToggleLicense = () => {
    const nextHasLicense = !hasLicense;
    setHasLicense(nextHasLicense);

    if (!nextHasLicense) {
      setExpirationDate('');
      commitCredentials(null);
    } else {
      const defaultDate =
        expirationDate && expirationDate !== 'NO'
          ? expirationDate
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setExpirationDate(defaultDate);
      commitCredentials(defaultDate);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setExpirationDate(newDate);
    calculateLicenseStatus(newDate);
  };

  const handleDateBlur = () => {
    if (hasLicense && expirationDate !== (guard.licenseExpirationDate || guard.dslExpirationDate || '')) {
      commitCredentials(expirationDate || null);
    }
  };

  const renderDynamicComplianceBadge = () => {
    if (!hasLicense || !expirationDate || status === 'REVOKED') {
      return (
        <span
          id={`guard-dsl-badge-${guard.id}`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/40 whitespace-nowrap"
        >
          <ShieldAlert className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
          <span>License Lapsed (&gt;90d) - Tier 1 Only</span>
        </span>
      );
    }

    if (status === 'COMPLIANT') {
      return (
        <span
          id={`guard-dsl-badge-${guard.id}`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 whitespace-nowrap"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Valid ({daysUntilExpiration}d left)</span>
        </span>
      );
    }

    if (status === 'EXPIRING_SOON') {
      return (
        <span
          id={`guard-dsl-badge-${guard.id}`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 whitespace-nowrap"
        >
          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Expiring in {daysUntilExpiration}d</span>
        </span>
      );
    }

    // EXPIRED_GRACE (1-90d expired)
    return (
      <span
        id={`guard-dsl-badge-${guard.id}`}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-amber-500/50 animate-pulse whitespace-nowrap"
      >
        <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
        <span>
          Grace: {daysExpired}d Expired ({Math.max(0, 90 - daysExpired)}d to renew)
        </span>
      </span>
    );
  };

  return (
    <div
      id={`guard-card-dsl-block-${guard.id}`}
      className="bg-slate-900/5 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex flex-col gap-2"
    >
      {/* Header + Eligibility Indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
            Universal Security License &amp; Tier Matrix
          </span>
        </div>

        <span
          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
            isLicenseValidOrGrace
              ? 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border-cyan-500/30'
              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
          }`}
        >
          {isLicenseValidOrGrace ? `TIER ${selectedTier} CLEARED` : 'TIER 1 ONLY'}
        </span>
      </div>

      {/* Unified 4-Tier Security Rating Selector */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
        <label
          htmlFor={`tier-select-${guard.id}`}
          className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shrink-0"
        >
          <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Officer Rating</span>
        </label>
        <select
          id={`tier-select-${guard.id}`}
          value={selectedTier}
          onChange={handleTierChange}
          aria-label={`Security Tier for ${guard.name}`}
          className="text-[11px] font-mono font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 focus:ring-1 focus:ring-cyan-500 focus:outline-none cursor-pointer"
        >
          <option value={1}>Tier 1: Basic</option>
          <option value={2}>Tier 2: Certified Guard</option>
          <option value={3}>Tier 3: Armed</option>
          <option value={4}>Tier 4: Specialized / EP</option>
        </select>
      </div>

      {/* Universal License Toggle: Security Officer License Active */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
        <label
          htmlFor={`dsl-toggle-${guard.id}`}
          className="text-[11px] font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none"
        >
          Security Officer License Active
        </label>
        <button
          id={`dsl-toggle-${guard.id}`}
          type="button"
          role="switch"
          aria-checked={hasLicense}
          onClick={handleToggleLicense}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            hasLicense ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
          title="Toggle Security Officer License Active status"
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
              hasLicense ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Expiration Date Field + Dynamic Compliance Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {hasLicense ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-[145px]">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              id={`dsl-exp-date-${guard.id}`}
              type="date"
              value={expirationDate}
              onChange={handleDateChange}
              onBlur={handleDateBlur}
              aria-label={`Security Officer License Expiration Date for ${guard.name}`}
              className="w-full text-[11px] font-mono font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            />
          </div>
        ) : (
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 italic">
            No active Security Officer License (Tier 1 Only)
          </span>
        )}

        {/* Dynamic Compliance Badge */}
        {renderDynamicComplianceBadge()}
      </div>

      {/* Quick Save / Commit Action Row */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-800/80">
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
          Status: <strong className="text-slate-700 dark:text-slate-200">{status}</strong>
        </span>

        <button
          id={`dsl-update-credentials-btn-${guard.id}`}
          type="button"
          onClick={() => commitCredentials(hasLicense ? expirationDate || null : null)}
          className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
            justSaved
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-800 dark:text-cyan-300 border-cyan-500/40'
          }`}
        >
          {justSaved ? '✓ Credentials Synced' : '[ Update Credentials ]'}
        </button>
      </div>
    </div>
  );
};

export { GuardCardCredentialBlock as GuardCard };
export default GuardCardCredentialBlock;

