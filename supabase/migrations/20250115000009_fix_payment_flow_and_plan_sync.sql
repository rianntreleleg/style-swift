-- Correção Urgente: Fluxo de Pagamento, Registro e Login
-- Data: 2025-01-15
-- Objetivo: Corrigir inconsistências de planos e fluxo de pagamento

-- 1. CORRIGIR NOMENCLATURA DE PLANOS NA TABELA TENANTS
-- Atualizar constraint para usar a nomenclatura correta
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_check 
  CHECK (plan IN ('essential', 'professional', 'premium'));

-- 2. ATUALIZAR DADOS EXISTENTES PARA NOVA NOMENCLATURA
UPDATE public.tenants 
SET plan = CASE 
  WHEN plan = 'free' THEN 'essential'
  WHEN plan = 'pro' THEN 'professional' 
  WHEN plan = 'plus' THEN 'premium'
  ELSE 'essential'
END
WHERE plan IN ('free', 'pro', 'plus');

-- 3. GARANTIR QUE PLAN_TIER ESTEJA SINCRONIZADO
-- Atualizar plan_tier baseado no plan
UPDATE public.tenants 
SET plan_tier = plan
WHERE plan_tier IS NULL OR plan_tier != plan;

-- 4. CORRIGIR FUNÇÃO DE SINCRONIZAÇÃO DE PLANOS
CREATE OR REPLACE FUNCTION sync_tenant_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Sincronizar plan e plan_tier para usar a mesma nomenclatura
  IF NEW.plan IS NOT NULL THEN
    NEW.plan_tier := NEW.plan;
  ELSIF NEW.plan_tier IS NOT NULL THEN
    NEW.plan := NEW.plan_tier;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar trigger para sincronização
DROP TRIGGER IF EXISTS sync_tenant_plan_trigger ON public.tenants;
CREATE TRIGGER sync_tenant_plan_trigger
  BEFORE INSERT OR UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION sync_tenant_plan();

-- 5. CORRIGIR FUNÇÃO DE VALIDAÇÃO DE PROFISSIONAIS
CREATE OR REPLACE FUNCTION public.validate_professional_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
declare
  v_plan text;
  v_count int;
  v_limit int;
begin
  -- Buscar o plano do tenant (usando plan_tier ou plan)
  select COALESCE(plan_tier, plan, 'essential') into v_plan 
  from public.tenants where id = NEW.tenant_id;

  -- Contar profissionais ativos
  select count(*) into v_count from public.professionals
  where public.professionals.tenant_id = NEW.tenant_id and active = true;

  -- Definir limite baseado no plano
  v_limit := case v_plan
    when 'essential' then 1
    when 'professional' then 3
    when 'premium' then 999
    else 1
  end;

  -- Verificar se está tentando ativar um profissional
  if NEW.active = true and v_count >= v_limit then
    raise exception 'Limite de profissionais atingido para o plano % (limite: %, atuais: %)', v_plan, v_limit, v_count;
  end if;

  return NEW;
end;
$function$;

-- 6. GARANTIR QUE SUBSCRIBERS TENHA A NOMENCLATURA CORRETA
-- Atualizar subscribers para usar a mesma nomenclatura
UPDATE public.subscribers 
SET subscription_tier = CASE 
  WHEN subscription_tier = 'free' THEN 'essential'
  WHEN subscription_tier = 'pro' THEN 'professional'
  WHEN subscription_tier = 'plus' THEN 'premium'
  ELSE subscription_tier
END
WHERE subscription_tier IN ('free', 'pro', 'plus');

-- 7. CRIAR FUNÇÃO PARA ASSOCIAR PAGAMENTO AO TENANT
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
BEGIN
  -- Atualizar tenant com informações do pagamento
  UPDATE public.tenants 
  SET 
    plan = p_plan_tier,
    plan_tier = p_plan_tier,
    plan_status = 'active',
    stripe_customer_id = p_stripe_customer_id,
    stripe_subscription_id = p_stripe_subscription_id,
    payment_completed = true,
    updated_at = now()
  WHERE owner_id = p_user_id;
  
  -- Atualizar subscribers
  INSERT INTO public.subscribers (
    user_id, 
    email, 
    stripe_customer_id, 
    subscribed, 
    subscription_tier,
    updated_at
  )
  SELECT 
    p_user_id,
    auth.email(),
    p_stripe_customer_id,
    true,
    p_plan_tier,
    now()
  FROM auth.users 
  WHERE auth.users.id = p_user_id
  ON CONFLICT (email) DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    subscribed = EXCLUDED.subscribed,
    subscription_tier = EXCLUDED.subscription_tier,
    updated_at = EXCLUDED.updated_at;
END;
$function$;

-- 8. VERIFICAR SE A CORREÇÃO FUNCIONOU
SELECT 
  'Verificação concluída' as status,
  COUNT(*) as total_tenants,
  COUNT(CASE WHEN plan IN ('essential', 'professional', 'premium') THEN 1 END) as correct_plans,
  COUNT(CASE WHEN plan_tier = plan THEN 1 END) as synchronized_plans
FROM public.tenants;
