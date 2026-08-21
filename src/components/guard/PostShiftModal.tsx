import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { calculateHours } from '../../utils/time';
import { Calendar, Clock, MapPin, ShieldAlert, X } from 'lucide-react';

interface PostShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PostShiftModal: React.FC<PostShiftModalProps> = ({ isOpen, onClose }) => {
  const { postTradeRequest, activeGuard } = useShiftOps();
  
  const todayStr = new Date().toISOString().split('T')[0];
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
      setError('Please provide a reason for the giveaway/trade');
      return;
    }

    postTradeRequest({
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
            <h3 className="font-bold text-sm uppercase tracking-wide">+ Post Shift for Trade / Giveaway</h3>
            <p className="text-[11px] text-blue-200">
              Submit to Ops Admin for review before it goes live on the Trade Board
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
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

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-lg font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Site Name & Post Location */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Site Name *
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Gotham Financial Plaza"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Post Location / Gate (Optional)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. North Gate Access / Main Lobby"
                  className="w-full border border-slate-300 rounded-lg p-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
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
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
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
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
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
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
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

          {/* Reason */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Reason for Trade / Giveaway *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family commitment, conflict with class schedule, or looking to swap for morning shift."
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-50 uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              id="submit-post-trade-btn"
              type="submit"
              className="flex-1 py-2.5 bg-[#1e3a8a] text-white font-bold rounded-lg text-xs hover:bg-blue-900 shadow-md uppercase tracking-wider transition-all"
            >
              Submit to Ops
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
