-- Funções Atômicas para Webhook do Stripe
-- Garante que a criação e atualização de tenants, subscriptions e subscribers sejam atômicas.

-- 1. Função para lidar com a criação e atualização de sessões do Stripe
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
    plan = p_plan_tier,
    plan_tier = p_plan_tier,
    plan_status = 'active',
    payment_completed = true,
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
    p_subscription_status = 'active', 
    p_plan_tier, 
    p_period_end, 
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    stripe_customer_id = p_customer_id,
    stripe_subscription_id = p_subscription_id,
    subscribed = p_subscription_status = 'active',
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
    p_subscription_status, 
    p_period_start, 
    p_period_end, 
    now()
  )
  ON CONFLICT (stripe_subscription_id) DO UPDATE SET
    plan_tier = p_plan_tier,
    status = p_subscription_status,
    current_period_start = p_period_start,
    current_period_end = p_period_end,
    updated_at = now();

END;
$$;

-- 2. Função para lidar com o cancelamento de assinaturas
CREATE OR REPLACE FUNCTION public.handle_subscription_deleted(
  p_subscription_id TEXT,
  p_new_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Encontrar o tenant_id a partir do stripe_subscription_id
  SELECT id INTO v_tenant_id FROM public.tenants 
  WHERE stripe_subscription_id = p_subscription_id;

  IF v_tenant_id IS NULL THEN
    RAISE LOG '[handle_subscription_deleted] Tenant não encontrado para a subscrição ID: %', p_subscription_id;
    RETURN;
  END IF;

  -- Atualizar o status do tenant
  UPDATE public.tenants
  SET 
    plan_status = p_new_status,
    payment_completed = false,
    updated_at = now()
  WHERE id = v_tenant_id;

  -- Atualizar o status da subscription
  UPDATE public.subscriptions
  SET 
    status = p_new_status,
    updated_at = now()
  WHERE stripe_subscription_id = p_subscription_id;

  -- Atualizar o status do subscriber
  UPDATE public.subscribers s
  SET 
    subscribed = false,
    subscription_end = now(),
    updated_at = now()
  FROM public.tenants t
  WHERE s.user_id = t.owner_id AND t.id = v_tenant_id;

END;
$$;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.handle_stripe_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_subscription_deleted TO authenticated;

-- Grant execute permission to the service_role role
GRANT EXECUTE ON FUNCTION public.handle_stripe_session TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_subscription_deleted TO service_role;
