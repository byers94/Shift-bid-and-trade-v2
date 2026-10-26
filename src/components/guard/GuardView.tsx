import React, { useState, useEffect } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { OpenShiftBoard } from './OpenShiftBoard';
import { TradeBoard } from './TradeBoard';
import { ActiveCallsPanel } from './ActiveCallsPanel';
import { GuardDutyTerminal } from './GuardDutyTerminal';
import { LiveRouteView } from './LiveRouteView';
import { GuardScheduleCalendar } from './GuardScheduleCalendar';
import { CallAlertModal } from './CallAlertModal';
import { EmergencyAlertOverlay } from './EmergencyAlertOverlay';
import { ShiftAlertPreferencesModal } from './ShiftAlertPreferencesModal';
import { PriorityShiftPushBanner } from './PriorityShiftPushBanner';
import { TimeSpecificTaskAlertBanner } from './TimeSpecificTaskAlertBanner';
import { UpcomingShiftReminderBanner } from './UpcomingShiftReminderBanner';
import { GuardLeaderboardView } from './GuardLeaderboardView';
import { GuardCoachingAlertBanner } from './GuardCoachingAlertBanner';
import { GuardPanicButton, usePanicSosAlert } from './GuardPanicButton';
import { GuardResourceHub } from './GuardResourceHub';
import { calculateLicenseStatus } from '../../utils/complianceEngine';
import { LicenseStatus } from '../../types/scheduling';
import { 
  PhoneCall,
  Bell,
  BellRing,
  Sun,
  Moon,
  SlidersHorizontal,
  Zap,
  Clock,
  Fingerprint,
  Navigation,
  CalendarDays,
  Trophy,
  ShieldCheck,
  Lock,
  LogOut,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Building2,
  Car
} from 'lucide-react';

export interface GuardViewProps {
  isSidebarMode?: boolean;
}

