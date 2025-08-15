-- CORREÇÃO: Erro "record new has no field plan"
-- Esta migração corrige o problema de campo ausente e sincronização de planos

-- 1. GARANTIR QUE O CAMPO PLAN EXISTE NA TABELA TENANTS
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS plan TEXT;

-- 2. ATUALIZAR CONSTRAINT PARA O CAMPO PLAN
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_check 
  CHECK (plan IN ('essential', 'professional', 'premium'));

-- 3. ATUALIZAR DADOS EXISTENTES PARA GARANTIR QUE PLAN ESTEJA PREENCHIDO
UPDATE public.tenants 
SET plan = COALESCE(plan_tier, 'essential')
WHERE plan IS NULL;

-- 4. CORRIGIR FUNÇÃO DE SINCRONIZAÇÃO DE PLANOS
-- Esta função garante que plan e plan_tier estejam sempre sincronizados
CREATE OR REPLACE FUNCTION sync_tenant_plan_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Se plan_tier foi alterado ou é novo, sincronizar com plan
  IF TG_OP = 'INSERT' OR NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
    NEW.plan := NEW.plan_tier;
  -- Se plan foi alterado ou é novo, sincronizar com plan_tier
  ELSIF TG_OP = 'INSERT' OR NEW.plan IS DISTINCT FROM OLD.plan THEN
    NEW.plan_tier := NEW.plan;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 5. CRIAR/RENOVAR TRIGGER PARA SINCRONIZAÇÃO AUTOMÁTICA
DROP TRIGGER IF EXISTS sync_tenant_plan_fields_trigger ON public.tenants;
CREATE TRIGGER sync_tenant_plan_fields_trigger
  BEFORE INSERT OR UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION sync_tenant_plan_fields();

-- 6. CORRIGIR FUNÇÃO DE CRIAÇÃO SIMPLES DE TENANT
-- Garantir que ela insere corretamente ambos os campos
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
        plan, -- Adicionando explicitamente o campo plan
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
        p_plan_tier, -- plan deve ser igual a plan_tier
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

-- 7. VERIFICAÇÃO FINAL
SELECT 
  'Verificação concluída' as status,
  COUNT(*) as total_tenants,
  COUNT(CASE WHEN plan IS NOT NULL THEN 1 END) as tenants_with_plan,
  COUNT(CASE WHEN plan_tier IS NOT NULL THEN 1 END) as tenants_with_plan_tier,
  COUNT(CASE WHEN plan = plan_tier THEN 1 END) as synchronized_tenants
FROM public.tenants;

-- 8. TESTAR A FUNÇÃO DE CRIAÇÃO
-- Esta função não deve causar erro após a correção
-- SELECT public.create_simple_tenant(
--   '00000000-0000-0000-0000-000000000000'::UUID,
--   'Test Tenant',
--   'test-tenant',
--   'professional',
--   'barber',
--   'Test Address',
--   '123456789'
-- );