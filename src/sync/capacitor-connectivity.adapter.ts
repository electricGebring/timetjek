import { Network } from '@capacitor/network'

import type { ConnectivityPort, ConnectivityState, Unsubscribe } from '../domain/ports/connectivity.port'

export class CapacitorConnectivityAdapter implements ConnectivityPort {
  async getCurrent(): Promise<ConnectivityState> {
    const status = await Network.getStatus()

    return {
      online: status.connected,
      connectionType: status.connectionType
    }
  }

  subscribe(handler: (state: ConnectivityState) => void): Unsubscribe {
    
    const listener = Network.addListener('networkStatusChange', (status) => {
      handler({
        online: status.connected,
        connectionType: status.connectionType
      })
    })

    return () => {
      // Capacitor listener returns a handle with remove()
      // Use async IIFE to ensure listener resolves before removal
      void (async () => {
        const handle = await listener

        await handle.remove()
      })()
    }
  }
}
