import React, { useState } from 'react';
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
import { GuardLoginModal } from './GuardLoginModal';
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
  ChevronDown, 
  PhoneCall,
  Bell,
  BellRing,
  Sun,
  Moon,
  SlidersHorizontal,
  Zap,
  Clock,
  Fingerprint,
  KeyRound,
  Navigation,
  CalendarDays,
  Trophy
} from 'lucide-react';

export interface GuardViewProps {
  isSidebarMode?: boolean;
}

export const GuardView: React.FC<GuardViewProps> = ({ isSidebarMode = true }) => {
  const { 
    activeGuard, 
    guardsList, 
    setActiveGuard, 
    shifts, 
    scheduledShifts,
    trades, 
    callsForService,
    activeClockedInShift,
    opsPhone, 
    theme, 
    toggleTheme,
    alertPreferences,
    eligiblePriorityShifts
  } = useShiftOps();

  const { activeDistress } = usePanicSosAlert();
  const [activeTab, setActiveTab] = useState<'duty_post' | 'schedule_calendar' | 'live_route' | 'open_board' | 'trade_board' | 'ranking' | 'active_calls' | 'resources'>('duty_post');
  const [showGuardMenu, setShowGuardMenu] = useState(false);
  const [isAlertPrefsOpen, setIsAlertPrefsOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
    'City Airport Gate 4';

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
    // Deterministic fallback by guard profile so officers can preview compliance states
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

      {/* Guard Authentication & Biometrics Modal */}
      <GuardLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={(guard) => {
          setActiveGuard(guard);
          setIsLoginModalOpen(false);
        }}
      />

      {/* 1. Top Header (STRICTLY ONE SLIM ROW, max height 54px, sticky top-0, z-30) */}
      <header
        id="guard-slim-top-header"
        className="h-[54px] max-h-[54px] sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shrink-0"
      >
        {/* Left: Status pill with pulsing green dot + Active Post Name + Officer callsign */}
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

          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span
              className="text-xs font-black text-slate-100 truncate"
              title={activePostName}
            >
              {activePostName}
            </span>
            <span className="text-slate-600 shrink-0">•</span>
            <button
              type="button"
              onClick={() => setShowGuardMenu(!showGuardMenu)}
              className="text-[11px] font-mono font-bold text-blue-400 hover:text-blue-300 shrink-0 flex items-center gap-0.5 cursor-pointer"
              title={`Active Officer: ${activeGuard.name} (${activeGuard.badgeNumber})`}
            >
              <span>{activeGuard.badgeNumber}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Right: Compact 1-tap Dispatch Call button (phone icon) + Compact 2.0s Hold SOS Panic Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            id="guard-header-dispatch-call-btn"
            href={`tel:${opsPhone}`}
            className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-300 hover:text-white flex items-center justify-center gap-1.5 text-[11px] font-mono font-bold transition-colors shrink-0"
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
          <span>ROUTE</span>
          <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'live_route' ? 'bg-slate-950' : 'bg-cyan-400 animate-ping'}`} />
        </button>

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

        {/* Secondary Static Card: Officer Bio, Profile Switcher & Alert Channel Controls (Scrolls away naturally) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2 shadow-xs">
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <button
                id="guard-profile-switcher-btn"
                onClick={() => setShowGuardMenu(!showGuardMenu)}
                className="flex-1 bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-left flex items-center justify-between transition-colors cursor-pointer min-w-0"
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
                      {activeGuard.biometricsEnabled && (
                        <span title="Biometrics Enrolled on this Device" className="text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 rounded font-mono font-bold flex items-center gap-0.5 shrink-0">
                          <Fingerprint className="w-2.5 h-2.5 text-emerald-300" /> Bio
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      @{activeGuard.username || activeGuard.badgeNumber.toLowerCase()} • {activeGuard.ojtSites.length} Sites Authorized
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {/* Quick Login / Biometric Auth Button */}
              <button
                id="guard-open-login-btn"
                onClick={() => setIsLoginModalOpen(true)}
                className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Guard Authentication & Biometric Sign-In"
              >
                <Fingerprint className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px]">Auth</span>
              </button>

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

            {/* Guard Roster Dropdown */}
            {showGuardMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 z-50 overflow-hidden text-slate-100 animate-in fade-in duration-100">
                <div className="p-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    Active Guard Profile Roster
                  </span>
                  <button
                    onClick={() => {
                      setShowGuardMenu(false);
                      setIsLoginModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Full Sign In / Bio</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-800">
                  {guardsList.map((guard) => (
                    <button
                      key={guard.id}
                      onClick={() => {
                        setActiveGuard(guard);
                        setShowGuardMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between rounded-lg hover:bg-slate-800 transition-colors ${
                        guard.id === activeGuard.id ? 'bg-blue-950/60 font-bold text-blue-300' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {guard.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <span>{guard.name}</span>
                            {guard.biometricsEnabled && (
                              <span className="text-[8px] bg-emerald-950/70 text-emerald-300 px-1 py-0.2 rounded font-mono font-bold flex items-center gap-0.5">
                                <Fingerprint className="w-2.5 h-2.5" /> Bio
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            @{guard.username || guard.badgeNumber.toLowerCase()} • {guard.badgeNumber} • PIN: {guard.pin || '1234'}
                          </div>
                        </div>
                      </div>
                      {guard.id === activeGuard.id && (
                        <span className="text-[10px] font-bold text-blue-300 bg-blue-900/60 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setShowGuardMenu(false);
                      setIsLoginModalOpen(true);
                    }}
                    className="w-full py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-bold text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>Authenticate with Password / PIN / Bio</span>
                  </button>
                </div>
              </div>
            )}
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
        {activeTab === 'live_route' && (
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
