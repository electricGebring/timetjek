const jsonServer = require('json-server')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const server = jsonServer.create()
const middlewares = jsonServer.defaults()

// Paths to data files
const workSchemeFile = path.join(__dirname, 'mock-data/work-scheme.json')
const entriesFile = path.join(__dirname, 'mock-data/entries.json')
const breaksFile = path.join(__dirname, 'mock-data/work-entry-breaks.json')

// Load initial data
let db = {
  workScheme: JSON.parse(fs.readFileSync(workSchemeFile, 'utf-8')),
  entries: JSON.parse(fs.readFileSync(entriesFile, 'utf-8')),
  work_entry_breaks: JSON.parse(fs.readFileSync(breaksFile, 'utf-8'))
}

const router = jsonServer.router(db)

function toIsoFromEntryDate(entryIso, timePart) {
  if (!entryIso || !timePart) return null

  const datePart = String(entryIso).split('T')[0]

  if (!datePart) return null

  return `${datePart}T${timePart}Z`
}

function syncBreakFromEntry(entry) {
  if (!entry || typeof entry !== 'object') return
  if (!entry.id || typeof entry.id !== 'string') return
  if (typeof entry.break !== 'string' || entry.break.trim().length === 0) return

  const [startTimeRaw, endTimeRaw] = entry.break.split('-')
  const startTime = startTimeRaw?.trim()
  const endTime = endTimeRaw?.trim()

  if (!startTime) return

  const startAt = toIsoFromEntryDate(entry.check_in_at, startTime)
  const endAt = endTime && endTime !== '00:00:00' ? toIsoFromEntryDate(entry.check_in_at, endTime) : null

  if (!startAt) return

  const existingIndex = db.work_entry_breaks.findIndex(
    (b) => b.work_entry_id === entry.id && b.start_at === startAt
  )

  if (existingIndex >= 0) {
    db.work_entry_breaks[existingIndex] = {
      ...db.work_entry_breaks[existingIndex],
      end_at: endAt,
      end_exact_at: endAt
    }
    console.log('🔄 Synced break from entry update:', entry.id)
    return
  }

  const newBreak = {
    id: crypto.randomUUID(),
    work_entry_id: entry.id,
    start_at: startAt,
    end_at: endAt,
    start_exact_at: startAt,
    end_exact_at: endAt,
    created_at: new Date().toISOString()
  }

  db.work_entry_breaks.push(newBreak)
  console.log('➕ Created break from entry:', entry.id)
}

// Helper to save data back to files
function saveData() {
  try {
    fs.writeFileSync(entriesFile, JSON.stringify(db.entries, null, 2), 'utf-8')
    fs.writeFileSync(breaksFile, JSON.stringify(db.work_entry_breaks, null, 2), 'utf-8')
    fs.writeFileSync(workSchemeFile, JSON.stringify(db.workScheme, null, 2), 'utf-8')
    console.log('✅ Data saved to files')
  } catch (error) {
    console.error('❌ Failed to save data:', error)
  }
}

// Use default middlewares
server.use(middlewares)
server.use(jsonServer.bodyParser)

