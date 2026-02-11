import type { ConnectivityPort, ConnectivityState, Unsubscribe } from '../ports/connectivity.port'
import type { SyncPort } from '../ports/sync.port'

type CoordinatorDeps = {
  connectivity: ConnectivityPort
  sync: SyncPort
  logger?: Pick<Console, 'log' | 'warn' | 'error'>
  /**
   * Interval sync configuration (for always-online apps)
   * If set, syncs periodically when online
   * @default undefined (no periodic sync)
   */
  syncIntervalMs?: number
}

export class OnlineOfflineCoordinator {
  private unsubscribe: Unsubscribe | null = null
  private lastState: ConnectivityState | null = null
  private logger: Pick<Console, 'log' | 'warn' | 'error'>
  private deps: CoordinatorDeps
  private syncIntervalId: ReturnType<typeof setInterval> | null = null

  constructor(deps: CoordinatorDeps) {
    this.deps = deps
    this.logger = deps.logger ?? console
  }

  async start(): Promise<void> {
    // Seed with current state (so we handle "already online" on cold start)
    const current = await this.deps.connectivity.getCurrent()
    this.handleConnectivity(current)

    // Subscribe to changes
    this.unsubscribe = this.deps.connectivity.subscribe((state) => this.handleConnectivity(state))
  }

  async stop(): Promise<void> {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.stopPeriodicSync()
    await this.deps.sync.stop()
  }

  private handleConnectivity(state: ConnectivityState): void {
    // Avoid duplicate triggers when the event fires with same state
    if (this.lastState?.online === state.online) return
    this.lastState = state

    if (state.online) {
      this.logger.log('[Coordinator] 🟢 Online -> starting sync')
      void this.deps.sync.start('connectivity-online')
      
      // Start periodic sync if configured (for always-online apps)
      if (this.deps.syncIntervalMs) {
        this.startPeriodicSync()
      }
    } else {
      this.logger.log('[Coordinator] 🔴 Offline -> stopping sync')
      this.stopPeriodicSync()
      void this.deps.sync.stop()
    }
  }

  /**
   * Start periodic sync when online (for always-online apps)
   */
  private startPeriodicSync(): void {
    if (this.syncIntervalId) return // Already running
    
    const intervalMs = this.deps.syncIntervalMs!
    this.logger.log(`[Coordinator] ⏰ Starting periodic sync every ${intervalMs}ms`)
    
    this.syncIntervalId = setInterval(() => {
      if (this.lastState?.online && !this.deps.sync.isRunning()) {
        this.logger.log('[Coordinator] 🔁 Periodic sync triggered')
        void this.deps.sync.start('interval')
      }
    }, intervalMs)
  }

  /**
   * Stop periodic sync
   */
  private stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId)
      this.syncIntervalId = null
      this.logger.log('[Coordinator] ⏹️ Stopped periodic sync')
    }
  }
}
