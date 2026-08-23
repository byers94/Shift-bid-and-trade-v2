import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { Shift, TrainingStatus } from '../../types/shift';
import { formatDateLabel } from '../../utils/time';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  MessageSquare, 
  Copy, 
  ExternalLink,
  Shield,
  Send,
  X
} from 'lucide-react';

interface BidModalProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BidModal: React.FC<BidModalProps> = ({ shift, isOpen, onClose }) => {
  const { submitBid, opsPhone, activeGuard } = useShiftOps();
  const [selectedStatus, setSelectedStatus] = useState<TrainingStatus | null>(null);
  const [submittedData, setSubmittedData] = useState<{ smsUrl: string; smsBody: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !shift) return null;

  const handleSelectOption = (status: TrainingStatus) => {
    setSelectedStatus(status);
    const result = submitBid(shift.id, status);
    setSubmittedData(result);
  };

  const handleOpenSms = () => {
    if (submittedData?.smsUrl) {
      window.open(submittedData.smsUrl, '_blank');
    }
  };

  const handleCopy = () => {
    if (submittedData?.smsBody) {
      navigator.clipboard.writeText(submittedData.smsBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleReset = () => {
    setSelectedStatus(null);
    setSubmittedData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="bid-modal-container" 
        className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-[#1e3a8a] text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-700/50 rounded-lg">
              <MessageSquare className="w-4 h-4 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">Text to Bid Dispatch</h3>
              <p className="text-[11px] text-blue-200">Select qualification to generate SMS payload</p>
            </div>
          </div>
          <button 
            id="bid-modal-close-btn"
            onClick={handleReset} 
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex flex-col gap-4">
          {/* Target Shift Summary */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold text-slate-800 text-sm">{shift.siteName}</h4>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                shift.urgency === 'emergency' 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {shift.urgency}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 mb-1.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatDateLabel(shift.date)} • {shift.startTime} - {shift.endTime}
              </span>
              <span className="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {shift.hours} HRS
              </span>
            </div>
            {shift.address && (
              <div className="flex items-center gap-1 text-xs text-slate-700 font-semibold mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#1e3a8a] shrink-0" />
                <span>{shift.address}</span>
              </div>
            )}
            {shift.location && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                <span className="text-[10px] text-slate-400 font-medium">Post Area:</span>
                {shift.location}
              </div>
            )}
          </div>

          {!submittedData ? (
            /* 3-Option Modal Selection */
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Select Your Site Training Status:
              </p>

              {/* Option 1: Trained */}
              <button
                id="bid-option-trained"
                onClick={() => handleSelectOption('trained')}
                className="w-full text-left p-3.5 rounded-lg border-2 border-emerald-500 bg-emerald-50/50 hover:bg-emerald-100/60 transition-all flex items-start gap-3 group"
              >
                <div className="p-1 bg-emerald-600 text-white rounded-full mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-sm">Site Trained & Qualified</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded">
                      Immediate
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800/80 mt-0.5">
                    I have completed site orientation and hold active credentials for this post.
                  </p>
                </div>
              </button>

              {/* Option 2: Needs OJT */}
              <button
                id="bid-option-needs-ojt"
                onClick={() => handleSelectOption('needs_ojt')}
                className="w-full text-left p-3.5 rounded-lg border-2 border-amber-500 bg-amber-50/50 hover:bg-amber-100/60 transition-all flex items-start gap-3 group"
              >
                <div className="p-1 bg-amber-600 text-white rounded-full mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 text-sm">Needs OJT / Site Orientation</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-200 text-amber-900 rounded">
                      Review Req.
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    Requires on-the-job shadow shift or supervisor signoff before start.
                  </p>
                </div>
              </button>

              {/* Option 3: Cancel */}
              <button
                id="bid-option-cancel"
                onClick={handleReset}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors mt-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            /* Post-Selection SMS Dispatch Screen */
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  <span className="text-xs font-bold text-blue-900 uppercase">
                    Bid Logged in Ops System
                  </span>
                </div>
                <p className="text-xs text-blue-800">
                  Your bid has been recorded in the Ops Admin audit feed as{' '}
                  <strong className="underline">
                    {selectedStatus === 'trained' ? 'TRAINED' : 'NEEDS OJT'}
                  </strong>.
                </p>
              </div>

              {/* SMS Text Payload Preview */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    SMS Payload to Ops ({opsPhone}):
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-[11px] font-bold text-[#1e3a8a] hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
                </div>
                <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-3 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                  {submittedData.smsBody}
                </pre>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  id="bid-open-native-sms-btn"
                  onClick={handleOpenSms}
                  className="w-full bg-[#1e3a8a] text-white py-2.5 px-4 rounded-lg font-bold text-sm shadow-md hover:bg-blue-900 active:bg-blue-950 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Device SMS App
                </button>
                
                <button
                  onClick={handleReset}
                  className="w-full bg-slate-100 text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Done / Back to Board
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
