import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { SiteProfile, SiteCategory, SiteSecurityTier } from '../../types/shift';
import { SiteJsonImportModal } from './SiteJsonImportModal';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  ChevronRight, 
  ExternalLink, 
  FileText, 
  FileCode,
  LayoutGrid, 
  List, 
  Clock, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Check, 
  X, 
  Copy, 
  Users, 
  Award, 
  Sparkles, 
  Zap, 
  Radio, 
  Layers, 
  Calendar, 
  Star, 
  Info,
  Navigation,
  Compass,
  ArrowRight
} from 'lucide-react';

interface SiteDirectoryProps {
  onNavigateToShifts?: (siteName?: string) => void;
  onNavigateToGuards?: (siteName?: string) => void;
  onCreateShiftForSite?: (site: SiteProfile) => void;
}

export const SiteDirectory: React.FC<SiteDirectoryProps> = ({
  onNavigateToShifts,
  onNavigateToGuards,
  onCreateShiftForSite
}) => {
  const { 
    sitesList, 
    guardsList, 
    shifts, 
    siteFeedbacks, 
    addSite, 
    updateSite, 
    deleteSite,
    showToast 
  } = useShiftOps();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isJsonImportModalOpen, setIsJsonImportModalOpen] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [viewingDossierSite, setViewingDossierSite] = useState<SiteProfile | null>(null);
  const [deleteConfirmSite, setDeleteConfirmSite] = useState<SiteProfile | null>(null);
  const [copiedAddressId, setCopiedAddressId] = useState<string | null>(null);

  // Form States
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('WA');
  const [formZip, setFormZip] = useState('');
  const [formZone, setFormZone] = useState('');
  const [formCategory, setFormCategory] = useState<SiteCategory>('corporate');
  const [formSecurityTier, setFormSecurityTier] = useState<SiteSecurityTier>('Tier 2 - Elevated');
  const [formPrimaryContactName, setFormPrimaryContactName] = useState('');
  const [formPrimaryContactPhone, setFormPrimaryContactPhone] = useState('');
  const [formPrimaryContactEmail, setFormPrimaryContactEmail] = useState('');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState('');
  const [formPostInstructions, setFormPostInstructions] = useState('');
  const [formRequiredCertifications, setFormRequiredCertifications] = useState<string[]>([]);
  const [formActivePostsCount, setFormActivePostsCount] = useState<number>(2);
  const [formOjtRequired, setFormOjtRequired] = useState<boolean>(true);
  const [formOperatingHours, setFormOperatingHours] = useState('24/7 Continuous Ops');
  const [formAccessGateNotes, setFormAccessGateNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'maintenance'>('active');
  const [formNotes, setFormNotes] = useState('');
  const [newCertInput, setNewCertInput] = useState('');

  // Certifications Master List
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
    'De-escalation',
    'Crisis Prevention',
    'Hospitality Security',
    'Transit Safety',
    'HAZMAT Level 2',
    'Incident Command',
    'Asset Protection'
  ];

  // Category Configuration Helper
  const getCategoryMeta = (cat: SiteCategory) => {
    switch (cat) {
      case 'maritime':
        return { label: 'Maritime / Port', color: 'text-cyan-700 bg-cyan-50 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800' };
      case 'aviation':
        return { label: 'Aviation / Airport', color: 'text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800' };
      case 'healthcare':
        return { label: 'Healthcare / Hospital', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' };
      case 'corporate':
        return { label: 'Corporate HQ / Office', color: 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800' };
      case 'tech':
        return { label: 'Tech & Data Center', color: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' };
      case 'industrial':
        return { label: 'Industrial & Logistics', color: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' };
      case 'retail':
        return { label: 'Retail & Commercial', color: 'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' };
      case 'public_venue':
        return { label: 'Public Venue & Transit', color: 'text-teal-700 bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800' };
      case 'government':
        return { label: 'Government / Civic', color: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' };
      default:
        return { label: 'Commercial Site', color: 'text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
    }
  };

  const getTierMeta = (tier: SiteSecurityTier) => {
    switch (tier) {
      case 'Tier 4 - Critical Infrastructure':
        return { label: 'Tier 4 • Critical Infrastructure', badge: 'bg-rose-500 text-white', icon: ShieldAlert, border: 'border-rose-300 dark:border-rose-800' };
      case 'Tier 3 - High Security':
        return { label: 'Tier 3 • High Security', badge: 'bg-amber-500 text-white', icon: ShieldAlert, border: 'border-amber-300 dark:border-amber-800' };
      case 'Tier 2 - Elevated':
        return { label: 'Tier 2 • Elevated Security', badge: 'bg-blue-600 text-white', icon: ShieldCheck, border: 'border-blue-300 dark:border-blue-800' };
      case 'Tier 1 - Standard':
      default:
        return { label: 'Tier 1 • Standard Post', badge: 'bg-slate-600 text-white', icon: Shield, border: 'border-slate-200 dark:border-slate-700' };
    }
  };

  // Filtered Sites
  const filteredSites = useMemo(() => {
    return sitesList.filter((site) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = site.name.toLowerCase().includes(q);
        const matchesCode = site.code.toLowerCase().includes(q);
        const matchesAddress = site.address.toLowerCase().includes(q);
        const matchesZone = site.zone?.toLowerCase().includes(q) || false;
        const matchesContact = site.primaryContactName.toLowerCase().includes(q);
        const matchesCerts = site.requiredCertifications.some(c => c.toLowerCase().includes(q));
        if (!matchesName && !matchesCode && !matchesAddress && !matchesZone && !matchesContact && !matchesCerts) {
          return false;
        }
      }

      // 2. Category Filter
      if (categoryFilter !== 'all' && site.category !== categoryFilter) {
        return false;
      }

      // 3. Tier Filter
      if (tierFilter !== 'all' && site.securityTier !== tierFilter) {
        return false;
      }

      // 4. Status Filter
      if (statusFilter !== 'all' && site.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [sitesList, searchQuery, categoryFilter, tierFilter, statusFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = sitesList.length;
    const active = sitesList.filter(s => s.status === 'active').length;
    const tier4Count = sitesList.filter(s => s.securityTier === 'Tier 4 - Critical Infrastructure').length;
    const totalPosts = sitesList.reduce((acc, curr) => acc + (curr.activePostsCount || 1), 0);
    const continuous247 = sitesList.filter(s => s.operatingHours?.includes('24/7')).length;
    return { total, active, tier4Count, totalPosts, continuous247 };
  }, [sitesList]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingSiteId(null);
    setFormName('');
    setFormCode('');
    setFormAddress('');
    setFormCity('Seattle');
    setFormState('WA');
    setFormZip('');
    setFormZone('');
    setFormCategory('corporate');
    setFormSecurityTier('Tier 2 - Elevated');
    setFormPrimaryContactName('');
    setFormPrimaryContactPhone('');
    setFormPrimaryContactEmail('');
    setFormEmergencyPhone('+1 (555) 206-9900');
    setFormPostInstructions('');
    setFormRequiredCertifications(['Guard Card', 'CPR/AED']);
    setFormActivePostsCount(2);
    setFormOjtRequired(true);
    setFormOperatingHours('24/7 Continuous Ops');
    setFormAccessGateNotes('');
    setFormStatus('active');
    setFormNotes('');
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (site: SiteProfile) => {
    setEditingSiteId(site.id);
    setFormName(site.name);
    setFormCode(site.code);
    setFormAddress(site.address);
    setFormCity(site.city);
    setFormState(site.state);
    setFormZip(site.zip);
    setFormZone(site.zone || '');
    setFormCategory(site.category);
    setFormSecurityTier(site.securityTier);
    setFormPrimaryContactName(site.primaryContactName);
    setFormPrimaryContactPhone(site.primaryContactPhone);
    setFormPrimaryContactEmail(site.primaryContactEmail || '');
    setFormEmergencyPhone(site.emergencyPhone);
    setFormPostInstructions(site.postInstructions);
    setFormRequiredCertifications(site.requiredCertifications || []);
    setFormActivePostsCount(site.activePostsCount || 1);
    setFormOjtRequired(site.ojtRequired);
    setFormOperatingHours(site.operatingHours || '24/7 Continuous Ops');
    setFormAccessGateNotes(site.accessGateNotes || '');
    setFormStatus(site.status);
    setFormNotes(site.notes || '');
    setIsEditModalOpen(true);
  };

  // Save Site (Create or Update)
  const handleSaveSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAddress.trim()) {
      showToast('Validation Error', 'Site name and address are required.', 'warning');
      return;
    }

    const payload = {
      name: formName.trim(),
      code: formCode.trim() || formName.trim().substring(0, 4).toUpperCase() + '-01',
      address: formAddress.trim(),
      city: formCity.trim() || 'Seattle',
      state: formState.trim() || 'WA',
      zip: formZip.trim() || '98101',
      zone: formZone.trim() || undefined,
      category: formCategory,
      securityTier: formSecurityTier,
      primaryContactName: formPrimaryContactName.trim() || 'Facility Dispatcher',
      primaryContactPhone: formPrimaryContactPhone.trim() || '+1 (555) 019-9000',
      primaryContactEmail: formPrimaryContactEmail.trim() || undefined,
      emergencyPhone: formEmergencyPhone.trim() || '+1 (555) 911-0000',
      postInstructions: formPostInstructions.trim() || 'Standard post orders apply. Check in with security control upon arrival.',
      requiredCertifications: formRequiredCertifications,
      activePostsCount: Number(formActivePostsCount) || 1,
      ojtRequired: formOjtRequired,
      operatingHours: formOperatingHours.trim() || '24/7 Continuous Ops',
      accessGateNotes: formAccessGateNotes.trim() || undefined,
      status: formStatus,
      notes: formNotes.trim() || undefined
    };

    if (editingSiteId) {
      updateSite(editingSiteId, payload);
    } else {
      addSite(payload);
    }

    setIsEditModalOpen(false);
  };

  // Delete Site
  const handleConfirmDelete = () => {
    if (deleteConfirmSite) {
      deleteSite(deleteConfirmSite.id);
      if (viewingDossierSite?.id === deleteConfirmSite.id) {
        setViewingDossierSite(null);
      }
      setDeleteConfirmSite(null);
    }
  };

  // Copy Address
  const handleCopyAddress = (site: SiteProfile) => {
    navigator.clipboard.writeText(site.address);
    setCopiedAddressId(site.id);
    showToast('Address Copied', `${site.name} address copied to clipboard.`, 'info');
    setTimeout(() => setCopiedAddressId(null), 2000);
  };

  // Helper to count qualified guards for a given site
  const getQualifiedGuardsForSite = (siteName: string) => {
    return guardsList.filter((g) => g.ojtSites?.some(s => s.toLowerCase() === siteName.toLowerCase() || siteName.toLowerCase().includes(s.toLowerCase())));
  };

  // Helper to count active/open shifts for a site
  const getShiftsForSite = (siteName: string) => {
    return shifts.filter((s) => s.siteName.toLowerCase() === siteName.toLowerCase() || siteName.toLowerCase().includes(s.siteName.toLowerCase()));
  };

  // Helper for site reviews
  const getFeedbacksForSite = (siteName: string) => {
    return siteFeedbacks.filter((f) => f.siteName.toLowerCase() === siteName.toLowerCase() || siteName.toLowerCase().includes(f.siteName.toLowerCase()));
  };

  return (
    <div id="site-directory-root" className="space-y-6">
      {/* Top Operations Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-600 text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Facility & Site Directory
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold">
                  {sitesList.length} Verified Facilities
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Centralized registry of authorized deployment posts, security tiers, emergency contacts & post instructions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="btn-open-site-json-import"
            onClick={() => setIsJsonImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Paste or import formatted JSON list of client security facilities"
          >
            <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            JSON Bulk Import
          </button>
          <button
            type="button"
            id="btn-add-new-site"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Facility
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Facilities</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.total}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
            <Check className="w-3 h-3" /> {metrics.active} active in roster
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tier 4 Critical</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.tier4Count}</p>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 mt-0.5">
            <Sparkles className="w-3 h-3" /> Maritime & Airport
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Guard Posts</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.totalPosts}</p>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 mt-0.5">
            Concurrent posts
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">24/7 Operations</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.continuous247}</p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
            Continuous coverage
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Officer Qualifications</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{guardsList.length}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
            Cross-trained fleet
          </span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="input-search-sites"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search site name, code (PORT-P7), address, sector zone, contact or certs..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-2">
            <select
              id="select-tier-filter"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Security Tiers</option>
              <option value="Tier 4 - Critical Infrastructure">Tier 4 - Critical</option>
              <option value="Tier 3 - High Security">Tier 3 - High Security</option>
              <option value="Tier 2 - Elevated">Tier 2 - Elevated</option>
              <option value="Tier 1 - Standard">Tier 1 - Standard</option>
            </select>

            {/* Status Filter */}
            <select
              id="select-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
                title="Dense Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-medium mr-1 shrink-0">Category:</span>
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'maritime', label: 'Maritime / Port' },
            { id: 'aviation', label: 'Aviation / Airport' },
            { id: 'healthcare', label: 'Healthcare' },
            { id: 'corporate', label: 'Corporate HQ' },
            { id: 'tech', label: 'Tech & Data Center' },
            { id: 'industrial', label: 'Industrial & Logistics' },
            { id: 'retail', label: 'Retail Plaza' },
            { id: 'public_venue', label: 'Public Venue & Transit' }
          ].map((cat) => {
            const count = cat.id === 'all' 
              ? sitesList.length 
              : sitesList.filter(s => s.category === cat.id).length;
            const isSelected = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sites Listing View */}
      {filteredSites.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No facilities match your search</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, security tier, or category filters, or register a new facility.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Facility
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSites.map((site) => {
            const catMeta = getCategoryMeta(site.category);
            const tierMeta = getTierMeta(site.securityTier);
            const qualifiedGuards = getQualifiedGuardsForSite(site.name);
            const activeShifts = getShiftsForSite(site.name);
            const isCopied = copiedAddressId === site.id;

            return (
              <div
                key={site.id}
                id={`site-card-${site.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-900 dark:bg-slate-700 text-white tracking-wider">
                            {site.code}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${catMeta.color}`}>
                            {catMeta.label}
                          </span>
                          {site.status !== 'active' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                              {site.status.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                          {site.name}
                        </h2>
                        {site.zone && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                            <Compass className="w-3 h-3 text-blue-500" /> {site.zone}
                          </span>
                        )}
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-1 rounded shadow-xs shrink-0 ${tierMeta.badge}`}>
                        {tierMeta.label.split(' • ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3 text-xs">
                    {/* Address with Copy */}
                    <div className="flex items-start justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-start gap-2 flex-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                          {site.address}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAddress(site)}
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 shrink-0 transition-colors"
                        title="Copy Street Address"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Operational Details */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{site.operatingHours || '24/7 Ops'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{site.activePostsCount || 1} Guard Posts</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`tel:${site.primaryContactPhone}`} className="hover:underline text-blue-600 dark:text-blue-400 truncate">
                          {site.primaryContactPhone}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Radio className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="text-rose-600 dark:text-rose-400 font-semibold truncate">
                          {site.emergencyPhone}
                        </span>
                      </div>
                    </div>

                    {/* Required Certifications Tags */}
                    {site.requiredCertifications && site.requiredCertifications.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                          Mandatory Qualifications:
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {site.requiredCertifications.slice(0, 3).map((cert, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium"
                            >
                              {cert}
                            </span>
                          ))}
                          {site.requiredCertifications.length > 3 && (
                            <span className="text-[10px] text-slate-400 px-1 font-medium">
                              +{site.requiredCertifications.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Post Instructions Snippet */}
                    {site.postInstructions && (
                      <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-lg p-2 text-[11px] text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 mb-0.5">
                          <FileText className="w-3 h-3" /> Post Instructions:
                        </div>
                        <p className="line-clamp-2 text-slate-600 dark:text-slate-300 italic">
                          "{site.postInstructions}"
                        </p>
                      </div>
                    )}

                    {/* Guard Clearance Summary Bar */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span>
                          <strong className="text-slate-900 dark:text-white">{qualifiedGuards.length}</strong> Qualified Guards
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>
                          <strong className="text-slate-900 dark:text-white">{activeShifts.length}</strong> Active Shifts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      id={`btn-view-dossier-${site.id}`}
                      onClick={() => setViewingDossierSite(site)}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Dossier
                    </button>
                    <button
                      type="button"
                      id={`btn-edit-site-${site.id}`}
                      onClick={() => handleOpenEditModal(site)}
                      className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Site Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      id={`btn-delete-site-${site.id}`}
                      onClick={() => setDeleteConfirmSite(site)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Remove Site"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onCreateShiftForSite) {
                        onCreateShiftForSite(site);
                      } else if (onNavigateToShifts) {
                        onNavigateToShifts(site.name);
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs flex items-center gap-1 transition-colors"
                  >
                    <span>Post Shift</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Dense Table View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Code & Name</th>
                  <th className="py-3 px-4">Category & Tier</th>
                  <th className="py-3 px-4">Street Address</th>
                  <th className="py-3 px-4">Primary Contact</th>
                  <th className="py-3 px-4">Emergency Phone</th>
                  <th className="py-3 px-4 text-center">Qualified</th>
                  <th className="py-3 px-4 text-center">Posts</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSites.map((site) => {
                  const catMeta = getCategoryMeta(site.category);
                  const tierMeta = getTierMeta(site.securityTier);
                  const qualifiedGuards = getQualifiedGuardsForSite(site.name);

                  return (
                    <tr 
                      key={site.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-900 dark:bg-slate-700 text-white">
                            {site.code}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {site.name}
                            </span>
                            {site.zone && (
                              <span className="text-[10px] text-slate-400">
                                {site.zone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-block ${catMeta.color}`}>
                            {catMeta.label}
                          </span>
                          <div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block ${tierMeta.badge}`}>
                              {tierMeta.label.split(' • ')[0]}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-slate-700 dark:text-slate-300 line-clamp-1">
                          {site.address}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-900 dark:text-white font-medium">
                          {site.primaryContactName}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {site.primaryContactPhone}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-rose-600 dark:text-rose-400 font-bold font-mono">
                          {site.emergencyPhone}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3 text-blue-500" />
                          {qualifiedGuards.length}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                        {site.activePostsCount || 1}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingDossierSite(site)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors"
                            title="View Facility Dossier"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(site)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Edit Facility"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmSite(site)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                            title="Delete Facility"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Facility Detailed Dossier Modal */}
      {viewingDossierSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Dossier Header Banner */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white rounded-t-2xl relative">
              <button
                type="button"
                onClick={() => setViewingDossierSite(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-blue-500 text-white">
                      {viewingDossierSite.code}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-medium">
                      {getCategoryMeta(viewingDossierSite.category).label}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded font-bold ${getTierMeta(viewingDossierSite.securityTier).badge}`}>
                      {viewingDossierSite.securityTier}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1.5">
                    {viewingDossierSite.name}
                  </h2>
                  <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    {viewingDossierSite.address}
                  </p>
                </div>
              </div>
            </div>

            {/* Dossier Content */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Quick Contact & Dispatch Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Primary Liaison</span>
                  <p className="font-bold text-slate-900 dark:text-white">{viewingDossierSite.primaryContactName}</p>
                  <a href={`tel:${viewingDossierSite.primaryContactPhone}`} className="text-blue-600 dark:text-blue-400 font-medium hover:underline block mt-0.5">
                    {viewingDossierSite.primaryContactPhone}
                  </a>
                  {viewingDossierSite.primaryContactEmail && (
                    <a href={`mailto:${viewingDossierSite.primaryContactEmail}`} className="text-slate-500 hover:underline block text-[11px]">
                      {viewingDossierSite.primaryContactEmail}
                    </a>
                  )}
                </div>

                <div className="bg-rose-50 dark:bg-rose-950/30 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                  <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block mb-1">Emergency Dispatch</span>
                  <p className="font-bold text-rose-700 dark:text-rose-300 text-sm font-mono">{viewingDossierSite.emergencyPhone}</p>
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 block">
                    Direct line to facility security command
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Operating Parameters</span>
                  <p className="font-bold text-slate-900 dark:text-white">{viewingDossierSite.operatingHours || '24/7 Ops'}</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {viewingDossierSite.activePostsCount || 1} concurrent posts • {viewingDossierSite.ojtRequired ? 'OJT Req' : 'Direct deploy'}
                  </p>
                </div>
              </div>

              {/* Standard Post Orders */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Mandatory Post Instructions & Standing Orders
                </h4>
                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  {viewingDossierSite.postInstructions}
                </p>

                {viewingDossierSite.accessGateNotes && (
                  <div className="mt-2 text-xs">
                    <span className="font-bold text-amber-700 dark:text-amber-400">Access Gate & Entry Procedures: </span>
                    <span className="text-slate-600 dark:text-slate-300">{viewingDossierSite.accessGateNotes}</span>
                  </div>
                )}
              </div>

              {/* Required Certifications */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Required Security Credentials & Endorsements
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {viewingDossierSite.requiredCertifications?.map((cert, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-xs flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>

              {/* Qualified Guards for this Site */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Cleared & Qualified Officers ({getQualifiedGuardsForSite(viewingDossierSite.name).length})
                  </h4>
                  {onNavigateToGuards && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewingDossierSite(null);
                        onNavigateToGuards(viewingDossierSite.name);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-medium"
                    >
                      View in Guard Directory &rarr;
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {getQualifiedGuardsForSite(viewingDossierSite.name).map((guard) => (
                    <div
                      key={guard.id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{guard.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{guard.badgeNumber}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                        Cleared
                      </span>
                    </div>
                  ))}
                  {getQualifiedGuardsForSite(viewingDossierSite.name).length === 0 && (
                    <div className="col-span-full p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
                      No officers currently tagged as OJT-cleared for this specific facility. Add site qualification in the Guard Directory.
                    </div>
                  )}
                </div>
              </div>

              {/* Site Feedback & Client Rating */}
              {getFeedbacksForSite(viewingDossierSite.name).length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-2 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    Client Reviews & Site Feedback History
                  </h4>
                  <div className="space-y-2">
                    {getFeedbacksForSite(viewingDossierSite.name).map((fb) => (
                      <div
                        key={fb.id}
                        className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{fb.reviewerName} ({fb.reviewerTitle})</span>
                          <span className="text-amber-600 font-bold flex items-center gap-0.5">
                            ★ {fb.rating.toFixed(1)} / 5.0
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 italic">"{fb.comment}"</p>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>Officer: {fb.guardName}</span>
                          <span>•</span>
                          <span>{fb.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dossier Footer Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const site = viewingDossierSite;
                  setViewingDossierSite(null);
                  handleOpenEditModal(site);
                }}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Edit Facility Specifications
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const site = viewingDossierSite;
                    setViewingDossierSite(null);
                    if (onCreateShiftForSite) {
                      onCreateShiftForSite(site);
                    } else if (onNavigateToShifts) {
                      onNavigateToShifts(site.name);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <span>Create Shift for {viewingDossierSite.code}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Site Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingSiteId ? 'Edit Facility Record' : 'Register New Facility'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Standardize facility parameters, security credentials, and address coordinates.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSite} className="p-5 space-y-4 text-xs">
              {/* Quick Switch to JSON Import Banner */}
              {!editingSiteId && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                    <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>
                      Need to onboard multiple client facilities quickly? Paste a formatted JSON array.
                    </span>
                  </div>
                  <button
                    type="button"
                    id="btn-switch-to-json-import-from-modal"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setIsJsonImportModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
                  >
                    Switch to JSON Import
                  </button>
                </div>
              )}

              {/* Section 1: Facility Identity */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-400">
                  1. Facility Identity & Classification
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Facility Name *
                    </label>
                    <input
                      type="text"
                      id="form-site-name"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Seattle Cruise Terminal - Pier 91"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Site Code (ID)
                    </label>
                    <input
                      type="text"
                      id="form-site-code"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SCT-P91"
                      className="w-full px-3 py-2 font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Industry Category
                    </label>
                    <select
                      id="form-site-category"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as SiteCategory)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="maritime">Maritime / Port</option>
                      <option value="aviation">Aviation / Airport</option>
                      <option value="healthcare">Healthcare / Hospital</option>
                      <option value="corporate">Corporate HQ / Office</option>
                      <option value="tech">Tech & Data Center</option>
                      <option value="industrial">Industrial & Logistics</option>
                      <option value="retail">Retail Plaza</option>
                      <option value="public_venue">Public Venue & Transit</option>
                      <option value="government">Government / Civic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Security Tier
                    </label>
                    <select
                      id="form-site-tier"
                      value={formSecurityTier}
                      onChange={(e) => setFormSecurityTier(e.target.value as SiteSecurityTier)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Tier 1 - Standard">Tier 1 - Standard Post</option>
                      <option value="Tier 2 - Elevated">Tier 2 - Elevated</option>
                      <option value="Tier 3 - High Security">Tier 3 - High Security</option>
                      <option value="Tier 4 - Critical Infrastructure">Tier 4 - Critical Infrastructure</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Operational Status
                    </label>
                    <select
                      id="form-site-status"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active Duty</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inactive">Inactive / Standby</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Physical Address Coordinates */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-400">
                  2. Physical Address Coordinates
                </h4>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    id="form-site-address"
                    required
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="e.g. 2001 W Garfield St, Terminal 91"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="Seattle"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                      placeholder="WA"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={formZip}
                      onChange={(e) => setFormZip(e.target.value)}
                      placeholder="98119"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Zone / District
                    </label>
                    <input
                      type="text"
                      value={formZone}
                      onChange={(e) => setFormZone(e.target.value)}
                      placeholder="e.g. Magnolia Waterfront"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Liaison & Emergency Dispatch */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-400">
                  3. Liaison Contacts & Emergency Dispatch
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Primary Contact Person
                    </label>
                    <input
                      type="text"
                      value={formPrimaryContactName}
                      onChange={(e) => setFormPrimaryContactName(e.target.value)}
                      placeholder="e.g. Capt. Liam Walsh"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Liaison Phone
                    </label>
                    <input
                      type="text"
                      value={formPrimaryContactPhone}
                      onChange={(e) => setFormPrimaryContactPhone(e.target.value)}
                      placeholder="+1 (555) 206-8811"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-rose-600 dark:text-rose-400 font-medium mb-1">
                      Emergency 24/7 Hotline *
                    </label>
                    <input
                      type="text"
                      required
                      value={formEmergencyPhone}
                      onChange={(e) => setFormEmergencyPhone(e.target.value)}
                      placeholder="+1 (555) 206-9911"
                      className="w-full px-3 py-2 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Operational Parameters & Post Instructions */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-400">
                  4. Post Orders & Qualification Rules
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Operating Schedule
                    </label>
                    <input
                      type="text"
                      value={formOperatingHours}
                      onChange={(e) => setFormOperatingHours(e.target.value)}
                      placeholder="e.g. 24/7 Continuous Ops"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Concurrent Guard Posts
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={formActivePostsCount}
                      onChange={(e) => setFormActivePostsCount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formOjtRequired}
                        onChange={(e) => setFormOjtRequired(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">
                        Mandatory Site OJT Clearance
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Standard Post Instructions & Orders *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formPostInstructions}
                    onChange={(e) => setFormPostInstructions(e.target.value)}
                    placeholder="Check in at main security dispatch. Perform perimeter foot sweep every 60 mins. High-visibility vest required in loading docks..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Required Security Certifications & Endorsements
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {commonCertifications.map((cert) => {
                      const isSelected = formRequiredCertifications.includes(cert);
                      return (
                        <button
                          key={cert}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFormRequiredCertifications(formRequiredCertifications.filter(c => c !== cert));
                            } else {
                              setFormRequiredCertifications([...formRequiredCertifications, cert]);
                            }
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{cert}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-facility"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  {editingSiteId ? 'Update Facility' : 'Register Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2.5 bg-rose-100 dark:bg-rose-950/50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Facility Record</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
              Are you sure you want to remove <strong>{deleteConfirmSite.name} ({deleteConfirmSite.code})</strong> from the active site directory? 
              This will decommission the location profile and remove it from standard dispatch dropdowns.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSite(null)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-site"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Bulk Import Modal */}
      <SiteJsonImportModal
        isOpen={isJsonImportModalOpen}
        onClose={() => setIsJsonImportModalOpen(false)}
      />
    </div>
  );
};
