const CACHE_NAME = 'styleswift-v1.4.0';
const STATIC_CACHE = 'styleswift-static-v1.4.0';
const DYNAMIC_CACHE = 'styleswift-dynamic-v1.4.0';
const API_CACHE = 'styleswift-api-v1.4.0';

// Recursos estáticos essenciais
const STATIC_RESOURCES = [
  '/',
  '/auth',
  '/admin',
  '/subscription',
  '/agendamento',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/placeholder-image.svg',
  '/fallback-image.svg',
  '/default-logo.svg',
  '/default-avatar.svg'
];

// Ícones do PWA
const ICONS = [
  '/icons/icon-16x16.png',
  '/icons/icon-32x32.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-180x180.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Configurações de cache
const CACHE_CONFIG = {
  static: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    maxEntries: 100
  },
  dynamic: {
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    maxEntries: 50
  },
  api: {
    maxAge: 5 * 60 * 1000, // 5 minutos
    maxEntries: 30
  }
};

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('SW: Installing service worker');
  event.waitUntil(
    Promise.all([
      // Cache estático
      caches.open(STATIC_CACHE).then(cache => {
        console.log('SW: Static cache opened');
        return cache.addAll([...STATIC_RESOURCES, ...ICONS]);
      }),
      // Cache dinâmico
      caches.open(DYNAMIC_CACHE).then(cache => {
        console.log('SW: Dynamic cache opened');
        return cache;
      }),
      // Cache de API
      caches.open(API_CACHE).then(cache => {
        console.log('SW: API cache opened');
        return cache;
      })
    ])
    .then(() => {
      console.log('SW: Installation completed');
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('SW: Error during installation:', error);
    })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('SW: Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remover caches antigos
          if (![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(cacheName)) {
            console.log('SW: Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('SW: Activation completed');
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Estratégia baseada no tipo de requisição
  if (event.request.destination === 'document') {
    // Páginas HTML: Network First com fallback offline
    event.respondWith(networkFirstWithOffline(event.request));
  } else if (event.request.destination === 'image') {
    // Imagens: Cache First com lazy loading
    event.respondWith(cacheFirst(event.request, DYNAMIC_CACHE));
  } else if (event.request.url.includes('/icons/') || 
             event.request.url.includes('/favicon') ||
             STATIC_RESOURCES.includes(url.pathname)) {
    // Recursos estáticos: Cache First
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
  } else if (url.hostname.includes('supabase.co')) {
    // APIs Supabase: Stale While Revalidate
    event.respondWith(staleWhileRevalidate(event.request));
  } else {
    // Outros recursos: Network First
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
  }
});

// Estratégia Network First com fallback offline
async function networkFirstWithOffline(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Apenas cache requisições GET
    if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Network failed, trying cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback para página offline
    return caches.match('/offline.html');
  }
}

// Estratégia Network First
async function networkFirst(request, cacheName = DYNAMIC_CACHE) {
  try {
    const networkResponse = await fetch(request);
    
    // Apenas cache requisições GET
    if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Network failed, trying cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Estratégia Cache First
async function cacheFirst(request, cacheName = STATIC_CACHE) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Atualizar cache em background
    fetch(request).then(response => {
      if (response && response.status === 200) {
        caches.open(cacheName).then(cache => {
          cache.put(request, response.clone());
        });
      }
    }).catch(() => {
      // Ignorar erros em background updates
    });
    
    return cachedResponse;
  }
  
  // Se não está em cache, buscar da rede
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Failed to fetch and no cache for:', request.url);
    throw error;
  }
}

// Estratégia Stale While Revalidate (para APIs)
async function staleWhileRevalidate(request) {
  // Apenas processa requisições GET
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Retorna cache imediatamente se disponível
  const networkPromise = fetch(request).then(response => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    // Ignorar erros de rede
  });
  
  return cachedResponse || networkPromise;
}

// Limpeza automática de cache
async function cleanupCache() {
  const cacheNames = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const config = CACHE_CONFIG[cacheName.replace('styleswift-', '').replace('-v1.4.0', '')];
    
    if (keys.length > config.maxEntries) {
      // Remover entradas mais antigas
      const sortedKeys = keys.sort((a, b) => {
        return a.url.localeCompare(b.url);
      });
      
      const keysToDelete = sortedKeys.slice(0, keys.length - config.maxEntries);
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
  }
}

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'background-sync':
      event.waitUntil(doBackgroundSync());
      break;
    case 'cleanup-cache':
      event.waitUntil(cleanupCache());
      break;
    case 'update-appointments':
      event.waitUntil(syncAppointments());
      break;
    default:
      console.log('SW: Unknown sync tag:', event.tag);
  }
});

// Sincronização de dados em background
async function doBackgroundSync() {
  try {
    // Limpar cache antigo
    await cleanupCache();
    
    // Sincronizar dados pendentes
    await syncAppointments();
    
    console.log('SW: Background sync completed successfully');
  } catch (error) {
    console.error('SW: Background sync failed:', error);
  }
}

// Sincronizar agendamentos pendentes
async function syncAppointments() {
  // Implementar sincronização de agendamentos offline
  // quando o usuário voltar a ficar online
  console.log('SW: Syncing appointments...');
  
  // Aqui você pode implementar a lógica para sincronizar
  // agendamentos criados offline com o servidor
}

// Agendar limpeza de cache
setInterval(() => {
  self.registration.sync.register('cleanup-cache');
}, 24 * 60 * 60 * 1000); // A cada 24 horas

// Notificações push
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do StyleSwift',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Agendamentos',
        icon: '/icons/calendar-shortcut.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icons/close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('StyleSwift', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/admin?tab=today')
    );
  } else if (event.action === 'close') {
    // Apenas fechar a notificação
  } else {
    // Clique padrão - abrir o app
    event.waitUntil(
      clients.openWindow('/admin')
    );
  }
});
