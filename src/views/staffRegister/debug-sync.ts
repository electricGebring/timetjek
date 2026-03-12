export async function debugSyncNow() {
  // Trigger sync directly from DebugPanel so simulator/network false-negatives
  // do not block manual recovery sync.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const syncManager = (window as unknown as { syncManager: any }).syncManager

  if (!syncManager?.syncAll) {
    console.warn('[DebugPanel] No syncManager on window')

    window.dispatchEvent(new CustomEvent('debug-status', { detail: 'Sync not triggered: syncManager not ready' }))

    return
  }

  if (syncManager && syncManager.isAnyRunning && syncManager.isAnyRunning()) {
    console.warn('[DebugPanel] Sync not triggered: already running')

    window.dispatchEvent(new CustomEvent('debug-status', { detail: 'Sync not triggered: already running' }))

    return
  }

  window.dispatchEvent(new CustomEvent('debug-status', { detail: '⏳ Synkroniserar...' }))

  try {
    await syncManager.syncAll('manual')

    window.dispatchEvent(new CustomEvent('debug-status', { detail: '✓ Sync klar' }))
  }
 catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    console.error('[DebugPanel] Sync failed:', err)

    window.dispatchEvent(new CustomEvent('debug-status', { detail: `✗ Sync misslyckades: ${msg}` }))
  }
}
