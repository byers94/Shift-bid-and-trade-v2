import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { GuardProfile, TrainingStatus } from '../../types/shift';
import { SiteQualificationCircle } from './SiteQualificationCircle';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Check, 
  X, 
  Search, 
  Filter, 
  ArrowRightLeft, 
  Calendar, 
  Clock, 
  Edit3, 
  Trash2, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  ExternalLink, 
  FileText, 
  Sparkles, 
  LayoutGrid, 
  List, 
  RefreshCw, 
  AlertCircle, 
  MessageSquare, 
  Send, 
  Zap, 
  BookOpen,
  Info,
  TrendingUp,
  Trophy
} from 'lucide-react';

interface GuardDirectoryProps {
  onSelectGuardForSwap?: (guardId: string) => void;
  onNavigateToTrades?: () => void;
  onNavigateToLeaderboard?: () => void;
}

export const GuardDirectory: React.FC<GuardDirectoryProps> = ({
  onSelectGuardForSwap,
  onNavigateToTrades,
  onNavigateToLeaderboard
}) => {
  const { 
    guardsList, 
    shifts, 
    trades, 
    bids, 
    addGuard, 
    updateGuard, 
    deleteGuard 
  } = useShiftOps();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [trainingFilter, setTrainingFilter] = useState<'all' | 'trained' | 'needs_ojt' | 'lead_certified'>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'guard' | 'lead' | 'supervisor'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Interactive Swap Eligibility Matrix Tool Modal state
  const [isSwapCheckerOpen, setIsSwapCheckerOpen] = useState(false);
  const [checkerGuardAId, setCheckerGuardAId] = useState<string>('');
  const [checkerGuardBId, setCheckerGuardBId] = useState<string>('');
  const [checkerSiteA, setCheckerSiteA] = useState<string>('');
  const [checkerSiteB, setCheckerSiteB] = useState<string>('');

  // Guard Edit/Create Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGuardId, setEditingGuardId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'guard' | 'lead' | 'supervisor'>('guard');
  const [formTrainingLevel, setFormTrainingLevel] = useState<'trained' | 'needs_ojt' | 'lead_certified'>('trained');
  const [formOjtSites, setFormOjtSites] = useState<string[]>([]);
  const [formCertifications, setFormCertifications] = useState<string[]>([]);
  const [newSiteInput, setNewSiteInput] = useState('');
  const [newCertInput, setNewCertInput] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Delete Confirmation state
  const [deleteConfirmGuard, setDeleteConfirmGuard] = useState<GuardProfile | null>(null);

  // Quick Site Add Popover state per guard
  const [quickSiteAddGuardId, setQuickSiteAddGuardId] = useState<string | null>(null);
  const [selectedQuickSite, setSelectedQuickSite] = useState<string>('');

  // Extract all known facilities / sites across shifts & existing guards
  const allFacilities = useMemo(() => {
    const siteSet = new Set<string>();
    shifts.forEach((s) => {
      if (s.siteName) siteSet.add(s.siteName);
    });
    guardsList.forEach((g) => {
      g.ojtSites?.forEach((site) => siteSet.add(site));
    });
    // Default regional sites
    [
      'Port Authority - Pier 7',
      'Corporate HQ',
      'West Medical Center',
      'City Airport Gate 4',
      'Retail Plaza',
      'Tech Campus North',
      'Hotel Lobby',
      'Industrial Warehouse',
      'Downtown Financial Center'
    ].forEach((s) => siteSet.add(s));
    return Array.from(siteSet).sort();
  }, [shifts, guardsList]);

  // Common Certifications List
  const commonCertifications = [
    'TWIC Card',
    'Armed Endorsement',
    'CPR/AED',
    'TSA Screener',
    'SIDA Badge',
    'CCTV Monitoring',
    'Guard Card',
    'First Aid',
    'Secret Clearance',
    'Biometric Systems',
    'Level 2 Baton',
    'Incident Command'
  ];

  // Filtered Guards
  const filteredGuards = useMemo(() => {
    return guardsList.filter((guard) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = guard.name.toLowerCase().includes(q);
        const matchesBadge = guard.badgeNumber.toLowerCase().includes(q);
        const matchesPhone = guard.phone.toLowerCase().includes(q);
        const matchesEmail = guard.email?.toLowerCase().includes(q);
        const matchesSites = guard.ojtSites?.some((s) => s.toLowerCase().includes(q));
        const matchesCerts = guard.certifications?.some((c) => c.toLowerCase().includes(q));
        if (!matchesName && !matchesBadge && !matchesPhone && !matchesEmail && !matchesSites && !matchesCerts) {
          return false;
        }
      }

      // 2. Training Level Filter
      if (trainingFilter !== 'all') {
        const level = guard.trainingLevel || (guard.ojtSites && guard.ojtSites.length > 1 ? 'trained' : 'needs_ojt');
        if (trainingFilter === 'trained' && level !== 'trained') return false;
        if (trainingFilter === 'needs_ojt' && level !== 'needs_ojt') return false;
        if (trainingFilter === 'lead_certified' && level !== 'lead_certified') return false;
      }

      // 3. Site Filter
      if (siteFilter !== 'all') {
        if (!guard.ojtSites?.includes(siteFilter)) return false;
      }

      // 4. Role Filter
      if (roleFilter !== 'all') {
        if (guard.role !== roleFilter) return false;
      }

      return true;
    });
  }, [guardsList, searchQuery, trainingFilter, siteFilter, roleFilter]);

  // Statistics
  const totalGuards = guardsList.length;
  const trainedCount = guardsList.filter((g) => (g.trainingLevel === 'trained' || (!g.trainingLevel && g.ojtSites.length > 1))).length;
  const needsOjtCount = guardsList.filter((g) => (g.trainingLevel === 'needs_ojt' || (!g.trainingLevel && g.ojtSites.length <= 1))).length;
  const leadCount = guardsList.filter((g) => g.trainingLevel === 'lead_certified' || g.role === 'lead' || g.role === 'supervisor').length;
  const totalFleetClearances = guardsList.reduce((acc, g) => acc + (g.ojtSites?.length || 0), 0);
  const maxPossibleClearances = Math.max(1, totalGuards * allFacilities.length);
  const avgFleetQualificationPct = Math.round((totalFleetClearances / maxPossibleClearances) * 100);

  // Open Form to Add New Guard
  const handleOpenAddGuard = () => {
    setEditingGuardId(null);
    setFormName('');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setFormBadge(`SEC-${randomNum}`);
    setFormPhone('+1 (555) ' + Math.floor(100 + Math.random() * 900) + '-' + Math.floor(1000 + Math.random() * 9000));
    setFormEmail('');
    setFormRole('guard');
    setFormTrainingLevel('trained');
    setFormOjtSites(['Corporate HQ', 'Retail Plaza']);
    setFormCertifications(['Guard Card', 'CPR/AED']);
    setFormNotes('');
    setNewSiteInput('');
    setNewCertInput('');
    setIsEditModalOpen(true);
  };

  // Open Form to Edit Guard
  const handleOpenEditGuard = (guard: GuardProfile) => {
    setEditingGuardId(guard.id);
    setFormName(guard.name);
    setFormBadge(guard.badgeNumber);
    setFormPhone(guard.phone);
    setFormEmail(guard.email || '');
    setFormRole(guard.role || 'guard');
    setFormTrainingLevel(guard.trainingLevel || (guard.ojtSites.length > 1 ? 'trained' : 'needs_ojt'));
    setFormOjtSites(guard.ojtSites || []);
    setFormCertifications(guard.certifications || ['Guard Card']);
    setFormNotes(guard.notes || '');
    setNewSiteInput('');
    setNewCertInput('');
    setIsEditModalOpen(true);
  };

  // Save Guard Form
  const handleSaveGuardForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBadge.trim() || !formPhone.trim()) return;

    if (editingGuardId) {
      updateGuard(editingGuardId, {
        name: formName.trim(),
        badgeNumber: formBadge.trim().toUpperCase(),
        phone: formPhone.trim(),
        email: formEmail.trim() || undefined,
        role: formRole,
        trainingLevel: formTrainingLevel,
        ojtSites: formOjtSites,
        certifications: formCertifications,
        notes: formNotes.trim() || undefined
      });
    } else {
      addGuard({
        name: formName.trim(),
        badgeNumber: formBadge.trim().toUpperCase(),
        phone: formPhone.trim(),
        email: formEmail.trim() || undefined,
        role: formRole,
        trainingLevel: formTrainingLevel,
        ojtSites: formOjtSites,
        certifications: formCertifications,
        notes: formNotes.trim() || undefined
      });
    }

    setIsEditModalOpen(false);
    setEditingGuardId(null);
  };

  // Quick Site Add handler
  const handleQuickAddSite = (guardId: string, siteName: string) => {
    if (!siteName) return;
    const target = guardsList.find((g) => g.id === guardId);
    if (!target) return;
    if (target.ojtSites.includes(siteName)) return;

    const updatedSites = [...target.ojtSites, siteName];
    updateGuard(guardId, {
      ojtSites: updatedSites,
      // If guard had only 1 site before, upgrading to 2+ marks as trained
      trainingLevel: target.trainingLevel === 'needs_ojt' && updatedSites.length >= 2 ? 'trained' : target.trainingLevel
    });
    setQuickSiteAddGuardId(null);
    setSelectedQuickSite('');
  };

  // Quick Site Remove handler
  const handleQuickRemoveSite = (guardId: string, siteName: string) => {
    const target = guardsList.find((g) => g.id === guardId);
    if (!target) return;
    const updatedSites = target.ojtSites.filter((s) => s !== siteName);
    updateGuard(guardId, {
      ojtSites: updatedSites,
      trainingLevel: updatedSites.length <= 1 && target.trainingLevel !== 'lead_certified' ? 'needs_ojt' : target.trainingLevel
    });
  };

  // Quick Training Level Toggle
  const handleToggleTrainingLevel = (guardId: string, newLevel: 'trained' | 'needs_ojt' | 'lead_certified') => {
    updateGuard(guardId, { trainingLevel: newLevel });
  };

  // Helper to render Training Level Badge
  const renderTrainingBadge = (guard: GuardProfile) => {
    const level = guard.trainingLevel || (guard.ojtSites && guard.ojtSites.length > 1 ? 'trained' : 'needs_ojt');

    if (level === 'lead_certified' || guard.role === 'lead' || guard.role === 'supervisor') {
      return (
        <span 
          id={`guard-training-badge-${guard.id}`}
          className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-300 text-[11px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider"
          title="Lead Certified: Authorized to supervise sites and conduct OJT sign-offs"
        >
          <Award className="w-3 h-3 text-purple-700" />
          <span>Lead / Certified</span>
        </span>
      );
    }

    if (level === 'trained') {
      return (
        <span 
          id={`guard-training-badge-${guard.id}`}
          className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider"
          title="Trained: Fully qualified with confirmed site orientation"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
          <span>Trained & Site-Qualified</span>
        </span>
      );
    }

    return (
      <span 
        id={`guard-training-badge-${guard.id}`}
        className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider"
        title="Needs OJT: Requires site briefing before unsupervised deployment or swap approval"
      >
        <AlertTriangle className="w-3 h-3 text-amber-700" />
        <span>Needs Site OJT</span>
      </span>
    );
  };

  // Helper to render Role Badge
  const renderRoleBadge = (role: GuardProfile['role']) => {
    switch (role) {
      case 'supervisor':
        return <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Supervisor</span>;
      case 'lead':
        return <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Field Lead</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Security Guard</span>;
    }
  };

  // Helper to count active assigned shifts for a guard
  const getAssignedShiftsCount = (guardName: string) => {
    return shifts.filter((s) => s.assignedGuardName === guardName && s.status === 'filled').length;
  };

  // Helper to count active bids for a guard
  const getActiveBidsCount = (guardName: string) => {
    return bids.filter((b) => b.guardName === guardName).length;
  };

  // Swap Compatibility Evaluation Logic
  const guardA = guardsList.find((g) => g.id === checkerGuardAId);
  const guardB = guardsList.find((g) => g.id === checkerGuardBId);

  const isGuardATrainedOnSiteB = useMemo(() => {
    if (!guardA || !checkerSiteB) return false;
    return guardA.ojtSites?.includes(checkerSiteB) || guardA.trainingLevel === 'lead_certified';
  }, [guardA, checkerSiteB]);

  const isGuardBTrainedOnSiteA = useMemo(() => {
    if (!guardB || !checkerSiteA) return false;
    return guardB.ojtSites?.includes(checkerSiteA) || guardB.trainingLevel === 'lead_certified';
  }, [guardB, checkerSiteA]);

  return (
    <div id="guard-directory-component" className="flex flex-col gap-4 w-full">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[#1e3a8a] shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base lg:text-lg font-black text-slate-900 tracking-tight uppercase">
                Guard Directory & Training Registry
              </h2>
              <span className="bg-[#1e3a8a] text-white text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                {totalGuards} Guards
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified security officer contact register, facility clearances, and training levels (Trained vs. Needs OJT) for confident swap approvals.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onNavigateToLeaderboard && (
            <button
              id="directory-open-leaderboard-btn"
              type="button"
              onClick={onNavigateToLeaderboard}
              className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="View Top Performers Leaderboard, Shift Fulfillments, and Site Evaluations"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Top Performers</span>
            </button>
          )}

          <button
            id="open-swap-eligibility-checker-btn"
            type="button"
            onClick={() => {
              // Pre-select first two guards if available
              if (guardsList.length >= 2) {
                setCheckerGuardAId(guardsList[0].id);
                setCheckerGuardBId(guardsList[1].id);
                setCheckerSiteA(guardsList[0].ojtSites[0] || 'Port Authority - Pier 7');
                setCheckerSiteB(guardsList[1].ojtSites[0] || 'Corporate HQ');
              }
              setIsSwapCheckerOpen(true);
            }}
            className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Evaluate whether two guards are trained to swap shifts at their respective sites"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700" />
            <span>Check Swap Eligibility</span>
          </button>

          <button
            id="add-new-guard-btn"
            type="button"
            onClick={handleOpenAddGuard}
            className="bg-[#1e3a8a] hover:bg-blue-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Security Guard</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Active Roster</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black font-mono text-slate-800">{totalGuards}</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-bold">100% Active</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{totalFleetClearances} Total Clearances</p>
          </div>
          <SiteQualificationCircle
            id="fleet-avg-qualification-indicator"
            qualifiedSitesCount={totalFleetClearances}
            totalSitesCount={maxPossibleClearances}
            size="sm"
          />
        </div>

        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 shadow-2xs">
          <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Trained & Qualified
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black font-mono text-emerald-900">{trainedCount}</span>
            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold">
              {Math.round((trainedCount / (totalGuards || 1)) * 100)}% of Roster
            </span>
          </div>
          <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Multi-Facility Ready</p>
        </div>

        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 shadow-2xs">
          <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Needs Site OJT
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black font-mono text-amber-900">{needsOjtCount}</span>
            <span className="text-[10px] bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded font-bold">Orientation Req.</span>
          </div>
          <p className="text-[10px] text-amber-700 font-medium mt-0.5">Single / No Clearance</p>
        </div>

        <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 shadow-2xs">
          <p className="text-[10px] text-purple-800 font-bold uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3 h-3 text-purple-600" />
            Lead / Supervisors
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black font-mono text-purple-900">{leadCount}</span>
            <span className="text-[10px] bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded font-bold">OJT Sign-Off</span>
          </div>
          <p className="text-[10px] text-purple-700 font-medium mt-0.5">Field Authority</p>
        </div>
      </div>

      {/* Search, Filter Toolbar & View Toggle */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="guard-directory-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by guard name, badge #, phone, site clearance, certification..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-slate-50/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              id="view-mode-grid-btn"
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#1e3a8a] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              id="view-mode-table-btn"
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#1e3a8a] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>

        {/* Filter Pills & Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              Filter:
            </span>

            {/* Training Level Filter */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTrainingFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  trainingFilter === 'all'
                    ? 'bg-[#1e3a8a] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Training ({guardsList.length})
              </button>
              <button
                type="button"
                onClick={() => setTrainingFilter('trained')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  trainingFilter === 'trained'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Trained ({trainedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setTrainingFilter('needs_ojt')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  trainingFilter === 'needs_ojt'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Needs OJT ({needsOjtCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setTrainingFilter('lead_certified')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  trainingFilter === 'lead_certified'
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
                }`}
              >
                <Award className="w-3 h-3" />
                <span>Lead Certified ({leadCount})</span>
              </button>
            </div>

            {/* Site Clearance Dropdown Filter */}
            <div className="flex items-center gap-1.5 ml-1">
              <label className="text-[11px] font-bold text-slate-500">Site Clearance:</label>
              <select
                id="filter-guard-site-select"
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white font-medium text-slate-800 focus:ring-1 focus:ring-[#1e3a8a]"
              >
                <option value="all">All Facilities ({allFacilities.length} Sites)</option>
                {allFacilities.map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-500">Role:</label>
              <select
                id="filter-guard-role-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white font-medium text-slate-800 focus:ring-1 focus:ring-[#1e3a8a]"
              >
                <option value="all">All Roles</option>
                <option value="guard">Security Guard</option>
                <option value="lead">Shift Lead</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
          </div>

          {/* Results count & Clear All Filter link */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">
              Showing <strong>{filteredGuards.length}</strong> of {guardsList.length} guards
            </span>
            {(searchQuery || trainingFilter !== 'all' || siteFilter !== 'all' || roleFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setTrainingFilter('all');
                  setSiteFilter('all');
                  setRoleFilter('all');
                }}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Guard Listing Display */}
      {filteredGuards.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No Guard Records Match Your Criteria</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Try adjusting your search query, clearing your facility filter, or adding a new security guard to the system.
          </p>
          <button
            type="button"
            onClick={handleOpenAddGuard}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1e3a8a] text-white text-xs font-bold hover:bg-blue-900 shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register New Guard</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGuards.map((guard) => {
            const assignedCount = getAssignedShiftsCount(guard.name);
            const activeBidCount = getActiveBidsCount(guard.name);
            const level = guard.trainingLevel || (guard.ojtSites.length > 1 ? 'trained' : 'needs_ojt');

            return (
              <div
                key={guard.id}
                id={`guard-card-${guard.id}`}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Guard Initials Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#1e3a8a] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {guard.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-sm text-slate-900 truncate">
                          {guard.name}
                        </h3>
                        {renderRoleBadge(guard.role)}
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        Badge: <span className="font-bold text-slate-700">{guard.badgeNumber}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions Dropdown / Edit */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      id={`edit-guard-btn-${guard.id}`}
                      type="button"
                      onClick={() => handleOpenEditGuard(guard)}
                      className="p-1.5 text-slate-400 hover:text-[#1e3a8a] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      title="Edit Guard Profile & Training"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-guard-btn-${guard.id}`}
                      type="button"
                      onClick={() => setDeleteConfirmGuard(guard)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      title="Remove Guard from Roster"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  {/* Training Status & Site Qualification Circular Progress Panel */}
                  <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <SiteQualificationCircle
                        id={`guard-card-qual-circle-${guard.id}`}
                        qualifiedSitesCount={guard.ojtSites?.length || 0}
                        totalSitesCount={allFacilities.length}
                        trainingLevel={guard.trainingLevel}
                        role={guard.role}
                        size="md"
                      />
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Training & Clearance
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {renderTrainingBadge(guard)}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-mono font-bold text-slate-700">
                            {guard.ojtSites?.length || 0} / {allFacilities.length}
                          </span>
                          <span>Facilities Cleared</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Status Switcher */}
                    <div className="relative group shrink-0">
                      <select
                        value={level}
                        onChange={(e) => handleToggleTrainingLevel(guard.id, e.target.value as any)}
                        className="text-[10px] font-bold border border-slate-200 rounded px-1.5 py-1 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs focus:ring-1 focus:ring-[#1e3a8a]"
                        title="Quick change training level"
                      >
                        <option value="trained">Set: Trained</option>
                        <option value="needs_ojt">Set: Needs OJT</option>
                        <option value="lead_certified">Set: Lead Certified</option>
                      </select>
                    </div>
                  </div>

                  {/* Contact Info Row */}
                  <div className="grid grid-cols-1 gap-1.5 bg-slate-50/70 p-2.5 rounded-lg border border-slate-150 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>Phone:</span>
                      </span>
                      <a
                        href={`tel:${guard.phone.replace(/[^0-9+]/g, '')}`}
                        className="font-mono font-bold text-[#1e3a8a] hover:underline"
                      >
                        {guard.phone}
                      </a>
                    </div>
                    {guard.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>Email:</span>
                        </span>
                        <a
                          href={`mailto:${guard.email}`}
                          className="font-medium text-slate-700 hover:text-[#1e3a8a] truncate max-w-[180px]"
                        >
                          {guard.email}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Certified / OJT Sites List */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        Site Qualifications ({guard.ojtSites?.length || 0})
                      </span>
                      
                      {/* Quick Add Site Dropdown */}
                      <div className="relative">
                        {quickSiteAddGuardId === guard.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={selectedQuickSite}
                              onChange={(e) => {
                                handleQuickAddSite(guard.id, e.target.value);
                              }}
                              className="text-[10px] border border-blue-400 rounded px-1.5 py-0.5 bg-blue-50 text-blue-900 font-bold"
                            >
                              <option value="">Select facility to qualify...</option>
                              {allFacilities
                                .filter((f) => !guard.ojtSites?.includes(f))
                                .map((f) => (
                                  <option key={f} value={f}>
                                    + {f}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setQuickSiteAddGuardId(null)}
                              className="text-slate-400 hover:text-slate-600 text-xs p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setQuickSiteAddGuardId(guard.id);
                              setSelectedQuickSite('');
                            }}
                            className="text-[10px] font-bold text-[#1e3a8a] hover:text-blue-900 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Add Site</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-[88px] overflow-y-auto pr-1">
                      {guard.ojtSites && guard.ojtSites.length > 0 ? (
                        guard.ojtSites.map((site) => (
                          <span
                            key={site}
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-950 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded-md group"
                          >
                            <Check className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                            <span className="truncate max-w-[140px]">{site}</span>
                            <button
                              type="button"
                              onClick={() => handleQuickRemoveSite(guard.id, site)}
                              className="text-blue-400 hover:text-red-600 p-0.5 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title={`Revoke qualification for ${site}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-amber-700 italic flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          No facilities registered. Guard cannot be posted until trained.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Certifications Row (if any) */}
                  {guard.certifications && guard.certifications.length > 0 && (
                    <div className="pt-1 border-t border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Credentials & Badging:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {guard.certifications.map((cert) => (
                          <span
                            key={cert}
                            className="bg-slate-100 text-slate-700 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded"
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Guard Notes */}
                  {guard.notes && (
                    <p className="text-[11px] text-slate-500 italic line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                      "{guard.notes}"
                    </p>
                  )}
                </div>

                {/* Card Footer / Operational Action Strip */}
                <div className="bg-slate-50 p-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] text-slate-500 font-medium"
                      title="Active shifts assigned in current schedule"
                    >
                      <strong className="text-slate-800">{assignedCount}</strong> Shifts
                    </span>
                    <span className="text-slate-300">•</span>
                    <span
                      className="text-[10px] text-slate-500 font-medium"
                      title="Active bids submitted"
                    >
                      <strong className="text-slate-800">{activeBidCount}</strong> Bids
                    </span>
                  </div>

                  <button
                    id={`test-swap-with-guard-${guard.id}`}
                    type="button"
                    onClick={() => {
                      setCheckerGuardAId(guard.id);
                      if (guardsList.length > 1) {
                        const otherGuard = guardsList.find((g) => g.id !== guard.id);
                        if (otherGuard) setCheckerGuardBId(otherGuard.id);
                      }
                      setCheckerSiteA(guard.ojtSites[0] || 'Port Authority - Pier 7');
                      setIsSwapCheckerOpen(true);
                    }}
                    className="text-[10px] font-extrabold uppercase text-[#1e3a8a] hover:text-blue-900 bg-white hover:bg-blue-50 border border-blue-200 px-2 py-1 rounded shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-[#1e3a8a]" />
                    <span>Test Swap Fit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Security Officer</th>
                <th className="px-4 py-3">Training Status & Site Qualification</th>
                <th className="px-4 py-3">Contact Details</th>
                <th className="px-4 py-3">Site Qualifications</th>
                <th className="px-4 py-3">Credentials</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGuards.map((guard) => {
                const assignedCount = getAssignedShiftsCount(guard.name);
                const level = guard.trainingLevel || (guard.ojtSites.length > 1 ? 'trained' : 'needs_ojt');

                return (
                  <tr
                    key={guard.id}
                    id={`guard-row-${guard.id}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Guard Name & Role */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1e3a8a] text-white font-black text-xs flex items-center justify-center shrink-0">
                          {guard.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{guard.name}</span>
                            {renderRoleBadge(guard.role)}
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">
                            {guard.badgeNumber}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Training Level with Circular Progress Indicator */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <SiteQualificationCircle
                          id={`guard-table-qual-circle-${guard.id}`}
                          qualifiedSitesCount={guard.ojtSites?.length || 0}
                          totalSitesCount={allFacilities.length}
                          trainingLevel={guard.trainingLevel}
                          role={guard.role}
                          size="sm"
                        />
                        <div className="flex flex-col gap-1 items-start">
                          {renderTrainingBadge(guard)}
                          <span className="text-[10px] text-slate-500 font-mono">
                            {guard.ojtSites?.length || 0} of {allFacilities.length} Facilities ({Math.round(((guard.ojtSites?.length || 0) / Math.max(1, allFacilities.length)) * 100)}%)
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <a
                          href={`tel:${guard.phone.replace(/[^0-9+]/g, '')}`}
                          className="font-mono font-bold text-[#1e3a8a] hover:underline"
                        >
                          {guard.phone}
                        </a>
                        {guard.email && (
                          <span className="text-[10px] text-slate-500 truncate max-w-[160px]">
                            {guard.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Site Qualifications */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {guard.ojtSites && guard.ojtSites.length > 0 ? (
                          guard.ojtSites.map((site) => (
                            <span
                              key={site}
                              className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-semibold px-1.5 py-0.2 rounded"
                            >
                              <Check className="w-2.5 h-2.5 text-blue-600" />
                              <span className="truncate max-w-[120px]">{site}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-amber-700 italic">No facility training</span>
                        )}
                      </div>
                    </td>

                    {/* Certifications */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {guard.certifications && guard.certifications.length > 0 ? (
                          guard.certifications.map((c) => (
                            <span key={c} className="bg-slate-100 text-slate-700 text-[9px] font-mono px-1 py-0.2 rounded">
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Standard Guard Card</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCheckerGuardAId(guard.id);
                            setIsSwapCheckerOpen(true);
                          }}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Evaluate swap qualification"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-amber-700" />
                          <span className="hidden sm:inline">Swap Check</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditGuard(guard)}
                          className="p-1 text-slate-500 hover:text-[#1e3a8a] hover:bg-slate-100 rounded cursor-pointer"
                          title="Edit Guard Profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmGuard(guard)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Delete Guard"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: SWAP ELIGIBILITY & TRAINING CHECKER TOOL */}
      {isSwapCheckerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 lg:p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Swap Eligibility & Training Verifier
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cross-evaluate guard site certifications to confirm if a proposed swap meets post qualification standards.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSwapCheckerOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Matrix Form: 2 Guards and 2 Sites */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              {/* Guard A (Offering Side) */}
              <div className="flex flex-col gap-2.5 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-blue-900 uppercase text-[10px] tracking-wider">
                    Officer 1 (Offering Shift)
                  </span>
                  {guardA && (
                    <div className="flex items-center gap-1.5">
                      <SiteQualificationCircle
                        id="swap-checker-guard-a-circle"
                        qualifiedSitesCount={guardA.ojtSites?.length || 0}
                        totalSitesCount={allFacilities.length}
                        trainingLevel={guardA.trainingLevel}
                        role={guardA.role}
                        size="xs"
                      />
                      {renderTrainingBadge(guardA)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Select Officer 1:
                  </label>
                  <select
                    id="swap-checker-guard-a"
                    value={checkerGuardAId}
                    onChange={(e) => setCheckerGuardAId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-bold text-slate-900 focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="">-- Choose Officer --</option>
                    {guardsList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.badgeNumber}) - {g.ojtSites.length} Sites
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Officer 1's Current Facility Post (Site A):
                  </label>
                  <select
                    id="swap-checker-site-a"
                    value={checkerSiteA}
                    onChange={(e) => setCheckerSiteA(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="">-- Choose Facility --</option>
                    {allFacilities.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {guardA && (
                  <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-150">
                    <span className="font-bold">Registered Clearances:</span>{' '}
                    {guardA.ojtSites.length > 0 ? guardA.ojtSites.join(', ') : 'None'}
                  </div>
                )}
              </div>

              {/* Guard B (Accepting Side) */}
              <div className="flex flex-col gap-2.5 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-blue-900 uppercase text-[10px] tracking-wider">
                    Officer 2 (Proposing Swap)
                  </span>
                  {guardB && (
                    <div className="flex items-center gap-1.5">
                      <SiteQualificationCircle
                        id="swap-checker-guard-b-circle"
                        qualifiedSitesCount={guardB.ojtSites?.length || 0}
                        totalSitesCount={allFacilities.length}
                        trainingLevel={guardB.trainingLevel}
                        role={guardB.role}
                        size="xs"
                      />
                      {renderTrainingBadge(guardB)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Select Officer 2:
                  </label>
                  <select
                    id="swap-checker-guard-b"
                    value={checkerGuardBId}
                    onChange={(e) => setCheckerGuardBId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-bold text-slate-900 focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="">-- Choose Officer --</option>
                    {guardsList.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.badgeNumber}) - {g.ojtSites.length} Sites
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Officer 2's Exchange Facility Post (Site B):
                  </label>
                  <select
                    id="swap-checker-site-b"
                    value={checkerSiteB}
                    onChange={(e) => setCheckerSiteB(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="">-- Choose Facility --</option>
                    {allFacilities.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {guardB && (
                  <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-150">
                    <span className="font-bold">Registered Clearances:</span>{' '}
                    {guardB.ojtSites.length > 0 ? guardB.ojtSites.join(', ') : 'None'}
                  </div>
                )}
              </div>
            </div>

            {/* Live Swap Evaluation Results Box */}
            {guardA && guardB && checkerSiteA && checkerSiteB && (
              <div className="flex flex-col gap-2.5 p-4 rounded-xl border text-xs bg-slate-50">
                <h4 className="font-black text-slate-800 uppercase tracking-tight text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Swap Compatibility Assessment:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Assessment 1: Guard A -> Site B */}
                  <div className={`p-3 rounded-lg border ${
                    isGuardATrainedOnSiteB 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                      : 'bg-red-50 border-red-200 text-red-950'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {isGuardATrainedOnSiteB ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                      <span>{guardA.name} ➔ {checkerSiteB}</span>
                    </div>
                    <p className="text-[11px]">
                      {isGuardATrainedOnSiteB 
                        ? `✅ Fully Trained & Qualified. ${guardA.name} holds active clearance for ${checkerSiteB}.` 
                        : `⚠️ Needs Site OJT. ${guardA.name} has NOT completed orientation for ${checkerSiteB}. Supervisor briefing required.`
                      }
                    </p>
                  </div>

                  {/* Assessment 2: Guard B -> Site A */}
                  <div className={`p-3 rounded-lg border ${
                    isGuardBTrainedOnSiteA 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                      : 'bg-red-50 border-red-200 text-red-950'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {isGuardBTrainedOnSiteA ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                      <span>{guardB.name} ➔ {checkerSiteA}</span>
                    </div>
                    <p className="text-[11px]">
                      {isGuardBTrainedOnSiteA 
                        ? `✅ Fully Trained & Qualified. ${guardB.name} holds active clearance for ${checkerSiteA}.` 
                        : `⚠️ Needs Site OJT. ${guardB.name} has NOT completed orientation for ${checkerSiteA}. Supervisor briefing required.`
                      }
                    </p>
                  </div>
                </div>

                {/* Final Recommendation Box */}
                <div className={`p-3 rounded-lg border mt-1 ${
                  isGuardATrainedOnSiteB && isGuardBTrainedOnSiteA
                    ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                    : 'bg-amber-100/70 border-amber-300 text-amber-950'
                }`}>
                  <p className="font-extrabold uppercase text-[10px] tracking-wider mb-0.5">
                    Ops Dispatcher Recommendation:
                  </p>
                  <p className="text-xs font-semibold">
                    {isGuardATrainedOnSiteB && isGuardBTrainedOnSiteA ? (
                      <span>
                        🟢 <strong>APPROVED FOR IMMEDIATE SWAP:</strong> Both officers are fully qualified on their respective exchange facilities. This swap can be finalized without conditional supervisor shadow shifts.
                      </span>
                    ) : (
                      <span>
                        🟡 <strong>CONDITIONAL / ATTENTION REQUIRED:</strong> At least one officer requires facility OJT. If approved, tag as <em>"Conditional OJT Swap"</em> and schedule a 30-minute pre-shift facility orientation.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              {onNavigateToTrades ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsSwapCheckerOpen(false);
                    onNavigateToTrades();
                  }}
                  className="text-xs text-[#1e3a8a] font-bold hover:underline flex items-center gap-1"
                >
                  <span>Go to Pending Swap Approvals</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setIsSwapCheckerOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close Verifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GUARD CREATE / EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-5 lg:p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#1e3a8a] text-white rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    {editingGuardId ? 'Edit Guard Profile & Qualifications' : 'Register New Security Guard'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set officer credentials, contact information, and verified site training clearances.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveGuardForm} className="flex flex-col gap-3.5 text-xs">
              {/* Row 1: Name & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Guard Full Name *
                  </label>
                  <input
                    id="guard-form-name"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Marcus Wright"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Badge / Security ID # *
                  </label>
                  <input
                    id="guard-form-badge"
                    type="text"
                    required
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value.toUpperCase())}
                    placeholder="e.g. SEC-8842"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-mono font-bold uppercase focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              {/* Row 2: Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Contact Phone (SMS Dispatches) *
                  </label>
                  <input
                    id="guard-form-phone"
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    id="guard-form-email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="officer@secureshift.net"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              {/* Row 3: Role & Training Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Duty Role
                  </label>
                  <select
                    id="guard-form-role"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="guard">Security Guard</option>
                    <option value="lead">Field Lead</option>
                    <option value="supervisor">Shift Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Overall Training Level *
                  </label>
                  <select
                    id="guard-form-training-level"
                    value={formTrainingLevel}
                    onChange={(e) => setFormTrainingLevel(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-bold focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="trained">🟢 Trained & Site-Qualified</option>
                    <option value="needs_ojt">🟡 Needs Site OJT / Orientation</option>
                    <option value="lead_certified">🟣 Lead Certified (All Clearances)</option>
                  </select>
                </div>
              </div>

              {/* OJT Sites Clearances */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                    Site Qualifications (Sites where guard has completed OJT)
                  </label>
                  <SiteQualificationCircle
                    id="guard-form-qual-circle"
                    qualifiedSitesCount={formOjtSites.length}
                    totalSitesCount={allFacilities.length}
                    trainingLevel={formTrainingLevel}
                    role={formRole}
                    size="sm"
                    showFraction
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg min-h-[50px] mb-2">
                  {formOjtSites.map((site) => (
                    <span
                      key={site}
                      className="bg-blue-100 text-blue-900 text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-blue-700" />
                      <span>{site}</span>
                      <button
                        type="button"
                        onClick={() => setFormOjtSites(formOjtSites.filter((s) => s !== site))}
                        className="text-blue-500 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {formOjtSites.length === 0 && (
                    <span className="text-slate-400 italic text-[11px]">No sites selected yet.</span>
                  )}
                </div>

                {/* Quick Add pills from common facilities */}
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-[10px] text-slate-400 font-bold self-center mr-1">Quick Add:</span>
                  {allFacilities
                    .filter((f) => !formOjtSites.includes(f))
                    .slice(0, 6)
                    .map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormOjtSites([...formOjtSites, f])}
                        className="text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 px-2 py-0.5 rounded border border-slate-200 cursor-pointer"
                      >
                        + {f}
                      </button>
                    ))}
                </div>

                {/* Custom Site Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSiteInput}
                    onChange={(e) => setNewSiteInput(e.target.value)}
                    placeholder="Add custom facility name..."
                    className="flex-1 text-xs border border-slate-300 rounded p-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSiteInput.trim() && !formOjtSites.includes(newSiteInput.trim())) {
                        setFormOjtSites([...formOjtSites, newSiteInput.trim()]);
                        setNewSiteInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded border border-slate-300 cursor-pointer"
                  >
                    Add Site
                  </button>
                </div>
              </div>

              {/* Certifications and Badging */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Certifications & Security Endorsements
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {commonCertifications.map((cert) => {
                    const isSelected = formCertifications.includes(cert);
                    return (
                      <button
                        key={cert}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormCertifications(formCertifications.filter((c) => c !== cert));
                          } else {
                            setFormCertifications([...formCertifications, cert]);
                          }
                        }}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {cert}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Guard Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Officer Notes & Briefing Instructions
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Special instructions, facility access notes, or shift preferences..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-guard-form-btn"
                  type="submit"
                  className="px-5 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {editingGuardId ? 'Update Guard Profile' : 'Register Guard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {deleteConfirmGuard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Remove Guard from Roster?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to de-register <strong>{deleteConfirmGuard.name}</strong> ({deleteConfirmGuard.badgeNumber})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmGuard(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-guard-btn"
                type="button"
                onClick={() => {
                  deleteGuard(deleteConfirmGuard.id);
                  setDeleteConfirmGuard(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
              >
                Yes, Remove Guard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
