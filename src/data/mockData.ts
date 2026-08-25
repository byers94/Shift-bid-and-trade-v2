import { Shift, Trade, AuditLogEntry, GuardProfile, AdminAction, AdminUser, ShiftTemplate, BidRecord } from '../types/shift';

export const OPS_DISPATCH_PHONE = '+1 (800) 555-0199';

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'disp-1',
    name: "Lt. Mark O'Connor",
    badgeId: "OPS-CMD-01",
    role: "commander",
    pin: "1099",
    email: "mark.oconnor@secureshift.ops",
    phone: "+1 (555) 019-9001",
    status: "active",
    createdAt: "2026-01-15T08:00:00Z",
    lastLogin: "2026-08-23T12:55:00Z"
  },
  {
    id: 'disp-2',
    name: "Dispatcher Sarah Keller",
    badgeId: "OPS-DISP-04",
    role: "dispatcher",
    pin: "2044",
    email: "sarah.keller@secureshift.ops",
    phone: "+1 (555) 019-9004",
    status: "active",
    createdAt: "2026-02-01T08:00:00Z",
    lastLogin: "2026-08-23T10:30:00Z"
  },
  {
    id: 'disp-3',
    name: "Captain Raymond Holt",
    badgeId: "OPS-LEAD-99",
    role: "supervisor",
    pin: "3301",
    email: "raymond.holt@secureshift.ops",
    phone: "+1 (555) 019-9099",
    status: "active",
    createdAt: "2026-01-10T08:00:00Z",
    lastLogin: "2026-08-22T14:20:00Z"
  }
];

export const CURRENT_GUARD: GuardProfile = {
  id: 'guard-current',
  name: 'Alex Mercer',
  phone: '+1 (555) 234-5678',
  badgeNumber: 'SEC-8842',
  role: 'guard',
  trainingLevel: 'trained',
  email: 'alex.mercer@secureshift.net',
  certifications: ['TWIC Card', 'Armed Endorsement', 'CPR/AED', 'Level 2 Baton'],
  hireDate: '2024-03-15',
  notes: 'Senior patrol guard, reliable on maritime and commercial facilities.',
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
    trainingLevel: 'trained',
    email: 'sarah.jenkins@secureshift.net',
    certifications: ['CCTV Monitoring', 'CPR/AED', 'Hospitality Security'],
    hireDate: '2024-06-10',
    notes: 'Specialist in front-desk concierge and corporate patrol.',
    ojtSites: ['Hotel Lobby', 'Corporate HQ', 'Downtown Financial Center'],
  },
  {
    id: 'guard-102',
    name: 'Mike Chen',
    phone: '+1 (555) 456-7890',
    badgeNumber: 'SEC-9104',
    role: 'guard',
    trainingLevel: 'needs_ojt',
    email: 'mike.chen@secureshift.net',
    certifications: ['Guard Card', 'First Aid'],
    hireDate: '2026-01-08',
    notes: 'Recently onboarded; pending OJT clearance on Port Authority and Tech Campus.',
    ojtSites: ['Industrial Warehouse', 'Retail Plaza'], // Note: Not trained on Port Authority!
  },
  {
    id: 'guard-103',
    name: 'Marcus Wright',
    phone: '+1 (555) 567-8901',
    badgeNumber: 'SEC-6340',
    role: 'lead',
    trainingLevel: 'lead_certified',
    email: 'marcus.wright@secureshift.net',
    certifications: ['SIDA Badge', 'TSA Screener', 'Armed Endorsement', 'Incident Command'],
    hireDate: '2023-08-20',
    notes: 'Field Lead with TSA screener and aviation security credentials.',
    ojtSites: ['City Airport Gate 4', 'West Medical Center', 'Corporate HQ', 'Port Authority - Pier 7'],
  },
  {
    id: 'guard-104',
    name: 'Elena Rostova',
    phone: '+1 (555) 678-9012',
    badgeNumber: 'SEC-4199',
    role: 'guard',
    trainingLevel: 'trained',
    email: 'elena.rostova@secureshift.net',
    certifications: ['Secret Clearance', 'Biometric Systems', 'Access Control Specialist'],
    hireDate: '2024-11-04',
    notes: 'High-security facility clearance with biometric server room access.',
    ojtSites: ['Tech Campus North', 'City Airport Gate 4', 'Corporate HQ'],
  },
  {
    id: 'guard-105',
    name: 'David Silva',
    phone: '+1 (555) 789-0123',
    badgeNumber: 'SEC-5510',
    role: 'guard',
    trainingLevel: 'trained',
    email: 'david.silva@secureshift.net',
    certifications: ['TWIC Card', 'Heavy Equipment Perimeter', 'Night Ops Specialist'],
    hireDate: '2025-02-17',
    notes: 'Experienced in port logistics and night industrial coverage.',
    ojtSites: ['Port Authority - Pier 7', 'Industrial Warehouse', 'Retail Plaza'],
  },
  {
    id: 'guard-106',
    name: 'Jamar Vance',
    phone: '+1 (555) 890-1234',
    badgeNumber: 'SEC-3820',
    role: 'guard',
    trainingLevel: 'needs_ojt',
    email: 'jamar.vance@secureshift.net',
    certifications: ['Guard Card', 'Crowd Control'],
    hireDate: '2026-06-01',
    notes: 'New guard. Needs supervisor orientation before medical or airport postings.',
    ojtSites: ['Retail Plaza'],
  },
  {
    id: 'guard-107',
    name: 'Chloe Bennett',
    phone: '+1 (555) 901-2345',
    badgeNumber: 'SEC-1102',
    role: 'supervisor',
    trainingLevel: 'lead_certified',
    email: 'chloe.bennett@secureshift.net',
    certifications: ['Master Instructor', 'Armed Master', 'Crisis Negotiation', 'AED/CPR'],
    hireDate: '2022-04-12',
    notes: 'Shift Supervisor. Certified to conduct OJT sign-offs on all regional sites.',
    ojtSites: [
      'Port Authority - Pier 7',
      'Corporate HQ',
      'West Medical Center',
      'City Airport Gate 4',
      'Retail Plaza',
      'Tech Campus North',
      'Hotel Lobby',
      'Industrial Warehouse'
    ],
  }
];

