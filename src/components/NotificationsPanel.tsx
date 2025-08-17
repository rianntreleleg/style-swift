import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  BellOff, 
  Check, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  User, 
  Settings,
  Trash2,
  RefreshCw,
  CheckCheck,
  Volume2
} from 'lucide-react';
import { useNotifications, type Notification, type NotificationSettings } from '@/hooks/useNotifications';
import { useSoundSettings } from '@/hooks/useSoundSettings';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/Skeleton';

interface NotificationsPanelProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'appointment_created':
      return <Calendar className="h-4 w-4 text-green-500" />;
    case 'appointment_updated':
      return <RefreshCw className="h-4 w-4 text-blue-500" />;
    case 'appointment_cancelled':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'appointment_completed':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'payment_received':
      return <User className="h-4 w-4 text-purple-500" />;
    case 'system_alert':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'appointment_created':
      return 'border-l-green-500 bg-green-50 dark:bg-green-950/20';
    case 'appointment_updated':
      return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
    case 'appointment_cancelled':
      return 'border-l-red-500 bg-red-50 dark:bg-red-950/20';
    case 'appointment_completed':
      return 'border-l-green-500 bg-green-50 dark:bg-green-950/20';
    case 'payment_received':
      return 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/20';
    case 'system_alert':
      return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20';
    default:
      return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
  }
};

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  tenantId,
  isOpen,
  onClose
}) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    settings,
    updateSettings
  } = useNotifications(tenantId);
  
  const { settings: soundSettings, updateSettings: updateSoundSettings, playSound } = useSoundSettings();

  const [activeTab, setActiveTab] = useState('all');

  // Fechar painel ao pressionar Escape
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevenir scroll do body quando o painel está aberto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread') return !notification.is_read;
    if (activeTab === 'important') return notification.is_important;
    return true;
  });

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleSettingChange = async (key: keyof NotificationSettings, value: boolean) => {
    await updateSettings({ [key]: value });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Fechar apenas se clicar diretamente no backdrop
    if (e.target === e.currentTarget) {
      onClose();
    }
  };



  if (!isOpen) return null;

  // Renderizar o painel em um portal para garantir que fique sobre outros elementos
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] overflow-hidden"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="absolute inset-y-0 right-0 w-full max-w-md bg-background border-l shadow-2xl"
      >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Notificações</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Marcar todas
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-4 pt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="unread">
                  Não lidas
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="important">Importantes</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="flex-1 mt-4 overflow-hidden">
              <NotificationList
                notifications={filteredNotifications}
                isLoading={isLoading}
                onMarkAsRead={handleMarkAsRead}
              />
            </TabsContent>

            <TabsContent value="unread" className="flex-1 mt-4 overflow-hidden">
              <NotificationList
                notifications={filteredNotifications.filter(n => !n.is_read)}
                isLoading={isLoading}
                onMarkAsRead={handleMarkAsRead}
              />
            </TabsContent>

            <TabsContent value="important" className="flex-1 mt-4 overflow-hidden">
              <NotificationList
                notifications={filteredNotifications.filter(n => n.is_important)}
                isLoading={isLoading}
                onMarkAsRead={handleMarkAsRead}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Settings */}
        <div className="border-t p-4 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-left !flex !items-center"
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Configurações</span>
          </Button>
          

        </div>
      </div>

      {/* Settings Panel */}
      {activeTab === 'settings' && (
        <div className="absolute inset-0 bg-background z-[70]">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">Configurações</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('all')}>
              Voltar
            </Button>
          </div>
          
          <ScrollArea className="h-full p-4">
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Tipos de Notificação</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="appointment_created" className="flex-1 text-sm leading-tight">Novos agendamentos</Label>
                    <Switch
                      id="appointment_created"
                      checked={settings?.appointment_created ?? true}
                      onCheckedChange={(checked) => 
                        handleSettingChange('appointment_created', checked)
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="appointment_updated" className="flex-1 text-sm leading-tight">Agendamentos atualizados</Label>
                    <Switch
                      id="appointment_updated"
                      checked={settings?.appointment_updated ?? true}
                      onCheckedChange={(checked) => 
                        handleSettingChange('appointment_updated', checked)
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="appointment_cancelled" className="flex-1 text-sm leading-tight">Agendamentos cancelados</Label>
                    <Switch
                      id="appointment_cancelled"
                      checked={settings?.appointment_cancelled ?? true}
                      onCheckedChange={(checked) => 
                        handleSettingChange('appointment_cancelled', checked)
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="appointment_completed" className="flex-1 text-sm leading-tight">Agendamentos concluídos</Label>
                    <Switch
                      id="appointment_completed"
                      checked={settings?.appointment_completed ?? true}
                      onCheckedChange={(checked) => 
                        handleSettingChange('appointment_completed', checked)
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="payment_received" className="flex-1 text-sm leading-tight">Pagamentos recebidos</Label>
                    <Switch
                      id="payment_received"
                      checked={settings?.payment_received ?? true}
                      onCheckedChange={(checked) => 
                        handleSettingChange('payment_received', checked)
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="system_alerts" className="flex-1 text-sm leading-tight">Alertas do sistema</Label>
                    <Switch
                      id="system_alerts"
                      checked={settings?.system_alerts ?? true}
                      onCheckedChange={(checked) => 
                        handleSettingChange('system_alerts', checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Canais de Notificação</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="push_notifications" className="flex-1 text-sm leading-tight">Notificações push</Label>
                    <Switch
                      id="push_notifications"
                      checked={settings?.push_notifications ?? true}
                      onCheckedChange={(checked) => 
                        handleSettingChange('push_notifications', checked)
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="email_notifications" className="flex-1 text-sm leading-tight">Notificações por email</Label>
                    <Switch
                      id="email_notifications"
                      checked={settings?.email_notifications ?? true}
                      onCheckedChange={(checked) => 
                        handleSettingChange('email_notifications', checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Configurações de Som</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="sound_enabled" className="flex-1 text-sm leading-tight">Som de Notificação</Label>
                    <Switch
                      id="sound_enabled"
                      checked={soundSettings.enabled}
                      onCheckedChange={(checked) => 
                        updateSoundSettings({ enabled: checked })
                      }
                    />
                  </div>
                  
                  {soundSettings.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm leading-tight">Volume</Label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(soundSettings.volume * 100)}
                          onChange={(e) => 
                            updateSoundSettings({ volume: parseInt(e.target.value) / 100 })
                          }
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0%</span>
                          <span>{Math.round(soundSettings.volume * 100)}%</span>
                          <span>100%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm leading-tight">Tipo de Som</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={soundSettings.type === 'notification' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateSoundSettings({ type: 'notification' })}
                            className="text-xs capitalize"
                          >
                            Notificação
                          </Button>
                          <Button
                            variant={soundSettings.type === 'alert' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateSoundSettings({ type: 'alert' })}
                            className="text-xs capitalize"
                          >
                            Alerta
                          </Button>
                          <Button
                            variant={soundSettings.type === 'chime' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateSoundSettings({ type: 'chime' })}
                            className="text-xs capitalize"
                          >
                            Chime
                          </Button>
                          <Button
                            variant={soundSettings.type === 'bell' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateSoundSettings({ type: 'bell' })}
                            className="text-xs capitalize"
                          >
                            Sino
                          </Button>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={playSound}
                          className="w-full flex items-center gap-2"
                        >
                          <Volume2 className="h-4 w-4" />
                          Testar Som
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </motion.div>
    </motion.div>
  );
};

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (notificationId: string) => Promise<void>;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  isLoading,
  onMarkAsRead
}) => {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">
          Nenhuma notificação
        </h3>
        <p className="text-sm text-muted-foreground">
          Você está em dia com suas notificações
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full px-4 pb-4">
      <div className="space-y-2 pt-4">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-3 rounded-lg border border-l-4 ${getNotificationColor(notification.type)} ${
                !notification.is_read ? 'ring-2 ring-primary/20' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium leading-tight">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </span>
                        {notification.is_important && (
                          <Badge variant="destructive" className="text-xs">
                            Importante
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMarkAsRead(notification.id)}
                        className="flex-shrink-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
};
