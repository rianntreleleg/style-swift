-- Simplificar validação de horários de funcionamento para evitar problemas de timezone
-- Esta migração remove a conversão de timezone e usa apenas o horário local

-- 1. ATUALIZAR FUNÇÃO PARA VALIDAR HORÁRIOS DE FUNCIONAMENTO SEM TIMEZONE
CREATE OR REPLACE FUNCTION validate_appointment_business_hours()
RETURNS TRIGGER AS $$
DECLARE
    business_hour_record RECORD;
    appointment_weekday INTEGER;
    appointment_start_time TIME;
    appointment_end_time TIME;
BEGIN
    -- Obter o dia da semana do agendamento (0 = domingo, 1 = segunda, etc.)
    -- Usar apenas a data local sem conversão de timezone
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
    
    -- Converter horários do agendamento para TIME (usando apenas o horário local)
    appointment_start_time := NEW.start_time::time;
    appointment_end_time := NEW.end_time::time;
    
    -- Verificar se o agendamento está dentro do horário de funcionamento
    IF appointment_start_time < business_hour_record.open_time OR 
       appointment_end_time > business_hour_record.close_time THEN
        RAISE EXCEPTION 'Agendamento fora do horário de funcionamento. Horário permitido: % - %. Tentativa: % - %', 
                       business_hour_record.open_time, 
                       business_hour_record.close_time,
                       appointment_start_time,
                       appointment_end_time;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. VERIFICAR SE O TRIGGER ESTÁ ATIVO
SELECT 
    'Trigger de validação simplificado' as status,
    COUNT(*) as total_business_hours
FROM public.business_hours;
