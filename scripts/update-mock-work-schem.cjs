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

  // Find latest CLOSED check_out_time_at for 2025-02-11, fallback till 09:00:00 om ingen finns
  const dayEntries = data.entries.filter(
    (e) => (e.createdAt || '').startsWith(baseDate) && e.status === 'CLOSED'
  );
  const lastTimeOut = dayEntries
    .map((e) => e.check_out_time_at)
    .filter(Boolean)
    .sort()
    .pop() || '09:00:00';

  // Helper: add minutes to HH:mm:ss
  const addMinutes = (time, minutesToAdd) => {
    const [h, m, s] = time.split(':').map(Number);
    const total = h * 60 + m + minutesToAdd;
    const newH = String(Math.floor(total / 60)).padStart(2, '0');
    const newM = String(total % 60).padStart(2, '0');
    return `${newH}:${newM}:${String(s).padStart(2, '0')}`;
  };

  // Generate closed entries for 2025-02-11 with 1h work and 15min break, alternating, until ~17:00
  let cursor = lastTimeOut;
  const newEntries = [];
  const endTime = '17:00:00';
  let work = true;
  // Helper: convert HH:mm:ss to minutes
  const timeToMinutes = (t) => {
    const [h, m, s] = t.split(':').map(Number);
    return h * 60 + m;
  };
  let firstBreakDone = false;
  while (timeToMinutes(cursor) < timeToMinutes(endTime)) {
    let durationMin;
    if (!work) {
      // Första rast efter 13:00 ska vara 45 min
      if (!firstBreakDone && timeToMinutes(cursor) >= 14 * 60) {
        durationMin = 45;
        firstBreakDone = true;
      } else {
        durationMin = 15;
      }
    } else {
      durationMin = 60;
    }
    const timeIn = cursor;
    let timeOut = addMinutes(cursor, durationMin);
    // Om sista entry skulle bli rast, byt till work och avsluta 17:00
    if (timeToMinutes(timeOut) >= timeToMinutes(endTime)) {
      // Sista entry: alltid work, slutar exakt 17:00
      timeOut = endTime;
      newEntries.push({
        id: nextId++,
        name: 'Anna Svensson',
        type: 'A',
        personalNumber: '19870312-1234',
        work_day_id,
        date: baseDate,
        dateLabel: baseDate,
        status: 'CLOSED',
        check_in_at: `${baseDate}T${timeIn}Z`,
        check_in_time_at: timeIn,
        check_out_at: `${baseDate}T${timeOut}Z`,
        check_out_time_at: timeOut,
        break: null,
        total_working_seconds: timeToMinutes(timeOut) - timeToMinutes(timeIn) > 0 ? (timeToMinutes(timeOut) - timeToMinutes(timeIn)) * 60 : 0,
        createdAt: `${baseDate}T${timeIn}Z`,
        updatedAt: new Date().toISOString(),
        synced: 0,
        deleted: 0,
        // ...lägg till övriga fält om du vill
      });
      break;
    }
    if (work) {
      // Work entry
      newEntries.push({
        id: nextId++,
        name: 'Anna Svensson',
        type: 'A',
        personalNumber: '19870312-1234',
        work_day_id,
        date: baseDate,
        dateLabel: baseDate,
        status: 'CLOSED',
        check_in_at: `${baseDate}T${timeIn}Z`,
        check_in_time_at: timeIn,
        check_out_at: `${baseDate}T${timeOut}Z`,
        check_out_time_at: timeOut,
        break: null,
        total_working_seconds: durationMin * 60,
        createdAt: `${baseDate}T${timeIn}Z`,
        updatedAt: new Date().toISOString(),
        synced: 0,
        deleted: 0,
        // ...lägg till övriga fält om du vill
      });
    } else {
      // Break entry
      newEntries.push({
        id: nextId++,
        name: 'Anna Svensson',
        type: 'A',
        personalNumber: '19870312-1234',
        work_day_id,
        date: baseDate,
        dateLabel: baseDate,
        status: 'OPEN',
        check_in_at: `${baseDate}T${timeIn}Z`,
        check_in_time_at: timeIn,
        check_out_at: null,
        check_out_time_at: null,
        break: `${timeIn}-${timeOut}`,
        total_working_seconds: null,
        createdAt: `${baseDate}T${timeIn}Z`,
        updatedAt: new Date().toISOString(),
        synced: 0,
        deleted: 0,
        // ...lägg till övriga fält om du vill
      });
    }
    cursor = timeOut;
    work = !work;
  }

  data.entries.push(...newEntries);
  console.log(`Appended ${newEntries.length} entries after ${lastTimeOut} for ${baseDate}`);

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('mock-work-schem.json updated successfully.');
}

updateData();