-- Fix the create_tenant_for_checkout function to remove reference to 'plan' column
-- This function was still trying to insert into the removed 'plan' column

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
    'pending',
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

-- Add comment for documentation
COMMENT ON FUNCTION create_tenant_for_checkout IS 'Creates a tenant before checkout with payment_completed = false and proper plan_tier';
