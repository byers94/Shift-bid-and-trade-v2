import React, { useState, useRef, useEffect } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { SiteProfile } from '../../types/shift';
import { Building2, MapPin, ChevronDown, Check, Search, ShieldCheck, Sparkles, Plus } from 'lucide-react';

interface SiteSelectDropdownProps {
  value: string;
  onChange: (siteName: string, siteProfile?: SiteProfile) => void;
  onAddressAutoPopulate?: (address: string, siteProfile: SiteProfile) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  id?: string;
  disabled?: boolean;
  helperText?: string;
  showAutoFillBadge?: boolean;
  className?: string;
}

export const SiteSelectDropdown: React.FC<SiteSelectDropdownProps> = ({
  value,
  onChange,
  onAddressAutoPopulate,
  placeholder = 'Select an authorized facility...',
  label = 'Facility / Site Name',
  required = false,
  id = 'site-select-dropdown',
  disabled = false,
  helperText,
  showAutoFillBadge = true,
  className = ''
}) => {
  const { sitesList } = useShiftOps();
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Find matching site from directory
  const currentSite = sitesList.find(
    (s) => s.name.toLowerCase() === value.toLowerCase() || s.code.toLowerCase() === value.toLowerCase()
  );

  // Filter sites by query
  const filteredSites = sitesList.filter((s) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.zone && s.zone.toLowerCase().includes(q))
    );
  });

  const handleSelectSite = (site: SiteProfile) => {
    setIsCustomMode(false);
    onChange(site.name, site);
    if (onAddressAutoPopulate) {
      onAddressAutoPopulate(site.address, site);
    }
    setIsOpen(false);
    setSearchFilter('');
  };

  const handleSelectCustom = () => {
    setIsCustomMode(true);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={id} className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {showAutoFillBadge && currentSite && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Address auto-linked
            </span>
          )}
        </div>
      )}

      {isCustomMode ? (
        <div className="relative">
          <input
            type="text"
            id={id}
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type custom facility name..."
            className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
          />
          <button
            type="button"
            onClick={() => setIsCustomMode(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-800"
          >
            Use Directory
          </button>
        </div>
      ) : (
        <div>
          {/* Main Dropdown Trigger */}
          <button
            type="button"
            id={id}
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full text-left bg-white dark:bg-slate-800 border rounded-lg p-2.5 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
              isOpen 
                ? 'border-blue-600 ring-2 ring-blue-500/20 dark:border-blue-500' 
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Building2 className={`w-4 h-4 shrink-0 ${currentSite ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
              {currentSite ? (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-900 dark:bg-slate-700 text-white">
                      {currentSite.code}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {currentSite.name}
                    </span>
                  </div>
                </div>
              ) : value ? (
                <span className="text-slate-900 dark:text-white font-medium truncate">{value}</span>
              ) : (
                <span className="text-slate-400 truncate">{placeholder}</span>
              )}
            </div>

            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
          </button>

          {/* Expanded Dropdown Menu */}
          {isOpen && (
            <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 max-h-72 flex flex-col">
              {/* Search Bar */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search site directory or code..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sites List */}
              <div className="overflow-y-auto flex-1 p-1 space-y-0.5">
                {filteredSites.map((site) => {
                  const isSelected = value.toLowerCase() === site.name.toLowerCase() || value.toLowerCase() === site.code.toLowerCase();
                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => handleSelectSite(site)}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start justify-between gap-2 ${
                        isSelected 
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            {site.code}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {site.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {site.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="truncate">{site.address}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}

                {filteredSites.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    No directory matches found for "{searchFilter}"
                  </div>
                )}
              </div>

              {/* Custom Input Option */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Not in directory?</span>
                <button
                  type="button"
                  onClick={handleSelectCustom}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Enter custom site
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {helperText && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
      )}
    </div>
  );
};
