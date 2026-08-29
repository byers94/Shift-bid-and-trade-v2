import { StandardShiftReport, OfflineQueuedReport, ReportMediaAttachment } from '../types/shift';
import { uploadAllReportMedia, saveReportToFirestore } from './firebase';

export const STORAGE_KEY_OFFLINE_REPORT_QUEUE = 'secureshift_offline_reports_queue_v1';

type QueueChangeListener = (queue: OfflineQueuedReport[], isOnline: boolean) => void;
const listeners = new Set<QueueChangeListener>();

/**
 * Checks if the browser currently reports network connectivity.
 */
export function isDeviceOnline(): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

/**
 * Retrieves all currently queued offline reports from local storage.
 */
export function getOfflineReportQueue(): OfflineQueuedReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OFFLINE_REPORT_QUEUE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[OfflineQueue] Failed to parse local report queue:', err);
    return [];
  }
}

/**
 * Persists the offline report queue to local storage and notifies subscribers.
 */
export function saveOfflineReportQueue(queue: OfflineQueuedReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_OFFLINE_REPORT_QUEUE, JSON.stringify(queue));
    notifyQueueListeners(queue);
  } catch (err) {
    console.error('[OfflineQueue] Failed to save local report queue to localStorage:', err);
  }
}

/**
 * Notifies all active subscribers of a queue or connection update.
 */
function notifyQueueListeners(queue?: OfflineQueuedReport[]): void {
  const currentQueue = queue || getOfflineReportQueue();
  const online = isDeviceOnline();
  listeners.forEach((listener) => {
    try {
      listener(currentQueue, online);
    } catch (e) {
      console.error('[OfflineQueue] Error in queue change listener:', e);
    }
  });
}

/**
 * Subscribes to queue and connectivity changes.
 */
