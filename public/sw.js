
// Service Worker for ExpendX PWA
// Auto-updates seamlessly — no prompt needed

const CACHE_NAME = 'expendx-v2';

// Only cache the offline fallback and app shell during install
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/favicon.png',
  '/app-icon.png',
];

// ─── INSTALL ────────────────────────────────────────────────
// Immediately activate the new SW — don't wait for old tabs to close
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// ─── ACTIVATE ───────────────────────────────────────────────
// Claim all clients and purge old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim()) // Take control of all open tabs
  );
});

// ─── FETCH ──────────────────────────────────────────────────

// Helper: is this a navigation request (HTML page)?
const isNavigationRequest = (request) => {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
};

// Helper: is this a Vite-hashed asset? (contains a hash in the filename)
const isHashedAsset = (url) => {
  // Vite outputs files like: /assets/index-abc123.js, /assets/style-def456.css
  return url.includes('/assets/') && /\.[a-f0-9]{8,}\./i.test(url);
};

// Helper: is this an API/auth request that should never be cached?
const isApiOrAuthRequest = (url) => {
  return url.includes('/rest/v1/') ||
    url.includes('/auth/') ||
    url.includes('/token') ||
    url.includes('/supabase.co/') ||
    url.includes('/graphql') ||
    url.includes('/api/') ||
    url.includes('/realtime/');
};

// Helper: is this an image?
const isImageRequest = (url) => {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico|avif)(\?|$)/i.test(url);
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Skip non-GET, cross-origin auth, and browser extension requests
  if (request.method !== 'GET' || url.startsWith('chrome-extension://')) {
    return;
  }

  // ── API / Auth: NEVER cache, always network ──
  if (isApiOrAuthRequest(url)) {
    return; // Let the browser handle it normally
  }

  // ── Navigation (HTML): NETWORK-FIRST (bypassing HTTP Cache) ──
  // Always try to get fresh HTML so the PWA stays up-to-date
  if (isNavigationRequest(request)) {
    // Use no-store to force the browser to ignore its own disk cache for HTML
    const freshRequest = new Request(request.url, { cache: 'no-store' });

    event.respondWith(
      fetch(freshRequest)
        .then((response) => {
          // Cache the fresh HTML for offline fallback
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          // Offline: serve cached page or offline fallback
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request);
          return cached || cache.match('/offline.html') || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // ── Hashed assets (JS/CSS): CACHE-FIRST ──

  // Safe because Vite generates unique filenames per build
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  // ── Images: CACHE-FIRST with network fallback ──
  if (isImageRequest(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // ── Everything else: NETWORK-FIRST with cache fallback ──
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match(request) || new Response('Offline', { status: 503 });
      })
  );
});

// ─── BACKGROUND SYNC ────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'expendx-background-sync' || event.tag === 'sync-transactions') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage({ type: 'PERFORM_SYNC', timestamp: Date.now() });
  });
}

// ─── PUSH NOTIFICATIONS ─────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.message,
        icon: '/app-icon.png',
        badge: '/app-icon.png',
        data: data.url ? { url: data.url } : undefined,
        requireInteraction: data.important || false,
        tag: data.tag || 'default',
      })
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// ─── MESSAGE HANDLING ────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
