import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine,
  ComposedChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Car, 
  Navigation, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  CalendarRange, 
  Filter, 
  Search, 
  Download, 
  RefreshCw, 
  ChevronRight, 
  ExternalLink, 
  Radio, 
  Gauge, 
  Layers, 
  ArrowUpRight, 
  UserCheck, 
  Zap,
  MapPin,
  Battery,
  Fuel,
  Activity
} from 'lucide-react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { RovingGroup, ROVING_GROUPS, ROVING_GROUP_CONFIGS, ScheduledShift } from '../../types/shift';

export interface MpuPerformanceProps {
  onNavigateToSchedule?: (sector?: string) => void;
  onNavigateToRouting?: (roverId?: string) => void;
  onNavigateToSiteDirectory?: (sector?: string) => void;
  className?: string;
}

type TimeframeOption = 'week' | '14days' | 'month' | 'quarter';
type ChartViewMode = 'composed_fill' | 'daily_trend' | 'shift_windows' | 'hours_capacity';
type FilterStatus = 'all' | 'filled' | 'open';

interface SectorPerformanceMetric {
  sector: RovingGroup;
  code: string;
  name: string;
  zone: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  hexColor: string;
  mpuUnit: string;
  assignedRoverId: string;
  assignedOfficer: string;
  assignedBadge: string;
  phone?: string;
  status: 'patrolling' | 'dwelling' | 'standby';
  batteryPct: number;
  fuelPct: number;
  speedMph: number;
  currentSite: string;
  customerSitesCount: number;
  
  // Shift Coverage & Fill Rate Metrics
  totalRequiredShifts: number;
  filledShifts: number;
  openShifts: number;
  fillRatePct: number;
  contractHours: number;
  deliveredHours: number;
  hoursDeliveryPct: number;
  
  // Shift Window breakdown
  dayRequired: number;
  dayFilled: number;
  dayFillRate: number;
  swingRequired: number;
  swingFilled: number;
  swingFillRate: number;
  graveRequired: number;
  graveFilled: number;
  graveFillRate: number;
  
  // Compliance
  checkpointCompliancePct: number;
  avgDwellMinutes: number;
  statusGrade: 'Optimal' | 'Good' | 'Attention';
}

const SECTOR_HEX_COLORS: Record<RovingGroup, string> = {
  'Metro': '#2563eb', // blue-600
  'North West': '#06b6d4', // cyan-500
  'North East': '#10b981', // emerald-500
  'South West': '#f59e0b', // amber-500
  'South East': '#f43f5e', // rose-500
  'Mobile Metro': '#2563eb',
  'Mobile Northwest': '#06b6d4',
  'Mobile Northeast': '#10b981',
  'Mobile Southwest': '#f59e0b',
  'Mobile Southeast': '#f43f5e'
};

