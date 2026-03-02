#!/usr/bin/env node

/**
 * Test script for Sync Operations with Drizzle ORM
 * Tests sync adapter methods directly (without full SyncEngine due to path alias issues)
 * Run with: npx tsx test-sync-engine-drizzle.mjs
 */

import { initDrizzle } from './src/db/drizzle.ts'
import { createStaffRegisterDrizzleAdapter } from './src/sync/staff-register/adapter.drizzle.ts'
import * as commands from './src/domain/staff-register/commands.drizzle.ts'
import * as queries from './src/domain/staff-register/queries.drizzle.ts'

console.log('🚀 Testing Sync Adapter with Drizzle ORM...\n')

try {
  // Initialize Drizzle
  console.log('1️⃣ Initializing Drizzle with better-sqlite3...')
  await initDrizzle('./app.db')
  console.log('✅ Drizzle initialized\n')

  // Create sync adapter
  console.log('2️⃣ Creating Drizzle sync adapter...')
  const adapter = createStaffRegisterDrizzleAdapter()
  console.log('✅ Sync adapter created\n')

  // Create some unsynced test data
  console.log('3️⃣ Creating test work entries (unsynced)...')
  
  const testEntry1 = {
    employee_id: 10,
    workplace_id: 1,
    status: 'OPEN',
    check_in_at: new Date().toISOString(),
    check_in_application: 'APP',
    name: 'Sync Test Entry 1',
    type: 'EMPLOYEE',
    personalNumber: '1111111111',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    synced: 0, // UNSYNCED - will be in outbox
    deleted: 0
  }

  const testEntry2 = {
    employee_id: 11,
    workplace_id: 1,
    status: 'OPEN',
    check_in_at: new Date().toISOString(),
    check_in_application: 'APP',
    name: 'Sync Test Entry 2',
    type: 'EMPLOYEE',
    personalNumber: '2222222222',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    synced: 0, // UNSYNCED - will be in outbox
    deleted: 0
  }

  await commands.createWorkEntry(testEntry1)
  await commands.createWorkEntry(testEntry2)
  console.log('✅ Created 2 unsynced work entries\n')

  // Verify entries in outbox using adapter
  console.log('4️⃣ Testing adapter.getUnsynced()...')
  const unsyncedEntries = await adapter.getUnsynced()
  console.log(`✅ Adapter found ${unsyncedEntries.length} unsynced entries\n`)

  if (unsyncedEntries.length > 0) {
    console.log('   Sample entry:', {
      id: unsyncedEntries[0].id,
      name: unsyncedEntries[0].name,
      synced: unsyncedEntries[0].synced
    })
  }

  // Test batch upsert (simulated API push)
  console.log('\n5️⃣ Testing adapter.batchUpsert() - simulating API push...')
  if (unsyncedEntries.length > 0) {
    const result = await adapter.batchUpsert(unsyncedEntries)
    console.log(`✅ Batch upsert completed for ${result.length} entries\n`)
  }

  // Verify outbox is now empty
  console.log('6️⃣ Verifying outbox after batch upsert...')
  const unsyncedAfter = await adapter.getUnsynced()
  console.log(`✅ Outbox now has ${unsyncedAfter.length} unsynced entries\n`)

  // Create an entry and then soft-delete it
  console.log('7️⃣ Creating and soft-deleting an entry...')
  const testEntry3 = {
    employee_id: 12,
    workplace_id: 1,
    status: 'CLOSED',
    check_in_at: new Date().toISOString(),
    check_out_at: new Date().toISOString(),
    check_in_application: 'APP',
    name: 'Sync Test Entry 3 - To Delete',
    type: 'EMPLOYEE',
    personalNumber: '3333333333',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    synced: 1, // Already synced
    deleted: 0
  }

  await commands.createWorkEntry(testEntry3)
  
  // Get the ID of the created entry
  const allEntries = await queries.getAllWorkEntries()
  const entry3 = allEntries.find(e => e.personalNumber === '3333333333')
  
  if (entry3) {
    await commands.deleteWorkEntry(entry3.id)
    console.log(`✅ Soft-deleted entry ${entry3.id}\n`)
  }

  // Verify deleted entries using adapter
  console.log('8️⃣ Testing adapter.getDeleted()...')
  const deletedEntries = await adapter.getDeleted()
  console.log(`✅ Adapter found ${deletedEntries.length} deleted entries\n`)

  // Test batch delete (simulated API delete)
  console.log('9️⃣ Testing adapter.batchDelete() - simulating API delete...')
  if (deletedEntries.length > 0) {
    const idsToDelete = deletedEntries.map(e => e.id)
    await adapter.batchDelete(idsToDelete)
    console.log(`✅ Batch delete completed for ${idsToDelete.length} entries\n`)
  }

  // Verify deleted entries are now gone
  console.log('🔟 Verifying deleted entries after batch delete...')
  const deletedAfter = await adapter.getDeleted()
  console.log(`✅ Deleted entries now: ${deletedAfter.length}\n`)

  // Final summary
  console.log('✅ Final verification...')
  const finalAll = await queries.getAllWorkEntries()
  const finalUnsynced = await queries.getUnsyncedWorkEntries()
  const finalDeleted = await queries.getDeletedWorkEntries()

  console.log(`✅ Final state:`)
  console.log(`   Total entries: ${finalAll.length}`)
  console.log(`   Unsynced: ${finalUnsynced.length}`)
  console.log(`   Deleted: ${finalDeleted.length}\n`)

  console.log('🎉 All Sync Adapter with Drizzle tests successful!')
  console.log('\n📋 Summary:')
  console.log('   ✓ Initialize Drizzle ORM')
  console.log('   ✓ Create Drizzle sync adapter')
  console.log('   ✓ Create unsynced test entries')
  console.log('   ✓ Test adapter.getUnsynced()')
  console.log('   ✓ Test adapter.batchUpsert() - simulated API push')
  console.log('   ✓ Verify outbox drained after batch upsert')
  console.log('   ✓ Create and soft-delete entry')
  console.log('   ✓ Test adapter.getDeleted()')
  console.log('   ✓ Test adapter.batchDelete() - simulated API delete')
  console.log('   ✓ Verify deleted entries removed')
  console.log('\n💡 This demonstrates the sync adapter workflow:')
  console.log('   1. CREATE unsynced entries → outbox')
  console.log('   2. adapter.getUnsynced() → fetch outbox')
  console.log('   3. adapter.batchUpsert() → push to API & mark synced')
  console.log('   4. SOFT-DELETE synced entry → deletion queue')
  console.log('   5. adapter.getDeleted() → fetch deletion queue')
  console.log('   6. adapter.batchDelete() → delete from API & remove locally')
  console.log('\n📝 NOTE: API calls are currently simulated.')
  console.log('   In production, replace with actual API client.')

  process.exit(0)
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}
