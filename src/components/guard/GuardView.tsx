import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { OpenShiftBoard } from './OpenShiftBoard';
import { TradeBoard } from './TradeBoard';
import { 
  Shield, 
  UserCheck, 
  ChevronDown, 
  Smartphone,
  PhoneCall,
  Bell
} from 'lucide-react';

interface GuardViewProps {
  isSidebarMode?: boolean;
}

export const GuardView: React.FC<GuardViewProps> = ({ isSidebarMode = true }) => {
  const { activeGuard, guardsList, setActiveGuard, shifts, trades, opsPhone } = useShiftOps();
  const [activeTab, setActiveTab] = useState<'open_board' | 'trade_board'>('open_board');
  const [showGuardMenu, setShowGuardMenu] = useState(false);

  const openShiftsCount = shifts.filter((s) => s.status === 'open').length;
  const activeTradesCount = trades.filter((t) => t.status === 'active' || t.status === 'pending_swap').length;

  return (
    <aside 
      id="guard-view-container"
      className={`bg-white border-r border-slate-300 flex flex-col shadow-xl h-full overflow-hidden ${
        isSidebarMode ? 'w-full md:w-[380px] lg:w-[410px] shrink-0' : 'w-full max-w-2xl mx-auto border-x'
      }`}
    >
      {/* Navy Blue Header matching High Density theme */}
      <header className="bg-[#1e3a8a] text-white p-5 flex flex-col gap-3 shadow-md shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-300" />
              <h1 className="text-lg font-black tracking-tight uppercase">Guard View</h1>
            </div>
            <p className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold mt-0.5">
              SecureShift Mobile Interface
            </p>
          </div>

          {/* Ops Dispatcher phone pill */}
          <div className="bg-blue-950/70 border border-blue-400/30 px-2 py-1 rounded text-right">
            <span className="text-[9px] text-blue-300 block uppercase font-mono">Ops Dispatch</span>
            <span className="text-[11px] font-bold text-white font-mono">{opsPhone}</span>
          </div>
        </div>

        {/* Guard Profile Switcher Selector */}
        <div className="relative">
          <button
            id="guard-profile-switcher-btn"
            onClick={() => setShowGuardMenu(!showGuardMenu)}
            className="w-full bg-blue-900/80 hover:bg-blue-900 border border-blue-700/60 rounded-lg px-3 py-2 text-left flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border border-blue-400">
                {activeGuard.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{activeGuard.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-blue-700 rounded text-blue-200 font-mono">
                    {activeGuard.badgeNumber}
                  </span>
                </div>
                <div className="text-[10px] text-blue-300 truncate max-w-[200px]">
                  {activeGuard.ojtSites.length} Verified Sites
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-blue-300" />
          </button>

          {/* Guard Dropdown */}
          {showGuardMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden text-slate-800 animate-in fade-in duration-100">
              <div className="p-2 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                Simulate Logged-In Security Guard:
              </div>
              <div className="max-h-56 overflow-y-auto">
                {guardsList.map((guard) => (
                  <button
                    key={guard.id}
                    onClick={() => {
                      setActiveGuard(guard);
                      setShowGuardMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                      guard.id === activeGuard.id ? 'bg-blue-50 font-bold text-[#1e3a8a]' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{guard.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{guard.badgeNumber} • {guard.phone}</div>
                    </div>
                    {guard.id === activeGuard.id && (
                      <span className="text-[10px] font-bold text-[#1e3a8a] bg-blue-100 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex border-b border-slate-200 bg-white shrink-0">
        <button
          id="guard-tab-open-board"
          onClick={() => setActiveTab('open_board')}
          className={`flex-1 py-3 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
            activeTab === 'open_board'
              ? 'border-b-2 border-[#1e3a8a] text-[#1e3a8a] bg-blue-50/40'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>OPEN BOARD</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
            activeTab === 'open_board' ? 'bg-[#1e3a8a] text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {openShiftsCount}
          </span>
        </button>

        <button
          id="guard-tab-trade-board"
          onClick={() => setActiveTab('trade_board')}
          className={`flex-1 py-3 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
            activeTab === 'trade_board'
              ? 'border-b-2 border-[#1e3a8a] text-[#1e3a8a] bg-blue-50/40'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>TRADE BOARD</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
            activeTab === 'trade_board' ? 'bg-[#1e3a8a] text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {activeTradesCount}
          </span>
        </button>
      </nav>

      {/* Board Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'open_board' ? <OpenShiftBoard /> : <TradeBoard />}
      </div>
    </aside>
  );
};
