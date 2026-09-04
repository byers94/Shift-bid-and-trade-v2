import React, { useState } from 'react';
import { SiteProfile, SiteContact } from '../../types/shift';
import { 
  groupContactsForGuard, 
  ensureSiteContacts, 
  SERVICE_TYPE_CONFIGS, 
  formatContractDate 
} from '../../utils/contractLifecycle';
import { 
  Phone, 
  Mail, 
  ShieldAlert, 
  Wrench, 
  Building2, 
  MapPin, 
  Clock, 
  Info, 
  Flame, 
  Sun, 
  Sparkles, 
  Shield, 
  ChevronDown, 
  ChevronUp,
  FileText,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface GuardSiteInfoCardProps {
  site: SiteProfile;
  showHeader?: boolean;
  className?: string;
  defaultExpanded?: boolean;
}

export const GuardSiteInfoCard: React.FC<GuardSiteInfoCardProps> = ({
  site,
  showHeader = true,
  className = '',
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contacts = ensureSiteContacts(site);
  const { emergency, maintenance, dispatch } = groupContactsForGuard(contacts);

  const contractType = site.contractType || 'ONGOING';
  const serviceConfig = SERVICE_TYPE_CONFIGS[contractType] || SERVICE_TYPE_CONFIGS.ONGOING;

  const renderServiceIcon = () => {
    switch (contractType) {
      case 'FIREWATCH':
        return <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />;
      case 'SEASONAL':
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case 'SPECIAL_EVENT':
        return <Sparkles className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  const renderContactCard = (contact: SiteContact, category: 'emergency' | 'maintenance' | 'dispatch') => {
    const isEmergency = category === 'emergency';
    const isMaint = category === 'maintenance';

    const cardBorder = isEmergency 
      ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/50 dark:bg-rose-950/20'
      : isMaint 
      ? 'border-amber-300 dark:border-amber-800/70 bg-amber-50/40 dark:bg-amber-950/20'
      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60';

    const badgeBg = isEmergency
      ? 'bg-rose-600 text-white'
      : isMaint
      ? 'bg-amber-600 text-white'
      : 'bg-blue-600 text-white';

    return (
      <div 
        key={contact.id || contact.name}
        className={`p-3 rounded-xl border ${cardBorder} shadow-2xs space-y-2 transition-all`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeBg}`}>
                {contact.title || (isEmergency ? 'Emergency Contact' : 'Liaison')}
              </span>
              {contact.isEmergencyContact && !isEmergency && (
                <span className="text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 px-1.5 py-0.2 rounded">
                  🚨 Priority Escalation
                </span>
              )}
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
              {contact.name}
            </h4>
          </div>
        </div>

        {/* Operational Notes (Calling hours, lockout instructions) */}
        {contact.notes && (
          <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-900/70 rounded-lg p-2 border border-slate-200/70 dark:border-slate-800 flex items-start gap-1.5 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span>{contact.notes}</span>
          </div>
        )}

        {/* Tap-to-Call Buttons (One-Touch Phone Calling) */}
        <div className="pt-1 flex flex-wrap items-center gap-1.5">
          {contact.phone && (
            <a
              href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
              className={`flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-xs ${
                isEmergency
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : isMaint
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
              title={`Call ${contact.name}`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Primary ({contact.phone})</span>
            </a>
          )}

          {contact.secondaryPhone && (
            <a
              href={`tel:${contact.secondaryPhone.replace(/[^\d+]/g, '')}`}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 transition-colors active:scale-95"
              title={`Call After-Hours / Secondary: ${contact.secondaryPhone}`}
            >
              <Phone className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <span className="text-[11px]">After-Hours ({contact.secondaryPhone})</span>
            </a>
          )}

          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition-colors"
              title={`Email ${contact.email}`}
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id={`guard-site-info-${site.id}`} className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden ${className}`}>
      {/* Header Banner */}
      {showHeader && (
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between gap-3 cursor-pointer hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm text-white truncate">
                  {site.name}
                </h3>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-200 px-1.5 py-0.2 rounded border border-blue-400/30">
                  {site.code}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border flex items-center gap-1 ${serviceConfig.badgeBg} ${serviceConfig.badgeText} ${serviceConfig.borderColor}`}>
                  {renderServiceIcon()}
                  <span>{serviceConfig.label}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{site.address}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-blue-300 font-mono hidden sm:inline">
              {contacts.length} POCs
            </span>
            <button
              type="button"
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label={isExpanded ? 'Collapse site details' : 'Expand site details'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Expanded Details Body */}
      {isExpanded && (
        <div className="p-4 space-y-4 text-xs">
          {/* Quick Notice Banner for Temporary / Firewatch Coverage */}
          {contractType === 'FIREWATCH' && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-start gap-2">
              <Flame className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px]">ACTIVE FIREWATCH POST ORDER</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  Building fire suppression/sprinkler system is offline. Officer must conduct continuous 30-minute foot sweeps of all stairwells, boiler rooms, and egress corridors. Log all checks in DAR.
                </p>
              </div>
            </div>
          )}

          {/* Quick Contract Service Dates Strip */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between flex-wrap gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-900 dark:text-white">Service Period:</span>
              <span>{formatContractDate(site.startDate)} – {formatContractDate(site.endDate)}</span>
            </div>
            {site.operatingHours && (
              <span className="font-mono text-[10px] bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded">
                {site.operatingHours}
              </span>
            )}
          </div>

          {/* Group 1: 🚨 EMERGENCY ESCALATION CONTACTS */}
          {emergency.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-rose-200 dark:border-rose-900/60">
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-extrabold text-[11px] uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Emergency Escalation (24/7 Priority)</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">
                  {emergency.length} Contact{emergency.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {emergency.map(c => renderContactCard(c, 'emergency'))}
              </div>
            </div>
          )}

          {/* Group 2: 🔧 ON-CALL MAINTENANCE & TOWING */}
          {maintenance.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-amber-200 dark:border-amber-900/60">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold text-[11px] uppercase tracking-wider">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>On-Call Maintenance, Lockouts & Towing</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                  {maintenance.length} Contact{maintenance.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {maintenance.map(c => renderContactCard(c, 'maintenance'))}
              </div>
            </div>
          )}

          {/* Group 3: 🏢 PROPERTY MANAGEMENT & DISPATCH */}
          {dispatch.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-extrabold text-[11px] uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span>Property Management & Operations</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {dispatch.length} Contact{dispatch.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {dispatch.map(c => renderContactCard(c, 'dispatch'))}
              </div>
            </div>
          )}

          {/* Post Instructions & Key Instructions Summary */}
          {site.postInstructions && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Post Orders & Escalation Instructions
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed font-sans">
                {site.postInstructions}
              </p>
            </div>
          )}

          {site.accessGateNotes && (
            <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-blue-50/50 dark:bg-blue-950/20 p-2 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <span><strong>Access / Gate Notes:</strong> {site.accessGateNotes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
