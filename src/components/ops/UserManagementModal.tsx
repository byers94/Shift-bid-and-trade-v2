import React, { useState, useMemo } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { AdminUser, GuardProfile } from '../../types/shift';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  KeyRound, 
  Mail, 
  Phone, 
  Trash2, 
  Edit3, 
  Search, 
  X, 
  Check, 
  AlertCircle, 
  Lock, 
  CheckCircle2, 
  Building2, 
  Plus, 
  MapPin,
  Sparkles,
  UserCheck,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'admins' | 'guards';
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'admins'
}) => {
  const { 
    adminUsers, 
    guardsList, 
    shifts,
    addAdminUser, 
    updateAdminUser, 
    deleteAdminUser,
    addGuard,
    updateGuard,
    deleteGuard
  } = useShiftOps();

  const [activeTab, setActiveTab] = useState<'admins' | 'guards'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Admin form state
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminBadge, setAdminBadge] = useState('');
  const [adminRole, setAdminRole] = useState<'commander' | 'dispatcher' | 'supervisor' | 'lead'>('dispatcher');
  const [adminPin, setAdminPin] = useState('1099');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminStatus, setAdminStatus] = useState<'active' | 'inactive'>('active');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Guard form state
  const [isEditingGuard, setIsEditingGuard] = useState(false);
  const [selectedGuardId, setSelectedGuardId] = useState<string | null>(null);
  const [guardName, setGuardName] = useState('');
  const [guardBadge, setGuardBadge] = useState('');
  const [guardRole, setGuardRole] = useState<'guard' | 'lead' | 'supervisor'>('guard');
  const [guardPhone, setGuardPhone] = useState('');
  const [guardOjtSites, setGuardOjtSites] = useState<string[]>([]);
  const [newSiteInput, setNewSiteInput] = useState('');

  // Confirmation modal for deletion
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'admin' | 'guard'; id: string; name: string } | null>(null);

  // Extract all unique site names across existing shifts to offer quick-add pills
  const availableSites = useMemo(() => {
    const siteSet = new Set<string>();
    shifts.forEach((s) => {
      if (s.siteName) siteSet.add(s.siteName);
    });
    // Add default known sites
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
    return Array.from(siteSet);
  }, [shifts]);

  if (!isOpen) return null;

  // Handlers for Admin
  const handleOpenAddAdmin = () => {
    setIsEditingAdmin(true);
    setSelectedAdminId(null);
    setAdminName('');
    const randomNum = Math.floor(10 + Math.random() * 90);
    setAdminBadge(`OPS-DISP-${randomNum}`);
    setAdminRole('dispatcher');
    setAdminPin(String(Math.floor(1000 + Math.random() * 9000)));
    setAdminEmail('');
    setAdminPhone('');
    setAdminStatus('active');
  };

  const handleOpenEditAdmin = (user: AdminUser) => {
    setIsEditingAdmin(true);
    setSelectedAdminId(user.id);
    setAdminName(user.name);
    setAdminBadge(user.badgeId);
    setAdminRole(user.role);
    setAdminPin(user.pin);
    setAdminEmail(user.email || '');
    setAdminPhone(user.phone || '');
    setAdminStatus(user.status);
  };

  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminBadge.trim() || !adminPin.trim()) return;

    if (selectedAdminId) {
      updateAdminUser(selectedAdminId, {
        name: adminName.trim(),
        badgeId: adminBadge.trim().toUpperCase(),
        role: adminRole,
        pin: adminPin.trim(),
        email: adminEmail.trim(),
        phone: adminPhone.trim(),
        status: adminStatus
      });
    } else {
      addAdminUser({
        name: adminName.trim(),
        badgeId: adminBadge.trim().toUpperCase(),
        role: adminRole,
        pin: adminPin.trim(),
        email: adminEmail.trim(),
        phone: adminPhone.trim(),
        status: adminStatus
      });
    }

    setIsEditingAdmin(false);
    setSelectedAdminId(null);
  };

  // Handlers for Guard
  const handleOpenAddGuard = () => {
    setIsEditingGuard(true);
    setSelectedGuardId(null);
    setGuardName('');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setGuardBadge(`SEC-${randomNum}`);
    setGuardRole('guard');
    setGuardPhone('+1 (555) ' + Math.floor(100 + Math.random() * 900) + '-' + Math.floor(1000 + Math.random() * 9000));
    setGuardOjtSites(['Corporate HQ', 'Retail Plaza']);
    setNewSiteInput('');
  };

  const handleOpenEditGuard = (guard: GuardProfile) => {
    setIsEditingGuard(true);
    setSelectedGuardId(guard.id);
    setGuardName(guard.name);
    setGuardBadge(guard.badgeNumber);
    setGuardRole(guard.role);
    setGuardPhone(guard.phone);
    setGuardOjtSites(guard.ojtSites || []);
    setNewSiteInput('');
  };

  const handleSaveGuard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim() || !guardBadge.trim() || !guardPhone.trim()) return;

    if (selectedGuardId) {
      updateGuard(selectedGuardId, {
        name: guardName.trim(),
        badgeNumber: guardBadge.trim().toUpperCase(),
        role: guardRole,
        phone: guardPhone.trim(),
        ojtSites: guardOjtSites
      });
    } else {
      addGuard({
        name: guardName.trim(),
        badgeNumber: guardBadge.trim().toUpperCase(),
        role: guardRole,
        phone: guardPhone.trim(),
        ojtSites: guardOjtSites
      });
    }

    setIsEditingGuard(false);
    setSelectedGuardId(null);
  };

  const togglePinReveal = (id: string) => {
    setRevealedPins((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filter lists
  const filteredAdmins = adminUsers.filter((user) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(q) ||
      user.badgeId.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q) ||
      (user.email && user.email.toLowerCase().includes(q))
    );
  });

  const filteredGuards = guardsList.filter((guard) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      guard.name.toLowerCase().includes(q) ||
      guard.badgeNumber.toLowerCase().includes(q) ||
      guard.role.toLowerCase().includes(q) ||
      guard.ojtSites.some((s) => s.toLowerCase().includes(q))
    );
  });

  const getRoleBadge = (role: AdminUser['role']) => {
    switch (role) {
      case 'commander':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Commander</span>;
      case 'supervisor':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Supervisor</span>;
      case 'dispatcher':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Dispatcher</span>;
      case 'lead':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Shift Lead</span>;
    }
  };

  return (
    <div 
      id="user-management-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div 
        id="user-management-modal-card"
        className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Navy Header */}
        <div className="bg-[#1e3a8a] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900 rounded-xl border border-blue-700">
              <Users className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-lg tracking-tight">
                  User & Access Management
                </h2>
                <span className="bg-blue-800/80 text-blue-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-blue-700">
                  OPS COMMAND
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5 font-medium">
                Manage supervisor admin credentials, dispatcher PINs, and guard site certifications
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
            title="Close User Management"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Search Navigation Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              id="user-management-tab-admins"
              onClick={() => {
                setActiveTab('admins');
                setIsEditingAdmin(false);
                setIsEditingGuard(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'admins'
                  ? 'bg-[#1e3a8a] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admins & Dispatchers</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'admins' ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {adminUsers.length}
              </span>
            </button>

            <button
              id="user-management-tab-guards"
              onClick={() => {
                setActiveTab('guards');
                setIsEditingAdmin(false);
                setIsEditingGuard(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'guards'
                  ? 'bg-[#1e3a8a] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Guard Personnel</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'guards' ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {guardsList.length}
              </span>
            </button>
          </div>

          {/* Search and Action Button */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder={activeTab === 'admins' ? 'Search admin name, badge, role...' : 'Search guard name, site...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              />
            </div>

            {activeTab === 'admins' ? (
              <button
                id="add-admin-user-btn"
                onClick={handleOpenAddAdmin}
                className="bg-[#1e3a8a] hover:bg-blue-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Admin</span>
              </button>
            ) : (
              <button
                id="add-guard-user-btn"
                onClick={handleOpenAddGuard}
                className="bg-[#1e3a8a] hover:bg-blue-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Guard</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-100/60">
          {/* ===================== TAB 1: ADMINS & DISPATCHERS ===================== */}
          {activeTab === 'admins' && (
            <div className="flex flex-col gap-4">
              {/* Add / Edit Admin Form Modal / Section */}
              {isEditingAdmin && (
                <div className="bg-white border-2 border-blue-300 rounded-xl p-4 sm:p-5 shadow-md animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 text-blue-900 rounded-lg">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">
                        {selectedAdminId ? 'Edit Dispatcher Credentials' : 'Provision New Ops Admin / Dispatcher'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsEditingAdmin(false)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAdmin} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Lt. Mark O'Connor"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#1e3a8a]"
                      />
                    </div>

                    {/* Badge ID */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Badge / Station ID *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. OPS-CMD-01"
                        value={adminBadge}
                        onChange={(e) => setAdminBadge(e.target.value.toUpperCase())}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#1e3a8a]"
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Access Role *
                      </label>
                      <select
                        value={adminRole}
                        onChange={(e) => setAdminRole(e.target.value as any)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#1e3a8a]"
                      >
                        <option value="commander">Operations Commander (Full System Access)</option>
                        <option value="supervisor">Watch Supervisor (Shift & Swap Approvals)</option>
                        <option value="dispatcher">Dispatcher (Daily Scheduling & Bids)</option>
                        <option value="lead">Shift Lead (On-Duty Management)</option>
                      </select>
                    </div>

                    {/* PIN */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase">
                          Login Security PIN *
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">4-6 Digits</span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={8}
                        placeholder="e.g. 1099"
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#1e3a8a]"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="dispatcher@secureshift.ops"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:ring-2 focus:ring-[#1e3a8a]"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Direct Phone / Radio (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="+1 (555) 019-9001"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:ring-2 focus:ring-[#1e3a8a]"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Account Status
                      </label>
                      <div className="flex items-center gap-3 pt-1">
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="admin-status"
                            checked={adminStatus === 'active'}
                            onChange={() => setAdminStatus('active')}
                            className="text-[#1e3a8a] focus:ring-[#1e3a8a]"
                          />
                          <span className="font-bold text-emerald-700">Active</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="admin-status"
                            checked={adminStatus === 'inactive'}
                            onChange={() => setAdminStatus('inactive')}
                            className="text-[#1e3a8a] focus:ring-[#1e3a8a]"
                          />
                          <span className="font-bold text-slate-500">Suspended</span>
                        </label>
                      </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsEditingAdmin(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-[#1e3a8a] hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {selectedAdminId ? 'Save Admin Changes' : 'Create Admin Personnel'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Admin Users Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredAdmins.map((user) => {
                  const isPinRevealed = revealedPins[user.id] || false;
                  return (
                    <div
                      key={user.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Avatar, Name & Status */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-800 truncate leading-tight">
                                {user.name}
                              </h4>
                              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                {user.badgeId}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {getRoleBadge(user.role)}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/70 flex flex-col gap-1.5 text-[11px] text-slate-600 mb-3">
                          {/* PIN Box */}
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 font-mono">
                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                              <KeyRound className="w-3 h-3 text-slate-400" />
                              Auth PIN
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-800">
                                {isPinRevealed ? user.pin : '••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePinReveal(user.id)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                title={isPinRevealed ? 'Hide PIN' : 'Reveal PIN'}
                              >
                                {isPinRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          {user.email && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          )}

                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="text-[10px] font-semibold text-slate-500 capitalize">
                            {user.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditAdmin(user)}
                            className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Edit Credentials"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'admin', id: user.id, name: user.name })}
                            className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Revoke Admin Access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredAdmins.length === 0 && (
                  <div className="col-span-full p-8 text-center bg-white rounded-xl border border-dashed border-slate-300">
                    <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No dispatchers match your search query</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try searching by badge ID or clear search</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB 2: GUARD PERSONNEL ROSTER ===================== */}
          {activeTab === 'guards' && (
            <div className="flex flex-col gap-4">
              {/* Add / Edit Guard Form */}
              {isEditingGuard && (
                <div className="bg-white border-2 border-blue-300 rounded-xl p-4 sm:p-5 shadow-md animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 text-blue-900 rounded-lg">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">
                        {selectedGuardId ? 'Edit Security Officer Profile' : 'Register New Security Guard'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsEditingGuard(false)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveGuard} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Officer Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Officer John Doe"
                          value={guardName}
                          onChange={(e) => setGuardName(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#1e3a8a]"
                        />
                      </div>

                      {/* Badge Number */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Guard Badge / License # *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. SEC-4412"
                          value={guardBadge}
                          onChange={(e) => setGuardBadge(e.target.value.toUpperCase())}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#1e3a8a]"
                        />
                      </div>

                      {/* Role */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Guard Rank / Role *
                        </label>
                        <select
                          value={guardRole}
                          onChange={(e) => setGuardRole(e.target.value as any)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#1e3a8a]"
                        >
                          <option value="guard">Security Guard (Standard Post)</option>
                          <option value="lead">Site Lead / Shift Commander</option>
                          <option value="supervisor">Field Supervisor</option>
                        </select>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Phone Number (SMS Bid Dispatch) *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="+1 (555) 234-5678"
                          value={guardPhone}
                          onChange={(e) => setGuardPhone(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-[#1e3a8a]"
                        />
                      </div>
                    </div>

                    {/* Site Qualifications / OJT Section */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#1e3a8a]" />
                          Trained Site Qualifications (OJT Cleared)
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Guards with OJT on a site can bid without requiring training waivers
                        </span>
                      </div>

                      {/* Active Site Chips */}
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {guardOjtSites.map((site) => (
                          <span
                            key={site}
                            className="bg-blue-100 text-blue-900 border border-blue-300 rounded-lg px-2.5 py-1 text-xs font-medium flex items-center gap-1"
                          >
                            <Building2 className="w-3 h-3 text-blue-700" />
                            <span>{site}</span>
                            <button
                              type="button"
                              onClick={() => setGuardOjtSites(guardOjtSites.filter((s) => s !== site))}
                              className="text-blue-700 hover:text-rose-700 p-0.5 rounded ml-0.5 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}

                        {guardOjtSites.length === 0 && (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-medium">
                            ⚠️ No site qualifications assigned (All bids will trigger Needs OJT)
                          </span>
                        )}
                      </div>

                      {/* Add Site Input + Quick Suggestions */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Type custom site name or click presets below..."
                          value={newSiteInput}
                          onChange={(e) => setNewSiteInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newSiteInput.trim() && !guardOjtSites.includes(newSiteInput.trim())) {
                                setGuardOjtSites([...guardOjtSites, newSiteInput.trim()]);
                                setNewSiteInput('');
                              }
                            }
                          }}
                          className="flex-1 bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-[#1e3a8a]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newSiteInput.trim() && !guardOjtSites.includes(newSiteInput.trim())) {
                              setGuardOjtSites([...guardOjtSites, newSiteInput.trim()]);
                              setNewSiteInput('');
                            }
                          }}
                          className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Site
                        </button>
                      </div>

                      {/* Quick Site Presets */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-[10px] text-slate-400 font-medium mr-1 py-0.5">Quick Add:</span>
                        {availableSites
                          .filter((s) => !guardOjtSites.includes(s))
                          .slice(0, 6)
                          .map((site) => (
                            <button
                              key={site}
                              type="button"
                              onClick={() => setGuardOjtSites([...guardOjtSites, site])}
                              className="text-[10px] bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-600 px-2 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              + {site}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsEditingGuard(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-[#1e3a8a] hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {selectedGuardId ? 'Save Officer Profile' : 'Register Guard'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Guard Personnel Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredGuards.map((guard) => (
                  <div
                    key={guard.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {guard.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-800 truncate leading-tight">
                              {guard.name}
                            </h4>
                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {guard.badgeNumber} • {guard.phone}
                            </p>
                          </div>
                        </div>

                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {guard.role}
                        </span>
                      </div>

                      {/* Site Qualifications */}
                      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/70 mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            OJT Site Certifications
                          </span>
                          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                            {guard.ojtSites.length} Sites
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {guard.ojtSites.map((site) => (
                            <span
                              key={site}
                              className="text-[10px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium truncate max-w-full"
                            >
                              {site}
                            </span>
                          ))}
                          {guard.ojtSites.length === 0 && (
                            <span className="text-[10px] text-amber-600 italic">
                              No certified sites assigned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {guard.id}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditGuard(guard)}
                          className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Edit Guard Profile & Sites"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'guard', id: guard.id, name: guard.name })}
                          className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Remove Guard from Roster"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredGuards.length === 0 && (
                  <div className="col-span-full p-8 text-center bg-white rounded-xl border border-dashed border-slate-300">
                    <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No officers found matching search</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Check spelling or register a new guard</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:px-5 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 font-medium">
            💡 All dispatcher accounts and guard credentials persist locally across sessions.
          </p>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Delete Confirmation Sub-modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-5 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-sm text-slate-800">
                Revoke {deleteConfirm.type === 'admin' ? 'Dispatcher Access' : 'Guard Personnel'}?
              </h4>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Are you sure you want to remove <strong>{deleteConfirm.name}</strong> from the system?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'admin') {
                    deleteAdminUser(deleteConfirm.id);
                  } else {
                    deleteGuard(deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
