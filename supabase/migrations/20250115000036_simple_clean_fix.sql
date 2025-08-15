-- CORREÇÃO SIMPLES E FINAL
-- Apenas garantir que a estrutura está correta

-- 1. Garantir que payment_status existe
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- 2. Garantir que plan_tier existe e está correto
ALTER TABLE public.tenants 
ALTER COLUMN plan_tier SET DEFAULT 'essential';

-- 3. Adicionar constraint se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tenants_payment_status_check'
    ) THEN
        ALTER TABLE public.tenants 
        ADD CONSTRAINT tenants_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled'));
    END IF;
END $$;

-- 4. Comentário final
COMMENT ON TABLE public.tenants IS 'Estrutura limpa - sem referências a plan';
