import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Query keys para melhor gerenciamento de cache
export const professionalKeys = {
  all: ['professionals'] as const,
  lists: () => [...professionalKeys.all, 'list'] as const,
  list: (tenantId: string) => [...professionalKeys.lists(), tenantId] as const,
  details: () => [...professionalKeys.all, 'detail'] as const,
  detail: (id: string) => [...professionalKeys.details(), id] as const,
};

// Hook para buscar profissionais
export const useProfessionals = (tenantId?: string) => {
  return useQuery({
    queryKey: professionalKeys.list(tenantId || ''),
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });
};

// Hook para criar profissional
export const useCreateProfessional = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (professionalData: {
      tenant_id: string;
      name: string;
      bio?: string;
      avatar_url?: string;
    }) => {
      // Verificar limite de profissionais baseado no plano
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('plan_tier')
        .eq('id', professionalData.tenant_id)
        .single();

      if (tenantError) throw new Error('Erro ao verificar plano');

      const { data: existingPros, error: countError } = await supabase
        .from('professionals')
        .select('id')
        .eq('tenant_id', professionalData.tenant_id)
        .eq('active', true);

      if (countError) throw new Error('Erro ao verificar limites');

      const currentCount = existingPros?.length || 0;
      const limits = {
        essential: 1,
        professional: 3,
        premium: 999
      };

      const maxAllowed = limits[tenantData.plan_tier as keyof typeof limits] || 1;

      if (currentCount >= maxAllowed) {
        throw new Error(`Seu plano ${tenantData.plan_tier} permite no máximo ${maxAllowed} profissional(is). Faça upgrade para adicionar mais.`);
      }

      const { data, error } = await supabase.from('professionals').insert({
        tenant_id: professionalData.tenant_id,
        name: professionalData.name,
        bio: professionalData.bio,
        avatar_url: professionalData.avatar_url || null,
        active: true
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidar cache específico e geral
      queryClient.invalidateQueries({ queryKey: professionalKeys.list(data.tenant_id) });
      queryClient.invalidateQueries({ queryKey: professionalKeys.all });
      
      toast({
        title: 'Profissional criado com sucesso!',
        description: 'O novo profissional foi adicionado ao seu estabelecimento com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar profissional',
        description: error.message || 'Ocorreu um erro ao adicionar o profissional. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });
};

// Hook para atualizar profissional
export const useUpdateProfessional = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('professionals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidar cache específico e geral
      queryClient.invalidateQueries({ queryKey: professionalKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: professionalKeys.list(data.tenant_id) });
      queryClient.invalidateQueries({ queryKey: professionalKeys.all });
      
      toast({
        title: 'Profissional atualizado com sucesso!',
        description: 'As alterações no cadastro do profissional foram salvas com sucesso no sistema.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar profissional',
        description: error.message || 'Ocorreu um erro ao atualizar o cadastro do profissional. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });
};

// Hook para deletar profissional
export const useDeleteProfessional = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id, variables) => {
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: professionalKeys.all });
      
      toast({
        title: 'Profissional excluído com sucesso!',
        description: 'O profissional foi removido do seu estabelecimento e não aparecerá mais nas agendas.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir profissional',
        description: error.message || 'Ocorreu um erro ao remover o profissional do estabelecimento. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });
};
