import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { SiteCategory, SiteSecurityTier } from '../../types/shift';
import {
  FileCode,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  Building2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Layers,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  HelpCircle,
  RefreshCw,
  Eye,
  Code
} from 'lucide-react';

interface SiteJsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Comprehensive preset sample templates for fast client onboarding
const SAMPLE_PRESETS: { id: string; label: string; description: string; data: any[] }[] = [
  {
    id: 'corporate_tech',
    label: 'Corporate HQ & Tech Campuses',
    description: 'Executive towers, tech development centers, and data facilities',
    data: [
      {
        name: "Azure Cloud Center & Data Facility",
        code: "TECH-AZ01",
        address: "15000 NE 36th Way, Bldg 42",
        city: "Redmond",
        state: "WA",
        zip: "98052",
        zone: "Eastside Tech Corridor",
        category: "tech",
        securityTier: "Tier 3 - High Security",
        primaryContactName: "Nathan Drake (Site Facilities Mgr)",
        primaryContactPhone: "+1 (425) 555-0188",
        primaryContactEmail: "facilities@azurecampus.com",
        emergencyPhone: "+1 (425) 555-9911",
        postInstructions: "Strict biometric access control. Escort all unbadged vendors. 30-minute server bay patrol rounds. Anti-tailgating enforcement at turnstiles.",
        requiredCertifications: ["Guard Card", "CPR/AED", "CCTV Monitoring", "Biometric Systems"],
        requiredClearances: ["Secret Clearance", "Tech Facility Badge"],
        activePostsCount: 3,
        ojtRequired: true,
        operatingHours: "24/7 Continuous Ops",
        accessGateNotes: "Gate 3 Security Booth - Badging office open 0700-1700",
        status: "active",
        notes: "Key client SLA: 100% on-time post turnover required."
      },
      {
        name: "Rainier FinTech Tower",
        code: "CORP-RFT",
        address: "1301 5th Avenue, Suite 2200",
        city: "Seattle",
        state: "WA",
        zip: "98101",
        zone: "Financial District",
        category: "corporate",
        securityTier: "Tier 2 - Elevated",
        primaryContactName: "Elena Vance (Building Ops)",
        primaryContactPhone: "+1 (206) 555-4321",
        primaryContactEmail: "ops@rainiertower.com",
        emergencyPhone: "+1 (206) 555-9111",
        postInstructions: "Professional executive lobby presence. Monitor concierge desk, verify visitor IDs via lobby management tablet.",
        requiredCertifications: ["Guard Card", "CPR/AED", "Hospitality Security", "De-escalation"],
        activePostsCount: 2,
        ojtRequired: true,
        operatingHours: "06:00 - 22:00 Weekdays",
        accessGateNotes: "Loading dock entry on 4th Ave alleyway. Clearance height 13ft 6in.",
        status: "active",
        notes: "Strict professional dress standard (blazer/tie uniform)."
      }
    ]
  },
  {
    id: 'maritime_transport',
    label: 'Ports, Maritime & Logistics',
    description: 'Cargo terminals, shipping piers, and supply chain hubs',
    data: [
      {
        name: "Pier 91 International Cruise Terminal",
        code: "PORT-P91",
        address: "2001 W Garfield St, Pier 91",
        city: "Seattle",
        state: "WA",
        zip: "98119",
        zone: "Smith Cove Maritime",
        category: "maritime",
        securityTier: "Tier 4 - Critical Infrastructure",
        primaryContactName: "Capt. Thomas Sterling (Port Security Officer)",
        primaryContactPhone: "+1 (206) 555-7890",
        primaryContactEmail: "security@portseattle-p91.org",
        emergencyPhone: "+1 (206) 555-9988",
        postInstructions: "US Coast Guard MARSEC Level 1 enforcement. TWIC verification mandatory at gate. Roving perimeter vehicle patrols. Passenger baggage screening support.",
        requiredCertifications: ["TWIC Card", "Guard Card", "CPR/AED", "HAZMAT Level 2", "Incident Command"],
        requiredClearances: ["DHS TWIC Clearance", "Port Authority Credential"],
        activePostsCount: 4,
        ojtRequired: true,
        operatingHours: "24/7 Continuous Ops",
        accessGateNotes: "North Access Gate off Magnolia Bridge. Heavy truck scale operational.",
        status: "active",
        notes: "Strict TWIC audit logs must be submitted to Ops Dispatch every shift."
      },
      {
        name: "Sound Logistics Distribution Terminal",
        code: "IND-SLD",
        address: "6800 S 180th Street",
        city: "Tukwila",
        state: "WA",
        zip: "98188",
        zone: "South Valley Industrial",
        category: "industrial",
        securityTier: "Tier 2 - Elevated",
        primaryContactName: "Marcus Brody (Logistics Director)",
        primaryContactPhone: "+1 (253) 555-3344",
        primaryContactEmail: "dispatch@soundlogistics.com",
        emergencyPhone: "+1 (253) 555-9900",
        postInstructions: "Inbound/outbound freight seal verification. High-visibility safety vests required. Yard perimeter CCTV inspection.",
        requiredCertifications: ["Guard Card", "First Aid", "Asset Protection"],
        activePostsCount: 2,
        ojtRequired: false,
        operatingHours: "24/7 Continuous Ops",
        accessGateNotes: "Guard shack at Gate A. Driver kiosk sign-in required.",
        status: "active",
        notes: "High volume during peak dispatch hours (0400-0800 & 1600-2000)."
      }
    ]
  },
  {
    id: 'healthcare_public',
    label: 'Healthcare & Public Venues',
    description: 'Hospitals, civic centers, arenas, and transit facilities',
    data: [
      {
        name: "Pacific Northwest Medical Pavilion",
        code: "HLTH-PNW",
        address: "1100 9th Ave, Trauma Center Wing",
        city: "Seattle",
        state: "WA",
        zip: "98104",
        zone: "First Hill Medical Sector",
        category: "healthcare",
        securityTier: "Tier 3 - High Security",
        primaryContactName: "Dr. Angela Ramirez (Chief of Safety)",
        primaryContactPhone: "+1 (206) 555-6677",
        primaryContactEmail: "safety@pnwmedical.org",
        emergencyPhone: "+1 (206) 555-9111",
        postInstructions: "Emergency Department stationed post. Metal detection at ambulance bay entry. De-escalation & crisis intervention protocol. Code Silver/Gray rapid response.",
        requiredCertifications: ["Guard Card", "CPR/AED", "De-escalation", "Crisis Prevention", "First Aid"],
        activePostsCount: 3,
        ojtRequired: true,
        operatingHours: "24/7 Continuous Ops",
        accessGateNotes: "ER Ambulance loop - strictly no unauthorized parking.",
        status: "active",
        notes: "Mandatory de-escalation certification refresher every 12 months."
      },
      {
        name: "Emerald City Arena & Convention Complex",
        code: "VEN-ECA",
        address: "305 Harrison St",
        city: "Seattle",
        state: "WA",
        zip: "98109",
        zone: "Uptown / Center District",
        category: "public_venue",
        securityTier: "Tier 2 - Elevated",
        primaryContactName: "Jordan Hayes (Venue Operations)",
        primaryContactPhone: "+1 (206) 555-9080",
        primaryContactEmail: "events@emeraldarena.com",
        emergencyPhone: "+1 (206) 555-9922",
        postInstructions: "Crowd ingress management, bag inspection policy enforcement, emergency exit monitoring, and perimeter perimeter sweeps.",
        requiredCertifications: ["Guard Card", "CPR/AED", "Hospitality Security", "Transit Safety"],
        activePostsCount: 4,
        ojtRequired: true,
        operatingHours: "Event Based / 24/7 Ops",
        accessGateNotes: "Loading Bay C on 1st Ave N. Credentials required on event days.",
        status: "active",
        notes: "Pre-event briefing 45 minutes prior to doors open."
      }
    ]
  },
  {
    id: 'minimal_schema',
    label: 'Minimal Starter Template',
    description: 'Barebones schema with essential facility fields for quick customization',
    data: [
      {
        name: "Cascade Corporate Center",
        code: "CORP-CCC",
        address: "400 Pine Street",
        city: "Seattle",
        state: "WA",
        zip: "98101",
        zone: "Downtown Central",
        category: "corporate",
        securityTier: "Tier 2 - Elevated",
        primaryContactName: "Site Security Officer",
        primaryContactPhone: "+1 (206) 555-0100",
        primaryContactEmail: "contact@site.com",
        emergencyPhone: "+1 (206) 555-9911",
        postInstructions: "Standard post orders apply. Check in with security dispatch upon arrival.",
        requiredCertifications: ["Guard Card", "CPR/AED"],
        activePostsCount: 1,
        ojtRequired: true,
        operatingHours: "24/7 Continuous Ops",
        status: "active"
      }
    ]
  }
];

