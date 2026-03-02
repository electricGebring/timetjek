#!/usr/bin/env node

/**
 * Clean seeded test entries from app.db
 * Removes entries with ID 2-6 that were added by seed-test-data.mjs
 * Run with: npx tsx clean-seeded-entries.mjs
 */

import { initDrizzle, getDb } from './src/db/drizzle.ts'
import { workEntries } from './src/db/schema.ts'
import { inArray } from 'drizzle-orm'

console.log('🧹 Cleaning seeded entries from app.db...\n')

try {
  initDrizzle('./app.db')
  const db = getDb()

  // Delete entries with IDs 2-6 (the seeded ones)
  const idsToDelete = [2, 3, 4, 5, 6]
  
  console.log(`🗑️  Deleting entries with IDs: ${idsToDelete.join(', ')}`)
  
  await db
    .delete(workEntries)
    .where(inArray(workEntries.id, idsToDelete))

  // Check remaining count
  const remaining = await db.select().from(workEntries)
  
  console.log(`✅ Done! Database now has ${remaining.length} entry (the original one)`)
  console.log('\n💡 Next step: Run the browser export script to import your 17 entries')
  
  process.exit(0)
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}
