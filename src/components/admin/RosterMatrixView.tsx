import React, { useState, useMemo } from 'react';
import {
  DayOfWeekName,
  DEFAULT_SCHEDULING_CONSTRAINTS,
  GuardProfile,
  GuardRating,
  ScheduleTemplate,
  SchedulingConstraints,
  SchedulingViolation,
  SecurityTier,
  Shift,
  UNIFIED_SCHEDULE_TEMPLATES,
} from '../../types/scheduling';
import {
  calculateLicenseStatus,
  checkShiftEligibility,
  isGuardUnavailableOnDay,
} from '../../utils/complianceEngine';
import { autoFillShifts } from '../../utils/autoFillEngine';
import { SchedulingOverrideModal } from './SchedulingOverrideModal';
import { useShiftOps } from '../../context/ShiftOpsContext';
import {
  Zap,
  CheckCircle2,
  UserPlus,
  UserX,
  Terminal,
  X,
  RotateCcw,
} from 'lucide-react';

const DAYS_OF_WEEK: { key: DayOfWeekName; short: string }[] = [
  { key: 'Sunday', short: 'Sun' },
  { key: 'Monday', short: 'Mon' },
  { key: 'Tuesday', short: 'Tue' },
  { key: 'Wednesday', short: 'Wed' },
  { key: 'Thursday', short: 'Thu' },
  { key: 'Friday', short: 'Fri' },
  { key: 'Saturday', short: 'Sat' },
];

const OPERATING_DAYS: Array<
  'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'
> = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function createInitialGuardRoster(): GuardProfile[] {
  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;
  const toISODate = (offsetDays: number) =>
    new Date(now + offsetDays * dayMs).toISOString().split('T')[0];

  const rawGuards: Array<{
    id: string;
    name: string;
    badgeNumber: string;
    phone: string;
    tier: SecurityTier;
    hasSecurityLicense: boolean;
    licenseExpirationDate: string | null;
    maxWeeklyHours: number;
    availability: {
      recurringUnavailableDays: string[];
      blackoutDates: string[];
    };
  }> = [
    {
      id: 'guard-current',
      name: 'Alex Mercer',
      badgeNumber: 'SEC-8842',
      phone: '+1 (555) 234-5678',
      tier: 3,
      hasSecurityLicense: true,
      licenseExpirationDate: toISODate(215), // COMPLIANT
      maxWeeklyHours: 40,
      availability: {
        recurringUnavailableDays: ['Sunday', 'Saturday'],
        blackoutDates: [],
      },
    },
    {
      id: 'guard-101',
      name: 'Sarah Jenkins',
      badgeNumber: 'SEC-7721',
      phone: '+1 (555) 345-6789',
      tier: 2,
      hasSecurityLicense: true,
      licenseExpirationDate: toISODate(180), // COMPLIANT
      maxWeeklyHours: 40,
      availability: {
        recurringUnavailableDays: ['Sunday', 'Saturday'],
        blackoutDates: [],
      },
    },
    {
      id: 'guard-103',
      name: 'Marcus Wright',
      badgeNumber: 'SEC-6340',
      phone: '+1 (555) 567-8901',
      tier: 3,
      hasSecurityLicense: true,
      licenseExpirationDate: toISODate(14), // EXPIRING_SOON (14d)
      maxWeeklyHours: 40,
      availability: {
        recurringUnavailableDays: ['Friday', 'Saturday'],
        blackoutDates: [],
      },
    },
    {
      id: 'guard-104',
      name: 'Elena Rostova',
      badgeNumber: 'SEC-4199',
      phone: '+1 (555) 678-9012',
      tier: 4,
      hasSecurityLicense: true,
      licenseExpirationDate: toISODate(140), // COMPLIANT
      maxWeeklyHours: 40,
      availability: {
        recurringUnavailableDays: ['Friday', 'Saturday'],
        blackoutDates: [],
      },
    },
    {
      id: 'guard-105',
      name: 'David Silva',
      badgeNumber: 'SEC-5510',
      phone: '+1 (555) 789-0123',
      tier: 2,
      hasSecurityLicense: true,
      licenseExpirationDate: toISODate(-22), // EXPIRED_GRACE (22d expired, 68d left)
      maxWeeklyHours: 40,
      availability: {
        recurringUnavailableDays: ['Tuesday', 'Thursday'],
        blackoutDates: [],
      },
    },
    {
      id: 'guard-107',
      name: 'Chloe Bennett',
      badgeNumber: 'SEC-1102',
      phone: '+1 (555) 901-2345',
      tier: 4,
      hasSecurityLicense: true,
      licenseExpirationDate: toISODate(195), // COMPLIANT
      maxWeeklyHours: 40,
      availability: {
        recurringUnavailableDays: ['Sunday', 'Saturday'],
        blackoutDates: [],
      },
    },
    {
      id: 'guard-108',
      name: 'Maya Lin',
      badgeNumber: 'SEC-4930',
      phone: '+1 (555) 321-7654',
      tier: 2,
      hasSecurityLicense: true,
      licenseExpirationDate: toISODate(9), // EXPIRING_SOON (9d)
      maxWeeklyHours: 40,
      availability: {
        recurringUnavailableDays: ['Monday', 'Wednesday'],
        blackoutDates: [],
      },
    },
    {
      id: 'guard-106',
      name: 'Jamar Vance',
      badgeNumber: 'SEC-3820',
      phone: '+1 (555) 890-1234',
      tier: 1,
      hasSecurityLicense: true,
      licenseExpirationDate: toISODate(-115), // REVOKED (>90d expired - Tier 1 Only)
      maxWeeklyHours: 40,
      availability: {
        recurringUnavailableDays: ['Tuesday', 'Thursday'],
        blackoutDates: [],
      },
    },
    {
      id: 'guard-109',
      name: 'Carlos Rivera',
      badgeNumber: 'SEC-5201',
      phone: '+1 (555) 432-8765',
      tier: 2,
      hasSecurityLicense: false,
      licenseExpirationDate: null, // REVOKED / NO CERT - Tier 1 Only
      maxWeeklyHours: 40,
      availability: {
        recurringUnavailableDays: ['Wednesday', 'Friday'],
        blackoutDates: [],
      },
    },
  ];

  return rawGuards.map((g) => {
    const statusInfo = calculateLicenseStatus(
      g.hasSecurityLicense ? g.licenseExpirationDate : null
    );
    return {
      ...g,
      rating: g.tier,
      dslExpirationDate: g.hasSecurityLicense ? g.licenseExpirationDate : null,
      licenseStatus: statusInfo.status,
      daysUntilExpiration: statusInfo.daysUntilExpiration,
      daysExpired: statusInfo.daysExpired,
      denverEligible: statusInfo.denverEligible,
      weeklyScheduledHours: 0,
      assignedShiftIds: [],
    };
  });
}

