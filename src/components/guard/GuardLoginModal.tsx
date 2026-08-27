import React, { useState, useEffect } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { GuardProfile } from '../../types/shift';
import { 
  Shield, 
  Fingerprint, 
  KeyRound, 
  Lock, 
  UserCheck, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  Sparkles, 
  Smartphone, 
  X,
  Eye,
  EyeOff,
  Radio,
  Clock
} from 'lucide-react';

interface GuardLoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: (guard: GuardProfile) => void;
  requiredForAccess?: boolean;
}

export const GuardLoginModal: React.FC<GuardLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  requiredForAccess = false
}) => {
  const { 
    guardsList, 
    activeGuard, 
    guardLogin, 
    registerGuardBiometrics,
    showToast 
  } = useShiftOps();

  const [authMode, setAuthMode] = useState<'credentials' | 'pin' | 'biometrics'>('credentials');
  const [usernameOrBadge, setUsernameOrBadge] = useState<string>(activeGuard?.username || activeGuard?.badgeNumber || 'mvance');
  const [password, setPassword] = useState<string>('guard2026!');
  const [pin, setPin] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [showQuickRoster, setShowQuickRoster] = useState<boolean>(true);
  const [rememberBiometrics, setRememberBiometrics] = useState<boolean>(true);
  const [biometricScanning, setBiometricScanning] = useState<boolean>(false);
  const [biometricSuccess, setBiometricSuccess] = useState<boolean>(false);

  // Check if current device or user supports biometrics
  const currentGuard = guardsList.find(
    (g) => g.username?.toLowerCase() === usernameOrBadge.toLowerCase() || g.badgeNumber?.toLowerCase() === usernameOrBadge.toLowerCase()
  ) || activeGuard;

  const hasBiometricsEnrolled = currentGuard?.biometricsEnabled;

  useEffect(() => {
    if (activeGuard) {
      setUsernameOrBadge(activeGuard.username || activeGuard.badgeNumber);
      if (activeGuard.pin) {
        setPin('');
      }
    }
  }, [activeGuard, isOpen]);

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsAuthenticating(true);

    try {
      const res = await guardLogin({
        username: usernameOrBadge.trim(),
        password: password,
        badgeNumber: usernameOrBadge.trim()
      });

      if (res.success && res.guard) {
        if (rememberBiometrics && !res.guard.biometricsEnabled) {
          await registerGuardBiometrics(res.guard.id);
        }
        showToast('Authentication Successful', `Welcome back, Officer ${res.guard.name}.`, 'success');
        onSuccess?.(res.guard);
        onClose?.();
      } else {
        setErrorMessage(res.error || 'Invalid guard username or password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setErrorMessage('Please enter a 4-digit security PIN.');
      return;
    }

    setErrorMessage(null);
    setIsAuthenticating(true);

    try {
      const res = await guardLogin({
        username: usernameOrBadge.trim(),
        pin: pin.trim()
      });

      if (res.success && res.guard) {
        showToast('PIN Verified', `Officer ${res.guard.name} authenticated.`, 'success');
        onSuccess?.(res.guard);
        onClose?.();
      } else {
        setErrorMessage(res.error || 'Incorrect security PIN for this officer.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'PIN Authentication failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleBiometricAuth = async () => {
    setErrorMessage(null);
    setBiometricScanning(true);
    setBiometricSuccess(false);

    try {
      // Simulate biometric sensor delay or challenge
      await new Promise((r) => setTimeout(r, 900));

      const res = await guardLogin({
        username: usernameOrBadge.trim(),
        badgeNumber: usernameOrBadge.trim(),
        useBiometrics: true
      });

      if (res.success && res.guard) {
        setBiometricSuccess(true);
        await new Promise((r) => setTimeout(r, 400));
        showToast('Biometric Access Granted', `Biometrics confirmed for Officer ${res.guard.name}.`, 'success');
        onSuccess?.(res.guard);
        onClose?.();
      } else {
        setErrorMessage(res.error || 'Biometric authentication was not recognized.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Biometric sensor error.');
    } finally {
      setBiometricScanning(false);
    }
  };

  const handleQuickSelectGuard = (guard: GuardProfile) => {
    setUsernameOrBadge(guard.username || guard.badgeNumber);
    setPassword(guard.password || 'guard2026!');
    setPin(guard.pin || '1234');
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div 
      id="guard-login-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#1e3a8a] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-700/80 border border-blue-400 flex items-center justify-center text-white shadow-inner">
              <Shield className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight">
                Guard Terminal Login
              </h2>
              <p className="text-[11px] text-blue-200 font-mono">
                SecureShift Mobile Guard Authentication
              </p>
            </div>
          </div>

          {!requiredForAccess && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-blue-900/60 text-blue-200 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Auth Mode Toggle Bar */}
        <div className="p-2 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => { setAuthMode('credentials'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              authMode === 'credentials'
                ? 'bg-white dark:bg-slate-800 text-[#1e3a8a] dark:text-blue-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Password</span>
          </button>

          <button
            type="button"
            onClick={() => { setAuthMode('pin'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              authMode === 'pin'
                ? 'bg-white dark:bg-slate-800 text-[#1e3a8a] dark:text-blue-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>4-Digit PIN</span>
          </button>

          <button
            type="button"
            onClick={() => { setAuthMode('biometrics'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              authMode === 'biometrics'
                ? 'bg-white dark:bg-slate-800 text-[#1e3a8a] dark:text-blue-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5 text-blue-500" />
            <span>Biometric</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* CREDENTIALS MODE */}
          {authMode === 'credentials' && (
            <form onSubmit={handleCredentialSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Guard Username or Badge #
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="guard-login-username-input"
                    type="text"
                    required
                    value={usernameOrBadge}
                    onChange={(e) => setUsernameOrBadge(e.target.value)}
                    placeholder="e.g. mvance or SEC-8801"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Guard Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="guard-login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter security credentials"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Enable biometric on device checkbox */}
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rememberBiometrics}
                  onChange={(e) => setRememberBiometrics(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[11px]">Enable Biometric Login (Face ID / Touch ID) on this device</span>
              </label>

              <button
                id="guard-submit-credentials-btn"
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-2.5 bg-[#1e3a8a] hover:bg-blue-800 text-white rounded-xl font-extrabold text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mt-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>{isAuthenticating ? 'Verifying Credentials...' : 'Sign In as Officer'}</span>
              </button>
            </form>
          )}

          {/* 4-DIGIT PIN MODE */}
          {authMode === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Guard Username or Badge #
                </label>
                <input
                  type="text"
                  required
                  value={usernameOrBadge}
                  onChange={(e) => setUsernameOrBadge(e.target.value)}
                  placeholder="e.g. mvance or SEC-8801"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  4-Digit Duty Security PIN
                </label>
                <div className="flex justify-center gap-2 my-2">
                  <input
                    id="guard-login-pin-input"
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-44 py-2.5 text-center text-xl font-mono tracking-widest bg-slate-100 dark:bg-slate-800 border-2 border-blue-500/50 rounded-2xl focus:border-blue-600 focus:outline-hidden font-bold"
                  />
                </div>
                <p className="text-[10px] text-center text-slate-400 font-mono">Default Demo PIN: 1234 or 8801</p>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating || pin.length < 4}
                className="w-full py-2.5 bg-[#1e3a8a] hover:bg-blue-800 disabled:bg-slate-400 text-white rounded-xl font-extrabold text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isAuthenticating ? 'Checking PIN...' : 'Verify PIN Access'}</span>
              </button>
            </form>
          )}

          {/* BIOMETRICS MODE */}
          {authMode === 'biometrics' && (
            <div className="text-center space-y-4 py-2">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                {/* Pulsing ring during scan */}
                <div className={`absolute inset-0 rounded-full border-2 border-blue-500 ${
                  biometricScanning ? 'animate-ping opacity-75' : 'opacity-20'
                }`} />
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
                  biometricSuccess 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' 
                    : biometricScanning
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                    : 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-slate-700'
                }`}>
                  {biometricSuccess ? (
                    <CheckCircle2 className="w-10 h-10 animate-in zoom-in-50" />
                  ) : (
                    <Fingerprint className={`w-10 h-10 ${biometricScanning ? 'animate-pulse' : ''}`} />
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {biometricSuccess 
                    ? 'Identity Verified!' 
                    : biometricScanning 
                    ? 'Scanning Biometric Sensor...' 
                    : 'Device Biometric Authentication'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  {biometricScanning
                    ? 'Please hold your finger on Touch ID / Face ID scanner'
                    : `Authenticate officer credentials for ${currentGuard.name} (${currentGuard.badgeNumber})`}
                </p>
              </div>

              <button
                type="button"
                id="guard-biometric-trigger-btn"
                onClick={handleBiometricAuth}
                disabled={biometricScanning}
                className="w-full py-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Fingerprint className="w-4 h-4" />
                <span>{biometricScanning ? 'Verifying Sensor...' : 'Scan Biometrics (Touch ID / Face ID)'}</span>
              </button>
            </div>
          )}

          {/* Quick Demo Guard Picker Accordion */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowQuickRoster(!showQuickRoster)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Select from Active Officer Roster (Demo Quick Fill)</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showQuickRoster ? 'rotate-180' : ''}`} />
            </button>

            {showQuickRoster && (
              <div className="mt-2 grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                {guardsList.map((g) => {
                  const isSelected = usernameOrBadge.toLowerCase() === g.username?.toLowerCase() || usernameOrBadge.toLowerCase() === g.badgeNumber?.toLowerCase();
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleQuickSelectGuard(g)}
                      className={`p-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                        isSelected 
                          ? 'bg-blue-100 dark:bg-blue-950 text-[#1e3a8a] dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-800' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                          {g.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-[11px]">{g.name}</div>
                          <div className="text-[9px] text-slate-400 font-mono">@{g.username || g.badgeNumber} • PIN: {g.pin || '1234'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {g.biometricsEnabled && (
                          <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 rounded font-mono font-bold flex items-center gap-0.5">
                            <Fingerprint className="w-2.5 h-2.5" /> Bio
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">{g.badgeNumber}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
