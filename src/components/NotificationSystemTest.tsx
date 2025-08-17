import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export const NotificationSystemTest: React.FC = () => {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const {
    testNotificationSystem,
    diagnoseNotificationSystem,
    repairNotificationSystem
  } = useNotifications();

  const handleTest = async () => {
    if (!tenantId) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira um ID de tenant válido.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      await testNotificationSystem(tenantId);
    } catch (error) {
      console.error('Erro ao testar notificações:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao testar o sistema de notificações.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDiagnose = async () => {
    if (!tenantId) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira um ID de tenant válido.',
        variant: 'destructive',
      });
      return;
    }

    setIsDiagnosing(true);
    try {
      const result = await diagnoseNotificationSystem(tenantId);
      if (result) {
        console.log('Resultado do diagnóstico:', result);
        toast({
          title: 'Diagnóstico concluído',
          description: 'Verifique o console do navegador para detalhes do diagnóstico.',
        });
      }
    } catch (error) {
      console.error('Erro ao diagnosticar notificações:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao diagnosticar o sistema de notificações.',
        variant: 'destructive',
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleRepair = async () => {
    if (!tenantId) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira um ID de tenant válido.',
        variant: 'destructive',
      });
      return;
    }

    setIsRepairing(true);
    try {
      const result = await repairNotificationSystem(tenantId);
      if (result && result.success) {
        toast({
          title: 'Sistema reparado',
          description: 'O sistema de notificações foi reparado com sucesso.',
        });
      }
    } catch (error) {
      console.error('Erro ao reparar notificações:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao reparar o sistema de notificações.',
        variant: 'destructive',
      });
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Teste do Sistema de Notificações</CardTitle>
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
        
        <div className="grid grid-cols-1 gap-2">
          <Button 
            onClick={handleTest} 
            disabled={!tenantId || isTesting}
          >
            {isTesting ? 'Testando...' : 'Testar Notificações'}
          </Button>
          
          <Button 
            onClick={handleDiagnose} 
            variant="outline"
            disabled={!tenantId || isDiagnosing}
          >
            {isDiagnosing ? 'Diagnosticando...' : 'Diagnosticar Sistema'}
          </Button>
          
          <Button 
            onClick={handleRepair} 
            variant="outline"
            disabled={!tenantId || isRepairing}
          >
            {isRepairing ? 'Reparando...' : 'Reparar Sistema'}
          </Button>
        </div>
        
        {user && (
          <div className="text-sm text-muted-foreground">
            <p>Usuário logado: {user.email}</p>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground pt-4">
          <p><strong>Instruções:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Insira o ID do tenant para testar</li>
            <li>Clique em "Testar Notificações" para criar uma notificação de teste</li>
            <li>Use "Diagnosticar Sistema" para verificar problemas</li>
            <li>Use "Reparar Sistema" para corrigir problemas automaticamente</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};