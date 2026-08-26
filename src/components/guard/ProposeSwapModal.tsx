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
        className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="bg-[#1e3a8a] text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-300" />
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">Propose Shift Swap</h3>
              <p className="text-[11px] text-blue-200">Offer your shift in exchange for the requested post</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Target Shift Being Requested */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              You Are Requesting To Take:
            </span>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{trade.originalShift.siteName}</h4>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formatDateLabel(trade.originalShift.date)} • {trade.originalShift.startTime} - {trade.originalShift.endTime}
                </p>
              </div>
              <span className="bg-[#1e3a8a] text-white text-xs font-bold px-2 py-0.5 rounded">
                {trade.originalShift.hours} HRS
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              Listed by Guard: <strong>{trade.offeringGuard.name}</strong> ({trade.offeringGuard.badgeNumber})
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-lg font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Offering Guard's Shift Details */}
          <div className="border-t border-slate-200 pt-3">
            <span className="text-[10px] font-black text-[#1e3a8a] uppercase tracking-wider block mb-3">
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
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center justify-between">
                  <span>Post Location / Address</span>
                  {offeredLocation && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 normal-case">
                      <Sparkles className="w-3 h-3" /> Auto-populated
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={offeredLocation}
                  onChange={(e) => setOfferedLocation(e.target.value)}
                  placeholder="e.g. 2001 W Garfield St / Gate 3 Checkpoint"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={offeredDate}
                  onChange={(e) => setOfferedDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Start *
                </label>
                <input
                  type="time"
                  required
                  value={offeredStartTime}
                  onChange={(e) => setOfferedStartTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  End *
                </label>
                <input
                  type="time"
                  required
                  value={offeredEndTime}
                  onChange={(e) => setOfferedEndTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs bg-slate-100 p-2 rounded-lg text-slate-700 font-semibold mb-3">
              <span>Offered Duration:</span>
              <span className="font-bold text-[#1e3a8a]">{hours} Hours</span>
            </div>
          </div>

          {/* Dates/Times Available Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Specific Dates & Times You Can Work *
            </label>
            <textarea
              required
              rows={2}
              value={datesTimesNotes}
              onChange={(e) => setDatesTimesNotes(e.target.value)}
              placeholder="e.g. Can cover full 12hr shift on Oct 17 or available anytime after 16:00."
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            />
          </div>

          {/* OJT Status Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">
              Your Site Qualification for ({trade.originalShift.siteName}) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOjtStatus('trained')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all ${
                  ojtStatus === 'trained'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${ojtStatus === 'trained' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div>
                  <span className="block text-xs font-bold">Site Trained</span>
                  <span className="text-[10px] text-slate-500">I know post protocols</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOjtStatus('needs_ojt')}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all ${
                  ojtStatus === 'needs_ojt'
                    ? 'border-red-600 bg-red-50 text-red-900 ring-2 ring-red-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${ojtStatus === 'needs_ojt' ? 'text-red-600' : 'text-slate-400'}`} />
                <div>
                  <span className="block text-xs font-bold text-red-700">Needs OJT</span>
                  <span className="text-[10px] text-red-600">Requires Ops signoff</span>
                </div>
              </button>
            </div>
            {ojtStatus === 'needs_ojt' && (
              <p className="text-[11px] text-red-600 font-medium mt-1.5 bg-red-50 p-2 rounded border border-red-200">
                Note: Selecting "Needs OJT" highlights this proposal in RED for Ops review so management can verify training coverage.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-50 uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              id="submit-swap-proposal-btn"
              type="submit"
              className="flex-1 py-2.5 bg-[#1e3a8a] text-white font-bold rounded-lg text-xs hover:bg-blue-900 shadow-md uppercase tracking-wider transition-all"
            >
              Send Swap Proposal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
