-- RECONSTRUÇÃO LIMPA SEGURA
-- Abordagem que preserva dados e foreign keys

-- 1. PRIMEIRO: Adicionar novas colunas se não existirem
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled'));

-- 2. MIGRAR DADOS EXISTENTES
UPDATE public.tenants 
SET payment_status = CASE 
    WHEN payment_completed = true THEN 'paid'
    ELSE 'pending'
END
WHERE payment_status IS NULL OR payment_status = '';

-- 3. TORNAR payment_status NOT NULL após migração
ALTER TABLE public.tenants 
ALTER COLUMN payment_status SET NOT NULL;

-- 4. REMOVER APENAS TRIGGERS CUSTOMIZADOS (não do sistema)
DROP TRIGGER IF EXISTS trg_enforce_plan_limits ON public.professionals;
DROP TRIGGER IF EXISTS sync_tenant_plan_trigger ON public.tenants;

-- 5. REMOVER FUNÇÕES PROBLEMÁTICAS
DROP FUNCTION IF EXISTS public.enforce_plan_limits() CASCADE;
DROP FUNCTION IF EXISTS public.create_tenant_for_checkout(uuid, text, text, text) CASCADE;

-- 6. CRIAR FUNÇÕES LIMPAS E SIMPLES

-- Função para verificar se pagamento foi completado
CREATE OR REPLACE FUNCTION public.can_access_system(tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT payment_status = 'paid' FROM public.tenants WHERE id = tenant_id);
END;
$$;

-- Função para criar tenant simples
CREATE OR REPLACE FUNCTION public.create_simple_tenant(
    p_owner_id uuid,
    p_name text,
    p_slug text,
    p_plan_tier text DEFAULT 'essential',
    p_theme_variant text DEFAULT 'barber',
    p_address text DEFAULT NULL,
    p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id uuid;
BEGIN
    INSERT INTO public.tenants (
        owner_id, name, slug, plan_tier, theme_variant, 
        address, phone, payment_status
    ) VALUES (
        p_owner_id, p_name, p_slug, p_plan_tier, p_theme_variant,
        p_address, p_phone, 'pending'
    ) 
    RETURNING id INTO v_tenant_id;
    
    RETURN v_tenant_id;
END;
$$;

-- Função para marcar pagamento como concluído
CREATE OR REPLACE FUNCTION public.mark_payment_completed(
    p_tenant_id uuid,
    p_stripe_customer_id text,
    p_stripe_subscription_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.tenants 
    SET 
        payment_status = 'paid',
        stripe_customer_id = p_stripe_customer_id,
        stripe_subscription_id = p_stripe_subscription_id,
        updated_at = now()
    WHERE id = p_tenant_id;
    
    RETURN FOUND;
END;
$$;

-- 7. COMENTÁRIOS
COMMENT ON FUNCTION public.can_access_system IS 'Verifica se o sistema pode ser acessado baseado no payment_status';
COMMENT ON FUNCTION public.create_simple_tenant IS 'Cria tenant com estrutura limpa e simples';
COMMENT ON FUNCTION public.mark_payment_completed IS 'Marca pagamento como concluído via webhook';
