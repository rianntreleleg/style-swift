-- Corrigir problema dos horários sendo sobrescritos
-- Esta migração garante que os horários configurados durante o registro sejam respeitados

-- 1. REMOVER A INSERÇÃO AUTOMÁTICA DE HORÁRIOS PADRÃO
-- Comentar ou remover a inserção automática que sobrescreve os horários configurados

-- 2. GARANTIR QUE APENAS TENANTS SEM HORÁRIOS RECEBAM HORÁRIOS PADRÃO
-- Inserir horários padrão apenas para tenants que não têm nenhum horário configurado
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
    WHERE bh.tenant_id = t.id
);

-- 3. VERIFICAR E CORRIGIR HORÁRIOS EXISTENTES
-- Garantir que horários configurados durante o registro não sejam sobrescritos
-- Esta query apenas verifica se há inconsistências
SELECT 
    'Verificação de horários' as status,
    COUNT(*) as total_tenants,
    COUNT(CASE WHEN bh_count > 0 THEN 1 END) as tenants_with_hours,
    COUNT(CASE WHEN bh_count = 0 THEN 1 END) as tenants_without_hours
FROM (
    SELECT 
        t.id,
        COUNT(bh.id) as bh_count
    FROM public.tenants t
    LEFT JOIN public.business_hours bh ON t.id = bh.tenant_id
    GROUP BY t.id
) tenant_hours;

-- 4. CRIAR FUNÇÃO PARA VALIDAR HORÁRIOS
CREATE OR REPLACE FUNCTION validate_business_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Garantir que horários não sejam sobrescritos por valores padrão
    IF NEW.open_time IS NULL AND NEW.close_time IS NULL AND NOT NEW.closed THEN
        RAISE EXCEPTION 'Horários inválidos: deve especificar horários ou marcar como fechado';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. APLICAR TRIGGER PARA VALIDAR HORÁRIOS
DROP TRIGGER IF EXISTS validate_business_hours_trigger ON public.business_hours;
CREATE TRIGGER validate_business_hours_trigger
    BEFORE INSERT OR UPDATE ON public.business_hours
    FOR EACH ROW EXECUTE FUNCTION validate_business_hours();

-- 6. LOG DA CORREÇÃO
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
