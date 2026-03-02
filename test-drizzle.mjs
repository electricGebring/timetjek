#!/usr/bin/env node

/**
 * Quick test script for Drizzle queries
 * Tests CRUD operations and sync engine operations
 * Run with: npm run test:drizzle
 */

import { initDrizzle } from './src/db/drizzle.ts'
import { getWorkEntries } from './src/db/staff-register/work-entry.read.ts'
import { upsertWorkEntry } from './src/db/staff-register/work-entry.upsert.ts'
import { softDeleteWorkEntry } from './src/db/staff-register/work-entry.delete.ts'
import {
  getUnsyncedForSync,
  getDeletedForSync,
  markEntriesAsSynced,
  deletePermanently
} from './src/db/staff-register/work-entry.sync.ts'

console.log('🚀 Testing Drizzle setup...\n')

try {
  // Initialize Drizzle
  console.log('1️⃣ Initializing Drizzle with better-sqlite3...')
  await initDrizzle('./app.db')
  console.log('✅ Drizzle initialized\n')

  // Test READ: getWorkEntries
  console.log('2️⃣ Testing getWorkEntries()...')
  const entries = await getWorkEntries()
  console.log(`✅ Success! Got ${entries.length} entries\n`)

  if (entries.length > 0) {
    console.log('📊 First entry:', entries[0])
  }

  // Test UPSERT: create new entry
  console.log('\n3️⃣ Testing upsertWorkEntry() - CREATE...')
  const newEntry = {
    employee_id: 2,
    workplace_id: 1,
    status: 'OPEN',
    check_in_at: new Date().toISOString(),
    check_in_application: 'APP',
    name: 'Sync Test Entry',
    type: 'EMPLOYEE',
    personalNumber: '8888888888',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    synced: 0, // NOT synced yet (outbox)
    deleted: 0
  }

  await upsertWorkEntry(newEntry)
  console.log('✅ Successfully created new entry\n')

  // Test SYNC operations: Drain outbox
  console.log('4️⃣ Testing getUnsyncedForSync() - DRAIN OUTBOX...')
  const unsyncedEntries = await getUnsyncedForSync()
  console.log(`✅ Found ${unsyncedEntries.length} unsynced entries in outbox`)

  if (unsyncedEntries.length > 0) {
    console.log('   IDs:', unsyncedEntries.map(e => e.id).join(', '))
  }

  // Simulate successful API push: mark as synced
  if (unsyncedEntries.length > 0) {
    console.log(`\n5️⃣ Testing markEntriesAsSynced() - MARK SYNCED AFTER API PUSH...`)
    const idsToSync = unsyncedEntries.map(e => e.id)
    await markEntriesAsSynced(idsToSync)
    console.log(`✅ Marked ${idsToSync.length} entries as synced\n`)
  }

  // Test soft-delete and drain deletions
  console.log('6️⃣ Testing softDeleteWorkEntry() and getDeletedForSync()...')
  const newestEntry = unsyncedEntries[unsyncedEntries.length - 1]
  if (newestEntry) {
    await softDeleteWorkEntry(newestEntry.id)
    console.log(`✅ Soft-deleted entry ${newestEntry.id}\n`)

    console.log('7️⃣ Testing getDeletedForSync() - DRAIN DELETIONS...')
    const deletedEntries = await getDeletedForSync()
    console.log(`✅ Found ${deletedEntries.length} deleted entries`)

    if (deletedEntries.length > 0) {
      console.log('   IDs:', deletedEntries.map(e => e.id).join(', '))
      
      // Simulate successful API delete: permanently delete locally
      console.log(`\n8️⃣ Testing deletePermanently() - AFTER API DELETE...`)
      await deletePermanently(deletedEntries.map(e => e.id))
      console.log(`✅ Permanently deleted ${deletedEntries.length} entries\n`)
    }
  }

  // Final check
  console.log('9️⃣ Final verification - checking remaining entries...')
  const finalEntries = await getWorkEntries()
  console.log(`✅ Database has ${finalEntries.length} entries now\n`)

  console.log('🎉 All Drizzle CRUD and SYNC operations successful!')
  console.log('\n📋 Summary:')
  console.log('   ✓ CREATE (upsert) new entry')
  console.log('   ✓ READ (getWorkEntries, getUnsyncedForSync)')
  console.log('   ✓ Sync outbox (mark entries as synced after API push)')
  console.log('   ✓ Soft-delete and delete drain')
  console.log('   ✓ Permanent delete after successful API delete')

  process.exit(0)
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}


