import React from 'react';
import { Award, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SiteQualificationCircleProps {
  qualifiedSitesCount: number;
  totalSitesCount: number;
  trainingLevel?: 'trained' | 'needs_ojt' | 'lead_certified' | 'in_training';
  role?: 'guard' | 'lead' | 'supervisor';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showFraction?: boolean;
  className?: string;
  id?: string;
}

export const SiteQualificationCircle: React.FC<SiteQualificationCircleProps> = ({
  qualifiedSitesCount,
  totalSitesCount,
  trainingLevel,
  role,
  size = 'md',
  showLabel = false,
  showFraction = false,
  className = '',
  id
}) => {
  const safeTotal = Math.max(1, totalSitesCount);
  const percentage = Math.min(100, Math.max(0, Math.round((qualifiedSitesCount / safeTotal) * 100)));

  // Determine visual color scheme
  const isLead = trainingLevel === 'lead_certified' || role === 'lead' || role === 'supervisor';
  const isTrained = trainingLevel === 'trained' || (!trainingLevel && qualifiedSitesCount >= 2) || percentage >= 50;

  let strokeColor = '#059669'; // Emerald
  let trackColor = '#d1fae5'; // Emerald 100
  let textColor = 'text-emerald-950 dark:text-emerald-300';
  let badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300';
  let tierLabel = 'Site Qualified';

  if (isLead) {
    strokeColor = '#7c3aed'; // Purple
    trackColor = '#ede9fe'; // Purple 100
    textColor = 'text-purple-950 dark:text-purple-300';
    badgeBg = 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300';
    tierLabel = 'Lead Certified';
  } else if (!isTrained || percentage < 35 || trainingLevel === 'needs_ojt') {
    strokeColor = '#d97706'; // Amber
    trackColor = '#fef3c7'; // Amber 100
    textColor = 'text-amber-950 dark:text-amber-300';
    badgeBg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300';
    tierLabel = 'Needs OJT';
  }

  // Size dimensions
  let dim = 54;
  let strokeWidth = 4.5;
  let radius = 22.5;

  if (size === 'xs') {
    dim = 28;
    strokeWidth = 3;
    radius = 11;
  } else if (size === 'sm') {
    dim = 40;
    strokeWidth = 3.5;
    radius = 16.5;
  } else if (size === 'lg') {
    dim = 76;
    strokeWidth = 6;
    radius = 32;
  }

  const center = dim / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div 
      id={id}
      className={`inline-flex items-center gap-2 select-none ${className}`}
      title={`${tierLabel}: ${qualifiedSitesCount} of ${totalSitesCount} facilities cleared (${percentage}%)`}
    >
      <div className="relative flex items-center justify-center shrink-0" style={{ width: dim, height: dim }}>
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
          {size === 'xs' ? (
            <span className="text-[9px] font-black font-mono text-slate-800 dark:text-slate-200">
              {percentage}%
            </span>
          ) : size === 'sm' ? (
            <span className="text-[10px] font-black font-mono text-slate-800 dark:text-slate-100 tracking-tighter">
              {percentage}%
            </span>
          ) : size === 'md' ? (
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
              {qualifiedSitesCount}/{totalSitesCount} Facilities
            </span>
          )}
        </div>
      )}
    </div>
  );
};
