import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Car,
  Wrench,
  Volume2,
  ShieldAlert,
  Plus,
  Clock,
  MapPin,
  FileText,
  Search,
  Upload,
  X,
  Zap,
  Eye,
  RotateCcw,
  Building2,
  Sparkles
} from 'lucide-react';
import {
  IssueCategory,
  IssueStatus,
  InfractionMatchKey,
  DARLogReference,
  SiteIssue,
  SiteIssueUpdate
} from '../../types/siteIssues';
import {
  evaluateInfractionHistory,
  normalizeInfractionKey,
  inferMatchKeyType,
  INITIAL_SITE_ISSUES,
  INITIAL_CROSS_SHIFT_DAR_LOGS
} from '../../utils/chronicDetectionEngine';
import { useShiftOps } from '../../context/ShiftOpsContext';

const STORAGE_KEY_SITE_ISSUES = 'secureshift_site_issues_v1';
const STORAGE_KEY_DAR_LOG_REFS = 'secureshift_dar_log_refs_v1';
const SYNC_EVENT_NAME = 'secureshift_site_issues_updated';

export function loadStoredSiteIssues(): SiteIssue[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SITE_ISSUES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_SITE_ISSUES;
}

export function saveStoredSiteIssues(issues: SiteIssue[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SITE_ISSUES, JSON.stringify(issues));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME));
    }, 0);
  } catch {}
}

export function loadStoredDarLogRefs(): DARLogReference[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DAR_LOG_REFS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_CROSS_SHIFT_DAR_LOGS;
}

export function saveStoredDarLogRefs(logs: DARLogReference[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DAR_LOG_REFS, JSON.stringify(logs));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME));
    }, 0);
  } catch {}
}

