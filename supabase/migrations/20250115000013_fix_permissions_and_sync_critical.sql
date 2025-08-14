-- CORREÇÃO SISTÊMICA CRÍTICA - PERMISSÕES E SINCRONIZAÇÃO
-- Esta migração corrige problemas de permissões, associação de dados e sincronização

-- 1. CORRIGIR FUNÇÃO DE ASSOCIAÇÃO DE PAGAMENTO (VERSÃO DEFINITIVA)
CREATE OR REPLACE FUNCTION associate_payment_to_tenant(
  p_user_id UUID,
  p_plan_tier TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_tenant_id UUID;
  v_user_email TEXT;
  v_subscription_id UUID;
BEGIN
  -- Obter email do usuário
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  
  -- Buscar tenant do usuário
  SELECT id INTO v_tenant_id FROM public.tenants WHERE owner_id = p_user_id LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não encontrado para o usuário %', p_user_id;
  END IF;

  -- 1. ATUALIZAR TENANT COM INFORMAÇÕES DO PAGAMENTO
  UPDATE public.tenants 
  SET 
    plan = p_plan_tier,
    plan_tier = p_plan_tier,
    plan_status = 'active',
    stripe_customer_id = p_stripe_customer_id,
    stripe_subscription_id = p_stripe_subscription_id,
    payment_completed = true,
    updated_at = now()
  WHERE id = v_tenant_id;
  
  -- 2. INSERIR/ATUALIZAR SUBSCRIBERS
  INSERT INTO public.subscribers (
    user_id, 
    email, 
    stripe_customer_id, 
    stripe_subscription_id,
    subscribed, 
    subscription_tier,
    updated_at
  )
  VALUES (
    p_user_id,
    v_user_email,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    true,
    p_plan_tier,
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    subscribed = EXCLUDED.subscribed,
    subscription_tier = EXCLUDED.subscription_tier,
    updated_at = EXCLUDED.updated_at;
    
  -- 3. INSERIR/ATUALIZAR SUBSCRIPTIONS
  INSERT INTO public.subscriptions (
    tenant_id,
    stripe_subscription_id,
    plan_tier,
    status,
    current_period_start,
    current_period_end
  )
  VALUES (
    v_tenant_id,
    p_stripe_subscription_id,
    p_plan_tier,
    'active',
    now(),
    now() + interval '1 month'
  )
  ON CONFLICT (stripe_subscription_id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    plan_tier = EXCLUDED.plan_tier,
    status = EXCLUDED.status,
    updated_at = now()
  RETURNING id INTO v_subscription_id;
    
  RAISE NOTICE 'Pagamento associado com sucesso: usuário=%, plano=%, tenant=%, subscription=%', 
    p_user_id, p_plan_tier, v_tenant_id, v_subscription_id;
END;
$function$;

-- 2. CRIAR FUNÇÃO PARA SINCRONIZAR TODOS OS DADOS
CREATE OR REPLACE FUNCTION sync_all_payment_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sincronizar plan e plan_tier em tenants
  UPDATE public.tenants 
  SET plan_tier = plan 
  WHERE plan_tier IS NULL OR plan_tier != plan;
  
  -- Sincronizar subscribers com tenants
  UPDATE public.subscribers s
  SET subscription_tier = t.plan_tier
  FROM public.tenants t
  WHERE s.user_id = t.owner_id 
    AND s.subscription_tier != t.plan_tier;
    
  -- Garantir que tenants com pagamento tenham status correto
  UPDATE public.tenants 
  SET plan_status = 'active', payment_completed = true
  WHERE stripe_customer_id IS NOT NULL 
    AND (plan_status != 'active' OR payment_completed != true);
    
  -- Sincronizar subscriptions com tenants
  UPDATE public.subscriptions sub
  SET plan_tier = t.plan_tier
  FROM public.tenants t
  WHERE sub.tenant_id = t.id 
    AND sub.plan_tier != t.plan_tier;
END;
$$;

-- 3. CRIAR FUNÇÃO PARA VERIFICAR PERMISSÕES
CREATE OR REPLACE FUNCTION check_user_permissions(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
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
  WHERE owner_id = p_user_id 
  LIMIT 1;
  
  -- Se não encontrou tenant, sem permissões
  IF v_plan_tier IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar permissões baseadas no plano
  CASE p_feature
    WHEN 'financial_dashboard' THEN
      RETURN v_payment_completed AND v_plan_tier IN ('professional', 'premium');
    WHEN 'multiple_professionals' THEN
      RETURN v_payment_completed AND v_plan_tier IN ('professional', 'premium');
    WHEN 'auto_confirmation' THEN
      RETURN v_payment_completed AND v_plan_tier IN ('professional', 'premium');
    WHEN 'advanced_analytics' THEN
      RETURN v_payment_completed AND v_plan_tier = 'premium';
    ELSE
      RETURN v_payment_completed; -- Recursos básicos para qualquer plano pago
  END CASE;
END;
$$;

-- 4. CRIAR FUNÇÃO PARA OBTER LIMITES DO PLANO
CREATE OR REPLACE FUNCTION get_plan_limits(p_user_id UUID)
RETURNS TABLE(
  max_professionals INTEGER,
  max_services INTEGER,
  has_financial_dashboard BOOLEAN,
  has_auto_confirmation BOOLEAN,
  has_advanced_analytics BOOLEAN
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
        false as has_advanced_analytics;
    WHEN 'professional' THEN
      RETURN QUERY SELECT 
        3 as max_professionals,
        15 as max_services,
        v_payment_completed as has_financial_dashboard,
        v_payment_completed as has_auto_confirmation,
        false as has_advanced_analytics;
    WHEN 'premium' THEN
      RETURN QUERY SELECT 
        999 as max_professionals,
        999 as max_services,
        v_payment_completed as has_financial_dashboard,
        v_payment_completed as has_auto_confirmation,
        v_payment_completed as has_advanced_analytics;
    ELSE
      RETURN QUERY SELECT 
        1 as max_professionals,
        5 as max_services,
        false as has_financial_dashboard,
        false as has_auto_confirmation,
        false as has_advanced_analytics;
  END CASE;
END;
$$;

-- 5. CORRIGIR DADOS EXISTENTES
-- Executar sincronização
SELECT sync_all_payment_data();

-- Corrigir tenants que têm pagamento mas plano incorreto
UPDATE public.tenants t
SET 
  plan = s.subscription_tier,
  plan_tier = s.subscription_tier,
  plan_status = 'active',
  payment_completed = true,
  updated_at = now()
FROM public.subscribers s
WHERE t.owner_id = s.user_id 
  AND s.subscribed = true 
  AND s.subscription_tier IS NOT NULL
  AND (t.plan != s.subscription_tier OR t.plan_status != 'active');

-- 6. CRIAR TRIGGER PARA SINCRONIZAÇÃO AUTOMÁTICA
CREATE OR REPLACE FUNCTION trigger_sync_tenant_plans()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sincronizar plan_tier com plan
  IF NEW.plan IS NOT NULL AND (NEW.plan_tier IS NULL OR NEW.plan_tier != NEW.plan) THEN
    NEW.plan_tier := NEW.plan;
  END IF;
  
  -- Garantir que tenants com stripe_customer_id tenham payment_completed = true
  IF NEW.stripe_customer_id IS NOT NULL AND NOT NEW.payment_completed THEN
    NEW.payment_completed := true;
  END IF;
  
  -- Garantir que tenants com payment_completed tenham plan_status = 'active'
  IF NEW.payment_completed AND NEW.plan_status != 'active' THEN
    NEW.plan_status := 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS sync_tenant_plans_trigger ON public.tenants;
CREATE TRIGGER sync_tenant_plans_trigger
  BEFORE INSERT OR UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_tenant_plans();

-- 7. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tenants_owner_plan ON public.tenants(owner_id, plan_tier, payment_completed);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_tier ON public.subscribers(user_id, subscription_tier, subscribed);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status ON public.subscriptions(tenant_id, status, plan_tier);

-- 8. VERIFICAÇÃO FINAL
SELECT 
  'Verificação final - Correção sistêmica' as info,
  COUNT(*) as total_tenants,
  COUNT(CASE WHEN plan_status = 'active' THEN 1 END) as active_tenants,
  COUNT(CASE WHEN payment_completed = true THEN 1 END) as paid_tenants,
  COUNT(CASE WHEN plan_tier IN ('essential', 'professional', 'premium') THEN 1 END) as valid_plans,
  COUNT(CASE WHEN plan_tier = plan THEN 1 END) as synchronized_plans
FROM public.tenants;
