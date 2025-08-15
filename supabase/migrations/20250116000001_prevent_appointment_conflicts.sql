-- Migração para prevenir conflitos de agendamentos
-- Esta migração implementa validações robustas para evitar agendamentos duplicados

-- 1. Criar função para verificar conflitos de agendamentos
CREATE OR REPLACE FUNCTION check_appointment_conflicts(
  p_tenant_id UUID,
  p_professional_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_appointment_id UUID DEFAULT NULL
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Verificar se há conflitos com outros agendamentos do mesmo profissional
  SELECT COUNT(*)
  INTO conflict_count
  FROM appointments
  WHERE 
    tenant_id = p_tenant_id
    AND professional_id = p_professional_id
    AND status NOT IN ('cancelado', 'nao_compareceu') -- Ignorar agendamentos cancelados
    AND (
      -- Verificar sobreposição de horários
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    )
    AND (p_appointment_id IS NULL OR id != p_appointment_id); -- Excluir o próprio agendamento em caso de edição

  -- Retornar TRUE se há conflitos
  RETURN conflict_count > 0;
END;
$$;

-- 2. Criar função para validar e inserir agendamento
CREATE OR REPLACE FUNCTION create_appointment_safe(
  p_tenant_id UUID,
  p_professional_id UUID,
  p_service_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_conflict BOOLEAN;
  new_appointment appointments%ROWTYPE;
  result JSON;
BEGIN
  -- Verificar se há conflitos
  SELECT check_appointment_conflicts(
    p_tenant_id,
    p_professional_id,
    p_start_time,
    p_end_time
  ) INTO has_conflict;

  -- Se há conflito, retornar erro
  IF has_conflict THEN
    RETURN json_build_object(
      'success', false,
      'error', 'CONFLICT',
      'message', 'Já existe um agendamento para este profissional neste horário.'
    );
  END IF;

  -- Inserir o agendamento
  INSERT INTO appointments (
    tenant_id,
    professional_id,
    service_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_contact,
    start_time,
    end_time,
    notes,
    status
  ) VALUES (
    p_tenant_id,
    p_professional_id,
    p_service_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_customer_phone, -- customer_contact é o mesmo que customer_phone
    p_start_time,
    p_end_time,
    p_notes,
    'agendado'
  ) RETURNING * INTO new_appointment;

  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'appointment_id', new_appointment.id,
    'message', 'Agendamento criado com sucesso.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', 'Erro interno do banco de dados: ' || SQLERRM
    );
END;
$$;

-- 3. Criar função para atualizar agendamento com validação
CREATE OR REPLACE FUNCTION update_appointment_safe(
  p_appointment_id UUID,
  p_professional_id UUID DEFAULT NULL,
  p_service_id UUID DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  p_start_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_appointment appointments%ROWTYPE;
  has_conflict BOOLEAN;
  new_professional_id UUID;
  new_start_time TIMESTAMP WITH TIME ZONE;
  new_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar agendamento atual
  SELECT * INTO current_appointment 
  FROM appointments 
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'NOT_FOUND',
      'message', 'Agendamento não encontrado.'
    );
  END IF;

  -- Determinar novos valores (usar valores atuais se não especificados)
  new_professional_id := COALESCE(p_professional_id, current_appointment.professional_id);
  new_start_time := COALESCE(p_start_time, current_appointment.start_time);
  new_end_time := COALESCE(p_end_time, current_appointment.end_time);

  -- Verificar conflitos apenas se profissional, data ou horário mudaram
  IF (new_professional_id != current_appointment.professional_id OR 
      new_start_time != current_appointment.start_time OR 
      new_end_time != current_appointment.end_time) THEN
    
    SELECT check_appointment_conflicts(
      current_appointment.tenant_id,
      new_professional_id,
      new_start_time,
      new_end_time,
      p_appointment_id
    ) INTO has_conflict;

    IF has_conflict THEN
      RETURN json_build_object(
        'success', false,
        'error', 'CONFLICT',
        'message', 'Já existe um agendamento para este profissional neste horário.'
      );
    END IF;
  END IF;

  -- Atualizar o agendamento
  UPDATE appointments SET
    professional_id = COALESCE(p_professional_id, professional_id),
    service_id = COALESCE(p_service_id, service_id),
    customer_name = COALESCE(p_customer_name, customer_name),
    customer_phone = COALESCE(p_customer_phone, customer_phone),
    customer_email = COALESCE(p_customer_email, customer_email),
    start_time = COALESCE(p_start_time, start_time),
    end_time = COALESCE(p_end_time, end_time),
    notes = COALESCE(p_notes, notes),
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE id = p_appointment_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Agendamento atualizado com sucesso.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', 'Erro interno do banco de dados: ' || SQLERRM
    );
END;
$$;

-- 4. Criar trigger para prevenir inserções diretas que causem conflitos
CREATE OR REPLACE FUNCTION prevent_appointment_conflicts_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  has_conflict BOOLEAN;
BEGIN
  -- Apenas para INSERT e UPDATE que mudam horários/profissional
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       OLD.professional_id != NEW.professional_id OR 
       OLD.start_time != NEW.start_time OR 
       OLD.end_time != NEW.end_time
     )) THEN
    
    -- Ignorar se o status é cancelado ou não compareceu
    IF NEW.status IN ('cancelado', 'nao_compareceu') THEN
      RETURN NEW;
    END IF;

    -- Verificar conflitos
    SELECT check_appointment_conflicts(
      NEW.tenant_id,
      NEW.professional_id,
      NEW.start_time,
      NEW.end_time,
      NEW.id
    ) INTO has_conflict;

    IF has_conflict THEN
      RAISE EXCEPTION 'Conflito de agendamento: Já existe um agendamento para este profissional neste horário.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Aplicar o trigger
DROP TRIGGER IF EXISTS prevent_appointment_conflicts ON appointments;
CREATE TRIGGER prevent_appointment_conflicts
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_appointment_conflicts_trigger();

-- 6. Criar índice para melhorar performance das consultas de conflito
CREATE INDEX IF NOT EXISTS idx_appointments_conflict_check 
ON appointments(tenant_id, professional_id, start_time, end_time, status)
WHERE status NOT IN ('cancelado', 'nao_compareceu');

-- 7. Adicionar permissões para as funções
GRANT EXECUTE ON FUNCTION check_appointment_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION create_appointment_safe TO authenticated;
GRANT EXECUTE ON FUNCTION update_appointment_safe TO authenticated;

-- 8. Comentários para documentação
COMMENT ON FUNCTION check_appointment_conflicts IS 'Verifica se há conflitos de agendamentos para um profissional em um determinado horário';
COMMENT ON FUNCTION create_appointment_safe IS 'Cria um agendamento com validação de conflitos';
COMMENT ON FUNCTION update_appointment_safe IS 'Atualiza um agendamento com validação de conflitos';
COMMENT ON TRIGGER prevent_appointment_conflicts ON appointments IS 'Previne inserções/atualizações que causem conflitos de agendamentos';
