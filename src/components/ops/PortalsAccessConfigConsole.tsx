import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Building2,
  Home,
  Key,
  Copy,
  Check,
  RefreshCw,
  MapPin,
  Compass,
  Volume2,
  Car,
  AlertTriangle,
  Wrench,
  UserCheck,
  Calendar,
  FileText,
  Star,
  Sparkles,
  ShieldCheck,
  Lock,
  Upload,
  Target,
  CheckCircle2,
  Globe,
  Phone,
  ExternalLink,
  X
} from 'lucide-react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import {
  useClientCredentialsStore,
  useClientPortalConfigStore,
  ClientPortalSiteConfig
} from '../client/ClientPortal';
import {
  useResidentServiceConfigStore,
  ResidentServiceConfig
} from '../resident/ResidentPortal';

interface PortalsAccessConfigConsoleProps {
  initialSiteId?: string | null;
  initialTab?: 'CLIENT_CONFIG' | 'RESIDENT_CONFIG';
  isModal?: boolean;
  onClose?: () => void;
}

const DEFAULT_SECONDARY_ADDRESSES_BY_SITE: Record<string, string> = {
  'site-12': '800-899 Midtown Blvd, 1400-1499 5th Ave',
  'site-1': '1400-1499 Harbor Way, 2200-2299 Alaskan Way',
  'site-2': '500-599 Executive Blvd',
  'site-9': '100-199 Broadway Ave',
  'site-10': '200-299 S Jackson St',
  'site-11': '3400-3499 E Marginal Way S'
};

