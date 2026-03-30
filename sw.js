const CACHE = 'taken-v1';
const ASSETS = ['./index.html', './manifest.json'];

// ─── INSTALL ──────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// ─── ACTIVATE ─────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// ─── FETCH (offline) ──────────────────────────────────────
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ─── NOTIFICATION CLICK ───────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(cs => {
      if (cs.length) return cs[0].focus();
      return clients.openWindow('./index.html');
    })
  );
});

// ─── ALARM: schedule reminders via postMessage ────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_REMINDERS') {
    scheduleReminders(e.data.openCount);
  }
});

function scheduleReminders(openCount) {
  if (!openCount) return;

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  [
    { hour: 8,  key: `${todayKey}_08`, icon: '🌅', msg: `Goedemorgen! Je hebt ${openCount} taak${openCount > 1 ? 'en' : ''} open vandaag.` },
    { hour: 19, key: `${todayKey}_19`, icon: '🌇', msg: `Goedenavond! Nog ${openCount} taak${openCount > 1 ? 'en' : ''} voor vandaag.` }
  ].forEach(({ hour, key, icon, msg }) => {
    const target = new Date();
    target.setHours(hour, 0, 0, 0);
    const delay = target - now;
    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification(`${icon} Taken`, {
          body: msg,
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: key,
          renotify: false,
          vibrate: [200, 100, 200]
        });
      }, delay);
    }
  });
}
