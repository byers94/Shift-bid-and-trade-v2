import {
  IssueCategory,
  InfractionMatchKey,
  DARLogReference,
  ChronicEscalationRule,
  SiteIssue
} from '../types/siteIssues';

export const DEFAULT_CHRONIC_ESCALATION_RULES: ChronicEscalationRule[] = [
  {
    category: 'NOISE_COMPLAINT',
    thresholdCount: 2,
    rollingWindowDays: 7,
    autoEscalateToTicket: true
  },
  {
    category: 'PARKING_VIOLATION',
    thresholdCount: 2,
    rollingWindowDays: 7,
    autoEscalateToTicket: true
  },
  {
    category: 'CHRONIC_LEASE_VIOLATION',
    thresholdCount: 2,
    rollingWindowDays: 7,
    autoEscalateToTicket: true
  },
  {
    category: 'UNAUTHORIZED_OCCUPANT',
    thresholdCount: 2,
    rollingWindowDays: 7,
    autoEscalateToTicket: true
  },
  {
    category: 'TRASH_DUMPING',
    thresholdCount: 2,
    rollingWindowDays: 7,
    autoEscalateToTicket: true
  },
  {
    category: 'MAINTENANCE',
    thresholdCount: 2,
    rollingWindowDays: 7,
    autoEscalateToTicket: true
  },
  {
    category: 'SAFETY_HAZARD',
    thresholdCount: 1,
    rollingWindowDays: 7,
    autoEscalateToTicket: true
  }
];

/**
 * Strips common location/vehicle prefixes ("apt", "unit", "space", "plate", "suite", "rm")
 * and removes "#", hyphens, colons, and spaces, then uppercases.
 * Examples:
 * - "Apt #304 " -> "304"
 * - "co-xyz 123" -> "COXYZ123"
 * - "Space #45" -> "45"
 * - "Gate 2" -> "GATE2"
 */
