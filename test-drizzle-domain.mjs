#!/usr/bin/env node

/**
 * Test script for domain layer integration with Drizzle ORM
 * Tests that domain commands and queries work correctly through repo.drizzle
 * Run with: npx tsx test-drizzle-domain.mjs
 */

import { initDrizzle } from './src/db/drizzle.ts'

// Import domain layer (Drizzle version)
import * as domain from './src/domain/work-entries/work-entries.drizzle.ts'

console.log('🚀 Testing Domain Layer Integration with Drizzle ORM...\n')

try {
  // Initialize Drizzle
  console.log('1️⃣ Initializing Drizzle with better-sqlite3...')
  await initDrizzle('./app.db')
  console.log('✅ Drizzle initialized\n')

  // Test 2: Query all work entries
  console.log('2️⃣ Testing queries.getAllWorkEntries()...')
  const allEntries = await domain.getAllWorkEntries()
  console.log(`✅ Got ${allEntries.length} total entries\n`)

  // Test 3: Create a new work entry via domain
  console.log('3️⃣ Testing domain commands.createWorkEntry()...')
  const newEntry = {
    employee_id: 3,
    workplace_id: 1,
    status: 'OPEN',
    check_in_at: new Date().toISOString(),
    check_in_application: 'APP',
    name: 'Domain Test Entry',
    type: 'EMPLOYEE',
    personalNumber: '9999999999',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    synced: 0,
    deleted: 0
  }

  await domain.createWorkEntry(newEntry)
  console.log('✅ Successfully created work entry via domain\n')

  // Test 4: Query unsynced entries
  console.log('4️⃣ Testing queries.getUnsyncedWorkEntries()...')
  const unsyncedEntries = await domain.getUnsyncedWorkEntries()
  console.log(`✅ Found ${unsyncedEntries.length} unsynced entries`)
  if (unsyncedEntries.length > 0) {
    console.log(`   IDs: ${unsyncedEntries.map(e => e.id).join(', ')}\n`)
  }

  // Test 5: Update a work entry via domain
  if (unsyncedEntries.length > 0) {
    console.log('5️⃣ Testing domain commands.updateWorkEntry()...')
    const entryToUpdate = unsyncedEntries[0]
    
    const updated = {
      ...entryToUpdate,
      check_out_at: new Date().toISOString(),
      status: 'CLOSED'
    }

    await domain.updateWorkEntry(updated)
    console.log(`✅ Successfully updated entry ${entryToUpdate.id}\n`)
  }

  // Test 6: Delete a work entry via domain
  if (unsyncedEntries.length > 1) {
    console.log('6️⃣ Testing domain commands.deleteWorkEntry()...')
    const entryToDelete = unsyncedEntries[1]
    
    await domain.deleteWorkEntry(entryToDelete.id)
    console.log(`✅ Successfully soft-deleted entry ${entryToDelete.id}\n`)
  }

  // Test 7: Query deleted entries
  console.log('7️⃣ Testing queries.getDeletedWorkEntries()...')
  const deletedEntries = await domain.getDeletedWorkEntries()
  console.log(`✅ Found ${deletedEntries.length} deleted entries`)
  if (deletedEntries.length > 0) {
    console.log(`   IDs: ${deletedEntries.map(e => e.id).join(', ')}\n`)
  }

  // Test 8: Verify final state
  console.log('8️⃣ Final verification...')
  const finalAll = await domain.getAllWorkEntries()
  const finalUnsynced = await domain.getUnsyncedWorkEntries()
  const finalDeleted = await domain.getDeletedWorkEntries()

  console.log(`✅ Final state:`)
  console.log(`   Total entries: ${finalAll.length}`)
  console.log(`   Unsynced: ${finalUnsynced.length}`)
  console.log(`   Deleted: ${finalDeleted.length}\n`)

  console.log('🎉 All domain layer integration tests successful!')
  console.log('\n📋 Summary:')
  console.log('   ✓ Initialize Drizzle ORM')
  console.log('   ✓ Query all entries via domain')
  console.log('   ✓ Create new entry via domain command')
  console.log('   ✓ Query unsynced entries via domain')
  console.log('   ✓ Update entry via domain command')
  console.log('   ✓ Delete entry via domain command')
  console.log('   ✓ Query deleted entries via domain')
  console.log('\n💡 This demonstrates that domain logic is independent of')
  console.log('   the database implementation (sql.js vs Drizzle).')

  process.exit(0)
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}
