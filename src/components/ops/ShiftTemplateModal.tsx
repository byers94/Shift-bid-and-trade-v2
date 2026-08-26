import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ShiftTemplate } from '../../types/shift';
import { calculateHours } from '../../utils/time';
import { SiteSelectDropdown } from '../common/SiteSelectDropdown';
import {
  Bookmark,
  BookmarkPlus,
  Clock,
  MapPin,
  Building2,
  Trash2,
  Check,
  X,
  Search,
  Sparkles,
  Zap,
  Calendar,
  AlertTriangle,
  Plus,
  Layers
} from 'lucide-react';

interface ShiftTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: ShiftTemplate) => void;
  currentFormData?: {
    siteName: string;
    address: string;
    location: string;
    startTime: string;
    endTime: string;
    urgency: 'standard' | 'emergency';
    notes: string;
    requiredCertifications?: string[];
  };
  initialMode?: 'select' | 'create_from_form' | 'create_new';
}

export const ShiftTemplateModal: React.FC<ShiftTemplateModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
  currentFormData,
  initialMode = 'select',
}) => {
  const { shiftTemplates, addShiftTemplate, deleteShiftTemplate } = useShiftOps();
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>(
    initialMode === 'select' ? 'browse' : 'create'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for creating a new template
  const [templateName, setTemplateName] = useState(
    currentFormData?.siteName
      ? `${currentFormData.siteName} (${currentFormData.startTime || '08:00'} - ${currentFormData.endTime || '16:00'})`
      : 'Weekday Standard Shift (0800 - 1600)'
  );
  const [daysPattern, setDaysPattern] = useState('Mon - Fri');
  const [customDays, setCustomDays] = useState('');
  const [siteName, setSiteName] = useState(currentFormData?.siteName || 'Corporate HQ');
  const [address, setAddress] = useState(currentFormData?.address || '100 Enterprise Way, Suite 400');
  const [location, setLocation] = useState(currentFormData?.location || 'Main Security Post');
  const [startTime, setStartTime] = useState(currentFormData?.startTime || '08:00');
  const [endTime, setEndTime] = useState(currentFormData?.endTime || '16:00');
  const [urgency, setUrgency] = useState<'standard' | 'emergency'>(
    currentFormData?.urgency || 'standard'
  );
  const [notes, setNotes] = useState(currentFormData?.notes || '');
  const [certsString, setCertsString] = useState(
    currentFormData?.requiredCertifications?.join(', ') || 'Access Control, Customer Service'
  );

  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);

  if (!isOpen) return null;

  const durationHours = calculateHours(startTime, endTime);

  const filteredTemplates = shiftTemplates.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.siteName.toLowerCase().includes(q) ||
      (t.daysPattern && t.daysPattern.toLowerCase().includes(q)) ||
      (t.location && t.location.toLowerCase().includes(q)) ||
      `${t.startTime}-${t.endTime}`.includes(q)
    );
  });

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !siteName.trim()) return;

    const certList = certsString
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const finalDaysPattern = daysPattern === 'Custom' ? customDays.trim() || 'Custom' : daysPattern;

    const newTmpl = addShiftTemplate({
      name: templateName.trim(),
      daysPattern: finalDaysPattern,
      siteName: siteName.trim(),
      address: address.trim() || undefined,
      location: location.trim() || undefined,
      startTime,
      endTime,
      urgency,
      notes: notes.trim() || undefined,
      requiredCertifications: certList.length > 0 ? certList : undefined,
    });

    // Auto apply the newly created template and close
    onApplyTemplate(newTmpl);
    onClose();
  };

  const handleSelectAndApply = (template: ShiftTemplate) => {
    setAppliedTemplateId(template.id);
    setTimeout(() => {
      onApplyTemplate(template);
      onClose();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="shift-templates-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-[#1e3a8a] text-white p-4.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-800/80 rounded-lg text-blue-200 border border-blue-700/50">
              <Bookmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-wide">
                  Recurring Shift Templates
                </h3>
                <span className="text-[10px] font-mono uppercase bg-blue-900/90 text-blue-200 px-2 py-0.5 rounded-full border border-blue-700/60">
                  {shiftTemplates.length} Available
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Save & auto-fill standard operational shifts with one click
              </p>
            </div>
          </div>
          <button
            id="close-template-modal-btn"
            type="button"
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-blue-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-4 pt-2.5 gap-2 shrink-0">
          <button
            id="tab-browse-templates"
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'browse'
                ? 'bg-white text-[#1e3a8a] border-[#1e3a8a] shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Select & Auto-Fill Template ({shiftTemplates.length})</span>
          </button>

          <button
            id="tab-create-template"
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'create'
                ? 'bg-white text-[#1e3a8a] border-[#1e3a8a] shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Save New Template Pattern</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'browse' ? (
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="search-templates-input"
                  type="text"
                  placeholder="Search templates by name, site, hours (e.g. 0800), or day pattern..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Template Cards List */}
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700 mb-1">No templates found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    {searchQuery
                      ? `No shift templates match "${searchQuery}". Try a different term or clear the search.`
                      : 'You do not have any saved shift templates yet.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a8a] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create First Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredTemplates.map((template) => {
                    const hours = calculateHours(template.startTime, template.endTime);
                    const isSelected = appliedTemplateId === template.id;

                    return (
                      <div
                        key={template.id}
                        id={`template-card-${template.id}`}
                        className={`group relative p-3.5 rounded-xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400'
                            : 'bg-white hover:bg-blue-50/40 border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-xs'
                        }`}
                      >
                        {/* Left: Template Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-black text-sm text-slate-900 group-hover:text-[#1e3a8a] transition-colors">
                              {template.name}
                            </span>
                            {template.daysPattern && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {template.daysPattern}
                              </span>
                            )}
                            {template.urgency === 'emergency' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Emergency
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                Standard
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5 truncate">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <strong className="text-slate-800 font-semibold">{template.siteName}</strong>
                              {template.location && (
                                <span className="text-slate-500 text-[11px] truncate">
                                  ({template.location})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#1e3a8a] shrink-0" />
                              <span className="font-mono font-bold text-slate-800">
                                {template.startTime} - {template.endTime}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({hours} hrs)
                              </span>
                            </div>

                            {template.address && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate sm:col-span-2">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{template.address}</span>
                              </div>
                            )}

                            {template.notes && (
                              <div className="text-[11px] text-slate-500 italic truncate sm:col-span-2 mt-0.5">
                                "{template.notes}"
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => deleteShiftTemplate(template.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            id={`apply-template-btn-${template.id}`}
                            type="button"
                            onClick={() => handleSelectAndApply(template)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#1e3a8a] hover:bg-blue-900 text-white active:scale-95'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Applied!
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5" />
                                Auto-Fill Form
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Create New Template Form */
            <form onSubmit={handleCreateTemplate} className="flex flex-col gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#1e3a8a] shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900">
                  <strong className="font-bold">Template Pattern Creator:</strong> Define standard
                  site details, timing schedules, and post requirements. Once saved, you can
                  populate open shifts instantly.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Template Label */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Template Name / Pattern Title *
                  </label>
                  <input
                    id="new-template-name-input"
                    type="text"
                    required
                    placeholder="e.g. Mon-Fri 0800-1600 Corporate Day Patrol"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                {/* Days Schedule Pattern */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#1e3a8a]" />
                    Recurring Days Pattern
                  </label>
                  <select
                    value={daysPattern}
                    onChange={(e) => setDaysPattern(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="Mon - Fri">Mon - Fri (Weekdays)</option>
                    <option value="Sat - Sun">Sat - Sun (Weekends)</option>
                    <option value="Daily">Daily (7 Days / Week)</option>
                    <option value="Mon - Sat">Mon - Sat</option>
                    <option value="Fri - Sun">Fri - Sun Night</option>
                    <option value="Custom">Custom Days...</option>
                  </select>
                  {daysPattern === 'Custom' && (
                    <input
                      type="text"
                      placeholder="e.g. Tue, Thu, Sat"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      className="mt-1.5 w-full border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    />
                  )}
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Default Priority / Urgency
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="standard">Standard Routine Shift</option>
                    <option value="emergency">Emergency (High Priority Dispatch)</option>
                  </select>
                </div>

                {/* Site Name Dropdown */}
                <div>
                  <SiteSelectDropdown
                    id="template-site-select"
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
                    label="Authorized Facility / Site *"
                    placeholder="Select facility from directory..."
                  />
                </div>

                {/* Post Location */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Post Area / Gate Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Lobby & Access Gate"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#1e3a8a]" />
                      Site Physical Address
                    </span>
                    {address && (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 normal-case">
                        <Sparkles className="w-3 h-3" /> Auto-populated
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100 Enterprise Way, Suite 400"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                {/* Start Time & End Time */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#1e3a8a]" />
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#1e3a8a]" />
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                {/* Duration indicator */}
                <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">
                    Calculated Pattern Hours:
                  </span>
                  <strong className="text-[#1e3a8a] font-mono font-bold">
                    {durationHours} Hours / Shift
                  </strong>
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Standard Post Notes & Duties
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Main executive lobby access control, visitor badge check-in..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Back to List
                </button>
                <button
                  id="save-template-submit-btn"
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#1e3a8a] hover:bg-blue-900 rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  Save & Apply Template
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {activeTab === 'browse'
              ? 'Click "Auto-Fill Form" to transfer all template values directly into the shift creation form.'
              : 'Saved patterns are immediately available in the quick template toolbar.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
