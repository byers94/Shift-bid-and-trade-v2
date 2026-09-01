import React, { useState, useEffect } from 'react';
import { 
  ScheduledShift, 
  SiteProfile, 
  DepartureReasonType 
} from '../../types/shift';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  ShieldAlert, 
  Coffee, 
  UserCheck, 
  Footprints, 
  Siren, 
  Send, 
  RotateCcw,
  Compass,
  ArrowRight,
  Info
} from 'lucide-react';
import { formatDistance } from '../../utils/geo';
import { playGeofenceDepartureWarningSound } from '../../utils/audioAlert';

interface GuardDeparturePromptModalProps {
  isOpen: boolean;
  activeShift: ScheduledShift;
  site?: SiteProfile | null;
  currentDistanceMeters?: number;
  debounceSecondsRemaining?: number;
  onSubmitReason: (reason: DepartureReasonType, note: string) => void;
  onCheckReturnOnSite: () => void;
  onDismissAlert?: () => void;
}

const DEPARTURE_REASON_OPTIONS: Array<{
  value: DepartureReasonType;
  label: string;
  desc: string;
  icon: React.ElementType;
  badgeColor: string;
}> = [
  {
    value: 'Authorized Break',
    label: 'Authorized Meal / Rest Break',
    desc: 'Approved rest or meal interval in designated exterior area',
    icon: Coffee,
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
  },
  {
    value: 'Incident Escort',
    label: 'Incident / Staff Escort',
    desc: 'Escorting visitor, staff, or resident to off-property parking/transit',
    icon: UserCheck,
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
  },
  {
    value: 'Perimeter Sweep',
    label: 'Extended Perimeter Sweep',
    desc: 'Routine perimeter fence, alley, or curb line check',
    icon: Footprints,
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
  },
  {
    value: 'Emergency Response',
    label: 'Emergency Response / Pursuit',
    desc: 'Immediate safety response or following trespass subject',
    icon: Siren,
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
  },
  {
    value: 'Other',
    label: 'Other Operational Reason',
    desc: 'Provide specific supervisor-authorized duty note below',
    icon: Info,
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
  }
];

export const GuardDeparturePromptModal: React.FC<GuardDeparturePromptModalProps> = ({
  isOpen,
  activeShift,
  site,
  currentDistanceMeters = 75,
  debounceSecondsRemaining = 180,
  onSubmitReason,
  onCheckReturnOnSite,
  onDismissAlert
}) => {
  const [selectedReason, setSelectedReason] = useState<DepartureReasonType>('Authorized Break');
  const [customNote, setCustomNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      playGeofenceDepartureWarningSound();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.max(0, sec) % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isBreachedAlready = activeShift.offSiteBreachStatus === 'breached_unacknowledged' || 
                            activeShift.offSiteBreachStatus === 'breached_acknowledged';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      onSubmitReason(selectedReason, customNote.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="guard-departure-prompt-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Alert Banner */}
        <div className={`p-4 ${isBreachedAlready ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'} flex items-start gap-3.5`}>
          <div className="p-2.5 bg-black/15 rounded-2xl shrink-0 mt-0.5">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/20 text-inherit">
                {isBreachedAlready ? 'OFF-SITE BREACH ACTIVE' : 'GEOFENCE DEPARTURE DETECTED'}
              </span>
            </div>
            <h3 className="text-base font-black tracking-tight mt-0.5">
              {isBreachedAlready ? 'Dispatch CAD Notified of Site Departure' : 'You Have Moved Beyond Assigned Perimeter'}
            </h3>
            <p className="text-xs font-semibold opacity-90 mt-0.5">
              Site: <span className="font-bold underline">{activeShift.siteName}</span>
            </p>
          </div>
        </div>

        {/* Live Timer & Distance Strip */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span>Position: ~{formatDistance(currentDistanceMeters)} outside boundary</span>
          </div>

          {!isBreachedAlready && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-200 dark:bg-amber-900/80 rounded-xl text-amber-950 dark:text-amber-100 font-mono text-xs font-black">
              <Clock className="w-3.5 h-3.5 animate-pulse text-amber-700 dark:text-amber-300" />
              <span>{formatSeconds(debounceSecondsRemaining)} buffer</span>
            </div>
          )}
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Select Authorized Departure Reason
            </label>
            <div className="space-y-2">
              {DEPARTURE_REASON_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = selectedReason === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="departureReason"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => setSelectedReason(opt.value)}
                      className="mt-1 accent-blue-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {opt.label}
                        </span>
                      </div>
                      <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {opt.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Operational Note / Dispatch Justification
            </label>
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Escorting RN Adams to vehicle in exterior lot #3, returning in 5 minutes."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* Instructions note */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-2xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Submitting a verified reason records an excused departure in your DAR and clears automatic supervisor escalation.</span>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={onCheckReturnOnSite}
              className="w-full sm:w-1/2 py-2.5 px-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Verify I'm Back On-Site</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-1/2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>Submit Reason</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
