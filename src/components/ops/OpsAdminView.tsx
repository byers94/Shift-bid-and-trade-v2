import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ShiftManager } from './ShiftManager';
import { TradeApprovals } from './TradeApprovals';
import { LiveAuditTerminal } from './LiveAuditTerminal';
import { RecentAdminActionsPanel } from './RecentAdminActionsPanel';
import { UserManagementModal } from './UserManagementModal';
import { ShiftBidsModal } from './ShiftBidsModal';
import { GuardDirectory } from './GuardDirectory';
import { EmergencyBroadcastModal } from './EmergencyBroadcastModal';
import { 
  ShieldCheck, 
  Activity, 
  Layers, 
  FileText, 
  AlertCircle,
  Bell,
  Lock,
  LogOut,
  UserCheck,
  History,
  Users,
  PanelRightClose,
  PanelRightOpen,
  Zap,
  Calendar,
  Terminal,
  ArrowRightLeft,
  Radio,
  AlertOctagon,
  Volume2
} from 'lucide-react';

interface OpsAdminViewProps {
  onLock?: () => void;
  adminName?: string;
  adminBadge?: string;
}

const STORAGE_OPS_MAIN_TAB_KEY = 'secureshift_ops_main_tab_v1';

export const OpsAdminView: React.FC<OpsAdminViewProps> = ({ 
  onLock, 
  adminName = "Lt. Mark O'Connor", 
  adminBadge = "OPS-CMD-01" 
}) => {
  const { shifts, trades, bids, recentAdminActions, adminUsers, guardsList, activeBroadcast } = useShiftOps();
  const [activeMainTab, setActiveMainTabState] = useState<'operations' | 'guard_directory' | 'audit_terminal'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_OPS_MAIN_TAB_KEY);
      if (saved === 'operations' || saved === 'guard_directory' || saved === 'audit_terminal') {
        return saved;
      }
    } catch {}
    return 'operations';
  });

  const setActiveMainTab = (tab: 'operations' | 'guard_directory' | 'audit_terminal') => {
    setActiveMainTabState(tab);
    try {
      localStorage.setItem(STORAGE_OPS_MAIN_TAB_KEY, tab);
    } catch {}
  };
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [userManagementTab, setUserManagementTab] = useState<'admins' | 'guards'>('admins');
  const [isBidsModalOpen, setIsBidsModalOpen] = useState(false);
  const [selectedBidsShiftId, setSelectedBidsShiftId] = useState<string | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  const activeShiftsCount = shifts.filter((s) => s.status === 'open').length;
  const pendingSwapsCount = trades.filter((t) => t.status === 'pending_swap').length;
  const pendingPostsCount = trades.filter((t) => t.status === 'pending_approval').length;
  const emergencyCount = shifts.filter((s) => s.status === 'open' && s.urgency === 'emergency').length;
  const activeBidsCount = bids.length;

  return (
    <main 
      id="ops-admin-container"
      className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-full overflow-y-auto min-h-0 transition-colors"
    >
      {/* Header matching High Density theme */}
      <header className="bg-[#1e3a8a] dark:bg-slate-950 text-white p-4 lg:p-5 flex flex-wrap justify-between items-center shadow-md shrink-0 gap-3 sticky top-0 z-20 border-b dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-900/80 dark:bg-slate-900 rounded-lg border border-blue-700 dark:border-slate-700">
            <ShieldCheck className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h1 className="text-base lg:text-lg font-extrabold tracking-tight uppercase">
              Ops Admin Dashboard
            </h1>
            <p className="text-[10px] lg:text-xs text-blue-200 dark:text-blue-300 uppercase tracking-widest font-semibold">
              Shift & Trade Command Center
            </p>
          </div>
        </div>

        {/* Real-time Metric Indicators & Admin Status */}
        <div className="flex flex-wrap items-center gap-3 lg:gap-4">
          <div className="text-right">
            <p className="text-[9px] text-blue-200 dark:text-blue-300 uppercase font-semibold">Active Shifts</p>
            <p className="text-base lg:text-lg font-black font-mono">
              {activeShiftsCount} <span className="text-xs font-normal text-blue-200 dark:text-blue-300 font-sans">Open</span>
            </p>
          </div>

          <div className="w-px bg-white/20 dark:bg-slate-800 h-7"></div>

          {/* Active Guard Bids Indicator */}
          <button
            id="header-active-bids-btn"
            type="button"
            onClick={() => {
              setSelectedBidsShiftId(null);
              setIsBidsModalOpen(true);
            }}
            className="text-right hover:opacity-90 transition-all cursor-pointer group bg-blue-900/60 dark:bg-slate-900/80 hover:bg-blue-800/80 dark:hover:bg-slate-800 px-2 py-0.5 rounded-lg border border-blue-600/60 dark:border-slate-700"
            title="Click to view and manage all active guard bids"
          >
            <p className="text-[9px] text-amber-300 uppercase font-bold flex items-center justify-end gap-1">
              <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-300" />
              Active Bids
            </p>
            <p className="text-base lg:text-lg font-black font-mono text-amber-300 group-hover:text-amber-200">
              {activeBidsCount.toString().padStart(2, '0')}
            </p>
          </button>

          <div className="w-px bg-white/20 dark:bg-slate-800 h-7"></div>

          <div className="text-right">
            <p className="text-[9px] text-blue-200 dark:text-blue-300 uppercase font-semibold">Pending Swaps</p>
            <p className="text-base lg:text-lg font-black font-mono text-amber-400">
              {pendingSwapsCount.toString().padStart(2, '0')}
            </p>
          </div>

          <div className="w-px bg-white/20 dark:bg-slate-800 h-7"></div>

          <div className="text-right">
            <p className="text-[9px] text-blue-200 dark:text-blue-300 uppercase font-semibold">Listing Reqs</p>
            <p className="text-base lg:text-lg font-black font-mono text-blue-100">
              {pendingPostsCount.toString().padStart(2, '0')}
            </p>
          </div>

          {emergencyCount > 0 && (
            <>
              <div className="w-px bg-white/20 dark:bg-slate-800 h-7"></div>
              <div className="text-right bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded-lg">
                <p className="text-[9px] text-red-200 uppercase font-bold flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                  Emergency
                </p>
                <p className="text-sm font-black font-mono text-red-300">
                  {emergencyCount} Shifts
                </p>
              </div>
            </>
          )}

          {/* Emergency Broadcast Trigger Button */}
          <button
            id="open-emergency-broadcast-btn"
            type="button"
            onClick={() => setIsBroadcastModalOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border shadow-md cursor-pointer ${
              activeBroadcast
                ? 'bg-red-600 hover:bg-red-500 text-white border-red-300 ring-2 ring-red-400/80 animate-pulse'
                : 'bg-red-700 hover:bg-red-600 border-red-500 text-white hover:shadow-red-900/40'
            }`}
            title="Trigger or Monitor Site-Wide Emergency Broadcasts to Guard Terminals"
          >
            <Radio className={`w-3.5 h-3.5 ${activeBroadcast ? 'animate-bounce text-amber-300' : 'text-red-200'}`} />
            <span>{activeBroadcast ? 'BROADCAST ACTIVE' : 'Emergency Broadcast'}</span>
            {activeBroadcast ? (
              <span className="bg-white text-red-700 text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full">
                {activeBroadcast.acknowledgedBy.length}/{guardsList.length} ACK
              </span>
            ) : (
              <span className="bg-red-900/80 text-red-200 text-[10px] font-mono px-1 py-0.2 rounded">
                LIVE
              </span>
            )}
          </button>

          {/* Quick Tab Jump to Guard Directory */}
          <button
            id="header-guard-directory-btn"
            type="button"
            onClick={() => setActiveMainTab('guard_directory')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              activeMainTab === 'guard_directory'
                ? 'bg-blue-900 dark:bg-blue-600 border-blue-400 text-white shadow-inner ring-2 ring-white/20'
                : 'bg-blue-900/70 dark:bg-slate-800 border-blue-600 dark:border-slate-700 hover:bg-blue-800 dark:hover:bg-slate-700 text-white'
            }`}
            title="Open Guard Directory & Training Level Registry"
          >
            <Users className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden md:inline">Guard Directory</span>
            <span className="bg-emerald-400 text-slate-950 text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full">
              {guardsList.length}
            </span>
          </button>

          {/* User & Access Management Button */}
          <button
            id="open-user-management-btn"
            onClick={() => {
              setUserManagementTab('admins');
              setIsUserManagementOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-blue-900 dark:bg-slate-800 border border-blue-500 dark:border-slate-700 hover:bg-blue-800 dark:hover:bg-slate-700 text-white shadow-xs cursor-pointer"
            title="Manage Dispatchers, Admin PINs, and System Credentials"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Admin Access</span>
          </button>

          {/* Toggle Recent Actions Panel Button */}
          {activeMainTab === 'operations' && (
            <button
              id="toggle-recent-actions-panel-btn"
              onClick={() => setShowSidePanel(!showSidePanel)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                showSidePanel 
                  ? 'bg-blue-900 dark:bg-blue-600 border-blue-500 text-white shadow-inner' 
                  : 'bg-blue-950/60 dark:bg-slate-800 border-blue-700/60 dark:border-slate-700 text-blue-200 dark:text-slate-300 hover:text-white'
              }`}
              title={showSidePanel ? "Hide Recent Admin Actions side panel" : "Show Recent Admin Actions side panel"}
            >
              <History className="w-3.5 h-3.5 text-blue-300" />
              <span className="hidden sm:inline">Actions Feed</span>
              <span className="bg-[#1e3a8a] dark:bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                {recentAdminActions.length}
              </span>
            </button>
          )}

          {/* Authenticated Dispatcher Badge & Lock Button */}
          <div className="flex items-center gap-2 bg-blue-950/80 dark:bg-slate-900 border border-blue-700/80 dark:border-slate-800 px-2.5 py-1 rounded-xl">
            <div className="text-right">
              <div className="text-[11px] font-bold text-white flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{adminName}</span>
              </div>
              <div className="text-[9px] text-blue-200 dark:text-blue-300 font-mono">
                {adminBadge}
              </div>
            </div>
            {onLock && (
              <button
                id="ops-admin-lock-btn"
                onClick={onLock}
                title="Lock Ops Console"
                className="p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">Lock</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Sub-Nav Tabs Strip */}
      <div className="bg-slate-800 dark:bg-slate-900 text-white px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <button
            id="tab-operations-btn"
            type="button"
            onClick={() => setActiveMainTab('operations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMainTab === 'operations'
                ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Shift & Trade Operations</span>
            {pendingSwapsCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingSwapsCount}
              </span>
            )}
          </button>

          <button
            id="tab-guard-directory-btn"
            type="button"
            onClick={() => setActiveMainTab('guard_directory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMainTab === 'guard_directory'
                ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Guard Directory & Qualifications</span>
            <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {guardsList.length}
            </span>
          </button>

          <button
            id="tab-audit-terminal-btn"
            type="button"
            onClick={() => setActiveMainTab('audit_terminal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMainTab === 'audit_terminal'
                ? 'bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Audit Terminal</span>
          </button>
        </div>

        {/* Status Hint */}
        <div className="hidden lg:flex items-center gap-2 text-slate-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>System Online: <strong>{guardsList.length}</strong> Registered Officers</span>
        </div>
      </div>

      {/* Active Broadcast Alert Ribbon (if one is currently active) */}
      {activeBroadcast && (
        <div 
          id="ops-active-broadcast-ribbon"
          className="bg-gradient-to-r from-red-900 via-red-800 to-red-950 text-white px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-red-500 shadow-md shrink-0 animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-600 rounded-lg shadow animate-bounce text-white">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-500 text-white px-2 py-0.2 rounded-full">
                  LIVE EMERGENCY BROADCAST
                </span>
                <span className="text-xs font-bold uppercase text-white font-mono">
                  {activeBroadcast.title}
                </span>
              </div>
              <p className="text-[11px] text-red-200 font-mono line-clamp-1">
                Target: {activeBroadcast.targetSites.join(', ')} • Initiator: {activeBroadcast.initiatedBy}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right font-mono text-xs hidden sm:block">
              <span className="text-red-200">Compliance:</span>{' '}
              <strong className="text-emerald-300 font-black">
                {activeBroadcast.acknowledgedBy.length} / {guardsList.length} Guards Verified
              </strong>
            </div>

            <button
              type="button"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="px-3 py-1 bg-white text-red-900 hover:bg-red-50 font-black text-xs uppercase rounded-lg shadow transition-colors cursor-pointer border border-white"
            >
              Monitor & Stand Down
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area Based on Active Tab */}
      {activeMainTab === 'operations' && (
        <div className="flex-1 p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-12 gap-5 lg:gap-6 min-h-0">
          {/* Left Column: Shift Creation & Active Shifts Feed */}
          <section className={`flex flex-col gap-4 min-h-0 ${showSidePanel ? 'xl:col-span-4' : 'xl:col-span-6'}`}>
            <ShiftManager />
          </section>

          {/* Center Column: Pending Swaps/Trades & Live Terminal */}
          <section className={`flex flex-col gap-4 min-h-0 ${showSidePanel ? 'xl:col-span-5' : 'xl:col-span-6'}`}>
            <TradeApprovals 
              onOpenGuardDirectory={(guardId) => {
                setActiveMainTab('guard_directory');
              }}
            />
            <LiveAuditTerminal />
          </section>

          {/* Right Column: Recent Admin Actions Side-Panel */}
          {showSidePanel && (
            <section className="flex flex-col gap-4 min-h-0 xl:col-span-3">
              <RecentAdminActionsPanel 
                isCollapsed={false}
                onToggleCollapse={() => setShowSidePanel(false)}
              />
            </section>
          )}
        </div>
      )}

      {activeMainTab === 'guard_directory' && (
        <div className="flex-1 p-4 lg:p-6 min-h-0 overflow-y-auto max-w-7xl mx-auto w-full">
          <GuardDirectory 
            onNavigateToTrades={() => setActiveMainTab('operations')}
          />
        </div>
      )}

      {activeMainTab === 'audit_terminal' && (
        <div className="flex-1 p-4 lg:p-6 min-h-0 overflow-y-auto max-w-6xl mx-auto w-full">
          <LiveAuditTerminal />
        </div>
      )}

      {/* User & Access Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        initialTab={userManagementTab}
      />

      {/* Shift Bids & Candidate Assignment Modal (Accessible from Header Counter) */}
      <ShiftBidsModal
        isOpen={isBidsModalOpen}
        onClose={() => {
          setIsBidsModalOpen(false);
          setSelectedBidsShiftId(null);
        }}
        selectedShiftId={selectedBidsShiftId}
        onSelectShiftId={(newShiftId) => setSelectedBidsShiftId(newShiftId || null)}
      />

      {/* Emergency Broadcast & Live Monitor Modal */}
      <EmergencyBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        adminName={adminName}
        adminBadge={adminBadge}
      />
    </main>
  );
};


