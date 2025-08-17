import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellOff, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Settings
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface PushNotificationManagerProps {
  tenantId: string;
  className?: string;
}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({
  tenantId,
  className = ''
}) => {
  const { user } = useAuth();
  const {
    isSupported,
    isEnabled,
    isSubscribed,
    isLoading,
    error,
    fcmToken,
    requestPermission,
    unsubscribe,
    checkSupport,
    checkPermission
  } = usePushNotifications(tenantId);

  const [isTesting, setIsTesting] = useState(false);


  const handleEnablePushNotifications = async () => {
    try {
      await requestPermission();
      toast({
        title: "Push notifications ativadas! 🔔",
        description: "Você receberá notificações em tempo real no seu dispositivo.",
      });
    } catch (error) {
      toast({
        title: "Erro ao ativar push notifications",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleDisablePushNotifications = async () => {
    try {
      await unsubscribe();
      toast({
        title: "Push notifications desativadas",
        description: "Você não receberá mais notificações push.",
      });
    } catch (error) {
      toast({
        title: "Erro ao desativar push notifications",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      // Enviar notificação de teste via Supabase Edge Function
      const response = await fetch('/functions/v1/send-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          title: 'Teste de Push Notification',
          body: 'Esta é uma notificação de teste do StyleSwift!',
          data: {
            type: 'test',
            timestamp: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        toast({
          title: "Notificação de teste enviada! 📱",
          description: "Verifique se você recebeu a notificação no seu dispositivo.",
        });
      } else {
        throw new Error('Falha ao enviar notificação de teste');
      }
    } catch (error) {
      toast({
        title: "Erro ao enviar notificação de teste",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (isSubscribed && isEnabled) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (error && !isSupported) return <XCircle className="h-4 w-4 text-red-500" />;
    if (error && error.includes('Firebase')) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    if (error) return <XCircle className="h-4 w-4 text-red-500" />;
    if (!isSupported) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (isLoading) return "Verificando...";
    if (isSubscribed && isEnabled) return "Ativo";
    if (error && !isSupported) return "Não suportado";
    if (error && error.includes('Firebase')) return "Configurar"; // Firebase error não é crítico
    if (error) return "Erro";
    if (!isSupported) return "Não suportado";
    if (!isEnabled) return "Configurar";
    return "Configurar";
  };

  const getStatusColor = () => {
    if (isSubscribed && isEnabled) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (error && !isSupported) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (error && error.includes('Firebase')) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    if (error) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (!isSupported) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receba notificações em tempo real no seu dispositivo móvel
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">Status</span>
          </div>
          <Badge className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>

        <Separator />

        

        

        <Separator />

        {/* Controles */}
        <div className="space-y-3">
          {isSupported ? (
            <>
              {isSubscribed && isEnabled ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Push Notifications</Label>
                    <Switch
                      checked={true}
                      onCheckedChange={handleDisablePushNotifications}
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ativo - Você receberá notificações em tempo real
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Push Notifications</Label>
                    <Switch
                      checked={false}
                      onCheckedChange={handleEnablePushNotifications}
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Inativo - Ative para receber notificações em tempo real
                  </p>
                </div>
              )}

                             {/* Botão de Teste */}
               {isSubscribed && isEnabled && (
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={handleTestNotification}
                   disabled={isTesting}
                   className="w-full"
                 >
                   {isTesting ? (
                     <>
                       <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                       Enviando...
                     </>
                   ) : (
                     <>
                       <Bell className="h-4 w-4 mr-2" />
                       Testar Notificação
                     </>
                   )}
                 </Button>
               )}

               
            </>
          ) : (
            <div className="text-center py-4">
              <BellOff className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Push notifications não são suportadas neste navegador
              </p>
            </div>
          )}
        </div>

                 

        {/* Erro */}
        {error && (
          <>
            <Separator />
            <div className="text-sm text-red-600 dark:text-red-400">
              <strong>Erro:</strong> {error}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
