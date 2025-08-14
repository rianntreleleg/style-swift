-- Script para corrigir as constraints da tabela tenants

-- 1. Verificar a constraint atual de plan_status
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'tenants_plan_status_check';

-- 2. Corrigir a constraint de plan_status
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_status_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_status_check
  CHECK (plan_status IN ('active', 'canceled', 'past_due', 'unpaid', 'pending'));

-- 3. Verificar a constraint atual de plan
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'tenants_plan_check';

-- 4. Corrigir a constraint de plan se necessário
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_check
  CHECK (plan IN ('essential', 'professional', 'premium'));

-- 5. Verificar se as constraints foram atualizadas corretamente
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname IN ('tenants_plan_status_check', 'tenants_plan_check');