export const GuardView: React.FC<GuardViewProps> = ({ isSidebarMode = true }) => {
  const { 
    activeGuard, 
    guardsList, 
    authenticatedGuard,
    isGuardLoggedIn,
    guardLogin,
    guardLogout,
    shifts, 
    scheduledShifts,
    trades, 
    callsForService,
    activeClockedInShift,
    opsPhone, 
    theme, 
    toggleTheme,
    alertPreferences,
    eligiblePriorityShifts,
    showToast
  } = useShiftOps();

  const { activeDistress } = usePanicSosAlert();
  const [activeTab, setActiveTab] = useState<'duty_post' | 'schedule_calendar' | 'live_route' | 'open_board' | 'trade_board' | 'ranking' | 'active_calls' | 'resources'>('duty_post');
  const [isAlertPrefsOpen, setIsAlertPrefsOpen] = useState(false);

  // Guard Terminal Sign-In Screen State
  const [identifierInput, setIdentifierInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isDevDrawerOpen, setIsDevDrawerOpen] = useState(true);
  const [isGooglePickerOpen, setIsGooglePickerOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // Role-gate MPU Visibility: Only true when authenticated officer is assigned to MPU
  const isMpuGuard = React.useMemo(() => {
    if (activeGuard.assignmentType === 'DEDICATED_SITE') return false;
    if (activeGuard.assignmentType === 'MPU') return true;
    if (
      activeClockedInShift?.isRovingShift ||
      activeClockedInShift?.rovingGroup ||
      activeClockedInShift?.assignedRoverId
    ) {
      return true;
    }
    const hasScheduledMpuShift = scheduledShifts.some(
      (s) =>
        s.guardId === activeGuard.id &&
        (s.status === 'scheduled' || s.status === 'on_duty' || s.status === 'on_break') &&
        (s.isRovingShift || Boolean(s.rovingGroup) || Boolean(s.assignedRoverId))
    );
    return Boolean(activeGuard.isRovingGuard || hasScheduledMpuShift);
  }, [activeGuard, activeClockedInShift, scheduledShifts]);

  // Ensure Dedicated Site Guard can never stay on MPU tab
  useEffect(() => {
    if (!isMpuGuard && activeTab === 'live_route') {
      setActiveTab('duty_post');
    }
  }, [isMpuGuard, activeTab]);

  const openShiftsCount = shifts.filter((s) => s.status === 'open').length;
  const activeTradesCount = trades.filter((t) => t.status === 'active' || t.status === 'pending_swap').length;
  const activeCallsCount = callsForService.filter((c) => c.status !== 'cleared' && c.status !== 'cancelled').length;
  const boloCount = callsForService.filter((c) => (c.isBolo || c.priority === 'urgent_bolo') && c.status !== 'cleared' && c.status !== 'cancelled').length;
  const guardUpcomingShiftsCount = scheduledShifts.filter((s) => s.guardId === activeGuard.id && (s.status === 'scheduled' || s.status === 'on_duty' || s.status === 'on_break')).length;

  const activeCategoriesCount = [
    alertPreferences.emergencyAlerts,
    alertPreferences.urgentOpenShifts,
    alertPreferences.tradeMatches
  ].filter(Boolean).length;

  const activePostName =
    activeClockedInShift?.siteName ||
    activeGuard.ojtSites[0] ||
    'Port Authority - Pier 7';

  const isOnBreak = activeClockedInShift?.status === 'on_break';

  // Resolve currentUser Denver Security License (DSL) compliance state synced with central roster
  const currentUserDsl = React.useMemo(() => {
    const matchedGuard = guardsList.find((g) => g.id === activeGuard.id) || activeGuard;
    const rawGuard = matchedGuard as any;
    if (rawGuard.dslExpirationDate !== undefined) {
      const calc = calculateLicenseStatus(rawGuard.dslExpirationDate);
      return {
        licenseStatus: calc.status,
        daysUntilExpiration: calc.daysUntilExpiration,
        daysExpired: calc.daysExpired,
      };
    }
    if (rawGuard.licenseStatus) {
      return {
        licenseStatus: rawGuard.licenseStatus as LicenseStatus,
        daysUntilExpiration: rawGuard.daysUntilExpiration ?? 14,
        daysExpired: rawGuard.daysExpired ?? 0,
      };
    }
    if (activeGuard.id === 'g-2' || activeGuard.badgeNumber === 'SEC-108') {
      return { licenseStatus: 'EXPIRING_SOON' as LicenseStatus, daysUntilExpiration: 14, daysExpired: 0 };
    }
    if (activeGuard.id === 'g-3' || activeGuard.badgeNumber === 'SEC-115') {
      return { licenseStatus: 'EXPIRED_GRACE' as LicenseStatus, daysUntilExpiration: 0, daysExpired: 22 };
    }
    if (activeGuard.id === 'g-4' || activeGuard.badgeNumber === 'SEC-122') {
      return { licenseStatus: 'REVOKED' as LicenseStatus, daysUntilExpiration: 0, daysExpired: 115 };
    }
    return { licenseStatus: 'COMPLIANT' as LicenseStatus, daysUntilExpiration: 180, daysExpired: 0 };
  }, [activeGuard, guardsList]);

  const currentUser = {
    ...activeGuard,
    licenseStatus: currentUserDsl.licenseStatus,
    daysUntilExpiration: currentUserDsl.daysUntilExpiration,
    daysExpired: currentUserDsl.daysExpired,
  };

  // Badge & PIN Sign-In Handler
  const handleBadgePinSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!identifierInput.trim()) {
      setLoginError('Please enter your Officer Badge ID or Work Email.');
      return;
    }
    if (!pinInput.trim()) {
      setLoginError('Please enter your Security PIN.');
      return;
    }

    setIsSubmittingAuth(true);
    const res = await guardLogin({
      badgeNumber: identifierInput.trim(),
      email: identifierInput.trim(),
      username: identifierInput.trim(),
      pin: pinInput.trim()
    });
    setIsSubmittingAuth(false);

    if (!res.success) {
      setLoginError(res.error || 'Authentication failed. Check Badge ID and PIN.');
      return;
    }

    setIdentifierInput('');
    setPinInput('');
    setActiveTab('duty_post');
    showToast(
      'Duty Terminal Unlocked',
      `Authenticated as ${res.guard?.name} (${res.guard?.badgeNumber}).`,
      'success'
    );
  };

  // Google OAuth / Workspace Verification Handler
  const handleGoogleAccountSignIn = async (emailOrBadge: string) => {
    setLoginError(null);
    setIsSubmittingAuth(true);
    const res = await guardLogin({
      email: emailOrBadge,
      badgeNumber: emailOrBadge,
      googleAuth: true
    });
    setIsSubmittingAuth(false);
    setIsGooglePickerOpen(false);

    if (!res.success) {
      setLoginError(res.error || 'Google Workspace account not linked to an active Guard Badge.');
      return;
    }

    setActiveTab('duty_post');
    showToast(
      'Google Identity Verified',
      `Signed in as ${res.guard?.name} (${res.guard?.badgeNumber}) via Google Workspace.`,
      'success'
    );
  };

  // Dev Quick-Login Handler
  const handleDevQuickLogin = async (badgeNumber: string, guardId: string) => {
    setLoginError(null);
    setIsSubmittingAuth(true);
    const res = await guardLogin({
      badgeNumber,
      directGuardId: guardId
    });
    setIsSubmittingAuth(false);

    if (res.success && res.guard) {
      setActiveTab('duty_post');
      showToast(
        'Dev Quick-Login Active',
        `Switched session to ${res.guard.name} (${res.guard.badgeNumber}).`,
        'info'
      );
    } else {
      setLoginError(res.error || 'Quick-login failed.');
    }
  };

  // Dedicated Guard Terminal Sign-In Screen when no authenticated guard session exists
  if (!isGuardLoggedIn || !authenticatedGuard) {
    return (
      <aside
        id="guard-view-container"
        className={`h-screen max-h-screen flex-1 min-h-0 flex flex-col bg-slate-950 overflow-hidden text-slate-100 relative shadow-xl ${
          isSidebarMode
            ? 'w-full md:w-[380px] lg:w-[410px] shrink-0 border-r border-slate-800'
            : 'w-full max-w-2xl mx-auto border-x border-slate-800'
        }`}
      >
        {/* Top Slim Security Header (54px) */}
        <header
          id="guard-slim-top-header"
          className="h-[54px] max-h-[54px] sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-slate-950 border-slate-700 text-slate-400 text-[10px] font-mono font-bold uppercase tracking-wider shrink-0">
              <Lock className="w-2.5 h-2.5 text-amber-400" />
              <span>LOCKED</span>
            </span>
            <span className="text-xs font-black text-slate-100 truncate">
              Guard Duty Terminal
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="guard-signin-theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 cursor-pointer transition-colors shrink-0"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
            <a
              href={`tel:${opsPhone}`}
              className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-300 hover:text-white flex items-center justify-center gap-1.5 text-[11px] font-mono font-bold transition-colors shrink-0"
              title={`Call Dispatch (${opsPhone})`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Dispatch</span>
            </a>
          </div>
        </header>

        {/* Scrollable Sign-In Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Terminal Identity Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/60 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold block">
                  Isolated Officer Session
                </span>
                <h1 className="text-base font-black text-white tracking-tight">
                  Guard Terminal Sign-In
                </h1>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify your officer identity via Google Workspace or enter your assigned Officer Badge ID and Security PIN. Sessions are strictly isolated to your badge.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {/* 1. Prominent Google Verification Button */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Single Sign-On (Recommended)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                OAuth 2.0 Verified
              </span>
            </div>

            <button
              id="guard-google-signin-btn"
              type="button"
              onClick={() => {
                setLoginError(null);
                setIsGooglePickerOpen(true);
              }}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-md border border-slate-300 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99]"
            >
              <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-black text-xs text-blue-600 shrink-0">
                G
              </span>
              <span>[ G  Sign in with Google ]</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            <div className="flex-1 h-px bg-slate-800" />
            <span>OR BADGE &amp; PIN FALLBACK</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* 2. Badge & PIN Fallback Form */}
          <form
            onSubmit={handleBadgePinSignIn}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md"
          >
            <div>
              <label
                htmlFor="guard-login-badge-input"
                className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1"
              >
                Officer Badge ID / Work Email
              </label>
              <input
                id="guard-login-badge-input"
                type="text"
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                placeholder="e.g., SEC-8842, MPU-104, or alex.mercer@secureshift.net"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="guard-login-pin-input"
                className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1"
              >
                Security PIN
              </label>
              <input
                id="guard-login-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter 4-digit PIN (e.g., 8842 or 1040)"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              id="guard-submit-duty-signin-btn"
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>[ 🔐 Sign In to Duty Terminal ]</span>
            </button>
          </form>

          {/* 3. Collapsible Dev Quick-Login Drawer ([ 🛠️ Dev Test Logins ]) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <button
              id="guard-dev-test-logins-toggle"
              type="button"
              onClick={() => setIsDevDrawerOpen(!isDevDrawerOpen)}
              className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800/80 flex items-center justify-between text-xs font-mono font-bold text-amber-300 transition-colors cursor-pointer"
            >
              <span>[ 🛠️ Dev Test Logins ]</span>
              {isDevDrawerOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {isDevDrawerOpen && (
              <div className="p-3 bg-slate-950/90 border-t border-slate-800 space-y-2.5">
                <p className="text-[11px] text-slate-400">
                  One-tap role verification accounts (tests session isolation &amp; MPU tab role-gating):
                </p>

                {/* Test Button 1: Alex Mercer (Dedicated Site) */}
                <button
                  id="dev-login-alex-mercer-btn"
                  type="button"
                  onClick={() => handleDevQuickLogin('SEC-8842', 'guard-current')}
                  className="w-full p-3 rounded-xl bg-slate-900 hover:bg-blue-950/60 border border-slate-700 hover:border-blue-500/60 text-left transition-all cursor-pointer group space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-white group-hover:text-blue-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>1. Alex Mercer (SEC-8842)</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/50">
                      DEDICATED_SITE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono">
                    Dedicated Site: Port Authority - Pier 7
                  </p>
                  <p className="text-[10px] text-emerald-400 font-mono">
                    → Verifies [ ▽ MPU ] tab &amp; MPU cards are completely HIDDEN.
                  </p>
                </button>

                {/* Test Button 2: Marcus Vance (MPU-104) */}
                <button
                  id="dev-login-marcus-vance-btn"
                  type="button"
                  onClick={() => handleDevQuickLogin('MPU-104', 'guard-1')}
                  className="w-full p-3 rounded-xl bg-slate-900 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/60 text-left transition-all cursor-pointer group space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-white group-hover:text-cyan-300 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>2. Marcus Vance (MPU-104)</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                      MPU PATROL
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono">
                    Mobile Patrol Unit / Sector Rover (MPU-1 Metro)
                  </p>
                  <p className="text-[10px] text-cyan-400 font-mono">
                    → Verifies [ ▽ MPU ] tab is VISIBLE and labeled MPU.
                  </p>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Google Workspace Account Selector Modal */}
        {isGooglePickerOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl space-y-3 p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white text-blue-600 font-black text-xs flex items-center justify-center">
                    G
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-white">Google Workspace Identity Verification</h3>
                    <p className="text-[10px] text-slate-400">Choose your @secureshift.net officer account</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGooglePickerOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <button
                  id="google-account-alex-mercer"
                  type="button"
                  onClick={() => handleGoogleAccountSignIn('alex.mercer@secureshift.net')}
                  className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-white">Alex Mercer (SEC-8842)</div>
                    <div className="text-[11px] text-slate-400 font-mono">alex.mercer@secureshift.net</div>
                    <div className="text-[10px] text-blue-400 mt-0.5">Dedicated Site • Port Authority - Pier 7</div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </button>

                <button
                  id="google-account-marcus-vance"
                  type="button"
                  onClick={() => handleGoogleAccountSignIn('marcus.vance@secureshift.net')}
                  className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-white">Marcus Vance (MPU-104)</div>
                    <div className="text-[11px] text-slate-400 font-mono">marcus.vance@secureshift.net</div>
                    <div className="text-[10px] text-cyan-400 mt-0.5">Mobile Patrol Unit • MPU-1 (Metro)</div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-[10px] font-mono uppercase text-slate-400 block">
                  Or enter another @secureshift.net Google account:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="officer@secureshift.net"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customGoogleEmail.trim()) {
                        handleGoogleAccountSignIn(customGoogleEmail.trim());
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside 
      id="guard-view-container"
      className={`h-screen max-h-screen flex-1 min-h-0 flex flex-col bg-slate-950 overflow-hidden text-slate-100 relative shadow-xl ${
        isSidebarMode
          ? 'w-full md:w-[380px] lg:w-[410px] shrink-0 border-r border-slate-800'
          : 'w-full max-w-2xl mx-auto border-x border-slate-800'
      }`}
    >
      {/* High-priority Emergency Alert Overlay */}
      <EmergencyAlertOverlay />

      {/* Calls for Service & BOLO Alert Modal */}
      <CallAlertModal />

      {/* Shift Alert Preferences Modal */}
      <ShiftAlertPreferencesModal 
        isOpen={isAlertPrefsOpen} 
        onClose={() => setIsAlertPrefsOpen(false)} 
      />

      {/* 1. Top Header (STRICTLY ONE SLIM ROW, max height 54px, sticky top-0, z-30) */}
      <header
        id="guard-slim-top-header"
        className="h-[54px] max-h-[54px] sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shrink-0"
      >
        {/* Left: Status pill + Static Site & Badge Indicator (No profile switcher dropdown) */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setActiveTab('duty_post')}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-colors ${
              isOnBreak
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-300'
                : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
            }`}
            title={isOnBreak ? 'Officer on Rest/Meal Break' : 'Active On-Duty Post'}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isOnBreak ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span className="hidden xs:inline">{isOnBreak ? 'BREAK' : 'ACTIVE'}</span>
          </button>

          <div
            id="guard-static-badge-site-indicator"
            className="flex items-center gap-1.5 min-w-0 truncate"
            title={`${activePostName} • Officer ${activeGuard.name} (${activeGuard.badgeNumber})`}
          >
            <span className="text-xs font-black text-slate-100 truncate">
              {activePostName}
            </span>
            <span className="text-slate-600 shrink-0">•</span>
            <span className="text-[11px] font-mono font-bold text-blue-400 shrink-0">
              {activeGuard.badgeNumber}
            </span>
          </div>
        </div>

        {/* Right: Sign Out Button + Dispatch Call + Compact 2.0s Hold SOS Panic Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id="guard-header-signout-btn"
            type="button"
            onClick={guardLogout}
            className="h-8 px-2 rounded-lg bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-200 hover:text-rose-200 flex items-center justify-center gap-1 text-[10px] font-mono font-bold transition-colors shrink-0 cursor-pointer"
            title={`Sign Out ${activeGuard.name} (${activeGuard.badgeNumber})`}
          >
            <span>[ 🚪 Sign Out ]</span>
          </button>

          <a
            id="guard-header-dispatch-call-btn"
            href={`tel:${opsPhone}`}
            className="h-8 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-300 hover:text-white flex items-center justify-center gap-1 text-[11px] font-mono font-bold transition-colors shrink-0"
            title={`1-Tap Call Dispatch & Command (${opsPhone})`}
            aria-label={`Call Dispatch ${opsPhone}`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">Dispatch</span>
          </a>

          <GuardPanicButton variant="compact" showActiveBanner={false} />
        </div>
      </header>

      {/* Persistent Denver Security License (DSL) Compliance Banner */}
      {currentUser.licenseStatus !== 'COMPLIANT' && (
        <>
          {currentUser.licenseStatus === 'EXPIRING_SOON' && (
            <div
              id="guard-dsl-expiring-soon-banner"
              className="bg-amber-950/80 border-b border-amber-500/50 text-amber-200 text-xs px-3 py-2 flex items-center justify-between"
            >
              <span>
                ⚠️ Denver Security License expires in {currentUser.daysUntilExpiration} days. Renew to maintain Denver County post eligibility.
              </span>
            </div>
          )}

          {currentUser.licenseStatus === 'EXPIRED_GRACE' && (
            <div
              id="guard-dsl-expired-grace-banner"
              className="bg-rose-950/90 border-b border-rose-500/60 text-rose-200 text-xs px-3 py-2 flex items-center justify-between animate-pulse"
            >
              <span>
                🚨 Denver License Expired ({currentUser.daysExpired}d ago): Restricted from Denver County posts ({90 - currentUser.daysExpired}d left in renewal grace period). Regional Colorado posts remain active.
              </span>
            </div>
          )}

          {currentUser.licenseStatus === 'REVOKED' && (
            <div
              id="guard-dsl-revoked-banner"
              className="bg-red-950 border-b border-red-600 text-red-200 text-xs px-3 py-2 flex items-center justify-between"
            >
              <span>
                ⛔ Denver License Lapsed (&gt;90d): Renewal window expired. Restricted from Denver posts. Eligible for regional non-Denver sites.
              </span>
            </div>
          )}
        </>
      )}

      {/* 2. Secondary Nav Strip (sticky top-[54px], z-20, compact low-profile pills) */}
      <nav
        id="guard-secondary-nav-strip"
        className="sticky top-[54px] z-20 bg-slate-900 border-b border-slate-800 overflow-x-auto no-scrollbar py-1 px-2 flex items-center gap-1 shrink-0"
      >
        <button
          id="guard-tab-duty-post"
          onClick={() => setActiveTab('duty_post')}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
            activeTab === 'duty_post'
              ? 'bg-blue-600 text-white font-black shadow-2xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
        >
          <Clock className="w-3 h-3 text-emerald-400" />
          <span>MY DUTY</span>
          {activeClockedInShift && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          id="guard-tab-schedule-cal"
          onClick={() => setActiveTab('schedule_calendar')}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
            activeTab === 'schedule_calendar'
              ? 'bg-blue-600 text-white font-black shadow-2xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
        >
          <CalendarDays className="w-3 h-3 text-blue-400" />
          <span>SCHEDULE</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
            activeTab === 'schedule_calendar'
              ? 'bg-blue-900 text-blue-100'
              : 'bg-slate-800 text-slate-300'
          }`}>
            {guardUpcomingShiftsCount}
          </span>
        </button>

        {/* Role-Gated [ ▽ MPU ] Tab — Completely hidden for Dedicated Site Guards */}
        {isMpuGuard && (
          <button
            id="guard-tab-live-route"
            onClick={() => setActiveTab('live_route')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
              activeTab === 'live_route'
                ? 'bg-cyan-600 text-slate-950 font-black shadow-2xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <Navigation className={`w-3 h-3 ${activeTab === 'live_route' ? 'text-slate-950' : 'text-cyan-400'}`} />
            <span>[ ▽ MPU ]</span>
            <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'live_route' ? 'bg-slate-950' : 'bg-cyan-400 animate-ping'}`} />
          </button>
        )}

        <button
          id="guard-tab-open-board"
          onClick={() => setActiveTab('open_board')}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
            activeTab === 'open_board'
              ? 'bg-blue-600 text-white font-black shadow-2xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
        >
          <span>OPEN</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
            activeTab === 'open_board'
              ? 'bg-blue-900 text-blue-100'
              : 'bg-slate-800 text-slate-300'
          }`}>
            {openShiftsCount}
          </span>
          {eligiblePriorityShifts.length > 0 && (
            <span
              title={`${eligiblePriorityShifts.length} urgent unfilled shifts in next 24h`}
              className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded-full font-black animate-pulse flex items-center gap-0.5"
            >
              ⚡{eligiblePriorityShifts.length}
            </span>
          )}
        </button>

        <button
          id="guard-tab-ranking"
          onClick={() => setActiveTab('ranking')}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
            activeTab === 'ranking'
              ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
        >
          <Trophy className={`w-3 h-3 ${activeTab === 'ranking' ? 'text-slate-950' : 'text-amber-400'}`} />
          <span>RANKING</span>
        </button>

        <button
          id="guard-tab-trade-board"
          onClick={() => setActiveTab('trade_board')}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
            activeTab === 'trade_board'
              ? 'bg-blue-600 text-white font-black shadow-2xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
        >
          <span>TRADES</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
            activeTab === 'trade_board'
              ? 'bg-blue-900 text-blue-100'
              : 'bg-slate-800 text-slate-300'
          }`}>
            {activeTradesCount}
          </span>
        </button>

        <button
          id="guard-tab-active-calls"
          onClick={() => setActiveTab('active_calls')}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
            activeTab === 'active_calls'
              ? 'bg-rose-600 text-white font-black shadow-2xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
        >
          <PhoneCall className={`w-3 h-3 ${activeTab === 'active_calls' ? 'text-white' : 'text-rose-400'}`} />
          <span>CALLS</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-black ${
            boloCount > 0
              ? 'bg-rose-500 text-white animate-pulse'
              : activeCallsCount > 0
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300'
          }`}>
            {activeCallsCount}
          </span>
        </button>

        <button
          id="guard-tab-resources"
          onClick={() => setActiveTab('resources')}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
            activeTab === 'resources'
              ? 'bg-blue-600 text-white font-black shadow-2xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
          }`}
        >
          <span>[ 📚 RESOURCES ]</span>
        </button>
      </nav>

      {/* 3. Scrollable Body (flex-1 overflow-y-auto p-3 space-y-4) */}
      <div 
        id="guard-board-content"
        className="flex-1 overflow-y-auto p-3 space-y-4"
      >
        {/* Active SOS Distress Flashing Banner (Only rendered when SOS is triggered) */}
        {activeDistress && (
          <GuardPanicButton variant="compact" showActiveBanner={true} hideTriggerButton={true} className="hidden" />
        )}

        {/* Secondary Static Card: Isolated Officer Bio & Alert Channel Controls (No Profile Switcher) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2 shadow-xs">
          <div className="flex items-center gap-1.5">
            <div
              id="guard-isolated-session-card"
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-left flex items-center justify-between min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center border border-blue-400 shrink-0">
                  {activeGuard.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                    <span className="truncate">{activeGuard.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-blue-950 border border-blue-700/60 rounded text-blue-300 font-mono shrink-0">
                      {activeGuard.badgeNumber}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                      isMpuGuard
                        ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {isMpuGuard ? 'MPU PATROL' : 'DEDICATED SITE'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {activeGuard.email || `@${activeGuard.username || activeGuard.badgeNumber.toLowerCase()}`} • {activePostName}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Theme Toggle */}
            <button
              id="guard-theme-toggle-btn"
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 cursor-pointer transition-colors shrink-0"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme (Night Shift)'}
              aria-label="Toggle Theme in Guard Terminal"
            >
              {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Compact Alert Channels Row */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] gap-2">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <BellRing className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">Alerts:</span>
              <div className="flex items-center gap-1 truncate">
                {alertPreferences.priorityNext24hPush && (
                  <span className="text-[9px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-mono font-black flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5 fill-current" /> 24h Push
                  </span>
                )}
                {alertPreferences.emergencyAlerts && (
                  <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-700/50 px-1.5 py-0.2 rounded font-mono font-bold">
                    Emergency
                  </span>
                )}
                {alertPreferences.urgentOpenShifts && (
                  <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-700/50 px-1.5 py-0.2 rounded font-mono font-bold">
                    Urgent
                  </span>
                )}
                {alertPreferences.tradeMatches && (
                  <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-700/50 px-1.5 py-0.2 rounded font-mono font-bold">
                    Trades
                  </span>
                )}
                {!alertPreferences.emergencyAlerts && !alertPreferences.urgentOpenShifts && !alertPreferences.tradeMatches && !alertPreferences.priorityNext24hPush && (
                  <span className="text-[9px] text-slate-500 italic">Muted</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="guard-alert-preferences-btn"
                onClick={() => setIsAlertPrefsOpen(true)}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                title={`${activeCategoriesCount} of 3 alert channels active`}
              >
                <Bell className="w-3 h-3 text-amber-400" />
                <SlidersHorizontal className="w-3 h-3" />
                <span id="guard-quick-prefs-config-btn">Config</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notification Banners (Scroll away naturally with content) */}
        <div id="guard-top-notification-banners" className="space-y-2">
          <GuardCoachingAlertBanner guardId={activeGuard.id} />
          <UpcomingShiftReminderBanner 
            onNavigateToDuty={() => setActiveTab('duty_post')}
            onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)}
          />
          <TimeSpecificTaskAlertBanner />
          <PriorityShiftPushBanner onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)} />
        </div>

        {/* Active Tab View */}
        {activeTab === 'duty_post' && (
          <GuardDutyTerminal 
            onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)} 
            onNavigateToCalendar={() => setActiveTab('schedule_calendar')}
          />
        )}
        {activeTab === 'schedule_calendar' && (
          <GuardScheduleCalendar 
            onNavigateToDuty={() => setActiveTab('duty_post')} 
            onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)} 
          />
        )}
        {isMpuGuard && activeTab === 'live_route' && (
          <LiveRouteView 
            onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)} 
            onNavigateToDuty={() => setActiveTab('duty_post')} 
          />
        )}
        {activeTab === 'open_board' && (
          <OpenShiftBoard onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)} />
        )}
        {activeTab === 'ranking' && (
          <GuardLeaderboardView onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)} />
        )}
        {activeTab === 'trade_board' && (
          <TradeBoard onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)} />
        )}
        {activeTab === 'active_calls' && <ActiveCallsPanel />}
        {activeTab === 'resources' && <GuardResourceHub />}
      </div>
    </aside>
  );
};

export const GuardTerminal = GuardView;
export default GuardView;
