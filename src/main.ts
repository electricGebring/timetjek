import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { initDB } from '@/db/index'
import router from './router'
import i18n from './i18n'

import { CapacitorConnectivityAdapter } from './sync/capacitor-connectivity.adapter'
import { OnlineOfflineCoordinator } from './domain/services/online-offline-coordinator'
import { cleanupAllTables } from './domain/services/data-cleanup'
import { SyncManager } from './sync/sync-manager'
import type { SyncPort } from './domain/ports/sync.port'
import { initSyncTrigger } from './domain/services/sync-trigger'

async function bootstrap() {
  await initDB()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.use(i18n)
  app.mount('#app')

  // --- Compose dependencies
  const connectivity = new CapacitorConnectivityAdapter()

  // Create sync manager that will handle all tables based on data policies
  const syncManager = new SyncManager({ logger: console })

  // Create SyncPort adapter that uses SyncManager
  const syncAdapter: SyncPort = {
    async start(reason) {
      await syncManager.syncAll(reason)
    },
    async stop() {
      await syncManager.stopAll()
    },
    isRunning() {
      return syncManager.isAnyRunning()
    },
  }

  const coordinator = new OnlineOfflineCoordinator({
    connectivity,
    sync: syncAdapter,
    logger: console,
    // Optional: Enable periodic sync for always-online apps
    // Syncs every 30 seconds when online (for pulling remote changes)
    // syncIntervalMs: 30 * 1000, // Uncomment to enable
  })

  // Initialize sync trigger for immediate sync on mutations (optional)
  // This enables immediate sync when online, but still works offline
  initSyncTrigger(syncAdapter, connectivity)

  // Start coordinator after app is mounted
  await coordinator.start()

  // Run initial cleanup of expired data based on configured policies
  try {
    const results = await cleanupAllTables()
    const totalCleaned = Object.values(results).reduce((sum, count) => sum + count, 0)
    if (totalCleaned > 0) {
      console.log(`[Bootstrap] Cleaned up expired data:`, results)
    }
  } catch (error) {
    console.error('[Bootstrap] Initial cleanup failed:', error)
  }

  // Schedule periodic cleanup (daily at midnight)
  scheduleDailyCleanup()
}

/**
 * Schedule daily cleanup of expired data
 * Runs cleanup once per day based on configured retention policies
 */
function scheduleDailyCleanup() {
  const runCleanup = async () => {
    try {
      const results = await cleanupAllTables()
      const totalCleaned = Object.values(results).reduce((sum, count) => sum + count, 0)
      if (totalCleaned > 0) {
        console.log(`[Cleanup] Cleaned up expired data:`, results)
      }
    } catch (error) {
      console.error('[Cleanup] Scheduled cleanup failed:', error)
    }
  }

  // Calculate milliseconds until next midnight
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const msUntilMidnight = tomorrow.getTime() - now.getTime()

  // Run cleanup at next midnight, then every 24 hours
  setTimeout(() => {
    runCleanup()
    setInterval(runCleanup, 24 * 60 * 60 * 1000) // Every 24 hours
  }, msUntilMidnight)

  console.log(`[Bootstrap] Scheduled daily cleanup starting at ${tomorrow.toISOString()}`)
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err)
})
