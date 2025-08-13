import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export default function AutoConfirmationManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<AutoConfirmationStats | null>(null);
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const { toast } = useToast();

  // Carregar estatísticas iniciais
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_auto_confirmation_stats', {
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString()
        });

      if (error) throw error;
      setStats(data[0]);
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as estatísticas de confirmação automática.',
        variant: 'destructive'
      });
    }
  };

  const runAutoConfirmation = async () => {
    setIsLoading(true);
    try {
      // Primeiro, verificar agendamentos pendentes
      const { data: pendingData, error: pendingError } = await supabase
        .rpc('check_and_confirm_appointments');

      if (pendingError) throw pendingError;

      setPendingAppointments(pendingData || []);
      setLastRun(new Date());

      // Recarregar estatísticas
      await loadStats();

      const confirmedCount = pendingData?.length || 0;
      
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
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
              Você pode executar manualmente esta verificação a qualquer momento.
            </AlertDescription>
          </Alert>

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
                Última execução: {lastRun.toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Estatísticas dos Últimos 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total_appointments}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.auto_confirmed}</div>
                <div className="text-sm text-muted-foreground">Auto Confirmados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.manually_confirmed}</div>
                <div className="text-sm text-muted-foreground">Confirmados Manualmente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                <div className="text-sm text-muted-foreground">Cancelados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                <div className="text-sm text-muted-foreground">Pendentes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agendamentos Pendentes */}
      {pendingAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Agendamentos Confirmados Automaticamente
            </CardTitle>
            <CardDescription>
              Agendamentos que foram confirmados na última execução.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAppointments.map((appointment) => (
                <div 
                  key={appointment.appointment_id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{appointment.customer_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.service_name} • {formatDate(appointment.scheduled_at)}
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Confirmado
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
