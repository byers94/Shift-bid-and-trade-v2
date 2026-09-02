import { AlertSeverity, AlertType } from '../types/shift';

export interface EmergencyPreset {
  id: string;
  name: string;
  category: string;
  severity: AlertSeverity;
  alertType: AlertType;
  title: string;
  message: string;
  suggestedAction: string;
  requireAcknowledgment: boolean;
}

export const EMERGENCY_PRESETS: EmergencyPreset[] = [
  {
    id: 'preset-lockdown',
    name: 'Code Red: Facility Lockdown',
    category: 'High Threat',
    severity: 'critical',
    alertType: 'lockdown',
    title: 'CODE RED: IMMEDIATE FACILITY LOCKDOWN',
    message: 'Immediate shelter in place ordered by Ops Dispatch. All exterior turnstiles, loading docks, and pedestrian access gates must be sealed and locked immediately. Secure all post perimeters and stand by on tactical radio Channel 1.',
    suggestedAction: 'Lock all perimeter access points and verify all security posts secure.',
    requireAcknowledgment: true
  },
  {
    id: 'preset-active-threat',
    name: 'Active Security Threat / Intruder',
    category: 'Hostile Incident',
    severity: 'critical',
    alertType: 'active_threat',
    title: 'CRITICAL ALERT: ACTIVE HOSTILE THREAT REPORTED',
    message: 'Hostile threat reported in the facility sector. Local Law Enforcement and tactical response en route. Execute standard Run-Hide-Fight protocol. Guide civilian personnel to designated shelter rooms. Maintain radio silence unless reporting suspect movements.',
    suggestedAction: 'Take cover, guide civilians into locked safe areas, report suspect location to Dispatch.',
    requireAcknowledgment: true
  },
  {
    id: 'preset-fire-evac',
    name: 'Emergency Evacuation (Fire / Hazard)',
    category: 'Life Safety',
    severity: 'critical',
    alertType: 'fire_evac',
    title: 'EMERGENCY EVACUATION IN PROGRESS',
    message: 'Full facility evacuation ordered due to fire/hazardous condition. All security officers direct building occupants towards emergency stairwells and designated outdoor muster assembly zones. Check restrooms and common zones along your post beat.',
    suggestedAction: 'Direct crowd flow to emergency exits and confirm post evacuation complete.',
    requireAcknowledgment: true
  },
  {
    id: 'preset-perimeter-breach',
    name: 'Perimeter Intrusion / Fence Breach',
    category: 'Perimeter Security',
    severity: 'warning',
    alertType: 'perimeter_breach',
    title: 'ALERT: PERIMETER SECURITY BREACH DETECTED',
    message: 'Unauthorized intrusion detected along facility perimeter fence. Mobile Patrol units dispatched. Static checkpoint guards verify credentials of all personnel and hold non-authorized vehicles at gates.',
    suggestedAction: 'Inspect surrounding sector, challenge unknown individuals, verify gate locks.',
    requireAcknowledgment: true
  },
  {
    id: 'preset-severe-weather',
    name: 'Severe Weather / Power Outage',
    category: 'Environment / Facility',
    severity: 'warning',
    alertType: 'severe_weather',
    title: 'WEATHER ADVISORY & CRITICAL POWER OUTAGE',
    message: 'Severe storm warning and localized power grid failure. Switch to battery-backed auxiliary flashlights. Mobile Patrol units verify generator room status, water ingress points, and maintain manual sign-in logs.',
    suggestedAction: 'Verify backup generator operation and secure exterior storm doors.',
    requireAcknowledgment: true
  },
  {
    id: 'preset-medical-alert',
    name: 'Medical Emergency (EMS En Route)',
    category: 'Medical / First Aid',
    severity: 'info',
    alertType: 'medical',
    title: 'OPS ADVISORY: EMS AMBULANCE INBOUND',
    message: 'Emergency Medical Services responding to facility. Gate officers hold priority vehicle access lane open. Lobby officer hold Elevator #3 in service mode on Ground Floor for paramedics.',
    suggestedAction: 'Hold entry gate clear for incoming ambulance and stage designated elevator.',
    requireAcknowledgment: true
  }
];