function createInitialWeeklySchedule(
  templates: ScheduleTemplate[],
  guards: GuardProfile[]
): Shift[] {
  const guardById = new Map(guards.map((g) => [g.id, g]));
  const shifts: Shift[] = [];

  const customDayOverrides: Record<string, string | undefined> = {
    'SETSCHED-00:Friday': 'guard-108',
    'SETSCHED-00:Saturday': 'guard-108',
    'SETSCHED-03:Friday': undefined,
    'SETSCHED-03:Saturday': undefined,
  };

  for (const site of templates) {
    for (const day of OPERATING_DAYS) {
      const isOperational = site.operatingDays.includes(day);
      if (!isOperational) continue;

      const shiftId = `${site.id}:${day}`;
      const hasOverrideKey = Object.prototype.hasOwnProperty.call(
        customDayOverrides,
        shiftId
      );
      const assignedGuardId = hasOverrideKey
        ? customDayOverrides[shiftId]
        : site.defaultGuardId;
      const assignedGuard = assignedGuardId ? guardById.get(assignedGuardId) : undefined;

      shifts.push({
        id: shiftId,
        shiftName: site.shiftName,
        siteCode: site.siteCode,
        siteName: site.siteName,
        county: site.county,
        requiresSecurityLicense: site.requiresSecurityLicense,
        requiredTier: site.requiredTier,
        requiresDenverLicense: site.requiresSecurityLicense,
        requiredRating: site.requiredTier,
        startTime: site.startTime,
        endTime: site.endTime,
        durationHours: site.durationHours,
        dayOfWeek: day,
        operatingDays: site.operatingDays,
        assignedGuardId: assignedGuard?.id,
        assignedGuardName: assignedGuard?.name,
        status: assignedGuard ? 'SCHEDULED' : 'UNASSIGNED',
      });
    }
  }

  return shifts;
}

export function formatPostLevelBadge(tier: SecurityTier | GuardRating): string {
  switch (tier) {
    case 1:
      return '[Tier 1 - Basic]';
    case 2:
      return '[Tier 2 - Certified]';
    case 3:
      return '[Tier 3 - Armed]';
    case 4:
    case 5:
      return '[Tier 4 - Spec/EP]';
    default:
      return `[Tier ${tier} - Certified]`;
  }
}

export interface RosterMatrixViewProps {
  defaultSupervisorName?: string;
}

