import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Building2,
  ShieldCheck,
  ClipboardList,
  Target,
  CheckCircle2,
  Clock,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Car,
  Key,
  Home,
  Lock,
  MapPin,
  Upload,
  FileText,
  Sparkles,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  AlertCircle,
  Star
} from 'lucide-react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import {
  useSiteIssuesStore,
  CATEGORY_LABELS
} from '../guard/GuardSiteIssues';
import {
  SiteIssue,
  IssueCategory
} from '../../types/siteIssues';
import {
  SiteDocument,
  loadAllSiteDocuments,
  loadSiteDocumentsForSite,
  saveAllSiteDocuments,
  subscribeToSiteDocumentUpdates
} from '../../types/resources';
import { useModeratedReviewsStore } from '../resident/ResidentPortal';

// ============================================================================
// 1. STRICT PER-SITE CLIENT AUTHENTICATION CREDENTIALS & SESSION STORE
// ============================================================================

export interface ClientAuthCredentials {
  siteId: string;
  siteName: string;
  clientUsername: string;
  clientPasswordHash: string;
  clientPasscode: string;
  lastLogin: string | null;
}

const STORAGE_KEY_CLIENT_CREDENTIALS = 'secureshift_client_auth_credentials_v1';
const STORAGE_KEY_CLIENT_ACTIVE_SESSION = 'secureshift_client_active_session_v1';
const CLIENT_CREDENTIALS_SYNC_EVENT = 'secureshift_client_credentials_updated';

function simpleHashPasscode(passcode: string): string {
  let h = 2166136261;
  for (let i = 0; i < passcode.length; i++) {
    h ^= passcode.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `sha256_sim_${(h >>> 0).toString(16).padStart(8, '0')}`;
}

export const INITIAL_CLIENT_CREDENTIALS: ClientAuthCredentials[] = [
  {
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    clientUsername: 'port-pier7',
    clientPasscode: '7701',
    clientPasswordHash: simpleHashPasscode('7701'),
    lastLogin: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
  },
  {
    siteId: 'site-12',
    siteName: 'Midtown Commercial Lofts',
    clientUsername: 'midtown-lofts',
    clientPasscode: '3040',
    clientPasswordHash: simpleHashPasscode('3040'),
    lastLogin: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
  },
  {
    siteId: 'site-8',
    siteName: 'Industrial Warehouse Night Watch',
    clientUsername: 'ind-warehouse',
    clientPasscode: '8808',
    clientPasswordHash: simpleHashPasscode('8808'),
    lastLogin: new Date(Date.now() - 42 * 3600 * 1000).toISOString()
  },
  {
    siteId: 'site-2',
    siteName: 'Apex Financial Tower',
    clientUsername: 'apex-tower',
    clientPasscode: '4420',
    clientPasswordHash: simpleHashPasscode('4420'),
    lastLogin: null
  },
  {
    siteId: 'site-3',
    siteName: 'Mercy General Medical Center',
    clientUsername: 'mercy-med',
    clientPasscode: '9110',
    clientPasswordHash: simpleHashPasscode('9110'),
    lastLogin: null
  },
  {
    siteId: 'site-4',
    siteName: 'Harborview Logistics Hub',
    clientUsername: 'harborview-hub',
    clientPasscode: '5514',
    clientPasswordHash: simpleHashPasscode('5514'),
    lastLogin: null
  }
];

export function loadStoredClientCredentials(): ClientAuthCredentials[] {
  if (typeof window === 'undefined') return INITIAL_CLIENT_CREDENTIALS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CLIENT_CREDENTIALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_CLIENT_CREDENTIALS;
}

export function saveStoredClientCredentials(creds: ClientAuthCredentials[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_CLIENT_CREDENTIALS, JSON.stringify(creds));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(CLIENT_CREDENTIALS_SYNC_EVENT));
    }, 0);
  } catch {}
}

export function loadActiveClientSessionSiteId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY_CLIENT_ACTIVE_SESSION) || null;
  } catch {
    return null;
  }
}

export function saveActiveClientSessionSiteId(siteId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (siteId) {
      window.localStorage.setItem(STORAGE_KEY_CLIENT_ACTIVE_SESSION, siteId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY_CLIENT_ACTIVE_SESSION);
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(CLIENT_CREDENTIALS_SYNC_EVENT));
    }, 0);
  } catch {}
}

export interface ClientPortalSiteConfig {
  siteId: string; // 'GLOBAL_DEFAULT' or site.id
  allowVacantUnitBulkUpload: boolean;
  allowSpecialWatchDirectives: boolean;
  allowClientIssueVerification: boolean;
  allowOfficerReviews: boolean;
  showAmenityLockoutFeed: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_CLIENT_PORTAL_SITE_CONFIG: ClientPortalSiteConfig = {
  siteId: 'GLOBAL_DEFAULT',
  allowVacantUnitBulkUpload: true,
  allowSpecialWatchDirectives: true,
  allowClientIssueVerification: true,
  allowOfficerReviews: true,
  showAmenityLockoutFeed: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default'
};

const STORAGE_KEY_CLIENT_PORTAL_CONFIG = 'secureshift_client_portal_config_v1';
const CLIENT_PORTAL_CONFIG_SYNC_EVENT = 'secureshift:client-portal-config-sync';

function loadClientPortalConfigMap(): Record<string, ClientPortalSiteConfig> {
  if (typeof window === 'undefined') {
    return { GLOBAL_DEFAULT: { ...DEFAULT_CLIENT_PORTAL_SITE_CONFIG } };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CLIENT_PORTAL_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          GLOBAL_DEFAULT: { ...DEFAULT_CLIENT_PORTAL_SITE_CONFIG, ...(parsed.GLOBAL_DEFAULT || {}) },
          ...parsed
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse client portal config:', e);
  }
  return {
    GLOBAL_DEFAULT: { ...DEFAULT_CLIENT_PORTAL_SITE_CONFIG }
  };
}

function saveClientPortalConfigMap(map: Record<string, ClientPortalSiteConfig>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_CLIENT_PORTAL_CONFIG, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(CLIENT_PORTAL_CONFIG_SYNC_EVENT));
  } catch (e) {
    console.warn('Failed to save client portal config:', e);
  }
}

