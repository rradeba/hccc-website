// Service Worker for caching and offline support
const CACHE_NAME = 'hccc-v1';
const STATIC_CACHE = 'hccc-static-v1';
const DYNAMIC_CACHE = 'hccc-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css',
  '/src/assets/hccc-blue-logo.PNG',
  '/src/assets/hccc-gate.png',
  '/src/assets/headshot.png',
  '/src/assets/after-1.jpeg',
  '/src/assets/after-2.jpeg',
  '/src/assets/before-1.jpeg',
  '/src/assets/before 2.jpeg'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Static files cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the response
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch((error) => {
            console.log('Fetch failed:', error);
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            throw error;
          });
      })
  );
});

// Background sync for form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'form-submission') {
    console.log('Background sync: form submission');
    event.waitUntil(
      // Handle offline form submissions here
      handleOfflineSubmissions()
    );
  }
});

// Handle offline form submissions
async function handleOfflineSubmissions() {
  try {
    // Get stored form data from IndexedDB
    const formData = await getStoredFormData();
    
    if (formData) {
      // Try to submit the form
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        // Remove from storage if successful
        await clearStoredFormData();
        console.log('Offline form submitted successfully');
      }
    }
  } catch (error) {
    console.log('Failed to submit offline form:', error);
  }
}

// IndexedDB helpers (simplified)
async function getStoredFormData() {
  // Implementation would use IndexedDB
  return null;
}

async function clearStoredFormData() {
  // Implementation would clear IndexedDB
}
