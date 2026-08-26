import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  AlertTriangle, 
  Zap, 
  RefreshCw, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Moon, 
  Smartphone, 
  Check, 
  X, 
  Info, 
  Play, 
  RotateCcw,
  Sparkles,
  MapPin,
  Clock
} from 'lucide-react';

interface ShiftAlertPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftAlertPreferencesModal: React.FC<ShiftAlertPreferencesModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    activeGuard, 
    alertPreferences, 
    updateAlertPreferences, 
    resetAlertPreferences,
    testAlertNotification,
    showToast
  } = useShiftOps();

  const [hasSavedFeedback, setHasSavedFeedback] = useState(false);

  if (!isOpen) return null;

  const handleToggle = (key: keyof typeof alertPreferences) => {
    if (typeof alertPreferences[key] === 'boolean') {
      const nextVal = !alertPreferences[key];
      updateAlertPreferences({ [key]: nextVal });
      triggerFeedback();
    }
  };

  const handleTimeChange = (key: 'quietHoursStart' | 'quietHoursEnd', val: string) => {
    updateAlertPreferences({ [key]: val });
    triggerFeedback();
  };

  const triggerFeedback = () => {
    setHasSavedFeedback(true);
    setTimeout(() => setHasSavedFeedback(false), 2000);
  };

  const handleEnableAll = () => {
    updateAlertPreferences({
      emergencyAlerts: true,
      urgentOpenShifts: true,
      tradeMatches: true,
      soundEnabled: true,
      notifyViaSms: true
    });
    triggerFeedback();
    showToast('All Alerts Enabled', 'Emergency, Urgent, and Trade notifications are now active.', 'success');
  };

  const activeCategoriesCount = [
    alertPreferences.emergencyAlerts,
    alertPreferences.urgentOpenShifts,
    alertPreferences.tradeMatches
  ].filter(Boolean).length;

  return (
    <div 
      id="shift-alert-preferences-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="shift-alert-preferences-modal-dialog"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <header className="bg-[#1e3a8a] dark:bg-slate-950 text-white p-4 sm:p-5 flex items-center justify-between border-b dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700/60 dark:bg-slate-800 border border-blue-400/40 flex items-center justify-center text-blue-200 shadow-inner">
              <BellRing className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight uppercase">Shift Alert Preferences</h2>
                {hasSavedFeedback && (
                  <span className="text-[10px] bg-emerald-500/90 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200 dark:text-slate-400 mt-0.5">
                Configure instant push & audio notifications for <span className="font-bold text-white">{activeGuard.name}</span> ({activeGuard.badgeNumber})
              </p>
            </div>
          </div>

          <button
            id="alert-prefs-close-btn"
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-900 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Close Alert Preferences Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Active Summary Pill Banner */}
          <div className="bg-blue-50/80 dark:bg-slate-800/60 border border-blue-200/80 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <div className="font-extrabold text-blue-950 dark:text-blue-200 text-xs">
                  {activeCategoriesCount} of 3 Alert Channels Active
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {activeCategoriesCount === 3 
                    ? 'Receiving all high-priority facility and shift dispatches'
                    : activeCategoriesCount === 0
                    ? 'All standard notification categories are currently muted'
                    : 'Custom notification filtering active'}
                </div>
              </div>
            </div>

            <button
              id="alert-prefs-enable-all-btn"
              onClick={handleEnableAll}
              className="text-[10px] font-extrabold bg-[#1e3a8a] hover:bg-blue-900 text-white px-2.5 py-1.5 rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              Enable All
            </button>
          </div>

          {/* Primary Alert Categories */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Push Notification Categories
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Live Sync</span>
            </div>

            {/* 1. Emergency Alerts */}
            <div 
              id="alert-pref-card-emergency"
              className={`p-3.5 rounded-xl border transition-all ${
                alertPreferences.emergencyAlerts 
                  ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 shadow-2xs' 
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-85'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    alertPreferences.emergencyAlerts
                      ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                        Emergency Alerts
                      </h3>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 rounded font-mono">
                        Critical
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Instant alerts for site lockdowns, active security threats, fire evacuations, and mandatory commander dispatches.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        id="test-emergency-alert-btn"
                        onClick={() => testAlertNotification('emergency_alerts')}
                        className="text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:text-rose-900 flex items-center gap-1 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded shadow-2xs cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" /> Test Alert
                      </button>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                        Overrides DND mode
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  id="toggle-emergency-alerts-btn"
                  role="switch"
                  aria-checked={alertPreferences.emergencyAlerts}
                  onClick={() => handleToggle('emergencyAlerts')}
                  className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-400 ${
                    alertPreferences.emergencyAlerts ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle Emergency Alerts"
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                      alertPreferences.emergencyAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 2. Urgent Open Shifts */}
            <div 
              id="alert-pref-card-urgent"
              className={`p-3.5 rounded-xl border transition-all ${
                alertPreferences.urgentOpenShifts 
                  ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 shadow-2xs' 
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-85'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    alertPreferences.urgentOpenShifts
                      ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                        Urgent Open Shifts
                      </h3>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded font-mono">
                        Priority
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Immediate notifications when urgent open shifts, short-notice vacancies, or surge premium callouts are published by Ops.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        id="test-urgent-shifts-btn"
                        onClick={() => testAlertNotification('urgent_open_shifts')}
                        className="text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 flex items-center gap-1 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded shadow-2xs cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" /> Test Alert
                      </button>
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  id="toggle-urgent-shifts-btn"
                  role="switch"
                  aria-checked={alertPreferences.urgentOpenShifts}
                  onClick={() => handleToggle('urgentOpenShifts')}
                  className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    alertPreferences.urgentOpenShifts ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle Urgent Open Shifts"
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                      alertPreferences.urgentOpenShifts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 3. Trade Matches */}
            <div 
              id="alert-pref-card-trades"
              className={`p-3.5 rounded-xl border transition-all ${
                alertPreferences.tradeMatches 
                  ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 shadow-2xs' 
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-85'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    alertPreferences.tradeMatches
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                        Trade Matches & Swaps
                      </h3>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 rounded font-mono">
                        Trades
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Push updates when coworkers post giveaway shifts, swap proposals are submitted for your review, or trades are approved.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        id="test-trade-matches-btn"
                        onClick={() => testAlertNotification('trade_matches')}
                        className="text-[10px] font-bold text-blue-700 dark:text-blue-300 hover:text-blue-900 flex items-center gap-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded shadow-2xs cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" /> Test Alert
                      </button>
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  id="toggle-trade-matches-btn"
                  role="switch"
                  aria-checked={alertPreferences.tradeMatches}
                  onClick={() => handleToggle('tradeMatches')}
                  className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    alertPreferences.tradeMatches ? 'bg-[#1e3a8a] dark:bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle Trade Matches"
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                      alertPreferences.tradeMatches ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Filtering & Sound Delivery Options */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3.5 space-y-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Delivery & Filtering Controls
            </span>

            {/* Site Qualification Filter */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Qualified Sites Only
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Only notify for your {activeGuard.ojtSites.length} cleared facilities ({activeGuard.ojtSites.slice(0, 2).join(', ')}{activeGuard.ojtSites.length > 2 ? '...' : ''})
                  </div>
                </div>
              </div>

              <button
                id="toggle-site-qualified-only-btn"
                role="switch"
                aria-checked={alertPreferences.siteQualifiedOnly}
                onClick={() => handleToggle('siteQualifiedOnly')}
                className={`w-9 h-5 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                  alertPreferences.siteQualifiedOnly ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-label="Toggle Site Qualified Only filter"
              >
                <span
                  className={`block w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                    alertPreferences.siteQualifiedOnly ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Audible Alert Sound */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {alertPreferences.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                    <span>Audible Alert Tone & Chime</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Play synthesizer chime on high-priority incoming dispatches
                  </div>
                </div>
              </div>

              <button
                id="toggle-sound-enabled-btn"
                role="switch"
                aria-checked={alertPreferences.soundEnabled}
                onClick={() => handleToggle('soundEnabled')}
                className={`w-9 h-5 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                  alertPreferences.soundEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-label="Toggle Sound Enabled"
              >
                <span
                  className={`block w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                    alertPreferences.soundEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* SMS Dispatch Notifications */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    SMS Text Fallback
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    Dispatch SMS link to {activeGuard.phone}
                  </div>
                </div>
              </div>

              <button
                id="toggle-sms-notify-btn"
                role="switch"
                aria-checked={alertPreferences.notifyViaSms}
                onClick={() => handleToggle('notifyViaSms')}
                className={`w-9 h-5 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                  alertPreferences.notifyViaSms ? 'bg-[#1e3a8a] dark:bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-label="Toggle SMS notifications"
              >
                <span
                  className={`block w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                    alertPreferences.notifyViaSms ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Scheduled Quiet Hours */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Scheduled Quiet Hours (Do Not Disturb)
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Silence non-emergency shift notices during off-duty rest
                    </div>
                  </div>
                </div>

                <button
                  id="toggle-quiet-hours-btn"
                  role="switch"
                  aria-checked={alertPreferences.quietHoursEnabled}
                  onClick={() => handleToggle('quietHoursEnabled')}
                  className={`w-9 h-5 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                    alertPreferences.quietHoursEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle Quiet Hours"
                >
                  <span
                    className={`block w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                      alertPreferences.quietHoursEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {alertPreferences.quietHoursEnabled && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3 animate-in fade-in">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">From:</span>
                    <input
                      id="quiet-hours-start-input"
                      type="time"
                      value={alertPreferences.quietHoursStart}
                      onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-800 dark:text-slate-200 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">To:</span>
                    <input
                      id="quiet-hours-end-input"
                      type="time"
                      value={alertPreferences.quietHoursEnd}
                      onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-800 dark:text-slate-200 w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <footer className="bg-slate-100 dark:bg-slate-950 p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <button
            id="reset-alert-preferences-btn"
            onClick={resetAlertPreferences}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            id="alert-prefs-done-btn"
            onClick={onClose}
            className="text-xs font-bold bg-[#1e3a8a] dark:bg-blue-600 hover:bg-blue-900 dark:hover:bg-blue-500 text-white px-5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Done</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
