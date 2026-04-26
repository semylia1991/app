// Minimal service worker — required for PWA install prompt.
// No caching: app requires internet to function.
self.addEventListener('fetch', () => {});
