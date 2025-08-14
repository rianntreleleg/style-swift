-- Migração para criar automaticamente o profissional "owner" quando um tenant é criado

-- 1. Função para criar profissional owner automaticamente
CREATE OR REPLACE FUNCTION create_owner_professional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_name TEXT;
  owner_email TEXT;
BEGIN
  -- Buscar dados do owner
  SELECT 
    COALESCE(raw_user_meta_data->>'name', email) as name,
    email
  INTO owner_name, owner_email
  FROM auth.users 
  WHERE id = NEW.owner_id;
  
  -- Se não encontrou dados, usar fallback
  IF owner_name IS NULL THEN
    owner_name := 'Proprietário';
  END IF;
  
  -- Criar profissional owner automaticamente
  INSERT INTO public.professionals (
    tenant_id,
    name,
    bio,
    avatar_url,
    active,
    is_owner,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    owner_name,
    'Proprietário do estabelecimento',
    NULL,
    true,
    true,
    now(),
    now()
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log erro mas não falha a criação do tenant
  RAISE WARNING 'Erro ao criar profissional owner: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Adicionar coluna is_owner se não existir
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT false;

-- 3. Criar trigger para executar após criação do tenant
DROP TRIGGER IF EXISTS trigger_create_owner_professional ON public.tenants;
CREATE TRIGGER trigger_create_owner_professional
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION create_owner_professional();

-- 4. Atualizar profissionais existentes para marcar owners
UPDATE public.professionals 
SET is_owner = true 
WHERE id IN (
  SELECT DISTINCT ON (p.tenant_id) p.id
  FROM public.professionals p
  JOIN public.tenants t ON t.id = p.tenant_id
  ORDER BY p.tenant_id, p.created_at ASC
);

-- 5. Criar função para verificar limites de profissionais
CREATE OR REPLACE FUNCTION check_professional_limit()
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
  
  -- Contar profissionais ativos do tenant
  SELECT COUNT(*) INTO current_count
  FROM public.professionals 
  WHERE public.professionals.tenant_id = NEW.tenant_id AND active = true;
  
  -- Verificar se excede o limite
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Limite de profissionais atingido para o plano %. Máximo permitido: %', 
      tenant_plan, max_allowed;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Criar trigger para verificar limite antes de inserir
DROP TRIGGER IF EXISTS trigger_check_professional_limit ON public.professionals;
CREATE TRIGGER trigger_check_professional_limit
  BEFORE INSERT ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION check_professional_limit();

-- 7. Comentários para documentação
COMMENT ON FUNCTION create_owner_professional() IS 'Cria automaticamente profissional owner quando tenant é criado';
COMMENT ON FUNCTION check_professional_limit() IS 'Verifica limites de profissionais baseado no plano do tenant';
COMMENT ON COLUMN public.professionals.is_owner IS 'Indica se o profissional é o proprietário do estabelecimento';
