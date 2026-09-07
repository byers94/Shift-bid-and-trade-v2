import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { SiteOrientation } from '../../types/shift';
import { SupervisorSignOffModal } from './SupervisorSignOffModal';
import { 
  ShieldAlert, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  UserCheck, 
  AlertCircle, 
  ChevronRight, 
  Send, 
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Navigation
} from 'lucide-react';

interface UpcomingSiteOrientationsTileProps {
  onOpenOrientationModal?: (orientation: SiteOrientation) => void;
}

export const UpcomingSiteOrientationsTile: React.FC<UpcomingSiteOrientationsTileProps> = ({
  onOpenOrientationModal
}) => {
  const { 
    siteOrientations, 
    guardsList, 
    sitesList 
  } = useShiftOps();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrientation, setSelectedOrientation] = useState<SiteOrientation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredOrientations = siteOrientations.filter(orient => {
    if (filterStatus !== 'all' && orient.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        orient.guardName.toLowerCase().includes(q) ||
        orient.guardBadge.toLowerCase().includes(q) ||
        orient.siteName.toLowerCase().includes(q) ||
        (orient.supervisorName && orient.supervisorName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingSupervisorCount = siteOrientations.filter(o => o.status === 'PENDING_SUPERVISOR').length;
  const activeCount = siteOrientations.filter(o => o.status === 'ON_SITE_ACTIVE' || o.status === 'SUPERVISOR_EN_ROUTE').length;
  const certifiedCount = siteOrientations.filter(o => o.status === 'CERTIFIED_RELEASED').length;

  const handleOpenModal = (orientation: SiteOrientation) => {
    setSelectedOrientation(orientation);
    setIsModalOpen(true);
    if (onOpenOrientationModal) {
      onOpenOrientationModal(orientation);
    }
  };

  const getStatusBadge = (status: SiteOrientation['status']) => {
    switch (status) {
      case 'PENDING_SUPERVISOR':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-900 animate-pulse">
            Supervisor Required
          </span>
        );
      case 'SUPERVISOR_EN_ROUTE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            Supervisor En Route
          </span>
        );
      case 'ON_SITE_ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
            Active On Site
          </span>
        );
      case 'CERTIFIED_RELEASED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            Certified & Released
          </span>
        );
      case 'FAILED_ESCALATED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            Escalated / Remediation
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Upcoming Site Orientations
              </h3>
              {pendingSupervisorCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white shadow-xs">
                  {pendingSupervisorCount} Unassigned
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automated First-Shift 90-Min Qualification & Supervisor Sign-Off
            </p>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All ({siteOrientations.length})
          </button>
          <button
            onClick={() => setFilterStatus('PENDING_SUPERVISOR')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              filterStatus === 'PENDING_SUPERVISOR'
                ? 'bg-rose-600 text-white'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            Needs Supervisor ({pendingSupervisorCount})
          </button>
          <button
            onClick={() => setFilterStatus('ON_SITE_ACTIVE')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              filterStatus === 'ON_SITE_ACTIVE'
                ? 'bg-purple-600 text-white'
                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
            }`}
          >
            In Progress ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('CERTIFIED_RELEASED')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              filterStatus === 'CERTIFIED_RELEASED'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            Certified ({certifiedCount})
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search trainee, badge, facility or supervisor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Orientations List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1 overflow-y-auto max-h-[460px]">
        {filteredOrientations.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No orientations match the selected criteria
            </p>
            <p className="text-xs text-slate-400 mt-1">
              When guards are scheduled at unfamiliar sites, 90-minute training windows will populate automatically.
            </p>
          </div>
        ) : (
          filteredOrientations.map((orient) => {
            const endMs = new Date(orient.windowEnd).getTime();
            const nowMs = Date.now();
            const remainingMins = Math.round((endMs - nowMs) / (60 * 1000));
            const isCompleted = orient.status === 'CERTIFIED_RELEASED';

            const completedCheckpointsCount = [
              orient.checkpoints.postOrdersReviewed,
              orient.checkpoints.accessKeysVerified,
              orient.checkpoints.perimeterGeofenceWalked,
              orient.checkpoints.emergencyPocConfirmed
            ].filter(Boolean).length;

            return (
              <div
                key={orient.orientationId}
                className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
              >
                {/* Left: Guard & Site Details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {orient.guardName}
                    </span>
                    <span className="text-xs font-mono font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                      {orient.guardBadge}
                    </span>
                    {getStatusBadge(orient.status)}
                  </div>

                  <div className="flex flex-wrap items-center text-xs text-slate-500 dark:text-slate-400 gap-x-4 gap-y-1">
                    <div className="flex items-center space-x-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {orient.siteName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {isCompleted
                          ? `Completed ${orient.completedAt ? new Date(orient.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`
                          : remainingMins > 0
                          ? `${remainingMins}m window left`
                          : 'Window Expired'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{completedCheckpointsCount}/4 Checkpoints</span>
                    </div>
                  </div>

                  {/* Supervisor Details */}
                  <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center space-x-2 pt-0.5">
                    <span className="text-slate-400">Supervisor:</span>
                    {orient.supervisorName ? (
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {orient.supervisorName} ({orient.supervisorBadge})
                      </span>
                    ) : (
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        Unassigned • Action Required
                      </span>
                    )}
                    {orient.gpsVerifiedAtSite && (
                      <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-sm">
                        GPS Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(orient)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800"
                  >
                    <span>{isCompleted ? 'View Sign-Off' : 'Open Sign-Off'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal instance */}
      {selectedOrientation && (
        <SupervisorSignOffModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrientation(null);
          }}
          orientation={siteOrientations.find(o => o.orientationId === selectedOrientation.orientationId) || selectedOrientation}
        />
      )}
    </div>
  );
};
