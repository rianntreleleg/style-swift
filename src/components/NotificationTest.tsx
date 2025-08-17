import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Bell, TestTube, CheckCircle, AlertCircle } from 'lucide-react';

interface NotificationTestProps {
  tenantId: string;
}

export const NotificationTest: React.FC<NotificationTestProps> = ({ tenantId }) => {
  const { user } = useAuth();
  const { testNotificationSystem, notifications, unreadCount, isLoading } = useNotifications(tenantId);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestNotification = async () => {
    if (!tenantId || !user) {
      toast({
        title: 'Erro',
        description: 'Tenant ID ou usuário não encontrado.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      await testNotificationSystem(tenantId);
    } catch (error) {
      console.error('Erro no teste:', error);
      toast({
        title: 'Erro no teste',
        description: 'Não foi possível executar o teste do sistema de notificações.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Teste do Sistema de Notificações
        </CardTitle>
        <CardDescription>
          Teste se o sistema de notificações está funcionando corretamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="text-sm">Notificações não lidas: {unreadCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Total: {notifications.length}</span>
          </div>
        </div>

        <Button
          onClick={handleTestNotification}
          disabled={isTesting || isLoading}
          className="w-full"
        >
          {isTesting ? (
            <>
              <TestTube className="h-4 w-4 mr-2 animate-spin" />
              Testando...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Testar Sistema de Notificações
            </>
          )}
        </Button>

        {notifications.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Últimas notificações:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-2 rounded text-xs ${
                    notification.is_read 
                      ? 'bg-muted text-muted-foreground' 
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {notification.is_read ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    <span className="font-medium">{notification.title}</span>
                  </div>
                  <p className="text-xs mt-1">{notification.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};