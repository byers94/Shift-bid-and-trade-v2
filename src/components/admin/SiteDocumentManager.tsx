import React, { useState, useEffect, useRef } from 'react';
import {
  SiteDocument,
  SiteDocType,
  loadAllSiteDocuments,
  loadSiteDocumentsForSite,
  saveAllSiteDocuments,
  subscribeToSiteDocumentUpdates,
} from '../../types/resources';
import { SiteProfile } from '../../types/shift';
import { useShiftOps } from '../../context/ShiftOpsContext';
import {
  FileText,
  Upload,
  Plus,
  Edit3,
  Trash2,
  Key,
  Car,
  Home,
  ClipboardList,
  Building2,
  Terminal,
  CheckCircle2,
  X,
  Eye,
  Sparkles,
} from 'lucide-react';

export interface SiteDocumentManagerProps {
  site?: SiteProfile | { id: string; name: string; code?: string } | null;
  supervisorName?: string;
  compact?: boolean;
}

const DOC_TYPE_CONFIG: Record<
  SiteDocType,
  {
    label: string;
    auditLabel: string;
    badgeClass: string;
    placeholderTitle: string;
    sampleContent: string;
  }
> = {
  VACANT_UNITS: {
    label: 'Vacant Units',
    auditLabel: 'Vacant Unit List',
    badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/40',
    placeholderTitle: 'Weekly Vacant Unit List - Oct 2026',
    sampleContent: `Unit 108A | Bldg A - 1st Fl | Lockbox #4419 | VACANT_READY | Verify patio slider deadbolt & thermostat at 62°F
Unit 214B | Bldg A - 2nd Fl | Lockbox #8802 | TURNOVER_MAINT | Contractors cleared at 17:00; verify deadbolt on night sweep
Unit 309C | Bldg B - 3rd Fl | Lockbox #1920 | LOCKED_INSPECTED | High-priority squat check; alarm armed
Penthouse 801 | Sky Level | Lockbox #9044 | LOCKED_INSPECTED | Executive vacant suite — require photo verification`,
  },
  PARKING_ROSTER: {
    label: 'Parking Roster',
    auditLabel: 'Parking Roster',
    badgeClass: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40',
    placeholderTitle: 'Authorized Vehicles & Tow-Away Exceptions - Oct 2026',
    sampleContent: `PRM-9041 | Stall #12 (Reserved North) | White Ford F-250 Utility | CO-884-KLP | CONTRACTOR_EXEMPT | Overnight HVAC emergency crew — DO NOT TOW
PRM-3318 | Visitor Zone B-04 | Black Tesla Model Y | WA-419-TZN | VIP_GUEST_PASS | Unit 502 Guest Pass valid thru Oct 28
PRM-7720 | Loading Bay #2 | Silver Sprinter Van | CO-102-MVR | DO_NOT_TOW | Property Management Restoration Team`,
  },
  GATE_CODES: {
    label: 'Gate Codes',
    auditLabel: 'Gate & Amenity Codes',
    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40',
    placeholderTitle: 'Master Gate, Knox Box & Amenity Access PINs',
    sampleContent: `North Vehicular Slider Gate | Main Entry | #4829* | 24/7 Guard Override | Hold #9 to latch open for Fire/EMS
Central Pool & Spa Deck | Courtyard West | 2204# | Lockup 22:00 - 06:00 | Padlock #4 backup key in Guard Keybox
Roof Mechanical Penthouse | Level 24 | 7731* | Restricted 24/7 | Log all contractor entries in DAR`,
  },
  KEY_LOG: {
    label: 'Key Log',
    auditLabel: 'Master Key Log',
    badgeClass: 'bg-purple-950/90 text-purple-300 border-purple-500/40',
    placeholderTitle: 'Master Key & Fob Sign-Out Log',
    sampleContent: `Key Ring #1 (Master Mechanical & Boiler Rooms): Assigned to On-Duty Patrol Officer
Key Ring #2 (Pool, Gym & Laundry Deadbolts): Hanging in Biometric Box Slot #2
Key Ring #3 (Telecom & Elevator Closet): Require contractor ID collateral before checkout`,
  },
  PROPERTY_SOP: {
    label: 'Property SOP',
    auditLabel: 'Property SOP Directive',
    badgeClass: 'bg-blue-950/90 text-blue-300 border-blue-500/40',
    placeholderTitle: 'After-Hours Property Lockup & Patrol SOP',
    sampleContent: `21:00 - Secure Building A & B resident laundry rooms and inspect fire exits.
22:00 - Clear pool deck, verify spa cover latch, and padlock courtyard gates.
00:00 - Conduct full vacant unit door-handle check and log status in DAR.`,
  },
};

