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
  ExternalLink
} from 'lucide-react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { GuardProfile, GuardPerformanceStats, SiteFeedbackEntry } from '../../types/shift';
import { SiteQualificationCircle } from './SiteQualificationCircle';

interface TopPerformersWidgetProps {
  onNavigateToGuardDirectory?: (guardId?: string) => void;
  compact?: boolean;
}

type SortMetric = 'composite' | 'shifts' | 'rating' | 'emergency' | 'ontime';
type TimeframeFilter = 'all' | 'month' | 'quarter';

export const TopPerformersWidget: React.FC<TopPerformersWidgetProps> = ({ 
  onNavigateToGuardDirectory,
  compact = false 
}) => {
  const { 
    guardsList, 
    siteFeedbacks, 
    addSiteFeedback, 
    awardGuardCommendation, 
    getLeaderboard,
    getGuardPerformance,
    shifts
  } = useShiftOps();

  const [sortMetric, setSortMetric] = useState<SortMetric>('composite');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuardForDossier, setSelectedGuardForDossier] = useState<(GuardProfile & GuardPerformanceStats) | null>(null);
  const [isAddFeedbackOpen, setIsAddFeedbackOpen] = useState(false);
  const [feedbackGuardId, setFeedbackGuardId] = useState<string>(guardsList[0]?.id || '');
  const [feedbackSiteName, setFeedbackSiteName] = useState<string>('Port Authority - Pier 7');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackReviewerName, setFeedbackReviewerName] = useState<string>('');
  const [feedbackReviewerTitle, setFeedbackReviewerTitle] = useState<string>('Site Operations Director');
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackTags, setFeedbackTags] = useState<string[]>(['Punctual & Alert', 'Client Commendation']);
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

  // Overall aggregate stats
  const totalFulfilled = useMemo(() => {
    return rankedGuards.reduce((acc, g) => acc + g.fulfilledShiftsCount, 0);
  }, [rankedGuards]);

  const avgFeedbackScore = useMemo(() => {
    if (siteFeedbacks.length === 0) return 4.9;
    const sum = siteFeedbacks.reduce((acc, f) => acc + f.rating, 0);
    return (sum / siteFeedbacks.length).toFixed(2);
  }, [siteFeedbacks]);

  const topPerformer = rankedGuards[0];
  const secondPerformer = rankedGuards[1];
  const thirdPerformer = rankedGuards[2];

  // Preset commendation tags
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

  // Preset recognition badges
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

  // Render Star Rating
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
        <span className="ml-1 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  return (
    <div id="top-performers-leaderboard-container" className="space-y-6">
      {/* Leaderboard Top Header & Summary Stats */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-inner">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  Top Performers Leaderboard
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-md border border-amber-300/40 dark:border-amber-800/50">
                  Live Rankings
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Recognizing guards with highest fulfilled shift volume, positive facility feedback, and zero-incident reliability.
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
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Site Feedback</span>
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
              <span>Total Fulfilled Shifts</span>
              <Shield className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-neutral-900 dark:text-white">
              {totalFulfilled}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Across all regional posts
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs mb-1">
              <span>Avg Site Satisfaction</span>
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {avgFeedbackScore}★
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {siteFeedbacks.length} client evaluations
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs mb-1">
              <span>On-Time Punctuality</span>
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              98.7%
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Biometric check-in verified
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs mb-1">
              <span>Surge Emergency Fills</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
              {rankedGuards.reduce((acc, g) => acc + g.emergencyShiftsFulfilled, 0)}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              100% critical coverage
            </div>
          </div>
        </div>
      </div>

      {/* Podium Cards for Top 3 Guards (When not searching / default view) */}
      {!searchQuery && topPerformer && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* #2 Silver Card */}
          {secondPerformer && (
            <div 
              id="podium-card-rank-2"
              onClick={() => setSelectedGuardForDossier(secondPerformer)}
              className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 relative overflow-hidden cursor-pointer hover:shadow-md hover:border-slate-400 dark:hover:border-slate-700 transition-all order-2 md:order-1"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-400/10 to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center border border-slate-300 dark:border-slate-700">
                    #2
                  </span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Silver Tier</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Medal className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-200 font-bold text-base border-2 border-slate-300 dark:border-slate-700">
                    {secondPerformer.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="absolute -bottom-1 -right-1">
                    <SiteQualificationCircle 
                      ojtCount={secondPerformer.ojtSites.length} 
                      totalSites={8} 
                      size={22} 
                      strokeWidth={3} 
                    />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white text-base">
                    {secondPerformer.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>{secondPerformer.badgeNumber}</span>
                    <span>•</span>
                    <span className="capitalize">{secondPerformer.role}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-lg text-xs mb-3">
                <div>
                  <span className="text-neutral-500 block text-[11px]">Fulfilled Shifts</span>
                  <span className="font-bold text-neutral-900 dark:text-white text-sm">
                    {secondPerformer.fulfilledShiftsCount} shifts
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Rating</span>
                  {renderStars(secondPerformer.ratingAverage)}
                </div>
              </div>

              <div className="text-xs text-neutral-600 dark:text-neutral-400 italic line-clamp-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded border border-slate-100 dark:border-slate-800">
                "{secondPerformer.recentFeedbacks?.[0]?.comment || 'Outstanding dedication and flawless attendance records across all assigned posts.'}"
              </div>
            </div>
          )}

          {/* #1 Gold Card (Taller & Prominent) */}
          <div 
            id="podium-card-rank-1"
            onClick={() => setSelectedGuardForDossier(topPerformer)}
            className="bg-gradient-to-b from-amber-500/10 via-white to-white dark:from-amber-500/15 dark:via-neutral-900 dark:to-neutral-900 border-2 border-amber-400 dark:border-amber-500/60 rounded-xl p-5 relative overflow-hidden cursor-pointer shadow-md hover:shadow-lg transition-all order-1 md:order-2 md:-mt-4"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-transparent rounded-bl-full pointer-events-none" />
            
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-black text-xs flex items-center gap-1 shadow-sm">
                  <Trophy className="w-3.5 h-3.5 fill-white" />
                  #1 RANK
                </span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Gold Champion</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-md">
                <CrownIcon className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center text-amber-900 dark:text-amber-200 font-extrabold text-lg border-2 border-amber-400 shadow-sm">
                  {topPerformer.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <SiteQualificationCircle 
                    ojtCount={topPerformer.ojtSites.length} 
                    totalSites={8} 
                    size={24} 
                    strokeWidth={3} 
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-neutral-900 dark:text-white text-lg tracking-tight">
                    {topPerformer.name}
                  </h3>
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                  <span className="font-semibold">{topPerformer.badgeNumber}</span>
                  <span>•</span>
                  <span className="capitalize">{topPerformer.role}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-lg text-xs mb-3 border border-amber-200/50 dark:border-amber-800/40">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">Fulfilled</span>
                <span className="font-black text-neutral-900 dark:text-white text-sm">
                  {topPerformer.fulfilledShiftsCount}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">Hours</span>
                <span className="font-black text-neutral-900 dark:text-white text-sm">
                  {topPerformer.totalHoursCompleted}h
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">Rating</span>
                <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                  {topPerformer.ratingAverage.toFixed(2)}★
                </span>
              </div>
            </div>

            {/* Recognition Badges */}
            <div className="flex flex-wrap gap-1 mb-3">
              {topPerformer.recognitionBadges.slice(0, 3).map((badge, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded border border-amber-300/40 dark:border-amber-700/40"
                >
                  {badge}
                </span>
              ))}
            </div>

            <div className="text-xs text-neutral-700 dark:text-neutral-300 italic line-clamp-2 bg-white/80 dark:bg-neutral-800/70 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
              "{topPerformer.recentFeedbacks?.[0]?.comment || 'Exceptional leadership, crisis de-escalation mastery, and outstanding site client evaluations.'}"
            </div>
          </div>

          {/* #3 Bronze Card */}
          {thirdPerformer && (
            <div 
              id="podium-card-rank-3"
              onClick={() => setSelectedGuardForDossier(thirdPerformer)}
              className="bg-white dark:bg-neutral-900 border border-orange-200/70 dark:border-orange-950/60 rounded-xl p-5 relative overflow-hidden cursor-pointer hover:shadow-md hover:border-orange-300 dark:hover:border-orange-900 transition-all order-3"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-400/10 to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 font-bold text-xs flex items-center justify-center border border-orange-300 dark:border-orange-800">
                    #3
                  </span>
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">Bronze Tier</span>
                </div>
                <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400">
                  <Medal className="w-5 h-5" />
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-200 font-bold text-base border-2 border-orange-300 dark:border-orange-800">
                    {thirdPerformer.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="absolute -bottom-1 -right-1">
                    <SiteQualificationCircle 
                      ojtCount={thirdPerformer.ojtSites.length} 
                      totalSites={8} 
                      size={22} 
                      strokeWidth={3} 
                    />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white text-base">
                    {thirdPerformer.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>{thirdPerformer.badgeNumber}</span>
                    <span>•</span>
                    <span className="capitalize">{thirdPerformer.role}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-lg text-xs mb-3">
                <div>
                  <span className="text-neutral-500 block text-[11px]">Fulfilled Shifts</span>
                  <span className="font-bold text-neutral-900 dark:text-white text-sm">
                    {thirdPerformer.fulfilledShiftsCount} shifts
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Rating</span>
                  {renderStars(thirdPerformer.ratingAverage)}
                </div>
              </div>

              <div className="text-xs text-neutral-600 dark:text-neutral-400 italic line-clamp-2 bg-orange-50/50 dark:bg-orange-950/30 p-2 rounded border border-orange-100 dark:border-orange-900/40">
                "{thirdPerformer.recentFeedbacks?.[0]?.comment || 'Rapid responder with aviation credentials and reliable emergency shift coverage.'}"
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metric Sort Tabs & Search Controls */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Sort Metrics Selector */}
          <div className="flex items-center flex-wrap gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg">
            <button
              id="sort-metric-composite"
              onClick={() => setSortMetric('composite')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                sortMetric === 'composite'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              ⭐ Overall Performance
            </button>

            <button
              id="sort-metric-shifts"
              onClick={() => setSortMetric('shifts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                sortMetric === 'shifts'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              🛡️ Most Shifts Fulfilled
            </button>

            <button
              id="sort-metric-rating"
              onClick={() => setSortMetric('rating')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                sortMetric === 'rating'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              ★ Site Feedback Rating
            </button>

            <button
              id="sort-metric-emergency"
              onClick={() => setSortMetric('emergency')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                sortMetric === 'emergency'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              🚨 Emergency Surge Fills
            </button>

            <button
              id="sort-metric-ontime"
              onClick={() => setSortMetric('ontime')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                sortMetric === 'ontime'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              ⏱️ Punctuality
            </button>
          </div>

          {/* Search Field */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-leaderboard"
              type="text"
              placeholder="Search guard, badge, site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Detailed Leaderboard Table */}
        <div className="overflow-x-auto">
          <table id="table-guard-leaderboard" className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3 w-12 text-center">Rank</th>
                <th className="py-3 px-3">Guard / Badge</th>
                <th className="py-3 px-3">Fulfilled Shifts</th>
                <th className="py-3 px-3">Hours Logged</th>
                <th className="py-3 px-3">Site Rating & Feedback</th>
                <th className="py-3 px-3">Surge Fills</th>
                <th className="py-3 px-3">Punctuality</th>
                <th className="py-3 px-3">Top Commended Site</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {rankedGuards.map((guard, index) => {
                const rank = index + 1;
                const isGold = rank === 1;
                const isSilver = rank === 2;
                const isBronze = rank === 3;

                return (
                  <tr 
                    key={guard.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedGuardForDossier(guard)}
                  >
                    {/* Rank Badge */}
                    <td className="py-3.5 px-3 text-center">
                      {isGold ? (
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs inline-flex items-center justify-center shadow-xs">
                          1
                        </span>
                      ) : isSilver ? (
                        <span className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs inline-flex items-center justify-center">
                          2
                        </span>
                      ) : isBronze ? (
                        <span className="w-6 h-6 rounded-full bg-orange-300 dark:bg-orange-800 text-orange-950 dark:text-white font-bold text-xs inline-flex items-center justify-center">
                          3
                        </span>
                      ) : (
                        <span className="text-neutral-400 font-semibold">
                          #{rank}
                        </span>
                      )}
                    </td>

                    {/* Guard Info */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                            {guard.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                            <span>{guard.name}</span>
                            {guard.role === 'supervisor' && (
                              <span className="px-1.5 py-0.2 text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded font-medium">
                                Supv
                              </span>
                            )}
                            {guard.role === 'lead' && (
                              <span className="px-1.5 py-0.2 text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-medium">
                                Lead
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                            <span>{guard.badgeNumber}</span>
                            <span>•</span>
                            <span>{guard.ojtSites.length}/8 sites qualified</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Fulfilled Shifts */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-neutral-900 dark:text-white text-sm">
                          {guard.fulfilledShiftsCount}
                        </span>
                        <span className="text-neutral-500 text-[11px]">shifts</span>
                      </div>
                    </td>

                    {/* Hours */}
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {guard.totalHoursCompleted} hrs
                      </span>
                    </td>

                    {/* Rating & Feedback Reviews */}
                    <td className="py-3.5 px-3">
                      <div>
                        {renderStars(guard.ratingAverage)}
                        <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-neutral-400" />
                          <span>{guard.positiveFeedbackCount} verified reviews</span>
                        </div>
                      </div>
                    </td>

                    {/* Emergency Surge */}
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded font-semibold text-xs border border-rose-200 dark:border-rose-900/40">
                        <ShieldAlert className="w-3 h-3" />
                        {guard.emergencyShiftsFulfilled} fills
                      </span>
                    </td>

                    {/* Punctuality */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: `${Math.min(100, guard.onTimeArrivalRate)}%` }} 
                          />
                        </div>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                          {guard.onTimeArrivalRate}%
                        </span>
                      </div>
                    </td>

                    {/* Top Site */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{guard.topCommendedSite}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`btn-view-dossier-${guard.id}`}
                          onClick={() => setSelectedGuardForDossier(guard)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded transition-colors"
                        >
                          Dossier
                        </button>
                        <button
                          id={`btn-review-guard-${guard.id}`}
                          onClick={() => {
                            setFeedbackGuardId(guard.id);
                            setIsAddFeedbackOpen(true);
                          }}
                          className="p-1 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          title="Add Site Feedback"
                        >
                          <Plus className="w-4 h-4" />
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

      {/* Feed of Recent Verified Client Commendations */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-neutral-900 dark:text-white text-base">
              Recent Facility & Client Commendations
            </h3>
          </div>
          <span className="text-xs text-neutral-500">
            {siteFeedbacks.length} total client reviews logged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {siteFeedbacks.slice(0, 6).map((feedback) => (
            <div 
              key={feedback.id}
              className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800 rounded-lg p-3.5 space-y-2.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold text-xs flex items-center justify-center">
                      {feedback.guardName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-neutral-900 dark:text-white">
                        {feedback.guardName}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {feedback.siteName}
                      </div>
                    </div>
                  </div>
                  {renderStars(feedback.rating)}
                </div>

                <p className="text-xs text-neutral-700 dark:text-neutral-300 italic leading-relaxed">
                  "{feedback.comment}"
                </p>
              </div>

              <div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {feedback.tags.map((tag, i) => (
                    <span 
                      key={i}
                      className="px-1.5 py-0.5 text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between text-[10px] text-neutral-500">
                  <span className="font-medium text-neutral-700 dark:text-neutral-400">
                    {feedback.reviewerName} ({feedback.reviewerTitle})
                  </span>
                  <span>{feedback.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal 1: Guard Performance & Site Commendation Dossier Modal */}
      {selectedGuardForDossier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div 
            id="guard-performance-dossier-modal"
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Dossier Header */}
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white p-5 flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-full bg-neutral-700 border-2 border-amber-400 flex items-center justify-center text-white font-extrabold text-lg shadow-inner">
                  {selectedGuardForDossier.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {selectedGuardForDossier.name}
                    </h2>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-amber-500 text-neutral-900 rounded">
                      Rank #{rankedGuards.findIndex(g => g.id === selectedGuardForDossier.id) + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-300 mt-1">
                    <span>Badge: <strong>{selectedGuardForDossier.badgeNumber}</strong></span>
                    <span>•</span>
                    <span>Role: <strong className="capitalize">{selectedGuardForDossier.role}</strong></span>
                    <span>•</span>
                    <span>{selectedGuardForDossier.phone}</span>
                  </div>
                </div>
              </div>

              <button
                id="btn-close-dossier-modal"
                onClick={() => setSelectedGuardForDossier(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Performance Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 mb-1">Fulfilled Shifts</div>
                  <div className="text-xl font-bold text-neutral-900 dark:text-white">
                    {selectedGuardForDossier.fulfilledShiftsCount}
                  </div>
                  <div className="text-[11px] text-neutral-500">{selectedGuardForDossier.totalHoursCompleted} hrs completed</div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 mb-1">Client Rating</div>
                  <div className="text-xl font-bold text-amber-500">
                    {selectedGuardForDossier.ratingAverage.toFixed(2)}★
                  </div>
                  <div className="text-[11px] text-neutral-500">{selectedGuardForDossier.positiveFeedbackCount} verified reviews</div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 mb-1">Surge Emergency Fills</div>
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                    {selectedGuardForDossier.emergencyShiftsFulfilled}
                  </div>
                  <div className="text-[11px] text-neutral-500">Short notice response</div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-xs text-neutral-500 mb-1">On-Time Arrival</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedGuardForDossier.onTimeArrivalRate}%
                  </div>
                  <div className="text-[11px] text-neutral-500">Punctuality index</div>
                </div>
              </div>

              {/* Official Commendations & Badges */}
              <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-neutral-900 dark:text-white">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Official Operational Commendations</span>
                  </div>
                  <button
                    onClick={() => {
                      setAwardGuardId(selectedGuardForDossier.id);
                      setIsAwardModalOpen(true);
                    }}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Bestow Award</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedGuardForDossier.recognitionBadges.map((badge, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 text-xs font-bold bg-white dark:bg-neutral-900 text-amber-900 dark:text-amber-200 rounded-lg border border-amber-300 dark:border-amber-700 shadow-xs flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      {badge}
                    </span>
                  ))}
                </div>
              </div>

              {/* Verified Facility Feedback Reviews */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>Verified Facility Reviews & Field Commendations</span>
                  </h4>
                  <button
                    onClick={() => {
                      setFeedbackGuardId(selectedGuardForDossier.id);
                      setIsAddFeedbackOpen(true);
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    + Add New Review
                  </button>
                </div>

                <div className="space-y-3">
                  {siteFeedbacks.filter(f => f.guardId === selectedGuardForDossier.id).length === 0 ? (
                    <div className="text-center py-6 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                      No specific client written feedback logged yet for this officer. Click "+ Add New Review" to submit.
                    </div>
                  ) : (
                    siteFeedbacks.filter(f => f.guardId === selectedGuardForDossier.id).map(feedback => (
                      <div 
                        key={feedback.id}
                        className="bg-neutral-50 dark:bg-neutral-800/70 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-xs text-neutral-900 dark:text-white">
                              {feedback.siteName}
                            </span>
                            <div className="text-[11px] text-neutral-500">
                              By {feedback.reviewerName} ({feedback.reviewerTitle}) • {feedback.date}
                            </div>
                          </div>
                          {renderStars(feedback.rating)}
                        </div>

                        <p className="text-xs text-neutral-700 dark:text-neutral-300 italic">
                          "{feedback.comment}"
                        </p>

                        <div className="flex flex-wrap gap-1">
                          {feedback.tags.map((t, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-[10px] bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Dossier Footer */}
            <div className="bg-neutral-50 dark:bg-neutral-800/80 px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
              <div className="text-xs text-neutral-500">
                OJT Qualification: <strong>{selectedGuardForDossier.ojtSites.length} of 8 Sites</strong>
              </div>
              <div className="flex items-center gap-2">
                {onNavigateToGuardDirectory && (
                  <button
                    onClick={() => {
                      onNavigateToGuardDirectory(selectedGuardForDossier.id);
                      setSelectedGuardForDossier(null);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>View in Guard Directory</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedGuardForDossier(null)}
                  className="px-4 py-1.5 text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Log Site Feedback Modal */}
      {isAddFeedbackOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            id="modal-add-site-feedback"
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-bold text-base">Record Site Feedback & Commendation</h3>
              </div>
              <button
                onClick={() => setIsAddFeedbackOpen(false)}
                className="p-1 text-blue-100 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFeedback} className="p-5 space-y-4 text-xs">
              {/* Select Guard */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Guard Officer *
                </label>
                <select
                  id="select-feedback-guard"
                  value={feedbackGuardId}
                  onChange={(e) => setFeedbackGuardId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  required
                >
                  {guardsList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.badgeNumber}) - {g.role.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Facility Site */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Facility / Site Post *
                </label>
                <select
                  id="select-feedback-site"
                  value={feedbackSiteName}
                  onChange={(e) => setFeedbackSiteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  required
                >
                  <option value="Port Authority - Pier 7">Port Authority - Pier 7</option>
                  <option value="West Medical Center">West Medical Center</option>
                  <option value="Corporate HQ">Corporate HQ</option>
                  <option value="City Airport Gate 4">City Airport Gate 4</option>
                  <option value="Tech Campus North">Tech Campus North</option>
                  <option value="Industrial Warehouse">Industrial Warehouse</option>
                  <option value="Retail Plaza">Retail Plaza</option>
                  <option value="Hotel Lobby">Hotel Lobby</option>
                </select>
              </div>

              {/* Star Rating Selector */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Evaluation Rating: {feedbackRating} / 5 Stars
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        feedbackRating >= star
                          ? 'bg-amber-500/15 border-amber-400 text-amber-500'
                          : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-400'
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 ml-2">
                    {feedbackRating === 5 ? 'Exceptional (5.0)' : feedbackRating >= 4 ? 'Commended (4.0+)' : 'Satisfactory'}
                  </span>
                </div>
              </div>

              {/* Reviewer Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Reviewer Name
                  </label>
                  <input
                    id="input-reviewer-name"
                    type="text"
                    placeholder="e.g. Capt. Thomas Vance"
                    value={feedbackReviewerName}
                    onChange={(e) => setFeedbackReviewerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Reviewer Title / Role
                  </label>
                  <input
                    id="input-reviewer-title"
                    type="text"
                    placeholder="e.g. Operations Director"
                    value={feedbackReviewerTitle}
                    onChange={(e) => setFeedbackReviewerTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Commendation Tags */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Commendation Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TAGS.map((tag) => {
                    const isSelected = feedbackTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Comments */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Detailed Client Comments / Incident Notes *
                </label>
                <textarea
                  id="textarea-feedback-comment"
                  rows={3}
                  placeholder="Describe specific actions, vigilance, customer service, or incident handling performed by the guard..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddFeedbackOpen(false)}
                  className="px-3.5 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-feedback"
                  className="px-4 py-2 font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Submit Site Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Award Official Commendation Modal */}
      {isAwardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            id="modal-award-commendation"
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="bg-amber-500 text-neutral-950 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 fill-neutral-950" />
                <h3 className="font-extrabold text-base">Award Operational Commendation</h3>
              </div>
              <button
                onClick={() => setIsAwardModalOpen(false)}
                className="p-1 text-neutral-900 hover:text-black rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAward} className="p-5 space-y-4 text-xs">
              {/* Select Guard */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Recipient Guard Officer *
                </label>
                <select
                  id="select-award-guard"
                  value={awardGuardId}
                  onChange={(e) => setAwardGuardId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  required
                >
                  {guardsList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.badgeNumber}) - {g.role.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Badge Selection */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Recognition Badge
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  {AVAILABLE_BADGES.map((badge) => (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => setAwardBadgeName(badge)}
                      className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md text-left transition-colors cursor-pointer ${
                        awardBadgeName === badge
                          ? 'bg-amber-500 text-neutral-950 font-bold'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {badge}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Custom Citation Notes */}
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Citation Reason / Admin Notes
                </label>
                <textarea
                  id="textarea-award-notes"
                  rows={2}
                  placeholder="e.g. Recognized for outstanding response during the August midnight maritime convoy surge..."
                  value={awardNotes}
                  onChange={(e) => setAwardNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAwardModalOpen(false)}
                  className="px-3.5 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-confirm-award"
                  className="px-4 py-2 font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-lg transition-colors cursor-pointer"
                >
                  Issue Award & Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Lucide-style Crown icon component for rank 1
const CrownIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    stroke="none" 
    className={className}
  >
    <path d="M2 4l3 12h14l3-12-5 4-5-6-5 6-5-4zM5 18h14v2H5v-2z" />
  </svg>
);
