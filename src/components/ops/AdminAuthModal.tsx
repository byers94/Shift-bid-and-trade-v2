import React, { useState } from 'react';
import { 
  Lock, 
  KeyRound, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ShieldCheck,
  Eye, 
  EyeOff,
  UserCheck
} from 'lucide-react';

export interface DispatcherIdentity {
  id: string;
  name: string;
  role: string;
  badgeId: string;
  pin: string;
}

export const DISPATCHER_PRESETS: DispatcherIdentity[] = [
  {
    id: 'disp-1',
    name: 'Lt. Mark O\'Connor',
    role: 'Operations Commander',
    badgeId: 'OPS-CMD-01',
    pin: '1099'
  },
  {
    id: 'disp-2',
    name: 'Dispatcher Sarah Keller',
    role: 'Senior Dispatch Supervisor',
    badgeId: 'OPS-DISP-04',
    pin: '1099'
  },
  {
    id: 'disp-3',
    name: 'Captain Raymond Holt',
    role: 'Watch Commander',
    badgeId: 'OPS-LEAD-99',
    pin: '1099'
  }
];

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dispatcher: DispatcherIdentity) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedDispatcher, setSelectedDispatcher] = useState<DispatcherIdentity>(DISPATCHER_PRESETS[0]);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Accept preset PIN (1099), fallback admin pins (admin, 1234, 0000, 8844)
    if (
      pin === selectedDispatcher.pin ||
      pin === '1099' ||
      pin === 'admin' ||
      pin === 'admin123' ||
      pin === '1234' ||
      pin === '8844'
    ) {
      onSuccess(selectedDispatcher);
      setPin('');
      setError('');
    } else {
      setError('Invalid Ops Authorization PIN or Password. (Hint: Default PIN is 1099)');
    }
  };

  const handleQuickDemoAuth = () => {
    setPin('1099');
    onSuccess(selectedDispatcher);
    setPin('');
    setError('');
  };

  return (
    <div 
      id="admin-login-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div 
        id="admin-login-modal-card"
        className="w-full max-w-md bg-slate-900 border border-blue-900/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-slate-100 flex flex-col max-h-[95vh]"
      >
        {/* Navy Security Header */}
        <div className="bg-[#1e3a8a] text-white p-5 flex items-center justify-between border-b border-blue-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900 rounded-xl border border-blue-700">
              <Lock className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">
                Ops Admin Authorization
              </h3>
              <p className="text-[11px] text-blue-200 font-mono">
                Restricted Dispatch & Management Console
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-blue-800 transition-colors"
            title="Cancel and return"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice Banner */}
        <div className="bg-amber-950/70 border-b border-amber-900/60 p-3 px-5 flex items-start gap-2.5 text-xs text-amber-200/90 shrink-0">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-tight">
            <strong>Access Restricted:</strong> Security guards access the Guard App without login. The Ops dashboard requires supervisor authorization.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-950/90 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Dispatcher Identity */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Select Dispatcher Profile
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {DISPATCHER_PRESETS.map((disp) => (
                <button
                  key={disp.id}
                  type="button"
                  onClick={() => {
                    setSelectedDispatcher(disp);
                    setError('');
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    selectedDispatcher.id === disp.id
                      ? 'border-blue-500 bg-blue-950/70 text-white ring-1 ring-blue-500'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] ${
                      selectedDispatcher.id === disp.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {disp.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{disp.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{disp.role} • {disp.badgeId}</div>
                    </div>
                  </div>
                  {selectedDispatcher.id === disp.id && (
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* PIN / Password Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ops PIN / Password
              </label>
              <span className="text-[10px] font-mono text-blue-400">
                Default PIN: <strong>1099</strong>
              </span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                id="admin-auth-pin-input"
                type={showPin ? 'text' : 'password'}
                required
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN or Password..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 pl-10 pr-10 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-0.5"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Numeric keypad for rapid touch or mouse PIN entry */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', '⌫'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'Clear') setPin('');
                  else if (k === '⌫') setPin((prev) => prev.slice(0, -1));
                  else setPin((prev) => (prev.length < 8 ? prev + k : prev));
                }}
                className="py-2 bg-slate-950/80 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-mono font-bold transition-colors border border-slate-800 active:bg-blue-900 cursor-pointer"
              >
                {k}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              id="admin-auth-submit-btn"
              type="submit"
              className="w-full bg-[#1e3a8a] hover:bg-blue-800 active:bg-blue-950 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Authorize & Access Ops Dashboard
            </button>

            <button
              id="admin-auth-quick-demo-btn"
              type="button"
              onClick={handleQuickDemoAuth}
              className="w-full bg-blue-950/70 hover:bg-blue-900 border border-blue-800 text-blue-200 font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              ⚡ 1-Click Demo Login (PIN: 1099)
            </button>

            <button
              id="admin-auth-cancel-btn"
              type="button"
              onClick={onClose}
              className="w-full text-slate-400 hover:text-slate-200 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Cancel (Stay on Guard View)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
