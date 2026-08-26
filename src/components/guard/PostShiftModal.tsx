import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { calculateHours } from '../../utils/time';
import { SiteSelectDropdown } from '../common/SiteSelectDropdown';
import { Calendar, Clock, MapPin, ShieldAlert, X, ArrowRightLeft, Gift, AlertCircle, Building2, Sparkles } from 'lucide-react';

interface PostShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PostShiftModal: React.FC<PostShiftModalProps> = ({ isOpen, onClose }) => {
  const { postTradeRequest, activeGuard } = useShiftOps();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [tradeType, setTradeType] = useState<'giveaway' | 'swap'>('giveaway');
  const [siteName, setSiteName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('22:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const hours = calculateHours(startTime, endTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) {
      setError('Please specify the site name');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason / notes for this request');
      return;
    }

    postTradeRequest({
      type: tradeType,
      siteName,
      location,
      date,
      startTime,
      endTime,
      reason
    });

    // Reset and close
    setSiteName('');
    setLocation('');
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="post-shift-modal" 
        className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-[#1e3a8a] text-white p-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wide">
              {tradeType === 'swap' ? '🔄 Post Shift for Swap (Trade)' : '🎁 Give Up / Drop Shift (Giveaway)'}
            </h3>
            <p className="text-[11px] text-blue-200">
              Submit request to Ops Admin for review before it goes live on the Guard Board
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Guard identifier chip */}
          <div className="flex items-center justify-between bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 text-xs text-blue-900">
            <span>
              Requesting Guard: <strong>{activeGuard.name}</strong> ({activeGuard.badgeNumber})
            </span>
            <span className="bg-blue-200 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
              Logged In
            </span>
          </div>

          {/* Request Type Selector (Give Up / Drop vs Trade / Swap) */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Select Intent: What do you want to do with this shift? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Give Up / Drop Shift */}
              <button
                type="button"
                id="intent-giveaway-btn"
                onClick={() => setTradeType('giveaway')}
                className={`p-3 rounded-xl border-2 text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  tradeType === 'giveaway'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-black">
                    <Gift className={`w-4 h-4 ${tradeType === 'giveaway' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    Give Up / Drop Shift
                  </span>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    tradeType === 'giveaway' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                  }`}>
                    {tradeType === 'giveaway' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                  I want to drop this shift completely. Any qualified guard can claim coverage (no return trade needed).
                </p>
              </button>

              {/* Option 2: Trade / Swap */}
              <button
                type="button"
                id="intent-swap-btn"
                onClick={() => setTradeType('swap')}
                className={`p-3 rounded-xl border-2 text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  tradeType === 'swap'
                    ? 'border-[#1e3a8a] bg-blue-50/60 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-black">
                    <ArrowRightLeft className={`w-4 h-4 ${tradeType === 'swap' ? 'text-[#1e3a8a]' : 'text-slate-400'}`} />
                    Trade / Swap Shift
                  </span>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    tradeType === 'swap' ? 'border-[#1e3a8a] bg-[#1e3a8a]' : 'border-slate-300'
                  }`}>
                    {tradeType === 'swap' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                  I want to exchange this shift for another shift with a fellow guard.
                </p>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-lg font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Site Name Dropdown & Post Location */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <SiteSelectDropdown
                id="post-trade-site-select"
                required
                value={siteName}
                onChange={(name, site) => {
                  setSiteName(name);
                  if (site) {
                    setLocation(site.address);
                  }
                }}
                onAddressAutoPopulate={(addr) => {
                  setLocation(addr);
                }}
                label="Authorized Facility / Site *"
                placeholder="Select facility from directory..."
                helperText="Select from standardized facility directory or type custom name"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center justify-between">
                <span>Facility Address & Post Location</span>
                {location && (
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 normal-case">
                    <Sparkles className="w-3 h-3" /> Auto-populated
                  </span>
                )}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. 2001 W Garfield St, Terminal 91 / Gate 3"
                  className="w-full border border-slate-300 rounded-lg p-2.5 pl-9 text-xs text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                />
              </div>
            </div>
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Shift Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                End Time *
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
              />
            </div>
          </div>

          {/* Hours banner */}
          <div className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Calculated Duration
            </span>
            <span className="font-bold text-[#1e3a8a] bg-white px-2 py-0.5 rounded shadow-2xs">
              {hours} Hours
            </span>
          </div>

          {/* Reason / Notes Open Text Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              {tradeType === 'swap'
                ? 'Swap Preferences & Reason *'
                : 'Reason for Giving Up Shift *'}
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                tradeType === 'swap'
                  ? 'e.g. Looking to exchange for morning shift on Friday or weekend day watch.'
                  : 'e.g. Personal emergency, doctor appointment, or need voluntary coverage drop.'
              }
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Ops dispatchers can review and edit these notes before approving the listing.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-50 uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-post-trade-btn"
              type="submit"
              className={`flex-1 py-2.5 text-white font-bold rounded-lg text-xs shadow-md uppercase tracking-wider transition-all cursor-pointer ${
                tradeType === 'swap' ? 'bg-[#1e3a8a] hover:bg-blue-900' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {tradeType === 'swap' ? 'Submit Swap Request' : 'Submit Shift Drop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
