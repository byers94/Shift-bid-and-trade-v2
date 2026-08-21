import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { formatTimestamp } from '../../utils/time';
import { Terminal, Shield, Sparkles, Filter, RefreshCw } from 'lucide-react';

export const LiveAuditTerminal: React.FC = () => {
  const { auditLogs, resetToDefaults } = useShiftOps();
  const [filterCategory, setFilterCategory] = useState<'all' | 'shift' | 'trade' | 'swap'>('all');

  const filteredLogs = auditLogs.filter((log) => {
    if (filterCategory === 'all') return true;
    return log.category === filterCategory;
  });

  return (
    <div className="bg-[#141d33] text-white p-4 rounded-xl shadow-lg border border-slate-800 flex flex-col h-[200px] shrink-0 overflow-hidden">
      {/* Terminal Header */}
      <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <h2 className="text-[10px] font-black text-blue-300 uppercase tracking-widest">
            Live Operational Audit Trail
          </h2>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>

        <div className="flex items-center gap-2">
          {/* Category filter */}
          <div className="flex gap-1 text-[10px] font-mono">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-1.5 py-0.5 rounded ${
                filterCategory === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterCategory('shift')}
              className={`px-1.5 py-0.5 rounded ${
                filterCategory === 'shift' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              SHIFTS
            </button>
            <button
              onClick={() => setFilterCategory('swap')}
              className={`px-1.5 py-0.5 rounded ${
                filterCategory === 'swap' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              SWAPS
            </button>
          </div>

          <button
            onClick={resetToDefaults}
            title="Reset system to clean demo state"
            className="text-[10px] font-mono text-slate-400 hover:text-blue-300 flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Reset Data
          </button>
        </div>
      </div>

      {/* Terminal Output Log List */}
      <div className="flex-1 overflow-y-auto text-[11px] font-mono flex flex-col gap-1.5 opacity-90 pr-1">
        {filteredLogs.map((log) => {
          let textClass = 'text-slate-300';
          if (log.status === 'success') textClass = 'text-emerald-400';
          else if (log.status === 'danger') textClass = 'text-red-400 font-semibold';
          else if (log.status === 'warning') textClass = 'text-amber-300';

          return (
            <div key={log.id} className="flex items-start gap-2 hover:bg-slate-800/40 p-0.5 rounded transition-colors">
              <span className="text-blue-400 font-bold shrink-0">
                [{formatTimestamp(log.timestamp)}]
              </span>
              <span className={`shrink-0 text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                log.category === 'shift'
                  ? 'bg-blue-950 text-blue-300'
                  : log.category === 'swap'
                  ? 'bg-purple-950 text-purple-300'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {log.category}
              </span>
              <span className={`flex-1 break-words ${textClass}`}>
                {log.details}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
