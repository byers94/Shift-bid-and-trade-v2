import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { Trade, TrainingStatus } from '../../types/shift';
import { calculateHours, formatDateLabel } from '../../utils/time';
import { SiteSelectDropdown } from '../common/SiteSelectDropdown';
import { 
  ArrowRightLeft, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  ShieldAlert, 
  X,
  User,
  Building2,
  Sparkles
} from 'lucide-react';

interface ProposeSwapModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProposeSwapModal: React.FC<ProposeSwapModalProps> = ({ trade, isOpen, onClose }) => {
  const { proposeSwap, activeGuard } = useShiftOps();

  const todayStr = new Date().toISOString().split('T')[0];
  const [offeredSite, setOfferedSite] = useState('');
  const [offeredLocation, setOfferedLocation] = useState('');
  const [offeredDate, setOfferedDate] = useState(todayStr);
  const [offeredStartTime, setOfferedStartTime] = useState('08:00');
  const [offeredEndTime, setOfferedEndTime] = useState('16:00');
  const [datesTimesNotes, setDatesTimesNotes] = useState('');
  const [ojtStatus, setOjtStatus] = useState<TrainingStatus>('trained');
  const [error, setError] = useState('');

  if (!isOpen || !trade) return null;

  const hours = calculateHours(offeredStartTime, offeredEndTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offeredSite.trim()) {
      setError('Please provide the site name for your offered shift');
      return;
    }
    if (!datesTimesNotes.trim()) {
      setError('Please specify the dates and times you are available to work');
      return;
    }

    proposeSwap(trade.id, {
      siteName: offeredSite,
      location: offeredLocation,
      date: offeredDate,
      startTime: offeredStartTime,
      endTime: offeredEndTime,
      datesTimesNotes,
      ojtStatus
    });

    // Reset and close
    setOfferedSite('');
    setOfferedLocation('');
    setDatesTimesNotes('');
    setOjtStatus('trained');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="propose-swap-modal" 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="bg-[#1e3a8a] text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-300" />
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">Propose Shift Swap</h3>
              <p className="text-[11px] text-blue-200">Offer your shift in exchange for the requested post</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto bg-white dark:bg-slate-900">
          {/* Target Shift Being Requested */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              You Are Requesting To Take:
            </span>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{trade.originalShift.siteName}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formatDateLabel(trade.originalShift.date)} • {trade.originalShift.startTime} - {trade.originalShift.endTime}
                </p>
              </div>
              <span className="bg-[#1e3a8a] dark:bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-2xs">
                {trade.originalShift.hours} HRS
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              Listed by Guard: <strong className="text-slate-800 dark:text-slate-200">{trade.offeringGuard.name}</strong> ({trade.offeringGuard.badgeNumber})
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs p-2.5 rounded-lg font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Offering Guard's Shift Details */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <span className="text-[10px] font-black text-[#1e3a8a] dark:text-blue-400 uppercase tracking-wider block mb-3">
              Your Offered Shift Details:
            </span>

            <div className="grid grid-cols-1 gap-3 mb-3">
              <div>
                <SiteSelectDropdown
                  id="propose-swap-site-select"
                  required
                  value={offeredSite}
                  onChange={(name, site) => {
                    setOfferedSite(name);
                    if (site) {
                      setOfferedLocation(site.address);
                    }
                  }}
                  onAddressAutoPopulate={(addr) => {
                    setOfferedLocation(addr);
                  }}
                  label="Your Facility / Site Name *"
                  placeholder="Select facility being offered from directory..."
                  helperText="Standardized site selection will automatically populate facility address"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1 flex items-center justify-between">
                  <span>Post Location / Address</span>
                  {offeredLocation && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 normal-case">
                      <Sparkles className="w-3 h-3" /> Auto-populated
                    </span>
                  )}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={offeredLocation}
                    onChange={(e) => setOfferedLocation(e.target.value)}
                    placeholder="e.g. 2001 W Garfield St / Gate 3 Checkpoint"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 pl-9 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={offeredDate}
                  onChange={(e) => setOfferedDate(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Start *
                </label>
                <input
                  type="time"
                  required
                  value={offeredStartTime}
                  onChange={(e) => setOfferedStartTime(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  End *
                </label>
                <input
                  type="time"
                  required
                  value={offeredEndTime}
                  onChange={(e) => setOfferedEndTime(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg text-slate-700 dark:text-slate-300 font-semibold mb-3">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Offered Duration:
              </span>
              <span className="font-bold text-[#1e3a8a] dark:text-blue-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded shadow-2xs border border-slate-200 dark:border-slate-700">
                {hours} Hours
              </span>
            </div>
          </div>

          {/* Dates/Times Available Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Specific Dates & Times You Can Work *
            </label>
            <textarea
              required
              rows={2}
              value={datesTimesNotes}
              onChange={(e) => setDatesTimesNotes(e.target.value)}
              placeholder="e.g. Can cover full 12hr shift on Oct 17 or available anytime after 16:00."
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* OJT Status Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
              Your Site Qualification for ({trade.originalShift.siteName}) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOjtStatus('trained')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
                  ojtStatus === 'trained'
                    ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${ojtStatus === 'trained' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <div>
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">Site Trained</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">I know post protocols</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOjtStatus('needs_ojt')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
                  ojtStatus === 'needs_ojt'
                    ? 'border-red-600 bg-red-50/80 dark:bg-red-950/40 text-red-950 dark:text-red-200 ring-2 ring-red-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${ojtStatus === 'needs_ojt' ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`} />
                <div>
                  <span className="block text-xs font-bold text-red-700 dark:text-red-400">Needs OJT</span>
                  <span className="text-[10px] text-red-600 dark:text-red-400">Requires Ops signoff</span>
                </div>
              </button>
            </div>
            {ojtStatus === 'needs_ojt' && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-1.5 bg-red-50 dark:bg-red-950/40 p-2 rounded border border-red-200 dark:border-red-900/60">
                Note: Selecting "Needs OJT" highlights this proposal in RED for Ops review so management can verify training coverage.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-700 uppercase tracking-wider cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-swap-proposal-btn"
              type="submit"
              className="flex-1 py-2.5 bg-[#1e3a8a] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-md uppercase tracking-wider transition-all cursor-pointer"
            >
              Send Swap Proposal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