export const MpuPerformance: React.FC<MpuPerformanceProps> = ({
  onNavigateToSchedule,
  onNavigateToRouting,
  onNavigateToSiteDirectory,
  className = ''
}) => {
  const { 
    scheduledShifts, 
    shifts, 
    setSchedules, 
    rovers, 
    sitesList, 
    guardsList,
    showToast 
  } = useShiftOps();

  // Component local states
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('week');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('composed_fill');
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [tableStatusFilter, setTableStatusFilter] = useState<FilterStatus>('all');
  const [selectedSectorForModal, setSelectedSectorForModal] = useState<SectorPerformanceMetric | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // SLA Benchmark target
  const SLA_TARGET_FILL_RATE = 95.0;

  // Manual refresh trigger with micro-feedback
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('MPU Telemetry Synced', 'Live shift coverage and mobile sector fill rates updated across 5 sectors.', 'info');
    }, 450);
  };

  // Base Multiplier based on timeframe
  const timeframeMultiplier = useMemo(() => {
    switch (selectedTimeframe) {
      case 'week': return 1;
      case '14days': return 2;
      case 'month': return 4.3;
      case 'quarter': return 13;
      default: return 1;
    }
  }, [selectedTimeframe]);

  // Aggregate Sector Metrics
  const sectorMetrics: SectorPerformanceMetric[] = useMemo(() => {
    return ROVING_GROUPS.map((sectorName) => {
      const config = ROVING_GROUP_CONFIGS[sectorName] || {
        id: sectorName,
        name: `${sectorName} Sector`,
        shortCode: `MPU-${sectorName.substring(0, 3).toUpperCase()}`,
        color: 'blue',
        badgeBg: 'bg-blue-100 dark:bg-blue-950/70',
        badgeText: 'text-blue-700 dark:text-blue-300',
        borderColor: 'border-blue-300 dark:border-blue-700',
        zone: 'Mobile Territory',
        description: 'Patrol sector'
      };

      // Associated Rover
      const rover = rovers.find(r => r.rovingGroup === sectorName) || rovers[0];
      const sectorSites = sitesList.filter(s => s.serviceType === 'roving' && (s.rovingGroup === sectorName || s.rovingGroup === `Mobile ${sectorName}`));
      
      // Actual live scheduled shifts for this roving group
      const liveRovingShifts = scheduledShifts.filter(s => 
        s.isRovingShift && (s.rovingGroup === sectorName || s.rovingGroup === `Mobile ${sectorName}`)
      );
      
      // Recurring set schedules for this roving group
      const sectorSetSchedules = setSchedules.filter(s => 
        s.isRoving && (s.rovingGroup === sectorName || s.rovingGroup === `Mobile ${sectorName}`)
      );

      // Baseline shifts for this sector based on typical 3-shifts-per-day 24/7 patrol
      // 1 Day shift (06:00-14:00), 1 Swing shift (14:00-22:00), 1 Graveyard shift (22:00-06:00) = 21 shifts/week
      // Some sectors have extra peak support (+7 to +10 shifts/week)
      const baseShiftsPerWeek = sectorName === 'Metro' ? 31 : 
                                sectorName === 'South West' ? 30 : 
                                sectorName === 'North West' ? 29 : 
                                sectorName === 'South East' ? 29 : 28;

      const totalRequiredShifts = Math.round((baseShiftsPerWeek + Math.max(0, liveRovingShifts.length - 2)) * timeframeMultiplier);

      // Filled shifts count
      // South East typically has 2-3 open graveyard shifts to model real-world dispatch bottlenecks
      let baseOpen = sectorName === 'South East' ? 3 : 
                      sectorName === 'North West' ? 2 : 
                      sectorName === 'South West' ? 2 : 
                      sectorName === 'North East' ? 1 : 1;

      // Adjust based on live scheduled shift states if any
      const liveOpenCount = liveRovingShifts.filter(s => !s.guardId || s.guardName?.toLowerCase().includes('open') || s.guardName?.toLowerCase().includes('unassigned')).length;
      if (liveOpenCount > 0) {
        baseOpen = Math.max(baseOpen, liveOpenCount);
      }

      const openShifts = Math.min(totalRequiredShifts - 1, Math.round(baseOpen * (selectedTimeframe === 'week' ? 1 : Math.sqrt(timeframeMultiplier))));
      const filledShifts = totalRequiredShifts - openShifts;
      const fillRatePct = Number(((filledShifts / totalRequiredShifts) * 100).toFixed(1));

      const contractHours = totalRequiredShifts * 8;
      const deliveredHours = Math.round(filledShifts * 8 * 0.985);
      const hoursDeliveryPct = Number(((deliveredHours / contractHours) * 100).toFixed(1));

      // Window Breakdowns
      const dayRequired = Math.round(totalRequiredShifts * 0.35);
      const swingRequired = Math.round(totalRequiredShifts * 0.38);
      const graveRequired = totalRequiredShifts - dayRequired - swingRequired;

      // Day and Swing are typically 98-100% filled, Graveyard has most gap
      const dayFilled = dayRequired;
      const swingFilled = Math.max(0, swingRequired - (openShifts > 2 ? 1 : 0));
      const graveFilled = Math.max(0, graveRequired - (openShifts - (swingRequired - swingFilled)));

      const dayFillRate = Number(((dayFilled / dayRequired) * 100).toFixed(1));
      const swingFillRate = Number(((swingFilled / swingRequired) * 100).toFixed(1));
      const graveFillRate = Number(((graveFilled / graveRequired) * 100).toFixed(1));

      // Status Grade
      const statusGrade: 'Optimal' | 'Good' | 'Attention' = 
        fillRatePct >= SLA_TARGET_FILL_RATE ? 'Optimal' : 
        fillRatePct >= 91.0 ? 'Good' : 'Attention';

      return {
        sector: sectorName,
        code: config.shortCode || `MPU-${sectorName.toUpperCase()}`,
        name: config.name || `${sectorName} Sector`,
        zone: config.zone || 'Metropolitan Patrol Territory',
        color: config.color || 'blue',
        badgeBg: config.badgeBg || 'bg-blue-100 dark:bg-blue-950/70',
        badgeText: config.badgeText || 'text-blue-700 dark:text-blue-300',
        borderColor: config.borderColor || 'border-blue-300 dark:border-blue-700',
        hexColor: SECTOR_HEX_COLORS[sectorName] || '#3b82f6',
        mpuUnit: rover?.unitNumber || `MPU-${sectorName.substring(0, 2).toUpperCase()}`,
        assignedRoverId: rover?.id || 'rover-1',
        assignedOfficer: rover?.assignedGuardName || 'Senior Mobile Officer',
        assignedBadge: rover?.assignedGuardBadge || 'SEC-ROV',
        phone: rover?.assignedGuardPhone,
        status: (rover?.status === 'dwelling' ? 'dwelling' : rover?.status === 'patrolling' ? 'patrolling' : 'standby') as any,
        batteryPct: rover?.batteryLevelPct || 85,
        fuelPct: rover?.fuelLevelPct || 75,
        speedMph: rover?.currentCoords?.speedKmh ? Math.round(rover.currentCoords.speedKmh * 0.621371) : 0,
        currentSite: rover?.currentSiteName || sectorSites[0]?.name || 'Sector Core',
        customerSitesCount: sectorSites.length || 7,

        totalRequiredShifts,
        filledShifts,
        openShifts,
        fillRatePct,
        contractHours,
        deliveredHours,
        hoursDeliveryPct,

        dayRequired,
        dayFilled,
        dayFillRate,
        swingRequired,
        swingFilled,
        swingFillRate,
        graveRequired,
        graveFilled,
        graveFillRate,

        checkpointCompliancePct: sectorName === 'Metro' ? 98.4 : sectorName === 'North East' ? 97.9 : sectorName === 'North West' ? 96.2 : sectorName === 'South West' ? 95.8 : 94.1,
        avgDwellMinutes: sectorName === 'Metro' ? 18.4 : 16.2,
        statusGrade
      };
    });
  }, [ROVING_GROUPS, rovers, sitesList, scheduledShifts, setSchedules, timeframeMultiplier, selectedTimeframe]);

  // Overall Fleet Consolidated Stats
  const overallStats = useMemo(() => {
    const totalRequired = sectorMetrics.reduce((acc, m) => acc + m.totalRequiredShifts, 0);
    const totalFilled = sectorMetrics.reduce((acc, m) => acc + m.filledShifts, 0);
    const totalOpen = sectorMetrics.reduce((acc, m) => acc + m.openShifts, 0);
    const fillRate = totalRequired > 0 ? Number(((totalFilled / totalRequired) * 100).toFixed(1)) : 100;
    const totalContractHours = sectorMetrics.reduce((acc, m) => acc + m.contractHours, 0);
    const totalDeliveredHours = sectorMetrics.reduce((acc, m) => acc + m.deliveredHours, 0);
    const hoursRate = totalContractHours > 0 ? Number(((totalDeliveredHours / totalContractHours) * 100).toFixed(1)) : 100;
    const sectorsMeetingSLA = sectorMetrics.filter(m => m.fillRatePct >= SLA_TARGET_FILL_RATE).length;

    return {
      totalRequired,
      totalFilled,
      totalOpen,
      fillRate,
      totalContractHours,
      totalDeliveredHours,
      hoursRate,
      sectorsMeetingSLA,
      totalSectors: sectorMetrics.length,
      activeRoversCount: rovers.length
    };
  }, [sectorMetrics, rovers.length]);

  // Filtered Sector Metrics for Visualizations and Lists
  const filteredMetrics = useMemo(() => {
    if (selectedSectorFilter === 'all') return sectorMetrics;
    return sectorMetrics.filter(m => m.sector === selectedSectorFilter);
  }, [sectorMetrics, selectedSectorFilter]);

  // Chart 1: Composed Chart Data (Sectors on X-axis)
  const composedFillChartData = useMemo(() => {
    return filteredMetrics.map(m => ({
      name: m.sector,
      shortName: m.sector.replace(' ', ''),
      code: m.code,
      filled: m.filledShifts,
      open: m.openShifts,
      total: m.totalRequiredShifts,
      fillRate: m.fillRatePct,
      slaTarget: SLA_TARGET_FILL_RATE,
      color: m.hexColor,
      officer: m.assignedOfficer,
      unit: m.mpuUnit,
      hours: m.deliveredHours
    }));
  }, [filteredMetrics]);

  // Chart 2: 7-Day Timeline Trend Data (Mon-Sun)
  const dailyTrendChartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Realistic daily variance: Weekends have slightly higher open shift spikes
    const dayFactors = [
      { day: 'Mon', scheduled: 21, filled: 21, rate: 100.0 },
      { day: 'Tue', scheduled: 21, filled: 20, rate: 95.2 },
      { day: 'Wed', scheduled: 21, filled: 21, rate: 100.0 },
      { day: 'Thu', scheduled: 21, filled: 20, rate: 95.2 },
      { day: 'Fri', scheduled: 22, filled: 20, rate: 90.9 },
      { day: 'Sat', scheduled: 20, filled: 18, rate: 90.0 },
      { day: 'Sun', scheduled: 20, filled: 17, rate: 85.0 }
    ];

    return dayFactors.map(d => {
      // If a single sector is selected, scale down
      const scale = selectedSectorFilter === 'all' ? 1 : 0.2;
      const sched = Math.round(d.scheduled * scale * (selectedSectorFilter === 'all' ? 1 : 1.1));
      const fil = Math.min(sched, Math.round(d.filled * scale * (selectedSectorFilter === 'all' ? 1 : 1.05)));
      const rate = sched > 0 ? Number(((fil / sched) * 100).toFixed(1)) : 100;

      return {
        day: d.day,
        scheduled: sched,
        filled: fil,
        open: Math.max(0, sched - fil),
        fillRate: rate,
        slaTarget: SLA_TARGET_FILL_RATE
      };
    });
  }, [selectedSectorFilter]);

  // Chart 3: Shift Window Breakdown Data (Day vs Swing vs Graveyard)
  const shiftWindowsChartData = useMemo(() => {
    return filteredMetrics.map(m => ({
      name: m.sector,
      code: m.code,
      'Day Shift (06-14)': m.dayFillRate,
      'Swing Shift (14-22)': m.swingFillRate,
      'Graveyard (22-06)': m.graveFillRate,
      slaTarget: SLA_TARGET_FILL_RATE
    }));
  }, [filteredMetrics]);

  // Chart 4: Contract Hours Delivery Data
  const hoursDeliveryChartData = useMemo(() => {
    return filteredMetrics.map(m => ({
      name: m.sector,
      code: m.code,
      'Contract Target Hours': m.contractHours,
      'Delivered Patrol Hours': m.deliveredHours,
      hoursDeliveryPct: m.hoursDeliveryPct
    }));
  }, [filteredMetrics]);

  // Mock list of individual shifts for roster table drilldown
  const shiftRosterRecords = useMemo(() => {
    const records: Array<{
      id: string;
      date: string;
      timeWindow: string;
      windowType: 'Day' | 'Swing' | 'Graveyard';
      sector: RovingGroup;
      unit: string;
      assignedOfficer: string;
      badge: string;
      status: string;
      isFilled: boolean;
      hours: number;
    }> = [];

    // Real scheduled roving shifts
    scheduledShifts.filter(s => s.isRovingShift).forEach((s, idx) => {
      const isUnassigned = !s.guardId || s.guardName?.toLowerCase().includes('open') || s.guardName?.toLowerCase().includes('unassigned');
      const startHour = parseInt((s.startTime || '08:00').split(':')[0], 10);
      const windowType: 'Day' | 'Swing' | 'Graveyard' = 
        startHour >= 6 && startHour < 14 ? 'Day' :
        startHour >= 14 && startHour < 22 ? 'Swing' : 'Graveyard';

      records.push({
        id: s.id,
        date: s.date || '2026-08-27',
        timeWindow: `${s.startTime || '08:00'} - ${s.endTime || '16:00'}`,
        windowType,
        sector: s.rovingGroup || 'Metro',
        unit: s.assignedRoverUnit || 'MPU-1 (Metro)',
        assignedOfficer: isUnassigned ? 'Unassigned Post' : (s.guardName || 'Assigned Officer'),
        badge: isUnassigned ? 'OPEN' : (s.guardBadge || 'SEC-ROV'),
        status: isUnassigned ? 'open' : s.status || 'scheduled',
        isFilled: !isUnassigned,
        hours: s.hours || 8
      });
    });

    // Synthesize roster records covering each of the 5 sectors for rich operational display
    const sampleDates = ['2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30'];
    const windows: Array<{ label: string; start: string; end: string; type: 'Day' | 'Swing' | 'Graveyard' }> = [
      { label: '06:00 - 14:00', start: '06:00', end: '14:00', type: 'Day' },
      { label: '14:00 - 22:00', start: '14:00', end: '22:00', type: 'Swing' },
      { label: '22:00 - 06:00', start: '22:00', end: '06:00', type: 'Graveyard' }
    ];

    ROVING_GROUPS.forEach((sec, sIdx) => {
      const metric = sectorMetrics.find(m => m.sector === sec);
      sampleDates.forEach((dt, dIdx) => {
        windows.forEach((win, wIdx) => {
          // Identify if this specific shift is designated as open (mostly in graveyard)
          const isOpen = (sec === 'South East' && win.type === 'Graveyard' && dIdx % 2 === 1) ||
                         (sec === 'North West' && win.type === 'Graveyard' && dIdx === 1) ||
                         (sec === 'South West' && win.type === 'Graveyard' && dIdx === 2);

          records.push({
            id: `MPU-SCHED-${sec.substring(0, 2).toUpperCase()}-${dIdx}${wIdx}`,
            date: dt,
            timeWindow: win.label,
            windowType: win.type,
            sector: sec,
            unit: metric?.mpuUnit || `MPU-${sIdx + 1} (${sec})`,
            assignedOfficer: isOpen ? '⚠️ Open for Bids' : metric?.assignedOfficer || 'Mobile Officer',
            badge: isOpen ? 'BID-QUEUE' : metric?.assignedBadge || 'SEC-ROV',
            status: isOpen ? 'open' : (dIdx === 0 && win.type === 'Swing' ? 'on_duty' : dIdx === 0 && win.type === 'Day' ? 'completed' : 'scheduled'),
            isFilled: !isOpen,
            hours: 8
          });
        });
      });
    });

    return records;
  }, [scheduledShifts, sectorMetrics]);

  // Filtered Roster Table
  const filteredRosterRecords = useMemo(() => {
    return shiftRosterRecords.filter(rec => {
      // Sector filter
      if (selectedSectorFilter !== 'all' && rec.sector !== selectedSectorFilter) {
        return false;
      }
      // Status filter
      if (tableStatusFilter === 'filled' && !rec.isFilled) return false;
      if (tableStatusFilter === 'open' && rec.isFilled) return false;
      
      // Search query
      if (tableSearchQuery) {
        const q = tableSearchQuery.toLowerCase();
        const matchesText = 
          rec.id.toLowerCase().includes(q) ||
          rec.sector.toLowerCase().includes(q) ||
          rec.unit.toLowerCase().includes(q) ||
          rec.assignedOfficer.toLowerCase().includes(q) ||
          rec.badge.toLowerCase().includes(q) ||
          rec.timeWindow.toLowerCase().includes(q) ||
          rec.date.toLowerCase().includes(q);
        if (!matchesText) return false;
      }
      return true;
    });
  }, [shiftRosterRecords, selectedSectorFilter, tableStatusFilter, tableSearchQuery]);

  // Export CSV Handler
  const handleExportCsv = () => {
    const headers = [
      'Sector',
      'Code',
      'MPU Unit',
      'Assigned Driver',
      'Total Required Shifts',
      'Filled Shifts',
      'Open Shifts',
      'Fill Rate %',
      'Contract Hours',
      'Delivered Hours',
      'Day Fill %',
      'Swing Fill %',
      'Graveyard Fill %',
      'Compliance %'
    ];

    const rows = sectorMetrics.map(m => [
      `"${m.sector}"`,
      `"${m.code}"`,
      `"${m.mpuUnit}"`,
      `"${m.assignedOfficer} (${m.assignedBadge})"`,
      m.totalRequiredShifts,
      m.filledShifts,
      m.openShifts,
      `"${m.fillRatePct}%"`,
      m.contractHours,
      m.deliveredHours,
      `"${m.dayFillRate}%"`,
      `"${m.swingFillRate}%"`,
      `"${m.graveFillRate}%"`,
      `"${m.checkpointCompliancePct}%"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MPU_Performance_Shift_Coverage_${selectedTimeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export Generated', `MPU shift coverage & fill rates downloaded as CSV.`, 'success');
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* 1. Header Banner & Operational Scope */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl border border-indigo-900/40 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
                <Car className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    MPU Performance Analytics
                  </h1>
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    5 Mobile Patrol Sectors
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
                  Real-time shift coverage, fill rates, and contract SLA compliance across Metro, North West, North East, South West, and South East patrol sectors.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Timeframe Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe selector */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedTimeframe('week')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedTimeframe === 'week' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Current Week
              </button>
              <button
                type="button"
                onClick={() => setSelectedTimeframe('14days')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedTimeframe === '14days' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                14 Days
              </button>
              <button
                type="button"
                onClick={() => setSelectedTimeframe('month')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedTimeframe === 'month' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Month (MTD)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTimeframe('quarter')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedTimeframe === 'quarter' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Q3 &apos;26
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              className={`p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer ${
                isRefreshing ? 'animate-spin text-indigo-400' : ''
              }`}
              title="Refresh live telemetry & shift fill statistics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Fleet KPI Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" /> Fleet Fill Rate
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-black font-mono ${
                overallStats.fillRate >= SLA_TARGET_FILL_RATE ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {overallStats.fillRate}%
              </span>
              <span className="text-[10px] text-slate-400">Target: {SLA_TARGET_FILL_RATE}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  overallStats.fillRate >= SLA_TARGET_FILL_RATE ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, overallStats.fillRate)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-400" /> Required Shifts
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-white">
                {overallStats.totalRequired}
              </span>
              <span className="text-[10px] text-slate-400">Total Shifts</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              24/7 Mobile Patrol Circuits
            </p>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-cyan-400" /> Filled Patrol Shifts
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-cyan-300">
                {overallStats.totalFilled}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                {overallStats.fillRate}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Staffed by certified drivers
            </p>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" /> Open Shift Gaps
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-black font-mono ${overallStats.totalOpen > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {overallStats.totalOpen}
              </span>
              <span className="text-[10px] text-rose-300 font-semibold">
                {overallStats.totalOpen > 0 ? 'Bids Available' : 'Zero Gaps'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {overallStats.totalOpen > 0 ? 'Primarily Graveyard' : 'Fully Covered'}
            </p>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" /> Delivered Hours
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-indigo-300">
                {overallStats.totalDeliveredHours}
              </span>
              <span className="text-[10px] text-slate-400">/ {overallStats.totalContractHours}h</span>
            </div>
            <p className="text-[10px] text-indigo-200/80 font-mono">
              {overallStats.hoursRate}% Delivery SLA
            </p>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-purple-400" /> SLA Sectors Met
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-purple-300">
                {overallStats.sectorsMeetingSLA} / {overallStats.totalSectors}
              </span>
              <span className="text-[10px] text-purple-300 font-bold">Sectors</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Threshold &ge; {SLA_TARGET_FILL_RATE}%
            </p>
          </div>
        </div>
      </div>

      {/* 2. Interactive Sector Filter & Alert Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 dark:bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" /> Sector Filter:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSectorFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedSectorFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All 5 Sectors ({sectorMetrics.length})
          </button>
          {sectorMetrics.map(m => (
            <button
              key={m.sector}
              type="button"
              onClick={() => setSelectedSectorFilter(m.sector)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedSectorFilter === m.sector
                  ? 'bg-slate-950 text-white border border-slate-600 ring-2 ring-indigo-500 shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.hexColor }} />
              <span>{m.sector}</span>
              <span className={`text-[10px] font-mono px-1 rounded ${
                m.fillRatePct >= SLA_TARGET_FILL_RATE 
                  ? 'bg-emerald-950 text-emerald-400' 
                  : 'bg-rose-950 text-rose-400'
              }`}>
                {m.fillRatePct}%
              </span>
            </button>
          ))}
        </div>

        {/* Quick Navigation to Route Optimization or Schedule */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {onNavigateToRouting && (
            <button
              type="button"
              onClick={() => onNavigateToRouting()}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 text-xs font-bold rounded-lg border border-cyan-800/50 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              <span>Live Route Maps</span>
            </button>
          )}
          {onNavigateToSchedule && (
            <button
              type="button"
              onClick={() => onNavigateToSchedule()}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-blue-200 text-xs font-bold rounded-lg border border-blue-800/50 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Shift Calendar</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Primary Recharts Visualization Section */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-indigo-400" />
                Mobile Patrol Sector Visualizer
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {selectedTimeframe === 'week' ? '7-Day Live Snapshot' : 
                 selectedTimeframe === '14days' ? '14-Day Performance Window' : 
                 selectedTimeframe === 'month' ? 'Month-to-Date (MTD)' : 'Quarterly Review'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Benchmarking required shifts against staffed coverage and target SLA thresholds.
            </p>
          </div>

          {/* Visualization View Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto">
            <button
              type="button"
              onClick={() => setChartViewMode('composed_fill')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                chartViewMode === 'composed_fill' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sector Fill & Gaps
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('daily_trend')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                chartViewMode === 'daily_trend' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Daily Fill Rate Trend
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('shift_windows')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                chartViewMode === 'shift_windows' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Day / Swing / Grave
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('hours_capacity')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                chartViewMode === 'hours_capacity' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Contract Hours
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-80 min-h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartViewMode === 'composed_fill' ? (
              /* ComposedChart: Filled Shifts vs Open Gaps vs Fill Rate Line */
              <ComposedChart
                data={composedFillChartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} 
                />
                <YAxis 
                  yAxisId="left" 
                  tick={{ fontSize: 11, fill: '#94a3b8' }} 
                  name="Shifts Count"
                  label={{ value: 'Shifts Scheduled', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[70, 100]} 
                  unit="%" 
                  tick={{ fontSize: 11, fill: '#10b981' }} 
                  label={{ value: 'Fill Rate %', angle: 90, position: 'insideRight', fill: '#10b981', fontSize: 11 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 text-white p-3 rounded-xl shadow-2xl border border-slate-700 min-w-[220px] text-xs space-y-1.5">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="font-extrabold text-sm text-cyan-300">{data.name} Sector</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {data.code}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300">
                            Unit: <strong className="text-white">{data.unit}</strong> • {data.officer}
                          </div>
                          <div className="pt-1 space-y-1 border-t border-slate-800/80">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Total Required:</span>
                              <span className="font-bold">{data.total} shifts</span>
                            </div>
                            <div className="flex justify-between text-emerald-400">
                              <span>Filled & Staffed:</span>
                              <span className="font-bold">{data.filled} shifts</span>
                            </div>
                            {data.open > 0 && (
                              <div className="flex justify-between text-rose-400 font-bold">
                                <span>Open Gaps:</span>
                                <span>{data.open} shifts</span>
                              </div>
                            )}
                            <div className="flex justify-between text-cyan-300 font-black pt-1 border-t border-slate-800">
                              <span>Fill Rate:</span>
                              <span>{data.fillRate}%</span>
                            </div>
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>SLA Benchmark:</span>
                              <span>{data.slaTarget}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: 10, fontSize: 12 }} 
                />
                <ReferenceLine 
                  yAxisId="right" 
                  y={SLA_TARGET_FILL_RATE} 
                  stroke="#10b981" 
                  strokeDasharray="4 4" 
                  label={{ value: '95% SLA Target', position: 'top', fill: '#10b981', fontSize: 11 }} 
                />
                <Bar 
                  yAxisId="left" 
                  dataKey="filled" 
                  name="Filled Patrol Shifts" 
                  radius={[4, 4, 0, 0]}
                >
                  {composedFillChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
                <Bar 
                  yAxisId="left" 
                  dataKey="open" 
                  name="Open / Unfilled Gaps" 
                  fill="#f43f5e" 
                  opacity={0.85} 
                  radius={[4, 4, 0, 0]} 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="fillRate" 
                  name="Fill Rate %" 
                  stroke="#38bdf8" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 7 }} 
                />
              </ComposedChart>
            ) : chartViewMode === 'daily_trend' ? (
              /* Daily Trend Area Chart across the 7-day week */
              <AreaChart
                data={dailyTrendChartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="fillRateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis domain={[70, 100]} unit="%" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                          <div className="font-bold text-sm text-cyan-400">{data.day} Roster Trajectory</div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Scheduled:</span>
                            <span className="font-bold">{data.scheduled} shifts</span>
                          </div>
                          <div className="flex justify-between text-emerald-400">
                            <span>Filled:</span>
                            <span className="font-bold">{data.filled} shifts</span>
                          </div>
                          {data.open > 0 && (
                            <div className="flex justify-between text-rose-400">
                              <span>Open Gaps:</span>
                              <span className="font-bold">{data.open} shifts</span>
                            </div>
                          )}
                          <div className="flex justify-between text-cyan-300 font-black pt-1 border-t border-slate-800">
                            <span>Fill Rate:</span>
                            <span>{data.fillRate}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine 
                  y={SLA_TARGET_FILL_RATE} 
                  stroke="#10b981" 
                  strokeDasharray="4 4" 
                  label={{ value: '95% SLA Target', position: 'top', fill: '#10b981', fontSize: 11 }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="fillRate" 
                  name="Sector Fill Rate %" 
                  stroke="#38bdf8" 
                  fillOpacity={1} 
                  fill="url(#fillRateGradient)" 
                  strokeWidth={2.5}
                />
              </AreaChart>
            ) : chartViewMode === 'shift_windows' ? (
              /* Shift Window Grouped BarChart: Day, Swing, Graveyard */
              <BarChart
                data={shiftWindowsChartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis domain={[60, 100]} unit="%" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                          <div className="font-bold text-sm text-indigo-300">{data.name} Shift Window Fill %</div>
                          <div className="flex justify-between text-amber-300">
                            <span>Day Shift (06-14):</span>
                            <span className="font-bold">{data['Day Shift (06-14)']}%</span>
                          </div>
                          <div className="flex justify-between text-cyan-300">
                            <span>Swing Shift (14-22):</span>
                            <span className="font-bold">{data['Swing Shift (14-22)']}%</span>
                          </div>
                          <div className="flex justify-between text-purple-300">
                            <span>Graveyard (22-06):</span>
                            <span className="font-bold">{data['Graveyard (22-06)']}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                <ReferenceLine 
                  y={SLA_TARGET_FILL_RATE} 
                  stroke="#10b981" 
                  strokeDasharray="4 4" 
                  label={{ value: '95% SLA Target', position: 'top', fill: '#10b981', fontSize: 11 }} 
                />
                <Bar dataKey="Day Shift (06-14)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Swing Shift (14-22)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Graveyard (22-06)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              /* Contract Hours Capacity BarChart */
              <BarChart
                data={hoursDeliveryChartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="h" />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                          <div className="font-bold text-sm text-indigo-400">{data.name} Patrol Hours</div>
                          <div className="flex justify-between text-slate-400">
                            <span>Target Hours:</span>
                            <span className="font-bold">{data['Contract Target Hours']} hrs</span>
                          </div>
                          <div className="flex justify-between text-emerald-400">
                            <span>Delivered Hours:</span>
                            <span className="font-bold">{data['Delivered Patrol Hours']} hrs</span>
                          </div>
                          <div className="flex justify-between text-cyan-300 font-bold pt-1 border-t border-slate-800">
                            <span>Fulfillment Rate:</span>
                            <span>{data.hoursDeliveryPct}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                <Bar dataKey="Contract Target Hours" fill="#475569" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Delivered Patrol Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Explanatory Legend & Insight Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              <strong>Operational Summary:</strong> Top-performing sector is <strong>Metro (96.7%)</strong>. Focus area is <strong>South East Graveyard shift</strong> (3 open bids available for driver claim).
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span>SLA Benchmark: &ge; 95%</span>
            <span>•</span>
            <span>Live Sync: Active</span>
          </div>
        </div>
      </div>

      {/* 4. Five Mobile Patrol Sector Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Sector Command Matrix (5 Active Mobile Units)
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {sectorMetrics.length} Patrol Sectors • All 24/7 Circuits Operational
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {sectorMetrics.map(metric => {
            const isSelected = selectedSectorFilter === metric.sector;
            return (
              <div 
                key={metric.sector}
                className={`bg-slate-900 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-md ${
                  isSelected 
                    ? 'border-indigo-500 ring-2 ring-indigo-500/40' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Sector Header Strip */}
                <div className="p-3.5 pb-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-extrabold text-white flex items-center gap-1.5"
                      style={{ backgroundColor: metric.hexColor }}
                    >
                      <Car className="w-3 h-3" />
                      {metric.code}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      metric.statusGrade === 'Optimal' 
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' 
                        : metric.statusGrade === 'Good'
                        ? 'bg-blue-950 text-blue-300 border border-blue-700/60'
                        : 'bg-rose-950 text-rose-300 border border-rose-700/60 animate-pulse'
                    }`}>
                      {metric.statusGrade}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white">{metric.name}</h3>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5" title={metric.zone}>
                      {metric.zone}
                    </p>
                  </div>

                  {/* Fill Rate Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold">Shift Fill Rate:</span>
                      <span className={`font-mono font-black ${
                        metric.fillRatePct >= SLA_TARGET_FILL_RATE ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {metric.fillRatePct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          metric.fillRatePct >= SLA_TARGET_FILL_RATE ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, metric.fillRatePct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Shifts Stats Summary */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1.5 text-center bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Req</span>
                      <span className="text-xs font-mono font-bold text-white">{metric.totalRequiredShifts}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-emerald-400 block uppercase">Filled</span>
                      <span className="text-xs font-mono font-bold text-emerald-300">{metric.filledShifts}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-rose-400 block uppercase">Open</span>
                      <span className={`text-xs font-mono font-bold ${metric.openShifts > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                        {metric.openShifts}
                      </span>
                    </div>
                  </div>

                  {/* Active Vehicle & Telemetry Status */}
                  <div className="pt-1.5 space-y-1 border-t border-slate-800/80 text-[11px]">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 font-semibold">Assigned Unit:</span>
                      <span className="font-mono text-cyan-300 font-bold">{metric.mpuUnit}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 font-semibold">Lead Officer:</span>
                      <span className="truncate max-w-[110px]">{metric.assignedOfficer}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[10px] pt-1">
                      <span className="flex items-center gap-1">
                        <Battery className="w-3 h-3 text-emerald-400" /> {metric.batteryPct}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Fuel className="w-3 h-3 text-amber-400" /> {metric.fuelPct}%
                      </span>
                      <span className="font-mono text-slate-300">
                        {metric.status === 'dwelling' ? 'Dwelling' : `${metric.speedMph} MPH`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSectorFilter(metric.sector === selectedSectorFilter ? 'all' : metric.sector);
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer text-center ${
                      isSelected 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isSelected ? 'Filtered' : 'Filter View'}
                  </button>

                  {onNavigateToSchedule && (
                    <button
                      type="button"
                      onClick={() => onNavigateToSchedule(metric.sector)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg transition-colors cursor-pointer"
                      title={`Open ${metric.sector} in Shift Scheduling Calendar`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onNavigateToRouting && (
                    <button
                      type="button"
                      onClick={() => onNavigateToRouting(metric.assignedRoverId)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg transition-colors cursor-pointer"
                      title={`Inspect ${metric.mpuUnit} Live Circuit Route`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Sector Shift Roster Drilldown Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-indigo-400" />
              Mobile Patrol Shift Coverage Roster
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual shift fill states, duty time windows, and assigned mobile patrol units.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                placeholder="Search driver, unit, ID..."
                className="pl-8 pr-3 py-1.5 bg-slate-950 rounded-xl border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTableStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  tableStatusFilter === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({shiftRosterRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setTableStatusFilter('filled')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  tableStatusFilter === 'filled' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Filled
              </button>
              <button
                type="button"
                onClick={() => setTableStatusFilter('open')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  tableStatusFilter === 'open' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Open Gaps
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5">Shift ID & Date</th>
                <th className="py-3 px-3">Sector & Unit</th>
                <th className="py-3 px-3">Shift Window</th>
                <th className="py-3 px-3">Assigned Driver</th>
                <th className="py-3 px-3">Fill Status</th>
                <th className="py-3 px-3">Duty Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRosterRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No mobile patrol shifts matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredRosterRecords.slice(0, 15).map(record => {
                  const sectorHex = SECTOR_HEX_COLORS[record.sector] || '#3b82f6';
                  return (
                    <tr key={record.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-white">{record.id}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{record.date}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sectorHex }} />
                          <span className="font-bold text-white">{record.sector}</span>
                        </div>
                        <div className="text-[10px] font-mono text-cyan-300 mt-0.5">{record.unit}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-semibold text-slate-200">{record.timeWindow}</div>
                        <span className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded font-extrabold mt-0.5 inline-block ${
                          record.windowType === 'Day' 
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/50' 
                            : record.windowType === 'Swing'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50'
                            : 'bg-purple-950 text-purple-300 border border-purple-800/50'
                        }`}>
                          {record.windowType} (8h)
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className={`font-semibold ${record.isFilled ? 'text-white' : 'text-rose-400 font-bold'}`}>
                          {record.assignedOfficer}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">Badge: {record.badge}</div>
                      </td>

                      <td className="py-3 px-3">
                        {record.isFilled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Filled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700/60 inline-flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            Open Bid
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className={`px-2 py-0.5 rounded ${
                          record.status === 'on_duty' 
                            ? 'bg-emerald-500 text-slate-950 font-black' 
                            : record.status === 'completed'
                            ? 'bg-slate-800 text-slate-400'
                            : record.status === 'open'
                            ? 'bg-rose-900 text-rose-200'
                            : 'bg-blue-950 text-blue-300 border border-blue-800/60'
                        }`}>
                          {record.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right space-x-1.5">
                        {onNavigateToSchedule && (
                          <button
                            type="button"
                            onClick={() => onNavigateToSchedule(record.sector)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Schedule
                          </button>
                        )}
                        {onNavigateToRouting && (
                          <button
                            type="button"
                            onClick={() => onNavigateToRouting()}
                            className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded-lg text-[11px] font-bold border border-cyan-800/60 transition-colors cursor-pointer"
                          >
                            Route
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredRosterRecords.length > 15 && (
          <div className="p-3 bg-slate-950/60 text-center text-xs text-slate-400 border-t border-slate-800">
            Showing first 15 of {filteredRosterRecords.length} shifts. Use search or sector filter to narrow roster records.
          </div>
        )}
      </div>
    </div>
  );
};
