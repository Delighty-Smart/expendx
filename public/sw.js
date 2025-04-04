
const CACHE_NAME = 'expendx-cache-v1';
const DYNAMIC_CACHE = 'expendx-dynamic-cache-v1';
const OFFLINE_URL = '/offline.html';

// Resources to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-512x512.png',
  '/favicon.ico',
];

// Install event - precache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE;
          })
          .map((cacheName) => {
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache, then offline page
self.addEventListener('fetch', (event) => {
  // Skip Supabase API requests - we'll handle them differently
  if (event.request.url.includes('supabase.co') && !event.request.url.includes('/storage/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't cache if not a success response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response since it can only be used once
        const responseToCache = response.clone();

        caches.open(DYNAMIC_CACHE)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // For HTML navigation, return the offline page
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Background sync for offline transaction sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  } else if (event.tag === 'sync-budgets') {
    event.waitUntil(syncBudgets());
  }
});

// Listen for push events for notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then((clientList) => {
        const url = event.notification.data.url;
        if (clientList.length > 0) {
          let client = clientList[0];
          client.navigate(url);
          client.focus();
        } else {
          clients.openWindow(url);
        }
      })
  );
});

// Function to sync transactions from IndexedDB
async function syncTransactions() {
  try {
    const db = await openDatabase();
    const transactions = await getOfflineTransactions(db);
    
    if (transactions.length === 0) {
      return;
    }
    
    for (const transaction of transactions) {
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + transaction.authToken
          },
          body: JSON.stringify(transaction.data)
        });
        
        if (response.ok) {
          await markTransactionSynced(db, transaction.id);
        }
      } catch (error) {
        console.error('Failed to sync transaction:', error);
      }
    }
    
    db.close();
  } catch (error) {
    console.error('Sync transactions failed:', error);
  }
}

// Function to sync budgets from IndexedDB
async function syncBudgets() {
  // Similar implementation to syncTransactions but for budgets
  console.log('Syncing budgets...');
}

// Helper functions for IndexedDB operations
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('expendxOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('offlineTransactions')) {
        const store = db.createObjectStore('offlineTransactions', { keyPath: 'id', autoIncrement: true });
        store.createIndex('synced', 'synced', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('offlineBudgets')) {
        db.createObjectStore('offlineBudgets', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getOfflineTransactions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('offlineTransactions', 'readonly');
    const store = transaction.objectStore('offlineTransactions');
    const index = store.index('synced');
    const request = index.getAll(0); // 0 means not synced
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

function markTransactionSynced(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('offlineTransactions', 'readwrite');
    const store = transaction.objectStore('offlineTransactions');
    const request = store.get(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const data = request.result;
      data.synced = 1;
      
      const updateRequest = store.put(data);
      updateRequest.onerror = () => reject(updateRequest.error);
      updateRequest.onsuccess = () => resolve();
    };
  });
}
