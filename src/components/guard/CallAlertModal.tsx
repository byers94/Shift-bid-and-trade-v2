import React from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  PhoneCall, 
  ShieldAlert, 
  MapPin, 
  Clock, 
  Check, 
  X, 
  AlertTriangle, 
  Car, 
  Eye, 
  Navigation,
  Building2
} from 'lucide-react';

export const CallAlertModal: React.FC = () => {
  const { 
    latestDispatchedCall, 
    isCallAlertOpen, 
    dismissCallAlert, 
    acknowledgeCall, 
    activeGuard 
  } = useShiftOps();

  if (!isCallAlertOpen || !latestDispatchedCall) return null;

  const call = latestDispatchedCall;
  const isBolo = call.isBolo || call.priority === 'urgent_bolo';

  const handleAcknowledge = () => {
    acknowledgeCall(call.id, activeGuard, { channel: 'alert_modal' });
    dismissCallAlert();
  };

  return (
    <div 
      id="guard-call-alert-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
    >
      <div 
        id="guard-call-alert-card"
        className={`bg-white dark:bg-slate-900 border-2 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 ${
          isBolo 
            ? 'border-rose-500 ring-4 ring-rose-500/30' 
            : call.priority === 'priority'
            ? 'border-amber-500 ring-4 ring-amber-500/30'
            : 'border-blue-500 ring-4 ring-blue-500/30'
        }`}
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white ${
              isBolo ? 'bg-rose-600 animate-bounce' : call.priority === 'priority' ? 'bg-amber-500 text-slate-950' : 'bg-blue-600'
            }`}>
              {isBolo ? <ShieldAlert className="w-5 h-5" /> : <PhoneCall className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isBolo ? 'bg-rose-600 text-white animate-pulse' : call.priority === 'priority' ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'
                }`}>
                  {isBolo ? '🚨 LIVE BOLO BROADCAST' : `CALL FOR SERVICE (${call.priority.toUpperCase()})`}
                </span>
                <span className="font-mono text-xs font-black text-slate-900 dark:text-white">{call.id}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                Dispatched by {call.dispatchedBy.name} ({call.dispatchedBy.badge})
              </p>
            </div>
          </div>

          <button
            onClick={dismissCallAlert}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location Banner */}
        <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Target Facility & Area</p>
            <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-4 h-4 text-blue-500" />
              {call.siteName}
            </p>
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {call.locationDetails}
            </p>
          </div>

          <div className="text-right font-mono text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 inline mr-1" />
            {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Summary & Narrative */}
        <div className="space-y-2 text-xs">
          <div className="bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-200 dark:border-blue-900/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 block mb-1">
              Incident Nature: {call.customTypeLabel || call.callType.replace(/_/g, ' ').toUpperCase()}
            </span>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
              {call.summary}
            </p>
            {call.details && (
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 whitespace-pre-line">
                {call.details}
              </p>
            )}
          </div>

          {/* BOLO Subject Details if present */}
          {call.isBolo && call.boloSubject && (
            <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  Subject Description
                </span>
                {call.boloSubject.armedAndDangerous && (
                  <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    ⚠️ ARMED & DANGEROUS
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {call.boloSubject.name && (
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Subject Name:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{call.boloSubject.name}</span>
                  </div>
                )}
                {(call.boloSubject.gender || call.boloSubject.race || call.boloSubject.approxAge) && (
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Demographics:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {[call.boloSubject.gender, call.boloSubject.race, call.boloSubject.approxAge ? `~${call.boloSubject.approxAge}yo` : ''].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {call.boloSubject.vehicleInfo && (
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Vehicle:</span>
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-rose-500" />
                      {call.boloSubject.vehicleInfo}
                    </span>
                  </div>
                )}
                {call.boloSubject.clothingDescription && (
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Clothing / Appearance:</span>
                    <span className="text-slate-800 dark:text-slate-200">{call.boloSubject.clothingDescription}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Officer Tactical Instructions */}
          {call.officerInstructions && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-2.5 rounded-lg flex items-start gap-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-[11px]">Safety Caution: </strong>
                <span className="text-[11px]">{call.officerInstructions}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={dismissCallAlert}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            Review Later
          </button>

          <button
            type="button"
            onClick={handleAcknowledge}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
          >
            <Navigation className="w-4 h-4" />
            <span>Acknowledge & Mark En Route</span>
          </button>
        </div>
      </div>
    </div>
  );
};