export const PortalsAccessConfigConsole: React.FC<PortalsAccessConfigConsoleProps> = ({
  initialSiteId,
  initialTab = 'CLIENT_CONFIG',
  isModal = false,
  onClose
}) => {
  const { sitesList, updateSite, addAuditLog, showToast } = useShiftOps();
  const { credentials, updateSiteCredential, resetSitePasscode } = useClientCredentialsStore(sitesList);
  const {
    getClientSiteConfig,
    updateClientSiteConfig,
    applyClientConfigToAllSites
  } = useClientPortalConfigStore();
  const {
    getSiteConfig: getResidentSiteConfig,
    updateSiteConfig: updateResidentSiteConfig,
    applyConfigToAllSites: applyResidentConfigToAllSites
  } = useResidentServiceConfigStore();

  const [selectedSiteId, setSelectedSiteId] = useState<string>(() => {
    if (initialSiteId && sitesList.some((s) => s.id === initialSiteId)) {
      return initialSiteId;
    }
    const midtown = sitesList.find((s) => s.id === 'site-12');
    return midtown?.id || sitesList[0]?.id || 'site-12';
  });

  useEffect(() => {
    if (initialSiteId && sitesList.some((s) => s.id === initialSiteId)) {
      setSelectedSiteId(initialSiteId);
    }
  }, [initialSiteId, sitesList]);

  const [activeTab, setActiveTab] = useState<'CLIENT_CONFIG' | 'RESIDENT_CONFIG'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const selectedSite = useMemo(() => {
    return sitesList.find((s) => s.id === selectedSiteId) || sitesList[0];
  }, [sitesList, selectedSiteId]);

  const siteName = selectedSite?.name || 'All Properties (Global Default)';

  // Current live configs
  const liveClientConfig = getClientSiteConfig(selectedSite?.id);
  const liveResidentConfig = getResidentSiteConfig(selectedSite?.id);

  const currentClientCred = useMemo(() => {
    if (!selectedSite) return null;
    return (
      credentials.find((c) => c.siteId === selectedSite.id) || {
        siteId: selectedSite.id,
        siteName: selectedSite.name,
        clientUsername: selectedSite.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 18),
        clientPasscode: '4820',
        clientPasswordHash: 'hash',
        lastLogin: null
      }
    );
  }, [credentials, selectedSite]);

  // Editable credential state for Tab A
  const [editClientUsername, setEditClientUsername] = useState<string>(
    currentClientCred?.clientUsername || ''
  );
  const [editClientPasscode, setEditClientPasscode] = useState<string>(
    currentClientCred?.clientPasscode || ''
  );
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Editable Address & Geofence state for Tab B
  const [primaryStreetInput, setPrimaryStreetInput] = useState<string>('');
  const [primaryZipInput, setPrimaryZipInput] = useState<string>('');
  const [secondaryAddressesInput, setSecondaryAddressesInput] = useState<string>('');
  const [geofenceLatInput, setGeofenceLatInput] = useState<string>('');
  const [geofenceLngInput, setGeofenceLngInput] = useState<string>('');
  const [geofenceRadiusInput, setGeofenceRadiusInput] = useState<string>('150');

  // Sync local inputs when selectedSiteId changes
  useEffect(() => {
    if (!selectedSite) return;
    const cred = credentials.find((c) => c.siteId === selectedSite.id);
    if (cred) {
      setEditClientUsername(cred.clientUsername);
      setEditClientPasscode(cred.clientPasscode);
    }

    const resCfg = getResidentSiteConfig(selectedSite.id);
    const streetPart =
      resCfg.primaryStreetAddress ||
      (selectedSite.address || '').split(',')[0]?.trim() ||
      selectedSite.address ||
      '850 Midtown Blvd';
    const zipPart = resCfg.primaryZipCode || selectedSite.zip || '98101';
    const secPart =
      resCfg.secondaryAddresses ??
      DEFAULT_SECONDARY_ADDRESSES_BY_SITE[selectedSite.id] ??
      '';
    const latVal =
      typeof resCfg.geofenceLatitude === 'number'
        ? resCfg.geofenceLatitude
        : selectedSite.latitude ?? 47.609;
    const lngVal =
      typeof resCfg.geofenceLongitude === 'number'
        ? resCfg.geofenceLongitude
        : selectedSite.longitude ?? -122.335;
    const radVal =
      resCfg.geofenceRadiusMeters || selectedSite.geofenceRadiusMeters || 150;

    setPrimaryStreetInput(streetPart);
    setPrimaryZipInput(zipPart);
    setSecondaryAddressesInput(secPart);
    setGeofenceLatInput(String(latVal));
    setGeofenceLngInput(String(lngVal));
    setGeofenceRadiusInput(String(radVal));
  }, [selectedSite, credentials, getResidentSiteConfig]);

  const dispatchPortalConfigAuditLog = (detailMessage?: string) => {
    const canonicalAudit = `[PORTAL CONFIG] Updated Client/Resident portal settings for ${siteName} by Admin`;
    addAuditLog(
      canonicalAudit,
      'system',
      detailMessage ? `${canonicalAudit} — ${detailMessage}` : canonicalAudit,
      'Admin',
      'info'
    );
  };

  // ============================================================================
  // TAB A HANDLERS: CLIENT PORTAL CREDENTIALS & FEATURE VISIBILITY TOGGLES
  // ============================================================================

  const handleSaveClientCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite) return;
    if (!editClientUsername.trim() || !editClientPasscode.trim()) {
      showToast('Validation Error', 'Username and Passcode / PIN cannot be empty.', 'warning');
      return;
    }
    updateSiteCredential(
      selectedSite.id,
      selectedSite.name,
      editClientUsername.trim(),
      editClientPasscode.trim()
    );
    dispatchPortalConfigAuditLog(
      `Updated Client Access ID (${editClientUsername.trim()}) & PIN for ${selectedSite.name}`
    );
    showToast(
      'Client Credentials Saved',
      `Updated isolated Client Login for ${selectedSite.name}.`,
      'success'
    );
  };

  const handleRegenerateClientPin = () => {
    if (!selectedSite) return;
    const newPin = resetSitePasscode(selectedSite.id, selectedSite.name);
    setEditClientPasscode(newPin);
    dispatchPortalConfigAuditLog(`Regenerated 4-digit Client Portal PIN (${newPin})`);
    showToast(
      'Client PIN Regenerated',
      `New passcode for ${selectedSite.name}: ${newPin}`,
      'info'
    );
  };

  const handleCopyClientCredentials = () => {
    if (!selectedSite) return;
    const text = `Property Portal: ${selectedSite.name}\nClient Access ID / Username: ${editClientUsername}\nClient Passcode / PIN: ${editClientPasscode}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
    showToast(
      'Credentials Copied',
      `Copied ${selectedSite.name} login credentials to clipboard for Property Manager.`,
      'success'
    );
  };

  const handleToggleClientFeature = (key: keyof ClientPortalSiteConfig) => {
    if (!selectedSite) return;
    const nextValue = !Boolean(liveClientConfig[key]);
    updateClientSiteConfig(
      selectedSite.id,
      { [key]: nextValue },
      'Admin'
    );
    dispatchPortalConfigAuditLog(`Toggled Client Portal ${String(key)} -> ${nextValue ? 'ON' : 'OFF'}`);
    showToast(
      'Client Portal Setting Synced',
      `Updated ${String(key)} for ${selectedSite.name} (${nextValue ? 'ENABLED' : 'DISABLED'}).`,
      'success'
    );
  };

  // ============================================================================
  // TAB B HANDLERS: RESIDENT PORTAL ADDRESS RESOLVER & SERVICE TOGGLES
  // ============================================================================

  const handleToggleResidentFeature = (key: keyof ResidentServiceConfig) => {
    if (!selectedSite) return;
    const nextValue = !Boolean(liveResidentConfig[key]);
    updateResidentSiteConfig(
      selectedSite.id,
      { [key]: nextValue },
      'Admin'
    );
    dispatchPortalConfigAuditLog(`Toggled Resident Portal ${String(key)} -> ${nextValue ? 'ON' : 'OFF'}`);
    showToast(
      'Resident Portal Setting Synced',
      `Updated ${String(key)} for ${selectedSite.name} (${nextValue ? 'ENABLED' : 'DISABLED'}).`,
      'success'
    );
  };

  const handleUpdateResidentField = (updates: Partial<ResidentServiceConfig>, label: string) => {
    if (!selectedSite) return;
    updateResidentSiteConfig(selectedSite.id, updates, 'Admin');
    dispatchPortalConfigAuditLog(`Updated ${label} for ${selectedSite.name}`);
  };

  const handleSaveAddressAndGeofence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite) return;

    const cleanStreet = primaryStreetInput.trim();
    const cleanZip = primaryZipInput.trim().slice(0, 10);
    const cleanSecondary = secondaryAddressesInput.trim();
    const parsedLat = parseFloat(geofenceLatInput);
    const parsedLng = parseFloat(geofenceLngInput);
    const parsedRadius = Math.max(50, parseInt(geofenceRadiusInput, 10) || 150);

    const validLat = !Number.isNaN(parsedLat) ? parsedLat : selectedSite.latitude || 47.609;
    const validLng = !Number.isNaN(parsedLng) ? parsedLng : selectedSite.longitude || -122.335;

    // 1. Update ResidentServiceConfig store (feeds identifySiteByAddress & resolveSiteByGpsCoordinates)
    updateResidentSiteConfig(
      selectedSite.id,
      {
        primaryStreetAddress: cleanStreet,
        primaryZipCode: cleanZip,
        secondaryAddresses: cleanSecondary,
        geofenceLatitude: validLat,
        geofenceLongitude: validLng,
        geofenceRadiusMeters: parsedRadius
      },
      'Admin'
    );

    // 2. Also keep SiteProfile synchronized in ShiftOpsContext
    const fullFormattedAddress = cleanStreet.includes(selectedSite.city)
      ? cleanStreet
      : `${cleanStreet}, ${selectedSite.city}, ${selectedSite.state} ${cleanZip}`;

    updateSite(selectedSite.id, {
      address: fullFormattedAddress,
      zip: cleanZip,
      latitude: validLat,
      longitude: validLng,
      geofenceRadiusMeters: parsedRadius
    });

    dispatchPortalConfigAuditLog(
      `Saved Address Resolver ("${cleanStreet}, ${cleanZip}", Ranges: "${cleanSecondary || 'Primary Only'}") & GPS Geofence (${validLat.toFixed(4)}, ${validLng.toFixed(4)} @ ${parsedRadius}m)`
    );

    showToast(
      'Resident Resolver & Geofence Updated',
      `Live street address & GPS geofence rules synced for ${selectedSite.name}.`,
      'success'
    );
  };

  const handleApplyDefaultsAcrossAllProperties = () => {
    const allIds = sitesList.map((s) => s.id);
    applyClientConfigToAllSites(liveClientConfig, allIds, 'Admin');
    applyResidentConfigToAllSites(liveResidentConfig, allIds, 'Admin');
    const canonicalAudit = `[PORTAL CONFIG] Updated Client/Resident portal settings for All Properties (${allIds.length} Sites) by Admin`;
    addAuditLog(canonicalAudit, 'system', canonicalAudit, 'Admin', 'info');
    showToast(
      'Synced Across All Properties',
      `Applied ${siteName}'s Client & Resident feature toggles across all ${allIds.length} properties.`,
      'success'
    );
  };

  const clientToggleDefinitions: Array<{
    key: keyof ClientPortalSiteConfig;
    title: string;
    codeLabel: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'allowVacantUnitBulkUpload',
      title: 'Vacant Unit CSV / PDF Bulk Sync',
      codeLabel: 'allowVacantUnitBulkUpload',
      description:
        'Enable or disable Property Manager CSV/PDF Yardi & AppFolio bulk vacant unit uploads with Smart Diff preview.',
      icon: <Upload className="w-4 h-4 text-blue-400" />
    },
    {
      key: 'allowSpecialWatchDirectives',
      title: 'Special Watch & 48h Pass-Down Directives',
      codeLabel: 'allowSpecialWatchDirectives',
      description:
        'Enable or disable Property Manager posting of time-boxed 24h/48h/7d Special Watch directives to the Guard Terminal.',
      icon: <Target className="w-4 h-4 text-rose-400" />
    },
    {
      key: 'allowClientIssueVerification',
      title: 'Closed-Loop Issue Physical Verification Requests',
      codeLabel: 'allowClientIssueVerification',
      description:
        'Enable or disable Property Managers marking maintenance/safety issues addressed to trigger mandatory on-duty guard photo verification.',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    },
    {
      key: 'allowOfficerReviews',
      title: '3x Weighted Property Manager Officer Reviews',
      codeLabel: 'allowOfficerReviews',
      description:
        'Enable or disable 3x weighted Property Manager officer commendations and evaluations routed to the CAD Moderation Queue.',
      icon: <Star className="w-4 h-4 text-amber-400" />
    },
    {
      key: 'showAmenityLockoutFeed',
      title: 'Live Amenity Lockout Completion Timestamps',
      codeLabel: 'showAmenityLockoutFeed',
      description:
        'Show or hide the real-time nightly amenity lockout counter and scheduled lockup verification cards on the Client Portal.',
      icon: <Lock className="w-4 h-4 text-cyan-400" />
    }
  ];

  const residentStandardToggles: Array<{
    key: keyof ResidentServiceConfig;
    title: string;
    codeLabel: string;
    description: string;
    icon: React.ReactNode;
    defaultBadge: string;
  }> = [
    {
      key: 'enableNoiseComplaints',
      title: 'Noise & Quiet Hours Disturbance Dispatch',
      codeLabel: 'enableNoiseComplaints',
      description:
        'Allows residents to dispatch patrol for noise disturbances with automatic caller unit anonymity and repeat-offender flagging.',
      icon: <Volume2 className="w-4 h-4 text-amber-400" />,
      defaultBadge: 'Default: ON'
    },
    {
      key: 'enableParkingReports',
      title: 'Unauthorized Parking & Blocked Stall Reports',
      codeLabel: 'enableParkingReports',
      description:
        'Allows residents to report vehicles blocking their assigned stall, fire lane, or loading zone.',
      icon: <Car className="w-4 h-4 text-blue-400" />,
      defaultBadge: 'Default: ON'
    },
    {
      key: 'enableSuspiciousActivity',
      title: 'Suspicious Activity & Unsecured Perimeter Reports',
      codeLabel: 'enableSuspiciousActivity',
      description:
        'Allows residents to report propped exterior doors, garage tailgating, or suspicious individuals.',
      icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
      defaultBadge: 'Default: ON'
    },
    {
      key: 'enableGuestParkingPasses',
      title: 'Self-Service Overnight Guest Parking Passes',
      codeLabel: 'enableGuestParkingPasses',
      description:
        'Allows residents to issue instant digital guest passes that sync live to the Guard AI Plate Scanner & Client Portal.',
      icon: <Car className="w-4 h-4 text-emerald-400" />,
      defaultBadge: 'Default: ON'
    },
    {
      key: 'enableMaintenanceRedirect',
      title: 'Property Maintenance Routing Firewall',
      codeLabel: 'enableMaintenanceRedirect',
      description:
        'Intercepts non-security plumbing/HVAC repair requests and routes residents to the property maintenance hotline or portal.',
      icon: <Wrench className="w-4 h-4 text-cyan-400" />,
      defaultBadge: 'Default: ON'
    },
    {
      key: 'enableResidentOfficerReviews',
      title: 'Resident Officer Reviews (1x Weight -> CAD Moderation)',
      codeLabel: 'enableResidentOfficerReviews',
      description:
        'Allows residents to submit 1x weighted officer ratings that route to the Command CAD Moderation Queue with Retaliation Risk screening.',
      icon: <Star className="w-4 h-4 text-amber-400" />,
      defaultBadge: 'Default: ON'
    }
  ];

  const residentOptInToggles: Array<{
    key: keyof ResidentServiceConfig;
    title: string;
    codeLabel: string;
    description: string;
    icon: React.ReactNode;
    defaultBadge: string;
  }> = [
    {
      key: 'enableCourtesyEscorts',
      title: 'Courtesy Safety Walking Escorts',
      codeLabel: 'enableCourtesyEscorts',
      description:
        'Opt-in concierge add-on: Residents can request a uniformed officer walking escort from parking structures to their unit.',
      icon: <UserCheck className="w-4 h-4 text-purple-400" />,
      defaultBadge: 'Default: OFF — Opt-In'
    },
    {
      key: 'enableVacationWatch',
      title: 'Vacation / Away Watch Patrol Checks',
      codeLabel: 'enableVacationWatch',
      description:
        'Opt-in concierge add-on: Residents can register travel dates for dedicated nightly unit door & patio seal checks.',
      icon: <Calendar className="w-4 h-4 text-indigo-400" />,
      defaultBadge: 'Default: OFF — Opt-In'
    },
    {
      key: 'enableVendorNotices',
      title: 'Vendor / Pet-Sitter Access Notices',
      codeLabel: 'enableVendorNotices',
      description:
        'Opt-in concierge add-on: Residents can pre-authorize contractors, cleaners, or pet-sitters with on-duty security.',
      icon: <FileText className="w-4 h-4 text-teal-400" />,
      defaultBadge: 'Default: OFF — Opt-In'
    }
  ];

  const activeClientFeaturesCount = clientToggleDefinitions.filter((t) =>
    Boolean(liveClientConfig[t.key])
  ).length;
  const activeResidentFeaturesCount =
    residentStandardToggles.filter((t) => Boolean(liveResidentConfig[t.key])).length +
    residentOptInToggles.filter((t) => Boolean(liveResidentConfig[t.key])).length;

  return (
    <div
      id="unified-portals-access-config-console"
      className={`${
        isModal
          ? 'bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden'
          : 'bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden'
      } text-slate-100`}
    >
      {/* Top Console Header & Target Facility Selector */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-indigo-950/50 to-slate-950 border-b border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-mono font-black uppercase tracking-wider">
                  Multi-Tenant SaaS Control Plane
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
                  ● Real-Time Sync Active
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                Unified Property Portals &amp; Access Configuration Console
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Control isolated Client Portal credentials, feature visibility, Resident Portal service toggles, and street address / GPS geofence verification per property.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <button
              type="button"
              id="btn-apply-portal-defaults-all-sites"
              onClick={handleApplyDefaultsAcrossAllProperties}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-400/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Apply this property's Client & Resident feature toggles as the default across all properties"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-300" />
              <span>[ 🌐 Apply Toggles Across All {sitesList.length} Properties ]</span>
            </button>

            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Target Facility Selector Bar */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1">
            <label
              htmlFor="portal-config-target-facility-select"
              className="block text-[10px] font-mono uppercase tracking-wider text-indigo-300 font-bold mb-1"
            >
              Target Facility Selector (Configure Per-Property Settings)
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <select
                id="portal-config-target-facility-select"
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
              >
                {sitesList.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.code || site.id}) — {site.address}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400">Client Features: </span>
              <strong className="text-emerald-400 font-mono">
                {activeClientFeaturesCount}/{clientToggleDefinitions.length} ON
              </strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400">Resident Services: </span>
              <strong className="text-indigo-400 font-mono">
                {activeResidentFeaturesCount}/9 ON
              </strong>
            </div>
          </div>
        </div>

        {/* Two Clean Console Tabs: TAB A & TAB B */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          <button
            id="portal-config-tab-client-btn"
            type="button"
            onClick={() => setActiveTab('CLIENT_CONFIG')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === 'CLIENT_CONFIG'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>[ 🏢 Client Portal Config &amp; Credentials ]</span>
          </button>

          <button
            id="portal-config-tab-resident-btn"
            type="button"
            onClick={() => setActiveTab('RESIDENT_CONFIG')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer border ${
              activeTab === 'RESIDENT_CONFIG'
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>[ 🏠 Resident Portal Config &amp; Address Resolver ]</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          TAB A: [ 🏢 Client Portal Config & Credentials ]
         ==================================================================== */}
      {activeTab === 'CLIENT_CONFIG' && selectedSite && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* 1. Client Authentication Credentials Card */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-black text-white">
                    Client Authentication Credentials — {selectedSite.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Isolated single-property login credentials for the Property Manager. Authenticating with these credentials hard-locks the Client Portal session to <strong className="text-slate-200">{selectedSite.name}</strong>.
                </p>
              </div>

              <button
                id="btn-copy-client-login-credentials"
                type="button"
                onClick={handleCopyClientCredentials}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                {copiedCreds ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>[ ✓ Copied to Clipboard ]</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-emerald-400" />
                    <span>[ 📋 Copy Client Login Credentials ]</span>
                  </>
                )}
              </button>
            </div>

            <form
              onSubmit={handleSaveClientCredentials}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
            >
              <div className="md:col-span-5">
                <label className="block text-[11px] font-mono uppercase text-slate-300 font-bold mb-1.5">
                  Client Access ID / Username
                </label>
                <input
                  id="input-client-config-username"
                  type="text"
                  value={editClientUsername}
                  onChange={(e) => setEditClientUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-amber-300 font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-[11px] font-mono uppercase text-slate-300 font-bold mb-1.5">
                  Client Passcode / PIN
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="input-client-config-passcode"
                    type="text"
                    value={editClientPasscode}
                    onChange={(e) => setEditClientPasscode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-emerald-300 font-black focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleRegenerateClientPin}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Regenerate random 4-digit PIN"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              <div className="md:col-span-3">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-colors"
                >
                  [ 💾 Save Credentials ]
                </button>
              </div>
            </form>
          </div>

          {/* 2. Client Portal Feature Visibility Toggles (Per Site) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Client Portal Feature Visibility Toggles ({selectedSite.name})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Toggling any switch below immediately updates the live Client Portal workspace for {selectedSite.name} and logs to the Live Audit Terminal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {clientToggleDefinitions.map((item) => {
                const isEnabled = Boolean(liveClientConfig[item.key]);
                return (
                  <div
                    key={String(item.key)}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                      isEnabled
                        ? 'bg-slate-950/90 border-emerald-500/40'
                        : 'bg-slate-950/40 border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{item.title}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                            {item.codeLabel}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase border ${
                              isEnabled
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {isEnabled ? 'ENABLED' : 'HIDDEN'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleClientFeature(item.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={isEnabled}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB B: [ 🏠 Resident Portal Config & Address Resolver ]
         ==================================================================== */}
      {activeTab === 'RESIDENT_CONFIG' && selectedSite && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* 1. Registered Property Addresses & Geofence (Feeds the Resident Resolver) */}
          <form
            onSubmit={handleSaveAddressAndGeofence}
            className="bg-slate-950/90 border border-indigo-500/40 rounded-2xl p-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-base font-black text-white">
                    Registered Property Addresses &amp; Geofence Resolver — {selectedSite.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Feeds <code className="text-indigo-300 font-mono">identifySiteByAddress(street, zip)</code> and 1-tap Resident GPS Verification so residents never need a property code or see a list of properties.
                </p>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-black text-xs shadow-lg shadow-indigo-600/20 shrink-0 cursor-pointer transition-colors"
              >
                [ 💾 Save Address &amp; Geofence Rules ]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label className="block text-[11px] font-mono uppercase text-slate-300 font-bold mb-1.5">
                  Primary Street Address
                </label>
                <input
                  type="text"
                  value={primaryStreetInput}
                  onChange={(e) => setPrimaryStreetInput(e.target.value)}
                  placeholder="e.g. 850 Midtown Blvd"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-mono uppercase text-slate-300 font-bold mb-1.5">
                  Primary ZIP Code
                </label>
                <input
                  type="text"
                  value={primaryZipInput}
                  onChange={(e) => setPrimaryZipInput(e.target.value)}
                  placeholder="98101"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-[11px] font-mono uppercase text-slate-300 font-bold mb-1.5">
                  Valid Building Street Numbers / Secondary Addresses
                </label>
                <input
                  type="text"
                  value={secondaryAddressesInput}
                  onChange={(e) => setSecondaryAddressesInput(e.target.value)}
                  placeholder="e.g. 800-899 Midtown Blvd, 1400-1499 5th Ave"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-indigo-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 font-bold mb-1">
                  Geofence Latitude
                </label>
                <input
                  type="text"
                  value={geofenceLatInput}
                  onChange={(e) => setGeofenceLatInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 font-bold mb-1">
                  Geofence Longitude
                </label>
                <input
                  type="text"
                  value={geofenceLngInput}
                  onChange={(e) => setGeofenceLngInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 font-bold mb-1">
                  Geofence Radius (Meters)
                </label>
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    value={geofenceRadiusInput}
                    onChange={(e) => setGeofenceRadiusInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* 2. Core Resident Service Feature Toggles (Default ON) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Standard Resident Portal Services (Default: ON)</span>
              </h3>
              <span className="text-xs text-slate-400">
                Only services toggled ON render inside {selectedSite.name}&apos;s Resident Portal
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {residentStandardToggles.map((item) => {
                const isEnabled = Boolean(liveResidentConfig[item.key]);
                return (
                  <div
                    key={String(item.key)}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isEnabled
                        ? 'bg-slate-950/90 border-emerald-500/40'
                        : 'bg-slate-950/40 border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                          {item.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{item.title}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                              {item.codeLabel}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase border ${
                                isEnabled
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {isEnabled ? 'ACTIVE ON PORTAL' : item.defaultBadge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleResidentFeature(item.key)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                        role="switch"
                        aria-checked={isEnabled}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Inline Quota Config for Guest Parking Passes */}
                    {item.key === 'enableGuestParkingPasses' && isEnabled && (
                      <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-slate-300 font-bold mb-1">
                            Max Active Passes Per Unit (Default: 2)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={liveResidentConfig.maxActiveGuestPassesPerUnit}
                            onChange={(e) =>
                              handleUpdateResidentField(
                                {
                                  maxActiveGuestPassesPerUnit: Math.max(
                                    1,
                                    parseInt(e.target.value, 10) || 2
                                  )
                                },
                                'Max Active Guest Passes Per Unit'
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-slate-300 font-bold mb-1">
                            Max Monthly Nights Per Plate (Default: 7)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={liveResidentConfig.maxMonthlyGuestDaysPerPlate}
                            onChange={(e) =>
                              handleUpdateResidentField(
                                {
                                  maxMonthlyGuestDaysPerPlate: Math.max(
                                    1,
                                    parseInt(e.target.value, 10) || 7
                                  )
                                },
                                'Max Monthly Nights Per Plate'
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Inline Routing Config for Maintenance Redirect */}
                    {item.key === 'enableMaintenanceRedirect' && isEnabled && (
                      <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-cyan-300 font-bold mb-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>24/7 Maintenance Hotline Phone</span>
                          </label>
                          <input
                            type="text"
                            value={liveResidentConfig.maintenancePhone}
                            onChange={(e) =>
                              handleUpdateResidentField(
                                { maintenancePhone: e.target.value },
                                '24/7 Maintenance Hotline Phone'
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-cyan-300 font-bold mb-1 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            <span>External Maintenance Portal URL</span>
                          </label>
                          <input
                            type="text"
                            value={liveResidentConfig.maintenancePortalUrl}
                            onChange={(e) =>
                              handleUpdateResidentField(
                                { maintenancePortalUrl: e.target.value },
                                'External Maintenance Portal URL'
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Opt-In Concierge & Patrol Add-On Services (Default OFF) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Opt-In Concierge &amp; Patrol Add-On Services (Default: OFF)</span>
              </h3>
              <span className="text-xs text-slate-400">
                Enable only when contracted by {selectedSite.name}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {residentOptInToggles.map((item) => {
                const isEnabled = Boolean(liveResidentConfig[item.key]);
                return (
                  <div
                    key={String(item.key)}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                      isEnabled
                        ? 'bg-purple-950/25 border-purple-500/40'
                        : 'bg-slate-950/40 border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{item.title}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                            {item.codeLabel}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase border ${
                              isEnabled
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {isEnabled ? 'OPT-IN ACTIVE' : item.defaultBadge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleResidentFeature(item.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-purple-500' : 'bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={isEnabled}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PortalsAccessConfigModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialSiteId?: string | null;
  initialTab?: 'CLIENT_CONFIG' | 'RESIDENT_CONFIG';
}> = ({ isOpen, onClose, initialSiteId, initialTab }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[140] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <PortalsAccessConfigConsole
          initialSiteId={initialSiteId}
          initialTab={initialTab}
          isModal={true}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
