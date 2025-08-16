-- Adicionar permissões de backup à função RPC
-- Data: 2025-01-16

-- ======================================
-- 1. ATUALIZAR FUNÇÃO CHECK_TENANT_PAID_ACCESS
-- ======================================

-- Criar nova função com permissões de backup
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
  tenant_data RECORD;
  is_tenant_paid BOOLEAN;
BEGIN
  -- Buscar dados do tenant
  SELECT 
    COALESCE(plan_tier, plan, 'essential') as plan_tier,
    COALESCE(payment_completed, false) as payment_completed,
    COALESCE(plan_status, 'pending') as plan_status
  INTO tenant_data
  FROM tenants t
  WHERE t.id = p_tenant_id;

  -- Verificar se está pago (qualquer um dos indicadores positivos)
  is_tenant_paid := (
    tenant_data.payment_completed = true OR 
    tenant_data.plan_status = 'active'
  );

  -- Retornar permissões baseadas no plano e status de pagamento
  RETURN QUERY
  SELECT 
    is_tenant_paid,
    COALESCE(tenant_data.plan_tier, 'essential')::TEXT,
    CASE 
      WHEN tenant_data.plan_tier IN ('professional', 'premium') AND is_tenant_paid THEN true
      ELSE false
    END,
    CASE 
      WHEN tenant_data.plan_tier IN ('professional', 'premium') AND is_tenant_paid THEN true
      ELSE false
    END,
    CASE 
      WHEN tenant_data.plan_tier = 'premium' AND is_tenant_paid THEN true
      ELSE false
    END,
    CASE 
      WHEN tenant_data.plan_tier = 'premium' AND is_tenant_paid THEN true
      ELSE false
    END;
END;
$$;

-- ======================================
-- 2. ATUALIZAR FUNÇÃO GET_PLAN_LIMITS
-- ======================================

-- Criar nova função com limites de backup
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
BEGIN
  -- Buscar plano e status de pagamento
  SELECT 
    COALESCE(plan_tier, plan, 'essential'),
    COALESCE(payment_completed, false)
  INTO v_plan_tier, v_payment_completed
  FROM public.tenants 
  WHERE owner_id = p_user_id 
  LIMIT 1;
  
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
        v_payment_completed as has_financial_dashboard,
        v_payment_completed as has_auto_confirmation,
        false as has_advanced_analytics,
        false as has_backup;
    WHEN 'premium' THEN
      RETURN QUERY SELECT 
        999 as max_professionals,
        999 as max_services,
        v_payment_completed as has_financial_dashboard,
        v_payment_completed as has_auto_confirmation,
        v_payment_completed as has_advanced_analytics,
        v_payment_completed as has_backup;
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
-- 3. CRIAR FUNÇÃO PARA VERIFICAR ACESSO AO BACKUP
-- ======================================

-- Função específica para verificar acesso ao backup
CREATE OR REPLACE FUNCTION check_backup_access(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_tier TEXT;
  v_payment_completed BOOLEAN;
BEGIN
  -- Buscar plano e status de pagamento do tenant
  SELECT 
    COALESCE(plan_tier, plan, 'essential'),
    COALESCE(payment_completed, false)
  INTO v_plan_tier, v_payment_completed
  FROM public.tenants 
  WHERE id = p_tenant_id 
  LIMIT 1;
  
  -- Backup disponível apenas para plano Premium pago
  RETURN v_plan_tier = 'premium' AND v_payment_completed;
END;
$$;

-- ======================================
-- 4. PERMISSÕES E COMENTÁRIOS
-- ======================================

-- Conceder permissões
GRANT EXECUTE ON FUNCTION check_tenant_paid_access_with_backup TO service_role;
GRANT EXECUTE ON FUNCTION check_tenant_paid_access_with_backup TO authenticated;
GRANT EXECUTE ON FUNCTION get_plan_limits_with_backup TO service_role;
GRANT EXECUTE ON FUNCTION get_plan_limits_with_backup TO authenticated;
GRANT EXECUTE ON FUNCTION check_backup_access TO service_role;
GRANT EXECUTE ON FUNCTION check_backup_access TO authenticated;

-- Comentários para documentação
COMMENT ON FUNCTION check_tenant_paid_access_with_backup IS 'Verifica acesso a funcionalidades pagas incluindo backup (apenas Premium)';
COMMENT ON FUNCTION get_plan_limits_with_backup IS 'Retorna limites do plano incluindo backup (apenas Premium)';
COMMENT ON FUNCTION check_backup_access IS 'Verifica se o tenant tem acesso ao sistema de backup (apenas Premium)';

-- ======================================
-- 5. VERIFICAR IMPLEMENTAÇÃO
-- ======================================

-- Verificar se as funções foram atualizadas corretamente
DO $$
BEGIN
  -- Verificar se a função check_tenant_paid_access_with_backup foi criada
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'check_tenant_paid_access_with_backup'
  ) THEN
    RAISE NOTICE 'SUCESSO: Função check_tenant_paid_access_with_backup criada com permissões de backup';
  ELSE
    RAISE NOTICE 'ATENÇÃO: Função check_tenant_paid_access_with_backup pode não ter sido criada corretamente';
  END IF;
END $$;
