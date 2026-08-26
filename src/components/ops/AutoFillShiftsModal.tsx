import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { Shift, GuardProfile } from '../../types/shift';
import { 
  suggestGuardsForShift, 
  generateBatchAutoFillPlan, 
  GuardCandidateEvaluation, 
  BatchAutoFillItem 
} from '../../utils/autoFillHeuristics';
import { formatDateLabel, calculateHours } from '../../utils/time';
import { 
  X, 
  Sparkles, 
  UserCheck, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Award, 
  Search, 
  Filter, 
  ChevronRight, 
  Zap, 
  Layers, 
  Check, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  RotateCcw
} from 'lucide-react';

interface AutoFillShiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShiftId?: string | null;
}

export const AutoFillShiftsModal: React.FC<AutoFillShiftsModalProps> = ({
  isOpen,
  onClose,
  initialShiftId
}) => {
  const { 
    shifts, 
    guardsList, 
    bids, 
    markShiftFilled, 
    showToast,
    logAdminAction
  } = useShiftOps();

  // Mode: 'single' (focused shift) or 'batch' (all open shifts)
  const [mode, setMode] = useState<'single' | 'batch'>(initialShiftId ? 'single' : 'batch');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(initialShiftId || null);

  // Filters for single shift candidate view
  const [candidateFilter, setCandidateFilter] = useState<'all' | 'site_trained' | 'high_rest' | 'has_bids'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Batch assignments state: shiftId -> selected guardId
  const [batchSelections, setBatchSelections] = useState<Record<string, string>>({});
  const [batchSelectedShiftIds, setBatchSelectedShiftIds] = useState<Set<string>>(new Set());
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);
  const [isAssigningSingleId, setIsAssigningSingleId] = useState<string | null>(null);

  // List of all open shifts
  const openShifts = useMemo(() => {
    return shifts.filter((s) => s.status === 'open');
  }, [shifts]);

  // If selectedShiftId is not set or invalid, default to the first open shift
  const activeShift = useMemo(() => {
    if (selectedShiftId) {
      const found = shifts.find((s) => s.id === selectedShiftId);
      if (found) return found;
    }
    return openShifts[0] || null;
  }, [selectedShiftId, shifts, openShifts]);

  // Candidates for active single shift
  const candidateEvaluations = useMemo(() => {
    if (!activeShift) return [];
    return suggestGuardsForShift(activeShift, guardsList, shifts, bids);
  }, [activeShift, guardsList, shifts, bids]);

  // Filtered candidate list
  const filteredCandidates = useMemo(() => {
    return candidateEvaluations.filter((cand) => {
      // Filter tab
      if (candidateFilter === 'site_trained' && !cand.isSiteTrained) return false;
      if (candidateFilter === 'high_rest' && (cand.daysSinceLastWorked === null ? false : cand.daysSinceLastWorked < 2)) return false;
      if (candidateFilter === 'has_bids' && !cand.hasBid) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          cand.guard.name.toLowerCase().includes(q) ||
          cand.guard.badgeNumber.toLowerCase().includes(q) ||
          cand.guard.phone.includes(q) ||
          cand.guard.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [candidateEvaluations, candidateFilter, searchQuery]);

  // Batch Auto-Fill Plan generated on open shifts
  const batchPlan = useMemo(() => {
    return generateBatchAutoFillPlan(openShifts, guardsList, shifts, bids);
  }, [openShifts, guardsList, shifts, bids]);

  // Sync batch state when plan initializes or openShifts changes
  React.useEffect(() => {
    if (isOpen) {
      const initialSelections: Record<string, string> = {};
      const initialSelectedIds = new Set<string>();

      batchPlan.forEach((item) => {
        if (item.topCandidate && !item.topCandidate.hasScheduleConflict) {
          initialSelections[item.shift.id] = item.topCandidate.guard.id;
          initialSelectedIds.add(item.shift.id);
        }
      });

      setBatchSelections(initialSelections);
      setBatchSelectedShiftIds(initialSelectedIds);
    }
  }, [isOpen, batchPlan]);

  // Update selected shift when initialShiftId changes
  React.useEffect(() => {
    if (initialShiftId) {
      setSelectedShiftId(initialShiftId);
      setMode('single');
    }
  }, [initialShiftId]);

  if (!isOpen) return null;

  // Single Guard Assignment Action
  const handleAssignGuard = (shift: Shift, candidate: GuardCandidateEvaluation) => {
    setIsAssigningSingleId(candidate.guard.id);
    
    // Fill the shift
    markShiftFilled(shift.id, candidate.guard.name);

    logAdminAction({
      type: 'shift_filled',
      title: 'Auto-Filled via Heuristic',
      description: `Assigned ${candidate.guard.name} (${candidate.guard.badgeNumber}) to ${shift.siteName} • Heuristic Match: ${candidate.score}%`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'emerald',
      metadata: {
        shiftId: shift.id,
        guardId: candidate.guard.id,
        guardName: candidate.guard.name,
        score: candidate.score,
        reasons: candidate.reasons
      }
    });

    showToast(
      'Shift Auto-Filled',
      `Assigned ${candidate.guard.name} (${candidate.score}% match) to ${shift.siteName}.`,
      'success'
    );

    setTimeout(() => {
      setIsAssigningSingleId(null);
      // If there are more open shifts, switch to the next one; else close
      const remainingOpen = openShifts.filter((s) => s.id !== shift.id);
      if (remainingOpen.length > 0) {
        setSelectedShiftId(remainingOpen[0].id);
      } else {
        onClose();
      }
    }, 400);
  };

  // Batch Auto-Fill Execution
  const handleApplyBatchAutoFill = () => {
    const shiftsToFill = openShifts.filter((s) => batchSelectedShiftIds.has(s.id) && batchSelections[s.id]);
    if (shiftsToFill.length === 0) return;

    setIsApplyingBatch(true);

    let filledCount = 0;
    shiftsToFill.forEach((shift) => {
      const guardId = batchSelections[shift.id];
      const guard = guardsList.find((g) => g.id === guardId);
      if (guard) {
        markShiftFilled(shift.id, guard.name);
        filledCount++;
      }
    });

    logAdminAction({
      type: 'shift_filled',
      title: 'Batch Auto-Fill Executed',
      description: `Automatically filled ${filledCount} open shifts using the training & recency heuristic engine.`,
      adminName: 'Lt. Mark O\'Connor',
      adminBadge: 'OPS-CMD-01',
      badgeVariant: 'emerald',
      metadata: { filledCount }
    });

    showToast(
      'Batch Auto-Fill Complete',
      `Successfully filled ${filledCount} open shifts.`,
      'success'
    );

    setTimeout(() => {
      setIsApplyingBatch(false);
      onClose();
    }, 500);
  };

  const toggleBatchShiftSelection = (shiftId: string) => {
    setBatchSelectedShiftIds((prev) => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  };

  return (
    <div 
      id="autofill-shifts-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div 
        id="autofill-shifts-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-950 via-slate-900 to-[#1e3a8a] text-white flex items-center justify-between shrink-0 border-b border-blue-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300/30" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  Auto-Fill Shifts Heuristic Engine
                </h2>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full font-mono">
                  Smart Match
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Ranks guards by site training qualification, rest days since last worked shift, and certifications.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-autofill-modal-btn"
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              id="autofill-mode-batch-btn"
              onClick={() => setMode('batch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'batch'
                  ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batch Auto-Fill All</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                mode === 'batch' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {openShifts.length}
              </span>
            </button>

            <button
              type="button"
              id="autofill-mode-single-btn"
              onClick={() => setMode('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'single'
                  ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Targeted Shift Analysis</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {openShifts.length} Open Shift{openShifts.length === 1 ? '' : 's'}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>{guardsList.length} Active Guards</span>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
          {openShifts.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">All Shifts Filled</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1">
                There are currently no open shifts on the roster. When new shifts are posted or trades are opened, the heuristic engine will suggest qualified candidates here.
              </p>
            </div>
          ) : mode === 'batch' ? (
            /* ========================================================================= */
            /* BATCH AUTO-FILL MODE                                                      */
            /* ========================================================================= */
            <div className="flex flex-col gap-4">
              {/* Info Callout */}
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3.5 rounded-xl flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      Heuristic Dispatch Optimization
                    </h4>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed mt-0.5">
                      The engine evaluated <strong>{guardsList.length} guards</strong> against <strong>{openShifts.length} open shifts</strong>. It prioritizes site qualification, resolves same-day shift conflicts, and balances fatigue based on the guard's last worked shift date.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const allIds = new Set(openShifts.map((s) => s.id));
                    setBatchSelectedShiftIds(allIds);
                  }}
                  className="text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
                >
                  Select All
                </button>
              </div>

              {/* Batch Shifts List */}
              <div className="flex flex-col gap-3">
                {batchPlan.map((item, index) => {
                  const shift = item.shift;
                  const isSelected = batchSelectedShiftIds.has(shift.id);
                  const chosenGuardId = batchSelections[shift.id];
                  const chosenCandidate = item.allCandidates.find((c) => c.guard.id === chosenGuardId) || item.topCandidate;

                  return (
                    <div
                      key={shift.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-600 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-70'
                      }`}
                    >
                      {/* Left: Checkbox & Shift Details */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          id={`batch-check-${shift.id}`}
                          checked={isSelected}
                          onChange={() => toggleBatchShiftSelection(shift.id)}
                          className="w-4 h-4 mt-1 rounded border-slate-300 text-[#1e3a8a] focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                              {shift.siteName}
                            </span>
                            {shift.urgency === 'emergency' && (
                              <span className="bg-red-600 text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded">
                                Emergency
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDateLabel(shift.date)} ({shift.startTime} - {shift.endTime})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1 font-mono font-bold text-[#1e3a8a] dark:text-blue-400">
                              <Clock className="w-3 h-3" />
                              {shift.hours}h
                            </span>
                            {shift.requiredCertifications && shift.requiredCertifications.length > 0 && (
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded font-mono truncate">
                                Reqs: {shift.requiredCertifications.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Suggested Guard Dropdown & Heuristic Score */}
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0 pl-7 sm:pl-0">
                        {chosenCandidate ? (
                          <div className="flex flex-col sm:items-end">
                            <div className="flex items-center gap-2">
                              {/* Match Score Badge */}
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                chosenCandidate.score >= 80 
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                                  : chosenCandidate.score >= 60 
                                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' 
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              }`}>
                                <Sparkles className="w-2.5 h-2.5" />
                                {chosenCandidate.score}% Match
                              </span>

                              {/* Guard Selector Dropdown */}
                              <select
                                value={chosenGuardId || ''}
                                onChange={(e) => {
                                  setBatchSelections((prev) => ({
                                    ...prev,
                                    [shift.id]: e.target.value
                                  }));
                                }}
                                className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[180px] truncate"
                              >
                                {item.allCandidates.map((cand) => (
                                  <option key={cand.guard.id} value={cand.guard.id}>
                                    {cand.guard.name} ({cand.score}% • {cand.isSiteTrained ? 'Trained' : 'OJT'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Heuristic Details Summary */}
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 sm:text-right">
                              {chosenCandidate.isSiteTrained ? '✓ Site Trained' : '⚠️ Needs Site OJT'} • {
                                chosenCandidate.daysSinceLastWorked === null 
                                  ? 'Fully Rested' 
                                  : `Last worked ${chosenCandidate.daysSinceLastWorked}d ago`
                              }
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-red-500 font-bold">No viable candidate</span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedShiftId(shift.id);
                            setMode('single');
                          }}
                          className="text-[11px] font-bold text-[#1e3a8a] dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          title="Inspect candidate ranking breakdown"
                        >
                          <span>Analyze</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* SINGLE SHIFT FOCUSED RECOMMENDATION MODE                                  */
            /* ========================================================================= */
            <div className="flex flex-col gap-4">
              {/* Shift Selector Dropdown & Header Card */}
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 text-[#1e3a8a] dark:text-blue-300 rounded-xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Target Open Shift</span>
                      {activeShift?.urgency === 'emergency' && (
                        <span className="bg-red-600 text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded">
                          Emergency
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                      {activeShift?.siteName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {activeShift && formatDateLabel(activeShift.date)} ({activeShift?.startTime} - {activeShift?.endTime})
                      </span>
                      <span>•</span>
                      <span className="font-mono font-bold">{activeShift?.hours} Hours</span>
                    </p>
                  </div>
                </div>

                {/* Shift Picker Dropdown */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase shrink-0">
                    Switch Shift:
                  </label>
                  <select
                    value={activeShift?.id || ''}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full sm:w-auto text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {openShifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.siteName} ({s.date} • {s.startTime})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Candidate Filters and Search */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    Filter Guards:
                  </span>

                  <button
                    type="button"
                    onClick={() => setCandidateFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      candidateFilter === 'all'
                        ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    All ({candidateEvaluations.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCandidateFilter('site_trained')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      candidateFilter === 'site_trained'
                        ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Site Trained Only
                  </button>

                  <button
                    type="button"
                    onClick={() => setCandidateFilter('high_rest')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      candidateFilter === 'high_rest'
                        ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Well-Rested (≥2d)
                  </button>

                  <button
                    type="button"
                    onClick={() => setCandidateFilter('has_bids')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      candidateFilter === 'has_bids'
                        ? 'bg-amber-500 text-slate-950 shadow-2xs'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    ⚡ Active Bids
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search candidate..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Ranked Candidate Cards */}
              <div className="flex flex-col gap-3">
                {filteredCandidates.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No matching guards found</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Try relaxing candidate filters</p>
                  </div>
                ) : (
                  filteredCandidates.map((cand, idx) => {
                    const isTopPick = idx === 0 && cand.score >= 80 && !cand.hasScheduleConflict;
                    const isAssigning = isAssigningSingleId === cand.guard.id;

                    return (
                      <div
                        key={cand.guard.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                          isTopPick
                            ? 'bg-gradient-to-r from-emerald-50/70 via-white to-blue-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-emerald-400 dark:border-emerald-700 shadow-sm'
                            : cand.hasScheduleConflict
                            ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        {/* Top Row: Guard Name, Match Score & Assign Button */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0 shadow-2xs ${
                              cand.score >= 80
                                ? 'bg-emerald-600 text-white'
                                : cand.score >= 60
                                ? 'bg-blue-700 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                            }`}>
                              #{idx + 1}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                                  {cand.guard.name}
                                </h4>
                                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-bold">
                                  {cand.guard.badgeNumber}
                                </span>
                                {cand.guard.role !== 'guard' && (
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded">
                                    {cand.guard.role}
                                  </span>
                                )}
                                {isTopPick && (
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Top Candidate
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                <span>{cand.guard.phone}</span>
                                <span>•</span>
                                <span className="capitalize">{cand.guard.role} Rank</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Score & Action */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className={`text-base font-black font-mono ${
                                  cand.score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : cand.score >= 60 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                                }`}>
                                  {cand.score}%
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Match Score</span>
                            </div>

                            <button
                              type="button"
                              id={`assign-guard-btn-${cand.guard.id}`}
                              disabled={cand.hasScheduleConflict || isAssigning}
                              onClick={() => activeShift && handleAssignGuard(activeShift, cand)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                cand.hasScheduleConflict
                                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                  : isTopPick
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                                  : 'bg-[#1e3a8a] dark:bg-blue-600 hover:bg-blue-900 text-white active:scale-95'
                              }`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{isAssigning ? 'Assigning...' : 'Assign Guard'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Mid Row: Key Qualification Badges */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                          {/* Training Status Badge */}
                          <div className={`p-2 rounded-lg border flex items-center gap-2 ${
                            cand.isSiteTrained
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                              : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                          }`}>
                            {cand.isSiteTrained ? (
                              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            )}
                            <div className="truncate">
                              <span className="font-bold block text-[10px] uppercase">Site Qualification</span>
                              <span className="truncate">{cand.isSiteTrained ? 'OJT Site Qualified' : 'Needs Site OJT'}</span>
                            </div>
                          </div>

                          {/* Last Worked Shift & Recency Badge */}
                          <div className="p-2 rounded-lg border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold block text-[10px] uppercase text-slate-400">Last Worked Shift</span>
                              <span className="truncate font-medium">
                                {cand.lastWorkedShift ? (
                                  cand.daysSinceLastWorked === 0 ? 'Today' : `${cand.daysSinceLastWorked}d ago (${cand.lastWorkedShift.siteName.split('-')[0].trim()})`
                                ) : (
                                  'Full Rest (No Prior Shifts)'
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Bid & Certs Status */}
                          <div className="p-2 rounded-lg border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Award className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold block text-[10px] uppercase text-slate-400">Certifications</span>
                              <span className="truncate">
                                {cand.missingCertifications.length === 0 ? '✓ 100% Reqs Met' : `Missing ${cand.missingCertifications.length}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Row: Heuristic Bullet Points */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {cand.reasons.map((reason, rIdx) => (
                            <span
                              key={rIdx}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                reason.includes('Conflict')
                                  ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-200'
                                  : reason.includes('Qualified') || reason.includes('100%') || reason.includes('Lead-Certified')
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'batch' ? (
              <span>
                <strong>{batchSelectedShiftIds.size}</strong> of {openShifts.length} open shifts selected for auto-assignment
              </span>
            ) : (
              <span>
                Evaluating <strong>{candidateEvaluations.length} guards</strong> for <strong>{activeShift?.siteName}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>

            {mode === 'batch' && openShifts.length > 0 && (
              <button
                type="button"
                id="execute-batch-autofill-btn"
                disabled={batchSelectedShiftIds.size === 0 || isApplyingBatch}
                onClick={handleApplyBatchAutoFill}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300/30" />
                <span>
                  {isApplyingBatch
                    ? 'Applying Auto-Fill...'
                    : `Apply Auto-Fill (${batchSelectedShiftIds.size} Shifts)`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