export const INITIAL_SHIFTS: Shift[] = [
  {
    id: 'shift-101',
    siteName: 'Port Authority - Pier 7',
    address: '2200 Alaskan Way, Pier 7, Seattle, WA 98121',
    location: 'Docklands Gate B, Berth 4',
    date: '2026-08-22',
    startTime: '19:00',
    endTime: '07:00',
    hours: 12,
    urgency: 'emergency',
    status: 'open',
    requiredCertifications: ['TWIC Card', 'Armed Endorsement'],
    notes: 'Urgent coverage needed for midnight shipping convoy security.',
    createdAt: '2026-08-21T08:30:00Z',
    bidsCount: 2,
  },
  {
    id: 'shift-102',
    siteName: 'Corporate HQ - Night Patrol',
    address: '500 Executive Blvd, Main Tower, Bellevue, WA 98004',
    location: 'Main Executive Tower & Perimeter',
    date: '2026-08-23',
    startTime: '22:00',
    endTime: '06:00',
    hours: 8,
    urgency: 'standard',
    status: 'open',
    requiredCertifications: ['CCTV Monitoring', 'CPR/AED'],
    notes: 'Access control and periodic perimeter sweep.',
    createdAt: '2026-08-21T09:15:00Z',
    bidsCount: 1,
  },
  {
    id: 'shift-103',
    siteName: 'West Medical Center - Emergency Dept',
    address: '400 Healing Way, Gate 2, Seattle, WA 98104',
    location: 'Triage ER Security Desk',
    date: '2026-08-21',
    startTime: '08:00',
    endTime: '16:00',
    hours: 8,
    urgency: 'emergency',
    status: 'open',
    requiredCertifications: ['De-escalation', 'Crisis Prevention'],
    notes: 'High-visibility triage area security.',
    createdAt: '2026-08-21T06:00:00Z',
    bidsCount: 0,
  },
  {
    id: 'shift-104',
    siteName: 'City Airport Gate 4',
    address: '17801 International Blvd, Seattle, WA 98158',
    location: 'Terminal B Security Checkpoint',
    date: '2026-08-21',
    startTime: '12:00',
    endTime: '20:00',
    hours: 8,
    urgency: 'standard',
    status: 'filled',
    assignedGuardName: 'Marcus Wright',
    assignedGuardId: 'guard-103',
    requiredCertifications: ['SIDA Badge', 'TSA Screener'],
    notes: 'Ramp access control and badge verification.',
    createdAt: '2026-08-20T16:00:00Z',
    bidsCount: 3,
  },
  {
    id: 'shift-105',
    siteName: 'Retail Plaza - Patrol',
    address: '800 Pine St, Downtown Seattle, WA 98101',
    location: 'North Galleria Outer Perimeter',
    date: '2026-08-24',
    startTime: '14:00',
    endTime: '00:00',
    hours: 10,
    urgency: 'standard',
    status: 'open',
    requiredCertifications: ['Foot Patrol License'],
    notes: 'Closing shift asset protection and crowd monitoring.',
    createdAt: '2026-08-21T10:00:00Z',
    bidsCount: 0,
  },
  {
    id: 'shift-106',
    siteName: 'Tech Campus North - Data Center',
    address: '1501 4th Ave, Tech District, Seattle, WA 98101',
    location: 'Building 4 Vault Facility',
    date: '2026-08-25',
    startTime: '00:00',
    endTime: '08:00',
    hours: 8,
    urgency: 'standard',
    status: 'open',
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
      address: '100 Broadway Ave, Downtown Seattle, WA 98122',
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
      address: '2200 Alaskan Way, Pier 7, Seattle, WA 98121',
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
        address: '4500 Marginal Way S, Industrial District, Seattle, WA 98134',
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
      address: '120 Wall St Tower, Seattle, WA 98101',
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
      address: '400 Healing Way, Gate 2, Seattle, WA 98104',
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
        address: '500 Executive Blvd, Bellevue, WA 98004',
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

export const INITIAL_ADMIN_ACTIONS: AdminAction[] = [
  {
    id: 'admin-action-1',
    type: 'admin_login',
    title: 'Dispatcher Authenticated',
    description: 'Lt. Mark O\'Connor signed in to Ops Dispatch Console with supervisor credentials.',
    adminName: 'Lt. Mark O\'Connor',
    adminBadge: 'OPS-CMD-01',
    timestamp: '2026-08-23T12:55:00Z',
    badgeVariant: 'emerald',
    metadata: { method: 'PIN Authorization', ip: '10.0.4.12' }
  },
  {
    id: 'admin-action-2',
    type: 'shift_created',
    title: 'Emergency Shift Posted',
    description: 'Created 12h emergency shift at Port Authority - Pier 7 (2200 Alaskan Way, Seattle).',
    adminName: 'Lt. Mark O\'Connor',
    adminBadge: 'OPS-CMD-01',
    timestamp: '2026-08-23T11:45:00Z',
    badgeVariant: 'rose',
    metadata: { site: 'Port Authority - Pier 7', urgency: 'emergency', hours: 12 }
  },
  {
    id: 'admin-action-3',
    type: 'trade_approved',
    title: 'Trade Giveaway Approved',
    description: 'Approved shift listing request for Sarah Jenkins (Hotel Grand Lobby, 8h).',
    adminName: 'Dispatcher Sarah Keller',
    adminBadge: 'OPS-DISP-04',
    timestamp: '2026-08-23T10:30:00Z',
    badgeVariant: 'blue',
    metadata: { guard: 'Sarah Jenkins', tradeId: 'trade-201' }
  },
  {
    id: 'admin-action-4',
    type: 'swap_approved',
    title: '2-Way Swap Finalized',
    description: 'Approved swap between Sarah Jenkins (West Medical) and Marcus Wright (Corporate HQ).',
    adminName: 'Lt. Mark O\'Connor',
    adminBadge: 'OPS-CMD-01',
    timestamp: '2026-08-23T09:15:00Z',
    badgeVariant: 'emerald',
    metadata: { guards: ['Sarah Jenkins', 'Marcus Wright'], tradeId: 'trade-204' }
  },
  {
    id: 'admin-action-5',
    type: 'shift_filled',
    title: 'Shift Position Assigned',
    description: 'Assigned Marcus Wright to City Airport Gate 4 shift (8h).',
    adminName: 'Dispatcher Sarah Keller',
    adminBadge: 'OPS-DISP-04',
    timestamp: '2026-08-22T16:00:00Z',
    badgeVariant: 'purple',
    metadata: { guard: 'Marcus Wright', shiftId: 'shift-104' }
  },
  {
    id: 'admin-action-6',
    type: 'bulk_imported',
    title: 'Mass Shift Import',
    description: 'Imported 6 shifts via JSON dispatcher batch template.',
    adminName: 'Captain Raymond Holt',
    adminBadge: 'OPS-LEAD-99',
    timestamp: '2026-08-22T14:20:00Z',
    badgeVariant: 'amber',
    metadata: { count: 6 }
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
    "address": "200 S Jackson St, Pioneer Square, Seattle, WA 98104",
    "location": "Central Hub Security Post #2",
    "date": "2026-08-27",
    "startTime": "06:00",
    "endTime": "14:00",
    "urgency": "standard",
    "requiredCertifications": ["Transit Safety", "First Aid"],
    "notes": "Crowd management and ticket platform surveillance."
  },
  {
    "siteName": "Waterfront Chemical Plant",
    "address": "3400 E Marginal Way S, Seattle, WA 98134",
    "location": "Hazard Bay East Perimeter",
    "date": "2026-08-27",
    "startTime": "18:00",
    "endTime": "06:00",
    "urgency": "emergency",
    "requiredCertifications": ["HAZMAT Level 2", "Armed Guard"],
    "notes": "Critical overnight gate control. Zero tolerance for unescorted visitors."
  },
  {
    "siteName": "Downtown Art Museum",
    "address": "1300 1st Ave, Downtown Seattle, WA 98101",
    "location": "Gallery Wing 3",
    "date": "2026-08-28",
    "startTime": "10:00",
    "endTime": "18:00",
    "urgency": "standard",
    "requiredCertifications": ["Asset Protection"],
    "notes": "VIP exhibition opening day shift."
  }
], null, 2);

export const INITIAL_SHIFT_TEMPLATES: ShiftTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Weekday Day Watch (0800 - 1600)',
    siteName: 'Corporate HQ',
    address: '100 Enterprise Way, Suite 400',
    location: 'Main Executive Lobby & Access Control',
    startTime: '08:00',
    endTime: '16:00',
    urgency: 'standard',
    daysPattern: 'Mon - Fri',
    notes: 'Standard weekday lobby access control, visitor badge issuance.',
    requiredCertifications: ['Access Control', 'Customer Service']
  },
  {
    id: 'tmpl-2',
    name: 'Evening Swing Patrol (1600 - 0000)',
    siteName: 'West Medical Center',
    address: '742 Evergreen Terrace, Emergency Bay',
    location: 'Emergency Wing Entrance & Ambulatory Bay',
    startTime: '16:00',
    endTime: '00:00',
    urgency: 'standard',
    daysPattern: 'Mon - Fri',
    notes: 'Maintain ER lobby de-escalation, monitor visitor flow.',
    requiredCertifications: ['De-escalation', 'CPR/AED']
  },
  {
    id: 'tmpl-3',
    name: 'Graveyard Emergency Watch (0000 - 0800)',
    siteName: 'Port Authority - Pier 7',
    address: 'Pier 7 Terminal Gate, Maritime Blvd',
    location: 'Container Security Gate & Perimeter Guardhouse',
    startTime: '00:00',
    endTime: '08:00',
    urgency: 'emergency',
    daysPattern: 'Daily Night',
    notes: 'Hourly maritime fence line sweeps, gate clearance verification.',
    requiredCertifications: ['Port Safety (TWIC)', 'Patrol Vehicle']
  },
  {
    id: 'tmpl-4',
    name: 'Weekend Night Perimeter (2200 - 0600)',
    siteName: 'Industrial Warehouse',
    address: '880 Logistics Parkway, Gate 3',
    location: 'Loading Bay & South Storage Perimeter',
    startTime: '22:00',
    endTime: '06:00',
    urgency: 'emergency',
    daysPattern: 'Sat - Sun',
    notes: 'Lock checks, perimeter patrol, CCTV alarm verification.',
    requiredCertifications: ['Night Patrol', 'Alarm Response']
  },
  {
    id: 'tmpl-5',
    name: 'Retail Plaza Day Patrol (1000 - 1800)',
    siteName: 'Retail Plaza',
    address: '420 Market Street, Pavilion Courtyard',
    location: 'Central Atrium & West Parking Deck',
    startTime: '10:00',
    endTime: '18:00',
    urgency: 'standard',
    daysPattern: 'Mon - Sat',
    notes: 'High visibility customer-facing foot patrol and lost child assistance.',
    requiredCertifications: ['Customer Service', 'Loss Prevention']
  }
];

