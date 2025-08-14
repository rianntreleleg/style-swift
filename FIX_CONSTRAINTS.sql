-- CORREÇÃO DAS CONSTRAINTS DA TABELA TENANTS
-- Execute este script no SQL Editor do Supabase Dashboard
-- Data: 2025-01-15

-- 1. VERIFICAR CONSTRAINTS ATUAIS
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.tenants'::regclass
  AND conname IN ('tenants_plan_status_check', 'tenants_plan_check');

-- 2. CORRIGIR CONSTRAINT DE PLAN_STATUS
-- Remover constraint antiga
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_status_check;

-- Adicionar nova constraint com valores corretos
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_status_check
  CHECK (plan_status IN ('active', 'canceled', 'past_due', 'unpaid', 'pending'));

-- 3. CORRIGIR CONSTRAINT DE PLAN
-- Remover constraint antiga
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;

-- Adicionar nova constraint com valores corretos
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_check
  CHECK (plan IN ('essential', 'professional', 'premium'));

-- 4. VERIFICAR SE AS CORREÇÕES FUNCIONARAM
SELECT 
  'Constraints corrigidas' as status,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.tenants'::regclass
  AND conname IN ('tenants_plan_status_check', 'tenants_plan_check');

-- 5. TESTAR INSERÇÃO (OPCIONAL - REMOVER DEPOIS)
-- INSERT INTO public.tenants (
--   owner_id,
--   name,
--   slug,
--   theme_variant,
--   plan,
--   plan_tier,
--   plan_status,
--   payment_completed
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'Test Tenant',
--   'test-tenant',
--   'barber',
--   'essential',
--   'essential',
--   'unpaid',
--   false
-- );
-- DELETE FROM public.tenants WHERE slug = 'test-tenant';
