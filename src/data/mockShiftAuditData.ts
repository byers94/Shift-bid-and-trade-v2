import { ShiftRecord, StandardShiftReport } from '../types/shift';

function getRelativeDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const todayStr = getRelativeDateStr(0);
const yesterdayStr = getRelativeDateStr(1);
const twoDaysAgoStr = getRelativeDateStr(2);
const threeDaysAgoStr = getRelativeDateStr(3);
const fourDaysAgoStr = getRelativeDateStr(4);
const fiveDaysAgoStr = getRelativeDateStr(5);

export const ARCHIVE_LINKED_REPORTS: StandardShiftReport[] = [
  // ---------------------------------------------------------------------------
  // 1. CHLOE BENNETT — West Medical Center (2 DARs + 1 Maintenance Report)
  // ---------------------------------------------------------------------------
  {
    id: 'RPT-ARCH-CB-DAR1',
    reportNumber: 'DAR-2026-9101',
    reportType: 'activity',
    shiftId: 'SHIFT-ARCH-CHLOE-01',
    siteId: 'site-3',
    siteName: 'West Medical Center - Emergency Dept',
    siteAddress: '325 9th Ave, Seattle, WA 98104',
    guardId: '3',
    guardName: 'Chloe Bennett',
    guardBadge: 'SEC-1102',
    guardPhone: '(555) 456-7890',
    timestamp: `${yesterdayStr}T09:30:00`,
    gpsCoordinates: {
      latitude: 47.6042,
      longitude: -122.3244,
      accuracy: 4.1
    },
    media: [
      {
        id: 'med-cb-dar1',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80',
        caption: 'Ambulance Bay & Triage Intake Corridor — All Clear',
        capturedAt: `${yesterdayStr}T09:29:15`,
        fileName: 'er_triage_corridor_check.jpg',
        fileSizeMb: 1.4,
        isUploadedToStorage: true,
        gpsCoordinates: { latitude: 47.6042, longitude: -122.3244 }
      }
    ],
    activityDetails: {
      patrolType: 'interior_inspection',
      zoneChecked: 'ER Triage Lobby, Ambulance Bay Doors & Pharmacy Vault Corridor',
      status: 'all_clear',
      observationNotes:
        'Completed morning security sweep of Emergency Department intake, waiting room, and controlled substance pharmacy corridor. All badge-access magnetic locks verified operational. Zero loitering or obstructions in ambulance bay.',
      isThirtyMinCheckin: true,
      intervalSequence: 3,
      doorsCheckedCount: 14,
      lightsCheckedCount: 28
    },
    status: 'reviewed',
    reviewedByAdmin: {
      adminName: 'Cmdr. Vance Sterling',
      adminBadge: 'OPS-001',
      reviewedAt: `${yesterdayStr}T16:15:00`,
      notes: 'Verified clean morning hospital perimeter sweep.'
    },
    syncStatus: 'synced',
    createdAt: `${yesterdayStr}T09:30:00`
  },
  {
    id: 'RPT-ARCH-CB-DAR2',
    reportNumber: 'DAR-2026-9104',
    reportType: 'activity',
    shiftId: 'SHIFT-ARCH-CHLOE-01',
    siteId: 'site-3',
    siteName: 'West Medical Center - Emergency Dept',
    siteAddress: '325 9th Ave, Seattle, WA 98104',
    guardId: '3',
    guardName: 'Chloe Bennett',
    guardBadge: 'SEC-1102',
    guardPhone: '(555) 456-7890',
    timestamp: `${yesterdayStr}T13:45:00`,
    gpsCoordinates: {
      latitude: 47.6044,
      longitude: -122.3241,
      accuracy: 3.8
    },
    media: [
      {
        id: 'med-cb-dar2',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=900&q=80',
        caption: 'West Medical North Parking Deck & Helipad Access Stairwell',
        capturedAt: `${yesterdayStr}T13:44:00`,
        fileName: 'west_med_north_deck.jpg',
        fileSizeMb: 1.6,
        isUploadedToStorage: true,
        gpsCoordinates: { latitude: 47.6044, longitude: -122.3241 }
      }
    ],
    activityDetails: {
      patrolType: 'perimeter_sweep',
      zoneChecked: 'North Staff Garage, Oxygen Tank Enclosure & Helipad Stairwell B',
      status: 'doors_secured',
      observationNotes:
        'Routine afternoon check of exterior oxygen storage manifold and stairwell access doors. Verified staff shuttle boarding zone clear of unauthorized vehicles.',
      isThirtyMinCheckin: true,
      intervalSequence: 11,
      doorsCheckedCount: 18,
      lightsCheckedCount: 32
    },
    status: 'reviewed',
    reviewedByAdmin: {
      adminName: 'Cmdr. Vance Sterling',
      adminBadge: 'OPS-001',
      reviewedAt: `${yesterdayStr}T16:16:00`,
      notes: 'All checkpoints scanned within SLA.'
    },
    syncStatus: 'synced',
    createdAt: `${yesterdayStr}T13:45:00`
  },
  {
    id: 'RPT-ARCH-CB-MAINT1',
    reportNumber: 'MNT-2026-4412',
    reportType: 'maintenance',
    shiftId: 'SHIFT-ARCH-CHLOE-01',
    siteId: 'site-3',
    siteName: 'West Medical Center - Emergency Dept',
    siteAddress: '325 9th Ave, Seattle, WA 98104',
    guardId: '3',
    guardName: 'Chloe Bennett',
    guardBadge: 'SEC-1102',
    guardPhone: '(555) 456-7890',
    timestamp: `${yesterdayStr}T11:20:00`,
    gpsCoordinates: {
      latitude: 47.6041,
      longitude: -122.3246,
      accuracy: 4.5
    },
    media: [
      {
        id: 'med-cb-mnt1',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80',
        caption: 'Ambulance Bay Roll-Up Gate #2 Hydraulic Sensor Fault',
        capturedAt: `${yesterdayStr}T11:18:30`,
        fileName: 'ambulance_bay_gate_sensor.jpg',
        fileSizeMb: 1.9,
        isUploadedToStorage: true,
        gpsCoordinates: { latitude: 47.6041, longitude: -122.3246 }
      }
    ],
    maintenanceDetails: {
      issueCategory: 'doors_locks_gates',
      severity: 'urgent',
      specificLocation: 'ER Ambulance Bay — High-Speed Roll-Up Gate #2',
      issueTitle: 'Optical Safety Sensor Misaligned — Gate Failing to Auto-Close',
      detailedDescription:
        'During 11:15 patrol check, noticed Ambulance Bay Roll-Up Gate #2 remaining stuck in open position with flashing amber fault LED on control box. Optical safety beam bracket on east bollard was scraped by delivery cart. Stationed officer watch until Facilities Engineering arrived.',
      safetyHazard: true,
      propertyStaffNotified: true,
      notifiedPersonName: 'Greg Halvorsen (Chief Hospital Engineer)',
      suggestedAction: 'Realign optical sensor bracket and reset gate relay controller.',
      workOrderStatus: 'work_order_created',
      workOrderNumber: 'WO-WMC-8839',
      emergencyMaintenanceContacted: true,
      contactedPersonOrVendorName: 'Greg Halvorsen — Hospital Plant Ops (Ext. 4400)',
      timeCalled: '11:21 AM',
      callOutcomeOrTechEta: 'Tech arrived on scene at 11:38 AM; bracket realigned and gate secured.'
    },
    status: 'reviewed',
    reviewedByAdmin: {
      adminName: 'Cmdr. Vance Sterling',
      adminBadge: 'OPS-001',
      reviewedAt: `${yesterdayStr}T16:18:00`,
      notes: 'Prompt escalation to Hospital Plant Ops; gate restored rapidly.'
    },
    syncStatus: 'synced',
    createdAt: `${yesterdayStr}T11:20:00`
  },

  // ---------------------------------------------------------------------------
  // 2. ALEX MERCER — Port Authority Pier 7 (OFF_SITE_CLOCKOUT_ROLLBACK shift)
  // ---------------------------------------------------------------------------
  {
    id: 'RPT-ARCH-AM-DAR1',
    reportNumber: 'DAR-2026-9088',
    reportType: 'activity',
    shiftId: 'SHIFT-ARCH-ALEX-02',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    siteAddress: '1700 Alaskan Way, Pier 7, Seattle, WA 98101',
    guardId: '1',
    guardName: 'Alex Mercer',
    guardBadge: 'SEC-8842',
    guardPhone: '(555) 234-5678',
    timestamp: `${yesterdayStr}T01:15:00`,
    gpsCoordinates: {
      latitude: 47.6063,
      longitude: -122.3422,
      accuracy: 4.2
    },
    media: [
      {
        id: 'med-am-dar1',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=900&q=80',
        caption: 'Pier 7 Container Yard & Berth 4 Customs Gate',
        capturedAt: `${yesterdayStr}T01:13:40`,
        fileName: 'pier7_berth4_gate.jpg',
        fileSizeMb: 1.7,
        isUploadedToStorage: true,
        gpsCoordinates: { latitude: 47.6063, longitude: -122.3422 }
      }
    ],
    activityDetails: {
      patrolType: 'perimeter_sweep',
      zoneChecked: 'Berth 4 Customs Seal Fence, Crane Runway & North Slip Gate',
      status: 'patrol_completed',
      observationNotes:
        'Inspected customs bonded container stacks #104-#140 and verified padlocks on North Slip Gate. Maritime fog moderate; perimeter floodlights operational.',
      isThirtyMinCheckin: true,
      intervalSequence: 8,
      doorsCheckedCount: 9,
      lightsCheckedCount: 22
    },
    status: 'reviewed',
    syncStatus: 'synced',
    createdAt: `${yesterdayStr}T01:15:00`
  },
  {
    id: 'RPT-ARCH-AM-DAR2',
    reportNumber: 'DAR-2026-9092',
    reportType: 'activity',
    shiftId: 'SHIFT-ARCH-ALEX-02',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    siteAddress: '1700 Alaskan Way, Pier 7, Seattle, WA 98101',
    guardId: '1',
    guardName: 'Alex Mercer',
    guardBadge: 'SEC-8842',
    guardPhone: '(555) 234-5678',
    timestamp: `${yesterdayStr}T04:15:00`,
    gpsCoordinates: {
      latitude: 47.6061,
      longitude: -122.3425,
      accuracy: 4.6
    },
    media: [
      {
        id: 'med-am-dar2',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=900&q=80',
        caption: 'South Freight Gatehouse Pre-Dawn Inspection',
        capturedAt: `${yesterdayStr}T04:14:10`,
        fileName: 'pier7_south_gatehouse.jpg',
        fileSizeMb: 1.5,
        isUploadedToStorage: true,
        gpsCoordinates: { latitude: 47.6061, longitude: -122.3425 }
      }
    ],
    activityDetails: {
      patrolType: 'access_checkpoint_check',
      zoneChecked: 'South Freight Gatehouse & Reefer Power Bank B',
      status: 'doors_secured',
      observationNotes:
        'Pre-dawn check of refrigerated container power bank and South Freight Gatehouse prior to morning stevedore shift change.',
      isThirtyMinCheckin: true,
      intervalSequence: 14,
      doorsCheckedCount: 6,
      lightsCheckedCount: 18
    },
    status: 'submitted',
    syncStatus: 'synced',
    createdAt: `${yesterdayStr}T04:15:00`
  },

  // ---------------------------------------------------------------------------
  // 3. ELENA ROSTOVA — Tech Campus North (AUTO_CLOCKED_OUT + Incident w/ UoF)
  // ---------------------------------------------------------------------------
  {
    id: 'RPT-ARCH-ER-INC1',
    reportNumber: 'INC-2026-7731',
    reportType: 'incident',
    shiftId: 'SHIFT-ARCH-ELENA-03',
    siteId: 'site-5',
    siteName: 'Tech Campus North - Data Center',
    siteAddress: '400 Dexter Ave N, Seattle, WA 98109',
    guardId: '5',
    guardName: 'Elena Rostova',
    guardBadge: 'SEC-4199',
    guardPhone: '(555) 678-9012',
    timestamp: `${twoDaysAgoStr}T23:42:00`,
    gpsCoordinates: {
      latitude: 47.6225,
      longitude: -122.3426,
      accuracy: 3.4
    },
    useOfForce: true,
    requiresSupervisorReview: true,
    media: [
      {
        id: 'med-er-inc1',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80',
        caption: 'Server Vault B Loading Dock Breach Point & Forced Latch',
        capturedAt: `${twoDaysAgoStr}T23:38:00`,
        fileName: 'datacenter_dock_breach.jpg',
        fileSizeMb: 2.3,
        isUploadedToStorage: true,
        gpsCoordinates: { latitude: 47.6225, longitude: -122.3426 }
      }
    ],
    incidentDetails: {
      incidentCategory: 'burglary_forced_entry',
      severity: 'critical',
      incidentTitle: 'Unauthorized Forced Entry Attempt at Server Vault B Dock — Subject Detained (UoF Filed)',
      summary:
        'At 23:18, perimeter door sensor #DC-09 triggered an forced-open alarm at Server Vault B service corridor. Subject Devon Vance (driving matte black Dodge Charger Plate WA-789-XTR) attempted to pry emergency exit door with crowbar and lunged at responding officer when cornered in loading bay.',
      detailedTimeline:
        '23:18 — Door alarm #DC-09 received. 23:20 — Officer Rostova arrived on scene, activated Body-Worn Camera #BWC-19, observed male subject with pry bar at Server Vault B service door. 23:21 — Verbal commands issued; subject dropped bar but charged officer attempting to flee through security vestibule. 23:22 — Soft empty-hand control and joint lock utilized to bring subject to ground; handcuffs applied and double-locked. 23:24 — Seattle PD 911 and Field Supervisor notified. 23:36 — SPD Unit 219 took custody.',
      actionTakenByGuard:
        'Activated BWC, issued clear verbal de-escalation commands, applied controlled joint-lock takedown when subject actively charged officer, applied double-locked restraints, checked gauge tightness, and transferred custody to Seattle PD Unit 219.',
      partiesInvolved: [
        {
          id: 'pty-er-1',
          name: 'Devon Vance',
          role: 'suspect',
          idType: 'drivers_license',
          idNumber: 'WDL-9928-441B',
          idStateOrIssuer: 'WA',
          ageApprox: '34',
          gender: 'male',
          height: '6\'0"',
          weightBuild: '195 lbs, Athletic',
          clothingDescription: 'Black hooded jacket, dark cargo pants, mechanic gloves',
          vehicleInfo: '2021 Dodge Charger, Matte Black, Plate: WA-789-XTR',
          statementOrNotes: 'Admitted attempting to access copper busbars in electrical annex.'
        }
      ],
      trespassNoticeIssued: true,
      policeReportNumber: 'SPD-2026-884120',
      escalatedToEmergencyServices: true,
      emergencyServicesContacted: ['police_911', 'operations_supervisor_onscene'],
      emergencyContactTime: '23:24',
      cadIncidentNumber: 'CAD-9924',
      respondingUnits: 'Seattle PD Unit 219 (Ofc. K. Miller #4412)',
      emergencyOutcome: 'Subject arrested for 2nd Degree Burglary & Criminal Trespass; vehicle impounded.',
      supervisorNotified: true,
      supervisorName: 'Lt. Marcus Vance (OPS-004)',
      useOfForce: true,
      requiresSupervisorReview: true,
      useOfForceSupplement: {
        deEscalationAttempted: [
          'Verbal Commands',
          'Command Presence',
          'Time / Distance / Shielding',
          'Clear Warning Issued'
        ],
        subjectResistanceLevels: [
          'Active Resistance (Pulling Away / Fleeing)',
          'Aggressive / Assaultive Physical Action'
        ],
        forceOptionsUtilized: [
          'Soft Empty-Hand Control / Escort Hold',
          'Hard Empty-Hand / Joint Lock Takedown',
          'Mechanical Restraints (Handcuffs)'
        ],
        handcuffsDoubleLocked: true,
        gaugeTightnessChecked: true,
        restraintsTimeAndTransfer: 'Applied at 23:22; custody transferred to SPD Ofc. Miller #4412 at 23:36.',
        subjectInjuryStatus: 'No visible injuries; declined EMS evaluation on scene.',
        officerInjuryStatus: 'Minor abrasion on right forearm; no medical treatment required.',
        bwcActiveStatus: 'Yes — Activated Prior to Contact',
        justificationNarrative:
          'Subject was caught actively forcing entry into a Tier-4 critical data center facility with a steel pry bar. Upon verbal commands, subject dropped the tool but aggressively charged straight at Officer Rostova in a confined vestibule corridor. Proportional joint-lock takedown and mechanical restraints were immediately necessary to prevent assault and detain felony burglary suspect until police arrival.',
        fieldSupervisorImmediatelyNotified: true
      }
    },
    status: 'flagged_for_client',
    reviewedByAdmin: {
      adminName: 'Cmdr. Vance Sterling',
      adminBadge: 'OPS-001',
      reviewedAt: `${yesterdayStr}T08:10:00`,
      notes: 'Use of Force reviewed via BWC footage #BWC-19. Exemplary de-escalation and proportional control within policy.'
    },
    syncStatus: 'synced',
    createdAt: `${twoDaysAgoStr}T23:42:00`
  },
  {
    id: 'RPT-ARCH-ER-DAR1',
    reportNumber: 'DAR-2026-9041',
    reportType: 'activity',
    shiftId: 'SHIFT-ARCH-ELENA-03',
    siteId: 'site-5',
    siteName: 'Tech Campus North - Data Center',
    siteAddress: '400 Dexter Ave N, Seattle, WA 98109',
    guardId: '5',
    guardName: 'Elena Rostova',
    guardBadge: 'SEC-4199',
    guardPhone: '(555) 678-9012',
    timestamp: `${twoDaysAgoStr}T19:30:00`,
    gpsCoordinates: {
      latitude: 47.6223,
      longitude: -122.3424,
      accuracy: 3.9
    },
    media: [
      {
        id: 'med-er-dar1',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=900&q=80',
        caption: 'Biometric Mantrap & Server Hall A Chiller Plant Check',
        capturedAt: `${twoDaysAgoStr}T19:28:00`,
        fileName: 'server_hall_chiller.jpg',
        fileSizeMb: 1.5,
        isUploadedToStorage: true,
        gpsCoordinates: { latitude: 47.6223, longitude: -122.3424 }
      }
    ],
    activityDetails: {
      patrolType: 'interior_inspection',
      zoneChecked: 'Biometric Mantrap A, Generator Yard & Chiller Manifold',
      status: 'all_clear',
      observationNotes: 'All chilled water pressure gauges normal (62 PSI). Biometric mantrap tailgating sensors tested and operational.',
      isThirtyMinCheckin: true,
      intervalSequence: 4,
      doorsCheckedCount: 16,
      lightsCheckedCount: 24
    },
    status: 'reviewed',
    syncStatus: 'synced',
    createdAt: `${twoDaysAgoStr}T19:30:00`
  },

  // ---------------------------------------------------------------------------
  // 4. MARCUS WRIGHT — City Airport Gate 4 Cargo (Overtime Flagged + Incident)
  // ---------------------------------------------------------------------------
  {
    id: 'RPT-ARCH-MW-INC1',
    reportNumber: 'INC-2026-7719',
    reportType: 'incident',
    shiftId: 'SHIFT-ARCH-MARCUS-04',
    siteId: 'site-4',
    siteName: 'City Airport - Gate 4 Cargo',
    siteAddress: '17801 International Blvd, SeaTac, WA 98158',
    guardId: '4',
    guardName: 'Marcus Wright',
    guardBadge: 'SEC-3091',
    guardPhone: '(555) 567-8901',
    timestamp: `${threeDaysAgoStr}T15:50:00`,
    gpsCoordinates: {
      latitude: 47.448,
      longitude: -122.3088,
      accuracy: 4.0
    },
    media: [
      {
        id: 'med-mw-inc1',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
        caption: 'Air Freight Tarmac Gate 4 — Unmanifested Sprinter Van Intercepted',
        capturedAt: `${threeDaysAgoStr}T15:46:00`,
        fileName: 'tarmac_gate4_intercept.jpg',
        fileSizeMb: 2.1,
        isUploadedToStorage: true,
        gpsCoordinates: { latitude: 47.448, longitude: -122.3088 }
      }
    ],
    incidentDetails: {
      incidentCategory: 'suspicious_vehicle',
      severity: 'high',
      incidentTitle: 'Unmanifested Courier Van Attempted Tailgate Entry at Tarmac Gate 4',
      summary:
        'White Freightliner Sprinter Van (Plate OR-441-KLP) attempted to tailgate authorized DHL air-freight tractor through Tarmac Gate 4. Guard triggered pneumatic wedge barrier and detained driver for Port Police credential verification.',
      detailedTimeline:
        '15:35 — Vehicle approached Gate 4 without TSA SIDA placard. 15:36 — Pneumatic barrier raised; driver Viktor Sorokin claimed lost manifest. 15:42 — Port of Seattle Police verified expired vendor credentials and escorted vehicle off airfield perimeter.',
      actionTakenByGuard:
        'Engaged gate hold, scanned driver ID and plate OR-441-KLP, held vehicle in inspection lane until Port Police cleared incident at 16:40 (requiring +45m shift extension).',
      partiesInvolved: [
        {
          id: 'pty-mw-1',
          name: 'Viktor Sorokin',
          role: 'contractor',
          idType: 'drivers_license',
          idNumber: 'OR-9910284',
          idStateOrIssuer: 'OR',
          vehicleInfo: '2022 White Freightliner Sprinter, Plate: OR-441-KLP',
          statementOrNotes: 'Subcontractor courier with expired SIDA cargo pass.'
        }
      ],
      trespassNoticeIssued: false,
      policeReportNumber: 'POSPD-26-1904',
      escalatedToEmergencyServices: true,
      emergencyServicesContacted: ['transit_police'],
      emergencyContactTime: '15:38',
      cadIncidentNumber: 'CAD-9890',
      respondingUnits: 'Port Police Unit 14',
      emergencyOutcome: 'Expired pass confiscated; vehicle escorted off property.',
      supervisorNotified: true,
      supervisorName: 'Cmdr. Vance Sterling'
    },
    status: 'reviewed',
    syncStatus: 'synced',
    createdAt: `${threeDaysAgoStr}T15:50:00`
  },

  // ---------------------------------------------------------------------------
  // 5. SARAH JENKINS — Corporate HQ Main Tower (Today's Completed Shift)
  // ---------------------------------------------------------------------------
  {
    id: 'RPT-ARCH-SJ-DAR1',
    reportNumber: 'DAR-2026-9140',
    reportType: 'activity',
    shiftId: 'SHIFT-ARCH-SARAH-05',
    siteId: 'site-2',
    siteName: 'Corporate HQ - Main Tower',
    siteAddress: '1201 Third Ave, Seattle, WA 98101',
    guardId: '2',
    guardName: 'Sarah Jenkins',
    guardBadge: 'SEC-2044',
    guardPhone: '(555) 345-6789',
    timestamp: `${todayStr}T05:30:00`,
    gpsCoordinates: {
      latitude: 47.6075,
      longitude: -122.3358,
      accuracy: 3.5
    },
    media: [
      {
        id: 'med-sj-dar1',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
        caption: 'Corporate HQ Main Atrium Turnstiles & Executive Elevator Bank',
        capturedAt: `${todayStr}T05:28:00`,
        fileName: 'corp_hq_atrium.jpg',
        fileSizeMb: 1.8,
        isUploadedToStorage: true,
        gpsCoordinates: { latitude: 47.6075, longitude: -122.3358 }
      }
    ],
    activityDetails: {
      patrolType: 'fixed_post_scan',
      zoneChecked: 'Main Lobby Optical Turnstiles, 40th Floor Executive Suite & Loading Dock',
      status: 'all_clear',
      observationNotes:
        'Early morning contractor badge check and executive floor lockup verification completed. Zero exceptions.',
      isThirtyMinCheckin: true,
      intervalSequence: 12,
      doorsCheckedCount: 22,
      lightsCheckedCount: 40
    },
    status: 'reviewed',
    syncStatus: 'synced',
    createdAt: `${todayStr}T05:30:00`
  }
];

