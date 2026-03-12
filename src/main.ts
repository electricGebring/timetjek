// Import core Vue and app dependencies
import { createApp } from 'vue'

import { createPinia } from 'pinia'

import './style.css'

import App from './App.vue'

import { initDB } from '@/db/index'

import router from './router'

import i18n from './i18n'

// Import sync and connectivity dependencies
import { CapacitorConnectivityAdapter } from './sync/capacitor-connectivity.adapter'

import { OnlineOfflineCoordinator } from './domain/services/online-offline-coordinator'

import { cleanupAllTables } from './domain/services/data-cleanup'

import { SyncManager } from './sync/sync-manager'

import type { SyncPort } from './domain/ports/sync.port'

import { initSyncTrigger } from './domain/services/sync-trigger'

import { createLogger } from '@/utils/logger'
import { bindConnectivitySource } from '@/utils/connectivity'

import { FontAwesomeIcon } from './fontawesome/icons'

// Import generic sync adapter registration and table adapters
import { WORK_ENTRIES_AGGREGATE } from '@/constants/tables'

import { registerTableAdapter } from '@/sync/table-sync-adapter'

import { createWorkEntriesAdapter } from '@/sync/work-entries/adapter'

// Import service layer (exposes on window for debugging)
import '@/domain/work-entries/service'

// Main bootstrap function for app startup
async function bootstrap() {
  // Initialize database (tables, migrations, etc)
  await initDB()

  // Register sync adapters: aggregation adapters use aggregation name as key
  registerTableAdapter(WORK_ENTRIES_AGGREGATE, createWorkEntriesAdapter)

  // Create and mount Vue app
  const app = createApp(App)

  app.component('FontAwesomeIcon', FontAwesomeIcon)

  app.use(createPinia())

  app.use(router)

  app.use(i18n)

  app.mount('#app')

  // Setup connectivity and sync dependencies
  const connectivity = new CapacitorConnectivityAdapter()

  await bindConnectivitySource(connectivity)

  const syncManager = new SyncManager({ logger: createLogger('SyncManager') })

  ;(window as unknown as { syncManager: SyncManager }).syncManager = syncManager

  // Create a SyncPort adapter that wraps SyncManager
  const syncAdapter: SyncPort = {
    async start(reason) {
      await syncManager.syncAll(reason)
    },
    async stop() {
      await syncManager.stopAll()
    },
    isRunning() {
      return syncManager.isAnyRunning()
    }
  }

  const coordinator = new OnlineOfflineCoordinator({
    connectivity,
    sync: syncAdapter,
    logger: createLogger('Coordinator')
    // Optional: Enable periodic sync for always-online apps
    //syncIntervalMs: 30 * 1000 // 30 seconds
  })

  // Initialize sync trigger for immediate sync on mutations (optional)
  // This enables instant sync when online, but still works offline
  initSyncTrigger(syncAdapter, connectivity)

  await coordinator.start()
  const logger = createLogger('Bootstrap')

  try {
    const results = await cleanupAllTables()

    const totalCleaned = Object.values(results).reduce((sum, count) => sum + count, 0)

    if (totalCleaned > 0) {
      logger.log(`[Bootstrap] Cleaned up expired data:`, results)
    }
  } catch (error) {
    logger.error('[Bootstrap] Initial cleanup failed:', error)
  }

  // Schedule periodic cleanup (daily at midnight)
  scheduleDailyCleanup(logger)
}

/**
 * Schedule daily cleanup of expired data
 * Runs cleanup once per day based on configured retention policies
 */
type LoggerLike = { log: (...args: unknown[]) => void; error: (...args: unknown[]) => void }

function scheduleDailyCleanup(logger: LoggerLike = console) {
  const runCleanup = async () => {
    try {
      const results = await cleanupAllTables()

      const totalCleaned = Object.values(results).reduce((sum, count) => sum + count, 0)

      if (totalCleaned > 0) {
        logger.log(`[Cleanup] Cleaned up expired data:`, results)
      }
    } catch (error) {
      logger.error('[Cleanup] Scheduled cleanup failed:', error)
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

  logger.log(`[Bootstrap] Scheduled daily cleanup starting at ${tomorrow.toISOString()}`)
}

// Start the app bootstrap process
bootstrap().catch((err) => {
  const logger = createLogger('Bootstrap')

  logger.error('Bootstrap error:', err)
})