export function normalizeInfractionKey(rawKeyValue: string): string {
  if (!rawKeyValue) return '';
  const strippedPrefixes = rawKeyValue
    .trim()
    .replace(/^(?:apartment|apt|unit|space|stall|spot|plate|lic|license|suite|ste|room|rm)\.?\s*#?\s*/i, '');

  return strippedPrefixes
    .replace(/[#\-\s:.,/\\]/g, '')
    .toUpperCase();
}

export function inferMatchKeyType(rawKeyValue: string, category?: IssueCategory | string): InfractionMatchKey {
  if (category === 'PARKING_VIOLATION' || /plate|lic/i.test(rawKeyValue)) {
    return 'LICENSE_PLATE';
  }
  if (
    category === 'NOISE_COMPLAINT' ||
    category === 'CHRONIC_LEASE_VIOLATION' ||
    /^(?:apt|apartment|unit|suite|ste|rm|room|\d+[a-z]?$)/i.test(rawKeyValue.trim())
  ) {
    return 'UNIT_NUMBER';
  }
  return 'LOCATION_ASSET';
}

function doesSiteMatch(targetSiteId: string, candidateSiteId?: string, candidateSiteName?: string): boolean {
  if (!targetSiteId || targetSiteId === 'ALL') return true;
  const normTarget = targetSiteId.trim().toLowerCase();
  if (candidateSiteId && candidateSiteId.trim().toLowerCase() === normTarget) return true;
  if (candidateSiteName && candidateSiteName.trim().toLowerCase() === normTarget) return true;
  return false;
}

function doesLogMatchNormalizedKey(log: DARLogReference, normalizedKey: string): boolean {
  if (!normalizedKey) return false;
  if (log.matchKeyValue && normalizeInfractionKey(log.matchKeyValue) === normalizedKey) {
    return true;
  }
  if (log.unitOrLocation && normalizeInfractionKey(log.unitOrLocation) === normalizedKey) {
    return true;
  }
  // Check if notes contain the exact unit/plate token
  const normNotes = normalizeInfractionKey(log.notes || '');
  if (normalizedKey.length >= 3 && normNotes.includes(normalizedKey)) {
    return true;
  }
  return false;
}

export function evaluateInfractionHistory(
  siteId: string,
  category: IssueCategory | string,
  rawKeyValue: string,
  existingLogs: DARLogReference[],
  openTickets: SiteIssue[],
  rules: ChronicEscalationRule[] = DEFAULT_CHRONIC_ESCALATION_RULES
): {
  isChronic: boolean;
  matchCount: number;
  priorIncidents: DARLogReference[];
  activeTicket?: SiteIssue;
  suggestedAction: 'WARN_ONLY' | 'AUTO_LINK_TICKET' | 'CREATE_CHRONIC_TICKET';
} {
  const normalizedKey = normalizeInfractionKey(rawKeyValue);

  if (!normalizedKey || normalizedKey.length < 2) {
    return {
      isChronic: false,
      matchCount: 0,
      priorIncidents: [],
      suggestedAction: 'WARN_ONLY'
    };
  }

  const rule =
    rules.find((r) => r.category === category) || {
      category: (category as IssueCategory) || 'CHRONIC_LEASE_VIOLATION',
      thresholdCount: 2,
      rollingWindowDays: 7,
      autoEscalateToTicket: true
    };

  const rollingWindowMs = (rule.rollingWindowDays || 7) * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();

  // 1. Filter existingLogs matching siteId and normalized key within rollingWindowDays (default 7 days)
  const matchingWindowLogs = existingLogs.filter((log) => {
    const siteMatches =
      !log.siteId && !log.siteName
        ? true
        : doesSiteMatch(siteId, log.siteId, log.siteName);
    if (!siteMatches) return false;

    if (!doesLogMatchNormalizedKey(log, normalizedKey)) return false;

    const logTimeMs = new Date(log.timestamp).getTime();
    if (Number.isNaN(logTimeMs)) return true;
    return nowMs - logTimeMs <= rollingWindowMs;
  });

  // 2. Active Ticket Lookup: check openTickets (status !== 'RESOLVED') at siteId with matching matchKeyValue
  const activeTicket = openTickets.find(
    (ticket) =>
      ticket.status !== 'RESOLVED' &&
      doesSiteMatch(siteId, ticket.siteId, ticket.siteName) &&
      (normalizeInfractionKey(ticket.matchKeyValue) === normalizedKey ||
        normalizeInfractionKey(ticket.unitOrLocation) === normalizedKey)
  );

  // Combine and deduplicate logs from matchingWindowLogs + activeTicket.linkedDarLogs
  const combinedLogsMap = new Map<string, DARLogReference>();
  matchingWindowLogs.forEach((log) => combinedLogsMap.set(log.darId, log));
  if (activeTicket) {
    activeTicket.linkedDarLogs.forEach((log) => {
      const logTimeMs = new Date(log.timestamp).getTime();
      if (Number.isNaN(logTimeMs) || nowMs - logTimeMs <= rollingWindowMs) {
        combinedLogsMap.set(log.darId, log);
      }
    });
  }

  const priorIncidents = Array.from(combinedLogsMap.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (activeTicket) {
    return {
      isChronic: true,
      matchCount: Math.max(priorIncidents.length, activeTicket.recurrenceCount),
      priorIncidents,
      activeTicket,
      suggestedAction: 'AUTO_LINK_TICKET'
    };
  }

  // 3. Threshold Escalation Check
  const threshold = rule.thresholdCount ?? 2;
  if (priorIncidents.length >= threshold) {
    return {
      isChronic: true,
      matchCount: priorIncidents.length,
      priorIncidents,
      suggestedAction: 'CREATE_CHRONIC_TICKET'
    };
  }

  if (priorIncidents.length >= 1) {
    return {
      isChronic: false,
      matchCount: priorIncidents.length,
      priorIncidents,
      suggestedAction: 'WARN_ONLY'
    };
  }

  return {
    isChronic: false,
    matchCount: 0,
    priorIncidents: [],
    suggestedAction: 'WARN_ONLY'
  };
}

// ============================================================================
// INITIAL SEED DATA FOR CROSS-SHIFT DAR LOGS & SITE ISSUES
// ============================================================================

const hoursAgoIso = (hours: number) => new Date(Date.now() - hours * 3600 * 1000).toISOString();

export const INITIAL_CROSS_SHIFT_DAR_LOGS: DARLogReference[] = [
  // Unit 304 at Midtown Commercial Lofts (site-12) AND Port Authority - Pier 7 (site-1) — 2 prior incidents in past 7 days so typing "Apt 304" or "304" triggers 3rd-strike chronic escalation or links to active ticket
  {
    darId: 'dar-log-304-a',
    shiftId: 'shift-hist-101',
    shiftName: 'Night Shift (22:00 - 06:00)',
    timestamp: hoursAgoIso(52),
    guardName: 'Officer Elena Rostova',
    badgeNumber: 'SEC-204',
    category: 'NOISE_COMPLAINT',
    notes: 'Apt 304 loud amplified bass music audible from 3rd floor elevator lobby. Issued 1st courtesy verbal warning to tenant.',
    siteId: 'site-12',
    siteName: 'Midtown Commercial Lofts',
    unitOrLocation: 'Apt 304',
    matchKeyType: 'UNIT_NUMBER',
    matchKeyValue: '304',
    photoUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80'
  },
  {
    darId: 'dar-log-304-b',
    shiftId: 'shift-hist-104',
    shiftName: 'Swing Shift (14:00 - 22:00)',
    timestamp: hoursAgoIso(21),
    guardName: 'Officer Carlos Silva',
    badgeNumber: 'SEC-118',
    category: 'NOISE_COMPLAINT',
    notes: 'Second noise complaint called in by neighboring Unit 302 regarding Apt 304 balcony gathering at 23:15. Tenant complied after knock.',
    siteId: 'site-12',
    siteName: 'Midtown Commercial Lofts',
    unitOrLocation: 'Apt 304',
    matchKeyType: 'UNIT_NUMBER',
    matchKeyValue: '304'
  },
  // Also seed Unit 412 with 2 prior unlinked noise/lease logs (ready to trigger CREATE_CHRONIC_TICKET when entered!)
  {
    darId: 'dar-log-412-a',
    shiftId: 'shift-hist-109',
    shiftName: 'Night Shift (22:00 - 06:00)',
    timestamp: hoursAgoIso(68),
    guardName: 'Officer Marcus Vance',
    badgeNumber: 'SEC-104',
    category: 'NOISE_COMPLAINT',
    notes: 'Unit 412 loud party and hallway loitering after quiet hours (01:20). Dispersed 6 guests.',
    siteId: 'site-12',
    siteName: 'Midtown Commercial Lofts',
    unitOrLocation: 'Unit 412',
    matchKeyType: 'UNIT_NUMBER',
    matchKeyValue: '412'
  },
  {
    darId: 'dar-log-412-b',
    shiftId: 'shift-hist-112',
    shiftName: 'Swing Shift (14:00 - 22:00)',
    timestamp: hoursAgoIso(18),
    guardName: 'Officer Carlos Silva',
    badgeNumber: 'SEC-118',
    category: 'CHRONIC_LEASE_VIOLATION',
    notes: 'Unit 412 propping fire stairwell exit door open and leaving trash bags in common corridor.',
    siteId: 'site-12',
    siteName: 'Midtown Commercial Lofts',
    unitOrLocation: 'Unit 412',
    matchKeyType: 'UNIT_NUMBER',
    matchKeyValue: '412'
  },
  // License plate ABC-123 chronic parking violator logs
  {
    darId: 'dar-log-abc123-1',
    shiftId: 'shift-hist-201',
    shiftName: 'Night Shift (22:00 - 06:00)',
    timestamp: hoursAgoIso(90),
    guardName: 'Officer Marcus Vance',
    badgeNumber: 'SEC-104',
    category: 'PARKING_VIOLATION',
    notes: 'Silver Honda Accord (Plate: ABC-123) parked in North Fire Lane red zone. Placed orange adhesive warning sticker #1.',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    unitOrLocation: 'Plate: ABC-123 / North Fire Lane',
    matchKeyType: 'LICENSE_PLATE',
    matchKeyValue: 'ABC123'
  },
  {
    darId: 'dar-log-abc123-2',
    shiftId: 'shift-hist-205',
    shiftName: 'Swing Shift (14:00 - 22:00)',
    timestamp: hoursAgoIso(40),
    guardName: 'Officer Elena Rostova',
    badgeNumber: 'SEC-204',
    category: 'PARKING_VIOLATION',
    notes: 'Repeat sighting of Silver Honda Accord [Plate: ABC-123] blocking Berth 4 emergency fire lane access.',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    unitOrLocation: 'Plate: ABC-123 / Berth 4 Fire Lane',
    matchKeyType: 'LICENSE_PLATE',
    matchKeyValue: 'ABC123'
  },
  {
    darId: 'dar-log-abc123-3',
    shiftId: 'shift-hist-209',
    shiftName: 'Day Shift (06:00 - 14:00)',
    timestamp: hoursAgoIso(14),
    guardName: 'Officer Carlos Silva',
    badgeNumber: 'SEC-118',
    category: 'PARKING_VIOLATION',
    notes: '3rd violation in 7 days for Silver Honda Accord Plate ABC-123 in Fire Lane. Final tow warning issued.',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    unitOrLocation: 'Plate: ABC-123 / Berth 4 Fire Lane',
    matchKeyType: 'LICENSE_PLATE',
    matchKeyValue: 'ABC123'
  },
  // Plate WA-8849B (2 prior unlinked parking logs at site-1 Port Authority - Pier 7 so 3rd entry triggers auto-escalation)
  {
    darId: 'dar-log-wa8849b-1',
    shiftId: 'shift-hist-215',
    shiftName: 'Night Shift (22:00 - 06:00)',
    timestamp: hoursAgoIso(49),
    guardName: 'Officer Marcus Vance',
    badgeNumber: 'SEC-104',
    category: 'PARKING_VIOLATION',
    notes: 'Black Ford F-150 (Plate WA-8849B) parked unauthorized in Reserved Dockmaster Stall #2 without permit.',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    unitOrLocation: 'Plate WA-8849B / Stall #2',
    matchKeyType: 'LICENSE_PLATE',
    matchKeyValue: 'WA8849B'
  },
  {
    darId: 'dar-log-wa8849b-2',
    shiftId: 'shift-hist-218',
    shiftName: 'Swing Shift (14:00 - 22:00)',
    timestamp: hoursAgoIso(19),
    guardName: 'Officer David Kim',
    badgeNumber: 'SEC-309',
    category: 'PARKING_VIOLATION',
    notes: 'Second sighting of Black Ford F-150 Plate WA-8849B parked overnight in Reserved Stall #2.',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    unitOrLocation: 'Plate WA-8849B / Stall #2',
    matchKeyType: 'LICENSE_PLATE',
    matchKeyValue: 'WA8849B'
  },
  // South Gate Maglock at Port Authority - Pier 7 (site-1)
  {
    darId: 'dar-log-gate2-1',
    shiftId: 'shift-hist-301',
    shiftName: 'Night Shift (22:00 - 06:00)',
    timestamp: hoursAgoIso(76),
    guardName: 'Officer Marcus Vance',
    badgeNumber: 'SEC-104',
    category: 'MAINTENANCE',
    notes: 'South Pedestrian Gate 2 electromagnetic lock failing to engage on door closure. Secured temporarily with chain padlock.',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    unitOrLocation: 'Gate 2 / South Pedestrian Gate',
    matchKeyType: 'LOCATION_ASSET',
    matchKeyValue: 'GATE2'
  },
  {
    darId: 'dar-log-gate2-2',
    shiftId: 'shift-hist-305',
    shiftName: 'Swing Shift (14:00 - 22:00)',
    timestamp: hoursAgoIso(32),
    guardName: 'Officer Elena Rostova',
    badgeNumber: 'SEC-204',
    category: 'SAFETY_HAZARD',
    notes: 'Gate 2 maglock armature plate loose; gate swings open under wind load.',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    unitOrLocation: 'Gate 2 / South Pedestrian Gate',
    matchKeyType: 'LOCATION_ASSET',
    matchKeyValue: 'GATE2'
  }
];

export const INITIAL_SITE_ISSUES: SiteIssue[] = [
  {
    id: 'ISS-1041',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    category: 'MAINTENANCE',
    status: 'PENDING_VERIFICATION',
    title: 'Broken Maglock on South Pedestrian Gate 2',
    unitOrLocation: 'Gate 2 / South Pedestrian Gate',
    matchKeyType: 'LOCATION_ASSET',
    matchKeyValue: 'GATE2',
    description:
      'Electromagnetic strike plate on South Pedestrian Gate 2 fails to latch after badge swipe. Facilities vendor replaced solenoid at 16:30 — requires on-shift guard physical pull-test & photo verification.',
    initialReportDate: hoursAgoIso(76),
    reportedBy: 'Officer Marcus Vance (SEC-104)',
    priority: 'URGENT',
    recurrenceCount: 2,
    isAutoEscalated: false,
    clientContactLog: {
      notifiedDate: hoursAgoIso(28),
      contactName: 'Carl Ortiz (Dockmaster & Maintenance)',
      method: 'PHONE',
      externalTicketRef: 'WO-PORT-8841',
      notes: 'Vendor dispatched to replace 24V solenoid coil. Requested guard verification on next patrol sweep.'
    },
    linkedDarLogs: [
      INITIAL_CROSS_SHIFT_DAR_LOGS[9],
      INITIAL_CROSS_SHIFT_DAR_LOGS[10]
    ],
    history: [
      {
        id: 'upd-1041-1',
        timestamp: hoursAgoIso(76),
        authorName: 'Officer Marcus Vance',
        authorBadge: 'SEC-104',
        authorRole: 'GUARD',
        shiftContext: 'Night Shift',
        notes: 'Initial maintenance report logged during 22:00 perimeter lockup sweep.'
      },
      {
        id: 'upd-1041-2',
        timestamp: hoursAgoIso(28),
        authorName: "Lt. Mark O'Connor",
        authorBadge: 'OPS-CMD-01',
        authorRole: 'DISPATCHER',
        shiftContext: 'Command CAD',
        notes: 'Notified Dockmaster Carl Ortiz via phone. External Work Order #WO-PORT-8841 opened.'
      },
      {
        id: 'upd-1041-3',
        timestamp: hoursAgoIso(4),
        authorName: "Lt. Mark O'Connor",
        authorBadge: 'OPS-CMD-01',
        authorRole: 'SUPERVISOR',
        shiftContext: 'Command CAD',
        notes: 'Maintenance reported repair completed. Pushed Field Verification task to active guard terminal.'
      }
    ]
  },
  {
    id: 'ISS-1042',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    category: 'PARKING_VIOLATION',
    status: 'OPEN',
    title: 'Chronic Fire Lane Parking Violator — Silver Honda Accord',
    unitOrLocation: 'Berth 4 North Fire Lane',
    vehicleDetails: 'Silver Honda Accord [Plate: ABC-123]',
    matchKeyType: 'LICENSE_PLATE',
    matchKeyValue: 'ABC123',
    description:
      'Repeat unauthorized parking in Berth 4 active emergency fire lane across 3 separate shifts within 7 days. Vehicle is eligible for immediate impound per site SOP.',
    initialReportDate: hoursAgoIso(90),
    reportedBy: 'Officer Marcus Vance (SEC-104)',
    priority: 'HIGH',
    recurrenceCount: 3,
    isAutoEscalated: true,
    linkedDarLogs: [
      INITIAL_CROSS_SHIFT_DAR_LOGS[4],
      INITIAL_CROSS_SHIFT_DAR_LOGS[5],
      INITIAL_CROSS_SHIFT_DAR_LOGS[6]
    ],
    history: [
      {
        id: 'upd-1042-1',
        timestamp: hoursAgoIso(14),
        authorName: 'Officer Carlos Silva',
        authorBadge: 'SEC-118',
        authorRole: 'GUARD',
        shiftContext: 'Day Shift',
        notes: 'Auto-escalated by Cross-Shift Chronic Detection Engine upon 3rd violation within 7-day rolling window.'
      }
    ]
  },
  {
    id: 'ISS-1043',
    siteId: 'site-12',
    siteName: 'Midtown Commercial Lofts',
    category: 'NOISE_COMPLAINT',
    status: 'CLIENT_NOTIFIED',
    title: 'Unit 304 Chronic Noise & Quiet Hours Violation',
    unitOrLocation: 'Apt 304',
    matchKeyType: 'UNIT_NUMBER',
    matchKeyValue: '304',
    description:
      'Recurring late-night amplified music and balcony noise disturbances logged across Night and Swing shifts after 22:00 curfew. Formal PM Lease Violation packet prepared.',
    initialReportDate: hoursAgoIso(84),
    reportedBy: 'Officer Elena Rostova (SEC-204)',
    priority: 'HIGH',
    recurrenceCount: 3,
    isAutoEscalated: true,
    clientContactLog: {
      notifiedDate: hoursAgoIso(12),
      contactName: 'PM Sarah Jenkins',
      method: 'EMAIL',
      externalTicketRef: 'PM-LEASE-304-09',
      notes: 'Sent chronological incident log with officer badge numbers and timestamps for 10-day lease compliance notice.'
    },
    linkedDarLogs: [
      {
        darId: 'dar-log-304-0',
        shiftId: 'shift-hist-098',
        shiftName: 'Night Shift (22:00 - 06:00)',
        timestamp: hoursAgoIso(84),
        guardName: 'Officer Marcus Vance',
        badgeNumber: 'SEC-104',
        category: 'NOISE_COMPLAINT',
        notes: 'Complaint from 3rd floor residents regarding Apt 304 loud subwoofer at 00:40. Contacted occupant.',
        siteId: 'site-12',
        siteName: 'Midtown Commercial Lofts',
        unitOrLocation: 'Apt 304',
        matchKeyType: 'UNIT_NUMBER',
        matchKeyValue: '304'
      },
      INITIAL_CROSS_SHIFT_DAR_LOGS[0],
      INITIAL_CROSS_SHIFT_DAR_LOGS[1]
    ],
    history: [
      {
        id: 'upd-1043-1',
        timestamp: hoursAgoIso(21),
        authorName: 'Officer Carlos Silva',
        authorBadge: 'SEC-118',
        authorRole: 'GUARD',
        shiftContext: 'Swing Shift',
        notes: '3rd noise complaint logged in 7 days — automatically escalated to Chronic Lease Violation Ticket.'
      },
      {
        id: 'upd-1043-2',
        timestamp: hoursAgoIso(12),
        authorName: "Lt. Mark O'Connor",
        authorBadge: 'OPS-CMD-01',
        authorRole: 'DISPATCHER',
        shiftContext: 'Command CAD',
        notes: 'Notified Property Manager Sarah Jenkins via Email with attached Multi-Shift Violation Notice.'
      }
    ]
  },
  {
    id: 'ISS-1044',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    category: 'SAFETY_HAZARD',
    status: 'OPEN',
    title: 'Exposed High-Voltage Conduit Box at Berth 7 Crane Apron',
    unitOrLocation: 'Berth 7 Crane Pillar #4',
    matchKeyType: 'LOCATION_ASSET',
    matchKeyValue: 'BERTH7PILLAR4',
    description:
      'Forklift impact sheared weatherproof cover off 240V junction box near Berth 7 walkway. Area coned off with caution tape by Night Shift.',
    initialReportDate: hoursAgoIso(16),
    reportedBy: 'Officer Marcus Vance (SEC-104)',
    priority: 'URGENT',
    recurrenceCount: 1,
    isAutoEscalated: false,
    linkedDarLogs: [
      {
        darId: 'dar-log-b7-1',
        shiftId: 'shift-hist-310',
        shiftName: 'Night Shift (22:00 - 06:00)',
        timestamp: hoursAgoIso(16),
        guardName: 'Officer Marcus Vance',
        badgeNumber: 'SEC-104',
        category: 'SAFETY_HAZARD',
        notes: 'Discovered damaged electrical junction box on Berth 7 Pillar 4 during 02:00 foot patrol. Placed 3 safety cones.',
        siteId: 'site-1',
        siteName: 'Port Authority - Pier 7',
        unitOrLocation: 'Berth 7 Crane Pillar #4',
        matchKeyType: 'LOCATION_ASSET',
        matchKeyValue: 'BERTH7PILLAR4',
        photoUrl: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=600&q=80'
      }
    ],
    history: [
      {
        id: 'upd-1044-1',
        timestamp: hoursAgoIso(16),
        authorName: 'Officer Marcus Vance',
        authorBadge: 'SEC-104',
        authorRole: 'GUARD',
        shiftContext: 'Night Shift',
        notes: 'Hazard coned off; oncoming shifts advised to inspect barricade integrity every patrol sweep.'
      }
    ]
  },
  {
    id: 'ISS-1045',
    siteId: 'site-2',
    siteName: 'Corporate HQ - Main Tower',
    category: 'CHRONIC_LEASE_VIOLATION',
    status: 'PENDING_VERIFICATION',
    title: 'Suite 210 After-Hours Loading Dock Fire Door Propping',
    unitOrLocation: 'Suite 210 / West Service Corridor',
    matchKeyType: 'UNIT_NUMBER',
    matchKeyValue: '210',
    description:
      'Catering staff from Suite 210 repeatedly wedged West Fire Exit door open during evening deliveries, triggering door-held-open alarm 3 times this week.',
    initialReportDate: hoursAgoIso(64),
    reportedBy: 'Officer David Kim (SEC-309)',
    priority: 'MEDIUM',
    recurrenceCount: 3,
    isAutoEscalated: true,
    clientContactLog: {
      notifiedDate: hoursAgoIso(24),
      contactName: 'PM Elena Rossi',
      method: 'EMAIL',
      externalTicketRef: 'CORP-SEC-210',
      notes: 'PM issued written directive to Suite 210 tenant manager. Requested guard verification tonight at 21:00.'
    },
    linkedDarLogs: [
      {
        darId: 'dar-log-210-1',
        shiftId: 'shift-hist-401',
        shiftName: 'Swing Shift (14:00 - 22:00)',
        timestamp: hoursAgoIso(64),
        guardName: 'Officer David Kim',
        badgeNumber: 'SEC-309',
        category: 'CHRONIC_LEASE_VIOLATION',
        notes: 'Suite 210 staff propped West Fire Exit with wooden wedge. Removed wedge and advised staff.',
        siteId: 'site-2',
        siteName: 'Corporate HQ - Main Tower',
        unitOrLocation: 'Suite 210',
        matchKeyType: 'UNIT_NUMBER',
        matchKeyValue: '210'
      },
      {
        darId: 'dar-log-210-2',
        shiftId: 'shift-hist-405',
        shiftName: 'Night Shift (22:00 - 06:00)',
        timestamp: hoursAgoIso(38),
        guardName: 'Officer Elena Rostova',
        badgeNumber: 'SEC-204',
        category: 'CHRONIC_LEASE_VIOLATION',
        notes: 'Second incident: West Fire Exit door found propped by Suite 210 boxes at 22:30.',
        siteId: 'site-2',
        siteName: 'Corporate HQ - Main Tower',
        unitOrLocation: 'Suite 210',
        matchKeyType: 'UNIT_NUMBER',
        matchKeyValue: '210'
      }
    ],
    history: [
      {
        id: 'upd-1045-1',
        timestamp: hoursAgoIso(24),
        authorName: "Lt. Mark O'Connor",
        authorBadge: 'OPS-CMD-01',
        authorRole: 'DISPATCHER',
        shiftContext: 'Command CAD',
        notes: 'PM Elena Rossi notified. Verification requested for oncoming shift.'
      }
    ]
  },
  {
    id: 'ISS-1046',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    category: 'NOISE_COMPLAINT',
    status: 'OPEN',
    title: 'Apt 304 / Berth Liveaboard Slip 304 Generator Noise Complaint',
    unitOrLocation: 'Apt 304',
    matchKeyType: 'UNIT_NUMBER',
    matchKeyValue: '304',
    description:
      'Repeat after-hours noise complaints logged for Unit / Slip 304 across consecutive night shifts. Requires ongoing shift pass-down monitoring.',
    initialReportDate: hoursAgoIso(48),
    reportedBy: 'Officer Carlos Silva (SEC-118)',
    priority: 'HIGH',
    recurrenceCount: 3,
    isAutoEscalated: true,
    linkedDarLogs: [
      {
        darId: 'dar-log-p7-304-1',
        shiftId: 'shift-hist-501',
        shiftName: 'Night Shift (22:00 - 06:00)',
        timestamp: hoursAgoIso(72),
        guardName: 'Officer Marcus Vance',
        badgeNumber: 'SEC-104',
        category: 'NOISE_COMPLAINT',
        notes: 'Unit 304 loud deck music at 23:45. Issued verbal warning.',
        siteId: 'site-1',
        siteName: 'Port Authority - Pier 7',
        unitOrLocation: 'Apt 304',
        matchKeyType: 'UNIT_NUMBER',
        matchKeyValue: '304'
      },
      {
        darId: 'dar-log-p7-304-2',
        shiftId: 'shift-hist-502',
        shiftName: 'Swing Shift (14:00 - 22:00)',
        timestamp: hoursAgoIso(25),
        guardName: 'Officer Carlos Silva',
        badgeNumber: 'SEC-118',
        category: 'NOISE_COMPLAINT',
        notes: 'Second noise complaint at Apt 304 at 23:15. Contacted occupant.',
        siteId: 'site-1',
        siteName: 'Port Authority - Pier 7',
        unitOrLocation: 'Apt 304',
        matchKeyType: 'UNIT_NUMBER',
        matchKeyValue: '304'
      }
    ],
    history: [
      {
        id: 'upd-1046-1',
        timestamp: hoursAgoIso(25),
        authorName: 'Officer Carlos Silva',
        authorBadge: 'SEC-118',
        authorRole: 'GUARD',
        shiftContext: 'Swing Shift',
        notes: 'Logged 3rd sighting — chronic noise hotspot active on pass-down watchlist.'
      }
    ]
  }
];
