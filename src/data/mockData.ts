import { Shift, Trade, AuditLogEntry, GuardProfile } from '../types/shift';

export const OPS_DISPATCH_PHONE = '+1 (800) 555-0199';

export const CURRENT_GUARD: GuardProfile = {
  id: 'guard-current',
  name: 'Alex Mercer',
  phone: '+1 (555) 234-5678',
  badgeNumber: 'SEC-8842',
  role: 'guard',
  ojtSites: ['Port Authority - Pier 7', 'Corporate HQ', 'Retail Plaza', 'West Medical Center'],
};

export const GUARDS_LIST: GuardProfile[] = [
  CURRENT_GUARD,
  {
    id: 'guard-101',
    name: 'Sarah Jenkins',
    phone: '+1 (555) 345-6789',
    badgeNumber: 'SEC-7721',
    role: 'guard',
    ojtSites: ['Hotel Lobby', 'Corporate HQ', 'Downtown Financial Center'],
  },
  {
    id: 'guard-102',
    name: 'Mike Chen',
    phone: '+1 (555) 456-7890',
    badgeNumber: 'SEC-9104',
    role: 'guard',
    ojtSites: ['Industrial Warehouse', 'Retail Plaza'], // Note: Not trained on Port Authority!
  },
  {
    id: 'guard-103',
    name: 'Marcus Wright',
    phone: '+1 (555) 567-8901',
    badgeNumber: 'SEC-6340',
    role: 'lead',
    ojtSites: ['City Airport Gate 4', 'West Medical Center', 'Corporate HQ'],
  },
  {
    id: 'guard-104',
    name: 'Elena Rostova',
    phone: '+1 (555) 678-9012',
    badgeNumber: 'SEC-4199',
    role: 'guard',
    ojtSites: ['Tech Campus North', 'City Airport Gate 4'],
  },
  {
    id: 'guard-105',
    name: 'David Silva',
    phone: '+1 (555) 789-0123',
    badgeNumber: 'SEC-5510',
    role: 'guard',
    ojtSites: ['Port Authority - Pier 7', 'Industrial Warehouse'],
  }
];

export const INITIAL_SHIFTS: Shift[] = [
  {
    id: 'shift-101',
    siteName: 'Port Authority - Pier 7',
    location: 'Docklands Gate B, Berth 4',
    date: '2026-08-22',
    startTime: '19:00',
    endTime: '07:00',
    hours: 12,
    urgency: 'emergency',
    status: 'open',
    hourlyRate: 28.50,
    requiredCertifications: ['TWIC Card', 'Armed Endorsement'],
    notes: 'Urgent coverage needed for midnight shipping convoy security.',
    createdAt: '2026-08-21T08:30:00Z',
    bidsCount: 2,
  },
  {
    id: 'shift-102',
    siteName: 'Corporate HQ - Night Patrol',
    location: '500 Executive Blvd, Main Tower',
    date: '2026-08-23',
    startTime: '22:00',
    endTime: '06:00',
    hours: 8,
    urgency: 'standard',
    status: 'open',
    hourlyRate: 24.00,
    requiredCertifications: ['CCTV Monitoring', 'CPR/AED'],
    notes: 'Access control and periodic perimeter sweep.',
    createdAt: '2026-08-21T09:15:00Z',
    bidsCount: 1,
  },
  {
    id: 'shift-103',
    siteName: 'West Medical Center - Emergency Dept',
    location: '400 Healing Way, Gate 2',
    date: '2026-08-21',
    startTime: '08:00',
    endTime: '16:00',
    hours: 8,
    urgency: 'emergency',
    status: 'open',
    hourlyRate: 27.00,
    requiredCertifications: ['De-escalation', 'Crisis Prevention'],
    notes: 'High-visibility triage area security.',
    createdAt: '2026-08-21T06:00:00Z',
    bidsCount: 0,
  },
  {
    id: 'shift-104',
    siteName: 'City Airport Gate 4',
    location: 'Terminal B Security Checkpoint',
    date: '2026-08-21',
    startTime: '12:00',
    endTime: '20:00',
    hours: 8,
    urgency: 'standard',
    status: 'filled',
    assignedGuardName: 'Marcus Wright',
    assignedGuardId: 'guard-103',
    hourlyRate: 26.00,
    requiredCertifications: ['SIDA Badge', 'TSA Screener'],
    notes: 'Ramp access control and badge verification.',
    createdAt: '2026-08-20T16:00:00Z',
    bidsCount: 3,
  },
  {
    id: 'shift-105',
    siteName: 'Retail Plaza - Patrol',
    location: 'North Galleria Outer Perimeter',
    date: '2026-08-24',
    startTime: '14:00',
    endTime: '00:00',
    hours: 10,
    urgency: 'standard',
    status: 'open',
    hourlyRate: 23.50,
    requiredCertifications: ['Foot Patrol License'],
    notes: 'Closing shift asset protection and crowd monitoring.',
    createdAt: '2026-08-21T10:00:00Z',
    bidsCount: 0,
  },
  {
    id: 'shift-106',
    siteName: 'Tech Campus North - Data Center',
    location: 'Building 4 Vault Facility',
    date: '2026-08-25',
    startTime: '00:00',
    endTime: '08:00',
    hours: 8,
    urgency: 'standard',
    status: 'open',
    hourlyRate: 26.50,
    requiredCertifications: ['Secret Clearance', 'Biometric Systems'],
    notes: 'Strict visitor logging and server bay surveillance.',
    createdAt: '2026-08-21T11:00:00Z',
    bidsCount: 1,
  }
];

