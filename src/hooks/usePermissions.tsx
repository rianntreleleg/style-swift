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
        // Usar a nova função RPC para verificar acesso pago (com backup)
        const { data: accessData, error: accessError } = await supabase.rpc('check_tenant_paid_access_with_backup', {
          p_tenant_id: tenantId
        });

        if (accessError) {
          console.error('Erro ao verificar acesso:', accessError);
          setPermissions(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const access = accessData[0]; // RPC retorna array
        const planTier = access.plan_tier || 'essential';
        const isPaid = access.is_paid;

        // Usar dados da função RPC para definir limites
        const planLimits: PlanLimits = {
          max_professionals: planTier === 'premium' ? 999 : planTier === 'professional' ? 3 : 1,
          max_services: planTier === 'premium' ? 999 : planTier === 'professional' ? 15 : 5,
          has_financial_dashboard: access.has_financial_dashboard,
          has_auto_confirmation: access.has_auto_confirmation,
          has_advanced_analytics: access.has_advanced_analytics,
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
        console.error('Erro ao buscar permissões:', error);
        setPermissions(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchPermissions();
  }, [user, tenantId]);

  return permissions;
};
