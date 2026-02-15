
// Enhanced Service Worker for ExpendX PWA with advanced offline capabilities

const CACHE_NAME = 'expendx-cache-v4';
const OFFLINE_URL = '/offline.html';
const SYNC_TAG = 'expendx-background-sync';

// Enhanced files to cache with critical resources prioritized
const criticalFiles = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
];

const staticAssets = [
  // Add more static assets as needed
];

// Dynamic cache names for different content types
const CACHES = {
  static: `${CACHE_NAME}-static`,
  dynamic: `${CACHE_NAME}-dynamic`,
  api: `${CACHE_NAME}-api`,
  images: `${CACHE_NAME}-images`
};

// Install the service worker with enhanced caching
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache critical files
      caches.open(CACHES.static).then((cache) => {
        console.log('Caching critical files');
        return cache.addAll(criticalFiles);
      }),
      // Cache static assets
      caches.open(CACHES.dynamic).then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(staticAssets);
      })
    ]).then(() => {
      console.log('Enhanced service worker installed');
    })
  );
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = Object.values(CACHES);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Enhanced service worker activated');
      return self.clients.claim();
    })
  );
});

// Enhanced auth request detection
const isAuthRequest = (url) => {
  return url.includes('/auth/') ||
    url.includes('/token') ||
    url.includes('/supabase.co/auth/') ||
    url.includes('/supabase.co/rest/') ||
    url.includes('/.netlify/functions/') ||
    url.includes('/signup') ||
    url.includes('/signin');
};

// Check if request is for API data
const isApiRequest = (url) => {
  return url.includes('/rest/v1/') ||
    url.includes('/graphql') ||
    url.includes('/api/');
};

// Check if request is for images
const isImageRequest = (url) => {
  return url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i);
};

// Enhanced fetch event with intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET' ||
    url.startsWith('chrome-extension://') ||
    url.includes('extension')) {
    return;
  }

  // Never cache auth requests - always go to network
  if (isAuthRequest(url)) {
    return;
  }

  // Handle different content types with specific strategies
  if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
  } else {
    event.respondWith(handleStaticRequest(request));
  }
});

// Cache-first strategy for images with long-term storage
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(CACHES.images);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetch(request);

    if (response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('Image cache error:', error);
    // Return a placeholder or cached fallback
    const cache = await caches.open(CACHES.images);
    return cache.match('/favicon.ico') || new Response('Image not available offline');
  }
}

// Network-first strategy for API requests with offline fallback
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);

    if (response.status === 200) {
      const cache = await caches.open(CACHES.api);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('API request failed, trying cache:', request.url);

    const cache = await caches.open(CACHES.api);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Add header to indicate cached response
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-From-Cache', 'true');

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }

    // Return structured offline response for API requests
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'This request failed because you are offline'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale-while-revalidate strategy for static content
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(CACHES.static);
    const cachedResponse = await cache.match(request);

    // Serve from cache immediately if available
    const fetchPromise = fetch(request)
      .then(response => {
        if (response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => cachedResponse);

    return cachedResponse || await fetchPromise;
  } catch (error) {
    console.error('Static content error:', error);

    // Try to serve offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHES.static);
      return cache.match(OFFLINE_URL) || new Response('Offline');
    }

    return new Response('Content not available offline');
  }
}

// Enhanced background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === SYNC_TAG || event.tag === 'sync-transactions') {
    event.waitUntil(performBackgroundSync());
  }
});

async function performBackgroundSync() {
  console.log('Performing background sync');

  try {
    // Notify all clients about sync start
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_STARTED',
        timestamp: Date.now()
      });
    });

    // The actual sync logic is handled by the sync manager in the main app
    // We just trigger it here
    clients.forEach(client => {
      client.postMessage({
        type: 'PERFORM_SYNC',
        timestamp: Date.now()
      });
    });

    console.log('Background sync completed successfully');
  } catch (error) {
    console.error('Background sync failed:', error);

    // Notify clients of sync failure
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_FAILED',
        error: error.message,
        timestamp: Date.now()
      });
    });
  }
}

// Enhanced push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const notificationOptions = {
      body: data.message,
      icon: '/app-icon.png',
      badge: '/app-icon.png',
      data: data.url ? { url: data.url } : undefined,
      requireInteraction: data.important || false,
      tag: data.tag || 'default'
    };

    event.waitUntil(
      self.registration.showNotification(data.title, notificationOptions)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Check if app is already open
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // If not already open, open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Enhanced periodic cleanup and message handling
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEANUP_CACHE') {
    event.waitUntil(cleanupOldCacheEntries());
  } else if (event.data?.type === 'SKIP_WAITING') {
    console.log('Triggering skipWaiting() from message');
    self.skipWaiting();
  }
});

async function cleanupOldCacheEntries() {
  try {
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      if (cacheName.startsWith('expendx-cache-')) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        // Remove entries older than 7 days for dynamic content
        if (cacheName.includes('dynamic') || cacheName.includes('api')) {
          const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);

          for (const request of requests) {
            const response = await cache.match(request);
            const dateHeader = response?.headers.get('date');

            if (dateHeader && new Date(dateHeader).getTime() < cutoffTime) {
              await cache.delete(request);
            }
          }
        }
      }
    }

    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}
