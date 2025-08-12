-- Adicionar tabela de horários de funcionamento
CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0 = domingo, 1 = segunda, etc.
    open_time TIME,
    close_time TIME,
    closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, weekday)
);

-- Adicionar campos ativos nas tabelas existentes
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Adicionar campos de endereço e contato no tenant
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS description TEXT;

-- Adicionar campo de status nos agendamentos
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'));

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_business_hours_tenant_weekday ON public.business_hours(tenant_id, weekday);
CREATE INDEX IF NOT EXISTS idx_services_tenant_active ON public.services(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_professionals_tenant_active ON public.professionals(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status ON public.appointments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);

-- RLS para business_hours
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- Políticas para business_hours
CREATE POLICY "Tenant owners can manage business hours" ON public.business_hours
    FOR ALL USING (
        tenant_id IN (
            SELECT id FROM public.tenants WHERE owner_id = auth.uid()
        )
    );

-- Política para leitura pública dos horários
CREATE POLICY "Public can read business hours" ON public.business_hours
    FOR SELECT USING (true);

-- Inserir horários padrão para tenants existentes
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
ON CONFLICT (tenant_id, weekday) DO NOTHING;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_business_hours_updated_at 
    BEFORE UPDATE ON public.business_hours 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
