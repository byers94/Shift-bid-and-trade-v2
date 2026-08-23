import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ShiftManager } from './ShiftManager';
import { TradeApprovals } from './TradeApprovals';
import { LiveAuditTerminal } from './LiveAuditTerminal';
import { RecentAdminActionsPanel } from './RecentAdminActionsPanel';
import { UserManagementModal } from './UserManagementModal';
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
  PanelRightOpen
} from 'lucide-react';

interface OpsAdminViewProps {
  onLock?: () => void;
  adminName?: string;
  adminBadge?: string;
}

export const OpsAdminView: React.FC<OpsAdminViewProps> = ({ 
  onLock, 
  adminName = "Lt. Mark O'Connor", 
  adminBadge = "OPS-CMD-01" 
}) => {
  const { shifts, trades, recentAdminActions, adminUsers, guardsList } = useShiftOps();
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [userManagementTab, setUserManagementTab] = useState<'admins' | 'guards'>('admins');

  const activeShiftsCount = shifts.filter((s) => s.status === 'open').length;
  const pendingSwapsCount = trades.filter((t) => t.status === 'pending_swap').length;
  const pendingPostsCount = trades.filter((t) => t.status === 'pending_approval').length;
  const emergencyCount = shifts.filter((s) => s.status === 'open' && s.urgency === 'emergency').length;

  return (
    <main 
      id="ops-admin-container"
      className="flex-1 flex flex-col bg-slate-100 h-full overflow-y-auto min-h-0"
    >
      {/* Header matching High Density theme */}
      <header className="bg-[#1e3a8a] text-white p-4 lg:p-5 flex flex-wrap justify-between items-center shadow-md shrink-0 gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-900/80 rounded-lg border border-blue-700">
            <ShieldCheck className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h1 className="text-base lg:text-lg font-extrabold tracking-tight uppercase">
              Ops Admin Dashboard
            </h1>
            <p className="text-[10px] lg:text-xs text-blue-200 uppercase tracking-widest font-semibold">
              Shift & Trade Command Center
            </p>
          </div>
        </div>

        {/* Real-time Metric Indicators & Admin Status */}
        <div className="flex flex-wrap items-center gap-3 lg:gap-4">
          <div className="text-right">
            <p className="text-[9px] text-blue-200 uppercase font-semibold">Active Shifts</p>
            <p className="text-base lg:text-lg font-black font-mono">
              {activeShiftsCount} <span className="text-xs font-normal text-blue-200 font-sans">Open</span>
            </p>
          </div>

          <div className="w-px bg-white/20 h-7"></div>

          <div className="text-right">
            <p className="text-[9px] text-blue-200 uppercase font-semibold">Pending Swaps</p>
            <p className="text-base lg:text-lg font-black font-mono text-amber-400">
              {pendingSwapsCount.toString().padStart(2, '0')}
            </p>
          </div>

          <div className="w-px bg-white/20 h-7"></div>

          <div className="text-right">
            <p className="text-[9px] text-blue-200 uppercase font-semibold">Listing Reqs</p>
            <p className="text-base lg:text-lg font-black font-mono text-blue-100">
              {pendingPostsCount.toString().padStart(2, '0')}
            </p>
          </div>

          {emergencyCount > 0 && (
            <>
              <div className="w-px bg-white/20 h-7"></div>
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

          {/* User & Access Management Button */}
          <button
            id="open-user-management-btn"
            onClick={() => {
              setUserManagementTab('admins');
              setIsUserManagementOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-blue-900 border border-blue-500 hover:bg-blue-800 text-white shadow-xs cursor-pointer"
            title="Manage Dispatchers, Admin PINs, and Guard Site Certifications"
          >
            <Users className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Personnel & Access</span>
            <span className="bg-emerald-400 text-slate-950 text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full">
              {adminUsers.length + guardsList.length}
            </span>
          </button>

          {/* Toggle Recent Actions Panel Button */}
          <button
            id="toggle-recent-actions-panel-btn"
            onClick={() => setShowSidePanel(!showSidePanel)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              showSidePanel 
                ? 'bg-blue-900 border-blue-500 text-white shadow-inner' 
                : 'bg-blue-950/60 border-blue-700/60 text-blue-200 hover:text-white'
            }`}
            title={showSidePanel ? "Hide Recent Admin Actions side panel" : "Show Recent Admin Actions side panel"}
          >
            <History className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Actions Feed</span>
            <span className="bg-[#1e3a8a] text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
              {recentAdminActions.length}
            </span>
          </button>

          {/* Authenticated Dispatcher Badge & Lock Button */}
          <div className="flex items-center gap-2 bg-blue-950/80 border border-blue-700/80 px-2.5 py-1 rounded-xl">
            <div className="text-right">
              <div className="text-[11px] font-bold text-white flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{adminName}</span>
              </div>
              <div className="text-[9px] text-blue-200 font-mono">
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

      {/* Main Multi-Column Dashboard with Fluid Scrolling */}
      <div className="flex-1 p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-12 gap-5 lg:gap-6 min-h-0">
        {/* Left Column: Shift Creation & Active Shifts Feed */}
        <section className={`flex flex-col gap-4 min-h-0 ${showSidePanel ? 'xl:col-span-4' : 'xl:col-span-6'}`}>
          <ShiftManager />
        </section>

        {/* Center Column: Pending Swaps/Trades & Live Terminal */}
        <section className={`flex flex-col gap-4 min-h-0 ${showSidePanel ? 'xl:col-span-5' : 'xl:col-span-6'}`}>
          <TradeApprovals />
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

      {/* User & Access Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        initialTab={userManagementTab}
      />
    </main>
  );
};

