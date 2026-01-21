export type SyncReason = 'connectivity-online' | 'manual' | 'app-resume' | 'interval'

export interface SyncPort {
  start(reason: SyncReason): Promise<void>
  stop(): Promise<void>
  isRunning(): boolean
}
