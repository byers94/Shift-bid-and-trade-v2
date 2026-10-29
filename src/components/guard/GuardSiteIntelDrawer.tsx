import React, { useState, useEffect, useMemo } from 'react';
import {
  SiteDocument,
  SiteDocType,
  loadSiteDocumentsForSite,
  subscribeToSiteDocumentUpdates,
} from '../../types/resources';
import { SiteProfile } from '../../types/shift';
import { useShiftOps } from '../../context/ShiftOpsContext';
import {
  Home,
  Car,
  Key,
  ClipboardList,
  Search,
  X,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Building2,
  Clock,
  FileText,
} from 'lucide-react';
import { useResidentGuestPassesStore } from '../resident/ResidentPortal';

export interface GuardSiteIntelDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  site?: SiteProfile | { id: string; name: string; code?: string; address?: string } | null;
  siteName?: string;
}

type IntelTab = 'VACANT_UNITS' | 'PARKING_ROSTER' | 'GATE_CODES' | 'ALL_DOCS';

export const GuardSiteIntelDrawer: React.FC<GuardSiteIntelDrawerProps> = ({
  isOpen = true,
  onClose,
  site,
  siteName: propSiteName,
}) => {
  const { sitesList, activeClockedInShift, activeGuard, addAuditLog, showToast } =
    useShiftOps();
  useResidentGuestPassesStore();

  const resolvedSite = useMemo(() => {
    if (site) return site;
    const targetName =
      propSiteName ||
      activeClockedInShift?.siteName ||
      activeGuard.ojtSites[0] ||
      sitesList[0]?.name ||
      'Skyline Tower & Plaza';
    return (
      sitesList.find((s) => s.name === targetName || s.id === targetName) || {
        id: 'site-1',
        name: targetName,
        code: 'SKY-01',
        address: '400 Pine St, Downtown Metro',
      }
    );
  }, [site, propSiteName, activeClockedInShift, activeGuard, sitesList]);

  const [activeTab, setActiveTab] = useState<IntelTab>('VACANT_UNITS');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [inspectedUnits, setInspectedUnits] = useState<Record<string, string>>({});
  const [siteDocs, setSiteDocs] = useState<SiteDocument[]>(() =>
    loadSiteDocumentsForSite(resolvedSite.id, resolvedSite.name)
  );

  useEffect(() => {
    setSiteDocs(loadSiteDocumentsForSite(resolvedSite.id, resolvedSite.name));
    return subscribeToSiteDocumentUpdates(() => {
      setSiteDocs(loadSiteDocumentsForSite(resolvedSite.id, resolvedSite.name));
    });
  }, [resolvedSite.id, resolvedSite.name]);

  if (!isOpen) return null;

  const parsePipeRows = (docs: SiteDocument[]) => {
    const rows: {
      docTitle: string;
      updatedAt: string;
      updatedBy: string;
      cols: string[];
    }[] = [];

    docs.forEach((doc) => {
      const lines = (doc.contentSnippet || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      lines.forEach((line) => {
        const cols = line.split('|').map((c) => c.trim());
        rows.push({
          docTitle: doc.title,
          updatedAt: doc.updatedAt,
          updatedBy: doc.updatedBy,
          cols,
        });
      });
    });

    return rows;
  };

  const vacantDocs = siteDocs.filter((d) => d.docType === 'VACANT_UNITS');
  const parkingDocs = siteDocs.filter((d) => d.docType === 'PARKING_ROSTER');
  const gateDocs = siteDocs.filter((d) => d.docType === 'GATE_CODES');

  const isNewlyVacantRow = (r: { cols: string[] }) =>
    (r.cols[5] || '').toUpperCase().includes('NEW') ||
    (r.cols[3] || '').toUpperCase().includes('NEW') ||
    (r.cols[4] || '').includes('NEW (24h)');

  const vacantRows = parsePipeRows(vacantDocs)
    .filter((r) => {
      const q = searchQuery.trim().toLowerCase();
      return !q || r.cols.some((c) => c.toLowerCase().includes(q));
    })
    .sort((a, b) => (isNewlyVacantRow(b) ? 1 : 0) - (isNewlyVacantRow(a) ? 1 : 0));

  const parkingRows = parsePipeRows(parkingDocs).filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    return !q || r.cols.some((c) => c.toLowerCase().includes(q));
  });

  const gateRows = parsePipeRows(gateDocs).filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    return !q || r.cols.some((c) => c.toLowerCase().includes(q));
  });

  const handleCopyPin = (pin: string) => {
    try {
      navigator.clipboard?.writeText(pin);
    } catch {}
    setCopiedCode(pin);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handleMarkUnitInspected = (unitLabel: string) => {
    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    setInspectedUnits((prev) => ({ ...prev, [unitLabel]: nowTime }));

    addAuditLog(
      'VACANT_UNIT_INSPECTED',
      'system',
      `Guard ${activeGuard.name} (${activeGuard.badgeNumber}) verified lockbox & door security for ${unitLabel} at ${resolvedSite.name}`,
      `${activeGuard.name} (${activeGuard.badgeNumber})`,
      'info'
    );

    showToast(
      'Vacant Unit Checked',
      `${unitLabel} verified secure at ${nowTime}.`,
      'success'
    );
  };

  return (
    <div
      id="guard-site-intel-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={() => onClose && onClose()}
    >
      <div
        id="guard-site-intel-drawer"
        className="w-full sm:max-w-2xl bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Pull Handle & Header */}
        <div className="px-4 pt-3 pb-3 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-2.5 sm:hidden" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shrink-0">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                    LIVE SITE INTEL VAULT
                  </span>
                  {resolvedSite.code && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-500/40">
                      {resolvedSite.code}
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-black text-white truncate">
                  {resolvedSite.name} — Operational Sheets
                </h2>
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer shrink-0"
                aria-label="Close Site Intel Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search & Tab Navigation Bar */}
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="guard-site-intel-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search unit #, lockbox, license plate, or gate code..."
                className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('VACANT_UNITS')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'VACANT_UNITS'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <Home className="w-3 h-3 shrink-0" />
                <span className="truncate">Vacant ({vacantRows.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('PARKING_ROSTER')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'PARKING_ROSTER'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <Car className="w-3 h-3 shrink-0" />
                <span className="truncate">Parking ({parkingRows.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('GATE_CODES')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'GATE_CODES'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <Key className="w-3 h-3 shrink-0" />
                <span className="truncate">Codes ({gateRows.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ALL_DOCS')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'ALL_DOCS'
                    ? 'bg-blue-600 text-white font-black shadow-xs'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <FileText className="w-3 h-3 shrink-0" />
                <span className="truncate">All ({siteDocs.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {/* 1. VACANT UNITS LIST */}
          {activeTab === 'VACANT_UNITS' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5" />
                  Vacant Units List &amp; Lockbox Verification
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {Object.keys(inspectedUnits).length}/{vacantRows.length} Checked
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400">
                      <th className="py-2.5 px-3">Unit / Zone</th>
                      <th className="py-2.5 px-2.5">Lockbox</th>
                      <th className="py-2.5 px-2.5">Readiness Status</th>
                      <th className="py-2.5 px-3">Patrol Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {vacantRows.map((row, idx) => {
                      const unit = row.cols[0] || `Unit #${idx + 1}`;
                      const bldg = row.cols[1] || 'Main Bldg';
                      const lockbox = row.cols[2] || 'N/A';
                      const status = row.cols[3] || 'VACANT_READY';
                      const note = row.cols[4] || '';
                      const isNewlyAdded = isNewlyVacantRow(row);
                      const checkedAt = inspectedUnits[unit];

                      return (
                        <tr
                          key={`${unit}-${idx}`}
                          className={`hover:bg-slate-900/50 ${
                            isNewlyAdded ? 'bg-emerald-950/25' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-white">{unit}</span>
                              {isNewlyAdded && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-[10px] font-black">
                                  🟢 NEWLY VACANT • NEW (24h)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">{bldg}</div>
                            {note && (
                              <div className="text-[10px] text-slate-300 mt-0.5 italic">
                                {note}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/40 text-amber-300 font-mono font-bold text-[11px]">
                              {lockbox}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                status.toUpperCase().includes('READY') ||
                                status.toUpperCase().includes('LOCKED')
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                  : 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {checkedAt ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Checked {checkedAt}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleMarkUnitInspected(unit)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-emerald-300 border border-slate-700 text-[10px] font-mono font-bold cursor-pointer transition-colors"
                              >
                                [ ✓ Check Door ]
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. PARKING ROSTERS */}
          {activeTab === 'PARKING_ROSTER' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />
                  Authorized Vehicles &amp; Tow-Away Exceptions
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {parkingRows.length} Active Permits
                </span>
              </div>

              <div className="space-y-2">
                {parkingRows.map((row, idx) => {
                  const permit = row.cols[0] || `PRM-${idx + 1}`;
                  const stall = row.cols[1] || 'General Lot';
                  const vehicle = row.cols[2] || 'Authorized Vehicle';
                  const plate = row.cols[3] || 'PLATE-TBD';
                  const status = row.cols[4] || 'DO_NOT_TOW';
                  const notes = row.cols[5] || '';
                  const isGuestPass = status.includes('AUTHORIZED GUEST PASS') || stall.toLowerCase().includes('guest');

                  return (
                    <div
                      key={`${permit}-${idx}`}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isGuestPass
                          ? 'bg-emerald-950/30 border-emerald-500/50'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-black text-xs">
                            {plate}
                          </span>
                          <span className="font-bold text-xs text-white">
                            {vehicle}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            • {stall} ({permit})
                          </span>
                        </div>
                        {notes && (
                          <p className="text-[11px] text-slate-300">{notes}</p>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-lg font-mono font-black text-[10px] uppercase shrink-0 self-start sm:self-center border ${
                          isGuestPass
                            ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-sm shadow-emerald-500/20'
                            : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. GATE & AMENITY CODES */}
          {activeTab === 'GATE_CODES' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Gate &amp; Amenity Access PINs
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Restricted Officer Eyes Only
                </span>
              </div>

              <div className="space-y-2">
                {gateRows.map((row, idx) => {
                  const accessPoint = row.cols[0] || `Access Gate #${idx + 1}`;
                  const zone = row.cols[1] || 'Perimeter';
                  const pin = row.cols[2] || '#0000*';
                  const hours = row.cols[3] || '24/7';
                  const instructions = row.cols[4] || '';

                  return (
                    <div
                      key={`${accessPoint}-${idx}`}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs text-white">
                            {accessPoint}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {zone} • {hours}
                          </span>
                        </div>
                        {instructions && (
                          <p className="text-[11px] text-slate-400">
                            {instructions}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyPin(pin)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-mono font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                        title="Tap to copy PIN"
                      >
                        <span>{pin}</span>
                        {copiedCode === pin ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-emerald-400/70" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. ALL SITE OPERATIONAL DOCUMENTS */}
          {activeTab === 'ALL_DOCS' && (
            <div className="space-y-2.5">
              {siteDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40">
                      {doc.docType}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(doc.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                      })}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-white">{doc.title}</h4>
                  {doc.contentSnippet && (
                    <pre className="text-[10px] font-mono text-slate-300 bg-slate-900 border border-slate-800 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {doc.contentSnippet}
                    </pre>
                  )}
                  <div className="text-[10px] font-mono text-slate-500">
                    Published by {doc.updatedBy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Synced with CAD Site Document Vault
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuardSiteIntelDrawer;
