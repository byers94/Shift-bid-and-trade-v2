import React, { useState, useEffect, useRef } from 'react';
import {
  ResourceItem,
  ResourceCategory,
  ResourceAcknowledgmentRecord,
  loadStoredResources,
  saveStoredResources,
  loadResourceAcknowledgments,
  subscribeToResourceUpdates,
} from '../../types/resources';
import { useShiftOps } from '../../context/ShiftOpsContext';
import {
  BookOpen,
  Upload,
  FileText,
  Video,
  Headphones,
  Presentation,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Search,
  X,
  FolderOpen,
  Sparkles,
  Building2,
  Terminal,
  Play,
  Volume2,
} from 'lucide-react';

interface ResourceManagementProps {
  adminName?: string;
  adminBadge?: string;
}

const CATEGORY_OPTIONS: { value: ResourceCategory; label: string; badgeClass: string }[] = [
  {
    value: 'SOP',
    label: 'SOP',
    badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
  },
  {
    value: 'HANDBOOK',
    label: 'Handbook',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
  },
  {
    value: 'VIDEO',
    label: 'Video',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
  },
  {
    value: 'PODCAST',
    label: 'Podcast',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
  },
  {
    value: 'TRAINING_DECK',
    label: 'Training Deck',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
  },
];

const FILE_TYPE_MAP: Record<ResourceCategory, ResourceItem['fileType']> = {
  SOP: 'pdf',
  HANDBOOK: 'pdf',
  VIDEO: 'mp4',
  PODCAST: 'mp3',
  TRAINING_DECK: 'pptx',
};

