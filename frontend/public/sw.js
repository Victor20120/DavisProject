const ICON = '/favicon.svg';

// Active timers — keyed by "genericName__HH:MM"
const timers = new Map();

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim().then(restoreSchedule));
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_REMINDERS') saveAndSchedule(e.data.reminders);
  if (e.data?.type === 'CANCEL_ALL')          cancelAll();
});

// Server-sent push (works when browser is closed)
self.addEventListener('push', e => {
  const data  = e.data?.json() ?? {};
  const title = data.title ?? 'Pal Reminder';
  const body  = data.body  ?? 'Time to take your medication.';
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:     ICON,
      badge:    ICON,
      tag:      'pal-reminder',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(all => {
      if (all.length) return all[0].focus();
      return clients.openWindow('/');
    })
  );
});

// ── IndexedDB ──────────────────────────────────────────────────────────────────

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('pal-reminders', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('schedules');
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}

async function dbPut(value) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('schedules', 'readwrite');
    tx.objectStore('schedules').put(value, 'current');
    tx.oncomplete = res;
    tx.onerror    = () => rej(tx.error);
  });
}

async function dbGet() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const r = db.transaction('schedules').objectStore('schedules').get('current');
    r.onsuccess = () => res(r.result ?? null);
    r.onerror   = () => rej(r.error);
  });
}

// ── Scheduling ─────────────────────────────────────────────────────────────────

async function saveAndSchedule(reminders) {
  await dbPut(reminders);
  schedule(reminders);
}

async function restoreSchedule() {
  const saved = await dbGet();
  if (saved) schedule(saved);
}

function cancelAll() {
  for (const id of timers.values()) clearTimeout(id);
  timers.clear();
}

function schedule(reminders) {
  cancelAll();
  for (const [name, entry] of Object.entries(reminders)) {
    if (!entry.enabled) continue;
    for (const hhmm of entry.times ?? []) {
      arm(name, entry, hhmm);
    }
  }
}

function arm(name, entry, hhmm) {
  const key = `${name}__${hhmm}`;
  const ms  = msUntilHHMM(hhmm);
  timers.set(key, setTimeout(() => fire(name, entry, hhmm), ms));
}

function fire(name, entry, hhmm) {
  const title = `Time to take your ${entry.commonName ?? name}`;
  const body  = [name, entry.frequency].filter(Boolean).join(' · ');

  self.registration.showNotification(title, {
    body,
    icon:     ICON,
    badge:    ICON,
    tag:      `${name}__${hhmm}`,
    renotify: true,
    data:     { genericName: name },
  });

  // Reschedule for same time tomorrow
  const key = `${name}__${hhmm}`;
  timers.set(key, setTimeout(() => fire(name, entry, hhmm), 24 * 60 * 60 * 1000));
}

function msUntilHHMM(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const now    = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}
