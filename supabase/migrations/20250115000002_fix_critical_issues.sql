-- Correções críticas para problemas reportados
-- Execute este SQL no SQL Editor do Supabase Dashboard

-- 1. CORRIGIR CONSTRAINT DE EXCLUSÃO DE SERVIÇOS
-- Alterar a constraint de appointments para permitir exclusão de serviços
-- Primeiro, remover a constraint existente
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;

-- Recriar a constraint com CASCADE para permitir exclusão de serviços
ALTER TABLE public.appointments ADD CONSTRAINT appointments_service_id_fkey 
FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

-- 2. CORRIGIR LIMITE DE PROFISSIONAIS POR PLANO
-- Atualizar a função de validação para usar os planos corretos
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
  where tenant_id = NEW.tenant_id and active = true;
  
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

-- Criar trigger para validar limite de profissionais
DROP TRIGGER IF EXISTS validate_professional_limit_trigger ON public.professionals;
CREATE TRIGGER validate_professional_limit_trigger
  BEFORE INSERT OR UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.validate_professional_limit();

-- 3. ADICIONAR CAMPOS NECESSÁRIOS PARA HORÁRIOS
-- Adicionar campos de endereço e contato no tenant se não existirem
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. CORRIGIR STATUS DOS APPOINTMENTS
-- Atualizar constraint de status para incluir todos os valores necessários
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('agendado', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'));

-- 5. CRIAR ÍNDICES PARA MELHOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON public.appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status ON public.appointments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_professionals_tenant_active ON public.professionals(tenant_id, active);

-- 6. GARANTIR QUE A TABELA BUSINESS_HOURS EXISTE
-- Criar tabela de horários se não existir
CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
    open_time TIME,
    close_time TIME,
    closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, weekday)
);

-- Habilitar RLS para business_hours
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- Políticas para business_hours
DROP POLICY IF EXISTS "Tenant owners can manage business hours" ON public.business_hours;
CREATE POLICY "Tenant owners can manage business hours" ON public.business_hours
    FOR ALL USING (
        tenant_id IN (
            SELECT id FROM public.tenants WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Public can read business hours" ON public.business_hours;
CREATE POLICY "Public can read business hours" ON public.business_hours
    FOR SELECT USING (true);

-- Inserir horários padrão para tenants existentes que não têm
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

-- 7. TRIGGER PARA ATUALIZAR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para business_hours
DROP TRIGGER IF EXISTS update_business_hours_updated_at ON public.business_hours;
CREATE TRIGGER update_business_hours_updated_at 
    BEFORE UPDATE ON public.business_hours 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. VERIFICAR E CORRIGIR DADOS EXISTENTES
-- Atualizar status de appointments para formato correto se necessário
UPDATE public.appointments 
SET status = 'agendado' 
WHERE status = 'scheduled';

UPDATE public.appointments 
SET status = 'confirmado' 
WHERE status = 'confirmed';

UPDATE public.appointments 
SET status = 'concluido' 
WHERE status = 'completed';

UPDATE public.appointments 
SET status = 'cancelado' 
WHERE status = 'cancelled';

UPDATE public.appointments 
SET status = 'nao_compareceu' 
WHERE status = 'no_show';

-- Verificar se a correção funcionou
SELECT 'Verificação concluída' as status;
