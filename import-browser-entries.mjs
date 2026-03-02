#!/usr/bin/env node

/**
 * Import work entries from browser database export
 * Can accept either:
 * 1. JSON file with exported entries: npx tsx import-browser-entries.mjs browser-work-entries.json
 * 2. Base64-encoded database: npx tsx import-browser-entries.mjs --base64 <base64string>
 */

import { initDrizzle, getDb } from './src/db/drizzle.ts'
import { workEntries } from './src/db/schema.ts'
import { readFileSync } from 'fs'

console.log('📥 Importing browser entries to app.db...\n')

try {
  let data = null

  if (process.argv[2] === '--base64' && process.argv[3]) {
    // Handle base64-encoded sql.js database
    console.log('🔓 Decoding base64 database...')
    
    // Dynamically import sql.js
    const initSqlJs = (await import('sql.js')).default
    const SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    })

    const buf = Uint8Array.from(atob(process.argv[3]), c => c.charCodeAt(0))
    const db = new SQL.Database(buf)

    // Query work_entries from browser database
    const result = db.exec('SELECT * FROM work_entries')
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns
      data = result[0].values.map(row => {
        const obj = {}
        columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
      console.log(`✅ Decoded ${data.length} entries from base64\n`)
    }
  } else {
    // Handle JSON file
    const filename = process.argv[2] || 'browser-work-entries.json'
    
    console.log(`📖 Reading ${filename}...`)
    data = JSON.parse(readFileSync(filename, 'utf-8'))
    
    if (data.data) {
      // If it's wrapped format {data: "base64..."}, decode it
      console.log('🔓 Decoding base64 from JSON wrapper...')
      const initSqlJs = (await import('sql.js')).default
      const SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      })
      const buf = Uint8Array.from(atob(data.data), c => c.charCodeAt(0))
      const db = new SQL.Database(buf)
      const result = db.exec('SELECT * FROM work_entries')
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns
        data = result[0].values.map(row => {
          const obj = {}
          columns.forEach((col, idx) => {
            obj[col] = row[idx]
          })
          return obj
        })
      }
    }
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid or empty data')
  }

  console.log(`📊 Found ${data.length} entries to import\n`)

  initDrizzle('./app.db')
  const db = getDb()

  let imported = 0
  let skipped = 0

  for (const entry of data) {
    try {
      await db.insert(workEntries).values({
        id: entry.id,
        employee_id: entry.employee_id,
        workplace_id: entry.workplace_id,
        cost_center_id: entry.cost_center_id,
        work_day_id: entry.work_day_id,
        status: entry.status,
        check_in_at: entry.check_in_at,
        check_in_time_at: entry.check_in_time_at,
        check_in_latitude: entry.check_in_latitude,
        check_in_longitude: entry.check_in_longitude,
        check_in_application: entry.check_in_application,
        check_out_at: entry.check_out_at,
        check_out_time_at: entry.check_out_time_at,
        check_out_latitude: entry.check_out_latitude,
        check_out_longitude: entry.check_out_longitude,
        check_out_application: entry.check_out_application,
        break: entry.break,
        meal_benefit_has_breakfast: entry.meal_benefit_has_breakfast,
        meal_benefit_has_lunch: entry.meal_benefit_has_lunch,
        name: entry.name,
        type: entry.type,
        personalNumber: entry.personalNumber,
        administrator_comment: entry.administrator_comment,
        total_working_seconds: entry.total_working_seconds,
        total_break_seconds: entry.total_break_seconds,
        hasError: entry.hasError,
        updatedBy: entry.updatedBy,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        deleted_at: entry.deleted_at,
        synced: entry.synced,
        deleted: entry.deleted,
      })
      imported++
      console.log(`  ✓ Imported entry ${entry.id}: ${entry.name}`)
    } catch (error) {
      skipped++
      console.log(`  ⚠️  Skipped entry ${entry.id}`)
    }
  }

  const total = await db.select().from(workEntries)
  
  console.log(`\n✅ Import complete!`)
  console.log(`   - Imported: ${imported}`)
  console.log(`   - Skipped: ${skipped}`)
  console.log(`   - Total in database: ${total.length}`)
  
  process.exit(0)
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