export const SiteDocumentManager: React.FC<SiteDocumentManagerProps> = ({
  site,
  supervisorName = "Lt. Mark O'Connor (OPS-CMD-01)",
  compact = false,
}) => {
  const { sitesList, updateSite, addAuditLog, logAdminAction, showToast } = useShiftOps();

  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    site?.id || sitesList[0]?.id || 'site-1'
  );

  useEffect(() => {
    if (site?.id) {
      setSelectedSiteId(site.id);
    }
  }, [site?.id]);

  const resolvedSite =
    (site && sitesList.find((s) => s.id === site.id || s.name === site.name)) ||
    sitesList.find((s) => s.id === selectedSiteId) ||
    site || {
      id: selectedSiteId,
      name: 'Skyline Tower & Plaza',
      code: 'SKY-01',
    };

  const siteName = resolvedSite.name;
  const siteId = resolvedSite.id;

  const [siteDocs, setSiteDocs] = useState<SiteDocument[]>(() =>
    loadSiteDocumentsForSite(siteId, siteName)
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<SiteDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<SiteDocument | null>(null);

  // Form States
  const [docType, setDocType] = useState<SiteDocType>('VACANT_UNITS');
  const [title, setTitle] = useState('Weekly Vacant Unit List - Oct 2026');
  const [contentSnippet, setContentSnippet] = useState(
    DOC_TYPE_CONFIG.VACANT_UNITS.sampleContent
  );
  const [fileName, setFileName] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSiteDocs(loadSiteDocumentsForSite(siteId, siteName));
    return subscribeToSiteDocumentUpdates(() => {
      setSiteDocs(loadSiteDocumentsForSite(siteId, siteName));
    });
  }, [siteId, siteName]);

  const handleOpenCreate = (initialType: SiteDocType = 'VACANT_UNITS') => {
    setEditingDoc(null);
    setDocType(initialType);
    setTitle(DOC_TYPE_CONFIG[initialType].placeholderTitle);
    setContentSnippet(DOC_TYPE_CONFIG[initialType].sampleContent);
    setFileName('');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (doc: SiteDocument) => {
    setEditingDoc(doc);
    setDocType(doc.docType);
    setTitle(doc.title);
    setContentSnippet(doc.contentSnippet || '');
    setFileName(doc.fileUrl?.split('/').pop() || '');
    setIsEditorOpen(true);
  };

  const handleDocTypeChange = (nextType: SiteDocType) => {
    setDocType(nextType);
    if (!editingDoc) {
      setTitle(DOC_TYPE_CONFIG[nextType].placeholderTitle);
      setContentSnippet(DOC_TYPE_CONFIG[nextType].sampleContent);
    }
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    if (
      file.name.endsWith('.txt') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.md')
    ) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string' && ev.target.result.trim()) {
          setContentSnippet(ev.target.result.trim());
        }
      };
      reader.readAsText(file);
    }
  };

  const syncWithSiteProfile = (updatedSiteDocs: SiteDocument[]) => {
    const matchedSite = sitesList.find((s) => s.id === siteId || s.name === siteName);
    if (matchedSite) {
      updateSite(matchedSite.id, {
        documents: updatedSiteDocs,
        operationalDocuments: updatedSiteDocs,
      });
    }
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const allDocs = loadAllSiteDocuments();
    const nowIso = new Date().toISOString();
    const slug =
      fileName.trim() ||
      `${title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}.pdf`;

    const savedDoc: SiteDocument = editingDoc
      ? {
          ...editingDoc,
          siteId,
          title: title.trim(),
          docType,
          contentSnippet: contentSnippet.trim(),
          fileUrl: `https://secureshift.internal/cdn/site-docs/${slug}`,
          updatedAt: nowIso,
          updatedBy: supervisorName,
        }
      : {
          id: `sitedoc-${Date.now()}`,
          siteId,
          title: title.trim(),
          docType,
          contentSnippet: contentSnippet.trim(),
          fileUrl: `https://secureshift.internal/cdn/site-docs/${slug}`,
          updatedAt: nowIso,
          updatedBy: supervisorName,
        };

    const existsInAll = allDocs.some((d) => d.id === savedDoc.id);
    const nextAllDocs = existsInAll
      ? allDocs.map((d) => (d.id === savedDoc.id ? savedDoc : d))
      : [savedDoc, ...allDocs];

    saveAllSiteDocuments(nextAllDocs);
    const refreshedForSite = loadSiteDocumentsForSite(siteId, siteName);
    setSiteDocs(refreshedForSite);
    syncWithSiteProfile(refreshedForSite);

    const docLabel =
      docType === 'VACANT_UNITS'
        ? 'Vacant Unit List'
        : DOC_TYPE_CONFIG[docType].auditLabel;

    const auditMessage = `[SITE INTEL UPDATED] ${docLabel} published for ${siteName} by ${supervisorName}`;

    addAuditLog(
      'SITE_INTEL_UPDATED',
      'system',
      auditMessage,
      supervisorName,
      'success'
    );

    logAdminAction({
      adminName: supervisorName,
      adminRole: 'Operations Supervisor',
      actionType: 'site_updated',
      target: siteName,
      details: auditMessage,
    });

    showToast('Site Intel Published', auditMessage, 'success');
    setIsEditorOpen(false);
    setEditingDoc(null);
  };

  const handleDeleteDocument = (doc: SiteDocument) => {
    const allDocs = loadAllSiteDocuments();
    const nextAllDocs = allDocs.filter((d) => d.id !== doc.id);
    saveAllSiteDocuments(nextAllDocs);

    const refreshedForSite = loadSiteDocumentsForSite(siteId, siteName);
    setSiteDocs(refreshedForSite);
    syncWithSiteProfile(refreshedForSite);

    const docLabel =
      doc.docType === 'VACANT_UNITS'
        ? 'Vacant Unit List'
        : DOC_TYPE_CONFIG[doc.docType].auditLabel;

    const auditMessage = `[SITE INTEL UPDATED] ${docLabel} ("${doc.title}") removed for ${siteName} by ${supervisorName}`;

    addAuditLog(
      'SITE_INTEL_UPDATED',
      'system',
      auditMessage,
      supervisorName,
      'warning'
    );

    showToast('Site Document Removed', auditMessage, 'warning');
  };

  const renderDocTypeIcon = (type: SiteDocType) => {
    switch (type) {
      case 'VACANT_UNITS':
        return <Home className="w-3.5 h-3.5 text-amber-400" />;
      case 'PARKING_ROSTER':
        return <Car className="w-3.5 h-3.5 text-cyan-400" />;
      case 'GATE_CODES':
        return <Key className="w-3.5 h-3.5 text-emerald-400" />;
      case 'KEY_LOG':
        return <ClipboardList className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div
      id="admin-site-document-manager"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 text-slate-100 shadow-md"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                Operational Documents &amp; Vacant Units
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40">
                {siteName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Manage live Vacant Unit Lists, Parking &amp; Tow Rosters, and Gate/Amenity PINs synced to the Guard Mobile Terminal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!site && sitesList.length > 0 && (
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 font-bold"
            >
              {sitesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          )}

          <button
            id="admin-upload-update-site-doc-btn"
            type="button"
            onClick={() => handleOpenCreate('VACANT_UNITS')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-sm border border-blue-400/40 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>[ + Upload / Update Site Doc ]</span>
          </button>
        </div>
      </div>

      {/* Inline Editor / Uploader Drawer when open */}
      {isEditorOpen && (
        <div
          id="site-doc-editor-drawer"
          className="bg-slate-950 border border-blue-500/50 rounded-xl p-4 space-y-3.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                {editingDoc
                  ? `Update ${DOC_TYPE_CONFIG[docType].label} — ${siteName}`
                  : `Publish New Site Operational Document — ${siteName}`}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsEditorOpen(false);
                setEditingDoc(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveDocument} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Document Type Selector *
                </label>
                <select
                  id="site-doc-type-selector"
                  value={docType}
                  onChange={(e) => handleDocTypeChange(e.target.value as SiteDocType)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="VACANT_UNITS">Vacant Units (Weekly Unit &amp; Lockbox List)</option>
                  <option value="PARKING_ROSTER">Parking Roster (Authorized Vehicles &amp; Tow Exceptions)</option>
                  <option value="GATE_CODES">Gate Codes (Perimeter, Knox &amp; Amenity PINs)</option>
                  <option value="KEY_LOG">Key Log (Master Keys &amp; Fob Inventory)</option>
                  <option value="PROPERTY_SOP">Property SOP (Site-Specific Patrol Orders)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Weekly Vacant Unit List - Oct 2026"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Text / Table Editor for pasting/updating vacant unit lists */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Operational Table / Content Snippet (Pipe-delimited or Markdown Table) *
                </label>
                <button
                  type="button"
                  onClick={() => setContentSnippet(DOC_TYPE_CONFIG[docType].sampleContent)}
                  className="text-[10px] font-mono text-blue-400 hover:text-blue-300 underline cursor-pointer"
                >
                  Load Structured Template
                </button>
              </div>
              <textarea
                rows={5}
                required
                value={contentSnippet}
                onChange={(e) => setContentSnippet(e.target.value)}
                placeholder="Paste vacant unit numbers, lockbox codes, readiness status, or gate PINs..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-100 focus:outline-none focus:border-blue-500 leading-relaxed"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Tip: Separate columns with &ldquo;|&rdquo; (e.g. Unit # | Building/Floor | Lockbox Code | Status | Patrol Note) for automatic tabular rendering on Guard terminals.
              </p>
            </div>

            {/* Optional File Uploader */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-slate-200 block">
                    {fileName
                      ? `Attached Sheet: ${fileName}`
                      : 'Attach Source Sheet (PDF, CSV, XLSX, TXT - Optional)'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Guards can view both the live structured table and the attached document
                  </span>
                </div>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.txt,.md,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-blue-300 cursor-pointer"
                >
                  Browse File
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <Terminal className="w-3 h-3" />
                Logs immutable [SITE INTEL UPDATED] entry to Live Audit Terminal
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditorOpen(false);
                    setEditingDoc(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="publish-site-doc-submit-btn"
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-sm"
                >
                  {editingDoc ? 'Save & Publish Update' : 'Publish to Site Intel Vault'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Active Site Documents List */}
      <div className="space-y-2">
        {siteDocs.length === 0 ? (
          <div className="p-6 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
            No operational documents configured for {siteName} yet. Click{' '}
            <strong>[ + Upload / Update Site Doc ]</strong> to publish Vacant Units, Parking Rosters, or Gate Codes.
          </div>
        ) : (
          siteDocs.map((doc) => {
            const cfg = DOC_TYPE_CONFIG[doc.docType] || DOC_TYPE_CONFIG.PROPERTY_SOP;
            const lines = (doc.contentSnippet || '')
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean);

            return (
              <div
                key={doc.id}
                className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-black uppercase ${cfg.badgeClass}`}
                    >
                      {renderDocTypeIcon(doc.docType)}
                      <span>{cfg.label}</span>
                    </span>
                    <h4 className="text-xs font-black text-white truncate">
                      {doc.title}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      • {lines.length} {lines.length === 1 ? 'record' : 'records'}
                    </span>
                  </div>

                  {doc.contentSnippet && (
                    <pre className="text-[10px] font-mono text-slate-300 bg-slate-900/90 border border-slate-800/90 rounded-lg p-2 overflow-x-auto max-h-24 whitespace-pre-wrap leading-relaxed">
                      {doc.contentSnippet}
                    </pre>
                  )}

                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                    <span>Updated by: {doc.updatedBy}</span>
                    <span>•</span>
                    <span>
                      {new Date(doc.updatedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Preview Document"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(doc)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Edit Document"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc)}
                    className="px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Delete Document"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-blue-400 font-bold">
                  {DOC_TYPE_CONFIG[previewDoc.docType]?.label || previewDoc.docType} • {siteName}
                </span>
                <h4 className="text-sm font-black text-white">{previewDoc.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="text-[11px] font-mono text-slate-200 bg-slate-950 border border-slate-800 rounded-xl p-3.5 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80">
              {previewDoc.contentSnippet}
            </pre>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Published by: {previewDoc.updatedBy}</span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteDocumentManager;
