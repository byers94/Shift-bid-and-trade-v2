import React, { useState, useEffect } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ScheduledShift, CallOffReason } from '../../types/shift';
import { 
  PhoneOff, 
  AlertTriangle, 
  Zap, 
  Bell, 
  Check, 
  X, 
  UserX, 
  ShieldAlert, 
  Building2, 
  Calendar, 
  Clock, 
  Radio,
  Sparkles
} from 'lucide-react';

interface GuardCallOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShift?: ScheduledShift | null;
}

export const GuardCallOffModal: React.FC<GuardCallOffModalProps> = ({
  isOpen,
  onClose,
  initialShift
}) => {
  const { 
    scheduledShifts, 
    guardsList, 
    recordGuardCallOff,
    showToast 
  } = useShiftOps();

  const [selectedShiftId, setSelectedShiftId] = useState<string>(initialShift?.id || '');
  const [reason, setReason] = useState<CallOffReason>('called_out_sick');
  const [notes, setNotes] = useState<string>('Guard contacted dispatch stating unable to report for shift.');
  const [autoAddBidding, setAutoAddBidding] = useState<boolean>(true);
  const [broadcastNotification, setBroadcastNotification] = useState<boolean>(true);

  // Sync initial shift if passed
  useEffect(() => {
    if (initialShift) {
      setSelectedShiftId(initialShift.id);
    } else if (scheduledShifts.length > 0 && !selectedShiftId) {
      setSelectedShiftId(scheduledShifts[0].id);
    }
  }, [initialShift, scheduledShifts, selectedShiftId]);

  if (!isOpen) return null;

  const targetShift = scheduledShifts.find(s => s.id === selectedShiftId) || initialShift;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetShift) {
      showToast('Error', 'Please select a scheduled shift to record call-off.', 'warning');
      return;
    }

    recordGuardCallOff({
      scheduledShiftId: targetShift.id,
      guardId: targetShift.guardId,
      guardName: targetShift.guardName,
      guardBadge: targetShift.guardBadge,
      siteName: targetShift.siteName,
      shiftDate: targetShift.date,
      startTime: targetShift.startTime,
      endTime: targetShift.endTime,
      reason,
      notes,
      autoAddToBiddingQueue: autoAddBidding,
      broadcastPushNotification: broadcastNotification
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 my-8 animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
              <PhoneOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Record Guard Call-Off / No-Show
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                  Emergency Dispatch
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Log a call-out, cancel shift assignment, and quick-add to the shift bidding queue with push alert.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Target Shift Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Select Scheduled Shift & Guard
            </label>
            <select
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
              required
            >
              {scheduledShifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date} ({s.startTime}-{s.endTime}) — {s.guardName} @ {s.siteName} [{s.status.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          {/* Shift Details Summary Card */}
          {targetShift && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5 text-rose-400" />
                  <span>{targetShift.guardName}</span>
                  <span className="font-mono text-slate-400">({targetShift.guardBadge})</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-mono font-bold">
                  {targetShift.date} • {targetShift.startTime} - {targetShift.endTime}
                </span>
              </div>
              <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{targetShift.siteName}</span>
              </div>
            </div>
          )}

          {/* Call-Off Reason */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Reason for Call-Off
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as CallOffReason)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="called_out_sick">🩺 Medical / Called Out Sick</option>
              <option value="no_show_unresponsive">🚨 Guard No-Show / Unresponsive</option>
              <option value="family_emergency">👨‍👩‍👧 Family Emergency</option>
              <option value="transportation_issue">🚗 Transportation / Vehicle Issue</option>
              <option value="personal_emergency">👤 Personal Emergency</option>
              <option value="disciplinary">⚖️ Administrative / Disciplinary Hold</option>
            </select>
          </div>

          {/* Dispatch Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Dispatch Logging Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter dispatcher notes regarding contact time, notification method, or replacement details..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
            />
          </div>

          {/* Automation Checkboxes */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAddBidding}
                onChange={(e) => setAutoAddBidding(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
              />
              <div>
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-300" />
                  Quick-Add to Shift Bidding Queue as Urgent Open Shift
                </span>
                <p className="text-[11px] text-slate-400">
                  Instantly creates an open emergency relief shift available for all qualified guards to claim or bid on.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={broadcastNotification}
                onChange={(e) => setBroadcastNotification(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-rose-500 bg-slate-900 border-slate-700 focus:ring-rose-500"
              />
              <div>
                <span className="font-bold text-rose-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  Send Instant Push Notification Alert to Guard Terminals
                </span>
                <p className="text-[11px] text-slate-400">
                  Broadcasts an urgent high-priority shift announcement with audio alert to all available security guards.
                </p>
              </div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/50 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Confirm Call-Off & Route Relief</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
