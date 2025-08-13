-- Migração para confirmação automática de agendamentos após 24 horas
-- Data: 2025-01-15

-- Função para confirmar automaticamente agendamentos após 24 horas
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
    AND scheduled_at < NOW() - INTERVAL '24 hours'
    AND scheduled_at > NOW() - INTERVAL '48 hours'; -- Evitar processar agendamentos muito antigos
    
  -- Log das alterações (opcional)
  IF FOUND THEN
    RAISE NOTICE 'Agendamentos confirmados automaticamente: %', ROW_COUNT;
  END IF;
END;
$$;

-- Trigger para executar a função automaticamente
-- Vamos criar um job que roda a cada hora para verificar agendamentos
-- Nota: Em produção, você pode usar pg_cron ou um job externo

-- Função para verificar e confirmar agendamentos pendentes
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
    c.name as customer_name,
    s.name as service_name,
    a.scheduled_at,
    a.status,
    'Será confirmado automaticamente' as action_taken
  FROM public.appointments a
  JOIN public.customers c ON a.customer_id = c.id
  JOIN public.services s ON a.service_id = s.id
  WHERE 
    a.status NOT IN ('cancelado', 'confirmado')
    AND a.scheduled_at < NOW() - INTERVAL '24 hours'
    AND a.scheduled_at > NOW() - INTERVAL '48 hours';
    
  -- Executar a confirmação
  PERFORM auto_confirm_appointments();
END;
$$;

-- Política RLS para permitir execução da função
GRANT EXECUTE ON FUNCTION auto_confirm_appointments() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_confirm_appointments() TO authenticated;

-- Comentários para documentação
COMMENT ON FUNCTION auto_confirm_appointments() IS 'Confirma automaticamente agendamentos não cancelados após 24 horas';
COMMENT ON FUNCTION check_and_confirm_appointments() IS 'Verifica e confirma agendamentos pendentes, retornando informações sobre as ações tomadas';

-- Índice para melhorar performance da consulta de agendamentos por status e data
CREATE INDEX IF NOT EXISTS idx_appointments_status_scheduled_at 
ON public.appointments(status, scheduled_at) 
WHERE status NOT IN ('cancelado', 'confirmado');

-- Função para obter estatísticas de confirmação automática
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
    COUNT(*) FILTER (WHERE status = 'confirmado' AND updated_at > scheduled_at + INTERVAL '24 hours') as auto_confirmed,
    COUNT(*) FILTER (WHERE status = 'confirmado' AND updated_at <= scheduled_at + INTERVAL '24 hours') as manually_confirmed,
    COUNT(*) FILTER (WHERE status = 'cancelado') as cancelled,
    COUNT(*) FILTER (WHERE status NOT IN ('confirmado', 'cancelado')) as pending
  FROM public.appointments
  WHERE scheduled_at BETWEEN start_date AND end_date;
END;
$$;

GRANT EXECUTE ON FUNCTION get_auto_confirmation_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION get_auto_confirmation_stats(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Retorna estatísticas de confirmação automática de agendamentos em um período específico';
