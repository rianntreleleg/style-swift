-- Correção das funções de confirmação automática
-- Data: 2025-01-15

-- Corrigir a função get_auto_confirmation_stats para usar a tabela appointments correta
CREATE OR REPLACE FUNCTION get_auto_confirmation_stats(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  total_appointments BIGINT,
  auto_confirmed BIGINT,
  manually_confirmed BIGINT,
  cancelled BIGINT,
  pending BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE status = 'confirmado' AND updated_at > created_at + INTERVAL '24 hours') as auto_confirmed,
    COUNT(*) FILTER (WHERE status = 'confirmado' AND (updated_at <= created_at + INTERVAL '24 hours' OR updated_at IS NULL)) as manually_confirmed,
    COUNT(*) FILTER (WHERE status = 'cancelado') as cancelled,
    COUNT(*) FILTER (WHERE status NOT IN ('confirmado', 'cancelado')) as pending
  FROM public.appointments
  WHERE start_time BETWEEN start_date AND end_date;
END;
$$;

-- Corrigir a função auto_confirm_appointments para usar a tabela appointments correta
CREATE OR REPLACE FUNCTION auto_confirm_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar agendamentos que não foram cancelados e estão há mais de 24 horas
  -- e ainda não foram confirmados
  UPDATE public.appointments
  SET 
    status = 'confirmado',
    updated_at = NOW()
  WHERE 
    status NOT IN ('cancelado', 'confirmado')
    AND start_time < NOW() - INTERVAL '24 hours'
    AND start_time > NOW() - INTERVAL '48 hours'; -- Evitar processar agendamentos muito antigos
    
  -- Log das alterações (opcional)
  IF FOUND THEN
    RAISE NOTICE 'Agendamentos confirmados automaticamente: %', ROW_COUNT;
  END IF;
END;
$$;

-- Corrigir a função check_and_confirm_appointments para usar a tabela appointments correta
CREATE OR REPLACE FUNCTION check_and_confirm_appointments()
RETURNS TABLE(
  appointment_id UUID,
  customer_name TEXT,
  service_name TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT,
  action_taken TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Retornar agendamentos que serão confirmados
  RETURN QUERY
  SELECT 
    a.id as appointment_id,
    a.customer_name as customer_name,
    s.name as service_name,
    a.start_time as scheduled_at,
    a.status,
    'Será confirmado automaticamente' as action_taken
  FROM public.appointments a
  LEFT JOIN public.services s ON a.service_id = s.id
  WHERE 
    a.status NOT IN ('cancelado', 'confirmado')
    AND a.start_time < NOW() - INTERVAL '24 hours'
    AND a.start_time > NOW() - INTERVAL '48 hours';
    
  -- Executar a confirmação
  PERFORM auto_confirm_appointments();
END;
$$;

-- Garantir que as funções tenham as permissões corretas
GRANT EXECUTE ON FUNCTION get_auto_confirmation_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_confirm_appointments() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_confirm_appointments() TO authenticated;

-- Adicionar coluna created_at se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'created_at') THEN
    ALTER TABLE public.appointments ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Atualizar registros existentes que não têm created_at
UPDATE public.appointments 
SET created_at = start_time 
WHERE created_at IS NULL;

-- Comentários atualizados
COMMENT ON FUNCTION get_auto_confirmation_stats(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Retorna estatísticas de confirmação automática de agendamentos em um período específico';
COMMENT ON FUNCTION auto_confirm_appointments() IS 'Confirma automaticamente agendamentos não cancelados após 24 horas';
COMMENT ON FUNCTION check_and_confirm_appointments() IS 'Verifica e confirma agendamentos pendentes, retornando informações sobre as ações tomadas';