export const INITIAL_TRADES: Trade[] = [
  {
    id: 'trade-201',
    type: 'giveaway',
    status: 'pending_approval',
    originalShift: {
      siteName: 'Hotel Grand Lobby & Concierge',
      date: '2026-08-24',
      startTime: '15:00',
      endTime: '23:00',
      hours: 8,
      location: '100 Broadway Ave'
    },
    offeringGuard: {
      id: 'guard-101',
      name: 'Sarah Jenkins',
      phone: '+1 (555) 345-6789',
      badgeNumber: 'SEC-7721',
      role: 'guard',
      ojtSites: ['Hotel Lobby', 'Corporate HQ']
    },
    reason: 'Family emergency out of town. Shift is fully documented with supervisor briefing.',
    createdAt: '2026-08-21T14:22:00Z',
  },
  {
    id: 'trade-202',
    type: 'swap',
    status: 'pending_swap',
    originalShift: {
      siteName: 'Port Authority - Pier 7',
      date: '2026-08-25',
      startTime: '19:00',
      endTime: '07:00',
      hours: 12,
      location: 'Berth 4 Maritime Security'
    },
    offeringGuard: {
      id: 'guard-105',
      name: 'David Silva',
      phone: '+1 (555) 789-0123',
      badgeNumber: 'SEC-5510',
      role: 'guard',
      ojtSites: ['Port Authority - Pier 7', 'Industrial Warehouse']
    },
    reason: 'Seeking weekend daylight shift in exchange for this 12hr night shift.',
    createdAt: '2026-08-21T10:15:00Z',
    bidAt: '2026-08-21T12:10:00Z',
    swapOffer: {
      offeredByGuard: {
        id: 'guard-102',
        name: 'Mike Chen',
        phone: '+1 (555) 456-7890',
        badgeNumber: 'SEC-9104',
        role: 'guard',
        ojtSites: ['Industrial Warehouse', 'Retail Plaza'] // NOT trained on Port Authority Pier 7!
      },
      offeredShift: {
        siteName: 'Industrial Warehouse Night Watch',
        date: '2026-08-26',
        startTime: '20:00',
        endTime: '06:00',
        hours: 10,
        location: 'Industrial Park Way'
      },
      datesTimesNotes: 'Can take over Port Pier 7 if granted shadow/OJT orientation or supervisor waiver.',
      ojtStatus: 'needs_ojt', // High-visibility RED badge in Ops view
      submittedAt: '2026-08-21T12:10:00Z'
    }
  },
  {
    id: 'trade-203',
    type: 'swap',
    status: 'active',
    originalShift: {
      siteName: 'Downtown Financial Center',
      date: '2026-08-26',
      startTime: '06:00',
      endTime: '14:00',
      hours: 8,
      location: '120 Wall St Tower'
    },
    offeringGuard: {
      id: 'guard-104',
      name: 'Elena Rostova',
      phone: '+1 (555) 678-9012',
      badgeNumber: 'SEC-4199',
      role: 'guard',
      ojtSites: ['Downtown Financial Center', 'Tech Campus North']
    },
    reason: 'Looking to swap for any evening or night shift between Aug 25-28.',
    createdAt: '2026-08-21T09:30:00Z',
  },
  {
    id: 'trade-204',
    type: 'swap',
    status: 'approved',
    originalShift: {
      siteName: 'West Medical Center',
      date: '2026-08-20',
      startTime: '16:00',
      endTime: '00:00',
      hours: 8,
      location: '400 Healing Way'
    },
    offeringGuard: {
      id: 'guard-101',
      name: 'Sarah Jenkins',
      phone: '+1 (555) 345-6789',
      badgeNumber: 'SEC-7721',
      role: 'guard',
      ojtSites: ['West Medical Center', 'Corporate HQ']
    },
    reason: 'Medical appointment.',
    createdAt: '2026-08-20T08:00:00Z',
    bidAt: '2026-08-20T09:30:00Z',
    resolvedAt: '2026-08-20T15:10:00Z',
    resolutionNote: 'Approved: Guard Riley has current OJT and hours balance conforms to 40hr overtime limit.',
    swapOffer: {
      offeredByGuard: {
        id: 'guard-103',
        name: 'Marcus Wright',
        phone: '+1 (555) 567-8901',
        badgeNumber: 'SEC-6340',
        role: 'lead',
        ojtSites: ['West Medical Center', 'City Airport']
      },
      offeredShift: {
        siteName: 'Corporate HQ Night',
        date: '2026-08-21',
        startTime: '22:00',
        endTime: '06:00',
        hours: 8
      },
      datesTimesNotes: 'Direct swap approved.',
      ojtStatus: 'trained',
      submittedAt: '2026-08-20T09:30:00Z'
    }
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-1',
    action: 'SHIFT_FILLED',
    category: 'shift',
    details: 'Shift #104 (City Airport Gate 4) marked FILLED. Assigned to Marcus Wright.',
    timestamp: '2026-08-21T15:42:00Z',
    actor: 'Ops Admin (Dispatcher Keller)',
    status: 'info'
  },
  {
    id: 'audit-2',
    action: 'SWAP_APPROVED',
    category: 'swap',
    details: 'Swap #204 APPROVED (Sarah Jenkins <> Marcus Wright). Site OJT verified.',
    timestamp: '2026-08-21T15:10:00Z',
    actor: 'Ops Admin (Lt. O\'Connor)',
    status: 'success'
  },
  {
    id: 'audit-3',
    action: 'TRADE_POSTED',
    category: 'trade',
    details: 'New Trade Request posted by Guard: David Silva (Port Authority Pier 7).',
    timestamp: '2026-08-21T14:55:00Z',
    actor: 'David Silva (SEC-5510)',
    status: 'info'
  },
  {
    id: 'audit-4',
    action: 'POST_SUBMITTED',
    category: 'trade',
    details: 'Sarah Jenkins submitted trade listing for Hotel Grand Lobby.',
    timestamp: '2026-08-21T14:22:00Z',
    actor: 'Sarah Jenkins (SEC-7721)',
    status: 'warning'
  },
  {
    id: 'audit-5',
    action: 'SWAP_BID_SUBMITTED',
    category: 'swap',
    details: 'Mike Chen submitted swap proposal for Trade #202. [ALERT: Needs OJT Training]',
    timestamp: '2026-08-21T12:10:00Z',
    actor: 'Mike Chen (SEC-9104)',
    status: 'danger'
  },
  {
    id: 'audit-6',
    action: 'GUARD_LOGIN',
    category: 'system',
    details: 'Guard logged in: Marcus Wright on mobile client.',
    timestamp: '2026-08-21T11:30:00Z',
    actor: 'Marcus Wright (SEC-6340)',
    status: 'info'
  }
];