export const INITIAL_BIDS: BidRecord[] = [
  {
    id: 'bid-101-1',
    shiftId: 'shift-101',
    siteName: 'Port Authority - Pier 7',
    shiftDate: '2026-08-22',
    shiftTime: '19:00 - 07:00',
    hours: 12,
    guardName: 'Alex Mercer',
    guardPhone: '+1 (555) 234-5678',
    trainingStatus: 'trained',
    smsBody: '[SECURESHIFT BID]\nGuard: Alex Mercer (SEC-8842)\nPhone: +1 (555) 234-5678\nShift: Port Authority - Pier 7\nDate: 2026-08-22 (19:00-07:00, 12h)\nStatus: I am fully TRAINED & qualified on this site.\nPlease confirm assignment.',
    timestamp: '2026-08-21T09:45:00Z'
  },
  {
    id: 'bid-101-2',
    shiftId: 'shift-101',
    siteName: 'Port Authority - Pier 7',
    shiftDate: '2026-08-22',
    shiftTime: '19:00 - 07:00',
    hours: 12,
    guardName: 'David Silva',
    guardPhone: '+1 (555) 789-0123',
    trainingStatus: 'trained',
    smsBody: '[SECURESHIFT BID]\nGuard: David Silva (SEC-5510)\nPhone: +1 (555) 789-0123\nShift: Port Authority - Pier 7\nDate: 2026-08-22 (19:00-07:00, 12h)\nStatus: I am fully TRAINED & qualified on this site.\nPlease confirm assignment.',
    timestamp: '2026-08-21T10:30:00Z'
  },
  {
    id: 'bid-102-1',
    shiftId: 'shift-102',
    siteName: 'Corporate HQ - Night Patrol',
    shiftDate: '2026-08-23',
    shiftTime: '22:00 - 06:00',
    hours: 8,
    guardName: 'Sarah Jenkins',
    guardPhone: '+1 (555) 345-6789',
    trainingStatus: 'trained',
    smsBody: '[SECURESHIFT BID]\nGuard: Sarah Jenkins (SEC-7721)\nPhone: +1 (555) 345-6789\nShift: Corporate HQ - Night Patrol\nDate: 2026-08-23 (22:00-06:00, 8h)\nStatus: I am fully TRAINED & qualified on this site.\nPlease confirm assignment.',
    timestamp: '2026-08-21T11:15:00Z'
  },
  {
    id: 'bid-106-1',
    shiftId: 'shift-106',
    siteName: 'Tech Campus North - Data Center',
    shiftDate: '2026-08-25',
    shiftTime: '00:00 - 08:00',
    hours: 8,
    guardName: 'Elena Rostova',
    guardPhone: '+1 (555) 678-9012',
    trainingStatus: 'trained',
    smsBody: '[SECURESHIFT BID]\nGuard: Elena Rostova (SEC-4199)\nPhone: +1 (555) 678-9012\nShift: Tech Campus North - Data Center\nDate: 2026-08-25 (00:00-08:00, 8h)\nStatus: I am fully TRAINED & qualified on this site.\nPlease confirm assignment.',
    timestamp: '2026-08-21T12:00:00Z'
  },
  {
    id: 'bid-104-1',
    shiftId: 'shift-104',
    siteName: 'City Airport Gate 4',
    shiftDate: '2026-08-21',
    shiftTime: '12:00 - 20:00',
    hours: 8,
    guardName: 'Marcus Wright',
    guardPhone: '+1 (555) 567-8901',
    trainingStatus: 'trained',
    smsBody: '[SECURESHIFT BID]\nGuard: Marcus Wright (SEC-6340)\nPhone: +1 (555) 567-8901\nShift: City Airport Gate 4\nDate: 2026-08-21 (12:00-20:00, 8h)\nStatus: I am fully TRAINED & qualified on this site.\nPlease confirm assignment.',
    timestamp: '2026-08-20T17:00:00Z'
  },
  {
    id: 'bid-104-2',
    shiftId: 'shift-104',
    siteName: 'City Airport Gate 4',
    shiftDate: '2026-08-21',
    shiftTime: '12:00 - 20:00',
    hours: 8,
    guardName: 'Mike Chen',
    guardPhone: '+1 (555) 456-7890',
    trainingStatus: 'needs_ojt',
    smsBody: '[SECURESHIFT BID]\nGuard: Mike Chen (SEC-9104)\nPhone: +1 (555) 456-7890\nShift: City Airport Gate 4\nDate: 2026-08-21 (12:00-20:00, 8h)\nStatus: I NEED OJT / Site Orientation.\nPlease confirm assignment.',
    timestamp: '2026-08-20T18:10:00Z'
  },
  {
    id: 'bid-104-3',
    shiftId: 'shift-104',
    siteName: 'City Airport Gate 4',
    shiftDate: '2026-08-21',
    shiftTime: '12:00 - 20:00',
    hours: 8,
    guardName: 'Elena Rostova',
    guardPhone: '+1 (555) 678-9012',
    trainingStatus: 'trained',
    smsBody: '[SECURESHIFT BID]\nGuard: Elena Rostova (SEC-4199)\nPhone: +1 (555) 678-9012\nShift: City Airport Gate 4\nDate: 2026-08-21 (12:00-20:00, 8h)\nStatus: I am fully TRAINED & qualified on this site.\nPlease confirm assignment.',
    timestamp: '2026-08-20T19:00:00Z'
  }
];

