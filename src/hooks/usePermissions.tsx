import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PlanLimits {
  max_professionals: number;
  max_services: number;
  has_financial_dashboard: boolean;
  has_auto_confirmation: boolean;
  has_advanced_analytics: boolean;
  has_backup: boolean;
}

interface Permissions {
  canAccessFinancialDashboard: boolean;
  canAddProfessional: boolean;
  canAddService: boolean;
  canUseAutoConfirmation: boolean;
  canUseAdvancedAnalytics: boolean;
  canUseBackup: boolean;
  planLimits: PlanLimits;
  isLoading: boolean;
}

export const usePermissions = (tenantId?: string) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permissions>({
    canAccessFinancialDashboard: false,
    canAddProfessional: false,
    canAddService: false,
    canUseAutoConfirmation: false,
    canUseAdvancedAnalytics: false,
    canUseBackup: false,
    planLimits: {
      max_professionals: 1,
      max_services: 5,
      has_financial_dashboard: false,
      has_auto_confirmation: false,
      has_advanced_analytics: false,
      has_backup: false
    },
    isLoading: true
  });

  useEffect(() => {
    if (!user || !tenantId) {
      setPermissions(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchPermissions = async () => {
      try {
        let accessData = null;
        let error = null;

        // Tentar usar a função RPC corrigida primeiro
        try {
          const rpcResult = await supabase.rpc('check_tenant_paid_access_with_backup', {
            p_tenant_id: tenantId
          });
          accessData = rpcResult.data;
          error = rpcResult.error;
        } catch (rpcError) {
          console.warn('Função RPC com backup falhou, tentando fallback:', rpcError);
          
          // Fallback: usar função RPC sem backup
          try {
            const fallbackResult = await supabase.rpc('check_tenant_paid_access', {
              p_tenant_id: tenantId
            });
            accessData = fallbackResult.data;
            error = fallbackResult.error;
            
            // Adicionar has_backup manualmente para o fallback
            if (accessData && accessData[0]) {
              accessData[0].has_backup = accessData[0].plan_tier === 'premium' && accessData[0].is_paid;
            }
          } catch (fallbackError) {
            console.warn('Função RPC fallback também falhou, usando consulta direta:', fallbackError);
            
            // Fallback final: consulta direta na tabela
            const { data: tenantData, error: tenantError } = await supabase
              .from('tenants')
              .select('plan_tier, plan, payment_completed, plan_status')
              .eq('id', tenantId)
              .single();

            if (!tenantError && tenantData) {
              const planTier = tenantData.plan_tier || tenantData.plan || 'essential';
              const isPaid = tenantData.payment_completed || tenantData.plan_status === 'active';
              
              accessData = [{
                is_paid: isPaid,
                plan_tier: planTier,
                has_financial_dashboard: (planTier === 'professional' || planTier === 'premium') && isPaid,
                has_auto_confirmation: (planTier === 'professional' || planTier === 'premium') && isPaid,
                has_advanced_analytics: planTier === 'premium' && isPaid,
                has_backup: planTier === 'premium' && isPaid
              }];
              error = null;
            } else {
              error = tenantError;
            }
          }
        }

        if (error) {
          console.error('Erro ao verificar acesso:', error);
          setPermissions(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const access = accessData && accessData[0] ? accessData[0] : {
          is_paid: false,
          plan_tier: 'essential',
          has_financial_dashboard: false,
          has_auto_confirmation: false,
          has_advanced_analytics: false,
          has_backup: false
        };

        const planTier = access.plan_tier || 'essential';
        const isPaid = access.is_paid || false;

        // Definir limites baseados no plano com regras claras
        const planLimits: PlanLimits = {
          max_professionals: planTier === 'premium' ? 999 : planTier === 'professional' ? 3 : 1,
          max_services: planTier === 'premium' ? 999 : planTier === 'professional' ? 15 : 5,
          has_financial_dashboard: (planTier === 'professional' || planTier === 'premium') && isPaid,
          has_auto_confirmation: (planTier === 'professional' || planTier === 'premium') && isPaid,
          has_advanced_analytics: planTier === 'premium' && isPaid,
          has_backup: planTier === 'premium' && isPaid
        };

        // Verificar limites atuais
        const [professionalsCount, servicesCount] = await Promise.all([
          supabase
            .from('professionals')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('active', true),
          supabase
            .from('services')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('active', true)
        ]);

        const currentProfessionals = professionalsCount.count || 0;
        const currentServices = servicesCount.count || 0;

        setPermissions({
          canAccessFinancialDashboard: planLimits.has_financial_dashboard,
          canAddProfessional: isPaid && currentProfessionals < planLimits.max_professionals,
          canAddService: isPaid && currentServices < planLimits.max_services,
          canUseAutoConfirmation: planLimits.has_auto_confirmation,
          canUseAdvancedAnalytics: planLimits.has_advanced_analytics,
          canUseBackup: planLimits.has_backup,
          planLimits,
          isLoading: false
        });

      } catch (error) {
        console.error('Erro geral ao buscar permissões:', error);
        setPermissions(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchPermissions();
  }, [user, tenantId]);

  return permissions;
};
