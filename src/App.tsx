import React, { useState } from 'react';
import { ShiftOpsProvider, useShiftOps } from './context/ShiftOpsContext';
import { GuardView } from './components/guard/GuardView';
import { OpsAdminView } from './components/ops/OpsAdminView';
import { ToastContainer } from './components/common/ToastContainer';
import { 
  AdminAuthModal, 
  DispatcherIdentity, 
  DISPATCHER_PRESETS 
} from './components/ops/AdminAuthModal';
import { 
  Shield, 
  Smartphone, 
  LayoutDashboard, 
  Columns, 
  HelpCircle, 
  X, 
  CheckCircle2, 
  MessageSquare, 
  ArrowRightLeft, 
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Sun,
  Moon
} from 'lucide-react';

const STORAGE_ADMIN_AUTH_KEY = 'secureshift_admin_session_v1';
const STORAGE_ADMIN_USER_KEY = 'secureshift_admin_user_v1';

interface AdminAuthGateProps {
  isAdminAuthenticated: boolean;
  onOpenLoginModal: () => void;
  onReturnToGuard: () => void;
  onLock: () => void;
  adminName: string;
  adminBadge: string;
}

const AdminAuthGate: React.FC<AdminAuthGateProps> = ({
  isAdminAuthenticated,
  onOpenLoginModal,
  onReturnToGuard,
  onLock,
  adminName,
  adminBadge
}) => {
  if (!isAdminAuthenticated) {
    return (
      <div 
        id="admin-locked-gate-panel"
        className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 text-white min-h-full overflow-y-auto"
      >
        <div className="w-full max-w-md bg-slate-950 border border-blue-900/60 rounded-2xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
          <div className="p-3.5 bg-blue-950 border border-blue-800 rounded-2xl mb-4 text-blue-400">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-base font-black uppercase tracking-wider text-white mb-1">
            Ops Admin Console Locked
          </h2>
          <p className="text-xs text-blue-200 font-mono mb-4">
            Restricted to Authorized Dispatch & Supervisor Staff
          </p>

          <div className="bg-amber-950/60 border border-amber-900/80 rounded-xl p-3 text-left mb-6 text-xs text-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-tight">
              Security guards are prohibited from accessing Ops dispatch controls. Guards should use the <strong>Guard App</strong>.
            </p>
          </div>

          <button
            id="admin-gate-login-btn"
            onClick={onOpenLoginModal}
            className="w-full bg-[#1e3a8a] hover:bg-blue-800 active:bg-blue-950 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            Enter Ops Authorization PIN
          </button>

          <button
            id="admin-gate-return-guard-btn"
            onClick={onReturnToGuard}
            className="mt-3 text-xs text-slate-400 hover:text-slate-200 transition-colors uppercase font-bold"
          >
            Return to Guard App
          </button>
        </div>
      </div>
    );
  }

  return (
    <OpsAdminView 
      onLock={onLock}
      adminName={adminName}
      adminBadge={adminBadge}
    />
  );
};

