// update-mock-work-schem.cjs
// Updates mock-work-schem.json and creates a backup (.bak or .bak-YYYYMMDD-HHMMSS).
// Logs in English. Pure Node.js.
// Run with: node scripts/update-mock-work-schem.cjs
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../src/api/mock-work-schem.json');
const BACKUP_PATH = path.join(__dirname, '../src/api/mock-work-schem.json.bak');

console.log('Running update-mock-work-schem.cjs, __dirname:', __dirname);
console.log('DATA_PATH:', DATA_PATH);

function getTimestamp() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return (
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    '-' +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

function createBackup() {
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(DATA_PATH, BACKUP_PATH);
    console.log('Backup created:', BACKUP_PATH);
  } else {
    const ts = getTimestamp();
    const tsBackup = BACKUP_PATH + '-' + ts;
    fs.copyFileSync(DATA_PATH, tsBackup);
    console.log('Backup already exists, new timestamped backup created:', tsBackup);
  }
}

function updateData() {
  createBackup();
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);
  
  if (!data.entries || !Array.isArray(data.entries)) {
    console.error('No entries array found.');
    process.exit(1);
  }
  
  // Hitta högsta befintliga id
  const maxId = data.entries.reduce((max, e) => Math.max(max, e.id || 0), 0);
  
  // Hitta minsta createdAt bland entries för 2025-02-11
  const entries20250211 = data.entries.filter(e => e.createdAt && e.createdAt.startsWith('2025-02-11'));
  let minCreatedAt = entries20250211.reduce((min, e) => {
    const t = new Date(e.createdAt).getTime();
    return t < min ? t : min;
  }, Date.now());
  
  // Om ingen entry för 2025-02-11 finns, ta nuvarande tid
  if (!minCreatedAt || minCreatedAt === Date.now()) minCreatedAt = Date.now();
  
  // Sätt createdAt till 1 sekund före minsta befintliga
  const newCreatedAt = new Date(minCreatedAt - 1000).toISOString();
  
  const newEntry = {
    id: maxId + 1,
    name: "Anna Svensson",
    type: "A",
    personalNumber: "19870312-1234",
    timeIn: "13:45:00",
    timeOut: null,
    break: null,
    workTime: null,
    status: "På rast",
    statusType: "break",
    synced: 0,
    deleted: 0,
    createdAt: newCreatedAt,
    updatedAt: new Date().toISOString(),
    updatedBy: "Script",
    work_day_id: 1739232000000
  };
  
  data.entries.unshift(newEntry);
  console.log('Inserted new entry with id', newEntry.id, 'for date 2025-02-11');
  
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('mock-work-schem.json updated successfully.');
}

updateData();