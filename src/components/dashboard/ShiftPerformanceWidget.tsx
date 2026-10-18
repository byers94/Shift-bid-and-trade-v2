import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  CartesianGrid
} from 'recharts';
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  DollarSign,
  Lock,
  Percent,
  Wallet
} from 'lucide-react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { calculateShiftLaborCost } from '../../utils/scheduling';

export interface GuardShiftPerformanceRecord {
  guardId: string;
  guardName: string;
  shortName: string;
  badgeNumber: string;
  role: 'Officer' | 'Rover/MPU' | 'Supervisor' | 'Dedicated';
  actualHours: number;
  budgetedHours: number;
  assignedSite: string;
  hourlyBillRate?: number;
  hourlyPayRate?: number;
  overtimeRateMultiplier?: number;
  billedRevenue?: number;
  regularLaborCost?: number;
  overtimeLaborCost?: number;
  totalLaborCost?: number;
  netProfit?: number;
  netMarginPct?: number;
}

export interface ShiftPerformanceWidgetProps {
  /** Optional custom dataset; falls back to realistic 7-day field roster */
  data?: GuardShiftPerformanceRecord[];
  /** Active 7-day schedule period label */
  periodLabel?: string;
  /** Additional container class names */
  className?: string;
}

export const INITIAL_GUARD_PERFORMANCE_DATA: GuardShiftPerformanceRecord[] = [
  {
    guardId: 'guard-101',
    guardName: 'Sarah Jenkins',
    shortName: 'S. Jenkins',
    badgeNumber: 'SEC-5520',
    role: 'Dedicated',
    actualHours: 44.5,
    budgetedHours: 40.0,
    assignedSite: 'Port Authority - Pier 7'
  },
  {
    guardId: 'guard-102',
    guardName: 'Alex Rivera',
    shortName: 'A. Rivera',
    badgeNumber: 'SEC-8831',
    role: 'Officer',
    actualHours: 38.0,
    budgetedHours: 40.0,
    assignedSite: 'Corporate HQ - Main Tower'
  },
  {
    guardId: 'guard-103',
    guardName: 'Marcus Wright',
    shortName: 'M. Wright',
    badgeNumber: 'SEC-9942',
    role: 'Rover/MPU',
    actualHours: 46.0,
    budgetedHours: 40.0,
    assignedSite: 'Metro Sector Circuit'
  },
  {
    guardId: 'guard-104',
    guardName: 'Elena Rostova',
    shortName: 'E. Rostova',
    badgeNumber: 'SEC-4199',
    role: 'Supervisor',
    actualHours: 41.5,
    budgetedHours: 40.0,
    assignedSite: 'Tech Campus North'
  },
  {
    guardId: 'guard-105',
    guardName: 'David Silva',
    shortName: 'D. Silva',
    badgeNumber: 'SEC-7712',
    role: 'Dedicated',
    actualHours: 36.0,
    budgetedHours: 32.0,
    assignedSite: 'West Medical Center ER'
  },
  {
    guardId: 'guard-106',
    guardName: 'Devon Brooks',
    shortName: 'D. Brooks',
    badgeNumber: 'SEC-6104',
    role: 'Officer',
    actualHours: 32.0,
    budgetedHours: 32.0,
    assignedSite: 'Retail Plaza Concourse'
  },
  {
    guardId: 'guard-107',
    guardName: 'Tariq Vance',
    shortName: 'T. Vance',
    badgeNumber: 'SEC-3088',
    role: 'Rover/MPU',
    actualHours: 24.5,
    budgetedHours: 32.0,
    assignedSite: 'North West Sector'
  },
  {
    guardId: 'guard-108',
    guardName: 'Hannah Chen',
    shortName: 'H. Chen',
    badgeNumber: 'SEC-5190',
    role: 'Officer',
    actualHours: 39.5,
    budgetedHours: 40.0,
    assignedSite: 'City Airport Gate 4'
  }
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const formatCurrency = (val: number) =>
  val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const CustomShiftTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const record: GuardShiftPerformanceRecord = payload[0].payload;
  const regularHours = Math.min(40.0, record.actualHours);
  const overtimeHours = Math.max(0.0, Number((record.actualHours - 40.0).toFixed(1)));
  const netVariance = Number((record.actualHours - record.budgetedHours).toFixed(1));
  const isOverRisk = record.actualHours > 40.0 || record.actualHours > record.budgetedHours;

  return (
    <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs text-slate-100 min-w-[230px] backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div>
          <p className="font-black text-white text-sm">{record.guardName}</p>
          <span className="text-[10px] font-mono text-slate-400">
            {record.badgeNumber} • {record.role}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
            isOverRisk
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
          }`}
        >
          {isOverRisk ? 'OT / Cap Alert' : 'Within Cap'}
        </span>
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Assigned Post:</span>
          <span className="text-slate-200 font-sans font-semibold truncate max-w-[130px]">
            {record.assignedSite}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Regular Hours:</span>
          <span className="text-cyan-400 font-bold">{regularHours.toFixed(1)} hrs</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Overtime Hours (&gt;40h):</span>
          <span className={overtimeHours > 0 ? 'text-rose-400 font-black' : 'text-slate-400'}>
            {overtimeHours > 0 ? `+${overtimeHours.toFixed(1)} hrs` : '0.0 hrs'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Weekly Budget Cap:</span>
          <span className="text-slate-300 font-bold">{record.budgetedHours.toFixed(1)} hrs</span>
        </div>

        <div className="pt-1.5 mt-1.5 border-t border-slate-800 flex items-center justify-between">
          <span className="text-slate-300 font-sans font-bold">Net Budget Variance:</span>
          <span
            className={`font-black ${
              netVariance > 0
                ? 'text-rose-400'
                : netVariance < 0
                ? 'text-emerald-400'
                : 'text-slate-300'
            }`}
          >
            {netVariance > 0 ? `+${netVariance.toFixed(1)} hrs` : `${netVariance.toFixed(1)} hrs`}
          </span>
        </div>
      </div>
    </div>
  );
};

const CustomPnLTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  const record: GuardShiftPerformanceRecord = payload[0].payload;
  const billRate = record.hourlyBillRate ?? 38.0;
  const payRate = record.hourlyPayRate ?? 22.0;
  const otMultiplier = record.overtimeRateMultiplier ?? 1.5;
  const billedTotal = record.billedRevenue ?? Number((record.actualHours * billRate).toFixed(2));
  const laborBurden = record.totalLaborCost ?? 0;
  const overtimeCost = record.overtimeLaborCost ?? 0;
  const netProfit = record.netProfit ?? Number((billedTotal - laborBurden).toFixed(2));
  const netMarginPct = record.netMarginPct ?? (billedTotal > 0 ? Number(((netProfit / billedTotal) * 100).toFixed(1)) : 0);

  return (
    <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs text-slate-100 min-w-[255px] backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div>
          <p className="font-black text-white text-sm">{record.guardName}</p>
          <span className="text-[10px] font-mono text-slate-400">
            {record.badgeNumber} • {record.assignedSite}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
            netMarginPct >= 30
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : netMarginPct >= 15
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}
        >
          {netMarginPct.toFixed(1)}% Margin
        </span>
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Billed Rate:</span>
          <span className="text-emerald-400 font-bold">${billRate.toFixed(2)}/hr</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Guard Pay Rate:</span>
          <span className="text-amber-300 font-bold">
            ${payRate.toFixed(2)}/hr <span className="text-[10px] text-slate-500">({otMultiplier}x OT)</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Billed Total ({record.actualHours.toFixed(1)}h):</span>
          <span className="text-emerald-400 font-black">${formatCurrency(billedTotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Total Labor Burden:</span>
          <span className={overtimeCost > 0 ? 'text-rose-400 font-black' : 'text-amber-400 font-bold'}>
            ${formatCurrency(laborBurden)}
          </span>
        </div>

        <div className="pt-1.5 mt-1.5 border-t border-slate-800 flex items-center justify-between">
          <span className="text-slate-300 font-sans font-bold">Net Profit Margin:</span>
          <span
            className={`font-black ${
              netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netProfit >= 0 ? `+$${formatCurrency(netProfit)}` : `-$${formatCurrency(Math.abs(netProfit))}`}{' '}
            ({netMarginPct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
};

export const ShiftPerformanceWidget: React.FC<ShiftPerformanceWidgetProps> = ({
  data = INITIAL_GUARD_PERFORMANCE_DATA,
  periodLabel = 'Oct 11 – Oct 17, 2026 (Active 7-Day Cycle)',
  className = ''
}) => {
  const { guardsList, sitesList, adminUsers } = useShiftOps();
  const [viewMode, setViewMode] = useState<'HOURS' | 'PNL'>('HOURS');
  const [filterMode, setFilterMode] = useState<'all' | 'overtime_only'>('all');
  const [adminAuthTick, setAdminAuthTick] = useState<number>(0);

  useEffect(() => {
    const handleAuthCheck = () => setAdminAuthTick((t) => t + 1);
    const handleDocumentClick = () => {
      setTimeout(handleAuthCheck, 50);
    };
    window.addEventListener('storage', handleAuthCheck);
    document.addEventListener('click', handleDocumentClick);
    return () => {
      window.removeEventListener('storage', handleAuthCheck);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const currentUser = useMemo(() => {
    try {
      const isAuthenticated = localStorage.getItem('secureshift_admin_session_v1') === 'true';
      if (!isAuthenticated) return null;

      const rawUser = localStorage.getItem('secureshift_admin_user_v1');
      const parsed = rawUser ? JSON.parse(rawUser) : null;

      const matchedAdmin = parsed
        ? adminUsers.find(
            (u) =>
              (parsed.id && u.id === parsed.id) ||
              (parsed.badgeId && u.badgeId === parsed.badgeId) ||
              (parsed.name && u.name === parsed.name)
          )
        : adminUsers[0];

      const rawRole = String(matchedAdmin?.role || parsed?.role || parsed?.accessRole || '').trim();
      const upperRole = rawRole.toUpperCase();

      if (
        rawRole === 'commander' ||
        upperRole === 'COMMANDER' ||
        upperRole === 'OPERATIONS COMMANDER' ||
        rawRole === 'Operations Commander (Full System Access)' ||
        parsed?.roleId === 'OPS-CMD'
      ) {
        if (!matchedAdmin || matchedAdmin.role === 'commander') {
          return {
            ...parsed,
            accessRole: 'Operations Commander (Full System Access)',
            role: 'COMMANDER',
            roleId: 'OPS-CMD'
          };
        }
      }

      if (matchedAdmin?.role === 'supervisor' || upperRole.includes('SUPERVISOR') || upperRole === 'WATCH COMMANDER') {
        return {
          ...parsed,
          accessRole: 'Watch Supervisor (Shift & Swap Approvals)',
          role: 'SUPERVISOR',
          roleId: 'OPS-SUP'
        };
      }

      if (matchedAdmin?.role === 'lead' || upperRole === 'SHIFT_LEAD' || upperRole === 'SHIFT LEAD') {
        return {
          ...parsed,
          accessRole: 'Shift Lead (On-Duty Management)',
          role: 'SHIFT_LEAD',
          roleId: 'OPS-LEAD'
        };
      }

      return {
        ...parsed,
        accessRole: 'Dispatcher (Daily Scheduling & Bids)',
        role: 'DISPATCHER',
        roleId: 'OPS-DISP'
      };
    } catch {
      return null;
    }
  }, [adminUsers, adminAuthTick]);

  const canViewCompensation =
    currentUser?.accessRole === 'Operations Commander (Full System Access)' ||
    currentUser?.role === 'COMMANDER' ||
    currentUser?.roleId === 'OPS-CMD';

  const activeViewMode = canViewCompensation ? viewMode : 'HOURS';

  // Enrich dataset with dynamic Site Bill Rate, Guard Pay Rate, and Labor Cost calculations
  const enrichedData = useMemo(() => {
    return data.map((item) => {
      const matchedGuard = guardsList.find(
        (g) =>
          g.id === item.guardId ||
          g.badgeNumber.toLowerCase() === item.badgeNumber.toLowerCase() ||
          g.name.toLowerCase() === item.guardName.toLowerCase()
      );

      const siteNorm = item.assignedSite.toLowerCase();
      const matchedSite = sitesList.find((s) => {
        const nameLower = s.name.toLowerCase();
        const baseNameLower = nameLower.split(' - ')[0].trim();
        return (
          nameLower === siteNorm ||
          nameLower.includes(siteNorm) ||
          siteNorm.includes(baseNameLower)
        );
      });

      const hourlyBillRate = item.hourlyBillRate ?? matchedSite?.hourlyBillRate ?? 38.0;
      const hourlyPayRate = item.hourlyPayRate ?? matchedGuard?.hourlyPayRate ?? 22.0;
      const overtimeRateMultiplier = item.overtimeRateMultiplier ?? matchedGuard?.overtimeRateMultiplier ?? 1.5;

      const laborBreakdown = calculateShiftLaborCost(
        item.actualHours,
        hourlyPayRate,
        overtimeRateMultiplier
      );

      const billedRevenue = Number((item.actualHours * hourlyBillRate).toFixed(2));
      const totalLaborCost = laborBreakdown.totalCost;
      const netProfit = Number((billedRevenue - totalLaborCost).toFixed(2));
      const netMarginPct = billedRevenue > 0 ? Number(((netProfit / billedRevenue) * 100).toFixed(1)) : 0;

      return {
        ...item,
        hourlyBillRate,
        hourlyPayRate,
        overtimeRateMultiplier,
        billedRevenue,
        regularLaborCost: laborBreakdown.regularCost,
        overtimeLaborCost: laborBreakdown.overtimeCost,
        totalLaborCost,
        netProfit,
        netMarginPct
      };
    });
  }, [data, guardsList, sitesList]);

  // Compute aggregate summary metrics
  const summaryStats = useMemo(() => {
    const totalActual = enrichedData.reduce((sum, item) => sum + item.actualHours, 0);
    const totalBudgeted = enrichedData.reduce((sum, item) => sum + item.budgetedHours, 0);
    const overtimeRiskGuards = enrichedData.filter(
      (item) => item.actualHours > 40.0 || item.actualHours > item.budgetedHours
    );
    const totalOvertimeHours = enrichedData.reduce(
      (sum, item) => sum + Math.max(0, item.actualHours - 40.0),
      0
    );

    const totalBilledRevenue = enrichedData.reduce((sum, item) => sum + (item.billedRevenue ?? 0), 0);
    const totalDirectLaborCost = enrichedData.reduce((sum, item) => sum + (item.totalLaborCost ?? 0), 0);
    const grossProfit = totalBilledRevenue - totalDirectLaborCost;
    const grossMarginPct = totalBilledRevenue > 0 ? (grossProfit / totalBilledRevenue) * 100 : 0;

    return {
      totalActual: Number(totalActual.toFixed(1)),
      totalBudgeted: Number(totalBudgeted.toFixed(1)),
      overtimeRiskCount: overtimeRiskGuards.length,
      totalOvertimeHours: Number(totalOvertimeHours.toFixed(1)),
      utilizationPct: totalBudgeted > 0 ? Math.round((totalActual / totalBudgeted) * 100) : 100,
      totalBilledRevenue: Number(totalBilledRevenue.toFixed(2)),
      totalDirectLaborCost: Number(totalDirectLaborCost.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossMarginPct: Number(grossMarginPct.toFixed(1))
    };
  }, [enrichedData]);

  const filteredData = useMemo(() => {
    if (filterMode === 'overtime_only') {
      return enrichedData.filter((d) => d.actualHours > 40.0 || d.actualHours > d.budgetedHours);
    }
    return enrichedData;
  }, [enrichedData, filterMode]);

  return (
    <div
      id="shift-performance-summary-widget"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-lg space-y-5 ${className}`}
    >
      {/* Top Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white tracking-tight">
                Shift Performance &amp; Overtime Budget Summary
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-cyan-300 border border-slate-700">
                {activeViewMode === 'PNL'
                  ? `${summaryStats.grossMarginPct.toFixed(1)}% Gross Margin`
                  : `${summaryStats.utilizationPct}% Budget Utilized`}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{periodLabel}</span>
            </p>
          </div>
        </div>

        {/* Controls: Segmented View Switcher + Filter Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Segmented View Switcher: [ Operational Hours | Financial PnL ] */}
          <div
            id="widget-view-mode-switcher"
            className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800"
          >
            <button
              id="widget-view-hours-btn"
              type="button"
              onClick={() => setViewMode('HOURS')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'HOURS'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Operational Hours</span>
            </button>
            <button
              id="widget-view-pnl-btn"
              type="button"
              disabled={!canViewCompensation}
              onClick={() => {
                if (canViewCompensation) setViewMode('PNL');
              }}
              title={
                canViewCompensation
                  ? 'Switch to Financial PnL (Gross Profit & Margin)'
                  : 'Restricted: Operations Commander clearance required'
              }
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${
                !canViewCompensation
                  ? 'text-slate-600 cursor-not-allowed opacity-65'
                  : activeViewMode === 'PNL'
                  ? 'bg-emerald-600 text-white shadow-xs cursor-pointer'
                  : 'text-emerald-400 hover:text-emerald-300 cursor-pointer'
              }`}
            >
              {canViewCompensation ? (
                <DollarSign className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3 text-slate-500" />
              )}
              <span>Financial PnL</span>
            </button>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Officers ({data.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('overtime_only')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                filterMode === 'overtime_only'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>OT Risk ({summaryStats.overtimeRiskCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Row Summary Cards: Operational Hours vs Financial PnL */}
      {activeViewMode === 'PNL' ? (
        <div id="pnl-metric-summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Billed Client Revenue ($) */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Total Billed Client Revenue
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black font-mono text-emerald-400">
                  ${formatCurrency(summaryStats.totalBilledRevenue)}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {summaryStats.totalActual.toFixed(1)}h billed across active sites
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Total Direct Labor Cost ($) */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Total Direct Labor Cost
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black font-mono text-amber-400">
                  ${formatCurrency(summaryStats.totalDirectLaborCost)}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Includes {summaryStats.totalOvertimeHours.toFixed(1)}h overtime burden
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Gross Profit ($) */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Gross Profit
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className={`text-xl font-black font-mono ${
                    summaryStats.grossProfit >= 0 ? 'text-cyan-400' : 'text-rose-400'
                  }`}
                >
                  ${formatCurrency(summaryStats.grossProfit)}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Billed Revenue minus Direct Labor
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {/* Card 4: Gross Margin (%) */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              summaryStats.grossMarginPct >= 30
                ? 'bg-emerald-950/25 border-emerald-500/40'
                : summaryStats.grossMarginPct >= 15
                ? 'bg-amber-950/25 border-amber-500/40'
                : 'bg-rose-950/25 border-rose-500/40'
            }`}
          >
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 block">
                Gross Margin
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black font-mono text-emerald-400">
                  {summaryStats.grossMarginPct.toFixed(1)}%
                </span>
                <span className="text-xs font-semibold text-emerald-200">Net SLA Spread</span>
              </div>
              <span className="text-[11px] text-emerald-300/80 block mt-0.5">
                (Gross Profit / Billed Revenue)
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
        </div>
      ) : (
        /* 3 Header Summary Pills (Operational Hours) */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Pill 1: Total Team Hours Logged */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Total Team Hours Logged
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black font-mono text-cyan-400">
                  {summaryStats.totalActual.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-400">hrs</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Across {data.length} active field officers
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          {/* Pill 2: Projected Weekly Budgeted Hours */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Projected Weekly Budget
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black font-mono text-white">
                  {summaryStats.totalBudgeted.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-400">hrs</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Net delta:{' '}
                <strong
                  className={
                    summaryStats.totalActual > summaryStats.totalBudgeted
                      ? 'text-rose-400 font-mono'
                      : 'text-emerald-400 font-mono'
                  }
                >
                  {summaryStats.totalActual > summaryStats.totalBudgeted ? '+' : ''}
                  {(summaryStats.totalActual - summaryStats.totalBudgeted).toFixed(1)}h
                </strong>
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Users className="w-4 h-4" />
            </div>
          </div>

          {/* Pill 3: Overtime Risk Count */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              summaryStats.overtimeRiskCount > 0
                ? 'bg-rose-950/25 border-rose-500/40'
                : 'bg-emerald-950/25 border-emerald-500/40'
            }`}
          >
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-300 block">
                Overtime Risk Count
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black font-mono text-rose-400">
                  {summaryStats.overtimeRiskCount}
                </span>
                <span className="text-xs font-semibold text-rose-200">
                  {summaryStats.overtimeRiskCount === 1 ? 'Officer' : 'Officers'}
                </span>
              </div>
              <span className="text-[11px] text-rose-300/80 block mt-0.5">
                {summaryStats.totalOvertimeHours.toFixed(1)}h above 40.0h threshold
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-950 border border-rose-500/50 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Recharts Container */}
      <div className="pt-2">
        {activeViewMode === 'PNL' ? (
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#10b981] inline-block" />
                <span>Billed Revenue ($)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#f59e0b] inline-block" />
                <span>Guard Labor Cost (Standard)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#f43f5e] inline-block" />
                <span>Guard Labor Cost (Includes OT)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] inline-block" />
                <span>Net Margin (%)</span>
              </span>
            </div>
            <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
              <span>• Commander Financial PnL View</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#06b6d4] inline-block" />
                <span>Actual Hours (Normal &le; Budget &amp; 40h)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#f43f5e] inline-block" />
                <span>Actual Hours (OT / Exceeds Cap)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#475569] inline-block" />
                <span>Budgeted Hours</span>
              </span>
            </div>
            <span className="font-mono text-[11px] text-amber-400 flex items-center gap-1">
              <span>--- 40.0h FLSA Overtime Cap</span>
            </span>
          </div>
        )}

        <div className="w-full h-[300px] bg-slate-950/50 rounded-xl border border-slate-800/80 p-3">
          <ResponsiveContainer width="100%" height="100%">
            {activeViewMode === 'PNL' ? (
              <ComposedChart
                data={filteredData}
                margin={{ top: 16, right: 8, left: 0, bottom: 5 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="shortName"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(val) => `$${val}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#38bdf8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  content={<CustomPnLTooltip />}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="billedRevenue"
                  name="Billed Revenue ($)"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  yAxisId="left"
                  dataKey="totalLaborCost"
                  name="Guard Labor Cost ($)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                >
                  {filteredData.map((entry) => {
                    const hasOvertime = (entry.overtimeLaborCost ?? 0) > 0;
                    return (
                      <Cell
                        key={`pnl-labor-cell-${entry.guardId}`}
                        fill={hasOvertime ? '#f43f5e' : '#f59e0b'}
                      />
                    );
                  })}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="netMarginPct"
                  name="Net Margin %"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </ComposedChart>
            ) : (
              <BarChart
                data={filteredData}
                margin={{ top: 16, right: 16, left: -10, bottom: 5 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="shortName"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  unit="h"
                  domain={[0, 52]}
                />
                <Tooltip
                  content={<CustomShiftTooltip />}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                />
                <ReferenceLine
                  y={40}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: '40.0h OT Cap',
                    position: 'insideTopRight',
                    fill: '#fbbf24',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                />
                <Bar
                  dataKey="budgetedHours"
                  name="Budgeted Hours"
                  fill="#475569"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="actualHours"
                  name="Actual Hours"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                >
                  {filteredData.map((entry) => {
                    const isOver =
                      entry.actualHours > 40.0 || entry.actualHours > entry.budgetedHours;
                    return (
                      <Cell
                        key={`cell-${entry.guardId}`}
                        fill={isOver ? '#f43f5e' : '#06b6d4'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ShiftPerformanceWidget;
