import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  Coffee, 
  Clock, 
  Settings, 
  CheckCircle2, 
  ShieldAlert, 
  AlertTriangle,
  Info,
  Sliders,
  X
} from 'lucide-react';

interface MealBreakSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MealBreakSettingsModal: React.FC<MealBreakSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { mealBreakDurationMinutes, setMealBreakDurationMinutes, showToast } = useShiftOps();
  const [durationInput, setDurationInput] = useState<number>(mealBreakDurationMinutes);
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom'>(
    [20, 30, 45, 60].includes(mealBreakDurationMinutes) ? mealBreakDurationMinutes : 'custom'
  );

  if (!isOpen) return null;

  const presets = [
    { label: '20 Minutes', value: 20, desc: 'Express meal interval' },
    { label: '30 Minutes', value: 30, desc: 'Standard security meal break' },
    { label: '45 Minutes', value: 45, desc: 'Extended meal break' },
    { label: '60 Minutes', value: 60, desc: 'Full 1-hour meal allowance' }
  ];

  const handleSelectPreset = (mins: number) => {
    setSelectedPreset(mins);
    setDurationInput(mins);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = Math.max(5, Math.min(180, Math.round(durationInput)));
    setMealBreakDurationMinutes(valid);
    onClose();
  };

  return (
    <div 
      id="meal-break-settings-modal-overlay"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div 
        id="meal-break-settings-modal-content"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20 backdrop-blur-xs">
              <Coffee className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Meal Break Policy Configuration
              </h3>
              <p className="text-[11px] text-amber-100 font-medium">
                Admin policy for guard shift break timers & late alerts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Information Callout */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[11px]">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Shift Break Rules Summary:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300 pl-1 font-mono">
              <li><strong>Rest Break:</strong> Fixed at 10 minutes.</li>
              <li><strong>Meal Break:</strong> Configurable below (currently <strong>{mealBreakDurationMinutes} mins</strong>).</li>
              <li><strong>Overdue Enforcement:</strong> Guard is alerted when timer expires. Dispatch Admin is alerted if guard is <strong>&gt; 5 minutes late</strong> returning.</li>
            </ul>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Select Preset Duration
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleSelectPreset(preset.value)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedPreset === preset.value
                      ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/40'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">{preset.label}</span>
                    {selectedPreset === preset.value && (
                      <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
                    {preset.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Duration Input */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
              Custom Meal Break Duration (Minutes)
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  id="meal-break-duration-input"
                  type="number"
                  min={5}
                  max={180}
                  value={durationInput}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setDurationInput(isNaN(val) ? 5 : val);
                    setSelectedPreset('custom');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                  minutes
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono shrink-0">
                Range: 5 - 180 min
              </div>
            </div>
          </div>

          {/* Visual Live Preview of Alert Trigger */}
          <div className="bg-slate-900 text-white rounded-xl p-3 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">Guard Break Allocation:</span>
              <span className="font-mono text-amber-400 font-bold">{durationInput} minutes</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">Guard Break-Over Alert:</span>
              <span className="font-mono text-cyan-400 font-bold">At {durationInput}:00</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">Admin Overdue CAD Trigger:</span>
              <span className="font-mono text-rose-400 font-bold">At {durationInput + 5}:00 (+5m late)</span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-meal-break-duration-btn"
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Meal Policy ({durationInput}m)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
