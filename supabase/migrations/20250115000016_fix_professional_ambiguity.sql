-- Corrigir ambiguidade de tenant_id nos triggers de profissionais
-- Remover triggers existentes que podem estar causando conflito
DROP TRIGGER IF EXISTS check_professional_limit_trigger ON public.professionals;
DROP TRIGGER IF EXISTS validate_professional_limit_trigger ON public.professionals;

-- Recriar função check_professional_limit com referências explícitas
CREATE OR REPLACE FUNCTION public.check_professional_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
  tenant_plan TEXT;
BEGIN
  -- Buscar plano do tenant
  SELECT plan_tier INTO tenant_plan
  FROM public.tenants 
  WHERE id = NEW.tenant_id;
  
  -- Definir limite baseado no plano
  CASE tenant_plan
    WHEN 'essential' THEN max_allowed := 1;
    WHEN 'professional' THEN max_allowed := 3;
    WHEN 'premium' THEN max_allowed := 999; -- Ilimitado
    ELSE max_allowed := 1; -- Default para essential
  END CASE;
  
  -- Contar profissionais ativos do tenant (com referência explícita à tabela)
  SELECT COUNT(*) INTO current_count
  FROM public.professionals 
  WHERE public.professionals.tenant_id = NEW.tenant_id AND public.professionals.active = true;
  
  -- Verificar se excede o limite
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Limite de profissionais atingido para o plano %. Máximo permitido: %', 
      tenant_plan, max_allowed;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar função validate_professional_limit com referências explícitas
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
  -- Buscar o plano do tenant (usando plan_tier ou plan)
  select COALESCE(plan_tier, plan, 'essential') into v_plan 
  from public.tenants where id = NEW.tenant_id;

  -- Contar profissionais ativos (com referência explícita à tabela)
  select count(*) into v_count from public.professionals
  where public.professionals.tenant_id = NEW.tenant_id and public.professionals.active = true;

  -- Definir limite baseado no plano
  v_limit := case v_plan
    when 'essential' then 1
    when 'professional' then 3
    when 'premium' then 999
    else 1
  end;

  -- Verificar se está tentando ativar um profissional
  if NEW.active = true and v_count >= v_limit then
    raise exception 'Limite de profissionais atingido para o plano % (limite: %, atuais: %)', v_plan, v_limit, v_count;
  end if;

  return NEW;
end;
$function$;

-- Recriar triggers com nomes únicos
CREATE TRIGGER check_professional_limit_trigger
  BEFORE INSERT ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.check_professional_limit();

CREATE TRIGGER validate_professional_limit_trigger
  BEFORE INSERT OR UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_professional_limit();

-- Garantir que as políticas RLS estão corretas
DROP POLICY IF EXISTS "professionals_tenant_access" ON public.professionals;
CREATE POLICY "professionals_tenant_access" ON public.professionals
  FOR ALL USING (
    tenant_id IN (
      SELECT id FROM public.tenants 
      WHERE owner_id = auth.uid()
    )
  );
