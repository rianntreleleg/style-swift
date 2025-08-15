import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Tipos
interface Appointment {
  id: string;
  tenant_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  services: {
    name: string;
    price_cents: number;
  } | null;
  professionals: {
    name: string;
  } | null;
}

// Chaves de cache
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: string) => [...appointmentKeys.lists(), { filters }] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  today: (tenantId: string) => [...appointmentKeys.all, 'today', tenantId] as const,
};

// Hook para buscar agendamentos de hoje
export const useTodayAppointments = (tenantId: string) => {
  return useQuery({
    queryKey: appointmentKeys.today(tenantId),
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          customer_name,
          customer_phone,
          customer_email,
          start_time,
          end_time,
          status,
          notes,
          services(name, price_cents),
          professionals(name)
        `)
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!tenantId,
    // Cache por 2 minutos para dados de hoje
    staleTime: 2 * 60 * 1000,
  });
};

// Hook para buscar todos os agendamentos
export const useAppointments = (tenantId: string, filters?: any) => {
  return useQuery({
    queryKey: appointmentKeys.list(JSON.stringify(filters)),
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          customer_name,
          customer_phone,
          customer_email,
          start_time,
          end_time,
          status,
          notes,
          services(name, price_cents),
          professionals(name)
        `)
        .eq('tenant_id', tenantId);

      // Aplicar filtros se fornecidos
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.professional_id) {
        query = query.eq('professional_id', filters.professional_id);
      }
      if (filters?.start_date) {
        query = query.gte('start_time', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('start_time', filters.end_date);
      }

      const { data, error } = await query.order('start_time', { ascending: true });
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!tenantId,
  });
};

// Hook para criar agendamento
export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentData: {
      tenant_id: string;
      professional_id: string;
      service_id: string;
      customer_name: string;
      customer_phone: string;
      customer_email?: string;
      start_time: string;
      end_time: string;
      notes?: string;
    }) => {
      // Usar a função RPC segura para criar agendamentos
      const { data, error } = await supabase.rpc('create_appointment_safe', {
        p_tenant_id: appointmentData.tenant_id,
        p_professional_id: appointmentData.professional_id,
        p_service_id: appointmentData.service_id,
        p_customer_name: appointmentData.customer_name,
        p_customer_phone: appointmentData.customer_phone,
        p_customer_email: appointmentData.customer_email || null,
        p_start_time: appointmentData.start_time,
        p_end_time: appointmentData.end_time,
        p_notes: appointmentData.notes || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message: string; appointment_id?: string };

      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: (data) => {
      // Invalidar cache de agendamentos
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      
      toast({
        title: 'Agendamento criado com sucesso!',
        description: 'O agendamento foi salvo no sistema.',
      });
    },
    onError: (error: any) => {
      let errorMessage = error.message || 'Tente novamente.';
      
      // Tratar erros específicos
      if (errorMessage.includes('Conflito de agendamento') || errorMessage.includes('Já existe um agendamento')) {
        errorMessage = 'Já existe um agendamento para este profissional neste horário.';
      }
      
      toast({
        title: 'Erro ao criar agendamento',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
};

// Hook para atualizar agendamento
export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidar cache específico e geral
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      
      toast({
        title: 'Agendamento atualizado!',
        description: 'As alterações foram salvas.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });
};

// Hook para deletar agendamento
export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      // Remover do cache e invalidar
      queryClient.removeQueries({ queryKey: appointmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      
      toast({
        title: 'Agendamento excluído!',
        description: 'O agendamento foi removido do sistema.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });
};
