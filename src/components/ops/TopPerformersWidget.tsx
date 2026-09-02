import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Medal, 
  Award, 
  Star, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Shield, 
  ShieldAlert, 
  User, 
  Search, 
  Filter, 
  Plus, 
  MessageSquare, 
  Calendar, 
  Building2, 
  Sparkles, 
  ThumbsUp, 
  ChevronRight, 
  X, 
  FileText, 
  Check, 
  AlertTriangle,
  ExternalLink,
  MapPin,
  HelpCircle,
  Zap,
  Info,
  CalendarDays,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Target,
  SlidersHorizontal,
  UserCheck,
  Ban,
  ArrowRightLeft,
  BarChart3
} from 'lucide-react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { 
  GuardProfile, 
  GuardPerformanceStats, 
  SiteFeedbackEntry, 
  ReviewerRoleType, 
  ASRScoreBreakdown,
  OculusScoreBreakdown,
  GuardCoachingSession
} from '../../types/shift';
import { SiteQualificationCircle } from './SiteQualificationCircle';
import { ROLE_WEIGHTS } from '../../utils/asrScoring';
import { CoachingSchedulingCalendarModal } from './CoachingSchedulingCalendarModal';
import { AdminReviewAlternateProposalModal } from './AdminReviewAlternateProposalModal';
import { CoachingPerformanceDashboard } from './CoachingPerformanceDashboard';

interface TopPerformersWidgetProps {
  onNavigateToGuardDirectory?: (guardId?: string) => void;
  compact?: boolean;
}

type SortMetric = 'composite' | 'reliability' | 'client_exp' | 'shifts' | 'rating' | 'emergency' | 'ontime';
type TimeframeFilter = 'all' | 'month' | 'quarter';

