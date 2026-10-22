export type ResourceCategory = 'SOP' | 'HANDBOOK' | 'VIDEO' | 'PODCAST' | 'TRAINING_DECK';

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  fileUrl: string;
  fileType: 'pdf' | 'mp4' | 'mp3' | 'pptx' | 'docx';
  fileSize?: string;
  uploadedBy: string;
  uploadedAt: string; // ISO string
  requiresAcknowledgment: boolean;
  targetRating?: number; // Minimum guard tier required to view/access
  siteSpecificCode?: string; // Optional site tie-in
}

export interface ResourceAcknowledgmentRecord {
  resourceId: string;
  guardId: string;
  guardName: string;
  badgeNumber: string;
  acknowledgedAt: string; // ISO string
}

export type SiteDocType =
  | 'VACANT_UNITS'
  | 'PARKING_ROSTER'
  | 'GATE_CODES'
  | 'KEY_LOG'
  | 'PROPERTY_SOP';

export interface SiteDocument {
  id: string;
  siteId: string;
  title: string; // e.g., "Weekly Vacant Unit List - Oct 2026"
  docType: SiteDocType;
  contentSnippet?: string; // Text summary or markdown table of units
  fileUrl?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface VacantUnitRow {
  unitNumber: string;
  buildingOrFloor: string;
  lockboxCode: string;
  readinessStatus: 'VACANT_READY' | 'TURNOVER_MAINT' | 'LOCKED_INSPECTED' | 'SHOWING_ACTIVE';
  patrolNote: string;
}

export interface ParkingRosterRow {
  permitId: string;
  stallOrZone: string;
  vehicleDescription: string;
  licensePlate: string;
  exceptionStatus: 'AUTHORIZED_RESIDENT' | 'VIP_GUEST_PASS' | 'CONTRACTOR_EXEMPT' | 'DO_NOT_TOW';
  validThrough: string;
}

export interface GateCodeRow {
  accessPoint: string;
  zoneOrAmenity: string;
  pinOrCode: string;
  activeHours: string;
  securityInstructions: string;
}

export const INITIAL_RESOURCES: ResourceItem[] = [
  {
    id: 'res-sop-001',
    title: 'SOP-104: Denver County Armed & Unarmed Post Orders',
    description:
      'Mandatory standard operating procedures for perimeter access verification, visitor badge issuance, and critical escalation protocols across Denver Metro commercial sites.',
    category: 'SOP',
    fileUrl: 'https://secureshift.internal/cdn/docs/sop-104-denver-post-orders.pdf',
    fileType: 'pdf',
    fileSize: '2.4 MB',
    uploadedBy: "Lt. Mark O'Connor (OPS-CMD-01)",
    uploadedAt: '2026-10-12T14:30:00.000Z',
    requiresAcknowledgment: true,
    targetRating: 1,
    siteSpecificCode: 'DEN-METRO-01',
  },
  {
    id: 'res-hbk-002',
    title: '2026 Field Officer Operations & Compliance Handbook',
    description:
      'Complete reference handbook covering uniform standards, Denver Security License (DSL) renewal grace windows, meal break policies, and de-escalation frameworks.',
    category: 'HANDBOOK',
    fileUrl: 'https://secureshift.internal/cdn/docs/2026-officer-handbook-v4.pdf',
    fileType: 'pdf',
    fileSize: '5.8 MB',
    uploadedBy: 'Capt. Elena Vance (OPS-DIR-02)',
    uploadedAt: '2026-10-14T09:15:00.000Z',
    requiresAcknowledgment: true,
    targetRating: 1,
  },
  {
    id: 'res-vid-003',
    title: 'Tactical De-Escalation & Trespass Intervention Walkthrough',
    description:
      'On-scene training video demonstrating verbal de-escalation, safe standoff positioning, and real-time CAD BOLO reporting during high-priority trespass calls.',
    category: 'VIDEO',
    fileUrl: 'https://secureshift.internal/cdn/media/tactical-deescalation-training.mp4',
    fileType: 'mp4',
    fileSize: '48.2 MB',
    uploadedBy: "Lt. Mark O'Connor (OPS-CMD-01)",
    uploadedAt: '2026-10-16T18:00:00.000Z',
    requiresAcknowledgment: true,
    targetRating: 1,
  },
  {
    id: 'res-pod-004',
    title: 'Sentinel Command Briefing Ep. 18: Night Rover Patrol Telemetry',
    description:
      '12-minute audio briefing for mobile patrol units covering geofence boundary compliance, checkpoint QR verification, and winter hazard dispatch protocols.',
    category: 'PODCAST',
    fileUrl: 'https://secureshift.internal/cdn/audio/sentinel-briefing-ep18.mp3',
    fileType: 'mp3',
    fileSize: '14.6 MB',
    uploadedBy: 'Sgt. Marcus Vance (OPS-ROV-04)',
    uploadedAt: '2026-10-18T21:10:00.000Z',
    requiresAcknowledgment: false,
    targetRating: 2,
    siteSpecificCode: 'ROVER-NORTH',
  },
  {
    id: 'res-dck-005',
    title: 'Tier 3 High-Security Infrastructure & Biometric Access Deck',
    description:
      'Interactive slide deck detailing airlock interlock overrides, emergency lockdown triggers, and hazmat containment procedures for Tier 3 critical facilities.',
    category: 'TRAINING_DECK',
    fileUrl: 'https://secureshift.internal/cdn/decks/tier3-critical-infrastructure.pptx',
    fileType: 'pptx',
    fileSize: '11.3 MB',
    uploadedBy: "Lt. Mark O'Connor (OPS-CMD-01)",
    uploadedAt: '2026-10-19T11:45:00.000Z',
    requiresAcknowledgment: true,
    targetRating: 3,
    siteSpecificCode: 'DEN-AIRPORT-G4',
  },
  {
    id: 'res-sop-006',
    title: 'SOP-219: Medical Distress & 2.0s SOS Panic Dispatch Protocol',
    description:
      'Step-by-step emergency response checklist when activating the mobile SOS panic button or responding to a fellow officer distress beacon.',
    category: 'SOP',
    fileUrl: 'https://secureshift.internal/cdn/docs/sop-219-sos-medical-protocol.docx',
    fileType: 'docx',
    fileSize: '1.1 MB',
    uploadedBy: 'Capt. Elena Vance (OPS-DIR-02)',
    uploadedAt: '2026-10-20T08:20:00.000Z',
    requiresAcknowledgment: true,
    targetRating: 1,
  },
];

export const DEFAULT_SITE_DOCUMENTS: SiteDocument[] = [
  {
    id: 'sitedoc-vac-001',
    siteId: 'DEFAULT',
    title: 'Weekly Vacant Unit List - Oct 2026',
    docType: 'VACANT_UNITS',
    contentSnippet: `Unit 104B | Bldg A - 1st Fl | Lockbox #4419 | VACANT_READY | Verify patio slider deadbolt & thermostat at 62°F
Unit 218A | Bldg A - 2nd Fl | Lockbox #8802 | TURNOVER_MAINT | Flooring contractors cleared 08:00-17:00; lock after 17:30
Unit 309C | Bldg B - 3rd Fl | Lockbox #1920 | LOCKED_INSPECTED | High-priority squat check; alarm armed
Unit 412A | North Tower - 4th Fl | Lockbox #5531 | SHOWING_ACTIVE | Leasing Supra box active; verify front door latch on 22:00 sweep
Penthouse 801 | Sky Level | Lockbox #9044 | LOCKED_INSPECTED | Executive vacant suite — require photo verification on night tour`,
    fileUrl: 'https://secureshift.internal/cdn/site-docs/weekly-vacant-units-oct2026.pdf',
    updatedAt: '2026-10-21T16:40:00.000Z',
    updatedBy: "Lt. Mark O'Connor (OPS-CMD-01)",
  },
  {
    id: 'sitedoc-prk-002',
    siteId: 'DEFAULT',
    title: 'Authorized Vehicles & Tow-Away Exception Roster - Oct 2026',
    docType: 'PARKING_ROSTER',
    contentSnippet: `PRM-9041 | Stall #12 (Reserved North) | White Ford F-250 Utility | CO-884-KLP | CONTRACTOR_EXEMPT | Overnight HVAC emergency crew — DO NOT TOW
PRM-3318 | Visitor Zone B-04 | Black Tesla Model Y | WA-419-TZN | VIP_GUEST_PASS | Unit 502 Guest Pass valid thru Oct 25
PRM-7720 | Loading Bay #2 | Silver Sprinter Van | CO-102-MVR | DO_NOT_TOW | Property Management Restoration Team
PRM-6105 | Underground Level P1-19 | Blue Subaru Outback | CO-741-DVR | AUTHORIZED_RESIDENT | Temporary paper tag on dash — new resident Unit 305`,
    fileUrl: 'https://secureshift.internal/cdn/site-docs/parking-roster-exceptions-oct2026.pdf',
    updatedAt: '2026-10-21T14:15:00.000Z',
    updatedBy: 'Capt. Elena Vance (OPS-DIR-02)',
  },
  {
    id: 'sitedoc-gat-003',
    siteId: 'DEFAULT',
    title: 'Master Gate, Knox Box & After-Hours Amenity Access Codes',
    docType: 'GATE_CODES',
    contentSnippet: `North Vehicular Slider Gate | Main Entry | #4829* | 24/7 Guard Override | Hold #9 to latch open for Fire/EMS apparatus
Central Pool & Spa Deck | Courtyard West | 2204# | Lockup 22:00 - 06:00 | Padlock #4 backup key in Guard Keybox
Roof Mechanical & Elevator Penthouse | Level 24 | 7731* | Restricted 24/7 | Log all contractor entries in DAR
Resident Package & Mail Vault | Lobby East | 1058# | 06:00 - 23:00 | Deadbolt after 23:00 patrol check
Guard Master Key Lockbox | Security Desk Wall | 9195-A | 24/7 Duty Officer Only | Contains master fob & fire panel reset key`,
    fileUrl: 'https://secureshift.internal/cdn/site-docs/gate-and-amenity-codes.pdf',
    updatedAt: '2026-10-20T19:00:00.000Z',
    updatedBy: "Lt. Mark O'Connor (OPS-CMD-01)",
  },
  {
    id: 'sitedoc-key-004',
    siteId: 'DEFAULT',
    title: 'Master Key & Fob Sign-Out Log Protocol',
    docType: 'KEY_LOG',
    contentSnippet: `Key Ring #1 (Master Mechanical & Boiler Rooms): Assigned to On-Duty Patrol Officer.
Key Ring #2 (Pool, Gym & Laundry Deadbolts): Hanging in Biometric Box Slot #2.
Key Ring #3 (Vendor / Telecom Closet Access): Require driver's license collateral before issuing to technician.`,
    updatedAt: '2026-10-19T12:00:00.000Z',
    updatedBy: 'Sgt. Marcus Vance (OPS-ROV-04)',
  },
];

const RESOURCES_STORAGE_KEY = 'secureshift_central_resources_v1';
const RESOURCE_ACKS_STORAGE_KEY = 'secureshift_resource_acknowledgments_v1';
const SITE_DOCUMENTS_STORAGE_KEY = 'secureshift_site_documents_vault_v1';
const RESOURCES_SYNC_EVENT = 'secureshift:resources-updated';
const SITE_DOCS_SYNC_EVENT = 'secureshift:site-docs-updated';

export function loadStoredResources(): ResourceItem[] {
  if (typeof window === 'undefined') return INITIAL_RESOURCES;
  try {
    const raw = window.localStorage.getItem(RESOURCES_STORAGE_KEY);
    if (!raw) return INITIAL_RESOURCES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fallback to initial resources
  }
  return INITIAL_RESOURCES;
}

export function saveStoredResources(items: ResourceItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RESOURCES_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(RESOURCES_SYNC_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadResourceAcknowledgments(): ResourceAcknowledgmentRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RESOURCE_ACKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveResourceAcknowledgments(records: ResourceAcknowledgmentRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RESOURCE_ACKS_STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent(RESOURCES_SYNC_EVENT));
  } catch {
    // Ignore storage errors
  }
}

export function subscribeToResourceUpdates(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(RESOURCES_SYNC_EVENT, handler);
  window.addEventListener(SITE_DOCS_SYNC_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(RESOURCES_SYNC_EVENT, handler);
    window.removeEventListener(SITE_DOCS_SYNC_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function loadAllSiteDocuments(): SiteDocument[] {
  if (typeof window === 'undefined') return DEFAULT_SITE_DOCUMENTS;
  try {
    const raw = window.localStorage.getItem(SITE_DOCUMENTS_STORAGE_KEY);
    if (!raw) return DEFAULT_SITE_DOCUMENTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fallback
  }
  return DEFAULT_SITE_DOCUMENTS;
}

export function loadSiteDocumentsForSite(siteId: string, siteName?: string): SiteDocument[] {
  const all = loadAllSiteDocuments();
  const specific = all.filter(
    (doc) =>
      doc.siteId === siteId ||
      (siteName && doc.siteId.toLowerCase() === siteName.toLowerCase())
  );
  const defaults = all
    .filter((doc) => doc.siteId === 'DEFAULT')
    .map((doc) => ({
      ...doc,
      siteId,
    }));

  // Merge site-specific overrides with defaults for any docType not yet customized
  const customIds = new Set(specific.map((d) => d.id));
  const merged = [
    ...specific,
    ...defaults.filter((d) => !customIds.has(d.id) && !specific.some((s) => s.title === d.title)),
  ];
  return merged;
}

export function saveAllSiteDocuments(docs: SiteDocument[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SITE_DOCUMENTS_STORAGE_KEY, JSON.stringify(docs));
    window.dispatchEvent(new CustomEvent(SITE_DOCS_SYNC_EVENT));
  } catch {
    // Ignore storage errors
  }
}

export function subscribeToSiteDocumentUpdates(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(SITE_DOCS_SYNC_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(SITE_DOCS_SYNC_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
