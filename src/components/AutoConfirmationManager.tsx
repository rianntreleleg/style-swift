import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkFeatureAccess } from '@/config/plans';
import UpgradePrompt from '@/components/UpgradePrompt';

interface AutoConfirmationStats {
  total_appointments: number;
  auto_confirmed: number;
  manually_confirmed: number;
  cancelled: number;
  pending: number;
}

interface PendingAppointment {
  appointment_id: string;
  customer_name: string;
  service_name: string;
  scheduled_at: string;
  status: string;
  action_taken: string;
}

interface AutoConfirmationManagerProps {
  planTier?: string | null;
}

export default function AutoConfirmationManager({ planTier }: AutoConfirmationManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<AutoConfirmationStats | null>(null);
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const { toast } = useToast();

  // Carregar estatísticas iniciais
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      
      // Primeiro, vamos verificar se a função existe
      const { data: functionExists, error: checkError } = await supabase
        .rpc('get_auto_confirmation_stats' as any, {
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString()
        });

      if (checkError) {
        console.error('Erro ao verificar função:', checkError);
        // Se a função não existe, vamos criar estatísticas básicas
        await createBasicStats();
        return;
      }

      setStats((functionExists && functionExists[0]) || {
        total_appointments: 0,
        auto_confirmed: 0,
        manually_confirmed: 0,
        cancelled: 0,
        pending: 0
      });
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      await createBasicStats();
    } finally {
      setLoadingStats(false);
    }
  };

  const createBasicStats = async () => {
    try {
      // Criar estatísticas básicas consultando diretamente a tabela appointments
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .lte('start_time', new Date().toISOString());

      if (error) throw error;

      const total = appointments?.length || 0;
      const confirmed = appointments?.filter(a => a.status === 'confirmado').length || 0;
      const cancelled = appointments?.filter(a => a.status === 'cancelado').length || 0;
      const pending = appointments?.filter(a => !['confirmado', 'cancelado'].includes(a.status)).length || 0;

      setStats({
        total_appointments: total,
        auto_confirmed: 0, // Não temos essa informação sem a função
        manually_confirmed: confirmed,
        cancelled: cancelled,
        pending: pending
      });
    } catch (error: any) {
      console.error('Erro ao criar estatísticas básicas:', error);
      setStats({
        total_appointments: 0,
        auto_confirmed: 0,
        manually_confirmed: 0,
        cancelled: 0,
        pending: 0
      });
    }
  };

  const runAutoConfirmation = async () => {
    setIsLoading(true);
    try {
      // Primeiro, verificar agendamentos pendentes
      const { data: pendingData, error: pendingError } = await supabase
        .rpc('check_and_confirm_appointments' as any);

      if (pendingError) {
        console.error('Erro na função check_and_confirm_appointments:', pendingError);
        // Se a função não existe, vamos fazer a confirmação manual
        await manualConfirmation();
        return;
      }

      setPendingAppointments((pendingData as any) || []);
      setLastRun(new Date());

      // Recarregar estatísticas
      await loadStats();

      const confirmedCount = (pendingData as any)?.length || 0;
      
      if (confirmedCount > 0) {
        toast({
          title: 'Confirmação Automática Executada',
          description: `${confirmedCount} agendamento(s) foram confirmados automaticamente.`,
        });
      } else {
        toast({
          title: 'Nenhum Agendamento Confirmado',
          description: 'Não há agendamentos pendentes para confirmação automática.',
        });
      }

    } catch (error: any) {
      console.error('Erro ao executar confirmação automática:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível executar a confirmação automática.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const manualConfirmation = async () => {
    try {
      // Confirmar agendamentos pendentes manualmente
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'confirmado' })
        .eq('status', 'agendado')
        .lt('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .gt('start_time', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      toast({
        title: 'Confirmação Manual Executada',
        description: 'Agendamentos antigos foram confirmados manualmente.',
      });

      await loadStats();
    } catch (error: any) {
      console.error('Erro na confirmação manual:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível executar a confirmação manual.',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loadingStats) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando estatísticas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {checkFeatureAccess(planTier, 'hasAutoConfirmation') ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Confirmação Automática de Agendamentos
              </CardTitle>
              <CardDescription>
                Sistema que confirma automaticamente agendamentos não cancelados após 24 horas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Agendamentos que não foram cancelados e estão há mais de 24 horas são automaticamente confirmados.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats?.total_appointments || 0}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats?.auto_confirmed || 0}</div>
                  <div className="text-sm text-muted-foreground">Auto Confirmados</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats?.manually_confirmed || 0}</div>
                  <div className="text-sm text-muted-foreground">Manual Confirmados</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{stats?.cancelled || 0}</div>
                  <div className="text-sm text-muted-foreground">Cancelados</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats?.pending || 0}</div>
                  <div className="text-sm text-muted-foreground">Pendentes</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button 
                  onClick={runAutoConfirmation} 
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Executar Confirmação Automática
                </Button>
                
                {lastRun && (
                  <div className="text-sm text-muted-foreground">
                    Última execução: {formatDate(lastRun.toISOString())}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agendamentos Pendentes */}
          {pendingAppointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Agendamentos Confirmados Automaticamente
                </CardTitle>
                <CardDescription>
                  Agendamentos que foram confirmados na última execução.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingAppointments.map((appointment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{appointment.customer_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.service_name} - {formatDate(appointment.scheduled_at)}
                        </div>
                      </div>
                      <Badge variant="outline">{appointment.action_taken}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <UpgradePrompt
          requiredPlan="professional"
          featureName="Confirmação Automática"
          currentPlan={planTier}
        />
      )}
    </div>
  );
};
