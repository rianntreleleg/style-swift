-- Corrigir status de tenant não pago
-- Força o status do plano para 'active' e payment_completed para true

CREATE OR REPLACE FUNCTION public.handle_stripe_session(
  p_customer_id TEXT,
  p_subscription_id TEXT,
  p_customer_email TEXT,
  p_user_id UUID, -- Pode ser nulo se não vier do checkout
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

  -- Inserir ou atualizar o tenant
  INSERT INTO public.tenants (
    owner_id, name, slug, plan, plan_tier, plan_status, payment_completed,
    stripe_customer_id, stripe_subscription_id, stripe_product_id, stripe_price_id,
    current_period_start, current_period_end, updated_at
  )
  VALUES (
    v_user_id, 
    'Estabelecimento de ' || p_customer_email, 
    'tenant-' || v_user_id::text, 
    p_plan_tier, 
    p_plan_tier, 
    'active', -- Forçar status para 'active'
    true, -- Forçar pagamento para 'true'
    p_customer_id, 
    p_subscription_id, 
    p_product_id, 
    p_price_id,
    p_period_start, 
    p_period_end, 
    now()
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    plan = p_plan_tier,
    plan_tier = p_plan_tier,
    plan_status = 'active', -- Forçar status para 'active'
    payment_completed = true, -- Forçar pagamento para 'true'
    stripe_customer_id = p_customer_id,
    stripe_subscription_id = p_subscription_id,
    stripe_product_id = p_product_id,
    stripe_price_id = p_price_id,
    current_period_start = p_period_start,
    current_period_end = p_period_end,
    updated_at = now()
  RETURNING id INTO v_tenant_id;

  -- Inserir ou atualizar o subscriber
  INSERT INTO public.subscribers (
    user_id, email, stripe_customer_id, stripe_subscription_id, 
    subscribed, subscription_tier, subscription_end, updated_at
  )
  VALUES (
    v_user_id, 
    p_customer_email, 
    p_customer_id, 
    p_subscription_id,
    true, -- Assinante está ativo
    p_plan_tier, 
    p_period_end, 
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    stripe_customer_id = p_customer_id,
    stripe_subscription_id = p_subscription_id,
    subscribed = true,
    subscription_tier = p_plan_tier,
    subscription_end = p_period_end,
    updated_at = now();

  -- Inserir ou atualizar a subscription
  INSERT INTO public.subscriptions (
    tenant_id, stripe_subscription_id, stripe_product_id, stripe_price_id,
    plan_tier, status, current_period_start, current_period_end, updated_at
  )
  VALUES (
    v_tenant_id, 
    p_subscription_id, 
    p_product_id, 
    p_price_id,
    p_plan_tier, 
    'active', -- Forçar status para 'active'
    p_period_start, 
    p_period_end, 
    now()
  )
  ON CONFLICT (stripe_subscription_id) DO UPDATE SET
    plan_tier = p_plan_tier,
    status = 'active',
    current_period_start = p_period_start,
    current_period_end = p_period_end,
    updated_at = now();

END;
$$;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.handle_stripe_session TO authenticated;
-- Grant execute permission to the service_role role
GRANT EXECUTE ON FUNCTION public.handle_stripe_session TO service_role;