export const SiteJsonImportModal: React.FC<SiteJsonImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { bulkImportSites, showToast, sitesList } = useShiftOps();

  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'schema'>('editor');
  const [jsonText, setJsonText] = useState<string>(() =>
    JSON.stringify(SAMPLE_PRESETS[0].data, null, 2)
  );
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  const [forceOjtRequired, setForceOjtRequired] = useState<boolean>(true);
  const [copiedSample, setCopiedSample] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Real-time JSON parse & validation
  const parsedResult = useMemo(() => {
    if (!jsonText.trim()) {
      return { isValid: false, items: [], error: 'JSON text is empty.' };
    }

    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        return {
          isValid: false,
          items: [],
          error: 'Top-level JSON structure must be an Array of site objects (e.g. `[ { ... }, { ... } ]`).'
        };
      }

      const validatedItems: any[] = [];
      const itemErrors: string[] = [];

      parsed.forEach((item, idx) => {
        if (!item || typeof item !== 'object') {
          itemErrors.push(`Item #${idx + 1}: Not a valid JSON object.`);
          return;
        }

        const name = item.name || item.siteName || item.facilityName;
        if (!name || typeof name !== 'string' || !name.trim()) {
          itemErrors.push(`Item #${idx + 1}: Missing required "name" property.`);
          return;
        }

        validatedItems.push(item);
      });

      return {
        isValid: validatedItems.length > 0 && itemErrors.length === 0,
        items: validatedItems,
        error: itemErrors.length > 0 ? itemErrors.join('\n') : null,
        totalParsed: parsed.length
      };
    } catch (e: any) {
      return {
        isValid: false,
        items: [],
        error: `Syntax Error: ${e.message || 'Invalid JSON syntax'}`
      };
    }
  }, [jsonText]);

  // Check matching duplicates with existing site directory
  const previewSummary = useMemo(() => {
    if (!parsedResult.items.length) return { newCount: 0, updateCount: 0 };

    let updateCount = 0;
    let newCount = 0;

    parsedResult.items.forEach((item) => {
      const name = (item.name || item.siteName || item.facilityName || '').trim().toLowerCase();
      const code = (item.code || item.siteCode || item.facilityCode || '').trim().toLowerCase();

      const exists = sitesList.some(
        (s) => (code && s.code.toLowerCase() === code) || s.name.toLowerCase() === name
      );

      if (exists && overwriteExisting) {
        updateCount++;
      } else {
        newCount++;
      }
    });

    return { newCount, updateCount };
  }, [parsedResult.items, sitesList, overwriteExisting]);

  if (!isOpen) return null;

  // Format / Prettify
  const handlePrettify = () => {
    try {
      const obj = JSON.parse(jsonText);
      setJsonText(JSON.stringify(obj, null, 2));
      showToast('JSON Formatted', 'Code indentation cleanly standardized.', 'info');
    } catch {
      showToast('Format Failed', 'Please fix syntax errors before formatting.', 'warning');
    }
  };

  // Copy JSON
  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonText);
    setCopiedSample(true);
    showToast('Copied to Clipboard', 'JSON site array copied.', 'info');
    setTimeout(() => setCopiedSample(false), 2000);
  };

  // Load Preset
  const handleLoadPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setJsonText(JSON.stringify(preset.data, null, 2));
    showToast('Preset Loaded', `Loaded "${preset.label}" with ${preset.data.length} facilities.`, 'info');
  };

  // Submit Import
  const handleExecuteImport = () => {
    if (!parsedResult.isValid || parsedResult.items.length === 0) {
      showToast('Validation Error', 'Please resolve JSON errors before importing.', 'danger');
      return;
    }

    setIsProcessing(true);
    try {
      const result = bulkImportSites(parsedResult.items, {
        overwrite: overwriteExisting,
        defaultOjt: forceOjtRequired
      });

      if (result.errors.length > 0 && result.count === 0 && result.updatedCount === 0) {
        showToast('Import Failed', result.errors[0] || 'Unable to import facilities.', 'danger');
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (e: any) {
      showToast('Import Error', e.message || 'An unexpected error occurred during import.', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="site-json-import-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="site-json-import-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Bulk Onboard Facilities via JSON
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Dispatcher Tool
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste or customize a structured JSON array of client security sites to register credentials and post orders in bulk.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-json-import-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs & Quick Presets Strip */}
        <div className="px-4 sm:px-5 pt-3 pb-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              id="tab-json-editor"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              JSON Code Editor
            </button>
            <button
              type="button"
              id="tab-json-preview"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Live Preview
              {parsedResult.items.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-mono">
                  {parsedResult.items.length}
                </span>
              )}
            </button>
            <button
              type="button"
              id="tab-json-schema"
              onClick={() => setActiveTab('schema')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'schema'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Field Schema
            </button>
          </div>

          {/* Quick Presets Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Load Sample:
            </span>
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                id={`btn-load-preset-${preset.id}`}
                onClick={() => handleLoadPreset(preset)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                title={preset.description}
              >
                <span>{preset.label.split('&')[0].trim()}</span>
                <span className="text-[9px] text-slate-400 font-mono">({preset.data.length})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: JSON Editor */}
          {activeTab === 'editor' && (
            <div className="space-y-3">
              {/* Editor Action Bar */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {parsedResult.isValid ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Valid JSON • Ready to onboard {parsedResult.items.length} {parsedResult.items.length === 1 ? 'facility' : 'facilities'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-md font-semibold text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Invalid JSON Structure
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-prettify-json"
                    onClick={handlePrettify}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Prettify Code
                  </button>
                  <button
                    type="button"
                    id="btn-copy-json"
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors"
                  >
                    {copiedSample ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedSample ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
              </div>

              {/* Code Editor Box */}
              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
                <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    sites_onboarding_array.json
                  </span>
                  <span>{jsonText.split('\n').length} lines</span>
                </div>
                <textarea
                  id="textarea-json-site-import"
                  rows={14}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="[ { &quot;name&quot;: &quot;Facility Name&quot;, &quot;code&quot;: &quot;CORP-01&quot;, ... } ]"
                  className="w-full bg-slate-950 font-mono text-xs text-emerald-400 p-3.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y leading-relaxed"
                  spellCheck={false}
                />
              </div>

              {/* Syntax Error Alert */}
              {parsedResult.error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-mono space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900 dark:text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    Parsing Error
                  </div>
                  <p className="whitespace-pre-wrap pl-5 text-[11px] leading-tight text-rose-700 dark:text-rose-400">
                    {parsedResult.error}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Live Parsed Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Parsed Facility Staging Area
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review and verify normalized facility properties before injecting into active site directory.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                  {parsedResult.items.length} Ready for Registry
                </span>
              </div>

              {parsedResult.items.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Facilities Parsed</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Switch to the JSON Editor tab and paste a valid JSON array or load a sample preset.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {parsedResult.items.map((site, i) => {
                    const tierName = site.securityTier || 'Tier 2 - Elevated';
                    const categoryName = site.category || 'corporate';
                    const certs: string[] = Array.isArray(site.requiredCertifications)
                      ? site.requiredCertifications
                      : typeof site.requiredCertifications === 'string'
                      ? site.requiredCertifications.split(',').map((s: string) => s.trim())
                      : ['Guard Card', 'CPR/AED'];

                    return (
                      <div
                        key={i}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-2xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                              {site.code || `SITE-${String(i + 1).padStart(2, '0')}`}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                              {site.name || 'Unnamed Facility'}
                            </h4>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                            {categoryName}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>
                              {site.address || 'Address on file'}, {site.city || 'Seattle'}, {site.state || 'WA'} {site.zip || '98101'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                            <span className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                              <Phone className="w-3 h-3" />
                              {site.emergencyPhone || '+1 (555) 206-9911'}
                            </span>
                            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              {tierName}
                            </span>
                          </div>

                          {site.postInstructions && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2 bg-slate-50 dark:bg-slate-900/60 p-2 rounded border border-slate-100 dark:border-slate-800">
                              "{site.postInstructions}"
                            </p>
                          )}
                        </div>

                        {/* Qualifications Pills */}
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          {certs.slice(0, 3).map((cert, cIdx) => (
                            <span
                              key={cIdx}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                            >
                              ✓ {cert}
                            </span>
                          ))}
                          {certs.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              +{certs.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Field Schema & Reference */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  JSON Schema Specification
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Reference guide for all supported attributes when preparing bulk client facility onboarding lists.
                </p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2.5 font-bold">Field Name</th>
                      <th className="p-2.5 font-bold">Type</th>
                      <th className="p-2.5 font-bold">Required</th>
                      <th className="p-2.5 font-bold">Description & Permitted Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">name</td>
                      <td className="p-2.5 font-mono text-slate-400">string</td>
                      <td className="p-2.5 font-bold text-rose-500">Yes</td>
                      <td className="p-2.5">Official name of the client facility or deployment site.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">code</td>
                      <td className="p-2.5 font-mono text-slate-400">string</td>
                      <td className="p-2.5 text-slate-400">Optional</td>
                      <td className="p-2.5">Unique identifier code (e.g. <code>PORT-P7</code>, <code>CORP-HQ</code>). Auto-generated if omitted.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">address</td>
                      <td className="p-2.5 font-mono text-slate-400">string</td>
                      <td className="p-2.5 font-bold text-rose-500">Recommended</td>
                      <td className="p-2.5">Full physical street address for officer mapping and commute verification.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">category</td>
                      <td className="p-2.5 font-mono text-slate-400">string</td>
                      <td className="p-2.5 text-slate-400">Optional</td>
                      <td className="p-2.5">
                        <code>maritime</code>, <code>corporate</code>, <code>healthcare</code>, <code>aviation</code>, <code>retail</code>, <code>industrial</code>, <code>tech</code>, <code>public_venue</code>, <code>government</code>.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">securityTier</td>
                      <td className="p-2.5 font-mono text-slate-400">string</td>
                      <td className="p-2.5 text-slate-400">Optional</td>
                      <td className="p-2.5">
                        <code>Tier 1 - Standard</code>, <code>Tier 2 - Elevated</code>, <code>Tier 3 - High Security</code>, <code>Tier 4 - Critical Infrastructure</code>.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">emergencyPhone</td>
                      <td className="p-2.5 font-mono text-slate-400">string</td>
                      <td className="p-2.5 font-bold text-rose-500">Recommended</td>
                      <td className="p-2.5">24/7 emergency dispatch contact or site alarm monitoring hotline.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">postInstructions</td>
                      <td className="p-2.5 font-mono text-slate-400">string</td>
                      <td className="p-2.5 text-slate-400">Optional</td>
                      <td className="p-2.5">Post orders, access gate procedures, patrol frequency, uniform mandates.</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">requiredCertifications</td>
                      <td className="p-2.5 font-mono text-slate-400">string[]</td>
                      <td className="p-2.5 text-slate-400">Optional</td>
                      <td className="p-2.5">Array of certification tags (e.g. <code>["TWIC Card", "Armed Endorsement", "CPR/AED"]</code>).</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">activePostsCount</td>
                      <td className="p-2.5 font-mono text-slate-400">number</td>
                      <td className="p-2.5 text-slate-400">Optional</td>
                      <td className="p-2.5">Concurrent security guard posts required (default: <code>1</code>).</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">ojtRequired</td>
                      <td className="p-2.5 font-mono text-slate-400">boolean</td>
                      <td className="p-2.5 text-slate-400">Optional</td>
                      <td className="p-2.5">Whether guards must complete on-the-job training prior to shift bidding (default: <code>true</code>).</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Onboarding Configuration Checkboxes */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Import & Synchronization Preferences
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  id="checkbox-overwrite-existing-sites"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>
                  <strong>Sync Existing Matches:</strong> Update records if facility Code or Name matches.
                </span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  id="checkbox-force-ojt-sites"
                  checked={forceOjtRequired}
                  onChange={(e) => setForceOjtRequired(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>
                  <strong>Enforce OJT Clearance:</strong> Require site qualification for all imported posts.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
            {parsedResult.isValid && parsedResult.items.length > 0 ? (
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Summary:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  {previewSummary.newCount} New
                </strong>{' '}
                facilities •{' '}
                <strong className="text-blue-600 dark:text-blue-400 font-bold font-mono">
                  {previewSummary.updateCount} Synchronized
                </strong>
              </span>
            ) : (
              <span>Paste or edit JSON above to enable bulk onboarding</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              id="btn-cancel-json-import"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-submit-json-site-import"
              disabled={!parsedResult.isValid || parsedResult.items.length === 0 || isProcessing}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              {isProcessing ? 'Processing...' : `Onboard ${parsedResult.items.length} Facilities`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
