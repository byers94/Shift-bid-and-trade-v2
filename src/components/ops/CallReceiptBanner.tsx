import React, { useEffect, useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  PhoneCall, 
  Building2, 
  X, 
  ExternalLink,
  Radio,
  Zap,
  CheckCheck
} from 'lucide-react';

interface CallReceiptBannerProps {
  onSelectCall?: (callId: string) => void;
  onOpenReceiptsLog?: () => void;
}

export const CallReceiptBanner: React.FC<CallReceiptBannerProps> = ({
  onSelectCall,
  onOpenReceiptsLog
}) => {
  const { 
    latestCallReceipt, 
    dismissCallReceiptNotification,
    callReceipts 
  } = useShiftOps();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (latestCallReceipt) {
      setVisible(true);
      // Auto-hide banner after 9 seconds if not clicked
      const timer = setTimeout(() => {
        setVisible(false);
      }, 9000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [latestCallReceipt]);

  if (!visible || !latestCallReceipt) return null;

  const receipt = latestCallReceipt;
  const isBolo = receipt.isBolo || receipt.priority === 'urgent_bolo';

  const formattedTime = new Date(receipt.acknowledgedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = new Date(receipt.acknowledgedAt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  });

  return (
    <div 
      id="ops-acknowledge-receipt-banner"
      className="fixed top-4 right-4 sm:top-5 sm:right-5 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div className={`rounded-2xl border-2 shadow-2xl p-4 backdrop-blur-md transition-all ${
        isBolo
          ? 'bg-slate-900/95 border-rose-500 text-white shadow-rose-950/50 ring-2 ring-rose-500/40'
          : 'bg-slate-900/95 border-emerald-500 text-white shadow-emerald-950/50 ring-2 ring-emerald-500/40'
      }`}>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${
              isBolo ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-600 text-white'
            }`}>
              <CheckCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isBolo ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50' : 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                }`}>
                  {isBolo ? '🎯 BOLO READ CONFIRMED' : '✓ DISPATCH ACKNOWLEDGED'}
                </span>
                <span className="font-mono text-xs font-black text-slate-200">
                  {receipt.callId}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-300 mt-0.5">
                Receipt confirmed by active guard terminal
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setVisible(false);
              dismissCallReceiptNotification(receipt.id);
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="py-3 space-y-2 text-xs">
          {/* Officer & Site details */}
          <div className="flex items-center justify-between gap-2 bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/70">
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Responding Officer
              </div>
              <div className="text-xs font-black text-white flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{receipt.guardName}</span>
                <span className="text-slate-400 font-mono text-[10px]">({receipt.badgeNumber})</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Facility
              </div>
              <div className="text-xs font-bold text-blue-300 flex items-center justify-end gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-blue-400" />
                <span className="truncate max-w-[130px]">{receipt.siteName}</span>
              </div>
            </div>
          </div>

          {/* Call Summary */}
          <div className="text-xs font-semibold text-slate-200 line-clamp-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
            &ldquo;{receipt.summary}&rdquo;
          </div>

          {/* Receipt Timestamp & Response Latency Telemetry */}
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-300 pt-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>ACK: {formattedTime} ({formattedDate})</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md text-[10px] text-slate-300 font-bold border border-slate-700">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{receipt.timeToAcknowledgeSec}s response</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          {onOpenReceiptsLog && (
            <button
              onClick={() => {
                setVisible(false);
                onOpenReceiptsLog();
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Receipts Log ({callReceipts.length})</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {onSelectCall && (
              <button
                onClick={() => {
                  setVisible(false);
                  onSelectCall(receipt.callId);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <span>View Call Details</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={() => {
                setVisible(false);
                dismissCallReceiptNotification(receipt.id);
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
