import React, { useEffect, useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Building2, 
  X, 
  ExternalLink,
  Zap,
  CheckCheck,
  MapPin,
  ShieldCheck,
  FileText
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
  const eventType = receipt.eventType || 'acknowledged';
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

  // Dynamic visual styling based on event type
  let containerStyle = 'bg-slate-900/95 border-emerald-500 text-white shadow-emerald-950/50 ring-2 ring-emerald-500/40';
  let badgeStyle = 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50';
  let iconBgStyle = 'bg-emerald-600 text-white';
  let bannerTitle = isBolo ? '🎯 BOLO READ CONFIRMED' : '✓ DISPATCH ACKNOWLEDGED';
  let bannerSubtitle = 'Receipt confirmed by active guard terminal';
  let IconComponent = CheckCheck;

  if (eventType === 'on_scene') {
    containerStyle = 'bg-slate-900/95 border-purple-500 text-white shadow-purple-950/50 ring-2 ring-purple-500/40';
    badgeStyle = 'bg-purple-500/30 text-purple-300 border-purple-500/50';
    iconBgStyle = 'bg-purple-600 text-white';
    bannerTitle = '📍 OFFICER ON SCENE';
    bannerSubtitle = `Officer arrived on location at ${receipt.siteName}`;
    IconComponent = MapPin;
  } else if (eventType === 'cleared') {
    containerStyle = 'bg-slate-900/95 border-teal-400 text-white shadow-teal-950/50 ring-2 ring-teal-400/40';
    badgeStyle = 'bg-teal-500/30 text-teal-300 border-teal-500/50';
    iconBgStyle = 'bg-teal-600 text-white';
    bannerTitle = '✅ ALL CLEAR / RESOLVED';
    bannerSubtitle = receipt.disposition ? `Cleared with disposition [${receipt.disposition}]` : 'Call completed and logged';
    IconComponent = ShieldCheck;
  } else if (isBolo) {
    containerStyle = 'bg-slate-900/95 border-rose-500 text-white shadow-rose-950/50 ring-2 ring-rose-500/40';
    badgeStyle = 'bg-rose-500/30 text-rose-300 border-rose-500/50';
    iconBgStyle = 'bg-rose-600 text-white';
    bannerTitle = '🎯 BOLO READ CONFIRMED';
    bannerSubtitle = 'BOLO broadcast acknowledged by on-duty guard';
    IconComponent = ShieldAlert;
  }

  return (
    <div 
      id="ops-acknowledge-receipt-banner"
      className="fixed top-4 right-4 sm:top-5 sm:right-5 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div className={`rounded-2xl border-2 shadow-2xl p-4 backdrop-blur-md transition-all ${containerStyle}`}>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${iconBgStyle} ${isBolo ? 'animate-pulse' : ''}`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                  {bannerTitle}
                </span>
                <span className="font-mono text-xs font-black text-slate-200">
                  {receipt.callId}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-300 mt-0.5">
                {bannerSubtitle}
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
                <span className={`w-2 h-2 rounded-full ${
                  eventType === 'on_scene' ? 'bg-purple-400 animate-ping' :
                  eventType === 'cleared' ? 'bg-teal-400' :
                  'bg-emerald-400 animate-ping'
                }`}></span>
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

          {/* Officer Notes or Resolution Comments if available */}
          {(receipt.resolutionNote || receipt.notes) && (
            <div className="text-[11px] text-slate-300 bg-slate-800/60 p-2 rounded-lg border border-slate-700/60 flex items-start gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Officer Note:</span>
                <span className="italic">&ldquo;{receipt.resolutionNote || receipt.notes}&rdquo;</span>
              </div>
            </div>
          )}

          {/* Timestamp & Telemetry */}
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-300 pt-1">
            <div className={`flex items-center gap-1.5 font-semibold ${
              eventType === 'on_scene' ? 'text-purple-300' :
              eventType === 'cleared' ? 'text-teal-300' :
              'text-emerald-400'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>
                {eventType === 'on_scene' ? 'ON SCENE: ' : eventType === 'cleared' ? 'CLEARED: ' : 'ACK: '}
                {formattedTime} ({formattedDate})
              </span>
            </div>

            {eventType === 'acknowledged' && receipt.timeToAcknowledgeSec !== undefined && (
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md text-[10px] text-slate-300 font-bold border border-slate-700">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>{receipt.timeToAcknowledgeSec}s latency</span>
              </div>
            )}

            {eventType === 'on_scene' && (
              <div className="flex items-center gap-1 bg-purple-950/60 px-2 py-0.5 rounded-md text-[10px] text-purple-200 font-bold border border-purple-800/60">
                <MapPin className="w-3 h-3 text-purple-400" />
                <span>On Location</span>
              </div>
            )}

            {eventType === 'cleared' && receipt.disposition && (
              <div className="flex items-center gap-1 bg-teal-950/60 px-2 py-0.5 rounded-md text-[10px] text-teal-200 font-bold border border-teal-800/60">
                <CheckCircle2 className="w-3 h-3 text-teal-400" />
                <span>{receipt.disposition}</span>
              </div>
            )}
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
              <span>Activity Log ({callReceipts.length})</span>
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

