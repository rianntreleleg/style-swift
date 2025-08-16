import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_FEATURES, type PlanTier } from '@/config/plans';

interface PlanLimits {
  max_professionals: number;
  max_services: number;
  has_financial_dashboard: boolean;
  has_auto_confirmation: boolean;
  has_advanced_analytics: boolean;
  has_backup: boolean;
  has_support: boolean;
  has_services: boolean;
}

interface Permissions {
  canAccessFinancialDashboard: boolean;
  canAddProfessional: boolean;
  canAddService: boolean;
  canUseAutoConfirmation: boolean;
  canUseAdvancedAnalytics: boolean;
  canUseBackup: boolean;
  canUseSupport: boolean;
  canAccessServices: boolean;
  planTier: string;
  isPaid: boolean;
  planLimits: PlanLimits;
  isLoading: boolean;
}

export const usePermissionsSimplified = (tenantId?: string) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permissions>({
    canAccessFinancialDashboard: false,
    canAddProfessional: false,
    canAddService: false,
    canUseAutoConfirmation: false,
    canUseAdvancedAnalytics: false,
    canUseBackup: false,
    canUseSupport: false,
    canAccessServices: false,
    planTier: 'essential',
    isPaid: false,
    planLimits: {
      max_professionals: 1,
      max_services: 5,
      has_financial_dashboard: false,
      has_auto_confirmation: false,
      has_advanced_analytics: false,
      has_backup: false,
      has_support: false,
      has_services: false
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
        // Consulta direta na tabela tenants para obter dados confiáveis
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('plan_tier, plan, payment_completed, plan_status')
          .eq('id', tenantId)
          .single();

        if (tenantError) {
          console.error('Erro ao buscar dados do tenant:', tenantError);
          setPermissions(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Determinar plano e status de pagamento
        const planTier = (tenantData?.plan_tier || tenantData?.plan || 'essential') as PlanTier;
        const isPaid = Boolean(
          tenantData?.payment_completed === true || 
          tenantData?.plan_status === 'active'
        );

        // Obter funcionalidades do plano da configuração
        const planFeatures = PLAN_FEATURES[planTier] || PLAN_FEATURES.essential;

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

        // Definir limites baseados no plano
        const planLimits: PlanLimits = {
          max_professionals: planFeatures.maxProfessionals,
          max_services: planTier === 'essential' ? 5 : 999,
          has_financial_dashboard: planFeatures.hasFinancialDashboard && isPaid,
          has_auto_confirmation: planFeatures.hasAutoConfirmation && isPaid,
          has_advanced_analytics: planFeatures.hasAdvancedReports && isPaid,
          has_backup: planFeatures.hasBackup && isPaid,
          has_support: planFeatures.hasSupport && isPaid,
          has_services: (planTier === 'professional' || planTier === 'premium') && isPaid
        };

        // Calcular permissões específicas
        const newPermissions: Permissions = {
          canAccessFinancialDashboard: planLimits.has_financial_dashboard,
          canAddProfessional: isPaid && currentProfessionals < planLimits.max_professionals,
          canAddService: isPaid && currentServices < planLimits.max_services,
          canUseAutoConfirmation: planLimits.has_auto_confirmation,
          canUseAdvancedAnalytics: planLimits.has_advanced_analytics,
          canUseBackup: planLimits.has_backup,
          canUseSupport: planLimits.has_support,
          canAccessServices: planLimits.has_services,
          planTier,
          isPaid,
          planLimits,
          isLoading: false
        };

        console.log('Permissões calculadas:', {
          planTier,
          isPaid,
          planFeatures,
          newPermissions
        });

        setPermissions(newPermissions);

      } catch (error) {
        console.error('Erro geral ao buscar permissões:', error);
        setPermissions(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchPermissions();
  }, [user, tenantId]);

  return permissions;
};

// Hook para verificar funcionalidade específica
export const useFeatureAccess = (tenantId: string, feature: string) => {
  const permissions = usePermissionsSimplified(tenantId);
  
  const hasAccess = () => {
    switch (feature) {
      case 'financial_dashboard':
        return permissions.canAccessFinancialDashboard;
      case 'backup':
        return permissions.canUseBackup;
      case 'support':
        return permissions.canUseSupport;
      case 'services':
        return permissions.canAccessServices;
      case 'auto_confirmation':
        return permissions.canUseAutoConfirmation;
      case 'advanced_analytics':
        return permissions.canUseAdvancedAnalytics;
      default:
        return false;
    }
  };

  return {
    hasAccess: hasAccess(),
    isLoading: permissions.isLoading,
    planTier: permissions.planTier,
    isPaid: permissions.isPaid
  };
};
