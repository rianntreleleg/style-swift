const CACHE_NAME = 'styleswift-v1.3.0';
const urlsToCache = [
  '/',
  '/auth',
  '/admin',
  '/subscription',
  '/agendamento',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
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

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('SW: Installing service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Cache opened');
        // Adicionar recursos essenciais primeiro
        const essentialResources = [
          '/',
          '/offline.html',
          '/manifest.json',
          '/favicon.svg'
        ];
        
        return cache.addAll(essentialResources)
          .then(() => {
            // Tentar adicionar outros recursos sem falhar se algum não existir
            return Promise.allSettled(
              urlsToCache.filter(url => !essentialResources.includes(url))
                .map(url => cache.add(url).catch(err => console.warn(`SW: Failed to cache ${url}:`, err)))
            );
          });
      })
      .then(() => {
        console.log('SW: Installation completed');
        // Força a ativação imediata
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
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('SW: Activation completed');
      // Toma controle imediato de todas as páginas
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Não cachear requisições para APIs externas
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('stripe.com') ||
      url.hostname.includes('googleapis.com')) {
    return;
  }

  // Estratégia diferente baseada no tipo de requisição
  if (event.request.destination === 'document') {
    // Para documentos HTML: Network First
    event.respondWith(networkFirst(event.request));
  } else if (event.request.destination === 'image' || 
             event.request.url.includes('/icons/') ||
             event.request.url.includes('/favicon')) {
    // Para imagens e ícones: Cache First
    event.respondWith(cacheFirst(event.request));
  } else {
    // Para outros recursos: Network First com fallback
    event.respondWith(networkFirst(event.request));
  }
});

// Estratégia Network First
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      // Cachear apenas respostas válidas
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Network failed, trying cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Se é um documento e não tem cache, mostrar página offline
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Estratégia Cache First
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Atualizar cache em background se possível
    fetch(request).then(response => {
      if (response && response.status === 200) {
        caches.open(CACHE_NAME).then(cache => {
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
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Failed to fetch and no cache for:', request.url);
    throw error;
  }
}

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Implementar sincronização de dados quando necessário
  console.log('Sincronização em background executada');
}

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
