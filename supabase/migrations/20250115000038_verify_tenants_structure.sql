-- VERIFICAR E CORRIGIR ESTRUTURA DA TABELA TENANTS
-- Garantir que todas as colunas necessárias existem

-- Verificar se a tabela tenants existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        RAISE EXCEPTION 'Tabela tenants não existe!';
    END IF;
END $$;

-- Garantir que todas as colunas necessárias existem
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

-- Garantir que as constraints existem
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
        CHECK (plan_tier IN ('essential', 'professional', 'enterprise'));
    END IF;
END $$;

-- Garantir que os índices existem
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON public.tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_payment_status ON public.tenants(payment_status);

-- Verificar se a função create_simple_tenant existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'create_simple_tenant' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RAISE EXCEPTION 'Função create_simple_tenant não existe!';
    END IF;
END $$;

-- Comentário final
COMMENT ON TABLE public.tenants IS 'Estrutura verificada e corrigida - todas as colunas necessárias presentes';
