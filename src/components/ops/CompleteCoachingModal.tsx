import React, { useState } from 'react';
import { 
  CheckCircle2, 
  X, 
  Award, 
  TrendingUp, 
  Calendar, 
  Clock, 
  User, 
  Shield, 
  FileText, 
  Check, 
  Plus, 
  Trash2,
  Sparkles
} from 'lucide-react';
import { GuardCoachingSession } from '../../types/shift';
import { useShiftOps } from '../../context/ShiftOpsContext';

interface CompleteCoachingModalProps {
  session: GuardCoachingSession | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export const CompleteCoachingModal: React.FC<CompleteCoachingModalProps> = ({
  session,
  isOpen,
  onClose,
  onCompleted
}) => {
  const { completeGuardCoaching } = useShiftOps();

  const [scoreBefore, setScoreBefore] = useState<number>(session?.performanceScoreBefore ?? 78);
  const [scoreAfter, setScoreAfter] = useState<number>(
    session?.performanceScoreAfter ?? ((session?.performanceScoreBefore ?? 78) + 12)
  );
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [improvementOutcome, setImprovementOutcome] = useState<string>(
    'Significant Improvement (+10% on-time arrival, 100% DAR checklist compliance)'
  );
  const [attendanceVerified, setAttendanceVerified] = useState<boolean>(true);
  const [actionItems, setActionItems] = useState<string[]>([
    'Maintain daily DAR GPS checkpoint verification',
    'Follow standard 2-hour minimum notice protocol for schedule shifts'
  ]);
  const [newActionItem, setNewActionItem] = useState<string>('');

  // Reset or initialize state when session changes
  React.useEffect(() => {
    if (session) {
      const before = session.performanceScoreBefore ?? 78;
      const after = session.performanceScoreAfter ?? Math.min(100, before + 12);
      setScoreBefore(before);
      setScoreAfter(after);
      setCompletionNotes(
        session.completionNotes ||
        `Conducted 1-on-1 coaching session on "${session.topic}". Officer demonstrated thorough understanding of operational directives and verified SLA checklist compliance.`
      );
      setImprovementOutcome(
        session.improvementOutcome ||
        `Verified Operational Improvement (+${after - before} pts ASR index progression)`
      );
      setAttendanceVerified(session.attendanceVerified ?? true);
      setActionItems(
        session.actionItems && session.actionItems.length > 0
          ? session.actionItems
          : [
              `Execute standard checklist for "${session.topic}"`,
              'Submit on-time DAR logs with photo verification'
            ]
      );
    }
  }, [session]);

  if (!isOpen || !session) return null;

  const scoreDelta = scoreAfter - scoreBefore;

  const handleAddActionItem = () => {
    if (newActionItem.trim()) {
      setActionItems([...actionItems, newActionItem.trim()]);
      setNewActionItem('');
    }
  };

  const handleRemoveActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    completeGuardCoaching(session.id, {
      completionNotes,
      improvementOutcome,
      performanceScoreAfter: scoreAfter,
      attendanceVerified,
      actionItems
    });
    if (onCompleted) onCompleted();
    onClose();
  };

  const presetOutcomes = [
    `Significant Improvement (+${scoreDelta} pts ASR index, 100% checklist compliance)`,
    'Exemplary Operational Mastery & Leadership Recognition',
    'Satisfactory Attendance & Punctuality Remediation',
    'De-escalation & Client Concierge Protocol Certified',
    'Post Security & Geofence Boundary Compliance Achieved'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div 
        id="complete-coaching-modal"
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Record Coaching Session Completion
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                Log resolution notes, attendance verification, and performance improvement metrics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session Summary Header Info */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-sm flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                {session.guardName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Officer Assigned</div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <span>{session.guardName}</span>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 bg-neutral-200 dark:bg-neutral-800 rounded text-neutral-700 dark:text-neutral-300">
                    {session.guardBadge}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Scheduled Date & Time</div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <span>{session.scheduledDate}</span>
                  <span>@</span>
                  <span>{session.scheduledTime}</span>
                  <span className="text-xs font-normal text-neutral-500">({session.durationMinutes}m)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/80">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Coaching Topic:</div>
            <div className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
              {session.topic}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Performance Improvement Scoring (Before & After) */}
          <div className="bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Performance Score Improvement Progression
                </span>
              </div>
              <div className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1 ${
                scoreDelta > 0 
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600'
              }`}>
                <span>Score Delta:</span>
                <span>{scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Score Before */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                  <span>Pre-Coaching Score</span>
                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{scoreBefore}/100</span>
                </label>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={scoreBefore}
                  onChange={(e) => setScoreBefore(Number(e.target.value))}
                  className="w-full accent-neutral-600 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Score After */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                  <span>Post-Coaching Evaluation Score</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{scoreAfter}/100</span>
                </label>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={scoreAfter}
                  onChange={(e) => setScoreAfter(Number(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Improvement Outcome & Classification */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Remediation Outcome & Classification</span>
            </label>
            <input
              type="text"
              id="input-coaching-outcome"
              value={improvementOutcome}
              onChange={(e) => setImprovementOutcome(e.target.value)}
              placeholder="e.g. Significant Improvement (+10% on-time arrival)"
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
              required
            />
            {/* Outcome Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {presetOutcomes.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImprovementOutcome(preset)}
                  className="text-[11px] px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-neutral-700 dark:text-neutral-300 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-md transition-colors border border-neutral-200/80 dark:border-neutral-700/80 cursor-pointer"
                >
                  {preset.split('(')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Supervisor Completion Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Supervisor Debrief Notes & Assessment</span>
            </label>
            <textarea
              id="textarea-coaching-notes"
              rows={3}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Detail the discussion points, guard responsiveness, and verification of corrective actions..."
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-normal resize-none"
              required
            />
          </div>

          {/* Action Items Checklist */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center justify-between">
              <span>Post-Coaching Follow-Up Action Items</span>
              <span className="text-[11px] font-normal text-neutral-400">({actionItems.length} assigned)</span>
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {actionItems.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 text-xs text-neutral-800 dark:text-neutral-200"
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveActionItem(idx)}
                    className="text-neutral-400 hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new action item */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newActionItem}
                onChange={(e) => setNewActionItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddActionItem();
                  }
                }}
                placeholder="Add actionable commitment..."
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddActionItem}
                className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Attendance Verified Checkbox */}
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
            <input
              type="checkbox"
              id="checkbox-attendance-verified"
              checked={attendanceVerified}
              onChange={(e) => setAttendanceVerified(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <label 
              htmlFor="checkbox-attendance-verified"
              className="text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer select-none"
            >
              Verify Officer <span className="font-bold">{session.guardName}</span> attended and fully completed the session on record.
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-coaching-completion"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Complete Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