const AppContent: React.FC = () => {
  const { 
    activeView, 
    setActiveView, 
    resetToDefaults, 
    showToast, 
    logAdminAction, 
    theme, 
    toggleTheme 
  } = useShiftOps();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingTargetView, setPendingTargetView] = useState<'ops' | 'dual' | null>(null);

  // Admin Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_ADMIN_AUTH_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [adminUser, setAdminUser] = useState<DispatcherIdentity>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ADMIN_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DISPATCHER_PRESETS[0];
  });

  const handleAdminLoginSuccess = (dispatcher: DispatcherIdentity) => {
    setIsAdminAuthenticated(true);
    setAdminUser(dispatcher);
    try {
      localStorage.setItem(STORAGE_ADMIN_AUTH_KEY, 'true');
      localStorage.setItem(STORAGE_ADMIN_USER_KEY, JSON.stringify(dispatcher));
    } catch {}

    logAdminAction({
      type: 'admin_login',
      title: 'Dispatcher Logged In',
      description: `${dispatcher.name} authenticated into Ops Command Console (Role: ${dispatcher.role.toUpperCase()})`,
      adminName: dispatcher.name,
      adminBadge: dispatcher.badgeId,
      badgeVariant: 'emerald',
      metadata: { role: dispatcher.role, timestamp: new Date().toISOString() }
    });

    setShowLoginModal(false);
    showToast('Ops Access Authorized', `Welcome, ${dispatcher.name} (${dispatcher.badgeId}).`, 'success');

    if (pendingTargetView) {
      setActiveView(pendingTargetView);
      setPendingTargetView(null);
    }
  };

  const handleAdminLock = () => {
    logAdminAction({
      type: 'admin_lock',
      title: 'Console Session Locked',
      description: `${adminUser.name} locked the dispatcher console session`,
      adminName: adminUser.name,
      adminBadge: adminUser.badgeId,
      badgeVariant: 'slate'
    });

    setIsAdminAuthenticated(false);
    try {
      localStorage.removeItem(STORAGE_ADMIN_AUTH_KEY);
    } catch {}
    showToast('Ops Console Locked', 'Dispatcher credentials required to re-enter.', 'info');
    if (activeView === 'ops') {
      setActiveView('guard');
    }
  };

  const handleSwitchView = (view: 'guard' | 'ops' | 'dual') => {
    if (view === 'guard') {
      setActiveView('guard');
      return;
    }

    // Attempting to access Ops or Dual view
    if (isAdminAuthenticated) {
      setActiveView(view);
    } else {
      setPendingTargetView(view);
      setShowLoginModal(true);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      {/* Top Application Bar with View Mode Switcher */}
      <header className="bg-[#14234b] dark:bg-slate-950 text-white px-4 py-2.5 flex flex-wrap justify-between items-center border-b border-blue-900/80 dark:border-slate-800 z-30 shrink-0 gap-2 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 rounded-lg shadow-xs">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider uppercase">
              SecureShift
            </span>
            <span className="text-[10px] text-blue-300 dark:text-blue-400 ml-2 hidden sm:inline-block font-mono">
              SECURITY OPERATIONS PLATFORM
            </span>
          </div>
        </div>

        {/* Mode Switcher Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/70 dark:bg-slate-900 p-1 rounded-lg border border-blue-800/40 dark:border-slate-800">
          {/* Guard App (Always open without login) */}
          <button
            id="view-mode-guard-btn"
            onClick={() => handleSwitchView('guard')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'guard'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Guard Mobile Interface (Open Board & Trade Board — No login needed)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Guard App</span>
          </button>

          {/* Ops Admin (Protected by PIN / password login) */}
          <button
            id="view-mode-ops-btn"
            onClick={() => handleSwitchView('ops')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'ops'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Ops Manager Command Center (Supervisor PIN required)"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Ops Admin</span>
            {isAdminAuthenticated ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5" title="Authenticated" />
            ) : (
              <Lock className="w-3 h-3 text-amber-400 ml-0.5" title="Login Required" />
            )}
          </button>

          {/* Dual Split View */}
          <button
            id="view-mode-dual-btn"
            onClick={() => handleSwitchView('dual')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'dual'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Split screen: Guard view on left, Ops manager on right"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Dual Split View</span>
            <span className="md:hidden">Dual</span>
          </button>
        </div>

        {/* Action icons, Theme Switcher & Lock Button */}
        <div className="flex items-center gap-2">
          {/* Light / Dark Mode Toggle Button */}
          <button
            id="app-theme-toggle-btn"
            onClick={toggleTheme}
            className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-2xs'
                : 'bg-blue-900/60 hover:bg-blue-900 text-blue-100 border-blue-700/60 shadow-2xs'
            }`}
            title={theme === 'dark' ? 'Switch to Light Theme (Day Shift)' : 'Switch to Dark Theme (Night Shift)'}
            aria-label="Toggle Theme Mode"
          >
            {theme === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-bold text-[11px] hidden sm:inline">Night Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-bold text-[11px] hidden sm:inline">Day Mode</span>
              </>
            )}
          </button>

          {isAdminAuthenticated ? (
            <button
              id="top-admin-lock-btn"
              onClick={handleAdminLock}
              className="text-xs text-amber-300 hover:text-white flex items-center gap-1.5 bg-amber-950/70 hover:bg-amber-900 border border-amber-700/60 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              title="Lock Admin Session"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-bold">Lock Admin</span>
            </button>
          ) : (
            <button
              id="top-admin-login-prompt-btn"
              onClick={() => setShowLoginModal(true)}
              className="text-xs text-blue-200 hover:text-white flex items-center gap-1.5 bg-blue-950/70 hover:bg-blue-900 border border-blue-700/60 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              title="Login as Ops Dispatcher"
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-300" />
              <span className="hidden sm:inline font-bold">Ops Login</span>
            </button>
          )}

          <button
            id="demo-guide-help-btn"
            onClick={() => setShowHelpModal(true)}
            className="text-xs text-blue-200 hover:text-white flex items-center gap-1 bg-blue-900/60 hover:bg-blue-900 px-2.5 py-1 rounded-md border border-blue-700/50 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Feature Guide</span>
          </button>

          <button
            id="app-reset-defaults-btn"
            onClick={resetToDefaults}
            title="Reset to fresh demo shifts & trades"
            className="p-1 text-blue-300 hover:text-white hover:bg-blue-900 dark:hover:bg-slate-800 rounded cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden w-full h-full relative">
        {/* DUAL SPLIT VIEW (Side-by-side Guard + Protected Ops) */}
        {activeView === 'dual' && (
          <div className="flex w-full h-full overflow-hidden">
            {/* Guard Sidebar Frame (Never requires login) */}
            <GuardView isSidebarMode={true} />
            {/* Protected Ops Dashboard (Wraps OpsAdminView with auth gate) */}
            <AdminAuthGate
              isAdminAuthenticated={isAdminAuthenticated}
              onOpenLoginModal={() => setShowLoginModal(true)}
              onReturnToGuard={() => setActiveView('guard')}
              onLock={handleAdminLock}
              adminName={adminUser.name}
              adminBadge={adminUser.badgeId}
            />
          </div>
        )}

        {/* FULL GUARD VIEW (Always accessible without login) */}
        {activeView === 'guard' && (
          <div className="flex-1 bg-slate-200/80 dark:bg-slate-900 p-2 sm:p-6 overflow-y-auto flex items-center justify-center transition-colors">
            <div className="w-full max-w-md h-[95%] max-h-[850px] shadow-2xl rounded-2xl overflow-hidden border-4 border-slate-700 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
              <GuardView isSidebarMode={false} />
            </div>
          </div>
        )}

        {/* FULL OPS ADMIN VIEW (Protected by auth wrapper) */}
        {activeView === 'ops' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <AdminAuthGate
              isAdminAuthenticated={isAdminAuthenticated}
              onOpenLoginModal={() => setShowLoginModal(true)}
              onReturnToGuard={() => setActiveView('guard')}
              onLock={handleAdminLock}
              adminName={adminUser.name}
              adminBadge={adminUser.badgeId}
            />
          </div>
        )}
      </div>

      {/* Admin Login Modal Layer */}
      <AdminAuthModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingTargetView(null);
        }}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* Toast Notification Layer */}
      <ToastContainer />

      {/* Feature Guide Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#1e3a8a] dark:bg-slate-950 text-white p-5 flex justify-between items-center border-b dark:border-slate-800">
              <div>
                <h3 className="font-black text-base uppercase tracking-wide">
                  SecureShift Security Operations Architecture
                </h3>
                <p className="text-xs text-blue-200 dark:text-blue-300">
                  Role-Separated Guard & Dispatch Command Structure
                </p>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs text-slate-700 dark:text-slate-300">
              {/* Role Separation Notice */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-900 dark:text-amber-200">
                <h4 className="font-bold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  Admin Authentication & Guard Protection
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  Security guards access the Guard App immediately without any login friction. The Ops Admin command dashboard is protected by an authentication layer requiring a dispatcher PIN (<strong>Default PIN: 1099</strong> or 1-click demo login).
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-slate-700 dark:text-slate-300">
                <h4 className="font-bold text-[#1e3a8a] dark:text-blue-300 text-sm mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  1. Guard View (Zero-Login User Environment)
                </h4>
                <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600 dark:text-slate-400">
                  <li><strong>Open Shift Board:</strong> Scrollable feed with Site Name, Date, Time, Calculated Hours, and Urgency Badges.</li>
                  <li><strong>Text to Bid (3-Option Modal):</strong> Tap "Text to Bid" to choose <em>Trained</em>, <em>Needs OJT</em>, or <em>Cancel</em>. Pre-fills device SMS for mobile dispatch.</li>
                  <li><strong>Trade Board:</strong> Lists shifts other guards are giving away with <em>"+ Post Shift"</em> and <em>"Propose Swap"</em> forms.</li>
                </ul>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 flex items-center gap-1.5">
                  <LayoutDashboard className="w-4 h-4 text-[#1e3a8a] dark:text-blue-400" />
                  2. Ops Admin View (Authorized Dispatch Environment)
                </h4>
                <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600 dark:text-slate-400">
                  <li><strong>Full Scrollable Dashboard:</strong> Complete management view with fluid vertical scrolling.</li>
                  <li><strong>Shift Manager:</strong> Post single shifts with auto-calculated duration or mass import JSON shift arrays.</li>
                  <li><strong>Active Shift Feed:</strong> Mark shifts filled (greys card out) or reopen shifts with "Hide Filled" toggle.</li>
                  <li><strong>Trade Approvals (3 Feeds, Oldest-First):</strong>
                    <ul className="list-circle pl-4 space-y-0.5 mt-1">
                      <li><em>Pending Posts:</em> Approve or Deny guard shift listings with mandatory reason.</li>
                      <li><em>Pending Swaps:</em> Highlighted in <span className="text-red-700 dark:text-red-400 font-bold">RED</span> if Guard B needs OJT training.</li>
                      <li><em>History Log:</em> Permanent audit trail with timestamps.</li>
                    </ul>
                  </li>
                  <li><strong>Live Terminal:</strong> Real-time operational audit trail stream.</li>
                </ul>
              </div>

              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2.5 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-md transition-all mt-2 cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ShiftOpsProvider>
      <AppContent />
    </ShiftOpsProvider>
  );
}
