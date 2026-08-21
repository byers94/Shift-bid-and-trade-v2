import React from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useShiftOps();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let bgClass = 'bg-slate-900 border-slate-800 text-white';
        let IconComponent = Info;
        let iconColor = 'text-blue-400';

        if (toast.type === 'success') {
          bgClass = 'bg-emerald-950/95 border-emerald-700/80 text-emerald-50';
          IconComponent = CheckCircle2;
          iconColor = 'text-emerald-400';
        } else if (toast.type === 'danger') {
          bgClass = 'bg-red-950/95 border-red-700/80 text-red-50';
          IconComponent = AlertCircle;
          iconColor = 'text-red-400';
        } else if (toast.type === 'warning') {
          bgClass = 'bg-amber-950/95 border-amber-700/80 text-amber-50';
          IconComponent = AlertTriangle;
          iconColor = 'text-amber-400';
        }

        return (
          <div
            key={toast.id}
            className={`p-3 rounded-xl border shadow-xl flex items-start gap-2.5 pointer-events-auto transition-all animate-in slide-in-from-bottom-2 duration-200 ${bgClass}`}
          >
            <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-xs">
              <h5 className="font-bold">{toast.title}</h5>
              <p className="opacity-90 text-[11px] mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="opacity-60 hover:opacity-100 p-0.5 rounded text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