export const INITIAL_SHIFT_RECORDS: ShiftRecord[] = [
  // ===========================================================================
  // RECORD 1: ALEX MERCER — Port Authority Pier 7 (OFF_SITE_CLOCKOUT_ROLLBACK)
  // 28-minute rollback to last on-site ping at 04:32 AM
  // ===========================================================================
  {
    id: 'SHIFT-ARCH-ALEX-02',
    guardId: '1',
    guardName: 'Alex Mercer',
    guardBadge: 'SEC-8842',
    guardPhone: '(555) 234-5678',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    siteCode: 'PORT-P7',
    siteAddress: '1700 Alaskan Way, Pier 7, Seattle, WA 98101',
    date: yesterdayStr,
    postRole: 'Maritime Perimeter & Customs Berth 4 Patrol',
    scheduledStartTime: `${twoDaysAgoStr}T21:00:00`,
    scheduledEndTime: `${yesterdayStr}T05:00:00`,
    actualClockInTime: `${twoDaysAgoStr}T20:58:00`,
    actualClockOutTime: `${yesterdayStr}T04:32:00`,
    clockInLocation: {
      lat: 47.6062,
      lng: -122.3425,
      insideGeofence: true,
      accuracy: 4.1
    },
    clockOutLocation: {
      lat: 47.6149,
      lng: -122.3301,
      insideGeofence: false,
      accuracy: 6.4,
      distanceMeters: 1340
    },
    lastOnSitePingTimestamp: `${yesterdayStr}T04:32:00`,
    breaks: [
      {
        id: 'brk-am-1',
        startTime: `${yesterdayStr}T00:30:00`,
        endTime: `${yesterdayStr}T01:00:00`,
        durationMinutes: 30,
        type: 'MEAL',
        note: 'Authorized 30m meal break inside Pier 7 Guardhouse B'
      },
      {
        id: 'brk-am-2',
        startTime: `${yesterdayStr}T03:00:00`,
        endTime: `${yesterdayStr}T03:10:00`,
        durationMinutes: 10,
        type: 'REST',
        note: 'Rest break'
      }
    ],
    gpsBreadcrumbs: [
      {
        timestamp: `${twoDaysAgoStr}T20:58:00`,
        lat: 47.6062,
        lng: -122.3425,
        accuracy: 4.1,
        insideGeofence: true,
        event: 'CLOCK_IN',
        distanceMeters: 12,
        label: 'Pier 7 Main Gatehouse Clock-In'
      },
      {
        timestamp: `${twoDaysAgoStr}T22:15:00`,
        lat: 47.6065,
        lng: -122.3429,
        accuracy: 3.8,
        insideGeofence: true,
        event: 'CHECKPOINT',
        distanceMeters: 38,
        label: 'North Slip Customs Seal Checkpoint #1'
      },
      {
        timestamp: `${yesterdayStr}T00:30:00`,
        lat: 47.6061,
        lng: -122.3423,
        accuracy: 4.5,
        insideGeofence: true,
        event: 'BREAK',
        distanceMeters: 19,
        label: 'Authorized Meal Break — Guardhouse B'
      },
      {
        timestamp: `${yesterdayStr}T01:15:00`,
        lat: 47.6063,
        lng: -122.3422,
        accuracy: 4.2,
        insideGeofence: true,
        event: 'CHECKPOINT',
        distanceMeters: 29,
        label: 'Berth 4 Container Stack Sweep (DAR-2026-9088)'
      },
      {
        timestamp: `${yesterdayStr}T03:00:00`,
        lat: 47.6062,
        lng: -122.3424,
        accuracy: 4.0,
        insideGeofence: true,
        event: 'BREAK',
        distanceMeters: 15,
        label: 'Authorized 10m Rest Break'
      },
      {
        timestamp: `${yesterdayStr}T04:15:00`,
        lat: 47.6061,
        lng: -122.3425,
        accuracy: 4.6,
        insideGeofence: true,
        event: 'PATROL_PING',
        distanceMeters: 24,
        label: 'South Freight Gatehouse Patrol (DAR-2026-9092)'
      },
      {
        timestamp: `${yesterdayStr}T04:32:00`,
        lat: 47.6059,
        lng: -122.3419,
        accuracy: 4.3,
        insideGeofence: true,
        event: 'PATROL_PING',
        distanceMeters: 68,
        label: 'LAST VERIFIED ON-SITE PING (Alaskan Way Perimeter Gate)'
      },
      {
        timestamp: `${yesterdayStr}T04:36:00`,
        lat: 47.6088,
        lng: -122.3375,
        accuracy: 5.9,
        insideGeofence: false,
        event: 'PERIMETER_EXIT',
        distanceMeters: 460,
        label: 'Exited Pier 7 Geofence — Moving East on Stewart St'
      },
      {
        timestamp: `${yesterdayStr}T05:00:00`,
        lat: 47.6149,
        lng: -122.3301,
        accuracy: 6.4,
        insideGeofence: false,
        event: 'CLOCK_OUT',
        distanceMeters: 1340,
        label: 'OFF-SITE CLOCK-OUT ATTEMPT (1.34km Outside Geofence)'
      }
    ],
    linkedReportIds: ['RPT-ARCH-AM-DAR1', 'RPT-ARCH-AM-DAR2'],
    status: 'OFF_SITE_CLOCKOUT_ROLLBACK',
    timeAdjustmentAudit: {
      originalClockOutTime: `${yesterdayStr}T05:00:00`,
      adjustedClockOutTime: `${yesterdayStr}T04:32:00`,
      deductedMinutes: 28,
      reason:
        'Off-Site Clock-Out Rollback: Guard terminated shift while outside property geofence. Paid time rolled back to last on-site ping at 04:32 AM. Deducted 28m.',
      timestamp: `${yesterdayStr}T05:00:02`,
      exitCoordinates: {
        lat: 47.6149,
        lng: -122.3301,
        distanceMeters: 1340
      }
    },
    scheduledHours: 8.0,
    actualPayableHours: 7.53
  },

  // ===========================================================================
  // RECORD 2: CHLOE BENNETT — West Medical Center (Clean COMPLETED shift)
  // 2 DARs + 1 Maintenance Report
  // ===========================================================================
  {
    id: 'SHIFT-ARCH-CHLOE-01',
    guardId: '3',
    guardName: 'Chloe Bennett',
    guardBadge: 'SEC-1102',
    guardPhone: '(555) 456-7890',
    siteId: 'site-3',
    siteName: 'West Medical Center - Emergency Dept',
    siteCode: 'WMC-ER',
    siteAddress: '325 9th Ave, Seattle, WA 98104',
    date: yesterdayStr,
    postRole: 'ER Triage & Ambulance Bay Access Control',
    scheduledStartTime: `${yesterdayStr}T08:00:00`,
    scheduledEndTime: `${yesterdayStr}T16:00:00`,
    actualClockInTime: `${yesterdayStr}T07:56:00`,
    actualClockOutTime: `${yesterdayStr}T16:02:00`,
    clockInLocation: {
      lat: 47.6042,
      lng: -122.3244,
      insideGeofence: true,
      accuracy: 3.6
    },
    clockOutLocation: {
      lat: 47.6042,
      lng: -122.3243,
      insideGeofence: true,
      accuracy: 3.9,
      distanceMeters: 14
    },
    lastOnSitePingTimestamp: `${yesterdayStr}T16:02:00`,
    breaks: [
      {
        id: 'brk-cb-1',
        startTime: `${yesterdayStr}T10:15:00`,
        endTime: `${yesterdayStr}T10:25:00`,
        durationMinutes: 10,
        type: 'REST',
        note: 'Morning rest break'
      },
      {
        id: 'brk-cb-2',
        startTime: `${yesterdayStr}T12:30:00`,
        endTime: `${yesterdayStr}T13:00:00`,
        durationMinutes: 30,
        type: 'MEAL',
        note: 'Meal break — Hospital Cafeteria Annex'
      }
    ],
    gpsBreadcrumbs: [
      {
        timestamp: `${yesterdayStr}T07:56:00`,
        lat: 47.6042,
        lng: -122.3244,
        accuracy: 3.6,
        insideGeofence: true,
        event: 'CLOCK_IN',
        distanceMeters: 11,
        label: 'ER Security Command Desk Clock-In'
      },
      {
        timestamp: `${yesterdayStr}T09:30:00`,
        lat: 47.6042,
        lng: -122.3244,
        accuracy: 4.1,
        insideGeofence: true,
        event: 'CHECKPOINT',
        distanceMeters: 18,
        label: 'ER Triage & Pharmacy Vault Sweep (DAR-2026-9101)'
      },
      {
        timestamp: `${yesterdayStr}T11:20:00`,
        lat: 47.6041,
        lng: -122.3246,
        accuracy: 4.5,
        insideGeofence: true,
        event: 'CHECKPOINT',
        distanceMeters: 26,
        label: 'Ambulance Bay Gate #2 Maintenance Escalation (MNT-2026-4412)'
      },
      {
        timestamp: `${yesterdayStr}T12:30:00`,
        lat: 47.6043,
        lng: -122.3242,
        accuracy: 4.0,
        insideGeofence: true,
        event: 'BREAK',
        distanceMeters: 22,
        label: 'Authorized 30m Meal Break'
      },
      {
        timestamp: `${yesterdayStr}T13:45:00`,
        lat: 47.6044,
        lng: -122.3241,
        accuracy: 3.8,
        insideGeofence: true,
        event: 'PATROL_PING',
        distanceMeters: 34,
        label: 'North Garage & Helipad Stairwell Check (DAR-2026-9104)'
      },
      {
        timestamp: `${yesterdayStr}T16:02:00`,
        lat: 47.6042,
        lng: -122.3243,
        accuracy: 3.9,
        insideGeofence: true,
        event: 'CLOCK_OUT',
        distanceMeters: 14,
        label: 'On-Site Shift Handover & Clock-Out'
      }
    ],
    linkedReportIds: [
      'RPT-ARCH-CB-DAR1',
      'RPT-ARCH-CB-DAR2',
      'RPT-ARCH-CB-MAINT1'
    ],
    status: 'COMPLETED',
    scheduledHours: 8.0,
    actualPayableHours: 8.0
  },

  // ===========================================================================
  // RECORD 3: ELENA ROSTOVA — Tech Campus North (AUTO_CLOCKED_OUT + UoF Incident)
  // +30m warning timeout after late arrest paperwork, verified ON-SITE
  // ===========================================================================
  {
    id: 'SHIFT-ARCH-ELENA-03',
    guardId: '5',
    guardName: 'Elena Rostova',
    guardBadge: 'SEC-4199',
    guardPhone: '(555) 678-9012',
    siteId: 'site-5',
    siteName: 'Tech Campus North - Data Center',
    siteCode: 'TECH-DC1',
    siteAddress: '400 Dexter Ave N, Seattle, WA 98109',
    date: twoDaysAgoStr,
    postRole: 'Tier-4 Server Vault & Perimeter Security',
    scheduledStartTime: `${twoDaysAgoStr}T16:00:00`,
    scheduledEndTime: `${twoDaysAgoStr}T23:59:00`,
    actualClockInTime: `${twoDaysAgoStr}T15:57:00`,
    actualClockOutTime: `${yesterdayStr}T00:30:00`,
    clockInLocation: {
      lat: 47.6223,
      lng: -122.3424,
      insideGeofence: true,
      accuracy: 3.5
    },
    clockOutLocation: {
      lat: 47.6224,
      lng: -122.3425,
      insideGeofence: true,
      accuracy: 3.7,
      distanceMeters: 19
    },
    lastOnSitePingTimestamp: `${yesterdayStr}T00:30:00`,
    breaks: [
      {
        id: 'brk-er-1',
        startTime: `${twoDaysAgoStr}T20:00:00`,
        endTime: `${twoDaysAgoStr}T20:30:00`,
        durationMinutes: 30,
        type: 'MEAL',
        note: 'Meal break inside Data Center SOC Breakroom'
      }
    ],
    gpsBreadcrumbs: [
      {
        timestamp: `${twoDaysAgoStr}T15:57:00`,
        lat: 47.6223,
        lng: -122.3424,
        accuracy: 3.5,
        insideGeofence: true,
        event: 'CLOCK_IN',
        distanceMeters: 9,
        label: 'Data Center SOC Console Clock-In'
      },
      {
        timestamp: `${twoDaysAgoStr}T19:30:00`,
        lat: 47.6223,
        lng: -122.3424,
        accuracy: 3.9,
        insideGeofence: true,
        event: 'CHECKPOINT',
        distanceMeters: 16,
        label: 'Biometric Mantrap & Chiller Inspection (DAR-2026-9041)'
      },
      {
        timestamp: `${twoDaysAgoStr}T20:00:00`,
        lat: 47.6222,
        lng: -122.3423,
        accuracy: 4.1,
        insideGeofence: true,
        event: 'BREAK',
        distanceMeters: 14,
        label: 'Authorized 30m Meal Break'
      },
      {
        timestamp: `${twoDaysAgoStr}T23:20:00`,
        lat: 47.6225,
        lng: -122.3426,
        accuracy: 3.4,
        insideGeofence: true,
        event: 'CHECKPOINT',
        distanceMeters: 31,
        label: 'Server Vault B Forced Entry Response & Arrest (INC-2026-7731 / UoF)'
      },
      {
        timestamp: `${yesterdayStr}T00:30:00`,
        lat: 47.6224,
        lng: -122.3425,
        accuracy: 3.7,
        insideGeofence: true,
        event: 'CLOCK_OUT',
        distanceMeters: 19,
        label: 'AUTO CLOCK-OUT (+30m Warning Timeout Expired On-Site)'
      }
    ],
    linkedReportIds: ['RPT-ARCH-ER-INC1', 'RPT-ARCH-ER-DAR1'],
    status: 'AUTO_CLOCKED_OUT',
    timeAdjustmentAudit: {
      originalClockOutTime: `${yesterdayStr}T00:30:00`,
      adjustedClockOutTime: `${yesterdayStr}T00:30:00`,
      deductedMinutes: 0,
      reason:
        'Automated Expiration Clock-Out: Shift reached scheduled end time (23:59) while officer was finalizing SPD custody transfer and Use of Force supplement INC-2026-7731. Unacknowledged +30m warning expired at 00:30 AM. Officer verified inside geofence at termination.',
      timestamp: `${yesterdayStr}T00:30:00`
    },
    scheduledHours: 8.0,
    actualPayableHours: 8.5,
    overtimeMinutes: 30,
    isOvertimeFlagged: true,
    expirationWarningShownAt: `${twoDaysAgoStr}T23:59:00`
  },

  // ===========================================================================
  // RECORD 4: MARCUS WRIGHT — City Airport Gate 4 (+45m OT Flagged Shift)
  // ===========================================================================
  {
    id: 'SHIFT-ARCH-MARCUS-04',
    guardId: '4',
    guardName: 'Marcus Wright',
    guardBadge: 'SEC-3091',
    guardPhone: '(555) 567-8901',
    siteId: 'site-4',
    siteName: 'City Airport - Gate 4 Cargo',
    siteCode: 'SEA-G4',
    siteAddress: '17801 International Blvd, SeaTac, WA 98158',
    date: threeDaysAgoStr,
    postRole: 'Air Cargo Tarmac Gate 4 Access & SIDA Inspection',
    scheduledStartTime: `${threeDaysAgoStr}T08:00:00`,
    scheduledEndTime: `${threeDaysAgoStr}T16:00:00`,
    actualClockInTime: `${threeDaysAgoStr}T07:58:00`,
    actualClockOutTime: `${threeDaysAgoStr}T16:45:00`,
    clockInLocation: {
      lat: 47.448,
      lng: -122.3088,
      insideGeofence: true,
      accuracy: 3.9
    },
    clockOutLocation: {
      lat: 47.4481,
      lng: -122.3087,
      insideGeofence: true,
      accuracy: 4.2,
      distanceMeters: 16
    },
    lastOnSitePingTimestamp: `${threeDaysAgoStr}T16:45:00`,
    breaks: [
      {
        id: 'brk-mw-1',
        startTime: `${threeDaysAgoStr}T12:00:00`,
        endTime: `${threeDaysAgoStr}T12:30:00`,
        durationMinutes: 30,
        type: 'MEAL',
        note: 'Meal break — Gate 4 Operations Trailer'
      }
    ],
    gpsBreadcrumbs: [
      {
        timestamp: `${threeDaysAgoStr}T07:58:00`,
        lat: 47.448,
        lng: -122.3088,
        accuracy: 3.9,
        insideGeofence: true,
        event: 'CLOCK_IN',
        distanceMeters: 10,
        label: 'Gate 4 Tarmac Booth Clock-In'
      },
      {
        timestamp: `${threeDaysAgoStr}T12:00:00`,
        lat: 47.4479,
        lng: -122.3089,
        accuracy: 4.1,
        insideGeofence: true,
        event: 'BREAK',
        distanceMeters: 18,
        label: 'Authorized 30m Meal Break'
      },
      {
        timestamp: `${threeDaysAgoStr}T15:50:00`,
        lat: 47.448,
        lng: -122.3088,
        accuracy: 4.0,
        insideGeofence: true,
        event: 'CHECKPOINT',
        distanceMeters: 12,
        label: 'Sprinter Van Tailgate Intercept (INC-2026-7719)'
      },
      {
        timestamp: `${threeDaysAgoStr}T16:45:00`,
        lat: 47.4481,
        lng: -122.3087,
        accuracy: 4.2,
        insideGeofence: true,
        event: 'CLOCK_OUT',
        distanceMeters: 16,
        label: 'Extended Shift Clock-Out After Port Police Handover (+45m OT)'
      }
    ],
    linkedReportIds: ['RPT-ARCH-MW-INC1'],
    status: 'COMPLETED',
    scheduledHours: 8.0,
    actualPayableHours: 8.75,
    overtimeMinutes: 45,
    isOvertimeFlagged: true,
    extensionHistory: [
      {
        extendedAt: `${threeDaysAgoStr}T16:00:00`,
        minutesAdded: 30,
        reason: 'Staying late for Port Police SIDA credential seizure & incident hand-off (INC-2026-7719)'
      }
    ]
  },

  // ===========================================================================
  // RECORD 5: SARAH JENKINS — Corporate HQ Main Tower (Today's Clean Shift)
  // ===========================================================================
  {
    id: 'SHIFT-ARCH-SARAH-05',
    guardId: '2',
    guardName: 'Sarah Jenkins',
    guardBadge: 'SEC-2044',
    guardPhone: '(555) 345-6789',
    siteId: 'site-2',
    siteName: 'Corporate HQ - Main Tower',
    siteCode: 'CORP-HQ',
    siteAddress: '1201 Third Ave, Seattle, WA 98101',
    date: todayStr,
    postRole: 'Main Atrium Turnstiles & Executive Concierge Desk',
    scheduledStartTime: `${ yesterdayStr }T22:00:00`,
    scheduledEndTime: `${todayStr}T06:00:00`,
    actualClockInTime: `${yesterdayStr}T21:58:00`,
    actualClockOutTime: `${todayStr}T06:01:00`,
    clockInLocation: {
      lat: 47.6075,
      lng: -122.3358,
      insideGeofence: true,
      accuracy: 3.3
    },
    clockOutLocation: {
      lat: 47.6075,
      lng: -122.3357,
      insideGeofence: true,
      accuracy: 3.5,
      distanceMeters: 9
    },
    lastOnSitePingTimestamp: `${todayStr}T06:01:00`,
    breaks: [
      {
        id: 'brk-sj-1',
        startTime: `${todayStr}T02:00:00`,
        endTime: `${todayStr}T02:30:00`,
        durationMinutes: 30,
        type: 'MEAL',
        note: 'Meal break — Mezzanine Security Lounge'
      }
    ],
    gpsBreadcrumbs: [
      {
        timestamp: `${yesterdayStr}T21:58:00`,
        lat: 47.6075,
        lng: -122.3358,
        accuracy: 3.3,
        insideGeofence: true,
        event: 'CLOCK_IN',
        distanceMeters: 8,
        label: 'Main Tower Security Podium Clock-In'
      },
      {
        timestamp: `${todayStr}T02:00:00`,
        lat: 47.6076,
        lng: -122.3359,
        accuracy: 3.8,
        insideGeofence: true,
        event: 'BREAK',
        distanceMeters: 14,
        label: 'Authorized 30m Meal Break'
      },
      {
        timestamp: `${todayStr}T05:30:00`,
        lat: 47.6075,
        lng: -122.3358,
        accuracy: 3.5,
        insideGeofence: true,
        event: 'CHECKPOINT',
        distanceMeters: 11,
        label: 'Executive Floor & Atrium Inspection (DAR-2026-9140)'
      },
      {
        timestamp: `${todayStr}T06:01:00`,
        lat: 47.6075,
        lng: -122.3357,
        accuracy: 3.5,
        insideGeofence: true,
        event: 'CLOCK_OUT',
        distanceMeters: 9,
        label: 'On-Site Relief Hand-Off & Clock-Out'
      }
    ],
    linkedReportIds: ['RPT-ARCH-SJ-DAR1'],
    status: 'COMPLETED',
    scheduledHours: 8.0,
    actualPayableHours: 8.0
  },

  // ===========================================================================
  // RECORD 6: DAVID SILVA — Waterfront Chemical Plant (4 Days Ago, -32m Rollback)
  // ===========================================================================
  {
    id: 'SHIFT-ARCH-DAVID-06',
    guardId: '6',
    guardName: 'David Silva',
    guardBadge: 'SEC-5510',
    guardPhone: '(555) 789-0123',
    siteId: 'site-6',
    siteName: 'Waterfront Chemical Plant',
    siteCode: 'CHEM-W1',
    siteAddress: '3400 E Marginal Way S, Seattle, WA 98134',
    date: fourDaysAgoStr,
    postRole: 'Hazmat Tank Farm & Rail Spur Perimeter',
    scheduledStartTime: `${fiveDaysAgoStr}T22:00:00`,
    scheduledEndTime: `${fourDaysAgoStr}T06:00:00`,
    actualClockInTime: `${fiveDaysAgoStr}T21:59:00`,
    actualClockOutTime: `${fourDaysAgoStr}T05:28:00`,
    clockInLocation: {
      lat: 47.5735,
      lng: -122.3401,
      insideGeofence: true,
      accuracy: 4.4
    },
    clockOutLocation: {
      lat: 47.5812,
      lng: -122.3342,
      insideGeofence: false,
      accuracy: 5.8,
      distanceMeters: 980
    },
    lastOnSitePingTimestamp: `${fourDaysAgoStr}T05:28:00`,
    breaks: [
      {
        id: 'brk-ds-1',
        startTime: `${fourDaysAgoStr}T01:30:00`,
        endTime: `${fourDaysAgoStr}T02:00:00`,
        durationMinutes: 30,
        type: 'MEAL',
        note: 'Meal break'
      }
    ],
    gpsBreadcrumbs: [
      {
        timestamp: `${fiveDaysAgoStr}T21:59:00`,
        lat: 47.5735,
        lng: -122.3401,
        accuracy: 4.4,
        insideGeofence: true,
        event: 'CLOCK_IN',
        distanceMeters: 15,
        label: 'East Marginal Gatehouse Clock-In'
      },
      {
        timestamp: `${fourDaysAgoStr}T01:30:00`,
        lat: 47.5736,
        lng: -122.3402,
        accuracy: 4.1,
        insideGeofence: true,
        event: 'BREAK',
        distanceMeters: 21,
        label: 'Authorized Meal Break'
      },
      {
        timestamp: `${fourDaysAgoStr}T05:28:00`,
        lat: 47.5738,
        lng: -122.3398,
        accuracy: 4.7,
        insideGeofence: true,
        event: 'PATROL_PING',
        distanceMeters: 52,
        label: 'LAST VERIFIED ON-SITE PING (North Rail Spur Gate)'
      },
      {
        timestamp: `${fourDaysAgoStr}T05:33:00`,
        lat: 47.5769,
        lng: -122.3371,
        accuracy: 5.5,
        insideGeofence: false,
        event: 'PERIMETER_EXIT',
        distanceMeters: 440,
        label: 'Exited Chemical Plant Geofence'
      },
      {
        timestamp: `${fourDaysAgoStr}T06:00:00`,
        lat: 47.5812,
        lng: -122.3342,
        accuracy: 5.8,
        insideGeofence: false,
        event: 'CLOCK_OUT',
        distanceMeters: 980,
        label: 'OFF-SITE CLOCK-OUT ATTEMPT (980m Outside Geofence)'
      }
    ],
    linkedReportIds: [],
    status: 'OFF_SITE_CLOCKOUT_ROLLBACK',
    timeAdjustmentAudit: {
      originalClockOutTime: `${fourDaysAgoStr}T06:00:00`,
      adjustedClockOutTime: `${fourDaysAgoStr}T05:28:00`,
      deductedMinutes: 32,
      reason:
        'Off-Site Clock-Out Rollback: Guard terminated shift while outside property geofence. Paid time rolled back to last on-site ping at 05:28 AM. Deducted 32m.',
      timestamp: `${fourDaysAgoStr}T06:00:00`,
      exitCoordinates: {
        lat: 47.5812,
        lng: -122.3342,
        distanceMeters: 980
      }
    },
    scheduledHours: 8.0,
    actualPayableHours: 7.47
  }
];