// Debug all requests
server.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`)
  next()
})

// Custom POST handler for entries - preserve client-provided IDs
server.post('/entries', (req, res) => {
  const entry = { ...req.body }
  
  console.log('📥 POST /entries:', entry.id)

  syncBreakFromEntry(entry)
  entry.break = null
  
  // Use client-provided ID if present
  if (entry.id) {
    const existingIndex = db.entries.findIndex(e => e.id === entry.id)
    
    if (existingIndex >= 0) {
      // Update existing
      db.entries[existingIndex] = { ...db.entries[existingIndex], ...entry }
      console.log('🔄 Updated existing entry:', entry.id)
    } else {
      // Add new
      db.entries.push(entry)
      console.log('➕ Added new entry:', entry.id)
    }
    
    saveData()
    return res.status(201).json(entry)
  }
  
  // If no ID provided, generate one
  const newEntry = { ...entry, id: `api-${Date.now()}` }
  db.entries.push(newEntry)
  saveData()
  return res.status(201).json(newEntry)
})

// Custom PATCH handler for entries
server.patch('/entries/:id', (req, res) => {
  const { id } = req.params
  const updates = { ...req.body }
  
  console.log('🔧 PATCH /entries/' + id)

  syncBreakFromEntry({ id, ...updates })
  if ('break' in updates) {
    updates.break = null
  }
  
  const index = db.entries.findIndex(e => e.id === id)
  
  if (index >= 0) {
    db.entries[index] = { ...db.entries[index], ...updates, updatedAt: new Date().toISOString() }
    saveData()
    return res.json(db.entries[index])
  }
  
  return res.status(404).json({ error: 'Entry not found' })
})

// Custom DELETE handler for entries
server.delete('/entries/:id', (req, res) => {
  const { id } = req.params
  
  console.log('🗑️  DELETE /entries/' + id)
  
  const index = db.entries.findIndex(e => e.id === id)
  
  if (index >= 0) {
    db.entries.splice(index, 1)
    saveData()
    return res.status(204).end()
  }
  
  return res.status(404).json({ error: 'Entry not found' })
})

// Custom POST handler for work_entry_breaks
server.post('/work_entry_breaks', (req, res) => {
  const breakEntry = req.body
  
  console.log('📥 POST /work_entry_breaks:', breakEntry.id)
  
  if (breakEntry.id) {
    const existingIndex = db.work_entry_breaks.findIndex(b => b.id === breakEntry.id)
    
    if (existingIndex >= 0) {
      db.work_entry_breaks[existingIndex] = { ...db.work_entry_breaks[existingIndex], ...breakEntry }
      console.log('🔄 Updated existing break:', breakEntry.id)
    } else {
      db.work_entry_breaks.push(breakEntry)
      console.log('➕ Added new break:', breakEntry.id)
    }
    
    saveData()
    return res.status(201).json(breakEntry)
  }
  
  const newBreak = { ...breakEntry, id: crypto.randomUUID() }
  db.work_entry_breaks.push(newBreak)
  saveData()
  return res.status(201).json(newBreak)
})

// Custom PATCH handler for work_entry_breaks
server.patch('/work_entry_breaks/:id', (req, res) => {
  const { id } = req.params
  const updates = req.body
  
  console.log('🔧 PATCH /work_entry_breaks/' + id)
  
  const index = db.work_entry_breaks.findIndex(b => b.id === id)
  
  if (index >= 0) {
    db.work_entry_breaks[index] = { ...db.work_entry_breaks[index], ...updates }
    saveData()
    return res.json(db.work_entry_breaks[index])
  }
  
  return res.status(404).json({ error: 'Break not found' })
})

// Custom DELETE handler for work_entry_breaks
server.delete('/work_entry_breaks/:id', (req, res) => {
  const { id } = req.params
  
  console.log('🗑️  DELETE /work_entry_breaks/' + id)
  
  const index = db.work_entry_breaks.findIndex(b => b.id === id)
  
  if (index >= 0) {
    db.work_entry_breaks.splice(index, 1)
    saveData()
    return res.status(204).end()
  }
  
  return res.status(404).json({ error: 'Break not found' })
})

// Use json-server router for other routes
server.use(router)

// After each response, save data (catches all modifications)
server.use((req, res, next) => {
  const originalJson = res.json
  res.json = function(data) {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      console.log('💾 Saving after ' + req.method)
      saveData()
    }
    return originalJson.call(this, data)
  }
  next()
})

// Fallback: also save after router is done
server.use((req, res) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    console.log('💾 Final save after ' + req.method)
    saveData()
  }
})

const PORT = 3002
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 JSON Server running on http://0.0.0.0:${PORT}`)
  console.log(`📊 Entries: ${db.entries.length}`)
  console.log(`⏱️  Work entry breaks: ${db.work_entry_breaks.length}`)
})
