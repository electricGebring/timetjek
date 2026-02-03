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

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} tim ${minutes} min`;
  } else if (hours > 0) {
    return `${hours} tim`;
  } else {
    return `${minutes} min`;
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

  const baseDate = '2025-02-11';
  const work_day_id = 1739232000000;

  // Find max id
  let nextId = data.entries.reduce((max, e) => Math.max(max, e.id || 0), 0) + 1;

  // Find latest timeOut for 2025-02-11, fallback to 13:00:00 if not found
  const dayEntries = data.entries.filter((e) => (e.createdAt || '').startsWith(baseDate));
  const lastTimeOut = dayEntries
    .map((e) => e.timeOut)
    .filter(Boolean)
    .sort()
    .pop() || '13:00:00';

  // Helper: add minutes to HH:mm:ss
  const addMinutes = (time, minutesToAdd) => {
    const [h, m, s] = time.split(':').map(Number);
    const total = h * 60 + m + minutesToAdd;
    const newH = String(Math.floor(total / 60)).padStart(2, '0');
    const newM = String(total % 60).padStart(2, '0');
    return `${newH}:${newM}:${String(s).padStart(2, '0')}`;
  };

  // New timeline: start with a break right after lastTimeOut
  const schedule = [
    { type: 'break', durationMin: 15 },   // Rast 15 min
    { type: 'work', durationMin: 90 },    // Arbete 1h30
    { type: 'break', durationMin: 10 },   // Rast 10 min
    { type: 'work', durationMin: 120 },   // Arbete 2h
    { type: 'break', durationMin: 30 },   // Rast 30 min
    { type: 'work', durationMin: 60 }     // Arbete 1h
  ];

  let cursor = lastTimeOut;
  const newEntries = [];

  schedule.forEach((slot) => {
    const timeIn = cursor;
    const timeOut = addMinutes(cursor, slot.durationMin);
    cursor = timeOut;

    const isBreak = slot.type === 'break';

    newEntries.push({
      id: nextId++,
      name: 'Anna Svensson',
      type: 'A',
      personalNumber: '19870312-1234',
      timeIn,
      timeOut,
      break: isBreak ? formatMinutes(slot.durationMin) : null,
      workTime: isBreak ? null : formatMinutes(slot.durationMin),
      status: isBreak ? 'Rast' : null,
      statusType: isBreak ? 'break' : 'updated',
      hasError: false,
      updatedBy: 'Script',
      createdAt: `${baseDate}T${timeIn}Z`,
      updatedAt: new Date().toISOString(),
      work_day_id,
      date: baseDate,
      dateLabel: baseDate,
      synced: 0,
      deleted: 0
    });
  });

  data.entries.push(...newEntries);
  console.log(`Appended ${newEntries.length} entries after ${lastTimeOut} for ${baseDate}`);

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('mock-work-schem.json updated successfully.');
}

updateData();