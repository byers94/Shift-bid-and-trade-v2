import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  TimeSpecificTask, 
  TimeSpecificTaskCategory, 
  TaskPriority, 
  TaskCompletionLog, 
  SiteProfile,
  ScheduledShift
} from '../../types/shift';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Building2,
  Filter,
  Search,
  RefreshCw,
  Download,
  Bell,
  ShieldCheck,
  Camera,
  MapPin,
  Lock,
  Unlock,
  Key,
  Flame,
  Moon,
  Lightbulb,
  Radio,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Plus,
  X,
  User,
  Info,
  Check,
  Sparkles,
  Layers,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';

interface SiteTaskOverviewProps {
  onNavigateToSiteDirectory?: (siteId?: string) => void;
  onNavigateToSchedule?: (siteId?: string) => void;
}

// Category color and icon mappings
const CATEGORY_CONFIG: Record<
  TimeSpecificTaskCategory, 
  { label: string; color: string; bg: string; text: string; icon: React.FC<{ className?: string }> }
> = {
  amenity_lock: {
    label: 'Amenity Lockup',
    color: '#8b5cf6', // Violet
    bg: 'bg-purple-100 dark:bg-purple-950/60',
    text: 'text-purple-700 dark:text-purple-300',
    icon: Lock
  },
  amenity_unlock: {
    label: 'Amenity Unlock',
    color: '#06b6d4', // Cyan
    bg: 'bg-cyan-100 dark:bg-cyan-950/60',
    text: 'text-cyan-700 dark:text-cyan-300',
    icon: Unlock
  },
  facility_closure: {
    label: 'Facility Closure',
    color: '#3b82f6', // Blue
    bg: 'bg-blue-100 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    icon: Building2
  },
  access_control: {
    label: 'Access Control',
    color: '#ec4899', // Pink
    bg: 'bg-pink-100 dark:bg-pink-950/60',
    text: 'text-pink-700 dark:text-pink-300',
    icon: Key
  },
  lighting_audit: {
    label: 'Lighting Audit',
    color: '#eab308', // Yellow
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    icon: Lightbulb
  },
  curfew_enforcement: {
    label: 'Curfew & Quiet Hours',
    color: '#6366f1', // Indigo
    bg: 'bg-indigo-100 dark:bg-indigo-950/60',
    text: 'text-indigo-700 dark:text-indigo-300',
    icon: Moon
  },
  hazard_inspection: {
    label: 'Hazard & Safety Audit',
    color: '#f97316', // Orange
    bg: 'bg-orange-100 dark:bg-orange-950/60',
    text: 'text-orange-700 dark:text-orange-300',
    icon: Flame
  },
  general_service: {
    label: 'General Service',
    color: '#14b8a6', // Teal
    bg: 'bg-teal-100 dark:bg-teal-950/60',
    text: 'text-teal-700 dark:text-teal-300',
    icon: CheckSquare
  },
  other: {
    label: 'Other Post Order',
    color: '#64748b', // Slate
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    icon: FileText
  }
};

const PIE_COLORS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899', 
  '#f97316', '#eab308', '#6366f1', '#14b8a6', '#64748b'
];

