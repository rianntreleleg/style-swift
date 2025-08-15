-- Fix all remaining references to the removed 'plan' column
-- Replace with plan_tier only

-- Fix the enforce_professional_limit function
CREATE OR REPLACE FUNCTION public.enforce_professional_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  v_plan text;
  v_count int;
  v_limit int;
begin
  -- Buscar o plano do tenant (usando apenas plan_tier)
  select COALESCE(plan_tier, 'essential') into v_plan 
  from public.tenants where id = NEW.tenant_id;

  -- Contar profissionais ativos (com referência explícita à tabela)
  select count(*) into v_count from public.professionals
  where public.professionals.tenant_id = NEW.tenant_id and public.professionals.active = true;

  -- Definir limite baseado no plano
  v_limit := case v_plan
    when 'essential' then 1
    when 'professional' then 3
    when 'premium' then 999
    else 1
  end;

  -- Verificar limite
  if v_count >= v_limit then
    raise exception 'Limite de profissionais atingido para o plano % (limite: %, atuais: %)', v_plan, v_limit, v_count;
  end if;

  return NEW;
end;
$$;

-- Fix any other functions that might reference the old plan column
-- Update handle_stripe_session function to remove plan column reference
CREATE OR REPLACE FUNCTION public.handle_stripe_session(
  p_customer_id TEXT,
  p_subscription_id TEXT,
  p_customer_email TEXT,
  p_user_id UUID,
  p_plan_tier TEXT,
  p_subscription_status TEXT,
  p_product_id TEXT,
  p_price_id TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := p_user_id;
  v_tenant_id UUID;
BEGIN
  -- Se o user_id não for fornecido, tente encontrá-lo pelo email
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_customer_email;
  END IF;

  -- Se ainda não houver usuário, não podemos prosseguir
  IF v_user_id IS NULL THEN
    RAISE LOG '[handle_stripe_session] Usuário não encontrado para o email: %', p_customer_email;
    RETURN;
  END IF;

  -- Inserir ou atualizar o tenant (sem coluna plan)
  INSERT INTO public.tenants (
    owner_id, name, slug, plan_tier, plan_status, payment_completed,
    stripe_customer_id, stripe_subscription_id, stripe_product_id, stripe_price_id,
    current_period_start, current_period_end, updated_at
  )
  VALUES (
    v_user_id, 
    'Estabelecimento de ' || p_customer_email, 
    'tenant-' || v_user_id::text, 
    p_plan_tier, 
    'active',
    true,
    p_customer_id, 
    p_subscription_id, 
    p_product_id, 
    p_price_id,
    p_period_start, 
    p_period_end, 
    now()
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    plan_tier = p_plan_tier,
    plan_status = 'active',
    payment_completed = true,
    stripe_customer_id = p_customer_id,
    stripe_subscription_id = p_subscription_id,
    stripe_product_id = p_product_id,
    stripe_price_id = p_price_id,
    current_period_start = p_period_start,
    current_period_end = p_period_end,
    updated_at = now();

  -- Update subscription table
  INSERT INTO public.subscriptions (
    user_id, tenant_id, stripe_subscription_id, stripe_product_id, stripe_price_id,
    plan_tier, status, current_period_start, current_period_end, created_at, updated_at
  )
  SELECT 
    v_user_id, id, p_subscription_id, p_product_id, p_price_id,
    p_plan_tier, 'active', p_period_start, p_period_end, now(), now()
  FROM public.tenants WHERE owner_id = v_user_id
  ON CONFLICT (stripe_subscription_id) DO UPDATE SET
    plan_tier = p_plan_tier,
    status = 'active',
    current_period_start = p_period_start,
    current_period_end = p_period_end,
    updated_at = now();
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION public.enforce_professional_limit IS 'Enforces professional limits based on plan_tier only';
COMMENT ON FUNCTION public.handle_stripe_session IS 'Handles Stripe session updates without plan column dependency';