export const ResourceManagement: React.FC<ResourceManagementProps> = ({
  adminName = "Lt. Mark O'Connor",
  adminBadge = 'OPS-CMD-01',
}) => {
  const { addAuditLog, logAdminAction, showToast, sitesList } = useShiftOps();

  const [resources, setResources] = useState<ResourceItem[]>(() => loadStoredResources());
  const [acknowledgments, setAcknowledgments] = useState<ResourceAcknowledgmentRecord[]>(() =>
    loadResourceAcknowledgments()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ResourceCategory>('ALL');

  // Upload / Edit Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);

  // Form inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('SOP');
  const [fileType, setFileType] = useState<ResourceItem['fileType']>('pdf');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('3.2 MB');
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(true);
  const [targetRating, setTargetRating] = useState<number>(1);
  const [siteSpecificCode, setSiteSpecificCode] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Preview Modal state
  const [previewResource, setPreviewResource] = useState<ResourceItem | null>(null);

  // Delete Confirmation state
  const [pendingDeleteResource, setPendingDeleteResource] = useState<ResourceItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return subscribeToResourceUpdates(() => {
      setResources(loadStoredResources());
      setAcknowledgments(loadResourceAcknowledgments());
    });
  }, []);

  const openCreateModal = () => {
    setEditingResource(null);
    setTitle('');
    setDescription('');
    setCategory('SOP');
    setFileType('pdf');
    setFileName('');
    setFileSize('2.8 MB');
    setRequiresAcknowledgment(true);
    setTargetRating(1);
    setSiteSpecificCode('');
    setIsUploadModalOpen(true);
  };

  const openEditModal = (item: ResourceItem) => {
    setEditingResource(item);
    setTitle(item.title);
    setDescription(item.description);
    setCategory(item.category);
    setFileType(item.fileType);
    setFileName(item.fileUrl.split('/').pop() || `${item.id}.${item.fileType}`);
    setFileSize(item.fileSize || '2.5 MB');
    setRequiresAcknowledgment(item.requiresAcknowledgment);
    setTargetRating(item.targetRating ?? 1);
    setSiteSpecificCode(item.siteSpecificCode || '');
    setIsUploadModalOpen(true);
  };

  const handleCategoryChange = (nextCategory: ResourceCategory) => {
    setCategory(nextCategory);
    if (!editingResource && !fileName) {
      setFileType(FILE_TYPE_MAP[nextCategory]);
    }
  };

  const handleMockFileSelect = (selectedName: string, sizeBytes?: number) => {
    const ext = selectedName.split('.').pop()?.toLowerCase();
    let resolvedType: ResourceItem['fileType'] = FILE_TYPE_MAP[category];
    if (ext === 'pdf' || ext === 'mp4' || ext === 'mp3' || ext === 'pptx' || ext === 'docx') {
      resolvedType = ext;
    }
    setFileType(resolvedType);
    setFileName(selectedName);
    if (sizeBytes) {
      const mb = Math.max(0.4, sizeBytes / (1024 * 1024)).toFixed(1);
      setFileSize(`${mb} MB`);
    } else {
      const defaultSizes: Record<ResourceItem['fileType'], string> = {
        pdf: '3.4 MB',
        mp4: '42.0 MB',
        mp3: '15.2 MB',
        pptx: '9.8 MB',
        docx: '1.6 MB',
      };
      setFileSize(defaultSizes[resolvedType]);
    }
  };

  const handlePublishResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const actorLabel = `${adminName} (${adminBadge})`;
    const slug =
      fileName.trim() ||
      `${title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}.${fileType}`;

    if (editingResource) {
      const updatedItem: ResourceItem = {
        ...editingResource,
        title: title.trim(),
        description: description.trim() || 'Operational training and compliance resource.',
        category,
        fileType,
        fileSize,
        fileUrl: `https://secureshift.internal/cdn/resources/${slug}`,
        requiresAcknowledgment,
        targetRating,
        siteSpecificCode: siteSpecificCode.trim() || undefined,
      };

      const nextList = resources.map((r) => (r.id === editingResource.id ? updatedItem : r));
      setResources(nextList);
      saveStoredResources(nextList);

      addAuditLog(
        'RESOURCE_UPDATED',
        'system',
        `Updated training resource "${updatedItem.title}" [${updatedItem.category} • ${updatedItem.fileType.toUpperCase()}] (Min Tier ${updatedItem.targetRating || 1}, Mandatory Ack: ${updatedItem.requiresAcknowledgment ? 'YES' : 'NO'})`,
        actorLabel,
        'info'
      );

      logAdminAction({
        adminName,
        adminRole: 'Operations Commander',
        actionType: 'RESOURCE_UPDATED',
        target: updatedItem.title,
        details: `Modified ${updatedItem.category} (${updatedItem.fileType.toUpperCase()}) in Guard Resource Network.`,
      });

      showToast(
        'Resource Updated',
        `"${updatedItem.title}" updated and logged to Live Audit Terminal.`,
        'info'
      );
    } else {
      const newItem: ResourceItem = {
        id: `res-${Date.now()}`,
        title: title.trim(),
        description:
          description.trim() ||
          'Published via CAD Operational Resources & Training Repository.',
        category,
        fileUrl: `https://secureshift.internal/cdn/resources/${slug}`,
        fileType,
        fileSize,
        uploadedBy: actorLabel,
        uploadedAt: new Date().toISOString(),
        requiresAcknowledgment,
        targetRating,
        siteSpecificCode: siteSpecificCode.trim() || undefined,
      };

      const nextList = [newItem, ...resources];
      setResources(nextList);
      saveStoredResources(nextList);

      addAuditLog(
        'RESOURCE_PUBLISHED',
        'system',
        `Published new training resource "${newItem.title}" [${newItem.category} • ${newItem.fileType.toUpperCase()}] to Guard Network (Min Tier ${newItem.targetRating || 1})`,
        actorLabel,
        'success'
      );

      logAdminAction({
        adminName,
        adminRole: 'Operations Commander',
        actionType: 'RESOURCE_PUBLISHED',
        target: newItem.title,
        details: `Published ${newItem.category} (${newItem.fileType.toUpperCase()}) to Guard Mobile Media Library.`,
      });

      showToast(
        'Published to Guard Network',
        `"${newItem.title}" is now live in the Guard Mobile Resource Hub.`,
        'success'
      );
    }

    setIsUploadModalOpen(false);
    setEditingResource(null);
  };

  const handleConfirmDelete = (item: ResourceItem) => {
    const actorLabel = `${adminName} (${adminBadge})`;
    const nextList = resources.filter((r) => r.id !== item.id);
    setResources(nextList);
    saveStoredResources(nextList);
    setPendingDeleteResource(null);

    addAuditLog(
      'RESOURCE_DELETED',
      'system',
      `Immutable Audit: Deleted training resource "${item.title}" (${item.id}) [${item.category} • ${item.fileType.toUpperCase()}] uploaded by ${item.uploadedBy}`,
      actorLabel,
      'warning'
    );

    logAdminAction({
      adminName,
      adminRole: 'Operations Commander',
      actionType: 'RESOURCE_DELETED',
      target: item.title,
      details: `Removed ${item.category} (${item.fileType.toUpperCase()}) from Guard Resource Repository.`,
    });

    showToast(
      'Resource Deleted',
      `"${item.title}" removed. Immutable audit record written to Live Audit Terminal.`,
      'warning'
    );
  };

  const filteredResources = resources.filter((item) => {
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.uploadedBy.toLowerCase().includes(q) ||
      (item.siteSpecificCode && item.siteSpecificCode.toLowerCase().includes(q));
    return matchesCategory && matchesQuery;
  });

  const renderTypeBadge = (type: ResourceItem['fileType']) => {
    const styles: Record<ResourceItem['fileType'], string> = {
      pdf: 'bg-rose-950/90 text-rose-300 border-rose-500/40',
      mp4: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40',
      mp3: 'bg-amber-950/90 text-amber-300 border-amber-500/40',
      pptx: 'bg-purple-950/90 text-purple-300 border-purple-500/40',
      docx: 'bg-blue-950/90 text-blue-300 border-blue-500/40',
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-black uppercase ${styles[type]}`}
      >
        {type === 'pdf' && <FileText className="w-3 h-3" />}
        {type === 'mp4' && <Video className="w-3 h-3" />}
        {type === 'mp3' && <Headphones className="w-3 h-3" />}
        {type === 'pptx' && <Presentation className="w-3 h-3" />}
        {type === 'docx' && <FileText className="w-3 h-3" />}
        {type.toUpperCase()}
      </span>
    );
  };

  const renderCategoryBadge = (cat: ResourceCategory) => {
    const found = CATEGORY_OPTIONS.find((c) => c.value === cat);
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono font-bold uppercase ${
          found?.badgeClass || 'bg-slate-800 text-slate-300 border-slate-700'
        }`}
      >
        {found?.label || cat}
      </span>
    );
  };

  return (
    <div id="admin-resource-management-portal" className="space-y-5">
      {/* Top Portal Banner & Action Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold block">
                CENTRALIZED COMMAND KNOWLEDGE BASE
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Operational Resources &amp; Training Repository
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Publish SOPs, officer handbooks, tactical training videos, audio briefings, and slide decks directly to the Guard Mobile Terminal. All updates and deletions are recorded in the Live Audit Terminal.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="admin-upload-new-resource-btn"
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-md border border-blue-400/40 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>[ + Upload New Resource ]</span>
          </button>
        </div>
      </div>

      {/* KPI Summary & Filter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
            Total Published Files
          </span>
          <div className="text-xl font-black font-mono text-white mt-0.5">
            {resources.length}
          </div>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
            Mandatory Ack Required
          </span>
          <div className="text-xl font-black font-mono text-emerald-300 mt-0.5">
            {resources.filter((r) => r.requiresAcknowledgment).length}
          </div>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">
            Video &amp; Audio Briefings
          </span>
          <div className="text-xl font-black font-mono text-cyan-300 mt-0.5">
            {resources.filter((r) => r.category === 'VIDEO' || r.category === 'PODCAST').length}
          </div>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
            Guard Sign-Off Receipts
          </span>
          <div className="text-xl font-black font-mono text-amber-300 mt-0.5">
            {acknowledgments.length}
          </div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter repository by title, SOP code, category, or author..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase cursor-pointer transition-colors shrink-0 ${
              categoryFilter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All ({resources.length})
          </button>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase cursor-pointer transition-colors shrink-0 ${
                categoryFilter === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Managed Files Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Managed Training &amp; SOP Files ({filteredResources.length})
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <Terminal className="w-3 h-3 text-emerald-400" />
            Live Audit Terminal Hook Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/90 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Uploaded By</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No resources match your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredResources.map((item) => {
                  const ackCount = acknowledgments.filter(
                    (a) => a.resourceId === item.id
                  ).length;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                          <span>{item.title}</span>
                          {item.requiresAcknowledgment && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-500/40">
                              REQ ACK ({ackCount})
                            </span>
                          )}
                          {item.targetRating && item.targetRating > 1 && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-500/40">
                              TIER {item.targetRating}+
                            </span>
                          )}
                          {item.siteSpecificCode && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {item.siteSpecificCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {renderCategoryBadge(item.category)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {renderTypeBadge(item.fileType)}
                          {item.fileSize && (
                            <span className="text-[10px] font-mono text-slate-400">
                              {item.fileSize}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-300 font-medium">
                        {item.uploadedBy}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {new Date(item.uploadedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewResource(item)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Preview Resource"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Edit Resource Metadata"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteResource(item)}
                            className="px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Delete Resource & Log to Audit Terminal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload / Edit Resource Modal */}
      {isUploadModalOpen && (
        <div
          id="admin-resource-upload-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            id="admin-resource-upload-modal"
            className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    {editingResource
                      ? 'Update Operational Resource'
                      : 'Upload New Operational Resource'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Synchronizes immediately with the Guard Mobile Media Library
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishResource} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., SOP-310: High-Risk Perimeter Lockdown Protocol"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Description &amp; Training Objective *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide clear instructions on what field officers must review or acknowledge..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Category Selector & Minimum Tier Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Resource Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as ResourceCategory)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="SOP">SOP (Standard Operating Procedure)</option>
                    <option value="HANDBOOK">Handbook</option>
                    <option value="VIDEO">Video</option>
                    <option value="PODCAST">Podcast</option>
                    <option value="TRAINING_DECK">Training Deck</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Minimum Guard Tier Required
                  </label>
                  <select
                    value={targetRating}
                    onChange={(e) => setTargetRating(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={1}>Tier 1+ (All Active Guards)</option>
                    <option value={2}>Tier 2+ (Intermediate &amp; Rover Officers)</option>
                    <option value={3}>Tier 3 Only (Senior / High-Security Clearance)</option>
                  </select>
                </div>
              </div>

              {/* Optional Site Tie-In & File Format */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Format / File Type
                  </label>
                  <select
                    value={fileType}
                    onChange={(e) =>
                      setFileType(e.target.value as ResourceItem['fileType'])
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="mp4">MP4 Video Stream (.mp4)</option>
                    <option value="mp3">MP3 Audio Briefing (.mp3)</option>
                    <option value="pptx">Training Presentation Deck (.pptx)</option>
                    <option value="docx">Word SOP Document (.docx)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Site-Specific Code (Optional)
                  </label>
                  <input
                    type="text"
                    list="resource-sites-datalist"
                    value={siteSpecificCode}
                    onChange={(e) => setSiteSpecificCode(e.target.value)}
                    placeholder="All Sites or e.g., DEN-AIRPORT-G4"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <datalist id="resource-sites-datalist">
                    {sitesList.map((s) => (
                      <option key={s.id} value={s.siteCode || s.name}>
                        {s.name}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Mock File Dropzone supporting PDF, MP4, MP3, PPTX */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Media / Document File Dropzone (PDF, MP4, MP3, PPTX)
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) {
                      handleMockFileSelect(dropped.name, dropped.size);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-blue-400 bg-blue-950/40'
                      : 'border-slate-700 bg-slate-950/70 hover:border-blue-500/60'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.mp4,.mp3,.pptx,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleMockFileSelect(f.name, f.size);
                    }}
                  />
                  <Upload className="w-6 h-6 text-blue-400 mx-auto mb-1.5" />
                  {fileName ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-300">
                        Attached: {fileName} ({fileSize})
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Click or drop another file to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-200">
                        Drag &amp; drop training file here, or click to browse
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Supported formats: PDF, MP4, MP3, PPTX, DOCX (Max 250 MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Preset Mock File Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-mono text-slate-400">Quick attach preset:</span>
                  {[
                    { name: 'sop-perimeter-lockdown.pdf', label: 'Sample PDF' },
                    { name: 'patrol-deescalation-briefing.mp4', label: 'Sample MP4' },
                    { name: 'dispatch-comms-podcast.mp3', label: 'Sample MP3' },
                    { name: 'site-orientation-deck.pptx', label: 'Sample PPTX' },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleMockFileSelect(preset.name)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mandatory Acknowledgment Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresAcknowledgment}
                  onChange={(e) => setRequiresAcknowledgment(e.target.checked)}
                  className="mt-0.5 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Mandatory Guard Acknowledgment Required
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Officers must tap &ldquo;[ ✓ Acknowledge Review ]&rdquo; in their mobile terminal to record compliance sign-off.
                  </span>
                </div>
              </label>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="publish-to-guard-network-submit-btn"
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
                >
                  [ Publish to Guard Network ]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Preview Modal */}
      {previewResource && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewResource(null)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {renderTypeBadge(previewResource.fileType)}
                <h4 className="text-xs font-black uppercase tracking-wider text-white truncate max-w-xs">
                  {previewResource.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewResource(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Category: {previewResource.category}</span>
                  <span>Min Clearance: Tier {previewResource.targetRating || 1}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {previewResource.description}
                </p>
                <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <span>CDN URI: {previewResource.fileUrl}</span>
                  <span>Size: {previewResource.fileSize || '2.4 MB'}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewResource(null)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDeleteResource && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPendingDeleteResource(null)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-2xl shadow-2xl p-5 space-y-4 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-rose-400">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-black uppercase tracking-wider">
                Confirm Resource Deletion
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove{' '}
              <strong className="text-white">&ldquo;{pendingDeleteResource.title}&rdquo;</strong> from the Guard Network? This action writes an immutable entry to the Live Audit Terminal.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteResource(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(pendingDeleteResource)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase cursor-pointer"
              >
                Confirm Delete &amp; Log Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceManagement;
