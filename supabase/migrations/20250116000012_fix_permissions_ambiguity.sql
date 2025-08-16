-- Corrigir ambiguidade em permissões e padronizar acesso
-- Data: 2025-01-16

-- ======================================
-- 1. CORRIGIR FUNÇÃO CHECK_TENANT_PAID_ACCESS_WITH_BACKUP
-- ======================================

CREATE OR REPLACE FUNCTION check_tenant_paid_access_with_backup(p_tenant_id UUID)
RETURNS TABLE(
  is_paid BOOLEAN,
  plan_tier TEXT,
  has_financial_dashboard BOOLEAN,
  has_auto_confirmation BOOLEAN,
  has_advanced_analytics BOOLEAN,
  has_backup BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_tier TEXT;
  v_payment_completed BOOLEAN;
  v_plan_status TEXT;
  v_is_paid BOOLEAN;
BEGIN
  -- Buscar dados do tenant de forma clara e sem ambiguidade
  SELECT 
    COALESCE(t.plan_tier, t.plan, 'essential'),
    COALESCE(t.payment_completed, false),
    COALESCE(t.plan_status, 'pending')
  INTO v_plan_tier, v_payment_completed, v_plan_status
  FROM tenants t
  WHERE t.id = p_tenant_id;

  -- Se não encontrou tenant, usar valores padrão
  IF v_plan_tier IS NULL THEN
    v_plan_tier := 'essential';
    v_payment_completed := false;
    v_plan_status := 'pending';
  END IF;

  -- Verificar se está pago (qualquer um dos indicadores positivos)
  v_is_paid := (
    v_payment_completed = true OR 
    v_plan_status = 'active'
  );

  -- Retornar permissões baseadas no plano e status de pagamento
  RETURN QUERY
  SELECT 
    v_is_paid,
    v_plan_tier,
    -- Dashboard financeiro: Professional e Premium
    CASE 
      WHEN v_plan_tier IN ('professional', 'premium') AND v_is_paid THEN true
      ELSE false
    END as has_financial_dashboard,
    -- Auto confirmação: Professional e Premium
    CASE 
      WHEN v_plan_tier IN ('professional', 'premium') AND v_is_paid THEN true
      ELSE false
    END as has_auto_confirmation,
    -- Analytics avançado: apenas Premium
    CASE 
      WHEN v_plan_tier = 'premium' AND v_is_paid THEN true
      ELSE false
    END as has_advanced_analytics,
    -- Backup: apenas Premium
    CASE 
      WHEN v_plan_tier = 'premium' AND v_is_paid THEN true
      ELSE false
    END as has_backup;
END;
$$;

-- ======================================
-- 2. CORRIGIR FUNÇÃO GET_PLAN_LIMITS_WITH_BACKUP
-- ======================================

CREATE OR REPLACE FUNCTION get_plan_limits_with_backup(p_user_id UUID)
RETURNS TABLE(
  max_professionals INTEGER,
  max_services INTEGER,
  has_financial_dashboard BOOLEAN,
  has_auto_confirmation BOOLEAN,
  has_advanced_analytics BOOLEAN,
  has_backup BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan_tier TEXT;
  v_payment_completed BOOLEAN;
  v_plan_status TEXT;
  v_is_paid BOOLEAN;
BEGIN
  -- Buscar plano e status de pagamento
  SELECT 
    COALESCE(t.plan_tier, t.plan, 'essential'),
    COALESCE(t.payment_completed, false),
    COALESCE(t.plan_status, 'pending')
  INTO v_plan_tier, v_payment_completed, v_plan_status
  FROM public.tenants t
  WHERE t.owner_id = p_user_id 
  LIMIT 1;
  
  -- Se não encontrou tenant, usar valores padrão
  IF v_plan_tier IS NULL THEN
    v_plan_tier := 'essential';
    v_payment_completed := false;
    v_plan_status := 'pending';
  END IF;

  -- Verificar se está pago
  v_is_paid := (
    v_payment_completed = true OR 
    v_plan_status = 'active'
  );
  
  -- Definir limites baseados no plano
  CASE v_plan_tier
    WHEN 'essential' THEN
      RETURN QUERY SELECT 
        1 as max_professionals,
        5 as max_services,
        false as has_financial_dashboard,
        false as has_auto_confirmation,
        false as has_advanced_analytics,
        false as has_backup;
    WHEN 'professional' THEN
      RETURN QUERY SELECT 
        3 as max_professionals,
        15 as max_services,
        v_is_paid as has_financial_dashboard,
        v_is_paid as has_auto_confirmation,
        false as has_advanced_analytics,
        false as has_backup;
    WHEN 'premium' THEN
      RETURN QUERY SELECT 
        999 as max_professionals,
        999 as max_services,
        v_is_paid as has_financial_dashboard,
        v_is_paid as has_auto_confirmation,
        v_is_paid as has_advanced_analytics,
        v_is_paid as has_backup;
    ELSE
      RETURN QUERY SELECT 
        1 as max_professionals,
        5 as max_services,
        false as has_financial_dashboard,
        false as has_auto_confirmation,
        false as has_advanced_analytics,
        false as has_backup;
  END CASE;
END;
$$;

-- ======================================
-- 3. FUNÇÃO SIMPLIFICADA PARA VERIFICAR ACESSO
-- ======================================

-- Função genérica para verificar acesso a qualquer funcionalidade
CREATE OR REPLACE FUNCTION check_feature_access(
  p_tenant_id UUID, 
  p_feature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_tier TEXT;
  v_payment_completed BOOLEAN;
  v_plan_status TEXT;
  v_is_paid BOOLEAN;
BEGIN
  -- Buscar dados do tenant
  SELECT 
    COALESCE(t.plan_tier, t.plan, 'essential'),
    COALESCE(t.payment_completed, false),
    COALESCE(t.plan_status, 'pending')
  INTO v_plan_tier, v_payment_completed, v_plan_status
  FROM tenants t
  WHERE t.id = p_tenant_id;
  
  -- Se não encontrou tenant, negar acesso
  IF v_plan_tier IS NULL THEN
    RETURN false;
  END IF;

  -- Verificar se está pago
  v_is_paid := (
    v_payment_completed = true OR 
    v_plan_status = 'active'
  );

  -- Verificar acesso baseado na funcionalidade
  CASE p_feature
    WHEN 'financial_dashboard' THEN
      RETURN v_plan_tier IN ('professional', 'premium') AND v_is_paid;
    WHEN 'backup' THEN
      RETURN v_plan_tier = 'premium' AND v_is_paid;
    WHEN 'support' THEN
      RETURN v_plan_tier IN ('professional', 'premium') AND v_is_paid;
    WHEN 'services' THEN
      RETURN v_plan_tier IN ('professional', 'premium') AND v_is_paid;
    WHEN 'auto_confirmation' THEN
      RETURN v_plan_tier IN ('professional', 'premium') AND v_is_paid;
    WHEN 'advanced_analytics' THEN
      RETURN v_plan_tier = 'premium' AND v_is_paid;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- ======================================
-- 4. FUNÇÃO LEGACY PARA COMPATIBILIDADE
-- ======================================

-- Manter função original para compatibilidade
CREATE OR REPLACE FUNCTION check_tenant_paid_access(p_tenant_id UUID)
RETURNS TABLE(
  is_paid BOOLEAN,
  plan_tier TEXT,
  has_financial_dashboard BOOLEAN,
  has_auto_confirmation BOOLEAN,
  has_advanced_analytics BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_tier TEXT;
  v_payment_completed BOOLEAN;
  v_plan_status TEXT;
  v_is_paid BOOLEAN;
BEGIN
  -- Buscar dados do tenant
  SELECT 
    COALESCE(t.plan_tier, t.plan, 'essential'),
    COALESCE(t.payment_completed, false),
    COALESCE(t.plan_status, 'pending')
  INTO v_plan_tier, v_payment_completed, v_plan_status
  FROM tenants t
  WHERE t.id = p_tenant_id;

  -- Se não encontrou tenant, usar valores padrão
  IF v_plan_tier IS NULL THEN
    v_plan_tier := 'essential';
    v_payment_completed := false;
    v_plan_status := 'pending';
  END IF;

  -- Verificar se está pago
  v_is_paid := (
    v_payment_completed = true OR 
    v_plan_status = 'active'
  );

  -- Retornar permissões
  RETURN QUERY
  SELECT 
    v_is_paid,
    v_plan_tier,
    -- Dashboard financeiro: Professional e Premium
    CASE 
      WHEN v_plan_tier IN ('professional', 'premium') AND v_is_paid THEN true
      ELSE false
    END as has_financial_dashboard,
    -- Auto confirmação: Professional e Premium
    CASE 
      WHEN v_plan_tier IN ('professional', 'premium') AND v_is_paid THEN true
      ELSE false
    END as has_auto_confirmation,
    -- Analytics avançado: apenas Premium
    CASE 
      WHEN v_plan_tier = 'premium' AND v_is_paid THEN true
      ELSE false
    END as has_advanced_analytics;
END;
$$;

-- ======================================
-- 5. CONCEDER PERMISSÕES
-- ======================================

GRANT EXECUTE ON FUNCTION check_tenant_paid_access_with_backup TO service_role;
GRANT EXECUTE ON FUNCTION check_tenant_paid_access_with_backup TO authenticated;
GRANT EXECUTE ON FUNCTION get_plan_limits_with_backup TO service_role;
GRANT EXECUTE ON FUNCTION get_plan_limits_with_backup TO authenticated;
GRANT EXECUTE ON FUNCTION check_feature_access TO service_role;
GRANT EXECUTE ON FUNCTION check_feature_access TO authenticated;
GRANT EXECUTE ON FUNCTION check_tenant_paid_access TO service_role;
GRANT EXECUTE ON FUNCTION check_tenant_paid_access TO authenticated;

-- ======================================
-- 6. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ======================================

COMMENT ON FUNCTION check_tenant_paid_access_with_backup IS 'Verifica acesso a funcionalidades pagas incluindo backup - CORRIGIDA AMBIGUIDADE';
COMMENT ON FUNCTION get_plan_limits_with_backup IS 'Retorna limites do plano incluindo backup - CORRIGIDA AMBIGUIDADE';
COMMENT ON FUNCTION check_feature_access IS 'Função genérica para verificar acesso a qualquer funcionalidade';
COMMENT ON FUNCTION check_tenant_paid_access IS 'Função legacy mantida para compatibilidade - CORRIGIDA AMBIGUIDADE';

-- ======================================
-- 7. VALIDAÇÃO
-- ======================================

DO $$
BEGIN
  RAISE NOTICE 'CORREÇÃO DE PERMISSÕES APLICADA:';
  RAISE NOTICE '- Ambiguidade plan_tier corrigida';
  RAISE NOTICE '- Dashboard financeiro: Professional e Premium';
  RAISE NOTICE '- Backup: apenas Premium';
  RAISE NOTICE '- Suporte: Professional e Premium';
  RAISE NOTICE '- Serviços: Professional e Premium';
END $$;
