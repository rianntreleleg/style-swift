import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PushNotificationState {
  isSupported: boolean;
  isEnabled: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  fcmToken: string | null;
}

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export const usePushNotifications = (tenantId?: string) => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isEnabled: false,
    isSubscribed: false,
    isLoading: true,
    error: null,
    fcmToken: null
  });

  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: false
  });

  const messagingRef = useRef<any>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Verificar se o navegador suporta push notifications
  const checkSupport = useCallback(() => {
    const isSupported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window &&
                       'firebase' in window;

    setState(prev => ({ ...prev, isSupported }));
    return isSupported;
  }, []);

  // Verificar permissão de notificação
  const checkPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setPermission({ granted: false, denied: false, default: false });
      return false;
    }

    const permission = await Notification.requestPermission();
    const isGranted = permission === 'granted';
    const isDenied = permission === 'denied';
    const isDefault = permission === 'default';

    setPermission({ granted: isGranted, denied: isDenied, default: isDefault });
    setState(prev => ({ ...prev, isEnabled: isGranted }));

    return isGranted;
  }, []);

  // Inicializar Firebase Messaging
  const initializeFirebase = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !('firebase' in window)) {
        throw new Error('Firebase não está disponível');
      }

      // Importar Firebase dinamicamente
      const { initializeApp } = await import('firebase/app');
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };

      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);
      messagingRef.current = messaging;

      // Registrar service worker para FCM
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      registrationRef.current = registration;

      console.log('FCM: Service Worker registrado com sucesso');

      return messaging;
    } catch (error) {
      console.error('FCM: Erro ao inicializar Firebase:', error);
      throw error;
    }
  }, []);

  // Obter token FCM
  const getFCMToken = useCallback(async () => {
    try {
      if (!messagingRef.current) {
        await initializeFirebase();
      }

      const messaging = messagingRef.current;
      if (!messaging) {
        throw new Error('Firebase Messaging não inicializado');
      }

      const { getToken } = await import('firebase/messaging');
      
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });

      if (token) {
        console.log('FCM: Token obtido:', token);
        setState(prev => ({ ...prev, fcmToken: token }));
        return token;
      } else {
        throw new Error('Não foi possível obter o token FCM');
      }
    } catch (error) {
      console.error('FCM: Erro ao obter token:', error);
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Erro desconhecido' }));
      throw error;
    }
  }, [initializeFirebase]);

  // Salvar token no Supabase
  const saveTokenToDatabase = useCallback(async (token: string) => {
    if (!tenantId) {
      console.warn('FCM: Tenant ID não fornecido para salvar token');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Salvar token na tabela de tokens FCM
      const { error } = await supabase
        .from('fcm_tokens')
        .upsert({
          user_id: user.id,
          tenant_id: tenantId,
          token: token,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          last_used: new Date().toISOString(),
          is_active: true
        }, {
          onConflict: 'user_id,tenant_id'
        });

      if (error) {
        throw error;
      }

      console.log('FCM: Token salvo no banco de dados');
      setState(prev => ({ ...prev, isSubscribed: true }));
    } catch (error) {
      console.error('FCM: Erro ao salvar token:', error);
      throw error;
    }
  }, [tenantId]);

  // Solicitar permissão e configurar notificações
  const requestPermission = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Verificar suporte
      if (!checkSupport()) {
        throw new Error('Push notifications não são suportadas neste navegador');
      }

      // Verificar permissão
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        throw new Error('Permissão de notificação negada');
      }

      // Obter token FCM
      const token = await getFCMToken();
      if (!token) {
        throw new Error('Não foi possível obter token FCM');
      }

      // Salvar token no banco
      await saveTokenToDatabase(token);

      // Configurar listener para mensagens em foreground
      if (messagingRef.current) {
        const { onMessage } = await import('firebase/messaging');
        onMessage(messagingRef.current, (payload) => {
          console.log('FCM: Mensagem recebida em foreground:', payload);
          showLocalNotification(payload);
        });
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isEnabled: true, 
        isSubscribed: true 
      }));

      return true;
    } catch (error) {
      console.error('FCM: Erro ao configurar notificações:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }));
      return false;
    }
  }, [checkSupport, checkPermission, getFCMToken, saveTokenToDatabase]);

  // Mostrar notificação local (quando app está aberto)
  const showLocalNotification = useCallback((payload: any) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const notificationData: NotificationData = {
      title: payload.notification?.title || 'StyleSwift',
      body: payload.notification?.body || 'Nova notificação',
      icon: payload.notification?.icon || '/icons/icon-192x192.png',
      badge: payload.notification?.badge || '/icons/icon-72x72.png',
      data: {
        ...payload.data,
        timestamp: Date.now(),
        source: 'styleswift-pwa'
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

    const notification = new Notification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      actions: notificationData.actions,
      requireInteraction: true,
      silent: false,
      tag: 'styleswift-notification',
      renotify: true
    });

    // Configurar handlers de clique
    notification.onclick = (event) => {
      event.preventDefault();
      notification.close();
      
      // Determinar URL baseada no tipo de notificação
      let urlToOpen = '/admin';
      switch (payload.data?.type) {
        case 'new_appointment':
          urlToOpen = '/admin?tab=appointments&highlight=' + (payload.data.appointment_id || '');
          break;
        case 'appointment_reminder':
          urlToOpen = '/admin?tab=today&reminder=' + (payload.data.appointment_id || '');
          break;
        case 'payment_received':
          urlToOpen = '/admin?tab=financial&payment=' + (payload.data.payment_id || '');
          break;
        case 'system_alert':
          urlToOpen = '/admin?tab=system&alert=' + (payload.data.alert_id || '');
          break;
      }

      // Abrir ou focar na janela
      window.focus();
      window.location.href = urlToOpen;
    };

    return notification;
  }, []);

  // Cancelar inscrição
  const unsubscribe = useCallback(async () => {
    try {
      if (!tenantId || !state.fcmToken) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      // Remover token do banco
      const { error } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .eq('token', state.fcmToken);

      if (error) {
        console.error('FCM: Erro ao remover token:', error);
      }

      setState(prev => ({ 
        ...prev, 
        isSubscribed: false, 
        fcmToken: null 
      }));

      console.log('FCM: Inscrição cancelada');
    } catch (error) {
      console.error('FCM: Erro ao cancelar inscrição:', error);
    }
  }, [tenantId, state.fcmToken]);

  // Enviar notificação de teste
  const sendTestNotification = useCallback(async () => {
    try {
      if (!state.fcmToken) {
        throw new Error('Token FCM não disponível');
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          token: state.fcmToken,
          notification: {
            title: 'Teste de Notificação',
            body: 'Esta é uma notificação de teste do StyleSwift!',
            icon: '/icons/icon-192x192.png'
          },
          data: {
            type: 'test',
            timestamp: Date.now().toString()
          }
        }
      });

      if (error) {
        throw error;
      }

      console.log('FCM: Notificação de teste enviada');
      return data;
    } catch (error) {
      console.error('FCM: Erro ao enviar notificação de teste:', error);
      throw error;
    }
  }, [state.fcmToken]);

  // Inicializar na montagem do componente
  useEffect(() => {
    const initialize = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));

        // Verificar suporte
        if (!checkSupport()) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Verificar permissão atual
        await checkPermission();

        // Se já tem permissão, tentar obter token
        if (permission.granted) {
          try {
            const token = await getFCMToken();
            if (token && tenantId) {
              await saveTokenToDatabase(token);
            }
          } catch (error) {
            console.warn('FCM: Não foi possível obter token inicial:', error);
          }
        }

        setState(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        console.error('FCM: Erro na inicialização:', error);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        }));
      }
    };

    initialize();
  }, [checkSupport, checkPermission, getFCMToken, saveTokenToDatabase, permission.granted, tenantId]);

  return {
    // Estado
    ...state,
    permission,
    
    // Ações
    requestPermission,
    unsubscribe,
    sendTestNotification,
    showLocalNotification,
    
    // Utilitários
    checkSupport,
    checkPermission
  };
};
