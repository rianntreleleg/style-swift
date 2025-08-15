-- LIMPEZA NUCLEAR - REMOVER TODAS AS REFERÊNCIAS À COLUNA 'plan'
-- Esta migração vai limpar completamente o banco e recriar tudo do zero

-- 1. DESABILITAR TODOS OS TRIGGERS TEMPORARIAMENTE
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT 
            n.nspname as schemaname,
            c.relname as tablename,
            t.tgname as triggername
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.tgisinternal = false
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DISABLE TRIGGER %I', 
            trigger_record.schemaname, 
            trigger_record.tablename, 
            trigger_record.triggername);
    END LOOP;
END $$;

-- 2. REMOVER TODAS AS FUNÇÕES QUE PODEM TER REFERÊNCIAS À 'plan'
DROP FUNCTION IF EXISTS public.create_tenant_for_checkout(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_tenant_plan(TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_plan_limits(TEXT);
DROP FUNCTION IF EXISTS public.enforce_plan_limits();
DROP FUNCTION IF EXISTS public.validate_plan(UUID);
DROP FUNCTION IF EXISTS public.sync_tenant_plan();
DROP FUNCTION IF EXISTS public.mark_payment_completed(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.can_access_system(UUID);
DROP FUNCTION IF EXISTS public.create_simple_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 3. REMOVER TODOS OS TRIGGERS
DROP TRIGGER IF EXISTS sync_tenant_plan_trigger ON public.tenants;
DROP TRIGGER IF EXISTS update_tenant_plan_trigger ON public.tenants;
DROP TRIGGER IF EXISTS plan_validation_trigger ON public.tenants;
DROP TRIGGER IF EXISTS trg_enforce_plan_limits ON public.professionals;
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.tenants;

-- 4. REMOVER A COLUNA 'plan' SE AINDA EXISTIR
ALTER TABLE public.tenants DROP COLUMN IF EXISTS plan;

-- 5. GARANTIR QUE A ESTRUTURA DA TABELA ESTÁ CORRETA
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
ADD COLUMN IF NOT EXISTS owner_id UUID NOT NULL,
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE NOT NULL,
ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'essential',
ADD COLUMN IF NOT EXISTS theme_variant TEXT DEFAULT 'barber',
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 6. REMOVER CONSTRAINTS ANTIGAS
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_tier_check;

-- 7. ADICIONAR CONSTRAINTS CORRETAS
DO $$
BEGIN
    -- Constraint para payment_status
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tenants_payment_status_check'
    ) THEN
        ALTER TABLE public.tenants 
        ADD CONSTRAINT tenants_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled'));
    END IF;
    
    -- Constraint para plan_tier
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tenants_plan_tier_check'
    ) THEN
        ALTER TABLE public.tenants 
        ADD CONSTRAINT tenants_plan_tier_check 
        CHECK (plan_tier IN ('essential', 'professional', 'premium'));
    END IF;
END $$;

-- 8. RECRIAR FUNÇÃO create_simple_tenant LIMPA
CREATE OR REPLACE FUNCTION public.create_simple_tenant(
    p_owner_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_plan_tier TEXT DEFAULT 'essential',
    p_theme_variant TEXT DEFAULT 'barber',
    p_address TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Inserir o tenant com todos os dados necessários
    INSERT INTO public.tenants (
        owner_id,
        name,
        slug,
        plan_tier,
        theme_variant,
        address,
        phone,
        payment_status,
        created_at,
        updated_at
    )
    VALUES (
        p_owner_id,
        p_name,
        p_slug,
        p_plan_tier,
        p_theme_variant,
        p_address,
        p_phone,
        'pending',
        now(),
        now()
    )
    RETURNING id INTO v_tenant_id;

    -- Verificar se a inserção foi bem-sucedida
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Falha ao criar tenant: ID não foi retornado';
    END IF;

    RETURN v_tenant_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao criar tenant: %', SQLERRM;
END;
$$;

-- 9. RECRIAR FUNÇÃO can_access_system
CREATE OR REPLACE FUNCTION public.can_access_system(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment_status TEXT;
BEGIN
    SELECT payment_status INTO v_payment_status
    FROM public.tenants
    WHERE id = p_tenant_id;

    RETURN v_payment_status = 'paid';
END;
$$;

-- 10. RECRIAR FUNÇÃO mark_payment_completed
CREATE OR REPLACE FUNCTION public.mark_payment_completed(
    p_tenant_id UUID,
    p_stripe_subscription_id TEXT,
    p_stripe_customer_id TEXT,
    p_plan_tier TEXT,
    p_current_period_start TIMESTAMPTZ,
    p_current_period_end TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.tenants
    SET
        payment_status = 'paid',
        stripe_subscription_id = p_stripe_subscription_id,
        stripe_customer_id = p_stripe_customer_id,
        plan_tier = p_plan_tier,
        current_period_start = p_current_period_start,
        current_period_end = p_current_period_end,
        updated_at = now()
    WHERE id = p_tenant_id;
END;
$$;

-- 11. RECRIAR TRIGGER set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_trigger
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 12. CONFIGURAR PERMISSÕES
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.tenants TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_simple_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_system(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_payment_completed(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- 13. CONFIGURAR RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can insert own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can update own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can delete own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow RPC function to insert tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow webhook updates" ON public.tenants;

-- Criar políticas RLS corretas
CREATE POLICY "Users can view own tenants" ON public.tenants
    FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own tenants" ON public.tenants
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own tenants" ON public.tenants
    FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own tenants" ON public.tenants
    FOR DELETE
    USING (auth.uid() = owner_id);

CREATE POLICY "Allow RPC function to insert tenants" ON public.tenants
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow webhook updates" ON public.tenants
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 14. REABILITAR TRIGGERS
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT 
            n.nspname as schemaname,
            c.relname as tablename,
            t.tgname as triggername
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.tgisinternal = false
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE TRIGGER %I', 
            trigger_record.schemaname, 
            trigger_record.tablename, 
            trigger_record.triggername);
    END LOOP;
END $$;

-- 15. COMENTÁRIO FINAL
COMMENT ON TABLE public.tenants IS 'Estrutura completamente limpa - sem referências à coluna plan';
COMMENT ON FUNCTION public.create_simple_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Função limpa para criar tenant';
