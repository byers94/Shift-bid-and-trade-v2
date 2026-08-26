import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ShiftTemplate } from '../../types/shift';
import { ShiftTemplateModal } from './ShiftTemplateModal';
import { ShiftBidsModal } from './ShiftBidsModal';
import { AutoFillShiftsModal } from './AutoFillShiftsModal';
import { SiteSelectDropdown } from '../common/SiteSelectDropdown';
import { calculateHours, formatDateLabel, compareShiftsByDateSoonest, compareShiftsByDateFurthest } from '../../utils/time';
import { SAMPLE_JSON_SHIFTS } from '../../data/mockData';
import { 
  Plus, 
  FileCode, 
  Clock, 
  CheckCircle, 
  RotateCcw, 
  Trash2, 
  Search, 
  ShieldAlert, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  MapPin,
  Calendar,
  X,
  Filter,
  UserCheck,
  Building2,
  Bookmark,
  BookmarkPlus,
  Zap,
  Layers,
  Award,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export const ShiftManager: React.FC = () => {
  const { 
    shifts, 
    bids,
    shiftTemplates,
    createShift, 
    bulkImportShifts, 
    markShiftFilled, 
    reopenShift, 
    deleteShift,
    hideFilledShifts,
    setHideFilledShifts,
    showToast
  } = useShiftOps();

  // Form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [siteName, setSiteName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('07:00');
  const [urgency, setUrgency] = useState<'standard' | 'emergency'>('standard');
  const [notes, setNotes] = useState('');
  const [showJsonImporter, setShowJsonImporter] = useState(false);
  const [jsonText, setJsonText] = useState(SAMPLE_JSON_SHIFTS);
  const [jsonError, setJsonError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'filled' | 'emergency' | 'has_bids'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [sortOption, setSortOption] = useState<'date_asc' | 'date_desc' | 'urgency' | 'site_asc' | 'bids_desc'>('date_asc');

  // Shift Templates Modal state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateModalMode, setTemplateModalMode] = useState<'select' | 'create_from_form' | 'create_new'>('select');
  const [appliedTemplateNotice, setAppliedTemplateNotice] = useState<string | null>(null);

  // Shift Bids Modal state
  const [isBidsModalOpen, setIsBidsModalOpen] = useState(false);
  const [selectedBidsShiftId, setSelectedBidsShiftId] = useState<string | null>(null);

  // Auto-Fill Shifts Modal state
  const [isAutoFillModalOpen, setIsAutoFillModalOpen] = useState(false);
  const [selectedAutoFillShiftId, setSelectedAutoFillShiftId] = useState<string | null>(null);

  // Auto calculated hours
  const calculatedHours = calculateHours(startTime, endTime);

  // Auto fill form with template pattern
  const handleApplyTemplate = (template: ShiftTemplate) => {
    setSiteName(template.siteName);
    if (template.address) setAddress(template.address);
    if (template.location) setLocation(template.location);
    setStartTime(template.startTime);
    setEndTime(template.endTime);
    setUrgency(template.urgency);
    if (template.notes) setNotes(template.notes);

    setAppliedTemplateNotice(template.name);
    showToast(
      'Template Applied',
      `Auto-filled form with "${template.name}" (${calculateHours(template.startTime, template.endTime)}h).`,
      'success'
    );
  };

  const handleCreateSingleShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;

    createShift({
      siteName,
      address: address.trim() || '100 Main St, Seattle, WA 98101',
      location,
      date,
      startTime,
      endTime,
      urgency,
      notes
    });

    // Reset inputs
    setSiteName('');
    setAddress('');
    setLocation('');
    setNotes('');
  };

  const handleImportJson = () => {
    setJsonError('');
    try {
      const parsed = JSON.parse(jsonText);
      const result = bulkImportShifts(parsed);
      if (result.errors.length > 0) {
        setJsonError(result.errors.join('\n'));
      } else {
        setShowJsonImporter(false);
      }
    } catch (e: any) {
      setJsonError('Invalid JSON syntax: ' + e.message);
    }
  };

  // Comprehensive multi-criteria filtering: Site Name, Date, Guard Assignment Status & Name
  const filteredShifts = shifts.filter((s) => {
    // 1. Hide filled toggle
    if (hideFilledShifts && s.status === 'filled') {
      return false;
    }

    // 2. Status quick filter
    if (statusFilter === 'open' && s.status !== 'open') return false;
    if (statusFilter === 'filled' && s.status !== 'filled') return false;
    if (statusFilter === 'emergency' && s.urgency !== 'emergency') return false;
    if (statusFilter === 'has_bids') {
      const shiftBids = bids.filter((b) => b.shiftId === s.id);
      if (shiftBids.length === 0 && (s.bidsCount || 0) === 0) return false;
    }

    // 3. Explicit date filter (if selected via date picker)
    if (dateFilter && s.date !== dateFilter) {
      return false;
    }

    // 4. Global Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();

      // Site & Location matching
      const matchesSite = s.siteName.toLowerCase().includes(q);
      const matchesAddress = s.address ? s.address.toLowerCase().includes(q) : false;
      const matchesLocation = s.location ? s.location.toLowerCase().includes(q) : false;

      // Date matching (ISO string, formatted label e.g. "Sun, Aug 23", month name, day of week)
      const dateFormatted = formatDateLabel(s.date).toLowerCase();
      const matchesDate = s.date.toLowerCase().includes(q) || dateFormatted.includes(q);

      // Guard assignment status matching
      const isOpenStatus = s.status === 'open';
      const isFilledStatus = s.status === 'filled';
      
      const matchesOpenKeyword = ['open', 'unassigned', 'vacant', 'unfilled', 'available', 'needs guard'].some(k => q.includes(k) || k.includes(q)) && isOpenStatus;
      const matchesFilledKeyword = ['filled', 'assigned', 'occupied', 'staffed', 'booked'].some(k => q.includes(k) || k.includes(q)) && isFilledStatus;
      
      // Guard Name matching
      const matchesGuardName = s.assignedGuardName ? s.assignedGuardName.toLowerCase().includes(q) : false;

      // Urgency matching
      const matchesUrgency = s.urgency.toLowerCase().includes(q) || (q === 'urgent' && s.urgency === 'emergency');

      // Notes / Time range matching
      const matchesNotes = s.notes ? s.notes.toLowerCase().includes(q) : false;
      const matchesTime = `${s.startTime}-${s.endTime}`.includes(q) || `${s.hours}h`.includes(q);

      return (
        matchesSite ||
        matchesAddress ||
        matchesLocation ||
        matchesDate ||
        matchesOpenKeyword ||
        matchesFilledKeyword ||
        matchesGuardName ||
        matchesUrgency ||
        matchesNotes ||
        matchesTime
      );
    }

    return true;
  });

  // Sort shifts according to active sort option (default: Date Soonest to Furthest)
  const sortedShifts = [...filteredShifts].sort((a, b) => {
    if (sortOption === 'date_asc') {
      return compareShiftsByDateSoonest(a, b);
    }
    if (sortOption === 'date_desc') {
      return compareShiftsByDateFurthest(a, b);
    }
    if (sortOption === 'urgency') {
      if (a.urgency === 'emergency' && b.urgency !== 'emergency') return -1;
      if (a.urgency !== 'emergency' && b.urgency === 'emergency') return 1;
      return compareShiftsByDateSoonest(a, b);
    }
    if (sortOption === 'site_asc') {
      return a.siteName.localeCompare(b.siteName) || compareShiftsByDateSoonest(a, b);
    }
    if (sortOption === 'bids_desc') {
      const aBids = (a.bidsCount || 0) + bids.filter(x => x.shiftId === a.id).length;
      const bBids = (b.bidsCount || 0) + bids.filter(x => x.shiftId === b.id).length;
      return bBids - aBids || compareShiftsByDateSoonest(a, b);
    }
    return compareShiftsByDateSoonest(a, b);
  });

  const openCount = shifts.filter(s => s.status === 'open').length;
  const filledCount = shifts.filter(s => s.status === 'filled').length;
  const emergencyCount = shifts.filter(s => s.urgency === 'emergency').length;
  const shiftsWithBidsCount = shifts.filter(s => {
    const shiftBids = bids.filter((b) => b.shiftId === s.id);
    return shiftBids.length > 0 || (s.bidsCount || 0) > 0;
  }).length;

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all' || dateFilter !== '' || sortOption !== 'date_asc';

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('');
    setSortOption('date_asc');
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* 1. Shift Creation Panel (Posting Tools) */}
      <div 
        id="ops-shift-creation-panel"
        className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs shrink-0"
      >
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <h2 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#1e3a8a] dark:text-blue-400" />
            Post New Operational Shift
          </h2>
          <div className="flex items-center gap-2">
            {/* Auto-Fill Shifts Heuristic Engine Button */}
            <button
              id="open-autofill-shifts-top-btn"
              type="button"
              onClick={() => {
                setSelectedAutoFillShiftId(null);
                setIsAutoFillModalOpen(true);
              }}
              className="text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-3 py-1 rounded-md shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-emerald-500/40"
              title="Open Heuristic Auto-Fill Engine to suggest and assign qualified guards to open shifts"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300/40" />
              <span>Auto-Fill Shifts</span>
              {openCount > 0 && (
                <span className="bg-white/25 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {openCount}
                </span>
              )}
            </button>

            <button
              id="open-template-manager-btn"
              type="button"
              onClick={() => {
                setTemplateModalMode('select');
                setIsTemplateModalOpen(true);
              }}
              className="text-xs font-bold text-[#1e3a8a] dark:text-blue-400 bg-blue-50/80 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 px-3 py-1 rounded-md border border-blue-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#1e3a8a] dark:text-blue-400" />
              <span>Shift Templates</span>
              <span className="bg-[#1e3a8a] dark:bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {shiftTemplates.length}
              </span>
            </button>
            <button
              id="toggle-json-import-btn"
              type="button"
              onClick={() => setShowJsonImporter(!showJsonImporter)}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5" />
              {showJsonImporter ? 'Hide JSON' : 'JSON Import'}
            </button>
          </div>
        </div>

        {/* Quick Template Selector Bar */}
        {!showJsonImporter && (
          <div className="flex flex-wrap items-center gap-1.5 pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1 mr-1">
              <Zap className="w-3 h-3 text-amber-500" />
              Quick Auto-Fill:
            </span>
            {shiftTemplates.slice(0, 4).map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                id={`quick-template-${tmpl.id}`}
                onClick={() => handleApplyTemplate(tmpl)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#1e3a8a] dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                title={`Auto-fill ${tmpl.siteName} (${tmpl.startTime}-${tmpl.endTime})`}
              >
                <span>{tmpl.name}</span>
                <span className="text-[9px] text-slate-400 font-mono font-normal">
                  ({calculateHours(tmpl.startTime, tmpl.endTime)}h)
                </span>
              </button>
            ))}
            <button
              type="button"
              id="view-all-templates-btn"
              onClick={() => {
                setTemplateModalMode('select');
                setIsTemplateModalOpen(true);
              }}
              className="text-[11px] font-bold text-[#1e3a8a] dark:text-blue-400 hover:underline px-2 py-1 flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3 h-3" />
              More Templates...
            </button>
          </div>
        )}

        {/* Applied Template Notice Banner */}
        {appliedTemplateNotice && !showJsonImporter && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 px-3 py-2 rounded-lg text-xs flex items-center justify-between animate-in fade-in duration-200 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Form auto-filled from pattern: <strong>{appliedTemplateNotice}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAppliedTemplateNotice(null)}
              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 text-[11px] font-bold p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* JSON Importer Drawer */}
        {showJsonImporter ? (
          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl mb-4 border border-slate-800 animate-in fade-in duration-150">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-mono text-blue-300 font-bold uppercase">
                Paste JSON Shift Array
              </span>
              <button
                type="button"
                onClick={() => setJsonText(SAMPLE_JSON_SHIFTS)}
                className="text-[11px] font-mono text-slate-400 hover:text-white underline"
              >
                Reset Sample Schema
              </button>
            </div>
            <textarea
              rows={6}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full bg-slate-950 font-mono text-xs text-emerald-400 p-3 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {jsonError && (
              <p className="text-xs text-red-400 font-mono mt-1 whitespace-pre-wrap bg-red-950/60 p-2 rounded border border-red-800">
                {jsonError}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowJsonImporter(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                id="bulk-import-shifts-btn"
                type="button"
                onClick={handleImportJson}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-wider shadow-md"
              >
                Import Shift Array
              </button>
            </div>
          </div>
        ) : (
          /* Single Shift Creation Form (Posting Tools) */
          <form onSubmit={handleCreateSingleShift} className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <SiteSelectDropdown
                  id="ops-create-shift-site-select"
                  required
                  value={siteName}
                  onChange={(name, site) => {
                    setSiteName(name);
                    if (site) {
                      setAddress(site.address);
                      if (site.accessGateNotes && !location) {
                        setLocation(site.accessGateNotes);
                      }
                    }
                  }}
                  onAddressAutoPopulate={(addr) => {
                    setAddress(addr);
                  }}
                  label="Operational Facility / Site Name"
                  placeholder="Select facility from directory..."
                  helperText="Selecting a verified facility standardizes dispatch metrics and auto-fills coordinates"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#1e3a8a] dark:text-blue-400" />
                    Site Address (for Guard Commute) *
                  </span>
                  {address && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 normal-case">
                      <Sparkles className="w-3 h-3" /> Auto-populated
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500 Pike St, Seattle, WA 98101"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] dark:focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="min-w-0">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Shift Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] dark:focus:ring-blue-500"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] dark:focus:ring-blue-500"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] dark:focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Urgency Level
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] dark:focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="standard">Standard Priority</option>
                  <option value="emergency">Emergency (High Priority Dispatch)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Post Area / Specific Gate Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Building A - Main Guard Lobby"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] dark:focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Auto hours calculation alert banner with responsive flex wrapping */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                Auto-calculated Duration: <strong className="text-[#1e3a8a] dark:text-blue-400 font-bold font-mono">{calculatedHours} Hours</strong>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {urgency === 'emergency' ? '🚨 Flagged as Emergency Coverage' : 'Standard Routine Shift'}
              </span>
            </div>

            {/* Action Buttons: Post Shift + Save Form as Template */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <button
                id="post-shift-submit-btn"
                type="submit"
                className="flex-1 w-full bg-[#1e3a8a] dark:bg-blue-600 text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider shadow-md hover:bg-blue-900 dark:hover:bg-blue-700 active:bg-blue-950 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                POST TO OPEN BOARD
              </button>
              <button
                id="save-form-as-template-btn"
                type="button"
                onClick={() => {
                  setTemplateModalMode('create_from_form');
                  setIsTemplateModalOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                title="Save this site, hours, and configuration as a reusable template pattern"
              >
                <BookmarkPlus className="w-4 h-4 text-[#1e3a8a] dark:text-blue-400" />
                Save as Template
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. Active Shift Feed Table / List */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden min-h-0">
        {/* Table Toolbar & Global Search Bar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          {/* Top Row: Global Search Input & Quick Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Global Search Input */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="ops-shift-global-search-input"
                type="text"
                placeholder="Search shifts by site name, date (e.g. Aug 23), address, or guard assignment status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-blue-500 focus:border-[#1e3a8a] transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  title="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Quick Filter, Sort Order & Hide Filled Toggle */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Sort Order Dropdown */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 shadow-2xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#1e3a8a] dark:text-blue-400 shrink-0" />
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 hidden xl:inline">Sort:</span>
                <select
                  id="ops-shift-sort-select"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="text-xs font-bold text-[#1e3a8a] dark:text-blue-400 bg-transparent focus:outline-none cursor-pointer"
                  title="Sort shifts order"
                >
                  <option value="date_asc" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">📅 Date: Soonest to Furthest</option>
                  <option value="date_desc" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">📅 Date: Furthest to Soonest</option>
                  <option value="urgency" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">🚨 Urgency: Emergency First</option>
                  <option value="site_asc" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">🏢 Site Name (A-Z)</option>
                  <option value="bids_desc" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">⚡ Most Active Bids</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <input
                  id="ops-shift-date-filter"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="text-xs text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer"
                  title="Filter by exact date"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter('')}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                    title="Clear date filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Hide Filled Shifts Toggle */}
              <button
                id="hide-filled-toggle-btn"
                onClick={() => setHideFilledShifts(!hideFilledShifts)}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Toggle visibility of filled shifts"
              >
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Hide Filled</span>
                <div className={`w-7 h-4 rounded-full transition-colors relative ${hideFilledShifts ? 'bg-[#1e3a8a] dark:bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${hideFilledShifts ? 'left-3.5' : 'left-0.5'}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Bottom Row: Status Quick Pills & Results Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
            {/* Status Segment Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-0.5">
                <Filter className="w-3 h-3 text-slate-400" />
                Status:
              </span>

              {/* All */}
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'all'
                    ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>All Shifts</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  statusFilter === 'all' ? 'bg-blue-900 dark:bg-blue-800 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {shifts.length}
                </span>
              </button>

              {/* Open / Unassigned */}
              <button
                type="button"
                onClick={() => setStatusFilter('open')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'open'
                    ? 'bg-blue-700 dark:bg-blue-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Open / Unassigned</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  statusFilter === 'open' ? 'bg-blue-900 dark:bg-blue-800 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {openCount}
                </span>
              </button>

              {/* Filled / Assigned */}
              <button
                type="button"
                onClick={() => setStatusFilter('filled')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'filled'
                    ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Filled / Assigned</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  statusFilter === 'filled' ? 'bg-emerald-900 dark:bg-emerald-800 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {filledCount}
                </span>
              </button>

              {/* Emergency */}
              <button
                type="button"
                onClick={() => setStatusFilter('emergency')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'emergency'
                    ? 'bg-red-700 dark:bg-red-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>🚨 Emergency</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  statusFilter === 'emergency' ? 'bg-red-900 dark:bg-red-800 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {emergencyCount}
                </span>
              </button>

              {/* Has Active Bids */}
              <button
                id="filter-shifts-with-bids-btn"
                type="button"
                onClick={() => setStatusFilter('has_bids')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'has_bids'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-amber-500 shrink-0" />
                <span>Active Bids</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  statusFilter === 'has_bids' ? 'bg-slate-900 text-white' : 'bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-200'
                }`}>
                  {shiftsWithBidsCount}
                </span>
              </button>
            </div>

            {/* Results count, Auto-Fill Shifts, Review All Bids Button & Clear All Filter link */}
            <div className="flex items-center gap-2">
              <button
                id="autofill-shifts-toolbar-btn"
                type="button"
                onClick={() => {
                  setSelectedAutoFillShiftId(null);
                  setIsAutoFillModalOpen(true);
                }}
                className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                title="Auto-Fill open shifts with qualified guards using heuristic scoring"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
                <span>Auto-Fill</span>
                <span className="bg-emerald-700 dark:bg-emerald-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                  {openCount} Open
                </span>
              </button>

              <button
                id="review-all-bids-toolbar-btn"
                type="button"
                onClick={() => {
                  setSelectedBidsShiftId(null);
                  setIsBidsModalOpen(true);
                }}
                className="text-[11px] font-extrabold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                title="Open Master Guard Bids Queue across all shifts"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#1e3a8a] dark:text-blue-400" />
                <span>Review All Bids</span>
                <span className="bg-[#1e3a8a] dark:bg-blue-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                  {bids.length}
                </span>
              </button>

              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Showing <strong>{sortedShifts.length}</strong> of {shifts.length} shifts
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-700 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                  Reset Filters & Sort
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile View: Stacked Shift Cards (visible on screens smaller than md) */}
        <div className="md:hidden flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {sortedShifts.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="p-3 bg-blue-50 dark:bg-slate-800 text-[#1e3a8a] dark:text-blue-400 rounded-full mb-3 border border-blue-200 dark:border-slate-700 w-12 h-12 flex items-center justify-center mx-auto">
                <Search className="w-5 h-5 text-[#1e3a8a] dark:text-blue-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                No shifts match your search
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {searchQuery
                  ? `No records found for "${searchQuery}".`
                  : 'No shifts match the active filters.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="bg-[#1e3a8a] dark:bg-blue-600 hover:bg-blue-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            sortedShifts.map((shift) => {
              const isFilled = shift.status === 'filled';
              const shiftBids = bids.filter((b) => b.shiftId === shift.id);
              const bidCount = shiftBids.length > 0 ? shiftBids.length : (shift.bidsCount || 0);

              return (
                <div
                  key={shift.id}
                  id={`mobile-ops-shift-card-${shift.id}`}
                  className={`bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col gap-2.5 ${
                    isFilled ? 'opacity-70 bg-slate-50/70 dark:bg-slate-900/70' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{shift.siteName}</h4>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#1e3a8a] dark:text-blue-400 shrink-0" />
                        <span className="line-clamp-1">{shift.address || 'Address on file'}</span>
                      </div>
                    </div>
                    {shift.urgency === 'emergency' ? (
                      <span className="bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-red-200 dark:border-red-800 shrink-0">
                        Emergency
                      </span>
                    ) : (
                      <span className="bg-green-100 dark:bg-emerald-950/80 text-green-700 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-emerald-200 dark:border-emerald-800 shrink-0">
                        Standard
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-100 dark:border-slate-800 font-mono">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {formatDateLabel(shift.date)}
                    </span>
                    <span className="text-[#1e3a8a] dark:text-blue-400 font-bold">
                      {shift.startTime} - {shift.endTime} ({shift.hours}h)
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      {isFilled ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          <span>{shift.assignedGuardName || 'Assigned Guard'}</span>
                        </div>
                      ) : bidCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBidsShiftId(shift.id);
                            setIsBidsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-black text-[11px] border border-amber-300 dark:border-amber-700 cursor-pointer"
                        >
                          <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                          <span>{bidCount} Bid{bidCount !== 1 ? 's' : ''} (Award)</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">0 Bids (Open)</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isFilled && (
                        <button
                          type="button"
                          id={`mobile-autofill-btn-${shift.id}`}
                          onClick={() => {
                            setSelectedAutoFillShiftId(shift.id);
                            setIsAutoFillModalOpen(true);
                          }}
                          className="px-2 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 rounded-md cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Auto-Fill this shift using heuristic guard scoring"
                        >
                          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
                          <span>Auto-Fill</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBidsShiftId(shift.id);
                          setIsBidsModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-[#1e3a8a] dark:text-blue-400 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 border border-blue-200 dark:border-slate-700 rounded-md cursor-pointer flex items-center gap-1"
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>Bids</span>
                      </button>

                      {isFilled ? (
                        <button
                          type="button"
                          onClick={() => reopenShift(shift.id)}
                          className="px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#1e3a8a] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                        >
                          Reopen
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markShiftFilled(shift.id, 'Assigned via Ops')}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer shadow-2xs"
                        >
                          Fill
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteShift(shift.id)}
                        title="Delete shift"
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop/Tablet Table View (visible on md and up) */}
        <div className="hidden md:block flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/90 text-[10px] text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700 font-bold sticky top-0 z-10 select-none">
              <tr>
                <th 
                  className="px-4 py-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => setSortOption(sortOption === 'site_asc' ? 'date_asc' : 'site_asc')}
                  title="Click to sort by site name"
                >
                  <div className="flex items-center gap-1">
                    <span>Site & Location</span>
                    {sortOption === 'site_asc' ? (
                      <ArrowUp className="w-3 h-3 text-[#1e3a8a] dark:text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 py-2.5 cursor-pointer hover:bg-blue-50/80 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => setSortOption(sortOption === 'date_asc' ? 'date_desc' : 'date_asc')}
                  title="Click to toggle sorting: Soonest vs Furthest date"
                >
                  <div className="flex items-center gap-1">
                    <span className={sortOption === 'date_asc' || sortOption === 'date_desc' ? 'text-[#1e3a8a] dark:text-blue-400 font-black' : ''}>
                      Schedule
                    </span>
                    {sortOption === 'date_asc' && (
                      <span className="text-[9px] text-[#1e3a8a] dark:text-blue-300 font-mono bg-blue-100 dark:bg-blue-950/70 px-1 rounded flex items-center gap-0.5">
                        Soonest <ArrowUp className="w-2.5 h-2.5" />
                      </span>
                    )}
                    {sortOption === 'date_desc' && (
                      <span className="text-[9px] text-[#1e3a8a] dark:text-blue-300 font-mono bg-blue-100 dark:bg-blue-950/70 px-1 rounded flex items-center gap-0.5">
                        Furthest <ArrowDown className="w-2.5 h-2.5" />
                      </span>
                    )}
                    {sortOption !== 'date_asc' && sortOption !== 'date_desc' && (
                      <ArrowUpDown className="w-2.5 h-2.5 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => setSortOption(sortOption === 'urgency' ? 'date_asc' : 'urgency')}
                  title="Click to sort emergency shifts first"
                >
                  <div className="flex items-center gap-1">
                    <span>Urgency</span>
                    {sortOption === 'urgency' ? (
                      <ArrowUp className="w-3 h-3 text-red-600 dark:text-red-400" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-2.5">Guard Assignment</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedShifts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 px-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center">
                      <div className="p-3 bg-blue-50 dark:bg-slate-800 text-[#1e3a8a] dark:text-blue-400 rounded-full mb-3 border border-blue-200 dark:border-slate-700">
                        <Search className="w-6 h-6 text-[#1e3a8a] dark:text-blue-400" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                        No shifts match your search criteria
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        {searchQuery
                          ? `No records found matching "${searchQuery}". Try searching by site name, date (e.g. Aug 23), address, or assignment status ("open" / "filled").`
                          : 'No shifts match the active status or date filters.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="bg-[#1e3a8a] dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Clear Search & Show All Shifts
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedShifts.map((shift) => {
                  const isFilled = shift.status === 'filled';
                  return (
                    <tr
                      key={shift.id}
                      id={`ops-shift-row-${shift.id}`}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                        isFilled ? 'bg-slate-50/60 dark:bg-slate-900/60 opacity-60' : ''
                      }`}
                    >
                      {/* Site & Address */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 dark:text-slate-100">{shift.siteName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#1e3a8a] dark:text-blue-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{shift.address || 'Address on file'}</span>
                        </div>
                      </td>

                      {/* Schedule & Duration */}
                      <td className="px-3 py-3">
                        <div className="font-mono font-bold text-slate-700 dark:text-slate-200">
                          {shift.hours}h ({shift.startTime} - {shift.endTime})
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {formatDateLabel(shift.date)}
                        </div>
                      </td>

                      {/* Urgency */}
                      <td className="px-3 py-3">
                        {shift.urgency === 'emergency' ? (
                          <span className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-red-200 dark:border-red-800">
                            Emergency
                          </span>
                        ) : (
                          <span className="bg-green-100 dark:bg-emerald-950/60 text-green-700 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-emerald-200 dark:border-emerald-800">
                            Standard
                          </span>
                        )}
                      </td>

                      {/* Assigned Guard */}
                      <td className="px-4 py-3">
                        {(() => {
                          const shiftBids = bids.filter((b) => b.shiftId === shift.id);
                          const bidCount = shiftBids.length > 0 ? shiftBids.length : (shift.bidsCount || 0);

                          if (isFilled) {
                            return (
                              <div className="flex flex-col items-start">
                                <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>{shift.assignedGuardName || 'Assigned Guard'}</span>
                                </span>
                                {bidCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedBidsShiftId(shift.id);
                                      setIsBidsModalOpen(true);
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:underline flex items-center gap-1 mt-0.5 cursor-pointer font-medium"
                                    title="View guard bids received prior to assignment"
                                  >
                                    <UserCheck className="w-2.5 h-2.5" />
                                    <span>{bidCount} bid record{bidCount !== 1 ? 's' : ''} on file</span>
                                  </button>
                                )}
                              </div>
                            );
                          }

                          if (bidCount > 0) {
                            return (
                              <button
                                type="button"
                                id={`view-bids-for-shift-${shift.id}`}
                                onClick={() => {
                                  setSelectedBidsShiftId(shift.id);
                                  setIsBidsModalOpen(true);
                                }}
                                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300/80 dark:border-amber-800 text-amber-950 dark:text-amber-200 font-bold text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                                title="Click to view candidate bids and award shift"
                              >
                                <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500 group-hover:scale-110 transition-transform shrink-0" />
                                <span>{bidCount} Active Bid{bidCount !== 1 ? 's' : ''}</span>
                                <span className="text-[10px] bg-amber-200/90 dark:bg-amber-900 group-hover:bg-amber-300 text-amber-950 dark:text-amber-200 px-1.5 py-0.2 rounded font-extrabold uppercase ml-0.5">
                                  Review & Award
                                </span>
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBidsShiftId(shift.id);
                                setIsBidsModalOpen(true);
                              }}
                              className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 italic text-xs hover:underline flex items-center gap-1 cursor-pointer"
                              title="Open bids queue for this shift"
                            >
                              <span>0 Bids (Open)</span>
                            </button>
                          );
                        })()}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Auto-Fill Shift via Heuristic Engine */}
                          {!isFilled && (
                            <button
                              id={`action-autofill-shift-${shift.id}`}
                              type="button"
                              onClick={() => {
                                setSelectedAutoFillShiftId(shift.id);
                                setIsAutoFillModalOpen(true);
                              }}
                              className="text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-100 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Auto-Fill this shift using heuristic guard scoring"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
                              <span>Auto-Fill</span>
                            </button>
                          )}

                          {/* View Bids Action Button */}
                          <button
                            id={`action-view-bids-${shift.id}`}
                            type="button"
                            onClick={() => {
                              setSelectedBidsShiftId(shift.id);
                              setIsBidsModalOpen(true);
                            }}
                            className="text-slate-600 dark:text-slate-300 hover:text-[#1e3a8a] dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-blue-200 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="View Guard Bids for this shift"
                          >
                            <UserCheck className="w-3 h-3 text-[#1e3a8a] dark:text-blue-400" />
                            <span className="hidden sm:inline">Bids</span>
                            <span className="font-mono text-[10px]">
                              ({bids.filter(b => b.shiftId === shift.id).length || shift.bidsCount || 0})
                            </span>
                          </button>

                          {isFilled ? (
                            <button
                              id={`reopen-shift-btn-${shift.id}`}
                              onClick={() => reopenShift(shift.id)}
                              className="text-slate-600 dark:text-slate-400 hover:text-[#1e3a8a] dark:hover:text-blue-400 font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reopen
                            </button>
                          ) : (
                            <button
                              id={`mark-filled-shift-btn-${shift.id}`}
                              onClick={() => markShiftFilled(shift.id, 'Assigned via Ops')}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Mark Filled
                            </button>
                          )}

                          <button
                            onClick={() => deleteShift(shift.id)}
                            title="Delete shift"
                            className="text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift Template Modal */}
      <ShiftTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onApplyTemplate={handleApplyTemplate}
        initialMode={templateModalMode}
        currentFormData={{
          siteName,
          address,
          location,
          startTime,
          endTime,
          urgency,
          notes
        }}
      />

      {/* Shift Bids & Candidate Assignment Modal */}
      <ShiftBidsModal
        isOpen={isBidsModalOpen}
        onClose={() => {
          setIsBidsModalOpen(false);
          setSelectedBidsShiftId(null);
        }}
        selectedShiftId={selectedBidsShiftId}
        onSelectShiftId={(newShiftId) => setSelectedBidsShiftId(newShiftId || null)}
      />

      {/* Auto-Fill Shifts Heuristic Engine Modal */}
      <AutoFillShiftsModal
        isOpen={isAutoFillModalOpen}
        onClose={() => {
          setIsAutoFillModalOpen(false);
          setSelectedAutoFillShiftId(null);
        }}
        initialShiftId={selectedAutoFillShiftId}
      />
    </div>
  );
};

