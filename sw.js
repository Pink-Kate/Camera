// Service Worker для обходу iOS Safari обмежень
const CACHE_NAME = 'camera-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  '/style.css',
  '/camera-icon.svg',
  '/manifest.json'
];

// Встановлення Service Worker
self.addEventListener('install', function(event) {
  console.log('🔧 SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('🔧 SW: Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// Активація Service Worker
self.addEventListener('activate', function(event) {
  console.log('🔧 SW: Activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🔧 SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Обробка запитів
self.addEventListener('fetch', function(event) {
  // Для запитів камери - завжди йдемо до мережі
  if (event.request.url.includes('getUserMedia') || 
      event.request.url.includes('mediaDevices')) {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Повертаємо кешовану версію або йдемо до мережі
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Спеціальна логіка для iOS Safari
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'IOS_CAMERA_PERMISSION') {
    console.log('🍎 SW: Отримано повідомлення про дозволи iOS камери');
    
    // Зберігаємо дозволи в IndexedDB через Service Worker
    event.waitUntil(
      saveIOSPermissionsToDB(event.data.permissions)
    );
  }
});

// Функція збереження дозволів в IndexedDB
async function saveIOSPermissionsToDB(permissions) {
  try {
    const request = indexedDB.open('CameraPermissions', 1);
    
    request.onupgradeneeded = function(e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('permissions')) {
        db.createObjectStore('permissions', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = function(e) {
      const db = e.target.result;
      const transaction = db.transaction(['permissions'], 'readwrite');
      const store = transaction.objectStore('permissions');
      
      store.put({
        id: 'ios_camera',
        granted: true,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        permissions: permissions
      });
      
      console.log('🍎 SW: Дозволи збережено в IndexedDB');
    };
  } catch (error) {
    console.log('🍎 SW: Помилка збереження в IndexedDB:', error);
  }
}
