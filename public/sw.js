// public/sw.js
// GlowKey AI Service Worker — PWA install + Push Notifications

self.addEventListener('fetch', () => {});

// ── Push received ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'GlowKey AI', body: event.data.text() };
  }

  const { title, body, icon, badge, tag, url } = payload;

  event.waitUntil(
    self.registration.showNotification(title || 'GlowKey AI', {
      body: body || '',
      icon: icon || '/icon-192.png',
      badge: badge || '/icon-192.png',
      tag: tag || 'glowkey-push',
      data: { url: url || '/' },
      requireInteraction: false,
      vibrate: [100, 50, 100],
    })
  );
});

// ── Notification click ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
