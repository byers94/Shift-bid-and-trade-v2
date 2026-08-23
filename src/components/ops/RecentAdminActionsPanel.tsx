import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { AdminAction, AdminActionType } from '../../types/shift';
import { 
  History, 
  LogIn, 
  Lock, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Trash2, 
  FileSpreadsheet, 
  ShieldCheck, 
  UserCheck, 
  UserPlus,
  Users,
  UserX,
  UserCog,
  Clock, 
  Filter, 
  Search,
  Sparkles,
  ChevronRight,
  Shield,
  MapPin
} from 'lucide-react';

interface RecentAdminActionsPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const RecentAdminActionsPanel: React.FC<RecentAdminActionsPanelProps> = ({
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { recentAdminActions } = useShiftOps();
  const [filterType, setFilterType] = useState<'all' | 'logins' | 'shifts' | 'trades' | 'personnel'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const formatRelativeTime = (isoString: string): string => {
    try {
      const now = Date.now();
      const actionTime = new Date(isoString).getTime();
      const diffSec = Math.floor((now - actionTime) / 1000);

      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  const getActionIcon = (type: AdminActionType) => {
    switch (type) {
      case 'admin_login':
        return <LogIn className="w-3.5 h-3.5 text-emerald-600" />;
      case 'admin_lock':
        return <Lock className="w-3.5 h-3.5 text-slate-500" />;
      case 'user_created':
      case 'guard_created':
        return <UserPlus className="w-3.5 h-3.5 text-blue-600" />;
      case 'user_updated':
      case 'guard_updated':
        return <UserCog className="w-3.5 h-3.5 text-purple-600" />;
      case 'user_deleted':
      case 'guard_deleted':
        return <UserX className="w-3.5 h-3.5 text-rose-600" />;
      case 'shift_created':
        return <PlusCircle className="w-3.5 h-3.5 text-blue-600" />;
      case 'shift_filled':
        return <UserCheck className="w-3.5 h-3.5 text-purple-600" />;
      case 'shift_reopened':
        return <RotateCcw className="w-3.5 h-3.5 text-amber-600" />;
      case 'shift_deleted':
        return <Trash2 className="w-3.5 h-3.5 text-rose-600" />;
      case 'bulk_imported':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />;
      case 'trade_approved':
      case 'swap_approved':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'trade_denied':
      case 'swap_denied':
        return <XCircle className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  const getBadgeStyle = (variant: AdminAction['badgeVariant']) => {
    switch (variant) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'blue':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rose':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'slate':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredActions = recentAdminActions.filter((action) => {
    // Category filtering
    if (filterType === 'logins') {
      if (action.type !== 'admin_login' && action.type !== 'admin_lock') return false;
    } else if (filterType === 'shifts') {
      if (!action.type.startsWith('shift_') && action.type !== 'bulk_imported') return false;
    } else if (filterType === 'trades') {
      if (!action.type.startsWith('trade_') && !action.type.startsWith('swap_')) return false;
    } else if (filterType === 'personnel') {
      if (!action.type.startsWith('user_') && !action.type.startsWith('guard_')) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        action.title.toLowerCase().includes(q) ||
        action.description.toLowerCase().includes(q) ||
        action.adminName.toLowerCase().includes(q) ||
        action.adminBadge.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <aside 
      id="recent-admin-actions-panel"
      className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden h-full"
    >
      {/* Panel Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-blue-900 rounded-lg">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              Recent Admin Actions
              <span className="bg-[#1e3a8a] text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                {recentAdminActions.length}
              </span>
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              Live dispatcher session log
            </p>
          </div>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="text-xs text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200 transition-colors"
            title="Toggle panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-2.5 bg-white border-b border-slate-100 flex flex-col gap-2 shrink-0">
        {/* Category Pills */}
        <div className="flex items-center gap-1">
          <button
            id="admin-actions-filter-all"
            onClick={() => setFilterType('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
              filterType === 'all'
                ? 'bg-[#1e3a8a] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({recentAdminActions.length})
          </button>
          <button
            id="admin-actions-filter-logins"
            onClick={() => setFilterType('logins')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
              filterType === 'logins'
                ? 'bg-[#1e3a8a] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Logins
          </button>
          <button
            id="admin-actions-filter-shifts"
            onClick={() => setFilterType('shifts')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
              filterType === 'shifts'
                ? 'bg-[#1e3a8a] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Shifts
          </button>
          <button
            id="admin-actions-filter-trades"
            onClick={() => setFilterType('trades')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
              filterType === 'trades'
                ? 'bg-[#1e3a8a] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Trades
          </button>
          <button
            id="admin-actions-filter-personnel"
            onClick={() => setFilterType('personnel')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
              filterType === 'personnel'
                ? 'bg-[#1e3a8a] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Users
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Search dispatcher, site, action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]"
          />
        </div>
      </div>

      {/* Action Feed Cards */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 bg-slate-50/40">
        {filteredActions.length === 0 ? (
          <div className="text-center py-8 px-3 bg-white rounded-lg border border-dashed border-slate-200">
            <History className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-600">No Recent Actions Found</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Actions will log automatically as dispatch operations occur.
            </p>
          </div>
        ) : (
          filteredActions.map((action) => (
            <div
              key={action.id}
              id={`admin-action-${action.id}`}
              className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-blue-300 transition-all flex flex-col gap-1.5"
            >
              {/* Card Header: Icon + Title + Time */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="p-1 rounded bg-slate-100 shrink-0">
                    {getActionIcon(action.type)}
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 truncate">
                    {action.title}
                  </h3>
                </div>

                <span className="text-[10px] font-mono text-slate-400 shrink-0 font-medium flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {formatRelativeTime(action.timestamp)}
                </span>
              </div>

              {/* Description */}
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {action.description}
              </p>

              {/* Dispatcher Actor & Badge Footer */}
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100">
                <span className="font-semibold text-slate-700 flex items-center gap-1 truncate">
                  <Shield className="w-3 h-3 text-[#1e3a8a] shrink-0" />
                  {action.adminName}
                </span>

                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold shrink-0 ${getBadgeStyle(action.badgeVariant)}`}>
                  {action.adminBadge}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
