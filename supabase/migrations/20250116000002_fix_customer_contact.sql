-- Corrigir função create_appointment_safe para incluir customer_contact
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

  -- Inserir o agendamento com customer_contact
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
