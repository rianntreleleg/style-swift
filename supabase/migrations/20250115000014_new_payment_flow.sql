-- NOVA ARQUITETURA: TENANT ANTES DO CHECKOUT
-- Esta migração implementa o fluxo mais robusto: criar tenant antes do pagamento

-- 1. Criar tabela de eventos Stripe para auditoria
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  stripe_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  processing_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON public.stripe_events(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type ON public.stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_tenant_id ON public.stripe_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON public.stripe_events(processed);

-- 3. RLS para tabela de eventos
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stripe_events_service_access" ON public.stripe_events FOR ALL USING (true);

-- 4. Função para processar evento de pagamento (simplificada)
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
  -- Só atualizar o tenant (que já existe) para pagamento = true
  UPDATE public.tenants 
  SET 
    stripe_customer_id = p_stripe_customer_id,
    stripe_subscription_id = p_stripe_subscription_id,
    stripe_product_id = p_stripe_product_id,
    stripe_price_id = p_stripe_price_id,
    plan_tier = p_plan_tier,
    plan_status = 'active',
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

-- 5. Função para criar tenant antes do checkout
CREATE OR REPLACE FUNCTION create_tenant_for_checkout(
  p_user_id UUID,
  p_email TEXT,
  p_plan_tier TEXT,
  p_theme_variant TEXT DEFAULT 'barber'
)
RETURNS TABLE(
  tenant_id UUID,
  stripe_customer_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_customer_id TEXT;
BEGIN
  -- Criar tenant com payment_completed = false
  INSERT INTO public.tenants (
    owner_id,
    name,
    slug,
    theme_variant,
    plan,
    plan_tier,
    plan_status,
    payment_completed,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    'Estabelecimento ' || split_part(p_email, '@', 1),
    'estabelecimento-' || extract(epoch from now())::text,
    p_theme_variant,
    p_plan_tier,
    p_plan_tier,
    'unpaid',
    false,
    now(),
    now()
  )
  RETURNING id INTO v_tenant_id;
  
  -- Gerar um customer_id temporário (será substituído pelo real do Stripe)
  v_customer_id := 'temp_' || v_tenant_id::text;
  
  -- Atualizar tenant com customer_id temporário
  UPDATE public.tenants 
  SET stripe_customer_id = v_customer_id
  WHERE id = v_tenant_id;
  
  RETURN QUERY SELECT v_tenant_id, v_customer_id;
END;
$$;

-- 6. Comentários para documentação
COMMENT ON TABLE public.stripe_events IS 'Tabela para auditoria e reprocessamento de eventos Stripe';
COMMENT ON FUNCTION process_stripe_payment_event IS 'Processa evento de pagamento - só atualiza status (tenant já existe)';
COMMENT ON FUNCTION create_tenant_for_checkout IS 'Cria tenant antes do checkout com payment_completed = false';
