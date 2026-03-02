#!/usr/bin/env node

/**
 * Seed script for adding test data to the database
 * Run with: npm run seed
 */

import { initDrizzle, getDb } from './src/db/drizzle.ts'
import { workEntries } from './src/db/schema.ts'

console.log('🌱 Seeding test data...\n')

try {
  // Initialize Drizzle
  initDrizzle('./app.db')
  const db = getDb()

  const now = new Date()
  const testEntries = [
    {
      employee_id: 1,
      workplace_id: 1,
      status: 'OPEN',
      check_in_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
      check_in_application: 'APP',
      name: 'Test User',
      type: 'EMPLOYEE',
      personalNumber: '0000000001',
      synced: 0,
      deleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      employee_id: 2,
      workplace_id: 1,
      status: 'CLOSED',
      check_in_at: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(), // 8h ago
      check_out_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30min ago
      check_in_application: 'APP',
      check_out_application: 'APP',
      total_working_seconds: 7 * 60 * 60, // 7h
      total_break_seconds: 30 * 60, // 30min break
      name: 'Jane Doe',
      type: 'EMPLOYEE',
      personalNumber: '0000000002',
      synced: 0,
      deleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      employee_id: 3,
      workplace_id: 2,
      status: 'OPEN',
      check_in_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
      check_in_application: 'WEB',
      name: 'Bob Smith',
      type: 'EMPLOYEE',
      personalNumber: '0000000003',
      synced: 0,
      deleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      employee_id: 4,
      workplace_id: 1,
      status: 'CLOSED',
      check_in_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
      check_out_at: new Date(now.getTime() - 16 * 60 * 60 * 1000).toISOString(), // yesterday
      check_in_application: 'APP',
      check_out_application: 'APP',
      total_working_seconds: 8 * 60 * 60, // 8h
      total_break_seconds: 45 * 60, // 45min break
      name: 'Alice Johnson',
      type: 'EMPLOYEE',
      personalNumber: '0000000004',
      synced: 1, // already synced
      deleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      employee_id: 5,
      workplace_id: 2,
      status: 'OPEN',
      check_in_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(), // 5h ago
      check_in_application: 'APP',
      name: 'Charlie Brown',
      type: 'EMPLOYEE',
      personalNumber: '0000000005',
      meal_benefit_has_lunch: 1,
      synced: 0,
      deleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  console.log(`📝 Inserting ${testEntries.length} test entries...`)
  
  for (const entry of testEntries) {
    await db.insert(workEntries).values(entry)
    console.log(`  ✓ Added entry for ${entry.name}`)
  }

  // Get the new total count
  const allEntries = await db.select().from(workEntries)
  console.log(`\n✅ Database now contains ${allEntries.length} work entries total`)
  console.log('\n🎉 Seeding complete!')
  
  process.exit(0)
} catch (error) {
  console.error('❌ Error seeding data:', error)
  process.exit(1)
}
