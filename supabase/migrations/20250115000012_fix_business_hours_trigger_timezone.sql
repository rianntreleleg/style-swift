-- Corrigir problema de timezone na validação de horários de funcionamento
-- Esta migração corrige o trigger para usar horário local em vez de UTC

-- 1. ATUALIZAR FUNÇÃO PARA VALIDAR HORÁRIOS DE FUNCIONAMENTO COM TIMEZONE CORRETO
CREATE OR REPLACE FUNCTION validate_appointment_business_hours()
RETURNS TRIGGER AS $$
DECLARE
    business_hour_record RECORD;
    appointment_weekday INTEGER;
    appointment_start_time TIME;
    appointment_end_time TIME;
    local_start_time TIMESTAMP;
    local_end_time TIMESTAMP;
BEGIN
    -- Converter para horário local (Brasil/São Paulo)
    local_start_time := NEW.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo';
    local_end_time := NEW.end_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo';
    
    -- Obter o dia da semana do agendamento (0 = domingo, 1 = segunda, etc.)
    appointment_weekday := EXTRACT(DOW FROM local_start_time);
    
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
    
    -- Converter horários do agendamento para TIME (usando horário local)
    appointment_start_time := local_start_time::time;
    appointment_end_time := local_end_time::time;
    
    -- Debug: log para verificação
    RAISE NOTICE 'Debug - Validação de horários: tenant_id=%, weekday=%, start_time=%, end_time=%, open_time=%, close_time=%', 
                 NEW.tenant_id, appointment_weekday, appointment_start_time, appointment_end_time, 
                 business_hour_record.open_time, business_hour_record.close_time;
    
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
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'validate_appointment_business_hours_trigger';

-- 3. LOG DA CORREÇÃO
SELECT 
    'Trigger de validação de horários corrigido' as status,
    COUNT(*) as total_business_hours,
    COUNT(CASE WHEN open_time IS NOT NULL AND close_time IS NOT NULL THEN 1 END) as configured_hours
FROM public.business_hours;
