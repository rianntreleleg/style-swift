// Firebase Cloud Messaging Service Worker
// Este arquivo deve estar na raiz do public/ para funcionar corretamente

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD5vmKj4pIeKN__GVwzZT1d58C3HQJ2xlE",
    authDomain: "styleswift-94ff8.firebaseapp.com",
    projectId: "styleswift-94ff8",
    storageBucket: "styleswift-94ff8.firebasestorage.app",
    messagingSenderId: "32104028466",
    appId: "1:32104028466:web:8a3580328193df8bdf1f2b"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar Firebase Cloud Messaging
const messaging = firebase.messaging();

// Configurações de notificação padrão
const defaultNotificationOptions = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    requireInteraction: true,
    silent: false,
    tag: 'styleswift-notification',
    renotify: true,
    data: {
        timestamp: Date.now(),
        source: 'styleswift-pwa'
    }
};

// Receber mensagens em background (app fechado)
messaging.onBackgroundMessage((payload) => {
    console.log('FCM: Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'StyleSwift';
    const notificationOptions = {
        ...defaultNotificationOptions,
        body: payload.notification?.body || 'Nova notificação',
        icon: payload.notification?.icon || '/icons/icon-192x192.png',
        badge: payload.notification?.badge || '/icons/icon-72x72.png',
        data: {
            ...defaultNotificationOptions.data,
            ...payload.data,
            click_action: payload.notification?.click_action,
            notification_type: payload.data?.type || 'general'
        },
        actions: [
            {
                action: 'view',
                title: 'Ver Detalhes',
                icon: '/icons/calendar-shortcut.png'
            },
            {
                action: 'dismiss',
                title: 'Fechar',
                icon: '/icons/close.png'
            }
        ]
    };

    // Personalizar baseado no tipo de notificação
    switch (payload.data?.type) {
        case 'new_appointment':
            notificationOptions.icon = '/icons/calendar-shortcut.png';
            notificationOptions.badge = '/icons/calendar-shortcut.png';
            notificationOptions.vibrate = [200, 100, 200, 100, 200];
            break;
        case 'appointment_reminder':
            notificationOptions.icon = '/icons/clock.png';
            notificationOptions.badge = '/icons/clock.png';
            notificationOptions.vibrate = [100, 50, 100];
            break;
        case 'payment_received':
            notificationOptions.icon = '/icons/payment.png';
            notificationOptions.badge = '/icons/payment.png';
            notificationOptions.vibrate = [300, 100, 300];
            break;
        case 'system_alert':
            notificationOptions.icon = '/icons/alert.png';
            notificationOptions.badge = '/icons/alert.png';
            notificationOptions.vibrate = [500, 200, 500];
            break;
    }

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
    console.log('FCM: Notification clicked:', event);

    event.notification.close();

    const notificationData = event.notification.data;
    const action = event.action;

    let urlToOpen = '/admin';

    // Determinar URL baseada na ação ou tipo de notificação
    if (action === 'view' || action === 'explore') {
        switch (notificationData?.notification_type) {
            case 'new_appointment':
                urlToOpen = '/admin?tab=appointments&highlight=' + (notificationData.appointment_id || '');
                break;
            case 'appointment_reminder':
                urlToOpen = '/admin?tab=today&reminder=' + (notificationData.appointment_id || '');
                break;
            case 'payment_received':
                urlToOpen = '/admin?tab=financial&payment=' + (notificationData.payment_id || '');
                break;
            case 'system_alert':
                urlToOpen = '/admin?tab=system&alert=' + (notificationData.alert_id || '');
                break;
            default:
                urlToOpen = '/admin?tab=today';
        }
    } else if (action === 'dismiss' || action === 'close') {
        // Apenas fechar a notificação
        return;
    } else {
        // Clique padrão - abrir dashboard
        urlToOpen = '/admin';
    }

    // Abrir ou focar na janela
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Verificar se já existe uma janela aberta
            for (const client of clientList) {
                if (client.url.includes('/admin') && 'focus' in client) {
                    return client.focus().then(() => {
                        // Navegar para a URL específica se necessário
                        if (client.url !== urlToOpen) {
                            return client.navigate(urlToOpen);
                        }
                    });
                }
            }

            // Se não há janela aberta, abrir nova
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Fechar notificação
self.addEventListener('notificationclose', (event) => {
    console.log('FCM: Notification closed:', event);

    // Registrar evento de fechamento para analytics
    const notificationData = event.notification.data;

    // Aqui você pode enviar dados para analytics
    // sobre notificações fechadas sem interação
});

// Instalação do service worker
self.addEventListener('install', (event) => {
    console.log('FCM SW: Installing Firebase Messaging Service Worker');
    self.skipWaiting();
});

// Ativação do service worker
self.addEventListener('activate', (event) => {
    console.log('FCM SW: Activating Firebase Messaging Service Worker');
    event.waitUntil(self.clients.claim());
});

// Sincronização em background para notificações
self.addEventListener('sync', (event) => {
    console.log('FCM SW: Background sync triggered:', event.tag);

    if (event.tag === 'notification-sync') {
        event.waitUntil(syncNotifications());
    }
});

// Sincronizar notificações pendentes
async function syncNotifications() {
    try {
        console.log('FCM SW: Syncing notifications...');

        // Aqui você pode implementar lógica para sincronizar
        // notificações que falharam ou foram perdidas

        // Por exemplo, verificar se há notificações pendentes
        // no IndexedDB e reenviá-las

    } catch (error) {
        console.error('FCM SW: Error syncing notifications:', error);
    }
}

// Interceptar mensagens do cliente
self.addEventListener('message', (event) => {
    console.log('FCM SW: Received message from client:', event.data);

    if (event.data && event.data.type === 'GET_FCM_TOKEN') {
        // Retornar token FCM se disponível
        messaging.getToken().then((token) => {
            event.ports[0].postMessage({ type: 'FCM_TOKEN', token });
        }).catch((error) => {
            event.ports[0].postMessage({ type: 'FCM_TOKEN_ERROR', error: error.message });
        });
    }
});