export const TopPerformersWidget: React.FC<TopPerformersWidgetProps> = ({ 
  onNavigateToGuardDirectory,
  compact = false 
}) => {
  const { 
    guardsList, 
    sitesList,
    siteFeedbacks, 
    callOffRecords,
    addSiteFeedback, 
    awardGuardCommendation, 
    scheduleGuardCoaching,
    coachingSessions,
    acceptAlternateCoaching,
    getLeaderboard,
    getGuardPerformance,
    shifts
  } = useShiftOps();

  const [sortMetric, setSortMetric] = useState<SortMetric>('composite');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeViewMode, setActiveViewMode] = useState<'leaderboard' | 'coaching_dashboard'>('leaderboard');
  const [selectedGuardForDossier, setSelectedGuardForDossier] = useState<(GuardProfile & GuardPerformanceStats) | null>(null);
  
  // Coaching Modal State
  const [coachingGuard, setCoachingGuard] = useState<(GuardProfile & GuardPerformanceStats) | null>(null);
  const [coachingTopic, setCoachingTopic] = useState('Geofence Post Integrity & SLA Checkpoints');
  const [coachingDate, setCoachingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [coachingNotes, setCoachingNotes] = useState('');

  // Incident & Geofence Log Modal State
  const [incidentLogGuard, setIncidentLogGuard] = useState<(GuardProfile & GuardPerformanceStats) | null>(null);

  // Review Alternate Coaching Proposal Modal State
  const [reviewProposalSession, setReviewProposalSession] = useState<GuardCoachingSession | null>(null);
  const [reviewProposalGuard, setReviewProposalGuard] = useState<(GuardProfile & GuardPerformanceStats) | null>(null);

  // Middle roster expansion toggle (when guards > 10)
  const [isMiddleRosterExpanded, setIsMiddleRosterExpanded] = useState(false);

  // Add Feedback Modal State
  const [isAddFeedbackOpen, setIsAddFeedbackOpen] = useState(false);
  const [feedbackGuardId, setFeedbackGuardId] = useState<string>(guardsList[0]?.id || '');
  const [feedbackSiteName, setFeedbackSiteName] = useState<string>('Port Authority - Pier 7');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackReviewerRole, setFeedbackReviewerRole] = useState<ReviewerRoleType>('property_manager');
  const [feedbackReviewerName, setFeedbackReviewerName] = useState<string>('');
  const [feedbackReviewerTitle, setFeedbackReviewerTitle] = useState<string>('Property General Manager');
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackTags, setFeedbackTags] = useState<string[]>(['Punctual & Alert', 'Client Commendation']);

  // Award Modal State
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [awardGuardId, setAwardGuardId] = useState<string>(guardsList[0]?.id || '');
  const [awardBadgeName, setAwardBadgeName] = useState<string>('Officer of the Month');
  const [awardNotes, setAwardNotes] = useState<string>('');

  // Get ranked guards based on selected sort metric
  const rankedGuards = useMemo(() => {
    const rawList = getLeaderboard(sortMetric, timeframe);
    if (!searchQuery.trim()) return rawList;
    const q = searchQuery.toLowerCase().trim();
    return rawList.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.badgeNumber.toLowerCase().includes(q) ||
        g.topCommendedSite.toLowerCase().includes(q) ||
        g.recognitionBadges.some((b) => b.toLowerCase().includes(q))
    );
  }, [getLeaderboard, sortMetric, timeframe, searchQuery, guardsList, siteFeedbacks, shifts]);

  // Tier Segmentation Logic
  const totalGuardsCount = rankedGuards.length;
  const isTieredView = totalGuardsCount > 10 && !searchQuery.trim();

  const topFiveGuards = useMemo(() => {
    return isTieredView ? rankedGuards.slice(0, 5) : rankedGuards;
  }, [rankedGuards, isTieredView]);

  const middleGuards = useMemo(() => {
    return isTieredView ? rankedGuards.slice(5, totalGuardsCount - 5) : [];
  }, [rankedGuards, isTieredView, totalGuardsCount]);

  const bottomFiveGuards = useMemo(() => {
    return isTieredView ? rankedGuards.slice(totalGuardsCount - 5) : [];
  }, [rankedGuards, isTieredView, totalGuardsCount]);

  // Aggregate Stats
  const avgAsrScore = useMemo(() => {
    if (rankedGuards.length === 0) return 0;
    const sum = rankedGuards.reduce((acc, g) => acc + (g.asrScore ?? g.oculusScore ?? 85), 0);
    return Math.round(sum / rankedGuards.length);
  }, [rankedGuards]);

  const topPerformer = rankedGuards[0];

  // Commendation Tags
  const AVAILABLE_TAGS = [
    'Punctual & Alert',
    'De-escalation',
    'Client Commendation',
    'Maritime Security',
    'ER Specialist',
    'Perimeter Ace',
    'Biometric & Access Control',
    'VIP Concierge',
    'High Surge Response',
    'Master Mentor',
    'Flawless Logbook'
  ];

  // Recognition Badges
  const AVAILABLE_BADGES = [
    'Officer of the Month',
    'Master Instructor',
    'Top Surge Responder',
    'Zero Incident Award',
    'Client Favorite',
    'Flawless Attendance',
    'Aviation Lead Ace',
    'Maritime Security Specialist',
    'VIP Concierge Star',
    'Graveyard Hero'
  ];

  const handleToggleTag = (tag: string) => {
    if (feedbackTags.includes(tag)) {
      setFeedbackTags(feedbackTags.filter((t) => t !== tag));
    } else {
      setFeedbackTags([...feedbackTags, tag]);
    }
  };

  const handleSaveFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    const guard = guardsList.find((g) => g.id === feedbackGuardId);
    if (!guard) return;

    addSiteFeedback({
      guardId: guard.id,
      guardName: guard.name,
      siteName: feedbackSiteName,
      rating: Number(feedbackRating),
      reviewerRole: feedbackReviewerRole,
      reviewerName: feedbackReviewerName.trim() || 'Facility Director',
      reviewerTitle: feedbackReviewerTitle.trim() || 'Site Operations Manager',
      comment: feedbackComment.trim() || 'Guard demonstrated outstanding alertness, professional demeanor, and impeccable post coverage.',
      tags: feedbackTags.length > 0 ? feedbackTags : ['Client Commendation'],
      date: new Date().toISOString().split('T')[0],
      isVerifiedClient: true
    });

    setIsAddFeedbackOpen(false);
    setFeedbackComment('');
    setFeedbackReviewerName('');
  };

  const handleSaveAward = (e: React.FormEvent) => {
    e.preventDefault();
    awardGuardCommendation(awardGuardId, awardBadgeName, awardNotes);
    setIsAwardModalOpen(false);
    setAwardNotes('');
  };

  const handleSaveCoaching = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachingGuard) return;
    scheduleGuardCoaching(coachingGuard.id, coachingTopic, coachingDate, coachingNotes);
    setCoachingGuard(null);
    setCoachingNotes('');
  };

  const getTierBadgeStyle = (tier?: string) => {
    switch (tier) {
      case 'diamond':
        return 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-xs';
      case 'gold':
        return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 font-black shadow-xs';
      case 'silver':
        return 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 font-bold';
      case 'bronze':
        return 'bg-gradient-to-r from-orange-400 to-amber-600 text-white font-bold';
      default:
        return 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800';
    }
  };

  const renderStars = (rating: number, max: number = 5) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[...Array(max)].map((_, i) => {
          const filled = i < Math.floor(rating);
          const half = !filled && i < rating;
          return (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : half
                  ? 'fill-amber-400/50 text-amber-400'
                  : 'text-neutral-300 dark:text-neutral-600'
              }`}
            />
          );
        })}
        <span className="ml-1 text-xs font-bold text-neutral-800 dark:text-neutral-200">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  // Guard Row Renderer
  const renderGuardRow = (
    guard: GuardProfile & GuardPerformanceStats, 
    rankNumber: number,
    sectionType: 'recognition' | 'middle' | 'coaching'
  ) => {
    const asr = guard.asrBreakdown || guard.oculusBreakdown;
    const isTopThree = rankNumber <= 3;
    const isCoaching = sectionType === 'coaching';

    return (
      <div
        key={guard.id}
        className={`p-4 rounded-xl border transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isTopThree
            ? 'bg-gradient-to-r from-amber-50/40 via-white to-white dark:from-amber-950/20 dark:via-neutral-900 dark:to-neutral-900 border-amber-200/80 dark:border-amber-900/40 shadow-xs'
            : isCoaching
            ? 'bg-gradient-to-r from-rose-50/40 via-white to-white dark:from-rose-950/20 dark:via-neutral-900 dark:to-neutral-900 border-rose-200/80 dark:border-rose-900/40'
            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
        }`}
      >
        {/* Left Side: Rank, Avatar, Guard Info */}
        <div className="flex items-center gap-3.5 min-w-[240px]">
          {/* Rank Badge */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
            rankNumber === 1
              ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-neutral-950'
              : rankNumber === 2
              ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900'
              : rankNumber === 3
              ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white'
              : isCoaching
              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}>
            #{rankNumber}
          </div>

          {/* Guard Avatar + Site Qualifications Circle */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-800 dark:text-neutral-200 font-bold text-sm">
              {guard.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="absolute -bottom-1 -right-1">
              <SiteQualificationCircle
                qualifiedSitesCount={guard.ojtSites?.length || 0}
                totalSitesCount={sitesList.length || 8}
                size="xs"
                trainingLevel={guard.trainingLevel}
                role={guard.role}
              />
            </div>
          </div>

          {/* Name & Basic Info */}
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedGuardForDossier(guard)}
                className="font-bold text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors text-left cursor-pointer"
              >
                {guard.name}
              </button>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
                {guard.badgeNumber}
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${getTierBadgeStyle(asr?.tier)}`}>
                {asr?.tierLabel || 'Rank Tier'}
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>{guard.topCommendedSite}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>{guard.onTimeArrivalRate}% On-time</span>
              </span>
              {asr?.geofenceBreachesCount && asr.geofenceBreachesCount > 0 ? (
                <>
                  <span>•</span>
                  <span className="text-rose-600 font-bold flex items-center gap-0.5 text-[11px]">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{asr.geofenceBreachesCount} Geofence {asr.geofenceBreachesCount === 1 ? 'Breach' : 'Breaches'} (&gt;10m)</span>
                  </span>
                </>
              ) : null}

              {/* Coaching Session Status Badges */}
              {guard.latestCoachingSession && (
                <>
                  <span>•</span>
                  {guard.latestCoachingSession.status === 'pending_guard_action' && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Coaching Dispatched ({guard.latestCoachingSession.scheduledDate}) • Pending Guard</span>
                    </span>
                  )}
                  {guard.latestCoachingSession.status === 'alternate_proposed_by_guard' && (
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 text-blue-600" />
                        <span>Alt Proposed: {guard.latestCoachingSession.proposedAlternateDate} @ {guard.latestCoachingSession.proposedAlternateTime}</span>
                      </span>

                      {/* Direct Quick Accept */}
                      <button
                        type="button"
                        id={`btn-quick-accept-alt-${guard.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptAlternateCoaching(guard.latestCoachingSession!.id);
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        title="Accept Guard's Proposed Alternate Time"
                      >
                        <Check className="w-2.5 h-2.5" />
                        <span>Accept</span>
                      </button>

                      {/* Review Decision (Accept / Deny / Counter) */}
                      <button
                        type="button"
                        id={`btn-review-proposal-${guard.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewProposalSession(guard.latestCoachingSession!);
                          setReviewProposalGuard(guard);
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Review proposal: Accept, Deny, or Counter"
                      >
                        <ArrowRightLeft className="w-2.5 h-2.5" />
                        <span>Review / Counter / Deny</span>
                      </button>
                    </div>
                  )}
                  {guard.latestCoachingSession.status === 'counter_proposed_by_admin' && (
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3 text-purple-600" />
                        <span>Counter Sent: {guard.latestCoachingSession.counterProposedDate} @ {guard.latestCoachingSession.counterProposedTime} • Awaiting Guard</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewProposalSession(guard.latestCoachingSession!);
                          setReviewProposalGuard(guard);
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-md transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  {guard.latestCoachingSession.status === 'alternate_denied' && (
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                        <Ban className="w-3 h-3 text-rose-600" />
                        <span>Alt Declined • Orig Stands ({guard.latestCoachingSession.scheduledDate} @ {guard.latestCoachingSession.scheduledTime})</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewProposalSession(guard.latestCoachingSession!);
                          setReviewProposalGuard(guard);
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-md transition-colors cursor-pointer"
                      >
                        Counter Slot
                      </button>
                    </div>
                  )}
                  {guard.latestCoachingSession.status === 'confirmed_by_guard' && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Coaching Confirmed ({guard.latestCoachingSession.scheduledDate} @ {guard.latestCoachingSession.scheduledTime})</span>
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Middle: ASR (Aegis Score & Rank) & Sub-scores Breakdown */}
        <div className="flex items-center flex-wrap gap-4 py-1 md:py-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800 pt-2 md:pt-0">
          {/* ASR Total Score Gauge */}
          <div className="text-center bg-neutral-50 dark:bg-neutral-800/60 px-3 py-1.5 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">ASR Score</div>
            <div className="text-lg font-black text-neutral-900 dark:text-white flex items-baseline justify-center gap-0.5">
              <span>{guard.asrScore ?? guard.oculusScore ?? asr?.asrScore ?? asr?.oculusScore ?? 85}</span>
              <span className="text-[10px] font-semibold text-neutral-400">/100</span>
            </div>
          </div>

          {/* Operational Reliability (60 pts) */}
          <div className="space-y-1 min-w-[120px]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Reliability</span>
              <span className="font-bold text-neutral-800 dark:text-neutral-200 font-mono">
                {asr?.operationalReliabilityScore ?? 50}/60
              </span>
            </div>
            <div className="w-24 sm:w-28 bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  (asr?.operationalReliabilityScore ?? 50) >= 50
                    ? 'bg-emerald-500'
                    : (asr?.operationalReliabilityScore ?? 50) >= 40
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${((asr?.operationalReliabilityScore ?? 50) / 60) * 100}%` }}
              />
            </div>
          </div>

          {/* Client Experience (40 pts) */}
          <div className="space-y-1 min-w-[120px]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Client Exp</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                {asr?.clientExperienceScore ?? 35}/40
              </span>
            </div>
            <div className="w-24 sm:w-28 bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-400 h-full rounded-full transition-all"
                style={{ width: `${((asr?.clientExperienceScore ?? 35) / 40) * 100}%` }}
              />
            </div>
            <div className="text-[10px] text-neutral-400 flex items-center gap-1">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{guard.ratingAverage.toFixed(1)}★ ({asr?.reviewCount ?? guard.recentFeedbacks?.length ?? 0})</span>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {isCoaching ? (
            <>
              {/* Schedule Coaching Button */}
              <button
                id={`btn-schedule-coaching-${guard.id}`}
                onClick={() => {
                  setCoachingGuard(guard);
                  setCoachingTopic('Geofence Post Integrity & SLA Checkpoints');
                }}
                className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Schedule 1-on-1 Performance Coaching"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Schedule Coaching</span>
              </button>

              {/* View Incident Log Button */}
              <button
                id={`btn-view-incident-log-${guard.id}`}
                onClick={() => setIncidentLogGuard(guard)}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="View Geofence Breaches & Incident Log"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Incident Log</span>
              </button>
            </>
          ) : (
            <>
              {/* View Dossier Button */}
              <button
                id={`btn-view-dossier-${guard.id}`}
                onClick={() => setSelectedGuardForDossier(guard)}
                className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Dossier</span>
              </button>

              {/* Award Commendation Button */}
              <button
                id={`btn-quick-award-${guard.id}`}
                onClick={() => {
                  setAwardGuardId(guard.id);
                  setIsAwardModalOpen(true);
                }}
                className="p-1.5 text-neutral-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                title="Award Commendation Badge"
              >
                <Award className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const completedCoachingCount = coachingSessions.filter(s => s.status === 'completed').length;

  return (
    <div id="top-performers-leaderboard-container" className="space-y-6">
      {/* Top View Mode Switcher (Leaderboard vs Coaching Dashboard) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <button
            id="view-tab-leaderboard"
            type="button"
            onClick={() => setActiveViewMode('leaderboard')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeViewMode === 'leaderboard'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboard & Rankings</span>
          </button>

          <button
            id="view-tab-coaching-dashboard"
            type="button"
            onClick={() => setActiveViewMode('coaching_dashboard')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeViewMode === 'coaching_dashboard'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Coaching Completion & Analytics</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeViewMode === 'coaching_dashboard'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            }`}>
              {completedCoachingCount}/{coachingSessions.length} Completed
            </span>
          </button>
        </div>

        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium px-2">
          {activeViewMode === 'leaderboard' 
            ? '100-Pt ASR composite metric engine' 
            : 'Visual completion rates per guard & improvement tracking'}
        </div>
      </div>

      {activeViewMode === 'coaching_dashboard' ? (
        <CoachingPerformanceDashboard 
          onScheduleCoachingClick={(guard) => {
            if (guard) {
              setCoachingGuard(guard as any);
            } else if (rankedGuards.length > 0) {
              setCoachingGuard(rankedGuards[0]);
            }
          }}
        />
      ) : (
        <>
          {/* Leaderboard Top Header & Summary Stats */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-inner">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  Guard Performance Ranking & Leaderboard
                </h2>
                <span className="px-2 py-0.5 text-xs font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-md border border-blue-300/40 dark:border-blue-800/50">
                  100-Pt ASR Index
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Composite scoring combining Operational Reliability (Max 60 pts) and Weighted Client Experience (Max 40 pts).
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              id="btn-log-site-feedback"
              onClick={() => {
                setFeedbackGuardId(topPerformer?.id || guardsList[0]?.id || '');
                setIsAddFeedbackOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Site Feedback (Weighted)</span>
            </button>

            <button
              id="btn-award-commendation"
              onClick={() => {
                setAwardGuardId(topPerformer?.id || guardsList[0]?.id || '');
                setIsAwardModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-500" />
              <span>Award Commendation</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs mb-1">
              <span>Avg ASR Score</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-black text-neutral-900 dark:text-white flex items-baseline gap-1">
              <span>{avgAsrScore}</span>
              <span className="text-xs text-neutral-400 font-normal">/ 100</span>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
              Regional Guard Benchmark
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs mb-1">
              <span>Top Officer</span>
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-sm font-black text-neutral-900 dark:text-white truncate">
              {topPerformer?.name || 'Officer'}
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-bold">
              {topPerformer?.asrScore || topPerformer?.oculusScore || 96} Pts • {topPerformer?.topCommendedSite}
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs mb-1">
              <span>Active Roster</span>
              <Shield className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-black text-neutral-900 dark:text-white">
              {rankedGuards.length} Guards
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isTieredView ? 'Top 5 Recognition • Bottom 5 Coaching' : 'Full Single Roster'}
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs mb-1">
              <span>Client Feedbacks</span>
              <Star className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-black text-neutral-900 dark:text-white">
              {siteFeedbacks.length} Verified
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
              Role Weights: PM (3x), Supv (2x), Res (1x)
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-leaderboard"
            type="text"
            placeholder="Search guard by name, badge, site, or badge..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Metric Selector */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Sort:</span>
          </span>

          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs font-medium">
            <button
              id="sort-metric-composite"
              onClick={() => setSortMetric('composite')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                sortMetric === 'composite'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              ASR Score
            </button>

            <button
              id="sort-metric-reliability"
              onClick={() => setSortMetric('reliability')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                sortMetric === 'reliability'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Reliability (60)
            </button>

            <button
              id="sort-metric-client-exp"
              onClick={() => setSortMetric('client_exp')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                sortMetric === 'client_exp'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Client Exp (40)
            </button>

            <button
              id="sort-metric-shifts"
              onClick={() => setSortMetric('shifts')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                sortMetric === 'shifts'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Shifts
            </button>

            <button
              id="sort-metric-rating"
              onClick={() => setSortMetric('rating')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                sortMetric === 'rating'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Stars
            </button>
          </div>
        </div>
      </div>

      {/* Main Leaderboard Content */}
      <div className="space-y-6">
        {isTieredView ? (
          <>
            {/* SECTION 1: Top 5 (Recognition Tier) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white tracking-tight">
                    Top 5 Performers • Recognition & Merit Tier
                  </h3>
                </div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Elite Roster (Rank #1 - #5)
                </span>
              </div>

              <div className="space-y-2.5">
                {topFiveGuards.map((guard, idx) => renderGuardRow(guard, idx + 1, 'recognition'))}
              </div>
            </div>

            {/* SECTION 2: Middle Roster Collapsed/Expanded Accordion */}
            {middleGuards.length > 0 && (
              <div className="bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3">
                <button
                  id="btn-toggle-middle-roster"
                  onClick={() => setIsMiddleRosterExpanded(!isMiddleRosterExpanded)}
                  className="w-full flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-500" />
                    <span>
                      {middleGuards.length} Officers in Good Standing (Rank #6 to #{5 + middleGuards.length})
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded-full font-normal text-neutral-600 dark:text-neutral-400">
                      Standard Bronze & Silver Tiers
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <span>{isMiddleRosterExpanded ? 'Collapse Middle Roster' : 'Expand Middle Roster'}</span>
                    {isMiddleRosterExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isMiddleRosterExpanded && (
                  <div className="mt-3 space-y-2.5 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                    {middleGuards.map((guard, idx) => renderGuardRow(guard, 6 + idx, 'middle'))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3: Bottom 5 (Coaching & Intervention Tier) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white tracking-tight">
                    Bottom 5 Performers • Coaching & Remediation Tier
                  </h3>
                </div>
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Intervention Queue (Rank #{totalGuardsCount - 4} - #{totalGuardsCount})
                </span>
              </div>

              <div className="space-y-2.5">
                {bottomFiveGuards.map((guard, idx) => 
                  renderGuardRow(guard, totalGuardsCount - 5 + idx + 1, 'coaching')
                )}
              </div>
            </div>
          </>
        ) : (
          /* Full Unified Roster (When <= 10 guards or filtered by search) */
          <div className="space-y-2.5">
            {rankedGuards.map((guard, idx) => renderGuardRow(guard, idx + 1, 'recognition'))}
          </div>
        )}
      </div>
      </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: Comprehensive Guard Dossier & ASR Breakdown */}
      {/* ------------------------------------------------------------- */}
      {selectedGuardForDossier && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-2xl w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedGuardForDossier(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Dossier Header */}
            <div className="flex items-start gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-xl font-bold text-neutral-800 dark:text-neutral-200">
                {selectedGuardForDossier.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    {selectedGuardForDossier.name}
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
                    {selectedGuardForDossier.badgeNumber}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-md ${getTierBadgeStyle((selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.tier)}`}>
                    {(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.tierLabel || 'Active Tier'}
                  </span>
                </div>

                <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-3 mt-1">
                  <span>Role: <strong>{selectedGuardForDossier.role.toUpperCase()}</strong></span>
                  <span>•</span>
                  <span>Primary Site: <strong>{selectedGuardForDossier.topCommendedSite}</strong></span>
                </div>
              </div>

              {/* ASR Score Big Badge */}
              <div className="text-right bg-neutral-50 dark:bg-neutral-800/80 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="text-[10px] uppercase font-bold text-neutral-400">Composite ASR</div>
                <div className="text-2xl font-black text-neutral-900 dark:text-white">
                  {selectedGuardForDossier.asrScore ?? selectedGuardForDossier.oculusScore ?? (selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.asrScore ?? (selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.oculusScore ?? 85}
                  <span className="text-xs font-normal text-neutral-400">/100</span>
                </div>
              </div>
            </div>

            {/* Dossier Body: ASR Score Pillars Breakdown */}
            <div className="py-4 space-y-4">
              {/* Pillar 1: Operational Reliability (Max 60 pts) */}
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
                      1. Operational Reliability Score
                    </h4>
                  </div>
                  <span className="font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    {(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.operationalReliabilityScore ?? 50} / 60.0 Max
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60">
                    <div className="text-neutral-500 dark:text-neutral-400 text-[11px] mb-0.5">Punctuality & Attendance (Max 25)</div>
                    <div className="font-bold text-neutral-900 dark:text-white font-mono">
                      {(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.attendancePunctualityScore ?? 22} pts
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-1">
                      On-time: {selectedGuardForDossier.onTimeArrivalRate}% • Surge Bonus: +{(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.emergencyBonusPts ?? 0}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60">
                    <div className="text-neutral-500 dark:text-neutral-400 text-[11px] mb-0.5">SLA Checkpoints & Timed Sweeps (Max 20)</div>
                    <div className="font-bold text-neutral-900 dark:text-white font-mono">
                      {(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.slaCheckpointsScore ?? 18} pts
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-1">
                      Circuit SLA Compliance: {selectedGuardForDossier.slaCheckpointsCompletedRate ?? 90}%
                    </div>
                  </div>

                  <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60">
                    <div className="text-neutral-500 dark:text-neutral-400 text-[11px] mb-0.5">DAR Logbook Quality (Max 15)</div>
                    <div className="font-bold text-neutral-900 dark:text-white font-mono">
                      {(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.darQualityScore ?? 14} pts
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-1">
                      Photo Proof & Audit Rigor: {selectedGuardForDossier.darQualityRate ?? 88}%
                    </div>
                  </div>

                  <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60">
                    <div className="text-neutral-500 dark:text-neutral-400 text-[11px] mb-0.5">Geofence Post Integrity (-3 pts/breach)</div>
                    <div className={`font-bold font-mono ${
                      ((selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.geofenceBreachesCount || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.geofenceBreachesCount || 0} Breaches (-{(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.geofencePenaltyPts || 0} pts)
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-1">
                      Perimeter departures &gt;10m from designated post
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 2: Client Experience Score (Max 40 pts) */}
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
                      2. Client Experience Score
                    </h4>
                  </div>
                  <span className="font-bold font-mono text-xs text-amber-600 dark:text-amber-400">
                    {(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.clientExperienceScore ?? 35} / 40.0 Max
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-neutral-900 dark:text-white">
                      Weighted Star Rating: {(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.weightedStarRating.toFixed(2) ?? selectedGuardForDossier.ratingAverage.toFixed(2)} ★
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.isDefaultBaseline ? '4.0★ Prior Baseline (<3 reviews)' : 'Direct Weighted Reviews'}
                    </span>
                  </div>

                  {/* Role Weight Multipliers Info */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="p-1.5 bg-neutral-50 dark:bg-neutral-800 rounded">
                      <div className="font-bold text-neutral-900 dark:text-white">Property Manager (3x)</div>
                      <div className="text-blue-600 dark:text-blue-400 font-mono">
                        {(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.reviewWeightBreakdown.propertyManagerCount ?? 0} Reviews
                      </div>
                    </div>
                    <div className="p-1.5 bg-neutral-50 dark:bg-neutral-800 rounded">
                      <div className="font-bold text-neutral-900 dark:text-white">Supervisor (2x)</div>
                      <div className="text-purple-600 dark:text-purple-400 font-mono">
                        {(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.reviewWeightBreakdown.supervisorCount ?? 0} Reviews
                      </div>
                    </div>
                    <div className="p-1.5 bg-neutral-50 dark:bg-neutral-800 rounded">
                      <div className="font-bold text-neutral-900 dark:text-white">Resident / Tenant (1x)</div>
                      <div className="text-slate-600 dark:text-slate-400 font-mono">
                        {(selectedGuardForDossier.asrBreakdown || selectedGuardForDossier.oculusBreakdown)?.reviewWeightBreakdown.residentCount ?? 0} Reviews
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Reviews & Feedbacks */}
              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider text-neutral-500 mb-2">
                  Verified Client Reviews & Commendations
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedGuardForDossier.recentFeedbacks && selectedGuardForDossier.recentFeedbacks.length > 0 ? (
                    selectedGuardForDossier.recentFeedbacks.map((fb, idx) => (
                      <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-neutral-100 dark:border-neutral-800 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-neutral-900 dark:text-white">{fb.reviewerName}</span>
                            <span className="text-[10px] text-neutral-400">({fb.reviewerTitle})</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono rounded">
                              {fb.reviewerRole === 'property_manager' ? '3x Weight' : fb.reviewerRole === 'supervisor' ? '2x Weight' : '1x Weight'}
                            </span>
                          </div>
                          {renderStars(fb.rating)}
                        </div>
                        <p className="text-neutral-600 dark:text-neutral-300 italic">"{fb.comment}"</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-neutral-400 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg">
                      No client reviews logged yet. Baseline 4.0★ (32 pts) applied.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => {
                  setCoachingGuard(selectedGuardForDossier);
                  setSelectedGuardForDossier(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-lg transition-colors cursor-pointer"
              >
                Schedule Coaching
              </button>
              <button
                onClick={() => setSelectedGuardForDossier(null)}
                className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: Interactive Calendar 1-on-1 Performance Coaching */}
      {/* ------------------------------------------------------------- */}
      <CoachingSchedulingCalendarModal
        isOpen={Boolean(coachingGuard)}
        onClose={() => setCoachingGuard(null)}
        guard={coachingGuard}
        guardStats={coachingGuard}
        initialTopic={coachingTopic}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2.5: Admin Review Alternate Coaching Proposal (Accept / Deny / Counter) */}
      {/* ------------------------------------------------------------- */}
      <AdminReviewAlternateProposalModal
        isOpen={Boolean(reviewProposalSession)}
        onClose={() => {
          setReviewProposalSession(null);
          setReviewProposalGuard(null);
        }}
        session={reviewProposalSession}
        guard={reviewProposalGuard || undefined}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: Incident Log & Geofence Breaches Detail */}
      {/* ------------------------------------------------------------- */}
      {incidentLogGuard && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setIncidentLogGuard(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  Incident & Geofence Logbook
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Officer: <strong>{incidentLogGuard.name}</strong> ({incidentLogGuard.badgeNumber})
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-1">
                <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center justify-between">
                  <span>Geofence Post Breaches (&gt;10m Departure)</span>
                  <span className="font-mono">{(incidentLogGuard.asrBreakdown || incidentLogGuard.oculusBreakdown)?.geofenceBreachesCount || 0} Total</span>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-400">
                  Each unexcused breach deducts -3 points from the Operational Reliability score.
                </p>
              </div>

              {/* Sample Log Entries */}
              <div className="space-y-2">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200/60 dark:border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">Perimeter Zone Departure (14.2m)</span>
                    <span className="text-[10px] text-neutral-400 font-mono">3 days ago</span>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 text-[11px]">
                    Site: {incidentLogGuard.topCommendedSite} • Departure duration: 18 mins. Officer was flagged outside geofence buffer.
                  </p>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200/60 dark:border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">Late Call-Off / Tardiness Flag</span>
                    <span className="text-[10px] text-neutral-400 font-mono">2 weeks ago</span>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 text-[11px]">
                    Late notification submitted &lt;2 hours before shift commencement.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => {
                  setCoachingGuard(incidentLogGuard);
                  setIncidentLogGuard(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-lg cursor-pointer"
              >
                Schedule Remediation
              </button>
              <button
                onClick={() => setIncidentLogGuard(null)}
                className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: Log Site Feedback (With Role Weight Multipliers) */}
      {/* ------------------------------------------------------------- */}
      {isAddFeedbackOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsAddFeedbackOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  Log Verified Site Feedback
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Reviews are weighted in the ASR Client Experience score (Max 40 pts).
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveFeedback} className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Target Guard
                </label>
                <select
                  value={feedbackGuardId}
                  onChange={(e) => setFeedbackGuardId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {guardsList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.badgeNumber}) - {g.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reviewer Role Multiplier Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Reviewer Role & ASR Weight Multiplier
                </label>
                <select
                  value={feedbackReviewerRole}
                  onChange={(e) => setFeedbackReviewerRole(e.target.value as ReviewerRoleType)}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="property_manager">Property Manager / Client / Facilities (3x Weight)</option>
                  <option value="supervisor">Operations Supervisor / Lead Officer (2x Weight)</option>
                  <option value="resident">Resident / Tenant / Visitor (1x Weight)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Rating (1-5 Stars)
                  </label>
                  <select
                    value={feedbackRating}
                    onChange={(e) => setFeedbackRating(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white font-bold"
                  >
                    <option value={5}>5.0 Stars (Exceptional)</option>
                    <option value={4}>4.0 Stars (Solid Performance)</option>
                    <option value={3}>3.0 Stars (Satisfactory)</option>
                    <option value={2}>2.0 Stars (Needs Improvement)</option>
                    <option value={1}>1.0 Star (Deficient)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Site Location
                  </label>
                  <select
                    value={feedbackSiteName}
                    onChange={(e) => setFeedbackSiteName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                  >
                    {sitesList.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Reviewer Name & Title
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="E.g. Elena Rostova"
                    value={feedbackReviewerName}
                    onChange={(e) => setFeedbackReviewerName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="E.g. Senior Facilities Director"
                    value={feedbackReviewerTitle}
                    onChange={(e) => setFeedbackReviewerTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Evaluation Feedback & Comments
                </label>
                <textarea
                  rows={3}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Officer performed thorough access control scans and maintained outstanding presence."
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFeedbackOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer shadow-xs"
                >
                  Save Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: Award Commendation Badge */}
      {/* ------------------------------------------------------------- */}
      {isAwardModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsAwardModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  Award Official Commendation
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Official badge issued to guard profile with permanent admin log entry.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAward} className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Recipient Guard
                </label>
                <select
                  value={awardGuardId}
                  onChange={(e) => setAwardGuardId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                >
                  {guardsList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.badgeNumber}) - {g.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Commendation Badge Title
                </label>
                <select
                  value={awardBadgeName}
                  onChange={(e) => setAwardBadgeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white font-bold"
                >
                  {AVAILABLE_BADGES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Commendation Citation & Notes
                </label>
                <textarea
                  rows={3}
                  value={awardNotes}
                  onChange={(e) => setAwardNotes(e.target.value)}
                  placeholder="E.g., Exemplary performance during emergency night surge and flawless access control audit."
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAwardModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-lg cursor-pointer shadow-xs"
                >
                  Award Commendation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
