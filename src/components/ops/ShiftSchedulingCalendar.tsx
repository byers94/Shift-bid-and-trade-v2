import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ScheduledShift, ShiftDutyStatus, RovingGroup, ROVING_GROUPS, ROVING_GROUP_CONFIGS } from '../../types/shift';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Building2, 
  User, 
  Clock, 
  Filter, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Coffee, 
  Trash2, 
  Edit3, 
  ArrowRightLeft, 
  X, 
  Sparkles,
  Layers,
  MapPin,
  FileText,
  Car,
  Navigation,
  Zap,
  ShieldCheck, 
  Check,
  PhoneOff
} from 'lucide-react';
import { GuardCallOffModal } from './GuardCallOffModal';

interface ShiftSchedulingCalendarProps {
  initialGuardId?: string | null;
}

export const ShiftSchedulingCalendar: React.FC<ShiftSchedulingCalendarProps> = ({ initialGuardId }) => {
  const { 
    scheduledShifts, 
    guardsList, 
    sitesList, 
    rovers,
    scheduleNewShift, 
    updateScheduledShift, 
    deleteScheduledShift, 
    reassignScheduledShift,
    showToast 
  } = useShiftOps();

  // View mode: 'month' | 'week' | 'day'
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  
  // Current active date reference
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Filters
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [selectedGuardFilter, setSelectedGuardFilter] = useState<string>(initialGuardId || 'all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedShiftTypeFilter, setSelectedShiftTypeFilter] = useState<'all' | 'static' | 'roving'>('all');
  const [selectedRovingGroupFilter, setSelectedRovingGroupFilter] = useState<string>('all');

  // Sync initialGuardId if passed dynamically
  React.useEffect(() => {
    if (initialGuardId) {
      setSelectedGuardFilter(initialGuardId);
    }
  }, [initialGuardId]);

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState<ScheduledShift | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignTargetGuardId, setReassignTargetGuardId] = useState<string>('');
  const [isCallOffModalOpen, setIsCallOffModalOpen] = useState(false);

  // Form State for creating new scheduled shift
  const [formShiftType, setFormShiftType] = useState<'static' | 'roving'>('static');
  const formIsRoving = formShiftType === 'roving';
  const setFormIsRoving = (isRov: boolean) => setFormShiftType(isRov ? 'roving' : 'static');
  const [formRovingGroup, setFormRovingGroup] = useState<RovingGroup>('Alpha Group');
  const [formAssignedRoverUnit, setFormAssignedRoverUnit] = useState<string>('Rover 1 (Interceptor)');
  const [formGuardId, setFormGuardId] = useState<string>(guardsList[0]?.id || '');
  const [formSiteName, setFormSiteName] = useState<string>(sitesList[0]?.name || '');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState<string>('08:00');
  const [formEndTime, setFormEndTime] = useState<string>('16:00');
  const [formHours, setFormHours] = useState<number>(8);
  const [formPostRole, setFormPostRole] = useState<string>('Access Control & Main Lobby');
  const [formPostInstructions, setFormPostInstructions] = useState<string>('Ensure all visitor badges are validated. Maintain post log.');

  // Date navigation helpers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      setCurrentDate(prev);
    } else {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 1);
      setCurrentDate(prev);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 1);
      setCurrentDate(next);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter shifts
  const filteredShifts = scheduledShifts.filter((shift) => {
    const matchesSite = selectedSiteFilter === 'all' || shift.siteName === selectedSiteFilter;
    const matchesGuard = selectedGuardFilter === 'all' || shift.guardId === selectedGuardFilter;
    const matchesStatus = selectedStatusFilter === 'all' || shift.status === selectedStatusFilter;
    const matchesShiftType = 
      selectedShiftTypeFilter === 'all'
        ? true
        : selectedShiftTypeFilter === 'roving'
          ? !!shift.isRovingShift
          : !shift.isRovingShift;
    const matchesRovingGroup =
      selectedRovingGroupFilter === 'all' || shift.rovingGroup === selectedRovingGroupFilter;

    return matchesSite && matchesGuard && matchesStatus && matchesShiftType && matchesRovingGroup;
  });

  // Calculate Month Days Matrix
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Generate calendar days array for Month View
  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push({ dayNumber: null, isCurrentMonth: false, dateStr: '' });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({ dayNumber: day, isCurrentMonth: true, dateStr });
  }

  // Calculate Week Days Array (Sunday to Saturday)
  const startOfWeek = new Date(currentDate);
  const currentDayOfWeek = startOfWeek.getDay(); // 0 = Sun
  startOfWeek.setDate(startOfWeek.getDate() - currentDayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const dYear = d.getFullYear();
    const dMonth = String(d.getMonth() + 1).padStart(2, '0');
    const dDay = String(d.getDate()).padStart(2, '0');
    const dateStr = `${dYear}-${dMonth}-${dDay}`;
    const dayNameShort = d.toLocaleDateString([], { weekday: 'short' });
    const dayNameFull = d.toLocaleDateString([], { weekday: 'long' });
    const dayNumber = d.getDate();
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    const dayShifts = filteredShifts.filter((s) => s.date === dateStr);
    const totalDayHours = dayShifts.reduce((sum, s) => sum + (s.hours || 8), 0);
    return {
      date: d,
      dateStr,
      dayNameShort,
      dayNameFull,
      dayNumber,
      isToday,
      dayShifts,
      totalDayHours
    };
  });

  const weekRangeLabel = `${startOfWeek.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const dayLabel = currentDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  // Total shifts & hours for the week
  const weekTotalShifts = weekDays.reduce((sum, w) => sum + w.dayShifts.length, 0);
  const weekTotalHours = weekDays.reduce((sum, w) => sum + w.totalDayHours, 0);

  const handleCreateShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const guard = guardsList.find((g) => g.id === formGuardId);
    if (!guard) {
      showToast('Validation Error', 'Please select an officer.', 'warning');
      return;
    }

    if (formShiftType === 'roving') {
      const groupConfig = ROVING_GROUP_CONFIGS[formRovingGroup];
      const associatedRover = rovers.find(r => r.rovingGroup === formRovingGroup) || rovers[0];
      const groupSites = sitesList.filter(s => s.rovingGroup === formRovingGroup);

      scheduleNewShift({
        guardId: guard.id,
        guardName: guard.name,
        guardBadge: guard.badgeNumber,
        guardPhone: guard.phone,
        siteId: `ROVER-${formRovingGroup.replace(/\s+/g, '-').toUpperCase()}`,
        siteName: `${formRovingGroup} Mobile Patrol Circuit`,
        siteAddress: groupConfig?.zone || 'Mobile Patrol Territory',
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        hours: formHours,
        postRole: `🚗 Mobile Patrol Driver • ${associatedRover?.unitNumber || 'Rover'} (${formRovingGroup})`,
        postInstructions: formPostInstructions || `Execute optimized ${formRovingGroup} property patrol circuit (${groupSites.length} customer properties). Maintain SLA compliance and respond to priority intercepts.`,
        isRovingShift: true,
        rovingGroup: formRovingGroup,
        assignedRoverUnit: associatedRover?.unitNumber || 'Unit R-101',
        assignedRoverId: associatedRover?.id || 'rover-1',
        circuitStopsCount: groupSites.length || 6,
        status: 'scheduled'
      });

      showToast(
        'Roving Patrol Shift Scheduled',
        `Assigned ${guard.name} to ${formRovingGroup} (${associatedRover?.unitNumber || 'Rover'}). Dynamic Route Circuit synchronized!`,
        'success'
      );
    } else {
      const site = sitesList.find((s) => s.name === formSiteName);
      if (!site) {
        showToast('Validation Error', 'Please select a facility.', 'warning');
        return;
      }

      scheduleNewShift({
        guardId: guard.id,
        guardName: guard.name,
        guardBadge: guard.badgeNumber,
        guardPhone: guard.phone,
        siteId: site.id,
        siteName: site.name,
        siteAddress: site.address,
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        hours: formHours,
        postRole: formPostRole,
        postInstructions: formPostInstructions,
        isRovingShift: false,
        status: 'scheduled'
      });

      showToast('Shift Scheduled', `Assigned ${guard.name} to ${site.name}.`, 'success');
    }

    setIsScheduleModalOpen(false);
  };

  const handleExecuteReassign = () => {
    if (!selectedShiftForDetail || !reassignTargetGuardId) return;
    reassignScheduledShift(selectedShiftForDetail.id, reassignTargetGuardId);
    setIsReassignModalOpen(false);
    setSelectedShiftForDetail(null);
  };

  return (
    <div id="shift-scheduling-calendar" className="space-y-4">
      {/* Top Header & Calendar Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1e3a8a] text-white rounded-xl shadow-xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900 dark:text-slate-100">
              Shift Scheduling & Master Calendar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage facility posts, guard rosters, scheduled shifts, and dispatch assignments
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'month' ? 'bg-[#1e3a8a] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'week' ? 'bg-[#1e3a8a] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'day' ? 'bg-[#1e3a8a] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Day
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
            <button
              onClick={handlePrev}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 px-2 font-mono whitespace-nowrap">
            {viewMode === 'month' ? monthName : viewMode === 'week' ? weekRangeLabel : dayLabel}
          </span>

          {/* Schedule Shift Trigger */}
          <button
            onClick={() => {
              setFormDate(currentDate.toISOString().split('T')[0]);
              setIsScheduleModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ml-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Shift</span>
          </button>
        </div>
      </div>

      {/* Filters Bar & Quick Stats */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Shift Type Filter Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedShiftTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedShiftTypeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              All Shifts
            </button>
            <button
              onClick={() => setSelectedShiftTypeFilter('static')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                selectedShiftTypeFilter === 'static'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <Building2 className="w-3 h-3 text-blue-500" />
              <span>Static Posts</span>
            </button>
            <button
              onClick={() => setSelectedShiftTypeFilter('roving')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                selectedShiftTypeFilter === 'roving'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'
              }`}
            >
              <Car className="w-3 h-3" />
              <span>Roving Circuits</span>
            </button>
          </div>

          {/* Roving Group Filter */}
          <select
            value={selectedRovingGroupFilter}
            onChange={(e) => setSelectedRovingGroupFilter(e.target.value)}
            className="bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl px-3 py-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200 focus:outline-hidden"
          >
            <option value="all">All Roving Groups</option>
            {ROVING_GROUPS.map((grp) => (
              <option key={grp} value={grp}>{grp}</option>
            ))}
          </select>

          {/* Site Filter */}
          <select
            value={selectedSiteFilter}
            onChange={(e) => setSelectedSiteFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Facilities ({sitesList.length})</option>
            {sitesList.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>

          {/* Guard Filter */}
          <select
            value={selectedGuardFilter}
            onChange={(e) => setSelectedGuardFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Officers ({guardsList.length})</option>
            {guardsList.map((g) => (
              <option key={g.id} value={g.id}>{g.name} ({g.badgeNumber})</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Shift Statuses</option>
            <option value="on_duty">● On Duty (Clocked In)</option>
            <option value="on_break">☕ On Break</option>
            <option value="scheduled">📅 Scheduled (Pending)</option>
            <option value="late">⚠️ Late / Overdue</option>
            <option value="completed">✓ Completed</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400">
          {viewMode === 'week' && (
            <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900 font-bold text-[11px]">
              Week: <strong>{weekTotalShifts}</strong> Shifts • <strong>{weekTotalHours}</strong>h
            </span>
          )}
          <span>
            Total Filtered: <strong>{filteredShifts.length}</strong> Shifts
          </span>
        </div>
      </div>

      {/* WEEK VIEW GRID */}
      {viewMode === 'week' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            {weekDays.map((day) => {
              return (
                <div
                  key={day.dateStr}
                  className={`rounded-2xl border flex flex-col min-h-[380px] bg-white dark:bg-slate-900 shadow-sm transition-all overflow-hidden ${
                    day.isToday
                      ? 'border-[#1e3a8a] dark:border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Column Day Header */}
                  <div
                    className={`p-3 border-b flex items-center justify-between ${
                      day.isToday
                        ? 'bg-[#1e3a8a] text-white border-blue-800'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black uppercase tracking-wider">
                          {day.dayNameShort}
                        </span>
                        {day.isToday && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded-md font-sans">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-black font-mono leading-none mt-0.5">
                        {day.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full block ${
                          day.isToday
                            ? 'bg-blue-900 text-blue-200'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {day.dayShifts.length} {day.dayShifts.length === 1 ? 'Shift' : 'Shifts'}
                      </span>
                      {day.totalDayHours > 0 && (
                        <span className="text-[9px] opacity-75 font-mono block mt-0.5">
                          {day.totalDayHours} hrs
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day Shifts Column Body */}
                  <div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto max-h-[550px] no-scrollbar">
                    {day.dayShifts.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
                        <Clock className="w-5 h-5 text-slate-300 dark:text-slate-600 mb-1.5" />
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                          No Shifts Scheduled
                        </p>
                        <button
                          onClick={() => {
                            setFormDate(day.dateStr);
                            setIsScheduleModalOpen(true);
                          }}
                          className="mt-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Schedule</span>
                        </button>
                      </div>
                    ) : (
                      day.dayShifts.map((shift) => {
                        const isOnDuty = shift.status === 'on_duty';
                        const isOnBreak = shift.status === 'on_break';
                        const isLate = shift.status === 'late' || shift.isLate;
                        const isCompleted = shift.status === 'completed';
                        const isRoving = !!shift.isRovingShift;

                        return (
                          <div
                            key={shift.id}
                            onClick={() => setSelectedShiftForDetail(shift)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] flex flex-col justify-between gap-1.5 ${
                              isRoving
                                ? 'bg-gradient-to-br from-indigo-50/90 to-blue-50/70 dark:from-indigo-950/60 dark:to-slate-900 border-indigo-300 dark:border-indigo-700/70 text-indigo-950 dark:text-indigo-100 shadow-2xs'
                                : isOnDuty
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/20'
                                : isOnBreak
                                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                                : isLate
                                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-800 text-rose-950 dark:text-rose-100 animate-pulse'
                                : isCompleted
                                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 opacity-75'
                                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:border-blue-400'
                            }`}
                          >
                            {/* Top Time & Status */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[11px] font-black flex items-center gap-1">
                                {isRoving && <Car className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                                {shift.startTime} - {shift.endTime}
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md font-mono ${
                                  isOnDuty
                                    ? 'bg-emerald-600 text-white'
                                    : isOnBreak
                                    ? 'bg-amber-600 text-white'
                                    : isLate
                                    ? 'bg-rose-600 text-white'
                                    : isCompleted
                                    ? 'bg-slate-500 text-white'
                                    : isRoving
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-blue-600 text-white'
                                }`}
                              >
                                {shift.status === 'on_duty'
                                  ? '● On Duty'
                                  : shift.status === 'on_break'
                                  ? '☕ Break'
                                  : shift.status === 'late'
                                  ? '⚠️ Late'
                                  : shift.status === 'completed'
                                  ? '✓ Done'
                                  : isRoving
                                  ? '🚗 Roving'
                                  : 'Scheduled'}
                              </span>
                            </div>

                            {/* Officer Details */}
                            <div>
                              <div className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1">
                                <User className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate">{shift.guardName}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {shift.guardBadge}
                              </span>
                            </div>

                            {/* Facility & Post or Roving Group */}
                            <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                              {isRoving ? (
                                <div className="space-y-0.5">
                                  <div className="font-extrabold flex items-center gap-1 text-indigo-700 dark:text-indigo-300">
                                    <span className="px-1.5 py-0.2 bg-indigo-200 dark:bg-indigo-900/80 rounded text-[9px] uppercase tracking-wider font-mono">
                                      {shift.rovingGroup || 'Alpha Group'}
                                    </span>
                                    <span className="truncate text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                      {shift.assignedRoverUnit || 'Rover'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-1">
                                    <Navigation className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                    <span>{shift.siteName}</span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="font-bold flex items-center gap-1 truncate text-slate-700 dark:text-slate-300">
                                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{shift.siteName}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    {shift.postRole}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Quick Add Button at Bottom of Column */}
                  <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                    <button
                      onClick={() => {
                        setFormDate(day.dateStr);
                        setIsScheduleModalOpen(true);
                      }}
                      className="w-full py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>Add Shift</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MONTH VIEW GRID */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Day Headers (Sun - Sat) */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center py-2 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Grid Matrix */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {calendarCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div key={idx} className="min-h-[110px] bg-slate-50/40 dark:bg-slate-950/40 p-1.5 opacity-40"></div>
                );
              }

              const isToday = cell.dateStr === new Date().toISOString().split('T')[0];
              const dayShifts = filteredShifts.filter((s) => s.date === cell.dateStr);

              return (
                <div 
                  key={idx} 
                  className={`min-h-[115px] p-1.5 flex flex-col justify-between transition-colors ${
                    isToday ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center font-mono ${
                      isToday 
                        ? 'bg-[#1e3a8a] text-white font-black' 
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {cell.dayNumber}
                    </span>

                    {dayShifts.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {dayShifts.length}
                      </span>
                    )}
                  </div>

                  {/* Day Shifts Badges */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px] no-scrollbar">
                    {dayShifts.map((shift) => {
                      const isOnDuty = shift.status === 'on_duty';
                      const isOnBreak = shift.status === 'on_break';
                      const isLate = shift.status === 'late' || shift.isLate;
                      const isCompleted = shift.status === 'completed';

                      return (
                        <div
                          key={shift.id}
                          onClick={() => setSelectedShiftForDetail(shift)}
                          className={`px-1.5 py-1 rounded-md text-[10px] font-bold border truncate cursor-pointer transition-all ${
                            isOnDuty 
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800' :
                            isOnBreak 
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800' :
                            isLate 
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-400 dark:border-rose-800 animate-pulse' :
                            isCompleted 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 line-through' :
                              'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-900'
                          }`}
                          title={`${shift.guardName} @ ${shift.siteName} (${shift.startTime}-${shift.endTime})`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{shift.guardName.split(' ')[0]}</span>
                            <span className="font-mono text-[9px] shrink-0 opacity-80">{shift.startTime}</span>
                          </div>
                          <div className="text-[9px] truncate opacity-75 font-normal">
                            {shift.siteName.split(' ')[0]}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Shift button for this cell */}
                  <button
                    onClick={() => {
                      setFormDate(cell.dateStr);
                      setIsScheduleModalOpen(true);
                    }}
                    className="w-full mt-1 py-0.5 text-[10px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded font-bold opacity-0 hover:opacity-100 transition-opacity"
                  >
                    + Add
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DAY AGENDA VIEW */}
      {viewMode === 'day' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-extrabold uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span>Shift Roster for {currentDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">
                {filteredShifts.filter((s) => s.date === currentDate.toISOString().split('T')[0]).length} Shifts Logged
              </span>
              <button
                onClick={() => {
                  setFormDate(currentDate.toISOString().split('T')[0]);
                  setIsScheduleModalOpen(true);
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Shift</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredShifts.filter((s) => s.date === currentDate.toISOString().split('T')[0]).length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  No shifts scheduled for {currentDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                <button
                  onClick={() => {
                    setFormDate(currentDate.toISOString().split('T')[0]);
                    setIsScheduleModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Shift on This Day</span>
                </button>
              </div>
            ) : (
              filteredShifts
                .filter((s) => s.date === currentDate.toISOString().split('T')[0])
                .map((shift) => (
                  <div
                    key={shift.id}
                    onClick={() => setSelectedShiftForDetail(shift)}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#1e3a8a] text-white rounded-lg font-bold text-xs font-mono text-center min-w-[65px]">
                        <div>{shift.startTime}</div>
                        <div className="text-[9px] opacity-75 font-normal">{shift.endTime}</div>
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                          <span>{shift.guardName}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">({shift.guardBadge})</span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                              shift.status === 'on_duty'
                                ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                                : shift.status === 'on_break'
                                ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                                : shift.status === 'late' || shift.isLate
                                ? 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 animate-pulse'
                                : shift.status === 'completed'
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 line-through'
                                : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                            }`}
                          >
                            {shift.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-blue-500" />
                            {shift.siteName}
                          </span>
                          <span>•</span>
                          <span>{shift.postRole}</span>
                          <span>•</span>
                          <span>{shift.hours} hours</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShiftForDetail(shift);
                        }}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-[#1e3a8a] dark:text-blue-300 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* SHIFT DETAIL MODAL */}
      {selectedShiftForDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#1e3a8a] text-white rounded-xl">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                    Scheduled Shift Details
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">{selectedShiftForDetail.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedShiftForDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Shift Summary Cards */}
            <div className="space-y-2.5 text-xs">
              {selectedShiftForDetail.isRovingShift && (
                <div className="p-3 bg-gradient-to-r from-indigo-900 to-blue-900 text-white rounded-xl shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Roving Mobile Patrol Shift</span>
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-500/40 rounded-full font-mono text-[10px] font-extrabold text-white border border-indigo-400/30">
                      {selectedShiftForDetail.rovingGroup || 'Alpha Group'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-indigo-200">Assigned Rover:</span>
                    <span className="font-bold text-white">{selectedShiftForDetail.assignedRoverUnit || 'Rover 1 (Interceptor)'}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Officer</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>{selectedShiftForDetail.guardName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedShiftForDetail.guardBadge} • {selectedShiftForDetail.guardPhone}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {selectedShiftForDetail.isRovingShift ? 'Base Site / Circuit' : 'Facility / Post'}
                  </span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>{selectedShiftForDetail.siteName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedShiftForDetail.postRole}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block font-sans">Date:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedShiftForDetail.date}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block font-sans">Time:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedShiftForDetail.startTime} - {selectedShiftForDetail.endTime}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block font-sans">Duration:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedShiftForDetail.hours} Hours</span>
                </div>
              </div>

              {selectedShiftForDetail.postInstructions && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Post Instructions & Standing Orders:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 italic text-[11px]">
                    &ldquo;{selectedShiftForDetail.postInstructions}&rdquo;
                  </p>
                </div>
              )}

              {/* Status and Clock Log */}
              <div className="flex items-center justify-between p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs">
                <span className="font-bold text-blue-900 dark:text-blue-200">Current Status:</span>
                <span className="font-black uppercase tracking-wider font-mono text-blue-700 dark:text-blue-300">
                  {selectedShiftForDetail.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    deleteScheduledShift(selectedShiftForDetail.id);
                    setSelectedShiftForDetail(null);
                  }}
                  className="px-3 py-2 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCallOffModalOpen(true);
                  }}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>Record Call-Off</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsReassignModalOpen(true);
                  }}
                  className="px-3 py-2 bg-blue-50 dark:bg-blue-900/60 hover:bg-blue-100 text-[#1e3a8a] dark:text-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Reassign Relief</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedShiftForDetail(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REASSIGN GUARD MODAL */}
      {isReassignModalOpen && selectedShiftForDetail && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Reassign Shift Officer</h3>
              </div>
              <button onClick={() => setIsReassignModalOpen(false)} className="text-slate-400 text-sm font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Reassign <strong>{selectedShiftForDetail.siteName}</strong> on <strong>{selectedShiftForDetail.date}</strong> from <em>{selectedShiftForDetail.guardName}</em> to a qualified relief officer:
              </p>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Select Relief Guard</label>
                <select
                  value={reassignTargetGuardId}
                  onChange={(e) => setReassignTargetGuardId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Select Relief Officer --</option>
                  {guardsList
                    .filter((g) => g.id !== selectedShiftForDetail.guardId)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.badgeNumber}) • {g.ojtSites.includes(selectedShiftForDetail.siteName) ? '★ OJT Qualified' : 'Standard'}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReassign}
                disabled={!reassignTargetGuardId}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW SCHEDULED SHIFT MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                    Schedule New Security Shift
                  </h3>
                  <p className="text-[10px] text-slate-400">Assign guard to designated client site and post</p>
                </div>
              </div>

              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShiftSubmit} className="space-y-3">
              {/* Shift Category Switcher: Static vs Roving */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                  Shift Category & Deployment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormIsRoving(false);
                      setFormPostRole('Access Control & Lobby Post');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      !formIsRoving
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-[#1e3a8a] dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-extrabold text-xs">Static Site Post</div>
                      <div className="text-[10px] opacity-75">Dedicated guard stationed at a single building or checkpoint</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormIsRoving(true);
                      setFormPostRole('Mobile Circuit Patrol Officer');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      formIsRoving
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Car className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-extrabold text-xs">Roving Mobile Shift</div>
                      <div className="text-[10px] opacity-75">Assigned to a patrol vehicle & circuit group covering multiple sites</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Roving Group & Vehicle Configuration (If Roving) */}
              {formIsRoving && (
                <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50/50 dark:from-indigo-950/40 dark:to-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-indigo-900 dark:text-indigo-200">
                    <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Roving Patrol Configuration</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-300 block mb-1">
                        Patrol Group / Sector
                      </label>
                      <select
                        value={formRovingGroup}
                        onChange={(e) => {
                          const grp = e.target.value as RovingGroup;
                          setFormRovingGroup(grp);
                          const matchingRover = rovers.find(r => r.rovingGroup === grp);
                          if (matchingRover) {
                            setFormAssignedRoverUnit(matchingRover.unitNumber);
                          }
                          const groupSites = sitesList.filter(s => s.rovingGroup === grp);
                          if (groupSites.length > 0) {
                            setFormSiteName(groupSites[0].name);
                          }
                        }}
                        className="w-full bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100"
                      >
                        {ROVING_GROUPS.map((grp) => (
                          <option key={grp} value={grp}>
                            {grp} ({ROVING_GROUP_CONFIGS[grp]?.zone || 'Patrol Sector'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-300 block mb-1">
                        Assigned Rover Vehicle
                      </label>
                      <select
                        value={formAssignedRoverUnit}
                        onChange={(e) => setFormAssignedRoverUnit(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 font-mono"
                      >
                        {rovers.map((r) => (
                          <option key={r.id} value={r.unitNumber}>
                            {r.unitNumber} ({r.rovingGroup})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Circuit site tags preview */}
                  <div className="pt-1">
                    {(() => {
                      const sitesInGroup = sitesList.filter(s => s.rovingGroup === formRovingGroup);
                      return (
                        <>
                          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                            Circuit Sites in {formRovingGroup} ({sitesInGroup.length} locations):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {sitesInGroup.length > 0 ? (
                              sitesInGroup.map((st) => (
                                <span key={st.id} className="px-2 py-0.5 bg-white dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 rounded-md border border-indigo-200/80 dark:border-indigo-800/80">
                                  {st.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-indigo-500 italic">No assigned sites in site directory</span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Select Officer & Facility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Select Officer
                  </label>
                  <select
                    value={formGuardId}
                    onChange={(e) => setFormGuardId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100"
                    required
                  >
                    {guardsList.map((g) => (
                      <option key={g.id} value={g.id}>{g.name} ({g.badgeNumber})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    {formIsRoving ? 'Initial Base / Checkpoint' : 'Facility / Site'}
                  </label>
                  <select
                    value={formSiteName}
                    onChange={(e) => setFormSiteName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100"
                    required
                  >
                    {sitesList.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Shift Times */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Start (24h)
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    End (24h)
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Post Assignment Role */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Post Role / Assignment
                </label>
                <input
                  type="text"
                  value={formPostRole}
                  onChange={(e) => setFormPostRole(e.target.value)}
                  placeholder="e.g. Access Control & Lobby Desk"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
                  required
                />
              </div>

              {/* Post Instructions */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Special Instructions / Standing Orders
                </label>
                <textarea
                  rows={2}
                  value={formPostInstructions}
                  onChange={(e) => setFormPostInstructions(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer"
                >
                  Confirm & Schedule Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guard Call-Off Modal */}
      {isCallOffModalOpen && (
        <GuardCallOffModal
          isOpen={isCallOffModalOpen}
          onClose={() => {
            setIsCallOffModalOpen(false);
            if (selectedShiftForDetail) {
              setSelectedShiftForDetail(null);
            }
          }}
          prefillShiftId={selectedShiftForDetail?.id}
        />
      )}
    </div>
  );
};
