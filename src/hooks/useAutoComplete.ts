import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Hook para conclusão automática de agendamentos
export const useAutoComplete = () => {
  const queryClient = useQueryClient();

  // Mutação para processar conclusões automáticas
  const processCompletions = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('process_pending_completions');
      
      if (error) {
        throw new Error(`Erro ao processar conclusões: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log('[AUTO-COMPLETE] Processamento concluído:', data);
      
      // Atualizar cache de agendamentos
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['daily-appointments'] });
      
      if (data.completed_count > 0) {
        toast({
          title: 'Conclusões Automáticas',
          description: `${data.completed_count} agendamento(s) marcado(s) como concluído(s) automaticamente.`,
        });
      }
    },
    onError: (error) => {
      console.error('[AUTO-COMPLETE] Erro:', error);
      toast({
        title: 'Erro no Processamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutação para verificar e concluir um agendamento específico
  const checkAndCompleteAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data, error } = await supabase.rpc('check_and_complete_appointment', {
        p_appointment_id: appointmentId
      });
      
      if (error) {
        throw new Error(`Erro ao verificar agendamento: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: (data, appointmentId) => {
      console.log('[AUTO-COMPLETE] Agendamento verificado:', appointmentId, 'Concluído:', data);
      
      // Atualizar cache de agendamentos
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['daily-appointments'] });
      
      if (data) {
        toast({
          title: 'Agendamento Concluído',
          description: 'Agendamento marcado como concluído automaticamente (24h após horário).',
        });
      }
    },
    onError: (error) => {
      console.error('[AUTO-COMPLETE] Erro ao verificar agendamento:', error);
      toast({
        title: 'Erro na Verificação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Função para executar conclusão automática via Edge Function
  const runAutoCompleteViaEdgeFunction = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-complete-appointments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na requisição');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('[AUTO-COMPLETE] Edge Function executada:', data);
      
      // Atualizar cache de agendamentos
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['daily-appointments'] });
      
      toast({
        title: 'Processamento Automático',
        description: data.message || 'Processamento de conclusões automáticas executado.',
      });
    },
    onError: (error) => {
      console.error('[AUTO-COMPLETE] Erro na Edge Function:', error);
      toast({
        title: 'Erro no Processamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    processCompletions,
    checkAndCompleteAppointment,
    runAutoCompleteViaEdgeFunction,
    isLoading: processCompletions.isPending || checkAndCompleteAppointment.isPending || runAutoCompleteViaEdgeFunction.isPending,
  };
};
