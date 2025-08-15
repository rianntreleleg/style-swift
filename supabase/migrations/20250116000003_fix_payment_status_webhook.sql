-- Corrigir função process_stripe_payment_event para atualizar payment_status também
CREATE OR REPLACE FUNCTION process_stripe_payment_event(
  p_event_id TEXT,
  p_tenant_id UUID,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_stripe_product_id TEXT,
  p_stripe_price_id TEXT,
  p_plan_tier TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar o tenant com AMBOS payment_status e plan_status
  UPDATE public.tenants 
  SET 
    stripe_customer_id = p_stripe_customer_id,
    stripe_subscription_id = p_stripe_subscription_id,
    stripe_product_id = p_stripe_product_id,
    stripe_price_id = p_stripe_price_id,
    plan_tier = p_plan_tier,
    plan_status = 'active',        -- Status do plano
    payment_status = 'paid',       -- Status do pagamento (CORREÇÃO CRÍTICA)
    payment_completed = true,
    updated_at = now()
  WHERE id = p_tenant_id;
  
  -- Criar/atualizar subscriber
  INSERT INTO public.subscribers (
    user_id,
    email,
    stripe_customer_id,
    stripe_subscription_id,
    subscribed,
    subscription_tier,
    subscription_end,
    created_at,
    updated_at
  )
  SELECT 
    t.owner_id,
    u.email,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    true,
    p_plan_tier,
    now() + interval '1 month',
    now(),
    now()
  FROM public.tenants t
  JOIN auth.users u ON u.id = t.owner_id
  WHERE t.id = p_tenant_id
  ON CONFLICT (email) DO UPDATE SET
    stripe_customer_id = p_stripe_customer_id,
    stripe_subscription_id = p_stripe_subscription_id,
    subscribed = true,
    subscription_tier = p_plan_tier,
    subscription_end = now() + interval '1 month',
    updated_at = now();
  
  -- Criar/atualizar subscription
  INSERT INTO public.subscriptions (
    tenant_id,
    stripe_subscription_id,
    stripe_product_id,
    stripe_price_id,
    plan_tier,
    status,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    p_stripe_subscription_id,
    p_stripe_product_id,
    p_stripe_price_id,
    p_plan_tier,
    'active',
    now(),
    now() + interval '1 month',
    now(),
    now()
  )
  ON CONFLICT (stripe_subscription_id) DO UPDATE SET
    tenant_id = p_tenant_id,
    stripe_product_id = p_stripe_product_id,
    stripe_price_id = p_stripe_price_id,
    plan_tier = p_plan_tier,
    status = 'active',
    current_period_start = now(),
    current_period_end = now() + interval '1 month',
    updated_at = now();
  
  -- Marcar evento como processado
  UPDATE public.stripe_events 
  SET processed = true, updated_at = now()
  WHERE event_id = p_event_id;
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  -- Marcar evento como falhado
  UPDATE public.stripe_events 
  SET 
    processing_attempts = processing_attempts + 1,
    error_message = SQLERRM,
    updated_at = now()
  WHERE event_id = p_event_id;
  
  RETURN false;
END;
$$;

-- Também corrigir a função handleSubscriptionUpdate no webhook
-- Criar função auxiliar para sincronização do webhook
CREATE OR REPLACE FUNCTION sync_stripe_subscription_status(
  p_stripe_customer_id TEXT,
  p_plan_tier TEXT,
  p_subscription_status TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_active BOOLEAN;
BEGIN
  -- Determinar se a subscription está ativa
  is_active := p_subscription_status = 'active';
  
  -- Atualizar tenant
  UPDATE public.tenants 
  SET 
    plan_tier = p_plan_tier,
    plan_status = CASE 
      WHEN is_active THEN 'active'
      ELSE 'unpaid'
    END,
    payment_status = CASE 
      WHEN is_active THEN 'paid'
      ELSE 'pending'
    END,
    payment_completed = is_active,
    current_period_start = p_current_period_start,
    current_period_end = p_current_period_end,
    updated_at = now()
  WHERE stripe_customer_id = p_stripe_customer_id;
  
  RETURN FOUND;
END;
$$;

-- Comentários
COMMENT ON FUNCTION process_stripe_payment_event IS 'Processa evento de pagamento - atualiza payment_status E plan_status';
COMMENT ON FUNCTION sync_stripe_subscription_status IS 'Sincroniza status da subscription com o tenant - usado pelo webhook';