export const SiteTaskOverview: React.FC<SiteTaskOverviewProps> = ({
  onNavigateToSiteDirectory,
  onNavigateToSchedule
}) => {
  const {
    sitesList,
    guardsList,
    taskCompletionLogs,
    activeTaskAlert,
    completeTimeSpecificTask,
    triggerTestTaskAlert,
    showToast
  } = useShiftOps();

  // Filters & State
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartType, setChartType] = useState<'stacked' | 'grouped'>('stacked');
  const [viewMode, setViewMode] = useState<'dashboard' | 'matrix' | 'analytics'>('dashboard');

  // Manual Dispatch Verification Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualTaskId, setManualTaskId] = useState<string>('');
  const [manualSiteId, setManualSiteId] = useState<string>('');
  const [manualGuardId, setManualGuardId] = useState<string>('');
  const [manualStatus, setManualStatus] = useState<'completed' | 'verified' | 'flagged_issue' | 'exception_logged'>('verified');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [manualPhotoProvided, setManualPhotoProvided] = useState<boolean>(false);

  // Collect all tasks across all sites
  const allTasks = useMemo(() => {
    const tasks: (TimeSpecificTask & { site: SiteProfile })[] = [];
    sitesList.forEach((site) => {
      if (site.timeSpecificTasks && site.timeSpecificTasks.length > 0) {
        site.timeSpecificTasks.forEach((task) => {
          tasks.push({
            ...task,
            site
          });
        });
      }
    });
    return tasks;
  }, [sitesList]);

  // Today's date string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute status for each task (completed today vs pending vs overdue)
  const taskStatusMap = useMemo(() => {
    const map = new Map<string, {
      status: 'completed_verified' | 'completed_flagged' | 'completed_exception' | 'due_now' | 'approaching' | 'pending' | 'overdue';
      log?: TaskCompletionLog;
      dueMinutesDiff: number;
    }>();

    const now = new Date();
    const currentMinutesOfDay = now.getHours() * 60 + now.getMinutes();

    allTasks.forEach((task) => {
      // Find today's completion log if any
      const todayLog = taskCompletionLogs.find(
        (log) => log.taskId === task.id && log.completedAt.startsWith(todayStr)
      );

      if (todayLog) {
        if (todayLog.status === 'flagged_issue') {
          map.set(task.id, { status: 'completed_flagged', log: todayLog, dueMinutesDiff: 0 });
        } else if (todayLog.status === 'exception_logged') {
          map.set(task.id, { status: 'completed_exception', log: todayLog, dueMinutesDiff: 0 });
        } else {
          map.set(task.id, { status: 'completed_verified', log: todayLog, dueMinutesDiff: 0 });
        }
        return;
      }

      // Check time calculations
      const [h, m] = task.scheduledTime.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) {
        map.set(task.id, { status: 'pending', dueMinutesDiff: 0 });
        return;
      }

      const taskMinutes = h * 60 + m;
      const diff = currentMinutesOfDay - taskMinutes; // positive = past scheduled time
      const leadTime = task.leadTimeMinutes || 15;
      const gracePeriod = task.gracePeriodMinutes || 20;

      if (diff > gracePeriod) {
        map.set(task.id, { status: 'overdue', dueMinutesDiff: diff });
      } else if (diff >= 0 && diff <= gracePeriod) {
        map.set(task.id, { status: 'due_now', dueMinutesDiff: diff });
      } else if (diff < 0 && Math.abs(diff) <= leadTime) {
        map.set(task.id, { status: 'approaching', dueMinutesDiff: diff });
      } else {
        map.set(task.id, { status: 'pending', dueMinutesDiff: diff });
      }
    });

    return map;
  }, [allTasks, taskCompletionLogs, todayStr]);

  // Filtered tasks list
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (selectedSiteId !== 'all' && task.siteId !== selectedSiteId) return false;
      if (selectedCategory !== 'all' && task.category !== selectedCategory) return false;
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;

      const statusInfo = taskStatusMap.get(task.id);
      const isCompleted = statusInfo?.status.startsWith('completed');
      
      if (selectedStatus === 'completed' && !isCompleted) return false;
      if (selectedStatus === 'pending' && (isCompleted || statusInfo?.status === 'overdue')) return false;
      if (selectedStatus === 'due_now' && statusInfo?.status !== 'due_now' && statusInfo?.status !== 'approaching') return false;
      if (selectedStatus === 'overdue' && statusInfo?.status !== 'overdue') return false;
      if (selectedStatus === 'flagged' && statusInfo?.status !== 'completed_flagged') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchSite = (task.siteName || task.site.name).toLowerCase().includes(q);
        const matchZone = task.locationZone.toLowerCase().includes(q);
        const matchInstr = task.instructions.toLowerCase().includes(q);
        const matchGuard = statusInfo?.log?.guardName.toLowerCase().includes(q);
        if (!matchTitle && !matchSite && !matchZone && !matchInstr && !matchGuard) {
          return false;
        }
      }

      return true;
    });
  }, [allTasks, selectedSiteId, selectedCategory, selectedPriority, selectedStatus, searchQuery, taskStatusMap]);

  // Overall KPIs
  const kpiStats = useMemo(() => {
    const totalConfigured = allTasks.length;
    let completedCount = 0;
    let verifiedCount = 0;
    let flaggedCount = 0;
    let pendingCount = 0;
    let dueNowCount = 0;
    let overdueCount = 0;
    let slaCompliantCount = 0;
    let gpsVerifiedCount = 0;
    let photoVerifiedCount = 0;

    allTasks.forEach((task) => {
      const info = taskStatusMap.get(task.id);
      if (info?.status.startsWith('completed')) {
        completedCount++;
        if (info.status === 'completed_verified') verifiedCount++;
        if (info.status === 'completed_flagged') flaggedCount++;
        if (info.log?.completedWithinSla) slaCompliantCount++;
        if (info.log?.gpsCoords) gpsVerifiedCount++;
        if (info.log?.photoUrl) photoVerifiedCount++;
      } else if (info?.status === 'overdue') {
        overdueCount++;
        pendingCount++;
      } else if (info?.status === 'due_now' || info?.status === 'approaching') {
        dueNowCount++;
        pendingCount++;
      } else {
        pendingCount++;
      }
    });

    const completionRate = totalConfigured > 0 ? Math.round((completedCount / totalConfigured) * 100) : 0;
    const slaRate = completedCount > 0 ? Math.round((slaCompliantCount / completedCount) * 100) : 100;
    const proofRate = completedCount > 0 ? Math.round(((gpsVerifiedCount + photoVerifiedCount) / (completedCount * 2)) * 100) : 0;

    return {
      totalConfigured,
      completedCount,
      verifiedCount,
      flaggedCount,
      pendingCount,
      dueNowCount,
      overdueCount,
      completionRate,
      slaRate,
      proofRate
    };
  }, [allTasks, taskStatusMap]);

  // Recharts Data: Site-by-Site Summary Chart
  const siteChartData = useMemo(() => {
    const siteMap = new Map<string, {
      siteId: string;
      siteName: string;
      shortName: string;
      completed: number;
      pending: number;
      overdue: number;
      flagged: number;
      total: number;
    }>();

    // Initialize sites that have tasks
    sitesList.forEach((site) => {
      if (site.timeSpecificTasks && site.timeSpecificTasks.length > 0) {
        siteMap.set(site.id, {
          siteId: site.id,
          siteName: site.name,
          shortName: site.name.length > 16 ? site.name.slice(0, 14) + '...' : site.name,
          completed: 0,
          pending: 0,
          overdue: 0,
          flagged: 0,
          total: site.timeSpecificTasks.length
        });
      }
    });

    allTasks.forEach((task) => {
      const entry = siteMap.get(task.siteId);
      if (!entry) return;

      const info = taskStatusMap.get(task.id);
      if (info?.status === 'completed_flagged') {
        entry.flagged++;
        entry.completed++;
      } else if (info?.status.startsWith('completed')) {
        entry.completed++;
      } else if (info?.status === 'overdue') {
        entry.overdue++;
      } else {
        entry.pending++;
      }
    });

    return Array.from(siteMap.values());
  }, [sitesList, allTasks, taskStatusMap]);

  // Recharts Data: Operational Category Breakdown Chart
  const categoryChartData = useMemo(() => {
    const catMap = new Map<TimeSpecificTaskCategory, {
      category: TimeSpecificTaskCategory;
      name: string;
      completed: number;
      pending: number;
      total: number;
    }>();

    Object.keys(CATEGORY_CONFIG).forEach((k) => {
      const cat = k as TimeSpecificTaskCategory;
      catMap.set(cat, {
        category: cat,
        name: CATEGORY_CONFIG[cat].label,
        completed: 0,
        pending: 0,
        total: 0
      });
    });

    allTasks.forEach((task) => {
      const entry = catMap.get(task.category);
      if (!entry) return;

      entry.total++;
      const info = taskStatusMap.get(task.id);
      if (info?.status.startsWith('completed')) {
        entry.completed++;
      } else {
        entry.pending++;
      }
    });

    return Array.from(catMap.values()).filter((c) => c.total > 0);
  }, [allTasks, taskStatusMap]);

  // Recharts Data: Hourly Distribution Chart
  const hourlyScheduleData = useMemo(() => {
    const hours = [
      '06:00', '08:00', '10:00', '12:00', '14:00', 
      '16:00', '18:00', '20:00', '21:00', '22:00', '23:00', '00:00', '02:00'
    ];

    const data = hours.map((h) => ({
      hour: h,
      completed: 0,
      pending: 0,
      overdue: 0
    }));

    allTasks.forEach((task) => {
      const [taskH] = task.scheduledTime.split(':').map(Number);
      if (isNaN(taskH)) return;

      // Find closest hour bucket
      let bestBucket = data[0];
      let minDiff = 999;

      data.forEach((bucket) => {
        const [bH] = bucket.hour.split(':').map(Number);
        const diff = Math.abs(taskH - bH);
        if (diff < minDiff) {
          minDiff = diff;
          bestBucket = bucket;
        }
      });

      const info = taskStatusMap.get(task.id);
      if (info?.status.startsWith('completed')) {
        bestBucket.completed++;
      } else if (info?.status === 'overdue') {
        bestBucket.overdue++;
      } else {
        bestBucket.pending++;
      }
    });

    return data;
  }, [allTasks, taskStatusMap]);

  // Recharts Data: Priority breakdown
  const priorityChartData = useMemo(() => {
    const pMap = {
      mandatory_sla: { name: 'Mandatory SLA', completed: 0, pending: 0, total: 0 },
      priority: { name: 'High Priority', completed: 0, pending: 0, total: 0 },
      routine: { name: 'Routine SOP', completed: 0, pending: 0, total: 0 }
    };

    allTasks.forEach((task) => {
      const p = task.priority || 'routine';
      if (pMap[p]) {
        pMap[p].total++;
        const info = taskStatusMap.get(task.id);
        if (info?.status.startsWith('completed')) {
          pMap[p].completed++;
        } else {
          pMap[p].pending++;
        }
      }
    });

    return Object.values(pMap);
  }, [allTasks, taskStatusMap]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Task ID',
      'Site Name',
      'Task Title',
      'Category',
      'Priority',
      'Scheduled Time',
      'Location Zone',
      'Status',
      'Completing Guard',
      'Guard Badge',
      'Completion Time',
      'SLA Compliant',
      'GPS Verified',
      'Photo Verified',
      'Notes'
    ];

    const rows = filteredTasks.map((task) => {
      const info = taskStatusMap.get(task.id);
      const isCompleted = info?.status.startsWith('completed');
      const log = info?.log;

      return [
        task.id,
        `"${task.siteName || task.site.name}"`,
        `"${task.title}"`,
        CATEGORY_CONFIG[task.category]?.label || task.category,
        task.priority,
        task.scheduledTime,
        `"${task.locationZone}"`,
        info?.status || 'pending',
        log ? `"${log.guardName}"` : 'Unassigned',
        log?.guardBadge || 'N/A',
        log?.completedAt ? new Date(log.completedAt).toLocaleString() : 'N/A',
        log?.completedWithinSla ? 'YES' : isCompleted ? 'NO' : 'N/A',
        log?.gpsCoords ? 'YES' : 'NO',
        log?.photoUrl ? 'YES' : 'NO',
        log?.notes ? `"${log.notes.replace(/"/g, '""')}"` : ''
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Site_Task_Overview_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Report Exported', `Generated CSV report for ${filteredTasks.length} site tasks.`, 'success');
  };

  // Open manual verification modal
  const handleOpenManualModal = (task?: TimeSpecificTask) => {
    if (task) {
      setManualTaskId(task.id);
      setManualSiteId(task.siteId);
      setManualNotes('');
      setManualStatus('verified');
      setManualPhotoProvided(task.requirePhoto);
    } else if (allTasks.length > 0) {
      setManualTaskId(allTasks[0].id);
      setManualSiteId(allTasks[0].siteId);
      setManualNotes('');
      setManualStatus('verified');
    }
    setManualGuardId(guardsList[0]?.id || '');
    setIsManualModalOpen(true);
  };

  // Submit manual task verification
  const handleSubmitManualVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTaskId || !manualSiteId) return;

    const task = allTasks.find((t) => t.id === manualTaskId);
    const guard = guardsList.find((g) => g.id === manualGuardId) || guardsList[0];

    completeTimeSpecificTask(manualTaskId, manualSiteId, guard, {
      status: manualStatus,
      notes: manualNotes || (manualStatus === 'verified' ? 'Verified by Operations Dispatcher' : 'Exception logged by Dispatch'),
      photoUrl: manualPhotoProvided ? 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&auto=format&fit=crop&q=80' : undefined,
      gpsCoords: task?.site ? { latitude: task.site.latitude || 47.6062, longitude: task.site.longitude || -122.3321 } : undefined
    });

    setIsManualModalOpen(false);
    showToast(
      'Task Verified & Logged',
      `Manual verification logged for "${task?.title || 'Site Task'}".`,
      'success'
    );
  };

  return (
    <div id="site-task-overview-container" className="flex flex-col gap-5 w-full">
      {/* Top Banner & Action Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 dark:bg-blue-600 rounded-xl text-white shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Site Task Overview & Compliance Dashboard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time tracking of site-specific post order tasks, amenity locks, curfew checks, and mandatory SLA closures.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button
            id="task-test-alert-btn"
            type="button"
            onClick={() => {
              triggerTestTaskAlert();
              showToast('Test Alert Sent', 'Dispatched real-time scheduled task push notification to guards.', 'info');
            }}
            className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 hover:bg-amber-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Simulate a real-time time-specific task alert notification"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Test Push Alert</span>
          </button>

          <button
            id="task-manual-verify-btn"
            type="button"
            onClick={() => handleOpenManualModal()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Manual Dispatch Log</span>
          </button>

          <button
            id="task-export-csv-btn"
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Configured */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {kpiStats.totalConfigured}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Across {sitesList.filter(s => s.timeSpecificTasks && s.timeSpecificTasks.length > 0).length} client sites
            </div>
          </div>
        </div>

        {/* Completed Today */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono flex items-baseline gap-1.5">
              <span>{kpiStats.completedCount}</span>
              <span className="text-xs font-normal text-emerald-700 dark:text-emerald-400">
                ({kpiStats.completionRate}%)
              </span>
            </div>
            <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
              {kpiStats.verifiedCount} verified, {kpiStats.flaggedCount} flagged
            </div>
          </div>
        </div>

        {/* Pending / Due */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
            <span>Pending Today</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {kpiStats.pendingCount}
            </div>
            <div className="text-[10px] text-blue-700/80 dark:text-blue-400/80 mt-0.5">
              Scheduled throughout shift
            </div>
          </div>
        </div>

        {/* Due Now / Approaching */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span>Due Window</span>
            <Bell className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1.5">
              <span>{kpiStats.dueNowCount}</span>
              {kpiStats.dueNowCount > 0 && (
                <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full animate-pulse">
                  ACTIVE
                </span>
              )}
            </div>
            <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              Within 15-20 min window
            </div>
          </div>
        </div>

        {/* Overdue / Flags */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
            <span>Overdue Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {kpiStats.overdueCount}
            </div>
            <div className="text-[10px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">
              Exceeded SLA grace period
            </div>
          </div>
        </div>

        {/* SLA Compliance Rate */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>SLA Compliance</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {kpiStats.slaRate}%
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              On-time verification rate
            </div>
          </div>
        </div>
      </div>

      {/* Main Recharts Summary Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Site-by-Site Summary Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Site-Specific Task Completion Status</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pending vs Completed vs Flagged tasks aggregated per client property
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setChartType('stacked')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  chartType === 'stacked'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Stacked
              </button>
              <button
                type="button"
                onClick={() => setChartType('grouped')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  chartType === 'grouped'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Grouped
              </button>
            </div>
          </div>

          <div className="w-full h-72 sm:h-80 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={siteChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis 
                  dataKey="shortName" 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={45}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[180px]">
                          <p className="font-extrabold text-blue-400 border-b border-slate-800 pb-1 mb-1.5">
                            {data.siteName}
                          </p>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-emerald-400">Completed:</span>
                              <span className="font-mono font-bold">{data.completed}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-400">Pending:</span>
                              <span className="font-mono font-bold">{data.pending}</span>
                            </div>
                            {data.overdue > 0 && (
                              <div className="flex justify-between">
                                <span className="text-rose-400">Overdue:</span>
                                <span className="font-mono font-bold">{data.overdue}</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                              <span className="text-slate-400">Total Configured:</span>
                              <span className="font-mono">{data.total}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
                />
                <Bar 
                  dataKey="completed" 
                  name="Completed" 
                  fill="#10b981" 
                  stackId={chartType === 'stacked' ? 'a' : undefined} 
                  radius={chartType === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="pending" 
                  name="Pending" 
                  fill="#3b82f6" 
                  stackId={chartType === 'stacked' ? 'a' : undefined} 
                  radius={chartType === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="overdue" 
                  name="Overdue" 
                  fill="#f43f5e" 
                  stackId={chartType === 'stacked' ? 'a' : undefined} 
                  radius={chartType === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Operational Category Distribution Donut Chart */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-600" />
              <span>Category Distribution</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Breakdown by amenity lock, closure & audit types
            </p>
          </div>

          <div className="w-full h-56 sm:h-64 relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="total"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={PIE_COLORS[index % PIE_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const percent = kpiStats.totalConfigured > 0 
                        ? Math.round((data.total / kpiStats.totalConfigured) * 100) 
                        : 0;
                      return (
                        <div className="bg-slate-950 text-white p-2.5 rounded-xl shadow-xl border border-slate-800 text-xs">
                          <p className="font-bold text-slate-200">{data.name}</p>
                          <p className="text-blue-400 font-mono mt-0.5">
                            {data.total} tasks ({percent}%)
                          </p>
                          <p className="text-emerald-400 text-[10px] mt-0.5">
                            {data.completed} completed / {data.pending} pending
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {kpiStats.totalConfigured}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Tasks
              </span>
            </div>
          </div>

          {/* Category Mini Legend List */}
          <div className="grid grid-cols-2 gap-1.5 text-xs pt-2 border-t border-slate-100 dark:border-slate-800 max-h-32 overflow-y-auto no-scrollbar">
            {categoryChartData.map((cat, idx) => (
              <button
                key={cat.category}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === cat.category ? 'all' : cat.category)}
                className={`flex items-center gap-1.5 p-1 rounded-lg text-left transition-colors cursor-pointer ${
                  selectedCategory === cat.category 
                    ? 'bg-purple-100 dark:bg-purple-950/60 font-bold text-purple-900 dark:text-purple-200' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} 
                />
                <span className="truncate text-[11px]">{cat.name}</span>
                <span className="ml-auto font-mono text-[10px] text-slate-400">{cat.total}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Analytics Row: Priority & Hourly Schedule Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Priority Breakdown Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Priority & SLA Fulfillment</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fulfillment rates across Mandatory vs Priority vs Routine tasks
            </p>
          </div>

          <div className="space-y-4">
            {priorityChartData.map((p) => {
              const compPercent = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
              const isMandatory = p.name === 'Mandatory SLA';
              return (
                <div key={p.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={`flex items-center gap-1.5 ${isMandatory ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {isMandatory && <Flame className="w-3.5 h-3.5" />}
                      <span>{p.name}</span>
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {p.completed} / {p.total} ({compPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full transition-all ${
                        isMandatory 
                          ? 'bg-rose-500' 
                          : p.name === 'High Priority' 
                          ? 'bg-amber-500' 
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${compPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Mandatory SLA closures (e.g. pool padlocks, hazmat locks, concourse grilles) trigger push alerts and require geofence GPS proof.
            </p>
          </div>
        </div>

        {/* 24-Hour Timeline Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>24-Hour Scheduled Task Distribution</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peak task windows across evening closures and morning handoffs
              </p>
            </div>
            <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
              Live Day View
            </span>
          </div>

          <div className="w-full h-52 sm:h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={hourlyScheduleData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950 text-white p-2.5 rounded-xl shadow-xl border border-slate-800 text-xs">
                          <p className="font-extrabold text-blue-400 mb-1">Window: {label}</p>
                          <div className="space-y-0.5 font-mono">
                            <p className="text-emerald-400">Completed: {payload[0]?.value || 0}</p>
                            <p className="text-blue-400">Pending: {payload[1]?.value || 0}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  name="Completed" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorCompleted)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="pending" 
                  name="Pending" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorPending)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="site-task-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, sites, zones, or instructions..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Site Filter */}
            <select
              id="site-task-filter-site"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Sites ({sitesList.length})</option>
              {sitesList
                .filter((s) => s.timeSpecificTasks && s.timeSpecificTasks.length > 0)
                .map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.timeSpecificTasks?.length || 0} tasks)
                  </option>
                ))}
            </select>

            {/* Category Filter */}
            <select
              id="site-task-filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              id="site-task-filter-priority"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="mandatory_sla">Mandatory SLA</option>
              <option value="priority">High Priority</option>
              <option value="routine">Routine SOP</option>
            </select>

            {/* Reset Button */}
            {(selectedSiteId !== 'all' || selectedCategory !== 'all' || selectedPriority !== 'all' || selectedStatus !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSiteId('all');
                  setSelectedCategory('all');
                  setSelectedPriority('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                }}
                className="px-2.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Quick Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Status:
          </span>
          {[
            { key: 'all', label: 'All Tasks', count: allTasks.length },
            { key: 'completed', label: 'Completed', count: kpiStats.completedCount },
            { key: 'pending', label: 'Pending', count: kpiStats.pendingCount },
            { key: 'due_now', label: 'Due Window', count: kpiStats.dueNowCount },
            { key: 'overdue', label: 'Overdue', count: kpiStats.overdueCount },
            { key: 'flagged', label: 'Flagged Issues', count: kpiStats.flaggedCount }
          ].map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setSelectedStatus(chip.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                selectedStatus === chip.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{chip.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                selectedStatus === chip.key ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {chip.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Task Matrix & Operational Board List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              Site Post Orders & Task Schedule
            </h3>
            <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          <div className="text-xs text-slate-400">
            Showing tasks matching active filters
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <CheckSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No site tasks match the selected filters
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Try adjusting your search query, site selection, or priority filter to view other post order tasks.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTasks.map((task) => {
              const statusInfo = taskStatusMap.get(task.id);
              const isCompleted = statusInfo?.status.startsWith('completed');
              const isFlagged = statusInfo?.status === 'completed_flagged';
              const isOverdue = statusInfo?.status === 'overdue';
              const isDueNow = statusInfo?.status === 'due_now';
              const log = statusInfo?.log;
              const catConfig = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.other;
              const CatIcon = catConfig.icon;

              return (
                <div 
                  key={task.id}
                  id={`site-task-card-${task.id}`}
                  className={`p-4 sm:p-5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isOverdue ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                  }`}
                >
                  {/* Left Column: Task & Site Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 ${catConfig.bg} ${catConfig.text}`}>
                      <CatIcon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Top Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>{task.siteName || task.site.name}</span>
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catConfig.bg} ${catConfig.text}`}>
                          {catConfig.label}
                        </span>

                        {task.priority === 'mandatory_sla' && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5" />
                            <span>Mandatory SLA</span>
                          </span>
                        )}

                        {task.priority === 'priority' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            High Priority
                          </span>
                        )}

                        {task.requirePhoto && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-slate-500" />
                            <span>Photo</span>
                          </span>
                        )}

                        {task.requireGps && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>GPS</span>
                          </span>
                        )}
                      </div>

                      {/* Title & Location */}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {task.title}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{task.locationZone}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400">
                          <Clock className="w-3 h-3" />
                          <span>Due {task.scheduledTime}</span>
                        </span>
                        <span>•</span>
                        <span>Lead: {task.leadTimeMinutes}m / Grace: {task.gracePeriodMinutes}m</span>
                      </div>

                      {/* Instructions */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 pt-0.5">
                        {task.instructions}
                      </p>

                      {/* Completion Log Evidence (if completed) */}
                      {log && (
                        <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                              <User className="w-3.5 h-3.5 text-blue-500" />
                              <span>{log.guardName} ({log.guardBadge})</span>
                            </div>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                              {new Date(log.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {log.completedWithinSla && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                                Within SLA
                              </span>
                            )}
                          </div>

                          {log.notes && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic truncate max-w-md">
                              "{log.notes}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Status & Actions */}
                  <div className="flex sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between lg:justify-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    {/* Status Badge */}
                    {isCompleted ? (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        isFlagged 
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' 
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isFlagged ? 'Flagged Issue' : 'Completed & Verified'}</span>
                      </div>
                    ) : isOverdue ? (
                      <div className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Overdue</span>
                      </div>
                    ) : isDueNow ? (
                      <div className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Due Window Active</span>
                      </div>
                    ) : (
                      <div className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending Scheduled</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenManualModal(task)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Manually verify task or log supervisor exception"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span>{isCompleted ? 'Update Log' : 'Verify'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          triggerTestTaskAlert(task);
                          showToast('Alert Triggered', `Sent test alert for "${task.title}".`, 'info');
                        }}
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-600 dark:text-slate-300 hover:text-amber-700 rounded-lg transition-colors cursor-pointer"
                        title="Simulate push alert to guards"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>

                      {onNavigateToSiteDirectory && (
                        <button
                          type="button"
                          onClick={() => onNavigateToSiteDirectory(task.siteId)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950/60 text-slate-600 dark:text-slate-300 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                          title="View site details in Site Directory"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Dispatch Verification / Exception Logging Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Manual Task Verification
                  </h3>
                  <p className="text-xs text-slate-500">
                    Log dispatcher verification or record site exception
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitManualVerification} className="space-y-3.5">
              {/* Task Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Scheduled Task
                </label>
                <select
                  value={manualTaskId}
                  onChange={(e) => {
                    setManualTaskId(e.target.value);
                    const t = allTasks.find(x => x.id === e.target.value);
                    if (t) setManualSiteId(t.siteId);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {allTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.siteName || t.site.name} • {t.title} ({t.scheduledTime})
                    </option>
                  ))}
                </select>
              </div>

              {/* Guard Assignment / Dispatcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Verifying Officer / Dispatcher
                </label>
                <select
                  value={manualGuardId}
                  onChange={(e) => setManualGuardId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {guardsList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.badgeNumber}) - {g.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Verification Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Verification Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'verified', label: 'Verified Complete', icon: CheckCircle2, color: 'text-emerald-600' },
                    { key: 'completed', label: 'Completed (Standard)', icon: Check, color: 'text-blue-600' },
                    { key: 'flagged_issue', label: 'Flagged with Issue', icon: AlertTriangle, color: 'text-amber-600' },
                    { key: 'exception_logged', label: 'Client Exception', icon: FileText, color: 'text-purple-600' }
                  ].map((s) => {
                    const SIcon = s.icon;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setManualStatus(s.key as any)}
                        className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          manualStatus === s.key
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <SIcon className={`w-3.5 h-3.5 ${s.color}`} />
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Supervisor Notes & Verification Details
                </label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g., Gate padlock physically verified engaged at 21:05. CCTV review confirmed no unauthorized access."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Commit Verification Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
