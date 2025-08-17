import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellOff, 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Smartphone,
  Wifi,
  WifiOff,
  Clock,
  Zap
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PushNotificationManagerProps {
  tenantId: string;
  className?: string;
}

export default function PushNotificationManager({ tenantId, className }: PushNotificationManagerProps) {
  const {
    isSupported,
    isEnabled,
    isSubscribed,
    isLoading,
    error,
    fcmToken,
    permission,
    requestPermission,
    unsubscribe,
    sendTestNotification,
    checkSupport,
    checkPermission
  } = usePushNotifications(tenantId);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [settings, setSettings] = useState({
    newAppointments: true,
    appointmentReminders: true,
    paymentNotifications: true,
    systemAlerts: true,
    marketingNotifications: false,
    quietHours: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00'
  });

  // Verificar suporte na montagem
  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  // Enviar notificação de teste
  const handleTestNotification = async () => {
    try {
      setTestResult(null);
      await sendTestNotification();
      setTestResult({
        success: true,
        message: 'Notificação de teste enviada com sucesso!'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao enviar notificação de teste'
      });
    }
  };

  // Solicitar permissão
  const handleRequestPermission = async () => {
    try {
      const success = await requestPermission();
      if (success) {
        setTestResult({
          success: true,
          message: 'Permissão concedida! Notificações ativadas.'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao solicitar permissão'
      });
    }
  };

  // Cancelar inscrição
  const handleUnsubscribe = async () => {
    try {
      await unsubscribe();
      setTestResult({
        success: true,
        message: 'Inscrição cancelada com sucesso.'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao cancelar inscrição'
      });
    }
  };

  // Verificar status do navegador
  const getBrowserStatus = () => {
    if (!isSupported) {
      return {
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        text: 'Não suportado',
        color: 'text-red-500',
        description: 'Seu navegador não suporta push notifications'
      };
    }

    if (permission.denied) {
      return {
        icon: <BellOff className="h-4 w-4 text-orange-500" />,
        text: 'Bloqueado',
        color: 'text-orange-500',
        description: 'Permissão negada pelo usuário'
      };
    }

    if (permission.granted && isSubscribed) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        text: 'Ativo',
        color: 'text-green-500',
        description: 'Notificações ativas e funcionando'
      };
    }

    if (permission.granted && !isSubscribed) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
        text: 'Pendente',
        color: 'text-yellow-500',
        description: 'Permissão concedida, mas não inscrito'
      };
    }

    return {
      icon: <Clock className="h-4 w-4 text-gray-500" />,
      text: 'Não configurado',
      color: 'text-gray-500',
      description: 'Aguardando configuração'
    };
  };

  const browserStatus = getBrowserStatus();

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
            <Badge variant={isSubscribed ? "default" : "secondary"} className="ml-auto">
              {browserStatus.text}
            </Badge>
          </CardTitle>
          <CardDescription>
            Configure notificações push para receber alertas em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status do Sistema */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {browserStatus.icon}
                <div>
                  <p className={`font-medium ${browserStatus.color}`}>
                    Status do Sistema
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {browserStatus.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Informações técnicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span>Suporte: {isSupported ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-muted-foreground" />
                <span>Permissão: {permission.granted ? 'Concedida' : permission.denied ? 'Negada' : 'Não solicitada'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span>Inscrito: {isSubscribed ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span>Token: {fcmToken ? 'Configurado' : 'Não configurado'}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="space-y-3">
            <h4 className="font-medium">Ações</h4>
            
            <div className="flex flex-col sm:flex-row gap-2">
              {!permission.granted && (
                <Button
                  onClick={handleRequestPermission}
                  disabled={isLoading || !isSupported}
                  className="flex-1"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                    />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Ativar Notificações
                </Button>
              )}

              {isSubscribed && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleTestNotification}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Testar Notificação
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleUnsubscribe}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <BellOff className="h-4 w-4 mr-2" />
                    Desativar
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Configurações */}
          {isSubscribed && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configurações
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Novos Agendamentos</p>
                      <p className="text-sm text-muted-foreground">
                        Notificar quando novos agendamentos forem criados
                      </p>
                    </div>
                    <Switch
                      checked={settings.newAppointments}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, newAppointments: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Lembretes de Agendamento</p>
                      <p className="text-sm text-muted-foreground">
                        Lembretes automáticos antes dos agendamentos
                      </p>
                    </div>
                    <Switch
                      checked={settings.appointmentReminders}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, appointmentReminders: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notificações de Pagamento</p>
                      <p className="text-sm text-muted-foreground">
                        Alertas quando pagamentos forem recebidos
                      </p>
                    </div>
                    <Switch
                      checked={settings.paymentNotifications}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, paymentNotifications: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Alertas do Sistema</p>
                      <p className="text-sm text-muted-foreground">
                        Notificações importantes do sistema
                      </p>
                    </div>
                    <Switch
                      checked={settings.systemAlerts}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, systemAlerts: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notificações de Marketing</p>
                      <p className="text-sm text-muted-foreground">
                        Promoções e novidades (opcional)
                      </p>
                    </div>
                    <Switch
                      checked={settings.marketingNotifications}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, marketingNotifications: checked }))
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Resultado de Teste */}
          <AnimatePresence>
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Informações adicionais */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• As notificações funcionam mesmo com o app fechado</p>
            <p>• Você receberá alertas em tempo real para eventos importantes</p>
            <p>• Pode desativar a qualquer momento nas configurações</p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
