export type ConnectivityState = {
  online: boolean
  connectionType?: string // "wifi" | "cellular" | "none" etc (optional)
}

export type Unsubscribe = () => void

export interface ConnectivityPort {
  /** Get last known state (best effort). */
  getCurrent(): Promise<ConnectivityState>

  /** Subscribe to online/offline changes. Returns unsubscribe fn. */
  subscribe(handler: (state: ConnectivityState) => void): Unsubscribe
}
