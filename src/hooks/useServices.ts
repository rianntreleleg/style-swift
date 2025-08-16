import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Query keys para melhor gerenciamento de cache
export const serviceKeys = {
  all: ['services'] as const,
  lists: () => [...serviceKeys.all, 'list'] as const,
  list: (tenantId: string) => [...serviceKeys.lists(), tenantId] as const,
  details: () => [...serviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...serviceKeys.details(), id] as const,
};

// Hook para buscar serviços
export const useServices = (tenantId?: string) => {
  return useQuery({
    queryKey: serviceKeys.list(tenantId || ''),
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });
};

// Hook para criar serviço
export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceData: {
      tenant_id: string;
      name: string;
      price_reais: number;
      duration_minutes: number;
      description?: string;
    }) => {
      const { data, error } = await supabase.from('services').insert({
        tenant_id: serviceData.tenant_id,
        name: serviceData.name,
        price_cents: Math.round(serviceData.price_reais * 100),
        duration_minutes: serviceData.duration_minutes,
        description: serviceData.description,
        active: true
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidar cache específico e geral
      queryClient.invalidateQueries({ queryKey: serviceKeys.list(data.tenant_id) });
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      
      toast({
        title: 'Serviço criado com sucesso!',
        description: 'O novo serviço foi adicionado ao seu estabelecimento com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar serviço',
        description: error.message || 'Ocorreu um erro ao adicionar o serviço. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });
};

// Hook para atualizar serviço
export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidar cache específico e geral
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: serviceKeys.list(data.tenant_id) });
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      
      toast({
        title: 'Serviço atualizado com sucesso!',
        description: 'As alterações no cadastro do serviço foram salvas com sucesso no sistema.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar serviço',
        description: error.message || 'Ocorreu um erro ao atualizar o cadastro do serviço. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });
};

// Hook para deletar serviço
export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id, variables) => {
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      
      toast({
        title: 'Serviço excluído com sucesso!',
        description: 'O serviço foi removido do seu estabelecimento e não aparecerá mais nas agendas.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir serviço',
        description: error.message || 'Ocorreu um erro ao remover o serviço do estabelecimento. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });
};
