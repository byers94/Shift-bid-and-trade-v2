import React, { useMemo, useState } from 'react';
import { 
  Trophy, 
  Medal, 
  Award, 
  Star, 
  Shield, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  MessageSquare, 
  User, 
  Info, 
  ChevronRight, 
  MapPin, 
  FileText,
  Target,
  Zap,
  HelpCircle
} from 'lucide-react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { GuardProfile, GuardPerformanceStats } from '../../types/shift';
import { SiteQualificationCircle } from '../ops/SiteQualificationCircle';

interface GuardLeaderboardViewProps {
  onOpenAlertPrefs?: () => void;
}

export const GuardLeaderboardView: React.FC<GuardLeaderboardViewProps> = ({ onOpenAlertPrefs }) => {
  const { 
    activeGuard, 
    guardsList, 
    sitesList, 
    siteFeedbacks, 
    getGuardPerformance, 
    getLeaderboard 
  } = useShiftOps();

  const [activeTab, setActiveTab] = useState<'my_score' | 'top_five'>('my_score');
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);

  // Full leaderboard calculated via Oculus Score
  const fullLeaderboard = useMemo(() => {
    return getLeaderboard('composite', 'all');
  }, [getLeaderboard, guardsList, siteFeedbacks]);

  // Active officer's stats and ranking
  const myStats = useMemo(() => {
    return getGuardPerformance(activeGuard.id);
  }, [getGuardPerformance, activeGuard.id, siteFeedbacks]);

  const myRank = useMemo(() => {
    const idx = fullLeaderboard.findIndex(g => g.id === activeGuard.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [fullLeaderboard, activeGuard.id]);

  // Top 5 Elite Guards (Recognition Only - Bottom 5 is strictly hidden in Guard View)
  const topFiveGuards = useMemo(() => {
    return fullLeaderboard.slice(0, 5);
  }, [fullLeaderboard]);

  const myOculus = myStats.oculusBreakdown || {
    oculusScore: 90,
    tier: 'gold',
    tierLabel: 'Master Gold Tier',
    operationalReliabilityScore: 54,
    attendancePunctualityScore: 23.5,
    emergencyBonusPts: 3,
    callOffPenaltyPts: 0,
    slaCheckpointsScore: 18.5,
    darQualityScore: 14,
    geofenceBreachesCount: 0,
    geofencePenaltyPts: 0,
    clientExperienceScore: 36,
    weightedStarRating: 4.8,
    reviewCount: 3,
    isDefaultBaseline: false,
    reviewWeightBreakdown: {
      propertyManagerCount: 2,
      supervisorCount: 1,
      residentCount: 0
    }
  };

  const getTierBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'diamond':
        return 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300 shadow-sm';
      case 'gold':
        return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 border-amber-300 shadow-sm font-black';
      case 'silver':
        return 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 border-slate-200';
      case 'bronze':
        return 'bg-gradient-to-r from-orange-400 to-amber-600 text-white border-orange-300';
      default:
        return 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200';
    }
  };

  return (
    <div id="guard-oculus-leaderboard-view" className="space-y-4 pb-6 animate-in fade-in duration-150">
      {/* View Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span>Oculus Guard Ranking</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded">
                  100-Pt Index
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Transparent performance & client experience scoring
              </p>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              id="guard-tab-my-score"
              onClick={() => setActiveTab('my_score')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'my_score'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              My Oculus
            </button>
            <button
              id="guard-tab-top-five"
              onClick={() => setActiveTab('top_five')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'top_five'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Top 5 Leaders
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'my_score' ? (
        <div className="space-y-4">
          {/* Officer Oculus Score Hero Card */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-xl p-4 shadow-md border border-blue-900/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-blue-600/40 border-2 border-amber-400 flex items-center justify-center text-white font-extrabold text-base shadow-inner">
                    {activeGuard.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="absolute -bottom-1 -right-1">
                    <SiteQualificationCircle
                      qualifiedSitesCount={activeGuard.ojtSites?.length || 0}
                      totalSitesCount={sitesList.length || 8}
                      size="xs"
                      trainingLevel={activeGuard.trainingLevel}
                      role={activeGuard.role}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-base text-white">{activeGuard.name}</h3>
                    <span className="px-1.5 py-0.2 text-[9px] bg-blue-500/30 text-blue-200 rounded font-mono">
                      {activeGuard.badgeNumber}
                    </span>
                  </div>
                  <div className="text-xs text-blue-200/80 flex items-center gap-2 mt-0.5">
                    <span>Rank <strong>#{myRank}</strong> of {guardsList.length} Officers</span>
                    <span>•</span>
                    <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${getTierBadgeStyle(myOculus.tier)}`}>
                      {myOculus.tierLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Composite Oculus Score Gauge */}
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Oculus Score</div>
                <div className="text-3xl font-black text-white flex items-baseline justify-end gap-1">
                  <span>{myOculus.oculusScore}</span>
                  <span className="text-sm font-semibold text-blue-300">/ 100</span>
                </div>
              </div>
            </div>

            {/* Two Primary Pillars Summary: Reliability (60) vs Client Experience (40) */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-blue-800/60">
              <div className="bg-blue-900/40 rounded-lg p-2.5 border border-blue-700/40">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-blue-200 font-medium">Operational Reliability</span>
                  <span className="font-bold text-white font-mono">{myOculus.operationalReliabilityScore}/60 pts</span>
                </div>
                <div className="w-full bg-blue-950 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(myOculus.operationalReliabilityScore / 60) * 100}%` }}
                  />
                </div>
                <div className="text-[9px] text-blue-300 mt-1 flex justify-between">
                  <span>Punctuality, SLA, DAR & Geofence</span>
                  <span>{Math.round((myOculus.operationalReliabilityScore / 60) * 100)}%</span>
                </div>
              </div>

              <div className="bg-blue-900/40 rounded-lg p-2.5 border border-blue-700/40">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-blue-200 font-medium">Client Experience</span>
                  <span className="font-bold text-amber-300 font-mono">{myOculus.clientExperienceScore}/40 pts</span>
                </div>
                <div className="w-full bg-blue-950 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(myOculus.clientExperienceScore / 40) * 100}%` }}
                  />
                </div>
                <div className="text-[9px] text-blue-300 mt-1 flex justify-between">
                  <span>{myOculus.weightedStarRating.toFixed(1)}★ ({myOculus.reviewCount} reviews)</span>
                  <span>{Math.round((myOculus.clientExperienceScore / 40) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown 1: Operational Reliability Detail (Max 60 pts) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  1. Operational Reliability Breakdown
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {myOculus.operationalReliabilityScore} / 60.0 Max
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Punctuality & Attendance */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Attendance & Punctuality
                    </span>
                  </div>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {myOculus.attendancePunctualityScore} / 25 pts
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>• On-time arrival rate ({myStats.onTimeArrivalRate}%):</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {(Math.min(22, (myStats.onTimeArrivalRate / 100) * 22)).toFixed(1)} pts
                    </span>
                  </div>
                  {myOculus.emergencyBonusPts > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400">
                      <span>• Emergency shift coverage bonus ({myStats.emergencyShiftsFulfilled} fills):</span>
                      <span className="font-bold">+{myOculus.emergencyBonusPts} pts</span>
                    </div>
                  )}
                  {myOculus.callOffPenaltyPts > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>• Call-off penalties:</span>
                      <span className="font-bold">-{myOculus.callOffPenaltyPts} pts</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SLA Checkpoints */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      SLA Timed Tasks & Circuit Checkpoints
                    </span>
                  </div>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {myOculus.slaCheckpointsScore} / 20 pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Verified patrol sweeps and security task completions within expected timeframes.
                </p>
              </div>

              {/* DAR Quality */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      DAR Logbook Quality & Completeness
                    </span>
                  </div>
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {myOculus.darQualityScore} / 15 pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Daily Activity Report audit rigor, photo evidence attachments, and incident accuracy.
                </p>
              </div>

              {/* Geofence Integrity */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Geofence Post Integrity
                    </span>
                  </div>
                  <span className={`font-bold font-mono ${
                    myOculus.geofencePenaltyPts > 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {myOculus.geofencePenaltyPts > 0 ? `-${myOculus.geofencePenaltyPts} pts penalty` : '0 Breaches (Clean)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  -3 pts penalty per unexcused &gt;10m post boundary departure during duty.
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown 2: Client Experience Detail (Max 40 pts) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  2. Client Experience Breakdown
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                {myOculus.clientExperienceScore} / 40.0 Max
              </span>
            </div>

            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    Weighted Star Rating: {myOculus.weightedStarRating.toFixed(2)} ★
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {myOculus.isDefaultBaseline 
                      ? 'Baseline 4.0★ applied (<3 verified client reviews)' 
                      : `Based on ${myOculus.reviewCount} client evaluations`}
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-amber-700 dark:text-amber-300">
                  {myOculus.clientExperienceScore} pts
                </div>
              </div>

              {/* Role Weight Multipliers Summary */}
              <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60 text-[10px] text-slate-600 dark:text-slate-400 grid grid-cols-3 gap-1 text-center">
                <div className="bg-white/80 dark:bg-slate-900/70 p-1.5 rounded border border-amber-200/50">
                  <div className="font-bold text-slate-900 dark:text-white">3x Weight</div>
                  <div className="text-[9px] text-slate-500">Property Manager</div>
                  <div className="font-mono text-blue-600 dark:text-blue-400">{myOculus.reviewWeightBreakdown.propertyManagerCount} logged</div>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/70 p-1.5 rounded border border-amber-200/50">
                  <div className="font-bold text-slate-900 dark:text-white">2x Weight</div>
                  <div className="text-[9px] text-slate-500">Supervisor</div>
                  <div className="font-mono text-purple-600 dark:text-purple-400">{myOculus.reviewWeightBreakdown.supervisorCount} logged</div>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/70 p-1.5 rounded border border-amber-200/50">
                  <div className="font-bold text-slate-900 dark:text-white">1x Weight</div>
                  <div className="text-[9px] text-slate-500">Resident</div>
                  <div className="font-mono text-slate-600 dark:text-slate-400">{myOculus.reviewWeightBreakdown.residentCount} logged</div>
                </div>
              </div>
            </div>

            {/* Officer's Badges & Commendations */}
            <div>
              <div className="text-[11px] font-bold uppercase text-slate-500 mb-1.5">Official Badges Earned</div>
              <div className="flex flex-wrap gap-1.5">
                {myStats.recognitionBadges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded border border-amber-300 dark:border-amber-700 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actionable Tips to Boost Oculus Score */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3.5 text-xs space-y-1.5">
            <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>How to Boost Your Oculus Score:</span>
            </div>
            <ul className="text-[11px] text-blue-800 dark:text-blue-300 space-y-1 list-disc pl-4">
              <li>Accept open Emergency / Surge shifts for a <strong>+1 pt attendance bonus</strong> (up to 4 pts).</li>
              <li>Complete 100% of circuit checkpoints within SLA windows to maximize the 20-pt SLA score.</li>
              <li>Maintain strict geofence post integrity to avoid -3 pt unexcused perimeter penalties.</li>
              <li>Provide exceptional service during VIP events to earn 3x weighted Property Manager commendations.</li>
            </ul>
          </div>
        </div>
      ) : (
        /* Top 5 Recognition Leaderboard (Bottom 5 is hidden for Guard View) */
        <div className="space-y-3">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                Top 5 Recognition Roster
              </span>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">
              Live Regional Leaders
            </span>
          </div>

          {topFiveGuards.map((guard, index) => {
            const rank = index + 1;
            const isMe = guard.id === activeGuard.id;
            const breakdown = guard.oculusBreakdown;

            return (
              <div
                key={guard.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isMe 
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-sm ring-2 ring-blue-400/20' 
                    : rank === 1
                    ? 'bg-gradient-to-r from-amber-500/10 to-white dark:from-amber-500/15 dark:to-slate-900 border-amber-300 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                      rank === 1
                        ? 'bg-amber-500 text-white shadow-xs'
                        : rank === 2
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white font-bold'
                        : rank === 3
                        ? 'bg-orange-300 dark:bg-orange-800 text-orange-950 dark:text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold'
                    }`}>
                      #{rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {guard.name}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-blue-600 text-white rounded font-bold uppercase">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{guard.badgeNumber}</span>
                        <span>•</span>
                        <span>{guard.topCommendedSite}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {guard.oculusScore ?? breakdown?.oculusScore ?? 90}
                      <span className="text-[10px] text-slate-400 font-normal ml-0.5">pts</span>
                    </div>
                    <div className="text-[10px] text-amber-500 font-bold flex items-center justify-end gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      <span>{guard.ratingAverage.toFixed(1)}★</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-slate-400 block text-[9px]">Reliability:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {breakdown?.operationalReliabilityScore ?? 50}/60
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Client Exp:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {breakdown?.clientExperienceScore ?? 35}/40
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Shifts:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {guard.fulfilledShiftsCount} fills
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
