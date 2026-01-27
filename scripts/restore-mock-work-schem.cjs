// restore-mock-work-schem.js
// Restores mock-work-schem.json from the latest backup (.bak or .bak-YYYYMMDD-HHMMSS).
// Logs in English. Pure Node.js.
// Run with: node scripts/restore-mock-work-schem.cjs
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../src/api');
const DATA_PATH = path.join(DIR, 'mock-work-schem.json');

function getLatestBackup() {
  const files = fs.readdirSync(DIR);
  const bakFiles = files
    .filter(f => f.startsWith('mock-work-schem.json.bak'))
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime);
  return bakFiles.length > 0 ? bakFiles[0].name : null;
}

function main() {
  const latest = getLatestBackup();
  if (!latest) {
    console.error('No backup file found!');
    process.exit(1);
  }
  const backupPath = path.join(DIR, latest);
  fs.copyFileSync(backupPath, DATA_PATH);
  console.log(`Restored mock-work-schem.json from backup: ${latest}`);
}

main();