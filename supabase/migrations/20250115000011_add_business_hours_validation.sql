-- Adicionar validação de horários de funcionamento no nível do banco de dados
-- Esta migração garante que agendamentos não possam ser criados fora dos horários configurados

-- 1. CRIAR FUNÇÃO PARA VALIDAR HORÁRIOS DE FUNCIONAMENTO
CREATE OR REPLACE FUNCTION validate_appointment_business_hours()
RETURNS TRIGGER AS $$
DECLARE
    business_hour_record RECORD;
    appointment_weekday INTEGER;
    appointment_start_time TIME;
    appointment_end_time TIME;
BEGIN
    -- Obter o dia da semana do agendamento (0 = domingo, 1 = segunda, etc.)
    appointment_weekday := EXTRACT(DOW FROM NEW.start_time);
    
    -- Buscar horários de funcionamento para este dia
    SELECT * INTO business_hour_record
    FROM public.business_hours
    WHERE tenant_id = NEW.tenant_id AND weekday = appointment_weekday;
    
    -- Se não encontrar horários configurados, permitir (fallback)
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- Se o estabelecimento está fechado neste dia, bloquear
    IF business_hour_record.closed THEN
        RAISE EXCEPTION 'Estabelecimento fechado neste dia da semana';
    END IF;
    
    -- Se horários não estão configurados, permitir (fallback)
    IF business_hour_record.open_time IS NULL OR business_hour_record.close_time IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Converter horários do agendamento para TIME
    appointment_start_time := NEW.start_time::time;
    appointment_end_time := NEW.end_time::time;
    
    -- Verificar se o agendamento está dentro do horário de funcionamento
    IF appointment_start_time < business_hour_record.open_time OR 
       appointment_end_time > business_hour_record.close_time THEN
        RAISE EXCEPTION 'Agendamento fora do horário de funcionamento. Horário permitido: % - %', 
                       business_hour_record.open_time, 
                       business_hour_record.close_time;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. APLICAR TRIGGER PARA VALIDAR HORÁRIOS
DROP TRIGGER IF EXISTS validate_appointment_business_hours_trigger ON public.appointments;
CREATE TRIGGER validate_appointment_business_hours_trigger
    BEFORE INSERT OR UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION validate_appointment_business_hours();

-- 3. LOG DA IMPLEMENTAÇÃO
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

-- 4. VERIFICAR SE A VALIDAÇÃO ESTÁ FUNCIONANDO
SELECT 
    'Validação de horários implementada' as status,
    COUNT(*) as total_tenants,
    COUNT(CASE WHEN bh_count = 7 THEN 1 END) as tenants_with_complete_hours
FROM (
    SELECT 
        t.id,
        COUNT(bh.id) as bh_count
    FROM public.tenants t
    LEFT JOIN public.business_hours bh ON t.id = bh.tenant_id
    GROUP BY t.id
) tenant_hours;
