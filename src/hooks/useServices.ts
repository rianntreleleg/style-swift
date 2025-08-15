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
        description: 'O serviço foi adicionado ao seu estabelecimento.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar serviço',
        description: error.message || 'Tente novamente.',
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
        title: 'Serviço atualizado!',
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
        title: 'Serviço excluído!',
        description: 'O serviço foi removido do seu estabelecimento.',
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
