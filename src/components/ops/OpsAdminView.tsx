import React from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { ShiftManager } from './ShiftManager';
import { TradeApprovals } from './TradeApprovals';
import { LiveAuditTerminal } from './LiveAuditTerminal';
import { 
  ShieldCheck, 
  Activity, 
  Layers, 
  FileText, 
  AlertCircle,
  Bell
} from 'lucide-react';

export const OpsAdminView: React.FC = () => {
  const { shifts, trades } = useShiftOps();

  const activeShiftsCount = shifts.filter((s) => s.status === 'open').length;
  const pendingSwapsCount = trades.filter((t) => t.status === 'pending_swap').length;
  const pendingPostsCount = trades.filter((t) => t.status === 'pending_approval').length;
  const emergencyCount = shifts.filter((s) => s.status === 'open' && s.urgency === 'emergency').length;

  return (
    <main 
      id="ops-admin-container"
      className="flex-1 flex flex-col overflow-hidden bg-slate-100 h-full"
    >
      {/* Header matching High Density theme */}
      <header className="bg-[#1e3a8a] text-white p-5 lg:p-6 flex flex-wrap justify-between items-center shadow-md shrink-0 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-300" />
            <h1 className="text-lg lg:text-xl font-extrabold tracking-tight uppercase">
              Ops Admin Dashboard
            </h1>
          </div>
          <p className="text-[10px] lg:text-xs text-blue-200 uppercase tracking-widest font-semibold mt-0.5">
            Shift & Trade Command Center
          </p>
        </div>

        {/* Real-time Metric Indicators */}
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="text-right">
            <p className="text-[9px] lg:text-[10px] text-blue-200 uppercase font-semibold">Active Shifts</p>
            <p className="text-lg lg:text-xl font-black font-mono">
              {activeShiftsCount} <span className="text-xs font-normal text-blue-200 font-sans">Open</span>
            </p>
          </div>

          <div className="w-px bg-white/20 h-9"></div>

          <div className="text-right">
            <p className="text-[9px] lg:text-[10px] text-blue-200 uppercase font-semibold">Pending Swaps</p>
            <p className="text-lg lg:text-xl font-black font-mono text-amber-400">
              {pendingSwapsCount.toString().padStart(2, '0')}
            </p>
          </div>

          <div className="w-px bg-white/20 h-9"></div>

          <div className="text-right">
            <p className="text-[9px] lg:text-[10px] text-blue-200 uppercase font-semibold">Listing Reqs</p>
            <p className="text-lg lg:text-xl font-black font-mono text-blue-100">
              {pendingPostsCount.toString().padStart(2, '0')}
            </p>
          </div>

          {emergencyCount > 0 && (
            <>
              <div className="w-px bg-white/20 h-9"></div>
              <div className="text-right bg-red-950/60 border border-red-500/40 px-2.5 py-1 rounded-lg">
                <p className="text-[9px] text-red-200 uppercase font-bold flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                  Emergency
                </p>
                <p className="text-base font-black font-mono text-red-300">
                  {emergencyCount} Shifts
                </p>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main 2-Column Split Dashboard */}
      <div className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 overflow-hidden">
        {/* Left Column: Shift Creation & Active Shifts Feed */}
        <section className="flex flex-col gap-4 overflow-hidden h-full">
          <ShiftManager />
        </section>

        {/* Right Column: Pending Swaps/Trades & Live Terminal */}
        <section className="flex flex-col gap-4 overflow-hidden h-full">
          <TradeApprovals />
          <LiveAuditTerminal />
        </section>
      </div>
    </main>
  );
};