export const RosterMatrixView: React.FC<RosterMatrixViewProps> = ({
  defaultSupervisorName = "Lt. Mark O'Connor (OPS-CMD-01)",
}) => {
  const shiftOps = useShiftOps();

  const [viewMode, setViewMode] = useState<'matrix' | 'roster'>('matrix');
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'MPU' | 'DEDICATED'>('ALL');
  const [focusedGuardId, setFocusedGuardId] = useState<string>('ALL');
  const [constraints] = useState<SchedulingConstraints>(DEFAULT_SCHEDULING_CONSTRAINTS);

  const [baseRoster, setBaseRoster] = useState<GuardProfile[]>(() => createInitialGuardRoster());
  const [shifts, setShifts] = useState<Shift[]>(() =>
    createInitialWeeklySchedule(UNIFIED_SCHEDULE_TEMPLATES, createInitialGuardRoster())
  );

  // Active Shift Assignment Picker Modal State
  const [activePickerShiftId, setActivePickerShiftId] = useState<string | null>(null);

  // Pending Override Interception Modal State
  const [pendingOverride, setPendingOverride] = useState<{
    shift: Shift;
    guard: GuardProfile;
    violations: SchedulingViolation[];
    shiftLabel: string;
  } | null>(null);

  // Auto-Fill Engine Execution Banner State
  const [lastAutoFillSummary, setLastAutoFillSummary] = useState<{
    filledCount: number;
    unassignedCount: number;
    overtimePreventedCount: number;
    logs: string[];
  } | null>(null);

  // Local Live Audit Trail feed (also synced to global context when available)
  const [localAuditFeed, setLocalAuditFeed] = useState<
    Array<{ id: string; timestamp: string; message: string; isOverride?: boolean }>
  >([
    {
      id: 'aud-init-1',
      timestamp: new Date().toISOString(),
      message:
        '[SYSTEM] Unified 8 Set Schedule Templates Loaded · 4-Tier Matrix, Availability Sync & Universal License Gate Active.',
    },
  ]);

  // Synchronize guard weeklyScheduledHours, assignedShiftIds, availability, and central credentials dynamically
  const computedRoster = useMemo<GuardProfile[]>(() => {
    const centralGuardsById = new Map(
      (shiftOps.guardsList || []).map((g) => [g.id, g])
    );

    const mergedBase = baseRoster.map((guard) => {
      const central = centralGuardsById.get(guard.id);
      if (!central) return guard;

      const rawTier = Number(central.tier ?? central.rating ?? guard.tier ?? 2);
      const nextTier: SecurityTier = (
        rawTier <= 1 ? 1 : rawTier === 2 ? 2 : rawTier === 3 ? 3 : 4
      ) as SecurityTier;

      const expDate =
        central.licenseExpirationDate !== undefined
          ? central.licenseExpirationDate
          : central.dslExpirationDate !== undefined
          ? central.dslExpirationDate
          : guard.licenseExpirationDate;

      const hasLicense =
        typeof central.hasSecurityLicense === 'boolean'
          ? central.hasSecurityLicense
          : !!expDate && expDate !== 'NO';

      const centralRecurring = Array.isArray(central.availability?.recurringUnavailableDays)
        ? central.availability.recurringUnavailableDays
        : Array.isArray(central.availability?.weeklyRules)
        ? central.availability.weeklyRules
            .filter((r) => r.isAvailable === false || r.status === 'unavailable')
            .map((r) => r.dayLabel)
        : null;

      const centralBlackout = Array.isArray(central.availability?.blackoutDates)
        ? central.availability.blackoutDates
        : null;

      return {
        ...guard,
        name: central.name || guard.name,
        badgeNumber: central.badgeNumber || guard.badgeNumber,
        phone: central.phone || guard.phone,
        tier: nextTier,
        rating: nextTier,
        hasSecurityLicense: hasLicense,
        licenseExpirationDate: hasLicense ? expDate : null,
        dslExpirationDate: hasLicense ? expDate : null,
        availability: {
          recurringUnavailableDays:
            centralRecurring && centralRecurring.length > 0
              ? centralRecurring
              : guard.availability.recurringUnavailableDays,
          blackoutDates:
            centralBlackout && centralBlackout.length > 0
              ? centralBlackout
              : guard.availability.blackoutDates,
        },
      };
    });

    for (const cg of shiftOps.guardsList || []) {
      if (!mergedBase.some((b) => b.id === cg.id)) {
        const expDate = cg.licenseExpirationDate ?? cg.dslExpirationDate ?? null;
        const hasLicense =
          typeof cg.hasSecurityLicense === 'boolean'
            ? cg.hasSecurityLicense
            : !!expDate && expDate !== 'NO';
        const st = calculateLicenseStatus(hasLicense ? expDate : null);
        const rawTier = Number(cg.tier ?? cg.rating ?? 2);
        const tier: SecurityTier = (
          rawTier <= 1 ? 1 : rawTier === 2 ? 2 : rawTier === 3 ? 3 : 4
        ) as SecurityTier;

        const recurringUnavailableDays = Array.isArray(
          cg.availability?.recurringUnavailableDays
        )
          ? cg.availability.recurringUnavailableDays
          : Array.isArray(cg.availability?.weeklyRules)
          ? cg.availability.weeklyRules
              .filter((r) => r.isAvailable === false || r.status === 'unavailable')
              .map((r) => r.dayLabel)
          : [];

        mergedBase.push({
          id: cg.id,
          name: cg.name,
          badgeNumber: cg.badgeNumber,
          phone: cg.phone,
          tier,
          hasSecurityLicense: hasLicense,
          licenseExpirationDate: hasLicense ? expDate : null,
          rating: tier,
          dslExpirationDate: hasLicense ? expDate : null,
          licenseStatus: st.status,
          daysUntilExpiration: st.daysUntilExpiration,
          daysExpired: st.daysExpired,
          denverEligible: st.denverEligible,
          availability: {
            recurringUnavailableDays,
            blackoutDates: cg.availability?.blackoutDates || [],
          },
          weeklyScheduledHours: 0,
          maxWeeklyHours: cg.maxWeeklyHours ?? 40,
          assignedShiftIds: [],
        });
      }
    }

    return mergedBase.map((guard) => {
      const assigned = shifts.filter((s) => s.assignedGuardId === guard.id);
      const totalHours =
        Math.round(assigned.reduce((acc, s) => acc + s.durationHours, 0) * 10) / 10;
      const statusInfo = calculateLicenseStatus(
        guard.hasSecurityLicense ? guard.licenseExpirationDate : null
      );
      return {
        ...guard,
        licenseStatus: statusInfo.status,
        daysUntilExpiration: statusInfo.daysUntilExpiration,
        daysExpired: statusInfo.daysExpired,
        denverEligible: statusInfo.denverEligible,
        weeklyScheduledHours: totalHours,
        assignedShiftIds: assigned.map((s) => s.id),
      };
    });
  }, [baseRoster, shifts, shiftOps.guardsList]);

  const focusedGuard = useMemo(
    () =>
      focusedGuardId !== 'ALL'
        ? computedRoster.find((g) => g.id === focusedGuardId) || null
        : null,
    [focusedGuardId, computedRoster]
  );

  const unassignedShiftsCount = useMemo(
    () =>
      shifts.filter(
        (s) => s.operatingDays.includes(s.dayOfWeek) && !s.assignedGuardId
      ).length,
    [shifts]
  );

  // Sync template license requirement dynamically if the matching site in shiftOps.sitesList was toggled
  const syncedTemplates = useMemo<ScheduleTemplate[]>(() => {
    const sites = shiftOps.sitesList || [];
    return UNIFIED_SCHEDULE_TEMPLATES.map((tpl) => {
      const matchedSite = sites.find(
        (s) =>
          s.code.toLowerCase() === tpl.siteCode.toLowerCase() ||
          s.name.toLowerCase() === tpl.siteName.toLowerCase()
      );
      if (!matchedSite) return tpl;
      const reqLicense =
        typeof matchedSite.requiresSecurityLicense === 'boolean'
          ? matchedSite.requiresSecurityLicense
          : tpl.requiresSecurityLicense;
      const reqTier: SecurityTier = (matchedSite.requiredTier ?? tpl.requiredTier) as SecurityTier;
      return {
        ...tpl,
        requiresSecurityLicense: reqLicense,
        requiresDenverLicense: reqLicense,
        requiredTier: reqTier,
        requiredRating: reqTier,
      };
    });
  }, [shiftOps.sitesList]);

  const filteredTemplates = useMemo(() => {
    if (shiftFilter === 'ALL') return syncedTemplates;
    return syncedTemplates.filter((t) => t.serviceCategory === shiftFilter);
  }, [shiftFilter, syncedTemplates]);

  const shiftById = useMemo(() => {
    const map = new Map<string, Shift>();
    for (const s of shifts) {
      const tpl = syncedTemplates.find((t) => s.id.startsWith(t.id));
      map.set(
        s.id,
        tpl
          ? {
              ...s,
              requiresSecurityLicense: tpl.requiresSecurityLicense,
              requiresDenverLicense: tpl.requiresSecurityLicense,
              requiredTier: tpl.requiredTier,
              requiredRating: tpl.requiredTier,
            }
          : s
      );
    }
    return map;
  }, [shifts, syncedTemplates]);

  const activePickerShift = useMemo(
    () => (activePickerShiftId ? shiftById.get(activePickerShiftId) || null : null),
    [activePickerShiftId, shiftById]
  );

  const appendAuditEntry = (message: string, isOverride = false) => {
    const nowIso = new Date().toISOString();
    setLocalAuditFeed((prev) => [
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: nowIso,
        message,
        isOverride,
      },
      ...prev,
    ]);

    if (shiftOps?.logAdminAction) {
      shiftOps.logAdminAction({
        type: 'shift_filled',
        title: isOverride ? 'Scheduling Override Authorized' : 'Matrix Schedule Updated',
        description: message,
        adminName: defaultSupervisorName,
        adminBadge: 'OPS-CMD-01',
        badgeVariant: isOverride ? 'rose' : 'emerald',
      });
    }
  };

  // Run Stateful Multi-Day Auto-Fill Engine
  const handleRunAutoFillEngine = () => {
    const allSyncedShifts = Array.from(shiftById.values());
    const openShifts = allSyncedShifts.filter(
      (s) => s.operatingDays.includes(s.dayOfWeek) && !s.assignedGuardId
    );
    const assignedShifts = allSyncedShifts.filter((s) => Boolean(s.assignedGuardId));

    const result = autoFillShifts(openShifts, computedRoster, assignedShifts, constraints);

    const updatedMap = new Map<string, Shift>();
    for (const s of result.updatedShifts) {
      updatedMap.set(s.id, {
        ...s,
        status: s.assignedGuardId ? 'SCHEDULED' : 'UNASSIGNED',
      });
    }

    setShifts((prev) => prev.map((s) => updatedMap.get(s.id) || s));
    setBaseRoster(result.updatedRoster);
    setLastAutoFillSummary(result.executionSummary);

    appendAuditEntry(
      `[AUTO-FILL ENGINE] Filled ${result.executionSummary.filledCount} shift(s), ${result.executionSummary.unassignedCount} left OPEN (${result.executionSummary.overtimePreventedCount} availability/license/overtime blocks).`
    );

    if (shiftOps?.showToast) {
      shiftOps.showToast(
        'Auto-Fill Engine Executed',
        `Assigned ${result.executionSummary.filledCount} shifts • ${result.executionSummary.unassignedCount} shifts remain open.`,
        result.executionSummary.unassignedCount > 0 ? 'warning' : 'success'
      );
    }
  };

  // Handle Manual Guard Selection for a Cell
  const handleSelectCandidateForShift = (targetShift: Shift, candidate: GuardProfile) => {
    const existingForGuard = Array.from(shiftById.values()).filter(
      (s) => s.assignedGuardId === candidate.id && s.id !== targetShift.id
    );

    const templateDef = syncedTemplates.find((t) =>
      targetShift.id.startsWith(t.id)
    );
    const shiftLabel = templateDef
      ? `${templateDef.shiftName} (${targetShift.dayOfWeek})`
      : `${targetShift.siteName} (${targetShift.dayOfWeek})`;

    const eligibility = checkShiftEligibility(
      candidate,
      targetShift,
      existingForGuard,
      constraints
    );

    if (eligibility.eligible) {
      // Assign directly without override
      setShifts((prev) =>
        prev.map((s) =>
          s.id === targetShift.id
            ? {
                ...s,
                assignedGuardId: candidate.id,
                assignedGuardName: candidate.name,
                status: 'SCHEDULED',
                isOverride: false,
                overrideDetails: undefined,
              }
            : s
        )
      );
      setActivePickerShiftId(null);
      appendAuditEntry(
        `[ASSIGNED] ${candidate.name} (${candidate.badgeNumber}) -> ${targetShift.siteName} (${targetShift.dayOfWeek} ${targetShift.startTime}-${targetShift.endTime}, ${targetShift.durationHours}h)`
      );
      if (shiftOps?.showToast) {
        shiftOps.showToast(
          'Shift Assigned',
          `${candidate.name} assigned to ${targetShift.siteName} (${targetShift.dayOfWeek}).`,
          'success'
        );
      }
    } else {
      // Intercept with Administrative Override Modal
      setActivePickerShiftId(null);
      setPendingOverride({
        shift: targetShift,
        guard: candidate,
        violations: eligibility.violations,
        shiftLabel,
      });
    }
  };

  const handleUnassignShift = (targetShift: Shift) => {
    const prevGuardName = targetShift.assignedGuardName || 'Officer';
    setShifts((prev) =>
      prev.map((s) =>
        s.id === targetShift.id
          ? {
              ...s,
              assignedGuardId: undefined,
              assignedGuardName: undefined,
              status: 'UNASSIGNED',
              isOverride: false,
              overrideDetails: undefined,
            }
          : s
      )
    );
    setActivePickerShiftId(null);
    appendAuditEntry(
      `[UNASSIGNED] Cleared ${prevGuardName} from ${targetShift.siteName} (${targetShift.dayOfWeek}). Post reopened.`
    );
  };

  const handleResetDemoSchedule = () => {
    const freshRoster = createInitialGuardRoster();
    setBaseRoster(freshRoster);
    setShifts(createInitialWeeklySchedule(syncedTemplates, freshRoster));
    setLastAutoFillSummary(null);
    appendAuditEntry('[RESET] Weekly Shift Matrix restored to baseline 8-template schedule.');
  };

  return (
    <section
      id="command-cad-roster-matrix-view"
      className="bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col"
    >
      {/* Top Module Bar: View Mode Toggle + Summary Counters */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              id="toggle-weekly-shift-matrix-btn"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'matrix'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              [ 📋 Weekly Shift Matrix ]
            </button>
            <button
              type="button"
              id="toggle-guard-compliance-roster-btn"
              onClick={() => setViewMode('roster')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'roster'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              [ 👥 Guard Hours &amp; Compliance Roster ]
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden xl:inline">
            8 Unified Set Schedules · 4-Tier Matrix · Availability Sync · Universal License Gate
          </span>
        </div>

        {/* Header Controls for Filter & Auto-Fill Engine */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Officer Availability Overlay Filter for Weekly Shift Matrix */}
          {viewMode === 'matrix' && (
            <select
              id="matrix-guard-availability-filter"
              value={focusedGuardId}
              onChange={(e) => setFocusedGuardId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
              title="Overlay an officer's availability across the Weekly Shift Matrix"
            >
              <option value="ALL">Overlay Availability: All Officers</option>
              {computedRoster.map((g) => (
                <option key={g.id} value={g.id}>
                  Availability: {g.name} (Tier {g.tier})
                </option>
              ))}
            </select>
          )}

          {/* Shift Filter: All Sites, MPU Only, Dedicated Posts */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setShiftFilter('ALL')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                shiftFilter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Sites ({syncedTemplates.length})
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter('MPU')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                shiftFilter === 'MPU'
                  ? 'bg-cyan-600 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MPU Only
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter('DEDICATED')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                shiftFilter === 'DEDICATED'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dedicated Posts
            </button>
          </div>

          {/* [ ⚡ Run Auto-Fill Engine ] Button */}
          <button
            type="button"
            id="run-autofill-engine-matrix-btn"
            onClick={handleRunAutoFillEngine}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-wide flex items-center gap-2 border border-emerald-400/50 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>[ ⚡ Run Auto-Fill Engine ]</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-950/70 text-emerald-300 font-mono text-[11px] tabular-nums">
              {unassignedShiftsCount} Open
            </span>
          </button>

          <button
            type="button"
            onClick={handleResetDemoSchedule}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs cursor-pointer"
            title="Reset Weekly Matrix to Baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Auto-Fill Execution Summary Banner (When triggered) */}
      {lastAutoFillSummary && (
        <div className="p-3.5 bg-slate-900/95 border-b border-slate-800 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-1 font-mono tabular-nums">
                <CheckCircle2 className="w-4 h-4" />
                Filled: {lastAutoFillSummary.filledCount}
              </span>
              <span className="text-slate-600">·</span>
              <span className="font-bold text-rose-400 font-mono tabular-nums">
                Unassigned: {lastAutoFillSummary.unassignedCount}
              </span>
              <span className="text-slate-600">·</span>
              <span className="font-bold text-amber-300 font-mono tabular-nums">
                Overtime / License / Availability Prevented: {lastAutoFillSummary.overtimePreventedCount}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLastAutoFillSummary(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          {lastAutoFillSummary.logs.length > 0 && (
            <div className="max-h-28 overflow-y-auto bg-slate-950 border border-slate-800 rounded p-2 font-mono text-[11px] space-y-1">
              {lastAutoFillSummary.logs.map((entry, idx) => (
                <div
                  key={idx}
                  className={
                    entry.startsWith('[OPEN]') ? 'text-rose-400' : 'text-emerald-400'
                  }
                >
                  {entry}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: WEEKLY SHIFT MATRIX (SITE & POST CENTRIC)                         */}
      {/* ========================================================================= */}
      {viewMode === 'matrix' ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3 min-w-[190px]">Shift Name</th>
                <th className="py-3 px-3 min-w-[195px]">Site &amp; License Policy</th>
                <th className="py-3 px-2.5 min-w-[120px]">Required Tier</th>
                <th className="py-3 px-2.5 min-w-[95px]">Duration</th>
                {DAYS_OF_WEEK.map((d) => (
                  <th
                    key={d.key}
                    className="py-3 px-2 min-w-[132px] text-center font-mono"
                  >
                    {d.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {filteredTemplates.map((site) => (
                <tr
                  key={site.id}
                  className="hover:bg-slate-900/40 transition-colors align-top"
                >
                  {/* Shift Name */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-100">{site.shiftName}</div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {site.siteCode} · {site.serviceCategory}
                    </div>
                  </td>

                  {/* Site & License Policy */}
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-200 mb-1">{site.siteName}</div>
                    {site.requiresSecurityLicense ? (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 whitespace-nowrap">
                        [SECURITY LICENSE REQ]
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                        [NO LICENSE REQ - TIER 1]
                      </span>
                    )}
                  </td>

                  {/* Post Tier */}
                  <td className="py-3 px-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold border whitespace-nowrap ${
                        site.requiredTier === 4
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                          : site.requiredTier === 3
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          : site.requiredTier === 2
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {formatPostLevelBadge(site.requiredTier)}
                    </span>
                  </td>

                  {/* Duration */}
                  <td className="py-3 px-2.5 font-mono tabular-nums text-slate-200">
                    <div className="font-bold">{site.durationHours.toFixed(1)}h</div>
                    <div className="text-[10px] text-slate-400">
                      {site.startTime}–{site.endTime}
                    </div>
                  </td>

                  {/* Day Cells (Sun - Sat) with Operational Day & Availability Gating */}
                  {OPERATING_DAYS.map((day) => {
                    const isOperational = site.operatingDays.includes(day);

                    if (!isOperational) {
                      return (
                        <td key={day} className="p-1.5 align-middle">
                          <div className="h-full w-full py-3 text-center text-xs text-slate-600 bg-slate-900/40 border border-slate-800/40 rounded flex items-center justify-center font-medium">
                            {' '}
                            —{' '}
                          </div>
                        </td>
                      );
                    }

                    const cellShiftId = `${site.id}:${day}`;
                    const cellShift = shiftById.get(cellShiftId);
                    const assignedGuardId = cellShift?.assignedGuardId;
                    const assignedGuard = assignedGuardId
                      ? computedRoster.find((g) => g.id === assignedGuardId)
                      : undefined;

                    // If a guard is focused in the Availability Overlay and is unavailable on this day
                    if (
                      focusedGuard &&
                      isGuardUnavailableOnDay(focusedGuard, day, cellShift?.date)
                    ) {
                      return (
                        <td key={day} className="p-1.5 align-middle">
                          <button
                            type="button"
                            onClick={() =>
                              cellShift &&
                              handleSelectCandidateForShift(cellShift, focusedGuard)
                            }
                            className="w-full bg-slate-900/80 border border-slate-800 text-slate-500 font-medium text-xs text-center py-2 flex items-center justify-center gap-1 rounded cursor-pointer hover:border-rose-500/50 transition-colors"
                            style={{
                              backgroundImage:
                                'repeating-linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0px, rgba(15, 23, 42, 0.85) 6px, rgba(30, 41, 59, 0.55) 6px, rgba(30, 41, 59, 0.55) 12px)',
                            }}
                            title={`${focusedGuard.name} is marked unavailable on ${day}. Click to trigger manual override.`}
                          >
                            <span>🚫 UNAVAILABLE</span>
                          </button>
                        </td>
                      );
                    }

                    if (!assignedGuardId || !assignedGuard || !cellShift) {
                      // Check if the template's default guard is unavailable on this open day
                      const defaultGuard = site.defaultGuardId
                        ? computedRoster.find((g) => g.id === site.defaultGuardId)
                        : undefined;
                      const isDefaultGuardUnavailable =
                        defaultGuard &&
                        isGuardUnavailableOnDay(defaultGuard, day, cellShift?.date);

                      return (
                        <td key={day} className="p-1.5 align-middle">
                          <div className="space-y-1">
                            {isDefaultGuardUnavailable && (
                              <div
                                onClick={() =>
                                  cellShift &&
                                  defaultGuard &&
                                  handleSelectCandidateForShift(cellShift, defaultGuard)
                                }
                                className="bg-slate-900/80 border border-slate-800 text-slate-500 font-medium text-xs text-center py-2 flex items-center justify-center gap-1 rounded cursor-pointer hover:border-rose-500/40"
                                style={{
                                  backgroundImage:
                                    'repeating-linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0px, rgba(15, 23, 42, 0.85) 6px, rgba(30, 41, 59, 0.55) 6px, rgba(30, 41, 59, 0.55) 12px)',
                                }}
                                title={`${defaultGuard.name} is unavailable on ${day}. Click to force override or use [+ Open Shift] below.`}
                              >
                                <span>🚫 UNAVAILABLE</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => cellShift && setActivePickerShiftId(cellShift.id)}
                              className="w-full bg-rose-500/10 border border-rose-500/40 text-rose-400 font-semibold text-xs p-2 text-center rounded cursor-pointer hover:bg-rose-500/20 transition-colors whitespace-nowrap"
                            >
                              [+ Open Shift]
                            </button>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={day} className="p-1.5 align-middle">
                        <button
                          type="button"
                          onClick={() => setActivePickerShiftId(cellShift.id)}
                          className={`w-full text-left p-2 rounded border transition-colors cursor-pointer ${
                            cellShift.isOverride
                              ? 'bg-amber-950/40 border-amber-500/60 hover:bg-amber-950/60'
                              : 'bg-slate-900 border-slate-700/80 hover:border-blue-500/60 hover:bg-slate-800/80'
                          }`}
                          title={
                            cellShift.isOverride && cellShift.overrideDetails
                              ? `Override by ${cellShift.overrideDetails.authorizedBy}: ${cellShift.overrideDetails.reason}`
                              : 'Click to reassign or open shift'
                          }
                        >
                          <div className="font-bold text-slate-100 truncate text-xs">
                            {assignedGuard.name}
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                              {assignedGuard.badgeNumber} · T{assignedGuard.tier}
                            </span>
                            {cellShift.isOverride && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black bg-rose-500/25 text-rose-300 border border-rose-500/50">
                                [OVERRIDE]
                              </span>
                            )}
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: GUARD HOURS & COMPLIANCE ROSTER (PERSONNEL CENTRIC)               */
        /* ========================================================================= */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3 min-w-[180px]">Guard Name &amp; Badge</th>
                <th className="py-3 px-2.5 min-w-[125px]">Security Tier</th>
                <th className="py-3 px-2.5 min-w-[140px]">SECURITY LICENSE EXPIRATION</th>
                <th className="py-3 px-3 min-w-[210px]">License Status</th>
                {DAYS_OF_WEEK.map((d) => (
                  <th
                    key={d.key}
                    className="py-3 px-2 min-w-[120px] text-center font-mono"
                  >
                    {d.short}
                  </th>
                ))}
                <th className="py-3 px-3 min-w-[155px] text-right">Total Weekly Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {computedRoster.map((guard) => {
                const totalHours = guard.weeklyScheduledHours;

                return (
                  <tr
                    key={guard.id}
                    className="hover:bg-slate-900/40 transition-colors align-middle"
                  >
                    {/* Guard Name & Badge */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{guard.name}</div>
                      <div className="text-[11px] font-mono text-blue-400">
                        {guard.badgeNumber}
                      </div>
                    </td>

                    {/* Security Tier */}
                    <td className="py-3 px-2.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700 whitespace-nowrap">
                        Tier {guard.tier}
                      </span>
                    </td>

                    {/* Security License Expiration */}
                    <td className="py-3 px-2.5 font-mono tabular-nums text-slate-200">
                      {guard.hasSecurityLicense && guard.licenseExpirationDate ? (
                        guard.licenseExpirationDate
                      ) : (
                        <span className="text-rose-400 font-bold">NO CERT</span>
                      )}
                    </td>

                    {/* License Status Badge */}
                    <td className="py-3 px-3">
                      {guard.licenseStatus === 'COMPLIANT' && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                          Valid ({guard.daysUntilExpiration}d left)
                        </span>
                      )}
                      {guard.licenseStatus === 'EXPIRING_SOON' && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                          Expiring in {guard.daysUntilExpiration}d
                        </span>
                      )}
                      {guard.licenseStatus === 'EXPIRED_GRACE' && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-rose-500/20 text-amber-200 border border-rose-500/60 animate-pulse whitespace-nowrap">
                          Grace: {guard.daysExpired}d Expired ({90 - guard.daysExpired}d to renew)
                        </span>
                      )}
                      {guard.licenseStatus === 'REVOKED' && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-rose-950 text-rose-300 border border-rose-600 whitespace-nowrap">
                          License Lapsed (&gt;90d) - Tier 1 Only
                        </span>
                      )}
                    </td>

                    {/* Sun - Sat Assigned Shifts or Availability Block for this Guard */}
                    {DAYS_OF_WEEK.map((day) => {
                      const dayShifts = Array.from(shiftById.values()).filter(
                        (s) => s.assignedGuardId === guard.id && s.dayOfWeek === day.key
                      );
                      const isUnavailable = isGuardUnavailableOnDay(guard, day.key);

                      if (dayShifts.length === 0) {
                        if (isUnavailable) {
                          const openOnDay = Array.from(shiftById.values()).find(
                            (s) =>
                              s.dayOfWeek === day.key &&
                              s.operatingDays.includes(day.key) &&
                              !s.assignedGuardId
                          );
                          const fallbackShiftForDay =
                            openOnDay ||
                            Array.from(shiftById.values()).find(
                              (s) =>
                                s.dayOfWeek === day.key && s.operatingDays.includes(day.key)
                            );

                          return (
                            <td key={day.key} className="p-1.5 align-middle">
                              <div
                                onClick={() => {
                                  if (fallbackShiftForDay) {
                                    handleSelectCandidateForShift(fallbackShiftForDay, guard);
                                  }
                                }}
                                className="bg-slate-900/80 border border-slate-800 text-slate-500 font-medium text-xs text-center py-2 flex items-center justify-center gap-1 rounded cursor-pointer hover:border-rose-500/40 transition-colors"
                                style={{
                                  backgroundImage:
                                    'repeating-linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0px, rgba(15, 23, 42, 0.85) 6px, rgba(30, 41, 59, 0.55) 6px, rgba(30, 41, 59, 0.55) 12px)',
                                }}
                                title={`${guard.name} is marked unavailable on ${day.key}. Click to attempt manual override assignment.`}
                              >
                                <span>🚫 UNAVAILABLE</span>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={day.key}
                            className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600"
                          >
                            OFF
                          </td>
                        );
                      }

                      return (
                        <td key={day.key} className="p-1.5 align-middle">
                          <div className="space-y-1">
                            {dayShifts.map((ds) => (
                              <div
                                key={ds.id}
                                className={`p-1.5 rounded border text-[10px] font-mono tabular-nums ${
                                  ds.isOverride
                                    ? 'bg-amber-950/50 border-amber-500/50 text-amber-200'
                                    : 'bg-slate-900 border-slate-700 text-slate-200'
                                }`}
                              >
                                <div className="font-bold truncate">{ds.siteCode}</div>
                                <div className="text-slate-400">
                                  {ds.startTime} ({ds.durationHours}h)
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}

                    {/* Total Weekly Hours Column */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      <div className="inline-flex justify-end">
                        {totalHours < 30.0 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                            {totalHours.toFixed(1)} hrs
                          </span>
                        ) : totalHours <= 40.0 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            {totalHours.toFixed(1)} hrs
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-rose-500/20 text-rose-300 border border-rose-500 font-bold flex items-center gap-1 whitespace-nowrap">
                            <span>⚠️ {totalHours.toFixed(1)} hrs (OT)</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Compact Live Audit Terminal Strip for Scheduling & Override Events */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            Live Scheduling &amp; Compliance Audit Stream
          </span>
          <span className="text-[10px] font-mono text-slate-400 tabular-nums">
            {localAuditFeed.length} events
          </span>
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[11px] bg-slate-950 border border-slate-800/90 rounded p-2">
          {localAuditFeed.map((item) => (
            <div
              key={item.id}
              className={
                item.isOverride
                  ? 'text-rose-300 font-semibold'
                  : item.message.startsWith('[UNASSIGNED]')
                  ? 'text-amber-300'
                  : 'text-emerald-300'
              }
            >
              <span className="text-slate-500 mr-2">
                [
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
                ]
              </span>
              {item.message}
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CANDIDATE ASSIGNMENT / REASSIGNMENT SELECTOR MODAL                        */}
      {/* ========================================================================= */}
      {activePickerShift && (
        <div
          id="shift-candidate-picker-modal"
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
        >
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-slate-100 overflow-hidden">
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  <span>
                    {activePickerShift.assignedGuardId
                      ? 'Reassign or Manage Shift'
                      : 'Assign Officer to Open Shift'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {activePickerShift.siteName} · {activePickerShift.dayOfWeek}{' '}
                  {activePickerShift.startTime}–{activePickerShift.endTime} (
                  {activePickerShift.durationHours.toFixed(1)}h) · Req Tier{' '}
                  {activePickerShift.requiredTier}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePickerShiftId(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {activePickerShift.assignedGuardId && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="text-slate-400">Currently Rostered: </span>
                    <strong className="text-white">
                      {activePickerShift.assignedGuardName}
                    </strong>
                    {activePickerShift.isOverride && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        [OVERRIDE]
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnassignShift(activePickerShift)}
                    className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Unassign / Reopen</span>
                  </button>
                </div>
              )}

              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Officer (Evaluates Availability, 4-Tier Matrix, License, 40h Cap &amp; 12h Rest)
              </div>

              <div className="space-y-2">
                {computedRoster.map((candidate) => {
                  const existingForCandidate = Array.from(shiftById.values()).filter(
                    (s) =>
                      s.assignedGuardId === candidate.id && s.id !== activePickerShift.id
                  );
                  const check = checkShiftEligibility(
                    candidate,
                    activePickerShift,
                    existingForCandidate,
                    constraints
                  );
                  const isCurrentlyAssigned =
                    activePickerShift.assignedGuardId === candidate.id;
                  const isUnavailableToday = isGuardUnavailableOnDay(
                    candidate,
                    activePickerShift.dayOfWeek,
                    activePickerShift.date
                  );

                  return (
                    <div
                      key={candidate.id}
                      className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        check.eligible
                          ? 'bg-slate-950/90 border-slate-800 hover:border-emerald-500/50'
                          : 'bg-rose-950/20 border-rose-500/30'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">
                            {candidate.name}
                          </span>
                          <span className="text-[11px] font-mono text-blue-400">
                            {candidate.badgeNumber}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            Tier {candidate.tier}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                            {candidate.weeklyScheduledHours.toFixed(1)}h / 40h
                          </span>
                          {isUnavailableToday && (
                            <span className="bg-slate-900/80 border border-slate-800 text-slate-500 font-medium text-xs text-center py-0.5 px-2 rounded flex items-center justify-center gap-1">
                              🚫 UNAVAILABLE
                            </span>
                          )}
                        </div>

                        {check.eligible ? (
                          <div className="text-[11px] text-emerald-400 font-mono">
                            ✓ Compliant &amp; Eligible (Projected:{' '}
                            {(
                              candidate.weeklyScheduledHours +
                              activePickerShift.durationHours
                            ).toFixed(1)}
                            h)
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {check.violations.map((v, i) => (
                              <div
                                key={i}
                                className="text-[11px] text-rose-400 font-mono flex items-center gap-1"
                              >
                                <span>⚠️ {v.type}:</span>
                                <span className="truncate">{v.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isCurrentlyAssigned}
                        onClick={() =>
                          handleSelectCandidateForShift(activePickerShift, candidate)
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer transition-colors whitespace-nowrap ${
                          isCurrentlyAssigned
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : check.eligible
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50'
                        }`}
                      >
                        {isCurrentlyAssigned
                          ? 'Assigned'
                          : check.eligible
                          ? 'Assign Officer'
                          : 'Assign (Requires Override)'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADMINISTRATIVE OVERRIDE MODAL                                             */}
      {/* ========================================================================= */}
      <SchedulingOverrideModal
        isOpen={Boolean(pendingOverride)}
        shift={pendingOverride?.shift || null}
        guard={pendingOverride?.guard || null}
        violations={pendingOverride?.violations || []}
        shiftLabel={pendingOverride?.shiftLabel}
        defaultSupervisor={defaultSupervisorName}
        onCancel={() => setPendingOverride(null)}
        onConfirmOverride={({ shift: overriddenShift, auditLogMessage }) => {
          setShifts((prev) =>
            prev.map((s) =>
              s.id === overriddenShift.id
                ? { ...overriddenShift, status: 'SCHEDULED' }
                : s
            )
          );
          setPendingOverride(null);
          appendAuditEntry(auditLogMessage, true);

          if (shiftOps?.showToast) {
            shiftOps.showToast(
              'Scheduling Override Logged',
              auditLogMessage,
              'warning'
            );
          }
        }}
      />
    </section>
  );
};

export default RosterMatrixView;

