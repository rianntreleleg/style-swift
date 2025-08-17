import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export const NotificationTest: React.FC = () => {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState('');
  const { testNotificationSystem, isLoading } = useNotifications();

  const handleTest = async () => {
    if (!tenantId) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira um ID de tenant válido.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await testNotificationSystem(tenantId);
    } catch (error) {
      console.error('Erro ao testar notificações:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao testar o sistema de notificações.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Teste de Notificações</CardTitle>
        <CardDescription>
          Verifique se o sistema de notificações está funcionando corretamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="tenantId" className="text-sm font-medium">
            ID do Tenant
          </label>
          <input
            id="tenantId"
            type="text"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="Insira o ID do tenant"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        
        <Button 
          onClick={handleTest} 
          disabled={!tenantId || isLoading}
          className="w-full"
        >
          {isLoading ? 'Testando...' : 'Testar Notificações'}
        </Button>
        
        {user && (
          <div className="text-sm text-muted-foreground">
            <p>Usuário logado: {user.email}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};