import React from 'react';
import { SiteProfile } from '../../types/shift';
import { GuardSiteInfoCard } from './GuardSiteInfoCard';
import { X, Building2 } from 'lucide-react';

interface GuardSiteInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  site?: SiteProfile | null;
}

export const GuardSiteInfoModal: React.FC<GuardSiteInfoModalProps> = ({
  isOpen,
  onClose,
  site
}) => {
  if (!isOpen || !site) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Property POCs & Emergency Contacts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {site.name} • Tap phone numbers to call immediately
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <GuardSiteInfoCard site={site} showHeader={false} defaultExpanded={true} />
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};