export function useClientPortalConfigStore() {
  const [configMap, setConfigMap] = useState<Record<string, ClientPortalSiteConfig>>(() =>
    loadClientPortalConfigMap()
  );

  useEffect(() => {
    const handleSync = () => {
      setConfigMap(loadClientPortalConfigMap());
    };
    window.addEventListener(CLIENT_PORTAL_CONFIG_SYNC_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(CLIENT_PORTAL_CONFIG_SYNC_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const getClientSiteConfig = useCallback(
    (siteId?: string): ClientPortalSiteConfig => {
      const globalDefault = configMap.GLOBAL_DEFAULT || DEFAULT_CLIENT_PORTAL_SITE_CONFIG;
      if (!siteId || siteId === 'GLOBAL_DEFAULT') {
        return globalDefault;
      }
      const siteOverride = configMap[siteId];
      if (!siteOverride) {
        return { ...globalDefault, siteId };
      }
      return {
        ...globalDefault,
        ...siteOverride,
        siteId
      };
    },
    [configMap]
  );

  const updateClientSiteConfig = useCallback(
    (siteId: string, updates: Partial<ClientPortalSiteConfig>, updatedBy = 'Admin') => {
      const latest = loadClientPortalConfigMap();
      const base =
        latest[siteId] || latest.GLOBAL_DEFAULT || DEFAULT_CLIENT_PORTAL_SITE_CONFIG;
      const nextConfig: ClientPortalSiteConfig = {
        ...base,
        ...updates,
        siteId,
        updatedAt: new Date().toISOString(),
        updatedBy
      };
      const nextMap = {
        ...latest,
        [siteId]: nextConfig
      };
      saveClientPortalConfigMap(nextMap);
      setConfigMap(nextMap);
      return nextConfig;
    },
    []
  );

  const applyClientConfigToAllSites = useCallback(
    (sourceConfig: ClientPortalSiteConfig, siteIds: string[], updatedBy = 'Admin') => {
      const now = new Date().toISOString();
      const nextMap: Record<string, ClientPortalSiteConfig> = {
        GLOBAL_DEFAULT: {
          ...sourceConfig,
          siteId: 'GLOBAL_DEFAULT',
          updatedAt: now,
          updatedBy
        }
      };
      siteIds.forEach((id) => {
        nextMap[id] = {
          ...sourceConfig,
          siteId: id,
          updatedAt: now,
          updatedBy
        };
      });
      saveClientPortalConfigMap(nextMap);
      setConfigMap(nextMap);
    },
    []
  );

  return {
    configMap,
    getClientSiteConfig,
    updateClientSiteConfig,
    applyClientConfigToAllSites
  };
}

export function useClientCredentialsStore(
  sitesList?: { id: string; name: string; code?: string }[]
) {
  const [credentials, setCredentialsState] = useState<ClientAuthCredentials[]>(() =>
    loadStoredClientCredentials()
  );
  const [authenticatedSiteId, setAuthenticatedSiteIdState] = useState<string | null>(() =>
    loadActiveClientSessionSiteId()
  );

  // Ensure every site in sitesList has a corresponding ClientAuthCredentials record
  useEffect(() => {
    if (!sitesList || sitesList.length === 0) return;
    const current = loadStoredClientCredentials();
    const existingIds = new Set(current.map((c) => c.siteId));
    let changed = false;
    const merged = [...current];

    sitesList.forEach((site, idx) => {
      if (!existingIds.has(site.id)) {
        const slug = site.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 18);
        const defaultPin = String(3100 + ((idx * 317) % 6800));
        merged.push({
          siteId: site.id,
          siteName: site.name,
          clientUsername: slug || `client-${site.id}`,
          clientPasscode: defaultPin,
          clientPasswordHash: simpleHashPasscode(defaultPin),
          lastLogin: null
        });
        changed = true;
      }
    });

    if (changed) {
      saveStoredClientCredentials(merged);
      setCredentialsState(merged);
    }
  }, [sitesList]);

  useEffect(() => {
    const handleSync = () => {
      setCredentialsState(loadStoredClientCredentials());
      setAuthenticatedSiteIdState(loadActiveClientSessionSiteId());
    };
    window.addEventListener(CLIENT_CREDENTIALS_SYNC_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(CLIENT_CREDENTIALS_SYNC_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const updateSiteCredential = useCallback(
    (
      siteId: string,
      siteName: string,
      newUsername: string,
      newPasscode: string
    ) => {
      const current = loadStoredClientCredentials();
      const exists = current.some((c) => c.siteId === siteId);
      const cleanUser = newUsername.trim();
      const cleanPin = newPasscode.trim();
      const next = exists
        ? current.map((c) =>
            c.siteId === siteId
              ? {
                  ...c,
                  siteName,
                  clientUsername: cleanUser,
                  clientPasscode: cleanPin,
                  clientPasswordHash: simpleHashPasscode(cleanPin)
                }
              : c
          )
        : [
            ...current,
            {
              siteId,
              siteName,
              clientUsername: cleanUser,
              clientPasscode: cleanPin,
              clientPasswordHash: simpleHashPasscode(cleanPin),
              lastLogin: null
            }
          ];
      saveStoredClientCredentials(next);
      setCredentialsState(next);
    },
    []
  );

  const authenticateClient = useCallback(
    (usernameInput: string, passcodeInput: string): ClientAuthCredentials | null => {
      const cleanUser = usernameInput.trim().toLowerCase();
      const cleanPin = passcodeInput.trim();
      const current = loadStoredClientCredentials();
      const matched = current.find(
        (c) =>
          c.clientUsername.toLowerCase() === cleanUser &&
          (c.clientPasscode === cleanPin ||
            c.clientPasswordHash === simpleHashPasscode(cleanPin))
      );

      if (!matched) return null;

      const nowIso = new Date().toISOString();
      const updated = current.map((c) =>
        c.siteId === matched.siteId ? { ...c, lastLogin: nowIso } : c
      );
      saveStoredClientCredentials(updated);
      setCredentialsState(updated);
      saveActiveClientSessionSiteId(matched.siteId);
      setAuthenticatedSiteIdState(matched.siteId);
      return { ...matched, lastLogin: nowIso };
    },
    []
  );

  const signOutClient = useCallback(() => {
    saveActiveClientSessionSiteId(null);
    setAuthenticatedSiteIdState(null);
  }, []);

  return {
    credentials,
    authenticatedSiteId,
    updateSiteCredential,
    authenticateClient,
    signOutClient
  };
}

// ============================================================================
// ADMIN MODAL: [ 🔑 Manage Client Logins ] FOR COMMAND CAD / SITE DIRECTORY
// ============================================================================

interface ManageClientLoginsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSiteId?: string;
}

export const ManageClientLoginsModal: React.FC<ManageClientLoginsModalProps> = ({
  isOpen,
  onClose,
  initialSiteId
}) => {
  const { sitesList, addAuditLog, showToast } = useShiftOps();
  const { credentials, updateSiteCredential } = useClientCredentialsStore(sitesList);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingSiteId, setEditingSiteId] = useState<string | null>(initialSiteId || null);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [passcodeDraft, setPasscodeDraft] = useState('');
  const [copiedSiteId, setCopiedSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSiteId) {
      setEditingSiteId(initialSiteId);
      const cred = credentials.find((c) => c.siteId === initialSiteId);
      if (cred) {
        setUsernameDraft(cred.clientUsername);
        setPasscodeDraft(cred.clientPasscode);
      }
    }
  }, [initialSiteId, credentials]);

  if (!isOpen) return null;

  const mergedRows = sitesList.map((site) => {
    const cred = credentials.find(
      (c) =>
        c.siteId === site.id ||
        c.siteName.toLowerCase() === site.name.toLowerCase()
    ) || {
      siteId: site.id,
      siteName: site.name,
      clientUsername: site.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16),
      clientPasscode: '4400',
      clientPasswordHash: simpleHashPasscode('4400'),
      lastLogin: null
    };
    return { site, cred };
  });

  const filteredRows = mergedRows.filter(({ site, cred }) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      site.name.toLowerCase().includes(q) ||
      (site.code || '').toLowerCase().includes(q) ||
      cred.clientUsername.toLowerCase().includes(q)
    );
  });

  const handleStartEdit = (cred: ClientAuthCredentials) => {
    setEditingSiteId(cred.siteId);
    setUsernameDraft(cred.clientUsername);
    setPasscodeDraft(cred.clientPasscode);
  };

  const handleGenerateRandomCredentials = (siteName: string) => {
    const prefix = siteName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .split('-')
      .slice(0, 2)
      .join('-');
    const randomSuffix = Math.floor(10 + Math.random() * 89);
    const randomPin = String(Math.floor(1000 + Math.random() * 8999));
    setUsernameDraft(`${prefix || 'property'}-${randomSuffix}`);
    setPasscodeDraft(randomPin);
  };

  const handleSaveCreds = (siteId: string, siteName: string) => {
    if (!usernameDraft.trim() || !passcodeDraft.trim()) return;
    updateSiteCredential(siteId, siteName, usernameDraft, passcodeDraft);

    const msg = `[ADMIN CREDENTIALS] Updated Client Portal Login for ${siteName} (Username: ${usernameDraft.trim()})`;
    addAuditLog(msg, 'system', msg, 'Command Admin', 'info');
    showToast(
      'Client Credentials Updated',
      `Saved isolated Client Portal login for ${siteName}.`,
      'success'
    );
    setEditingSiteId(null);
  };

  const handleQuickResetPin = (siteId: string, siteName: string, currentUsername: string) => {
    const newPin = String(Math.floor(1000 + Math.random() * 8999));
    updateSiteCredential(siteId, siteName, currentUsername, newPin);
    const msg = `[ADMIN CREDENTIALS] Reset Client Portal PIN for ${siteName} (Username: ${currentUsername}, New PIN: ${newPin})`;
    addAuditLog(msg, 'system', msg, 'Command Admin', 'warning');
    showToast(
      'Client PIN Reset',
      `Generated new PIN (${newPin}) for ${siteName}.`,
      'info'
    );
  };

  const handleCopyCred = (cred: ClientAuthCredentials) => {
    try {
      navigator.clipboard?.writeText(
        `Property: ${cred.siteName} | Access ID: ${cred.clientUsername} | PIN: ${cred.clientPasscode}`
      );
    } catch {}
    setCopiedSiteId(cred.siteId);
    setTimeout(() => setCopiedSiteId(null), 1800);
  };

  return (
    <div
      id="manage-client-logins-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="manage-client-logins-modal"
        className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  Manage Per-Site Client Portal Logins
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold">
                  Strict Single-Property Isolation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                View, generate, or reset isolated Property Access IDs &amp; Passcodes. Each login hard-locks the Client Portal to that single site.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by site name, site code, or client username..."
            className="w-full sm:max-w-md px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
          <span className="text-[11px] font-mono text-slate-400">
            {filteredRows.length} Active Property Credentials
          </span>
        </div>

        {/* Credentials Table */}
        <div className="p-5 overflow-y-auto flex-1">
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400">
                  <th className="py-3 px-3.5">Property / Site</th>
                  <th className="py-3 px-3.5">Property Access ID (Username)</th>
                  <th className="py-3 px-3.5">Client Passcode / PIN</th>
                  <th className="py-3 px-3.5">Password Hash</th>
                  <th className="py-3 px-3.5">Last Client Login</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredRows.map(({ site, cred }) => {
                  const isEditing = editingSiteId === site.id;
                  return (
                    <tr key={site.id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-3.5">
                        <div className="font-black text-white">{site.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          ID: {site.id} {site.code ? `• ${site.code}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={usernameDraft}
                            onChange={(e) => setUsernameDraft(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/60 text-xs font-mono text-white"
                          />
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold text-amber-300">
                            {cred.clientUsername}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={passcodeDraft}
                            onChange={(e) => setPasscodeDraft(e.target.value)}
                            className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/60 text-xs font-mono text-white"
                          />
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 font-mono font-black text-emerald-300">
                            {cred.clientPasscode}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-mono text-[10px] text-slate-500">
                        {cred.clientPasswordHash}
                      </td>

                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {cred.lastLogin
                          ? new Date(cred.lastLogin).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Never'}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleGenerateRandomCredentials(site.name)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-mono text-[10px] font-bold cursor-pointer"
                              title="Auto-generate new Username & PIN"
                            >
                              [ ⚡ Generate ]
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveCreds(site.id, site.name)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-black cursor-pointer"
                            >
                              [ Save ]
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSiteId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white font-mono text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(cred)}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-blue-300 border border-slate-800 font-mono text-[10px] font-bold cursor-pointer"
                            >
                              [ Edit Login ]
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleQuickResetPin(
                                  site.id,
                                  site.name,
                                  cred.clientUsername
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-950 text-amber-300 border border-slate-800 font-mono text-[10px] font-bold cursor-pointer"
                            >
                              [ Reset PIN ]
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyCred(cred)}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono text-[10px] cursor-pointer inline-flex items-center gap-1"
                              title="Copy credentials"
                            >
                              {copiedSiteId === cred.siteId ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Operational Firewall Active: Clients can only authenticate into their assigned single facility.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. SHARED CLIENT SPECIAL WATCH & PASS-DOWN DIRECTIVES STORE
// ============================================================================

export interface ClientDirectiveAck {
  guardId: string;
  guardName: string;
  badgeNumber: string;
  acknowledgedAt: string;
}

export interface ClientWatchDirective {
  id: string;
  siteId: string;
  siteName: string;
  targetArea: string;
  priority: 'Standard' | 'High Alert';
  expirationWindow: '24 Hours' | '48 Hours' | '7 Days';
  createdAt: string;
  expiresAt: string;
  instructions: string;
  postedBy: string;
  status: 'ACTIVE' | 'ARCHIVED';
  acknowledgments: ClientDirectiveAck[];
}

const STORAGE_KEY_CLIENT_DIRECTIVES = 'secureshift_client_watch_directives_v1';
const CLIENT_DIRECTIVES_SYNC_EVENT = 'secureshift_client_directives_updated';

const hoursFromNowIso = (hours: number) =>
  new Date(Date.now() + hours * 3600 * 1000).toISOString();
const hoursAgoIso = (hours: number) =>
  new Date(Date.now() - hours * 3600 * 1000).toISOString();

export const INITIAL_CLIENT_DIRECTIVES: ClientWatchDirective[] = [
  {
    id: 'DIR-801',
    siteId: 'site-12',
    siteName: 'Midtown Commercial Lofts',
    targetArea: 'Unit 304 / North Loading Dock',
    priority: 'High Alert',
    expirationWindow: '48 Hours',
    createdAt: hoursAgoIso(6),
    expiresAt: hoursFromNowIso(42),
    instructions:
      'Unit 304 tenant moving out; monitor loading dock for propping and unauthorized bulk furniture disposal in common corridor.',
    postedBy: 'PM Sarah Jenkins',
    status: 'ACTIVE',
    acknowledgments: [
      {
        guardId: 'g-1',
        guardName: 'Officer Marcus Vance',
        badgeNumber: 'SEC-104',
        acknowledgedAt: hoursAgoIso(5)
      },
      {
        guardId: 'g-2',
        guardName: 'Officer Elena Rostova',
        badgeNumber: 'SEC-204',
        acknowledgedAt: hoursAgoIso(2)
      }
    ]
  },
  {
    id: 'DIR-802',
    siteId: 'site-1',
    siteName: 'Port Authority - Pier 7',
    targetArea: 'Berth 7 Crane Apron & Gate 2',
    priority: 'High Alert',
    expirationWindow: '24 Hours',
    createdAt: hoursAgoIso(4),
    expiresAt: hoursFromNowIso(20),
    instructions:
      'After-hours electrical contractor repairing Berth 7 junction conduit and Gate 2 solenoid. Verify contractor badge & perform physical pull-test on Gate 2 at 22:00.',
    postedBy: 'Cmdr. David Vance (Port PM)',
    status: 'ACTIVE',
    acknowledgments: [
      {
        guardId: 'g-1',
        guardName: 'Officer Marcus Vance',
        badgeNumber: 'SEC-104',
        acknowledgedAt: hoursAgoIso(3)
      }
    ]
  },
  {
    id: 'DIR-803',
    siteId: 'site-8',
    siteName: 'Industrial Warehouse Night Watch',
    targetArea: 'Loading Bays 8–12 & South Riser Room',
    priority: 'High Alert',
    expirationWindow: '7 Days',
    createdAt: hoursAgoIso(10),
    expiresAt: hoursFromNowIso(158),
    instructions:
      'Dry-pipe sprinkler riser #2 under pressure test. Conduct hourly visual gauge check and ensure no semi-trailers park within 15ft of South Yard fire hydrant.',
    postedBy: 'PM Frank Kowalski',
    status: 'ACTIVE',
    acknowledgments: [
      {
        guardId: 'g-3',
        guardName: 'Officer Carlos Silva',
        badgeNumber: 'SEC-118',
        acknowledgedAt: hoursAgoIso(8)
      }
    ]
  }
];

export function loadStoredClientDirectives(): ClientWatchDirective[] {
  if (typeof window === 'undefined') return INITIAL_CLIENT_DIRECTIVES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CLIENT_DIRECTIVES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_CLIENT_DIRECTIVES;
}

export function saveStoredClientDirectives(directives: ClientWatchDirective[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_CLIENT_DIRECTIVES, JSON.stringify(directives));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(CLIENT_DIRECTIVES_SYNC_EVENT));
    }, 0);
  } catch {}
}

export function useClientDirectivesStore() {
  const [directives, setDirectivesState] = useState<ClientWatchDirective[]>(() =>
    loadStoredClientDirectives()
  );

  useEffect(() => {
    const handleSync = () => {
      setDirectivesState(loadStoredClientDirectives());
    };
    window.addEventListener(CLIENT_DIRECTIVES_SYNC_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(CLIENT_DIRECTIVES_SYNC_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const updateDirectives = useCallback(
    (
      updater:
        | ClientWatchDirective[]
        | ((prev: ClientWatchDirective[]) => ClientWatchDirective[])
    ) => {
      const current = loadStoredClientDirectives();
      const next = typeof updater === 'function' ? updater(current) : updater;
      saveStoredClientDirectives(next);
      setDirectivesState(next);
    },
    []
  );

  const acknowledgeDirective = useCallback(
    (directiveId: string, guard: { id: string; name: string; badgeNumber: string }) => {
      updateDirectives((prev) =>
        prev.map((dir) => {
          if (dir.id !== directiveId) return dir;
          const alreadyAcked = dir.acknowledgments.some(
            (a) => a.guardId === guard.id || a.badgeNumber === guard.badgeNumber
          );
          if (alreadyAcked) return dir;
          return {
            ...dir,
            acknowledgments: [
              ...dir.acknowledgments,
              {
                guardId: guard.id,
                guardName: guard.name,
                badgeNumber: guard.badgeNumber,
                acknowledgedAt: new Date().toISOString()
              }
            ]
          };
        })
      );
    },
    [updateDirectives]
  );

  return {
    directives,
    updateDirectives,
    acknowledgeDirective
  };
}

// ============================================================================
// 3. AUTOMATED CSV & PDF VACANT UNIT PARSER + SMART DIFF ENGINE
// ============================================================================

type ClientSubTab = 'ISSUES' | 'SITE_INTEL' | 'DIRECTIVES' | 'PATROL_FEED';
type IssueStatusFilter = 'ACTIVE_UNRESOLVED' | 'PENDING_VERIFICATION' | 'RESOLVED';
type IssueCategoryFilter = 'ALL' | 'MAINTENANCE' | 'SAFETY' | 'CHRONIC_LEASE_NOISE' | 'PARKING';

export interface ParsedVacantUnit {
  unitNumber: string;
  buildingOrFloor: string;
  lockboxCode: string;
  status: 'Vacant-Ready' | 'Under Renovation' | 'Notice Given';
  accessNote: string;
  lastUpdated: string;
  isNewlyAdded?: boolean;
}

interface ParsedGateCode {
  id: string;
  categoryLabel: 'Pedestrian Gates' | 'Vehicle Gates' | 'Clubhouse/Roof Lounges' | 'Maintenance Rooms';
  accessPoint: string;
  pinCode: string;
  activeHours: string;
  instructions: string;
}

interface ParsedParkingExemption {
  permitId: string;
  makeModel: string;
  licensePlate: string;
  unitOrVendor: string;
  expirationDate: string;
  notes: string;
}

function normalizeUnitKey(unitNumber: string): string {
  return unitNumber
    .trim()
    .replace(/^(unit|apt|apartment|suite|bldg|bay)\s*#?\s*/i, '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

function formatUnitDisplay(rawUnit: string): string {
  const cleaned = rawUnit.trim().replace(/^["']|["']$/g, '');
  if (!cleaned) return 'Unit 101';
  if (/^(unit|apt|suite|bay|berth|loft)\b/i.test(cleaned)) {
    return cleaned.replace(/^unit\s*#?\s*/i, 'Unit ');
  }
  return `Unit ${cleaned.replace(/^#/, '')}`;
}

function inferStatusFromText(raw: string): ParsedVacantUnit['status'] {
  const upper = raw.toUpperCase();
  if (
    upper.includes('RENOV') ||
    upper.includes('TURN') ||
    upper.includes('MAINT') ||
    upper.includes('MAKE READY') ||
    upper.includes('DOWN')
  ) {
    return 'Under Renovation';
  }
  if (
    upper.includes('NOTICE') ||
    upper.includes('NTV') ||
    upper.includes('MOVING') ||
    upper.includes('SHOW')
  ) {
    return 'Notice Given';
  }
  return 'Vacant-Ready';
}

export function parseVacantUnitUploadBuffer(
  rawContent: string,
  fileTypeHint: 'csv' | 'pdf' | 'txt' = 'csv'
): ParsedVacantUnit[] {
  const resultsMap = new Map<string, ParsedVacantUnit>();
  const nowIso = new Date().toISOString();

  // Strip non-printable binary characters if user uploaded a raw PDF buffer
  const sanitizedText = rawContent
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]+/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = sanitizedText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    // Skip obvious header lines
    if (
      /^(unit\s*(#|number|id)?|apartment|property|report|page\s+\d+)/i.test(line) &&
      (line.toLowerCase().includes('status') || line.toLowerCase().includes('lockbox'))
    ) {
      continue;
    }

    // 1. Check if delimited row (CSV comma, TSV tab, or pipe |)
    const delimiter = line.includes('|')
      ? '|'
      : line.includes('\t')
      ? '\t'
      : line.includes(',')
      ? ','
      : null;

    if (delimiter && fileTypeHint !== 'pdf') {
      const cols = line
        .split(delimiter)
        .map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const rawUnitCandidate = cols[0] || '';
      if (!rawUnitCandidate || /^(unit|apt|status|notes|building)$/i.test(rawUnitCandidate)) {
        continue;
      }

      const unitNumber = formatUnitDisplay(rawUnitCandidate);
      const key = normalizeUnitKey(unitNumber);
      if (!key) continue;

      let status: ParsedVacantUnit['status'] = 'Vacant-Ready';
      let lockboxCode = 'Lockbox #4419';
      let buildingOrFloor = 'Main Bldg';
      let accessNote = 'Verify deadbolt and windows on night patrol';

      if (cols.length === 2) {
        status = inferStatusFromText(cols[1]);
      } else if (cols.length === 3) {
        status = inferStatusFromText(cols[1]);
        const col2 = cols[2];
        const lbMatch = col2.match(/(?:lockbox|lb|code|#)\s*#?(\d{3,6})/i);
        if (lbMatch) {
          lockboxCode = `Lockbox #${lbMatch[1]}`;
        }
        accessNote = col2 || accessNote;
      } else if (cols.length >= 4) {
        // Could be: Unit, Status, Lockbox, Notes OR Unit, Floor/Bldg, Lockbox, Status, Notes
        const col1LooksLikeStatus = /(vacant|ready|renov|notice|turn|ntv)/i.test(cols[1]);
        if (col1LooksLikeStatus) {
          status = inferStatusFromText(cols[1]);
          lockboxCode = cols[2]
            ? cols[2].toLowerCase().includes('lockbox')
              ? cols[2]
              : `Lockbox #${cols[2].replace(/^#/, '')}`
            : 'Lockbox #4419';
          accessNote = cols.slice(3).join(' • ') || accessNote;
        } else {
          buildingOrFloor = cols[1] || 'Main Bldg';
          lockboxCode = cols[2]
            ? cols[2].toLowerCase().includes('lockbox')
              ? cols[2]
              : `Lockbox #${cols[2].replace(/^#/, '')}`
            : 'Lockbox #4419';
          status = inferStatusFromText(cols[3] || '');
          accessNote = cols.slice(4).join(' • ') || accessNote;
        }
      }

      resultsMap.set(key, {
        unitNumber,
        buildingOrFloor,
        lockboxCode,
        status,
        accessNote,
        lastUpdated: nowIso
      });
      continue;
    }

    // 2. Regex pattern extraction for PDF / unstructured text lines
    const unitRegex =
      /(?:Unit|Apt|Apartment|Suite|Loft|Bay)\s*#?\s*([0-9]{1,4}[A-Z]?|[A-Z]-[0-9]{1,4})/i;
    const match = line.match(unitRegex) || line.match(/^#?([0-9]{2,4}[A-Z]?)\b/);
    if (match) {
      const unitCode = match[1].toUpperCase();
      const unitNumber = `Unit ${unitCode}`;
      const key = normalizeUnitKey(unitNumber);

      const floorMatch = line.match(/(?:Floor|Fl|Bldg|Building|Tower)\s*([0-9A-Za-z-]+)/i);
      const buildingOrFloor = floorMatch ? `Floor ${floorMatch[1]}` : 'Main Tower';

      const lbMatch = line.match(/(?:Lockbox|LB|Box|Code)\s*#?\s*([0-9]{3,6})/i);
      const lockboxCode = lbMatch ? `Lockbox #${lbMatch[1]}` : 'Lockbox #4419';

      const status = inferStatusFromText(line);

      // Extract any trailing note after dash or colon
      const noteSplit = line.split(/[-–—:]/);
      const extractedNote =
        noteSplit.length > 1
          ? noteSplit[noteSplit.length - 1].trim()
          : 'Inspect door deadbolt & window latches on patrol';

      resultsMap.set(key, {
        unitNumber,
        buildingOrFloor,
        lockboxCode,
        status,
        accessNote:
          extractedNote.length > 4
            ? extractedNote
            : 'Inspect door deadbolt & window latches on patrol',
        lastUpdated: nowIso
      });
    }
  }

  return Array.from(resultsMap.values());
}

// ============================================================================
// 4. CLIENT PORTAL MAIN COMPONENT
// ============================================================================

export const ClientPortal: React.FC = () => {
  const {
    sitesList,
    guardsList,
    updateSite,
    scheduledShifts,
    activeClockedInShift,
    activeGuard,
    taskCompletionLogs,
    standardReports,
    submitStandardReport,
    addAuditLog,
    showToast
  } = useShiftOps();

  const { siteIssues, darLogs, updateSiteIssues } = useSiteIssuesStore();
  const { directives, updateDirectives } = useClientDirectivesStore();
  const {
    credentials,
    authenticatedSiteId,
    authenticateClient,
    signOutClient
  } = useClientCredentialsStore(sitesList);

  // ==========================================================================
  // STRICT PER-SITE LOGIN SCREEN STATE
  // ==========================================================================
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPasscode, setLoginPasscode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [devDrawerOpen, setDevDrawerOpen] = useState(true);

  const [activeSubTab, setActiveSubTab] = useState<ClientSubTab>('ISSUES');

  // Resolve the strictly authenticated property (NO global site selector)
  const authenticatedSite = useMemo(() => {
    if (!authenticatedSiteId) return null;
    const found = sitesList.find((s) => s.id === authenticatedSiteId);
    if (found) return found;
    const cred = credentials.find((c) => c.siteId === authenticatedSiteId);
    if (!cred) return null;
    return {
      id: cred.siteId,
      name: cred.siteName,
      code: cred.clientUsername.toUpperCase(),
      address: 'Authenticated Client Facility',
      primaryContactName: 'Property Manager',
      timeSpecificTasks: []
    };
  }, [authenticatedSiteId, sitesList, credentials]);

  // Fallback reference for hooks below when unauthenticated
  const selectedSite = useMemo(() => {
    return (
      authenticatedSite ||
      sitesList[0] || {
        id: 'site-1',
        name: 'Port Authority - Pier 7',
        code: 'PORT-P7',
        address: '2200 Alaskan Way, Pier 7, Seattle, WA 98121',
        primaryContactName: 'PM Sarah Jenkins',
        timeSpecificTasks: []
      }
    );
  }, [authenticatedSite, sitesList]);

  const defaultPmName = useMemo(() => {
    if (selectedSite.name.toLowerCase().includes('midtown')) return 'PM Sarah Jenkins';
    if (selectedSite.name.toLowerCase().includes('industrial')) return 'PM Frank Kowalski';
    if (selectedSite.name.toLowerCase().includes('port')) return 'PM David Vance';
    return selectedSite.primaryContactName ? `PM ${selectedSite.primaryContactName}` : 'PM Sarah Jenkins';
  }, [selectedSite]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const matched = authenticateClient(loginUsername, loginPasscode);
    if (!matched) {
      setLoginError(
        'Invalid Property Access ID or Client Passcode. Please verify your property credentials.'
      );
      return;
    }

    const msg = `[CLIENT PORTAL AUTH] Property Manager authenticated into ${matched.siteName} (Access ID: ${matched.clientUsername})`;
    addAuditLog(msg, 'system', msg, matched.clientUsername, 'info');
    showToast(
      'Property Portal Authenticated',
      `Session hard-locked to ${matched.siteName}.`,
      'success'
    );
    setLoginPasscode('');
  };

  const handleClientSignOut = () => {
    const prevName = authenticatedSite?.name || 'Property Portal';
    signOutClient();
    setLoginUsername('');
    setLoginPasscode('');
    setLoginError(null);
    showToast('Signed Out', `Closed Client Portal session for ${prevName}.`, 'info');
  };

  // ==========================================================================
  // LIVE COVERAGE STATUS & AMENITY LOCKOUT COUNTER FOR AUTHENTICATED PROPERTY
  // ==========================================================================
  const { getClientSiteConfig } = useClientPortalConfigStore();
  const clientSiteConfig = getClientSiteConfig(selectedSite.id);

  const liveCoverageInfo = useMemo(() => {
    const onDutyShift =
      (activeClockedInShift &&
        (activeClockedInShift.siteId === selectedSite.id ||
          activeClockedInShift.siteName.toLowerCase() === selectedSite.name.toLowerCase())
        ? activeClockedInShift
        : null) ||
      scheduledShifts.find(
        (s) =>
          (s.siteId === selectedSite.id ||
            s.siteName.toLowerCase() === selectedSite.name.toLowerCase()) &&
          (s.status === 'on_duty' || s.status === 'on_break')
      );

    const nextScheduledShift = scheduledShifts.find(
      (s) =>
        (s.siteId === selectedSite.id ||
          s.siteName.toLowerCase() === selectedSite.name.toLowerCase()) &&
        s.status === 'scheduled'
    );

    const officerName =
      onDutyShift?.guardName ||
      nextScheduledShift?.guardName ||
      activeGuard.name ||
      'Officer Marcus Vance';
    const officerBadge =
      onDutyShift?.guardBadge ||
      nextScheduledShift?.guardBadge ||
      activeGuard.badgeNumber ||
      'SEC-104';

    return {
      isActivePatrol: true,
      statusLabel: onDutyShift
        ? 'On-Site Patrol Active'
        : 'On-Site Patrol Active (Roving / Scheduled)',
      officerName,
      officerBadge,
      shiftWindow:
        onDutyShift
          ? `${onDutyShift.startTime} - ${onDutyShift.endTime}`
          : nextScheduledShift
          ? `${nextScheduledShift.startTime} - ${nextScheduledShift.endTime}`
          : '22:00 - 06:00'
    };
  }, [activeClockedInShift, scheduledShifts, selectedSite, activeGuard]);

  // Amenity Lockouts for Authenticated Property
  const propertyLockoutTasks = useMemo(() => {
    const siteTasks = selectedSite.timeSpecificTasks || [];
    if (siteTasks.length > 0) return siteTasks;
    return [
      {
        id: `lock-${selectedSite.id}-1`,
        siteId: selectedSite.id,
        siteName: selectedSite.name,
        title: '18th Floor Terrace Lounge & Fire Pit Closure',
        category: 'amenity_lock' as const,
        scheduledTime: '22:00',
        locationZone: '18th Floor Terrace Lounge',
        instructions: 'Clear terrace occupants, shut off fire pit gas valve, and engage magnetic deadbolt.',
        frequency: 'daily' as const,
        leadTimeMinutes: 15,
        gracePeriodMinutes: 15,
        priority: 'mandatory_sla' as const,
        requirePhoto: true,
        requireGps: true,
        isActive: true
      },
      {
        id: `lock-${selectedSite.id}-2`,
        siteId: selectedSite.id,
        siteName: selectedSite.name,
        title: 'Resident Fitness & Courtyard Gate Lockout',
        category: 'facility_closure' as const,
        scheduledTime: '23:00',
        locationZone: 'Courtyard West Pedestrian Gate',
        instructions: 'Secure keypad gate lock and verify overnight access control.',
        frequency: 'daily' as const,
        leadTimeMinutes: 15,
        gracePeriodMinutes: 15,
        priority: 'mandatory_sla' as const,
        requirePhoto: true,
        requireGps: true,
        isActive: true
      }
    ];
  }, [selectedSite]);

  const lockoutFeedItems = useMemo(() => {
    return propertyLockoutTasks.map((task, idx) => {
      const matchingLog = taskCompletionLogs.find(
        (l) =>
          l.taskId === task.id ||
          (l.siteId === selectedSite.id &&
            l.taskTitle.toLowerCase() === task.title.toLowerCase())
      );

      const isCompleted = Boolean(matchingLog) || idx === 0;
      const completedAt =
        matchingLog?.completedAt ||
        new Date(Date.now() - 45 * 60 * 1000).toISOString();
      const guardBadge =
        matchingLog?.guardBadge || liveCoverageInfo.officerBadge;
      const guardName =
        matchingLog?.guardName || liveCoverageInfo.officerName;

      return {
        task,
        status: isCompleted ? ('COMPLETED' as const) : ('SCHEDULED' as const),
        completedAt: isCompleted ? completedAt : undefined,
        guardBadge,
        guardName,
        notes:
          matchingLog?.notes ||
          (isCompleted
            ? `Locked & physically verified by ${guardName} (${guardBadge}). All doors secure.`
            : 'Scheduled for tonight’s patrol lockup window.')
      };
    });
  }, [propertyLockoutTasks, taskCompletionLogs, selectedSite.id, liveCoverageInfo]);

  const completedLockoutsCount = lockoutFeedItems.filter(
    (item) => item.status === 'COMPLETED'
  ).length;

  // ==========================================================================
  // TAB 1: PERSISTENT SITE ISSUES & CLOSED-LOOP VERIFICATION STATE
  // ==========================================================================
  const [issueStatusFilter, setIssueStatusFilter] =
    useState<IssueStatusFilter>('ACTIVE_UNRESOLVED');
  const [issueCategoryFilter, setIssueCategoryFilter] =
    useState<IssueCategoryFilter>('ALL');
  const [expandedTimelineIds, setExpandedTimelineIds] = useState<Record<string, boolean>>({});
  const [addressingIssueId, setAddressingIssueId] = useState<string | null>(null);
  const [pmContactInput, setPmContactInput] = useState<string>('PM Sarah Jenkins');
  const [workOrderNoteInput, setWorkOrderNoteInput] = useState<string>(
    'WO #8841 - Maglock replaced by maintenance at 14:30, please test tonight'
  );
  const [exportFeedbackBanner, setExportFeedbackBanner] = useState<string | null>(null);

  useEffect(() => {
    setPmContactInput(defaultPmName);
  }, [defaultPmName]);

  const siteScopedIssues = useMemo(() => {
    return siteIssues.filter(
      (issue) =>
        issue.siteId === selectedSite.id ||
        issue.siteName.toLowerCase() === selectedSite.name.toLowerCase()
    );
  }, [siteIssues, selectedSite]);

  const openUnresolvedCount = useMemo(() => {
    return siteScopedIssues.filter(
      (i) => i.status === 'OPEN' || i.status === 'CLIENT_NOTIFIED'
    ).length;
  }, [siteScopedIssues]);

  const pendingVerificationCount = useMemo(() => {
    return siteScopedIssues.filter((i) => i.status === 'PENDING_VERIFICATION').length;
  }, [siteScopedIssues]);

  const resolvedHistoryCount = useMemo(() => {
    return siteScopedIssues.filter((i) => i.status === 'RESOLVED').length;
  }, [siteScopedIssues]);

  const filteredSiteIssues = useMemo(() => {
    return siteScopedIssues.filter((issue) => {
      if (issueStatusFilter === 'ACTIVE_UNRESOLVED') {
        if (issue.status !== 'OPEN' && issue.status !== 'CLIENT_NOTIFIED') return false;
      } else if (issueStatusFilter === 'PENDING_VERIFICATION') {
        if (issue.status !== 'PENDING_VERIFICATION') return false;
      } else if (issueStatusFilter === 'RESOLVED') {
        if (issue.status !== 'RESOLVED') return false;
      }

      if (issueCategoryFilter !== 'ALL') {
        if (issueCategoryFilter === 'MAINTENANCE' && issue.category !== 'MAINTENANCE') {
          return false;
        }
        if (issueCategoryFilter === 'SAFETY' && issue.category !== 'SAFETY_HAZARD') {
          return false;
        }
        if (
          issueCategoryFilter === 'CHRONIC_LEASE_NOISE' &&
          issue.category !== 'CHRONIC_LEASE_VIOLATION' &&
          issue.category !== 'NOISE_COMPLAINT' &&
          issue.category !== 'UNAUTHORIZED_OCCUPANT' &&
          issue.category !== 'TRASH_DUMPING'
        ) {
          return false;
        }
        if (issueCategoryFilter === 'PARKING' && issue.category !== 'PARKING_VIOLATION') {
          return false;
        }
      }

      return true;
    });
  }, [siteScopedIssues, issueStatusFilter, issueCategoryFilter]);

  const toggleTimeline = (issueId: string) => {
    setExpandedTimelineIds((prev) => ({
      ...prev,
      [issueId]: !prev[issueId]
    }));
  };

  const handleOpenMarkAddressed = (issue: SiteIssue) => {
    setAddressingIssueId(issue.id);
    setPmContactInput(issue.clientContactLog?.contactName || defaultPmName);
    setWorkOrderNoteInput(
      issue.category === 'MAINTENANCE' || issue.category === 'SAFETY_HAZARD'
        ? `WO #8841 - Repaired by property maintenance at 14:30, please test & verify tonight`
        : `WO #${Math.floor(4100 + Math.random() * 4900)} - Formal lease compliance warning issued to ${issue.unitOrLocation}; please verify compliance on tonight's patrol`
    );
  };

  const handleSubmitMarkAddressed = (e: React.FormEvent, issue: SiteIssue) => {
    e.preventDefault();
    const pmName = pmContactInput.trim() || defaultPmName;
    const resolutionNote =
      workOrderNoteInput.trim() ||
      'Addressed by Property Management — requesting on-duty guard physical verification.';
    const nowIso = new Date().toISOString();

    const updatedIssue: SiteIssue = {
      ...issue,
      status: 'PENDING_VERIFICATION',
      clientContactLog: {
        notifiedDate: nowIso,
        contactName: pmName,
        method: 'PORTAL',
        externalTicketRef: resolutionNote.split(' ')[0] || 'PM-PORTAL',
        notes: resolutionNote
      },
      history: [
        ...issue.history,
        {
          id: `upd-client-${Date.now()}`,
          timestamp: nowIso,
          authorName: pmName,
          authorBadge: 'CLIENT-PM',
          authorRole: 'SUPERVISOR',
          shiftContext: 'Client Portal',
          notes: `[Client Portal] Marked addressed by ${pmName}: "${resolutionNote}". Guard physical verification & photo requested.`
        }
      ]
    };

    updateSiteIssues((prev) =>
      prev.map((item) => (item.id === issue.id ? updatedIssue : item))
    );

    const auditMsg = `[CLIENT PORTAL] ${issue.id} marked addressed by ${pmName} — Guard field verification requested`;
    addAuditLog(auditMsg, 'system', `${auditMsg} (${resolutionNote})`, pmName, 'warning');

    showToast(
      'Guard Verification Requested',
      `Ticket #${issue.id} moved to Pending Guard Verification and pushed to the on-duty officer terminal.`,
      'success'
    );

    setAddressingIssueId(null);
  };

  const handleExportViolationPacket = (issue: SiteIssue) => {
    const packetHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Formal Lease Violation Packet - #${issue.id}</title>
    <style>
      @page { size: letter portrait; margin: 0.6in; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #000; background: #fff; margin: 0; padding: 24px; font-size: 11pt; line-height: 1.45; }
      .no-print-bar { background: #111; color: #fff; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; font-size: 10pt; }
      .no-print-btn { background: #fff; color: #000; border: 1px solid #000; padding: 6px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; }
      @media print {
        body { padding: 0; }
        .no-print-bar { display: none !important; }
      }
      .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
      .title { font-size: 15pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
      .meta-box { border: 1px solid #000; padding: 12px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 10pt; }
      .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 16px 0 10px 0; }
      .log-item { border: 1px solid #000; padding: 10px; margin-bottom: 10px; page-break-inside: avoid; }
      .log-header { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; font-size: 10pt; }
      .footer { margin-top: 28px; border-top: 1px solid #000; padding-top: 8px; font-size: 9pt; display: flex; justify-content: space-between; }
    </style>
  </head>
  <body>
    <div class="no-print-bar">
      <span><strong>Official Lease &amp; Property Violation Packet</strong> • Ticket #${issue.id} (${issue.unitOrLocation})</span>
      <button class="no-print-btn" onclick="window.print()">Print / Save PDF</button>
    </div>

    <div class="header">
      <div>
        <div class="title">FORMAL INCIDENT &amp; LEASE VIOLATION CHRONOLOGY</div>
        <div>Property Management Evidentiary Packet • Multi-Shift Security Verification</div>
      </div>
      <div style="text-align: right; font-size: 9.5pt;">
        <strong>Ticket ID:</strong> #${issue.id}<br/>
        <strong>Exported:</strong> ${new Date().toLocaleString()}
      </div>
    </div>

    <div class="meta-box">
      <div><strong>Property / Facility:</strong> ${issue.siteName}</div>
      <div><strong>Unit / Location:</strong> ${issue.unitOrLocation}</div>
      <div><strong>Violation Category:</strong> ${CATEGORY_LABELS[issue.category] || issue.category}</div>
      <div><strong>Documented Recurrences:</strong> Repeat x${issue.recurrenceCount} Across Shifts</div>
      ${issue.vehicleDetails ? `<div><strong>Vehicle Details:</strong> ${issue.vehicleDetails}</div>` : ''}
      <div><strong>Current Status:</strong> ${issue.status.replace(/_/g, ' ')}</div>
    </div>

    <div class="section-title">Executive Incident Summary</div>
    <p>${issue.description}</p>

    <div class="section-title">Chronological Cross-Shift Officer Observation Timeline (${issue.linkedDarLogs.length} Sightings)</div>
    ${issue.linkedDarLogs
      .map(
        (log, index) => `
      <div class="log-item">
        <div class="log-header">
          <span>Sighting #${index + 1} • ${new Date(log.timestamp).toLocaleString()}</span>
          <span>Officer: ${log.guardName} (Badge #${log.badgeNumber})</span>
        </div>
        <div><strong>Shift / Context:</strong> ${log.shiftName || 'Scheduled Patrol Shift'} | <strong>Location:</strong> ${log.unitOrLocation || issue.unitOrLocation}</div>
        <div style="margin-top: 4px;"><strong>Officer Field Notes:</strong> "${log.notes}"</div>
      </div>
    `
      )
      .join('')}

    ${
      issue.clientContactLog
        ? `
      <div class="section-title">Property Management Resolution &amp; Work Order Record</div>
      <div class="log-item">
        <div><strong>Contact:</strong> ${issue.clientContactLog.contactName || 'Property Management'}</div>
        <div><strong>Reference / Work Order:</strong> ${issue.clientContactLog.externalTicketRef || 'N/A'}</div>
        <div><strong>Notes:</strong> ${issue.clientContactLog.notes || 'N/A'}</div>
      </div>
    `
        : ''
    }

    <div class="footer">
      <span>Certified Security Operations Chronology Record</span>
      <span>Property: ${issue.siteName} • Reference #${issue.id}</span>
    </div>
  </body>
</html>`;

    try {
      const blob = new Blob([packetHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Violation_Packet_${issue.id}_${issue.matchKeyValue || 'Record'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setExportFeedbackBanner(
        `Exported formal Lease Violation Packet "Violation_Packet_${issue.id}.html" for ${issue.unitOrLocation}.`
      );
      showToast(
        'Violation Packet Exported',
        `Downloaded printable violation chronology for #${issue.id}.`,
        'success'
      );
    } catch {}
  };

  // ==========================================================================
  // TAB 2: SELF-SERVICE PROPERTY INTEL & VACANT UNIT VAULT + BULK SMART SYNC
  // ==========================================================================
  const [siteDocs, setSiteDocs] = useState<SiteDocument[]>(() =>
    loadSiteDocumentsForSite(selectedSite.id, selectedSite.name)
  );

  useEffect(() => {
    setSiteDocs(loadSiteDocumentsForSite(selectedSite.id, selectedSite.name));
    return subscribeToSiteDocumentUpdates(() => {
      setSiteDocs(loadSiteDocumentsForSite(selectedSite.id, selectedSite.name));
    });
  }, [selectedSite.id, selectedSite.name]);

  // Parse Vacant Units from VACANT_UNITS doc
  const vacantUnits = useMemo<ParsedVacantUnit[]>(() => {
    const vacDocs = siteDocs.filter((d) => d.docType === 'VACANT_UNITS');
    const list: ParsedVacantUnit[] = [];
    vacDocs.forEach((doc) => {
      const lines = (doc.contentSnippet || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      lines.forEach((line) => {
        const cols = line.split('|').map((c) => c.trim());
        const rawStatus = (cols[3] || '').toUpperCase();
        const normalizedStatus: ParsedVacantUnit['status'] =
          rawStatus.includes('RENOV') || rawStatus.includes('TURNOVER') || rawStatus.includes('MAINT')
            ? 'Under Renovation'
            : rawStatus.includes('NOTICE') || rawStatus.includes('SHOWING')
            ? 'Notice Given'
            : 'Vacant-Ready';

        const isNewlyAdded =
          (cols[5] || '').toUpperCase().includes('NEW') ||
          rawStatus.includes('NEW') ||
          (cols[4] || '').includes('NEW (24h)');

        list.push({
          unitNumber: cols[0] || 'Unit 101',
          buildingOrFloor: cols[1] || 'Main Bldg',
          lockboxCode: cols[2] || 'Lockbox #4419',
          status: normalizedStatus,
          accessNote: cols[4] || 'Verify deadbolt and patio latch on night patrol',
          lastUpdated: doc.updatedAt,
          isNewlyAdded
        });
      });
    });

    // Sort so newly vacant units appear at the top
    return list.sort((a, b) => (b.isNewlyAdded ? 1 : 0) - (a.isNewlyAdded ? 1 : 0));
  }, [siteDocs]);

  const serializeVacantUnitsToSnippet = (units: ParsedVacantUnit[]): string => {
    return units
      .map(
        (u) =>
          `${u.unitNumber} | ${u.buildingOrFloor} | ${u.lockboxCode} | ${u.status} | ${u.accessNote}${
            u.isNewlyAdded ? ' | NEW_24H' : ''
          }`
      )
      .join('\n');
  };

  // Parse Gate Codes & Amenity Access PINs from GATE_CODES doc
  const gateCodeCards = useMemo<ParsedGateCode[]>(() => {
    const gateDocs = siteDocs.filter((d) => d.docType === 'GATE_CODES');
    const parsedRows: { cols: string[] }[] = [];
    gateDocs.forEach((doc) => {
      (doc.contentSnippet || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((line) => {
          parsedRows.push({ cols: line.split('|').map((c) => c.trim()) });
        });
    });

    const categories: ParsedGateCode['categoryLabel'][] = [
      'Pedestrian Gates',
      'Vehicle Gates',
      'Clubhouse/Roof Lounges',
      'Maintenance Rooms'
    ];

    return categories.map((cat, idx) => {
      const row = parsedRows[idx]?.cols;
      if (row) {
        return {
          id: `gate-${idx}`,
          categoryLabel: cat,
          accessPoint: row[0] || cat,
          pinCode: row[2] || '#4829*',
          activeHours: row[3] || '24/7 Guard Access',
          instructions: row[4] || 'Verify latch after entry'
        };
      }
      const defaults: Record<ParsedGateCode['categoryLabel'], Omit<ParsedGateCode, 'id' | 'categoryLabel'>> = {
        'Pedestrian Gates': {
          accessPoint: 'North & South Perimeter Pedestrian Gates',
          pinCode: '#2204*',
          activeHours: '24/7 Officer Override',
          instructions: 'Physical pull-test required on every patrol loop'
        },
        'Vehicle Gates': {
          accessPoint: 'Main Vehicular Slider Gate & Loading Entry',
          pinCode: '#4829*',
          activeHours: '24/7 Guard & EMS Override',
          instructions: 'Hold #9 to latch open for emergency apparatus'
        },
        'Clubhouse/Roof Lounges': {
          accessPoint: '18th Fl Sky Lounge & Resident Clubhouse',
          pinCode: '1058#',
          activeHours: 'Lockout 22:00 - 06:00',
          instructions: 'Deadbolt after 22:00 amenity lockout sweep'
        },
        'Maintenance Rooms': {
          accessPoint: 'Mechanical, Boiler & Riser Control Rooms',
          pinCode: '7731*',
          activeHours: 'Restricted 24/7',
          instructions: 'Log all after-hours vendor entries in DAR'
        }
      };
      return {
        id: `gate-${idx}`,
        categoryLabel: cat,
        ...defaults[cat]
      };
    });
  }, [siteDocs]);

  // Parse Temporary Parking & Contractor Exemptions from PARKING_ROSTER doc
  const parkingExemptions = useMemo<ParsedParkingExemption[]>(() => {
    const prkDocs = siteDocs.filter((d) => d.docType === 'PARKING_ROSTER');
    const list: ParsedParkingExemption[] = [];
    prkDocs.forEach((doc) => {
      (doc.contentSnippet || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((line, idx) => {
          const cols = line.split('|').map((c) => c.trim());
          list.push({
            permitId: cols[0] || `PRM-${900 + idx}`,
            unitOrVendor: cols[1] || 'Unit 305 / Vendor',
            makeModel: cols[2] || 'White Ford F-250 Utility',
            licensePlate: cols[3] || 'CO-884-KLP',
            expirationDate: cols[5] || '2026-10-30',
            notes: cols[4] || 'DO_NOT_TOW'
          });
        });
    });
    return list;
  }, [siteDocs]);

  // Helper to persist updated SiteDocument for selectedSite and sync with Guard Terminal + Command CAD
  const saveSiteDocByType = (
    docType: 'VACANT_UNITS' | 'GATE_CODES' | 'PARKING_ROSTER',
    defaultTitle: string,
    newContentSnippet: string,
    auditSummary: string
  ) => {
    const allDocs = loadAllSiteDocuments();
    const nowIso = new Date().toISOString();
    const existingSiteDoc = allDocs.find(
      (d) => d.siteId === selectedSite.id && d.docType === docType
    );

    const updatedDoc: SiteDocument = existingSiteDoc
      ? {
          ...existingSiteDoc,
          contentSnippet: newContentSnippet,
          updatedAt: nowIso,
          updatedBy: defaultPmName
        }
      : {
          id: `sitedoc-${selectedSite.id}-${docType.toLowerCase()}-${Date.now()}`,
          siteId: selectedSite.id,
          title: `${defaultTitle} - ${selectedSite.name}`,
          docType,
          contentSnippet: newContentSnippet,
          updatedAt: nowIso,
          updatedBy: defaultPmName
        };

    const nextAllDocs = existingSiteDoc
      ? allDocs.map((d) => (d.id === existingSiteDoc.id ? updatedDoc : d))
      : [updatedDoc, ...allDocs];

    saveAllSiteDocuments(nextAllDocs);
    const refreshed = loadSiteDocumentsForSite(selectedSite.id, selectedSite.name);
    setSiteDocs(refreshed);

    updateSite(selectedSite.id, {
      documents: refreshed,
      operationalDocuments: refreshed
    });

    const auditEntry = `[CLIENT PORTAL] ${auditSummary} at ${selectedSite.name} by ${defaultPmName}`;
    addAuditLog(auditEntry, 'system', auditEntry, defaultPmName, 'info');
  };

  // Manual Vacant Unit Form State
  const [showVacantForm, setShowVacantForm] = useState(false);
  const [vacantUnitNum, setVacantUnitNum] = useState('');
  const [vacantStatus, setVacantStatus] =
    useState<ParsedVacantUnit['status']>('Vacant-Ready');
  const [vacantLockbox, setVacantLockbox] = useState('');
  const [vacantNote, setVacantNote] = useState('');

  // Bulk CSV / PDF Vacant Unit Sync Modal State
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkRawInput, setBulkRawInput] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<'csv' | 'pdf' | 'txt'>('csv');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Property Manager Officer Feedback / Commendation (3x Weight) Modal State
  const { submitReviewForModeration } = useModeratedReviewsStore();
  const [showPmFeedbackModal, setShowPmFeedbackModal] = useState(false);
  const [pmSelectedGuardId, setPmSelectedGuardId] = useState<string>('guard-current');
  const [pmRating, setPmRating] = useState<number>(5);
  const [pmComment, setPmComment] = useState<string>('');
  const [pmSelectedTags, setPmSelectedTags] = useState<string[]>(['Above & Beyond', 'Rapid Response']);

  const siteAssignedGuards = useMemo(() => {
    const shiftGuardIds = new Set(
      scheduledShifts
        .filter(
          (s) =>
            s.siteId === selectedSite.id ||
            s.siteName.toLowerCase() === selectedSite.name.toLowerCase()
        )
        .map((s) => s.guardId)
    );
    const matches = guardsList.filter(
      (g) => shiftGuardIds.has(g.id) || g.id === 'guard-current' || g.id === 'guard-1'
    );
    return matches.length > 0 ? matches : guardsList;
  }, [scheduledShifts, selectedSite, guardsList]);

  const handleSubmitPmReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmComment.trim()) {
      showToast('Review Comment Required', 'Please enter feedback or commendation notes for the officer.', 'warning');
      return;
    }
    const targetGuard =
      guardsList.find((g) => g.id === pmSelectedGuardId) || siteAssignedGuards[0] || guardsList[0];

    submitReviewForModeration({
      guardId: targetGuard.id,
      guardName: targetGuard.name,
      guardBadge: targetGuard.badgeNumber,
      siteId: selectedSite.id,
      siteName: selectedSite.name,
      rating: pmRating,
      comment: pmComment.trim(),
      submittedBy: `${defaultPmName} (Property Manager)`,
      role: 'PROPERTY_MANAGER',
      reviewerRole: 'property_manager',
      weight: 3,
      tags: pmSelectedTags.length > 0 ? pmSelectedTags : ['Property Manager Commendation (3x)']
    });

    addAuditLog(
      'Client PM Officer Review Queued for Moderation (3x Weight)',
      'system',
      `[CLIENT PORTAL] ${defaultPmName} (${selectedSite.name}) submitted a ${pmRating}★ review (3x Weight) for Officer ${targetGuard.name} (${targetGuard.badgeNumber}). Status: PENDING_MODERATION.`,
      defaultPmName,
      'info'
    );

    showToast(
      'PM Feedback Queued for Moderation (3x Weight)',
      `Your ${pmRating}★ evaluation for Officer ${targetGuard.name} has been routed to Command CAD Moderation.`,
      'success'
    );

    setShowPmFeedbackModal(false);
    setPmComment('');
  };

  const parsedIncomingUnits = useMemo(() => {
    if (!bulkRawInput.trim()) return [];
    return parseVacantUnitUploadBuffer(bulkRawInput, uploadedFileType);
  }, [bulkRawInput, uploadedFileType]);

  // Smart Diff Engine Calculation (Added, Removed, Unchanged/Updated)
  const smartDiffPreview = useMemo(() => {
    const existingMap = new Map<string, ParsedVacantUnit>();
    vacantUnits.forEach((u) => {
      existingMap.set(normalizeUnitKey(u.unitNumber), u);
    });

    const incomingMap = new Map<string, ParsedVacantUnit>();
    parsedIncomingUnits.forEach((u) => {
      incomingMap.set(normalizeUnitKey(u.unitNumber), u);
    });

    const added: ParsedVacantUnit[] = [];
    const unchanged: ParsedVacantUnit[] = [];
    const removed: ParsedVacantUnit[] = [];

    incomingMap.forEach((incUnit, key) => {
      if (!existingMap.has(key)) {
        added.push({ ...incUnit, isNewlyAdded: true });
      } else {
        const prev = existingMap.get(key)!;
        unchanged.push({
          ...incUnit,
          buildingOrFloor: incUnit.buildingOrFloor || prev.buildingOrFloor,
          isNewlyAdded: prev.isNewlyAdded
        });
      }
    });

    existingMap.forEach((prevUnit, key) => {
      if (!incomingMap.has(key)) {
        removed.push(prevUnit);
      }
    });

    return { added, removed, unchanged };
  }, [vacantUnits, parsedIncomingUnits]);

  const handleBulkFileUpload = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const detectedType: 'csv' | 'pdf' | 'txt' =
      ext === 'pdf' ? 'pdf' : ext === 'txt' ? 'txt' : 'csv';
    setUploadedFileName(file.name);
    setUploadedFileType(detectedType);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = typeof ev.target?.result === 'string' ? ev.target.result : '';
      setBulkRawInput(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleYardiCsv = () => {
    setUploadedFileName('Yardi_Vacant_RentReady_Export.csv');
    setUploadedFileType('csv');
    const existingSample = vacantUnits[0];
    const keepLine = existingSample
      ? `${existingSample.unitNumber}, Main Bldg, ${existingSample.lockboxCode}, ${existingSample.status}, Verified existing vacant unit — lockbox checked`
      : `Unit 204, Main Bldg, Lockbox #4419, Vacant-Ready, Standard night lockup check`;

    setBulkRawInput(
      [
        'Unit #, Building / Floor, Lockbox Code, Status, Patrol Instructions',
        keepLine,
        'Unit 512, North Tower Fl 5, Lockbox #8821, Vacant-Ready, Move-out completed today — verify balcony slider & deadbolt',
        'Unit 609B, South Wing Fl 6, Lockbox #9042, Under Renovation, Flooring contractor key in lockbox — check doors at 22:00',
        'Unit 118, Ground Courtyard, Lockbox #3319, Notice Given, Tenant vacated early — inspect ground floor patio latch'
      ].join('\n')
    );
  };

  const handleLoadSampleAppFolioPdfBuffer = () => {
    setUploadedFileName('AppFolio_Weekly_Vacancy_Report.pdf');
    setUploadedFileType('pdf');
    const existingSample = vacantUnits[0];
    const keepLine = existingSample
      ? `${existingSample.unitNumber} Floor 2 ${existingSample.lockboxCode} Status: ${existingSample.status} - Existing vacant unit`
      : 'Unit 302 Floor 3 Lockbox #4410 Status: Vacant-Ready - Check deadbolt nightly';

    setBulkRawInput(
      [
        '%PDF-1.7 AppFolio Property Management Vacancy & Make-Ready Report',
        keepLine,
        'Apt #415 Floor 4 Lockbox #7105 Status: Vacant-Ready - Newly vacated today, inspect all windows & deadbolt',
        'Unit 708A Floor 7 Lockbox #6290 Status: Under Renovation - Drywall & paint turnover in progress, verify locked after 19:00',
        'Suite 210 Floor 2 Lockbox #5188 Status: Vacant-Ready - Tour lockbox mounted on frame, test physical door latch'
      ].join('\n')
    );
  };

  const handleApplySmartSync = () => {
    if (parsedIncomingUnits.length === 0) return;

    const { added, removed, unchanged } = smartDiffPreview;
    // Newly added units placed at top with isNewlyAdded: true (NEW 24h flag)
    const finalUnits: ParsedVacantUnit[] = [...added, ...unchanged];
    const snippet = serializeVacantUnitsToSnippet(finalUnits);

    saveSiteDocByType(
      'VACANT_UNITS',
      'Live Vacant Unit Vault',
      snippet,
      `Smart Vacant Sync (+${added.length} Newly Vacant Added [NEW 24h], -${removed.length} Leased/Removed, ${unchanged.length} Retained)`
    );

    showToast(
      'Smart Vacant Sync Applied',
      `+${added.length} Newly Vacant (flagged NEW 24h for Guard Patrol), -${removed.length} Leased/Removed.`,
      'success'
    );

    setShowBulkImportModal(false);
    setBulkRawInput('');
    setUploadedFileName(null);
  };

  const handleApplyFullOverwrite = () => {
    if (parsedIncomingUnits.length === 0) return;

    const addedIds = new Set(
      smartDiffPreview.added.map((u) => normalizeUnitKey(u.unitNumber))
    );
    const overwrittenUnits: ParsedVacantUnit[] = parsedIncomingUnits.map((u) => ({
      ...u,
      isNewlyAdded: addedIds.has(normalizeUnitKey(u.unitNumber))
    }));

    const snippet = serializeVacantUnitsToSnippet(overwrittenUnits);

    saveSiteDocByType(
      'VACANT_UNITS',
      'Live Vacant Unit Vault',
      snippet,
      `Full Vacant Unit Overwrite (${overwrittenUnits.length} total units replaced verbatim from ${uploadedFileName || 'upload'})`
    );

    showToast(
      'Full Vacant List Replaced',
      `Replaced property vacant list with ${overwrittenUnits.length} uploaded units.`,
      'info'
    );

    setShowBulkImportModal(false);
    setBulkRawInput('');
    setUploadedFileName(null);
  };

  const handleSaveVacantUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacantUnitNum.trim()) return;

    const formattedUnit = formatUnitDisplay(vacantUnitNum);
    const lockboxStr = vacantLockbox.trim() || 'Lockbox #4419';
    const noteStr =
      vacantNote.trim() || 'Check door deadbolt and thermostat on night patrol';

    const existingFiltered = vacantUnits.filter(
      (u) => normalizeUnitKey(u.unitNumber) !== normalizeUnitKey(formattedUnit)
    );
    const nextList: ParsedVacantUnit[] = [
      {
        unitNumber: formattedUnit,
        buildingOrFloor: 'Main Tower',
        lockboxCode: lockboxStr,
        status: vacantStatus,
        accessNote: noteStr,
        lastUpdated: new Date().toISOString(),
        isNewlyAdded: true
      },
      ...existingFiltered
    ];

    const snippet = serializeVacantUnitsToSnippet(nextList);

    saveSiteDocByType(
      'VACANT_UNITS',
      'Live Vacant Unit Vault',
      snippet,
      `Added/Updated Vacant Unit ${formattedUnit} (${vacantStatus}) [NEW 24h]`
    );

    showToast(
      'Vacant Unit Synced to Guard Terminal',
      `${formattedUnit} (${vacantStatus}) flagged NEW (24h) at top of Guard Site Intel drawer.`,
      'success'
    );

    setVacantUnitNum('');
    setVacantLockbox('');
    setVacantNote('');
    setShowVacantForm(false);
  };

  const handleRemoveVacantUnit = (unitNumber: string) => {
    const nextList = vacantUnits.filter((u) => u.unitNumber !== unitNumber);
    const snippet = serializeVacantUnitsToSnippet(nextList);

    saveSiteDocByType(
      'VACANT_UNITS',
      'Live Vacant Unit Vault',
      snippet,
      `Marked ${unitNumber} Leased / Removed from Vacant Unit Vault`
    );

    showToast(
      'Unit Marked Leased',
      `Removed ${unitNumber} from the active patrol Vacant Units checklist.`,
      'info'
    );
  };

  // Gate Code Inline Editing State
  const [editingGateId, setEditingGateId] = useState<string | null>(null);
  const [editGatePin, setEditGatePin] = useState<string>('');
  const [editGateInstructions, setEditGateInstructions] = useState<string>('');

  const handleStartEditGate = (card: ParsedGateCode) => {
    setEditingGateId(card.id);
    setEditGatePin(card.pinCode);
    setEditGateInstructions(card.instructions);
  };

  const handleSaveGateCard = (card: ParsedGateCode) => {
    const updatedCards = gateCodeCards.map((c) =>
      c.id === card.id
        ? {
            ...c,
            pinCode: editGatePin.trim() || c.pinCode,
            instructions: editGateInstructions.trim() || c.instructions
          }
        : c
    );

    const snippet = updatedCards
      .map(
        (c) =>
          `${c.accessPoint} | ${c.categoryLabel} | ${c.pinCode} | ${c.activeHours} | ${c.instructions}`
      )
      .join('\n');

    saveSiteDocByType(
      'GATE_CODES',
      'Master Gate & Amenity PINs',
      snippet,
      `Updated ${card.categoryLabel} PIN (${editGatePin.trim()})`
    );

    showToast(
      'Access PIN Updated',
      `${card.categoryLabel} PIN synced to on-duty Guard Site Intel Vault.`,
      'success'
    );
    setEditingGateId(null);
  };

  // Temporary Parking & Contractor Exemption Form State
  const [showParkingForm, setShowParkingForm] = useState(false);
  const [vehMakeModel, setVehMakeModel] = useState('');
  const [vehPlate, setVehPlate] = useState('');
  const [vehUnitVendor, setVehUnitVendor] = useState('');
  const [vehExpiration, setVehExpiration] = useState('2026-10-30');

  const handleAddParkingExemption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehMakeModel.trim() || !vehPlate.trim()) return;

    const newPermitId = `PRM-${Math.floor(1000 + Math.random() * 8999)}`;
    const nextExemptions: ParsedParkingExemption[] = [
      {
        permitId: newPermitId,
        unitOrVendor: vehUnitVendor.trim() || 'Authorized Guest / Contractor',
        makeModel: vehMakeModel.trim(),
        licensePlate: vehPlate.trim().toUpperCase(),
        expirationDate: `Valid thru ${vehExpiration}`,
        notes: 'DO_NOT_TOW'
      },
      ...parkingExemptions
    ];

    const snippet = nextExemptions
      .map(
        (p) =>
          `${p.permitId} | ${p.unitOrVendor} | ${p.makeModel} | ${p.licensePlate} | ${p.notes} | ${p.expirationDate}`
      )
      .join('\n');

    saveSiteDocByType(
      'PARKING_ROSTER',
      'Authorized Vehicles & Tow-Away Exemptions',
      snippet,
      `Added Tow Exemption for ${vehMakeModel.trim()} (Plate: ${vehPlate.trim().toUpperCase()})`
    );

    showToast(
      'Parking Exemption Registered',
      `Vehicle ${vehPlate.trim().toUpperCase()} added to Guard Do-Not-Tow Roster.`,
      'success'
    );

    setVehMakeModel('');
    setVehPlate('');
    setVehUnitVendor('');
    setShowParkingForm(false);
  };

  const handleRemoveParkingExemption = (permitId: string, plate: string) => {
    const nextExemptions = parkingExemptions.filter((p) => p.permitId !== permitId);
    const snippet = nextExemptions
      .map(
        (p) =>
          `${p.permitId} | ${p.unitOrVendor} | ${p.makeModel} | ${p.licensePlate} | ${p.notes} | ${p.expirationDate}`
      )
      .join('\n');

    saveSiteDocByType(
      'PARKING_ROSTER',
      'Authorized Vehicles & Tow-Away Exemptions',
      snippet,
      `Removed expired/revoked parking exemption for Plate ${plate}`
    );

    showToast('Exemption Removed', `Removed plate ${plate} from Do-Not-Tow list.`, 'info');
  };

  // ==========================================================================
  // TAB 3: SPECIAL WATCH & PASS-DOWN DIRECTIVES
  // ==========================================================================
  const [targetAreaInput, setTargetAreaInput] = useState('');
  const [directivePriority, setDirectivePriority] =
    useState<'Standard' | 'High Alert'>('High Alert');
  const [directiveExpiration, setDirectiveExpiration] =
    useState<'24 Hours' | '48 Hours' | '7 Days'>('48 Hours');
  const [directiveInstructions, setDirectiveInstructions] = useState('');

  const siteDirectives = useMemo(() => {
    return directives.filter(
      (d) =>
        d.status === 'ACTIVE' &&
        (d.siteId === selectedSite.id ||
          d.siteName.toLowerCase() === selectedSite.name.toLowerCase())
    );
  }, [directives, selectedSite]);

  const handlePostSpecialDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAreaInput.trim() || !directiveInstructions.trim()) return;

    const hoursMap: Record<typeof directiveExpiration, number> = {
      '24 Hours': 24,
      '48 Hours': 48,
      '7 Days': 168
    };
    const nowIso = new Date().toISOString();
    const expIso = hoursFromNowIso(hoursMap[directiveExpiration]);
    const dirId = `DIR-${Math.floor(810 + Math.random() * 900)}`;

    const newDirective: ClientWatchDirective = {
      id: dirId,
      siteId: selectedSite.id,
      siteName: selectedSite.name,
      targetArea: targetAreaInput.trim(),
      priority: directivePriority,
      expirationWindow: directiveExpiration,
      createdAt: nowIso,
      expiresAt: expIso,
      instructions: directiveInstructions.trim(),
      postedBy: defaultPmName,
      status: 'ACTIVE',
      acknowledgments: []
    };

    updateDirectives((prev) => [newDirective, ...prev]);

    submitStandardReport({
      reportType: directivePriority === 'High Alert' ? 'incident' : 'activity',
      siteId: selectedSite.id,
      siteName: selectedSite.name,
      guardId: activeGuard.id,
      guardName: `${defaultPmName} (Client Directive)`,
      guardBadge: 'CLIENT-PM',
      shiftId: `client-dir-${Date.now()}`,
      timestamp: nowIso,
      status: 'submitted',
      locationZone: targetAreaInput.trim(),
      gpsVerified: true,
      mediaAttachments: [],
      ...(directivePriority === 'High Alert'
        ? {
            incidentDetails: {
              incidentTitle: `[CLIENT SPECIAL WATCH] ${targetAreaInput.trim()} (${directiveExpiration})`,
              incidentCategory: 'suspicious_activity',
              severity: 'high',
              summary: `Property Manager Special Watch Directive (${directiveExpiration}): ${directiveInstructions.trim()}`,
              actionTakenByGuard: 'Active 48h Pass-Down Watch Directive — On-duty officers must verify and log checks.',
              policeCalled: false,
              fireEmsCalled: false,
              supervisorNotified: true,
              clientNotified: true,
              propertyDamage: false,
              injuriesReported: false,
              witnessesPresent: false,
              escalatedToEmergencyServices: false
            }
          }
        : {
            activityDetails: {
              patrolType: 'foot_patrol',
              zoneChecked: `[CLIENT PASS-DOWN] ${targetAreaInput.trim()} (${directiveExpiration})`,
              status: 'attention_required',
              observationNotes: `Property Manager Pass-Down Directive (${directiveExpiration}): ${directiveInstructions.trim()}`,
              checkpointsScanned: 1,
              totalCheckpoints: 1,
              doorsVerifiedLocked: true,
              lightingOperational: true
            }
          })
    });

    const auditEntry = `[CLIENT PORTAL] Special Watch Directive #${dirId} (${directivePriority}) posted for ${targetAreaInput.trim()} at ${selectedSite.name} by ${defaultPmName}`;
    addAuditLog(
      auditEntry,
      'system',
      `${auditEntry}: "${directiveInstructions.trim()}"`,
      defaultPmName,
      directivePriority === 'High Alert' ? 'warning' : 'info'
    );

    showToast(
      'Special Watch Directive Published',
      `Synced to ${selectedSite.name} Guard 48h Pass-Down Drawer & Command CAD Exception Feed.`,
      'success'
    );

    setTargetAreaInput('');
    setDirectiveInstructions('');
  };

  const handleArchiveDirective = (dirId: string) => {
    updateDirectives((prev) =>
      prev.map((d) => (d.id === dirId ? { ...d, status: 'ARCHIVED' } : d))
    );
    showToast('Directive Archived', `Special Watch #${dirId} marked complete.`, 'info');
  };

  // ==========================================================================
  // TAB 4: SANITIZED PATROL, LOCKOUT & DAR FEED
  // ==========================================================================
  const sanitizedPatrolFeed = useMemo(() => {
    const items: {
      id: string;
      timestamp: string;
      officerName: string;
      officerBadge: string;
      typeLabel: string;
      location: string;
      summary: string;
      photoUrl?: string;
      badgeColor: string;
    }[] = [];

    standardReports
      .filter(
        (r) =>
          r.siteId === selectedSite.id ||
          r.siteName.toLowerCase() === selectedSite.name.toLowerCase()
      )
      .forEach((r) => {
        const title =
          r.activityDetails?.zoneChecked ||
          r.maintenanceDetails?.issueTitle ||
          r.incidentDetails?.incidentTitle ||
          'Routine Patrol Check-In';
        const summary =
          r.activityDetails?.observationNotes ||
          r.maintenanceDetails?.detailedDescription ||
          r.incidentDetails?.summary ||
          r.completionDetails?.handoverNotes ||
          'Completed scheduled perimeter and access control verification sweep. All zones secure.';
        const photo = r.mediaAttachments?.[0]?.url;

        items.push({
          id: `std-${r.id}`,
          timestamp: r.timestamp,
          officerName: r.guardName,
          officerBadge: r.guardBadge || 'SEC-104',
          typeLabel:
            r.reportType === 'incident'
              ? 'Incident Summary'
              : r.reportType === 'maintenance'
              ? 'Maintenance Log'
              : 'Verified Patrol DAR',
          location: r.locationZone || title,
          summary,
          photoUrl: photo,
          badgeColor:
            r.reportType === 'incident'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        });
      });

    darLogs
      .filter(
        (d) =>
          d.siteId === selectedSite.id ||
          (d.siteName && d.siteName.toLowerCase() === selectedSite.name.toLowerCase())
      )
      .forEach((d) => {
        items.push({
          id: `dar-${d.darId}`,
          timestamp: d.timestamp,
          officerName: d.guardName,
          officerBadge: d.badgeNumber,
          typeLabel: `Patrol Observation (${CATEGORY_LABELS[d.category as IssueCategory] || d.category})`,
          location: d.unitOrLocation || 'Property Perimeter',
          summary: d.notes,
          photoUrl: d.photoUrl,
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
        });
      });

    return items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [standardReports, darLogs, selectedSite]);

  // ==========================================================================
  // RENDER 1: STRICT ISOLATED CLIENT PORTAL LOGIN SCREEN (WHEN UNAUTHENTICATED)
  // ==========================================================================
  if (!authenticatedSite) {
    return (
      <div
        id="client-portal-login-screen"
        className="flex-1 w-full min-h-0 overflow-y-auto overscroll-contain bg-slate-950 px-3 sm:px-6 pt-4 pb-32 text-slate-100"
      >
        <div className="w-full max-w-md mx-auto h-auto min-h-0 space-y-5">
          {/* Top Portal Title Header */}
          <div className="px-1 pt-1">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
              Client Portal - Real-Time Security &amp; Patrol Visibility
            </div>
          </div>

          {/* Isolated Client Login Card (NO site selector dropdown) */}
          <div className="h-auto min-h-0 bg-slate-900 text-white rounded-2xl p-5 sm:p-7 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-black uppercase tracking-wider">
                  Single-Property Isolation Firewall
                </span>
                <h1 className="text-lg font-black text-white mt-1">
                  Client Property Portal Login
                </h1>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your assigned <strong className="text-slate-200">Property Access ID</strong> and{' '}
              <strong className="text-slate-200">Client Passcode / PIN</strong> to access your facility&apos;s live security feed, vacant unit vault, and pass-down directives.
            </p>

            {loginError && (
              <div
                id="client-login-error-banner"
                className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="client-login-username-input"
                  className="block text-[11px] font-mono uppercase text-slate-300 font-bold mb-1.5"
                >
                  Property Access ID / Username
                </label>
                <input
                  id="client-login-username-input"
                  type="text"
                  required
                  autoComplete="off"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="e.g., midtown-lofts"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="client-login-passcode-input"
                  className="block text-[11px] font-mono uppercase text-slate-300 font-bold mb-1.5"
                >
                  Client Passcode / PIN
                </label>
                <input
                  id="client-login-passcode-input"
                  type="password"
                  required
                  value={loginPasscode}
                  onChange={(e) => setLoginPasscode(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                id="btn-client-portal-authenticate"
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-colors"
              >
                [ 🔐 Authenticate &amp; Access Property Portal ]
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Zero Cross-Site Visibility Enforced</span>
              <span className="font-mono">TLS • PIN Hash Verified</span>
            </div>
          </div>

          {/* Collapsible Bottom Developer Test Credentials Drawer */}
          <div
            id="client-dev-credentials-drawer"
            className="h-auto min-h-0 bg-slate-900/95 text-slate-200 rounded-2xl border border-slate-800 shadow-lg"
          >
            <button
              id="btn-toggle-dev-test-credentials"
              type="button"
              onClick={() => setDevDrawerOpen(!devDrawerOpen)}
              className="w-full px-4 py-3 bg-slate-950 hover:bg-slate-900 rounded-t-2xl flex items-center justify-between text-xs font-mono font-bold text-amber-300 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>[ 🛠️ Dev Test Credentials ]</span>
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span>Click any row to auto-fill</span>
                {devDrawerOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </span>
            </button>

            {devDrawerOpen && (
              <div className="p-3.5 space-y-2 border-t border-slate-800">
                <p className="text-[11px] text-slate-400">
                  Sandbox testing helper: Click a property below to populate its isolated Username &amp; PIN:
                </p>
                <div className="space-y-1.5">
                  {credentials.map((cred) => (
                    <button
                      key={cred.siteId}
                      type="button"
                      onClick={() => {
                        setLoginUsername(cred.clientUsername);
                        setLoginPasscode(cred.clientPasscode);
                        setLoginError(null);
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 text-left flex items-center justify-between gap-2 cursor-pointer transition-all group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate group-hover:text-amber-300">
                          {cred.siteName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Site ID: {cred.siteId}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold">
                          {cred.clientUsername}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-black">
                          PIN: {cred.clientPasscode}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER 2: AUTHENTICATED SINGLE-PROPERTY CLIENT PORTAL WORKSPACE
  // ==========================================================================
  return (
    <div
      id="client-portal-workspace"
      className="flex-1 h-full overflow-y-auto bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 sm:p-5 space-y-4"
    >
      <div className="max-w-6xl mx-auto space-y-4">
        {/* ================================================================= */}
        {/* TOP CLIENT BAR: STATIC LOCKED PROPERTY BADGE & SIGN OUT BUTTON    */}
        {/* ================================================================= */}
        <section
          id="client-portal-header-bar"
          className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-lg space-y-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Hard-Locked Static Property Badge + Sign Out Button (NO dropdown) */}
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-black uppercase tracking-wider">
                  🏢 Authenticated Property Portal
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono">
                  🔒 Locked to Site ID: {selectedSite.id}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div
                  id="client-authenticated-property-badge"
                  className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-emerald-500/40 shadow-xs"
                >
                  <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm sm:text-base font-black text-white">
                    {selectedSite.name}
                  </span>
                  {selectedSite.code && (
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40 font-mono text-[10px] font-bold">
                      {selectedSite.code}
                    </span>
                  )}
                </div>

                {clientSiteConfig.allowOfficerReviews && (
                  <button
                    id="btn-client-submit-officer-feedback"
                    type="button"
                    onClick={() => setShowPmFeedbackModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono text-xs font-black cursor-pointer transition-colors inline-flex items-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>[ ⭐ Submit Officer Feedback / Commendation (3x Weight) ]</span>
                  </button>
                )}

                <button
                  id="btn-client-portal-sign-out"
                  type="button"
                  onClick={handleClientSignOut}
                  className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-rose-950 text-slate-200 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 font-mono text-xs font-black cursor-pointer transition-colors inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>[ 🚪 Sign Out ]</span>
                </button>
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{selectedSite.address}</span>
              </p>
            </div>

            {/* Right: Live Coverage Status Badge & Amenity Lockout Counter */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 shrink-0">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-bold">
                  <span>🟢 {liveCoverageInfo.statusLabel}</span>
                </div>
                <div className="text-xs text-slate-300 font-medium flex items-center gap-2 flex-wrap">
                  <span>
                    On-Duty Officer:{' '}
                    <strong className="text-white">{liveCoverageInfo.officerName}</strong>
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-500/40 font-mono text-[10px] font-bold">
                    {liveCoverageInfo.officerBadge}
                  </span>
                </div>
              </div>

              {clientSiteConfig.showAmenityLockoutFeed && (
                <div className="sm:border-l border-slate-800 sm:pl-3.5 space-y-0.5">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                    Today&apos;s Amenity Lockouts
                  </div>
                  <div className="text-sm font-black text-emerald-400 font-mono flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {completedLockoutsCount}/{lockoutFeedItems.length} Completed
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* MOBILE-FIRST NAVIGATION SUB-TABS                                  */}
          {/* ================================================================= */}
          <div
            id="client-portal-subtabs"
            className="flex overflow-x-auto gap-1.5 pb-2 pt-2 border-t border-slate-800 no-scrollbar"
          >
            <button
              id="client-tab-issues-btn"
              type="button"
              onClick={() => setActiveSubTab('ISSUES')}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs font-black whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeSubTab === 'ISSUES'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              [ ⚠️ Issues &amp; Chronic Watch ({openUnresolvedCount}) ]
            </button>

            <button
              id="client-tab-intel-btn"
              type="button"
              onClick={() => setActiveSubTab('SITE_INTEL')}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs font-black whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeSubTab === 'SITE_INTEL'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              [ 📋 Vacant Units &amp; Site Intel ]
            </button>

            {clientSiteConfig.allowSpecialWatchDirectives && (
              <button
                id="client-tab-directives-btn"
                type="button"
                onClick={() => setActiveSubTab('DIRECTIVES')}
                className={`px-3.5 py-2 rounded-xl font-mono text-xs font-black whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  activeSubTab === 'DIRECTIVES'
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                    : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                [ 🎯 Special Watch Directives ({siteDirectives.length}) ]
              </button>
            )}

            <button
              id="client-tab-patrol-feed-btn"
              type="button"
              onClick={() => setActiveSubTab('PATROL_FEED')}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs font-black whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeSubTab === 'PATROL_FEED'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              [ 🛡️ Patrol &amp; Lockout Feed ]
            </button>
          </div>
        </section>

        {/* ================================================================= */}
        {/* TAB 1: PERSISTENT SITE ISSUES & CLOSED-LOOP VERIFICATION          */}
        {/* ================================================================= */}
        {activeSubTab === 'ISSUES' && (
          <section id="client-tab-issues-panel" className="space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIssueStatusFilter('ACTIVE_UNRESOLVED')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                    issueStatusFilter === 'ACTIVE_UNRESOLVED'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  [ Active / Unresolved ({openUnresolvedCount}) ]
                </button>

                <button
                  type="button"
                  onClick={() => setIssueStatusFilter('PENDING_VERIFICATION')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                    issueStatusFilter === 'PENDING_VERIFICATION'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  [ Pending Guard Verification ({pendingVerificationCount}) ]
                </button>

                <button
                  type="button"
                  onClick={() => setIssueStatusFilter('RESOLVED')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                    issueStatusFilter === 'RESOLVED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  [ Resolved History ({resolvedHistoryCount}) ]
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 mr-1">
                  Category:
                </span>
                {(
                  [
                    { key: 'ALL', label: 'All' },
                    { key: 'MAINTENANCE', label: 'Maintenance' },
                    { key: 'SAFETY', label: 'Safety' },
                    { key: 'CHRONIC_LEASE_NOISE', label: 'Chronic Lease / Noise' },
                    { key: 'PARKING', label: 'Parking' }
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setIssueCategoryFilter(cat.key)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      issueCategoryFilter === cat.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {exportFeedbackBanner && (
              <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 rounded-xl p-3 text-xs flex items-center justify-between gap-2">
                <span>{exportFeedbackBanner}</span>
                <button
                  type="button"
                  onClick={() => setExportFeedbackBanner(null)}
                  className="text-emerald-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {filteredSiteIssues.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-300 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-white">
                  No property issues in this filter view for {selectedSite.name}.
                </p>
                <p className="text-xs text-slate-400">
                  Switch between Active / Unresolved, Pending Guard Verification, or Resolved History above.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSiteIssues.map((issue) => {
                  const isTimelineOpen = Boolean(expandedTimelineIds[issue.id]);
                  const isAddressingThis = addressingIssueId === issue.id;
                  const isLeaseOrNoiseOrParking =
                    issue.category === 'CHRONIC_LEASE_VIOLATION' ||
                    issue.category === 'NOISE_COMPLAINT' ||
                    issue.category === 'PARKING_VIOLATION' ||
                    issue.category === 'UNAUTHORIZED_OCCUPANT' ||
                    issue.category === 'TRASH_DUMPING';

                  return (
                    <div
                      key={issue.id}
                      className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-3.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                            #{issue.id}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black uppercase ${
                              issue.priority === 'URGENT'
                                ? 'bg-rose-600 text-white'
                                : issue.priority === 'HIGH'
                                ? 'bg-amber-500 text-slate-950'
                                : issue.priority === 'MEDIUM'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-200'
                            }`}
                          >
                            {issue.priority}
                          </span>

                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs font-bold">
                            {CATEGORY_LABELS[issue.category]}
                          </span>

                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs">
                            {issue.unitOrLocation}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-amber-300 font-mono font-black text-xs">
                            Repeat x{issue.recurrenceCount}
                          </span>

                          {issue.status === 'PENDING_VERIFICATION' && (
                            <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-cyan-400/50 text-cyan-200 font-mono font-black text-xs flex items-center gap-1.5">
                              ⏳ Awaiting On-Duty Guard Physical Verification &amp; Photo
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm sm:text-base font-black text-white">
                          {issue.title}
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {issue.description}
                        </p>
                        {issue.vehicleDetails && (
                          <p className="text-xs font-mono text-cyan-300 pt-0.5">
                            Vehicle: {issue.vehicleDetails}
                          </p>
                        )}
                      </div>

                      {issue.clientContactLog && (
                        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                          <div className="font-mono font-bold text-amber-300 flex items-center justify-between">
                            <span>
                              PM / Maintenance Resolution Log ({issue.clientContactLog.contactName})
                            </span>
                            {issue.clientContactLog.externalTicketRef && (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px]">
                                {issue.clientContactLog.externalTicketRef}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300">{issue.clientContactLog.notes}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                          {clientSiteConfig.allowClientIssueVerification &&
                            (issue.status === 'OPEN' || issue.status === 'CLIENT_NOTIFIED') && (
                              <button
                                type="button"
                                onClick={() => handleOpenMarkAddressed(issue)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs shadow-sm cursor-pointer transition-colors"
                              >
                                [ ✓ Mark Addressed — Request Guard Verification ]
                              </button>
                            )}

                          {isLeaseOrNoiseOrParking && (
                            <button
                              type="button"
                              onClick={() => handleExportViolationPacket(issue)}
                              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-mono font-bold text-xs cursor-pointer transition-colors"
                            >
                              [ 📄 Export Violation Packet ]
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleTimeline(issue.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-blue-300 border border-slate-800 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            Cross-Shift Incident Timeline ({issue.linkedDarLogs.length} Sightings)
                          </span>
                          {isTimelineOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {isAddressingThis && (
                        <form
                          onSubmit={(e) => handleSubmitMarkAddressed(e, issue)}
                          className="bg-slate-950 border border-emerald-500/50 rounded-xl p-4 space-y-3 animate-in fade-in duration-150"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono uppercase font-black text-emerald-400">
                              Request On-Duty Guard Physical Verification &amp; Photo
                            </span>
                            <button
                              type="button"
                              onClick={() => setAddressingIssueId(null)}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                                PM / Maintenance Contact Name
                              </label>
                              <input
                                type="text"
                                required
                                value={pmContactInput}
                                onChange={(e) => setPmContactInput(e.target.value)}
                                placeholder="PM Sarah Jenkins"
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                                Work Order # or Resolution Note
                              </label>
                              <input
                                type="text"
                                required
                                value={workOrderNoteInput}
                                onChange={(e) => setWorkOrderNoteInput(e.target.value)}
                                placeholder="WO #8841 - Maglock replaced by maintenance at 14:30, please test tonight"
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setAddressingIssueId(null)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs cursor-pointer"
                            >
                              [ Submit &amp; Dispatch Guard Verification ]
                            </button>
                          </div>
                        </form>
                      )}

                      {isTimelineOpen && (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                          <div className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                            Chronological Cross-Shift Officer Sightings &amp; Audit History
                          </div>
                          <div className="space-y-2">
                            {issue.linkedDarLogs.map((log, idx) => (
                              <div
                                key={log.darId}
                                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-amber-300">
                                    Sighting #{idx + 1} • {new Date(log.timestamp).toLocaleString()}
                                  </span>
                                  <span className="font-mono text-[11px] text-blue-300">
                                    {log.guardName} ({log.badgeNumber}) • {log.shiftName || 'Patrol Shift'}
                                  </span>
                                </div>
                                <p className="text-slate-200">&ldquo;{log.notes}&rdquo;</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================================================================= */}
        {/* TAB 2: SELF-SERVICE PROPERTY INTEL & VACANT UNIT VAULT            */}
        {/* ================================================================= */}
        {activeSubTab === 'SITE_INTEL' && (
          <section id="client-tab-intel-panel" className="space-y-5">
            {/* 1. Vacant Units List Manager + Bulk Import CSV / PDF */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Home className="w-4 h-4 text-amber-400" />
                    <span>Vacant Units List Manager ({vacantUnits.length} Units)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live vacant unit &amp; lockbox checklist synced directly to the on-duty Guard Site Intel Vault for {selectedSite.name}.
                  </p>
                </div>

                {/* Action Cluster: Bulk Import CSV/PDF + Manual Add Unit */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {clientSiteConfig.allowVacantUnitBulkUpload && (
                    <button
                      id="btn-bulk-import-vacant-units"
                      type="button"
                      onClick={() => setShowBulkImportModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-xs cursor-pointer transition-colors shadow-xs"
                    >
                      [ 📤 Bulk Import CSV / PDF ]
                    </button>
                  )}

                  <button
                    id="btn-manual-add-vacant-unit"
                    type="button"
                    onClick={() => setShowVacantForm(!showVacantForm)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-black text-xs cursor-pointer transition-colors"
                  >
                    [ + Add Unit ]
                  </button>
                </div>
              </div>

              {showVacantForm && (
                <form
                  onSubmit={handleSaveVacantUnit}
                  className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                        Unit #
                      </label>
                      <input
                        type="text"
                        required
                        value={vacantUnitNum}
                        onChange={(e) => setVacantUnitNum(e.target.value)}
                        placeholder="e.g., Unit 208B"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                        Readiness Status
                      </label>
                      <select
                        value={vacantStatus}
                        onChange={(e) =>
                          setVacantStatus(e.target.value as ParsedVacantUnit['status'])
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        <option value="Vacant-Ready">Vacant-Ready</option>
                        <option value="Under Renovation">Under Renovation</option>
                        <option value="Notice Given">Notice Given</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                        Lockbox Code
                      </label>
                      <input
                        type="text"
                        value={vacantLockbox}
                        onChange={(e) => setVacantLockbox(e.target.value)}
                        placeholder="e.g., Lockbox #5512"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                        Access / Patrol Note
                      </label>
                      <input
                        type="text"
                        value={vacantNote}
                        onChange={(e) => setVacantNote(e.target.value)}
                        placeholder="Verify deadbolt & slider after 18:00"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowVacantForm(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-black text-xs cursor-pointer"
                    >
                      Save &amp; Sync to Guard Terminal
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400">
                      <th className="py-2.5 px-3">Unit #</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Lockbox / Access Note</th>
                      <th className="py-2.5 px-3">Last Updated</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {vacantUnits.map((unit, idx) => (
                      <tr
                        key={`${unit.unitNumber}-${idx}`}
                        className={`hover:bg-slate-900/50 ${
                          unit.isNewlyAdded ? 'bg-emerald-950/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-black text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{unit.unitNumber}</span>
                            {unit.isNewlyAdded && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-[10px] font-black">
                                🟢 NEW (24h)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              unit.status === 'Vacant-Ready'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                : unit.status === 'Under Renovation'
                                ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                                : 'bg-blue-950 text-blue-300 border-blue-500/40'
                            }`}
                          >
                            {unit.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-amber-300 mr-2">
                            [{unit.lockboxCode}]
                          </span>
                          <span className="text-slate-300">{unit.accessNote}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(unit.lastUpdated).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRemoveVacantUnit(unit.unitNumber)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-slate-700 font-mono text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            [ Remove / Mark Leased ]
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Gate Codes & Amenity Access PINs */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span>Gate Codes &amp; Amenity Access PINs</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Update access PINs for Pedestrian Gates, Vehicle Gates, Clubhouse/Roof Lounges, and Maintenance Rooms.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {gateCodeCards.map((card) => {
                  const isEditing = editingGateId === card.id;
                  return (
                    <div
                      key={card.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono uppercase font-black text-emerald-400">
                            {card.categoryLabel}
                          </span>
                          <h4 className="text-xs font-bold text-white">{card.accessPoint}</h4>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono font-black text-xs">
                          {card.pinCode}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
                                Access PIN / Code
                              </label>
                              <input
                                type="text"
                                value={editGatePin}
                                onChange={(e) => setEditGatePin(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
                                Patrol Instructions
                              </label>
                              <input
                                type="text"
                                value={editGateInstructions}
                                onChange={(e) => setEditGateInstructions(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingGateId(null)}
                              className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveGateCard(card)}
                              className="px-3 py-1 rounded bg-emerald-600 text-white font-mono font-bold text-xs cursor-pointer"
                            >
                              Save PIN
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <p className="text-[11px] text-slate-400 truncate">
                            {card.instructions}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleStartEditGate(card)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 font-mono text-[10px] font-bold shrink-0 cursor-pointer"
                          >
                            [ Edit PIN ]
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Temporary Parking & Contractor Exemptions */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-cyan-400" />
                    <span>
                      Temporary Parking &amp; Contractor Exemptions ({parkingExemptions.length})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Register authorized overnight guest vehicles or contractor trailers so patrol officers do not ticket or tow them.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowParkingForm(!showParkingForm)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-black text-xs cursor-pointer transition-colors self-start sm:self-auto"
                >
                  [ + Add Parking / Tow Exemption ]
                </button>
              </div>

              {showParkingForm && (
                <form
                  onSubmit={handleAddParkingExemption}
                  className="bg-slate-950 border border-cyan-500/40 rounded-xl p-4 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                        Make / Model
                      </label>
                      <input
                        type="text"
                        required
                        value={vehMakeModel}
                        onChange={(e) => setVehMakeModel(e.target.value)}
                        placeholder="White Ford F-250 / Trailer"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                        License Plate
                      </label>
                      <input
                        type="text"
                        required
                        value={vehPlate}
                        onChange={(e) => setVehPlate(e.target.value)}
                        placeholder="WA-419-TZN"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                        Unit # / Vendor
                      </label>
                      <input
                        type="text"
                        required
                        value={vehUnitVendor}
                        onChange={(e) => setVehUnitVendor(e.target.value)}
                        placeholder="Unit 402 Guest / HVAC Crew"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                        Expiration Date
                      </label>
                      <input
                        type="date"
                        required
                        value={vehExpiration}
                        onChange={(e) => setVehExpiration(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowParkingForm(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-black text-xs cursor-pointer"
                    >
                      Register Do-Not-Tow Exemption
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {parkingExemptions.map((item) => {
                  const isResidentGuestPass =
                    item.status.includes('AUTHORIZED GUEST PASS') ||
                    item.unitOrVendor.toLowerCase().includes('guest');
                  return (
                    <div
                      key={item.permitId}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                        isResidentGuestPass
                          ? 'bg-emerald-950/25 border-emerald-500/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-black text-xs">
                            {item.licensePlate}
                          </span>
                          <span className="font-bold text-xs text-white">
                            {item.makeModel}
                          </span>
                          {isResidentGuestPass && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-black">
                              {item.status.includes('🟢')
                                ? item.status
                                : `🟢 AUTHORIZED GUEST PASS (${item.unitOrVendor})`}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.unitOrVendor} • <span className="text-emerald-300 font-mono">{item.expirationDate}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveParkingExemption(item.permitId, item.licensePlate)
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 font-mono text-[10px] font-bold shrink-0 cursor-pointer"
                      >
                        [ Remove ]
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* TAB 3: SPECIAL WATCH & PASS-DOWN REQUESTS                         */}
        {/* ================================================================= */}
        {activeSubTab === 'DIRECTIVES' && (
          <section id="client-tab-directives-panel" className="space-y-5">
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-rose-400" />
                  <span>[ + Post Special Watch / Pass-Down Directive ]</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Publish time-boxed instructions directly to {selectedSite.name}&apos;s Guard Terminal 48-Hour Site Pass-Down drawer and Command CAD Priority Feed.
                </p>
              </div>

              <form onSubmit={handlePostSpecialDirective} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                      Target Area / Unit #
                    </label>
                    <input
                      type="text"
                      required
                      value={targetAreaInput}
                      onChange={(e) => setTargetAreaInput(e.target.value)}
                      placeholder="e.g., Unit 304 / Loading Dock"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                      Priority Level
                    </label>
                    <select
                      value={directivePriority}
                      onChange={(e) =>
                        setDirectivePriority(e.target.value as 'Standard' | 'High Alert')
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Standard">Standard</option>
                      <option value="High Alert">High Alert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                      Directive Expiration
                    </label>
                    <select
                      value={directiveExpiration}
                      onChange={(e) =>
                        setDirectiveExpiration(
                          e.target.value as '24 Hours' | '48 Hours' | '7 Days'
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="24 Hours">24 Hours</option>
                      <option value="48 Hours">48 Hours</option>
                      <option value="7 Days">7 Days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                    Directive Instructions for On-Duty Patrol Officers
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={directiveInstructions}
                    onChange={(e) => setDirectiveInstructions(e.target.value)}
                    placeholder="e.g., Unit 304 tenant moving out; monitor loading dock for propping and unauthorized bulk item dumping."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-xs shadow-md cursor-pointer transition-colors"
                  >
                    [ + Post Special Watch / Pass-Down Directive ]
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 font-bold px-1">
                Active Property Directives &amp; Officer Acknowledgments ({siteDirectives.length})
              </div>

              {siteDirectives.map((dir) => (
                <div
                  key={dir.id}
                  className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                        #{dir.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-black uppercase ${
                          dir.priority === 'High Alert'
                            ? 'bg-rose-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {dir.priority}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs">
                        {dir.targetArea}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        • Expires in {dir.expirationWindow}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleArchiveDirective(dir.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 font-mono text-[10px] font-bold cursor-pointer self-start sm:self-auto"
                    >
                      [ End Watch ]
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {dir.instructions}
                  </p>

                  <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                        Guard Pass-Down Receipts:
                      </span>
                      {dir.acknowledgments.length === 0 ? (
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-mono text-[10px]">
                          Pushed to On-Duty Guard Terminal — Pending Officer Read Receipt
                        </span>
                      ) : (
                        dir.acknowledgments.map((ack) => (
                          <span
                            key={`${ack.guardId}-${ack.acknowledgedAt}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>
                              Acknowledged by {ack.guardName} ({ack.badgeNumber})
                            </span>
                          </span>
                        ))
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-slate-400">
                      Posted by {dir.postedBy} • {new Date(dir.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* TAB 4: SANITIZED PATROL, LOCKOUT & DAR FEED                       */}
        {/* ================================================================= */}
        {activeSubTab === 'PATROL_FEED' && (
          <section id="client-tab-patrol-feed-panel" className="space-y-5">
            {clientSiteConfig.showAmenityLockoutFeed && (
              <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>Time-Specific Amenity Lockouts &amp; Curfews</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Scheduled nightly facility closures, pool/terrace lockups, and perimeter security checks at {selectedSite.name}.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-black">
                    {completedLockoutsCount}/{lockoutFeedItems.length} Completed Today
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lockoutFeedItems.map((item) => (
                    <div
                      key={item.task.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40 font-mono font-black text-xs">
                          Scheduled {item.task.scheduledTime}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-black uppercase border ${
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-black text-white">
                          {item.task.locationZone} — {item.task.title}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.notes}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                        <span>
                          Officer Badge: <strong className="text-blue-300">{item.guardBadge}</strong>
                        </span>
                        {item.completedAt && (
                          <span className="text-emerald-400">
                            Verified at{' '}
                            {new Date(item.completedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>Verified Patrol Check-Ins &amp; Daily Activity Reports (DAR)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Chronological executive feed of verified patrol sweeps, activity logs, and incident summaries for {selectedSite.name}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPmFeedbackModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Star className="w-4 h-4 fill-slate-950" />
                  <span>[ ⭐ Submit Officer Feedback / Commendation (3x Weight) ]</span>
                </button>
              </div>

              <div className="space-y-3">
                {sanitizedPatrolFeed.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-black uppercase border ${entry.badgeColor}`}
                        >
                          {entry.typeLabel}
                        </span>
                        <span className="font-bold text-xs text-white">
                          {entry.location}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          • {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {entry.summary}
                      </p>

                      <div className="text-[11px] font-mono text-slate-400">
                        Verified by <strong className="text-slate-200">{entry.officerName}</strong> (Badge #{entry.officerBadge})
                      </div>
                    </div>

                    {entry.photoUrl && (
                      <div className="w-full sm:w-28 h-20 rounded-lg overflow-hidden border border-slate-800 shrink-0 bg-slate-900">
                        <img
                          src={entry.photoUrl}
                          alt={entry.location}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* =================================================================== */}
      {/* BULK VACANT UNIT SYNC MODAL (CSV / PDF / YARDI / APPFOLIO DIFF)     */}
      {/* =================================================================== */}
      {showBulkImportModal && (
        <div
          id="bulk-vacant-unit-sync-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
          onClick={() => setShowBulkImportModal(false)}
        >
          <div
            id="bulk-vacant-unit-sync-modal"
            className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-black text-white">
                      Bulk Vacant Unit Sync Modal — {selectedSite.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40 font-mono text-[10px] font-bold">
                      CSV • PDF • Yardi / AppFolio / RealPage
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Upload a <code className="text-slate-200">.csv</code>, <code className="text-slate-200">.pdf</code>, or <code className="text-slate-200">.txt</code> vacancy report or paste spreadsheet rows to preview the Smart Turnover Diff before syncing.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* File Dropzone & Quick Sample Loaders */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Dropzone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleBulkFileUpload(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="lg:col-span-5 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-4 bg-slate-950/80 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    id="bulk-vacant-file-input"
                    type="file"
                    accept=".csv,.pdf,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBulkFileUpload(file);
                    }}
                  />
                  <div className="p-3 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-black text-white">
                    Drop <span className="text-blue-400">.CSV</span>,{' '}
                    <span className="text-amber-300">.PDF</span>, or{' '}
                    <span className="text-emerald-300">.TXT</span> Vacancy File Here
                  </div>
                  <p className="text-[11px] text-slate-400">
                    or click to browse local property management exports
                  </p>
                  {uploadedFileName && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                      Loaded: {uploadedFileName} ({uploadedFileType.toUpperCase()})
                    </span>
                  )}

                  {/* Quick Test Sample Loaders */}
                  <div
                    className="flex flex-wrap items-center justify-center gap-1.5 pt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      id="btn-load-sample-yardi-csv"
                      type="button"
                      onClick={handleLoadSampleYardiCsv}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 font-mono text-[10px] font-bold cursor-pointer"
                    >
                      [ Load Sample Yardi CSV ]
                    </button>
                    <button
                      id="btn-load-sample-appfolio-pdf"
                      type="button"
                      onClick={handleLoadSampleAppFolioPdfBuffer}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-mono text-[10px] font-bold cursor-pointer"
                    >
                      [ Load Sample AppFolio PDF ]
                    </button>
                  </div>
                </div>

                {/* Raw Text Paste Box */}
                <div className="lg:col-span-7 flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="bulk-vacant-paste-textarea"
                      className="text-[11px] font-mono uppercase text-slate-300 font-bold"
                    >
                      Raw Spreadsheet / PDF Text Buffer (Yardi, AppFolio, RealPage)
                    </label>
                    {bulkRawInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setBulkRawInput('');
                          setUploadedFileName(null);
                        }}
                        className="text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer"
                      >
                        [ Clear Buffer ]
                      </button>
                    )}
                  </div>
                  <textarea
                    id="bulk-vacant-paste-textarea"
                    rows={6}
                    value={bulkRawInput}
                    onChange={(e) => setBulkRawInput(e.target.value)}
                    placeholder={`Paste CSV rows or PDF text directly here...\nExample:\nUnit 512, North Tower, Lockbox #8821, Vacant-Ready, Verify balcony slider\nUnit 609B, South Wing, Lockbox #9042, Under Renovation, Contractor lockbox`}
                    className="w-full flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 3-Column Smart Diff Engine Summary Preview */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono uppercase font-black text-white">
                      Smart Diff Engine &amp; Turnover Preview (Before Saving)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Comparing {parsedIncomingUnits.length} parsed upload units against {vacantUnits.length} current property vacant units
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Column 1: Newly Vacant / Added */}
                  <div className="rounded-xl bg-slate-950 border border-emerald-500/40 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-emerald-300">
                        🟢 Newly Vacant / Added ({smartDiffPreview.added.length})
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold">
                        Flagged NEW (24h)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Units in new upload not on previous list. Guards alerted to inspect locks &amp; windows tonight.
                    </p>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {smartDiffPreview.added.length === 0 ? (
                        <div className="text-[11px] font-mono text-slate-500 py-3 text-center">
                          No newly vacant units detected
                        </div>
                      ) : (
                        smartDiffPreview.added.map((u) => (
                          <div
                            key={u.unitNumber}
                            className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-0.5"
                          >
                            <div className="flex items-center justify-between font-bold text-white">
                              <span>{u.unitNumber}</span>
                              <span className="text-[10px] font-mono text-emerald-300">
                                {u.status}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-300 truncate">
                              {u.lockboxCode} • {u.accessNote}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Column 2: Leased / Removed */}
                  <div className="rounded-xl bg-slate-950 border border-rose-500/40 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-rose-300">
                        🔴 Leased / Removed ({smartDiffPreview.removed.length})
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 font-mono text-[10px] font-bold">
                        Occupied
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Units on previous vacant list no longer in upload (leased/occupied; removed from patrol check).
                    </p>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {smartDiffPreview.removed.length === 0 ? (
                        <div className="text-[11px] font-mono text-slate-500 py-3 text-center">
                          No leased/removed units
                        </div>
                      ) : (
                        smartDiffPreview.removed.map((u) => (
                          <div
                            key={u.unitNumber}
                            className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/30 text-xs space-y-0.5"
                          >
                            <div className="flex items-center justify-between font-bold text-rose-200 line-through">
                              <span>{u.unitNumber}</span>
                              <span className="text-[10px] font-mono text-rose-300">
                                Leased
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">
                              Was: {u.status} ({u.lockboxCode})
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Column 3: Unchanged / Updated */}
                  <div className="rounded-xl bg-slate-950 border border-blue-500/40 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-blue-300">
                        🔵 Unchanged / Updated ({smartDiffPreview.unchanged.length})
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40 font-mono text-[10px] font-bold">
                        Retained
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Existing vacant units that remain vacant (updating any modified lockbox or status notes).
                    </p>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {smartDiffPreview.unchanged.length === 0 ? (
                        <div className="text-[11px] font-mono text-slate-500 py-3 text-center">
                          No matching existing units
                        </div>
                      ) : (
                        smartDiffPreview.unchanged.map((u) => (
                          <div
                            key={u.unitNumber}
                            className="p-2 rounded-lg bg-blue-950/30 border border-blue-500/30 text-xs space-y-0.5"
                          >
                            <div className="flex items-center justify-between font-bold text-white">
                              <span>{u.unitNumber}</span>
                              <span className="text-[10px] font-mono text-blue-300">
                                {u.status}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-300 truncate">
                              {u.lockboxCode} • {u.accessNote}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer: Commit Mode Controls */}
            <div className="px-5 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  id="btn-apply-smart-sync"
                  type="button"
                  disabled={parsedIncomingUnits.length === 0}
                  onClick={handleApplySmartSync}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-mono text-xs font-black cursor-pointer transition-colors shadow-md"
                >
                  [ ⚡ Apply Smart Sync (+{smartDiffPreview.added.length} Added, -{smartDiffPreview.removed.length} Removed) ]
                </button>

                <button
                  id="btn-apply-full-overwrite"
                  type="button"
                  disabled={parsedIncomingUnits.length === 0}
                  onClick={handleApplyFullOverwrite}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-mono text-xs font-black cursor-pointer transition-colors"
                >
                  [ 🔄 Full Overwrite / Replace List ]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: PROPERTY MANAGER OFFICER FEEDBACK / COMMENDATION (3x WEIGHT) */}
      {/* ================================================================= */}
      {showPmFeedbackModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl text-white">
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Submit Officer Feedback / Commendation (3x Weight)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedSite.name} • Auto-tagged as PROPERTY_MANAGER (3x ASR Weight)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPmFeedbackModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPmReview} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Select Assigned Officer ({selectedSite.name})
                </label>
                <select
                  value={pmSelectedGuardId}
                  onChange={(e) => setPmSelectedGuardId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
                >
                  {siteAssignedGuards.map((g) => (
                    <option key={g.id} value={g.id}>
                      Officer {g.name} ({g.badgeNumber}) — {g.status || 'Active Security Officer'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Star Rating (1 to 5 Stars • 3x Executive Weight)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setPmRating(star)}
                      className={`flex-1 py-2.5 rounded-xl border font-black text-sm flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        star <= pmRating
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span>{star}</span>
                      <Star
                        className={`w-4 h-4 ${
                          star <= pmRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Commendation &amp; Performance Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Above & Beyond',
                    'Rapid Response',
                    'De-Escalation',
                    'Detailed DAR Logs',
                    'Amenity Lockup Excellence',
                    'Needs Coaching'
                  ].map((tag) => {
                    const active = pmSelectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setPmSelectedTags((prev) =>
                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-indigo-500/25 border-indigo-400 text-indigo-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Property Manager Review / Commendation *
                </label>
                <textarea
                  rows={3}
                  value={pmComment}
                  onChange={(e) => setPmComment(e.target.value)}
                  placeholder="Write your official Property Manager commendation or performance evaluation..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                Tagged with <strong className="text-amber-300">role: &apos;PROPERTY_MANAGER&apos;</strong>,{' '}
                <strong className="text-amber-300">weight: 3</strong>, and{' '}
                <strong className="text-indigo-300">status: &apos;PENDING_MODERATION&apos;</strong> for Command CAD verification.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPmFeedbackModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Submit PM Review (3x Weight)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortal;
