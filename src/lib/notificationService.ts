import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, string>;
  priority?: 'normal' | 'high';
  ttl?: number;
}

export interface BulkNotificationData {
  tenant_id: string;
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    click_action?: string;
  };
  data?: Record<string, string>;
  priority?: 'normal' | 'high';
  ttl?: number;
  user_ids?: string[];
  notification_type?: string;
}

class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Enviar notificação para um token específico
   */
  async sendToToken(token: string, notification: NotificationData): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          token,
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon,
            badge: notification.badge
          },
          data: notification.data,
          priority: notification.priority || 'high',
          ttl: notification.ttl || 2419200
        }
      });

      if (error) {
        console.error('Erro ao enviar notificação:', error);
        return false;
      }

      return data?.success || false;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }
  }

  /**
   * Enviar notificação em massa para um tenant
   */
  async sendBulkNotification(bulkData: BulkNotificationData): Promise<{
    success: boolean;
    sent_count: number;
    failed_count: number;
    total_count: number;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-notifications', {
        body: bulkData
      });

      if (error) {
        console.error('Erro ao enviar notificação em massa:', error);
        return {
          success: false,
          sent_count: 0,
          failed_count: 0,
          total_count: 0
        };
      }

      return {
        success: data?.success || false,
        sent_count: data?.sent_count || 0,
        failed_count: data?.failed_count || 0,
        total_count: data?.total_count || 0
      };
    } catch (error) {
      console.error('Erro ao enviar notificação em massa:', error);
      return {
        success: false,
        sent_count: 0,
        failed_count: 0,
        total_count: 0
      };
    }
  }

  /**
   * Notificar novo agendamento
   */
  async notifyNewAppointment(tenantId: string, appointmentData: {
    id: string;
    customer_name: string;
    service_name: string;
    appointment_date: string;
    professional_name?: string;
  }): Promise<void> {
    const notificationData: BulkNotificationData = {
      tenant_id: tenantId,
      notification: {
        title: `Novo agendamento: ${appointmentData.customer_name}`,
        body: `Cliente ${appointmentData.customer_name} agendou ${appointmentData.service_name} para ${appointmentData.appointment_date}`,
        icon: '/icons/calendar-shortcut.png',
        badge: '/icons/calendar-shortcut.png',
        click_action: `/admin?tab=appointments&highlight=${appointmentData.id}`
      },
      data: {
        type: 'new_appointment',
        appointment_id: appointmentData.id,
        customer_name: appointmentData.customer_name,
        service_name: appointmentData.service_name,
        appointment_date: appointmentData.appointment_date,
        professional_name: appointmentData.professional_name || '',
        timestamp: Date.now().toString()
      },
      notification_type: 'new_appointment',
      priority: 'high'
    };

    await this.sendBulkNotification(notificationData);
  }

  /**
   * Notificar lembretes de agendamento
   */
  async notifyAppointmentReminder(tenantId: string, appointmentData: {
    id: string;
    customer_name: string;
    service_name: string;
    appointment_time: string;
    professional_name?: string;
  }): Promise<void> {
    const notificationData: BulkNotificationData = {
      tenant_id: tenantId,
      notification: {
        title: `Lembrete: ${appointmentData.service_name}`,
        body: `Você tem um agendamento com ${appointmentData.customer_name} em ${appointmentData.appointment_time}`,
        icon: '/icons/clock.png',
        badge: '/icons/clock.png',
        click_action: `/admin?tab=today&reminder=${appointmentData.id}`
      },
      data: {
        type: 'appointment_reminder',
        appointment_id: appointmentData.id,
        customer_name: appointmentData.customer_name,
        service_name: appointmentData.service_name,
        appointment_time: appointmentData.appointment_time,
        professional_name: appointmentData.professional_name || '',
        timestamp: Date.now().toString()
      },
      notification_type: 'appointment_reminder',
      priority: 'high'
    };

    await this.sendBulkNotification(notificationData);
  }

  /**
   * Notificar pagamento recebido
   */
  async notifyPaymentReceived(tenantId: string, paymentData: {
    id: string;
    amount: string;
    service_name: string;
    customer_name: string;
    payment_method?: string;
  }): Promise<void> {
    const notificationData: BulkNotificationData = {
      tenant_id: tenantId,
      notification: {
        title: `Pagamento recebido: ${paymentData.amount}`,
        body: `Pagamento de ${paymentData.amount} recebido para ${paymentData.service_name}`,
        icon: '/icons/payment.png',
        badge: '/icons/payment.png',
        click_action: `/admin?tab=financial&payment=${paymentData.id}`
      },
      data: {
        type: 'payment_received',
        payment_id: paymentData.id,
        amount: paymentData.amount,
        service_name: paymentData.service_name,
        customer_name: paymentData.customer_name,
        payment_method: paymentData.payment_method || '',
        timestamp: Date.now().toString()
      },
      notification_type: 'payment_received',
      priority: 'normal'
    };

    await this.sendBulkNotification(notificationData);
  }

  /**
   * Notificar alerta do sistema
   */
  async notifySystemAlert(tenantId: string, alertData: {
    id: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    category?: string;
  }): Promise<void> {
    const notificationData: BulkNotificationData = {
      tenant_id: tenantId,
      notification: {
        title: `Alerta: ${alertData.title}`,
        body: alertData.message,
        icon: '/icons/alert.png',
        badge: '/icons/alert.png',
        click_action: `/admin?tab=system&alert=${alertData.id}`
      },
      data: {
        type: 'system_alert',
        alert_id: alertData.id,
        alert_title: alertData.title,
        alert_message: alertData.message,
        severity: alertData.severity,
        category: alertData.category || '',
        timestamp: Date.now().toString()
      },
      notification_type: 'system_alert',
      priority: alertData.severity === 'error' ? 'high' : 'normal'
    };

    await this.sendBulkNotification(notificationData);
  }

  /**
   * Notificar cancelamento de agendamento
   */
  async notifyAppointmentCancelled(tenantId: string, appointmentData: {
    id: string;
    customer_name: string;
    service_name: string;
    appointment_date: string;
    reason?: string;
  }): Promise<void> {
    const notificationData: BulkNotificationData = {
      tenant_id: tenantId,
      notification: {
        title: `Agendamento cancelado: ${appointmentData.customer_name}`,
        body: `Agendamento de ${appointmentData.service_name} para ${appointmentData.appointment_date} foi cancelado`,
        icon: '/icons/alert.png',
        badge: '/icons/alert.png',
        click_action: `/admin?tab=appointments&highlight=${appointmentData.id}`
      },
      data: {
        type: 'appointment_cancelled',
        appointment_id: appointmentData.id,
        customer_name: appointmentData.customer_name,
        service_name: appointmentData.service_name,
        appointment_date: appointmentData.appointment_date,
        reason: appointmentData.reason || '',
        timestamp: Date.now().toString()
      },
      notification_type: 'appointment_cancelled',
      priority: 'high'
    };

    await this.sendBulkNotification(notificationData);
  }

  /**
   * Notificar mudança de status de agendamento
   */
  async notifyAppointmentStatusChange(tenantId: string, appointmentData: {
    id: string;
    customer_name: string;
    service_name: string;
    old_status: string;
    new_status: string;
    appointment_date: string;
  }): Promise<void> {
    const statusMessages = {
      'confirmado': 'foi confirmado',
      'concluido': 'foi concluído',
      'cancelado': 'foi cancelado',
      'reagendado': 'foi reagendado',
      'pendente': 'está pendente'
    };

    const message = statusMessages[new_status as keyof typeof statusMessages] || 'teve status alterado';

    const notificationData: BulkNotificationData = {
      tenant_id: tenantId,
      notification: {
        title: `Status alterado: ${appointmentData.customer_name}`,
        body: `Agendamento de ${appointmentData.service_name} ${message}`,
        icon: '/icons/calendar-shortcut.png',
        badge: '/icons/calendar-shortcut.png',
        click_action: `/admin?tab=appointments&highlight=${appointmentData.id}`
      },
      data: {
        type: 'appointment_status_change',
        appointment_id: appointmentData.id,
        customer_name: appointmentData.customer_name,
        service_name: appointmentData.service_name,
        old_status: appointmentData.old_status,
        new_status: appointmentData.new_status,
        appointment_date: appointmentData.appointment_date,
        timestamp: Date.now().toString()
      },
      notification_type: 'appointment_status_change',
      priority: 'normal'
    };

    await this.sendBulkNotification(notificationData);
  }

  /**
   * Notificar baixo estoque (se aplicável)
   */
  async notifyLowStock(tenantId: string, stockData: {
    id: string;
    product_name: string;
    current_stock: number;
    min_stock: number;
  }): Promise<void> {
    const notificationData: BulkNotificationData = {
      tenant_id: tenantId,
      notification: {
        title: `Estoque baixo: ${stockData.product_name}`,
        body: `Produto ${stockData.product_name} está com estoque baixo (${stockData.current_stock}/${stockData.min_stock})`,
        icon: '/icons/alert.png',
        badge: '/icons/alert.png',
        click_action: `/admin?tab=inventory&highlight=${stockData.id}`
      },
      data: {
        type: 'low_stock',
        product_id: stockData.id,
        product_name: stockData.product_name,
        current_stock: stockData.current_stock.toString(),
        min_stock: stockData.min_stock.toString(),
        timestamp: Date.now().toString()
      },
      notification_type: 'low_stock',
      priority: 'high'
    };

    await this.sendBulkNotification(notificationData);
  }

  /**
   * Notificar backup automático
   */
  async notifyBackupCompleted(tenantId: string, backupData: {
    id: string;
    size: string;
    duration: string;
    success: boolean;
  }): Promise<void> {
    const notificationData: BulkNotificationData = {
      tenant_id: tenantId,
      notification: {
        title: backupData.success ? 'Backup concluído' : 'Backup falhou',
        body: backupData.success 
          ? `Backup realizado com sucesso (${backupData.size}) em ${backupData.duration}`
          : 'Falha ao realizar backup automático',
        icon: backupData.success ? '/icons/check.png' : '/icons/alert.png',
        badge: backupData.success ? '/icons/check.png' : '/icons/alert.png',
        click_action: `/admin?tab=system&backup=${backupData.id}`
      },
      data: {
        type: 'backup_completed',
        backup_id: backupData.id,
        size: backupData.size,
        duration: backupData.duration,
        success: backupData.success.toString(),
        timestamp: Date.now().toString()
      },
      notification_type: 'backup_completed',
      priority: backupData.success ? 'normal' : 'high'
    };

    await this.sendBulkNotification(notificationData);
  }

  /**
   * Verificar se o usuário tem notificações habilitadas
   */
  async checkUserNotificationSettings(userId: string, tenantId: string, notificationType: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !data) {
        return true; // Default para true se não encontrar configuração
      }

      switch (notificationType) {
        case 'new_appointment':
          return data.new_appointments;
        case 'appointment_reminder':
          return data.appointment_reminders;
        case 'payment_received':
          return data.payment_notifications;
        case 'system_alert':
          return data.system_alerts;
        case 'marketing':
          return data.marketing_notifications;
        default:
          return true;
      }
    } catch (error) {
      console.error('Erro ao verificar configurações de notificação:', error);
      return true; // Default para true em caso de erro
    }
  }

  /**
   * Verificar horário silencioso
   */
  async checkQuietHours(userId: string, tenantId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('quiet_hours_start, quiet_hours_end, timezone')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !data) {
        return false; // Default para false se não encontrar configuração
      }

      const now = new Date();
      const userTimezone = data.timezone || 'America/Sao_Paulo';
      
      // Converter para timezone do usuário
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
      const currentHour = userTime.getHours();
      const currentMinute = userTime.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      // Converter horários de início e fim
      const [startHour, startMinute] = data.quiet_hours_start.split(':').map(Number);
      const [endHour, endMinute] = data.quiet_hours_end.split(':').map(Number);
      
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      // Verificar se está no horário silencioso
      if (startTime <= endTime) {
        // Horário silencioso no mesmo dia (ex: 22:00 - 08:00)
        return currentTime >= startTime && currentTime <= endTime;
      } else {
        // Horário silencioso atravessa a meia-noite (ex: 22:00 - 08:00)
        return currentTime >= startTime || currentTime <= endTime;
      }
    } catch (error) {
      console.error('Erro ao verificar horário silencioso:', error);
      return false; // Default para false em caso de erro
    }
  }
}

// Exportar instância singleton
export const notificationService = NotificationService.getInstance();