export function useSiteIssuesStore() {
  const [siteIssues, setSiteIssuesState] = useState<SiteIssue[]>(() => loadStoredSiteIssues());
  const [darLogs, setDarLogsState] = useState<DARLogReference[]>(() => loadStoredDarLogRefs());

  useEffect(() => {
    const handleSync = () => {
      setSiteIssuesState(loadStoredSiteIssues());
      setDarLogsState(loadStoredDarLogRefs());
    };
    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const updateSiteIssues = useCallback((updater: SiteIssue[] | ((prev: SiteIssue[]) => SiteIssue[])) => {
    const current = loadStoredSiteIssues();
    const next = typeof updater === 'function' ? updater(current) : updater;
    saveStoredSiteIssues(next);
    setSiteIssuesState(next);
  }, []);

  const updateDarLogs = useCallback((updater: DARLogReference[] | ((prev: DARLogReference[]) => DARLogReference[])) => {
    const current = loadStoredDarLogRefs();
    const next = typeof updater === 'function' ? updater(current) : updater;
    saveStoredDarLogRefs(next);
    setDarLogsState(next);
  }, []);

  return {
    siteIssues,
    darLogs,
    updateSiteIssues,
    updateDarLogs
  };
}

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  MAINTENANCE: 'Maintenance',
  SAFETY_HAZARD: 'Safety Hazard',
  CHRONIC_LEASE_VIOLATION: 'Chronic Lease Violation',
  PARKING_VIOLATION: 'Parking Violation',
  NOISE_COMPLAINT: 'Noise Complaint',
  UNAUTHORIZED_OCCUPANT: 'Unauthorized Occupant',
  TRASH_DUMPING: 'Trash Dumping'
};

// ============================================================================
// 3. GUARD TERMINAL - LIVE IN-FORM DAR ALERT BANNER & PROCESSOR
// ============================================================================

export interface GuardDARInFormAlertBannerProps {
  siteId: string;
  siteName?: string;
  category: IssueCategory | string;
  rawKeyValue: string;
  existingLogs?: DARLogReference[];
  openTickets?: SiteIssue[];
  debounceMs?: number;
  onEvaluationChange?: (result: ReturnType<typeof evaluateInfractionHistory> & { matchKeyValue: string }) => void;
}

export const GuardDARInFormAlertBanner: React.FC<GuardDARInFormAlertBannerProps> = ({
  siteId,
  category,
  rawKeyValue,
  existingLogs,
  openTickets,
  debounceMs = 250,
  onEvaluationChange
}) => {
  const { siteIssues, darLogs } = useSiteIssuesStore();
  const [debouncedKey, setDebouncedKey] = useState<string>(rawKeyValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKey(rawKeyValue);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [rawKeyValue, debounceMs]);

  const evaluation = useMemo(() => {
    const logsToUse = existingLogs || darLogs;
    const ticketsToUse = openTickets || siteIssues.filter((t) => t.status !== 'RESOLVED');
    const result = evaluateInfractionHistory(siteId, category, debouncedKey, logsToUse, ticketsToUse);
    const matchKeyValue = normalizeInfractionKey(debouncedKey) || debouncedKey.trim();
    return {
      ...result,
      matchKeyValue
    };
  }, [siteId, category, debouncedKey, existingLogs, openTickets, darLogs, siteIssues]);

  useEffect(() => {
    if (onEvaluationChange) {
      onEvaluationChange(evaluation);
    }
  }, [evaluation, onEvaluationChange]);

  const { isChronic, matchCount, priorIncidents, activeTicket, matchKeyValue } = evaluation;

  if (!debouncedKey.trim() || (matchCount < 1 && !activeTicket)) {
    return null;
  }

  return (
    <div className="bg-amber-950/80 border border-amber-500/60 p-3 rounded-lg mt-2 text-xs">
      <div className="flex items-center gap-1.5 font-bold text-amber-300">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0"/>
        <span>
          {isChronic 
            ? `CHRONIC ISSUE ALERT (${matchCount} Previous Reports in Past 7 Days)` 
            : `PRIOR INCIDENT NOTE (${matchCount} Report in Past 7 Days)`}
        </span>
      </div>
      <p className="text-slate-300 mt-1">
        <span className="font-semibold text-white">{matchKeyValue}</span> was previously reported at this property across prior shifts:
      </p>
      <ul className="mt-1.5 space-y-1 text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800">
        {priorIncidents.slice(-2).map(log => (
          <li key={log.darId} className="flex flex-col">
            <span className="text-amber-200/90 font-medium">
              • {new Date(log.timestamp).toLocaleString()} — {log.category} ({log.guardName})
            </span>
            <span className="text-slate-400 pl-2 italic">"{log.notes}"</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 text-amber-200 font-semibold flex items-center justify-between">
        <span>
          ⚠️ Submitting this report will automatically {activeTicket ? `update Ticket #${activeTicket.id}` : 'escalate to a Chronic Issue Ticket'} and alert Command CAD.
        </span>
      </div>
    </div>
  );
};

export function processGuardDARInfractionSubmission(params: {
  siteId: string;
  siteName: string;
  category: IssueCategory;
  rawKeyValue: string;
  unitOrLocation: string;
  vehicleDetails?: string;
  title?: string;
  notes: string;
  photoUrl?: string;
  guardName: string;
  badgeNumber: string;
  shiftId?: string;
  shiftName?: string;
  existingLogs: DARLogReference[];
  siteIssues: SiteIssue[];
  updateDarLogs: (updater: (prev: DARLogReference[]) => DARLogReference[]) => void;
  updateSiteIssues: (updater: (prev: SiteIssue[]) => SiteIssue[]) => void;
  addAuditLog?: (action: string, category: string, details: string, actor: string, status: 'info' | 'success' | 'warning' | 'danger') => void;
  showToast?: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger') => void;
}): {
  newDarLog: DARLogReference;
  updatedOrCreatedTicket?: SiteIssue;
  evaluation: ReturnType<typeof evaluateInfractionHistory>;
} {
  const {
    siteId,
    siteName,
    category,
    rawKeyValue,
    unitOrLocation,
    vehicleDetails,
    title,
    notes,
    photoUrl,
    guardName,
    badgeNumber,
    shiftId = `shift-${Date.now()}`,
    shiftName = 'Active Duty Shift',
    existingLogs,
    siteIssues,
    updateDarLogs,
    updateSiteIssues,
    addAuditLog,
    showToast
  } = params;

  const matchKeyValue = normalizeInfractionKey(rawKeyValue || unitOrLocation);
  const matchKeyType: InfractionMatchKey = inferMatchKeyType(rawKeyValue || unitOrLocation, category);
  const openTickets = siteIssues.filter((t) => t.status !== 'RESOLVED');

  const evaluation = evaluateInfractionHistory(
    siteId,
    category,
    rawKeyValue || unitOrLocation,
    existingLogs,
    openTickets
  );

  const nowIso = new Date().toISOString();
  const newDarLog: DARLogReference = {
    darId: `dar-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    shiftId,
    shiftName,
    timestamp: nowIso,
    guardName,
    badgeNumber,
    category,
    notes,
    photoUrl,
    siteId,
    siteName,
    unitOrLocation: unitOrLocation || rawKeyValue,
    matchKeyType,
    matchKeyValue
  };

  updateDarLogs((prev) => [...prev, newDarLog]);

  let updatedOrCreatedTicket: SiteIssue | undefined;

  if (evaluation.suggestedAction === 'AUTO_LINK_TICKET' && evaluation.activeTicket) {
    const activeTicket = evaluation.activeTicket;
    const newRecurrenceCount = activeTicket.recurrenceCount + 1;
    const nextStatus: IssueStatus =
      activeTicket.status === 'PENDING_VERIFICATION' ? 'OPEN' : activeTicket.status;

    const newUpdate: SiteIssueUpdate = {
      id: `upd-${Date.now()}`,
      timestamp: nowIso,
      authorName: guardName,
      authorBadge: badgeNumber,
      authorRole: 'GUARD',
      shiftContext: shiftName,
      notes:
        activeTicket.status === 'PENDING_VERIFICATION'
          ? `[Auto-Linked Repeat Sighting — Reopened from Pending Verification] ${notes}`
          : `[Auto-Linked Cross-Shift Sighting #${newRecurrenceCount}] ${notes}`,
      photoUrl
    };

    updatedOrCreatedTicket = {
      ...activeTicket,
      status: nextStatus,
      recurrenceCount: newRecurrenceCount,
      isAutoEscalated: true,
      linkedDarLogs: [...activeTicket.linkedDarLogs, newDarLog],
      history: [...activeTicket.history, newUpdate]
    };

    updateSiteIssues((prev) =>
      prev.map((item) => (item.id === activeTicket.id ? updatedOrCreatedTicket! : item))
    );

    if (addAuditLog) {
      addAuditLog(
        `[CHRONIC ESCALATION] ${matchKeyValue} at ${siteName} auto-escalated (${newRecurrenceCount}x sightings) via report by ${guardName}`,
        'system',
        `[SITE ISSUE] ${nextStatus} — ${activeTicket.title} (${activeTicket.unitOrLocation}) at ${siteName} by ${guardName}`,
        `${guardName} (${badgeNumber})`,
        'warning'
      );
    }

    if (showToast) {
      showToast(
        `Ticket #${activeTicket.id} Updated (${newRecurrenceCount}x)`,
        `Linked DAR report to active Chronic Issue Ticket for ${activeTicket.unitOrLocation}.`,
        'warning'
      );
    }
  } else if (evaluation.suggestedAction === 'CREATE_CHRONIC_TICKET') {
    const recurrenceCount = evaluation.priorIncidents.length + 1;
    const autoTicketId = `ISS-${Math.floor(1050 + Math.random() * 8900)}`;
    const ticketTitle =
      title?.trim() ||
      `${unitOrLocation || matchKeyValue} Chronic ${CATEGORY_LABELS[category] || category}`;

    const initialHistory: SiteIssueUpdate = {
      id: `upd-${Date.now()}`,
      timestamp: nowIso,
      authorName: guardName,
      authorBadge: badgeNumber,
      authorRole: 'GUARD',
      shiftContext: shiftName,
      notes: `Auto-escalated by Chronic Infraction Detection Engine (${recurrenceCount} sightings within 7-day rolling window). Latest report: ${notes}`,
      photoUrl
    };

    updatedOrCreatedTicket = {
      id: autoTicketId,
      siteId,
      siteName,
      category,
      status: 'OPEN',
      title: ticketTitle,
      unitOrLocation: unitOrLocation || rawKeyValue,
      vehicleDetails: vehicleDetails?.trim() || undefined,
      matchKeyType,
      matchKeyValue,
      description: notes,
      initialReportDate: evaluation.priorIncidents[0]?.timestamp || nowIso,
      reportedBy: `${guardName} (${badgeNumber})`,
      priority: recurrenceCount >= 3 || category === 'SAFETY_HAZARD' ? 'HIGH' : 'MEDIUM',
      recurrenceCount,
      isAutoEscalated: true,
      linkedDarLogs: [...evaluation.priorIncidents, newDarLog],
      history: [initialHistory]
    };

    updateSiteIssues((prev) => [updatedOrCreatedTicket!, ...prev]);

    if (addAuditLog) {
      addAuditLog(
        `[CHRONIC ESCALATION] ${matchKeyValue} at ${siteName} auto-escalated (${recurrenceCount}x sightings) via report by ${guardName}`,
        'system',
        `[SITE ISSUE] OPEN — ${ticketTitle} (${unitOrLocation || rawKeyValue}) at ${siteName} by ${guardName}`,
        `${guardName} (${badgeNumber})`,
        'danger'
      );
    }

    if (showToast) {
      showToast(
        'Chronic Issue Auto-Escalated',
        `Created Ticket #${autoTicketId} (${recurrenceCount}x sightings in 7 days) and alerted Command CAD.`,
        'danger'
      );
    }
  } else {
    // Standard 1st or 2nd sighting or direct maintenance/safety ticket
    if (category === 'MAINTENANCE' || category === 'SAFETY_HAZARD') {
      const manualTicketId = `ISS-${Math.floor(1050 + Math.random() * 8900)}`;
      const ticketTitle =
        title?.trim() || `${CATEGORY_LABELS[category]} — ${unitOrLocation || rawKeyValue}`;

      updatedOrCreatedTicket = {
        id: manualTicketId,
        siteId,
        siteName,
        category,
        status: 'OPEN',
        title: ticketTitle,
        unitOrLocation: unitOrLocation || rawKeyValue,
        vehicleDetails: vehicleDetails?.trim() || undefined,
        matchKeyType,
        matchKeyValue,
        description: notes,
        initialReportDate: nowIso,
        reportedBy: `${guardName} (${badgeNumber})`,
        priority: category === 'SAFETY_HAZARD' ? 'URGENT' : 'MEDIUM',
        recurrenceCount: 1,
        isAutoEscalated: false,
        linkedDarLogs: [newDarLog],
        history: [
          {
            id: `upd-${Date.now()}`,
            timestamp: nowIso,
            authorName: guardName,
            authorBadge: badgeNumber,
            authorRole: 'GUARD',
            shiftContext: shiftName,
            notes: `Initial field report logged: ${notes}`,
            photoUrl
          }
        ]
      };

      updateSiteIssues((prev) => [updatedOrCreatedTicket!, ...prev]);

      if (addAuditLog) {
        addAuditLog(
          `[SITE ISSUE] OPEN — ${ticketTitle} (${unitOrLocation || rawKeyValue}) at ${siteName} by ${guardName}`,
          'system',
          `[SITE ISSUE] OPEN — ${ticketTitle} (${unitOrLocation || rawKeyValue}) at ${siteName} by ${guardName}`,
          `${guardName} (${badgeNumber})`,
          'info'
        );
      }
    }
  }

  return {
    newDarLog,
    updatedOrCreatedTicket,
    evaluation
  };
}

// ============================================================================
// 4. GUARD TERMINAL - ACTIVE SITE WATCHLIST, HANDOVER & FIELD VERIFICATION
// ============================================================================

interface GuardSiteIssuesProps {
  siteId?: string;
  siteName?: string;
}

export const GuardSiteIssues: React.FC<GuardSiteIssuesProps> = ({
  siteId: propSiteId,
  siteName: propSiteName
}) => {
  const {
    activeGuard,
    activeClockedInShift,
    sitesList,
    addAuditLog,
    showToast
  } = useShiftOps();

  const { siteIssues, darLogs, updateSiteIssues, updateDarLogs } = useSiteIssuesStore();

  // Resolve active assigned property
  const currentSiteName =
    propSiteName ||
    activeClockedInShift?.siteName ||
    activeGuard.ojtSites[0] ||
    sitesList[0]?.name ||
    'Port Authority - Pier 7';

  const matchedSiteObj = useMemo(
    () =>
      sitesList.find(
        (s) =>
          (propSiteId && s.id === propSiteId) ||
          s.name.toLowerCase() === currentSiteName.toLowerCase()
      ),
    [sitesList, propSiteId, currentSiteName]
  );

  const currentSiteId = propSiteId || activeClockedInShift?.siteId || matchedSiteObj?.id || 'site-1';

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [scopeAllSites, setScopeAllSites] = useState<boolean>(false);

  // Verification Modal State (for PENDING_VERIFICATION tickets)
  const [verifyingTicket, setVerifyingTicket] = useState<SiteIssue | null>(null);
  const [verificationPhotoUrl, setVerificationPhotoUrl] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Quick Repeat Sighting / Note Modal State
  const [repeatSightingTicket, setRepeatSightingTicket] = useState<SiteIssue | null>(null);
  const [sightingNotes, setSightingNotes] = useState<string>('');
  const [sightingPhotoUrl, setSightingPhotoUrl] = useState<string>('');
  const [sightingShiftName, setSightingShiftName] = useState<string>('Night Shift');

  // In-Form Field DAR / Infraction Logger Modal State
  const [isDarFormOpen, setIsDarFormOpen] = useState<boolean>(false);
  const [darCategory, setDarCategory] = useState<IssueCategory>('NOISE_COMPLAINT');
  const [darRawKeyInput, setDarRawKeyInput] = useState<string>('Apt #304 ');
  const [darVehicleDetails, setDarVehicleDetails] = useState<string>('');
  const [darTitleInput, setDarTitleInput] = useState<string>('');
  const [darNotesInput, setDarNotesInput] = useState<string>(
    'Observed repeat noise disturbance audible from corridor during patrol sweep. Contacted occupant.'
  );
  const [darPhotoUrl, setDarPhotoUrl] = useState<string>('');

  // Filter open issues for the active property (or all sites if toggled)
  const openIssues = useMemo(() => {
    return siteIssues.filter((issue) => {
      if (issue.status === 'RESOLVED') return false;
      if (scopeAllSites) return true;
      return (
        issue.siteId === currentSiteId ||
        issue.siteName.toLowerCase() === currentSiteName.toLowerCase()
      );
    });
  }, [siteIssues, scopeAllSites, currentSiteId, currentSiteName]);

  // Categorized buckets
  const pendingVerificationIssues = useMemo(
    () => openIssues.filter((i) => i.status === 'PENDING_VERIFICATION'),
    [openIssues]
  );

  const chronicLeaseAndNoiseIssues = useMemo(
    () =>
      openIssues.filter(
        (i) =>
          i.status !== 'PENDING_VERIFICATION' &&
          (i.category === 'NOISE_COMPLAINT' ||
            i.category === 'CHRONIC_LEASE_VIOLATION' ||
            i.category === 'UNAUTHORIZED_OCCUPANT' ||
            i.category === 'TRASH_DUMPING')
      ),
    [openIssues]
  );

  const chronicParkingIssues = useMemo(
    () =>
      openIssues.filter(
        (i) => i.status !== 'PENDING_VERIFICATION' && i.category === 'PARKING_VIOLATION'
      ),
    [openIssues]
  );

  const maintenanceAndHazardIssues = useMemo(
    () =>
      openIssues.filter(
        (i) =>
          i.status !== 'PENDING_VERIFICATION' &&
          (i.category === 'MAINTENANCE' || i.category === 'SAFETY_HAZARD')
      ),
    [openIssues]
  );

  const handleOpenVerificationModal = (ticket: SiteIssue) => {
    setVerifyingTicket(ticket);
    setVerificationPhotoUrl(
      'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80'
    );
    setResolutionNotes(
      `Checked ${ticket.unitOrLocation} at ${new Date().toTimeString().slice(0, 5)}; hardware latch holds firmly and complies with post orders.`
    );
    setVerificationError(null);
  };

  const handleVerificationPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setVerificationPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmResolved = () => {
    if (!verifyingTicket) return;
    if (!verificationPhotoUrl.trim()) {
      setVerificationError('Verification photo capture/upload is required to confirm resolution.');
      return;
    }
    if (!resolutionNotes.trim()) {
      setVerificationError('Please enter field inspection resolution notes.');
      return;
    }

    const nowIso = new Date().toISOString();
    const updatedTicket: SiteIssue = {
      ...verifyingTicket,
      status: 'RESOLVED',
      verificationDetails: {
        verifiedBy: activeGuard.name,
        verifiedBadge: activeGuard.badgeNumber,
        verifiedDate: nowIso,
        verificationPhotoUrl,
        resolutionNotes: resolutionNotes.trim()
      },
      history: [
        ...verifyingTicket.history,
        {
          id: `upd-${Date.now()}`,
          timestamp: nowIso,
          authorName: activeGuard.name,
          authorBadge: activeGuard.badgeNumber,
          authorRole: 'GUARD',
          shiftContext: activeClockedInShift?.postRole || 'Active Shift',
          notes: `[FIELD VERIFICATION CONFIRMED RESOLVED] ${resolutionNotes.trim()}`,
          photoUrl: verificationPhotoUrl
        }
      ]
    };

    updateSiteIssues((prev) =>
      prev.map((item) => (item.id === verifyingTicket.id ? updatedTicket : item))
    );

    const auditMsg = `[SITE ISSUE] RESOLVED — ${verifyingTicket.title} (${verifyingTicket.unitOrLocation}) at ${verifyingTicket.siteName} by ${activeGuard.name}`;
    addAuditLog(
      auditMsg,
      'system',
      `${auditMsg} • Notes: ${resolutionNotes.trim()}`,
      `${activeGuard.name} (${activeGuard.badgeNumber})`,
      'success'
    );

    showToast(
      'Field Verification Complete',
      `Ticket #${verifyingTicket.id} marked RESOLVED with photo evidence.`,
      'success'
    );
    setVerifyingTicket(null);
  };

  const handleRejectVerificationStillBroken = () => {
    if (!verifyingTicket) return;
    if (!resolutionNotes.trim()) {
      setVerificationError('Please enter notes describing why the issue is still broken or non-compliant.');
      return;
    }

    const nowIso = new Date().toISOString();
    const newRecurrence = verifyingTicket.recurrenceCount + 1;
    const updatedTicket: SiteIssue = {
      ...verifyingTicket,
      status: 'OPEN',
      recurrenceCount: newRecurrence,
      history: [
        ...verifyingTicket.history,
        {
          id: `upd-${Date.now()}`,
          timestamp: nowIso,
          authorName: activeGuard.name,
          authorBadge: activeGuard.badgeNumber,
          authorRole: 'GUARD',
          shiftContext: activeClockedInShift?.postRole || 'Active Shift',
          notes: `[VERIFICATION REJECTED — STILL BROKEN (${newRecurrence}x)] ${resolutionNotes.trim()}`,
          photoUrl: verificationPhotoUrl || undefined
        }
      ]
    };

    updateSiteIssues((prev) =>
      prev.map((item) => (item.id === verifyingTicket.id ? updatedTicket : item))
    );

    const auditMsg = `[SITE ISSUE] OPEN — ${verifyingTicket.title} (${verifyingTicket.unitOrLocation}) at ${verifyingTicket.siteName} by ${activeGuard.name}`;
    addAuditLog(
      auditMsg,
      'system',
      `${auditMsg} (Field verification failed — flipped back to OPEN, recurrence ${newRecurrence}x)`,
      `${activeGuard.name} (${activeGuard.badgeNumber})`,
      'warning'
    );

    showToast(
      'Verification Rejected — Reopened',
      `Ticket #${verifyingTicket.id} flipped back to OPEN (Recurrence x${newRecurrence}).`,
      'warning'
    );
    setVerifyingTicket(null);
  };

  const handleOpenRepeatSightingModal = (ticket: SiteIssue) => {
    setRepeatSightingTicket(ticket);
    setSightingNotes(
      `Observed repeat ${CATEGORY_LABELS[ticket.category].toLowerCase()} at ${ticket.unitOrLocation} during patrol sweep.`
    );
    setSightingPhotoUrl('');
  };

  const handleSubmitRepeatSighting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repeatSightingTicket || !sightingNotes.trim()) return;

    const nowIso = new Date().toISOString();
    const newRecurrence = repeatSightingTicket.recurrenceCount + 1;

    const newDarRef: DARLogReference = {
      darId: `dar-${Date.now()}`,
      shiftId: activeClockedInShift?.id || `shift-${Date.now()}`,
      shiftName: sightingShiftName,
      timestamp: nowIso,
      guardName: activeGuard.name,
      badgeNumber: activeGuard.badgeNumber,
      category: repeatSightingTicket.category,
      notes: sightingNotes.trim(),
      photoUrl: sightingPhotoUrl || undefined,
      siteId: repeatSightingTicket.siteId,
      siteName: repeatSightingTicket.siteName,
      unitOrLocation: repeatSightingTicket.unitOrLocation,
      matchKeyType: repeatSightingTicket.matchKeyType,
      matchKeyValue: repeatSightingTicket.matchKeyValue
    };

    const newUpdate: SiteIssueUpdate = {
      id: `upd-${Date.now()}`,
      timestamp: nowIso,
      authorName: activeGuard.name,
      authorBadge: activeGuard.badgeNumber,
      authorRole: 'GUARD',
      shiftContext: sightingShiftName,
      notes: `[Repeat Sighting #${newRecurrence}] ${sightingNotes.trim()}`,
      photoUrl: sightingPhotoUrl || undefined
    };

    const nextStatus: IssueStatus =
      repeatSightingTicket.status === 'PENDING_VERIFICATION' ? 'OPEN' : repeatSightingTicket.status;

    const updatedTicket: SiteIssue = {
      ...repeatSightingTicket,
      status: nextStatus,
      recurrenceCount: newRecurrence,
      linkedDarLogs: [...repeatSightingTicket.linkedDarLogs, newDarRef],
      history: [...repeatSightingTicket.history, newUpdate]
    };

    updateDarLogs((prev) => [...prev, newDarRef]);
    updateSiteIssues((prev) =>
      prev.map((item) => (item.id === repeatSightingTicket.id ? updatedTicket : item))
    );

    const auditMsg = `[SITE ISSUE] ${nextStatus} — ${repeatSightingTicket.title} (${repeatSightingTicket.unitOrLocation}) at ${repeatSightingTicket.siteName} by ${activeGuard.name}`;
    addAuditLog(
      auditMsg,
      'system',
      `[CHRONIC ESCALATION] ${repeatSightingTicket.matchKeyValue} at ${repeatSightingTicket.siteName} auto-escalated (${newRecurrence}x sightings) via report by ${activeGuard.name}`,
      `${activeGuard.name} (${activeGuard.badgeNumber})`,
      'warning'
    );

    showToast(
      `Repeat Sighting Logged (x${newRecurrence})`,
      `Added sighting #${newRecurrence} to Ticket #${repeatSightingTicket.id}.`,
      'info'
    );
    setRepeatSightingTicket(null);
  };

  const handleDarFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!darRawKeyInput.trim() || !darNotesInput.trim()) return;

    processGuardDARInfractionSubmission({
      siteId: currentSiteId,
      siteName: currentSiteName,
      category: darCategory,
      rawKeyValue: darRawKeyInput,
      unitOrLocation: darRawKeyInput.trim(),
      vehicleDetails: darVehicleDetails,
      title: darTitleInput,
      notes: darNotesInput.trim(),
      photoUrl: darPhotoUrl || undefined,
      guardName: activeGuard.name,
      badgeNumber: activeGuard.badgeNumber,
      shiftId: activeClockedInShift?.id || `shift-${Date.now()}`,
      shiftName: 'Night Shift',
      existingLogs: darLogs,
      siteIssues,
      updateDarLogs,
      updateSiteIssues,
      addAuditLog,
      showToast
    });

    setIsDarFormOpen(false);
  };

  return (
    <section
      id="guard-site-issues-watchlist"
      className="bg-slate-900 text-slate-100 rounded-2xl border border-amber-500/40 shadow-xl overflow-hidden"
    >
      {/* Expandable Header Bar */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left cursor-pointer group"
        >
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono font-black text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>[ ⚠️ Active Site Issues &amp; Watchlist ({openIssues.length}) ]</span>
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white" />
          )}
        </button>

        {/* Category Counters & Quick DAR Trigger */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
          {pendingVerificationIssues.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-bold animate-pulse">
              🔍 {pendingVerificationIssues.length} Verify
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/50">
            🔊 {chronicLeaseAndNoiseIssues.length} Lease/Noise
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-700/50">
            🚗 {chronicParkingIssues.length} Parking
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/50">
            🔧 {maintenanceAndHazardIssues.length} Maint/Hazard
          </span>

          <button
            type="button"
            onClick={() => setScopeAllSites(!scopeAllSites)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            title="Toggle between assigned site and all enterprise sites"
          >
            {scopeAllSites ? 'Showing: All Sites' : `Site: ${currentSiteName.split(' - ')[0]}`}
          </button>

          <button
            type="button"
            onClick={() => setIsDarFormOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-sans font-black text-[11px] flex items-center gap-1 cursor-pointer shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Field DAR / Infraction</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 space-y-4">
          {/* 1. PENDING FIELD VERIFICATION (TOP PRIORITY BANNER) */}
          {pendingVerificationIssues.length > 0 && (
            <div className="space-y-2.5">
              {pendingVerificationIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-amber-950/50 border-2 border-cyan-400/80 ring-2 ring-amber-400/30 shadow-lg space-y-2.5 animate-pulse"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/30 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-black text-cyan-300 uppercase tracking-wide">
                        🔍 VERIFICATION REQUESTED BY COMMAND: Inspect on shift to confirm repair or compliance.
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/50">
                      Ticket #{issue.id} • {issue.siteName}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-white">{issue.title}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/40 font-bold">
                          {issue.unitOrLocation}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{issue.description}</p>
                      {issue.clientContactLog?.externalTicketRef && (
                        <p className="text-[11px] text-cyan-300 font-mono">
                          Work Order Ref: <strong>{issue.clientContactLog.externalTicketRef}</strong> ({issue.clientContactLog.contactName})
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenVerificationModal(issue)}
                        className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-black text-xs shadow-md cursor-pointer transition-colors"
                      >
                        [ 📸 Verify &amp; Mark Resolved ]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenRepeatSightingModal(issue)}
                        className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono font-bold text-[11px] cursor-pointer"
                      >
                        [ + Log Repeat Sighting / Note ]
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. CHRONIC LEASE & NOISE HOT-SPOTS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Chronic Lease &amp; Noise Hot-Spots ({chronicLeaseAndNoiseIssues.length})</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Pass-Down Watchlist</span>
            </div>

            {chronicLeaseAndNoiseIssues.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800 text-xs text-slate-400">
                No active chronic lease or noise hot-spots logged for this site.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {chronicLeaseAndNoiseIssues.map((issue) => {
                  const lastLog = issue.linkedDarLogs[issue.linkedDarLogs.length - 1];
                  return (
                    <div
                      key={issue.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/40 flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-black text-white">
                            {issue.unitOrLocation} —{' '}
                            <span className="text-purple-300 font-mono">
                              [Chronic: {issue.recurrenceCount}x Sighting]
                            </span>{' '}
                            — {CATEGORY_LABELS[issue.category]}
                          </span>
                          {issue.isAutoEscalated && (
                            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/50">
                              ⚡ AUTO-ESCALATED
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-300">{issue.description}</p>

                        {lastLog && (
                          <p className="text-[10px] font-mono text-amber-300/90">
                            Last logged {new Date(lastLog.timestamp).toLocaleString()} by {lastLog.guardName} ({lastLog.badgeNumber})
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] font-mono text-slate-400">
                          Ticket #{issue.id} • {issue.status.replace('_', ' ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenRepeatSightingModal(issue)}
                          className="px-2.5 py-1 rounded-lg bg-purple-950/90 hover:bg-purple-900 text-purple-200 border border-purple-500/50 font-mono font-bold text-[10px] cursor-pointer transition-colors"
                        >
                          [ + Log Repeat Sighting / Note ]
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. CHRONIC PARKING VIOLATORS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-blue-400" />
                <span>Chronic Parking Violators ({chronicParkingIssues.length})</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Tow / Impound Watchlist</span>
            </div>

            {chronicParkingIssues.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800 text-xs text-slate-400">
                No chronic parking violators currently flagged for this site.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {chronicParkingIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-blue-500/40 flex flex-col justify-between gap-2.5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-black text-white">
                          {issue.vehicleDetails || issue.title}{' '}
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono text-[10px]">
                            [Plate: {issue.matchKeyValue}]
                          </span>{' '}
                          — <span className="text-rose-300">{issue.recurrenceCount}x Violation</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Location: <strong>{issue.unitOrLocation}</strong> • {issue.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-mono text-slate-400">
                        Ticket #{issue.id} • {issue.priority} Priority
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenRepeatSightingModal(issue)}
                        className="px-2.5 py-1 rounded-lg bg-blue-950/90 hover:bg-blue-900 text-blue-200 border border-blue-500/50 font-mono font-bold text-[10px] cursor-pointer transition-colors"
                      >
                        [ + Log Repeat Sighting / Note ]
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. OPEN MAINTENANCE & SAFETY HAZARDS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Maintenance &amp; Safety Hazards ({maintenanceAndHazardIssues.length})</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Already Reported by Prior Shifts</span>
            </div>

            {maintenanceAndHazardIssues.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800 text-xs text-slate-400">
                No open physical hazards or maintenance issues pending at this property.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {maintenanceAndHazardIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/40 flex flex-col justify-between gap-2.5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-white">{issue.title}</span>
                        <span
                          className={`text-[9px] font-mono font-black px-2 py-0.5 rounded uppercase ${
                            issue.category === 'SAFETY_HAZARD'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                          }`}
                        >
                          {CATEGORY_LABELS[issue.category]}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        <strong className="text-amber-200">{issue.unitOrLocation}:</strong> {issue.description}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        Reported by {issue.reportedBy} • Sightings: {issue.recurrenceCount}x
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-mono text-slate-400">
                        Ticket #{issue.id} • {issue.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenRepeatSightingModal(issue)}
                        className="px-2.5 py-1 rounded-lg bg-amber-950/90 hover:bg-amber-900 text-amber-200 border border-amber-500/50 font-mono font-bold text-[10px] cursor-pointer transition-colors"
                      >
                        [ + Log Repeat Sighting / Note ]
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FIELD VERIFICATION MODAL ([ 📸 Verify & Mark Resolved ])            */}
      {/* =================================================================== */}
      {verifyingTicket && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setVerifyingTicket(null)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-cyan-500/50 rounded-2xl p-5 text-slate-100 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-cyan-400 block">
                  Command Field Verification Request • #{verifyingTicket.id}
                </span>
                <h3 className="text-base font-black text-white mt-0.5">{verifyingTicket.title}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {verifyingTicket.siteName} • {verifyingTicket.unitOrLocation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {verificationError && (
              <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500 text-xs text-rose-200">
                {verificationError}
              </div>
            )}

            {/* 1. Verification Photo Upload / Capture */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-200">
                1. Verification Photo Capture / Upload (Mandatory)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setVerificationPhotoUrl(
                      'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80'
                    )
                  }
                  className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Field Verification Photo</span>
                </button>
                <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleVerificationPhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {verificationPhotoUrl && (
                <div className="relative rounded-xl overflow-hidden border border-cyan-500/40 h-36 bg-slate-950">
                  <img
                    src={verificationPhotoUrl}
                    alt="Field Verification"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 bg-slate-950/90 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/40">
                    ✓ GPS &amp; Timestamp Verified Evidence Attached
                  </span>
                </div>
              )}
            </div>

            {/* 2. Resolution Notes input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                2. Field Inspection &amp; Resolution Notes
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder='e.g., "Checked South Gate maglock at 22:15; latch holds firmly"'
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* 3. Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleRejectVerificationStillBroken}
                className="py-2.5 px-3 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/60 text-rose-200 font-mono font-bold text-xs cursor-pointer transition-colors"
              >
                [ Still Broken / Reject ]
              </button>
              <button
                type="button"
                onClick={handleConfirmResolved}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs cursor-pointer shadow-lg transition-colors"
              >
                [ Confirm Resolved ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LOG REPEAT SIGHTING / NOTE MODAL ([ + Log Repeat Sighting / Note ]) */}
      {/* =================================================================== */}
      {repeatSightingTicket && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setRepeatSightingTicket(null)}
        >
          <form
            onSubmit={handleSubmitRepeatSighting}
            className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-2xl p-5 text-slate-100 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-amber-400 block">
                  Log Cross-Shift Sighting • Ticket #{repeatSightingTicket.id}
                </span>
                <h3 className="text-sm font-black text-white mt-0.5">
                  {repeatSightingTicket.unitOrLocation} — {repeatSightingTicket.title}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Current Tally: {repeatSightingTicket.recurrenceCount}x → New Tally:{' '}
                  <strong className="text-amber-300">{repeatSightingTicket.recurrenceCount + 1}x</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRepeatSightingTicket(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Shift Context</label>
              <select
                value={sightingShiftName}
                onChange={(e) => setSightingShiftName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="Night Shift (22:00 - 06:00)">Night Shift (22:00 - 06:00)</option>
                <option value="Swing Shift (14:00 - 22:00)">Swing Shift (14:00 - 22:00)</option>
                <option value="Day Shift (06:00 - 14:00)">Day Shift (06:00 - 14:00)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Officer Observation Note
              </label>
              <textarea
                rows={3}
                value={sightingNotes}
                onChange={(e) => setSightingNotes(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setSightingPhotoUrl(
                    'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=700&q=80'
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{sightingPhotoUrl ? '✓ Photo Attached' : '+ Attach Evidence Photo'}</span>
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
              >
                Save Sighting (#{repeatSightingTicket.recurrenceCount + 1})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* IN-FORM DAR / INFRACTION LOGGER WITH LIVE DEBOUNCED ALERT BANNER    */}
      {/* =================================================================== */}
      {isDarFormOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsDarFormOpen(false)}
        >
          <form
            onSubmit={handleDarFormSubmit}
            className="w-full max-w-lg bg-slate-900 border border-amber-500/50 rounded-2xl p-5 text-slate-100 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-amber-400 block">
                  Field DAR &amp; Chronic Infraction Correlation Logger
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  Log Property Infraction / Maintenance DAR
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Property: {currentSiteName} • Officer: {activeGuard.name} ({activeGuard.badgeNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDarFormOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Infraction / Issue Category
                </label>
                <select
                  value={darCategory}
                  onChange={(e) => setDarCategory(e.target.value as IssueCategory)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="NOISE_COMPLAINT">Noise Complaint</option>
                  <option value="PARKING_VIOLATION">Parking Violation</option>
                  <option value="CHRONIC_LEASE_VIOLATION">Chronic Lease Violation</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="SAFETY_HAZARD">Safety Hazard</option>
                  <option value="UNAUTHORIZED_OCCUPANT">Unauthorized Occupant</option>
                  <option value="TRASH_DUMPING">Trash Dumping</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Quick Demo Preset Keys
                </label>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDarCategory('NOISE_COMPLAINT');
                      setDarRawKeyInput('Apt #304 ');
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-amber-300 border border-slate-700 cursor-pointer"
                  >
                    Apt #304
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDarCategory('NOISE_COMPLAINT');
                      setDarRawKeyInput('Unit 412');
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-purple-300 border border-slate-700 cursor-pointer"
                  >
                    Unit 412 (3rd Strike)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDarCategory('PARKING_VIOLATION');
                      setDarRawKeyInput('ABC-123');
                      setDarVehicleDetails('Silver Honda Accord [Plate: ABC-123]');
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-blue-300 border border-slate-700 cursor-pointer"
                  >
                    Plate ABC-123
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDarCategory('PARKING_VIOLATION');
                      setDarRawKeyInput('WA-8849B');
                      setDarVehicleDetails('Black Ford F-150 [Plate: WA-8849B]');
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-cyan-300 border border-slate-700 cursor-pointer"
                  >
                    Plate WA-8849B
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Unit Number, License Plate, or Asset Location
              </label>
              <input
                type="text"
                value={darRawKeyInput}
                onChange={(e) => setDarRawKeyInput(e.target.value)}
                placeholder='e.g. "Apt #304", "ABC-123", or "Gate 2"'
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              />

              {/* LIVE DEBOUNCED IN-FORM DAR ALERT BANNER */}
              <GuardDARInFormAlertBanner
                siteId="ALL"
                category={darCategory}
                rawKeyValue={darRawKeyInput}
              />
            </div>

            {darCategory === 'PARKING_VIOLATION' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Vehicle Description (Make / Model / Color)
                </label>
                <input
                  type="text"
                  value={darVehicleDetails}
                  onChange={(e) => setDarVehicleDetails(e.target.value)}
                  placeholder="e.g., Silver Honda Accord [Plate: ABC-123]"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Field Observation Notes
              </label>
              <textarea
                rows={3}
                value={darNotesInput}
                onChange={(e) => setDarNotesInput(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setDarPhotoUrl(
                    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=700&q=80'
                  )
                }
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{darPhotoUrl ? '✓ Evidence Photo Attached' : '+ Capture Photo'}</span>
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
              >
                Submit DAR &amp; Run Correlation Engine
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};

export default GuardSiteIssues;
