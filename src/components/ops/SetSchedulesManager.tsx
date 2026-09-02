import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  SetSchedule, 
  DayOfWeek, 
  RovingGroup, 
  ROVING_GROUPS, 
  ROVING_GROUP_CONFIGS,
  DAYS_OF_WEEK,
  DAY_NAMES
} from '../../types/shift';
import { calculateHours } from '../../utils/time';
import { 
  Calendar, 
  Clock, 
  User, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  Car, 
  Building2, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Filter, 
  Search, 
  Play, 
  RefreshCw, 
  X, 
  ChevronRight, 
  Award,
  ArrowRight,
  Send,
  HelpCircle,
  Bell,
  Check
} from 'lucide-react';

interface SetSchedulesManagerProps {
  onOpenCalendar?: () => void;
}

export const SetSchedulesManager: React.FC<SetSchedulesManagerProps> = ({ onOpenCalendar }) => {
  const { 
    setSchedules, 
    guardsList, 
    sitesList, 
    rovers,
    addSetSchedule, 
    updateSetSchedule, 
    deleteSetSchedule, 
    toggleSetScheduleActive,
    assignGuardToSetSchedule,
    generateSchedulesFromSetTemplates,
    getSetScheduleAiSuggestions,
    timeOffRequests,
    showToast
  } = useShiftOps();

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'static' | 'roving'>('all');
  const [filterDay, setFilterDay] = useState<string>('all');
  const [filterAssigned, setFilterAssigned] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedScheduleForAi, setSelectedScheduleForAi] = useState<SetSchedule | null>(null);

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateDaysAhead, setGenerateDaysAhead] = useState<number>(7);
  const [generateAutoBidding, setGenerateAutoBidding] = useState<boolean>(true);
  const [generateRespectTimeOff, setGenerateRespectTimeOff] = useState<boolean>(true);
  const [generationResult, setGenerationResult] = useState<{
    generatedCount: number;
    unassignedCount: number;
    timeOffConflictsCount: number;
  } | null>(null);

  // Form states for Create/Edit Set Schedule
  const [formName, setFormName] = useState('');
  const [formScheduleType, setFormScheduleType] = useState<'static' | 'roving'>('static');
  const [formSiteName, setFormSiteName] = useState(sitesList[0]?.name || 'Port Authority - Pier 7');
  const [formRovingGroup, setFormRovingGroup] = useState<RovingGroup>('Metro');
  const [formSelectedDays, setFormSelectedDays] = useState<DayOfWeek[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('16:00');
  const [formPostRole, setFormPostRole] = useState('Main Post Access Control');
  const [formInstructions, setFormInstructions] = useState('Enforce strict access control, verify visitor credentials, and log hourly status.');
  const [formRequiredCerts, setFormRequiredCerts] = useState<string[]>(['TWIC Card']);
  const [formNewCert, setFormNewCert] = useState('');
  const [formAssignedGuardId, setFormAssignedGuardId] = useState<string>('');
  const [formNotes, setFormNotes] = useState('');

  const calculatedFormHours = calculateHours(formStartTime, formEndTime);

  // Day toggles helper
  const handleToggleDay = (day: DayOfWeek) => {
    if (formSelectedDays.includes(day)) {
      if (formSelectedDays.length === 1) {
        showToast('Selection Notice', 'A schedule must have at least one active day.', 'info');
        return;
      }
      setFormSelectedDays(formSelectedDays.filter(d => d !== day));
    } else {
      setFormSelectedDays([...formSelectedDays, day].sort((a, b) => a - b));
    }
  };

  const handleApplyDayPreset = (preset: 'weekdays' | 'weekends' | 'all' | '4x10_mon_thu') => {
    if (preset === 'weekdays') setFormSelectedDays([1, 2, 3, 4, 5]);
    if (preset === 'weekends') setFormSelectedDays([6, 0]);
    if (preset === 'all') setFormSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    if (preset === '4x10_mon_thu') {
      setFormSelectedDays([1, 2, 3, 4]);
      setFormStartTime('07:00');
      setFormEndTime('17:00');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingScheduleId(null);
    setFormName('');
    setFormScheduleType('static');
    setFormSiteName(sitesList[0]?.name || 'Port Authority - Pier 7');
    setFormRovingGroup('Metro');
    setFormSelectedDays([1, 2, 3, 4, 5]);
    setFormStartTime('08:00');
    setFormEndTime('16:00');
    setFormPostRole('Main Access Control & Visitor Screening');
    setFormInstructions('Maintain security perimeter and verify site credentials.');
    setFormRequiredCerts(['TWIC Card']);
    setFormAssignedGuardId('');
    setFormNotes('');
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (schedule: SetSchedule) => {
    setEditingScheduleId(schedule.id);
    setFormName(schedule.name || schedule.title || '');
    setFormScheduleType(schedule.isRoving ? 'roving' : 'static');
    setFormSiteName(schedule.siteName);
    setFormRovingGroup(schedule.rovingGroup || 'Metro');
    setFormSelectedDays(schedule.daysOfWeek);
    setFormStartTime(schedule.startTime);
    setFormEndTime(schedule.endTime);
    setFormPostRole(schedule.postRole);
    setFormInstructions(schedule.postInstructions || '');
    setFormRequiredCerts(schedule.requiredCertifications || []);
    setFormAssignedGuardId(schedule.assignedGuardId || '');
    setFormNotes(schedule.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (formSelectedDays.length === 0) {
      showToast('Validation Error', 'Please select at least one day of the week.', 'warning');
      return;
    }

    const assignedGuard = guardsList.find(g => g.id === formAssignedGuardId);

    if (formScheduleType === 'roving') {
      const associatedRover = rovers.find(r => r.rovingGroup === formRovingGroup) || rovers[0];
      const defaultName = formName.trim() || `${formRovingGroup} Set Patrol (${formStartTime}-${formEndTime})`;

      const payload = {
        name: defaultName,
        siteId: `MPU-${formRovingGroup.replace(/\s+/g, '-').toUpperCase()}`,
        siteName: `${formRovingGroup} Mobile Patrol Circuit`,
        siteAddress: ROVING_GROUP_CONFIGS[formRovingGroup]?.zone || 'Mobile Patrol Territory',
        daysOfWeek: formSelectedDays,
        startTime: formStartTime,
        endTime: formEndTime,
        hours: calculatedFormHours,
        isRoving: true,
        rovingGroup: formRovingGroup,
        assignedRoverUnit: associatedRover?.unitNumber || 'MPU-1 (Metro)',
        assignedGuardId: assignedGuard?.id,
        assignedGuardName: assignedGuard?.name,
        assignedGuardBadge: assignedGuard?.badgeNumber,
        postRole: formPostRole || `🚗 Mobile Patrol Driver • ${associatedRover?.unitNumber || 'MPU'}`,
        postInstructions: formInstructions,
        requiredCertifications: formRequiredCerts,
        isActive: true,
        notes: formNotes
      };

      if (editingScheduleId) {
        updateSetSchedule(editingScheduleId, payload);
        showToast('Set Schedule Updated', `Updated recurring template "${defaultName}".`, 'success');
      } else {
        addSetSchedule(payload);
        showToast('Set Schedule Created', `Created recurring schedule "${defaultName}".`, 'success');
      }
    } else {
      const site = sitesList.find(s => s.name === formSiteName);
      const defaultName = formName.trim() || `${formSiteName} (${formStartTime}-${formEndTime})`;

      const payload = {
        name: defaultName,
        siteId: site?.id || 'site-custom',
        siteName: formSiteName,
        siteAddress: site?.address || 'Site Facility Address',
        daysOfWeek: formSelectedDays,
        startTime: formStartTime,
        endTime: formEndTime,
        hours: calculatedFormHours,
        isRoving: false,
        assignedGuardId: assignedGuard?.id,
        assignedGuardName: assignedGuard?.name,
        assignedGuardBadge: assignedGuard?.badgeNumber,
        postRole: formPostRole || 'Standard Post Assignment',
        postInstructions: formInstructions,
        requiredCertifications: formRequiredCerts,
        isActive: true,
        notes: formNotes
      };

      if (editingScheduleId) {
        updateSetSchedule(editingScheduleId, payload);
        showToast('Set Schedule Updated', `Updated recurring template "${defaultName}".`, 'success');
      } else {
        addSetSchedule(payload);
        showToast('Set Schedule Created', `Created recurring schedule "${defaultName}".`, 'success');
      }
    }

    setIsEditModalOpen(false);
  };

  const handleOpenAiModal = (schedule: SetSchedule) => {
    setSelectedScheduleForAi(schedule);
    setIsAiModalOpen(true);
  };

  const handleAssignFromAi = (guardId: string) => {
    if (!selectedScheduleForAi) return;
    assignGuardToSetSchedule(selectedScheduleForAi.id, guardId);
    setIsAiModalOpen(false);
    setSelectedScheduleForAi(null);
  };

  const handleRunGeneration = () => {
    const today = new Date();
    const startDateStr = today.toISOString().split('T')[0];
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + generateDaysAhead);
    const endDateStr = endDate.toISOString().split('T')[0];

    const result = generateSchedulesFromSetTemplates({
      startDate: startDateStr,
      endDate: endDateStr,
      autoPushUnassignedToBiddingQueue: generateAutoBidding,
      respectGuardTimeOffRequests: generateRespectTimeOff
    });

    setGenerationResult({
      generatedCount: (result.generatedShifts || result.assignedShifts || []).length + (result.openShifts || []).length,
      unassignedCount: (result.unassignedPushedToBidding || result.openShifts || []).length,
      timeOffConflictsCount: (result.timeOffConflicts || result.timeOffReplacementEntries || []).length
    });
  };

  // Filtered list of set schedules
  const filteredSchedules = setSchedules.filter(s => {
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !q ||
      (s.name || s.title || '').toLowerCase().includes(q) ||
      (s.siteName || '').toLowerCase().includes(q) ||
      (s.assignedGuardName && s.assignedGuardName.toLowerCase().includes(q));

    const matchesType = 
      filterType === 'all' ? true : filterType === 'roving' ? s.isRoving : !s.isRoving;

    const matchesDay = 
      filterDay === 'all' ? true : s.daysOfWeek.includes(parseInt(filterDay, 10) as DayOfWeek);

    const matchesAssigned = 
      filterAssigned === 'all' 
        ? true 
        : filterAssigned === 'assigned' 
        ? !!s.assignedGuardId 
        : !s.assignedGuardId;

    return matchesSearch && matchesType && matchesDay && matchesAssigned;
  });

  const totalAssigned = setSchedules.filter(s => !!s.assignedGuardId).length;
  const totalUnassigned = setSchedules.filter(s => !s.assignedGuardId).length;
  const activeTemplatesCount = setSchedules.filter(s => s.isActive).length;

  return (
    <div className="space-y-4">
      {/* Top Banner with Action Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Set & Long-Term Schedules
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                  {setSchedules.length} Templates
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage standing recurring shifts for sites and mobile patrol circuits with AI guard auto-fit.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {/* Quick Metrics */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Assigned: <strong>{totalAssigned}</strong></span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Bidding Queue: <strong>{totalUnassigned}</strong></span>
            </div>
          </div>

          {/* Create New Set Schedule Button */}
          <button
            id="create-set-schedule-btn"
            type="button"
            onClick={handleOpenCreateModal}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Set Schedule</span>
          </button>

          {/* Generate Shifts to Calendar Button */}
          <button
            id="generate-set-schedules-btn"
            type="button"
            onClick={() => {
              setGenerationResult(null);
              setIsGenerateModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-200 fill-emerald-100/30" />
            <span>Generate to Calendar</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search set schedules by site, name, or guard..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Shift Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
          >
            <option value="all">All Types (Fixed & Mobile)</option>
            <option value="static">Fixed Site Posts</option>
            <option value="roving">Mobile Patrol Circuits</option>
          </select>

          {/* Day of Week Filter */}
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
          >
            <option value="all">All Days</option>
            {DAYS_OF_WEEK.map(d => (
              <option key={d.day} value={d.day.toString()}>{d.name}</option>
            ))}
          </select>

          {/* Assigned Status Filter */}
          <select
            value={filterAssigned}
            onChange={(e) => setFilterAssigned(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
          >
            <option value="all">All Assignments</option>
            <option value="assigned">Assigned to Guard</option>
            <option value="unassigned">Open / Unassigned (Bidding)</option>
          </select>
        </div>
      </div>

      {/* List of Set Schedules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredSchedules.map((schedule) => {
          const assignedGuard = guardsList.find(g => g.id === schedule.assignedGuardId);
          const aiSuggestions = getSetScheduleAiSuggestions(schedule.id);
          const topAiMatch = aiSuggestions[0];

          return (
            <div
              key={schedule.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                schedule.isActive
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-md'
                  : 'bg-slate-900/50 border-slate-800/60 opacity-60'
              }`}
            >
              <div>
                {/* Header with Type, Days & Active Toggle */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      schedule.isRoving
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}>
                      {schedule.isRoving ? `🚗 ${schedule.rovingGroup || 'Roving'}` : '🏢 Static Site'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-semibold">
                      {schedule.hours}h ({schedule.startTime} - {schedule.endTime})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSetScheduleActive(schedule.id)}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                      schedule.isActive
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {schedule.isActive ? 'Active Template' : 'Paused'}
                  </button>
                </div>

                {/* Schedule Title & Location */}
                <h3 className="text-sm font-bold text-white line-clamp-1 mb-1">
                  {schedule.name || schedule.title || 'Standing Schedule'}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-2.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{schedule.siteName}</span>
                </p>

                {/* Days of Week Badges */}
                <div className="flex items-center gap-1 mb-3">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = schedule.daysOfWeek.includes(d.day);
                    return (
                      <span
                        key={d.day}
                        className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center font-mono ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-950 text-slate-600 border border-slate-800/80'
                        }`}
                        title={d.name}
                      >
                        {d.short[0]}
                      </span>
                    );
                  })}
                  <span className="text-[11px] text-slate-400 ml-1.5 font-medium">
                    {schedule.daysOfWeek.length === 7 ? 'Everyday' : `${schedule.daysOfWeek.length} days/wk`}
                  </span>
                </div>

                {/* Role and Instructions */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-850 mb-3 space-y-1 text-xs">
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>{schedule.postRole}</span>
                  </div>
                  {schedule.postInstructions && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                      "{schedule.postInstructions}"
                    </p>
                  )}
                </div>

                {/* Required Certifications */}
                {schedule.requiredCertifications && schedule.requiredCertifications.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mb-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Certs:</span>
                    {schedule.requiredCertifications.map(cert => (
                      <span key={cert} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                        {cert}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Guard Assignment Card / AI Auto-Fill Recommendation */}
              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                {assignedGuard ? (
                  <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-900/80 border border-blue-700 flex items-center justify-center font-black text-xs text-blue-200">
                        {assignedGuard.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{assignedGuard.name}</span>
                          <span className="text-[10px] font-mono text-blue-300">({assignedGuard.badgeNumber})</span>
                        </div>
                        <div className="text-[10px] text-blue-300/80">
                          Regular Long-Term Assigned Officer
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAiModal(schedule)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-blue-300 text-xs transition-colors"
                      title="Change guard or view AI auto-fill matches"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-300" />
                        <span>Unassigned (Bidding Queue)</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {topAiMatch ? `AI Top Match: ${topAiMatch.guardName || topAiMatch.guard?.name} (${topAiMatch.suitabilityScore || topAiMatch.fitScore}% fit)` : 'Open for guard claims'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAiModal(schedule)}
                      className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-slate-950" />
                      <span>AI Match</span>
                    </button>
                  </div>
                )}

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(schedule)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit schedule template"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete set schedule template "${schedule.name || schedule.title || 'Schedule'}"?`)) {
                          deleteSetSchedule(schedule.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Delete schedule template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAiModal(schedule)}
                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Inspect AI Fit</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSchedules.length === 0 && (
        <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Set Schedules Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search criteria or create a new set schedule template for recurring site posts or MPU circuits.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Set Schedule
          </button>
        </div>
      )}

      {/* 1. Modal: Create / Edit Set Schedule */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {editingScheduleId ? 'Edit Set Schedule Template' : 'Create Recurring Set Schedule'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Defines standing recurring shift patterns for automated calendar generation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              {/* Type Switcher: Static Site vs Roving Circuit */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormScheduleType('static')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                    formScheduleType === 'static'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Static Site Post</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormScheduleType('roving')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                    formScheduleType === 'roving'
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  <Car className="w-4 h-4" />
                  <span>Mobile Patrol Circuit</span>
                </button>
              </div>

              {/* Template Name & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Template Display Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Pier 7 Day Shift (Mon-Fri)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {formScheduleType === 'static' ? (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Customer Facility / Site
                    </label>
                    <select
                      value={formSiteName}
                      onChange={(e) => setFormSiteName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {sitesList.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Mobile Patrol Sector
                    </label>
                    <select
                      value={formRovingGroup}
                      onChange={(e) => setFormRovingGroup(e.target.value as RovingGroup)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {ROVING_GROUPS.map(rg => (
                        <option key={rg} value={rg}>{rg} ({ROVING_GROUP_CONFIGS[rg]?.zone})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Days of Week Selector with Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">
                    Recurring Days of the Week
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleApplyDayPreset('weekdays')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      Mon-Fri
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDayPreset('weekends')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      Sat-Sun
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDayPreset('4x10_mon_thu')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      4x10 (Mon-Thu)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDayPreset('all')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      All 7
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = formSelectedDays.includes(d.day);
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => handleToggleDay(d.day)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                        }`}
                      >
                        <div>{d.short}</div>
                        <div className="text-[9px] opacity-75 font-mono">{isSelected ? '✓' : '-'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shift Start/End Time and Calculated Hours */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Duration
                  </label>
                  <div className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-blue-300 font-mono font-bold">
                    {calculatedFormHours} Hours
                  </div>
                </div>
              </div>

              {/* Assigned Officer Selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Regular Assigned Officer (or Leave Unassigned for Bidding Queue)
                </label>
                <select
                  value={formAssignedGuardId}
                  onChange={(e) => setFormAssignedGuardId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">⚡ Unassigned (Auto-Populate to Shift Bidding Queue)</option>
                  {guardsList.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.badgeNumber}) — {g.role.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Post Role & Instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Post Role / Title
                  </label>
                  <input
                    type="text"
                    value={formPostRole}
                    onChange={(e) => setFormPostRole(e.target.value)}
                    placeholder="e.g. Access Control & Gate Inspection"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Post Instructions
                  </label>
                  <input
                    type="text"
                    value={formInstructions}
                    onChange={(e) => setFormInstructions(e.target.value)}
                    placeholder="e.g. Verify all dock passes and maintain radio contact"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingScheduleId ? 'Save Changes' : 'Create Template'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: AI Suggestions & Guard Auto-Fill */}
      {isAiModalOpen && selectedScheduleForAi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    AI Guard Match Suggestions
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                      Heuristic Fit Engine
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Evaluating availability, certifications, rest buffers, and weekly hours for "{selectedScheduleForAi.name || selectedScheduleForAi.title}".
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAiModalOpen(false);
                  setSelectedScheduleForAi(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Schedule Summary Banner */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-white">{selectedScheduleForAi.siteName}</span>
                <span className="text-slate-400 ml-2 font-mono">
                  {selectedScheduleForAi.startTime}-{selectedScheduleForAi.endTime} ({selectedScheduleForAi.hours}h)
                </span>
              </div>
              <div className="flex items-center gap-1">
                {selectedScheduleForAi.daysOfWeek.map(d => (
                  <span key={d} className="px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-200 text-[10px] font-mono">
                    {DAY_NAMES[d]?.short || d}
                  </span>
                ))}
              </div>
            </div>

            {/* AI Candidates List */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {getSetScheduleAiSuggestions(selectedScheduleForAi.id).map((cand) => {
                const guardId = cand.guardId || cand.guard?.id || '';
                const guardName = cand.guardName || cand.guard?.name || 'Officer';
                const guardBadge = cand.guardBadge || cand.guard?.badgeNumber || 'N/A';
                const score = cand.suitabilityScore || cand.fitScore || 70;
                const isCurrentlyAssigned = selectedScheduleForAi.assignedGuardId === guardId;

                return (
                  <div
                    key={guardId}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isCurrentlyAssigned
                        ? 'bg-blue-950/60 border-blue-600 ring-1 ring-blue-500'
                        : score >= 85
                        ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/60 border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-sm text-slate-200 shrink-0">
                        {guardName.charAt(0)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs sm:text-sm">
                            {guardName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({guardBadge})
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                            score >= 90
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : score >= 75
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {score}% Fit Score
                          </span>
                          {isCurrentlyAssigned && (
                            <span className="px-2 py-0.5 rounded bg-blue-900 text-blue-200 text-[10px] font-bold">
                              Current Regular
                            </span>
                          )}
                        </div>

                        {/* Match Reasons */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                          {(cand.reasons || []).map((r, i) => (
                            <span key={i} className="text-emerald-400/90 flex items-center gap-0.5">
                              <span>✓</span> {r}
                            </span>
                          ))}
                        </div>

                        {/* Availability Details */}
                        <div className="text-[10px] text-slate-400">
                          Availability: <strong className="text-slate-300">{cand.weeklyAvailabilityMatch || (cand.availabilityMatch ? 'Matches All Schedule Days' : 'Partial Match')}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 w-full sm:w-auto flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleAssignFromAi(guardId)}
                        disabled={isCurrentlyAssigned}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center ${
                          isCurrentlyAssigned
                            ? 'bg-blue-900/60 text-blue-300 cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 cursor-pointer'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isCurrentlyAssigned ? 'Assigned' : 'Assign to Schedule'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  assignGuardToSetSchedule(selectedScheduleForAi.id, null);
                  setIsAiModalOpen(false);
                }}
                className="text-amber-400 hover:text-amber-300 font-medium"
              >
                Clear Regular Guard (Post to Bidding Queue)
              </button>

              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Generate Concrete Shifts to Calendar */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Generate Shifts from Set Schedules
                  </h3>
                  <p className="text-xs text-slate-400">
                    Instantly project standing recurring schedules onto the live calendar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Date Range Selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Generation Time Horizon
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenerateDaysAhead(7)}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                      generateDaysAhead === 7
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div>Next 7 Days</div>
                    <div className="text-[10px] font-normal opacity-80">1 Week Forecast</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenerateDaysAhead(14)}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                      generateDaysAhead === 14
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div>Next 14 Days</div>
                    <div className="text-[10px] font-normal opacity-80">Bi-Weekly Cycle</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenerateDaysAhead(30)}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                      generateDaysAhead === 30
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div>Next 30 Days</div>
                    <div className="text-[10px] font-normal opacity-80">Full Month</div>
                  </button>
                </div>
              </div>

              {/* Automation Rules */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateAutoBidding}
                    onChange={(e) => setGenerateAutoBidding(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-200">Auto-Populate Unassigned Shifts to Bidding Queue</span>
                    <p className="text-[11px] text-slate-400">
                      Any recurring shift without a regular guard is automatically published to guards for open claiming.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateRespectTimeOff}
                    onChange={(e) => setGenerateRespectTimeOff(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-200">Respect Approved Guard Time-Off & Call-Outs</span>
                    <p className="text-[11px] text-slate-400">
                      If a regular guard has approved time off on a scheduled day, the shift is automatically unassigned and routed to the Bidding Queue as a relief shift.
                    </p>
                  </div>
                </label>
              </div>

              {/* Generation Result Banner */}
              {generationResult && (
                <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 space-y-1.5 animate-fadeIn">
                  <div className="font-bold text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Generation Complete!</span>
                  </div>
                  <div className="text-[11px] text-emerald-300/90 grid grid-cols-3 gap-2 pt-1 font-mono">
                    <div className="bg-emerald-900/60 p-1.5 rounded-lg text-center">
                      <div className="text-base font-black">{generationResult.generatedCount}</div>
                      <div className="text-[9px] uppercase font-sans">Shifts Scheduled</div>
                    </div>
                    <div className="bg-amber-950/60 p-1.5 rounded-lg text-center text-amber-300">
                      <div className="text-base font-black">{generationResult.unassignedCount}</div>
                      <div className="text-[9px] uppercase font-sans">Bidding Queue</div>
                    </div>
                    <div className="bg-blue-950/60 p-1.5 rounded-lg text-center text-blue-300">
                      <div className="text-base font-black">{generationResult.timeOffConflictsCount}</div>
                      <div className="text-[9px] uppercase font-sans">Time-Off Covered</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  {generationResult ? 'Close' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={handleRunGeneration}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black flex items-center gap-1.5 shadow-md shadow-emerald-950/50 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Execute Generation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
