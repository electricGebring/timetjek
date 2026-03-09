const workScheme = require('./mock-data/work-scheme.json')
const entries = require('./mock-data/entries.json')
const workEntryBreaks = require('./mock-data/work-entry-breaks.json')

module.exports = () => ({
  workScheme,
  entries,
  work_entry_breaks: workEntryBreaks,
})
