import React, { useState } from 'react';
import { ShiftOpsProvider, useShiftOps } from './context/ShiftOpsContext';
import { GuardView } from './components/guard/GuardView';
import { OpsAdminView } from './components/ops/OpsAdminView';
import { ToastContainer } from './components/common/ToastContainer';
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
  Sparkles
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeView, setActiveView, resetToDefaults } = useShiftOps();
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Top Application Bar with View Mode Switcher */}
      <header className="bg-[#14234b] text-white px-4 py-2 flex flex-wrap justify-between items-center border-b border-blue-900/80 z-30 shrink-0 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 rounded-lg shadow-xs">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider uppercase">
              SecureShift
            </span>
            <span className="text-[10px] text-blue-300 ml-2 hidden sm:inline-block font-mono">
              SECURITY OPERATIONS PLATFORM
            </span>
          </div>
        </div>

        {/* Dual Mode Switcher Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-lg border border-blue-800/40">
          <button
            id="view-mode-dual-btn"
            onClick={() => setActiveView('dual')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'dual'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Split screen: Guard view on left, Ops manager on right"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Dual Split View</span>
            <span className="md:hidden">Dual</span>
          </button>

          <button
            id="view-mode-guard-btn"
            onClick={() => setActiveView('guard')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'guard'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Focus purely on Guard Mobile Interface"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Guard App</span>
          </button>

          <button
            id="view-mode-ops-btn"
            onClick={() => setActiveView('ops')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'ops'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Focus purely on Ops Manager Dashboard"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Ops Admin</span>
          </button>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            id="demo-guide-help-btn"
            onClick={() => setShowHelpModal(true)}
            className="text-xs text-blue-200 hover:text-white flex items-center gap-1 bg-blue-900/60 hover:bg-blue-900 px-2.5 py-1 rounded-md border border-blue-700/50 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Feature Guide</span>
          </button>

          <button
            id="app-reset-defaults-btn"
            onClick={resetToDefaults}
            title="Reset to fresh demo shifts & trades"
            className="p-1 text-blue-300 hover:text-white hover:bg-blue-900 rounded"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden w-full h-full relative">
        {/* DUAL SPLIT VIEW (Side-by-side exactly matching High Density Design) */}
        {activeView === 'dual' && (
          <div className="flex w-full h-full overflow-hidden">
            {/* Guard Sidebar Frame */}
            <GuardView isSidebarMode={true} />
            {/* Ops Command Center Frame */}
            <OpsAdminView />
          </div>
        )}

        {/* FULL GUARD VIEW */}
        {activeView === 'guard' && (
          <div className="flex-1 bg-slate-200/80 p-2 sm:p-6 overflow-y-auto flex items-center justify-center">
            <div className="w-full max-w-md h-[95%] max-h-[850px] shadow-2xl rounded-2xl overflow-hidden border-4 border-slate-700 bg-white flex flex-col">
              <GuardView isSidebarMode={false} />
            </div>
          </div>
        )}

        {/* FULL OPS ADMIN VIEW */}
        {activeView === 'ops' && (
          <div className="flex-1 flex overflow-hidden">
            <OpsAdminView />
          </div>
        )}
      </div>

      {/* Toast Notification Layer */}
      <ToastContainer />

      {/* Feature Guide Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#1e3a8a] text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="font-black text-base uppercase tracking-wide">
                  SecureShift Dual-Sided Feature Guide
                </h3>
                <p className="text-xs text-blue-200">
                  Security Operations Shift Bidding & Trading Architecture
                </p>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-white/80 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs text-slate-700">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                <h4 className="font-bold text-[#1e3a8a] text-sm mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  1. Guard View (User Environment)
                </h4>
                <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600">
                  <li><strong>Open Shift Board:</strong> Scrollable feed with Site Name, Date, Time, Calculated Hours, and Urgency Badges (Emergency vs. Standard).</li>
                  <li><strong>Text to Bid (3-Option Modal):</strong> Tap "Text to Bid" to choose <em>Trained</em>, <em>Needs OJT</em>, or <em>Cancel</em>. Generates pre-filled SMS for mobile dispatch and logs the bid directly into Ops Admin.</li>
                  <li><strong>Trade Board:</strong> Lists shifts other guards are giving away. Guards can tap <em>"+ Post Shift"</em> to submit requests to Ops or <em>"Propose Swap"</em> to offer an exchange with OJT qualification status.</li>
                </ul>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
                  <LayoutDashboard className="w-4 h-4 text-[#1e3a8a]" />
                  2. Ops Admin View (Manager Environment)
                </h4>
                <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600">
                  <li><strong>Shift Manager:</strong> Post single shifts with native time pickers that auto-calculate total hours. Paste JSON shift arrays with the Mass Import tool.</li>
                  <li><strong>Active Shift Feed:</strong> Mark shifts filled (greys card out with assigned guard) or reopen shifts. Toggle "Hide Filled" shifts.</li>
                  <li><strong>Trade Approvals (3 Feeds, Oldest-First):</strong>
                    <ul className="list-circle pl-4 space-y-0.5 mt-1">
                      <li><em>Pending Posts:</em> Approve or Deny guard shift listings with mandatory reason.</li>
                      <li><em>Pending Swaps:</em> Highlighted in <span className="text-red-700 font-bold">RED</span> if Guard B needs OJT training.</li>
                      <li><em>History Log:</em> Permanent audit trail with timestamps for created, bid on, and resolved.</li>
                    </ul>
                  </li>
                  <li><strong>Live Audit Log:</strong> High-density dark command center terminal with real-time operational event stream.</li>
                </ul>
              </div>

              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2.5 bg-[#1e3a8a] text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-blue-900 shadow-md transition-all mt-2"
              >
                Start Exploring
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
