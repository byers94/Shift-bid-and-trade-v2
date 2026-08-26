import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { formatTimestamp } from '../../utils/time';
import { Terminal, Shield, Sparkles, Filter, RefreshCw } from 'lucide-react';

interface LiveAuditTerminalProps {
  className?: string;
  maxHeight?: string;
  isEmbedded?: boolean;
}

export const LiveAuditTerminal: React.FC<LiveAuditTerminalProps> = ({
  className = '',
  maxHeight,
  isEmbedded = false
}) => {
  const { auditLogs, resetToDefaults } = useShiftOps();
  const [filterCategory, setFilterCategory] = useState<'all' | 'shift' | 'trade' | 'swap'>('all');

  const filteredLogs = auditLogs.filter((log) => {
    if (filterCategory === 'all') return true;
    return log.category === filterCategory;
  });

  return (
    <div 
      id="live-audit-terminal-container"
      className={`bg-[#141d33] dark:bg-slate-950 text-white p-3.5 sm:p-4 lg:p-5 rounded-xl shadow-lg border border-slate-800 flex flex-col overflow-hidden ${
        maxHeight ? maxHeight : isEmbedded ? 'h-[240px] sm:h-[280px]' : 'min-h-[300px] sm:min-h-[400px] flex-1'
      } ${className}`}
    >
      {/* Terminal Header with responsive flex wrapping */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-3 pb-2.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <Terminal className="w-4 h-4 text-blue-400 shrink-0" />
          <h2 className="text-[11px] sm:text-xs font-black text-blue-300 uppercase tracking-widest">
            Live Operational Audit Trail
          </h2>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded hidden sm:inline">
            {filteredLogs.length} events
          </span>
        </div>

        {/* Category Filters and Reset Data action */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
          {/* Category filter pills */}
          <div className="flex items-center gap-1 text-[10px] font-mono bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              id="terminal-filter-all"
              onClick={() => setFilterCategory('all')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                filterCategory === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL ({auditLogs.length})
            </button>
            <button
              type="button"
              id="terminal-filter-shifts"
              onClick={() => setFilterCategory('shift')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                filterCategory === 'shift' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              SHIFTS
            </button>
            <button
              type="button"
              id="terminal-filter-swaps"
              onClick={() => setFilterCategory('swap')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                filterCategory === 'swap' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              SWAPS
            </button>
          </div>

          <button
            type="button"
            id="terminal-reset-data-btn"
            onClick={resetToDefaults}
            title="Reset system to clean demo state"
            className="text-[10px] font-mono text-slate-400 hover:text-blue-300 flex items-center gap-1 bg-slate-850 hover:bg-slate-800 border border-slate-700/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Log List with responsive layout per entry */}
      <div className="flex-1 overflow-y-auto text-xs font-mono flex flex-col gap-1.5 opacity-90 pr-1 select-text">
        {filteredLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-8 text-center">
            <Terminal className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-xs">No audit records match the category filter.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            let textClass = 'text-slate-300';
            let dotColor = 'bg-blue-400';
            if (log.status === 'success') {
              textClass = 'text-emerald-400';
              dotColor = 'bg-emerald-400';
            } else if (log.status === 'danger') {
              textClass = 'text-red-400 font-semibold';
              dotColor = 'bg-red-400';
            } else if (log.status === 'warning') {
              textClass = 'text-amber-300';
              dotColor = 'bg-amber-400';
            }

            return (
              <div 
                key={log.id} 
                className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2.5 hover:bg-slate-800/40 p-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-800/80"
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                  <span className="text-blue-400 font-bold text-[10px] sm:text-xs">
                    [{formatTimestamp(log.timestamp)}]
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                    log.category === 'shift'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                      : log.category === 'swap'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {log.category}
                  </span>
                </div>
                <span className={`flex-1 break-words leading-relaxed text-[11px] sm:text-xs ${textClass}`}>
                  {log.details}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
