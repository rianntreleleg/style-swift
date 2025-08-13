-- Correção da função de estatísticas de confirmação automática
-- Data: 2025-01-15

-- Corrigir a função get_auto_confirmation_stats para funcionar corretamente
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
  WHERE scheduled_at BETWEEN start_date AND end_date;
END;
$$;

-- Garantir que a função tenha as permissões corretas
GRANT EXECUTE ON FUNCTION get_auto_confirmation_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

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
SET created_at = scheduled_at 
WHERE created_at IS NULL;

-- Comentário atualizado
COMMENT ON FUNCTION get_auto_confirmation_stats(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Retorna estatísticas de confirmação automática de agendamentos em um período específico';
