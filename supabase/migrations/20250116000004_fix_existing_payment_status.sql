-- Corrigir registros existentes com payment_status vazio ou inconsistente
-- Esta migração sincroniza payment_status baseado no plan_status e payment_completed

-- 1. Atualizar registros onde payment_status está vazio mas plan_status é 'active'
UPDATE public.tenants 
SET payment_status = 'paid'
WHERE 
  (payment_status = '' OR payment_status IS NULL)
  AND plan_status = 'active'
  AND payment_completed = true;

-- 2. Atualizar registros onde payment_status está vazio mas plan_status não é 'active'
UPDATE public.tenants 
SET payment_status = 'pending'
WHERE 
  (payment_status = '' OR payment_status IS NULL)
  AND (plan_status != 'active' OR plan_status IS NULL)
  AND (payment_completed = false OR payment_completed IS NULL);

-- 3. Sincronizar registros inconsistentes onde plan_status é 'active' mas payment_status não é 'paid'
UPDATE public.tenants 
SET payment_status = 'paid'
WHERE 
  plan_status = 'active'
  AND payment_completed = true
  AND payment_status != 'paid';

-- 4. Sincronizar registros inconsistentes onde payment_completed é true mas payment_status não é 'paid'
UPDATE public.tenants 
SET payment_status = 'paid'
WHERE 
  payment_completed = true
  AND stripe_customer_id IS NOT NULL
  AND (payment_status != 'paid' OR payment_status = '' OR payment_status IS NULL);

-- 5. Função para sincronizar automaticamente payment_status quando outros campos mudarem
CREATE OR REPLACE FUNCTION sync_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se plan_status mudou para 'active' e payment_completed é true
  IF NEW.plan_status = 'active' AND NEW.payment_completed = true AND NEW.payment_status != 'paid' THEN
    NEW.payment_status = 'paid';
  END IF;
  
  -- Se payment_completed mudou para true e plan_status é 'active'
  IF NEW.payment_completed = true AND NEW.plan_status = 'active' AND NEW.payment_status != 'paid' THEN
    NEW.payment_status = 'paid';
  END IF;
  
  -- Se plan_status mudou para algo diferente de 'active' ou payment_completed é false
  IF (NEW.plan_status != 'active' OR NEW.payment_completed = false) AND NEW.payment_status = 'paid' THEN
    NEW.payment_status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS sync_payment_status_trigger ON public.tenants;
CREATE TRIGGER sync_payment_status_trigger
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION sync_payment_status();

-- 7. Garantir que payment_status não seja NULL para novos registros
ALTER TABLE public.tenants 
ALTER COLUMN payment_status SET DEFAULT 'pending';

-- Verificar que não há mais registros com payment_status vazio
DO $$
DECLARE
  empty_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empty_count
  FROM public.tenants 
  WHERE payment_status = '' OR payment_status IS NULL;
  
  IF empty_count > 0 THEN
    RAISE NOTICE 'ATENÇÃO: Ainda existem % registros com payment_status vazio', empty_count;
  ELSE
    RAISE NOTICE 'SUCESSO: Todos os registros têm payment_status válido';
  END IF;
END;
$$;

-- Comentários
COMMENT ON FUNCTION sync_payment_status IS 'Sincroniza automaticamente payment_status com plan_status e payment_completed';
COMMENT ON TRIGGER sync_payment_status_trigger ON public.tenants IS 'Trigger para manter payment_status sincronizado automaticamente';
