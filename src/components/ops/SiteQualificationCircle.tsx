import React from 'react';
import { Award, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SiteQualificationCircleProps {
  qualifiedSitesCount?: number;
  totalSitesCount?: number;
  ojtCount?: number;
  totalSites?: number;
  trainingLevel?: 'trained' | 'needs_ojt' | 'lead_certified' | 'in_training';
  role?: 'guard' | 'lead' | 'supervisor';
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  strokeWidth?: number;
  showLabel?: boolean;
  showFraction?: boolean;
  className?: string;
  id?: string;
}

export const SiteQualificationCircle: React.FC<SiteQualificationCircleProps> = ({
  qualifiedSitesCount,
  totalSitesCount,
  ojtCount,
  totalSites,
  trainingLevel,
  role,
  size = 'md',
  strokeWidth: customStrokeWidth,
  showLabel = false,
  showFraction = false,
  className = '',
  id
}) => {
  // Extract number safely, guarding against NaN, null, undefined
  const parseNum = (val: any, fallback: number): number => {
    if (typeof val === 'number' && Number.isFinite(val) && !isNaN(val)) {
      return val;
    }
    if (typeof val === 'string' && val.trim() !== '') {
      const parsed = parseFloat(val);
      if (Number.isFinite(parsed) && !isNaN(parsed)) return parsed;
    }
    return fallback;
  };

  const rawQualified = qualifiedSitesCount !== undefined 
    ? parseNum(qualifiedSitesCount, 0) 
    : parseNum(ojtCount, 0);

  const rawTotal = totalSitesCount !== undefined 
    ? parseNum(totalSitesCount, 8) 
    : parseNum(totalSites, 8);

  const safeTotal = Math.max(1, rawTotal);
  const safeQualified = Math.max(0, rawQualified);
  const rawRatio = safeTotal > 0 ? (safeQualified / safeTotal) * 100 : 0;
  const percentage = Number.isFinite(rawRatio) && !isNaN(rawRatio) 
    ? Math.min(100, Math.max(0, Math.round(rawRatio))) 
    : 0;

  // Determine visual color scheme
  const isLead = trainingLevel === 'lead_certified' || role === 'lead' || role === 'supervisor';
  const isTrained = trainingLevel === 'trained' || (!trainingLevel && safeQualified >= 2) || percentage >= 50;

  let strokeColor = '#059669'; // Emerald
  let trackColor = '#d1fae5'; // Emerald 100
  let textColor = 'text-emerald-950 dark:text-emerald-300';
  let tierLabel = 'Site Qualified';

  if (isLead) {
    strokeColor = '#7c3aed'; // Purple
    trackColor = '#ede9fe'; // Purple 100
    textColor = 'text-purple-950 dark:text-purple-300';
    tierLabel = 'Lead Certified';
  } else if (!isTrained || percentage < 35 || trainingLevel === 'needs_ojt') {
    strokeColor = '#d97706'; // Amber
    trackColor = '#fef3c7'; // Amber 100
    textColor = 'text-amber-950 dark:text-amber-300';
    tierLabel = 'Needs OJT';
  }

  // Size dimensions
  let dim = 54;
  let strokeWidth = customStrokeWidth ?? 4.5;
  let radius = 22.5;
  let sizeCategory: 'xs' | 'sm' | 'md' | 'lg' = 'md';

  if (typeof size === 'number') {
    dim = size;
    if (size <= 28) {
      sizeCategory = 'xs';
      strokeWidth = customStrokeWidth ?? 2.5;
    } else if (size <= 44) {
      sizeCategory = 'sm';
      strokeWidth = customStrokeWidth ?? 3.5;
    } else if (size >= 64) {
      sizeCategory = 'lg';
      strokeWidth = customStrokeWidth ?? 6;
    } else {
      sizeCategory = 'md';
      strokeWidth = customStrokeWidth ?? 4.5;
    }
    radius = Math.max(2, (dim - strokeWidth * 2) / 2);
  } else if (size === 'xs') {
    sizeCategory = 'xs';
    dim = 26;
    strokeWidth = customStrokeWidth ?? 2.5;
    radius = 10.5;
  } else if (size === 'sm') {
    sizeCategory = 'sm';
    dim = 40;
    strokeWidth = customStrokeWidth ?? 3.5;
    radius = 16.5;
  } else if (size === 'lg') {
    sizeCategory = 'lg';
    dim = 76;
    strokeWidth = customStrokeWidth ?? 6;
    radius = 32;
  } else {
    sizeCategory = 'md';
    dim = 54;
    strokeWidth = customStrokeWidth ?? 4.5;
    radius = 22.5;
  }

  const center = dim / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div 
      id={id}
      className={`inline-flex items-center gap-2 select-none ${className}`}
      title={`${tierLabel}: ${safeQualified} of ${safeTotal} facilities cleared (${percentage}%)`}
    >
      <div 
        className="relative flex items-center justify-center shrink-0 rounded-full bg-white/90 dark:bg-neutral-900/90 shadow-xs" 
        style={{ width: dim, height: dim }}
      >
        <svg
          width={dim}
          height={dim}
          viewBox={`0 0 ${dim} ${dim}`}
          className="transform -rotate-90"
        >
          {/* Background Track Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            className="transition-all duration-300"
          />
          {/* Animated Foreground Progress Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {sizeCategory === 'xs' ? (
            <span className="text-[8px] font-black font-mono leading-none text-slate-800 dark:text-slate-100">
              {percentage}%
            </span>
          ) : sizeCategory === 'sm' ? (
            <span className="text-[10px] font-black font-mono text-slate-800 dark:text-slate-100 tracking-tighter">
              {percentage}%
            </span>
          ) : sizeCategory === 'md' ? (
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs font-black font-mono text-slate-900 dark:text-slate-100">
                {percentage}%
              </span>
              <span className="text-[7px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight">
                Qual
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center leading-none">
              <span className="text-base font-black font-mono text-slate-900 dark:text-slate-100">
                {percentage}%
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight">
                Cleared
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Optional Side Label / Fraction */}
      {(showLabel || showFraction) && (
        <div className="flex flex-col">
          {showLabel && (
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${textColor}`}>
              {tierLabel}
            </span>
          )}
          {showFraction && (
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {safeQualified}/{safeTotal} Facilities
            </span>
          )}
        </div>
      )}
    </div>
  );
};
