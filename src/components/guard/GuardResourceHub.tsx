import React, { useState, useEffect, useMemo } from 'react';
import {
  ResourceItem,
  ResourceCategory,
  ResourceAcknowledgmentRecord,
  loadStoredResources,
  loadResourceAcknowledgments,
  saveResourceAcknowledgments,
  subscribeToResourceUpdates,
} from '../../types/resources';
import { useShiftOps } from '../../context/ShiftOpsContext';
import {
  Search,
  FileText,
  Play,
  Pause,
  AudioLines,
  BookOpen,
  CheckCircle2,
  X,
  Presentation,
  ShieldCheck,
  Clock,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const CATEGORY_CHIPS: {
  key: 'ALL' | ResourceCategory;
  label: string;
}[] = [
  { key: 'ALL', label: '[ All ]' },
  { key: 'SOP', label: '[ SOPs ]' },
  { key: 'HANDBOOK', label: '[ Handbooks ]' },
  { key: 'VIDEO', label: '[ Videos ]' },
  { key: 'PODCAST', label: '[ Podcasts ]' },
  { key: 'TRAINING_DECK', label: '[ Decks ]' },
];

export const GuardResourceHub: React.FC = () => {
  const { activeGuard, addAuditLog, showToast } = useShiftOps();

  const [resources, setResources] = useState<ResourceItem[]>(() => loadStoredResources());
  const [acknowledgments, setAcknowledgments] = useState<ResourceAcknowledgmentRecord[]>(() =>
    loadResourceAcknowledgments()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ResourceCategory>('ALL');

  // Interactive Viewer Modal State
  const [activeResource, setActiveResource] = useState<ResourceItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(28);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(1);

  useEffect(() => {
    return subscribeToResourceUpdates(() => {
      setResources(loadStoredResources());
      setAcknowledgments(loadResourceAcknowledgments());
    });
  }, []);

  // Simulate media progress when playing inside the streaming modal
  useEffect(() => {
    if (!isPlaying || !activeResource) return;
    const timer = window.setInterval(() => {
      setPlaybackProgress((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 600);
    return () => window.clearInterval(timer);
  }, [isPlaying, activeResource]);

  const isResourceAcknowledged = (resourceId: string): boolean => {
    return acknowledgments.some(
      (a) => a.resourceId === resourceId && a.guardId === activeGuard.id
    );
  };

  const handleAcknowledgeResource = (item: ResourceItem) => {
    if (isResourceAcknowledged(item.id)) {
      showToast(
        'Already Acknowledged',
        `You have already signed off on "${item.title}".`,
        'info'
      );
      return;
    }

    const newRecord: ResourceAcknowledgmentRecord = {
      resourceId: item.id,
      guardId: activeGuard.id,
      guardName: activeGuard.name,
      badgeNumber: activeGuard.badgeNumber,
      acknowledgedAt: new Date().toISOString(),
    };

    const nextAcks = [newRecord, ...acknowledgments];
    setAcknowledgments(nextAcks);
    saveResourceAcknowledgments(nextAcks);

    addAuditLog(
      'RESOURCE_ACKNOWLEDGED',
      'system',
      `Guard ${activeGuard.name} (${activeGuard.badgeNumber}) acknowledged training resource "${item.title}" [${item.category}]`,
      `${activeGuard.name} (${activeGuard.badgeNumber})`,
      'success'
    );

    showToast(
      'Training Review Acknowledged',
      `Compliance sign-off recorded for "${item.title}".`,
      'success'
    );
  };

  const openViewerModal = (item: ResourceItem) => {
    setActiveResource(item);
    setIsPlaying(item.fileType === 'mp4' || item.fileType === 'mp3');
    setPlaybackProgress(24);
    setCurrentSlideIndex(1);
  };

  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchesCategory =
        selectedCategory === 'ALL' || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.siteSpecificCode && item.siteSpecificCode.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [resources, selectedCategory, searchQuery]);

  const renderFileTypeIconBadge = (item: ResourceItem) => {
    if (item.fileType === 'mp4' || item.category === 'VIDEO') {
      return (
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-black uppercase shrink-0"
          title="Video Stream"
        >
          <Play className="w-3.5 h-3.5 fill-current text-rose-400" />
          <span>VIDEO • {item.fileType.toUpperCase()}</span>
        </div>
      );
    }

    if (item.fileType === 'mp3' || item.category === 'PODCAST') {
      return (
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-black uppercase shrink-0"
          title="Audio Stream"
        >
          <AudioLines className="w-3.5 h-3.5 text-amber-400" />
          <span>AUDIO • {item.fileType.toUpperCase()}</span>
        </div>
      );
    }

    if (item.fileType === 'pptx' || item.category === 'TRAINING_DECK') {
      return (
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/90 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-black uppercase shrink-0"
          title="Training Deck"
        >
          <Presentation className="w-3.5 h-3.5 text-purple-400" />
          <span>DECK • {item.fileType.toUpperCase()}</span>
        </div>
      );
    }

    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/90 border border-blue-500/40 text-blue-300 text-[10px] font-mono font-black uppercase shrink-0"
        title="PDF / SOP Document"
      >
        <FileText className="w-3.5 h-3.5 text-blue-400" />
        <span>PDF BADGE • {item.fileType.toUpperCase()}</span>
      </div>
    );
  };

  const isMediaResource = (item: ResourceItem) =>
    item.fileType === 'mp4' ||
    item.fileType === 'mp3' ||
    item.category === 'VIDEO' ||
    item.category === 'PODCAST';

  const pendingMandatoryCount = resources.filter(
    (r) => r.requiresAcknowledgment && !isResourceAcknowledged(r.id)
  ).length;

  return (
    <section id="guard-resource-hub" className="space-y-3">
      {/* Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-white">
                Field Resources &amp; Training Library
              </h2>
              <p className="text-[10px] text-slate-400">
                On-Shift SOPs, Handbooks, Briefings &amp; Mandatory Sign-Offs
              </p>
            </div>
          </div>
          {pendingMandatoryCount > 0 ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {pendingMandatoryCount} Action Req
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              100% Compliant
            </span>
          )}
        </div>

        {/* Search Bar: Instant filtering by keyword or title */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="guard-resource-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SOPs, handbooks, videos, or keywords..."
            className="w-full pl-8 pr-8 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Chips: [ All ] [ SOPs ] [ Handbooks ] [ Videos ] [ Podcasts ] [ Decks ] */}
        <div
          id="guard-resource-category-chips"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5"
        >
          {CATEGORY_CHIPS.map((chip) => {
            const active = selectedCategory === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setSelectedCategory(chip.key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  active
                    ? 'bg-blue-600 text-white border border-blue-400 shadow-2xs'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resource Cards List */}
      <div className="space-y-2.5">
        {filteredResources.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 text-center space-y-1.5">
            <BookOpen className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-xs font-bold text-slate-300">
              No matching training resources found
            </p>
            <p className="text-[11px] text-slate-500">
              Try clearing your search keyword or switching category chips.
            </p>
          </div>
        ) : (
          filteredResources.map((item) => {
            const acknowledged = isResourceAcknowledged(item.id);
            const isMedia = isMediaResource(item);

            return (
              <article
                key={item.id}
                className="bg-slate-900/95 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-2.5 transition-all shadow-xs"
              >
                {/* Top Row: File Type Icon Badge + Upload Date & Tier */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {renderFileTypeIconBadge(item)}

                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    {item.targetRating && item.targetRating > 1 && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40 font-bold">
                        Tier {item.targetRating}+
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(item.uploadedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-white leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Metadata Footer + Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] font-mono text-slate-400">
                    <span>{item.fileSize || '2.4 MB'}</span>
                    {item.siteSpecificCode && (
                      <span> • Post: {item.siteSpecificCode}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Primary Viewer / Media Trigger Button */}
                    <button
                      type="button"
                      onClick={() => openViewerModal(item)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                        isMedia
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {isMedia ? '[ ▶ Play Media ]' : '[ 📖 Open Document ]'}
                    </button>

                    {/* Mandatory or Optional Acknowledgment Action Button */}
                    <button
                      type="button"
                      onClick={() => handleAcknowledgeResource(item)}
                      disabled={acknowledged}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                        acknowledged
                          ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 cursor-default'
                          : 'bg-slate-800 hover:bg-emerald-950/80 border-slate-700 hover:border-emerald-500/50 text-emerald-300'
                      }`}
                    >
                      {acknowledged
                        ? '[ ✓ Acknowledged ]'
                        : '[ ✓ Acknowledge Review ]'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Interactive Viewer Modal (Mobile Document Reader or Video/Audio Streaming Modal) */}
      {activeResource && (
        <div
          id="guard-resource-viewer-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            setIsPlaying(false);
            setActiveResource(null);
          }}
        >
          <div
            id="guard-resource-viewer-modal"
            className="w-full sm:max-w-lg bg-slate-900 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {renderFileTypeIconBadge(activeResource)}
                <span className="text-xs font-black text-white truncate">
                  {activeResource.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveResource(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Reader / Streaming Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {isMediaResource(activeResource) ? (
                /* Video / Podcast Audio Streaming Player */
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/60 border border-slate-800 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
                    <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-400/50 flex items-center justify-center mb-2">
                      {activeResource.fileType === 'mp3' ||
                      activeResource.category === 'PODCAST' ? (
                        <AudioLines
                          className={`w-7 h-7 text-amber-400 ${
                            isPlaying ? 'animate-pulse' : ''
                          }`}
                        />
                      ) : (
                        <Play
                          className={`w-7 h-7 text-rose-400 fill-current ${
                            isPlaying ? 'animate-pulse' : ''
                          }`}
                        />
                      )}
                    </div>
                    <p className="text-xs font-black text-white">
                      {activeResource.title}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                      {isPlaying
                        ? 'STREAMING ENCRYPTED GUARD TRAINING CHANNEL...'
                        : 'STREAM PAUSED — TAP PLAY TO RESUME'}
                    </p>
                  </div>

                  {/* Playback Scrubber & Controls */}
                  <div className="space-y-2">
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${playbackProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>
                        {Math.floor((playbackProgress / 100) * 12)
                          .toString()
                          .padStart(2, '0')}
                        :
                        {Math.floor(((playbackProgress / 100) * 720) % 60)
                          .toString()
                          .padStart(2, '0')}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-3 h-3" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Play Stream</span>
                            </>
                          )}
                        </button>
                      </div>
                      <span>12:00</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Clean Mobile Document / Slide Deck Reader */
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] font-mono text-slate-400">
                    <span>
                      DOCUMENT READER • SECTION {currentSlideIndex} OF 3
                    </span>
                    <span>{activeResource.fileType.toUpperCase()} VERIFIED</span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-200 leading-relaxed min-h-[150px]">
                    {currentSlideIndex === 1 && (
                      <>
                        <h4 className="font-black text-blue-300 uppercase text-[11px]">
                          1. Operational Scope &amp; Post Orders Overview
                        </h4>
                        <p>{activeResource.description}</p>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300">
                          <li>
                            Verify active Denver Security License (DSL) &amp; site tier credentials prior to shift clock-in.
                          </li>
                          <li>
                            Maintain continuous GPS geofence telemetry and complete 30-minute interval patrol logs.
                          </li>
                        </ul>
                      </>
                    )}
                    {currentSlideIndex === 2 && (
                      <>
                        <h4 className="font-black text-blue-300 uppercase text-[11px]">
                          2. Escalation &amp; Dispatch Communication Protocol
                        </h4>
                        <p>
                          Upon encountering unauthorized entry, safety hazards, or high-priority BOLOs, immediately log an on-scene receipt and notify CAD Dispatch.
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300">
                          <li>
                            For life-safety emergencies, hold the header SOS Panic Button for 2.0 seconds to trigger priority CAD distress routing.
                          </li>
                          <li>
                            Attach timestamped verification photos to all Incident and Maintenance DAR entries.
                          </li>
                        </ul>
                      </>
                    )}
                    {currentSlideIndex === 3 && (
                      <>
                        <h4 className="font-black text-emerald-300 uppercase text-[11px]">
                          3. Officer Compliance Sign-Off Verification
                        </h4>
                        <p>
                          By tapping &ldquo;[ ✓ Acknowledge Review ]&rdquo; below, you confirm that you have read and understood{' '}
                          <strong className="text-white">{activeResource.title}</strong> and will adhere to these directives on post.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Page / Slide Switcher */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      disabled={currentSlideIndex <= 1}
                      onClick={() =>
                        setCurrentSlideIndex((prev) => Math.max(1, prev - 1))
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-[11px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev Section</span>
                    </button>
                    <span className="text-[10px] font-mono text-slate-400">
                      Page {currentSlideIndex} / 3
                    </span>
                    <button
                      type="button"
                      disabled={currentSlideIndex >= 3}
                      onClick={() =>
                        setCurrentSlideIndex((prev) => Math.min(3, prev + 1))
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-[11px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Next Section</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Metadata Summary */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 font-mono">
                <span>Published by: {activeResource.uploadedBy}</span>
                <span>Size: {activeResource.fileSize || '2.4 MB'}</span>
              </div>
            </div>

            {/* Modal Footer with Acknowledge & Close Actions */}
            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleAcknowledgeResource(activeResource);
                }}
                disabled={isResourceAcknowledged(activeResource.id)}
                className={`flex-1 py-2 px-3 rounded-xl font-mono font-black text-xs transition-all cursor-pointer ${
                  isResourceAcknowledged(activeResource.id)
                    ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-md'
                }`}
              >
                {isResourceAcknowledged(activeResource.id)
                  ? '[ ✓ Review Acknowledged ]'
                  : '[ ✓ Acknowledge Review ]'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveResource(null);
                }}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default GuardResourceHub;
