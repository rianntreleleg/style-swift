-- Correções para sincronização de planos e horários de funcionamento
-- Execute este SQL no SQL Editor do Supabase Dashboard

-- 1. CORRIGIR SINCRONIZAÇÃO DE PLANOS
-- Atualizar a função de webhook para sincronizar plan e plan_tier
CREATE OR REPLACE FUNCTION sync_tenant_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Mapear plan_tier para plan
  IF NEW.plan_tier IS NOT NULL THEN
    NEW.plan := CASE NEW.plan_tier
      WHEN 'essential' THEN 'free'
      WHEN 'professional' THEN 'pro'
      WHEN 'premium' THEN 'plus'
      ELSE 'free'
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger para sincronizar plan quando plan_tier for atualizado
DROP TRIGGER IF EXISTS sync_tenant_plan_trigger ON public.tenants;
CREATE TRIGGER sync_tenant_plan_trigger
  BEFORE INSERT OR UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION sync_tenant_plan();

-- 2. ATUALIZAR FUNÇÃO DE VALIDAÇÃO DE PROFISSIONAIS
-- Corrigir para usar o campo plan correto
CREATE OR REPLACE FUNCTION public.validate_professional_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
declare
  v_plan text;
  v_count int;
  v_limit int;
begin
  -- Buscar o plano do tenant
  select plan into v_plan from public.tenants where id = NEW.tenant_id;

  -- Contar profissionais ativos
  select count(*) into v_count from public.professionals
  where public.professionals.tenant_id = NEW.tenant_id and active = true;

  -- Definir limite baseado no plano
  v_limit := case v_plan
    when 'free' then 1
    when 'pro' then 3
    when 'plus' then 10
    else 1
  end;

  -- Verificar se está tentando ativar um profissional
  if NEW.active = true and v_count >= v_limit then
    raise exception 'Limite de profissionais atingido para o plano % (limite: %, atuais: %)', v_plan, v_limit, v_count;
  end if;

  return NEW;
end;
$function$;

-- 3. CORRIGIR DADOS EXISTENTES
-- Atualizar planos existentes baseado no plan_tier
UPDATE public.tenants 
SET plan = CASE plan_tier
  WHEN 'essential' THEN 'essential'
  WHEN 'professional' THEN 'professional'
  WHEN 'premium' THEN 'premium'
  ELSE 'essential'
END
WHERE plan_tier IS NOT NULL AND plan IS DISTINCT FROM CASE plan_tier
  WHEN 'essential' THEN 'essential'
  WHEN 'professional' THEN 'professional'
  WHEN 'premium' THEN 'premium'
  ELSE 'essential'
END;

-- 4. GARANTIR QUE BUSINESS_HOURS TENHA DADOS CORRETOS
-- Verificar se todos os tenants têm horários de funcionamento
INSERT INTO public.business_hours (tenant_id, weekday, open_time, close_time, closed)
SELECT 
    t.id,
    weekday,
    CASE 
        WHEN weekday = 0 THEN NULL -- Domingo fechado
        ELSE '09:00'::time
    END as open_time,
    CASE 
        WHEN weekday = 0 THEN NULL -- Domingo fechado
        ELSE '18:00'::time
    END as close_time,
    weekday = 0 as closed
FROM public.tenants t
CROSS JOIN generate_series(0, 6) as weekday
WHERE NOT EXISTS (
    SELECT 1 FROM public.business_hours bh
    WHERE bh.tenant_id = t.id AND bh.weekday = weekday
);

-- 5. VERIFICAR E CORRIGIR POLÍTICAS DE BUSINESS_HOURS
-- Garantir que a política pública de leitura existe
DROP POLICY IF EXISTS "Public can read business hours" ON public.business_hours;
CREATE POLICY "Public can read business hours" ON public.business_hours
    FOR SELECT USING (true);

-- 6. CRIAR FUNÇÃO PARA ATUALIZAR PLANO MANUALMENTE
CREATE OR REPLACE FUNCTION update_tenant_plan(tenant_uuid UUID, new_plan TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  UPDATE public.tenants 
  SET 
    plan = new_plan,
    plan_tier = CASE new_plan
      WHEN 'free' THEN 'essential'
      WHEN 'pro' THEN 'professional'
      WHEN 'plus' THEN 'premium'
      ELSE 'essential'
    END
  WHERE id = tenant_uuid;
END;
$function$;

-- 7. VERIFICAR SE A CORREÇÃO FUNCIONOU
SELECT 
  'Verificação concluída' as status,
  COUNT(*) as total_tenants,
  COUNT(CASE WHEN plan = 'free' THEN 1 END) as free_tenants,
  COUNT(CASE WHEN plan = 'pro' THEN 1 END) as pro_tenants,
  COUNT(CASE WHEN plan = 'plus' THEN 1 END) as plus_tenants
FROM public.tenants;
