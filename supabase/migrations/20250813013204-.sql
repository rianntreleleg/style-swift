-- Primeiro, vamos atualizar a tabela subscribers para ter campos específicos dos planos
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS plan_selected TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS theme_selected TEXT DEFAULT 'barber';
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS payment_completed BOOLEAN DEFAULT false;

-- Atualizar a tabela tenants para incluir mais campos de plano
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan_selected TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS payment_completed BOOLEAN DEFAULT false;

-- Criar tabela para controle de receitas (valores em centavos)
CREATE TABLE IF NOT EXISTS public.revenues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL,
    service_name TEXT,
    professional_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    revenue_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_revenues_tenant_id ON public.revenues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON public.revenues(revenue_date);

-- Habilitar RLS
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;

-- Política para revenues
CREATE POLICY "Owners can manage revenues" ON public.revenues
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE t.id = revenues.tenant_id 
    AND t.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE t.id = revenues.tenant_id 
    AND t.owner_id = auth.uid()
));

-- Atualizar função de validação de profissionais para usar plan_tier do tenants
CREATE OR REPLACE FUNCTION public.validate_professional_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_plan text;
  v_count int;
  v_limit int;
begin
  -- Buscar o plano do tenant (agora usando plan_tier ao invés de plan)
  select COALESCE(plan_tier, plan, 'essential') into v_plan from public.tenants where id = NEW.tenant_id;
  
  -- Contar profissionais ativos
  select count(*) into v_count from public.professionals 
  where tenant_id = NEW.tenant_id and active = true;
  
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