export function subscribeToQueueChanges(listener: QueueChangeListener): () => void {
  listeners.add(listener);
  // Initial fire
  listener(getOfflineReportQueue(), isDeviceOnline());
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Enqueues a report into the local offline storage buffer.
 */
export function enqueueOfflineReport(report: StandardShiftReport): OfflineQueuedReport {
  const queue = getOfflineReportQueue();
  const queueId = `queue_${report.id || report.reportNumber}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const flaggedReport: StandardShiftReport = {
    ...report,
    syncStatus: 'pending_sync',
    offlineQueuedAt: nowIso
  };

  const queuedItem: OfflineQueuedReport = {
    queueId,
    report: flaggedReport,
    enqueuedAt: nowIso,
    retryCount: 0,
    status: 'queued'
  };

  const updatedQueue = [queuedItem, ...queue.filter((q) => q.report.id !== report.id)];
  saveOfflineReportQueue(updatedQueue);

  console.info(`[OfflineQueue] Report ${report.reportNumber} added to local storage offline queue (Total queued: ${updatedQueue.length}).`);
  return queuedItem;
}

/**
 * Removes a specific item from the offline queue.
 */
export function removeQueuedReport(queueId: string): void {
  const queue = getOfflineReportQueue();
  const updated = queue.filter((q) => q.queueId !== queueId && q.report.id !== queueId);
  saveOfflineReportQueue(updated);
}

/**
 * Clears all items in the offline queue.
 */
export function clearAllQueuedReports(): void {
  saveOfflineReportQueue([]);
}

let isSyncInProgress = false;

/**
 * Processes a single queued report:
 * 1. Uploads media files to Cloud Storage for Firebase and gets download URLs.
 * 2. Updates the report media attachments with the Firebase download URLs.
 * 3. Writes the document to Firestore.
 * 4. Removes from queue upon success.
 */
export async function processSingleQueuedReport(
  queueId: string,
  onProgress?: (status: string, percent?: number) => void
): Promise<{ success: boolean; syncedReport?: StandardShiftReport; error?: string }> {
  const queue = getOfflineReportQueue();
  const itemIndex = queue.findIndex((q) => q.queueId === queueId || q.report.id === queueId);
  
  if (itemIndex === -1) {
    return { success: false, error: 'Queued report item not found' };
  }

  const currentItem = queue[itemIndex];
  
  try {
    // 1. Upload Media Files to Cloud Storage for Firebase
    if (onProgress) onProgress('Uploading media files to Cloud Storage for Firebase...', 25);
    
    // Update queue item state
    currentItem.status = 'uploading_media';
    currentItem.lastAttemptAt = new Date().toISOString();
    saveOfflineReportQueue(queue);

    const uploadedMediaList: ReportMediaAttachment[] = await uploadAllReportMedia(
      currentItem.report,
      (completed, total) => {
        if (onProgress && total > 0) {
          const pct = Math.round(25 + (completed / total) * 50);
          onProgress(`Uploading media ${completed}/${total} to Firebase Storage...`, pct);
        }
      }
    );

    // 2. Save complete document + media download URLs to Firestore
    if (onProgress) onProgress('Saving document and download URLs to Firestore...', 80);
    
    currentItem.status = 'saving_firestore';
    saveOfflineReportQueue(queue);

    const syncedReport: StandardShiftReport = {
      ...currentItem.report,
      media: uploadedMediaList,
      syncStatus: 'synced',
      syncedAt: new Date().toISOString(),
      syncError: undefined
    };

    const firestoreResult = await saveReportToFirestore(syncedReport);
    syncedReport.firestoreDocId = firestoreResult.firestoreDocId;

    // 3. Remove successfully synced item from local queue
    if (onProgress) onProgress('Sync complete!', 100);
    removeQueuedReport(queueId);

    console.info(`[OfflineQueue] Successfully synced queued report ${syncedReport.reportNumber} to Firebase Storage & Firestore.`);
    return {
      success: true,
      syncedReport
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Sync failed due to network or storage error';
    console.error(`[OfflineQueue] Failed to process queued report ${currentItem.report.reportNumber}:`, err);
    
    currentItem.status = 'failed';
    currentItem.retryCount += 1;
    currentItem.lastError = errorMsg;
    currentItem.report.syncStatus = 'failed';
    currentItem.report.syncError = errorMsg;
    saveOfflineReportQueue(queue);

    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Processes all pending queued reports when connectivity is restored.
 */
export async function syncAllQueuedReports(
  onReportSynced?: (syncedReport: StandardShiftReport) => void,
  onStatusUpdate?: (status: string, current: number, total: number) => void
): Promise<{ processed: number; succeeded: number; failed: number; syncedReports: StandardShiftReport[] }> {
  if (isSyncInProgress) {
    console.log('[OfflineQueue] Sync cycle already active, skipping duplicate trigger.');
    return { processed: 0, succeeded: 0, failed: 0, syncedReports: [] };
  }

  const queue = getOfflineReportQueue();
  if (queue.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, syncedReports: [] };
  }

  if (!isDeviceOnline()) {
    console.log('[OfflineQueue] Device is currently offline. Skipping sync until connection is restored.');
    return { processed: 0, succeeded: 0, failed: 0, syncedReports: [] };
  }

  isSyncInProgress = true;
  let succeeded = 0;
  let failed = 0;
  const syncedReports: StandardShiftReport[] = [];
  const total = queue.length;

  try {
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (onStatusUpdate) {
        onStatusUpdate(`Syncing report ${i + 1}/${total}: ${item.report.reportNumber}...`, i + 1, total);
      }

      const result = await processSingleQueuedReport(item.queueId);
      if (result.success && result.syncedReport) {
        succeeded++;
        syncedReports.push(result.syncedReport);
        if (onReportSynced) {
          onReportSynced(result.syncedReport);
        }
      } else {
        failed++;
      }
    }
  } finally {
    isSyncInProgress = false;
    notifyQueueListeners();
  }

  return {
    processed: queue.length,
    succeeded,
    failed,
    syncedReports
  };
}

// Global network listener setup (Runs in browser)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('[OfflineQueue] Network connection restored. Auto-syncing pending incident reports...');
    notifyQueueListeners();
    // Auto-sync pending reports after short grace period
    setTimeout(() => {
      syncAllQueuedReports();
    }, 1200);
  });

  window.addEventListener('offline', () => {
    console.warn('[OfflineQueue] Network connection lost. Incident reports will be buffered locally in offline queue.');
    notifyQueueListeners();
  });
}
