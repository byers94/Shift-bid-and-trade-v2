import React, { useState, useEffect } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { formatElapsedTimer, getShiftElapsedSeconds } from '../../utils/time';
import { 
  Clock, 
  MapPin, 
  Shield, 
  ShieldCheck, 
  Coffee, 
  Play, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Calendar, 
  Building2, 
  User, 
  FileText, 
  CheckSquare, 
  Compass, 
  Sparkles,
  ChevronRight,
  PhoneCall,
  AlertCircle
} from 'lucide-react';
import { ScheduledShift } from '../../types/shift';

interface GuardDutyTerminalProps {
  onOpenAlertPrefs?: () => void;
}

export const GuardDutyTerminal: React.FC<GuardDutyTerminalProps> = () => {
  const { 
    activeGuard, 
    scheduledShifts, 
    activeClockedInShift, 
    clockInGuard, 
    clockOutGuard, 
    startGuardBreak, 
    endGuardBreak,
    sitesList,
    opsPhone,
    showToast
  } = useShiftOps();

  // Clock-in form state
  const [selectedSiteName, setSelectedSiteName] = useState<string>(
    activeGuard.ojtSites[0] || (sitesList[0]?.name || 'Skyline Tower & Plaza')
  );
  const [selectedScheduledShiftId, setSelectedScheduledShiftId] = useState<string>('');
  const [postRoleInput, setPostRoleInput] = useState<string>('Access Control & Lobby Desk');
  const [clockInNotes, setClockInNotes] = useState<string>('');
  const [selectedGear, setSelectedGear] = useState<string[]>([
    'Radio CH-1 (Ops Dispatch)',
    'Body-Worn Camera #07',
    'Facility Master Key Card',
    'High-Vis Security Vest'
  ]);

  // Break modal state
  const [isBreakModalOpen, setIsBreakModalOpen] = useState<boolean>(false);
  const [breakType, setBreakType] = useState<'meal' | 'rest'>('meal');
  const [breakNote, setBreakNote] = useState<string>('');

  // Clock-out modal state
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState<boolean>(false);
  const [clockOutNotes, setClockOutNotes] = useState<string>('');
  const [handoverSummary, setHandoverSummary] = useState<string>('All posts inspected and clear. Handover log completed.');
  const [gearReturnedConfirmed, setGearReturnedConfirmed] = useState<boolean>(true);

  // Live timer state
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Update timer every second when clocked in
  useEffect(() => {
    if (!activeClockedInShift || !activeClockedInShift.clockInTime) {
      setElapsedSec(0);
      return;
    }

    const updateTimer = () => {
      const sec = getShiftElapsedSeconds(activeClockedInShift.clockInTime, undefined, activeClockedInShift.breaks);
      setElapsedSec(sec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeClockedInShift]);

  // Find upcoming scheduled shifts for today
  const todayStr = new Date().toISOString().split('T')[0];
  const guardTodayShifts = scheduledShifts.filter(
    (s) => s.guardId === activeGuard.id && s.date === todayStr
  );
  const guardUpcomingShifts = scheduledShifts
    .filter((s) => s.guardId === activeGuard.id && s.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const availableGearOptions = [
    'Radio CH-1 (Ops Dispatch)',
    'Body-Worn Camera #07',
    'Facility Master Key Card',
    'High-Vis Security Vest',
    'Flashlight (Rechargeable)',
    'Patrol Guard Tour Wand',
    'First Aid Trauma Kit'
  ];

  const handleToggleGear = (gear: string) => {
    setSelectedGear((prev) => 
      prev.includes(gear) ? prev.filter((g) => g !== gear) : [...prev, gear]
    );
  };

  const handleExecuteClockIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteName) {
      showToast('Site Required', 'Please select a facility to clock in.', 'warning');
      return;
    }

    clockInGuard(activeGuard.id, selectedSiteName, {
      scheduledShiftId: selectedScheduledShiftId || undefined,
      postRole: postRoleInput,
      notes: clockInNotes,
      gpsVerified: true,
      equipmentIssued: selectedGear
    });
  };

  const handleExecuteClockOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gearReturnedConfirmed) {
      showToast('Gear Check Required', 'Please confirm all issued gear is secured or handed over.', 'warning');
      return;
    }

    clockOutGuard(activeGuard.id, {
      notes: clockOutNotes,
      handoverSummary: handoverSummary,
      equipmentReturned: true
    });
    setIsClockOutModalOpen(false);
  };

  const handleExecuteStartBreak = (e: React.FormEvent) => {
    e.preventDefault();
    startGuardBreak(activeGuard.id, breakType, breakNote);
    setIsBreakModalOpen(false);
    setBreakNote('');
  };

  return (
    <div id="guard-duty-terminal" className="space-y-4 pb-4">
      {/* ACTIVE CLOCKED IN VIEW */}
      {activeClockedInShift ? (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Main Duty Status Banner */}
          <div className={`p-4 rounded-2xl border-2 shadow-lg transition-all ${
            activeClockedInShift.status === 'on_break'
              ? 'bg-gradient-to-br from-amber-950/80 via-slate-900 to-amber-950/40 border-amber-500 text-amber-100'
              : 'bg-gradient-to-br from-slate-900 via-blue-950/90 to-slate-950 border-emerald-500 text-white shadow-emerald-950/30'
          }`}>
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-3.5 h-3.5 rounded-full ${
                  activeClockedInShift.status === 'on_break' 
                    ? 'bg-amber-400 animate-pulse' 
                    : 'bg-emerald-400 animate-ping'
                }`} />
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    activeClockedInShift.status === 'on_break'
                      ? 'bg-amber-500/30 text-amber-300 border-amber-400/50'
                      : 'bg-emerald-500/30 text-emerald-300 border-emerald-400/50'
                  }`}>
                    {activeClockedInShift.status === 'on_break' ? '☕ ON REST BREAK' : '● ACTIVE ON-DUTY POST'}
                  </span>
                  <p className="text-xs font-bold text-slate-300 mt-0.5">
                    Officer {activeGuard.name} ({activeGuard.badgeNumber})
                  </p>
                </div>
              </div>

              {/* GPS Verified Status Badge */}
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-600/40">
                <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span>GPS Verified</span>
              </div>
            </div>

            {/* Live Elapsed Time Block */}
            <div className="py-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                {activeClockedInShift.status === 'on_break' ? 'Duty Clock (Break Paused)' : 'Active Shift Elapsed Time'}
              </span>
              <div className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-white flex items-center justify-center gap-2">
                <Clock className="w-6 h-6 text-blue-400 animate-pulse" />
                <span>{formatElapsedTimer(elapsedSec)}</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono mt-1">
                Clocked In: {new Date(activeClockedInShift.clockInTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>

            {/* Facility & Post Specifications */}
            <div className="bg-slate-950/70 rounded-xl p-3 border border-white/10 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Facility</span>
                  <div className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>{activeClockedInShift.siteName}</span>
                  </div>
                  {activeClockedInShift.siteAddress && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{activeClockedInShift.siteAddress}</span>
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Post Assignment</span>
                  <span className="font-mono font-bold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60 block mt-0.5">
                    {activeClockedInShift.postRole}
                  </span>
                </div>
              </div>

              {/* Equipment Issued */}
              {activeClockedInShift.equipmentIssued && activeClockedInShift.equipmentIssued.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Equipped Gear:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {activeClockedInShift.equipmentIssued.map((item, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md border border-slate-700 font-mono">
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Shift Duty Action Buttons */}
            <div className="pt-4 grid grid-cols-2 gap-2">
              {activeClockedInShift.status === 'on_duty' ? (
                <button
                  id="guard-start-break-btn"
                  type="button"
                  onClick={() => setIsBreakModalOpen(true)}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Coffee className="w-4 h-4" />
                  <span>Start Break</span>
                </button>
              ) : (
                <button
                  id="guard-end-break-btn"
                  type="button"
                  onClick={() => endGuardBreak(activeGuard.id)}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume Duty</span>
                </button>
              )}

              <button
                id="guard-clock-out-btn"
                type="button"
                onClick={() => setIsClockOutModalOpen(true)}
                className="py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Clock Out</span>
              </button>
            </div>
          </div>

          {/* Quick Ops Dispatch Link Card */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Ops Command Dispatch</div>
                <div className="text-[10px] text-slate-500 font-mono">Channel 1 Priority Line • {opsPhone}</div>
              </div>
            </div>

            <a
              href={`tel:${opsPhone}`}
              className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Call Ops</span>
            </a>
          </div>
        </div>
      ) : (
        /* CLOCK IN TERMINAL (NOT CURRENTLY ON DUTY) */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Welcome Status Card */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-2xl shadow-md border border-blue-700">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-700 border border-blue-400 flex items-center justify-center text-white font-black text-sm">
                  {activeGuard.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-tight">{activeGuard.name}</h2>
                  <p className="text-[10px] text-blue-200 font-mono">Badge #{activeGuard.badgeNumber} • Off-Duty</p>
                </div>
              </div>

              <span className="text-[10px] font-bold bg-blue-950/80 px-2 py-1 rounded-full text-blue-200 border border-blue-500/40">
                Ready for Duty
              </span>
            </div>
          </div>

          {/* Today's Scheduled Shifts Quick-Select (if any) */}
          {guardTodayShifts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Scheduled Shifts for Today</span>
                </span>
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                  {guardTodayShifts.length} Assigned
                </span>
              </div>

              <div className="space-y-1.5">
                {guardTodayShifts.map((shift) => (
                  <div 
                    key={shift.id}
                    onClick={() => {
                      setSelectedScheduledShiftId(shift.id);
                      setSelectedSiteName(shift.siteName);
                      setPostRoleInput(shift.postRole);
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      selectedScheduledShiftId === shift.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>{shift.siteName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {shift.startTime} - {shift.endTime} ({shift.hours}h) • {shift.postRole}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clockInGuard(activeGuard.id, shift.siteName, {
                          scheduledShiftId: shift.id,
                          postRole: shift.postRole,
                          gpsVerified: true
                        });
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      Clock In Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clock-In Setup Form */}
          <form 
            onSubmit={handleExecuteClockIn}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <span>Duty Post Clock-In</span>
              </h3>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 font-mono">
                <Compass className="w-3 h-3" /> GPS In-Range
              </span>
            </div>

            {/* Select Site */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Select Facility / Post Location
              </label>
              <select
                id="guard-clockin-site-select"
                value={selectedSiteName}
                onChange={(e) => setSelectedSiteName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <optgroup label="Officer Qualified Sites (OJT Verified)">
                  {activeGuard.ojtSites.map((site) => (
                    <option key={site} value={site}>★ {site}</option>
                  ))}
                </optgroup>
                <optgroup label="Other Client Locations">
                  {sitesList
                    .filter((s) => !activeGuard.ojtSites.includes(s.name))
                    .map((s) => (
                      <option key={s.id} value={s.name}>{s.name} ({s.city || s.zone})</option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Post Role */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Post Assignment Role
              </label>
              <select
                id="guard-clockin-post-role"
                value={postRoleInput}
                onChange={(e) => setPostRoleInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Access Control & Lobby Desk">Access Control & Main Lobby</option>
                <option value="Perimeter Foot Patrol & Lockup">Perimeter Foot Patrol & Lockup</option>
                <option value="Gate 4 Checkpoint & Loading Dock">Gate Checkpoint & Truck Bay Inspection</option>
                <option value="CCTV Security Operations Console">CCTV Operations Console</option>
                <option value="Mobile Security Vehicle Patrol">Mobile Vehicle Security Patrol</option>
                <option value="Event Crowd & Badge Verification">Event Access & Badge Verification</option>
              </select>
            </div>

            {/* Equipment Issued Checklist */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Gear Inspection & Inventory Checklist
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
                {availableGearOptions.map((gear) => {
                  const isChecked = selectedGear.includes(gear);
                  return (
                    <label 
                      key={gear}
                      className={`flex items-center gap-2 p-1.5 rounded-lg text-[11px] cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-blue-100/70 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleGear(gear)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{gear}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Optional Clock-in Notes */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Officer Notes / Shift Observations (Optional)
              </label>
              <input
                id="guard-clockin-notes-input"
                type="text"
                value={clockInNotes}
                onChange={(e) => setClockInNotes(e.target.value)}
                placeholder="e.g. Relieved Officer Jones on time. Radio tested."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Submit Clock In Button */}
            <button
              id="guard-submit-clockin-btn"
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-emerald-900/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Clock In for Duty Post</span>
            </button>
          </form>

          {/* Upcoming Schedule Roster */}
          {guardUpcomingShifts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Your Upcoming Schedule</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {guardUpcomingShifts.length} Shifts Booked
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {guardUpcomingShifts.map((shift) => (
                  <div key={shift.id} className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{shift.siteName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {shift.date} • {shift.startTime} - {shift.endTime} ({shift.hours}h)
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono">
                      {shift.postRole.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* START BREAK MODAL */}
      {isBreakModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-4 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Start Break</h3>
              </div>
              <button 
                onClick={() => setIsBreakModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteStartBreak} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Break Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBreakType('meal')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      breakType === 'meal'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🍱 30-min Meal Break
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreakType('rest')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      breakType === 'rest'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ☕ 15-min Rest Break
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Break Location / Note (Optional)
                </label>
                <input
                  type="text"
                  value={breakNote}
                  onChange={(e) => setBreakNote(e.target.value)}
                  placeholder="e.g. Guard break room #2. Relief officer on post."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBreakModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Begin Break
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOCK OUT & HANDOVER MODAL */}
      {isClockOutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-4 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <LogOut className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Shift Clock-Out & Handover</h3>
              </div>
              <button 
                onClick={() => setIsClockOutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteClockOut} className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-mono">
                  <span>Shift Duration:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatElapsedTimer(elapsedSec)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-mono mt-1">
                  <span>Facility:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{activeClockedInShift?.siteName}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                  Handover Summary to Relief Guard / Ops
                </label>
                <textarea
                  rows={2}
                  value={handoverSummary}
                  onChange={(e) => setHandoverSummary(e.target.value)}
                  placeholder="e.g. Handed keys to Officer Davies. All exterior gates secured. No active incidents."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gearReturnedConfirmed}
                  onChange={(e) => setGearReturnedConfirmed(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold">All issued equipment returned to lockbox / handed over</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClockOutModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Confirm Clock-Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