export const SAMPLE_JSON_SHIFTS = JSON.stringify([
  {
    "siteName": "Metro Rail Station Plaza",
    "location": "Central Hub Security Post #2",
    "date": "2026-08-27",
    "startTime": "06:00",
    "endTime": "14:00",
    "urgency": "standard",
    "hourlyRate": 25.00,
    "requiredCertifications": ["Transit Safety", "First Aid"],
    "notes": "Crowd management and ticket platform surveillance."
  },
  {
    "siteName": "Waterfront Chemical Plant",
    "location": "Hazard Bay East Perimeter",
    "date": "2026-08-27",
    "startTime": "18:00",
    "endTime": "06:00",
    "urgency": "emergency",
    "hourlyRate": 32.00,
    "requiredCertifications": ["HAZMAT Level 2", "Armed Guard"],
    "notes": "Critical overnight gate control. Zero tolerance for unescorted visitors."
  },
  {
    "siteName": "Downtown Art Museum",
    "location": "Gallery Wing 3",
    "date": "2026-08-28",
    "startTime": "10:00",
    "endTime": "18:00",
    "urgency": "standard",
    "hourlyRate": 22.50,
    "requiredCertifications": ["Asset Protection"],
    "notes": "VIP exhibition opening day shift."
  }
], null, 2);
