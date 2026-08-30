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
import { 
  Shield, 
  UserCheck, 
  ChevronDown, 
  Smartphone,
  PhoneCall,
  Bell,
  BellRing,
  Sun,
  Moon,
  SlidersHorizontal,
  AlertTriangle,
  Zap,
  RefreshCw,
  Clock,
  CheckCircle2,
  MapPin,
  Fingerprint,
  KeyRound,
  LogOut,
  UserPlus,
  Navigation,
  CalendarDays,
  Trophy
} from 'lucide-react';

interface GuardViewProps {
  isSidebarMode?: boolean;
}

export const GuardView: React.FC<GuardViewProps> = ({ isSidebarMode = true }) => {
  const { 
    activeGuard, 
    authenticatedGuard,
    isGuardLoggedIn,
    guardLogout,
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
  const [activeTab, setActiveTab] = useState<'duty_post' | 'schedule_calendar' | 'live_route' | 'open_board' | 'trade_board' | 'ranking' | 'active_calls'>('duty_post');
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

  return (
    <aside 
      id="guard-view-container"
      className={`bg-white dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 flex flex-col shadow-xl h-full overflow-hidden relative ${
        isSidebarMode ? 'w-full md:w-[380px] lg:w-[410px] shrink-0' : 'w-full max-w-2xl mx-auto border-x dark:border-slate-800'
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

      {/* Navy Blue Header matching High Density theme */}
      <header className="bg-[#1e3a8a] dark:bg-slate-950 text-white p-4 sm:p-5 flex flex-col gap-3 shadow-md shrink-0 border-b dark:border-slate-800">
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-300" />
              <h1 className="text-lg font-black tracking-tight uppercase">Guard View</h1>
            </div>
            <p className="text-[10px] text-blue-200 dark:text-blue-300 uppercase tracking-widest font-semibold mt-0.5">
              SecureShift Mobile Interface
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Shift Alert Preferences Modal Trigger */}
            <button
              id="guard-alert-preferences-btn"
              onClick={() => setIsAlertPrefsOpen(true)}
              className="p-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-400/30 text-blue-200 hover:text-white cursor-pointer transition-colors relative flex items-center gap-1.5 shadow-2xs group"
              title="Shift Alert Preferences (Emergency, Urgent Shifts, Trades)"
              aria-label="Open Shift Alert Preferences"
            >
              <Bell className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold font-mono text-white hidden sm:inline">Alerts</span>
              <span 
                className={`w-2 h-2 rounded-full ${
                  activeCategoriesCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                }`}
                title={`${activeCategoriesCount} of 3 alert channels active`}
              />
            </button>

            {/* Quick theme toggle inside Guard View header */}
            <button
              id="guard-theme-toggle-btn"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-400/30 text-amber-300 cursor-pointer transition-colors"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme (Night Shift)'}
              aria-label="Toggle Theme in Guard Terminal"
            >
              {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            {/* Ops Dispatcher phone pill */}
            <div className="bg-blue-950/70 border border-blue-400/30 px-2 py-1 rounded text-right">
              <span className="text-[9px] text-blue-300 block uppercase font-mono">Ops Dispatch</span>
              <span className="text-[11px] font-bold text-white font-mono">{opsPhone}</span>
            </div>
          </div>
        </div>

        {/* Guard Profile & Authentication Selector */}
        <div className="relative">
          <div className="flex gap-1.5">
            <button
              id="guard-profile-switcher-btn"
              onClick={() => setShowGuardMenu(!showGuardMenu)}
              className="flex-1 bg-blue-900/80 dark:bg-slate-900/90 hover:bg-blue-900 dark:hover:bg-slate-800 border border-blue-700/60 dark:border-slate-700 rounded-lg px-3 py-2 text-left flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border border-blue-400 shrink-0">
                  {activeGuard.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                    <span>{activeGuard.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-blue-700 rounded text-blue-200 font-mono">
                      {activeGuard.badgeNumber}
                    </span>
                    {activeGuard.biometricsEnabled && (
                      <span title="Biometrics Enrolled on this Device" className="text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 rounded font-mono font-bold flex items-center gap-0.5">
                        <Fingerprint className="w-2.5 h-2.5 text-emerald-300" /> Bio
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-blue-300 truncate max-w-[200px]">
                    @{activeGuard.username || activeGuard.badgeNumber.toLowerCase()} • {activeGuard.ojtSites.length} Sites Authorized
                  </div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-blue-300 shrink-0" />
            </button>

            {/* Quick Login / Biometric Auth Button */}
            <button
              id="guard-open-login-btn"
              onClick={() => setIsLoginModalOpen(true)}
              className="px-2.5 py-2 bg-blue-800 hover:bg-blue-700 border border-blue-500/50 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
              title="Guard Authentication & Biometric Sign-In"
            >
              <Fingerprint className="w-4 h-4 text-blue-200" />
              <span className="hidden sm:inline text-[11px]">Auth</span>
            </button>
          </div>

          {/* Guard Dropdown */}
          {showGuardMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden text-slate-800 dark:text-slate-100 animate-in fade-in duration-100">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Active Guard Profile Roster
                </span>
                <button
                  onClick={() => {
                    setShowGuardMenu(false);
                    setIsLoginModalOpen(true);
                  }}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Full Sign In / Bio</span>
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-slate-800">
                {guardsList.map((guard) => (
                  <button
                    key={guard.id}
                    onClick={() => {
                      setActiveGuard(guard);
                      setShowGuardMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors ${
                      guard.id === activeGuard.id ? 'bg-blue-50 dark:bg-blue-950/50 font-bold text-[#1e3a8a] dark:text-blue-300' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {guard.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>{guard.name}</span>
                          {guard.biometricsEnabled && (
                            <span className="text-[8px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 rounded font-mono font-bold flex items-center gap-0.5">
                              <Fingerprint className="w-2.5 h-2.5" /> Bio
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          @{guard.username || guard.badgeNumber.toLowerCase()} • {guard.badgeNumber} • PIN: {guard.pin || '1234'}
                        </div>
                      </div>
                    </div>
                    {guard.id === activeGuard.id && (
                      <span className="text-[10px] font-bold text-[#1e3a8a] dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowGuardMenu(false);
                    setIsLoginModalOpen(true);
                  }}
                  className="w-full py-1.5 bg-[#1e3a8a] hover:bg-blue-800 text-white rounded-lg font-bold text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>Authenticate with Password / PIN / Bio</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Shift Alert Status Strip */}
        <div className="bg-blue-950/60 border border-blue-800/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] gap-2">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <BellRing className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider shrink-0">Alerts:</span>
            <div className="flex items-center gap-1 truncate">
              {alertPreferences.priorityNext24hPush && (
                <span className="text-[9px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-mono font-black flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5 fill-current" /> 24h Push
                </span>
              )}
              {alertPreferences.emergencyAlerts && (
                <span className="text-[9px] bg-rose-900/70 text-rose-200 border border-rose-700/50 px-1.5 py-0.2 rounded font-mono font-bold">
                  Emergency
                </span>
              )}
              {alertPreferences.urgentOpenShifts && (
                <span className="text-[9px] bg-amber-900/70 text-amber-200 border border-amber-700/50 px-1.5 py-0.2 rounded font-mono font-bold">
                  Urgent
                </span>
              )}
              {alertPreferences.tradeMatches && (
                <span className="text-[9px] bg-blue-800/80 text-blue-200 border border-blue-600/50 px-1.5 py-0.2 rounded font-mono font-bold">
                  Trades
                </span>
              )}
              {!alertPreferences.emergencyAlerts && !alertPreferences.urgentOpenShifts && !alertPreferences.tradeMatches && !alertPreferences.priorityNext24hPush && (
                <span className="text-[9px] text-slate-400 italic">Muted</span>
              )}
            </div>
          </div>

          <button
            id="guard-quick-prefs-config-btn"
            onClick={() => setIsAlertPrefsOpen(true)}
            className="text-[10px] font-bold text-blue-300 hover:text-white flex items-center gap-1 underline underline-offset-2 shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Config</span>
          </button>
        </div>
      </header>

      {/* Active Shift Duty Banner if Clocked In */}
      {activeClockedInShift && (
        <div 
          onClick={() => setActiveTab('duty_post')}
          className={`px-3 py-2 text-white flex items-center justify-between text-xs cursor-pointer border-b transition-colors ${
            activeClockedInShift.status === 'on_break'
              ? 'bg-amber-700 dark:bg-amber-900 border-amber-500'
              : 'bg-emerald-700 dark:bg-emerald-900 border-emerald-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              activeClockedInShift.status === 'on_break' ? 'bg-amber-300' : 'bg-emerald-300 animate-ping'
            }`} />
            <span className="font-extrabold uppercase font-mono text-[11px]">
              {activeClockedInShift.status === 'on_break' ? '☕ On Break' : '● On Duty'}: {activeClockedInShift.siteName}
            </span>
          </div>
          <span className="text-[10px] font-mono underline underline-offset-2">Terminal →</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto no-scrollbar">
        <button
          id="guard-tab-duty-post"
          onClick={() => setActiveTab('duty_post')}
          className={`flex-1 min-w-[72px] py-3 text-[10px] sm:text-xs font-bold transition-all relative flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'duty_post'
              ? 'border-b-2 border-[#1e3a8a] dark:border-blue-400 text-[#1e3a8a] dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/30 font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>MY DUTY</span>
          {activeClockedInShift && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
        </button>

        <button
          id="guard-tab-schedule-cal"
          onClick={() => setActiveTab('schedule_calendar')}
          className={`flex-1 min-w-[78px] py-3 text-[10px] sm:text-xs font-bold transition-all relative flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'schedule_calendar'
              ? 'border-b-2 border-[#1e3a8a] dark:border-blue-400 text-[#1e3a8a] dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/30 font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>SCHEDULE</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
            activeTab === 'schedule_calendar' 
              ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white' 
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {guardUpcomingShiftsCount}
          </span>
        </button>

        <button
          id="guard-tab-live-route"
          onClick={() => setActiveTab('live_route')}
          className={`flex-1 min-w-[68px] py-3 text-[10px] sm:text-xs font-bold transition-all relative flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'live_route'
              ? 'border-b-2 border-cyan-500 dark:border-cyan-400 text-cyan-700 dark:text-cyan-400 bg-cyan-50/40 dark:bg-cyan-950/30 font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Navigation className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>ROUTE</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
        </button>

        <button
          id="guard-tab-open-board"
          onClick={() => setActiveTab('open_board')}
          className={`flex-1 min-w-[72px] py-3 text-[10px] sm:text-xs font-bold transition-all relative flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'open_board'
              ? 'border-b-2 border-[#1e3a8a] dark:border-blue-400 text-[#1e3a8a] dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/30 font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <span>OPEN</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
            activeTab === 'open_board' 
              ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white' 
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
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
          className={`flex-1 min-w-[70px] py-3 text-[10px] sm:text-xs font-bold transition-all relative flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'ranking'
              ? 'border-b-2 border-amber-500 dark:border-amber-400 text-amber-700 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/30 font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>RANKING</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        </button>

        <button
          id="guard-tab-trade-board"
          onClick={() => setActiveTab('trade_board')}
          className={`flex-1 min-w-[65px] py-3 text-[10px] sm:text-xs font-bold transition-all relative flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'trade_board'
              ? 'border-b-2 border-[#1e3a8a] dark:border-blue-400 text-[#1e3a8a] dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/30 font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <span>TRADES</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
            activeTab === 'trade_board' 
              ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white' 
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {activeTradesCount}
          </span>
        </button>

        <button
          id="guard-tab-active-calls"
          onClick={() => setActiveTab('active_calls')}
          className={`flex-1 min-w-[65px] py-3 text-[10px] sm:text-xs font-bold transition-all relative flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'active_calls'
              ? 'border-b-2 border-rose-600 text-rose-700 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/30 font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <PhoneCall className="w-3 h-3 text-rose-500" />
          <span>CALLS</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
            boloCount > 0
              ? 'bg-rose-600 text-white animate-pulse'
              : activeCallsCount > 0
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {activeCallsCount}
          </span>
        </button>
      </nav>

      {/* Board Content */}
      <div className="flex-1 flex flex-col overflow-y-auto min-h-0 bg-slate-50 dark:bg-slate-900 p-2 sm:p-3">
        {/* Guard 1-on-1 Performance Coaching Notification Banner (Strictly filtered by active guard) */}
        <GuardCoachingAlertBanner guardId={activeGuard.id} />

        {/* 24-Hour Pre-Shift Duty Reminder Banner */}
        <UpcomingShiftReminderBanner 
          onNavigateToDuty={() => setActiveTab('duty_post')}
          onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)}
        />

        {/* Time-Specific Task Notification Banner */}
        <TimeSpecificTaskAlertBanner />

        {/* Priority 24h Push Alert Banner */}
        <PriorityShiftPushBanner onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)} />

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
        {activeTab === 'open_board' && <OpenShiftBoard onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)} />}
        {activeTab === 'ranking' && <GuardLeaderboardView onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)} />}
        {activeTab === 'trade_board' && <TradeBoard onOpenAlertPrefs={() => setIsAlertPrefsOpen(true)} />}
        {activeTab === 'active_calls' && <ActiveCallsPanel />}
      </div>
    </aside>
  );
};

