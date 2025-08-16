import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';
import { useLocalStorage } from './useLocalStorage';

export interface Notification {
  id: string;
  type: 'appointment_created' | 'appointment_updated' | 'appointment_cancelled' | 'appointment_completed' | 'payment_received' | 'system_alert';
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  is_important: boolean;
  created_at: string;
  read_at?: string;
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  appointment_created: boolean;
  appointment_updated: boolean;
  appointment_cancelled: boolean;
  appointment_completed: boolean;
  payment_received: boolean;
  system_alerts: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

interface SoundSettings {
  enabled: boolean;
  volume: number;
  type: 'notification' | 'alert' | 'chime' | 'bell';
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  settings: NotificationSettings | null;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  playNotificationSound: () => Promise<void>;
  audioRef: React.RefObject<HTMLAudioElement>;
}

export const useNotifications = (tenantId?: string): UseNotificationsReturn => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  
  // Configurações de som
  const [soundSettings] = useLocalStorage<SoundSettings>('notification-sound-settings', {
    enabled: true,
    volume: 0.7,
    type: 'notification'
  });
  
  // Referência para o áudio
  const audioRef = useRef<HTMLAudioElement>(null);

  // Carregar notificações
  const loadNotifications = useCallback(async () => {
    if (!tenantId || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_tenant_notifications', {
        p_tenant_id: tenantId,
        p_limit: 50,
        p_offset: 0,
        p_unread_only: false
      });

      if (error) {
        console.error('Erro ao carregar notificações:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, user]);

  // Contar notificações não lidas
  const refreshUnreadCount = useCallback(async () => {
    if (!tenantId || !user) return;

    try {
      const { data, error } = await supabase.rpc('count_unread_notifications', {
        p_tenant_id: tenantId
      });

      if (error) {
        console.error('Erro ao contar notificações não lidas:', error);
        return;
      }

      setUnreadCount(data || 0);
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
    }
  }, [tenantId, user]);

  // Marcar notificação como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return;
      }

      // Atualizar estado local
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );

      // Atualizar contador
      await refreshUnreadCount();
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }, [user, refreshUnreadCount]);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    if (!tenantId || !user) return;

    try {
      const { data, error } = await supabase.rpc('mark_all_notifications_read', {
        p_tenant_id: tenantId
      });

      if (error) {
        console.error('Erro ao marcar todas como lidas:', error);
        return;
      }

      // Atualizar estado local
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      );

      setUnreadCount(0);
      
      toast({
        title: 'Notificações marcadas como lidas',
        description: `${data} notificações foram marcadas como lidas`,
      });
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  }, [tenantId, user]);

  // Carregar configurações
  const loadSettings = useCallback(async () => {
    if (!tenantId || !user) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar configurações:', error);
        return;
      }

      if (data) {
        setSettings(data);
      } else {
        // Criar configurações padrão
        const defaultSettings: NotificationSettings = {
          email_notifications: true,
          push_notifications: true,
          appointment_created: true,
          appointment_updated: true,
          appointment_cancelled: true,
          appointment_completed: true,
          payment_received: true,
          system_alerts: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00'
        };

        const { data: newSettings, error: createError } = await supabase
          .from('notification_settings')
          .insert({
            tenant_id: tenantId,
            ...defaultSettings
          })
          .select()
          .single();

        if (createError) {
          console.error('Erro ao criar configurações padrão:', createError);
          return;
        }

        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }, [tenantId, user]);

  // Função para tocar som de notificação
  const playNotificationSound = useCallback(() => {
    try {
      // Usar um som simples de beep
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.5);
    } catch (error) {
      console.error('Erro ao tocar som de notificação:', error);
    }
  }, []);

  // Atualizar configurações
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    if (!tenantId || !user || !settings) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .update({
          ...newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar configurações:', error);
        return;
      }

      setSettings(data);
      
      toast({
        title: 'Configurações atualizadas',
        description: 'Suas configurações de notificação foram salvas',
      });
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
    }
  }, [tenantId, user, settings]);

  // Carregar dados iniciais
  useEffect(() => {
    if (tenantId && user) {
      loadNotifications();
      refreshUnreadCount();
      loadSettings();
    }
  }, [tenantId, user, loadNotifications, refreshUnreadCount, loadSettings]);

  // Configurar real-time para novas notificações
  useEffect(() => {
    if (!tenantId || !user) return;

    const channel = supabase
      .channel(`notifications:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Adicionar nova notificação ao início da lista
          setNotifications(prev => [newNotification, ...prev]);
          
          // Incrementar contador de não lidas
          setUnreadCount(prev => prev + 1);
          
          // Tocar som de notificação
          playNotificationSound();
          
          // Mostrar toast para notificações importantes
          if (newNotification.is_important) {
            toast({
              title: newNotification.title,
              description: newNotification.message,
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          
          // Atualizar notificação na lista
          setNotifications(prev => 
            prev.map(notification => 
              notification.id === updatedNotification.id 
                ? updatedNotification 
                : notification
            )
          );
          
          // Atualizar contador se foi marcada como lida
          if (updatedNotification.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, user, playNotificationSound]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    loadNotifications,
    refreshUnreadCount,
    settings,
    updateSettings,
    playNotificationSound,
    audioRef
  };
};
