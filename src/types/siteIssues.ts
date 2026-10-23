export type IssueCategory = 
  | 'MAINTENANCE' 
  | 'SAFETY_HAZARD' 
  | 'CHRONIC_LEASE_VIOLATION' 
  | 'PARKING_VIOLATION' 
  | 'NOISE_COMPLAINT' 
  | 'UNAUTHORIZED_OCCUPANT' 
  | 'TRASH_DUMPING';

export type IssueStatus = 'OPEN' | 'CLIENT_NOTIFIED' | 'PENDING_VERIFICATION' | 'RESOLVED';

export type InfractionMatchKey = 'UNIT_NUMBER' | 'LICENSE_PLATE' | 'LOCATION_ASSET';

export interface DARLogReference {
  darId: string;
  shiftId: string;
  shiftName?: string; // e.g., "Night Shift", "Swing Shift"
  timestamp: string; // ISO string
  guardName: string;
  badgeNumber: string;
  category: IssueCategory | string;
  notes: string;
  photoUrl?: string;
  siteId?: string;
  siteName?: string;
  unitOrLocation?: string;
  matchKeyType?: InfractionMatchKey;
  matchKeyValue?: string;
}

export interface ChronicEscalationRule {
  category: IssueCategory;
  thresholdCount: number; // Default: 2 prior incidents (3rd triggers escalation)
  rollingWindowDays: number; // Default: 7 days
  autoEscalateToTicket: boolean;
}

export interface SiteIssueUpdate {
  id: string;
  timestamp: string; // ISO string
  authorName: string;
  authorBadge?: string;
  authorRole: 'GUARD' | 'DISPATCHER' | 'SUPERVISOR';
  shiftContext?: string;
  notes: string;
  photoUrl?: string;
}

export interface SiteIssue {
  id: string;
  siteId: string;
  siteName: string;
  category: IssueCategory;
  status: IssueStatus;
  title: string; // e.g., "Broken Maglock on South Pedestrian Gate" or "Unit 304 Chronic Noise Violation"
  unitOrLocation: string; // Display location, e.g., "Apt 304" or "Gate 2 / Space 45"
  vehicleDetails?: string; // Optional make/model/color/plate for parking violators
  matchKeyType: InfractionMatchKey;
  matchKeyValue: string; // Normalized key for engine matching: "304", "ABC123", "GATE2"
  description: string;
  initialReportDate: string;
  reportedBy: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  recurrenceCount: number; // Total tally of repeat incidents across shifts
  isAutoEscalated: boolean; // True when generated/escalated by the chronic detection engine
  clientContactLog?: {
    notifiedDate?: string;
    contactName?: string;
    method?: 'EMAIL' | 'PHONE' | 'PORTAL';
    externalTicketRef?: string;
    notes?: string;
  };
  verificationDetails?: {
    verifiedBy?: string;
    verifiedBadge?: string;
    verifiedDate?: string;
    verificationPhotoUrl?: string;
    resolutionNotes?: string;
  };
  linkedDarLogs: DARLogReference[];
  history: SiteIssueUpdate[];
}
