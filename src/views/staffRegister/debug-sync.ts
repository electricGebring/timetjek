import { triggerSyncIfOnline } from '@/domain/services/sync-trigger'

export async function debugSyncNow() {
  // Try to trigger sync, but show debug info if not possible
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const syncManager = (window as unknown as { syncManager: any }).syncManager;

  if (!navigator.onLine) {
     
    console.warn('[DebugPanel] Sync not triggered: offline mode');

    window.dispatchEvent(new CustomEvent('debug-status', { detail: 'Sync not triggered: offline mode' }));

    return;
  }

  if (syncManager && syncManager.isAnyRunning && syncManager.isAnyRunning()) {
     
    console.warn('[DebugPanel] Sync not triggered: already running');

    window.dispatchEvent(new CustomEvent('debug-status', { detail: 'Sync not triggered: already running' }));

    return;
  }

  await triggerSyncIfOnline('manual');

  window.dispatchEvent(new CustomEvent('debug-status', { detail: 'Sync triggered' }));
}
