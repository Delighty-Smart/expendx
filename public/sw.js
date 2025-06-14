
// Enhanced Service Worker for ExpendX PWA with better offline-first support

const CACHE_NAME = 'expendx-cache-v3';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const STATIC_CACHE_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  // Add common assets
  '/assets/index.js',
  '/assets/index.css'
];

// Dynamic cache for API responses and images
const DYNAMIC_CACHE = 'expendx-dynamic-v3';

// Install the service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened static cache');
        return cache.addAll(STATIC_CACHE_FILES);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Enhanced request categorization
const isAuthRequest = (url) => {
  return url.includes('/auth/') || 
         url.includes('/token') || 
         url.includes('/supabase.co/auth/') || 
         url.includes('/supabase.co/rest/') ||
         url.includes('/.netlify/functions/') ||
         url.includes('/signup') ||
         url.includes('/signin');
};

const isApiRequest = (url) => {
  return url.includes('/api/') || 
         url.includes('supabase.co/rest/');
};

const isStaticAsset = (url) => {
  return url.includes('/assets/') ||
         url.includes('/icons/') ||
         url.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/);
};

// Enhanced fetch event with better caching strategies
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://') ||
      event.request.url.includes('extension')) {
    return;
  }

  const requestUrl = event.request.url;

  // Never cache auth requests - always go to network
  if (isAuthRequest(requestUrl)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(requestUrl)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseClone);
                  });
              }
              return response;
            });
        })
        .catch(() => {
          // Return offline fallback for critical assets
          if (requestUrl.includes('index.html') || requestUrl.endsWith('/')) {
            return caches.match(OFFLINE_URL);
          }
        })
    );
    return;
  }

  // Handle API requests with network-first strategy and dynamic caching
  if (isApiRequest(requestUrl)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Try to serve from cache when network fails
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('Serving API request from cache:', requestUrl);
                return cachedResponse;
              }
              throw new Error('No cached response available');
            });
        })
    );
    return;
  }

  // Default strategy for other requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match(OFFLINE_URL);
          });
      })
  );
});

// Enhanced background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(performBackgroundSync());
  }
});

// Background sync implementation
async function performBackgroundSync() {
  console.log('Service Worker: Starting background sync');
  
  try {
    // Notify all clients to trigger sync
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
      client.postMessage({ 
        type: 'SYNC_TRIGGERED',
        timestamp: Date.now()
      });
    });
    
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Enhanced push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const notificationOptions = {
      body: data.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'open',
          title: 'Open App'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
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
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

// Handle client messages for manual sync triggers
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FORCE_SYNC') {
    event.waitUntil(performBackgroundSync());
  }
});
