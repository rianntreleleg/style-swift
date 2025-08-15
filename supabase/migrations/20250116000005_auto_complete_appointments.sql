-- Sistema de conclusão automática de agendamentos após 24 horas
-- Esta migração implementa a lógica para marcar agendamentos confirmados como concluídos

-- 1. Função para marcar agendamentos como concluídos automaticamente
CREATE OR REPLACE FUNCTION auto_complete_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  appointment_record RECORD;
  completed_count INTEGER := 0;
BEGIN
  -- Buscar agendamentos confirmados que passaram de 24 horas
  FOR appointment_record IN
    SELECT 
      id,
      tenant_id,
      customer_name,
      start_time,
      end_time
    FROM appointments
    WHERE 
      status = 'confirmado'
      AND start_time < NOW() - INTERVAL '24 hours'
      AND start_time > NOW() - INTERVAL '48 hours' -- Evitar processar agendamentos muito antigos
  LOOP
    -- Marcar como concluído
    UPDATE appointments
    SET 
      status = 'concluido',
      updated_at = NOW()
    WHERE id = appointment_record.id;
    
    completed_count := completed_count + 1;
    
    -- Log da ação
    RAISE NOTICE 'Agendamento concluído automaticamente: ID=%, Cliente=%, Data/Hora=%, Tenant=%', 
      appointment_record.id, 
      appointment_record.customer_name, 
      appointment_record.start_time,
      appointment_record.tenant_id;
  END LOOP;
  
  -- Log do total processado
  IF completed_count > 0 THEN
    RAISE NOTICE 'Total de agendamentos concluídos automaticamente: %', completed_count;
  END IF;
END;
$$;

-- 2. Função para verificar e concluir agendamentos específicos
CREATE OR REPLACE FUNCTION check_and_complete_appointment(p_appointment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  appointment_status TEXT;
  appointment_start_time TIMESTAMPTZ;
  is_completed BOOLEAN := FALSE;
BEGIN
  -- Buscar informações do agendamento
  SELECT status, start_time 
  INTO appointment_status, appointment_start_time
  FROM appointments 
  WHERE id = p_appointment_id;
  
  -- Verificar se existe e está confirmado
  IF NOT FOUND THEN
    RAISE NOTICE 'Agendamento não encontrado: %', p_appointment_id;
    RETURN FALSE;
  END IF;
  
  -- Verificar se está confirmado e passou de 24 horas
  IF appointment_status = 'confirmado' AND appointment_start_time < NOW() - INTERVAL '24 hours' THEN
    -- Marcar como concluído
    UPDATE appointments
    SET 
      status = 'concluido',
      updated_at = NOW()
    WHERE id = p_appointment_id;
    
    is_completed := TRUE;
    RAISE NOTICE 'Agendamento % concluído automaticamente (24h após horário)', p_appointment_id;
  END IF;
  
  RETURN is_completed;
END;
$$;

-- 3. Trigger para verificar conclusão automática quando status muda para confirmado
CREATE OR REPLACE FUNCTION trigger_check_auto_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se o status mudou para 'confirmado', agendar verificação de conclusão
  IF NEW.status = 'confirmado' AND (OLD.status IS NULL OR OLD.status != 'confirmado') THEN
    -- Agendar verificação para 24 horas depois
    PERFORM pg_notify('appointment_confirmed', json_build_object(
      'appointment_id', NEW.id,
      'check_time', NEW.start_time + INTERVAL '24 hours'
    )::text);
    
    RAISE NOTICE 'Agendamento % confirmado - verificação de conclusão agendada para %', 
      NEW.id, NEW.start_time + INTERVAL '24 hours';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Aplicar o trigger
DROP TRIGGER IF EXISTS check_auto_completion_trigger ON appointments;
CREATE TRIGGER check_auto_completion_trigger
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_auto_completion();

-- 5. Função para processar agendamentos pendentes de conclusão (executada por cron)
CREATE OR REPLACE FUNCTION process_pending_completions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  completed_count INTEGER;
  error_count INTEGER;
BEGIN
  -- Executar conclusão automática
  PERFORM auto_complete_appointments();
  
  -- Contar agendamentos concluídos
  SELECT COUNT(*) INTO completed_count
  FROM appointments
  WHERE 
    status = 'concluido'
    AND updated_at > NOW() - INTERVAL '1 hour';
  
  -- Retornar resultado
  result := json_build_object(
    'success', true,
    'completed_count', completed_count,
    'timestamp', NOW(),
    'message', 'Processamento de conclusões automáticas concluído'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'timestamp', NOW()
    );
END;
$$;

-- 6. Índice para melhorar performance das consultas de conclusão automática
CREATE INDEX IF NOT EXISTS idx_appointments_auto_completion 
ON appointments(status, start_time)
WHERE status = 'confirmado';

-- 7. Comentários para documentação
COMMENT ON FUNCTION auto_complete_appointments IS 'Marca agendamentos confirmados como concluídos após 24 horas do horário';
COMMENT ON FUNCTION check_and_complete_appointment IS 'Verifica e conclui um agendamento específico se passou de 24 horas';
COMMENT ON FUNCTION process_pending_completions IS 'Função principal para processar conclusões automáticas (executada por cron)';
COMMENT ON TRIGGER check_auto_completion_trigger ON appointments IS 'Trigger para agendar verificação de conclusão quando agendamento é confirmado';

-- 8. Permissões
GRANT EXECUTE ON FUNCTION auto_complete_appointments TO service_role;
GRANT EXECUTE ON FUNCTION check_and_complete_appointment TO service_role;
GRANT EXECUTE ON FUNCTION process_pending_completions TO service_role;
