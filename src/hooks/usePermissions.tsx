import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PlanLimits {
  max_professionals: number;
  max_services: number;
  has_financial_dashboard: boolean;
  has_auto_confirmation: boolean;
  has_advanced_analytics: boolean;
}

interface Permissions {
  canAccessFinancialDashboard: boolean;
  canAddProfessional: boolean;
  canAddService: boolean;
  canUseAutoConfirmation: boolean;
  canUseAdvancedAnalytics: boolean;
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
    planLimits: {
      max_professionals: 1,
      max_services: 5,
      has_financial_dashboard: false,
      has_auto_confirmation: false,
      has_advanced_analytics: false
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
        // Buscar informações do tenant
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('plan_tier, plan, payment_completed, plan_status')
          .eq('id', tenantId)
          .eq('owner_id', user.id)
          .single();

        if (tenantError) {
          console.error('Erro ao buscar permissões:', tenantError);
          setPermissions(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const planTier = tenantData.plan_tier || tenantData.plan || 'essential';
        const isPaid = tenantData.payment_completed && tenantData.plan_status === 'active';

        // Definir limites baseados no plano
        let planLimits: PlanLimits;
        switch (planTier) {
          case 'professional':
            planLimits = {
              max_professionals: 3,
              max_services: 15,
              has_financial_dashboard: isPaid,
              has_auto_confirmation: isPaid,
              has_advanced_analytics: false
            };
            break;
          case 'premium':
            planLimits = {
              max_professionals: 999,
              max_services: 999,
              has_financial_dashboard: isPaid,
              has_auto_confirmation: isPaid,
              has_advanced_analytics: isPaid
            };
            break;
          default: // essential
            planLimits = {
              max_professionals: 1,
              max_services: 5,
              has_financial_dashboard: false,
              has_auto_confirmation: false,
              has_advanced_analytics: false
            };
        }

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
